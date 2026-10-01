// /tools/tone-generator - Web Audio tone generator with frequency sweep.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Play, Square } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/tone-generator")({
  head: () => {
    const seo = getToolSeoMeta("tone-generator");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: ToneGeneratorTool,
});

const WAVES = ["sine", "square", "sawtooth", "triangle"] as const;
type Wave = (typeof WAVES)[number];

/** Log slider: 0..1 maps to 20Hz..20kHz. */
const toFreq = (v: number) => Math.round(20 * Math.pow(1000, v));
const toSlider = (f: number) => Math.log(f / 20) / Math.log(1000);

function formatFreq(f: number) {
  return f >= 1000 ? `${(f / 1000).toFixed(f >= 10000 ? 0 : 2)} kHz` : `${f} Hz`;
}

function ToneGeneratorTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("tone-generator", isPro);
  const seo = getToolSeo("tone-generator");

  const [mode, setMode] = useState<"tone" | "sweep">("tone");
  const [slider, setSlider] = useState(toSlider(440));
  const [wave, setWave] = useState<Wave>("sine");
  const [volume, setVolume] = useState(25);
  const [sweepStart, setSweepStart] = useState(toSlider(100));
  const [sweepEnd, setSweepEnd] = useState(toSlider(5000));
  const [sweepSecs, setSweepSecs] = useState(5);
  const [playing, setPlaying] = useState(false);
  const [sweeping, setSweeping] = useState(false);

  const ctxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  const freq = toFreq(slider);
  const sweepStartF = toFreq(sweepStart);
  const sweepEndF = toFreq(sweepEnd);

  const getCtx = useCallback((): AudioContext | null => {
    if (ctxRef.current) return ctxRef.current;
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) {
      toast.error("Web Audio is not supported in this browser.");
      return null;
    }
    const ctx = new Ctx();
    ctxRef.current = ctx;
    return ctx;
  }, []);

  useEffect(
    () => () => {
      oscRef.current?.stop();
      if (ctxRef.current) void ctxRef.current.close();
    },
    [],
  );

  // Apply live changes while the steady tone is playing
  useEffect(() => {
    if (oscRef.current && ctxRef.current) {
      const t = ctxRef.current.currentTime;
      oscRef.current.frequency.setTargetAtTime(freq, t, 0.01);
      oscRef.current.type = wave;
      gainRef.current?.gain.setTargetAtTime(volume / 100, t, 0.01);
    }
  }, [freq, wave, volume]);

  const startTone = useCallback(() => {
    if (playing || !trial.canUse) return;
    const ctx = getCtx();
    if (!ctx) return;
    trial.recordUse();
    if (ctx.state === "suspended") void ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = wave;
    osc.frequency.value = freq;
    gain.gain.value = 0;
    gain.gain.setTargetAtTime(volume / 100, ctx.currentTime, 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    oscRef.current = osc;
    gainRef.current = gain;
    setPlaying(true);
  }, [playing, trial, getCtx, wave, freq, volume]);

  const stopTone = useCallback(() => {
    const ctx = ctxRef.current;
    if (oscRef.current && ctx) {
      const osc = oscRef.current;
      const gain = gainRef.current;
      gain?.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
      window.setTimeout(() => {
        try { osc.stop(); } catch { /* already stopped */ }
        osc.disconnect();
        gain?.disconnect();
      }, 150);
      oscRef.current = null;
      gainRef.current = null;
    }
    setPlaying(false);
  }, []);

  const startSweep = useCallback(() => {
    if (sweeping || !trial.canUse) return;
    const ctx = getCtx();
    if (!ctx) return;
    trial.recordUse();
    if (ctx.state === "suspended") void ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = wave;
    const t0 = ctx.currentTime + 0.05;
    osc.frequency.setValueAtTime(Math.max(1, sweepStartF), t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, sweepEndF), t0 + sweepSecs);
    gain.gain.value = 0;
    gain.gain.setTargetAtTime(volume / 100, t0, 0.05);
    gain.gain.setTargetAtTime(0, t0 + sweepSecs, 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + sweepSecs + 0.3);
    setSweeping(true);
    window.setTimeout(() => {
      osc.disconnect();
      gain.disconnect();
      setSweeping(false);
    }, (sweepSecs + 0.4) * 1000);
  }, [sweeping, trial, getCtx, wave, sweepStartF, sweepEndF, sweepSecs, volume]);

  return (
    <ToolPageShell toolId="tone-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Tone Generator" left={trial.left} />

      <div className="mx-auto max-w-xl space-y-6 rounded-2xl border border-border bg-card p-6">
        {/* Honest safety note */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
            Check your volume before pressing play. Turn it up slowly.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Sine waves below 60 Hz or above 15 kHz can be harsh or inaudible on some speakers and headphones. Keep the volume low.
          </p>
        </div>

        <div>
          <div className="flex gap-2">
            {(["tone", "sweep"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { stopTone(); setMode(m); }}
                className={cn(
                  "flex-1 rounded-xl border px-3 py-2.5 text-sm font-bold transition",
                  mode === m
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                {m === "tone" ? "Steady tone" : "Frequency sweep"}
              </button>
            ))}
          </div>
        </div>

        {mode === "tone" ? (
          <>
            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <p className="text-[13px] font-medium text-foreground/80">Frequency</p>
                <p className="text-2xl font-black text-foreground">{formatFreq(freq)}</p>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.001}
                value={slider}
                onChange={(e) => setSlider(Number(e.target.value))}
                className="w-full accent-primary"
                aria-label="Frequency"
              />
              <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                <span>20 Hz</span>
                <span>20 kHz</span>
              </div>
              <div className="mt-2 flex gap-2">
                {[440, 1000, 8000].map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setSlider(toSlider(f))}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:border-primary/40"
                  >
                    {formatFreq(f)}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <p className="text-[13px] font-medium text-foreground/80">Start frequency</p>
                <p className="font-black text-foreground">{formatFreq(sweepStartF)}</p>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.001}
                value={sweepStart}
                onChange={(e) => setSweepStart(Number(e.target.value))}
                className="w-full accent-primary"
                aria-label="Sweep start frequency"
              />
            </div>
            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <p className="text-[13px] font-medium text-foreground/80">End frequency</p>
                <p className="font-black text-foreground">{formatFreq(sweepEndF)}</p>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.001}
                value={sweepEnd}
                onChange={(e) => setSweepEnd(Number(e.target.value))}
                className="w-full accent-primary"
                aria-label="Sweep end frequency"
              />
            </div>
            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <p className="text-[13px] font-medium text-foreground/80">Duration</p>
                <p className="font-black text-foreground">{sweepSecs}s</p>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={sweepSecs}
                onChange={(e) => setSweepSecs(Number(e.target.value))}
                className="w-full accent-primary"
                aria-label="Sweep duration in seconds"
              />
            </div>
          </div>
        )}

        <div>
          <p className="mb-2 text-[13px] font-medium text-foreground/80">Waveform</p>
          <div className="flex gap-2">
            {WAVES.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setWave(w)}
                className={cn(
                  "flex-1 rounded-xl border px-3 py-2.5 text-sm font-bold capitalize transition",
                  wave === w
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                {w}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Sine is smooth, square and sawtooth are buzzy, triangle sits in between.
          </p>
        </div>

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

        <div className="flex justify-center">
          {mode === "tone" ? (
            playing ? (
              <ActionButton busy={false} onClick={stopTone}>
                <Square className="h-4 w-4" /> Stop
              </ActionButton>
            ) : (
              <ActionButton busy={false} disabled={!trial.canUse} onClick={startTone}>
                <Play className="h-4 w-4" /> Play tone
              </ActionButton>
            )
          ) : (
            <ActionButton busy={sweeping} disabled={!trial.canUse} onClick={startSweep}>
              <Play className="h-4 w-4" /> {sweeping ? "Sweeping…" : "Play sweep"}
            </ActionButton>
          )}
        </div>
        {!isPro && (
          <p className="text-center text-xs text-muted-foreground">
            {trial.left} of {TOOL_TRIAL_LIMIT} free plays left - audio is synthesized live in your browser.
          </p>
        )}
      </div>
    </ToolPageShell>
  );
}
