// /tools/image-compressor - TinyPNG-style UX, but 100% in-browser: files
// never leave the device. One-click smart compression: transparent images
// become WebP, everything else becomes JPEG, at the chosen quality.

import { useCallback, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileUp, Minimize2, X } from "lucide-react";
import JSZip from "jszip";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/image-compressor")({
  head: () => {
    const seo = getToolSeoMeta("image-compressor");
    const canonical = "https://iconvault.site/tools/image-compressor";
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
  component: CompressorTool,
});

interface DoneFile {
  name: string;
  before: number;
  after: number;
  blob: Blob;
  ext: string;
  previewUrl: string;
  keptOriginal: boolean;
}

const fmtSize = (b: number) =>
  b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1024 / 1024).toFixed(2)} MB`;

function loadFile(f: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`Could not read ${f.name}`)); };
    img.src = url;
  });
}

/** True when the image has any real transparency (sampled on a small canvas). */
function hasTransparency(img: HTMLImageElement): boolean {
  try {
    const w = Math.max(1, Math.min(img.naturalWidth, 256));
    const h = Math.max(1, Math.min(img.naturalHeight, 256));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return true;
    ctx.drawImage(img, 0, 0, w, h);
    const d = ctx.getImageData(0, 0, w, h).data;
    for (let i = 3; i < d.length; i += 32) {
      if ((d[i] ?? 255) < 250) return true;
    }
    return false;
  } catch {
    return true; // be safe: keep alpha support when detection fails
  }
}

function CompressorTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("image-compressor", isPro);
  const seo = getToolSeo("image-compressor");

  const [files, setFiles] = useState<File[]>([]);
  const [done, setDone] = useState<DoneFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quality, setQuality] = useState(80);
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptFiles = useCallback((list: FileList | File[]) => {
    const imgs = [...list].filter((f) => f.type.startsWith("image/")).slice(0, 20);
    if (!imgs.length) {
      setError("Please drop PNG, JPG or WebP images.");
      return;
    }
    setError(null);
    setDone([]);
    setFiles((prev) => [...prev, ...imgs].slice(0, 20));
  }, []);

  const removeFile = (i: number) => {
    setFiles((p) => p.filter((_, x) => x !== i));
    setDone([]);
  };

  const compress = useCallback(async () => {
    if (!files.length || busy || !trial.canUse) return;
    setBusy(true);
    setError(null);
    try {
      const out: DoneFile[] = [];
      for (const f of files) {
        const img = await loadFile(f);
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, w, h);

        // Fully automatic: transparent images -> WebP (keeps alpha, tiny),
        // everything else -> JPEG (smallest for photos/flat graphics).
        const transparent = f.type !== "image/jpeg" && hasTransparency(img);
        const mime: string = transparent ? "image/webp" : "image/jpeg";
        const ext: string = transparent ? "webp" : "jpg";

        const blob = await new Promise<Blob | null>((res) =>
          canvas.toBlob(res, mime, quality / 100),
        );
        if (!blob) throw new Error(`Could not encode ${f.name}`);
        const base = f.name.replace(/\.[^.]+$/, "");
        // Never hand back a "compressed" file bigger than the input.
        const grew = blob.size >= f.size;
        const finalBlob = grew ? f : blob;
        out.push({
          name: grew ? f.name : `${base}-compressed.${ext}`,
          before: f.size,
          after: finalBlob.size,
          blob: finalBlob,
          ext,
          previewUrl: URL.createObjectURL(finalBlob),
          keptOriginal: grew,
        });
      }
      setDone(out);
      trial.recordUse();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Compression failed.");
    } finally {
      setBusy(false);
    }
  }, [files, busy, trial, quality]);

  const downloadZip = async () => {
    const zip = new JSZip();
    done.forEach((d) => zip.file(d.name, d.blob));
    downloadBlob(await zip.generateAsync({ type: "blob" }), "compressed-images.zip");
  };

  const totalSaved = done.reduce((a, d) => a + (d.before - d.after), 0);
  const totalBefore = done.reduce((a, d) => a + d.before, 0);

  return (
    <ToolPageShell toolId="image-compressor" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Image Compressor" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); acceptFiles(e.dataTransfer.files); }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition",
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
            )}
          >
            <FileUp className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold">Drop up to 20 images</p>
            <p className="mt-1 text-xs text-muted-foreground">PNG · JPG · WebP - 100% private, in-browser</p>
            <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && acceptFiles(e.target.files)} />
          </div>

          {files.length > 0 && (
            <div className="max-h-40 space-y-1.5 overflow-y-auto">
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-1.5 text-xs">
                  <span className="truncate font-medium">{f.name}</span>
                  <span className="flex items-center gap-2 text-muted-foreground">
                    {fmtSize(f.size)}
                    <button type="button" onClick={() => removeFile(i)} aria-label="Remove" className="hover:text-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}

          <label className="block">
            <div className="mb-1.5 flex items-center justify-between text-[13px]">
              <span className="font-medium text-foreground/80">Quality</span>
              <span className="tabular-nums text-muted-foreground">{quality}%</span>
            </div>
            <input type="range" min={10} max={100} value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="w-full accent-primary" />
          </label>

          <p className="-mt-2 text-xs text-muted-foreground">
            Fully automatic - transparent images become WebP, everything else becomes JPEG, at your quality setting. Original dimensions are always kept.
          </p>

          <ActionButton busy={busy} disabled={files.length === 0 || !trial.canUse} onClick={compress}>
            <Minimize2 className="h-4 w-4" /> {busy ? "Compressing…" : `Compress ${files.length || ""} image${files.length === 1 ? "" : "s"}`}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free compressions left - files never leave your device.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {done.length === 0 ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <Minimize2 className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Before / after results appear here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Every file shows its original size, compressed size and the exact percentage saved.
              </p>
            </div>
          ) : (
            <div>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-emerald-500/10 px-4 py-3">
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {totalSaved > 0
                    ? `Saved ${fmtSize(totalSaved)} (${totalBefore ? Math.round((totalSaved / totalBefore) * 100) : 0}% smaller)`
                    : "Files already optimal - originals kept"}
                </p>
                <button
                  type="button" onClick={downloadZip}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90"
                >
                  <Download className="h-4 w-4" /> Download all (.zip)
                </button>
              </div>
              <div className="space-y-3">
                {done.map((d, i) => {
                  const pct = d.before ? Math.round(((d.before - d.after) / d.before) * 100) : 0;
                  return (
                    <div key={i} className="flex items-center gap-4 rounded-xl border border-border p-3">
                      <img src={d.previewUrl} alt={d.name} className="h-14 w-14 rounded-lg object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{d.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {fmtSize(d.before)} → <span className="font-bold text-emerald-600 dark:text-emerald-400">{fmtSize(d.after)}</span>
                          {" "}·{" "}
                          {d.keptOriginal ? (
                            <span className="font-bold text-amber-600 dark:text-amber-400">already optimal - kept original</span>
                          ) : (
                            <span className="font-bold">{pct}% smaller</span>
                          )}
                        </p>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
                        </div>
                      </div>
                      <button
                        type="button" onClick={() => downloadBlob(d.blob, d.name)}
                        className="shrink-0 rounded-lg border border-border p-2 hover:border-primary/50" aria-label={`Download ${d.name}`}
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
