// /tools/mortgage-calculator - Monthly payment, total interest, yearly
// amortization table, extra-payment modeling and a principal-vs-interest
// chart. 100% in-browser.

import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClipboardCopy } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/mortgage-calculator")({
  head: () => {
    const seo = getToolSeoMeta("mortgage-calculator");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: MortgageTool,
});

const inputCls = "w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary";

function money(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

interface YearRow {
  year: number;
  principal: number;
  interest: number;
  balance: number;
}

function amortize(loan: number, annualRate: number, years: number, extraMonthly: number) {
  const r = annualRate / 100 / 12;
  const n = Math.round(years * 12);
  const base = r === 0 ? loan / n : (loan * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const rows: YearRow[] = [];
  let balance = loan;
  let totalInterest = 0;
  let months = 0;
  let pYear = 0;
  let iYear = 0;
  while (balance > 0.005 && months < n + 1200) {
    const interest = balance * r;
    let payment = base + extraMonthly;
    if (payment > balance + interest) payment = balance + interest;
    const principal = payment - interest;
    balance -= principal;
    totalInterest += interest;
    pYear += principal;
    iYear += interest;
    months += 1;
    if (months % 12 === 0 || balance <= 0.005) {
      rows.push({ year: Math.ceil(months / 12), principal: pYear, interest: iYear, balance: Math.max(0, balance) });
      pYear = 0;
      iYear = 0;
    }
  }
  return { baseMonthly: base, monthly: base + extraMonthly, totalInterest, totalPaid: loan + totalInterest, months, rows };
}

function Chart({ rows }: { rows: YearRow[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || rows.length === 0) return;
    const dpr = window.devicePixelRatio || 1;
    const W = 640;
    const H = 260;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = "100%";
    canvas.style.height = "auto";
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);
    const pad = { l: 44, r: 12, t: 14, b: 26 };
    const iw = W - pad.l - pad.r;
    const ih = H - pad.t - pad.b;
    const maxY = Math.max(...rows.map((r) => r.principal + r.interest));
    const bw = Math.min(28, (iw / rows.length) * 0.55);
    const step = iw / rows.length;
    const isDark = document.documentElement.classList.contains("dark");
    const grid = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
    const label = isDark ? "#a1a1aa" : "#71717a";
    ctx.font = "10px ui-monospace, monospace";
    ctx.fillStyle = label;
    for (let g = 0; g <= 4; g++) {
      const y = pad.t + (ih * g) / 4;
      ctx.strokeStyle = grid;
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(W - pad.r, y);
      ctx.stroke();
      const val = (maxY * (4 - g)) / 4;
      ctx.fillText(val >= 1000 ? `${Math.round(val / 1000)}k` : String(Math.round(val)), 4, y + 3);
    }
    rows.forEach((row, i) => {
      const x = pad.l + step * i + (step - bw) / 2;
      const ph = (row.principal / maxY) * ih;
      const ihh = (row.interest / maxY) * ih;
      const yBase = pad.t + ih;
      ctx.fillStyle = "#0d9488";
      ctx.fillRect(x, yBase - ph, bw, ph);
      ctx.fillStyle = "#f59e0b";
      ctx.fillRect(x, yBase - ph - ihh, bw, ihh);
      if (rows.length <= 30 && (i % Math.ceil(rows.length / 12) === 0 || i === rows.length - 1)) {
        ctx.fillStyle = label;
        ctx.fillText(`Y${row.year}`, x, yBase + 16);
      }
    });
    // legend
    ctx.fillStyle = "#0d9488";
    ctx.fillRect(pad.l, H - 8, 10, 10);
    ctx.fillStyle = label;
    ctx.fillText("Principal", pad.l + 14, H + 0);
    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(pad.l + 82, H - 8, 10, 10);
    ctx.fillStyle = label;
    ctx.fillText("Interest", pad.l + 96, H + 0);
  }, [rows]);
  return <canvas ref={ref} className="w-full" role="img" aria-label="Principal vs interest per year" />;
}

function MortgageTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("mortgage-calculator", isPro);
  const seo = getToolSeo("mortgage-calculator");

  const [loan, setLoan] = useState("350000");
  const [rate, setRate] = useState("6.5");
  const [term, setTerm] = useState("30");
  const [extra, setExtra] = useState("0");

  const calc = useMemo(() => {
    const L = parseFloat(loan);
    const R = parseFloat(rate);
    const T = parseFloat(term);
    const E = parseFloat(extra) || 0;
    if (!isFinite(L) || !isFinite(R) || !isFinite(T) || L <= 0 || T <= 0 || R < 0 || E < 0) return null;
    return amortize(L, R, T, E);
  }, [loan, rate, term, extra]);

  const payoffYear = calc ? Math.ceil(calc.months / 12) : 0;

  const copySummary = async () => {
    if (!trial.canUse) {
      toast.error(`Free trial used up - ${TOOL_TRIAL_LIMIT} copies per tool. Go Pro for unlimited.`);
      return;
    }
    if (!calc) {
      toast.error("Enter a valid loan first.");
      return;
    }
    const text = [
      "Mortgage summary",
      `Loan: ${money(parseFloat(loan))} at ${rate}% for ${term} years`,
      `Monthly payment: ${money(calc.monthly)}${parseFloat(extra) > 0 ? ` (includes ${money(parseFloat(extra))} extra)` : ""}`,
      `Total interest: ${money(calc.totalInterest)}`,
      `Total paid: ${money(calc.totalPaid)}`,
      `Payoff: ${Math.floor(calc.months / 12)}y ${calc.months % 12}m`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      trial.recordUse();
      toast.success("Summary copied");
    } catch {
      toast.error("Copy failed - select and copy manually.");
    }
  };

  return (
    <ToolPageShell toolId="mortgage-calculator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Mortgage Calculator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80" htmlFor="mg-loan">Loan amount</label>
            <input id="mg-loan" value={loan} onChange={(e) => setLoan(e.target.value)} inputMode="decimal" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80" htmlFor="mg-rate">Rate %</label>
              <input id="mg-rate" value={rate} onChange={(e) => setRate(e.target.value)} inputMode="decimal" className={inputCls} />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80" htmlFor="mg-term">Term (years)</label>
              <input id="mg-term" value={term} onChange={(e) => setTerm(e.target.value)} inputMode="decimal" className={inputCls} />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80" htmlFor="mg-extra">Extra monthly payment</label>
            <input id="mg-extra" value={extra} onChange={(e) => setExtra(e.target.value)} inputMode="decimal" className={inputCls} />
            <p className="mt-1.5 text-xs text-muted-foreground">Watch the interest bar shrink as you add extra payments.</p>
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
              <p className="font-semibold">Enter your loan details</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">Monthly payment, interest totals, the yearly schedule and chart will appear here.</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: "Monthly payment", value: money(calc.monthly), accent: true },
                  { label: "Total interest", value: money(calc.totalInterest) },
                  { label: "Total of payments", value: money(calc.totalPaid) },
                  { label: "Payoff in", value: `${Math.floor(calc.months / 12)}y ${calc.months % 12}m` },
                ].map((s) => (
                  <div key={s.label} className="rounded-2xl border border-border bg-card p-4">
                    <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
                    <p className={`mt-1 font-mono text-2xl font-bold ${s.accent ? "text-primary" : ""}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <p className="mb-3 text-[13px] font-medium text-foreground/80">Principal vs interest per year</p>
                <Chart rows={calc.rows} />
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[13px] font-medium text-foreground/80">Yearly amortization schedule</p>
                  <button
                    type="button"
                    onClick={copySummary}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold hover:border-primary/40"
                  >
                    <ClipboardCopy className="h-3.5 w-3.5" /> Copy summary
                  </button>
                </div>
                <div className="max-h-[320px] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-card">
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th className="py-2 pr-4 font-medium">Year</th>
                        <th className="py-2 pr-4 text-right font-medium">Principal</th>
                        <th className="py-2 pr-4 text-right font-medium">Interest</th>
                        <th className="py-2 text-right font-medium">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono">
                      {calc.rows.map((row) => (
                        <tr key={row.year} className="border-b border-border/50">
                          <td className="py-1.5 pr-4">{row.year}</td>
                          <td className="py-1.5 pr-4 text-right">{money(row.principal)}</td>
                          <td className="py-1.5 pr-4 text-right">{money(row.interest)}</td>
                          <td className="py-1.5 text-right">{money(row.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Full payoff in year {payoffYear}. This is a planning estimate - taxes, insurance, HOA and fees are not included.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
