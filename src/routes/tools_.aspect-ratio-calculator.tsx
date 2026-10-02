// /tools/aspect-ratio-calculator - Simplify ratios, get aspect-ratio CSS and
// the padding-bottom hack, and solve for a missing dimension. 100% in-browser.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Calculator, ClipboardCopy, Scaling } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/aspect-ratio-calculator")({
  head: () => {
    const seo = getToolSeoMeta("aspect-ratio-calculator");
    const canonical = "https://iconvault.site/tools/aspect-ratio-calculator";
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
  component: AspectRatioTool,
});

const PRESETS = [
  { label: "16:9", w: 16, h: 9 },
  { label: "4:3", w: 4, h: 3 },
  { label: "1:1", w: 1, h: 1 },
  { label: "3:2", w: 3, h: 2 },
  { label: "21:9", w: 21, h: 9 },
  { label: "9:16", w: 9, h: 16 },
];

function gcd(a: number, b: number): number {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  return b === 0 ? a : gcd(b, a % b);
}

function AspectRatioTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("aspect-ratio-calculator", isPro);
  const seo = getToolSeo("aspect-ratio-calculator");

  const [width, setWidth] = useState("1920");
  const [height, setHeight] = useState("1080");
  const [solverW, setSolverW] = useState("1280");
  const [solverH, setSolverH] = useState("");
  const [copied, setCopied] = useState(false);

  const parsed = useMemo(() => {
    const w = parseFloat(width);
    const h = parseFloat(height);
    if (!isFinite(w) || !isFinite(h) || w <= 0 || h <= 0) return null;
    const g = gcd(w, h);
    return { w, h, rw: Math.round(w / g), rh: Math.round(h / g) };
  }, [width, height]);

  const solver = useMemo(() => {
    if (!parsed) return null;
    const sw = parseFloat(solverW);
    const sh = parseFloat(solverH);
    if (isFinite(sw) && sw > 0 && !solverH) return { label: `Height for width ${sw}`, value: (sw * parsed.rh / parsed.rw).toFixed(2).replace(/\.?0+$/, "") };
    if (isFinite(sh) && sh > 0 && !solverW) return { label: `Width for height ${sh}`, value: (sh * parsed.rw / parsed.rh).toFixed(2).replace(/\.?0+$/, "") };
    return null;
  }, [parsed, solverW, solverH]);

  const css = parsed
    ? `.box {\n  aspect-ratio: ${parsed.rw} / ${parsed.rh};\n}\n\n/* Legacy padding-bottom hack */\n.box::before {\n  content: "";\n  display: block;\n  padding-bottom: ${((parsed.rh / parsed.rw) * 100).toFixed(4).replace(/\.?0+$/, "")}%;\n}`
    : "";

  const copy = async () => {
    if (!trial.canUse) {
      toast.error(`Free trial used up - ${TOOL_TRIAL_LIMIT} copies per tool. Go Pro for unlimited.`);
      return;
    }
    try {
      await navigator.clipboard.writeText(css);
      trial.recordUse();
      setCopied(true);
      toast.success("CSS copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copy failed - select and copy manually.");
    }
  };

  const applyPreset = (w: number, h: number) => {
    setWidth(String(w));
    setHeight(String(h));
  };

  return (
    <ToolPageShell toolId="aspect-ratio-calculator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Aspect Ratio Calculator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Presets</p>
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(p.w, p.h)}
                  className={cn(
                    "rounded-xl border px-2 py-2.5 font-mono text-sm font-bold transition",
                    parsed && parsed.rw === p.w / gcd(p.w, p.h) && parsed.rh === p.h / gcd(p.w, p.h)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80" htmlFor="ar-w">Width</label>
              <input
                id="ar-w"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                inputMode="decimal"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80" htmlFor="ar-h">Height</label>
              <input
                id="ar-h"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                inputMode="decimal"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="mb-2 flex items-center gap-2 text-[13px] font-medium text-foreground/80">
              <Calculator className="h-4 w-4" /> Dimension solver
            </p>
            <p className="mb-2 text-xs text-muted-foreground">Fill in one box to find the missing dimension at the current ratio.</p>
            <div className="grid grid-cols-2 gap-3">
              <input
                value={solverW}
                onChange={(e) => setSolverW(e.target.value)}
                placeholder="Width"
                inputMode="decimal"
                className="rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary"
              />
              <input
                value={solverH}
                onChange={(e) => setSolverH(e.target.value)}
                placeholder="Height"
                inputMode="decimal"
                className="rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary"
              />
            </div>
            {solver && (
              <p className="mt-2 font-mono text-sm font-bold text-primary">
                {solver.label}: {solver.value}
              </p>
            )}
          </div>

          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left - runs fully on your device.
            </p>
          )}
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          {!parsed ? (
            <div className="flex h-full min-h-[280px] flex-col items-center justify-center text-center">
              <Scaling className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Enter a width and height</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                The simplified ratio, the aspect-ratio CSS, and the legacy padding hack will appear here.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-muted/30 p-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Simplified ratio</p>
                  <p className="font-mono text-3xl font-bold text-primary">{parsed.rw} : {parsed.rh}</p>
                </div>
                <div className="ml-auto overflow-hidden rounded-lg border border-border bg-black">
                  <div
                    style={{ width: 220, aspectRatio: `${parsed.rw} / ${parsed.rh}`, maxHeight: 140, margin: "0 auto" }}
                    className="flex items-center justify-center bg-gradient-to-br from-primary/60 to-primary/20 text-[11px] font-bold text-primary-foreground"
                  >
                    {parsed.w} x {parsed.h}
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[13px] font-medium text-foreground/80">CSS output</p>
                  <button
                    type="button"
                    onClick={copy}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold hover:border-primary/40"
                  >
                    <ClipboardCopy className="h-3.5 w-3.5" /> {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <pre className="overflow-auto rounded-xl bg-muted/40 p-4 font-mono text-[13px] leading-relaxed">{css}</pre>
              </div>
            </>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
