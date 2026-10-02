// /tools/image-resizer - Resize up to 10 images in the browser: exact
// dimensions, percentage scaling or locked aspect ratio, PNG/JPG/WebP out.

import { useCallback, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileUp, Scaling, X } from "lucide-react";
import JSZip from "jszip";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/image-resizer")({
  head: () => {
    const seo = getToolSeoMeta("image-resizer");
    const canonical = "https://iconvault.site/tools/image-resizer";
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
  component: ResizerTool,
});

type OutFormat = "png" | "jpeg" | "webp";

interface SizedFile {
  name: string;
  w: number;
  h: number;
  blob: Blob;
  previewUrl: string;
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

function ResizerTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("image-resizer", isPro);
  const seo = getToolSeo("image-resizer");

  const [files, setFiles] = useState<File[]>([]);
  const [exactW, setExactW] = useState("");
  const [exactH, setExactH] = useState("");
  const [done, setDone] = useState<SizedFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [percent, setPercent] = useState(50);
  const [lockAspect, setLockAspect] = useState(true);
  const [format, setFormat] = useState<OutFormat>("png");
  const [quality, setQuality] = useState(90);
  const [noEnlarge, setNoEnlarge] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptFiles = useCallback((list: FileList | File[]) => {
    const imgs = [...list].filter((f) => f.type.startsWith("image/")).slice(0, 10);
    if (!imgs.length) {
      setError("Please drop PNG, JPG or WebP images.");
      return;
    }
    setError(null);
    setDone([]);
    setExactW("");
    setExactH("");
    setFiles((prev) => [...prev, ...imgs].slice(0, 10));
  }, []);

  const removeFile = (i: number) => {
    setFiles((p) => p.filter((_, x) => x !== i));
    setDone([]);
  };

  const resize = useCallback(async () => {
    if (!files.length || busy || !trial.canUse) return;
    setBusy(true);
    setError(null);
    try {
      const out: SizedFile[] = [];
      const wInput = Number(exactW) || 0;
      const hInput = Number(exactH) || 0;
      const useExact = wInput > 0 || hInput > 0;
      for (const f of files) {
        const img = await loadFile(f);
        const natW = img.naturalWidth;
        const natH = img.naturalHeight;
        let w: number;
        let h: number;
        if (useExact) {
          if (lockAspect && (wInput > 0) !== (hInput > 0)) {
            // only one side given: scale proportionally
            const s = wInput > 0 ? wInput / natW : hInput / natH;
            w = Math.round(natW * s);
            h = Math.round(natH * s);
          } else {
            w = wInput > 0 ? wInput : natW;
            h = hInput > 0 ? hInput : natH;
          }
        } else {
          const s = percent / 100;
          w = Math.round(natW * s);
          h = Math.round(natH * s);
        }
        if (noEnlarge && (w > natW || h > natH)) {
          // Don't upscale: keep the original dimensions instead.
          w = natW;
          h = natH;
        }
        w = Math.max(1, Math.min(8192, w));
        h = Math.max(1, Math.min(8192, h));

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);

        const mime = `image/${format}`;
        const blob = await new Promise<Blob | null>((res) =>
          canvas.toBlob(res, mime, mime === "image/png" ? undefined : quality / 100),
        );
        if (!blob) throw new Error(`Could not encode ${f.name}`);
        const ext = format === "jpeg" ? "jpg" : format;
        const base = f.name.replace(/\.[^.]+$/, "");
        out.push({
          name: `${base}-${w}x${h}.${ext}`,
          w,
          h,
          blob,
          previewUrl: URL.createObjectURL(blob),
        });
      }
      setDone(out);
      trial.recordUse();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Resize failed.");
    } finally {
      setBusy(false);
    }
  }, [files, busy, trial, exactW, exactH, lockAspect, percent, format, quality, noEnlarge]);

  const downloadZip = async () => {
    const zip = new JSZip();
    done.forEach((d) => zip.file(d.name, d.blob));
    downloadBlob(await zip.generateAsync({ type: "blob" }), "resized-images.zip");
  };

  return (
    <ToolPageShell toolId="image-resizer" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Image Resizer" left={trial.left} />

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
            <p className="text-sm font-semibold">Drop up to 10 images</p>
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
              <span className="font-medium text-foreground/80">Scale</span>
              <span className="tabular-nums text-muted-foreground">{percent}%</span>
            </div>
            <input
              type="range" min={1} max={100} value={percent}
              onChange={(e) => { setPercent(Number(e.target.value)); setExactW(""); setExactH(""); }}
              className="w-full accent-primary"
            />
          </label>

          <div>
            <p className="mb-1.5 text-[13px] font-medium text-foreground/80">Exact size (optional, applies to all)</p>
            <div className="flex items-center gap-2">
              <input
                type="number" min={1} max={8192}
                placeholder="W"
                value={exactW}
                onChange={(e) => setExactW(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <span className="text-muted-foreground">×</span>
              <input
                type="number" min={1} max={8192}
                placeholder="H"
                value={exactH}
                onChange={(e) => setExactH(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Overrides the scale slider. With "lock aspect ratio", fill only one side to scale proportionally.
            </p>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox" checked={lockAspect}
              onChange={(e) => setLockAspect(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            <span className="font-medium text-foreground/80">Lock aspect ratio when using exact size</span>
          </label>

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox" checked={noEnlarge}
              onChange={(e) => setNoEnlarge(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            <span className="font-medium text-foreground/80">Don't enlarge smaller images</span>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-foreground/80">Output format</span>
            <select value={format} onChange={(e) => setFormat(e.target.value as OutFormat)} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary">
              <option value="png">PNG</option>
              <option value="jpeg">JPEG</option>
              <option value="webp">WebP</option>
            </select>
          </label>

          <label className="block">
            <div className="mb-1.5 flex items-center justify-between text-[13px]">
              <span className="font-medium text-foreground/80">JPEG/WebP quality</span>
              <span className="tabular-nums text-muted-foreground">{quality}%</span>
            </div>
            <input
              type="range" min={10} max={100} value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Applies to JPEG and WebP output - PNG is lossless and ignores it.
            </p>
          </label>

          <ActionButton busy={busy} disabled={files.length === 0 || !trial.canUse} onClick={resize}>
            <Scaling className="h-4 w-4" /> {busy ? "Resizing…" : `Resize ${files.length || ""} image${files.length === 1 ? "" : "s"}`}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free resizes left - files never leave your device.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {done.length === 0 ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <Scaling className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Resized results appear here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Pick a scale or an exact size, then resize - every result downloads individually or as a ZIP.
              </p>
            </div>
          ) : (
            <div>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-primary/10 px-4 py-3">
                <p className="text-sm font-bold">Resized {done.length} image{done.length === 1 ? "" : "s"}</p>
                <button
                  type="button" onClick={downloadZip}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90"
                >
                  <Download className="h-4 w-4" /> Download all (.zip)
                </button>
              </div>
              <div className="space-y-3">
                {done.map((d, i) => (
                  <div key={i} className="flex items-center gap-4 rounded-xl border border-border p-3">
                    <img src={d.previewUrl} alt={d.name} className="h-14 w-14 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{d.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.w} × {d.h} px · {fmtSize(d.blob.size)}
                      </p>
                    </div>
                    <button
                      type="button" onClick={() => downloadBlob(d.blob, d.name)}
                      className="shrink-0 rounded-lg border border-border p-2 hover:border-primary/50" aria-label={`Download ${d.name}`}
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
