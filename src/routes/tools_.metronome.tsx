// /tools/metronome - Web Audio metronome with tap tempo, time signatures and visual pulse.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Play, Square } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/metronome";
import toolSeoMeta from "@/lib/tool-seo-meta-data/metronome";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/metronome")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/metronome";
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
  component: MetronomeTool,
});

const SIGS = [
  { id: "2/4", beats: 2, sub: 1 },
  { id: "3/4", beats: 3, sub: 1 },
  { id: "4/4", beats: 4, sub: 1 },
  { id: "6/8", beats: 6, sub: 0.5 },
] as const;

type SigId = (typeof SIGS)[number]["id"];

function sigOf(id: SigId) {
  return SIGS.find((s) => s.id === id)!;
}

function MetronomeTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("metronome", isPro);
  const seo = toolSeo;

  const [bpm, setBpm] = useState(120);
  const [sig, setSig] = useState<SigId>("4/4");
  const [playing, setPlaying] = useState(false);
  const [beat, setBeat] = useState(-1);
  const [flash, setFlash] = useState(false);
  const [tapCount, setTapCount] = useState(0);

  const ctxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);
  const nextTimeRef = useRef(0);
  const beatRef = useRef(0);
  const bpmRef = useRef(120);
  const sigRef = useRef<SigId>("4/4");
  const tapsRef = useRef<number[]>([]);

  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { sigRef.current = sig; }, [sig]);

  const playTick = useCallback((time: number, accent: boolean) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = accent ? 1600 : 800;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.9, time + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + 0.1);
  }, []);

  const scheduler = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const { beats, sub } = sigOf(sigRef.current);
    const spb = (60 / bpmRef.current) * sub;
    while (nextTimeRef.current < ctx.currentTime + 0.12) {
      const b = beatRef.current;
      const accent = b === 0;
      playTick(nextTimeRef.current, accent);
      const delay = Math.max(0, (nextTimeRef.current - ctx.currentTime) * 1000);
      window.setTimeout(() => {
        setBeat(b);
        setFlash(true);
        window.setTimeout(() => setFlash(false), 120);
      }, delay);
      nextTimeRef.current += spb;
      beatRef.current = (b + 1) % beats;
    }
  }, [playTick]);

  const start = useCallback(() => {
    if (playing || !trial.canUse) return;
    trial.recordUse();
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) {
      toast.error("Web Audio is not supported in this browser.");
      return;
    }
    const ctx = ctxRef.current ?? new Ctx();
    ctxRef.current = ctx;
    if (ctx.state === "suspended") void ctx.resume();
    beatRef.current = 0;
    nextTimeRef.current = ctx.currentTime + 0.06;
    setBeat(-1);
    timerRef.current = window.setInterval(scheduler, 25);
    setPlaying(true);
  }, [playing, trial, scheduler]);

  const stop = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setPlaying(false);
    setBeat(-1);
  }, []);

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    if (ctxRef.current) void ctxRef.current.close();
  }, []);

  const tapTempo = useCallback(() => {
    const now = performance.now();
    const taps = tapsRef.current;
    if (taps.length > 0 && now - taps[taps.length - 1]! > 2000) taps.length = 0;
    taps.push(now);
    if (taps.length > 6) taps.shift();
    setTapCount(taps.length);
    if (taps.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < taps.length; i++) intervals.push(taps[i]! - taps[i - 1]!);
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      setBpm(Math.min(240, Math.max(30, Math.round(60000 / avg))));
    }
  }, []);

  const beats = sigOf(sig).beats;

  return (
    <ToolPageShell toolId="metronome" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Metronome" left={trial.left} />

      <div className="mx-auto max-w-xl space-y-6 rounded-2xl border border-border bg-card p-6">
        {/* Visual pulse */}
        <div className="flex flex-col items-center gap-4 py-2">
          <div
            className={cn(
              "flex h-28 w-28 items-center justify-center rounded-full transition-transform duration-100",
              flash ? "scale-125" : "scale-100",
              playing ? "bg-primary" : "bg-muted",
            )}
          >
            <span className={cn("text-3xl font-black", playing ? "text-primary-foreground" : "text-muted-foreground")}>
              {playing && beat >= 0 ? beat + 1 : bpm}
            </span>
          </div>
          <div className="flex gap-2">
            {Array.from({ length: beats }, (_, i) => (
              <div
                key={i}
                className={cn(
                  "h-4 w-4 rounded-full transition-colors",
                  playing && beat === i ? (i === 0 ? "bg-primary" : "bg-amber-400") : "bg-muted",
                )}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {playing ? `Beat ${beat + 1} of ${beats}` : "First dot of each bar is the accented downbeat"}
          </p>
        </div>

        {/* BPM */}
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <p className="text-[13px] font-medium text-foreground/80">Tempo</p>
            <p className="text-2xl font-black text-foreground">
              {bpm} <span className="text-sm font-semibold text-muted-foreground">BPM</span>
            </p>
          </div>
          <input
            type="range"
            min={30}
            max={240}
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
            className="w-full accent-primary"
            aria-label="Tempo in beats per minute"
          />
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>30</span>
            <span>240</span>
          </div>
        </div>

        {/* Time signature + tap */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Time signature</p>
            <div className="flex gap-2">
              {SIGS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSig(s.id)}
                  className={cn(
                    "flex-1 rounded-xl border px-3 py-2.5 text-sm font-bold transition",
                    sig === s.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {s.id}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Tap tempo</p>
            <button
              type="button"
              onClick={tapTempo}
              className="w-full rounded-xl border border-border px-3 py-2.5 text-sm font-bold text-foreground transition hover:border-primary/40 active:scale-95"
            >
              Tap {tapCount > 0 ? `(${tapCount})` : ""}
            </button>
            <p className="mt-1.5 text-xs text-muted-foreground">Tap along to the music to set the tempo.</p>
          </div>
        </div>

        <div className="flex justify-center">
          {playing ? (
            <ActionButton busy={false} onClick={stop}>
              <Square className="h-4 w-4" /> Stop
            </ActionButton>
          ) : (
            <ActionButton busy={false} disabled={!trial.canUse} onClick={start}>
              <Play className="h-4 w-4" /> Start
            </ActionButton>
          )}
        </div>
        {!isPro && (
          <p className="text-center text-xs text-muted-foreground">
            {trial.left} of {TOOL_TRIAL_LIMIT} free sessions left - sound never leaves your device.
          </p>
        )}
      </div>
    </ToolPageShell>
  );
}
