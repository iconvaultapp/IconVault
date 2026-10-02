// /tools/audio-visualizer - Real-time spectrum and waveform visualizer from an
// audio file or the microphone, using the Web Audio API. PNG snapshot export.
// 100% in-browser, no upload.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Camera, Mic, Music, Square } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/audio-visualizer")({
  head: () => {
    const seo = getToolSeoMeta("audio-visualizer");
    const canonical = "https://iconvault.site/tools/audio-visualizer";
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
  component: AudioVisualizerTool,
});

const MODES = [
  { id: "spectrum", name: "Spectrum bars" },
  { id: "waveform", name: "Waveform" },
  { id: "circular", name: "Circular" },
] as const;
type Mode = (typeof MODES)[number]["id"];

const THEMES = [
  { id: "violet", name: "Violet", from: "#8b5cf6", to: "#22d3ee" },
  { id: "sunset", name: "Sunset", from: "#f59e0b", to: "#ef4444" },
  { id: "ocean", name: "Ocean", from: "#0ea5e9", to: "#34d399" },
  { id: "magenta", name: "Magenta", from: "#ec4899", to: "#8b5cf6" },
  { id: "lime", name: "Lime", from: "#a3e635", to: "#14b8a6" },
  { id: "mono", name: "Mono", from: "#e2e8f0", to: "#64748b" },
] as const;

function AudioVisualizerTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("audio-visualizer", isPro);
  const seo = getToolSeo("audio-visualizer");

  const [source, setSource] = useState<"file" | "mic" | null>(null);
  const [active, setActive] = useState(false);
  const [fileName, setFileName] = useState("");
  const [mode, setMode] = useState<Mode>("spectrum");
  const [themeId, setThemeId] = useState<(typeof THEMES)[number]["id"]>("violet");
  const [smoothing, setSmoothing] = useState(80);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<AudioNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const rafRef = useRef(0);
  const stateRef = useRef({ mode, themeId });
  stateRef.current = { mode, themeId };

  const theme = THEMES.find((t) => t.id === themeId) ?? THEMES[0];

  const stopAll = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    sourceNodeRef.current?.disconnect();
    analyserRef.current?.disconnect();
    sourceNodeRef.current = null;
    analyserRef.current = null;
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.src = "";
      audioElRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    const ctx = ctxRef.current;
    ctxRef.current = null;
    if (ctx) void ctx.close();
    setActive(false);
    setSource(null);
  }, []);

  useEffect(() => stopAll, [stopAll]);

  useEffect(() => {
    if (analyserRef.current) analyserRef.current.smoothingTimeConstant = smoothing / 100;
  }, [smoothing, active]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const g = canvas.getContext("2d");
    if (!g) return;
    const w = canvas.width;
    const h = canvas.height;
    const { mode: m, themeId: tid } = stateRef.current;
    const th = THEMES.find((t) => t.id === tid) ?? THEMES[0];
    const grad = g.createLinearGradient(0, h, 0, 0);
    grad.addColorStop(0, th.from);
    grad.addColorStop(1, th.to);

    const freqData = new Uint8Array(analyser.frequencyBinCount);
    const timeData = new Uint8Array(analyser.fftSize);

    const render = () => {
      rafRef.current = requestAnimationFrame(render);
      g.fillStyle = "#0b0e17";
      g.fillRect(0, 0, w, h);

      if (m === "spectrum") {
        analyser.getByteFrequencyData(freqData);
        const bars = 96;
        const step = Math.floor(freqData.length / bars);
        const bw = w / bars;
        for (let i = 0; i < bars; i++) {
          const v = freqData[i * step] ?? 0;
          const bh = (v / 255) * h * 0.92;
          g.fillStyle = grad;
          const x = i * bw;
          const y = h - bh;
          g.beginPath();
          g.roundRect(x + 1, y, Math.max(1, bw - 3), bh, 3);
          g.fill();
        }
      } else if (m === "waveform") {
        analyser.getByteTimeDomainData(timeData);
        g.strokeStyle = grad;
        g.lineWidth = Math.max(2, w / 480);
        g.beginPath();
        const n = timeData.length;
        for (let i = 0; i < n; i++) {
          const x = (i / (n - 1)) * w;
          const y = ((timeData[i] ?? 128) / 255) * h;
          if (i === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        g.stroke();
      } else {
        analyser.getByteFrequencyData(freqData);
        const cx = w / 2;
        const cy = h / 2;
        const base = Math.min(w, h) * 0.22;
        const bars = 128;
        const step = Math.floor(freqData.length / bars);
        g.strokeStyle = grad;
        g.lineWidth = Math.max(2, (Math.PI * 2 * base) / bars - 2);
        for (let i = 0; i < bars; i++) {
          const v = freqData[i * step] ?? 0;
          const len = (v / 255) * Math.min(w, h) * 0.24;
          const a = (i / bars) * Math.PI * 2;
          const r1 = base + len * 0.15;
          const r2 = base + len;
          g.beginPath();
          g.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
          g.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
          g.stroke();
        }
      }
    };
    render();
  }, []);

  const sizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(320, Math.round(rect.width * dpr));
    canvas.height = Math.round((rect.width * 9) / 16 * dpr);
  }, []);

  const startGraph = useCallback(
    (src: "file" | "mic") => {
      if (!trial.canUse) return false;
      stopAll();
      sizeCanvas();
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) {
        toast.error("Web Audio is not supported in this browser.");
        return false;
      }
      const ctx = new Ctx();
      ctxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = smoothing / 100;
      analyser.connect(ctx.destination);
      analyserRef.current = analyser;
      trial.recordUse();
      setSource(src);
      setActive(true);
      return true;
    },
    [trial, stopAll, sizeCanvas, smoothing],
  );

  const startFile = useCallback(
    async (f: File) => {
      if (!f.type.startsWith("audio/")) {
        toast.error("Please choose an audio file (MP3, WAV, OGG, ...).");
        return;
      }
      if (!startGraph("file")) return;
      const ctx = ctxRef.current;
      const analyser = analyserRef.current;
      if (!ctx || !analyser) return;
      const url = URL.createObjectURL(f);
      objectUrlRef.current = url;
      const el = new Audio();
      el.src = url;
      el.loop = true;
      el.crossOrigin = "anonymous";
      const node = ctx.createMediaElementSource(el);
      node.connect(analyser);
      audioElRef.current = el;
      sourceNodeRef.current = node;
      setFileName(f.name);
      if (ctx.state === "suspended") void ctx.resume();
      try {
        await el.play();
      } catch {
        toast.error("Could not play that file. Try a different audio file.");
        stopAll();
        return;
      }
      draw();
    },
    [startGraph, draw, stopAll],
  );

  const startMic = useCallback(async () => {
    if (!startGraph("mic")) return;
    const ctx = ctxRef.current;
    const analyser = analyserRef.current;
    if (!ctx || !analyser) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const node = ctx.createMediaStreamSource(stream);
      node.connect(analyser);
      sourceNodeRef.current = node;
      if (ctx.state === "suspended") void ctx.resume();
      setFileName("Microphone");
      draw();
      toast.success("Microphone connected - make some noise!");
    } catch {
      toast.error("Microphone access was denied or unavailable.");
      stopAll();
    }
  }, [startGraph, draw, stopAll]);

  const snapshot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active) return;
    trial.recordUse();
    canvas.toBlob((blob) => {
      if (!blob) {
        toast.error("Could not capture the snapshot.");
        return;
      }
      downloadBlob(blob, "audio-visualizer.png");
      toast.success("Snapshot downloaded");
    }, "image/png");
  }, [active, trial]);

  return (
    <ToolPageShell toolId="audio-visualizer" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Audio Visualizer" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Sound source</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border px-3 py-4 text-sm font-bold transition",
                  source === "file" && active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                <Music className="h-5 w-5" /> Audio file
              </button>
              <button
                type="button"
                onClick={() => { if (active) stopAll(); else void startMic(); }}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border px-3 py-4 text-sm font-bold transition",
                  source === "mic" && active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                <Mic className="h-5 w-5" /> {source === "mic" && active ? "Stop mic" : "Microphone"}
              </button>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void startFile(f); e.target.value = ""; }}
            />
            {fileName && active && (
              <p className="mt-2 truncate text-xs text-muted-foreground">Playing: {fileName} (loops)</p>
            )}
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Visual style</p>
            <div className="flex gap-2">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  className={cn(
                    "flex-1 rounded-xl border px-2 py-2.5 text-xs font-bold transition",
                    mode === m.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Color theme</p>
            <div className="grid grid-cols-6 gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  title={t.name}
                  aria-label={t.name}
                  onClick={() => setThemeId(t.id)}
                  className={cn(
                    "h-9 rounded-lg border-2 transition",
                    themeId === t.id ? "border-primary" : "border-transparent hover:border-border",
                  )}
                  style={{ background: `linear-gradient(135deg, ${t.from}, ${t.to})` }}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Motion smoothing</p>
              <p className="font-black text-foreground">{smoothing}%</p>
            </div>
            <input
              type="range"
              min={0}
              max={95}
              value={smoothing}
              onChange={(e) => setSmoothing(Number(e.target.value))}
              className="w-full accent-primary"
              aria-label="Motion smoothing"
            />
          </div>

          <div className="space-y-2">
            <ActionButton busy={false} disabled={!active || !trial.canUse} onClick={snapshot}>
              <Camera className="h-4 w-4" /> Export snapshot PNG
            </ActionButton>
            {active && (
              <button
                type="button"
                onClick={stopAll}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-muted-foreground transition hover:border-primary/40"
              >
                <Square className="h-4 w-4" /> Stop visualizer
              </button>
            )}
          </div>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free uses left - audio never leaves your device.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <canvas
            ref={canvasRef}
            className="aspect-video w-full rounded-xl bg-[#0b0e17]"
            aria-label="Audio visualization canvas"
          />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={cn("h-2.5 w-2.5 rounded-full", active ? "animate-pulse bg-emerald-500" : "bg-muted-foreground/40")} />
              <p className="text-sm font-semibold text-muted-foreground">
                {active ? `Live - ${MODES.find((m) => m.id === mode)?.name} (${theme.name})` : "Pick a source to start visualizing"}
              </p>
            </div>
            {active && (
              <p className="text-xs text-muted-foreground">
                Snapshot captures the canvas at full resolution as PNG.
              </p>
            )}
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
