// /tools/scale-of-universe - Interactive scale lab: a log slider from
// atomic scales (1e-15 m) to the observable universe (1e26 m). Objects
// appear at their real scales; copy any fact. Client-side only.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, ZoomIn } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/scale-of-universe")({
  head: () => {
    const seo = getToolSeoMeta("scale-of-universe");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: ScaleOfUniverseTool,
});

interface ScaleObject {
  name: string;
  log: number; // log10 of size in meters
  size: string;
  fact: string;
}

const OBJECTS: ScaleObject[] = [
  { name: "Proton", log: -15.08, size: "8.4 x 10^-16 m", fact: "A proton is about 100,000 times smaller than an atom. Nearly all of an atom's mass lives in its tiny nucleus." },
  { name: "Hydrogen atom", log: -10, size: "1 x 10^-10 m", fact: "Atoms are mostly empty space: if the nucleus were a marble, the electron cloud would be a football stadium." },
  { name: "Water molecule", log: -9.56, size: "2.75 x 10^-10 m", fact: "A single drop of water contains about 1.7 sextillion molecules." },
  { name: "DNA double helix", log: -8.7, size: "2 x 10^-9 m wide", fact: "Uncoiled, the DNA in one human cell would stretch about 2 meters long." },
  { name: "Coronavirus particle", log: -6.92, size: "1.2 x 10^-7 m", fact: "Roughly 1,000 times smaller than the width of a human hair." },
  { name: "Red blood cell", log: -5.12, size: "7.5 x 10^-6 m", fact: "Your body makes about 2 million new red blood cells every second." },
  { name: "Human hair width", log: -4, size: "1 x 10^-4 m", fact: "A human hair is about 100 times wider than a red blood cell." },
  { name: "Ant", log: -2.3, size: "5 x 10^-3 m", fact: "Ants can carry 10 to 50 times their own body weight." },
  { name: "Human", log: 0.23, size: "1.7 m tall", fact: "The average adult human is about 10 billion times taller than a hydrogen atom is wide." },
  { name: "Blue whale", log: 1.4, size: "25 m long", fact: "The largest animal known to have ever lived. Its heart alone is the size of a small car." },
  { name: "Eiffel Tower", log: 2.52, size: "330 m tall", fact: "The tower grows about 15 cm taller in summer as the iron expands in the heat." },
  { name: "Mount Everest", log: 3.95, size: "8,849 m", fact: "Everest grows about 4 mm taller each year as tectonic plates collide." },
  { name: "The Moon", log: 6.54, size: "3,474 km wide", fact: "The Moon is drifting about 3.8 cm farther from Earth every year." },
  { name: "Earth", log: 7.1, size: "12,742 km wide", fact: "Earth is the densest planet in the solar system and the only one known to harbor life." },
  { name: "Jupiter", log: 8.15, size: "139,820 km wide", fact: "1,300 Earths could fit inside Jupiter. Its magnetic field is 20,000 times stronger than Earth's." },
  { name: "The Sun", log: 9.14, size: "1.39 x 10^9 m wide", fact: "The Sun holds 99.86% of the solar system's mass and fuses 600 million tons of hydrogen every second." },
  { name: "Earth to Sun", log: 11.18, size: "1.5 x 10^11 m", fact: "Light from the Sun takes 8 minutes 20 seconds to reach Earth." },
  { name: "Light year", log: 15.98, size: "9.46 x 10^15 m", fact: "One light year is the distance light travels in a year: about 63,000 times the Earth-Sun distance." },
  { name: "Milky Way galaxy", log: 21, size: "1 x 10^21 m wide", fact: "Our galaxy holds 100 to 400 billion stars. Crossing it at light speed would take 100,000 years." },
  { name: "Andromeda distance", log: 22.4, size: "2.5 x 10^22 m away", fact: "The nearest large galaxy is 2.5 million light years away and is on a collision course with the Milky Way." },
  { name: "Observable universe", log: 26.94, size: "8.8 x 10^26 m wide", fact: "The observable universe contains an estimated 200 billion to 2 trillion galaxies." },
];

const MIN = -15;
const MAX = 27;

function formatScale(log: number): string {
  const exp = Math.round(log);
  return `10^${exp} m`;
}

function ScaleOfUniverseTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("scale-of-universe", isPro);
  const seo = getToolSeo("scale-of-universe");

  const [log, setLog] = useState(0.23); // start at human scale
  const [selected, setSelected] = useState<ScaleObject>(OBJECTS[8]!);

  const visible = useMemo(() => {
    // objects whose scale is within the current view window
    return OBJECTS.filter((o) => Math.abs(o.log - log) <= 2.2).sort((a, b) => Math.abs(a.log - log) - Math.abs(b.log - log));
  }, [log]);

  const nearest = visible[0] ?? null;

  const pick = (o: ScaleObject) => {
    setSelected(o);
    setLog(o.log);
  };

  const copyFact = async () => {
    if (!trial.canUse) return;
    const text = `${selected.name} (${selected.size})\n${selected.fact}`;
    try {
      await navigator.clipboard.writeText(text);
      trial.recordUse();
      toast.success(`Copied ${selected.name} fact`);
    } catch {
      toast.error("Copy failed - clipboard not available.");
    }
  };

  const pct = ((log - MIN) / (MAX - MIN)) * 100;

  return (
    <ToolPageShell toolId="scale-of-universe" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Scale of Universe" left={trial.left} />

      <div className="space-y-6">
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
              <ZoomIn className="h-4 w-4" /> Zoom through the scales
            </h2>
            <span className="rounded-full bg-primary/10 px-3 py-1 font-mono text-sm font-bold text-primary">{formatScale(log)}</span>
          </div>

          {/* log ruler */}
          <div className="relative mt-6 px-1">
            <input
              type="range" min={MIN} max={MAX} step={0.05} value={log}
              onChange={(e) => setLog(Number(e.target.value))}
              className="w-full accent-primary"
              aria-label="Logarithmic scale from 10^-15 to 10^26 meters"
            />
            <div className="relative mt-1 h-8">
              {[-15, -10, -5, 0, 5, 10, 15, 20, 25].map((e) => (
                <div key={e} className="absolute -translate-x-1/2 text-center" style={{ left: `${((e - MIN) / (MAX - MIN)) * 100}%` }}>
                  <div className="mx-auto h-2 w-px bg-border" />
                  <span className="font-mono text-[10px] text-muted-foreground">10^{e}</span>
                </div>
              ))}
            </div>
            {/* object markers */}
            <div className="relative mt-2 h-6">
              {OBJECTS.map((o) => {
                const left = ((o.log - MIN) / (MAX - MIN)) * 100;
                const inView = Math.abs(o.log - log) <= 2.2;
                return (
                  <button
                    key={o.name}
                    type="button"
                    onClick={() => pick(o)}
                    title={`${o.name} (${o.size})`}
                    className={cn(
                      "absolute top-0 h-5 w-5 -translate-x-1/2 rounded-full border-2 transition",
                      selected.name === o.name
                        ? "scale-125 border-primary bg-primary"
                        : inView
                          ? "border-sky-500 bg-sky-500/60 hover:scale-110"
                          : "border-muted-foreground/30 bg-muted",
                    )}
                    style={{ left: `${left}%` }}
                  />
                );
              })}
            </div>
          </div>

          {/* zoom readout strip */}
          <div className="mt-4 flex h-24 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-r from-violet-950 via-sky-950 to-indigo-950">
            <p className="px-4 text-center text-lg font-bold text-white">
              {nearest ? nearest.name : "Deep space between objects"}
              <span className="block text-sm font-medium text-white/60">{nearest ? nearest.size : "keep zooming"}</span>
            </p>
          </div>

          {visible.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Objects near this scale</p>
              <div className="flex flex-wrap gap-2">
                {visible.map((o) => (
                  <button
                    key={o.name}
                    type="button"
                    onClick={() => setSelected(o)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-bold transition",
                      selected.name === o.name ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {o.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">{selected.name}</h2>
              <p className="mt-0.5 font-mono text-sm text-primary">{selected.size}</p>
              <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{selected.fact}</p>
            </div>
            <div className="flex items-center gap-3">
              <ActionButton disabled={!trial.canUse} onClick={copyFact}>
                <Copy className="h-4 w-4" /> Copy fact
              </ActionButton>
            </div>
          </div>
          {!isPro && <p className="mt-3 text-xs text-muted-foreground">{trial.left} of {TOOL_TRIAL_LIMIT} free copies left.</p>}
          <p className="mt-3 text-xs text-muted-foreground">
            Sizes are order-of-magnitude values for intuition. Zooming is logarithmic: each step multiplies the scale by ten.
          </p>
        </section>
      </div>
    </ToolPageShell>
  );
}
