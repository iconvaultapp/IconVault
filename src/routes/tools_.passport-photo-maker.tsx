// /tools/passport-photo-maker - Crop and size a photo to common passport/visa dimensions at
// 300 DPI with drag positioning, zoom, and background fill. 100% in-browser. No upload.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileUp, Image as ImageIcon, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/passport-photo-maker";
import toolSeoMeta from "@/lib/tool-seo-meta-data/passport-photo-maker";
import { loadImageFile, canvasToBlob, baseName, jpegWithDpi } from "@/lib/image-tools";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/passport-photo-maker")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/passport-photo-maker";
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
  component: PassportTool,
});

const DPI = 300;

type Preset = { name: string; w: number; h: number }; // px at 300 DPI

const PRESETS: Preset[] = [
  { name: "US passport / visa - 2x2 in", w: 600, h: 600 },
  { name: "UK - 35x45 mm", w: Math.round((35 / 25.4) * DPI), h: Math.round((45 / 25.4) * DPI) },
  { name: "India - 35x45 mm", w: Math.round((35 / 25.4) * DPI), h: Math.round((45 / 25.4) * DPI) },
  { name: "India visa / OCI - 51x51 mm", w: Math.round((51 / 25.4) * DPI), h: Math.round((51 / 25.4) * DPI) },
  { name: "Schengen - 35x45 mm", w: Math.round((35 / 25.4) * DPI), h: Math.round((45 / 25.4) * DPI) },
  { name: "Canada - 50x70 mm", w: Math.round((50 / 25.4) * DPI), h: Math.round((70 / 25.4) * DPI) },
  { name: "China - 33x48 mm", w: Math.round((33 / 25.4) * DPI), h: Math.round((48 / 25.4) * DPI) },
  { name: "Australia - 35x45 mm", w: Math.round((35 / 25.4) * DPI), h: Math.round((45 / 25.4) * DPI) },
];

function PassportTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("passport-photo-maker", isPro);
  const seo = toolSeo;

  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [fileName, setFileName] = useState("");
  const [presetIdx, setPresetIdx] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [pos, setPos] = useState({ x: 0.5, y: 0.5 });
  const [fillColor, setFillColor] = useState("#ffffff");
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const preset = PRESETS[presetIdx]!;

  const acceptFile = useCallback(async (f: File) => {
    if (!f.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    try {
      const loaded = await loadImageFile(f);
      setImg(loaded);
      setFileName(baseName(f.name));
      setZoom(100);
      setPos({ x: 0.5, y: 0.5 });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that image.");
    }
  }, []);

  /** Draw the document frame at `scale` (1 = full export res). */
  const draw = useCallback((canvas: HTMLCanvasElement, scale: number) => {
    if (!img) return;
    const w = Math.round(preset.w * scale);
    const h = Math.round(preset.h * scale);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = fillColor;
    ctx.fillRect(0, 0, w, h);
    const z = zoom / 100;
    // Cover-fit the frame with the photo at zoom, then shift by drag position.
    const base = Math.max(w / img.naturalWidth, h / img.naturalHeight) * z;
    const dw = img.naturalWidth * base;
    const dh = img.naturalHeight * base;
    const x = pos.x * (w - dw);
    const y = pos.y * (h - dh);
    ctx.drawImage(img, x, y, dw, dh);
  }, [img, preset, zoom, pos, fillColor]);

  // Live preview.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    const maxSide = 420;
    const scale = Math.min(1, maxSide / Math.max(preset.w, preset.h));
    draw(canvas, scale);
  }, [img, draw, preset]);

  const exportJpg = useCallback(async () => {
    if (!img || busy || !trial.canUse) return;
    setBusy(true);
    setError(null);
    try {
      const canvas = document.createElement("canvas");
      draw(canvas, 1);
      let blob = await canvasToBlob(canvas, "image/jpeg", 0.95);
      blob = await jpegWithDpi(blob, DPI);
      downloadBlob(blob, `${fileName || "passport-photo"}.jpg`);
      trial.recordUse();
      toast.success("Passport photo exported");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  }, [img, busy, trial, draw, fileName]);

  // Drag to reposition.
  const dragRef = useRef(false);
  const onPointerDown = (e: React.PointerEvent) => {
    dragRef.current = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setPos({
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    });
  };
  const onPointerUp = () => {
    dragRef.current = false;
  };

  return (
    <ToolPageShell toolId="passport-photo-maker" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Passport Photo Maker" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="max-h-[80vh] space-y-5 overflow-y-auto rounded-2xl border border-border bg-card p-5">
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
            <p className="text-sm font-semibold">{fileName || "Drop a photo"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Files never leave your device</p>
            <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void acceptFile(f); }} />
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Document preset</label>
            <select
              value={presetIdx}
              onChange={(e) => setPresetIdx(Number(e.target.value))}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            >
              {PRESETS.map((p, i) => (
                <option key={p.name} value={i}>{p.name} ({p.w}x{p.h}px)</option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-[13px] font-medium text-foreground/80">Zoom</label>
              <span className="text-xs font-bold text-muted-foreground">{zoom}%</span>
            </div>
            <input
              type="range" min={100} max={300} value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Fill for empty areas</label>
            <div className="flex items-center gap-3">
              <input
                type="color" value={fillColor}
                onChange={(e) => setFillColor(e.target.value)}
                className="h-10 w-16 cursor-pointer rounded-lg border border-border bg-transparent"
              />
              <span className="font-mono text-xs font-bold uppercase text-muted-foreground">{fillColor}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => { setZoom(100); setPos({ x: 0.5, y: 0.5 }); }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold transition hover:border-primary/60"
          >
            <RotateCcw className="h-4 w-4" /> Reset position
          </button>

          <ActionButton busy={busy} disabled={!img || !trial.canUse} onClick={exportJpg}>
            <Download className="h-4 w-4" /> {busy ? "Exporting…" : "Export JPG"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free exports left - everything runs in your browser.
            </p>
          )}
          <p className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
            Honest note: this tool crops and sizes only. It does not change the background. Shoot against a plain light wall for best results.
          </p>
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {!img ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <ImageIcon className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your photo appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Pick a document size, drag to position your face, zoom to fit, then export a 300 DPI JPG.
              </p>
            </div>
          ) : (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-3">
              <canvas
                ref={canvasRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                className="max-h-[60vh] max-w-full cursor-grab rounded-xl border border-border active:cursor-grabbing"
              />
              <p className="text-xs text-muted-foreground">
                Drag on the photo to position it - export is {preset.w}x{preset.h}px at {DPI} DPI.
              </p>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
