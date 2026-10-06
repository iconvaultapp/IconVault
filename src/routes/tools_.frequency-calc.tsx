// /tools/frequency-calc - Frequency conversions (Hz/kHz/MHz/GHz), period,
// sound and radio wavelength, plus a musical note calculator: note to
// frequency, MIDI number, nearest-note lookup and note lengths at any BPM.

import { useCallback, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AudioWaveform, Calculator, Music } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/frequency-calc";
import toolSeoMeta from "@/lib/tool-seo-meta-data/frequency-calc";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/frequency-calc")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/frequency-calc";
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
  component: FrequencyCalc,
});

const UNITS = [
  { label: "Hz", factor: 1 },
  { label: "kHz", factor: 1e3 },
  { label: "MHz", factor: 1e6 },
  { label: "GHz", factor: 1e9 },
] as const;

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;

function midiToFreq(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

function midiName(m: number): string {
  return `${NOTE_NAMES[m % 12]}${Math.floor(m / 12) - 1}`;
}

function fmtNum(n: number): string {
  if (!isFinite(n) || n <= 0) return "-";
  if (n >= 1e9) return `${(n / 1e9).toFixed(3)} G`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(3)} M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(3)} k`;
  if (n >= 1) return n.toFixed(3);
  if (n >= 1e-3) return `${(n * 1e3).toFixed(3)} m`;
  return n.toExponential(2);
}

function FrequencyCalc() {
  const { isPro } = usePlan();
  const trial = useToolTrial("frequency-calc", isPro);
  const seo = toolSeo;

  const [tab, setTab] = useState<"freq" | "note">("freq");
  const [freqVal, setFreqVal] = useState(440);
  const [freqUnit, setFreqUnit] = useState(0);
  const [midi, setMidi] = useState(69);
  const [bpm, setBpm] = useState(120);
  const [lookupFreq, setLookupFreq] = useState(440);
  const [done, setDone] = useState(false);

  const hz = useMemo(() => Math.max(0, freqVal * (UNITS[freqUnit]?.factor ?? 1)), [freqVal, freqUnit]);

  const nearest = useMemo(() => {
    if (lookupFreq <= 0) return null;
    const m = Math.round(69 + 12 * Math.log2(lookupFreq / 440));
    if (m < 12 || m > 127) return null;
    const exact = midiToFreq(m);
    const cents = Math.round(1200 * Math.log2(lookupFreq / exact));
    return { midi: m, name: midiName(m), exact, cents };
  }, [lookupFreq]);

  const noteLen = useMemo(() => {
    const beat = 60 / Math.max(1, bpm);
    return [
      { name: "Whole note", beats: 4 },
      { name: "Dotted half", beats: 3 },
      { name: "Half note", beats: 2 },
      { name: "Dotted quarter", beats: 1.5 },
      { name: "Quarter note", beats: 1 },
      { name: "Eighth note", beats: 0.5 },
      { name: "Sixteenth note", beats: 0.25 },
      { name: "Thirty-second", beats: 0.125 },
    ].map((n) => ({ ...n, ms: beat * n.beats * 1000 }));
  }, [bpm]);

  const calculate = useCallback(() => {
    if (!trial.canUse) return;
    setDone(true);
    trial.recordUse();
    toast.success("Calculated");
  }, [trial]);

  return (
    <ToolPageShell toolId="frequency-calc" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Frequency Calculator" left={trial.left} />

      <div className="mb-5 flex gap-2">
        {([["freq", "Frequency + wavelength"], ["note", "Musical notes"]] as const).map(([v, l]) => (
          <button
            key={v}
            type="button"
            onClick={() => setTab(v)}
            className={cn(
              "flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-bold transition",
              tab === v ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
            )}
          >
            {v === "freq" ? <AudioWaveform className="h-4 w-4" /> : <Music className="h-4 w-4" />} {l}
          </button>
        ))}
      </div>

      {tab === "freq" ? (
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Frequency</label>
              <input
                type="number" min={0} step="any" value={freqVal}
                onChange={(e) => setFreqVal(Math.max(0, Number(e.target.value) || 0))}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Unit</label>
              <div className="flex gap-2">
                {UNITS.map((u, i) => (
                  <button
                    key={u.label}
                    type="button"
                    onClick={() => setFreqUnit(i)}
                    className={cn(
                      "rounded-xl border px-3 py-1.5 text-xs font-bold transition",
                      freqUnit === i ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {u.label}
                  </button>
                ))}
              </div>
            </div>
            <ActionButton disabled={!trial.canUse} onClick={calculate}>
              <Calculator className="h-4 w-4" /> Convert
            </ActionButton>
          </div>

          <div className="space-y-5">
            {!done ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-border bg-card text-center">
                <AudioWaveform className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="font-semibold">Conversions appear here</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Enter a frequency and hit Convert for every unit, period and wavelength.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {UNITS.map((u) => (
                    <div key={u.label} className="rounded-2xl border border-border bg-card p-4">
                      <p className="text-xs text-muted-foreground">{u.label}</p>
                      <p className="mt-1 text-lg font-extrabold">{hz > 0 ? fmtNum(hz / u.factor) : "-"}</p>
                    </div>
                  ))}
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <p className="text-xs text-muted-foreground">Period</p>
                    <p className="mt-1 text-lg font-extrabold">{hz > 0 ? `${fmtNum(1 / hz)}s` : "-"}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <p className="text-xs text-muted-foreground">Wavelength in air (343 m/s)</p>
                    <p className="mt-1 text-lg font-extrabold">{hz > 0 ? `${fmtNum(343 / hz)}m` : "-"}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <p className="text-xs text-muted-foreground">Radio wavelength (c)</p>
                    <p className="mt-1 text-lg font-extrabold">{hz > 0 ? `${fmtNum(299792458 / hz)}m` : "-"}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Hearing range is roughly 20 Hz - 20 kHz. FM radio sits at 88-108 MHz, Wi-Fi at 2.4/5 GHz.
                </p>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-[13px] font-medium text-foreground/80">Note (MIDI {midi})</label>
                <span className="font-mono text-sm font-bold text-primary">{midiName(midi)} = {midiToFreq(midi).toFixed(2)} Hz</span>
              </div>
              <input
                type="range" min={12} max={127} value={midi}
                onChange={(e) => setMidi(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Find nearest note to frequency (Hz)</label>
              <input
                type="number" min={0} step="any" value={lookupFreq}
                onChange={(e) => setLookupFreq(Math.max(0, Number(e.target.value) || 0))}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              {nearest && (
                <p className="mt-2 rounded-xl bg-muted/40 p-3 text-sm">
                  Nearest: <strong>{nearest.name}</strong> (MIDI {nearest.midi}, {nearest.exact.toFixed(2)} Hz)
                  {nearest.cents !== 0 && <span className="text-muted-foreground">, {nearest.cents > 0 ? "+" : ""}{nearest.cents} cents off</span>}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Tempo (BPM)</label>
              <input
                type="number" min={1} max={300} value={bpm}
                onChange={(e) => setBpm(Math.min(300, Math.max(1, Number(e.target.value) || 120)))}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
            <ActionButton disabled={!trial.canUse} onClick={calculate}>
              <Calculator className="h-4 w-4" /> Calculate
            </ActionButton>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 text-sm font-semibold">Note lengths at {bpm} BPM</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2 pr-4">Note</th>
                    <th className="py-2 pr-4">Beats</th>
                    <th className="py-2">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {noteLen.map((n) => (
                    <tr key={n.name} className="border-b border-border/50 last:border-0">
                      <td className="py-2.5 pr-4 font-semibold">{n.name}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{n.beats}</td>
                      <td className="py-2.5 font-mono">{n.ms >= 1000 ? `${(n.ms / 1000).toFixed(2)} s` : `${n.ms.toFixed(1)} ms`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Equal temperament, A4 = 440 Hz. Handy for delay times: set your delay to the dotted-eighth value for classic slapback.
            </p>
          </div>
        </div>
      )}
    </ToolPageShell>
  );
}
