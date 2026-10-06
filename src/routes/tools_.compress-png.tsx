// /tools/compress-png - Bulk PNG compressor using median-cut color
// quantization. Pick how many colors to keep: fewer colors means a smaller
// file. 100% in-browser, files never leave the device.

import { useCallback, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileUp, FolderDown, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/compress-png";
import toolSeoMeta from "@/lib/tool-seo-meta-data/compress-png";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import {
  loadImageFile,
  canvasToBlob,
  formatBytes,
  baseName,
  medianCut,
} from "@/lib/image-tools";

export const Route = createFileRoute("/tools_/compress-png")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/compress-png";
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
  component: CompressPngTool,
});

const COLOR_OPTIONS = [256, 128, 64, 32, 16] as const;

interface Item {
  id: number;
  file: File;
  img: HTMLImageElement;
  url: string;
  out: { blob: Blob; colors: number } | null;
}

let nextId = 1;

async function compressPng(img: HTMLImageElement, colors: number): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const src = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = medianCut(src, colors);
  const out = document.createElement("canvas");
  out.width = canvas.width;
  out.height = canvas.height;
  out.getContext("2d")!.putImageData(data, 0, 0);
  return canvasToBlob(out, "image/png");
}

function savedPct(orig: number, next: number) {
  if (orig <= 0) return 0;
  return Math.max(0, Math.round(((orig - next) / orig) * 100));
}

function CompressPngTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("compress-png", isPro);
  const seo = toolSeo;

  const [items, setItems] = useState<Item[]>([]);
  const [colors, setColors] = useState<number>(256);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptFiles = useCallback(async (files: FileList | File[]) => {
    const list = [...files].filter((f) => f.type.startsWith("image/")).slice(0, 50);
    if (list.length === 0) {
      setError("Please choose PNG, JPG or WebP images.");
      return;
    }
    setError(null);
    const loaded: Item[] = [];
    for (const f of list) {
      try {
        const img = await loadImageFile(f);
        loaded.push({ id: nextId++, file: f, img, url: URL.createObjectURL(f), out: null });
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
          const blob = await compressPng(it.img, colors);
          return { ...it, out: { blob, colors } };
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
  }, [items, busy, trial, colors]);

  const downloadZip = useCallback(async () => {
    const done = items.filter((i) => i.out);
    if (done.length === 0) return;
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    for (const it of done) {
      zip.file(`${baseName(it.file.name)}-compressed.png`, it.out!.blob);
    }
    const out = await zip.generateAsync({ type: "blob" });
    downloadBlob(out, "compressed-pngs.zip");
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
    <ToolPageShell toolId="compress-png" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Compress PNG" left={trial.left} />

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
              {items.length === 0 ? "Drop PNG images here" : `${items.length} image${items.length === 1 ? "" : "s"} added`}
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
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Colors to keep</p>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColors(c)}
                  className={cn(
                    "rounded-xl border px-4 py-2.5 text-sm font-bold transition",
                    colors === c
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Fewer colors means a smaller file. Works best on logos, icons and graphics with flat colors.
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
                Every file is quantized on your device, and each one gets its own download button plus a combined ZIP.
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
                            <span className="ml-1.5 rounded bg-emerald-500/15 px-1.5 py-0.5 font-semibold text-emerald-600 dark:text-emerald-400">
                              {savedPct(it.file.size, out.blob.size)}% smaller
                            </span>
                            <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 font-semibold">
                              {out.colors} colors
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                    {out && (
                      <button
                        type="button"
                        onClick={() => downloadBlob(out.blob, `${baseName(it.file.name)}-compressed.png`)}
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
