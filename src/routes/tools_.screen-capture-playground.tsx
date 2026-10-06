// /tools/screen-capture-playground - Real getDisplayMedia screen capture: pick a
// surface, watch the live preview, inspect track settings, and download snapshots
// as PNG. Includes trackended handling and a graceful unsupported fallback.

import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { MonitorUp, Square, Camera, Info, Download } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/screen-capture-playground";
import toolSeoMeta from "@/lib/tool-seo-meta-data/screen-capture-playground";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/screen-capture-playground")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/screen-capture-playground";
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
  component: ScreenCapturePlayground,
});

const SURFACES = [
  { key: "default", label: "Let me choose" },
  { key: "monitor", label: "Prefer monitor" },
  { key: "window", label: "Prefer window" },
  { key: "browser", label: "Prefer tab" },
] as const;

interface TrackInfo {
  label: string;
  displaySurface: string;
  logicalSurface: string;
  frameRate: string;
  size: string;
  cursor: string;
}

function ScreenCapturePlayground() {
  const { isPro } = usePlan();
  const trial = useToolTrial("screen-capture-playground", isPro);
  const seo = toolSeo;

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [supported, setSupported] = useState<boolean | null>(null);
  const [sharing, setSharing] = useState(false);
  const [surface, setSurface] = useState<(typeof SURFACES)[number]["key"]>("default");
  const [withAudio, setWithAudio] = useState(false);
  const [info, setInfo] = useState<TrackInfo | null>(null);
  const [snapUrl, setSnapUrl] = useState("");

  useEffect(() => {
    setSupported(typeof navigator !== "undefined" && !!navigator.mediaDevices && "getDisplayMedia" in navigator.mediaDevices);
    return () => stopStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setSharing(false);
    setInfo(null);
  };

  const startCapture = async () => {
    if (!trial.canUse || sharing) return;
    if (!supported) {
      toast.error("getDisplayMedia is not available in this browser");
      return;
    }
    try {
      const constraints: MediaStreamConstraints & { video: MediaTrackConstraints & { displaySurface?: string } } = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        video: { displaySurface: surface === "default" ? undefined : surface } as any,
        audio: withAudio,
      };
      const stream = await navigator.mediaDevices.getDisplayMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => { /* noop */ });
      }
      const track = stream.getVideoTracks()[0];
      if (!track) {
        toast.error("No video track in the capture stream");
        return;
      }
      const s = track.getSettings() as MediaTrackSettings & { logicalSurface?: unknown; cursor?: unknown };
      setInfo({
        label: track.label || "Screen",
        displaySurface: String(s.displaySurface ?? "unknown"),
        logicalSurface: String(s.logicalSurface ?? "unknown"),
        frameRate: s.frameRate ? `${s.frameRate} fps` : "unknown",
        size: s.width && s.height ? `${s.width}x${s.height}` : "unknown",
        cursor: String(s.cursor ?? "unknown"),
      });
      track.addEventListener("ended", () => {
        toast.info("Capture ended (you pressed Stop sharing)");
        stopStream();
      });
      setSharing(true);
      trial.recordUse();
      toast.success("Screen sharing - pick the stop control when done");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Capture failed";
      if (msg.includes("NotAllowedError") || msg.includes("Permission")) toast.info("You cancelled the share picker");
      else toast.error(msg);
    }
  };

  const snapshot = () => {
    const video = videoRef.current;
    if (!video || !sharing || video.videoWidth === 0) {
      toast.error("Start sharing before taking a snapshot");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) { toast.error("Could not encode snapshot"); return; }
      setSnapUrl(URL.createObjectURL(blob));
      toast.success("Snapshot captured");
    }, "image/png");
  };

  const downloadSnapshot = () => {
    if (!snapUrl) return;
    fetch(snapUrl)
      .then((r) => r.blob())
      .then((b) => { downloadBlob(b, "screen-capture.png"); toast.success("Snapshot downloaded"); });
  };

  return (
    <ToolPageShell toolId="screen-capture-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Screen Capture" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-[13px]">
            <span className="text-muted-foreground">getDisplayMedia</span>
            <span className={cn("font-bold", supported ? "text-green-600" : "text-red-500")}>
              {supported === null ? "Checking…" : supported ? "Supported" : "Not supported"}
            </span>
          </div>

          <div>
            <p className="mb-2 text-sm font-bold">Surface preference</p>
            <div className="grid grid-cols-2 gap-2">
              {SURFACES.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSurface(s.key)}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-xs font-semibold transition",
                    surface === s.key ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">A hint only - the user still picks the final surface in the picker.</p>
          </div>

          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-border px-4 py-3 text-sm font-semibold">
            Share system audio too
            <input type="checkbox" checked={withAudio} onChange={(e) => setWithAudio(e.target.checked)} className="h-4 w-4 accent-primary" />
          </label>

          <div className="flex flex-wrap gap-2">
            {!sharing ? (
              <ActionButton busy={false} disabled={!trial.canUse} onClick={startCapture}>
                <MonitorUp className="h-4 w-4" /> Share screen
              </ActionButton>
            ) : (
              <>
                <button type="button" onClick={snapshot} className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90">
                  <Camera className="h-4 w-4" /> Snapshot
                </button>
                <button type="button" onClick={stopStream} className="inline-flex items-center gap-2 rounded-xl border border-red-500/50 px-4 py-3 text-sm font-bold text-red-500 transition hover:bg-red-500/10">
                  <Square className="h-4 w-4" /> Stop
                </button>
              </>
            )}
          </div>

          {info && (
            <div className="space-y-1.5 text-[13px]">
              <p className="text-sm font-bold">Track settings (real)</p>
              {[
                ["Label", info.label],
                ["displaySurface", info.displaySurface],
                ["logicalSurface", info.logicalSurface],
                ["Resolution", info.size],
                ["Frame rate", info.frameRate],
                ["Cursor", info.cursor],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                  <span className="font-mono text-muted-foreground">{k}</span>
                  <span className="font-bold">{v}</span>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-muted-foreground">
            <p className="flex items-start gap-1.5">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Your screen never leaves this device: capture runs in the browser tab, snapshots are local PNGs.
              getDisplayMedia requires HTTPS (or localhost) and a user click, which the Share button provides.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 text-sm font-bold">Live preview</p>
            <div className="relative min-h-[300px] overflow-hidden rounded-xl bg-black">
              <video ref={videoRef} className="max-h-[480px] w-full" playsInline muted />
              {!sharing && (
                <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm font-semibold text-white/40">
                  Press "Share screen" - your browser will ask which surface to share
                </p>
              )}
            </div>
          </div>
          {snapUrl && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-bold">Last snapshot</p>
                <button type="button" onClick={downloadSnapshot} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:border-primary/40">
                  <Download className="h-3.5 w-3.5" /> Download PNG
                </button>
              </div>
              <img src={snapUrl} alt="Screen snapshot" className="max-h-72 w-full rounded-xl border border-border object-contain" />
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
