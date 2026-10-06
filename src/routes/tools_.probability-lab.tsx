// /tools/probability-lab - Monte Carlo probability experiments: coin flip,
// dice, and the Monty Hall problem. Live convergence chart vs theoretical
// probability. Client-side only.

import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Dices, Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/probability-lab";
import toolSeoMeta from "@/lib/tool-seo-meta-data/probability-lab";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/probability-lab")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/probability-lab";
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
  component: ProbabilityLabTool,
});

interface Experiment {
  id: string;
  name: string;
  blurb: string;
  theory: number;
  theoryLabel: string;
  run: (trials: number, rand: () => number) => number[];
}

function simulate(run: (rand: () => number) => boolean, trials: number, rand: () => number): number[] {
  const curve: number[] = [];
  let wins = 0;
  const step = Math.max(1, Math.floor(trials / 60));
  for (let i = 1; i <= trials; i++) {
    if (run(rand)) wins++;
    if (i % step === 0 || i === trials) curve.push(wins / i);
  }
  return curve;
}

const EXPERIMENTS: Experiment[] = [
  {
    id: "coin", name: "Coin flip", blurb: "Flip a fair coin. How often does heads come up as trials grow?",
    theory: 0.5, theoryLabel: "1/2 = 50%",
    run: (trials, rand) => simulate(() => rand() < 0.5, trials, rand),
  },
  {
    id: "dice", name: "Dice roll (six)", blurb: "Roll a fair d6. Track how often you roll a six.",
    theory: 1 / 6, theoryLabel: "1/6 = 16.67%",
    run: (trials, rand) => simulate(() => rand() < 1 / 6, trials, rand),
  },
  {
    id: "monty", name: "Monty Hall (switch)", blurb: "You pick a door, the host opens a goat door, you switch. Switching wins 2/3 of the time.",
    theory: 2 / 3, theoryLabel: "2/3 = 66.67%",
    run: (trials, rand) =>
      simulate(() => {
        const prize = Math.floor(rand() * 3);
        const pick = Math.floor(rand() * 3);
        return pick !== prize;
      }, trials, rand),
  },
  {
    id: "monty-stay", name: "Monty Hall (stay)", blurb: "Same game, but you never switch. Staying wins only 1/3 of the time.",
    theory: 1 / 3, theoryLabel: "1/3 = 33.33%",
    run: (trials, rand) =>
      simulate(() => {
        const prize = Math.floor(rand() * 3);
        const pick = Math.floor(rand() * 3);
        return pick === prize;
      }, trials, rand),
  },
];

function drawChart(canvas: HTMLCanvasElement, curve: number[], theory: number) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = canvas.clientWidth;
  const h = 260;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  const pad = { l: 46, r: 10, t: 12, b: 26 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  const maxY = Math.max(theory * 1.6, Math.max(...curve, 0.01) * 1.1, 0.05);

  const x = (i: number) => pad.l + (i / Math.max(1, curve.length - 1)) * iw;
  const y = (v: number) => pad.t + ih - (v / maxY) * ih;

  ctx.strokeStyle = "rgba(128,128,128,0.25)";
  ctx.fillStyle = "rgba(128,128,128,0.8)";
  ctx.font = "11px system-ui";
  ctx.lineWidth = 1;
  for (let g = 0; g <= 4; g++) {
    const v = (maxY * g) / 4;
    ctx.beginPath();
    ctx.moveTo(pad.l, y(v));
    ctx.lineTo(w - pad.r, y(v));
    ctx.stroke();
    ctx.fillText(`${(v * 100).toFixed(0)}%`, 6, y(v) + 4);
  }
  ctx.fillText("trials ->", w - 60, h - 8);

  // theoretical line
  ctx.strokeStyle = "#10b981";
  ctx.setLineDash([6, 4]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pad.l, y(theory));
  ctx.lineTo(w - pad.r, y(theory));
  ctx.stroke();
  ctx.setLineDash([]);

  // observed curve
  ctx.strokeStyle = "#0ea5e9";
  ctx.lineWidth = 2;
  ctx.beginPath();
  curve.forEach((v, i) => {
    if (i === 0) ctx.moveTo(x(i), y(v));
    else ctx.lineTo(x(i), y(v));
  });
  ctx.stroke();

  // legend
  ctx.fillStyle = "#0ea5e9";
  ctx.fillRect(pad.l, 8, 14, 3);
  ctx.fillStyle = "rgba(128,128,128,0.9)";
  ctx.fillText("observed", pad.l + 20, 13);
  ctx.fillStyle = "#10b981";
  ctx.fillRect(pad.l + 92, 8, 14, 3);
  ctx.fillStyle = "rgba(128,128,128,0.9)";
  ctx.fillText("theoretical", pad.l + 112, 13);
}

function ProbabilityLabTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("probability-lab", isPro);
  const seo = toolSeo;

  const [expId, setExpId] = useState(EXPERIMENTS[0]!.id);
  const [trials, setTrials] = useState(10000);
  const [curve, setCurve] = useState<number[]>([]);
  const [running, setRunning] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const experiment = useMemo(() => EXPERIMENTS.find((e) => e.id === expId)!, [expId]);
  const finalRate = curve.length > 0 ? curve[curve.length - 1]! : null;
  const diff = finalRate === null ? null : Math.abs(finalRate - experiment.theory) * 100;

  const runExperiment = () => {
    if (!trial.canUse || running) return;
    setRunning(true);
    // yield to paint before the heavy loop
    setTimeout(() => {
      try {
        const c = experiment.run(trials, Math.random);
        setCurve(c);
        trial.recordUse();
        const canvas = canvasRef.current;
        if (canvas) drawChart(canvas, c, experiment.theory);
      } finally {
        setRunning(false);
      }
    }, 30);
  };

  const reset = () => {
    setCurve([]);
    setExpId(EXPERIMENTS[0]!.id);
    setTrials(10000);
  };

  const copyResults = async () => {
    if (finalRate === null || !trial.canUse) return;
    const text = [
      `Probability Lab: ${experiment.name}`,
      `Trials: ${trials.toLocaleString()}`,
      `Theoretical probability: ${experiment.theoryLabel}`,
      `Observed win rate: ${(finalRate * 100).toFixed(2)}%`,
      `Difference: ${diff!.toFixed(2)} percentage points`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      trial.recordUse();
      toast.success("Results copied");
    } catch {
      toast.error("Copy failed - clipboard not available.");
    }
  };

  return (
    <ToolPageShell toolId="probability-lab" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Probability Lab" left={trial.left} />

      <div className="space-y-6">
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap gap-2">
            {EXPERIMENTS.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => { setExpId(e.id); setCurve([]); }}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-bold transition",
                  expId === e.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                {e.name}
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{experiment.blurb}</p>

          <div className="mt-4">
            <div className="flex items-center justify-between text-sm">
              <label className="font-medium">Trials</label>
              <span className="font-bold tabular-nums">{trials.toLocaleString()}</span>
            </div>
            <input
              type="range" min={100} max={100000} step={100} value={trials}
              onChange={(e) => setTrials(Number(e.target.value))}
              className="mt-2 w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground"><span>100</span><span>100,000</span></div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <ActionButton busy={running} disabled={!trial.canUse} onClick={runExperiment}>
              <Play className="h-4 w-4" /> {running ? "Simulating…" : "Run simulation"}
            </ActionButton>
            <button
              type="button" onClick={reset}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-bold text-muted-foreground transition hover:border-primary/40"
            >
              <RotateCcw className="h-4 w-4" /> Reset
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            <Dices className="h-4 w-4" /> Convergence chart
          </h2>
          {curve.length > 0 ? (
            <>
              <canvas ref={canvasRef} className="mt-3 w-full" style={{ height: 260 }} />
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-muted/60 p-4 text-center">
                  <p className="text-xs text-muted-foreground">Observed win rate</p>
                  <p className="mt-1 text-2xl font-bold text-sky-600 tabular-nums">{(finalRate! * 100).toFixed(2)}%</p>
                </div>
                <div className="rounded-xl bg-muted/60 p-4 text-center">
                  <p className="text-xs text-muted-foreground">Theoretical</p>
                  <p className="mt-1 text-2xl font-bold text-emerald-600 tabular-nums">{(experiment.theory * 100).toFixed(2)}%</p>
                </div>
                <div className="rounded-xl bg-muted/60 p-4 text-center">
                  <p className="text-xs text-muted-foreground">Gap</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">{diff!.toFixed(2)} pts</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <ActionButton disabled={!trial.canUse} onClick={copyResults}>
                  <Copy className="h-4 w-4" /> Copy results
                </ActionButton>
                {!isPro && <p className="text-xs text-muted-foreground">{trial.left} of {TOOL_TRIAL_LIMIT} free uses left.</p>}
              </div>
            </>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Run the simulation to watch the observed rate converge on the theoretical probability (law of large numbers).
            </p>
          )}
        </section>
      </div>
    </ToolPageShell>
  );
}
