// /tools/pomodoro-timer - Focus / short-break / long-break cycles with editable
// durations, browser notifications on phase change, and a session history.
// 100% in-browser.

import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bell, Download, Pause, Play, RotateCcw, Timer } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/pomodoro-timer")({
  head: () => {
    const seo = getToolSeoMeta("pomodoro-timer");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: PomodoroTool,
});

type Phase = "focus" | "short" | "long";

const PHASE_LABEL: Record<Phase, string> = {
  focus: "Focus",
  short: "Short break",
  long: "Long break",
};

interface Session {
  phase: Phase;
  minutes: number;
  endedAt: string;
}

const HISTORY_KEY = "iv_pomodoro_history";

function loadHistory(): Session[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.slice(-50) : [];
  } catch {
    return [];
  }
}

function beep() {
  try {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.frequency.value = 880;
    g.gain.value = 0.2;
    o.start();
    o.stop(ctx.currentTime + 0.6);
  } catch {
    /* audio not available */
  }
}

function notify(title: string, body: string) {
  try {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body });
    }
  } catch {
    /* notifications not available */
  }
}

function fmt(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

const numInputCls =
  "w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary";

function PomodoroTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("pomodoro-timer", isPro);
  const seo = getToolSeo("pomodoro-timer");

  const [focusMin, setFocusMin] = useState(25);
  const [shortMin, setShortMin] = useState(5);
  const [longMin, setLongMin] = useState(15);
  const [phase, setPhase] = useState<Phase>("focus");
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [cycles, setCycles] = useState(0);
  const [history, setHistory] = useState<Session[]>(() => loadHistory());
  const [perm, setPerm] = useState<string>(() =>
    typeof Notification !== "undefined" ? Notification.permission : "unsupported",
  );

  const endRef = useRef(0);
  const runningRef = useRef(false);
  runningRef.current = running;

  const durations: Record<Phase, number> = { focus: focusMin, short: shortMin, long: longMin };

  // Keep the countdown in sync with the editable durations while paused.
  const syncRemaining = (nextPhase: Phase, d: Record<Phase, number>) => {
    if (!runningRef.current) setRemaining(Math.max(1, d[nextPhase]) * 60);
  };

  const completePhase = (finished: Phase, d: Record<Phase, number>, doneCycles: number) => {
    const finishedMinutes = Math.max(1, d[finished]);
    const entry: Session = { phase: finished, minutes: finishedMinutes, endedAt: new Date().toISOString() };
    setHistory((h) => {
      const next = [...h, entry].slice(-50);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      } catch {
        /* private mode */
      }
      return next;
    });

    let nextPhase: Phase;
    let nextCycles = doneCycles;
    if (finished === "focus") {
      nextCycles = doneCycles + 1;
      nextPhase = nextCycles % 4 === 0 ? "long" : "short";
    } else {
      nextPhase = "focus";
    }
    setCycles(nextCycles);
    setPhase(nextPhase);
    setRemaining(Math.max(1, d[nextPhase]) * 60);
    setRunning(false);

    beep();
    const msg =
      finished === "focus"
        ? `${PHASE_LABEL[nextPhase]} time - you finished pomodoro ${nextCycles}.`
        : "Break over - back to focus.";
    notify("Pomodoro", msg);
    toast.success(finished === "focus" ? `Focus session ${nextCycles} done` : "Break finished", {
      description: msg,
    });
  };

  useEffect(() => {
    if (!running) return;
    endRef.current = Date.now() + remaining * 1000;
    const id = window.setInterval(() => {
      const left = (endRef.current - Date.now()) / 1000;
      if (left <= 0) {
        window.clearInterval(id);
        completePhase(phase, durations, cycles);
      } else {
        setRemaining(left);
      }
    }, 250);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, phase]);

  const toggle = () => {
    if (!running && remaining <= 0) setRemaining(Math.max(1, durations[phase]) * 60);
    setRunning((r) => !r);
  };

  const reset = () => {
    setRunning(false);
    setRemaining(Math.max(1, durations[phase]) * 60);
  };

  const switchPhase = (p: Phase) => {
    setRunning(false);
    setPhase(p);
    setRemaining(Math.max(1, durations[p]) * 60);
  };

  const changeDuration = (p: Phase, v: string) => {
    const n = Math.min(180, Math.max(1, Math.round(Number(v) || 1)));
    const next = { focus: focusMin, short: shortMin, long: longMin, [p]: n } as Record<Phase, number>;
    if (p === "focus") setFocusMin(n);
    if (p === "short") setShortMin(n);
    if (p === "long") setLongMin(n);
    syncRemaining(phase, next);
  };

  const requestPerm = async () => {
    try {
      const p = await Notification.requestPermission();
      setPerm(p);
      if (p === "granted") toast.success("Notifications enabled");
      else toast.error("Notification permission was not granted.");
    } catch {
      toast.error("Could not request notification permission.");
    }
  };

  const exportCsv = () => {
    if (history.length === 0 || !trial.canUse) {
      if (!trial.canUse) toast.error(`Free trial used up - ${TOOL_TRIAL_LIMIT} exports per tool. Go Pro for unlimited.`);
      else toast.error("No sessions in the history yet.");
      return;
    }
    const csv = ["phase,minutes,ended_at", ...history.map((s) => `${s.phase},${s.minutes},${s.endedAt}`)].join("\n");
    downloadBlob(new Blob([csv], { type: "text/csv" }), "pomodoro-history.csv");
    trial.recordUse();
    toast.success("History exported");
  };

  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      /* ignore */
    }
    toast.success("History cleared");
  };

  const progress = Math.max(1, durations[phase]) * 60;
  const pct = Math.min(100, Math.max(0, ((progress - remaining) / progress) * 100));

  return (
    <ToolPageShell toolId="pomodoro-timer" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Pomodoro Timer" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Phase durations (minutes)</p>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { p: "focus" as Phase, v: focusMin, label: "Focus" },
                  { p: "short" as Phase, v: shortMin, label: "Short" },
                  { p: "long" as Phase, v: longMin, label: "Long" },
                ]
              ).map((d) => (
                <div key={d.p}>
                  <label className="mb-1 block text-[11px] text-muted-foreground" htmlFor={`pm-${d.p}`}>
                    {d.label}
                  </label>
                  <input
                    id={`pm-${d.p}`}
                    value={d.v}
                    onChange={(e) => changeDuration(d.p, e.target.value)}
                    inputMode="numeric"
                    className={numInputCls}
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Phase</p>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(PHASE_LABEL) as Phase[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => switchPhase(p)}
                  className={cn(
                    "rounded-xl border px-2 py-2.5 text-xs font-bold transition",
                    phase === p
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {PHASE_LABEL[p]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <ActionButton onClick={toggle}>
              {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {running ? "Pause" : "Start"}
            </ActionButton>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center justify-center rounded-xl border border-border px-4 font-bold transition hover:border-primary/40"
              aria-label="Reset timer"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={requestPerm}
            disabled={perm === "granted" || perm === "unsupported"}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-bold transition hover:border-primary/40 disabled:opacity-50"
          >
            <Bell className="h-4 w-4" />
            {perm === "granted" ? "Notifications on" : perm === "unsupported" ? "Notifications unavailable" : "Enable phase-change alerts"}
          </button>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free history exports left - the timer itself is unlimited.
            </p>
          )}
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Timer className="h-4 w-4" /> {PHASE_LABEL[phase]}
              {phase === "focus" && cycles > 0 && ` - session ${cycles + 1}`}
            </p>
            <p className="font-mono text-7xl font-bold tabular-nums text-primary">{fmt(remaining)}</p>
            <div className="h-2 w-full max-w-sm overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">
              Completed focus sessions: <span className="font-bold text-foreground">{cycles}</span>
              {cycles > 0 && cycles % 4 === 0 ? " - long break earned" : ` - long break after ${4 - (cycles % 4)} more`}
            </p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Session history</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={exportCsv}
                  disabled={history.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold transition hover:border-primary/40 disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" /> Export CSV
                </button>
                <button
                  type="button"
                  onClick={clearHistory}
                  disabled={history.length === 0}
                  className="rounded-xl border border-border px-3 py-2 text-xs font-bold text-muted-foreground transition hover:border-red-400 hover:text-red-500 disabled:opacity-50"
                >
                  Clear
                </button>
              </div>
            </div>
            {history.length === 0 ? (
              <p className="rounded-xl bg-muted/40 p-4 text-center text-sm text-muted-foreground">
                Finished sessions are saved here on this device.
              </p>
            ) : (
              <div className="max-h-56 space-y-1.5 overflow-y-auto">
                {[...history].reverse().map((s, i) => (
                  <div
                    key={`${s.endedAt}-${i}`}
                    className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2 text-sm"
                  >
                    <span className="font-semibold">{PHASE_LABEL[s.phase]}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {s.minutes} min - {new Date(s.endedAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
