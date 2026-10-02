// /tools/percentage-calculator - X% of Y, X is what % of Y, and percent
// change (increase / decrease), with live results. 100% in-browser.

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

export const Route = createFileRoute("/tools_/percentage-calculator")({
  head: () => {
    const seo = getToolSeoMeta("percentage-calculator");
    const canonical = "https://iconvault.site/tools/percentage-calculator";
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
  component: PercentageTool,
});

const inputCls = "w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary";

type Mode = "of" | "what" | "change";

const MODES: { id: Mode; label: string }[] = [
  { id: "of", label: "X% of Y" },
  { id: "what", label: "X is what % of Y" },
  { id: "change", label: "Percent change" },
];

function fmt(n: number): string {
  if (!isFinite(n)) return "-";
  if (Number.isInteger(n)) return n.toLocaleString("en-US");
  return n.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

function PercentageTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("percentage-calculator", isPro);
  const seo = getToolSeo("percentage-calculator");

  const [mode, setMode] = useState<Mode>("of");
  const [a, setA] = useState("20");
  const [b, setB] = useState("150");

  const result = useMemo(() => {
    const x = parseFloat(a);
    const y = parseFloat(b);
    if (!isFinite(x) || !isFinite(y)) return null;
    if (mode === "of") {
      const val = (x / 100) * y;
      return { headline: fmt(val), lines: [`${fmt(x)}% of ${fmt(y)} = ${fmt(val)}`] };
    }
    if (mode === "what") {
      if (y === 0) return null;
      const val = (x / y) * 100;
      return { headline: `${fmt(val)}%`, lines: [`${fmt(x)} is ${fmt(val)}% of ${fmt(y)}`] };
    }
    if (y === 0) return null;
    const diff = x - y;
    const pct = (diff / Math.abs(y)) * 100;
    const direction = diff > 0 ? "increase" : diff < 0 ? "decrease" : "no change";
    return {
      headline: `${diff >= 0 ? "+" : ""}${fmt(pct)}%`,
      lines: [
        `Change: ${fmt(diff)} (${direction})`,
        `From ${fmt(y)} to ${fmt(x)} = ${diff >= 0 ? "+" : ""}${fmt(pct)}%`,
      ],
    };
  }, [a, b, mode]);

  const labels = useMemo(() => {
    if (mode === "of") return { a: "X (percent)", b: "Y (value)" };
    if (mode === "what") return { a: "X (part)", b: "Y (whole)" };
    return { a: "New value", b: "Old value" };
  }, [mode]);

  const copyResult = async () => {
    if (!trial.canUse) {
      toast.error(`Free trial used up - ${TOOL_TRIAL_LIMIT} copies per tool. Go Pro for unlimited.`);
      return;
    }
    if (!result) {
      toast.error("Enter valid numbers first.");
      return;
    }
    try {
      await navigator.clipboard.writeText(result.lines.join("\n"));
      trial.recordUse();
      toast.success("Result copied");
    } catch {
      toast.error("Copy failed - select and copy manually.");
    }
  };

  return (
    <ToolPageShell toolId="percentage-calculator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Percentage Calculator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Mode</p>
            <div className="space-y-2">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  className={cn(
                    "w-full rounded-xl border px-3 py-2.5 text-sm font-bold transition",
                    mode === m.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left - runs fully on your device.
            </p>
          )}
        </div>

        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80" htmlFor="pc-a">{labels.a}</label>
              <input id="pc-a" value={a} onChange={(e) => setA(e.target.value)} inputMode="decimal" className={inputCls} />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80" htmlFor="pc-b">{labels.b}</label>
              <input id="pc-b" value={b} onChange={(e) => setB(e.target.value)} inputMode="decimal" className={inputCls} />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-6 text-center">
            {!result ? (
              <p className="text-sm text-muted-foreground">Enter valid numbers to see the result.</p>
            ) : (
              <>
                <p className="font-mono text-5xl font-bold text-primary">{result.headline}</p>
                <div className="mt-2 space-y-0.5">
                  {result.lines.map((line) => (
                    <p key={line} className="font-mono text-sm text-muted-foreground">{line}</p>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={copyResult}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-bold hover:border-primary/40"
            >
              <ClipboardCopy className="h-4 w-4" /> Copy result
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { t: "Discounts", d: "What is 25% off 80? Answer: 60." },
              { t: "Tips and tax", d: "Add 18% to a 45 bill: 53.10." },
              { t: "Growth", d: "From 200 to 260 is a +30% change." },
            ].map((e) => (
              <div key={e.t} className="rounded-xl border border-border p-3">
                <p className="text-sm font-bold">{e.t}</p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">{e.d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
