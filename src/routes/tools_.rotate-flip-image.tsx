// /tools/rotate-flip-image - Rotate and flip one photo or a whole batch,
// 100% in-browser. No upload, no watermark.

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Download,
  FileUp,
  FlipHorizontal2,
  FlipVertical2,
  Image as ImageIcon,
  Plus,
  RotateCcw,
  RotateCw,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/rotate-flip-image";
import toolSeoMeta from "@/lib/tool-seo-meta-data/rotate-flip-image";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import { loadImageFile, canvasToBlob, baseName, extForMime } from "@/lib/image-tools";

export const Route = createFileRoute("/tools_/rotate-flip-image")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/rotate-flip-image";
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
  component: RotateFlipTool,
});

type Item = {
  id: number;
  name: string;
  img: HTMLImageElement;
  url: string;
  rot: 0 | 90 | 180 | 270;
  flipH: boolean;
  flipV: boolean;
};

let nextId = 1;

function renderTransformed(img: HTMLImageElement, rot: number, flipH: boolean, flipV: boolean): HTMLCanvasElement {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const swap = rot === 90 || rot === 270;
  const canvas = document.createElement("canvas");
  canvas.width = swap ? h : w;
  canvas.height = swap ? w : h;
  const ctx = canvas.getContext("2d")!;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  ctx.drawImage(img, -w / 2, -h / 2);
  return canvas;
}

function hasAlpha(img: HTMLImageElement): boolean {
  const c = document.createElement("canvas");
  const s = 64;
  c.width = s;
  c.height = s;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0, s, s);
  const d = ctx.getImageData(0, 0, s, s).data;
  for (let i = 3; i < d.length; i += 4) {
    if ((d[i] ?? 0) < 255) return true;
  }
  return false;
}

function describe(it: Item): string {
  const parts: string[] = [];
  if (it.rot !== 0) parts.push(`rotated ${it.rot} deg`);
  if (it.flipH) parts.push("flipped horizontal");
  if (it.flipV) parts.push("flipped vertical");
  return parts.length ? parts.join(", ") : "original";
}

function RotateFlipTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("rotate-flip-image", isPro);
  const seo = toolSeo;

  const [items, setItems] = useState<Item[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [quality, setQuality] = useState(95);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);

  const selected = items.find((i) => i.id === selectedId) ?? null;

  const acceptFiles = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) {
      setError("Please choose image files (JPG, PNG, WebP).");
      return;
    }
    try {
      const loaded: Item[] = await Promise.all(
        list.map(async (f) => ({
          id: nextId++,
          name: f.name,
          img: await loadImageFile(f),
          url: URL.createObjectURL(f),
          rot: 0 as const,
          flipH: false,
          flipV: false,
        })),
      );
      setItems((p) => [...p, ...loaded]);
      if (selectedId === null && loaded.length > 0) setSelectedId(loaded[0]!.id);
      setError(null);
    } catch {
      setError("Could not read one of those images.");
    }
  }, [selectedId]);

  const applyTo = useCallback((id: number, fn: (it: Item) => Item) => {
    setItems((p) => p.map((it) => (it.id === id ? fn(it) : it)));
  }, []);

  const applyAction = useCallback(
    (fn: (it: Item) => Item) => {
      if (!selected) return;
      applyTo(selected.id, fn);
    },
    [selected, applyTo],
  );

  const applyToAll = useCallback(() => {
    if (!selected) return;
    const { rot, flipH, flipV } = selected;
    setItems((p) => p.map((it) => ({ ...it, rot, flipH, flipV })));
    toast.success(`Applied to all ${items.length} images`);
  }, [selected, items.length]);

  const removeItem = useCallback(
    (id: number) => {
      setItems((p) => {
        const it = p.find((x) => x.id === id);
        if (it) URL.revokeObjectURL(it.url);
        const next = p.filter((x) => x.id !== id);
        if (selectedId === id) setSelectedId(next[0]?.id ?? null);
        return next;
      });
    },
    [selectedId],
  );

  // Live preview of the selected image.
  useEffect(() => {
    const c = previewRef.current;
    if (!c) return;
    if (!selected) return;
    const rendered = renderTransformed(selected.img, selected.rot, selected.flipH, selected.flipV);
    const max = 520;
    const s = Math.min(1, max / Math.max(rendered.width, rendered.height));
    c.width = Math.max(1, Math.round(rendered.width * s));
    c.height = Math.max(1, Math.round(rendered.height * s));
    c.getContext("2d")!.drawImage(rendered, 0, 0, c.width, c.height);
  }, [selected]);

  const encodeItem = useCallback(
    async (it: Item): Promise<Blob> => {
      const rendered = renderTransformed(it.img, it.rot, it.flipH, it.flipV);
      const alpha = hasAlpha(it.img);
      const mime = alpha ? "image/png" : "image/jpeg";
      return canvasToBlob(rendered, mime, quality / 100);
    },
    [quality],
  );

  const downloadOne = useCallback(async () => {
    if (!selected || busy || !trial.canUse) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await encodeItem(selected);
      downloadBlob(blob, `${baseName(selected.name)}-rotated.${extForMime(blob.type)}`);
      trial.recordUse();
      toast.success("Image downloaded");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed.");
    } finally {
      setBusy(false);
    }
  }, [selected, busy, trial, encodeItem]);

  const downloadAll = useCallback(async () => {
    if (items.length < 2 || busy || !trial.canUse) return;
    setBusy(true);
    setError(null);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      for (const it of items) {
        const blob = await encodeItem(it);
        zip.file(`${baseName(it.name)}-rotated.${extForMime(blob.type)}`, blob);
      }
      const out = await zip.generateAsync({ type: "blob" });
      downloadBlob(out, "rotated-images.zip");
      trial.recordUse();
      toast.success("ZIP downloaded");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed.");
    } finally {
      setBusy(false);
    }
  }, [items, busy, trial, encodeItem]);

  const ops: { label: string; icon: ReactNode; fn: (it: Item) => Item }[] = [
    { label: "Rotate left", icon: <RotateCcw className="h-4 w-4" />, fn: (it) => ({ ...it, rot: ((it.rot + 270) % 360) as Item["rot"] }) },
    { label: "Rotate right", icon: <RotateCw className="h-4 w-4" />, fn: (it) => ({ ...it, rot: ((it.rot + 90) % 360) as Item["rot"] }) },
    { label: "180", icon: <RotateCw className="h-4 w-4" />, fn: (it) => ({ ...it, rot: ((it.rot + 180) % 360) as Item["rot"] }) },
    { label: "Flip horizontal", icon: <FlipHorizontal2 className="h-4 w-4" />, fn: (it) => ({ ...it, flipH: !it.flipH }) },
    { label: "Flip vertical", icon: <FlipVertical2 className="h-4 w-4" />, fn: (it) => ({ ...it, flipV: !it.flipV }) },
  ];

  return (
    <ToolPageShell toolId="rotate-flip-image" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Rotate & Flip" left={trial.left} />

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
            <p className="text-sm font-semibold">Drop one or more images</p>
            <p className="mt-1 text-xs text-muted-foreground">Batch mode: apply the same edit to all</p>
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
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Transforms</p>
            <div className="grid grid-cols-2 gap-2">
              {ops.map((op) => (
                <button
                  key={op.label}
                  type="button"
                  disabled={!selected}
                  onClick={() => applyAction(op.fn)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-semibold transition",
                    selected
                      ? "border-border hover:border-primary/50 hover:bg-primary/5"
                      : "cursor-not-allowed border-border text-muted-foreground/50",
                  )}
                >
                  {op.icon} {op.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={items.length < 2 || !selected}
              onClick={applyToAll}
              className={cn(
                "mt-2 w-full rounded-xl border border-dashed px-3 py-2.5 text-sm font-semibold transition",
                items.length >= 2 && selected
                  ? "border-primary/50 text-primary hover:bg-primary/5"
                  : "cursor-not-allowed border-border text-muted-foreground/50",
              )}
            >
              Apply to all ({items.length})
            </button>
            <p className="mt-1.5 text-xs text-muted-foreground">Pixels are moved exactly, never cropped.</p>
          </div>

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
            <p className="text-xs text-muted-foreground">Applies to JPG output. Transparent images always export as PNG.</p>
          </div>

          <div className="flex gap-2">
            <ActionButton busy={busy} disabled={!selected || !trial.canUse} onClick={downloadOne}>
              <Download className="h-4 w-4" /> {busy ? "Working…" : "Download"}
            </ActionButton>
            {items.length > 1 && (
              <button
                type="button"
                disabled={busy || !trial.canUse}
                onClick={downloadAll}
                className="rounded-xl border border-border px-4 text-sm font-semibold transition hover:border-primary/50 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ZIP all
              </button>
            )}
          </div>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free uses left, files never leave your device.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {items.length === 0 ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <ImageIcon className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your images appear here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Rotate left or right, flip horizontally or vertically, then download. Lossless pixel moves, no cropping.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {items.map((it) => (
                  <div
                    key={it.id}
                    className={cn(
                      "group relative overflow-hidden rounded-lg border-2 transition",
                      it.id === selectedId ? "border-primary" : "border-border hover:border-primary/40",
                    )}
                  >
                    <button type="button" onClick={() => setSelectedId(it.id)} className="block">
                      <img src={it.url} alt={it.name} className="h-16 w-16 object-cover" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(it.id)}
                      className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition group-hover:opacity-100"
                      aria-label={`Remove ${it.name}`}
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
              <div className="flex min-h-[320px] items-center justify-center rounded-xl bg-[repeating-conic-gradient(#80808033_0_25%,transparent_0_50%)] bg-[length:20px_20px] p-4">
                <canvas ref={previewRef} className="max-h-[480px] max-w-full rounded" />
              </div>
              {selected && (
                <p className="text-center text-sm text-muted-foreground">
                  {selected.name} ({selected.img.naturalWidth}x{selected.img.naturalHeight}) - {describe(selected)}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
