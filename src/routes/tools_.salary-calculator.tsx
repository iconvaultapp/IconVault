// /tools/salary-calculator - Convert hourly wage to annual, monthly and
// weekly pay, with overtime and an editable after-tax estimate.
// This is a rough planning estimate, not tax advice. 100% in-browser.

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

export const Route = createFileRoute("/tools_/salary-calculator")({
  head: () => {
    const seo = getToolSeoMeta("salary-calculator");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: SalaryTool,
});

const inputCls = "w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary";

function money(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function SalaryTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("salary-calculator", isPro);
  const seo = getToolSeo("salary-calculator");

  const [wage, setWage] = useState("25");
  const [hours, setHours] = useState("40");
  const [overtimeOn, setOvertimeOn] = useState(false);
  const [otHours, setOtHours] = useState("5");
  const [otRate, setOtRate] = useState("1.5");
  const [taxRate, setTaxRate] = useState("22");

  const calc = useMemo(() => {
    const W = parseFloat(wage);
    const H = parseFloat(hours);
    const OT = parseFloat(otHours) || 0;
    const OR = parseFloat(otRate) || 1.5;
    const T = parseFloat(taxRate);
    if (!isFinite(W) || !isFinite(H) || W <= 0 || H <= 0 || H > 168) return null;
    if (overtimeOn && (!isFinite(OT) || OT < 0 || !isFinite(OR) || OR < 1)) return null;
    if (!isFinite(T) || T < 0 || T > 100) return null;
    const weekly = overtimeOn ? W * H + W * OR * OT : W * H;
    const annual = weekly * 52;
    const monthly = annual / 12;
    const afterTaxAnnual = annual * (1 - T / 100);
    return { weekly, annual, monthly, afterTaxAnnual, afterTaxMonthly: afterTaxAnnual / 12 };
  }, [wage, hours, overtimeOn, otHours, otRate, taxRate]);

  const copyBreakdown = async () => {
    if (!trial.canUse) {
      toast.error(`Free trial used up - ${TOOL_TRIAL_LIMIT} copies per tool. Go Pro for unlimited.`);
      return;
    }
    if (!calc) {
      toast.error("Enter valid numbers first.");
      return;
    }
    const text = [
      "Salary breakdown",
      `Hourly: ${money(parseFloat(wage))} x ${hours}h/week${overtimeOn ? ` + ${otHours}h overtime at ${otRate}x` : ""}`,
      `Weekly gross: ${money(calc.weekly)}`,
      `Monthly gross: ${money(calc.monthly)}`,
      `Annual gross: ${money(calc.annual)}`,
      `Annual after-tax (est, ${taxRate}%): ${money(calc.afterTaxAnnual)}`,
      "Estimate only - not tax advice.",
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      trial.recordUse();
      toast.success("Breakdown copied");
    } catch {
      toast.error("Copy failed - select and copy manually.");
    }
  };

  return (
    <ToolPageShell toolId="salary-calculator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Salary Calculator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80" htmlFor="sl-wage">Hourly wage</label>
              <input id="sl-wage" value={wage} onChange={(e) => setWage(e.target.value)} inputMode="decimal" className={inputCls} />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80" htmlFor="sl-hours">Hours / week</label>
              <input id="sl-hours" value={hours} onChange={(e) => setHours(e.target.value)} inputMode="decimal" className={inputCls} />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <button
              type="button"
              onClick={() => setOvertimeOn((v) => !v)}
              className="flex w-full items-center justify-between"
              aria-pressed={overtimeOn}
            >
              <span className="text-[13px] font-medium text-foreground/80">Overtime hours</span>
              <span className={cn(
                "relative h-6 w-11 rounded-full transition",
                overtimeOn ? "bg-primary" : "bg-muted",
              )}>
                <span className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                  overtimeOn ? "left-[22px]" : "left-0.5",
                )} />
              </span>
            </button>
            {overtimeOn && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-foreground/80" htmlFor="sl-ot">OT hours / week</label>
                  <input id="sl-ot" value={otHours} onChange={(e) => setOtHours(e.target.value)} inputMode="decimal" className={inputCls} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-foreground/80" htmlFor="sl-otr">OT multiplier</label>
                  <input id="sl-otr" value={otRate} onChange={(e) => setOtRate(e.target.value)} inputMode="decimal" className={inputCls} />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80" htmlFor="sl-tax">Effective tax rate %</label>
            <input id="sl-tax" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} inputMode="decimal" className={inputCls} />
            <p className="mt-1.5 text-xs text-muted-foreground">A flat rate is a rough estimate - real taxes are progressive and vary by location.</p>
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
              <p className="font-semibold">Enter your wage and hours</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">Weekly, monthly, annual and after-tax pay will appear here.</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: "Weekly gross", value: money(calc.weekly) },
                  { label: "Monthly gross", value: money(calc.monthly) },
                  { label: "Annual gross", value: money(calc.annual), accent: true },
                  { label: `After-tax / yr (${taxRate}%)`, value: money(calc.afterTaxAnnual) },
                ].map((s) => (
                  <div key={s.label} className="rounded-2xl border border-border bg-card p-4">
                    <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
                    <p className={cn("mt-1 font-mono text-2xl font-bold", s.accent ? "text-primary" : "")}>{s.value}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[13px] font-medium text-foreground/80">Breakdown</p>
                  <button
                    type="button"
                    onClick={copyBreakdown}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold hover:border-primary/40"
                  >
                    <ClipboardCopy className="h-3.5 w-3.5" /> Copy breakdown
                  </button>
                </div>
                <div className="space-y-1.5 font-mono text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Annual gross</span><span>{money(calc.annual)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Less estimated tax ({taxRate}%)</span><span>-{money(calc.annual - calc.afterTaxAnnual)}</span></div>
                  <div className="flex justify-between border-t border-border pt-1.5 font-bold"><span>Annual take-home (est)</span><span className="text-primary">{money(calc.afterTaxAnnual)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Monthly take-home (est)</span><span>{money(calc.afterTaxMonthly)}</span></div>
                </div>
                <p className="mt-3 rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
                  This is a rough planning estimate using a flat rate, not tax advice. Real take-home pay depends on brackets,
                  state and local taxes, deductions, benefits and pre-tax contributions.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
