// /tools/rent-vs-buy - Compare renting vs buying over time: cumulative
// costs, break-even year and a canvas line chart. 100% in-browser.

import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClipboardCopy } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/rent-vs-buy";
import toolSeoMeta from "@/lib/tool-seo-meta-data/rent-vs-buy";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/rent-vs-buy")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/rent-vs-buy";
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
  component: RentVsBuyTool,
});

const inputCls = "w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary";

function money(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

// Simplified model:
// Rent: monthly rent growing 3%/yr, cumulative.
// Buy: down payment + mortgage payment (P&I) + ownership costs (2.5% of value/yr,
//   taxes+insurance+maintenance) minus equity (down + principal repaid + 3% appreciation).
// Net buy cost = total cash paid - equity built. Break-even = first year buy <= rent.
function compare(
  rent: number,
  price: number,
  downPct: number,
  annualRate: number,
  years: number,
) {
  const down = (price * downPct) / 100;
  const loan = price - down;
  const r = annualRate / 100 / 12;
  const n = years * 12;
  const monthly = r === 0 ? loan / n : (loan * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const rows: { year: number; rentCost: number; buyCost: number }[] = [];
  let rentCumulative = 0;
  let buyCashPaid = down;
  let balance = loan;
  let breakEven: number | null = null;
  for (let y = 1; y <= years; y++) {
    const yearRent = rent * 12 * Math.pow(1.03, y - 1);
    rentCumulative += yearRent;
    const homeValue = price * Math.pow(1.03, y);
    const ownership = homeValue * 0.025;
    for (let m = 0; m < 12; m++) {
      const interest = balance * r;
      const principal = Math.min(monthly - interest, balance);
      balance -= principal;
      buyCashPaid += monthly;
    }
    buyCashPaid += ownership;
    const equity = down + (loan - Math.max(0, balance)) + (homeValue - price);
    const buyCost = buyCashPaid - equity;
    rows.push({ year: y, rentCost: rentCumulative, buyCost });
    if (breakEven === null && buyCost <= rentCumulative) breakEven = y;
  }
  return { rows, breakEven, down, monthly };
}

function Chart({ rows, breakEven }: { rows: { year: number; rentCost: number; buyCost: number }[]; breakEven: number | null }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || rows.length === 0) return;
    const dpr = window.devicePixelRatio || 1;
    const W = 680;
    const H = 300;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = "100%";
    canvas.style.height = "auto";
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);
    const pad = { l: 56, r: 14, t: 14, b: 28 };
    const iw = W - pad.l - pad.r;
    const ih = H - pad.t - pad.b;
    const all = rows.flatMap((r) => [r.rentCost, r.buyCost]);
    const maxY = Math.max(...all) * 1.05;
    const minY = Math.min(0, Math.min(...all));
    const X = (i: number) => pad.l + (iw * i) / Math.max(1, rows.length - 1);
    const Y = (v: number) => pad.t + ih - ((v - minY) / (maxY - minY)) * ih;
    const isDark = document.documentElement.classList.contains("dark");
    const grid = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
    const label = isDark ? "#a1a1aa" : "#71717a";
    ctx.font = "10px ui-monospace, monospace";
    for (let g = 0; g <= 4; g++) {
      const y = pad.t + (ih * g) / 4;
      ctx.strokeStyle = grid;
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(W - pad.r, y);
      ctx.stroke();
      const val = maxY - ((maxY - minY) * g) / 4;
      ctx.fillStyle = label;
      ctx.fillText(val >= 1000 ? `$${Math.round(val / 1000)}k` : `$${Math.round(val)}`, 4, y + 3);
    }
    rows.forEach((row, i) => {
      if (i % Math.ceil(rows.length / 12) === 0 || i === rows.length - 1) {
        ctx.fillStyle = label;
        ctx.fillText(`Y${row.year}`, X(i) - 6, pad.t + ih + 16);
      }
    });
    const line = (key: "rentCost" | "buyCost", color: string) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      rows.forEach((row, i) => {
        const x = X(i);
        const y = Y(row[key]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.lineWidth = 1;
    };
    line("rentCost", "#f59e0b");
    line("buyCost", "#0d9488");
    if (breakEven !== null) {
      const i = breakEven - 1;
      ctx.strokeStyle = isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.3)";
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(X(i), pad.t);
      ctx.lineTo(X(i), pad.t + ih);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = label;
      ctx.fillText(`Break-even Y${breakEven}`, Math.min(X(i) + 6, W - 110), pad.t + 12);
    }
    // legend
    const legend = (x: number, color: string, text: string) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, H - 8);
      ctx.lineTo(x + 22, H - 8);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.fillStyle = label;
      ctx.fillText(text, x + 26, H - 4);
    };
    legend(pad.l, "#0d9488", "Buy (net cost)");
    legend(pad.l + 118, "#f59e0b", "Rent (cumulative)");
  }, [rows, breakEven]);
  return <canvas ref={ref} className="w-full" role="img" aria-label="Rent vs buy cumulative cost chart" />;
}

function RentVsBuyTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("rent-vs-buy", isPro);
  const seo = toolSeo;

  const [rent, setRent] = useState("1800");
  const [price, setPrice] = useState("350000");
  const [downPct, setDownPct] = useState("20");
  const [rate, setRate] = useState("6.5");
  const [years, setYears] = useState("15");

  const calc = useMemo(() => {
    const R = parseFloat(rent);
    const P = parseFloat(price);
    const D = parseFloat(downPct);
    const A = parseFloat(rate);
    const Y = Math.round(parseFloat(years));
    if (!isFinite(R) || !isFinite(P) || !isFinite(D) || !isFinite(A) || !isFinite(Y)) return null;
    if (R <= 0 || P <= 0 || Y <= 0 || Y > 50 || D < 0 || D > 100 || A < 0) return null;
    return compare(R, P, D, A, Y);
  }, [rent, price, downPct, rate, years]);

  const last = calc?.rows[calc.rows.length - 1];

  const copyComparison = async () => {
    if (!trial.canUse) {
      toast.error(`Free trial used up - ${TOOL_TRIAL_LIMIT} copies per tool. Go Pro for unlimited.`);
      return;
    }
    if (!calc || !last) {
      toast.error("Enter valid numbers first.");
      return;
    }
    const text = [
      "Rent vs Buy comparison",
      `Rent: ${money(parseFloat(rent))}/mo | Home: ${money(parseFloat(price))} | Down: ${downPct}% | Rate: ${rate}%`,
      `After ${years} years:`,
      `  Rent total: ${money(last.rentCost)}`,
      `  Buy net cost: ${money(last.buyCost)}`,
      calc.breakEven ? `  Break-even year: ${calc.breakEven}` : "  Buying does not break even in this horizon",
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      trial.recordUse();
      toast.success("Comparison copied");
    } catch {
      toast.error("Copy failed - select and copy manually.");
    }
  };

  return (
    <ToolPageShell toolId="rent-vs-buy" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Rent vs Buy" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80" htmlFor="rb-rent">Monthly rent</label>
            <input id="rb-rent" value={rent} onChange={(e) => setRent(e.target.value)} inputMode="decimal" className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80" htmlFor="rb-price">Home price</label>
            <input id="rb-price" value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80" htmlFor="rb-down">Down payment %</label>
              <input id="rb-down" value={downPct} onChange={(e) => setDownPct(e.target.value)} inputMode="decimal" className={inputCls} />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80" htmlFor="rb-rate">Mortgage rate %</label>
              <input id="rb-rate" value={rate} onChange={(e) => setRate(e.target.value)} inputMode="decimal" className={inputCls} />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80" htmlFor="rb-years">Compare years (1-50)</label>
            <input id="rb-years" value={years} onChange={(e) => setYears(e.target.value)} inputMode="decimal" className={inputCls} />
          </div>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left - runs fully on your device.
            </p>
          )}
        </div>

        <div className="space-y-5">
          {!calc || !last ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-border bg-card p-5 text-center">
              <p className="font-semibold">Enter rent and home details</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">The break-even year and cost curves will appear here.</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-border bg-card p-4">
                  <p className="text-xs font-medium text-muted-foreground">Break-even year</p>
                  <p className="mt-1 font-mono text-2xl font-bold text-primary">
                    {calc.breakEven ? `Year ${calc.breakEven}` : "Never"}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-4">
                  <p className="text-xs font-medium text-muted-foreground">Rent total (all years)</p>
                  <p className="mt-1 font-mono text-2xl font-bold">{money(last.rentCost)}</p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-4">
                  <p className="text-xs font-medium text-muted-foreground">Buy net cost (all years)</p>
                  <p className="mt-1 font-mono text-2xl font-bold">{money(last.buyCost)}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[13px] font-medium text-foreground/80">Cumulative cost over time</p>
                  <button
                    type="button"
                    onClick={copyComparison}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold hover:border-primary/40"
                  >
                    <ClipboardCopy className="h-3.5 w-3.5" /> Copy comparison
                  </button>
                </div>
                <Chart rows={calc.rows} breakEven={calc.breakEven} />
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <p className="mb-2 text-[13px] font-medium text-foreground/80">Assumptions</p>
                <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                  <li>Rent rises 3% per year; home value appreciates 3% per year.</li>
                  <li>Ownership costs (taxes, insurance, maintenance) run about 2.5% of the home value per year.</li>
                  <li>Buy net cost = cash paid (down payment + mortgage + ownership) minus equity (down + principal repaid + appreciation).</li>
                  <li>Simplified on purpose - closing costs, selling fees, tax deductions and investment returns on the down payment are not modeled.</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
