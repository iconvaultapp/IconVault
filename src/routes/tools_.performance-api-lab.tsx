// /tools/performance-api-lab - One explorer for the whole Performance API:
// marks, measures, PerformanceObserver entries, navigation timing and
// resource timing, plus a custom code benchmark. 100% client-side; trial
// use is recorded when the timing data is copied or exported.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Activity, Check, Copy, Download, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/performance-api-lab")({
  head: () => {
    const seo = getToolSeoMeta("performance-api-lab");
    const canonical = "https://iconvault.site/tools/performance-api-lab";
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
  component: PerformanceApiTool,
});

interface MarkRow { name: string; startTime: number }
interface MeasureRow { name: string; duration: number; startTime: number }
interface ObsRow { type: string; name: string; duration: string; detail: string }

const DEFAULT_BENCH = `// Runs in your browser. Returns the last expression.
let s = 0;
for (let i = 0; i < 2e6; i++) s += Math.sqrt(i);
s;`;

function busyWork(ms: number) {
  const end = performance.now() + ms;
  let x = 0;
  while (performance.now() < end) x += Math.sqrt(x + 1);
  return x;
}

function PerformanceApiTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("performance-api-lab", isPro);
  const seo = getToolSeo("performance-api-lab");

  const [marks, setMarks] = useState<MarkRow[]>([]);
  const [measures, setMeasures] = useState<MeasureRow[]>([]);
  const [obsRows, setObsRows] = useState<ObsRow[]>([]);
  const [observing, setObserving] = useState(false);
  const [markName, setMarkName] = useState("task-start");
  const [benchCode, setBenchCode] = useState(DEFAULT_BENCH);
  const [benchIters, setBenchIters] = useState(5);
  const [benchResult, setBenchResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const observerRef = useRef<PerformanceObserver | null>(null);

  const refreshMarks = useCallback(() => {
    setMarks(performance.getEntriesByType("mark").map((e) => ({ name: e.name, startTime: e.startTime })));
    setMeasures(
      performance.getEntriesByType("measure").map((e) => ({
        name: e.name,
        duration: e.duration,
        startTime: e.startTime,
      })),
    );
  }, []);

  useEffect(() => {
    refreshMarks();
    return () => observerRef.current?.disconnect();
  }, [refreshMarks]);

  const addMark = () => {
    performance.mark(markName || `mark-${Date.now()}`);
    refreshMarks();
    toast.success(`Mark "${markName}" recorded`);
  };

  const doWork = () => {
    const m = markName || "task";
    performance.mark(`${m}-start`);
    busyWork(120);
    performance.mark(`${m}-end`);
    performance.measure(`${m}-duration`, `${m}-start`, `${m}-end`);
    refreshMarks();
  };

  const measureToNow = () => {
    const m = performance.getEntriesByType("mark").at(-1);
    if (!m) {
      toast.info("Add a mark first, then measure from it.");
      return;
    }
    performance.measure(`from ${m.name}`, m.name);
    refreshMarks();
  };

  const clearAll = () => {
    performance.clearMarks();
    performance.clearMeasures();
    refreshMarks();
  };

  const toggleObserver = () => {
    if (observing) {
      observerRef.current?.disconnect();
      observerRef.current = null;
      setObserving(false);
      return;
    }
    try {
      const obs = new PerformanceObserver((list) => {
        const rows: ObsRow[] = list.getEntries().map((e) => {
          const base: ObsRow = {
            type: e.entryType,
            name: e.name.slice(0, 60),
            duration: e.duration ? `${e.duration.toFixed(2)}ms` : "-",
            detail: "",
          };
          if (e.entryType === "paint") base.detail = "render pipeline event";
          if (e.entryType === "largest-contentful-paint") {
            const lcp = e as PerformanceEntry & { size?: number };
            base.detail = `size ${lcp.size ?? "?"}`;
          }
          if (e.entryType === "layout-shift") {
            const ls = e as PerformanceEntry & { value?: number };
            base.detail = `shift value ${(ls.value ?? 0).toFixed(4)}`;
          }
          if (e.entryType === "navigation") {
            const n = e as PerformanceNavigationTiming;
            base.detail = `domContentLoaded ${n.domContentLoadedEventEnd.toFixed(0)}ms, type ${n.type}`;
          }
          return base;
        });
        setObsRows((prev) => [...rows, ...prev].slice(0, 100));
      });
      obs.observe({ type: "paint", buffered: true });
      obs.observe({ type: "navigation", buffered: true });
      try { obs.observe({ type: "largest-contentful-paint", buffered: true }); } catch { /* not supported */ }
      try { obs.observe({ type: "layout-shift", buffered: true }); } catch { /* not supported */ }
      try { obs.observe({ type: "longtask", buffered: true }); } catch { /* not supported */ }
      observerRef.current = obs;
      setObserving(true);
      toast.success("Observer running: paint, navigation, LCP, layout-shift, longtask");
    } catch {
      toast.error("PerformanceObserver is not available in this browser.");
    }
  };

  const runBenchmark = () => {
    if (!trial.canUse) return;
    setBenchResult(null);
    const iters = Math.max(1, Math.min(50, benchIters));
    try {
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const fn = new Function(`"use strict"; return (function(){ ${benchCode} })();`);
      performance.mark("bench-start");
      const times: number[] = [];
      let lastResult: unknown;
      for (let i = 0; i < iters; i++) {
        const t0 = performance.now();
        lastResult = fn();
        times.push(performance.now() - t0);
      }
      performance.mark("bench-end");
      performance.measure("benchmark-total", "bench-start", "bench-end");
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const best = Math.min(...times);
      const worst = Math.max(...times);
      setBenchResult(
        `Ran ${iters}x: avg ${avg.toFixed(3)}ms, best ${best.toFixed(3)}ms, worst ${worst.toFixed(3)}ms. Last return value: ${String(lastResult).slice(0, 80)}`,
      );
      refreshMarks();
      trial.recordUse();
    } catch (e) {
      setBenchResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const navEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  const resources = performance
    .getEntriesByType("resource")
    .slice(-8)
    .reverse() as PerformanceResourceTiming[];

  const copyJson = async () => {
    if (!trial.canUse) return;
    const payload = {
      timeOrigin: performance.timeOrigin,
      now: performance.now(),
      marks: performance.getEntriesByType("mark"),
      measures: performance.getEntriesByType("measure"),
      navigation: navEntry
        ? {
            type: navEntry.type,
            domContentLoaded: navEntry.domContentLoadedEventEnd,
            load: navEntry.loadEventEnd,
            transferSize: navEntry.transferSize,
          }
        : null,
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopied(true);
      trial.recordUse();
      toast.success("Timing data copied");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  const exportJson = () => {
    if (!trial.canUse) return;
    const payload = JSON.stringify(
      {
        marks: performance.getEntriesByType("mark"),
        measures: performance.getEntriesByType("measure"),
        observed: obsRows,
      },
      null,
      2,
    );
    downloadBlob(new Blob([payload], { type: "application/json" }), "performance-timeline.json");
    trial.recordUse();
    toast.success("Timeline exported");
  };

  const snippet = `// The core pattern: mark, measure, observe
performance.mark("work-start");
doTheWork();
performance.mark("work-end");
performance.measure("work", "work-start", "work-end");

const obs = new PerformanceObserver((list) => {
  for (const e of list.getEntries()) console.log(e.entryType, e.name, e.duration);
});
obs.observe({ type: "paint", buffered: true });
obs.observe({ type: "largest-contentful-paint", buffered: true });`;

  return (
    <ToolPageShell toolId="performance-api-lab" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Performance API Lab" left={trial.left} />

      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4 text-sm">
        <Activity className="h-5 w-5 text-primary" />
        <span>
          <strong>timeOrigin</strong> <span className="font-mono">{performance.timeOrigin.toFixed(0)}</span>
        </span>
        <span>
          <strong>now()</strong> <span className="font-mono">{performance.now().toFixed(1)}ms</span>
        </span>
        <span className="text-xs text-muted-foreground">
          performance.now() is a high-resolution monotonic clock, immune to system clock changes. Every
          measurement here uses it.
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-1 text-sm font-bold">Marks and measures</h2>
          <p className="mb-3 text-xs text-muted-foreground">Drop marks around real work and measure the gap.</p>
          <div className="mb-3 flex flex-wrap gap-2">
            <input
              value={markName}
              onChange={(e) => setMarkName(e.target.value)}
              spellCheck={false}
              className="w-36 rounded-xl border border-border bg-muted/40 px-3 py-2 font-mono text-xs focus:border-primary focus:outline-none"
            />
            <button type="button" onClick={addMark} className="rounded-xl border border-border px-3 py-2 text-xs font-bold hover:border-primary/60">
              Add mark
            </button>
            <button type="button" onClick={doWork} className="rounded-xl border border-border px-3 py-2 text-xs font-bold hover:border-primary/60">
              Do 120ms of work
            </button>
            <button type="button" onClick={measureToNow} className="rounded-xl border border-border px-3 py-2 text-xs font-bold hover:border-primary/60">
              Measure last mark to now
            </button>
            <button type="button" onClick={clearAll} className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-2 text-xs font-bold hover:border-red-400">
              <Trash2 className="h-3 w-3" /> Clear
            </button>
          </div>
          <div className="max-h-56 space-y-1.5 overflow-y-auto">
            {measures.length === 0 && marks.length === 0 && (
              <p className="rounded-xl bg-muted/40 p-3 text-center text-xs text-muted-foreground">No marks yet.</p>
            )}
            {measures.map((m) => (
              <div key={m.name} className="flex items-center justify-between rounded-lg bg-teal-500/10 px-3 py-1.5 font-mono text-xs">
                <span className="font-bold text-teal-600">{m.name}</span>
                <span>{m.duration.toFixed(2)}ms</span>
              </div>
            ))}
            {marks.slice(-10).reverse().map((m) => (
              <div key={`${m.name}-${m.startTime}`} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-1.5 font-mono text-xs text-muted-foreground">
                <span>mark: {m.name}</span>
                <span>@{m.startTime.toFixed(1)}ms</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-sm font-bold">PerformanceObserver entries</h2>
            <button
              type="button"
              onClick={toggleObserver}
              className={
                observing
                  ? "rounded-xl border border-border px-3 py-2 text-xs font-bold hover:border-red-400"
                  : "rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:opacity-90"
              }
            >
              {observing ? "Stop observing" : "Start observing"}
            </button>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Buffered paint and navigation entries appear instantly; longtasks appear when the main thread blocks (try "Do 120ms of work").
          </p>
          <div className="max-h-56 space-y-1.5 overflow-y-auto">
            {obsRows.length === 0 ? (
              <p className="rounded-xl bg-muted/40 p-3 text-center text-xs text-muted-foreground">Nothing observed yet.</p>
            ) : (
              obsRows.map((r, i) => (
                <div key={`${r.type}-${r.name}-${i}`} className="rounded-lg bg-muted/40 px-3 py-1.5 font-mono text-xs">
                  <span className="font-bold text-primary">{r.type}</span>{" "}
                  <span className="text-muted-foreground">{r.name || "-"}</span>{" "}
                  <span className="float-right">{r.duration}</span>
                  {r.detail && <div className="text-muted-foreground">{r.detail}</div>}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-1 text-sm font-bold">Custom code benchmark</h2>
          <p className="mb-3 text-xs text-muted-foreground">Your code runs here, in this page, timed with performance.now().</p>
          <textarea
            value={benchCode}
            onChange={(e) => setBenchCode(e.target.value)}
            spellCheck={false}
            rows={7}
            className="w-full rounded-xl border border-border bg-muted/40 p-3 font-mono text-xs leading-relaxed focus:border-primary focus:outline-none"
          />
          <div className="mt-3 flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-bold">
              Iterations
              <input
                type="number"
                min={1}
                max={50}
                value={benchIters}
                onChange={(e) => setBenchIters(Number(e.target.value))}
                className="w-16 rounded-lg border border-border bg-muted/40 px-2 py-1 font-mono text-xs"
              />
            </label>
            <ActionButton onClick={runBenchmark} disabled={!trial.canUse}>
              <Play className="h-4 w-4" /> Run benchmark
            </ActionButton>
          </div>
          {benchResult && (
            <p className="mt-3 rounded-xl bg-muted/40 p-3 font-mono text-xs leading-relaxed">{benchResult}</p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-1 text-sm font-bold">Navigation and resource timing</h2>
          <p className="mb-3 text-xs text-muted-foreground">How this page itself loaded, from the browser.</p>
          {navEntry ? (
            <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-muted/40 px-3 py-2"><span className="text-muted-foreground">type</span><br /><strong className="font-mono">{navEntry.type}</strong></div>
              <div className="rounded-lg bg-muted/40 px-3 py-2"><span className="text-muted-foreground">transfer size</span><br /><strong className="font-mono">{(navEntry.transferSize / 1024).toFixed(1)} KB</strong></div>
              <div className="rounded-lg bg-muted/40 px-3 py-2"><span className="text-muted-foreground">DOMContentLoaded</span><br /><strong className="font-mono">{navEntry.domContentLoadedEventEnd.toFixed(0)}ms</strong></div>
              <div className="rounded-lg bg-muted/40 px-3 py-2"><span className="text-muted-foreground">load event</span><br /><strong className="font-mono">{navEntry.loadEventEnd.toFixed(0)}ms</strong></div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No navigation entry available.</p>
          )}
          <h3 className="mb-2 text-xs font-bold text-foreground/80">Recent resources</h3>
          <div className="max-h-40 space-y-1 overflow-y-auto">
            {resources.map((r, i) => (
              <div key={`${r.name}-${i}`} className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-1.5 font-mono text-[11px]">
                <span className="truncate text-muted-foreground" title={r.name}>{r.name.split("/").pop()}</span>
                <span className="shrink-0">{r.duration.toFixed(1)}ms</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold">Take the data with you</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={copyJson}
              disabled={!trial.canUse}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-xs font-bold transition hover:border-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy timeline JSON"}
            </button>
            <button
              type="button"
              onClick={exportJson}
              disabled={!trial.canUse}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-xs font-bold transition hover:border-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" /> Export JSON
            </button>
          </div>
        </div>
        <pre className="overflow-x-auto rounded-xl bg-muted/40 p-4 font-mono text-xs leading-relaxed">{snippet}</pre>
        {!isPro && (
          <p className="mt-3 text-xs text-muted-foreground">
            {trial.left} of {TOOL_TRIAL_LIMIT} free uses left.
          </p>
        )}
      </div>
    </ToolPageShell>
  );
}
