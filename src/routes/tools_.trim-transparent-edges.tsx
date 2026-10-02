// /tools/trim-transparent-edges - Cut empty transparent margins off PNG and
// WebP images. Threshold trims even faint shadows, padding keeps breathing
// room. 100% in-browser.

import { useCallback, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileUp, Image as ImageIcon, Scissors } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import { loadImageFile, canvasToBlob, baseName, extForMime } from "@/lib/image-tools";

export const Route = createFileRoute("/tools_/trim-transparent-edges")({
  head: () => {
    const seo = getToolSeoMeta("trim-transparent-edges");
    const canonical = "https://iconvault.site/tools/trim-transparent-edges";
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
  component: TrimEdgesTool,
});

function findBBox(img: HTMLImageElement, threshold: number): { x0: number; y0: number; x1: number; y1: number } | null {
  const W = img.naturalWidth;
  const H = img.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, W, H).data;
  let x0 = W;
  let y0 = H;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if ((d[(y * W + x) * 4 + 3] ?? 0) > threshold) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return null;
  return { x0, y0, x1, y1 };
}

function TrimEdgesTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("trim-transparent-edges", isPro);
  const seo = getToolSeo("trim-transparent-edges");

  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [threshold, setThreshold] = useState(0);
  const [padding, setPadding] = useState(0);
  const [result, setResult] = useState<{ url: string; w: number; h: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptFile = useCallback(async (f: File) => {
    if (f.type !== "image/png" && f.type !== "image/webp") {
      setError("Only PNG and WebP files have transparency. Please choose one of those.");
      return;
    }
    try {
      const loaded = await loadImageFile(f);
      setImg(loaded);
      setFile(f);
      setPreviewUrl(URL.createObjectURL(f));
      setResult(null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that image.");
    }
  }, []);

  const trim = useCallback(() => {
    if (!img || busy || !trial.canUse) return;
    setBusy(true);
    setError(null);
    try {
      const box = findBBox(img, threshold);
      if (!box) {
        toast.error("The image has no visible pixels to keep.");
        setBusy(false);
        return;
      }
      const W = img.naturalWidth;
      const H = img.naturalHeight;
      const x0 = Math.max(0, box.x0 - padding);
      const y0 = Math.max(0, box.y0 - padding);
      const x1 = Math.min(W - 1, box.x1 + padding);
      const y1 = Math.min(H - 1, box.y1 + padding);
      const tw = x1 - x0 + 1;
      const th = y1 - y0 + 1;
      const canvas = document.createElement("canvas");
      canvas.width = tw;
      canvas.height = th;
      canvas.getContext("2d")!.drawImage(img, x0, y0, tw, th, 0, 0, tw, th);
      const url = canvas.toDataURL("image/png");
      setResult({ url, w: tw, h: th });
      trial.recordUse();
      toast.success(`Trimmed to ${tw}x${th}px`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Trim failed.");
    } finally {
      setBusy(false);
    }
  }, [img, busy, trial, threshold, padding]);

  const download = useCallback(async () => {
    if (!result || !img) return;
    setBusy(true);
    try {
      const W = img.naturalWidth;
      const H = img.naturalHeight;
      const box = findBBox(img, threshold);
      if (!box) return;
      const x0 = Math.max(0, box.x0 - padding);
      const y0 = Math.max(0, box.y0 - padding);
      const x1 = Math.min(W - 1, box.x1 + padding);
      const y1 = Math.min(H - 1, box.y1 + padding);
      const tw = x1 - x0 + 1;
      const th = y1 - y0 + 1;
      const canvas = document.createElement("canvas");
      canvas.width = tw;
      canvas.height = th;
      canvas.getContext("2d")!.drawImage(img, x0, y0, tw, th, 0, 0, tw, th);
      const mime = file?.type === "image/webp" ? "image/webp" : "image/png";
      const blob = await canvasToBlob(canvas, mime);
      downloadBlob(blob, `${baseName(file?.name ?? "trimmed")}-trimmed.${extForMime(blob.type)}`);
      toast.success("Trimmed image downloaded");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed.");
    } finally {
      setBusy(false);
    }
  }, [result, img, threshold, padding, file]);

  return (
    <ToolPageShell toolId="trim-transparent-edges" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Trim Transparent Edges" left={trial.left} />

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
            <p className="text-sm font-semibold">{file ? file.name : "Drop a PNG or WebP"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Only PNG and WebP carry transparency</p>
            <input ref={inputRef} type="file" accept="image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void acceptFile(f); e.target.value = ""; }} />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Trim threshold</p>
              <span className="text-xs font-bold text-muted-foreground">{threshold === 0 ? "Fully clear only" : threshold}</span>
            </div>
            <input
              type="range"
              min={0}
              max={128}
              value={threshold}
              disabled={!img}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              0 trims only fully clear pixels. Raise it to also trim faint shadows and anti-aliased edges.
            </p>
          </div>

          <div>
            <p className="mb-1 text-[13px] font-medium text-foreground/80">Padding</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={200}
                value={padding}
                disabled={!img}
                onChange={(e) => setPadding(Math.max(0, Math.min(200, Number(e.target.value) || 0)))}
                className="w-24 rounded-lg border border-border bg-background px-2.5 py-2 text-sm"
                aria-label="Padding in pixels"
              />
              <span className="text-sm text-muted-foreground">px of breathing room</span>
            </div>
          </div>

          <ActionButton busy={busy} disabled={!img || !trial.canUse} onClick={trim}>
            <Scissors className="h-4 w-4" /> {busy ? "Trimming…" : "Trim edges"}
          </ActionButton>
          {result && img && (
            <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm">
              <p className="font-semibold">Before: {img.naturalWidth}x{img.naturalHeight}px</p>
              <p className="font-semibold text-primary">After: {result.w}x{result.h}px</p>
              <button
                type="button"
                onClick={download}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90"
              >
                <Download className="h-4 w-4" /> Download trimmed
              </button>
            </div>
          )}
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free uses left, files never leave your device.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {!img ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <ImageIcon className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Before and after appear here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Cut the empty transparent margins off a PNG or WebP so the file is tight and centered.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Before - {img.naturalWidth}x{img.naturalHeight}
                </p>
                <div
                  className="flex min-h-[200px] items-center justify-center"
                  style={{ backgroundImage: "repeating-conic-gradient(#80808033 0 25%, transparent 0 50%)", backgroundSize: "20px 20px" }}
                >
                  <img src={previewUrl} alt="Original" className="max-h-64 max-w-full" />
                </div>
              </div>
              <div className="rounded-xl border border-border p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  After{result ? ` - ${result.w}x${result.h}` : ""}
                </p>
                <div
                  className="flex min-h-[200px] items-center justify-center"
                  style={{ backgroundImage: "repeating-conic-gradient(#80808033 0 25%, transparent 0 50%)", backgroundSize: "20px 20px" }}
                >
                  {result ? (
                    <img src={result.url} alt="Trimmed result" className="max-h-64 max-w-full" />
                  ) : (
                    <p className="text-sm text-muted-foreground">Press "Trim edges" to see the result</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
