// /tools/ai-roi-calc - AI project ROI calculator: compare AI cost vs human labor
// cost, with annual savings, ROI %, break-even month and a 3-year projection.

import { useCallback, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Calculator, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/ai-roi-calc";
import toolSeoMeta from "@/lib/tool-seo-meta-data/ai-roi-calc";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/ai-roi-calc")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/ai-roi-calc";
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
  component: AiRoiCalc,
});

function Num({ label, value, onChange, min = 0, step = 1, prefix = "" }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; step?: number; prefix?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">{label}</label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{prefix}</span>}
        <input
          type="number" min={min} step={step} value={value}
          onChange={(e) => onChange(Math.max(min, Number(e.target.value) || 0))}
          className={`w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary ${prefix ? "pl-7" : ""}`}
        />
      </div>
    </div>
  );
}

function fmtMoney(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}k`;
  return `${sign}$${abs.toFixed(0)}`;
}

function AiRoiCalc() {
  const { isPro } = usePlan();
  const trial = useToolTrial("ai-roi-calc", isPro);
  const seo = toolSeo;

  const [people, setPeople] = useState(8);
  const [hoursPerWeek, setHoursPerWeek] = useState(5);
  const [hourlyCost, setHourlyCost] = useState(35);
  const [toolCost, setToolCost] = useState(200);
  const [setupCost, setSetupCost] = useState(2000);
  const [calculated, setCalculated] = useState(false);

  const r = useMemo(() => {
    const monthlyHours = people * hoursPerWeek * 4.33;
    const grossMonthly = monthlyHours * hourlyCost;
    const netMonthly = grossMonthly - toolCost;
    const annualNet = netMonthly * 12;
    const annualCost = toolCost * 12 + setupCost;
    const roi = annualCost > 0 ? (annualNet / annualCost) * 100 : 0;
    const breakEven = netMonthly > 0 ? setupCost / netMonthly : Infinity;
    const months = Array.from({ length: 36 }, (_, i) => i + 1);
    const savingsLine = months.map((m) => grossMonthly * m - setupCost);
    const costLine = months.map((m) => toolCost * m + setupCost);
    const max = Math.max(...savingsLine, ...costLine, 1);
    const min = Math.min(...savingsLine, ...costLine, 0);
    return { monthlyHours, grossMonthly, netMonthly, annualNet, annualCost, roi, breakEven, months, savingsLine, costLine, max, min };
  }, [people, hoursPerWeek, hourlyCost, toolCost, setupCost]);

  const calculate = useCallback(() => {
    if (!trial.canUse) return;
    setCalculated(true);
    trial.recordUse();
    toast.success("ROI calculated");
  }, [trial]);

  const stats = [
    { label: "Monthly hours saved", value: `${r.monthlyHours.toFixed(0)} hrs` },
    { label: "Monthly net savings", value: fmtMoney(r.netMonthly) },
    { label: "Annual net savings", value: fmtMoney(r.annualNet) },
    { label: "Annual ROI", value: `${r.roi >= 0 ? "+" : ""}${r.roi.toFixed(0)}%` },
    { label: "Break-even", value: r.breakEven === Infinity ? "Never" : r.breakEven < 1 ? "< 1 month" : `${r.breakEven.toFixed(1)} months` },
    { label: "Payback on setup", value: fmtMoney(setupCost > 0 ? setupCost : 0) },
  ];

  const chart = useMemo(() => {
    const Wc = 640; const Hc = 220; const P = 28;
    const x = (m: number) => P + ((m - 1) / 35) * (Wc - P * 2);
    const y = (v: number) => Hc - P - ((v - r.min) / (r.max - r.min)) * (Hc - P * 2);
    const line = (vals: number[]) => vals.map((v, i) => `${i === 0 ? "M" : "L"}${x(i + 1).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
    return { Wc, Hc, x, y, savings: line(r.savingsLine), cost: line(r.costLine) };
  }, [r]);

  return (
    <ToolPageShell toolId="ai-roi-calc" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="AI ROI Calculator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <Num label="People affected" value={people} onChange={setPeople} />
          <Num label="Hours saved per person per week" value={hoursPerWeek} onChange={setHoursPerWeek} step={0.5} />
          <Num label="Average hourly cost" value={hourlyCost} onChange={setHourlyCost} prefix="$" />
          <Num label="AI tool cost per month" value={toolCost} onChange={setToolCost} prefix="$" />
          <Num label="One-time setup cost" value={setupCost} onChange={setSetupCost} prefix="$" />
          <ActionButton disabled={!trial.canUse} onClick={calculate}>
            <Calculator className="h-4 w-4" /> Calculate ROI
          </ActionButton>
          <p className="text-xs text-muted-foreground">
            Estimates only: results depend on real adoption and task quality, which vary by team.
          </p>
        </div>

        <div className="space-y-5">
          {!calculated ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-border bg-card text-center">
              <TrendingUp className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your ROI breakdown appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Enter your numbers and hit Calculate ROI for savings, break-even and a 3-year projection.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {stats.map((s) => (
                  <div key={s.label} className="rounded-2xl border border-border bg-card p-4">
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="mt-1 text-xl font-extrabold">{s.value}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold">3-year cumulative projection</p>
                  <div className="flex gap-4 text-xs">
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Net savings</span>
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-400" /> Total cost</span>
                  </div>
                </div>
                <svg viewBox={`0 0 ${chart.Wc} ${chart.Hc}`} className="w-full">
                  <line x1={chart.x(1)} y1={chart.y(0)} x2={chart.x(36)} y2={chart.y(0)} stroke="currentColor" strokeOpacity="0.2" strokeDasharray="4 4" />
                  <path d={chart.cost} fill="none" stroke="#f87171" strokeWidth="2.5" />
                  <path d={chart.savings} fill="none" stroke="#10b981" strokeWidth="2.5" />
                  {r.breakEven !== Infinity && r.breakEven <= 36 && (
                    <line x1={chart.x(r.breakEven)} y1={28} x2={chart.x(r.breakEven)} y2={chart.Hc - 28} stroke="#f59e0b" strokeWidth="2" strokeDasharray="6 4" />
                  )}
                </svg>
                <p className="mt-2 text-xs text-muted-foreground">
                  The orange dashed line marks break-even. Everything after it is pure savings.
                </p>
              </div>

              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
                <p className="font-semibold">The bottom line</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {r.netMonthly > 0
                    ? `This AI setup pays for itself in ${r.breakEven < 1 ? "under a month" : `${r.breakEven.toFixed(1)} months`} and saves about ${fmtMoney(r.annualNet)} per year after costs.`
                    : "At these numbers the AI tool costs more than the labor it saves. Reduce the tool cost or target higher-value tasks."}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
