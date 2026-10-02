// /tools/video-to-gif - Convert a video clip to an animated GIF with frame
// rate, width, palette and trim controls. 100% in your browser, nothing uploaded.

import { useCallback, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileUp, Video } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import { baseName, formatBytes } from "@/lib/image-tools";

export const Route = createFileRoute("/tools_/video-to-gif")({
  head: () => {
    const seo = getToolSeoMeta("video-to-gif");
    const canonical = "https://iconvault.site/tools/video-to-gif";
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
  component: VideoToGifTool,
});

const MAX_FRAMES = 300;

function seekTo(video: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const to = window.setTimeout(() => reject(new Error("Seeking timed out. Try a shorter clip.")), 8000);
    video.onseeked = () => {
      window.clearTimeout(to);
      resolve();
    };
    video.currentTime = Math.min(t, (video.duration || t) - 0.05);
  });
}

function VideoToGifTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("video-to-gif", isPro);
  const seo = getToolSeo("video-to-gif");

  const [videoUrl, setVideoUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [duration, setDuration] = useState(0);
  const [fps, setFps] = useState(10);
  const [width, setWidth] = useState(480);
  const [colors, setColors] = useState(256);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [gifUrl, setGifUrl] = useState("");
  const [gifSize, setGifSize] = useState(0);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const builtRef = useRef<Uint8Array | null>(null);

  const clipLen = Math.max(0, end - start);
  const frameCount = Math.floor(clipLen * fps);

  const acceptFile = useCallback((f: File) => {
    if (!f.type.startsWith("video/")) {
      setError("Please choose a video file (MP4, WebM, MOV).");
      return;
    }
    setError(null);
    setFileName(f.name);
    setGifUrl("");
    builtRef.current = null;
    setVideoUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(f);
    });
  }, []);

  const onLoaded = () => {
    const v = videoRef.current;
    if (!v) return;
    setDuration(v.duration || 0);
    setStart(0);
    setEnd(v.duration || 0);
  };

  const makeGif = useCallback(async () => {
    const video = videoRef.current;
    if (!video || busy || !trial.canUse) return;
    const s = Math.max(0, start);
    const e = Math.min(duration || 0, end);
    if (!(e > s)) {
      setError("End time must be after start time.");
      return;
    }
    if ((e - s) * fps > MAX_FRAMES) {
      setError(`That clip would need more than ${MAX_FRAMES} frames. Shorten the trim or lower the frame rate.`);
      return;
    }
    setBusy(true);
    setError(null);
    setProgress("Loading video…");
    try {
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const w = Math.max(16, Math.min(1200, Math.round(width)));
      const h = Math.max(16, Math.round((w * vh) / vw));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      const { GIFEncoder, quantize, applyPalette } = await import("gifenc");
      const gif = GIFEncoder();
      const delay = Math.round(1000 / fps);
      const n = Math.floor((e - s) * fps);
      for (let i = 0; i < n; i++) {
        setProgress(`Capturing frame ${i + 1} of ${n}…`);
        await seekTo(video, s + i / fps);
        ctx.drawImage(video, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h);
        const rgba = new Uint8Array(data.data.buffer.slice(0));
        const palette = quantize(rgba, colors);
        const index = applyPalette(rgba, palette);
        gif.writeFrame(index, w, h, { palette, delay, repeat: 0 });
        // Let the UI breathe between frames.
        await new Promise((r) => setTimeout(r, 0));
      }
      gif.finish();
      const bytes = gif.bytes();
      builtRef.current = bytes;
      const blob = new Blob([bytes as unknown as BlobPart], { type: "image/gif" });
      setGifSize(blob.size);
      setGifUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(blob);
      });
      trial.recordUse();
      toast.success("GIF ready, preview it on the right");
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Could not convert the video.");
    } finally {
      setBusy(false);
      setProgress("");
    }
  }, [busy, trial, start, end, duration, fps, width, colors]);

  const downloadGif = () => {
    const bytes = builtRef.current;
    if (!bytes) return;
    downloadBlob(new Blob([bytes as unknown as BlobPart], { type: "image/gif" }), `${baseName(fileName) || "clip"}.gif`);
    toast.success("GIF downloaded");
  };

  return (
    <ToolPageShell toolId="video-to-gif" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Video to GIF" left={trial.left} />

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
            <p className="text-sm font-semibold">{fileName || "Drop a video here"}</p>
            <p className="mt-1 text-xs text-muted-foreground">MP4, WebM or MOV</p>
            <input
              ref={inputRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime,video/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) acceptFile(f); e.target.value = ""; }}
            />
          </div>
          <video ref={videoRef} src={videoUrl || undefined} muted playsInline preload="auto" onLoadedMetadata={onLoaded} className="hidden" />

          {videoUrl && duration > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[13px] font-medium text-foreground/80" htmlFor="trim-start">Trim start (s)</label>
                <input
                  id="trim-start"
                  type="number"
                  min={0}
                  max={duration}
                  step={0.1}
                  value={start}
                  onChange={(e) => setStart(Number(e.target.value))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-[13px] font-medium text-foreground/80" htmlFor="trim-end">Trim end (s)</label>
                <input
                  id="trim-end"
                  type="number"
                  min={0}
                  max={duration}
                  step={0.1}
                  value={end}
                  onChange={(e) => setEnd(Number(e.target.value))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <p className="col-span-2 text-xs text-muted-foreground">
                Video length {duration.toFixed(1)}s. Clip: {clipLen.toFixed(1)}s, about {frameCount} frames.
              </p>
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Frame rate</p>
              <span className="text-xs font-bold text-primary">{fps} fps</span>
            </div>
            <input type="range" min={2} max={20} value={fps} onChange={(e) => setFps(Number(e.target.value))} className="w-full accent-primary" />
            <p className="mt-1 text-xs text-muted-foreground">10 fps is the sweet spot for small, smooth GIFs.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[13px] font-medium text-foreground/80" htmlFor="v2g-w">Width (px)</label>
              <input
                id="v2g-w"
                type="number"
                min={16}
                max={1200}
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <p className="mb-1 text-[13px] font-medium text-foreground/80">Colors</p>
              <div className="flex gap-1.5">
                {[256, 128, 64].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColors(c)}
                    className={cn(
                      "flex-1 rounded-lg border px-2 py-2 text-xs font-bold transition",
                      colors === c ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {frameCount > 150 && (
            <p className="rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              Long clips make heavy GIFs. Trim shorter or lower the frame rate for a shareable file.
            </p>
          )}

          <div className="flex gap-2">
            <div className="flex-1">
              <ActionButton busy={busy} disabled={!videoUrl || !trial.canUse} onClick={makeGif}>
                <Video className="h-4 w-4" /> {busy ? "Converting…" : "Make GIF"}
              </ActionButton>
            </div>
            {gifUrl && (
              <button
                type="button"
                onClick={downloadGif}
                className="inline-flex items-center gap-2 rounded-xl border-2 border-primary px-5 py-3 text-sm font-bold text-primary transition hover:bg-primary/10"
              >
                <Download className="h-4 w-4" /> .gif
              </button>
            )}
          </div>
          {progress && <p className="text-xs font-medium text-primary">{progress}</p>}
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free conversions left, files never leave your device.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {!gifUrl ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <Video className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Animated preview appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Upload a video, trim the moment you want, pick a frame rate and hit Make GIF.
                Frames are captured one by one in your browser.
              </p>
            </div>
          ) : (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-4">
              <div className="rounded-lg bg-[repeating-conic-gradient(#80808033_0_25%,transparent_0_50%)] bg-[length:20px_20px] p-4">
                <img src={gifUrl} alt="GIF preview" className="max-h-[52vh] max-w-full rounded" />
              </div>
              <p className="text-xs text-muted-foreground">
                {frameCount} frames at {fps} fps, {formatBytes(gifSize)}
              </p>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
