// /tools/bulk-crop - Crop many photos to the same aspect ratio at once,
// keeping each photo's own resolution. Nudge any single photo with Adjust,
// then crop them all and download a ZIP. 100% in-browser, files never
// leave the device.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileUp, FolderDown, RotateCcw, SlidersHorizontal } from "lucide-react";
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
  baseName,
  extForMime,
} from "@/lib/image-tools";

export const Route = createFileRoute("/tools_/bulk-crop")({
  head: () => {
    const seo = getToolSeoMeta("bulk-crop");
    const canonical = "https://iconvault.site/tools/bulk-crop";
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
  component: BulkCropTool,
});

const RATIOS: { id: string; label: string; ratio: number | null }[] = [
  { id: "none", label: "None", ratio: null },
  { id: "square", label: "Square", ratio: 1 },
  { id: "16:9", label: "16:9", ratio: 16 / 9 },
  { id: "4:3", label: "4:3", ratio: 4 / 3 },
  { id: "3:2", label: "3:2", ratio: 3 / 2 },
];

interface Item {
  id: number;
  file: File;
  img: HTMLImageElement;
  url: string;
  /** Crop-box position as a 0..1 fraction of the free travel. */
  ox: number;
  oy: number;
  out: { blob: Blob; ext: string } | null;
}

let nextId = 1;

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

/** Largest centered (or offset) rect of the given ratio inside the image. */
function cropBox(img: HTMLImageElement, ratio: number | null, ox: number, oy: number) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  if (!ratio) return { x: 0, y: 0, w: iw, h: ih };
  const bw = Math.min(iw, ih * ratio);
  const bh = bw / ratio;
  return {
    x: Math.round(ox * (iw - bw)),
    y: Math.round(oy * (ih - bh)),
    w: Math.round(bw),
    h: Math.round(bh),
  };
}

/** Small repositioning preview: drag the crop box inside the photo. */
function AdjustCanvas({
  item,
  ratio,
  onMove,
}: {
  item: Item;
  ratio: number | null;
  onMove: (ox: number, oy: number) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const dragging = useRef(false);

  const dw = Math.min(item.img.naturalWidth, 340);
  const scale = dw / item.img.naturalWidth;
  const dh = Math.round(item.img.naturalHeight * scale);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    canvas.width = dw;
    canvas.height = dh;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(item.img, 0, 0, dw, dh);
    const b = cropBox(item.img, ratio, item.ox, item.oy);
    const d = { x: b.x * scale, y: b.y * scale, w: b.w * scale, h: b.h * scale };
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, dw, d.y);
    ctx.fillRect(0, d.y + d.h, dw, dh - d.y - d.h);
    ctx.fillRect(0, d.y, d.x, d.h);
    ctx.fillRect(d.x + d.w, d.y, dw - d.x - d.w, d.h);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(d.x, d.y, d.w, d.h);
  }, [item, ratio, dw, dh, scale]);

  const moveTo = (e: React.PointerEvent) => {
    const rect = ref.current!.getBoundingClientRect();
    const px = (((e.clientX - rect.left) / rect.width) * dw) / scale;
    const py = (((e.clientY - rect.top) / rect.height) * dh) / scale;
    const b = cropBox(item.img, ratio, item.ox, item.oy);
    const freeX = item.img.naturalWidth - b.w;
    const freeY = item.img.naturalHeight - b.h;
    onMove(
      freeX > 0 ? clamp01((px - b.w / 2) / freeX) : 0.5,
      freeY > 0 ? clamp01((py - b.h / 2) / freeY) : 0.5,
    );
  };

  return (
    <canvas
      ref={ref}
      onPointerDown={(e) => { dragging.current = true; ref.current?.setPointerCapture(e.pointerId); moveTo(e); }}
      onPointerMove={(e) => { if (dragging.current) moveTo(e); }}
      onPointerUp={() => { dragging.current = false; }}
      style={{ cursor: "move", touchAction: "none" }}
      className="max-w-full rounded-xl shadow-lg"
    />
  );
}

function BulkCropTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("bulk-crop", isPro);
  const seo = getToolSeo("bulk-crop");

  const [items, setItems] = useState<Item[]>([]);
  const [ratioId, setRatioId] = useState("square");
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adjustId, setAdjustId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const ratio = RATIOS.find((r) => r.id === ratioId)?.ratio ?? null;
  const adjustItem = items.find((i) => i.id === adjustId) ?? null;

  const acceptFiles = useCallback(async (files: FileList | File[]) => {
    const list = [...files].filter((f) => f.type.startsWith("image/")).slice(0, 50);
    if (list.length === 0) {
      setError("Please choose JPG, PNG or WebP images.");
      return;
    }
    setError(null);
    const loaded: Item[] = [];
    for (const f of list) {
      try {
        const img = await loadImageFile(f);
        loaded.push({
          id: nextId++,
          file: f,
          img,
          url: URL.createObjectURL(f),
          ox: 0.5,
          oy: 0.5,
          out: null,
        });
      } catch {
        setError(`Could not read ${f.name}.`);
      }
    }
    setItems((p) => [...p, ...loaded]);
    setAdjustId(null);
  }, []);

  const moveItem = useCallback(
    (id: number, ox: number, oy: number) => {
      setItems((p) => p.map((it) => (it.id === id ? { ...it, ox, oy, out: null } : it)));
    },
    [],
  );

  const cropAll = useCallback(async () => {
    if (items.length === 0 || busy || !trial.canUse) return;
    setBusy(true);
    setError(null);
    try {
      const next = await Promise.all(
        items.map(async (it) => {
          const b = cropBox(it.img, ratio, it.ox, it.oy);
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, b.w);
          canvas.height = Math.max(1, b.h);
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(it.img, b.x, b.y, b.w, b.h, 0, 0, canvas.width, canvas.height);
          const mime =
            it.file.type === "image/png" || it.file.type === "image/webp" || it.file.type === "image/jpeg"
              ? it.file.type
              : "image/jpeg";
          if (mime === "image/jpeg") fillBackground(canvas, "#ffffff");
          const blob = await canvasToBlob(canvas, mime, 0.92);
          return { ...it, out: { blob, ext: extForMime(mime) } };
        }),
      );
      setItems(next);
      trial.recordUse();
      toast.success(`Cropped ${next.length} image${next.length === 1 ? "" : "s"}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Crop failed.");
    } finally {
      setBusy(false);
    }
  }, [items, busy, trial, ratio]);

  const downloadZip = useCallback(async () => {
    const done = items.filter((i) => i.out);
    if (done.length === 0) return;
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    for (const it of done) {
      zip.file(`${baseName(it.file.name)}-cropped.${it.out!.ext}`, it.out!.blob);
    }
    const out = await zip.generateAsync({ type: "blob" });
    downloadBlob(out, "cropped-images.zip");
    toast.success("ZIP downloaded");
  }, [items]);

  const reset = useCallback(() => {
    setItems((p) => {
      p.forEach((i) => URL.revokeObjectURL(i.url));
      return [];
    });
    setAdjustId(null);
    setError(null);
  }, []);

  const doneCount = items.filter((i) => i.out).length;
  const allDone = items.length > 0 && doneCount === items.length;

  return (
    <ToolPageShell toolId="bulk-crop" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Bulk Crop" left={trial.left} />

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
            <p className="text-sm font-semibold">
              {items.length === 0 ? "Drop images here" : `${items.length} image${items.length === 1 ? "" : "s"} added`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Add more any time, up to 50 files</p>
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              className="hidden"
              onChange={(e) => { if (e.target.files) void acceptFiles(e.target.files); e.target.value = ""; }}
            />
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Crop area</p>
            <div className="flex flex-wrap gap-2">
              {RATIOS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => { setRatioId(r.id); setAdjustId(null); }}
                  className={cn(
                    "rounded-xl border px-4 py-2.5 text-sm font-bold transition",
                    ratioId === r.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Crop to a ratio, keep each photo&apos;s size. &ldquo;None&rdquo; leaves photos untouched.
            </p>
          </div>

          <div className="flex gap-2">
            <ActionButton busy={busy} disabled={items.length === 0 || !trial.canUse} onClick={() => { void cropAll(); }}>
              {busy ? "Cropping…" : `Crop ${items.length} image${items.length === 1 ? "" : "s"}`}
            </ActionButton>
            {items.length > 0 && (
              <button
                type="button"
                onClick={reset}
                title="Start over"
                className="rounded-xl border border-border px-3 text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={downloadZip}
            disabled={!allDone}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FolderDown className="h-4 w-4" /> Download all ({items.length}) as ZIP
          </button>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free bulk crops left - files never leave your device.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            {items.length === 0 ? (
              <div className="flex h-full min-h-[280px] flex-col items-center justify-center text-center">
                <Download className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="font-semibold">Cropped photos appear here</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Add photos, pick a ratio, optionally adjust each one, then crop them all in one click.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {items.map((it) => {
                  const b = cropBox(it.img, ratio, it.ox, it.oy);
                  return (
                    <li key={it.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                      <img src={it.url} alt={it.file.name} className="h-12 w-12 rounded-lg object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{it.file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {it.img.naturalWidth} × {it.img.naturalHeight} px
                          {ratio ? ` → crop ${b.w} × ${b.h} px` : " → untouched"}
                          {it.out && <span className="ml-1.5 rounded bg-emerald-500/15 px-1.5 py-0.5 font-semibold text-emerald-600 dark:text-emerald-400">done</span>}
                        </p>
                      </div>
                      {ratio && (
                        <button
                          type="button"
                          onClick={() => setAdjustId(adjustId === it.id ? null : it.id)}
                          className={cn(
                            "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition",
                            adjustId === it.id
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:border-primary/40",
                          )}
                        >
                          <SlidersHorizontal className="h-3.5 w-3.5" /> Adjust
                        </button>
                      )}
                      {it.out && (
                        <button
                          type="button"
                          onClick={() => downloadBlob(it.out!.blob, `${baseName(it.file.name)}-cropped.${it.out!.ext}`)}
                          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition hover:opacity-90"
                        >
                          <Download className="h-3.5 w-3.5" /> Download
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {adjustItem && ratio && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="mb-1 text-sm font-semibold">Adjust: {adjustItem.file.name}</p>
              <p className="mb-3 text-xs text-muted-foreground">
                Drag the box to reposition the crop inside the photo.
              </p>
              <div className="flex justify-center">
                <AdjustCanvas
                  item={adjustItem}
                  ratio={ratio}
                  onMove={(ox, oy) => moveItem(adjustItem.id, ox, oy)}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
