// /tools/image-color-picker - Pick colors off any image with a magnifier loupe.
// Click to sample, click a readout to copy. 100% in-browser. No upload, no watermark.

import { useCallback, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, FileUp, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import { loadImageFile, rgbToHex } from "@/lib/image-tools";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/image-color-picker")({
  head: () => {
    const seo = getToolSeoMeta("image-color-picker");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: ColorPickerTool,
});

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const R = r / 255, G = g / 255, B = b / 255;
  const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
  const l = (mx + mn) / 2;
  let h = 0, s = 0;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === R) h = ((G - B) / d + (G < B ? 6 : 0));
    else if (mx === G) h = (B - R) / d + 2;
    else h = (R - G) / d + 4;
    h *= 60;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

const LOUPE = 140;

function ColorPickerTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("image-color-picker", isPro);
  const seo = getToolSeo("image-color-picker");

  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [zoom, setZoom] = useState(4);
  const [picked, setPicked] = useState<[number, number, number] | null>(null);
  const [hover, setHover] = useState<[number, number, number] | null>(null);
  const [loupe, setLoupe] = useState<{ x: number; y: number; sx: number; sy: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loupeCanvasRef = useRef<HTMLCanvasElement>(null);

  const acceptFile = useCallback(async (f: File) => {
    if (!f.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    try {
      const loaded = await loadImageFile(f);
      setImg(loaded);
      setPreviewUrl(URL.createObjectURL(f));
      setPicked(null);
      setHover(null);
      setLoupe(null);
      trial.recordUse();
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that image.");
    }
  }, [trial]);

  /** Map a client position on the displayed image to the source pixel. */
  const sampleAt = useCallback((clientX: number, clientY: number) => {
    const disp = imgRef.current;
    if (!disp || !img) return;
    const rect = disp.getBoundingClientRect();
    const dx = (clientX - rect.left) / rect.width;
    const dy = (clientY - rect.top) / rect.height;
    if (dx < 0 || dx > 1 || dy < 0 || dy > 1) return null;
    const sx = Math.floor(dx * img.naturalWidth);
    const sy = Math.floor(dy * img.naturalHeight);
    const canvas = canvasRef.current;
    if (!canvas) return null;
    let ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    if (canvas.width !== img.naturalWidth || canvas.height !== img.naturalHeight) {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0);
    }
    const px = ctx.getImageData(sx, sy, 1, 1).data;
    return { rgb: [px[0], px[1], px[2]] as [number, number, number], sx, sy };
  }, [img]);

  const drawLoupe = useCallback((sx: number, sy: number) => {
    const lc = loupeCanvasRef.current;
    if (!lc || !img) return;
    const size = LOUPE;
    lc.width = size;
    lc.height = size;
    const ctx = lc.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    const half = size / 2;
    // Draw the zoomed source region.
    ctx.drawImage(
      img,
      sx - (half / zoom) * 1, sy - (half / zoom) * 1,
      (size / zoom), (size / zoom),
      0, 0, size, size,
    );
    // Crosshair.
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(half - 8, half);
    ctx.lineTo(half + 8, half);
    ctx.moveTo(half, half - 8);
    ctx.lineTo(half, half + 8);
    ctx.stroke();
    // Round mask.
    ctx.save();
    ctx.globalCompositeOperation = "destination-in";
    ctx.beginPath();
    ctx.arc(half, half, half - 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }, [img, zoom]);

  const onMove = (e: React.MouseEvent) => {
    const hit = sampleAt(e.clientX, e.clientY);
    if (hit) {
      setHover(hit.rgb);
      drawLoupe(hit.sx, hit.sy);
      setLoupe({ x: e.clientX, y: e.clientY, sx: hit.sx, sy: hit.sy });
    } else {
      setHover(null);
      setLoupe(null);
    }
  };

  const onLeave = () => {
    setHover(null);
    setLoupe(null);
  };

  const onClick = (e: React.MouseEvent) => {
    const hit = sampleAt(e.clientX, e.clientY);
    if (hit) {
      setPicked(hit.rgb);
      toast.success(`Picked ${rgbToHex(...hit.rgb)}`);
    }
  };

  const copy = (text: string) => {
    void navigator.clipboard.writeText(text).then(() => toast.success(`Copied ${text}`));
  };

  const show = picked ?? hover;
  const hex = show ? rgbToHex(...show) : null;
  const hsl = show ? rgbToHsl(...show) : null;

  return (
    <ToolPageShell toolId="image-color-picker" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Image Color Picker" left={trial.left} />

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
              <label className="text-[13px] font-medium text-foreground/80">Loupe zoom</label>
              <span className="text-xs font-bold text-muted-foreground">{zoom}x</span>
            </div>
            <input
              type="range" min={2} max={12} value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          {hex && hsl && (
            <div className="space-y-2 rounded-xl border border-border p-3">
              <div className="h-12 w-full rounded-lg border border-border" style={{ backgroundColor: hex }} />
              {[
                { label: "HEX", value: hex },
                { label: "RGB", value: `rgb(${show![0]}, ${show![1]}, ${show![2]})` },
                { label: "HSL", value: `hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)` },
              ].map((r) => (
                <button
                  key={r.label}
                  type="button"
                  onClick={() => copy(r.value)}
                  className="group flex w-full items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-left transition hover:bg-muted"
                >
                  <span className="text-xs font-semibold text-muted-foreground">{r.label}</span>
                  <span className="flex items-center gap-2 text-xs font-bold">
                    {r.value}
                    <Copy className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                  </span>
                </button>
              ))}
            </div>
          )}
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free uses left - everything runs in your browser.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="relative rounded-2xl border border-border bg-card p-5">
          {!img ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <ImageIcon className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your image appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Hover to inspect with the magnifier, click anywhere to lock in the color.
              </p>
            </div>
          ) : (
            <div className="flex min-h-[320px] items-center justify-center">
              <img
                ref={imgRef}
                src={previewUrl}
                alt="Pick colors"
                onMouseMove={onMove}
                onMouseLeave={onLeave}
                onClick={onClick}
                className="max-h-[60vh] cursor-crosshair rounded-lg"
                draggable={false}
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>
          )}
          {loupe && hover && (
            <div
              className="pointer-events-none fixed z-50 overflow-hidden rounded-full border-2 border-white shadow-2xl"
              style={{ left: loupe.x + 16, top: loupe.y + 16, width: LOUPE, height: LOUPE }}
            >
              <canvas ref={loupeCanvasRef} />
              <div
                className="absolute bottom-0 left-0 right-0 px-2 py-1 text-center text-[11px] font-bold text-white"
                style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
              >
                {rgbToHex(...hover)}
              </div>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
