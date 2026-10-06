// /tools/compress-to-exact-kb - Squeeze an image down to an exact file size
// (e.g. under 100 KB for a form upload). Quality is lowered first; if that
// is not enough, the image is scaled down. 100% in-browser, files never
// leave the device.

import { useCallback, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileUp, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/compress-to-exact-kb";
import toolSeoMeta from "@/lib/tool-seo-meta-data/compress-to-exact-kb";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import {
  loadImageFile,
  fillBackground,
  formatBytes,
  encodeToSize,
} from "@/lib/image-tools";

export const Route = createFileRoute("/tools_/compress-to-exact-kb")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/compress-to-exact-kb";
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
  component: CompressExactKbTool,
});

const SIZE_PRESETS = ["20", "50", "100", "200", "500"] as const;

interface Result {
  blob: Blob;
  quality: number;
  width: number;
  height: number;
  targetBytes: number;
  hit: boolean;
}

function CompressExactKbTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("compress-to-exact-kb", isPro);
  const seo = toolSeo;

  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [name, setName] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [preset, setPreset] = useState<string>("100");
  const [customKb, setCustomKb] = useState("75");
  const [format, setFormat] = useState<"image/jpeg" | "image/webp">("image/jpeg");
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const targetKb = preset === "custom" ? Number(customKb) : Number(preset);
  const targetBytes = Math.round(targetKb * 1024);

  const acceptFile = useCallback(async (f: File) => {
    if (!f.type.startsWith("image/")) {
      setError("Please choose a JPG, PNG or WebP image.");
      return;
    }
    try {
      const loaded = await loadImageFile(f);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setImg(loaded);
      setName(f.name.replace(/\.[^.]+$/, ""));
      setPreviewUrl(URL.createObjectURL(f));
      setResult(null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that image.");
    }
  }, [previewUrl]);

  const compress = useCallback(async () => {
    if (!img || busy || !trial.canUse || !Number.isFinite(targetBytes) || targetBytes <= 0) return;
    setBusy(true);
    setError(null);
    try {
      const mime = format;
      const draw = (canvas: HTMLCanvasElement) => {
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        if (mime === "image/jpeg") fillBackground(canvas, "#ffffff");
      };
      const res = await encodeToSize(draw, mime, targetBytes, img.naturalWidth, img.naturalHeight);
      setResult({ ...res, targetBytes, hit: res.blob.size <= targetBytes });
      trial.recordUse();
      toast.success("Image compressed to target size");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Compression failed.");
    } finally {
      setBusy(false);
    }
  }, [img, busy, trial, format, targetBytes]);

  const ext = format === "image/jpeg" ? "jpg" : "webp";

  return (
    <ToolPageShell toolId="compress-to-exact-kb" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Compress to Exact KB" left={trial.left} />

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
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Target size</p>
            <div className="flex flex-wrap gap-2">
              {SIZE_PRESETS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPreset(s)}
                  className={cn(
                    "rounded-xl border px-4 py-2.5 text-sm font-bold transition",
                    preset === s
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {s} KB
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPreset("custom")}
                className={cn(
                  "rounded-xl border px-4 py-2.5 text-sm font-bold transition",
                  preset === "custom"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                Custom
              </button>
            </div>
            {preset === "custom" && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={customKb}
                  onChange={(e) => setCustomKb(e.target.value)}
                  className="w-24 rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold"
                />
                <span className="text-sm text-muted-foreground">KB</span>
              </div>
            )}
            <p className="mt-1.5 text-xs text-muted-foreground">
              Quality is lowered first; if that isn&apos;t enough, the image is scaled down.
            </p>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Format</p>
            <div className="flex gap-2">
              {(["image/jpeg", "image/webp"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setFormat(m)}
                  className={cn(
                    "flex-1 rounded-xl border px-4 py-2.5 text-sm font-bold transition",
                    format === m
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {m === "image/jpeg" ? "JPG" : "WebP"}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              PNG isn&apos;t offered: it&apos;s lossless, so it can&apos;t be squeezed to an exact size.
            </p>
          </div>

          <ActionButton busy={busy} disabled={!img || !trial.canUse || !Number.isFinite(targetBytes) || targetBytes <= 0} onClick={compress}>
            <Download className="h-4 w-4" /> {busy ? "Compressing…" : `Compress to ${targetKb || "?"} KB`}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free compressions left - files never leave your device.
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
                Perfect for forms and portals that reject files over a size limit, like job applications and exam uploads.
              </p>
            </div>
          ) : (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-6">
              <div className="rounded-lg bg-[repeating-conic-gradient(#80808033_0_25%,transparent_0_50%)] bg-[length:20px_20px] p-4">
                <img src={previewUrl} alt="Source" className="max-h-56 rounded" />
              </div>
              {result ? (
                <div className="w-full max-w-md rounded-xl border border-border p-4 text-center">
                  <p className="text-sm text-muted-foreground">Result</p>
                  <p className="mt-1 text-2xl font-extrabold">
                    {formatBytes(result.blob.size)}
                    <span className="ml-2 text-sm font-semibold text-muted-foreground">
                      target {formatBytes(result.targetBytes)}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Quality {result.quality}% · {result.width} × {result.height} px · {ext.toUpperCase()}
                  </p>
                  {!result.hit && (
                    <p className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-400">
                      Couldn&apos;t reach the exact target; this is the smallest we could make it.
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      downloadBlob(result.blob, `${name || "image"}-${targetKb}kb.${ext}`);
                    }}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90"
                  >
                    <Download className="h-4 w-4" /> Download {ext.toUpperCase()}
                  </button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Original: {img.naturalWidth} × {img.naturalHeight} px. Press compress to hit {targetKb || "?"} KB.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
