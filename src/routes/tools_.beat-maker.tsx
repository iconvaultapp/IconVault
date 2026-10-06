// /tools/beat-maker - 16-step drum sequencer. Kick, snare, hat and clap are
// synthesized live with the Web Audio API. No samples, no uploads.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Play, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/beat-maker";
import toolSeoMeta from "@/lib/tool-seo-meta-data/beat-maker";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/beat-maker")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/beat-maker";
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
  component: BeatTool,
});

const TRACKS = [
  { id: "kick", name: "Kick", color: "bg-rose-500" },
  { id: "snare", name: "Snare", color: "bg-amber-500" },
  { id: "hat", name: "Hat", color: "bg-sky-500" },
  { id: "clap", name: "Clap", color: "bg-violet-500" },
] as const;

const STEPS = 16;

const DEMO: boolean[][] = [
  [true, false, false, false, true, false, false, true, false, false, true, false, false, false, false, false],
  [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
  [true, false, true, false, true, false, true, false, true, false, true, false, true, true, false, true],
  [false, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false],
];

function emptyGrid(): boolean[][] {
  return TRACKS.map(() => Array(STEPS).fill(false));
}

function BeatTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("beat-maker", isPro);
  const seo = toolSeo;

  const [grid, setGrid] = useState<boolean[][]>(() => structuredClone(DEMO));
  const [bpm, setBpm] = useState(100);
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(-1);

  const ctxRef = useRef<AudioContext | null>(null);
  const noiseRef = useRef<AudioBuffer | null>(null);
  const timerRef = useRef<number | null>(null);
  const stepRef = useRef(0);
  const nextTimeRef = useRef(0);
  const gridRef = useRef(grid);
  const bpmRef = useRef(bpm);
  gridRef.current = grid;
  bpmRef.current = bpm;

  const ensureCtx = (): AudioContext => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const len = ctxRef.current.sampleRate;
      const buf = ctxRef.current.createBuffer(1, len, ctxRef.current.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      noiseRef.current = buf;
    }
    if (ctxRef.current.state === "suspended") void ctxRef.current.resume();
    return ctxRef.current;
  };

  const playTrack = useCallback((ctx: AudioContext, trackId: string, when: number) => {
    const noise = noiseRef.current!;
    if (trackId === "kick") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(150, when);
      osc.frequency.exponentialRampToValueAtTime(45, when + 0.12);
      gain.gain.setValueAtTime(0.9, when);
      gain.gain.exponentialRampToValueAtTime(0.001, when + 0.45);
      osc.connect(gain).connect(ctx.destination);
      osc.start(when);
      osc.stop(when + 0.5);
    } else if (trackId === "snare") {
      const src = ctx.createBufferSource();
      src.buffer = noise;
      const filter = ctx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.value = 1200;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.6, when);
      gain.gain.exponentialRampToValueAtTime(0.001, when + 0.2);
      src.connect(filter).connect(gain).connect(ctx.destination);
      src.start(when);
      src.stop(when + 0.25);
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = 190;
      const og = ctx.createGain();
      og.gain.setValueAtTime(0.4, when);
      og.gain.exponentialRampToValueAtTime(0.001, when + 0.12);
      osc.connect(og).connect(ctx.destination);
      osc.start(when);
      osc.stop(when + 0.15);
    } else if (trackId === "hat") {
      const src = ctx.createBufferSource();
      src.buffer = noise;
      const filter = ctx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.value = 7000;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.35, when);
      gain.gain.exponentialRampToValueAtTime(0.001, when + 0.06);
      src.connect(filter).connect(gain).connect(ctx.destination);
      src.start(when);
      src.stop(when + 0.1);
    } else {
      // clap: 3 quick noise bursts
      for (let i = 0; i < 3; i++) {
        const t = when + i * 0.02;
        const src = ctx.createBufferSource();
        src.buffer = noise;
        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = 1500;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + (i === 2 ? 0.25 : 0.03));
        src.connect(filter).connect(gain).connect(ctx.destination);
        src.start(t);
        src.stop(t + 0.3);
      }
    }
  }, []);

  const schedule = useCallback(() => {
    const ctx = ensureCtx();
    while (nextTimeRef.current < ctx.currentTime + 0.12) {
      const s = stepRef.current;
      TRACKS.forEach((t, ti) => {
        if (gridRef.current[ti]![s]) playTrack(ctx, t.id, nextTimeRef.current);
      });
      const stepDur = 60 / bpmRef.current / 4;
      nextTimeRef.current += stepDur;
      stepRef.current = (s + 1) % STEPS;
    }
    // update the playhead on the UI thread
    const ahead = nextTimeRef.current - ctx.currentTime;
    const stepDur = 60 / bpmRef.current / 4;
    const upcoming = (stepRef.current + STEPS - 1) % STEPS;
    void ahead;
    setStep(upcoming);
    void stepDur;
  }, [playTrack]);

  const start = () => {
    const ctx = ensureCtx();
    stepRef.current = 0;
    nextTimeRef.current = ctx.currentTime + 0.06;
    setStep(0);
    setPlaying(true);
    timerRef.current = window.setInterval(schedule, 25);
  };

  const stop = () => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
    setPlaying(false);
    setStep(-1);
  };

  useEffect(() => () => { if (timerRef.current !== null) window.clearInterval(timerRef.current); }, []);

  const toggle = (ti: number, si: number) => {
    setGrid((g) => {
      const next = g.map((row) => [...row]);
      next[ti]![si] = !next[ti]![si];
      return next;
    });
  };

  const clear = () => {
    stop();
    setGrid(emptyGrid());
  };

  const loadDemo = () => {
    setGrid(structuredClone(DEMO));
    toast.success("Demo groove loaded");
  };

  const copyPattern = async () => {
    if (!trial.canUse) return;
    const pattern: Record<string, string> = {};
    TRACKS.forEach((t, ti) => {
      pattern[t.id] = grid[ti]!.map((on) => (on ? "1" : "0")).join("");
    });
    try {
      await navigator.clipboard.writeText(JSON.stringify({ bpm, steps: STEPS, pattern }, null, 2));
      trial.recordUse();
      toast.success("Pattern copied as JSON");
    } catch {
      toast.error("Clipboard blocked by the browser.");
    }
  };

  return (
    <ToolPageShell toolId="beat-maker" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Beat Maker" left={trial.left} />

      <div className="mx-auto max-w-4xl space-y-5">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <ActionButton busy={false} disabled={false} onClick={playing ? stop : start}>
            {playing ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {playing ? "Stop" : "Play"}
          </ActionButton>
          <div className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5">
            <span className="text-sm font-bold">Tempo</span>
            <input
              type="range"
              min={60}
              max={180}
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
              className="w-36 accent-primary"
              aria-label="Tempo in BPM"
            />
            <span className="w-16 font-mono text-sm font-bold">{bpm} BPM</span>
          </div>
          <button
            type="button"
            onClick={loadDemo}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-muted-foreground transition hover:border-primary/40"
          >
            Demo groove
          </button>
          <button
            type="button"
            onClick={clear}
            className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-muted-foreground transition hover:border-red-500/50 hover:text-red-500"
          >
            <Trash2 className="h-4 w-4" /> Clear
          </button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border bg-card p-4">
          <div className="min-w-[620px] space-y-2">
            <div className="flex gap-1.5 pl-20">
              {Array.from({ length: STEPS }, (_, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex-1 rounded py-1 text-center font-mono text-[10px] font-bold",
                    step === i ? "bg-primary text-primary-foreground" : i % 4 === 0 ? "text-foreground" : "text-muted-foreground/50",
                  )}
                >
                  {i + 1}
                </div>
              ))}
            </div>
            {TRACKS.map((t, ti) => (
              <div key={t.id} className="flex items-center gap-1.5">
                <span className="w-[72px] shrink-0 text-right text-sm font-bold">{t.name}</span>
                <div className="flex flex-1 gap-1.5">
                  {Array.from({ length: STEPS }, (_, si) => {
                    const on = grid[ti]![si];
                    return (
                      <button
                        key={si}
                        type="button"
                        onClick={() => toggle(ti, si)}
                        aria-pressed={on}
                        aria-label={`${t.name} step ${si + 1}`}
                        className={cn(
                          "h-11 flex-1 rounded-lg border transition",
                          si % 4 === 0 && "ml-0.5",
                          on
                            ? cn(t.color, "border-transparent shadow-md")
                            : step === si
                              ? "border-primary/60 bg-primary/10"
                              : "border-border bg-muted/60 hover:border-primary/40",
                        )}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            All four drum sounds are synthesized live with Web Audio. No samples, everything runs in your browser.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ActionButton disabled={!trial.canUse} onClick={copyPattern}>
            <Copy className="h-4 w-4" /> Copy pattern
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free pattern copies left.
            </p>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
