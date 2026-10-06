// /tools/remove-metadata - Strip EXIF, GPS and all metadata from photos by
// re-saving their pixels in your browser. Nothing is uploaded.

import { useCallback, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, Eraser, FileUp, Files } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/remove-metadata";
import toolSeoMeta from "@/lib/tool-seo-meta-data/remove-metadata";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import { formatBytes, baseName, extForMime, fillBackground } from "@/lib/image-tools";

export const Route = createFileRoute("/tools_/remove-metadata")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/remove-metadata";
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
  component: RemoveMetadataTool,
});

interface Done {
  id: string;
  name: string;
  size: number;
  blob: Blob;
  url: string;
}

async function stripOne(file: File, keepRotation: boolean, keepColor: boolean): Promise<Blob> {
  // Decode with EXIF orientation applied (when requested) so the saved
  // pixels are upright, then re-encode. Re-encoding drops every EXIF/GPS
  // tag, because canvas output carries no metadata at all.
  const bmp = await createImageBitmap(file, {
    imageOrientation: keepRotation ? "from-image" : "none",
    colorSpaceConversion: keepColor ? "default" : "none",
  } as ImageBitmapOptions);
  const canvas = document.createElement("canvas");
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bmp, 0, 0);
  bmp.close();
  const mime = ["image/jpeg", "image/png", "image/webp"].includes(file.type) ? file.type : "image/png";
  if (mime === "image/jpeg") fillBackground(canvas, "#ffffff");
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error(`Could not re-save ${file.name}`))),
      mime,
      0.92,
    );
  });
}

function RemoveMetadataTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("remove-metadata", isPro);
  const seo = toolSeo;

  const [files, setFiles] = useState<File[]>([]);
  const [done, setDone] = useState<Done[]>([]);
  const [keepRotation, setKeepRotation] = useState(true);
  const [keepColor, setKeepColor] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((list: FileList | File[]) => {
    const imgs = [...list].filter((f) => f.type.startsWith("image/"));
    if (imgs.length === 0) {
      setError("Please choose image files.");
      return;
    }
    setError(null);
    setFiles((p) => [...p, ...imgs]);
  }, []);

  const strip = useCallback(async () => {
    if (files.length === 0 || busy || !trial.canUse) return;
    setBusy(true);
    setError(null);
    try {
      const out: Done[] = [];
      for (const f of files) {
        const blob = await stripOne(f, keepRotation, keepColor);
        const mime = blob.type || "image/png";
        out.push({
          id: `${f.name}-${f.size}-${out.length}`,
          name: `${baseName(f.name)}-clean.${extForMime(mime)}`,
          size: blob.size,
          blob,
          url: URL.createObjectURL(blob),
        });
      }
      setDone(out);
      trial.recordUse();
      toast.success(`Stripped metadata from ${out.length} photo${out.length > 1 ? "s" : ""}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Stripping failed.");
    } finally {
      setBusy(false);
    }
  }, [files, busy, trial, keepRotation, keepColor]);

  const downloadAll = useCallback(async () => {
    if (done.length === 0) return;
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    for (const d of done) zip.file(d.name, d.blob);
    const blob = await zip.generateAsync({ type: "blob" });
    downloadBlob(blob, "clean-photos.zip");
    toast.success("ZIP downloaded");
  }, [done]);

  return (
    <ToolPageShell toolId="remove-metadata" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Remove Metadata" left={trial.left} />

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
            <p className="text-sm font-semibold">
              {files.length > 0 ? `${files.length} photo${files.length > 1 ? "s" : ""} selected` : "Drop photos here"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Add as many as you like</p>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
            />
          </div>

          <div className="space-y-3">
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={keepRotation}
                onChange={(e) => setKeepRotation(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-primary"
              />
              <span>
                <span className="font-semibold">Keep rotation</span>
                <span className="block text-xs text-muted-foreground">
                  Applies the photo's EXIF rotation to the pixels so it stays upright.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={keepColor}
                onChange={(e) => setKeepColor(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-primary"
              />
              <span>
                <span className="font-semibold">Keep color profile</span>
                <span className="block text-xs text-muted-foreground">
                  Colors are converted to web-standard sRGB so they look the same everywhere.
                </span>
              </span>
            </label>
          </div>

          <div className="rounded-xl bg-muted/60 p-4 text-xs leading-relaxed text-muted-foreground">
            Pixels are re-saved, all EXIF and GPS data stripped. Your photos never leave this device.
          </div>

          <ActionButton busy={busy} disabled={files.length === 0 || !trial.canUse} onClick={strip}>
            <Eraser className="h-4 w-4" /> {busy ? "Stripping…" : "Remove metadata"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free runs left, files never leave your device.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {done.length === 0 ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <Files className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Cleaned photos appear here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Each photo is re-encoded without any metadata, then offered back as an individual
                download or one ZIP.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-bold">
                  {done.length} clean photo{done.length > 1 ? "s" : ""}, metadata removed
                </p>
                {done.length > 1 && (
                  <button
                    type="button"
                    onClick={downloadAll}
                    className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-bold hover:border-primary/40"
                  >
                    <Download className="h-4 w-4" /> Download all (.zip)
                  </button>
                )}
              </div>
              <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                {done.map((d) => (
                  <li key={d.id} className="flex items-center gap-4 px-4 py-3">
                    <img src={d.url} alt={d.name} className="h-12 w-12 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{d.name}</p>
                      <p className="text-xs text-muted-foreground">{formatBytes(d.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => downloadBlob(d.blob, d.name)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-xs font-bold text-primary hover:bg-primary/20"
                    >
                      <Download className="h-3.5 w-3.5" /> Save
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => { setFiles([]); setDone([]); }}
                className="text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                Start over with new photos
              </button>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
