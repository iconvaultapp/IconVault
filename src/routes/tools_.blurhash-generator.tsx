// /tools/blurhash-generator - Encode any image to a Blurhash placeholder string and preview
// the decoded blur. 100% in-browser. No upload, no watermark.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, FileUp, Image as ImageIcon, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import { loadImageFile } from "@/lib/image-tools";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/blurhash-generator")({
  head: () => {
    const seo = getToolSeoMeta("blurhash-generator");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: BlurhashTool,
});

const PREVIEW_W = 320;

function BlurhashTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("blurhash-generator", isPro);
  const seo = getToolSeo("blurhash-generator");

  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [compX, setCompX] = useState(4);
  const [compY, setCompY] = useState(3);
  const [hash, setHash] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const encodeImage = useCallback(async (loaded: HTMLImageElement, cx: number, cy: number) => {
    const { encode } = await import("blurhash");
    const maxSide = 100;
    const scale = Math.min(1, maxSide / Math.max(loaded.naturalWidth, loaded.naturalHeight));
    const w = Math.max(1, Math.round(loaded.naturalWidth * scale));
    const h = Math.max(1, Math.round(loaded.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(loaded, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    const result = encode(new Uint8ClampedArray(data.buffer), w, h, cx, cy);
    setHash(result);
  }, []);

  // Draw the decoded blur after the preview canvas has mounted.
  useEffect(() => {
    if (!hash || !img) return;
    let cancelled = false;
    (async () => {
      const { decode } = await import("blurhash");
      if (cancelled) return;
      const pw = PREVIEW_W;
      const ph = Math.max(1, Math.round((PREVIEW_W * img.naturalHeight) / img.naturalWidth));
      const decoded = decode(hash, pw, ph);
      const pc = previewCanvasRef.current;
      if (pc && !cancelled) {
        pc.width = pw;
        pc.height = ph;
        const pctx = pc.getContext("2d")!;
        const imageData = new ImageData(new Uint8ClampedArray(decoded.buffer as ArrayBuffer), pw, ph);
        pctx.putImageData(imageData, 0, 0);
      }
    })();
    return () => { cancelled = true; };
  }, [hash, img]);

  const acceptFile = useCallback(async (f: File) => {
    if (!f.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const loaded = await loadImageFile(f);
      setImg(loaded);
      setPreviewUrl(URL.createObjectURL(f));
      await encodeImage(loaded, compX, compY);
      trial.recordUse();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that image.");
    } finally {
      setBusy(false);
    }
  }, [encodeImage, compX, compY, trial]);

  const reEncode = useCallback(async (cx: number, cy: number) => {
    if (!img || busy) return;
    setBusy(true);
    try {
      await encodeImage(img, cx, cy);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Encoding failed.");
    } finally {
      setBusy(false);
    }
  }, [img, busy, encodeImage]);

  const copyHash = () => {
    void navigator.clipboard.writeText(hash).then(() => toast.success("Blurhash copied"));
  };

  return (
    <ToolPageShell toolId="blurhash-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Blurhash Generator" left={trial.left} />

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
            <p className="text-sm font-semibold">Drop an image</p>
            <p className="mt-1 text-xs text-muted-foreground">Files never leave your device</p>
            <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void acceptFile(f); }} />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-[13px] font-medium text-foreground/80">Components X</label>
              <span className="text-xs font-bold text-muted-foreground">{compX}</span>
            </div>
            <input
              type="range" min={1} max={9} value={compX}
              onChange={(e) => { const v = Number(e.target.value); setCompX(v); void reEncode(v, compY); }}
              className="w-full accent-primary"
            />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-[13px] font-medium text-foreground/80">Components Y</label>
              <span className="text-xs font-bold text-muted-foreground">{compY}</span>
            </div>
            <input
              type="range" min={1} max={9} value={compY}
              onChange={(e) => { const v = Number(e.target.value); setCompY(v); void reEncode(compX, v); }}
              className="w-full accent-primary"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              4x3 suits most photos. More components keep more detail but make a longer string.
            </p>
          </div>

          {hash && (
            <button
              type="button" onClick={copyHash}
              className="flex w-full items-center justify-between gap-2 rounded-xl border border-border px-3 py-2.5 text-left transition hover:border-primary/60"
            >
              <span className="truncate font-mono text-xs font-bold">{hash}</span>
              <Copy className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          )}
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free encodes left - everything runs in your browser.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {!img ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <ImageIcon className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your image and its blur preview appear here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                The Blurhash string shows a blurry placeholder while the real image loads on your site or app.
              </p>
            </div>
          ) : (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-6">
              <div className="flex flex-wrap items-start justify-center gap-6">
                <div className="text-center">
                  <p className="mb-2 flex items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <ImageIcon className="h-3.5 w-3.5" /> Original
                  </p>
                  <img src={previewUrl} alt="Original" className="max-h-56 rounded-xl border border-border" />
                </div>
                <div className="text-center">
                  <p className="mb-2 flex items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <Sparkles className="h-3.5 w-3.5" /> Decoded placeholder
                  </p>
                  <canvas ref={previewCanvasRef} className="max-h-56 max-w-full rounded-xl border border-border" />
                </div>
              </div>
              {hash && (
                <div className="w-full max-w-xl rounded-xl bg-muted/50 p-4 text-center">
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">Blurhash string ({hash.length} chars)</p>
                  <button type="button" onClick={copyHash} className="break-all font-mono text-sm font-bold text-primary transition hover:underline">
                    {hash}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
