// /tools/background-remover - AI subject cutout (multi-model, on-device) plus
// classic solid-background removal (auto edge flood-fill or color key),
// background replacement (transparent / color / blur / image), edge-halo
// decontamination, manual brush touch-up (erase / restore) with undo + redo,
// batch queue with ZIP export, and PNG/JPEG/WebP output. 100% client-side.

import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ImagePlus,
  Eraser,
  Download,
  RotateCcw,
  Pipette,
  Paintbrush,
  Undo2,
  Redo2,
  Images,
  FileDown,
  X,
  Layers,
} from "lucide-react";
import JSZip from "jszip";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT, getTrialUsed, recordTrialUse } from "@/lib/tool-trial";
import { removeBackgroundAi, warmBgRuntime, BG_MODELS, DEFAULT_BG_MODEL } from "@/lib/bg-ai";
import {
  classicCutout,
  decontaminate,
  compositeOver,
  renderMask,
  flattenOn,
  hexToRgb,
  rgbToHex,
  type BgReplaceKind,
} from "@/lib/bg-cutout";
import toolSeo from "@/lib/tool-seo-data/background-remover";
import toolSeoMeta from "@/lib/tool-seo-meta-data/background-remover";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import { cn } from "@/lib/utils";
import { brandFilename } from "@/lib/logo-builder";

export const Route = createFileRoute("/tools_/background-remover")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/background-remover";
    return {
      meta: [
        { title: seo.title },
        { name: "description", content: seo.metaDescription },
        { property: "og:title", content: seo.title },
        { property: "og:description", content: seo.metaDescription },
        { property: "og:type", content: "website" },
        { property: "og:url", content: canonical },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: seo.title },
        { name: "twitter:description", content: seo.metaDescription },
      ],
      links: [{ rel: "canonical", href: canonical }],
    };
  },
  component: BackgroundRemoverTool,
});

type Mode = "ai" | "edges" | "color";
type BrushKind = "erase" | "restore";
type OutFormat = "png" | "jpeg" | "webp";
type BatchStatus = "queued" | "working" | "done" | "error";

interface BatchItem {
  id: number;
  file: File;
  name: string;
  url: string;
  status: BatchStatus;
  note: string;
  src: HTMLCanvasElement | null;
  result: HTMLCanvasElement | null;
}

const MAX_DIM = 1600;
const HISTORY_LIMIT = 30;
const BATCH_LIMIT = 20;

const mimeFor = (f: OutFormat): string =>
  f === "png" ? "image/png" : f === "jpeg" ? "image/jpeg" : "image/webp";
const extFor = (f: OutFormat): string => (f === "png" ? "png" : f === "jpeg" ? "jpg" : "webp");

function BackgroundRemoverTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("background-remover", isPro);
  const seo = toolSeo;

  const imgRef = useRef<HTMLImageElement | null>(null);
  /** Immutable original pixels - auto-remove and the restore brush read from this. */
  const origCanvasRef = useRef<HTMLCanvasElement | null>(null);
  /** Editable working image (auto-remove result + brush strokes). */
  const workCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const strokeRef = useRef<{ x: number; y: number } | null>(null);
  const historyRef = useRef<ImageData[]>([]);
  const histIdxRef = useRef(0);
  /** Replacement background image (kind "image"). */
  const bgImageRef = useRef<HTMLCanvasElement | null>(null);
  /** Cached composited background layer (without the cutout). */
  const bgLayerRef = useRef<{ key: string; canvas: HTMLCanvasElement } | null>(null);
  const batchIdRef = useRef(0);

  const [batchMode, setBatchMode] = useState(false);
  const [hasImage, setHasImage] = useState(false);
  const [mode, setMode] = useState<Mode>("ai");
  // AI model selection (multi-model: general / portrait / fast)
  const [aiModel, setAiModel] = useState(DEFAULT_BG_MODEL);
  const [webgpu, setWebgpu] = useState(false);
  // Edge-halo cleanup (rembg-style foreground decontamination)
  const [decontam, setDecontam] = useState(true);
  const [tolerance, setTolerance] = useState(24);
  const [feather, setFeather] = useState(2);
  const [bgHex, setBgHex] = useState("#ffffff");
  const [picking, setPicking] = useState(false);
  const [processed, setProcessed] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [working, setWorking] = useState(false);
  const [brush, setBrush] = useState<BrushKind | null>(null);
  const [brushSize, setBrushSize] = useState(40);
  const [zoom, setZoom] = useState<"actual" | "fit">("fit");
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  // Background replacement
  const [bgKind, setBgKind] = useState<BgReplaceKind>("transparent");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [bgBlur, setBgBlur] = useState(14);
  const [hasBgImage, setHasBgImage] = useState(false);
  // Output options
  const [outFormat, setOutFormat] = useState<OutFormat>("png");
  const [outQuality, setOutQuality] = useState(92);
  const [maskOnly, setMaskOnly] = useState(false);
  // Batch queue
  const [batch, setBatch] = useState<BatchItem[]>([]);
  const [batchWorking, setBatchWorking] = useState(false);
  const [batchSel, setBatchSel] = useState<number | null>(null);

  /** Decode an image file into a canvas capped at MAX_DIM. */
  const fileToCanvas = (file: File): Promise<HTMLCanvasElement> =>
    new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const s = Math.min(1, MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.round(img.naturalWidth * s);
        const h = Math.round(img.naturalHeight * s);
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const ctx = c.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error("ctx"));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(c);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("decode"));
      };
      img.src = url;
    });

  const loadFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    void fileToCanvas(file)
      .then((orig) => {
        const w = orig.width;
        const h = orig.height;
        const work = document.createElement("canvas");
        work.width = w;
        work.height = h;
        const wctx = work.getContext("2d", { willReadFrequently: true });
        if (!wctx) return;
        wctx.drawImage(orig, 0, 0);
        origCanvasRef.current = orig;
        workCanvasRef.current = work;
        // History starts with the untouched original.
        historyRef.current = [wctx.getImageData(0, 0, w, h)];
        histIdxRef.current = 0;
        setCanUndo(false);
        setCanRedo(false);
        // Auto-detect bg color from corners
        const octx = orig.getContext("2d", { willReadFrequently: true });
        const d = octx ? octx.getImageData(0, 0, w, h).data : new Uint8ClampedArray(0);
        const corner = (x: number, y: number): [number, number, number] => {
          let r = 0, g = 0, b = 0, n = 0;
          for (let dy = 0; dy < 6; dy++) {
            for (let dx = 0; dx < 6; dx++) {
              const o = ((y + dy) * w + (x + dx)) * 4;
              r += d[o]!; g += d[o + 1]!; b += d[o + 2]!;
              n++;
            }
          }
          return [r / n, g / n, b / n];
        };
        if (d.length) {
          const corners = [corner(0, 0), corner(w - 6, 0), corner(0, h - 6), corner(w - 6, h - 6)];
          const avg: [number, number, number] = [
            corners.reduce((a, c) => a + c[0], 0) / 4,
            corners.reduce((a, c) => a + c[1], 0) / 4,
            corners.reduce((a, c) => a + c[2], 0) / 4,
          ];
          setBgHex(rgbToHex(avg[0], avg[1], avg[2]));
        }
        setHasImage(true);
        setProcessed(false);
        setShowOriginal(false);
        setBrush(null);
        setPicking(false);
        bgLayerRef.current = null;
        // NOTE: do NOT draw here - the preview canvas mounts only after
        // hasImage flips true, so drawing now hits a null ref. The effect
        // below draws on the next commit.
        // Warm up only the AI runtime (~450KB) while the user looks at the
        // preview. The model weights download only when the user explicitly
        // hits Remove, with a visible progress bar - silently pulling
        // 44-114MB in the background would saturate mobile connections.
        if (typeof window !== "undefined" && "requestIdleCallback" in window) {
          (window as any).requestIdleCallback(() => {
            void warmBgRuntime();
          });
        } else {
          setTimeout(() => {
            void warmBgRuntime();
          }, 2000);
        }
      })
      .catch(() => toast.error("Could not read that image."));
  };

  // Warm the AI runtime (not the weights) when the model or device changes,
  // so the first Remove click starts faster without hidden downloads.
  useEffect(() => {
    if (mode === "ai") {
      void warmBgRuntime();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiModel, webgpu]);

  const drawToView = (canvas: HTMLCanvasElement) => {
    const view = viewRef.current;
    if (!view) return;
    view.width = canvas.width;
    view.height = canvas.height;
    const ctx = view.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, view.width, view.height);
    ctx.drawImage(canvas, 0, 0);
  };

  /** Cached background layer (without the cutout) for the preview. */
  const getBgLayer = (): HTMLCanvasElement | null => {
    const work = workCanvasRef.current;
    if (!work || bgKind === "transparent") return null;
    const key = `${bgKind}|${bgColor}|${bgBlur}|${hasBgImage}|${work.width}x${work.height}`;
    if (bgLayerRef.current?.key === key) return bgLayerRef.current.canvas;
    const c = document.createElement("canvas");
    c.width = work.width;
    c.height = work.height;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    if (bgKind === "color") {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, c.width, c.height);
    } else if (bgKind === "blur" && origCanvasRef.current) {
      // Zoom the blurred backdrop slightly so subject-colored bleed at the
      // frame edge gets pushed outward instead of haloing the cutout.
      const bleed = Math.ceil(bgBlur * 2);
      ctx.filter = `blur(${bgBlur}px)`;
      ctx.drawImage(origCanvasRef.current, -bleed, -bleed, c.width + bleed * 2, c.height + bleed * 2);
      ctx.filter = "none";
    } else if (bgKind === "image" && bgImageRef.current) {
      const src = bgImageRef.current;
      const s = Math.max(c.width / src.width, c.height / src.height);
      const dw = src.width * s;
      const dh = src.height * s;
      ctx.drawImage(src, (c.width - dw) / 2, (c.height - dh) / 2, dw, dh);
    } else {
      return null;
    }
    bgLayerRef.current = { key, canvas: c };
    return c;
  };

  /** Draw the working image (plus replacement background when active). */
  const renderView = () => {
    const work = workCanvasRef.current;
    const view = viewRef.current;
    if (!work || !view) return;
    const layer = processed ? getBgLayer() : null;
    view.width = work.width;
    view.height = work.height;
    const ctx = view.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, view.width, view.height);
    if (layer) ctx.drawImage(layer, 0, 0);
    ctx.drawImage(work, 0, 0);
  };

  // The preview canvas only exists once hasImage is true - draw after it mounts.
  useEffect(() => {
    if (hasImage && workCanvasRef.current) renderView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasImage]);

  // Re-render the preview when background-replacement settings change.
  useEffect(() => {
    if (processed) renderView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bgKind, bgColor, bgBlur, hasBgImage, processed]);

  /** Snapshot the working image for undo/redo. */
  const pushHistory = () => {
    const work = workCanvasRef.current;
    if (!work) return;
    const wctx = work.getContext("2d", { willReadFrequently: true });
    if (!wctx) return;
    const snap = wctx.getImageData(0, 0, work.width, work.height);
    const h = historyRef.current.slice(0, histIdxRef.current + 1);
    h.push(snap);
    if (h.length > HISTORY_LIMIT) h.shift();
    historyRef.current = h;
    histIdxRef.current = h.length - 1;
    setCanUndo(histIdxRef.current > 0);
    setCanRedo(false);
  };

  const applyHistory = (idx: number) => {
    const work = workCanvasRef.current;
    if (!work) return;
    const wctx = work.getContext("2d");
    if (!wctx) return;
    const snap = historyRef.current[idx];
    if (!snap) return;
    wctx.putImageData(snap, 0, 0);
    histIdxRef.current = idx;
    setCanUndo(idx > 0);
    setCanRedo(idx < historyRef.current.length - 1);
    setProcessed(true);
    setShowOriginal(false);
    renderView();
  };

  const undo = () => {
    if (histIdxRef.current > 0) applyHistory(histIdxRef.current - 1);
  };

  const redo = () => {
    if (histIdxRef.current < historyRef.current.length - 1) {
      applyHistory(histIdxRef.current + 1);
    }
  };

  /**
   * Shared cutout core: runs AI (or classic) on a source canvas and returns
   * a fresh RGBA cutout canvas. Used by both single and batch modes.
   */
  const cutoutFromCanvas = async (
    src: HTMLCanvasElement,
    onStage: (s: string) => void,
  ): Promise<{ canvas: HTMLCanvasElement; frac: number; aiOk: boolean }> => {
    const w = src.width;
    const h = src.height;
    const sctx = src.getContext("2d", { willReadFrequently: true });
    if (!sctx) throw new Error("ctx");
    // Always process from the immutable original, so re-runs don't stack on a prior cutout.
    const imgData = sctx.getImageData(0, 0, w, h);
    let frac = 0;
    let aiOk = false;
    if (mode === "ai") {
      try {
        frac = await removeBackgroundAi(
          imgData,
          (stage, f) => onStage(f > 0 ? `${stage} ${Math.round(f * 100)}%` : `${stage}...`),
          aiModel,
          webgpu ? "webgpu" : "auto",
        );
        aiOk = true;
      } catch {
        aiOk = false;
      }
    }
    if (!aiOk) {
      const [br, bg, bb] = hexToRgb(bgHex);
      const tol = (tolerance / 100) * 160; // map slider to color distance
      frac = classicCutout(imgData.data, w, h, mode === "color" ? "color" : "edges", br, bg, bb, tol, feather);
    }
    if (decontam) decontaminate(imgData.data, w, h);
    const out = document.createElement("canvas");
    out.width = w;
    out.height = h;
    const octx = out.getContext("2d");
    if (!octx) throw new Error("ctx");
    octx.putImageData(imgData, 0, 0);
    return { canvas: out, frac, aiOk };
  };

  const remove = () => {
    const orig = origCanvasRef.current;
    const work = workCanvasRef.current;
    if (!orig || !work || !trial.canUse || working) return;
    setWorking(true);
    const toastId = "bg-remove";
    toast.loading(mode === "ai" ? "Starting AI background remover..." : "Removing background...", {
      id: toastId,
    });
    setTimeout(() => {
      cutoutFromCanvas(orig, (s) => toast.loading(s, { id: toastId }))
        .then(({ canvas, frac, aiOk }) => {
          const wctx = work.getContext("2d");
          if (!wctx) throw new Error("ctx");
          wctx.clearRect(0, 0, work.width, work.height);
          wctx.drawImage(canvas, 0, 0);
          pushHistory();
          setProcessed(true);
          setShowOriginal(false);
          bgLayerRef.current = null;
          renderView();
          trial.recordUse();
          if (mode === "ai" && !aiOk) {
            toast.warning("AI model could not load - used classic removal instead.", { id: toastId });
          } else if (frac > 0.98) {
            toast.warning("Almost the whole image was removed - press Undo and try a lower tolerance.", {
              id: toastId,
            });
          } else {
            toast.success(
              mode === "ai"
                ? `Background removed (${Math.round(frac * 100)}% cleared) - touch up with the brush if needed.`
                : "Background removed - touch up with the brush if needed.",
              { id: toastId },
            );
          }
        })
        .catch(() => toast.error("Removal failed on this image.", { id: toastId }))
        .finally(() => setWorking(false));
    }, 60);
  };

  /** Image-space coords from a pointer event over the view canvas. */
  const canvasPos = (e: React.PointerEvent) => {
    const view = viewRef.current!;
    const r = view.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * view.width,
      y: ((e.clientY - r.top) / r.height) * view.height,
    };
  };

  /** Paint one soft circular stamp at image coords (erase or restore). */
  const stamp = (x: number, y: number, kind: BrushKind, size: number) => {
    const work = workCanvasRef.current;
    const orig = origCanvasRef.current;
    if (!work || !orig) return;
    const stampC = document.createElement("canvas");
    stampC.width = stampC.height = Math.max(1, Math.ceil(size));
    const sctx = stampC.getContext("2d");
    if (!sctx) return;
    const g = sctx.createRadialGradient(size / 2, size / 2, size * 0.12, size / 2, size / 2, size / 2);
    if (kind === "erase") {
      g.addColorStop(0, "rgba(0,0,0,1)");
      g.addColorStop(0.75, "rgba(0,0,0,0.85)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      sctx.fillStyle = g;
      sctx.fillRect(0, 0, size, size);
      const wctx = work.getContext("2d");
      if (!wctx) return;
      wctx.save();
      wctx.globalCompositeOperation = "destination-out";
      wctx.drawImage(stampC, x - size / 2, y - size / 2);
      wctx.restore();
    } else {
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.75, "rgba(255,255,255,0.9)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      sctx.fillStyle = g;
      sctx.fillRect(0, 0, size, size);
      sctx.globalCompositeOperation = "source-in";
      sctx.drawImage(orig, x - size / 2, y - size / 2, size, size, 0, 0, size, size);
      const wctx = work.getContext("2d");
      if (!wctx) return;
      wctx.save();
      wctx.globalCompositeOperation = "source-over";
      wctx.drawImage(stampC, x - size / 2, y - size / 2);
      wctx.restore();
    }
    renderView();
  };

  const updateRing = (e: React.PointerEvent) => {
    const ring = ringRef.current;
    const wrap = wrapRef.current;
    const view = viewRef.current;
    if (!ring || !wrap || !view) return;
    if (!brush) {
      ring.style.display = "none";
      return;
    }
    const wr = wrap.getBoundingClientRect();
    const vr = view.getBoundingClientRect();
    const scale = vr.width / view.width;
    const d = Math.max(6, brushSize * scale);
    ring.style.display = "block";
    ring.style.width = `${d}px`;
    ring.style.height = `${d}px`;
    ring.style.left = `${e.clientX - wr.left - d / 2}px`;
    ring.style.top = `${e.clientY - wr.top - d / 2}px`;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (picking) {
      pickColor(e);
      return;
    }
    if (!brush) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const { x, y } = canvasPos(e);
    strokeRef.current = { x, y };
    stamp(x, y, brush, brushSize);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    updateRing(e);
    const last = strokeRef.current;
    if (!last || !brush) return;
    const { x, y } = canvasPos(e);
    const dx = x - last.x;
    const dy = y - last.y;
    const dist = Math.hypot(dx, dy);
    const step = Math.max(1, brushSize * 0.25);
    if (dist >= step) {
      const n = Math.floor(dist / step);
      for (let i = 1; i <= n; i++) {
        stamp(last.x + (dx * i) / n, last.y + (dy * i) / n, brush, brushSize);
      }
      strokeRef.current = { x, y };
    }
  };

  const endStroke = () => {
    if (!strokeRef.current) return;
    strokeRef.current = null;
    pushHistory();
    setProcessed(true);
  };

  const hideRing = () => {
    if (ringRef.current) ringRef.current.style.display = "none";
  };

  const pickColor = (e: React.PointerEvent) => {
    if (!picking) return;
    const view = viewRef.current;
    const orig = origCanvasRef.current;
    if (!view || !orig) return;
    const r = view.getBoundingClientRect();
    const x = Math.floor(((e.clientX - r.left) / r.width) * orig.width);
    const y = Math.floor(((e.clientY - r.top) / r.height) * orig.height);
    // Always sample from the ORIGINAL pixels, not the edited image
    const octx = orig.getContext("2d", { willReadFrequently: true });
    if (!octx) return;
    const px = octx.getImageData(
      Math.min(orig.width - 1, Math.max(0, x)),
      Math.min(orig.height - 1, Math.max(0, y)),
      1, 1,
    ).data;
    setBgHex(rgbToHex(px[0]!, px[1]!, px[2]!));
    setPicking(false);
    setMode("color");
    toast.success("Background color picked - hit Remove.");
  };

  /** Apply output settings (background replacement, mask mode, JPEG flatten) */
  const exportCanvas = (
    cutout: HTMLCanvasElement,
    original: HTMLCanvasElement | null,
  ): HTMLCanvasElement => {
    if (maskOnly) return renderMask(cutout);
    let out: HTMLCanvasElement = cutout;
    if (bgKind !== "transparent") {
      const comp = compositeOver(cutout, {
        kind: bgKind,
        color: bgColor,
        blurPx: bgBlur,
        image: bgImageRef.current,
        original,
      });
      if (comp) out = comp;
    }
    if (outFormat === "jpeg") out = flattenOn(out, bgKind === "color" ? bgColor : "#ffffff");
    return out;
  };

  const downloadCanvas = (src: HTMLCanvasElement, filename: string) => {
    const mime = mimeFor(outFormat);
    const q = outFormat === "png" ? undefined : outQuality / 100;
    src.toBlob(
      (blob) => {
        if (!blob) {
          toast.error("Export failed.");
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Downloaded.");
      },
      mime,
      q,
    );
  };

  const download = () => {
    const work = workCanvasRef.current;
    if (!work || !processed) return;
    downloadCanvas(
      exportCanvas(work, origCanvasRef.current),
      brandFilename(`iconvault-no-background.${extFor(outFormat)}`),
    );
  };

  const reset = () => {
    imgRef.current = null;
    origCanvasRef.current = null;
    workCanvasRef.current = null;
    historyRef.current = [];
    histIdxRef.current = 0;
    strokeRef.current = null;
    bgLayerRef.current = null;
    setHasImage(false);
    setProcessed(false);
    setShowOriginal(false);
    setPicking(false);
    setBrush(null);
    setCanUndo(false);
    setCanRedo(false);
  };

  const toggleView = () => {
    const orig = origCanvasRef.current;
    const work = workCanvasRef.current;
    if (!processed || !orig || !work) return;
    const next = !showOriginal;
    setShowOriginal(next);
    if (next) drawToView(orig);
    else renderView();
  };

  const loadBgImage = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        return;
      }
      ctx.drawImage(img, 0, 0);
      bgImageRef.current = c;
      bgLayerRef.current = null;
      setHasBgImage(true);
      URL.revokeObjectURL(url);
      if (processed) renderView();
      toast.success("Replacement background loaded.");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      toast.error("Could not read that image.");
    };
    img.src = url;
  };

  // ---------- Batch queue ----------

  const addBatchFiles = (files: FileList | File[]) => {
    const imgs = [...files]
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, Math.max(0, BATCH_LIMIT - batch.length));
    if (!imgs.length) {
      toast.error(`Choose image files (max ${BATCH_LIMIT} per batch).`);
      return;
    }
    setBatch((prev) => [
      ...prev,
      ...imgs.map((f) => ({
        id: ++batchIdRef.current,
        file: f,
        name: f.name,
        url: URL.createObjectURL(f),
        status: "queued" as BatchStatus,
        note: "",
        src: null as HTMLCanvasElement | null,
        result: null as HTMLCanvasElement | null,
      })),
    ]);
    if (batchSel == null && imgs.length) setBatchSel(batchIdRef.current - imgs.length + 1);
  };

  const removeBatchItem = (id: number) => {
    setBatch((prev) => {
      const item = prev.find((b) => b.id === id);
      if (item) URL.revokeObjectURL(item.url);
      return prev.filter((b) => b.id !== id);
    });
    if (batchSel === id) setBatchSel(null);
  };

  const processBatch = async () => {
    const queued = batch.filter((b) => b.status === "queued");
    if (!queued.length || batchWorking) return;
    // Each image consumes one free auto-removal (Pro is unlimited).
    const remaining = isPro ? queued.length : Math.max(0, TOOL_TRIAL_LIMIT - getTrialUsed("background-remover"));
    const targets = queued.slice(0, remaining);
    if (!targets.length) {
      toast.error("Daily free limit reached - brush touch-ups are still free and unlimited.");
      return;
    }
    setBatchWorking(true);
    const toastId = "bg-batch";
    let done = 0;
    for (const item of targets) {
      setBatch((prev) => prev.map((b) => (b.id === item.id ? { ...b, status: "working", note: "Working..." } : b)));
      try {
        const src = await fileToCanvas(item.file);
        const { canvas, aiOk } = await cutoutFromCanvas(src, (s) =>
          toast.loading(`[${done + 1}/${targets.length}] ${item.name}: ${s}`, { id: toastId }),
        );
        recordTrialUse("background-remover");
        setBatch((prev) =>
          prev.map((b) =>
            b.id === item.id
              ? {
                  ...b,
                  status: "done",
                  note: aiOk || mode !== "ai" ? "Done" : "Done (classic fallback)",
                  src,
                  result: canvas,
                }
              : b,
          ),
        );
        done++;
      } catch {
        setBatch((prev) => prev.map((b) => (b.id === item.id ? { ...b, status: "error", note: "Failed" } : b)));
      }
    }
    setBatchWorking(false);
    toast.success(`Batch done: ${done} of ${targets.length} processed.`, { id: toastId });
  };

  const downloadBatchItem = (item: BatchItem) => {
    if (!item.result) return;
    downloadCanvas(
      exportCanvas(item.result, item.src),
      brandFilename(`iconvault-no-background-${item.name.replace(/\.[^.]+$/, "")}.${extFor(outFormat)}`),
    );
  };

  const downloadZip = async () => {
    const doneItems = batch.filter((b) => b.status === "done" && b.result);
    if (!doneItems.length || batchWorking) return;
    const toastId = "bg-zip";
    toast.loading("Building ZIP...", { id: toastId });
    try {
      const zip = new JSZip();
      const mime = mimeFor(outFormat);
      const q = outFormat === "png" ? undefined : outQuality / 100;
      const ext = extFor(outFormat);
      let i = 0;
      for (const item of doneItems) {
        const out = exportCanvas(item.result!, item.src);
        const blob = await new Promise<Blob | null>((res) => out.toBlob(res, mime, q));
        if (blob) {
          i++;
          zip.file(`no-background-${String(i).padStart(2, "0")}-${item.name.replace(/\.[^.]+$/, "")}.${ext}`, blob);
        }
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = brandFilename("iconvault-backgrounds.zip");
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`ZIP downloaded (${i} images).`, { id: toastId });
    } catch {
      toast.error("ZIP export failed.", { id: toastId });
    }
  };

  /** Draw the selected batch result into the preview pane. */
  const renderBatchView = () => {
    const view = viewRef.current;
    if (!view) return;
    const item = batch.find((b) => b.id === batchSel);
    if (!item?.result) {
      const ctx = view.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, view.width, view.height);
      return;
    }
    drawToView(exportCanvas(item.result, item.src));
  };

  useEffect(() => {
    if (batchMode) renderBatchView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchMode, batchSel, batch, bgKind, bgColor, bgBlur, hasBgImage, outFormat, outQuality, maskOnly]);

  const selModel = BG_MODELS.find((m) => m.id === aiModel) ?? BG_MODELS[0]!;

  return (
    <ToolPageShell toolId="background-remover" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Background Remover" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          {/* Single / Batch switch */}
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Processing mode">
            {(
              [
                { id: false, label: "Single image", icon: ImagePlus },
                { id: true, label: "Batch", icon: Images },
              ] as const
            ).map((t) => (
              <button
                key={String(t.id)}
                type="button"
                onClick={() => setBatchMode(t.id)}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-bold transition",
                  batchMode === t.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </button>
            ))}
          </div>

          {batchMode ? (
            <>
              <label
                className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border text-center transition-colors hover:border-primary/50"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files?.length) addBatchFiles(e.dataTransfer.files);
                }}
              >
                <Images className="mb-3 h-10 w-10 text-muted-foreground/60" />
                <p className="font-semibold">Drop up to {BATCH_LIMIT} images, or click</p>
                <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                  Each image uses one free auto-removal. The AI model loads once and is reused.
                </p>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length) addBatchFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>

              {batch.length > 0 && (
                <>
                  <div className="flex gap-2">
                    <ActionButton disabled={batchWorking} onClick={() => void processBatch()}>
                      <Eraser className="h-4 w-4" /> {batchWorking ? "Processing..." : "Remove all backgrounds"}
                    </ActionButton>
                  </div>
                  <button
                    type="button"
                    onClick={() => void downloadZip()}
                    disabled={batchWorking || !batch.some((b) => b.status === "done")}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:opacity-40"
                  >
                    <FileDown className="h-3.5 w-3.5" /> Download all as ZIP
                  </button>
                  <ul className="max-h-72 space-y-2 overflow-auto pr-1">
                    {batch.map((b) => (
                      <li
                        key={b.id}
                        className={cn(
                          "flex items-center gap-2 rounded-xl border p-2",
                          batchSel === b.id ? "border-primary/60" : "border-border",
                        )}
                      >
                        <button type="button" onClick={() => setBatchSel(b.id)} className="shrink-0">
                          <img src={b.url} alt="" className="h-11 w-11 rounded-lg object-cover" />
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold">{b.name}</p>
                          <p
                            className={cn(
                              "text-[11px]",
                              b.status === "done"
                                ? "text-green-600 dark:text-green-400"
                                : b.status === "error"
                                  ? "text-red-500"
                                  : b.status === "working"
                                    ? "text-primary"
                                    : "text-muted-foreground",
                            )}
                          >
                            {b.status === "queued" ? "Queued" : b.note}
                          </p>
                        </div>
                        {b.status === "done" && (
                          <button
                            type="button"
                            onClick={() => downloadBatchItem(b)}
                            className="rounded-lg border border-border p-1.5 text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                            aria-label={`Download ${b.name}`}
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeBatchItem(b.id)}
                          disabled={batchWorking}
                          className="rounded-lg p-1.5 text-muted-foreground transition hover:text-foreground disabled:opacity-40"
                          aria-label={`Remove ${b.name}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-muted-foreground">
                    Output settings (format, background) apply to every download, including the ZIP.
                  </p>
                </>
              )}
            </>
          ) : !hasImage ? (
            <label
              className="flex min-h-[280px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border text-center transition-colors hover:border-primary/50"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) loadFile(f);
              }}
            >
              <ImagePlus className="mb-3 h-10 w-10 text-muted-foreground/60" />
              <p className="font-semibold">Drop an image here, or click to upload</p>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                AI cutout works on any photo. Classic modes handle solid backgrounds.
              </p>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) loadFile(f);
                }}
              />
            </label>
          ) : (
            <>
              <div>
                <span className="mb-2 block text-[13px] font-medium text-foreground/80">
                  1. Auto remove
                </span>
                <div className="grid grid-cols-3 gap-2" role="group" aria-label="Removal mode">
                  {(
                    [
                      { id: "ai", label: "AI (subject)" },
                      { id: "edges", label: "Auto (edges)" },
                      { id: "color", label: "Color key" },
                    ] as { id: Mode; label: string }[]
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMode(m.id)}
                      className={cn(
                        "rounded-xl border py-2.5 text-sm font-bold transition",
                        mode === m.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40",
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {mode === "ai"
                    ? "AI finds the subject (person, product, pet) and removes the rest - works on any photo background. First use downloads the model once."
                    : mode === "edges"
                      ? "Flood-fills the background starting from the image edges - ideal for product shots."
                      : "Removes every pixel close to the chosen color, anywhere in the image."}
                </p>
              </div>

              {mode === "ai" && (
                <div>
                  <span className="mb-2 block text-[13px] font-medium text-foreground/80">
                    AI model
                  </span>
                  <div className="grid grid-cols-3 gap-2" role="group" aria-label="AI model">
                    {BG_MODELS.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setAiModel(m.id)}
                        title={m.blurb}
                        className={cn(
                          "rounded-xl border px-1 py-2 text-sm font-bold transition",
                          aiModel === m.id
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/40",
                        )}
                      >
                        {m.label}
                        <span className="mt-0.5 block text-[10px] font-medium opacity-80">{m.short}</span>
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">{selModel.blurb}</p>
                  <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={webgpu}
                      onChange={(e) => setWebgpu(e.target.checked)}
                      className="h-3.5 w-3.5 accent-primary"
                    />
                    Faster with GPU (WebGPU) - falls back automatically if unavailable
                  </label>
                  <label className="mt-1.5 flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={decontam}
                      onChange={(e) => setDecontam(e.target.checked)}
                      className="h-3.5 w-3.5 accent-primary"
                    />
                    Clean edge halos (removes background color spill on hair and fur)
                  </label>
                </div>
              )}

              {mode !== "ai" && (
                <>
              <div>
                <span className="mb-2 block text-[13px] font-medium text-foreground/80">
                  Background color
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={bgHex}
                    onChange={(e) => setBgHex(e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded-lg border border-border bg-transparent"
                    aria-label="Background color"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPicking((p) => !p);
                      setBrush(null);
                      setMode("color");
                    }}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-bold transition",
                      picking
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    <Pipette className="h-3.5 w-3.5" />
                    {picking ? "Click the image..." : "Pick from image"}
                  </button>
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[13px] font-medium text-foreground/80">Tolerance</span>
                  <span className="font-mono text-xs text-muted-foreground">{tolerance}</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={80}
                  value={tolerance}
                  onChange={(e) => setTolerance(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[13px] font-medium text-foreground/80">Edge feather</span>
                  <span className="font-mono text-xs text-muted-foreground">{feather}px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={8}
                  value={feather}
                  onChange={(e) => setFeather(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
                </>
              )}

              <ActionButton disabled={!trial.canUse || working} onClick={remove}>
                <Eraser className="h-4 w-4" /> {working ? "Removing..." : "Remove background"}
              </ActionButton>

              <div>
                <span className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-foreground/80">
                  <Layers className="h-3.5 w-3.5" /> 2. Background
                </span>
                <div className="grid grid-cols-4 gap-2" role="group" aria-label="Replacement background">
                  {(
                    [
                      { id: "transparent", label: "None" },
                      { id: "color", label: "Color" },
                      { id: "blur", label: "Blur" },
                      { id: "image", label: "Image" },
                    ] as { id: BgReplaceKind; label: string }[]
                  ).map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        setBgKind(b.id);
                        bgLayerRef.current = null;
                        if (processed) renderView();
                      }}
                      className={cn(
                        "rounded-xl border py-2 text-xs font-bold transition",
                        bgKind === b.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40",
                      )}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
                {bgKind === "color" && (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => {
                        setBgColor(e.target.value);
                        bgLayerRef.current = null;
                        if (processed) renderView();
                      }}
                      className="h-10 w-14 cursor-pointer rounded-lg border border-border bg-transparent"
                      aria-label="Replacement background color"
                    />
                    <span className="font-mono text-xs text-muted-foreground">{bgColor}</span>
                  </div>
                )}
                {bgKind === "blur" && (
                  <div className="mt-2">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[13px] font-medium text-foreground/80">Blur amount</span>
                      <span className="font-mono text-xs text-muted-foreground">{bgBlur}px</span>
                    </div>
                    <input
                      type="range"
                      min={2}
                      max={40}
                      value={bgBlur}
                      onChange={(e) => {
                        setBgBlur(Number(e.target.value));
                        bgLayerRef.current = null;
                        if (processed) renderView();
                      }}
                      className="w-full accent-primary"
                    />
                  </div>
                )}
                {bgKind === "image" && (
                  <label className="mt-2 flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2.5 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-foreground">
                    <ImagePlus className="h-3.5 w-3.5" />
                    {hasBgImage ? "Change background image" : "Upload background image"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) loadBgImage(f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Applies to the preview and the download - the cutout itself stays untouched.
                </p>
              </div>

              <div>
                <span className="mb-2 block text-[13px] font-medium text-foreground/80">
                  3. Touch up with brush
                </span>
                <div className="grid grid-cols-2 gap-2" role="group" aria-label="Brush tool">
                  {(
                    [
                      { id: "erase", label: "Erase bg", icon: Eraser },
                      { id: "restore", label: "Restore", icon: Paintbrush },
                    ] as { id: BrushKind; label: string; icon: typeof Eraser }[]
                  ).map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        setBrush((cur) => (cur === b.id ? null : b.id));
                        setPicking(false);
                      }}
                      className={cn(
                        "flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-bold transition",
                        brush === b.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40",
                      )}
                    >
                      <b.icon className="h-4 w-4" />
                      {b.label}
                    </button>
                  ))}
                </div>
                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[13px] font-medium text-foreground/80">Brush size</span>
                    <span className="font-mono text-xs text-muted-foreground">{brushSize}px</span>
                  </div>
                  <input
                    type="range"
                    min={4}
                    max={160}
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={undo}
                    disabled={!canUndo}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:opacity-40"
                  >
                    <Undo2 className="h-3.5 w-3.5" /> Undo
                  </button>
                  <button
                    type="button"
                    onClick={redo}
                    disabled={!canRedo}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:opacity-40"
                  >
                    <Redo2 className="h-3.5 w-3.5" /> Redo
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Paint over leftover background to erase it, or restore parts erased by mistake.
                  Free and unlimited.
                </p>
              </div>

              <div>
                <span className="mb-2 block text-[13px] font-medium text-foreground/80">
                  4. Export
                </span>
                <div className="grid grid-cols-3 gap-2" role="group" aria-label="Output format">
                  {(
                    [
                      { id: "png", label: "PNG" },
                      { id: "jpeg", label: "JPG" },
                      { id: "webp", label: "WebP" },
                    ] as { id: OutFormat; label: string }[]
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setOutFormat(f.id)}
                      className={cn(
                        "rounded-xl border py-2 text-xs font-bold transition",
                        outFormat === f.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40",
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                {outFormat !== "png" && (
                  <div className="mt-2">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[13px] font-medium text-foreground/80">Quality</span>
                      <span className="font-mono text-xs text-muted-foreground">{outQuality}%</span>
                    </div>
                    <input
                      type="range"
                      min={40}
                      max={100}
                      value={outQuality}
                      onChange={(e) => setOutQuality(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                  </div>
                )}
                <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={maskOnly}
                    onChange={(e) => setMaskOnly(e.target.checked)}
                    className="h-3.5 w-3.5 accent-primary"
                  />
                  Export the mask only (black and white)
                </label>
                {outFormat === "jpeg" && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    JPG has no transparency - the cutout is flattened onto{" "}
                    {bgKind === "color" ? "your background color" : "white"}.
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={toggleView}
                  disabled={!processed}
                  className="flex-1 rounded-xl border border-border py-2 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:opacity-40"
                >
                  {showOriginal ? "Show cutout" : "Show original"}
                </button>
                <button
                  type="button"
                  onClick={download}
                  disabled={!processed}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary py-2 text-xs font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
                >
                  <Download className="h-3.5 w-3.5" /> {outFormat.toUpperCase()}
                </button>
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-xl border border-border px-3 py-2 text-muted-foreground transition hover:text-foreground"
                  aria-label="New image"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>

              {!isPro && (
                <p className="text-xs text-muted-foreground">
                  {trial.left} of {TOOL_TRIAL_LIMIT} free auto-removals left - brush touch-ups are
                  free and unlimited, and your photo never leaves this browser.
                </p>
              )}
            </>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {batchMode ? (
            batchSel != null && batch.find((b) => b.id === batchSel)?.result ? (
              <>
                <p className="mb-2 text-xs font-semibold text-muted-foreground">
                  Preview - {batch.find((b) => b.id === batchSel)?.name} (output settings applied)
                </p>
                <div className="checkerboard relative overflow-auto rounded-xl border border-border" style={{ maxHeight: "72vh" }}>
                  <canvas ref={viewRef} className="block" style={{ width: "100%", height: "auto", maxHeight: 560 }} />
                </div>
              </>
            ) : (
              <div className="flex min-h-[380px] flex-col items-center justify-center text-center">
                <Images className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="font-semibold">Batch results appear here</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Add images on the left, hit "Remove all backgrounds", then click any finished
                  image to preview it.
                </p>
              </div>
            )
          ) : !hasImage ? (
            <div className="flex min-h-[380px] flex-col items-center justify-center text-center">
              <Eraser className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your cutout appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Upload any photo, hit Remove, then clean the edges with the
                brush if needed.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-muted-foreground">
                  {zoom === "actual"
                    ? "Preview at actual image size - scroll to inspect edges"
                    : "Preview fitted to screen - switch to Actual size to inspect edges"}
                </p>
                <div className="flex shrink-0 gap-1 rounded-lg border border-border p-0.5" role="group" aria-label="Preview zoom">
                  {(
                    [
                      { id: "actual", label: "Actual size" },
                      { id: "fit", label: "Fit" },
                    ] as const
                  ).map((z) => (
                    <button
                      key={z.id}
                      type="button"
                      onClick={() => setZoom(z.id)}
                      className={cn(
                        "rounded-md px-2.5 py-1 text-[11px] font-bold transition",
                        zoom === z.id
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {z.label}
                    </button>
                  ))}
                </div>
              </div>
              <div
                ref={wrapRef}
                className="checkerboard relative overflow-auto rounded-xl border border-border"
                style={{
                  cursor: picking ? "crosshair" : brush ? "none" : "default",
                  touchAction: brush ? "none" : "auto",
                  maxHeight: "72vh",
                }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endStroke}
                onPointerCancel={endStroke}
                onPointerLeave={hideRing}
              >
                <canvas
                  ref={viewRef}
                  className="block"
                  style={
                    zoom === "actual"
                      ? { width: "auto", height: "auto", maxWidth: "none" }
                      : { width: "100%", height: "auto", maxHeight: 560 }
                  }
                />
                <div
                  ref={ringRef}
                  className="pointer-events-none absolute z-10 hidden rounded-full border-2 border-primary bg-primary/10"
                  style={{ boxShadow: "0 0 0 1px rgba(255,255,255,.7)" }}
                />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {picking
                  ? "Click any background pixel in the preview to sample its color."
                  : brush
                    ? "Paint on the image - the circle shows your brush size."
                    : mode === "ai"
                      ? "Tip: AI handles any background. Touch up leftovers with the brush."
                      : "Tip: if the subject gets eaten, lower the tolerance or press Undo. If background remains, raise it."}
              </p>
            </>
          )}
        </div>
      </div>

      <style>{`.checkerboard{background-image:conic-gradient(#e5e5e5 0 25%,#fff 0 50%,#e5e5e5 0 75%,#fff 0);background-size:20px 20px;}`}</style>
    </ToolPageShell>
  );
}
