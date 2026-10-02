// /tools/statistics-calculator - Descriptive stats for a number list + box plot.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, Copy, Sigma } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/statistics-calculator")({
  head: () => {
    const seo = getToolSeoMeta("statistics-calculator");
    const canonical = "https://iconvault.site/tools/statistics-calculator";
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
  component: StatsTool,
});

const INPUT = "w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary";

const fmt = (x: number) => {
  if (!isFinite(x)) return "n/a";
  const r = Math.round(x * 10000) / 10000;
  return r.toLocaleString("en-US", { maximumFractionDigits: 4 });
};

/** Linear-interpolation percentile (same method as numpy default). */
function percentile(sorted: number[], p: number): number {
  const i = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return sorted![lo]! + (sorted![hi]! - sorted![lo]!) * (i - lo);
}

function StatsTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("statistics-calculator", isPro);
  const seo = getToolSeo("statistics-calculator");

  const [raw, setRaw] = useState("12, 18, 21, 21, 25, 30, 34, 40, 21, 27");
  const [done, setDone] = useState(false);

  const parsed = useMemo(() => {
    const tokens = raw.split(/[\s,;]+/).filter((t) => t.length > 0);
    const values: number[] = [];
    let skipped = 0;
    for (const t of tokens) {
      const v = parseFloat(t);
      if (isNaN(v)) skipped++;
      else values.push(v);
    }
    return { values, skipped };
  }, [raw]);

  const stats = useMemo(() => {
    const v = [...parsed.values].sort((a, b) => a - b);
    if (v.length === 0) return null;
    const n = v.length;
    const sum = v.reduce((a, x) => a + x, 0);
    const mean = sum / n;
    const median = n % 2 === 1 ? v[(n - 1) / 2] : (v![n / 2 - 1]! + v![n / 2]!) / 2;
    const counts = new Map<number, number>();
    for (const x of v) counts.set(x, (counts.get(x) ?? 0) + 1);
    const maxC = Math.max(...counts.values());
    const modes = maxC > 1 ? [...counts.entries()].filter(([, c]) => c === maxC).map(([x]) => x).sort((a, b) => a - b) : [];
    const popVar = v.reduce((a, x) => a + (x - mean) ** 2, 0) / n;
    const sampVar = n > 1 ? (popVar * n) / (n - 1) : 0;
    const q1 = percentile(v, 25);
    const q3 = percentile(v, 75);
    return {
      n, sum, mean, median, modes,
      popVar, popSd: Math.sqrt(popVar),
      sampVar, sampSd: Math.sqrt(sampVar),
      min: v[0], max: v[n - 1], range: v![n - 1]! - v![0]!,
      q1, q3, iqr: q3 - q1,
      skipped: parsed.skipped,
    };
  }, [parsed]);

  const calculate = () => {
    if (!trial.canUse) return;
    if (!stats) { toast.error("Enter at least one valid number."); return; }
    setDone(true);
    trial.recordUse();
    toast.success("Statistics calculated");
  };

  const copy = async () => {
    if (!stats || !trial.canUse) return;
    const s = stats;
    const text = [
      `Count: ${s.n}`, `Sum: ${fmt(s.sum)}`, `Mean: ${fmt(s.mean)}`, `Median: ${fmt(s!.median!)}`,
      `Mode: ${s.modes.length ? s.modes.map(fmt).join(", ") : "none"}`,
      `Std dev (sample): ${fmt(s.sampSd)}`, `Std dev (population): ${fmt(s.popSd)}`,
      `Variance (sample): ${fmt(s.sampVar)}`, `Variance (population): ${fmt(s.popVar)}`,
      `Min: ${fmt(s!.min!)}`, `Max: ${fmt(s!.max!)}`, `Range: ${fmt(s.range)}`,
      `Q1: ${fmt(s.q1)}`, `Q3: ${fmt(s.q3)}`, `IQR: ${fmt(s.iqr)}`,
    ].join("\n");
    await navigator.clipboard.writeText(text);
    trial.recordUse();
    toast.success("Statistics copied");
  };

  const show = done && stats;

  // Box plot geometry
  const box = useMemo(() => {
    if (!stats) return null;
    const W = 560, H = 120, pad = 44;
    const lo = stats.min, hi = stats.max;
    const span = hi! - lo! || 1;
    const x = (v: number) => pad + ((v - lo!) / span) * (W - 2 * pad);
    const midY = H / 2;
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => lo! + t * span);
    return { W, H, midY, x, ticks };
  }, [stats]);

  return (
    <ToolPageShell toolId="statistics-calculator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Statistics Calculator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80" htmlFor="st-input">
              Numbers <span className="font-normal text-muted-foreground">(comma, space or newline separated)</span>
            </label>
            <textarea
              id="st-input"
              rows={8}
              value={raw}
              onChange={(e) => { setRaw(e.target.value); setDone(false); }}
              placeholder="e.g. 12, 18, 21, 25, 30"
              className={INPUT}
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              {parsed.values.length} valid numbers
              {parsed.skipped > 0 && `, ${parsed.skipped} skipped (not numbers)`}
            </p>
          </div>
          <ActionButton disabled={!parsed.values.length || !trial.canUse} onClick={calculate}>
            <Sigma className="h-4 w-4" /> Calculate statistics
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free calculations left - everything runs in your browser.
            </p>
          )}
        </div>

        <div className="space-y-6 rounded-2xl border border-border bg-card p-5">
          {!show ? (
            <div className="flex h-full min-h-[360px] flex-col items-center justify-center text-center">
              <BarChart3 className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your statistics appear here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Mean, median, mode, standard deviation, quartiles and a box plot for any number list.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[
                  { k: "Count", v: String(stats.n) },
                  { k: "Mean", v: fmt(stats.mean) },
                  { k: "Median", v: fmt(stats!.median!) },
                  { k: "Mode", v: stats.modes.length ? stats.modes.map(fmt).join(", ") : "none" },
                  { k: "Std dev (sample)", v: fmt(stats.sampSd) },
                  { k: "Std dev (pop.)", v: fmt(stats.popSd) },
                  { k: "Variance (sample)", v: fmt(stats.sampVar) },
                  { k: "Min", v: fmt(stats!.min!) },
                  { k: "Max", v: fmt(stats!.max!) },
                  { k: "Range", v: fmt(stats.range) },
                  { k: "Q1 (25th %ile)", v: fmt(stats.q1) },
                  { k: "Q3 (75th %ile)", v: fmt(stats.q3) },
                  { k: "IQR", v: fmt(stats.iqr) },
                ].map(({ k, v }) => (
                  <div key={k} className="rounded-xl border border-border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">{k}</p>
                    <p className="mt-0.5 truncate font-mono text-sm font-bold" title={v}>{v}</p>
                  </div>
                ))}
              </div>

              {box && (
                <div>
                  <p className="mb-2 text-[13px] font-medium text-muted-foreground">Box plot</p>
                  <svg viewBox={`0 0 ${box.W} ${box.H}`} className="w-full rounded-xl border border-border bg-muted/20" role="img" aria-label="Box plot of the data">
                    {box.ticks.map((t) => (
                      <g key={t}>
                        <line x1={box.x(t)} y1={box.midY - 34} x2={box.x(t)} y2={box.midY + 34} stroke="currentColor" strokeOpacity="0.12" />
                        <text x={box.x(t)} y={box.H - 8} textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.6">{fmt(t)}</text>
                      </g>
                    ))}
                    <line x1={box.x(stats!.min!)} y1={box.midY} x2={box.x(stats.q1)} y2={box.midY} stroke="currentColor" strokeWidth="2" />
                    <line x1={box.x(stats.q3)} y1={box.midY} x2={box.x(stats!.max!)} y2={box.midY} stroke="currentColor" strokeWidth="2" />
                    <rect x={box.x(stats.q1)} y={box.midY - 26} width={Math.max(box.x(stats.q3) - box.x(stats.q1), 2)} height={52} fill="hsl(var(--primary))" fillOpacity="0.35" stroke="hsl(var(--primary))" strokeWidth="2" rx="4" />
                    <line x1={box.x(stats!.median!)} y1={box.midY - 26} x2={box.x(stats!.median!)} y2={box.midY + 26} stroke="hsl(var(--primary))" strokeWidth="3" />
                    <line x1={box.x(stats!.min!)} y1={box.midY - 12} x2={box.x(stats!.min!)} y2={box.midY + 12} stroke="currentColor" strokeWidth="2" />
                    <line x1={box.x(stats!.max!)} y1={box.midY - 12} x2={box.x(stats!.max!)} y2={box.midY + 12} stroke="currentColor" strokeWidth="2" />
                  </svg>
                  <p className="mt-1 text-xs text-muted-foreground">Whiskers show min and max; the box spans Q1 to Q3 with the median line.</p>
                </div>
              )}

              <button
                type="button"
                onClick={() => void copy()}
                className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold transition hover:border-primary/40"
              >
                <Copy className="h-4 w-4" /> Copy all statistics
              </button>
            </>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
