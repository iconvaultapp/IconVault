// /tools/web-vitals-budget - LCP/INP/CLS budget calculator with resource
// allocation sliders. Client-side estimates, no uploads.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Gauge } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/web-vitals-budget")({
  head: () => {
    const seo = getToolSeoMeta("web-vitals-budget");
    const canonical = "https://iconvault.site/tools/web-vitals-budget";
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
  component: WebVitalsBudget,
});

const SPEEDS = [
  { label: "Slow 4G", mbps: 1.6 },
  { label: "Fast 4G", mbps: 12 },
  { label: "Wi-Fi / broadband", mbps: 30 },
  { label: "Fiber", mbps: 100 },
] as const;

const RESOURCES = [
  { key: "js", label: "JavaScript", color: "bg-amber-400" },
  { key: "images", label: "Images", color: "bg-sky-400" },
  { key: "css", label: "CSS", color: "bg-violet-400" },
  { key: "fonts", label: "Fonts", color: "bg-rose-400" },
  { key: "html", label: "HTML", color: "bg-emerald-400" },
  { key: "other", label: "Other", color: "bg-zinc-400" },
] as const;

type Verdict = "good" | "needs" | "poor";

function verdictLabel(v: Verdict) {
  return v === "good" ? "Good" : v === "needs" ? "Needs improvement" : "Poor";
}

function VerdictBadge({ v }: { v: Verdict }) {
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2.5 py-0.5 text-xs font-bold",
        v === "good" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
        v === "needs" && "bg-amber-500/15 text-amber-600 dark:text-amber-400",
        v === "poor" && "bg-red-500/15 text-red-600 dark:text-red-400",
      )}
    >
      {verdictLabel(v)}
    </span>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[13px] font-medium text-foreground/80">{label}</span>
        <span className="text-[13px] font-bold tabular-nums">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </div>
  );
}

function WebVitalsBudget() {
  const { isPro } = usePlan();
  const trial = useToolTrial("web-vitals-budget", isPro);
  const seo = getToolSeo("web-vitals-budget");

  const [totalKb, setTotalKb] = useState(1200);
  const [speedIdx, setSpeedIdx] = useState(1);
  const [alloc, setAlloc] = useState<Record<string, number>>({
    js: 30,
    images: 40,
    css: 8,
    fonts: 7,
    html: 5,
    other: 10,
  });
  const [unsizedImages, setUnsizedImages] = useState(3);
  const [fontSwap, setFontSwap] = useState(true);
  const [unreservedEmbeds, setUnreservedEmbeds] = useState(false);

  const setRes = (key: string, v: number) => setAlloc((p) => ({ ...p, [key]: v }));

  const calc = useMemo(() => {
    const mbps = SPEEDS[speedIdx]!.mbps;
    const sum = Object.values(alloc).reduce((a, b) => a + b, 0) || 1;
    const frac = (k: string) => (alloc[k] ?? 0) / sum;
    const kb = (k: string) => totalKb * frac(k);

    const transferSec = (kbs: number) => (kbs * 8) / (mbps * 1000);
    // Critical path for LCP: html + css + fonts + part of JS + hero image fraction
    const criticalKb = kb("html") + kb("css") + kb("fonts") + kb("js") * 0.6 + kb("images") * 0.35;
    const lcp = transferSec(criticalKb) + 0.6;
    const lcpVerdict: Verdict = lcp <= 2.5 ? "good" : lcp <= 4 ? "needs" : "poor";

    // INP estimate from main-thread JS cost
    const inp = 50 + kb("js") * 0.06;
    const inpVerdict: Verdict = inp <= 200 ? "good" : inp <= 500 ? "needs" : "poor";

    // CLS estimate from layout-shift risks
    const cls = Math.min(0.5, unsizedImages * 0.02 + (fontSwap ? 0.03 : 0) + (unreservedEmbeds ? 0.08 : 0));
    const clsVerdict: Verdict = cls <= 0.1 ? "good" : cls <= 0.25 ? "needs" : "poor";

    const totalSec = transferSec(totalKb);
    return { mbps, frac, kb, lcp, lcpVerdict, inp, inpVerdict, cls, clsVerdict, totalSec, sum };
  }, [totalKb, speedIdx, alloc, unsizedImages, fontSwap, unreservedEmbeds]);

  const copyReport = async () => {
    if (!trial.canUse) return;
    const lines = [
      "Web Vitals budget report (IconVault)",
      `Page weight: ${totalKb} KB on ${SPEEDS[speedIdx]!.label} (${SPEEDS[speedIdx]!.mbps} Mbps)`,
      `Full transfer time: ${calc.totalSec.toFixed(2)}s`,
      "",
      "Resource allocation:",
      ...RESOURCES.map(
        (r) => `- ${r.label}: ${(calc.frac(r.key) * 100).toFixed(0)}% (${Math.round(calc.kb(r.key))} KB)`,
      ),
      "",
      `LCP estimate: ${calc.lcp.toFixed(2)}s (${verdictLabel(calc.lcpVerdict)}) - target <= 2.5s`,
      `INP estimate: ${Math.round(calc.inp)}ms (${verdictLabel(calc.inpVerdict)}) - target <= 200ms`,
      `CLS estimate: ${calc.cls.toFixed(3)} (${verdictLabel(calc.clsVerdict)}) - target <= 0.1`,
      "",
      "Estimates only. Measure the real page with PageSpeed Insights or the web-vitals JS library.",
    ].join("\n");
    try {
      await navigator.clipboard.writeText(lines);
      trial.recordUse();
      toast.success("Budget report copied");
    } catch {
      toast.error("Could not access the clipboard.");
    }
  };

  const results = [
    { name: "LCP", desc: "Largest Contentful Paint", value: `${calc.lcp.toFixed(2)}s`, target: "target <= 2.5s", verdict: calc.lcpVerdict },
    { name: "INP", desc: "Interaction to Next Paint", value: `${Math.round(calc.inp)}ms`, target: "target <= 200ms", verdict: calc.inpVerdict },
    { name: "CLS", desc: "Cumulative Layout Shift", value: calc.cls.toFixed(3), target: "target <= 0.1", verdict: calc.clsVerdict },
  ];

  return (
    <ToolPageShell toolId="web-vitals-budget" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Web Vitals Budget" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <Slider label="Total page weight" value={totalKb} min={100} max={4000} step={50} unit=" KB" onChange={setTotalKb} />

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Connection speed</p>
            <div className="grid grid-cols-2 gap-2">
              {SPEEDS.map((s, i) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => setSpeedIdx(i)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-left text-sm transition",
                    speedIdx === i
                      ? "border-primary bg-primary/10 font-semibold text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {s.label}
                  <span className="block text-xs font-normal opacity-70">{s.mbps} Mbps</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">
              Resource allocation <span className="text-muted-foreground">(normalized to 100%)</span>
            </p>
            <div className="space-y-3">
              {RESOURCES.map((r) => (
                <div key={r.key} className="flex items-center gap-3">
                  <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", r.color)} />
                  <div className="flex-1">
                    <Slider
                      label={r.label}
                      value={alloc[r.key] ?? 0}
                      min={0}
                      max={80}
                      unit="%"
                      onChange={(v) => setRes(r.key, v)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 border-t border-border pt-4">
            <p className="text-[13px] font-medium text-foreground/80">Layout-shift risks (CLS)</p>
            <div className="flex items-center gap-3">
              <span className="flex-1 text-[13px] text-muted-foreground">Images without width/height</span>
              <input
                type="number"
                min={0}
                max={100}
                value={unsizedImages}
                onChange={(e) => setUnsizedImages(Math.max(0, Number(e.target.value)))}
                className="w-20 rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
              />
            </div>
            {[
              { label: "Webfonts with font-display: swap", v: fontSwap, set: setFontSwap },
              { label: "Ads/embeds without reserved space", v: unreservedEmbeds, set: setUnreservedEmbeds },
            ].map((t) => (
              <label key={t.label} className="flex cursor-pointer items-center gap-3 text-[13px] text-muted-foreground">
                <input
                  type="checkbox"
                  checked={t.v}
                  onChange={(e) => t.set(e.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                {t.label}
              </label>
            ))}
          </div>

          <ActionButton disabled={!trial.canUse} onClick={copyReport}>
            <Gauge className="h-4 w-4" /> Copy budget report
          </ActionButton>
        </div>

        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            {results.map((r) => (
              <div key={r.name} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold">{r.name}</p>
                  <VerdictBadge v={r.verdict} />
                </div>
                <p className="text-xs text-muted-foreground">{r.desc}</p>
                <p className="mt-3 text-3xl font-extrabold tabular-nums">{r.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{r.target}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 text-sm font-bold">Budget breakdown</p>
            <div className="flex h-8 overflow-hidden rounded-lg">
              {RESOURCES.map((r) => (
                <div
                  key={r.key}
                  className={cn(r.color)}
                  style={{ width: `${(calc.frac(r.key) * 100).toFixed(1)}%` }}
                  title={`${r.label}: ${Math.round(calc.kb(r.key))} KB`}
                />
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {RESOURCES.map((r) => (
                <div key={r.key} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className={cn("h-2 w-2 rounded-full", r.color)} />
                  {r.label}: <span className="font-semibold text-foreground">{Math.round(calc.kb(r.key))} KB</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              Full page transfer on {SPEEDS[speedIdx]!.label}: about {calc.totalSec.toFixed(2)}s. LCP assumes
              the hero element depends on HTML, CSS, fonts, 60% of JS and 35% of images. INP scales with
              JavaScript parse and execution cost. These are planning estimates, not lab measurements.
            </p>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
