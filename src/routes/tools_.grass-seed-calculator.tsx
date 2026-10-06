// /tools/grass-seed-calculator - Work out how much grass seed a lawn needs,
// for new lawns and overseeding. 100% in-browser.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Sprout } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/grass-seed-calculator";
import toolSeoMeta from "@/lib/tool-seo-meta-data/grass-seed-calculator";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/grass-seed-calculator")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/grass-seed-calculator";
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
  component: SeedTool,
});

const inputCls =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary/60";

const BAG_SIZES = [5, 10, 25, 50];

function num(v: string): number {
  const n = parseFloat(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function SeedTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("grass-seed-calculator", isPro);
  const seo = toolSeo;

  const [mode, setMode] = useState<"dims" | "acres">("dims");
  const [length, setLength] = useState("40");
  const [width, setWidth] = useState("30");
  const [acres, setAcres] = useState("0.25");
  const [job, setJob] = useState<"new" | "overseed">("new");
  const [rate, setRate] = useState("8");
  const [bagSize, setBagSize] = useState(25);

  const result = useMemo(() => {
    const sqft = mode === "dims" ? num(length) * num(width) : num(acres) * 43560;
    const rateN = num(rate);
    if (sqft <= 0 || rateN <= 0) return null;
    const pounds = (sqft / 1000) * rateN;
    const bags = Math.ceil(pounds / bagSize);
    return { sqft, pounds, bags, rateN };
  }, [mode, length, width, acres, rate, bagSize]);

  const setJobWithDefault = (j: "new" | "overseed") => {
    setJob(j);
    setRate(j === "new" ? "8" : "4");
  };

  const copyResult = async () => {
    if (!result || !trial.canUse) return;
    const text =
      `Grass seed estimate (${job === "new" ? "new lawn" : "overseeding"})\n` +
      `Lawn area: ${Math.round(result.sqft).toLocaleString()} sq ft\n` +
      `Rate: ${result.rateN} lbs per 1,000 sq ft\n` +
      `Seed needed: ${result.pounds.toFixed(1)} lbs\n` +
      `Bags to buy: ${result.bags} x ${bagSize} lb bag(s)`;
    try {
      await navigator.clipboard.writeText(text);
      trial.recordUse();
      toast.success("Estimate copied to clipboard");
    } catch {
      toast.error("Could not copy - your browser blocked clipboard access");
    }
  };

  return (
    <ToolPageShell toolId="grass-seed-calculator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Grass Seed Calculator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Lawn area</p>
            <div className="mb-3 flex gap-2">
              {(["dims", "acres"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn(
                    "flex-1 rounded-xl border px-3 py-2 text-sm font-bold transition",
                    mode === m
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {m === "dims" ? "Length x Width" : "Acres"}
                </button>
              ))}
            </div>
            {mode === "dims" ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input type="number" min={0} value={length} onChange={(e) => setLength(e.target.value)} className={inputCls} aria-label="Length in feet" placeholder="Length" />
                  <p className="mt-1 text-xs text-muted-foreground">Length (ft)</p>
                </div>
                <div>
                  <input type="number" min={0} value={width} onChange={(e) => setWidth(e.target.value)} className={inputCls} aria-label="Width in feet" placeholder="Width" />
                  <p className="mt-1 text-xs text-muted-foreground">Width (ft)</p>
                </div>
              </div>
            ) : (
              <div>
                <input type="number" min={0} step={0.01} value={acres} onChange={(e) => setAcres(e.target.value)} className={inputCls} aria-label="Acres" placeholder="Acres" />
                <p className="mt-1 text-xs text-muted-foreground">1 acre = 43,560 sq ft</p>
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Job type</p>
            <div className="flex gap-2">
              {(["new", "overseed"] as const).map((j) => (
                <button
                  key={j}
                  type="button"
                  onClick={() => setJobWithDefault(j)}
                  className={cn(
                    "flex-1 rounded-xl border px-3 py-2 text-sm font-bold transition",
                    job === j
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {j === "new" ? "New lawn" : "Overseeding"}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              New lawns take roughly 5 to 10 lbs per 1,000 sq ft; overseeding takes about half that.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">
              Seed rate (lbs per 1,000 sq ft)
            </label>
            <input type="number" min={0} step={0.5} value={rate} onChange={(e) => setRate(e.target.value)} className={inputCls} />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Adjust to match your seed bag. Fine fescue and rye blends often list their own rate.
            </p>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Bag size</p>
            <div className="flex flex-wrap gap-2">
              {BAG_SIZES.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBagSize(b)}
                  className={cn(
                    "rounded-xl border px-4 py-2 text-sm font-bold transition",
                    bagSize === b
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {b} lb
                </button>
              ))}
            </div>
          </div>

          <ActionButton busy={false} disabled={!result || !trial.canUse} onClick={copyResult}>
            <Copy className="h-4 w-4" /> Copy estimate
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left - everything runs on your device.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {!result ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <Sprout className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your seed estimate appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Enter your lawn size and whether you are starting fresh or thickening an existing lawn.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-xl bg-primary/5 p-5 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Seed needed
                </p>
                <p className="mt-1 text-3xl font-extrabold text-primary">
                  {result.pounds.toFixed(1)} <span className="text-lg font-semibold">lbs</span>
                </p>
                <p className="mt-0.5 text-sm font-medium text-foreground/70">
                  Buy {result.bags} x {bagSize} lb bag{result.bags === 1 ? "" : "s"} (rounded up)
                </p>
              </div>

              <dl className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-border p-4">
                  <dt className="text-xs text-muted-foreground">Lawn area</dt>
                  <dd className="mt-1 text-xl font-bold tabular-nums">
                    {Math.round(result.sqft).toLocaleString()} sq ft
                  </dd>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <dt className="text-xs text-muted-foreground">Rate</dt>
                  <dd className="mt-1 text-xl font-bold tabular-nums">{result.rateN} lbs / 1k sq ft</dd>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <dt className="text-xs text-muted-foreground">Total seed</dt>
                  <dd className="mt-1 text-xl font-bold tabular-nums">{result.pounds.toFixed(1)} lbs</dd>
                </div>
              </dl>

              <p className="text-xs text-muted-foreground">
                Irregular lawns: measure in rectangles and add the pieces together. Keep the seed
                bag label as the final word, since coated or blended seed rates differ.
              </p>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
