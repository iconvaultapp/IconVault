// /tools/compress-jpg - Bulk JPG compressor. Quality slider, and a
// never-larger guarantee: if the compressed file ends up bigger than the
// original, you get the original back. 100% in-browser, files never leave
// the device.

import { useCallback, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileUp, FolderDown, RotateCcw } from "lucide-react";
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
  formatBytes,
  baseName,
  extForMime,
} from "@/lib/image-tools";

export const Route = createFileRoute("/tools_/compress-jpg")({
  head: () => {
    const seo = getToolSeoMeta("compress-jpg");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: CompressJpgTool,
});

interface Item {
  id: number;
  file: File;
  img: HTMLImageElement;
  url: string;
  out: { blob: Blob; quality: number; keptOriginal: boolean } | null;
}

let nextId = 1;

async function compressImage(img: HTMLImageElement, quality: number): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  fillBackground(canvas, "#ffffff");
  return canvasToBlob(canvas, "image/jpeg", quality / 100);
}

function savedPct(orig: number, next: number) {
  if (orig <= 0) return 0;
  return Math.max(0, Math.round(((orig - next) / orig) * 100));
}

function CompressJpgTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("compress-jpg", isPro);
  const seo = getToolSeo("compress-jpg");

  const [items, setItems] = useState<Item[]>([]);
  const [quality, setQuality] = useState(75);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
          out: null,
        });
      } catch {
        setError(`Could not read ${f.name}.`);
      }
    }
    setItems((p) => [...p, ...loaded]);
  }, []);

  const compressAll = useCallback(async () => {
    if (items.length === 0 || busy || !trial.canUse) return;
    setBusy(true);
    setError(null);
    try {
      const next = await Promise.all(
        items.map(async (it) => {
          const blob = await compressImage(it.img, quality);
          // Never output a file larger than the input.
          if (blob.size >= it.file.size) {
            return { ...it, out: { blob: it.file, quality, keptOriginal: true } };
          }
          return { ...it, out: { blob, quality, keptOriginal: false } };
        }),
      );
      setItems(next);
      trial.recordUse();
      toast.success(`Compressed ${next.length} image${next.length === 1 ? "" : "s"}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Compression failed.");
    } finally {
      setBusy(false);
    }
  }, [items, busy, trial, quality]);

  const downloadZip = useCallback(async () => {
    const done = items.filter((i) => i.out);
    if (done.length === 0) return;
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    for (const it of done) {
      const ext = it.out!.keptOriginal ? it.file.name.split(".").pop() ?? "jpg" : extForMime("image/jpeg");
      zip.file(`${baseName(it.file.name)}-compressed.${ext}`, it.out!.blob);
    }
    const out = await zip.generateAsync({ type: "blob" });
    downloadBlob(out, "compressed-jpgs.zip");
    toast.success("ZIP downloaded");
  }, [items]);

  const reset = useCallback(() => {
    setItems((p) => {
      p.forEach((i) => URL.revokeObjectURL(i.url));
      return [];
    });
    setError(null);
  }, []);

  const doneCount = items.filter((i) => i.out).length;

  return (
    <ToolPageShell toolId="compress-jpg" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Compress JPG" left={trial.left} />

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
              {items.length === 0 ? "Drop JPG images here" : `${items.length} image${items.length === 1 ? "" : "s"} added`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Add more any time, up to 50 files</p>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => { if (e.target.files) void acceptFiles(e.target.files); e.target.value = ""; }}
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Quality</p>
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-bold">{quality}%</span>
            </div>
            <input
              type="range"
              min={5}
              max={95}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              60 to 80% is usually indistinguishable from the original for photos.
            </p>
          </div>

          <div className="flex gap-2">
            <ActionButton busy={busy} disabled={items.length === 0 || !trial.canUse} onClick={() => { void compressAll(); }}>
              {busy ? "Compressing…" : "Compress images"}
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
          {doneCount > 0 && (
            <button
              type="button"
              onClick={downloadZip}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition hover:border-primary/40"
            >
              <FolderDown className="h-4 w-4" /> Download all ({doneCount}) as ZIP
            </button>
          )}
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free compressions left - files never leave your device.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {items.length === 0 ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <Download className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Compressed files appear here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Every file is compressed on your device, and each one gets its own download button plus a combined ZIP.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((it) => {
                const out = it.out;
                return (
                  <li key={it.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                    <img src={it.url} alt={it.file.name} className="h-12 w-12 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{it.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(it.file.size)}
                        {out && (
                          <>
                            {" → "}
                            <span className="font-semibold text-foreground">{formatBytes(out.blob.size)}</span>
                            {out.keptOriginal ? (
                              <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 font-semibold">original kept</span>
                            ) : (
                              <span className="ml-1.5 rounded bg-emerald-500/15 px-1.5 py-0.5 font-semibold text-emerald-600 dark:text-emerald-400">
                                {savedPct(it.file.size, out.blob.size)}% smaller
                              </span>
                            )}
                          </>
                        )}
                      </p>
                    </div>
                    {out && (
                      <button
                        type="button"
                        onClick={() => {
                          const ext = out.keptOriginal ? it.file.name.split(".").pop() ?? "jpg" : "jpg";
                          downloadBlob(out.blob, `${baseName(it.file.name)}-compressed.${ext}`);
                        }}
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
      </div>
    </ToolPageShell>
  );
}
