// /tools/background-remover - AI subject cutout (BiRefNet, on-device) plus
// classic solid-background removal (auto edge flood-fill or color key), then
// touch up with a manual brush (erase / restore, adjustable size) with
// undo + redo. 100% client-side, transparent PNG export.

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
} from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { removeBackgroundAi, loadBgAi } from "@/lib/bg-ai";
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

const MAX_DIM = 1600;
const HISTORY_LIMIT = 30;

/** Weighted RGB distance (green counts most, like human vision). */
export function colorDist(
  r1: number, g1: number, b1: number,
  r2: number, g2: number, b2: number,
): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db);
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Flood-fill the background mask starting from the image edges. mask=1 => background. */
export function floodFill(
  mask: Uint8Array,
  w: number,
  h: number,
  data: Uint8ClampedArray,
  br: number, bg: number, bb: number,
  tol: number,
): void {
  const stack: number[] = [];
  const trySeed = (x: number, y: number) => {
    const i = y * w + x;
    if (mask[i]) return;
    const o = i * 4;
    if (colorDist(data[o]!, data[o + 1]!, data[o + 2]!, br, bg, bb) < tol) {
      mask[i] = 1;
      stack.push(i);
    }
  };
  for (let x = 0; x < w; x++) {
    trySeed(x, 0);
    trySeed(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    trySeed(0, y);
    trySeed(w - 1, y);
  }
  while (stack.length) {
    const i = stack.pop()!;
    const x = i % w;
    const y = Math.floor(i / w);
    const neighbors = [
      x > 0 ? i - 1 : -1,
      x < w - 1 ? i + 1 : -1,
      y > 0 ? i - w : -1,
      y < h - 1 ? i + w : -1,
    ];
    for (const n of neighbors) {
      if (n < 0 || mask[n]) continue;
      const o = n * 4;
      if (colorDist(data[o]!, data[o + 1]!, data[o + 2]!, br, bg, bb) < tol) {
        mask[n] = 1;
        stack.push(n);
      }
    }
  }
}

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

  const [hasImage, setHasImage] = useState(false);
  const [mode, setMode] = useState<Mode>("ai");
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

  const loadFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const s = Math.min(1, MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * s);
      const h = Math.round(img.naturalHeight * s);
      const orig = document.createElement("canvas");
      orig.width = w;
      orig.height = h;
      const octx = orig.getContext("2d", { willReadFrequently: true });
      if (!octx) return;
      octx.drawImage(img, 0, 0, w, h);
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
      const d = octx.getImageData(0, 0, w, h).data;
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
      const corners = [corner(0, 0), corner(w - 6, 0), corner(0, h - 6), corner(w - 6, h - 6)];
      const avg: [number, number, number] = [
        corners.reduce((a, c) => a + c[0], 0) / 4,
        corners.reduce((a, c) => a + c[1], 0) / 4,
        corners.reduce((a, c) => a + c[2], 0) / 4,
      ];
      setBgHex(rgbToHex(avg[0], avg[1], avg[2]));
      setHasImage(true);
      setProcessed(false);
      setShowOriginal(false);
      setBrush(null);
      setPicking(false);
      // NOTE: do NOT draw here - the preview canvas mounts only after
      // hasImage flips true, so drawing now hits a null ref. The effect
      // below draws on the next commit.
      URL.revokeObjectURL(url);
      // Warm up the AI model while the user looks at the preview, so the
      // first Remove click feels instant. The download is cached by the
      // browser, and nothing runs until the user clicks Remove.
      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        (window as any).requestIdleCallback(() => {
          void loadBgAi();
        });
      } else {
        setTimeout(() => {
          void loadBgAi();
        }, 2000);
      }
    };
    img.onerror = () => toast.error("Could not read that image.");
    img.src = url;
  };

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

  // The preview canvas only exists once hasImage is true - draw after it mounts.
  useEffect(() => {
    if (hasImage && workCanvasRef.current) drawToView(workCanvasRef.current);
  }, [hasImage]);

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
    drawToView(work);
  };

  const undo = () => {
    if (histIdxRef.current > 0) applyHistory(histIdxRef.current - 1);
  };

  const redo = () => {
    if (histIdxRef.current < historyRef.current.length - 1) {
      applyHistory(histIdxRef.current + 1);
    }
  };

  const remove = () => {
    const orig = origCanvasRef.current;
    const work = workCanvasRef.current;
    if (!orig || !work || !trial.canUse || working) return;
    setWorking(true);
    if (mode === "ai") {
      void removeAi().finally(() => setWorking(false));
    } else {
      const m = mode;
      setTimeout(() => {
        try {
          removeClassic(m);
        } finally {
          setWorking(false);
        }
      }, 60);
    }
  };

  /** AI subject segmentation - runs on-device, falls back to classic on failure. */
  const removeAi = async () => {
    const orig = origCanvasRef.current;
    const work = workCanvasRef.current;
    if (!orig || !work) return;
    const w = orig.width;
    const h = orig.height;
    const octx = orig.getContext("2d", { willReadFrequently: true });
    if (!octx) {
      toast.error("Removal failed on this image.");
      return;
    }
    // Always process from the immutable original, so re-runs don't stack on a prior cutout.
    const imgData = octx.getImageData(0, 0, w, h);
    const toastId = "bg-ai-remove";
    toast.loading("Starting AI background remover...", { id: toastId });
    try {
      const frac = await removeBackgroundAi(imgData, (stage, f) => {
        toast.loading(f > 0 ? `${stage} ${Math.round(f * 100)}%` : `${stage}...`, { id: toastId });
      });
      const wctx = work.getContext("2d");
      if (!wctx) throw new Error("ctx");
      wctx.putImageData(imgData, 0, 0);
      pushHistory();
      setProcessed(true);
      setShowOriginal(false);
      drawToView(work);
      trial.recordUse();
      toast.success(`Background removed (${Math.round(frac * 100)}% cleared) - touch up with the brush if needed.`, { id: toastId });
    } catch {
      // AI could not run (offline, low memory) - fall back to the classic
      // edges method so the click still does something useful.
      toast.warning("AI model could not load - used classic removal instead.", { id: toastId });
      setMode("edges");
      removeClassic("edges");
    }
  };

  /** Classic solid-background removal (edge flood-fill or color key). */
  const removeClassic = (m: "edges" | "color") => {
    // Always process from the immutable original, so re-runs don't stack on a prior cutout.
    const orig = origCanvasRef.current;
    const work = workCanvasRef.current;
    if (!orig || !work) return;
    try {
        const w = orig.width;
        const h = orig.height;
        const octx = orig.getContext("2d", { willReadFrequently: true });
        if (!octx) return;
        const imgData = octx.getImageData(0, 0, w, h);
        const data = imgData.data;
        const [br, bg, bb] = hexToRgb(bgHex);
        const tol = (tolerance / 100) * 160; // map slider to color distance

        const mask = new Uint8Array(w * h);
        if (m === "edges") {
          floodFill(mask, w, h, data, br, bg, bb, tol);
        } else {
          for (let i = 0; i < w * h; i++) {
            const o = i * 4;
            if (colorDist(data[o]!, data[o + 1]!, data[o + 2]!, br, bg, bb) < tol) mask[i] = 1;
          }
        }

        let removed = 0;
        for (let i = 0; i < mask.length; i++) if (mask[i]) removed++;
        const removedFrac = removed / mask.length;

        // Build alpha: background -> transparent, with optional feather blur
        const maskCanvas = document.createElement("canvas");
        maskCanvas.width = w;
        maskCanvas.height = h;
        const mctx = maskCanvas.getContext("2d", { willReadFrequently: true });
        if (!mctx) return;
        const mImg = mctx.createImageData(w, h);
        for (let i = 0; i < w * h; i++) {
          mImg.data[i * 4 + 3] = mask[i] ? 0 : 255;
          mImg.data[i * 4] = mImg.data[i * 4 + 1] = mImg.data[i * 4 + 2] = 255;
        }
        mctx.putImageData(mImg, 0, 0);

        let alphaData: Uint8ClampedArray;
        if (feather > 0) {
          const blur = document.createElement("canvas");
          blur.width = w;
          blur.height = h;
          const bctx = blur.getContext("2d", { willReadFrequently: true });
          if (!bctx) return;
          bctx.filter = `blur(${feather}px)`;
          bctx.drawImage(maskCanvas, 0, 0);
          alphaData = bctx.getImageData(0, 0, w, h).data;
        } else {
          alphaData = mctx.getImageData(0, 0, w, h).data;
        }

        const wctx = work.getContext("2d");
        if (!wctx) return;
        const outImg = wctx.createImageData(w, h);
        for (let i = 0; i < w * h; i++) {
          const o = i * 4;
          outImg.data[o] = data[o]!;
          outImg.data[o + 1] = data[o + 1]!;
          outImg.data[o + 2] = data[o + 2]!;
          outImg.data[o + 3] = alphaData[o + 3]!;
        }
        wctx.putImageData(outImg, 0, 0);

        pushHistory();
        setProcessed(true);
        setShowOriginal(false);
        drawToView(work);
        trial.recordUse();
        if (removedFrac > 0.98) {
          toast.warning("Almost the whole image was removed - press Undo and try a lower tolerance.");
        } else {
          toast.success("Background removed - touch up with the brush if needed.");
        }
      } catch {
        toast.error("Removal failed on this image.");
      }
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
    const view = viewRef.current;
    if (!work || !orig || !view) return;
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
      for (const c of [work, view]) {
        const ctx = c.getContext("2d");
        if (!ctx) continue;
        ctx.save();
        ctx.globalCompositeOperation = "destination-out";
        ctx.drawImage(stampC, x - size / 2, y - size / 2);
        ctx.restore();
      }
    } else {
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.75, "rgba(255,255,255,0.9)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      sctx.fillStyle = g;
      sctx.fillRect(0, 0, size, size);
      sctx.globalCompositeOperation = "source-in";
      sctx.drawImage(orig, x - size / 2, y - size / 2, size, size, 0, 0, size, size);
      for (const c of [work, view]) {
        const ctx = c.getContext("2d");
        if (!ctx) continue;
        ctx.save();
        ctx.globalCompositeOperation = "source-over";
        ctx.drawImage(stampC, x - size / 2, y - size / 2);
        ctx.restore();
      }
    }
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

  const download = () => {
    const work = workCanvasRef.current;
    if (!work) return;
    work.toBlob((blob) => {
      if (!blob) {
        toast.error("Export failed.");
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = brandFilename("iconvault-no-background.png");
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PNG downloaded.");
    }, "image/png");
  };

  const reset = () => {
    imgRef.current = null;
    origCanvasRef.current = null;
    workCanvasRef.current = null;
    historyRef.current = [];
    histIdxRef.current = 0;
    strokeRef.current = null;
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
    drawToView(next ? orig : work);
  };

  return (
    <ToolPageShell toolId="background-remover" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Background Remover" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          {!hasImage ? (
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
                <span className="mb-2 block text-[13px] font-medium text-foreground/80">
                  2. Touch up with brush
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
                  <Download className="h-3.5 w-3.5" /> PNG
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
          {!hasImage ? (
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
