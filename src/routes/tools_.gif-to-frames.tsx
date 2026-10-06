// /tools/gif-to-frames - Split an animated GIF into its individual frames as
// PNG or JPG images. 100% in your browser, nothing uploaded.

import { useCallback, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileUp, Layers } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/gif-to-frames";
import toolSeoMeta from "@/lib/tool-seo-meta-data/gif-to-frames";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import { baseName, fillBackground } from "@/lib/image-tools";

export const Route = createFileRoute("/tools_/gif-to-frames")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/gif-to-frames";
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
  component: GifToFramesTool,
});

interface OutFrame {
  id: string;
  url: string;
  blob: Blob;
  name: string;
  w: number;
  h: number;
}

type Format = "png" | "jpg";

function GifToFramesTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("gif-to-frames", isPro);
  const seo = toolSeo;

  const [fileName, setFileName] = useState("");
  const [format, setFormat] = useState<Format>("png");
  const [outFrames, setOutFrames] = useState<OutFrame[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const split = useCallback(async (f: File) => {
    if (f.type !== "image/gif" && !/\.gif$/i.test(f.name)) {
      setError("Please choose a GIF file.");
      return;
    }
    if (!trial.canUse) return;
    setBusy(true);
    setError(null);
    try {
      const { parseGIF, decompressFrames } = await import("gifuct-js");
      // buildPatch = true gives each frame as the full picture, composited
      // exactly as it appears in the animation.
      const frames = decompressFrames(parseGIF(await f.arrayBuffer()), true);
      if (frames.length === 0) throw new Error("No frames found in that GIF.");
      const mime = format === "png" ? "image/png" : "image/jpeg";
      const encoded = await Promise.all(
        frames.map(async (fr: any, i: number) => {
          const w = fr.dims.width;
          const h = fr.dims.height;
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d")!;
          if (mime === "image/jpeg") fillBackground(canvas, "#ffffff");
          ctx.putImageData(new ImageData(fr.patch, w, h), 0, 0);
          const blob = await canvasToBlobSafe(canvas, mime);
          const idx = String(i + 1).padStart(String(frames.length).length, "0");
          const name = `${baseName(f.name)}-frame-${idx}.${format === "png" ? "png" : "jpg"}`;
          return { id: `frame-${i}`, url: URL.createObjectURL(blob), blob, name, w, h };
        }),
      );
      setOutFrames(encoded);
      setFileName(f.name);
      trial.recordUse();
      toast.success(`Split into ${encoded.length} frames`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not split that GIF.");
    } finally {
      setBusy(false);
    }
  }, [trial, format]);

  const downloadAll = useCallback(async () => {
    if (outFrames.length === 0) return;
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    for (const f of outFrames) zip.file(f.name, f.blob);
    const blob = await zip.generateAsync({ type: "blob" });
    downloadBlob(blob, `${baseName(fileName) || "gif"}-frames.zip`);
    toast.success("ZIP downloaded");
  }, [outFrames, fileName]);

  return (
    <ToolPageShell toolId="gif-to-frames" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="GIF to Frames" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div
            tabIndex={0}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) void split(f); }}
            onPaste={(e) => { const f = e.clipboardData.files[0]; if (f) void split(f); }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition",
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
            )}
          >
            <FileUp className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold">{fileName || "Drop a GIF here"}</p>
            <p className="mt-1 text-xs text-muted-foreground">You can also paste a GIF from your clipboard</p>
            <input
              ref={inputRef}
              type="file"
              accept="image/gif"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void split(f); e.target.value = ""; }}
            />
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Frame format</p>
            <div className="flex gap-2">
              {(["png", "jpg"] as Format[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setFormat(m)}
                  className={cn(
                    "flex-1 rounded-xl border px-3 py-2.5 text-sm font-bold uppercase transition",
                    format === m ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {m === "jpg" ? "JPG" : "PNG"}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-muted/60 p-4 text-xs leading-relaxed text-muted-foreground">
            Each frame is the full picture as it appears in the animation, composited over the
            frames before it, not a cropped patch.
          </div>

          <ActionButton busy={busy} disabled={outFrames.length === 0} onClick={downloadAll}>
            <Download className="h-4 w-4" /> {busy ? "Splitting…" : "Download all (.zip)"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free splits left, files never leave your device.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {outFrames.length === 0 ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <Layers className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Frames appear here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Drop a GIF and every animation frame is extracted as a full-size still you can
                download individually or as one ZIP.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="font-bold">
                {outFrames.length} frames from {fileName}
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {outFrames.map((f, i) => (
                  <div key={f.id} className="overflow-hidden rounded-xl border border-border">
                    <div className="bg-[repeating-conic-gradient(#80808033_0_25%,transparent_0_50%)] bg-[length:16px_16px]">
                      <img src={f.url} alt={`Frame ${i + 1}`} className="aspect-video w-full object-contain" />
                    </div>
                    <div className="flex items-center justify-between gap-2 px-3 py-2">
                      <span className="text-xs font-bold text-muted-foreground">Frame {i + 1}</span>
                      <button
                        type="button"
                        onClick={() => downloadBlob(f.blob, f.name)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                      >
                        <Download className="h-3.5 w-3.5" /> Save
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}

function canvasToBlobSafe(canvas: HTMLCanvasElement, mime: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not encode a frame."))),
      mime,
      0.92,
    );
  });
}
