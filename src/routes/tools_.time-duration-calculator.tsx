// /tools/time-duration-calculator - Duration between two dates + add/subtract time from a date.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRightLeft, CalendarClock, Copy, Plus as PlusMinus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/time-duration-calculator";
import toolSeoMeta from "@/lib/tool-seo-meta-data/time-duration-calculator";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/time-duration-calculator")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/time-duration-calculator";
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
  component: TimeDurationTool,
});

const INPUT = "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary";
const LABEL = "mb-1.5 block text-[13px] font-medium text-foreground/80";

function fmtDateTime(d: Date): string {
  return d.toLocaleString("en-US", {
    weekday: "short", year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function fmtNum(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function TimeDurationTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("time-duration-calculator", isPro);
  const seo = toolSeo;

  const [tab, setTab] = useState<"between" | "shift">("between");

  // --- between two datetimes ---
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [diff, setDiff] = useState<null | {
    days: number; hours: number; minutes: number; seconds: number; negative: boolean;
    totalHours: number; totalMinutes: number; totalSeconds: number;
  }>(null);

  // --- add/subtract from a date ---
  const [base, setBase] = useState("");
  const [dDays, setDDays] = useState("0");
  const [dHours, setDHours] = useState("0");
  const [dMins, setDMins] = useState("0");
  const [shifted, setShifted] = useState<null | { date: Date; adding: boolean }>(null);

  const calcDiff = () => {
    if (!trial.canUse) return;
    const a = new Date(start);
    const b = new Date(end);
    if (isNaN(a.getTime()) || isNaN(b.getTime())) {
      toast.error("Pick both a start and an end date/time.");
      return;
    }
    const totalSec = Math.floor((b.getTime() - a.getTime()) / 1000);
    const negative = totalSec < 0;
    let rem = Math.abs(totalSec);
    const days = Math.floor(rem / 86400); rem -= days * 86400;
    const hours = Math.floor(rem / 3600); rem -= hours * 3600;
    const minutes = Math.floor(rem / 60); rem -= minutes * 60;
    setDiff({
      days, hours, minutes, seconds: rem, negative,
      totalHours: Math.abs(totalSec) / 3600,
      totalMinutes: Math.abs(totalSec) / 60,
      totalSeconds: Math.abs(totalSec),
    });
    trial.recordUse();
    toast.success("Duration calculated");
  };

  const calcShift = () => {
    if (!trial.canUse) return;
    const d = new Date(base);
    if (isNaN(d.getTime())) {
      toast.error("Pick a starting date/time.");
      return;
    }
    const deltaMs =
      (Number(dDays) || 0) * 86400000 +
      (Number(dHours) || 0) * 3600000 +
      (Number(dMins) || 0) * 60000;
    const adding = deltaMs >= 0;
    setShifted({ date: new Date(d.getTime() + deltaMs), adding });
    trial.recordUse();
    toast.success("Date calculated");
  };

  const copy = async (text: string, label: string) => {
    if (!trial.canUse) return;
    await navigator.clipboard.writeText(text);
    trial.recordUse();
    toast.success(`${label} copied`);
  };

  const diffText = diff
    ? `${diff.negative ? "-" : ""}${diff.days}d ${diff.hours}h ${diff.minutes}m ${diff.seconds}s (${fmtNum(diff.totalHours)} total hours)`
    : "";

  return (
    <ToolPageShell toolId="time-duration-calculator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Time Duration" left={trial.left} />

      <div className="mb-5 flex gap-2">
        {([
          { k: "between", label: "Duration between dates", icon: ArrowRightLeft },
          { k: "shift", label: "Add / subtract time", icon: PlusMinus },
        ] as const).map(({ k, label, icon: Icon }) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition",
              tab === k
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/40",
            )}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {tab === "between" ? (
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
            <div>
              <label className={LABEL} htmlFor="td-start">Start date and time</label>
              <input id="td-start" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className={LABEL} htmlFor="td-end">End date and time</label>
              <input id="td-end" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} className={INPUT} />
            </div>
            <ActionButton disabled={!start || !end || !trial.canUse} onClick={calcDiff}>
              <CalendarClock className="h-4 w-4" /> Calculate duration
            </ActionButton>
            {!isPro && (
              <p className="text-xs text-muted-foreground">
                {trial.left} of {TOOL_TRIAL_LIMIT} free calculations left - everything runs in your browser.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            {!diff ? (
              <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center">
                <CalendarClock className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="font-semibold">Your duration appears here</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Pick a start and an end to see the exact days, hours, minutes and seconds between them.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <p className="text-[13px] font-medium text-muted-foreground">Duration</p>
                  <p className="mt-1 text-2xl font-bold tracking-tight">
                    {diff.negative && <span className="text-red-500">-</span>}
                    {diff.days} <span className="text-base font-semibold text-muted-foreground">days</span>{" "}
                    {diff.hours} <span className="text-base font-semibold text-muted-foreground">hrs</span>{" "}
                    {diff.minutes} <span className="text-base font-semibold text-muted-foreground">min</span>{" "}
                    {diff.seconds} <span className="text-base font-semibold text-muted-foreground">sec</span>
                  </p>
                  {diff.negative && (
                    <p className="mt-1 text-xs text-muted-foreground">The end date is before the start date.</p>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { k: "Total hours", v: fmtNum(diff.totalHours) },
                    { k: "Total minutes", v: fmtNum(diff.totalMinutes) },
                    { k: "Total seconds", v: fmtNum(diff.totalSeconds) },
                  ].map(({ k, v }) => (
                    <div key={k} className="rounded-xl border border-border bg-muted/30 p-3 text-center">
                      <p className="text-xs text-muted-foreground">{k}</p>
                      <p className="mt-0.5 font-mono text-sm font-bold">{v}</p>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => void copy(diffText, "Duration")}
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold transition hover:border-primary/40"
                >
                  <Copy className="h-4 w-4" /> Copy result
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
            <div>
              <label className={LABEL} htmlFor="td-base">Starting date and time</label>
              <input id="td-base" type="datetime-local" value={base} onChange={(e) => setBase(e.target.value)} className={INPUT} />
            </div>
            <div>
              <p className={LABEL}>Time to add or subtract <span className="font-normal text-muted-foreground">(use negative numbers to subtract)</span></p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: "d-days", label: "Days", v: dDays, set: setDDays },
                  { id: "d-hours", label: "Hours", v: dHours, set: setDHours },
                  { id: "d-mins", label: "Minutes", v: dMins, set: setDMins },
                ].map(({ id, label, v, set }) => (
                  <div key={id}>
                    <label className="mb-1 block text-xs text-muted-foreground" htmlFor={`td-${id}`}>{label}</label>
                    <input id={`td-${id}`} type="number" value={v} onChange={(e) => set(e.target.value)} className={cn(INPUT, "font-mono")} />
                  </div>
                ))}
              </div>
            </div>
            <ActionButton disabled={!base || !trial.canUse} onClick={calcShift}>
              <PlusMinus className="h-4 w-4" /> Calculate new date
            </ActionButton>
            {!isPro && (
              <p className="text-xs text-muted-foreground">
                {trial.left} of {TOOL_TRIAL_LIMIT} free calculations left - everything runs in your browser.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            {!shifted ? (
              <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center">
                <PlusMinus className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="font-semibold">Your new date appears here</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Add 90 days, subtract 6 hours, or shift by any combination - handy for deadlines and scheduling.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <p className="text-[13px] font-medium text-muted-foreground">
                    {shifted.adding ? "After adding" : "After subtracting"}
                  </p>
                  <p className="mt-1 text-2xl font-bold tracking-tight">{fmtDateTime(shifted.date)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void copy(fmtDateTime(shifted.date), "Date")}
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold transition hover:border-primary/40"
                >
                  <Copy className="h-4 w-4" /> Copy result
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </ToolPageShell>
  );
}
