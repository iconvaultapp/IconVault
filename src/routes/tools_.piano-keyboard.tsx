// /tools/piano-keyboard - Playable virtual piano with the Web Audio API.
// Mouse clicks + QWERTY mapping, octave shift, sustain toggle, copy note sequence.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Minus, Plus, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/piano-keyboard")({
  head: () => {
    const seo = getToolSeoMeta("piano-keyboard");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: PianoTool,
});

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const BLACK = new Set([1, 3, 6, 8, 10]);

function midiFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function midiName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[midi % 12]}${octave}`;
}

/** QWERTY mapping: lower row = octave 1, upper row = octave 2 (chromatic, C..B). */
const KEYMAP: Record<string, number> = {
  z: 0, s: 1, x: 2, d: 3, c: 4, v: 5, g: 6, b: 7, h: 8, n: 9, j: 10, m: 11,
  q: 12, "2": 13, w: 14, "3": 15, e: 16, r: 17, "5": 18, t: 19, "6": 20, y: 21, "7": 22, u: 23,
};

function PianoTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("piano-keyboard", isPro);
  const seo = getToolSeo("piano-keyboard");

  const [octave, setOctave] = useState(4);
  const [sustain, setSustain] = useState(false);
  const [sequence, setSequence] = useState<string[]>([]);
  const [active, setActive] = useState<Set<number>>(new Set());

  const ctxRef = useRef<AudioContext | null>(null);
  const voicesRef = useRef<Map<number, { osc: OscillatorNode; gain: GainNode }>>(new Map());
  const sustainRef = useRef(sustain);
  sustainRef.current = sustain;

  const ensureCtx = (): AudioContext => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (ctxRef.current.state === "suspended") void ctxRef.current.resume();
    return ctxRef.current;
  };

  const noteOn = useCallback((midi: number) => {
    const ctx = ensureCtx();
    if (voicesRef.current.has(midi)) return;
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = midiFreq(midi);
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.5, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.25, now + 0.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    voicesRef.current.set(midi, { osc, gain });
    setActive((prev) => new Set(prev).add(midi));
    setSequence((prev) => [...prev.slice(-199), midiName(midi)]);
  }, []);

  const noteOff = useCallback((midi: number) => {
    const voice = voicesRef.current.get(midi);
    if (!voice) return;
    const ctx = ensureCtx();
    const now = ctx.currentTime;
    const release = sustainRef.current ? 1.6 : 0.12;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(Math.max(voice.gain.gain.value, 0.0001), now);
    voice.gain.gain.exponentialRampToValueAtTime(0.0001, now + release);
    voice.osc.stop(now + release + 0.05);
    voicesRef.current.delete(midi);
    setActive((prev) => {
      const next = new Set(prev);
      next.delete(midi);
      return next;
    });
  }, []);

  const baseMidi = (octave + 1) * 12; // C of current octave

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      const offset = KEYMAP[e.key.toLowerCase()];
      if (offset === undefined) return;
      e.preventDefault();
      noteOn(baseMidi + offset);
    };
    const up = (e: KeyboardEvent) => {
      const offset = KEYMAP[e.key.toLowerCase()];
      if (offset === undefined) return;
      noteOff(baseMidi + offset);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [baseMidi, noteOn, noteOff]);

  const copySequence = async () => {
    if (sequence.length === 0 || !trial.canUse) return;
    try {
      await navigator.clipboard.writeText(sequence.join(" "));
      trial.recordUse();
      toast.success("Note sequence copied");
    } catch {
      toast.error("Clipboard blocked by the browser.");
    }
  };

  // Build key layout: 24 semitones, white keys in flow, black keys absolutely positioned
  const whiteKeys: { midi: number; label: string }[] = [];
  const blackKeys: { midi: number; leftPct: number; label: string }[] = [];
  let whiteIdx = 0;
  const whiteTotal = 14;
  for (let i = 0; i < 24; i++) {
    const midi = baseMidi + i;
    const semi = i % 12;
    const qwerty = Object.keys(KEYMAP).find((k) => KEYMAP[k] === i);
    const label = qwerty ? qwerty.toUpperCase() : "";
    if (BLACK.has(semi)) {
      blackKeys.push({ midi, leftPct: ((whiteIdx / whiteTotal) * 100), label });
    } else {
      whiteKeys.push({ midi, label });
      whiteIdx++;
    }
  }

  return (
    <ToolPageShell toolId="piano-keyboard" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Piano Keyboard" left={trial.left} />

      <div className="mx-auto max-w-4xl space-y-5">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <div className="flex items-center gap-1 rounded-xl border border-border px-2 py-1.5">
            <button
              type="button"
              onClick={() => setOctave((o) => Math.max(1, o - 1))}
              disabled={octave <= 1}
              className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted disabled:opacity-40"
              aria-label="Octave down"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="min-w-[88px] text-center text-sm font-bold">Octave {octave}</span>
            <button
              type="button"
              onClick={() => setOctave((o) => Math.min(6, o + 1))}
              disabled={octave >= 6}
              className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted disabled:opacity-40"
              aria-label="Octave up"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setSustain((s) => !s)}
            className={cn(
              "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition",
              sustain ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
            )}
            aria-pressed={sustain}
          >
            <Volume2 className="h-4 w-4" /> Sustain {sustain ? "on" : "off"}
          </button>
          <button
            type="button"
            onClick={() => setSequence([])}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-muted-foreground transition hover:border-primary/40"
          >
            Clear notes
          </button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border bg-card p-4">
          <div className="relative mx-auto h-56 min-w-[640px] select-none" style={{ touchAction: "none" }}>
            <div className="absolute inset-0 flex gap-[2px]">
              {whiteKeys.map((k) => (
                <button
                  key={k.midi}
                  type="button"
                  onPointerDown={() => noteOn(k.midi)}
                  onPointerUp={() => noteOff(k.midi)}
                  onPointerLeave={() => noteOff(k.midi)}
                  className={cn(
                    "relative flex-1 rounded-b-lg border border-zinc-300 transition-colors",
                    active.has(k.midi) ? "bg-primary/40" : "bg-white hover:bg-zinc-100",
                  )}
                  aria-label={midiName(k.midi)}
                >
                  <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-bold text-zinc-400">
                    {k.label}
                  </span>
                </button>
              ))}
            </div>
            {blackKeys.map((k) => (
              <button
                key={k.midi}
                type="button"
                onPointerDown={() => noteOn(k.midi)}
                onPointerUp={() => noteOff(k.midi)}
                onPointerLeave={() => noteOff(k.midi)}
                className={cn(
                  "absolute top-0 z-10 h-[58%] w-[4.5%] -translate-x-1/2 rounded-b-md border border-zinc-900 transition-colors",
                  active.has(k.midi) ? "bg-primary" : "bg-zinc-900 hover:bg-zinc-700",
                )}
                style={{ left: `${k.leftPct}%` }}
                aria-label={midiName(k.midi)}
              >
                <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-bold text-zinc-500">
                  {k.label}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Play with mouse/touch or your keyboard: Z row = lower octave, Q row = upper octave. Sound is synthesized live with Web Audio.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold">Note sequence ({sequence.length})</p>
            <ActionButton disabled={sequence.length === 0 || !trial.canUse} onClick={copySequence}>
              <Copy className="h-4 w-4" /> Copy sequence
            </ActionButton>
          </div>
          {sequence.length === 0 ? (
            <p className="text-sm text-muted-foreground">Play something and the notes will appear here.</p>
          ) : (
            <p className="max-h-24 overflow-y-auto font-mono text-sm leading-relaxed">{sequence.join(" ")}</p>
          )}
          {!isPro && (
            <p className="mt-3 text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free sequence copies left.
            </p>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
