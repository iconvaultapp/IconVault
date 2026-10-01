// /tools/image-stitcher - Join 2 or more images side by side or stacked,
// with spacing, alignment and background options. 100% in-browser.

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
import { loadImageFile, canvasToBlob } from "@/lib/image-tools";

export const Route = createFileRoute("/tools_/image-stitcher")({
  head: () => {
    const seo = getToolSeoMeta("image-stitcher");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: ImageStitcherTool,
});

type Item = { id: number; url: string; img: HTMLImageElement };
type Direction = "side" | "stacked";

let nextId = 1;

function layoutDims(
  items: Item[],
  direction: Direction,
  align: string,
  sameSize: boolean,
  spacing: number,
): { W: number; H: number; rects: { x: number; y: number; w: number; h: number }[] } {
  const dims = items.map((it) => ({ w: it.img.naturalWidth, h: it.img.naturalHeight }));
  const rects: { x: number; y: number; w: number; h: number }[] = [];
  if (direction === "side") {
    const targetH = Math.max(...dims.map((d) => d.h));
    const scaled = dims.map((d) => (sameSize ? { w: (d.w * targetH) / d.h, h: targetH } : d));
    const W = Math.round(scaled.reduce((a, d) => a + d.w, 0) + spacing * (items.length - 1));
    const H = Math.round(targetH);
    let x = 0;
    for (const d of scaled) {
      const y = align === "top" ? 0 : align === "bottom" ? H - d.h : (H - d.h) / 2;
      rects.push({ x, y, w: d.w, h: d.h });
      x += d.w + spacing;
    }
    return { W, H, rects };
  }
  const targetW = Math.max(...dims.map((d) => d.w));
  const scaled = dims.map((d) => (sameSize ? { w: targetW, h: (d.h * targetW) / d.w } : d));
  const W = Math.round(targetW);
  const H = Math.round(scaled.reduce((a, d) => a + d.h, 0) + spacing * (items.length - 1));
  let y = 0;
  for (const d of scaled) {
    const x = align === "left" ? 0 : align === "right" ? W - d.w : (W - d.w) / 2;
    rects.push({ x, y, w: d.w, h: d.h });
    y += d.h + spacing;
  }
  return { W, H, rects };
}

function renderStitch(
  canvas: HTMLCanvasElement,
  items: Item[],
  direction: Direction,
  align: string,
  sameSize: boolean,
  spacing: number,
  bg: string,
  transparent: boolean,
  scale: number,
) {
  const { W, H, rects } = layoutDims(items, direction, align, sameSize, spacing);
  canvas.width = Math.max(1, Math.round(W * scale));
  canvas.height = Math.max(1, Math.round(H * scale));
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!transparent) {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.scale(scale, scale);
  items.forEach((it, i) => {
    const r = rects[i]!;
    ctx.drawImage(it.img, r.x, r.y, r.w, r.h);
  });
}

function ImageStitcherTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("image-stitcher", isPro);
  const seo = getToolSeo("image-stitcher");

  const [items, setItems] = useState<Item[]>([]);
  const [direction, setDirection] = useState<Direction>("side");
  const [align, setAlign] = useState("center");
  const [sameSize, setSameSize] = useState(true);
  const [spacing, setSpacing] = useState(8);
  const [bg, setBg] = useState("#ffffff");
  const [transparent, setTransparent] = useState(false);
  const [format, setFormat] = useState<"png" | "jpg" | "webp">("png");
  const [quality, setQuality] = useState(92);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);

  const acceptFiles = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) {
      setError("Please choose image files (JPG, PNG, WebP).");
      return;
    }
    try {
      const loaded: Item[] = await Promise.all(
        list.map(async (f) => ({ id: nextId++, url: URL.createObjectURL(f), img: await loadImageFile(f) })),
      );
      setItems((p) => [...p, ...loaded]);
      setError(null);
    } catch {
      setError("Could not read one of those images.");
    }
  }, []);

  const removeItem = useCallback((id: number) => {
    setItems((p) => {
      const it = p.find((x) => x.id === id);
      if (it) URL.revokeObjectURL(it.url);
      return p.filter((x) => x.id !== id);
    });
  }, []);

  const alignOptions = direction === "side" ? ["top", "center", "bottom"] : ["left", "center", "right"];

  useEffect(() => {
    const c = previewRef.current;
    if (!c || items.length < 2) return;
    const { W, H } = layoutDims(items, direction, align, sameSize, spacing);
    const s = Math.min(1, 900 / Math.max(W, H));
    renderStitch(c, items, direction, align, sameSize, spacing, bg, transparent, s);
  }, [items, direction, align, sameSize, spacing, bg, transparent]);

  const download = useCallback(async () => {
    if (items.length < 2 || busy || !trial.canUse) return;
    setBusy(true);
    setError(null);
    try {
      const canvas = document.createElement("canvas");
      const useTransparent = transparent && format !== "jpg";
      renderStitch(canvas, items, direction, align, sameSize, spacing, useTransparent ? "#ffffff" : bg, useTransparent, 1);
      const mime = format === "jpg" ? "image/jpeg" : `image/${format}`;
      const blob = await canvasToBlob(canvas, mime, quality / 100);
      downloadBlob(blob, `stitched.${format === "jpg" ? "jpg" : format}`);
      trial.recordUse();
      toast.success("Stitched image downloaded");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed.");
    } finally {
      setBusy(false);
    }
  }, [items, busy, trial, direction, align, sameSize, spacing, bg, transparent, format, quality]);

  const dims = items.length >= 2 ? layoutDims(items, direction, align, sameSize, spacing) : null;

  return (
    <ToolPageShell toolId="image-stitcher" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Image Stitcher" left={trial.left} />

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
            <p className="text-sm font-semibold">{items.length === 0 ? "Drop 2 or more images" : `${items.length} images`}</p>
            <p className="mt-1 text-xs text-muted-foreground">Order: left to right, top to bottom</p>
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
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Direction</p>
            <div className="flex gap-2">
              {(
                [
                  { id: "side", label: "Side by side" },
                  { id: "stacked", label: "Stacked" },
                ] as const
              ).map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => { setDirection(d.id); setAlign("center"); }}
                  className={cn(
                    "rounded-xl border px-4 py-2 text-sm font-bold transition",
                    direction === d.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Align</p>
            <div className="flex gap-2">
              {alignOptions.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAlign(a)}
                  className={cn(
                    "rounded-xl border px-4 py-2 text-sm font-bold capitalize transition",
                    align === a
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium">
            <input
              type="checkbox"
              checked={sameSize}
              onChange={(e) => setSameSize(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            {direction === "side" ? "Make all the same height" : "Make all the same width"}
          </label>

          <div>
            <p className="mb-1 text-[13px] font-medium text-foreground/80">Spacing</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={200}
                value={spacing}
                onChange={(e) => setSpacing(Math.max(0, Math.min(200, Number(e.target.value) || 0)))}
                className="w-24 rounded-lg border border-border bg-background px-2.5 py-2 text-sm"
                aria-label="Spacing in pixels"
              />
              <span className="text-sm text-muted-foreground">px</span>
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Background</p>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={bg}
                disabled={transparent}
                onChange={(e) => { setBg(e.target.value); setTransparent(false); }}
                className="h-10 w-14 cursor-pointer rounded border border-border bg-transparent p-1 disabled:opacity-40"
                aria-label="Background color"
              />
              <button
                type="button"
                onClick={() => setTransparent((t) => !t)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm font-semibold transition",
                  transparent
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                Transparent
              </button>
            </div>
            {transparent && format === "jpg" && (
              <p className="mt-1 text-xs text-amber-600">JPG cannot be transparent, white will be used instead.</p>
            )}
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Format</p>
            <div className="flex gap-2">
              {(["png", "jpg", "webp"] as const).map((f) => (
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

          {(format === "jpg" || format === "webp") && (
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

          <ActionButton busy={busy} disabled={items.length < 2 || !trial.canUse} onClick={download}>
            <Download className="h-4 w-4" /> {busy ? "Working…" : "Stitch & download"}
          </ActionButton>
          <p className="text-xs text-muted-foreground">
            {dims ? `Output: ${dims.W}x${dims.H}px. ` : ""}Files never leave your device.
          </p>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free uses left.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {items.length < 2 ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <ImageIcon className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your stitched image appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Drop 2 or more images, line them up side by side or stacked, then download the result.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {items.map((it, i) => (
                  <div key={it.id} className="group relative overflow-hidden rounded-lg border border-border">
                    <img src={it.url} alt={`Stitch ${i + 1}`} className="h-16 w-16 object-cover" />
                    <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 text-[10px] font-bold text-white">{i + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeItem(it.id)}
                      className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition group-hover:opacity-100"
                      aria-label={`Remove image ${i + 1}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed border-border text-muted-foreground transition hover:border-primary/40"
                  aria-label="Add more images"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
              <div
                className="flex justify-center overflow-auto"
                style={{ backgroundImage: transparent ? "repeating-conic-gradient(#80808033 0 25%, transparent 0 50%)" : undefined, backgroundSize: "20px 20px" }}
              >
                <canvas ref={previewRef} className="max-h-[520px] max-w-full rounded" />
              </div>
                <p className="text-center text-sm text-muted-foreground">
                  Result: {dims!.W}x{dims!.H}px
                </p>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
