// /tools/image-to-svg - client-side bitmap tracer (Vectorizer.ai-style UX:
// drag-drop, free interactive preview, gated download).

import { useCallback, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileUp, Image as ImageIcon, RefreshCw, Sparkles } from "lucide-react";
import JSZip from "jszip";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { imageToSvg, loadImageFile, type TraceOptions } from "@/lib/tracer";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/image-to-svg")({
  head: () => {
    const seo = getToolSeoMeta("image-to-svg");
    const canonical = "https://iconvault.site/tools/image-to-svg";
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
  component: ImageToSvgTool,
});

interface TracedFile {
  name: string;
  svg: string;
  width: number;
  height: number;
  previewUrl: string;
}

const Slider = ({ label, value, min, max, onChange, hint }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; hint?: string }) => (
  <label className="block">
    <div className="mb-1.5 flex items-center justify-between text-[13px]">
      <span className="font-medium text-foreground/80">{label}</span>
      <span className="tabular-nums text-muted-foreground">{value}</span>
    </div>
    <input
      type="range" min={min} max={max} value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full accent-primary"
    />
    {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
  </label>
);

function ImageToSvgTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("image-to-svg", isPro);
  const seo = getToolSeo("image-to-svg");

  const [files, setFiles] = useState<File[]>([]);
  const [traced, setTraced] = useState<TracedFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [colors, setColors] = useState(8);
  const [detail, setDetail] = useState(0.7);
  const [removeBg, setRemoveBg] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptFiles = useCallback((list: FileList | File[]) => {
    const imgs = [...list].filter((f) => f.type.startsWith("image/")).slice(0, isPro ? 10 : 1);
    if (imgs.length === 0) {
      setError("Please drop a PNG, JPG, WebP or GIF image.");
      return;
    }
    setError(null);
    setTraced([]);
    setFiles(imgs);
  }, [isPro]);

  const runTrace = useCallback(async () => {
    if (files.length === 0 || busy) return;
    if (!trial.canUse) return;
    setBusy(true);
    setError(null);
    try {
      const opts: TraceOptions = { colors, detail, removeBackground: removeBg };
      const out: TracedFile[] = [];
      for (const f of files) {
        const img = await loadImageFile(f);
        const { svg, width, height } = await imageToSvg(img, opts);
        out.push({ name: f.name.replace(/\.[^.]+$/, "") || "vector", svg, width, height, previewUrl: URL.createObjectURL(f) });
      }
      setTraced(out);
      trial.recordUse();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tracing failed. Try a smaller image.");
    } finally {
      setBusy(false);
    }
  }, [files, busy, trial, colors, detail, removeBg]);

  const downloadOne = (t: TracedFile) => {
    downloadBlob(new Blob([t.svg], { type: "image/svg+xml" }), `${t.name}.svg`);
  };

  const downloadZip = async () => {
    const zip = new JSZip();
    traced.forEach((t) => zip.file(`${t.name}.svg`, t.svg));
    const blob = await zip.generateAsync({ type: "blob" });
    downloadBlob(blob, "vectorized-svgs.zip");
  };

  const reset = () => {
    setFiles([]);
    setTraced([]);
    setError(null);
  };

  return (
    <ToolPageShell toolId="image-to-svg" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Image to SVG" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* Controls */}
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
            <p className="text-sm font-semibold">Drop image here or click to browse</p>
            <p className="mt-1 text-xs text-muted-foreground">PNG · JPG · WebP · GIF - max ~3MP</p>
            <input
              ref={inputRef} type="file" accept="image/*" multiple={isPro} className="hidden"
              onChange={(e) => e.target.files && acceptFiles(e.target.files)}
            />
          </div>

          {files.length > 0 && (
            <div className="flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2 text-sm">
              <span className="flex items-center gap-2 font-medium">
                <ImageIcon className="h-4 w-4" />
                {files.length === 1 ? files[0]?.name : `${files.length} images`}
              </span>
              <button type="button" onClick={reset} className="text-xs font-bold text-muted-foreground hover:text-foreground">
                Clear
              </button>
            </div>
          )}

          <Slider label="Colors" value={colors} min={2} max={isPro ? 16 : 10} onChange={setColors} hint={isPro ? "Up to 16 colors" : "Pro unlocks up to 16 colors"} />
          <Slider label="Detail" value={Math.round(detail * 100)} min={10} max={100} onChange={(v) => setDetail(v / 100)} hint="Higher = more faithful, larger file" />

          <label className="flex cursor-pointer items-center justify-between text-sm font-medium">
            Remove background
            <input type="checkbox" checked={removeBg} onChange={(e) => setRemoveBg(e.target.checked)} className="h-4 w-4 accent-primary" />
          </label>

          <ActionButton busy={busy} disabled={files.length === 0 || !trial.canUse} onClick={runTrace}>
            <Sparkles className="h-4 w-4" /> {busy ? "Tracing…" : "Vectorize"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left > 0
                ? `${trial.left} of ${TOOL_TRIAL_LIMIT} free conversions left - no account needed.`
                : "Free trial used up. Go Pro for unlimited vectorizing."}
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        {/* Preview */}
        <div className="rounded-2xl border border-border bg-card p-5">
          {traced.length === 0 ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <Sparkles className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your vector preview appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Upload an image and hit Vectorize - you'll see the traced result before downloading anything.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {traced.map((t) => (
                <div key={t.name} className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Original</p>
                    <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-[repeating-conic-gradient(#eee_0_25%,#fff_0_50%)] bg-[length:20px_20px] dark:bg-[repeating-conic-gradient(#222_0_25%,#111_0_50%)]">
                      <img src={t.previewUrl} alt="original" className="max-h-full max-w-full object-contain" />
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Vectorized SVG</p>
                    <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-[repeating-conic-gradient(#eee_0_25%,#fff_0_50%)] bg-[length:20px_20px] dark:bg-[repeating-conic-gradient(#222_0_25%,#111_0_50%)]">
                      <div className="[&>svg]:max-h-full [&>svg]:max-w-full" dangerouslySetInnerHTML={{ __html: t.svg }} />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={() => downloadOne(t)}
                      className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-bold hover:border-primary/50"
                    >
                      <Download className="h-4 w-4" /> Download {t.name}.svg
                    </button>
                  </div>
                </div>
              ))}
              {traced.length > 1 && (
                <button
                  type="button"
                  onClick={downloadZip}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90"
                >
                  <Download className="h-4 w-4" /> Download all as ZIP
                </button>
              )}
              {!isPro && traced.length > 0 && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <RefreshCw className="h-3.5 w-3.5" /> Batch ZIP of 10 images is a Pro feature.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
