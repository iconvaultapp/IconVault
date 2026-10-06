// /tools/web-vitals-checker - Measure Core Web Vitals (LCP, INP, CLS) of
// THIS page in your browser using PerformanceObserver. Honest limit: it cannot
// measure arbitrary URLs, only the page you are on.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Gauge, Play, Square, Info, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/web-vitals-checker";
import toolSeoMeta from "@/lib/tool-seo-meta-data/web-vitals-checker";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/tools_/web-vitals-checker")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/web-vitals-checker";
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
  component: WebVitalsTool,
});

type Rating = "good" | "needs-improvement" | "poor" | "pending";

type Metric = {
  id: "lcp" | "inp" | "cls";
  name: string;
  fullName: string;
  value: number | null;
  unit: string;
  format: (v: number) => string;
  rate: (v: number) => Rating;
  tip: string;
};

const METRICS: Metric[] = [
  {
    id: "lcp",
    name: "LCP",
    fullName: "Largest Contentful Paint",
    value: null,
    unit: "s",
    format: (v) => `${(v / 1000).toFixed(2)}s`,
    rate: (v) => (v <= 2500 ? "good" : v <= 4000 ? "needs-improvement" : "poor"),
    tip: "Speed up the largest visible element: compress the hero image, preload it, serve it from a CDN, and avoid render-blocking scripts above the fold.",
  },
  {
    id: "inp",
    name: "INP",
    fullName: "Interaction to Next Paint",
    value: null,
    unit: "ms",
    format: (v) => `${Math.round(v)}ms`,
    rate: (v) => (v <= 200 ? "good" : v <= 500 ? "needs-improvement" : "poor"),
    tip: "Reduce input delay: split long JavaScript tasks, defer non-critical scripts, and keep event handlers light so clicks respond fast.",
  },
  {
    id: "cls",
    name: "CLS",
    fullName: "Cumulative Layout Shift",
    value: null,
    unit: "",
    format: (v) => v.toFixed(3),
    rate: (v) => (v <= 0.1 ? "good" : v <= 0.25 ? "needs-improvement" : "poor"),
    tip: "Stop layout jumps: always set width and height on images and embeds, reserve space for ads and dynamic banners, and avoid inserting content above existing content.",
  },
];

const RATING_STYLE: Record<Rating, { label: string; icon: typeof CheckCircle2; cls: string; bar: string }> = {
  good: { label: "Good", icon: CheckCircle2, cls: "text-emerald-600 border-emerald-500/40 bg-emerald-500/10", bar: "bg-emerald-500" },
  "needs-improvement": { label: "Needs improvement", icon: AlertTriangle, cls: "text-amber-600 border-amber-500/40 bg-amber-500/10", bar: "bg-amber-500" },
  poor: { label: "Poor", icon: XCircle, cls: "text-red-500 border-red-500/40 bg-red-500/10", bar: "bg-red-500" },
  pending: { label: "Measuring…", icon: Gauge, cls: "text-muted-foreground border-border bg-muted", bar: "bg-muted" },
};

function ratingProgress(m: Metric, rating: Rating): number {
  if (m.value === null) return 0;
  if (m.id === "lcp") return Math.min(100, (m.value / 6000) * 100);
  if (m.id === "inp") return Math.min(100, (m.value / 800) * 100);
  return Math.min(100, (m.value / 0.4) * 100);
}

function WebVitalsTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("web-vitals-checker", isPro);
  const seo = toolSeo;

  const [values, setValues] = useState<Record<string, number | null>>({ lcp: null, inp: null, cls: null });
  const [running, setRunning] = useState(false);
  const [interactions, setInteractions] = useState(0);
  const observers = useRef<PerformanceObserver[]>([]);
  const inpWorst = useRef(0);
  const clsSum = useRef(0);

  const stop = useCallback(() => {
    observers.current.forEach((o) => { try { o.disconnect(); } catch { /* noop */ } });
    observers.current = [];
    setRunning(false);
  }, []);

  useEffect(() => () => stop(), [stop]);

  const start = useCallback(() => {
    if (running || !trial.canUse) return;
    setValues({ lcp: null, inp: null, cls: null });
    setInteractions(0);
    inpWorst.current = 0;
    clsSum.current = 0;
    const list: PerformanceObserver[] = [];
    try {
      const lcp = new PerformanceObserver((entries) => {
        const last = entries.getEntries().at(-1) as PerformanceEntry & { startTime: number };
        if (last) setValues((v) => ({ ...v, lcp: last.startTime }));
      });
      lcp.observe({ type: "largest-contentful-paint", buffered: true });
      list.push(lcp);

      const cls = new PerformanceObserver((entries) => {
        for (const e of entries.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
          if (!e.hadRecentInput) {
            clsSum.current += e.value;
            setValues((v) => ({ ...v, cls: clsSum.current }));
          }
        }
      });
      cls.observe({ type: "layout-shift", buffered: true });
      list.push(cls);

      // INP: worst interaction latency seen via event timing entries.
      const inp = new PerformanceObserver((entries) => {
        let changed = false;
        for (const e of entries.getEntries() as (PerformanceEntry & { interactionId?: number; duration: number })[]) {
          if (e.interactionId && e.duration > inpWorst.current) {
            inpWorst.current = e.duration;
            changed = true;
          }
        }
        if (changed) {
          setValues((v) => ({ ...v, inp: inpWorst.current }));
          setInteractions((n) => n + 1);
        }
      });
      inp.observe({ type: "event", buffered: true, durationThreshold: 16 } as PerformanceObserverInit);
      list.push(inp);
    } catch {
      toast.error("Your browser does not support the PerformanceObserver metrics needed.");
      return;
    }
    observers.current = list;
    setRunning(true);
    trial.recordUse();
    toast("Measuring… interact with the page (click, tap, scroll) so INP has data.");
  }, [running, trial]);

  return (
    <ToolPageShell toolId="web-vitals-checker" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Web Vitals Checker" left={trial.left} />

      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-border bg-card p-4 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-muted-foreground">
          This measures <span className="font-semibold text-foreground">this page, in your browser</span>, from the moment you press Measure. It cannot test arbitrary URLs. LCP and CLS capture everything since page load (buffered), while INP needs real interactions: click around after starting.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold"><Gauge className="h-4 w-4 text-primary" /> Core Web Vitals</h2>
            <p className="text-xs text-muted-foreground">Google's thresholds: green is good, amber needs improvement, red is poor</p>
          </div>
          {running ? (
            <button type="button" onClick={stop} className="inline-flex items-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-bold transition hover:border-red-500/50 hover:text-red-500">
              <Square className="h-4 w-4" /> Stop
            </button>
          ) : (
            <ActionButton busy={false} disabled={!trial.canUse} onClick={start}>
              <Play className="h-4 w-4" /> Measure this page
            </ActionButton>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {METRICS.map((m) => {
            const value = values[m.id] ?? null;
            const rating: Rating = value === null ? "pending" : m.rate(value);
            const style = RATING_STYLE[rating];
            const Icon = style.icon;
            return (
              <div key={m.id} className={cn("rounded-2xl border p-5", style.cls)}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-black">{m.name}</p>
                    <p className="text-xs opacity-80">{m.fullName}</p>
                  </div>
                  <Icon className="h-6 w-6" />
                </div>
                <p className="mt-3 text-4xl font-black tabular-nums">
                  {value === null ? "-" : m.format(value)}
                </p>
                <div className="mt-3">
                  <Progress value={ratingProgress({ ...m, value }, rating)} className="h-2" />
                </div>
                <p className="mt-2 text-xs font-bold uppercase tracking-wide">{style.label}</p>
                <p className="mt-3 text-[13px] leading-relaxed opacity-90">{m.tip}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-6 grid gap-4 text-sm md:grid-cols-2">
          <div className="rounded-xl border border-border p-4">
            <p className="font-bold">How to read this</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
              <li>LCP under 2.5s is good. It is the moment the biggest visible element finished loading.</li>
              <li>INP under 200ms is good. It is the worst click-to-response delay seen. No interactions yet means no INP score.</li>
              <li>CLS under 0.1 is good. It adds up every unexpected layout jump on the page.</li>
            </ul>
          </div>
          <div className="rounded-xl border border-border p-4">
            <p className="font-bold">Field vs lab</p>
            <p className="mt-2 text-muted-foreground">
              This is a lab measurement on your device and connection. Google's official scores come from real users over 28 days (the CrUX dataset), so treat this as a diagnostic snapshot, not your search ranking score.
            </p>
            {interactions > 0 && <p className="mt-2 text-xs text-muted-foreground">{interactions} interaction sample{interactions === 1 ? "" : "s"} captured for INP.</p>}
          </div>
        </div>

        {!isPro && (
          <p className="mt-4 text-xs text-muted-foreground">{trial.left} of {TOOL_TRIAL_LIMIT} free measurements left.</p>
        )}
      </div>
    </ToolPageShell>
  );
}
