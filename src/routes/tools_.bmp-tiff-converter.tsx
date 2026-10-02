// /tools/bmp-tiff-converter - Convert BMP and TIFF images to JPG, PNG or WebP, 100% in-browser.
// BMP decodes natively; multi-page TIFFs become one image per page. No upload, no watermark.

import { useCallback, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileImage, FileUp, PackageOpen, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import { baseName, canvasToBlob, fillBackground, formatBytes, loadImageFile } from "@/lib/image-tools";

export const Route = createFileRoute("/tools_/bmp-tiff-converter")({
  head: () => {
    const seo = getToolSeoMeta("bmp-tiff-converter");
    const canonical = "https://iconvault.site/tools/bmp-tiff-converter";
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
  component: BmpTiffConverter,
});

const OUTPUTS = [
  { id: "jpeg", label: "JPG", mime: "image/jpeg", ext: "jpg" },
  { id: "png", label: "PNG", mime: "image/png", ext: "png" },
  { id: "webp", label: "WebP", mime: "image/webp", ext: "webp" },
] as const;

type OutputId = (typeof OUTPUTS)[number]["id"];

type Item = {
  id: number;
  file: File;
  name: string;
  size: number;
  status: "ready" | "done" | "error";
};

let nextId = 1;

/** Decode one BMP (native <img>) or TIFF (UTIF, one canvas per page). */
async function decodeToPages(file: File): Promise<HTMLCanvasElement[]> {
  const isTiff = /\.tif{1,2}$/i.test(file.name) || file.type === "image/tiff";
  if (isTiff) {
    const UTIF = await import("utif");
    const buf = await file.arrayBuffer();
    const ifds = UTIF.decode(buf);
    if (!ifds.length) throw new Error("Could not decode that TIFF.");
    const pages: HTMLCanvasElement[] = [];
    for (const ifd of ifds) {
      UTIF.decodeImage(buf, ifd);
      const rgba = UTIF.toRGBA8(ifd);
      const canvas = document.createElement("canvas");
      canvas.width = ifd.width;
      canvas.height = ifd.height;
      canvas.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(rgba), ifd.width, ifd.height), 0, 0);
      pages.push(canvas);
    }
    return pages;
  }
  const img = await loadImageFile(file);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  canvas.getContext("2d")!.drawImage(img, 0, 0);
  return [canvas];
}

function BmpTiffConverter() {
  const { isPro } = usePlan();
  const trial = useToolTrial("bmp-tiff-converter", isPro);
  const seo = getToolSeo("bmp-tiff-converter");

  const [items, setItems] = useState<Item[]>([]);
  const [outputId, setOutputId] = useState<OutputId>("jpeg");
  const [quality, setQuality] = useState(90);
  const [fill, setFill] = useState("#ffffff");
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((files: FileList | File[]) => {
    const list = Array.from(files);
    const picked = list.filter(
      (f) => f.type === "image/bmp" || /\.bmp$/i.test(f.name) || f.type === "image/tiff" || /\.tif{1,2}$/i.test(f.name),
    );
    if (picked.length === 0) {
      setError("Please choose BMP or TIFF files.");
      return;
    }
    setItems((p) => [...p, ...picked.map((f) => ({ id: nextId++, file: f, name: f.name, size: f.size, status: "ready" as const }))]);
    setError(null);
  }, []);

  const removeItem = (id: number) => setItems((p) => p.filter((i) => i.id !== id));

  const convert = useCallback(async () => {
    if (items.length === 0 || busy || !trial.canUse) return;
    setBusy(true);
    setError(null);
    try {
      const out = OUTPUTS.find((o) => o.id === outputId)!;
      const outputs: { blob: Blob; name: string }[] = [];
      for (const item of items) {
        try {
          const pages = await decodeToPages(item.file);
          for (const [idx, src] of pages.entries()) {
            const canvas = document.createElement("canvas");
            canvas.width = src.width;
            canvas.height = src.height;
            canvas.getContext("2d")!.drawImage(src, 0, 0);
            if (outputId === "jpeg") fillBackground(canvas, fill);
            const b = await canvasToBlob(canvas, out.mime, outputId === "png" ? undefined : quality / 100);
            const suffix = pages.length > 1 ? `-p${idx + 1}` : "";
            outputs.push({ blob: b, name: `${baseName(item.name)}${suffix}.${out.ext}` });
          }
          setItems((p) => p.map((i) => (i.id === item.id ? { ...i, status: "done" } : i)));
        } catch {
          setItems((p) => p.map((i) => (i.id === item.id ? { ...i, status: "error" } : i)));
        }
      }
      if (outputs.length === 0) throw new Error("Could not convert those files. Try different ones.");
      if (outputs.length === 1) {
        downloadBlob(outputs[0]!.blob, outputs[0]!.name);
      } else {
        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();
        for (const o of outputs) zip.file(o.name, o.blob);
        const zipped = await zip.generateAsync({ type: "blob" });
        downloadBlob(zipped, "bmp-tiff-converted.zip");
      }
      trial.recordUse();
      toast.success(outputs.length === 1 ? "Image downloaded" : `${outputs.length} images downloaded as ZIP`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Conversion failed.");
    } finally {
      setBusy(false);
    }
  }, [items, busy, trial, outputId, quality, fill]);

  return (
    <ToolPageShell toolId="bmp-tiff-converter" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="BMP and TIFF Converter" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition",
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
            )}
          >
            <FileUp className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold">{items.length > 0 ? `${items.length} file${items.length > 1 ? "s" : ""} added` : "Drop BMP or TIFF files"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Multi-page TIFFs become one image per page</p>
            <input ref={inputRef} type="file" accept="image/bmp,.bmp,image/tiff,.tif,.tiff" multiple className="hidden" onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} />
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Convert to</p>
            <div className="grid grid-cols-3 gap-2">
              {OUTPUTS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setOutputId(o.id)}
                  className={cn(
                    "rounded-xl border px-2 py-2.5 text-sm font-bold transition",
                    outputId === o.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {outputId !== "png" && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="bmp-tiff-q" className="text-[13px] font-medium text-foreground/80">Quality</label>
                <span className="text-sm font-bold text-primary">{quality}%</span>
              </div>
              <input
                id="bmp-tiff-q"
                type="range"
                min={10}
                max={100}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">90% keeps photos sharp while trimming the file size.</p>
            </div>
          )}

          {outputId === "jpeg" && (
            <div>
              <label htmlFor="bmp-tiff-fill" className="mb-2 block text-[13px] font-medium text-foreground/80">Fill transparent areas with</label>
              <div className="flex items-center gap-3">
                <input
                  id="bmp-tiff-fill"
                  type="color"
                  value={fill}
                  onChange={(e) => setFill(e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded-lg border border-border bg-transparent"
                />
                <span className="text-sm font-mono text-muted-foreground">{fill}</span>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">JPG cannot store transparency, so see-through areas become this color.</p>
            </div>
          )}

          <ActionButton busy={busy} disabled={items.length === 0 || !trial.canUse} onClick={convert}>
            <Download className="h-4 w-4" /> {busy ? "Converting…" : `Convert ${items.length > 0 ? `(${items.length})` : ""}`}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free conversions left - files never leave your device.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {items.length === 0 ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <FileImage className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your BMP and TIFF files appear here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Everything runs in your browser. Your files never leave this device.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5">
                  <PackageOpen className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(item.size)}
                      {item.status === "done" && <span className="ml-2 font-semibold text-green-500">Converted</span>}
                      {item.status === "error" && <span className="ml-2 font-semibold text-red-500">Failed</span>}
                    </p>
                  </div>
                  <button type="button" onClick={() => removeItem(item.id)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`Remove ${item.name}`}>
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
