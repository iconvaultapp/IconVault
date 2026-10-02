// /tools/social-media-resizer - One photo, every platform size: Instagram,
// YouTube, X, LinkedIn, Facebook and Pinterest presets. Crop to fill or fit
// the whole image with a letterbox background, then download each size or a
// ZIP of all. 100% in-browser, files never leave the device.

import { useCallback, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileUp, FolderDown, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import {
  loadImageFile,
  canvasToBlob,
  fillBackground,
  drawCover,
  drawContain,
  baseName,
} from "@/lib/image-tools";

export const Route = createFileRoute("/tools_/social-media-resizer")({
  head: () => {
    const seo = getToolSeoMeta("social-media-resizer");
    const canonical = "https://iconvault.site/tools/social-media-resizer";
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
  component: SocialMediaResizerTool,
});

const PRESETS = [
  { id: "ig-post", label: "Instagram post", w: 1080, h: 1080 },
  { id: "ig-portrait", label: "Instagram portrait", w: 1080, h: 1350 },
  { id: "ig-story", label: "Instagram story / Reel", w: 1080, h: 1920 },
  { id: "yt-thumb", label: "YouTube thumbnail", w: 1280, h: 720 },
  { id: "x-post", label: "X post", w: 1600, h: 900 },
  { id: "x-header", label: "X header", w: 1500, h: 500 },
  { id: "li-post", label: "LinkedIn post", w: 1200, h: 627 },
  { id: "li-banner", label: "LinkedIn banner", w: 1584, h: 396 },
  { id: "fb-cover", label: "Facebook cover", w: 820, h: 312 },
  { id: "pin", label: "Pinterest pin", w: 1000, h: 1500 },
] as const;

interface Result {
  presetId: string;
  blob: Blob;
}

function SocialMediaResizerTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("social-media-resizer", isPro);
  const seo = getToolSeo("social-media-resizer");

  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [name, setName] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [selected, setSelected] = useState<string[]>(PRESETS.map((p) => p.id));
  const [fit, setFit] = useState<"crop" | "fit">("crop");
  const [bg, setBg] = useState("#ffffff");
  const [format, setFormat] = useState<"image/jpeg" | "image/png">("image/jpeg");
  const [quality, setQuality] = useState(85);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

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
      setResults([]);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that image.");
    }
  }, [previewUrl]);

  const togglePreset = (id: string) =>
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const selectAll = () => setSelected(PRESETS.map((p) => p.id));
  const selectNone = () => setSelected([]);

  const create = useCallback(async () => {
    if (!img || busy || !trial.canUse || selected.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const mime = format;
      const out: Result[] = [];
      for (const id of selected) {
        const preset = PRESETS.find((p) => p.id === id)!;
        const canvas = document.createElement("canvas");
        canvas.width = preset.w;
        canvas.height = preset.h;
        const ctx = canvas.getContext("2d")!;
        if (fit === "crop") {
          drawCover(ctx, img, img.naturalWidth, img.naturalHeight, 0, 0, preset.w, preset.h);
        } else {
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, preset.w, preset.h);
          drawContain(ctx, img, img.naturalWidth, img.naturalHeight, 0, 0, preset.w, preset.h);
        }
        if (mime === "image/jpeg") fillBackground(canvas, "#ffffff");
        const blob = await canvasToBlob(canvas, mime, quality / 100);
        out.push({ presetId: id, blob });
      }
      setResults(out);
      trial.recordUse();
      toast.success(`Created ${out.length} image${out.length === 1 ? "" : "s"}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Resize failed.");
    } finally {
      setBusy(false);
    }
  }, [img, busy, trial, selected, fit, bg, format, quality]);

  const downloadZip = useCallback(async () => {
    if (results.length === 0) return;
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    const ext = format === "image/jpeg" ? "jpg" : "png";
    for (const r of results) {
      zip.file(`${baseName(name || "image")}-${r.presetId}.${ext}`, r.blob);
    }
    const out = await zip.generateAsync({ type: "blob" });
    downloadBlob(out, "social-media-sizes.zip");
    toast.success("ZIP downloaded");
  }, [results, format, name]);

  const ext = format === "image/jpeg" ? "jpg" : "png";
  const presetOf = (id: string) => PRESETS.find((p) => p.id === id)!;

  return (
    <ToolPageShell toolId="social-media-resizer" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Social Media Resizer" left={trial.left} />

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
            <p className="mt-1 text-xs text-muted-foreground">One photo becomes every platform size</p>
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void acceptFile(f); }}
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">
                Sizes ({selected.length} selected)
              </p>
              <div className="flex gap-2 text-xs font-bold">
                <button type="button" onClick={selectAll} className="text-primary hover:underline">
                  Select all
                </button>
                <button type="button" onClick={selectNone} className="text-muted-foreground hover:underline">
                  Clear
                </button>
              </div>
            </div>
            <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
              {PRESETS.map((p) => (
                <label
                  key={p.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition",
                    selected.includes(p.id) ? "border-primary/60 bg-primary/5" : "border-border hover:border-primary/40",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(p.id)}
                    onChange={() => togglePreset(p.id)}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="flex-1 font-medium">{p.label}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {p.w}×{p.h}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Fit</p>
            <div className="space-y-1.5">
              <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                <input
                  type="radio"
                  name="fit"
                  checked={fit === "crop"}
                  onChange={() => setFit("crop")}
                  className="h-4 w-4 accent-primary"
                />
                <span className="font-medium">Crop to fill</span>
                <span className="text-xs text-muted-foreground">fills the frame, edges trimmed</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                <input
                  type="radio"
                  name="fit"
                  checked={fit === "fit"}
                  onChange={() => setFit("fit")}
                  className="h-4 w-4 accent-primary"
                />
                <span className="font-medium">Fit whole image</span>
                <span className="text-xs text-muted-foreground">letterbox, nothing cropped</span>
              </label>
            </div>
            {fit === "fit" && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="color"
                  value={bg}
                  onChange={(e) => setBg(e.target.value)}
                  className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent"
                />
                <span className="text-sm text-muted-foreground">Letterbox background color</span>
              </div>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Format and quality</p>
              {format === "image/jpeg" && (
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-bold">{quality}%</span>
              )}
            </div>
            <div className="mb-2 flex gap-2">
              {(["image/jpeg", "image/png"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setFormat(m)}
                  className={cn(
                    "flex-1 rounded-xl border px-4 py-2 text-sm font-bold transition",
                    format === m
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {m === "image/jpeg" ? "JPG" : "PNG"}
                </button>
              ))}
            </div>
            {format === "image/jpeg" && (
              <input
                type="range"
                min={5}
                max={100}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full accent-primary"
              />
            )}
          </div>

          <ActionButton busy={busy} disabled={!img || selected.length === 0 || !trial.canUse} onClick={create}>
            {busy ? "Creating…" : `Create ${selected.length} image${selected.length === 1 ? "" : "s"}`}
          </ActionButton>
          {results.length > 0 && (
            <button
              type="button"
              onClick={downloadZip}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition hover:border-primary/40"
            >
              <FolderDown className="h-4 w-4" /> ZIP all ({results.length})
            </button>
          )}
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
              <p className="font-semibold">Your resized images appear here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Drop a photo, tick the platforms you post to, and download every size at once.
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-4">
              <div className="rounded-lg bg-[repeating-conic-gradient(#80808033_0_25%,transparent_0_50%)] bg-[length:20px_20px] p-4">
                <img src={previewUrl} alt="Source" className="max-h-64 rounded" />
              </div>
              <p className="text-sm text-muted-foreground">
                {img.naturalWidth} × {img.naturalHeight} px. Press create to build {selected.length} size
                {selected.length === 1 ? "" : "s"}.
              </p>
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {results.map((r) => {
                const p = presetOf(r.presetId);
                return (
                  <li key={r.presetId} className="flex items-center gap-3 rounded-xl border border-border p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{p.label}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {p.w} × {p.h} px
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => downloadBlob(r.blob, `${baseName(name || "image")}-${r.presetId}.${ext}`)}
                      className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition hover:opacity-90"
                    >
                      <Download className="h-3.5 w-3.5" /> Download
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
