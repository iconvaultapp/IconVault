// /tools/photo-collage - Combine 2 to 9 photos into a single collage with
// layouts, spacing, rounded corners and background color. 100% in-browser.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileUp, Image as ImageIcon, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import { loadImageFile, canvasToBlob, drawCover } from "@/lib/image-tools";

export const Route = createFileRoute("/tools_/photo-collage")({
  head: () => {
    const seo = getToolSeoMeta("photo-collage");
    const canonical = "https://iconvault.site/tools/photo-collage";
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
  component: PhotoCollageTool,
});

type Photo = { id: number; url: string; img: HTMLImageElement };
type Rect = { x: number; y: number; w: number; h: number };

const LAYOUTS: { id: string; label: string; cells: number; rects: Rect[]; autoRatio: number }[] = [
  {
    id: "2x2", label: "2x2", cells: 4, autoRatio: 1,
    rects: [
      { x: 0, y: 0, w: 0.5, h: 0.5 }, { x: 0.5, y: 0, w: 0.5, h: 0.5 },
      { x: 0, y: 0.5, w: 0.5, h: 0.5 }, { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ],
  },
  {
    id: "2-across", label: "2 across", cells: 2, autoRatio: 2,
    rects: [{ x: 0, y: 0, w: 0.5, h: 1 }, { x: 0.5, y: 0, w: 0.5, h: 1 }],
  },
  {
    id: "2-stacked", label: "2 stacked", cells: 2, autoRatio: 0.5,
    rects: [{ x: 0, y: 0, w: 1, h: 0.5 }, { x: 0, y: 0.5, w: 1, h: 0.5 }],
  },
  {
    id: "3-across", label: "3 across", cells: 3, autoRatio: 3,
    rects: [
      { x: 0, y: 0, w: 1 / 3, h: 1 }, { x: 1 / 3, y: 0, w: 1 / 3, h: 1 }, { x: 2 / 3, y: 0, w: 1 / 3, h: 1 },
    ],
  },
  {
    id: "big-plus-two", label: "1 big + 2", cells: 3, autoRatio: 4 / 3,
    rects: [
      { x: 0, y: 0, w: 2 / 3, h: 1 },
      { x: 2 / 3, y: 0, w: 1 / 3, h: 0.5 },
      { x: 2 / 3, y: 0.5, w: 1 / 3, h: 0.5 },
    ],
  },
  {
    id: "3x3", label: "3x3", cells: 9, autoRatio: 1,
    rects: Array.from({ length: 9 }, (_, i) => ({
      x: (i % 3) / 3, y: Math.floor(i / 3) / 3, w: 1 / 3, h: 1 / 3,
    })),
  },
];

const SHAPES: { id: string; label: string; ratio: number | null }[] = [
  { id: "auto", label: "Auto", ratio: null },
  { id: "1:1", label: "1:1", ratio: 1 },
  { id: "4:5", label: "4:5", ratio: 4 / 5 },
  { id: "16:9", label: "16:9", ratio: 16 / 9 },
  { id: "9:16", label: "9:16", ratio: 9 / 16 },
];

let nextId = 1;

function renderCollage(
  canvas: HTMLCanvasElement,
  photos: Photo[],
  layoutId: string,
  ratio: number,
  spacing: number,
  radius: number,
  bg: string,
  outW: number,
) {
  const layout = LAYOUTS.find((l) => l.id === layoutId)!;
  const used = photos.slice(0, layout.cells);
  const outH = Math.round(outW / ratio);
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, outW, outH);
  const half = spacing / 2;
  used.forEach((photo, i) => {
    const r = layout.rects[i]!;
    const x = r.x * outW + half;
    const y = r.y * outH + half;
    const w = r.w * outW - spacing;
    const h = r.h * outH - spacing;
    if (w <= 0 || h <= 0) return;
    ctx.save();
    if (radius > 0) {
      const rr = Math.min(radius, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + rr, y);
      ctx.arcTo(x + w, y, x + w, y + h, rr);
      ctx.arcTo(x + w, y + h, x, y + h, rr);
      ctx.arcTo(x, y + h, x, y, rr);
      ctx.arcTo(x, y, x + w, y, rr);
      ctx.closePath();
      ctx.clip();
    }
    drawCover(ctx, photo.img, photo.img.naturalWidth, photo.img.naturalHeight, x, y, w, h);
    ctx.restore();
  });
}

function PhotoCollageTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("photo-collage", isPro);
  const seo = getToolSeo("photo-collage");

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [layoutId, setLayoutId] = useState("2x2");
  const [shapeId, setShapeId] = useState("auto");
  const [spacing, setSpacing] = useState(12);
  const [radius, setRadius] = useState(0);
  const [bg, setBg] = useState("#ffffff");
  const [format, setFormat] = useState<"jpg" | "png">("jpg");
  const [quality, setQuality] = useState(90);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);

  const layout = LAYOUTS.find((l) => l.id === layoutId)!;
  const shape = SHAPES.find((s) => s.id === shapeId)!;
  const ratio = shape.ratio ?? layout.autoRatio;

  const acceptFiles = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) {
      setError("Please choose image files (JPG, PNG, WebP).");
      return;
    }
    try {
      const loaded: Photo[] = await Promise.all(
        list.map(async (f) => ({ id: nextId++, url: URL.createObjectURL(f), img: await loadImageFile(f) })),
      );
      setPhotos((p) => [...p, ...loaded].slice(0, 9));
      setError(null);
    } catch {
      setError("Could not read one of those images.");
    }
  }, []);

  const removePhoto = useCallback((id: number) => {
    setPhotos((p) => {
      const it = p.find((x) => x.id === id);
      if (it) URL.revokeObjectURL(it.url);
      return p.filter((x) => x.id !== id);
    });
  }, []);

  useEffect(() => {
    const c = previewRef.current;
    if (!c || photos.length === 0) return;
    renderCollage(c, photos, layoutId, ratio, spacing, radius, bg, 720);
  }, [photos, layoutId, ratio, spacing, radius, bg]);

  const download = useCallback(async () => {
    if (photos.length < 2 || busy || !trial.canUse) return;
    setBusy(true);
    setError(null);
    try {
      const canvas = document.createElement("canvas");
      renderCollage(canvas, photos, layoutId, ratio, spacing, radius, bg, 1200);
      const blob = await canvasToBlob(canvas, format === "jpg" ? "image/jpeg" : "image/png", quality / 100);
      downloadBlob(blob, `collage.${format === "jpg" ? "jpg" : "png"}`);
      trial.recordUse();
      toast.success("Collage downloaded");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed.");
    } finally {
      setBusy(false);
    }
  }, [photos, busy, trial, layoutId, ratio, spacing, radius, bg, format, quality]);

  const missing = Math.max(0, layout.cells - photos.length);

  return (
    <ToolPageShell toolId="photo-collage" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Photo Collage" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); void acceptFiles(e.dataTransfer.files); }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition",
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
            )}
          >
            <FileUp className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold">{photos.length === 0 ? "Drop 2 to 9 photos" : `${photos.length} photo${photos.length > 1 ? "s" : ""} added`}</p>
            <p className="mt-1 text-xs text-muted-foreground">The preview updates live as you arrange</p>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => { if (e.target.files) void acceptFiles(e.target.files); e.target.value = ""; }}
            />
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Layout</p>
            <div className="grid grid-cols-3 gap-2">
              {LAYOUTS.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setLayoutId(l.id)}
                  className={cn(
                    "rounded-xl border px-2 py-2.5 text-xs font-bold transition",
                    layoutId === l.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
            {missing > 0 && photos.length > 0 && (
              <p className="mt-1.5 text-xs text-amber-600">Add {missing} more photo{missing > 1 ? "s" : ""} to fill this layout.</p>
            )}
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Shape</p>
            <div className="flex flex-wrap gap-2">
              {SHAPES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setShapeId(s.id)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-sm font-bold transition",
                    shapeId === s.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Spacing</p>
              <span className="text-xs font-bold text-muted-foreground">{spacing}px</span>
            </div>
            <input
              type="range"
              min={0}
              max={60}
              value={spacing}
              disabled={photos.length === 0}
              onChange={(e) => setSpacing(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Rounded corners</p>
              <span className="text-xs font-bold text-muted-foreground">{radius === 0 ? "Off" : `${radius}px`}</span>
            </div>
            <input
              type="range"
              min={0}
              max={120}
              value={radius}
              disabled={photos.length === 0}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Background color</p>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={bg}
                onChange={(e) => setBg(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded border border-border bg-transparent p-1"
                aria-label="Background color"
              />
              <input
                type="text"
                value={bg}
                onChange={(e) => setBg(e.target.value)}
                className="w-24 rounded-lg border border-border bg-background px-2 py-2 text-sm font-mono"
                aria-label="Background color hex"
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Format</p>
            <div className="flex gap-2">
              {(["jpg", "png"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormat(f)}
                  className={cn(
                    "rounded-xl border px-4 py-2 text-sm font-bold uppercase transition",
                    format === f
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {format === "jpg" && (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <p className="text-[13px] font-medium text-foreground/80">Quality</p>
                <span className="text-xs font-bold text-muted-foreground">{quality}</span>
              </div>
              <input
                type="range"
                min={50}
                max={100}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
          )}

          <ActionButton busy={busy} disabled={photos.length < 2 || !trial.canUse} onClick={download}>
            <Download className="h-4 w-4" /> {busy ? "Working…" : "Download collage"}
          </ActionButton>
          <p className="text-xs text-muted-foreground">Exports at 1200px wide, files never leave your device.</p>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free uses left.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {photos.length === 0 ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <ImageIcon className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your collage preview appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Drop 2 to 9 photos, pick a layout, then download a 1200px collage.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {photos.map((p) => (
                  <div key={p.id} className="group relative overflow-hidden rounded-lg border border-border">
                    <img src={p.url} alt="Collage photo" className="h-16 w-16 object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(p.id)}
                      className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition group-hover:opacity-100"
                      aria-label="Remove photo"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {photos.length < 9 && (
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed border-border text-muted-foreground transition hover:border-primary/40"
                    aria-label="Add more photos"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                )}
              </div>
              <div className="flex justify-center">
                <canvas ref={previewRef} className="max-h-[560px] max-w-full rounded-xl" />
              </div>
              <p className="text-center text-sm text-muted-foreground">
                {Math.min(photos.length, layout.cells)} photos in a {layout.label} layout, {Math.round(1200)}x{Math.round(1200 / ratio)}px export
              </p>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
