// /tools/resize-to-cm-mm - Resize a photo to an exact physical size in cm,
// mm or inches at a chosen DPI (embedded in the file), for print and ID
// photos. Exact on both sides: extra edges are center-cropped. 100%
// in-browser, files never leave the device.

import { useCallback, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileUp, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/resize-to-cm-mm";
import toolSeoMeta from "@/lib/tool-seo-meta-data/resize-to-cm-mm";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import {
  loadImageFile,
  canvasToBlob,
  fillBackground,
  drawCover,
  pngWithDpi,
  jpegWithDpi,
} from "@/lib/image-tools";

export const Route = createFileRoute("/tools_/resize-to-cm-mm")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/resize-to-cm-mm";
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
  component: ResizeToCmMmTool,
});

const DPI_PRESETS = [72, 150, 300, 600] as const;

function ResizeToCmMmTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("resize-to-cm-mm", isPro);
  const seo = toolSeo;

  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [name, setName] = useState("");
  const [srcType, setSrcType] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [unit, setUnit] = useState<"cm" | "mm" | "in">("cm");
  const [w, setW] = useState("3.5");
  const [h, setH] = useState("4.5");
  const [keep, setKeep] = useState(false);
  const [dpi, setDpi] = useState<number | "custom">(300);
  const [customDpi, setCustomDpi] = useState("300");
  const [format, setFormat] = useState<"jpeg" | "png" | "same">("same");
  const [quality, setQuality] = useState(92);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const dpiValue = dpi === "custom" ? Math.round(Number(customDpi) || 0) : dpi;
  const perUnit = unit === "cm" ? dpiValue / 2.54 : unit === "mm" ? dpiValue / 25.4 : dpiValue;
  const wNum = Number(w);
  const hNum = Number(h);
  const pw = Number.isFinite(wNum) && wNum > 0 ? Math.round(wNum * perUnit) : 0;
  const ph = Number.isFinite(hNum) && hNum > 0 ? Math.round(hNum * perUnit) : 0;

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
      setSrcType(f.type);
      setPreviewUrl(URL.createObjectURL(f));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that image.");
    }
  }, [previewUrl]);

  const aspect = img ? img.naturalWidth / img.naturalHeight : 1;

  const onW = (v: string) => {
    setW(v);
    if (keep && img) {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) setH(String(Math.round((n / aspect) * 100) / 100));
    }
  };

  const onH = (v: string) => {
    setH(v);
    if (keep && img) {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) setW(String(Math.round(n * aspect * 100) / 100));
    }
  };

  const resizeDownload = useCallback(async () => {
    if (!img || busy || !trial.canUse || pw <= 0 || ph <= 0 || dpiValue <= 0) return;
    if (pw > 12000 || ph > 12000) {
      setError("That size is too large to render in the browser. Try a lower DPI or smaller size.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = pw;
      canvas.height = ph;
      const ctx = canvas.getContext("2d")!;
      // Exact on both sides: scale to cover, extra edges center-cropped.
      drawCover(ctx, img, img.naturalWidth, img.naturalHeight, 0, 0, pw, ph);
      let mime: string;
      let ext: string;
      if (format === "same" && (srcType === "image/png" || srcType === "image/webp")) {
        mime = srcType;
        ext = srcType === "image/png" ? "png" : "webp";
      } else {
        mime = format === "png" ? "image/png" : "image/jpeg";
        ext = format === "png" ? "png" : "jpg";
      }
      if (mime === "image/jpeg") fillBackground(canvas, "#ffffff");
      let blob = await canvasToBlob(canvas, mime, quality / 100);
      if (mime === "image/png") blob = await pngWithDpi(blob, dpiValue);
      else if (mime === "image/jpeg") blob = await jpegWithDpi(blob, dpiValue);
      downloadBlob(blob, `${name || "resized"}-${w}x${h}${unit}-${dpiValue}dpi.${ext}`);
      trial.recordUse();
      toast.success("Resized image downloaded");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Resize failed.");
    } finally {
      setBusy(false);
    }
  }, [img, busy, trial, pw, ph, dpiValue, format, srcType, quality, name, w, h, unit]);

  const valid = img && pw > 0 && ph > 0 && dpiValue > 0 && trial.canUse;

  return (
    <ToolPageShell toolId="resize-to-cm-mm" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Resize to CM / MM" left={trial.left} />

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
            <p className="text-sm font-semibold">{name || "Drop a photo here"}</p>
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
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Units</p>
            <div className="flex gap-2">
              {(
                [
                  ["cm", "CM"],
                  ["mm", "MM"],
                  ["in", "Inches"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setUnit(id)}
                  className={cn(
                    "flex-1 rounded-xl border px-4 py-2.5 text-sm font-bold transition",
                    unit === id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Size</p>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase text-muted-foreground">Width</span>
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={w}
                  onChange={(e) => onW(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase text-muted-foreground">Height</span>
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={h}
                  onChange={(e) => onH(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold"
                />
              </label>
            </div>
            <label className="mt-2 flex cursor-pointer items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={keep}
                onChange={(e) => setKeep(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              <span className="font-medium">Keep proportions</span>
            </label>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">DPI (embedded in the file)</p>
            <div className="flex flex-wrap gap-2">
              {DPI_PRESETS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDpi(d)}
                  className={cn(
                    "rounded-xl border px-3.5 py-2 text-sm font-bold transition",
                    dpi === d
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {d}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setDpi("custom")}
                className={cn(
                  "rounded-xl border px-3.5 py-2 text-sm font-bold transition",
                  dpi === "custom"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                Custom
              </button>
            </div>
            {dpi === "custom" && (
              <input
                type="number"
                min={1}
                value={customDpi}
                onChange={(e) => setCustomDpi(e.target.value)}
                className="mt-2 w-28 rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold"
              />
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Format and quality</p>
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-bold">{quality}%</span>
            </div>
            <div className="mb-2 flex gap-2">
              {(
                [
                  ["same", "Same as input"],
                  ["jpeg", "JPG"],
                  ["png", "PNG"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFormat(id)}
                  className={cn(
                    "flex-1 rounded-xl border px-2 py-2 text-xs font-bold transition",
                    format === id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <input
              type="range"
              min={5}
              max={100}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          <ActionButton busy={busy} disabled={!valid} onClick={resizeDownload}>
            <Download className="h-4 w-4" /> {busy ? "Resizing…" : "Download resized image"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free resizes left - files never leave your device.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {!img ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <ImageIcon className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your photo appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Set a physical size like 3.5 × 4.5 cm at 300 DPI for passport and ID photos.
              </p>
            </div>
          ) : (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-4">
              <div className="rounded-lg bg-[repeating-conic-gradient(#80808033_0_25%,transparent_0_50%)] bg-[length:20px_20px] p-4">
                <img src={previewUrl} alt="Source" className="max-h-64 rounded" />
              </div>
              <p className="rounded-xl border border-border bg-muted/50 px-4 py-2 font-mono text-sm font-bold">
                Output: {pw} × {ph} px
              </p>
              <p className="max-w-sm text-center text-xs text-muted-foreground">
                {w || "?"} × {h || "?"} {unit === "in" ? "inches" : unit} at {dpiValue} DPI. The image is scaled to
                cover the frame exactly, so extra edges are center-cropped.
              </p>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
