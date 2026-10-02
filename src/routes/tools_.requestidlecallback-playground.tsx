// /tools/requestidlecallback-playground - Explore cooperative scheduling with the
// real requestIdleCallback API: deadline.timeRemaining(), didTimeout, timeout
// handling, and a live bar timeline of scheduled tasks. setTimeout fallback is
// used where rIC is missing (Safari), clearly labeled. Fully client-side.

import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Clock, Play, RotateCcw, Info, Download } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/requestidlecallback-playground")({
  head: () => {
    const seo = getToolSeoMeta("requestidlecallback-playground");
    const canonical = "https://iconvault.site/tools/requestidlecallback-playground";
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
  component: RequestIdleCallbackPlayground,
});

interface TaskResult {
  n: number;
  queuedAt: number;
  startedAt: number;
  waitedMs: number;
  budgetMs: number;
  ranMs: number;
  didTimeout: boolean;
  fallback: boolean;
}

interface IdleDeadline { timeRemaining: () => number; didTimeout: boolean; }

const ric = (cb: (d: IdleDeadline) => void, opts?: { timeout: number }): number => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  if (typeof w.requestIdleCallback === "function") return w.requestIdleCallback(cb, opts);
  return window.setTimeout(() => cb({ timeRemaining: () => 0, didTimeout: true }), (opts?.timeout ?? 50) as number) as unknown as number;
};

const cancelRic = (id: number) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  if (typeof w.cancelIdleCallback === "function") w.cancelIdleCallback(id);
  else clearTimeout(id);
};

function busyWork(ms: number) {
  const end = performance.now() + ms;
  let x = 0;
  while (performance.now() < end) { x += Math.sqrt(x + 1); }
  return x;
}

function RequestIdleCallbackPlayground() {
  const { isPro } = usePlan();
  const trial = useToolTrial("requestidlecallback-playground", isPro);
  const seo = getToolSeo("requestidlecallback-playground");

  const [supported, setSupported] = useState<boolean | null>(null);
  const [taskCount, setTaskCount] = useState(12);
  const [taskMs, setTaskMs] = useState(8);
  const [timeoutMs, setTimeoutMs] = useState(1000);
  const [blockMs, setBlockMs] = useState(0);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<TaskResult[]>([]);
  const pendingRef = useRef<number[]>([]);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "requestIdleCallback" in window);
    return () => { pendingRef.current.forEach(cancelRic); pendingRef.current = []; };
  }, []);

  const run = () => {
    if (!trial.canUse || running) return;
    pendingRef.current.forEach(cancelRic);
    pendingRef.current = [];
    setResults([]);
    setRunning(true);
    const fallback = !supported;
    const t0 = performance.now();
    for (let i = 0; i < taskCount; i++) {
      const queuedAt = performance.now();
      const n = i + 1;
      const id = ric((deadline) => {
        if (blockMs > 0) busyWork(blockMs);
        const startedAt = performance.now();
        const budget = deadline.timeRemaining();
        const work = Math.min(taskMs, Math.max(1, Math.round(budget)));
        busyWork(work);
        const ran = performance.now() - startedAt;
        setResults((p) => [...p, {
          n, queuedAt: queuedAt - t0, startedAt: startedAt - t0, waitedMs: startedAt - queuedAt,
          budgetMs: budget, ranMs: ran, didTimeout: deadline.didTimeout, fallback,
        }]);
      }, { timeout: timeoutMs });
      pendingRef.current.push(id);
    }
    const total = taskCount;
    const check = setInterval(() => {
      setResults((p) => {
        if (p.length >= total) { clearInterval(check); setRunning(false); }
        return p;
      });
    }, 200);
    trial.recordUse();
    toast.success(fallback ? "Scheduled via setTimeout fallback (rIC missing)" : `Scheduled ${taskCount} idle callbacks`);
  };

  const stop = () => {
    pendingRef.current.forEach(cancelRic);
    pendingRef.current = [];
    setRunning(false);
  };

  const reset = () => { stop(); setResults([]); };

  const exportCsv = () => {
    const header = "n,queuedMs,startedMs,waitedMs,budgetMs,ranMs,didTimeout,fallback";
    const rows = results.map((r) => [r.n, r.queuedAt.toFixed(1), r.startedAt.toFixed(1), r.waitedMs.toFixed(1), r.budgetMs.toFixed(1), r.ranMs.toFixed(1), r.didTimeout, r.fallback].join(","));
    downloadBlob(new Blob([[header, ...rows].join("\n")], { type: "text/csv" }), "idle-schedule.csv");
    toast.success("Results exported as CSV");
  };

  const maxT = Math.max(50, ...results.map((r) => r.startedAt + r.ranMs));
  const avgWait = results.length ? results.reduce((a, r) => a + r.waitedMs, 0) / results.length : 0;
  const timedOut = results.filter((r) => r.didTimeout).length;

  return (
    <ToolPageShell toolId="requestidlecallback-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="requestIdleCallback" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-[13px]">
            <span className="text-muted-foreground">requestIdleCallback</span>
            <span className={cn("font-bold", supported ? "text-green-600" : "text-amber-600")}>
              {supported === null ? "Checking…" : supported ? "Supported" : "Missing - fallback active"}
            </span>
          </div>

          <div>
            <label className="mb-1 flex items-center justify-between text-sm font-bold">Tasks <span className="text-primary">{taskCount}</span></label>
            <input type="range" min={2} max={40} value={taskCount} onChange={(e) => setTaskCount(Number(e.target.value))} className="w-full accent-primary" />
          </div>
          <div>
            <label className="mb-1 flex items-center justify-between text-sm font-bold">Work per task <span className="text-primary">{taskMs} ms</span></label>
            <input type="range" min={1} max={40} value={taskMs} onChange={(e) => setTaskMs(Number(e.target.value))} className="w-full accent-primary" />
          </div>
          <div>
            <label className="mb-1 flex items-center justify-between text-sm font-bold">timeout option <span className="text-primary">{timeoutMs} ms</span></label>
            <input type="range" min={100} max={5000} step={100} value={timeoutMs} onChange={(e) => setTimeoutMs(Number(e.target.value))} className="w-full accent-primary" />
            <p className="mt-1 text-xs text-muted-foreground">If the browser cannot find idle time before this, the task runs anyway with didTimeout = true.</p>
          </div>
          <div>
            <label className="mb-1 flex items-center justify-between text-sm font-bold">Main-thread load (busy work) <span className="text-primary">{blockMs} ms</span></label>
            <input type="range" min={0} max={60} value={blockMs} onChange={(e) => setBlockMs(Number(e.target.value))} className="w-full accent-primary" />
            <p className="mt-1 text-xs text-muted-foreground">Simulates a heavy tab to starve idle time.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <ActionButton busy={running} disabled={!trial.canUse} onClick={run}>
              <Play className="h-4 w-4" /> {running ? "Scheduling…" : "Run schedule"}
            </ActionButton>
            <button type="button" onClick={reset} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-bold hover:border-primary/40">
              <RotateCcw className="h-4 w-4" /> Reset
            </button>
          </div>

          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-muted-foreground">
            <p className="flex items-start gap-1.5">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Safari never shipped rIC; this lab falls back to setTimeout there and marks every row honestly.
              Each task respects deadline.timeRemaining() so it never overshoots the idle budget.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-border bg-card p-4 text-center">
              <p className="text-xl font-black">{results.length}<span className="text-sm text-muted-foreground">/{taskCount}</span></p>
              <p className="text-xs text-muted-foreground">tasks ran</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 text-center">
              <p className="text-xl font-black">{avgWait.toFixed(0)}<span className="text-sm text-muted-foreground"> ms</span></p>
              <p className="text-xs text-muted-foreground">avg wait</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 text-center">
              <p className={cn("text-xl font-black", timedOut ? "text-amber-500" : "")}>{timedOut}</p>
              <p className="text-xs text-muted-foreground">timed out</p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-bold"><Clock className="h-4 w-4" /> Schedule timeline</p>
              <button type="button" onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:border-primary/40">
                <Download className="h-3.5 w-3.5" /> CSV
              </button>
            </div>
            {results.length === 0 ? (
              <p className="text-sm text-muted-foreground">Run a schedule to see each task's wait, idle budget and runtime as live bars.</p>
            ) : (
              <div className="space-y-1.5">
                {results.map((r) => (
                  <div key={r.n} className="flex items-center gap-2">
                    <span className="w-8 shrink-0 font-mono text-[11px] text-muted-foreground">#{r.n}</span>
                    <div className="relative h-5 flex-1 overflow-hidden rounded bg-muted/50">
                      <div
                        className={cn("absolute top-0 h-full rounded", r.didTimeout ? "bg-amber-500/70" : "bg-primary/80")}
                        style={{ left: `${(r.startedAt / maxT) * 100}%`, width: `${Math.max(0.5, (r.ranMs / maxT) * 100)}%` }}
                        title={`waited ${r.waitedMs.toFixed(0)}ms, budget ${r.budgetMs.toFixed(1)}ms, ran ${r.ranMs.toFixed(1)}ms${r.didTimeout ? ", timed out" : ""}${r.fallback ? ", fallback" : ""}`}
                      />
                    </div>
                    <span className="w-28 shrink-0 text-right font-mono text-[11px] text-muted-foreground">
                      wait {r.waitedMs.toFixed(0)}ms / ran {r.ranMs.toFixed(1)}ms
                    </span>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-3 font-mono text-[11px] text-muted-foreground">
              Bar start = when the browser found idle time. Amber = ran via timeout (didTimeout). Tasks split work using deadline.timeRemaining() - the cooperative scheduling pattern.
            </p>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
