// /tools/bmi-calculator - Body mass index with metric and imperial
// inputs, category bands and a gauge. A screening tool, not medical
// advice. 100% in-browser.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClipboardCopy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/bmi-calculator")({
  head: () => {
    const seo = getToolSeoMeta("bmi-calculator");
    const canonical = "https://iconvault.site/tools/bmi-calculator";
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
  component: BmiTool,
});

const inputCls = "w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary";

const BANDS = [
  { label: "Underweight", min: 0, max: 18.5, color: "#38bdf8" },
  { label: "Normal", min: 18.5, max: 25, color: "#22c55e" },
  { label: "Overweight", min: 25, max: 30, color: "#f59e0b" },
  { label: "Obese", min: 30, max: 45, color: "#ef4444" },
];

function Gauge({ bmi }: { bmi: number }) {
  // Semicircle gauge from BMI 14 (left) to 40 (right)
  const MIN = 14;
  const MAX = 40;
  const clamped = Math.min(MAX, Math.max(MIN, bmi));
  const angle = Math.PI - ((clamped - MIN) / (MAX - MIN)) * Math.PI; // PI..0
  const cx = 130;
  const cy = 120;
  const r = 100;
  const nx = cx + r * Math.cos(angle);
  const ny = cy - r * Math.sin(angle);
  const segs = BANDS.map((b) => {
    const a0 = Math.PI - ((Math.max(MIN, b.min) - MIN) / (MAX - MIN)) * Math.PI;
    const a1 = Math.PI - ((Math.min(MAX, b.max) - MIN) / (MAX - MIN)) * Math.PI;
    const x0 = cx + (r + 18) * Math.cos(a0);
    const y0 = cy - (r + 18) * Math.sin(a0);
    const x1 = cx + (r + 18) * Math.cos(a1);
    const y1 = cy - (r + 18) * Math.sin(a1);
    return { d: `M ${x0} ${y0} A ${r + 18} ${r + 18} 0 0 1 ${x1} ${y1}`, color: b.color, label: b.label };
  });
  return (
    <svg viewBox="0 0 260 140" className="w-full max-w-[420px]" role="img" aria-label={`BMI gauge showing ${bmi.toFixed(1)}`}>
      {segs.map((s) => (
        <path key={s.label} d={s.d} stroke={s.color} strokeWidth={16} fill="none" strokeLinecap="butt" />
      ))}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={6} className="fill-foreground" />
      <text x={cx} y={cy + 28} textAnchor="middle" className="fill-foreground font-mono" fontSize={30} fontWeight={800}>
        {bmi.toFixed(1)}
      </text>
      <text x={cx} y={cy + 46} textAnchor="middle" className="fill-muted-foreground" fontSize={11}>
        BMI kg/m2
      </text>
    </svg>
  );
}

function BmiTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("bmi-calculator", isPro);
  const seo = getToolSeo("bmi-calculator");

  const [unit, setUnit] = useState<"metric" | "imperial">("metric");
  const [height, setHeight] = useState("175");
  const [weight, setWeight] = useState("70");

  const calc = useMemo(() => {
    const H = parseFloat(height);
    const W = parseFloat(weight);
    if (!isFinite(H) || !isFinite(W) || H <= 0 || W <= 0) return null;
    let bmi: number;
    if (unit === "metric") {
      if (H < 50 || H > 272 || W < 2 || W > 635) return null;
      bmi = W / Math.pow(H / 100, 2);
    } else {
      if (H < 20 || H > 107 || W < 4 || W > 1400) return null;
      bmi = (703 * W) / (H * H);
    }
    if (!isFinite(bmi)) return null;
    const band = BANDS.find((b) => bmi >= b.min && bmi < b.max) ?? BANDS[BANDS.length - 1];
    const healthyW =
      unit === "metric"
        ? { min: 18.5 * Math.pow(H / 100, 2), max: 24.9 * Math.pow(H / 100, 2), unit: "kg" }
        : { min: (18.5 * H * H) / 703, max: (24.9 * H * H) / 703, unit: "lb" };
    return { bmi, band, healthyW };
  }, [height, weight, unit]);

  const copyResult = async () => {
    if (!trial.canUse) {
      toast.error(`Free trial used up - ${TOOL_TRIAL_LIMIT} copies per tool. Go Pro for unlimited.`);
      return;
    }
    if (!calc) {
      toast.error("Enter valid height and weight first.");
      return;
    }
    const text = [
      "BMI result",
      `BMI: ${calc.bmi.toFixed(1)} (${calc.band!.label})`,
      `Healthy range for this height: ${calc.healthyW.min.toFixed(1)}-${calc.healthyW.max.toFixed(1)} ${calc.healthyW.unit}`,
      "Screening tool only - not medical advice.",
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      trial.recordUse();
      toast.success("Result copied");
    } catch {
      toast.error("Copy failed - select and copy manually.");
    }
  };

  return (
    <ToolPageShell toolId="bmi-calculator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="BMI Calculator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Units</p>
            <div className="grid grid-cols-2 gap-2">
              {(["metric", "imperial"] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnit(u)}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-sm font-bold capitalize transition",
                    unit === u ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {u === "metric" ? "Metric" : "Imperial"}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80" htmlFor="bmi-h">
                Height ({unit === "metric" ? "cm" : "in"})
              </label>
              <input id="bmi-h" value={height} onChange={(e) => setHeight(e.target.value)} inputMode="decimal" className={inputCls} />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80" htmlFor="bmi-w">
                Weight ({unit === "metric" ? "kg" : "lb"})
              </label>
              <input id="bmi-w" value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="decimal" className={inputCls} />
            </div>
          </div>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left - runs fully on your device.
            </p>
          )}
        </div>

        <div className="space-y-5">
          {!calc ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-border bg-card p-5 text-center">
              <p className="font-semibold">Enter your height and weight</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">Your BMI, category and healthy weight range will appear here.</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-5">
                <Gauge bmi={calc.bmi} />
                <div className="flex items-center gap-3">
                  <span className="inline-block h-3 w-3 rounded-full" style={{ background: calc.band!.color }} />
                  <p className="text-lg font-bold">{calc.band!.label}</p>
                  <button
                    type="button"
                    onClick={copyResult}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold hover:border-primary/40"
                  >
                    <ClipboardCopy className="h-3.5 w-3.5" /> Copy result
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <p className="mb-3 text-[13px] font-medium text-foreground/80">Reference ranges (adults)</p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {BANDS.map((b) => (
                    <div
                      key={b.label}
                      className={cn(
                        "rounded-xl border p-3",
                        calc.band!.label === b.label ? "border-primary bg-primary/5" : "border-border",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: b.color }} />
                        <p className="text-sm font-bold">{b.label}</p>
                      </div>
                      <p className="mt-1 font-mono text-xs text-muted-foreground">
                        {b.min} - {b.max === 45 ? "45+" : b.max}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 font-mono text-sm">
                  Healthy weight for your height: <span className="font-bold text-primary">{calc.healthyW.min.toFixed(1)} - {calc.healthyW.max.toFixed(1)} {calc.healthyW.unit}</span>
                </p>
                <p className="mt-3 rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
                  BMI is a screening tool, not a diagnosis - it does not account for muscle mass, bone density or body
                  composition. Talk to a health professional before making decisions based on this number.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
