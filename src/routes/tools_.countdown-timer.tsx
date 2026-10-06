// /tools/countdown-timer - Count down to a date/time or a duration with a live
// display, a sound plus browser notification on finish, and shareable text.
// 100% in-browser.

import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bell, ClipboardCopy, Hourglass, Pause, Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/countdown-timer";
import toolSeoMeta from "@/lib/tool-seo-meta-data/countdown-timer";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/countdown-timer")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/countdown-timer";
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
  component: CountdownTool,
});

const PRESETS = [
  { label: "10 min", minutes: 10 },
  { label: "30 min", minutes: 30 },
  { label: "1 hour", minutes: 60 },
  { label: "2 hours", minutes: 120 },
  { label: "24 hours", minutes: 1440 },
];

function beep(times = 3) {
  try {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    for (let i = 0; i < times; i++) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.frequency.value = 880;
      g.gain.value = 0.2;
      const t = ctx.currentTime + i * 0.7;
      o.start(t);
      o.stop(t + 0.5);
    }
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

function fmtParts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return { d, h, m, s };
}

function fmtLong(ms: number): string {
  const { d, h, m, s } = fmtParts(ms);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0 || d > 0) parts.push(`${h}h`);
  if (m > 0 || h > 0 || d > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}

const numInputCls =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary";

function CountdownTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("countdown-timer", isPro);
  const seo = toolSeo;

  const [mode, setMode] = useState<"date" | "duration">("duration");
  const [dateStr, setDateStr] = useState("");
  const [customMin, setCustomMin] = useState("45");
  const [target, setTarget] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [perm, setPerm] = useState<string>(() =>
    typeof Notification !== "undefined" ? Notification.permission : "unsupported",
  );

  const pausedRef = useRef(0);

  const start = () => {
    let ms: number;
    if (mode === "date") {
      const t = new Date(dateStr).getTime();
      if (!dateStr || !isFinite(t)) {
        toast.error("Pick a target date and time first.");
        return;
      }
      ms = t - Date.now();
      if (ms <= 0) {
        toast.error("That date is in the past.");
        return;
      }
    } else {
      const n = parseFloat(customMin);
      if (!isFinite(n) || n <= 0) {
        toast.error("Enter a duration in minutes.");
        return;
      }
      ms = n * 60 * 1000;
    }
    setTarget(Date.now() + ms);
    setRemaining(ms);
    setRunning(true);
  };

  const pause = () => {
    pausedRef.current = remaining;
    setRunning(false);
  };

  const resume = () => {
    setTarget(Date.now() + pausedRef.current);
    setRemaining(pausedRef.current);
    setRunning(true);
  };

  const reset = () => {
    setRunning(false);
    setTarget(null);
    setRemaining(0);
  };

  useEffect(() => {
    if (!running || target === null) return;
    const id = window.setInterval(() => {
      const left = target - Date.now();
      if (left <= 0) {
        window.clearInterval(id);
        setRemaining(0);
        setRunning(false);
        setTarget(null);
        beep();
        notify("Countdown finished", "Your countdown timer reached zero.");
        toast.success("Countdown finished");
      } else {
        setRemaining(left);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [running, target]);

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

  const share = async () => {
    if (target === null || remaining <= 0 || !trial.canUse) {
      if (!trial.canUse) toast.error(`Free trial used up - ${TOOL_TRIAL_LIMIT} copies per tool. Go Pro for unlimited.`);
      else toast.error("Start a countdown first.");
      return;
    }
    const text = `Countdown: ${fmtLong(remaining)} remaining - ends ${new Date(target).toLocaleString()}.`;
    try {
      await navigator.clipboard.writeText(text);
      trial.recordUse();
      toast.success("Shareable text copied");
    } catch {
      toast.error("Copy failed - select and copy manually.");
    }
  };

  const { d, h, m, s } = fmtParts(remaining);
  const pad = (n: number) => String(n).padStart(2, "0");
  const units: { v: string; l: string }[] = [
    { v: pad(d), l: "days" },
    { v: pad(h), l: "hours" },
    { v: pad(m), l: "min" },
    { v: pad(s), l: "sec" },
  ];

  return (
    <ToolPageShell toolId="countdown-timer" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Countdown Timer" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Countdown to</p>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: "duration" as const, label: "Duration" },
                  { id: "date" as const, label: "Date and time" },
                ]
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setMode(t.id)}
                  className={cn(
                    "rounded-xl border px-2 py-2.5 text-sm font-bold transition",
                    mode === t.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {mode === "date" ? (
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80" htmlFor="cd-date">
                Target date and time
              </label>
              <input
                id="cd-date"
                type="datetime-local"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className={numInputCls}
              />
            </div>
          ) : (
            <div>
              <p className="mb-2 text-[13px] font-medium text-foreground/80">Presets</p>
              <div className="grid grid-cols-3 gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setCustomMin(String(p.minutes))}
                    className={cn(
                      "rounded-xl border px-2 py-2.5 font-mono text-xs font-bold transition",
                      customMin === String(p.minutes)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="mt-3">
                <label className="mb-1.5 block text-[13px] font-medium text-foreground/80" htmlFor="cd-min">
                  Custom minutes
                </label>
                <input
                  id="cd-min"
                  value={customMin}
                  onChange={(e) => setCustomMin(e.target.value)}
                  inputMode="decimal"
                  className={numInputCls}
                />
              </div>
            </div>
          )}

          <div className="flex gap-2">
            {!running && target === null ? (
              <div className="flex-1 [&>button]:w-full">
                <ActionButton onClick={start}>
                  <Play className="h-4 w-4" /> Start
                </ActionButton>
              </div>
            ) : running ? (
              <div className="flex-1 [&>button]:w-full">
                <ActionButton onClick={pause}>
                  <Pause className="h-4 w-4" /> Pause
                </ActionButton>
              </div>
            ) : (
              <div className="flex-1 [&>button]:w-full">
                <ActionButton onClick={resume}>
                  <Play className="h-4 w-4" /> Resume
                </ActionButton>
              </div>
            )}
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center justify-center rounded-xl border border-border px-4 font-bold transition hover:border-primary/40"
              aria-label="Reset countdown"
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
            {perm === "granted" ? "Notifications on" : perm === "unsupported" ? "Notifications unavailable" : "Enable finish alert"}
          </button>

          <ActionButton disabled={target === null || !trial.canUse} onClick={share}>
            <ClipboardCopy className="h-4 w-4" /> Copy shareable text
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left - the timer itself is unlimited.
            </p>
          )}
        </div>

        <div className="flex min-h-[320px] flex-col items-center justify-center gap-6 rounded-2xl border border-border bg-card p-5 text-center">
          <Hourglass className="h-10 w-10 text-muted-foreground/50" />
          {target === null && !running ? (
            <>
              <div>
                <p className="font-semibold">No countdown running</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Pick a duration or a target date, then press Start. A sound and a browser notification fire at zero.
                </p>
              </div>
              <div className="flex gap-3">
                {units.map((u) => (
                  <div key={u.l} className="w-20 rounded-xl border border-border bg-muted/30 p-3">
                    <p className="font-mono text-3xl font-bold text-muted-foreground">00</p>
                    <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{u.l}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex gap-3">
                {units.map((u) => (
                  <div key={u.l} className="w-20 rounded-xl border border-border bg-muted/30 p-3">
                    <p className="font-mono text-3xl font-bold tabular-nums text-primary">{u.v}</p>
                    <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{u.l}</p>
                  </div>
                ))}
              </div>
              <p className="font-mono text-sm text-muted-foreground">
                Ends {target !== null ? new Date(target).toLocaleString() : ""}
                {running ? " - counting down" : " - paused"}
              </p>
            </>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
