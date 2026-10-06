// /tools/noise-generator - White, pink and brown noise synthesized live with
// the Web Audio API, plus filters and an auto-stop timer. 100% in-browser.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Play, Square } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/noise-generator";
import toolSeoMeta from "@/lib/tool-seo-meta-data/noise-generator";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/noise-generator")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/noise-generator";
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
  component: NoiseGeneratorTool,
});

const NOISES = [
  { id: "white", name: "White", desc: "Equal energy everywhere - hissing, best for masking sharp sounds" },
  { id: "pink", name: "Pink", desc: "Softer, balanced to human hearing - the classic focus sound" },
  { id: "brown", name: "Brown", desc: "Deep rumble, like rain or a waterfall - great for sleep" },
] as const;
type NoiseId = (typeof NOISES)[number]["id"];

const FILTERS = [
  { id: "none", name: "None" },
  { id: "lowpass", name: "Low-pass" },
  { id: "highpass", name: "High-pass" },
] as const;
type FilterId = (typeof FILTERS)[number]["id"];

const TIMER_PRESETS = [0, 10, 20, 30, 45, 60] as const;
const SLEEP_PRESETS = [
  { name: "Power nap", mins: 20 },
  { name: "Focus session", mins: 90 },
  { name: "Deep sleep", mins: 480 },
];

/** Build a 4-second loopable noise buffer. */
function makeNoiseBuffer(ctx: AudioContext, type: NoiseId): AudioBuffer {
  const seconds = 4;
  const rate = ctx.sampleRate;
  const buf = ctx.createBuffer(1, rate * seconds, rate);
  const data = buf.getChannelData(0);
  if (type === "white") {
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  } else if (type === "pink") {
    // Paul Kellet's refined pink-noise filter
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  } else {
    // Brown noise: leaky integration of white noise
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
  }
  return buf;
}

function formatCountdown(totalSecs: number): string {
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function NoiseGeneratorTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("noise-generator", isPro);
  const seo = toolSeo;

  const [noise, setNoise] = useState<NoiseId>("pink");
  const [filter, setFilter] = useState<FilterId>("none");
  const [cutoff, setCutoff] = useState(1000);
  const [volume, setVolume] = useState(30);
  const [timerMin, setTimerMin] = useState<number>(30);
  const [playing, setPlaying] = useState(false);
  const [remaining, setRemaining] = useState(0);

  const ctxRef = useRef<AudioContext | null>(null);
  const srcRef = useRef<AudioBufferSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const buffersRef = useRef<Partial<Record<NoiseId, AudioBuffer>>>({});
  const playingRef = useRef(false);
  const deadlineRef = useRef(0);
  const tickRef = useRef(0);

  const stop = useCallback((silent = false) => {
    window.clearInterval(tickRef.current);
    playingRef.current = false;
    const ctx = ctxRef.current;
    const src = srcRef.current;
    const gain = gainRef.current;
    if (ctx && src && gain) {
      try {
        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
        const s = src;
        window.setTimeout(() => { try { s.stop(); } catch { /* already stopped */ } s.disconnect(); }, 600);
      } catch { /* teardown best-effort */ }
    } else if (src) {
      try { src.stop(); } catch { /* already stopped */ }
      src.disconnect();
    }
    srcRef.current = null;
    gainRef.current = null;
    filterRef.current = null;
    setPlaying(false);
    setRemaining(0);
    if (!silent) toast("Noise stopped");
  }, []);

  useEffect(() => () => { window.clearInterval(tickRef.current); }, []);

  const applyLive = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx || !playingRef.current) return;
    const t = ctx.currentTime;
    gainRef.current?.gain.setTargetAtTime(volume / 100, t, 0.05);
    const f = filterRef.current;
    if (f) {
      f.type = filter === "lowpass" ? "lowpass" : "highpass";
      f.frequency.setTargetAtTime(cutoff, t, 0.05);
    }
  }, [volume, filter, cutoff]);

  useEffect(() => { applyLive(); }, [applyLive]);

  const play = useCallback(() => {
    if (playing || !trial.canUse) return;
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) {
      toast.error("Web Audio is not supported in this browser.");
      return;
    }
    let ctx = ctxRef.current;
    if (!ctx) {
      ctx = new Ctx();
      ctxRef.current = ctx;
    }
    trial.recordUse();
    if (ctx.state === "suspended") void ctx.resume();

    let buf = buffersRef.current[noise];
    if (!buf) {
      buf = makeNoiseBuffer(ctx, noise);
      buffersRef.current[noise] = buf;
    }

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const filterNode = ctx.createBiquadFilter();
    filterNode.type = filter === "lowpass" ? "lowpass" : "highpass";
    filterNode.frequency.value = cutoff;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    src.connect(filterNode);
    filterNode.connect(gain);
    gain.connect(ctx.destination);
    src.start();
    gain.gain.setTargetAtTime(volume / 100, ctx.currentTime, 0.8);

    srcRef.current = src;
    gainRef.current = gain;
    filterRef.current = filterNode;
    playingRef.current = true;
    setPlaying(true);

    // Timer countdown
    if (timerMin > 0) {
      deadlineRef.current = Date.now() + timerMin * 60_000;
      setRemaining(timerMin * 60);
      window.clearInterval(tickRef.current);
      tickRef.current = window.setInterval(() => {
        const left = Math.max(0, Math.round((deadlineRef.current - Date.now()) / 1000));
        setRemaining(left);
        // Fade out over the last 60 seconds
        const g = gainRef.current;
        const c = ctxRef.current;
        if (g && c && left <= 60 && left > 0) {
          g.gain.setTargetAtTime((volume / 100) * (left / 60), c.currentTime, 0.5);
        }
        if (left <= 0) {
          stop(true);
          toast.success("Timer finished - noise stopped");
        }
      }, 1000);
    }
  }, [playing, trial, noise, filter, cutoff, volume, timerMin, stop]);

  return (
    <ToolPageShell toolId="noise-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Noise Generator" left={trial.left} />

      <div className="mx-auto max-w-xl space-y-6 rounded-2xl border border-border bg-card p-6">
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
            Keep the volume comfortable, especially with headphones on.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Start low and turn it up slowly. Stop if you feel any discomfort.
          </p>
        </div>

        <div>
          <p className="mb-2 text-[13px] font-medium text-foreground/80">Noise type</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {NOISES.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => setNoise(n.id)}
                className={cn(
                  "rounded-xl border p-3 text-left transition",
                  noise === n.id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/40",
                )}
              >
                <p className={cn("text-sm font-black", noise === n.id ? "text-primary" : "text-foreground")}>
                  {n.name}
                </p>
                <p className="mt-1 text-xs leading-snug text-muted-foreground">{n.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Volume</p>
              <p className="font-black text-foreground">{volume}%</p>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-full accent-primary"
              aria-label="Volume"
            />
          </div>
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Filter</p>
            <div className="flex gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    "flex-1 rounded-xl border px-2 py-2 text-xs font-bold transition",
                    filter === f.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filter !== "none" && (
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <p className="text-[13px] font-medium text-foreground/80">
                {filter === "lowpass" ? "Cutoff (removes highs above this)" : "Cutoff (removes lows below this)"}
              </p>
              <p className="font-black text-foreground">{cutoff >= 1000 ? `${(cutoff / 1000).toFixed(1)} kHz` : `${cutoff} Hz`}</p>
            </div>
            <input
              type="range"
              min={100}
              max={12000}
              step={50}
              value={cutoff}
              onChange={(e) => setCutoff(Number(e.target.value))}
              className="w-full accent-primary"
              aria-label="Filter cutoff frequency"
            />
          </div>
        )}

        <div>
          <p className="mb-2 text-[13px] font-medium text-foreground/80">Auto-stop timer</p>
          <div className="flex flex-wrap gap-2">
            {TIMER_PRESETS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setTimerMin(m)}
                className={cn(
                  "rounded-xl border px-4 py-2.5 text-sm font-bold transition",
                  timerMin === m
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                {m === 0 ? "Off" : `${m}m`}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {SLEEP_PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => setTimerMin(p.mins)}
                className={cn(
                  "rounded-xl border border-dashed px-4 py-2 text-xs font-bold transition",
                  timerMin === p.mins
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                {p.name} - {p.mins >= 60 ? `${p.mins / 60}h` : `${p.mins}m`}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Fades out smoothly over the last 60 seconds so it never cuts off abruptly.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3">
          {playing ? (
            <ActionButton busy={false} onClick={() => stop()}>
              <Square className="h-4 w-4" /> Stop
            </ActionButton>
          ) : (
            <ActionButton busy={false} disabled={!trial.canUse} onClick={play}>
              <Play className="h-4 w-4" /> Play {NOISES.find((n) => n.id === noise)?.name.toLowerCase()} noise
            </ActionButton>
          )}
          {playing && timerMin > 0 && (
            <p className="text-2xl font-black tabular-nums text-foreground">
              {formatCountdown(remaining)}
              <span className="ml-2 text-xs font-bold text-muted-foreground">until auto-stop</span>
            </p>
          )}
          {playing && timerMin === 0 && (
            <p className="text-xs font-bold text-muted-foreground">Playing until you press stop</p>
          )}
        </div>
        {!isPro && (
          <p className="text-center text-xs text-muted-foreground">
            {trial.left} of {TOOL_TRIAL_LIMIT} free plays left - noise is synthesized live in your browser.
          </p>
        )}
      </div>
    </ToolPageShell>
  );
}
