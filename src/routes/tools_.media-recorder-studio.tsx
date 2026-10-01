// /tools/media-recorder-studio - Real MediaRecorder lab: camera, screen and mic
// recording with codec selection, live preview, playback and download.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Circle, Download, MonitorUp, Mic, Square, Trash2, Video as VideoIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/media-recorder-studio")({
  head: () => {
    const seo = getToolSeoMeta("media-recorder-studio");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: RecorderTool,
});

const SOURCES = [
  { id: "camera", label: "Camera + mic", icon: VideoIcon },
  { id: "screen", label: "Screen + mic", icon: MonitorUp },
  { id: "audio", label: "Mic only", icon: Mic },
] as const;

const MIME_CANDIDATES = [
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
  "video/mp4",
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
];

function extFor(mime: string) {
  if (mime.startsWith("video/mp4") || mime.startsWith("audio/mp4")) return "mp4";
  if (mime.startsWith("audio/")) return "webm";
  return "webm";
}

function RecorderTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("media-recorder-studio", isPro);
  const seo = getToolSeo("media-recorder-studio");

  const [supported] = useState(() => typeof window !== "undefined" && "MediaRecorder" in window);
  const [source, setSource] = useState<(typeof SOURCES)[number]["id"]>("camera");
  const [supportedMimes, setSupportedMimes] = useState<string[]>([]);
  const [mime, setMime] = useState("");
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [clipUrl, setClipUrl] = useState("");
  const [clipMime, setClipMime] = useState("");
  const [clipBytes, setClipBytes] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const liveRef = useRef<HTMLVideoElement>(null);
  const playRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!supported) return;
    const ok = MIME_CANDIDATES.filter((m) => {
      try { return MediaRecorder.isTypeSupported(m); } catch { return false; }
    });
    setSupportedMimes(ok);
    setMime((prev) => (ok.includes(prev) ? prev : ok[0] ?? ""));
  }, [supported]);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (liveRef.current) liveRef.current.srcObject = null;
  }, []);

  useEffect(() => () => {
    if (recorderRef.current?.state !== "inactive") recorderRef.current?.stop();
    stopStream();
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (clipUrl) URL.revokeObjectURL(clipUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecording = useCallback(async () => {
    if (!supported || recording) return;
    if (!trial.canUse) { toast.error("Free trial exhausted - go Pro for unlimited runs"); return; }
    try {
      let stream: MediaStream;
      if (source === "camera") {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } else if (source === "screen") {
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
      }
      streamRef.current = stream;
      if (liveRef.current && source !== "audio") {
        liveRef.current.srcObject = stream;
        await liveRef.current.play().catch(() => undefined);
      }

      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType });
        if (clipUrl) URL.revokeObjectURL(clipUrl);
        const url = URL.createObjectURL(blob);
        setClipUrl(url);
        setClipMime(rec.mimeType);
        setClipBytes(blob.size);
        stopStream();
        if (playRef.current) playRef.current.src = url;
        if (audioRef.current) audioRef.current.src = url;
        toast.success("Recording saved", { description: `${(blob.size / 1024).toFixed(0)} KB - play it back or download below` });
      };
      rec.start(250);
      recorderRef.current = rec;
      setRecording(true);
      setElapsed(0);
      timerRef.current = window.setInterval(() => setElapsed((s) => s + 1), 1000);
      trial.recordUse();
      toast.success("Recording", { description: "MediaRecorder is capturing - press Stop when done" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not start capture";
      toast.error("Capture failed", { description: msg });
    }
  }, [supported, recording, trial, source, mime, stopStream, clipUrl]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
    recorderRef.current?.stop();
    setRecording(false);
  }, []);

  const download = useCallback(() => {
    if (!clipUrl) return;
    fetch(clipUrl)
      .then((r) => r.blob())
      .then((b) => downloadBlob(b, `recording.${extFor(clipMime)}`))
      .catch(() => toast.error("Download failed"));
  }, [clipUrl, clipMime]);

  const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <ToolPageShell toolId="media-recorder-studio" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="MediaRecorder Studio" left={trial.left} />

      {!supported && (
        <div className="mb-4 rounded-xl border border-amber-400/40 bg-amber-50 p-4 text-sm dark:bg-amber-950/30">
          <strong>MediaRecorder is not available here.</strong> Use a modern desktop or mobile browser over HTTPS.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Source</p>
            <div className="grid grid-cols-3 gap-2">
              {SOURCES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSource(s.id)}
                  disabled={recording}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-xs font-bold transition",
                    source === s.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  <s.icon className="h-5 w-5" /> {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[13px] font-medium text-foreground/80">Codec / container</label>
            <select
              value={mime}
              onChange={(e) => setMime(e.target.value)}
              disabled={recording}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-xs outline-none focus:border-primary/60"
            >
              {supportedMimes.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              Only codecs your browser reports as supported are listed. Chrome cannot produce MP4 from MediaRecorder (it records WebM); Safari can record MP4. The download name matches the real container.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {!recording ? (
              <ActionButton disabled={!supported || !trial.canUse} onClick={() => void startRecording()}>
                <Circle className="h-4 w-4 fill-current" /> Record
              </ActionButton>
            ) : (
              <ActionButton onClick={stopRecording}>
                <Square className="h-4 w-4" /> Stop ({fmtTime(elapsed)})
              </ActionButton>
            )}
            {clipUrl && (
              <button
                type="button"
                onClick={download}
                className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-bold hover:border-primary/50"
              >
                <Download className="h-4 w-4" /> Download .{extFor(clipMime)}
              </button>
            )}
          </div>

          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free recordings left - media never leaves your device.
            </p>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold">Live preview</h3>
              {recording && <span className="flex items-center gap-1.5 rounded-full bg-red-500/15 px-3 py-1 text-xs font-bold text-red-500"><Circle className="h-2.5 w-2.5 fill-current animate-pulse" /> REC {fmtTime(elapsed)}</span>}
            </div>
            {source === "audio" ? (
              <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-xl bg-muted text-muted-foreground">
                <Mic className="h-8 w-8" />
                <p className="text-sm">Mic-only recording - no video preview</p>
              </div>
            ) : (
              <video ref={liveRef} muted playsInline className="h-48 w-full rounded-xl bg-black object-contain" />
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold">Playback</h3>
              {clipUrl && <span className="font-mono text-xs text-muted-foreground">{clipMime} - {(clipBytes / 1024).toFixed(0)} KB</span>}
            </div>
            {clipUrl ? (
              source === "audio" ? (
                <audio ref={audioRef} controls className="w-full" />
              ) : (
                <video ref={playRef} controls playsInline className="h-56 w-full rounded-xl bg-black object-contain" />
              )
            ) : (
              <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl bg-muted text-sm text-muted-foreground">
                <VideoIcon className="h-8 w-8 opacity-50" />
                Your finished clip appears here with playback and download.
              </div>
            )}
            {clipUrl && (
              <button
                type="button"
                onClick={() => { if (clipUrl) URL.revokeObjectURL(clipUrl); setClipUrl(""); }}
                className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                <Trash2 className="h-3.5 w-3.5" /> Discard clip
              </button>
            )}
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}

export default RecorderTool;
