// /tools/color-palette-extractor - Extract a color palette from any image with median-cut
// quantization. 100% in-browser. No upload, no watermark.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, FileUp, Image as ImageIcon, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import { loadImageFile, medianCut, rgbToHex } from "@/lib/image-tools";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/color-palette-extractor")({
  head: () => {
    const seo = getToolSeoMeta("color-palette-extractor");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: PaletteTool,
});

function PaletteTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("color-palette-extractor", isPro);
  const seo = getToolSeo("color-palette-extractor");

  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [colorCount, setColorCount] = useState(6);
  const [palette, setPalette] = useState<[number, number, number][]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const extract = useCallback((loaded: HTMLImageElement, count: number) => {
    const maxSide = 200;
    const scale = Math.min(1, maxSide / Math.max(loaded.naturalWidth, loaded.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(loaded.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(loaded.naturalHeight * scale));
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(loaded, 0, 0, canvas.width, canvas.height);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { palette: pal } = medianCut(data, count);
    setPalette(pal);
  }, []);

  const acceptFile = useCallback(async (f: File) => {
    if (!f.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    try {
      const loaded = await loadImageFile(f);
      setImg(loaded);
      setPreviewUrl(URL.createObjectURL(f));
      extract(loaded, colorCount);
      trial.recordUse();
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that image.");
    }
  }, [extract, colorCount, trial]);

  useEffect(() => {
    if (img) extract(img, colorCount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorCount]);

  const copyHex = (hex: string) => {
    void navigator.clipboard.writeText(hex).then(() => {
      setCopied(hex);
      toast.success(`Copied ${hex}`);
      window.setTimeout(() => setCopied((c) => (c === hex ? null : c)), 1500);
    });
  };

  const copyAll = () => {
    const list = palette.map(([r, g, b]) => rgbToHex(r, g, b)).join(", ");
    void navigator.clipboard.writeText(list).then(() => toast.success("Palette copied"));
  };

  return (
    <ToolPageShell toolId="color-palette-extractor" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Color Palette Extractor" left={trial.left} />

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
            <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void acceptFile(f); }} />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-[13px] font-medium text-foreground/80">Colors</label>
              <span className="text-xs font-bold text-muted-foreground">{colorCount}</span>
            </div>
            <input
              type="range" min={2} max={12} value={colorCount}
              onChange={(e) => setColorCount(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">Transparent pixels are ignored.</p>
          </div>

          {palette.length > 0 && (
            <ActionButton disabled={false} onClick={copyAll}>
              <Copy className="h-4 w-4" /> Copy all HEX values
            </ActionButton>
          )}
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free extractions left - everything runs in your browser.
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
                Drop any photo or artwork and get its dominant colors as click-to-copy HEX swatches.
              </p>
            </div>
          ) : (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-6">
              <div className="rounded-lg bg-[repeating-conic-gradient(#80808033_0_25%,transparent_0_50%)] bg-[length:20px_20px] p-4">
                <img src={previewUrl} alt="Source" className="max-h-44 rounded" />
              </div>
              <div className="w-full">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {palette.map(([r, g, b]) => {
                    const hex = rgbToHex(r, g, b);
                    return (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => copyHex(hex)}
                        className="group overflow-hidden rounded-xl border border-border text-left transition hover:border-primary/60"
                      >
                        <div className="h-16 w-full" style={{ backgroundColor: hex }} />
                        <div className="flex items-center justify-between px-3 py-2">
                          <span className="text-xs font-bold uppercase">{hex}</span>
                          {copied === hex
                            ? <Check className="h-3.5 w-3.5 text-green-500" />
                            : <Copy className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition group-hover:opacity-100" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 text-center text-xs text-muted-foreground">Click any swatch to copy its HEX code.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
