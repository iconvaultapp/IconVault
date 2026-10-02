// /tools/crop-image - Precise image cropping: drag the crop box on the
// canvas with a rule-of-thirds overlay, corner and edge handles, aspect
// presets, and numeric X/Y/Width/Height inputs that stay in sync. 100%
// in-browser, files never leave the device.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Crop, Download, FileUp, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import {
  loadImageFile,
  canvasToBlob,
  fillBackground,
  extForMime,
} from "@/lib/image-tools";

export const Route = createFileRoute("/tools_/crop-image")({
  head: () => {
    const seo = getToolSeoMeta("crop-image");
    const canonical = "https://iconvault.site/tools/crop-image";
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
  component: CropImageTool,
});

interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

type Mode = "move" | "new" | "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w";

const ASPECTS: { id: string; label: string; ratio: number | null }[] = [
  { id: "free", label: "Free", ratio: null },
  { id: "1:1", label: "1:1", ratio: 1 },
  { id: "4:5", label: "4:5", ratio: 4 / 5 },
  { id: "16:9", label: "16:9", ratio: 16 / 9 },
  { id: "9:16", label: "9:16", ratio: 9 / 16 },
  { id: "3:2", label: "3:2", ratio: 3 / 2 },
];

const MIN_SIDE = 10;

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

function normalize(c: CropRect, iw: number, ih: number): CropRect {
  let { x, y, w, h } = c;
  w = Math.max(MIN_SIDE, w);
  h = Math.max(MIN_SIDE, h);
  if (x < 0) { w += x; x = 0; }
  if (y < 0) { h += y; y = 0; }
  if (x + w > iw) w = iw - x;
  if (y + h > ih) h = ih - y;
  w = Math.max(1, w);
  h = Math.max(1, h);
  return { x, y, w, h };
}

function fitRatio(iw: number, ih: number, ratio: number | null): CropRect {
  if (!ratio) return { x: 0, y: 0, w: iw, h: ih };
  let w = iw;
  let h = w / ratio;
  if (h > ih) {
    h = ih;
    w = h * ratio;
  }
  return normalize({ x: (iw - w) / 2, y: (ih - h) / 2, w, h }, iw, ih);
}

function CropImageTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("crop-image", isPro);
  const seo = getToolSeo("crop-image");

  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [name, setName] = useState("");
  const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, w: 1, h: 1 });
  const [aspect, setAspect] = useState("free");
  const [format, setFormat] = useState<"image/jpeg" | "image/webp">("image/jpeg");
  const [quality, setQuality] = useState(90);
  const [disp, setDisp] = useState({ w: 0, h: 0, scale: 1 });
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hover, setHover] = useState<Mode | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ mode: Mode; sx: number; sy: number; orig: CropRect } | null>(null);

  const aspectRatio = ASPECTS.find((a) => a.id === aspect)?.ratio ?? null;

  const acceptFile = useCallback(async (f: File) => {
    if (!f.type.startsWith("image/")) {
      setError("Please choose a JPG, PNG or WebP image.");
      return;
    }
    try {
      const loaded = await loadImageFile(f);
      const w = Math.min(loaded.naturalWidth, 640);
      const scale = w / loaded.naturalWidth;
      setDisp({ w, h: Math.round(loaded.naturalHeight * scale), scale });
      setImg(loaded);
      setName(f.name.replace(/\.[^.]+$/, ""));
      setCrop({ x: 0, y: 0, w: loaded.naturalWidth, h: loaded.naturalHeight });
      setAspect("free");
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that image.");
    }
  }, []);

  // Paint the editor canvas.
  useEffect(() => {
    if (!img || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = disp.w;
    canvas.height = disp.h;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, disp.w, disp.h);
    ctx.drawImage(img, 0, 0, disp.w, disp.h);
    const s = disp.scale;
    const c = { x: crop.x * s, y: crop.y * s, w: crop.w * s, h: crop.h * s };
    // Dim everything outside the crop box.
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, disp.w, c.y);
    ctx.fillRect(0, c.y + c.h, disp.w, disp.h - c.y - c.h);
    ctx.fillRect(0, c.y, c.x, c.h);
    ctx.fillRect(c.x + c.w, c.y, disp.w - c.x - c.w, c.h);
    // Crop border.
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(c.x, c.y, c.w, c.h);
    // Rule-of-thirds grid.
    ctx.strokeStyle = "rgba(255,255,255,0.65)";
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(c.x + (c.w * i) / 3, c.y);
      ctx.lineTo(c.x + (c.w * i) / 3, c.y + c.h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(c.x, c.y + (c.h * i) / 3);
      ctx.lineTo(c.x + c.w, c.y + (c.h * i) / 3);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    // Handles.
    const hs = 12;
    const pts: [number, number][] = [
      [c.x, c.y], [c.x + c.w / 2, c.y], [c.x + c.w, c.y],
      [c.x, c.y + c.h / 2], [c.x + c.w, c.y + c.h / 2],
      [c.x, c.y + c.h], [c.x + c.w / 2, c.y + c.h], [c.x + c.w, c.y + c.h],
    ];
    for (const [px, py] of pts) {
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.rect(px - hs / 2, py - hs / 2, hs, hs);
      ctx.fill();
      ctx.stroke();
    }
  }, [img, crop, disp]);

  const toImg = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: (((e.clientX - rect.left) / rect.width) * disp.w) / disp.scale,
      y: (((e.clientY - rect.top) / rect.height) * disp.h) / disp.scale,
    };
  };

  const hitTest = (p: { x: number; y: number }): Mode => {
    const t = 12 / disp.scale;
    const { x, y, w, h } = crop;
    const near = (px: number, py: number) => Math.abs(p.x - px) <= t && Math.abs(p.y - py) <= t;
    if (near(x, y)) return "nw";
    if (near(x + w, y)) return "ne";
    if (near(x, y + h)) return "sw";
    if (near(x + w, y + h)) return "se";
    if (near(x + w / 2, y)) return "n";
    if (near(x + w / 2, y + h)) return "s";
    if (near(x, y + h / 2)) return "w";
    if (near(x + w, y + h / 2)) return "e";
    if (p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h) return "move";
    return "new";
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!img) return;
    const p = toImg(e);
    const mode = hitTest(p);
    dragRef.current = { mode, sx: p.x, sy: p.y, orig: { ...crop } };
    canvasRef.current?.setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!img) return;
    const p = toImg(e);
    const drag = dragRef.current;
    if (!drag) {
      setHover(hitTest(p));
      return;
    }
    const { mode, sx, sy, orig } = drag;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const r = aspectRatio;
    let c: CropRect;
    if (mode === "move") {
      c = {
        ...orig,
        x: clamp(orig.x + p.x - sx, 0, iw - orig.w),
        y: clamp(orig.y + p.y - sy, 0, ih - orig.h),
      };
    } else if (mode === "new") {
      const x0 = Math.min(sx, p.x);
      const y0 = Math.min(sy, p.y);
      let w = Math.abs(p.x - sx);
      let h = Math.abs(p.y - sy);
      if (r) h = w / r;
      c = normalize({ x: x0, y: y0, w, h }, iw, ih);
    } else {
      let { x, y, w, h } = orig;
      const west = mode.includes("w");
      const east = mode.includes("e");
      const north = mode.includes("n");
      const south = mode.includes("s");
      if (east) w = orig.w + (p.x - sx);
      if (west) {
        x = orig.x + (p.x - sx);
        w = orig.w - (p.x - sx);
      }
      if (south) h = orig.h + (p.y - sy);
      if (north) {
        y = orig.y + (p.y - sy);
        h = orig.h - (p.y - sy);
      }
      if (r) {
        if (east || west) {
          h = w / r;
          y = north ? orig.y + orig.h - h : orig.y + (orig.h - h) / 2;
          if (!north && !south) y = orig.y + (orig.h - h) / 2;
        } else {
          w = h * r;
          x = west ? orig.x + orig.w - w : orig.x + (orig.w - w) / 2;
          if (!west && !east) x = orig.x + (orig.w - w) / 2;
        }
      }
      c = normalize({ x, y, w, h }, iw, ih);
    }
    setCrop(c);
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  const pickAspect = (id: string) => {
    setAspect(id);
    if (!img) return;
    const ratio = ASPECTS.find((a) => a.id === id)?.ratio ?? null;
    setCrop(fitRatio(img.naturalWidth, img.naturalHeight, ratio));
  };

  const setNum = (key: keyof CropRect, raw: string) => {
    if (!img) return;
    const v = Math.max(0, Math.floor(Number(raw) || 0));
    setCrop((c) => normalize({ ...c, [key]: v }, img.naturalWidth, img.naturalHeight));
  };

  const cropDownload = useCallback(async () => {
    if (!img || busy || !trial.canUse) return;
    setBusy(true);
    setError(null);
    try {
      const c = {
        x: Math.round(crop.x),
        y: Math.round(crop.y),
        w: Math.round(crop.w),
        h: Math.round(crop.h),
      };
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, c.w);
      canvas.height = Math.max(1, c.h);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, c.x, c.y, c.w, c.h, 0, 0, canvas.width, canvas.height);
      if (format === "image/jpeg") fillBackground(canvas, "#ffffff");
      const blob = await canvasToBlob(canvas, format, quality / 100);
      downloadBlob(blob, `${name || "cropped"}-cropped.${extForMime(format)}`);
      trial.recordUse();
      toast.success("Cropped image downloaded");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Crop failed.");
    } finally {
      setBusy(false);
    }
  }, [img, busy, trial, crop, format, quality, name]);

  const cursors: Record<Mode, string> = {
    move: "move",
    new: "crosshair",
    nw: "nwse-resize",
    se: "nwse-resize",
    ne: "nesw-resize",
    sw: "nesw-resize",
    n: "ns-resize",
    s: "ns-resize",
    e: "ew-resize",
    w: "ew-resize",
  };

  return (
    <ToolPageShell toolId="crop-image" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Crop Image" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) void acceptFile(f); }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition",
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
            )}
          >
            <FileUp className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold">{name || "Drop an image here"}</p>
            <p className="mt-1 text-xs text-muted-foreground">JPG, PNG or WebP</p>
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void acceptFile(f); }}
            />
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Aspect ratio</p>
            <div className="flex flex-wrap gap-2">
              {ASPECTS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => pickAspect(a.id)}
                  className={cn(
                    "rounded-xl border px-3.5 py-2 text-sm font-bold transition",
                    aspect === a.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Crop area (px)</p>
            <div className="grid grid-cols-4 gap-2">
              {(["x", "y", "w", "h"] as const).map((k) => (
                <label key={k} className="block">
                  <span className="mb-1 block text-[11px] font-bold uppercase text-muted-foreground">
                    {k === "w" ? "Width" : k === "h" ? "Height" : k.toUpperCase()}
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={Math.round(crop[k])}
                    disabled={!img}
                    onChange={(e) => setNum(k, e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm font-semibold"
                  />
                </label>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Numbers stay in sync with the box on the canvas.
            </p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Format and quality</p>
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-bold">{quality}%</span>
            </div>
            <div className="mb-2 flex gap-2">
              {(["image/jpeg", "image/webp"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setFormat(m)}
                  className={cn(
                    "flex-1 rounded-xl border px-4 py-2 text-sm font-bold transition",
                    format === m
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {m === "image/jpeg" ? "JPG" : "WebP"}
                </button>
              ))}
            </div>
            <input
              type="range"
              min={5}
              max={100}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          <ActionButton busy={busy} disabled={!img || !trial.canUse} onClick={cropDownload}>
            <Download className="h-4 w-4" /> {busy ? "Cropping…" : "Crop & download"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free crops left - files never leave your device.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {!img ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <ImageIcon className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your image appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Drag on the image to draw a crop box, drag inside it to move, or pull the handles to resize.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <canvas
                ref={canvasRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={() => { dragRef.current = null; setHover(null); }}
                style={{ cursor: hover ? cursors[hover] : "crosshair", touchAction: "none" }}
                className="max-w-full rounded-xl shadow-lg"
              />
              <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Crop className="h-4 w-4" />
                Crop: {Math.round(crop.w)} × {Math.round(crop.h)} px
              </p>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
