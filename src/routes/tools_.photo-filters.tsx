// /tools/photo-filters - Instagram-style filters for one photo or a whole batch.
// Presets plus fine-tune sliders. Single download, or a ZIP for batches. 100% in-browser.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileUp, Image as ImageIcon, RotateCcw, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import { loadImageFile, canvasToBlob, baseName, fillBackground } from "@/lib/image-tools";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/photo-filters")({
  head: () => {
    const seo = getToolSeoMeta("photo-filters");
    const canonical = "https://iconvault.site/tools/photo-filters";
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
  component: FiltersTool,
});

type Preset = {
  name: string;
  filter: string;
  overlay: string | null;
  overlayAlpha: number;
  grain: number;
};

const PRESETS: Preset[] = [
  { name: "Original", filter: "none", overlay: null, overlayAlpha: 0, grain: 0 },
  { name: "Grayscale", filter: "grayscale(100%)", overlay: null, overlayAlpha: 0, grain: 0 },
  { name: "Sepia", filter: "sepia(90%)", overlay: null, overlayAlpha: 0, grain: 0 },
  { name: "Vintage fade", filter: "sepia(40%) contrast(0.9) brightness(1.05)", overlay: "#d8c49a", overlayAlpha: 0.12, grain: 0 },
  { name: "Warm", filter: "saturate(1.3) contrast(1.05)", overlay: "#ff8c42", overlayAlpha: 0.1, grain: 0 },
  { name: "Cool", filter: "saturate(1.15) contrast(1.05)", overlay: "#4aa8ff", overlayAlpha: 0.12, grain: 0 },
  { name: "High contrast", filter: "contrast(1.5) saturate(1.2)", overlay: null, overlayAlpha: 0, grain: 0 },
  { name: "Noir", filter: "grayscale(100%) contrast(1.4) brightness(0.95)", overlay: "#000000", overlayAlpha: 0.08, grain: 0 },
  { name: "Film grain", filter: "sepia(25%) contrast(1.1) brightness(1.02)", overlay: null, overlayAlpha: 0, grain: 12 },
];

function FiltersTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("photo-filters", isPro);
  const seo = getToolSeo("photo-filters");

  const [images, setImages] = useState<{ img: HTMLImageElement; name: string }[]>([]);
  const [preset, setPreset] = useState("Original");
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [grainAmt, setGrainAmt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const activePreset = PRESETS.find((p) => p.name === preset) ?? PRESETS[0]!;

  const acceptFiles = useCallback(async (files: FileList | File[]) => {
    const list = [...files].filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) {
      setError("Please choose image files.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const loaded: { img: HTMLImageElement; name: string }[] = [];
      for (const f of list) {
        loaded.push({ img: await loadImageFile(f), name: f.name });
      }
      setImages(loaded);
      trial.recordUse();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read those images.");
    } finally {
      setBusy(false);
    }
  }, [trial]);

  const buildFilter = useCallback(() => {
    const parts: string[] = [];
    if (activePreset.filter !== "none") parts.push(activePreset.filter);
    if (brightness !== 0) parts.push(`brightness(${1 + brightness / 100})`);
    if (contrast !== 0) parts.push(`contrast(${1 + contrast / 100})`);
    if (saturation !== 0) parts.push(`saturate(${1 + saturation / 100})`);
    return parts.length ? parts.join(" ") : "none";
  }, [activePreset, brightness, contrast, saturation]);

  const applyToCanvas = useCallback((canvas: HTMLCanvasElement, img: HTMLImageElement) => {
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.filter = buildFilter();
    ctx.drawImage(img, 0, 0, w, h);
    ctx.filter = "none";
    if (activePreset.overlay) {
      ctx.globalAlpha = activePreset.overlayAlpha;
      ctx.fillStyle = activePreset.overlay;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }
    const grain = Math.max(activePreset.grain, grainAmt);
    if (grain > 0) {
      const gCanvas = document.createElement("canvas");
      const gw = Math.min(320, w);
      const gh = Math.min(320, h);
      gCanvas.width = gw;
      gCanvas.height = gh;
      const gctx = gCanvas.getContext("2d")!;
      const id = gctx.createImageData(gw, gh);
      const a = Math.round((grain / 100) * 60);
      for (let i = 0; i < id.data.length; i += 4) {
        const v = Math.floor(Math.random() * 256);
        id.data[i] = v;
        id.data[i + 1] = v;
        id.data[i + 2] = v;
        id.data[i + 3] = a;
      }
      gctx.putImageData(id, 0, 0);
      ctx.globalAlpha = 0.5;
      const pattern = ctx.createPattern(gCanvas, "repeat");
      if (pattern) {
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, w, h);
      }
      ctx.globalAlpha = 1;
    }
  }, [buildFilter, activePreset, grainAmt]);

  // Live preview of the first image.
  useEffect(() => {
    const canvas = canvasRef.current;
    const first = images[0];
    if (!canvas || !first) return;
    applyToCanvas(canvas, first.img);
    // Downscale the DOM canvas for display only by CSS; keep full res for export.
  }, [images, applyToCanvas]);

  const reset = () => {
    setPreset("Original");
    setBrightness(0);
    setContrast(0);
    setSaturation(0);
    setGrainAmt(0);
  };

  const apply = useCallback(async () => {
    if (images.length === 0 || busy || !trial.canUse) return;
    setBusy(true);
    setError(null);
    try {
      const first = images[0];
      if (images.length === 1 && first) {
        const canvas = document.createElement("canvas");
        applyToCanvas(canvas, first.img);
        fillBackground(canvas, "#ffffff");
        const blob = await canvasToBlob(canvas, "image/jpeg", 0.92);
        downloadBlob(blob, `${baseName(first.name)}-filtered.jpg`);
      } else {
        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();
        for (const entry of images) {
          const canvas = document.createElement("canvas");
          applyToCanvas(canvas, entry.img);
          fillBackground(canvas, "#ffffff");
          const blob = await canvasToBlob(canvas, "image/jpeg", 0.92);
          zip.file(`${baseName(entry.name)}-filtered.jpg`, blob);
        }
        const out = await zip.generateAsync({ type: "blob" });
        downloadBlob(out, "filtered-photos.zip");
      }
      trial.recordUse();
      toast.success(images.length === 1 ? "Photo downloaded" : "ZIP downloaded");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  }, [images, busy, trial, applyToCanvas]);

  const slider = (
    label: string,
    value: number,
    set: (v: number) => void,
    hint: string,
  ) => (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-[13px] font-medium text-foreground/80">{label}</label>
        <span className="text-xs font-bold text-muted-foreground">{value > 0 ? `+${value}` : value}</span>
      </div>
      <input type="range" min={-100} max={100} value={value} onChange={(e) => set(Number(e.target.value))} className="w-full accent-primary" />
      <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );

  return (
    <ToolPageShell toolId="photo-filters" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Photo Filters" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="max-h-[80vh] space-y-5 overflow-y-auto rounded-2xl border border-border bg-card p-5">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) void acceptFiles(e.dataTransfer.files); }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition",
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
            )}
          >
            <FileUp className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold">{images.length ? `${images.length} photo${images.length > 1 ? "s" : ""} loaded` : "Drop one or more photos"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Same settings apply to all. Files never leave your device.</p>
            <input ref={inputRef} type="file" multiple accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { if (e.target.files?.length) void acceptFiles(e.target.files); }} />
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Preset</p>
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => setPreset(p.name)}
                  className={cn(
                    "rounded-xl border px-2 py-2 text-xs font-semibold transition",
                    preset === p.name ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {slider("Brightness", brightness, setBrightness, "Default 0")}
          {slider("Contrast", contrast, setContrast, "Default 0")}
          {slider("Saturation", saturation, setSaturation, "Default 0")}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-[13px] font-medium text-foreground/80">Grain</label>
              <span className="text-xs font-bold text-muted-foreground">{grainAmt}</span>
            </div>
            <input type="range" min={0} max={100} value={grainAmt} onChange={(e) => setGrainAmt(Number(e.target.value))} className="w-full accent-primary" />
            <p className="mt-0.5 text-[11px] text-muted-foreground">Default 0. Film grain preset already adds some.</p>
          </div>

          <button
            type="button" onClick={reset}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold transition hover:border-primary/60"
          >
            <RotateCcw className="h-4 w-4" /> Reset
          </button>

          <ActionButton busy={busy} disabled={images.length === 0 || !trial.canUse} onClick={apply}>
            <Download className="h-4 w-4" /> {busy ? "Applying…" : images.length > 1 ? "Apply filter (ZIP)" : "Apply filter"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free exports left - everything runs in your browser.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {images.length === 0 ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <ImageIcon className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your filtered photo appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Pick a preset, fine-tune the sliders, and export. Batches come back as a ZIP.
              </p>
            </div>
          ) : (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-3">
              <canvas ref={canvasRef} className="max-h-[70vh] max-w-full rounded-xl" />
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Wand2 className="h-3.5 w-3.5" />
                {preset}{images.length > 1 ? ` - preview of first photo, ${images.length} photos will be processed` : ""}
              </p>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
