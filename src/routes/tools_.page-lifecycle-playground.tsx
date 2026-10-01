// /tools/page-lifecycle-playground - Interactive Page Lifecycle lab: live state
// machine, freeze/resume, visibility, bfcache eligibility and event log.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Pause, Play, RefreshCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/page-lifecycle-playground")({
  head: () => {
    const seo = getToolSeoMeta("page-lifecycle-playground");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: LifecycleTool,
});

interface LifeEvt {
  t: number;
  msg: string;
  kind: "info" | "ok" | "warn";
}

const STATE_ORDER = ["active", "passive", "hidden", "frozen", "terminated"] as const;

function LifecycleTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("page-lifecycle-playground", isPro);
  const seo = getToolSeo("page-lifecycle-playground");

  const [state, setState] = useState<(typeof STATE_ORDER)[number]>("active");
  const [visibility, setVisibility] = useState("visible");
  const [events, setEvents] = useState<LifeEvt[]>([]);
  const [wasDiscarded, setWasDiscarded] = useState<boolean | null>(null);
  const [frozen, setFrozen] = useState(false);
  const trialUsed = useRef(false);

  const log = useCallback((msg: string, kind: LifeEvt["kind"] = "info") => {
    setEvents((p) => [{ t: Date.now(), msg, kind }, ...p].slice(0, 80));
  }, []);

  useEffect(() => {
    const push = (msg: string, kind: LifeEvt["kind"] = "info") =>
      setEvents((p) => [{ t: Date.now(), msg, kind }, ...p].slice(0, 80));
    try {
      setWasDiscarded((document as Document & { wasDiscarded?: boolean }).wasDiscarded ?? null);
    } catch { setWasDiscarded(null); }

    const onVis = () => {
      const v = document.visibilityState;
      setVisibility(v);
      if (v === "hidden") { setState("hidden"); push("visibilitychange -> hidden (page is hidden, may freeze next)"); }
      else { setState("active"); push("visibilitychange -> visible (page is active again)", "ok"); }
    };
    const onFreeze = () => { setFrozen(true); setState("frozen"); push("freeze -> page frozen, timers stopped, no CPU", "warn"); };
    const onResume = () => { setFrozen(false); setState("active"); push("resume -> page unfrozen", "ok"); };
    const onPageHide = (e: PageTransitionEvent) => {
      push(`pagehide (persisted=${e.persisted}) -> ${e.persisted ? "entering bfcache" : "page is being discarded"}`, e.persisted ? "ok" : "warn");
      if (e.persisted) setState("frozen");
    };
    const onPageShow = (e: PageTransitionEvent) => {
      push(`pageshow (persisted=${e.persisted}) -> ${e.persisted ? "restored from bfcache" : "normal load"}`, "ok");
      if (e.persisted) { setState("active"); setFrozen(false); }
    };
    document.addEventListener("visibilitychange", onVis);
    document.addEventListener("freeze", onFreeze);
    document.addEventListener("resume", onResume);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);
    push("Lifecycle listeners attached - switch tabs, lock the screen, or use back/forward to watch events.");
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      document.removeEventListener("freeze", onFreeze);
      document.removeEventListener("resume", onResume);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  const startSession = useCallback(() => {
    if (!trial.canUse) { toast.error("Free trial exhausted - go Pro for unlimited runs"); return; }
    trial.recordUse();
    trialUsed.current = true;
    log("Monitoring session started - events will be recorded above the trial gate", "ok");
    toast.success("Lifecycle monitoring active");
  }, [trial, log]);

  const simulateFreeze = useCallback(() => {
    document.dispatchEvent(new Event("freeze"));
  }, []);

  const simulateResume = useCallback(() => {
    document.dispatchEvent(new Event("resume"));
  }, []);

  return (
    <ToolPageShell toolId="page-lifecycle-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Page Lifecycle" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <h3 className="mb-2 font-bold">Monitoring</h3>
            <ActionButton disabled={!trial.canUse || trialUsed.current} onClick={startSession}>
              <Play className="h-4 w-4" /> {trialUsed.current ? "Session active" : "Start monitored session"}
            </ActionButton>
            <p className="mt-1 text-xs text-muted-foreground">Starts a trial-counted session; listeners are always live so you can watch the state machine for free.</p>
          </div>

          <div className="rounded-xl border border-border p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-semibold">document.wasDiscarded</span>
              <span className={cn("font-mono font-bold", wasDiscarded ? "text-amber-600" : "text-green-600")}>
                {wasDiscarded === null ? "unknown" : wasDiscarded ? "true" : "false"}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">true means the browser discarded this tab earlier to save memory and reloaded it - state you did not persist was lost.</p>
          </div>

          <div>
            <h3 className="mb-2 font-bold">Simulate (dispatches the real events)</h3>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={simulateFreeze} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-bold hover:border-primary/50">
                <Pause className="h-4 w-4" /> freeze
              </button>
              <button type="button" onClick={simulateResume} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-bold hover:border-primary/50">
                <RefreshCcw className="h-4 w-4" /> resume
              </button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">These dispatch the actual freeze/resume events your handlers would receive from the browser.</p>
          </div>

          <div className="rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">Real-world tests to try</p>
            <ol className="mt-1 list-decimal space-y-1 pl-5">
              <li>Open this page in another tab, then switch away for a minute - watch visibilitychange and freeze.</li>
              <li>Navigate away and press Back - pageshow persisted=true means bfcache restored you instantly.</li>
              <li>Lock your phone screen - hidden, then freeze.</li>
            </ol>
          </div>

          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free monitored sessions left.
            </p>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold">State machine</h3>
              <span className="text-xs text-muted-foreground">visibility: <strong className="font-mono">{visibility}</strong></span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {STATE_ORDER.map((s, i) => (
                <div key={s} className="flex items-center gap-1.5">
                  <div className={cn(
                    "rounded-xl border px-4 py-2.5 text-sm font-bold transition",
                    state === s
                      ? s === "active" ? "border-green-500 bg-green-500/10 text-green-600"
                        : s === "frozen" ? "border-sky-500 bg-sky-500/10 text-sky-600"
                          : s === "terminated" ? "border-red-500 bg-red-500/10 text-red-500"
                            : "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground",
                  )}>
                    {s}
                  </div>
                  {i < STATE_ORDER.length - 1 && <span className="text-muted-foreground/50">-</span>}
                </div>
              ))}
            </div>
            {frozen && (
              <p className="mt-3 rounded-lg bg-sky-500/10 px-3 py-2 text-xs text-sky-700 dark:text-sky-300">
                Page is frozen: timers and rAF are suspended, no JavaScript runs. The browser may discard it next, or resume it.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold">Lifecycle event log</h3>
              <button type="button" onClick={() => setEvents([])} className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground">
                <Trash2 className="h-3.5 w-3.5" /> Clear
              </button>
            </div>
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground">Lifecycle events will stream here.</p>
            ) : (
              <ul className="max-h-64 space-y-1.5 overflow-auto text-sm">
                {events.map((e, i) => (
                  <li key={i} className="flex gap-2 rounded-lg bg-muted/60 px-3 py-1.5">
                    <span className="font-mono text-xs text-muted-foreground">{new Date(e.t).toLocaleTimeString()}</span>
                    <span className={cn("text-xs", e.kind === "warn" && "text-amber-600", e.kind === "ok" && "text-green-600")}>{e.msg}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}

export default LifecycleTool;
