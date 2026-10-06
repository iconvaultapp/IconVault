// /tools/gif-to-mp4 - Convert an animated GIF to a video file using
// canvas.captureStream + MediaRecorder, 100% in your browser.

import { useCallback, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileUp, Video } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/gif-to-mp4";
import toolSeoMeta from "@/lib/tool-seo-meta-data/gif-to-mp4";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import { baseName, formatBytes } from "@/lib/image-tools";

export const Route = createFileRoute("/tools_/gif-to-mp4")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/gif-to-mp4";
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
  component: GifToMp4Tool,
});

function GifToMp4Tool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("gif-to-mp4", isPro);
  const seo = toolSeo;

  const [fileName, setFileName] = useState("");
  const [gifUrl, setGifUrl] = useState("");
  const [bg, setBg] = useState("#ffffff");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoSize, setVideoSize] = useState(0);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const sourceRef = useRef<File | null>(null);
  const builtRef = useRef<{ blob: Blob; ext: string } | null>(null);

  // Honest format detection: Safari records MP4, Chrome and Firefox record WebM.
  const mp4Supported = typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("video/mp4");
  const mime = mp4Supported ? "video/mp4" : "video/webm";
  const ext = mp4Supported ? "mp4" : "webm";

  const acceptFile = useCallback((f: File) => {
    if (f.type !== "image/gif" && !/\.gif$/i.test(f.name)) {
      setError("Please choose a GIF file.");
      return;
    }
    setError(null);
    setFileName(f.name);
    setVideoUrl("");
    builtRef.current = null;
    sourceRef.current = f;
    setGifUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(f);
    });
  }, []);

  const convert = useCallback(async () => {
    const src = sourceRef.current;
    if (!src || busy || !trial.canUse) return;
    if (typeof MediaRecorder === "undefined" || !("captureStream" in HTMLCanvasElement.prototype)) {
      setError("Your browser cannot record video. Try the latest Chrome, Edge or Safari.");
      return;
    }
    setBusy(true);
    setError(null);
    setProgress("Reading frames…");
    try {
      const { parseGIF, decompressFrames } = await import("gifuct-js");
      const decoded = decompressFrames(parseGIF(await src.arrayBuffer()), true);
      if (decoded.length === 0) throw new Error("No frames found in that GIF.");
      const w = decoded[0]!.dims.width;
      const h = decoded[0]!.dims.height;

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;

      const stream = canvas.captureStream(30);
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };
      const stopped = new Promise<void>((resolve) => {
        rec.onstop = () => resolve();
      });

      rec.start();
      // Play the animation in real time on the canvas while recording.
      for (let i = 0; i < decoded.length; i++) {
        const fr: any = decoded[i];
        setProgress(`Recording frame ${i + 1} of ${decoded.length}…`);
        ctx.fillStyle = bg; // videos have no transparency
        ctx.fillRect(0, 0, w, h);
        ctx.putImageData(new ImageData(fr.patch, fr.dims.width, fr.dims.height), 0, 0);
        await new Promise((r) => setTimeout(r, Math.max(10, fr.delay ?? 100)));
      }
      rec.stop();
      await stopped;

      const blob = new Blob(chunks, { type: mime });
      if (blob.size === 0) throw new Error("The recording came out empty. Try again.");
      builtRef.current = { blob, ext };
      setVideoSize(blob.size);
      setVideoUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(blob);
      });
      trial.recordUse();
      toast.success("Video ready, preview it on the right");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Conversion failed.");
    } finally {
      setBusy(false);
      setProgress("");
    }
  }, [busy, trial, bg, mime, ext]);

  const downloadVideo = () => {
    const built = builtRef.current;
    if (!built) return;
    downloadBlob(built.blob, `${baseName(fileName) || "animation"}.${built.ext}`);
    toast.success("Video downloaded");
  };

  return (
    <ToolPageShell toolId="gif-to-mp4" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="GIF to MP4" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) acceptFile(f); }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition",
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
            )}
          >
            <FileUp className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold">{fileName || "Drop a GIF here"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Animated GIFs only</p>
            <input
              ref={inputRef}
              type="file"
              accept="image/gif"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) acceptFile(f); e.target.value = ""; }}
            />
          </div>

          <div className="rounded-xl bg-muted/60 p-4 text-xs leading-relaxed text-muted-foreground">
            <p className="font-semibold text-foreground">
              Output format: {mp4Supported ? "MP4" : "WebM"} (.{ext})
            </p>
            <p className="mt-1">
              {mp4Supported
                ? "Your browser records real MP4 video, which plays everywhere."
                : "Your browser records WebM (Chrome does not support MP4 recording). WebM plays in all modern browsers."}
            </p>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Background color</p>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={bg}
                onChange={(e) => setBg(e.target.value)}
                className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent p-0.5"
                aria-label="Background color"
              />
              <span className="font-mono text-xs uppercase text-muted-foreground">{bg}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Videos have no transparency. Clear areas get this color.
            </p>
          </div>

          <ActionButton busy={busy} disabled={!sourceRef.current || !trial.canUse} onClick={convert}>
            <Video className="h-4 w-4" /> {busy ? "Converting…" : "Convert to video"}
          </ActionButton>
          {progress && <p className="text-xs font-medium text-primary">{progress}</p>}
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free conversions left, files never leave your device.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {!videoUrl ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <Video className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Video preview appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Drop a GIF and hit Convert to video. The animation is replayed onto a canvas and
                recorded as {mp4Supported ? "an MP4" : "a WebM"} in your browser.
              </p>
            </div>
          ) : (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-4">
              <video src={videoUrl} controls loop playsInline className="max-h-[52vh] max-w-full rounded-lg" />
              <p className="text-xs text-muted-foreground">
                .{ext} video, {formatBytes(videoSize)}
              </p>
              <button
                type="button"
                onClick={downloadVideo}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90"
              >
                <Download className="h-4 w-4" /> Download .{ext}
              </button>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
