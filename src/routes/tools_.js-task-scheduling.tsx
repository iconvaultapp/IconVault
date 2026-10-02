// /tools/js-task-scheduling - Queue work through microtasks, setTimeout, rAF,
// scheduler.postTask and requestIdleCallback, then watch the real execution
// order render on a timeline.

import { useCallback, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Clock, Copy, Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/js-task-scheduling")({
  head: () => {
    const seo = getToolSeoMeta("js-task-scheduling");
    const canonical = "https://iconvault.site/tools/js-task-scheduling";
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
  component: TaskSchedulingTool,
});

type ApiId = "microtask" | "promise" | "timeout" | "raf" | "postTask-user" | "postTask-bg" | "idle";

const APIS: { id: ApiId; label: string; queue: string; supported: () => boolean; note: string }[] = [
  { id: "microtask", label: "queueMicrotask", queue: "Microtask", supported: () => typeof queueMicrotask === "function", note: "Runs right after the current task, before rendering." },
  { id: "promise", label: "Promise.then", queue: "Microtask", supported: () => true, note: "Also a microtask. Microtasks drain completely before the next macrotask." },
  { id: "timeout", label: "setTimeout(0)", queue: "Macrotask", supported: () => true, note: "Clamped to ~4ms when nested. Always after microtasks." },
  { id: "raf", label: "requestAnimationFrame", queue: "Render", supported: () => typeof requestAnimationFrame === "function", note: "Fires before the next paint. Ideal for visual updates." },
  { id: "postTask-user", label: "scheduler.postTask (user-visible)", queue: "Scheduler", supported: () => typeof (window as unknown as { scheduler?: { postTask?: unknown } }).scheduler?.postTask === "function", note: "Prioritized scheduler API. user-visible beats background." },
  { id: "postTask-bg", label: "scheduler.postTask (background)", queue: "Scheduler", supported: () => typeof (window as unknown as { scheduler?: { postTask?: unknown } }).scheduler?.postTask === "function", note: "Lowest priority. Great for prefetching and analytics." },
  { id: "idle", label: "requestIdleCallback", queue: "Idle", supported: () => typeof (window as unknown as { requestIdleCallback?: unknown }).requestIdleCallback === "function", note: "Runs when the main thread is idle, with a time budget." },
];

type Run = { id: ApiId; label: string; queue: string; order: number; at: number };

const QUEUE_COLORS: Record<string, string> = {
  Microtask: "#8b5cf6",
  Macrotask: "#f59e0b",
  Render: "#0F766E",
  Scheduler: "#3b82f6",
  Idle: "#94a3b8",
};

const DEMO_CODE = `// Queue one of each and watch the real execution order
const t0 = performance.now();
const log = (name) => console.log(name, Math.round(performance.now() - t0));

queueMicrotask(() => log("microtask"));
Promise.resolve().then(() => log("promise.then"));
setTimeout(() => log("setTimeout(0)"), 0);
requestAnimationFrame(() => log("rAF"));
scheduler.postTask(() => log("postTask user-visible"), { priority: "user-visible" });
scheduler.postTask(() => log("postTask background"), { priority: "background" });
requestIdleCallback(() => log("idle"));

// Typical order: microtask, promise.then, rAF,
// postTask user-visible, setTimeout(0), postTask background, idle`;

function TaskSchedulingTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("js-task-scheduling", isPro);
  const seo = getToolSeo("js-task-scheduling");
  const [selected, setSelected] = useState<Set<ApiId>>(new Set(["microtask", "promise", "timeout", "raf"]));
  const [runs, setRuns] = useState<Run[]>([]);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const orderRef = useRef(0);

  const toggle = useCallback((id: ApiId) => {
    setSelected((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }, []);

  const runDemo = useCallback(() => {
    if (running || selected.size === 0 || !trial.canUse) return;
    setRunning(true);
    setRuns([]);
    orderRef.current = 0;
    const t0 = performance.now();
    const record = (id: ApiId) => {
      const api = APIS.find((a) => a.id === id)!;
      setRuns((p) => [...p, { id, label: api.label, queue: api.queue, order: ++orderRef.current, at: performance.now() - t0 }]);
    };
    const win = window as unknown as {
      scheduler?: { postTask: (fn: () => void, opts?: { priority: string }) => void };
      requestIdleCallback?: (fn: () => void) => void;
    };
    let pending = selected.size;
    const done = () => { if (--pending === 0) { setRunning(false); } };

    for (const id of selected) {
      const wrap = () => { record(id); done(); };
      switch (id) {
        case "microtask": queueMicrotask(wrap); break;
        case "promise": void Promise.resolve().then(wrap); break;
        case "timeout": setTimeout(wrap, 0); break;
        case "raf": requestAnimationFrame(wrap); break;
        case "postTask-user": win.scheduler!.postTask(wrap, { priority: "user-visible" }); break;
        case "postTask-bg": win.scheduler!.postTask(wrap, { priority: "background" }); break;
        case "idle": win.requestIdleCallback!(wrap); break;
      }
    }
    trial.recordUse();
    // safety: if an API never fires (background tab throttles rAF/idle), unstick
    setTimeout(() => setRunning(false), 5000);
  }, [running, selected, trial]);

  const reset = useCallback(() => { setRuns([]); orderRef.current = 0; }, []);
  const maxAt = Math.max(1, ...runs.map((r) => r.at));

  const copyCode = useCallback(() => {
    void navigator.clipboard.writeText(DEMO_CODE)
      .then(() => { toast.success("Demo code copied"); setCopied(true); setTimeout(() => setCopied(false), 1500); })
      .catch(() => toast.error("Copy failed"));
  }, []);

  return (
    <ToolPageShell toolId="js-task-scheduling" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="JS Task Scheduling" left={trial.left} />
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <p className="flex items-center gap-2 text-sm font-bold"><Clock className="h-4 w-4 text-primary" /> Pick scheduling APIs</p>
          <div className="space-y-2">
            {APIS.map((a) => {
              const ok = a.supported();
              const on = selected.has(a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  disabled={!ok}
                  onClick={() => toggle(a.id)}
                  className={cn(
                    "w-full rounded-xl border p-3 text-left transition",
                    !ok ? "cursor-not-allowed border-border opacity-40" : on ? "border-primary bg-primary/10" : "border-border hover:border-primary/40",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[13px] font-bold">{a.label}</span>
                    <span className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white" style={{ background: QUEUE_COLORS[a.queue] }}>{a.queue}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{ok ? a.note : "Not supported in this browser."}</p>
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <ActionButton onClick={runDemo} busy={running} disabled={running || selected.size === 0 || !trial.canUse}>
              <Play className="h-4 w-4" /> {running ? "Running…" : "Run all selected"}
            </ActionButton>
            <button
              type="button"
              onClick={reset}
              className="flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              <RotateCcw className="h-4 w-4" /> Clear
            </button>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 text-sm font-bold">Execution order timeline</p>
            {runs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Select APIs and press Run. Each bar shows when that task actually executed, in milliseconds after queueing.
              </div>
            ) : (
              <div className="space-y-2.5">
                {runs.map((r) => (
                  <div key={`${r.id}-${r.order}`} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">{r.order}</span>
                    <span className="w-44 shrink-0 truncate font-mono text-[12.5px] font-semibold">{r.label}</span>
                    <div className="h-5 flex-1 overflow-hidden rounded bg-muted/60">
                      <div
                        className="h-full rounded transition-all"
                        style={{ width: `${Math.max(4, (r.at / maxAt) * 100)}%`, background: QUEUE_COLORS[r.queue] }}
                      />
                    </div>
                    <span className="w-20 shrink-0 text-right font-mono text-xs text-muted-foreground">{r.at.toFixed(1)}ms</span>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              Microtasks always win the race to run first. rAF waits for the next frame. scheduler.postTask orders by
              priority (user-blocking, then user-visible, then background). Idle callbacks run last, when the browser has spare time.
            </p>
          </div>
          <div className="relative overflow-hidden rounded-xl border border-border bg-[#0d1117]">
            <button
              type="button"
              onClick={copyCode}
              className="absolute right-2 top-2 flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/20"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
            <pre className="overflow-x-auto p-4 pr-20 font-mono text-[13px] leading-relaxed text-[#e6edf3]">{DEMO_CODE}</pre>
          </div>
        </div>
      </div>
      {!isPro && (
        <p className="mt-6 text-xs text-muted-foreground">{trial.left} of {TOOL_TRIAL_LIMIT} free runs left. Runs fully in your browser.</p>
      )}
    </ToolPageShell>
  );
}
