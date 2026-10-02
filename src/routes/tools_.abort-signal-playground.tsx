// /tools/abort-signal-playground - Interactive AbortController / AbortSignal demos:
// cancel a slow fetch, AbortSignal.timeout, and AbortSignal.any racing. In-browser.

import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Eraser, OctagonX, Play, Timer, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/abort-signal-playground")({
  head: () => {
    const seo = getToolSeoMeta("abort-signal-playground");
    const canonical = "https://iconvault.site/tools/abort-signal-playground";
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
  component: AbortPlayground,
});

type Log = { t: string; msg: string; kind: "info" | "ok" | "err" };

const SLOW = "https://httpbin.org/delay/5"; // waits 5s before responding

function AbortPlayground() {
  const { isPro } = usePlan();
  const trial = useToolTrial("abort-signal-playground", isPro);
  const seo = getToolSeo("abort-signal-playground");

  const [logs, setLogs] = useState<Log[]>([]);
  const [busy, setBusy] = useState(false);
  const ctrlRef = useRef<AbortController | null>(null);
  const raceRef = useRef<{ a: AbortController; b: AbortController } | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  const now = () => new Date().toLocaleTimeString("en-GB");
  const push = (msg: string, kind: Log["kind"] = "info") => {
    setLogs((l) => [...l.slice(-120), { t: now(), msg, kind }]);
    requestAnimationFrame(() => logEndRef.current?.scrollIntoView({ block: "end" }));
  };

  const demoCancel = async () => {
    if (!trial.canUse || busy) return;
    trial.recordUse();
    const c = new AbortController();
    ctrlRef.current = c;
    setBusy(true);
    push("fetch() started with AbortController signal -> httpbin.org/delay/5");
    push("Waiting 5s for the server... press Abort request to cancel.");
    const t0 = performance.now();
    try {
      const res = await fetch(SLOW, { signal: c.signal });
      push(`Finished in ${((performance.now() - t0) / 1000).toFixed(1)}s - status ${res.status}`, "ok");
    } catch (e) {
      const ms = ((performance.now() - t0) / 1000).toFixed(1);
      if (e instanceof DOMException && e.name === "AbortError") {
        push(`Aborted after ${ms}s - fetch rejected with AbortError. Reason: ${String(c.signal.reason ?? "none")}`, "err");
      } else {
        push(`Network error after ${ms}s: ${e instanceof Error ? e.message : String(e)} (httpbin may be unreachable)`, "err");
      }
    } finally {
      setBusy(false);
      ctrlRef.current = null;
    }
  };

  const abortFetch = () => {
    if (ctrlRef.current) {
      ctrlRef.current.abort(new Error("user clicked abort"));
      push("controller.abort() called with a custom Error reason");
    } else {
      toast.info("No request is running right now");
    }
  };

  const demoTimeout = async () => {
    if (!trial.canUse || busy) return;
    trial.recordUse();
    setBusy(true);
    push("AbortSignal.timeout(2500) - signal auto-aborts after 2.5s");
    const t0 = performance.now();
    try {
      const res = await fetch("https://httpbin.org/delay/6", { signal: AbortSignal.timeout(2500) });
      push(`Unexpectedly finished - status ${res.status}`, "ok");
    } catch (e) {
      const ms = ((performance.now() - t0) / 1000).toFixed(1);
      push(e instanceof DOMException && e.name === "TimeoutError"
        ? `Auto-aborted after ${ms}s with TimeoutError (the 6s server never stood a chance)`
        : `Failed after ${ms}s: ${e instanceof Error ? e.message : String(e)}`, "err");
    } finally {
      setBusy(false);
    }
  };

  const demoRaceSetup = () => {
    if (!trial.canUse) return;
    trial.recordUse();
    const a = new AbortController();
    const b = new AbortController();
    raceRef.current = { a, b };
    const combined = AbortSignal.any([a.signal, b.signal]);
    combined.addEventListener("abort", () => {
      push(`combined signal aborted - reason: ${String(combined.reason ?? "none")}`, "err");
      raceRef.current = null;
    }, { once: true });
    push("AbortSignal.any([A, B]) created - aborting EITHER controller kills the combined signal");
  };

  const raceAbort = (which: "a" | "b") => {
    const r = raceRef.current;
    if (!r) { toast.info("Set up the race first"); return; }
    r[which].abort(which === "a" ? "timeout-A fired" : new Error("user cancelled B"));
    push(`controller ${which.toUpperCase()}.abort() called`);
  };

  const snippet = (code: string) => (
    <pre className="overflow-x-auto rounded-lg bg-muted/60 p-3 font-mono text-xs leading-relaxed">{code}</pre>
  );

  return (
    <ToolPageShell toolId="abort-signal-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="AbortSignal Playground" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          {/* Demo 1 */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 text-base font-extrabold"><OctagonX className="h-5 w-5 text-primary" /> 1. Cancel a slow fetch</h2>
            <p className="mt-1 text-sm text-muted-foreground">Start a request that takes 5 seconds, then abort it mid-flight. Watch the promise reject with an AbortError.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <ActionButton busy={busy} onClick={demoCancel} disabled={!trial.canUse}><Play className="h-4 w-4" /> Start slow fetch</ActionButton>
              <button type="button" onClick={abortFetch} className="inline-flex items-center gap-2 rounded-xl border border-red-500/40 px-5 py-3 text-sm font-bold text-red-500 transition hover:bg-red-500/10"><OctagonX className="h-4 w-4" /> Abort request</button>
            </div>
            {snippet(`const controller = new AbortController();\n\nfetch("https://httpbin.org/delay/5", {\n  signal: controller.signal,\n})\n  .catch((e) => {\n    if (e.name === "AbortError") console.log("cancelled");\n  });\n\n// later, e.g. on unmount or user cancel:\ncontroller.abort(); // or controller.abort(customReason)`)}
          </section>

          {/* Demo 2 */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 text-base font-extrabold"><Timer className="h-5 w-5 text-primary" /> 2. AbortSignal.timeout()</h2>
            <p className="mt-1 text-sm text-muted-foreground">A one-liner that aborts automatically after N milliseconds. No setTimeout bookkeeping, and it throws a TimeoutError.</p>
            <div className="mt-3">
              <ActionButton busy={busy} onClick={demoTimeout} disabled={!trial.canUse}><Play className="h-4 w-4" /> Run 2.5s timeout demo</ActionButton>
            </div>
            {snippet(`// rejects with TimeoutError after 2500ms\nconst res = await fetch(url, {\n  signal: AbortSignal.timeout(2500),\n});`)}
          </section>

          {/* Demo 3 */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 text-base font-extrabold"><Zap className="h-5 w-5 text-primary" /> 3. AbortSignal.any() - race two signals</h2>
            <p className="mt-1 text-sm text-muted-foreground">Combine signals: the combined signal aborts when ANY source aborts. Handy for "cancel on timeout OR user action".</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <ActionButton onClick={demoRaceSetup} disabled={!trial.canUse}><Play className="h-4 w-4" /> Set up race</ActionButton>
              <button type="button" onClick={() => raceAbort("a")} className="rounded-xl border border-border px-4 py-3 text-sm font-bold transition hover:border-primary/50">Abort A</button>
              <button type="button" onClick={() => raceAbort("b")} className="rounded-xl border border-border px-4 py-3 text-sm font-bold transition hover:border-primary/50">Abort B</button>
            </div>
            {snippet(`const combined = AbortSignal.any([\n  userSignal,          // e.g. cancel button\n  AbortSignal.timeout(10000), // or a 10s deadline\n]);\n\nawait fetch(url, { signal: combined });`)}
          </section>
          {!isPro && <p className="text-xs text-muted-foreground">{trial.left} of {TOOL_TRIAL_LIMIT} free demo runs left.</p>}
        </div>

        {/* Log */}
        <div className="flex flex-col rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-4 lg:max-h-[80vh]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-extrabold">Event log</h2>
            <button type="button" onClick={() => setLogs([])} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50"><Eraser className="h-3.5 w-3.5" /> Clear</button>
          </div>
          <div className="min-h-[280px] flex-1 space-y-1.5 overflow-y-auto rounded-xl bg-muted/40 p-3 font-mono text-xs">
            {logs.length === 0 && <p className="text-muted-foreground">Run a demo on the left. Every signal event lands here with a timestamp.</p>}
            {logs.map((l, i) => (
              <div key={i} className="flex gap-2">
                <span className="shrink-0 text-muted-foreground">{l.t}</span>
                <span className={cn(l.kind === "ok" && "text-emerald-600 dark:text-emerald-400", l.kind === "err" && "text-red-500")}>{l.msg}</span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
