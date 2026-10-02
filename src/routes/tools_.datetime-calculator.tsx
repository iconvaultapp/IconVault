// /tools/datetime-calculator - Date math: add/subtract, differences, ISO week, day of year.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, Copy, Equal, Info } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/datetime-calculator")({
  head: () => {
    const seo = getToolSeoMeta("datetime-calculator");
    const canonical = "https://iconvault.site/tools/datetime-calculator";
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
  component: DateTimeTool,
});

const INPUT = "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary";
const LABEL = "mb-1.5 block text-[13px] font-medium text-foreground/80";

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

/** ISO 8601 week number (1-53). */
function isoWeek(d: Date): { week: number; year: number } {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = (x.getUTCDay() + 6) % 7; // Monday = 0
  x.setUTCDate(x.getUTCDate() - day + 3); // Thursday of this week
  const firstThursday = new Date(Date.UTC(x.getUTCFullYear(), 0, 4));
  const firstDay = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDay + 3);
  const week = 1 + Math.round((x.getTime() - firstThursday.getTime()) / (7 * 86400000));
  return { week, year: x.getUTCFullYear() };
}

function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 1);
  return Math.floor((d.getTime() - start.getTime()) / 86400000) + 1;
}

function DateTimeTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("datetime-calculator", isPro);
  const seo = getToolSeo("datetime-calculator");

  const [tab, setTab] = useState<"add" | "diff" | "info">("add");

  // --- add/subtract ---
  const [aDate, setADate] = useState("");
  const [aAmt, setAAmt] = useState("30");
  const [aUnit, setAUnit] = useState<"days" | "weeks" | "months" | "years">("days");
  const [aDir, setADir] = useState<"add" | "sub">("add");
  const [aResult, setAResult] = useState<Date | null>(null);

  // --- difference ---
  const [d1, setD1] = useState("");
  const [d2, setD2] = useState("");
  const [dResult, setDResult] = useState<{ days: number; weeks: string; months: string; negative: boolean } | null>(null);

  // --- date info ---
  const [iDate, setIDate] = useState("");

  const calcAdd = () => {
    if (!trial.canUse) return;
    const d = new Date(`${aDate}T12:00:00`);
    if (!aDate || isNaN(d.getTime())) { toast.error("Pick a date first."); return; }
    const amt = (Number(aAmt) || 0) * (aDir === "add" ? 1 : -1);
    const r = new Date(d);
    if (aUnit === "days") r.setDate(r.getDate() + amt);
    else if (aUnit === "weeks") r.setDate(r.getDate() + amt * 7);
    else if (aUnit === "months") r.setMonth(r.getMonth() + amt);
    else r.setFullYear(r.getFullYear() + amt);
    setAResult(r);
    trial.recordUse();
    toast.success("Date calculated");
  };

  const calcDiff = () => {
    if (!trial.canUse) return;
    const x = new Date(`${d1}T12:00:00`);
    const y = new Date(`${d2}T12:00:00`);
    if (!d1 || !d2 || isNaN(x.getTime()) || isNaN(y.getTime())) { toast.error("Pick both dates."); return; }
    const days = Math.round((y.getTime() - x.getTime()) / 86400000);
    const abs = Math.abs(days);
    setDResult({
      days: abs,
      weeks: (abs / 7).toFixed(2),
      months: (abs / 30.4375).toFixed(2),
      negative: days < 0,
    });
    trial.recordUse();
    toast.success("Difference calculated");
  };

  const copy = async (text: string) => {
    if (!trial.canUse) return;
    await navigator.clipboard.writeText(text);
    trial.recordUse();
    toast.success("Result copied");
  };

  const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const iD = iDate ? new Date(`${iDate}T12:00:00`) : null;
  const iValid = iD && !isNaN(iD.getTime());
  const iInfo =
    iValid && iD
      ? { ...isoWeek(iD), doy: dayOfYear(iD), daysLeft: (isLeap(iD.getFullYear()) ? 366 : 365) - dayOfYear(iD) }
      : null;

  const trialNote = !isPro && (
    <p className="text-xs text-muted-foreground">
      {trial.left} of {TOOL_TRIAL_LIMIT} free calculations left - everything runs in your browser.
    </p>
  );

  return (
    <ToolPageShell toolId="datetime-calculator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="DateTime Calculator" left={trial.left} />

      <div className="mb-5 flex flex-wrap gap-2">
        {([
          { k: "add", label: "Add / subtract", icon: CalendarDays },
          { k: "diff", label: "Difference", icon: Equal },
          { k: "info", label: "Date details", icon: Info },
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

      {tab === "add" && (
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
            <div>
              <label className={LABEL} htmlFor="dt-date">Date</label>
              <input id="dt-date" type="date" value={aDate} onChange={(e) => setADate(e.target.value)} className={INPUT} />
            </div>
            <div className="grid grid-cols-[1fr_1fr] gap-3">
              <div>
                <label className={LABEL} htmlFor="dt-amt">Amount</label>
                <input id="dt-amt" type="number" value={aAmt} onChange={(e) => setAAmt(e.target.value)} className={cn(INPUT, "font-mono")} />
              </div>
              <div>
                <label className={LABEL} htmlFor="dt-unit">Unit</label>
                <select id="dt-unit" value={aUnit} onChange={(e) => setAUnit(e.target.value as typeof aUnit)} className={INPUT}>
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                  <option value="months">Months</option>
                  <option value="years">Years</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              {(["add", "sub"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setADir(d)}
                  className={cn(
                    "flex-1 rounded-xl border px-4 py-2.5 text-sm font-bold transition",
                    aDir === d ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {d === "add" ? "+ Add" : "- Subtract"}
                </button>
              ))}
            </div>
            <ActionButton disabled={!aDate || !trial.canUse} onClick={calcAdd}>
              <CalendarDays className="h-4 w-4" /> Calculate
            </ActionButton>
            {trialNote}
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            {!aResult ? (
              <div className="flex h-full min-h-[280px] flex-col items-center justify-center text-center">
                <CalendarDays className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="font-semibold">Your new date appears here</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">Add or subtract days, weeks, months or years from any date.</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <p className="text-[13px] font-medium text-muted-foreground">Result</p>
                  <p className="mt-1 text-2xl font-bold tracking-tight">{fmtDate(aResult)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void copy(fmtDate(aResult))}
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold transition hover:border-primary/40"
                >
                  <Copy className="h-4 w-4" /> Copy result
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "diff" && (
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
            <div>
              <label className={LABEL} htmlFor="dt-d1">From date</label>
              <input id="dt-d1" type="date" value={d1} onChange={(e) => setD1(e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className={LABEL} htmlFor="dt-d2">To date</label>
              <input id="dt-d2" type="date" value={d2} onChange={(e) => setD2(e.target.value)} className={INPUT} />
            </div>
            <ActionButton disabled={!d1 || !d2 || !trial.canUse} onClick={calcDiff}>
              <Equal className="h-4 w-4" /> Calculate difference
            </ActionButton>
            {trialNote}
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            {!dResult ? (
              <div className="flex h-full min-h-[280px] flex-col items-center justify-center text-center">
                <Equal className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="font-semibold">The difference appears here</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">See the gap between two dates in days, weeks and months.</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <p className="text-[13px] font-medium text-muted-foreground">Difference</p>
                  <p className="mt-1 text-2xl font-bold tracking-tight">
                    {dResult.negative && <span className="text-red-500">-</span>}
                    {dResult.days.toLocaleString("en-US")} days
                  </p>
                  {dResult.negative && <p className="mt-1 text-xs text-muted-foreground">The "to" date is before the "from" date.</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { k: "Weeks", v: dResult.weeks },
                    { k: "Months (avg)", v: dResult.months },
                  ].map(({ k, v }) => (
                    <div key={k} className="rounded-xl border border-border bg-muted/30 p-3 text-center">
                      <p className="text-xs text-muted-foreground">{k}</p>
                      <p className="mt-0.5 font-mono text-sm font-bold">{v}</p>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => void copy(`${dResult.negative ? "-" : ""}${dResult.days} days`)}
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold transition hover:border-primary/40"
                >
                  <Copy className="h-4 w-4" /> Copy result
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "info" && (
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
            <div>
              <label className={LABEL} htmlFor="dt-info">Pick a date</label>
              <input id="dt-info" type="date" value={iDate} onChange={(e) => { setIDate(e.target.value); }} className={INPUT} />
            </div>
            {trialNote}
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            {!iInfo || !iD ? (
              <div className="flex h-full min-h-[280px] flex-col items-center justify-center text-center">
                <Info className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="font-semibold">Date details appear here</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">Weekday, ISO week number and day of the year for any date.</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <p className="text-[13px] font-medium text-muted-foreground">{fmtDate(iD)}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { k: "Weekday", v: iD.toLocaleDateString("en-US", { weekday: "long" }) },
                    { k: "ISO week", v: `W${String(iInfo.week).padStart(2, "0")} (${iInfo.year})` },
                    { k: "Day of year", v: String(iInfo.doy) },
                    { k: "Days left", v: String(iInfo.daysLeft) },
                  ].map(({ k, v }) => (
                    <div key={k} className="rounded-xl border border-border bg-muted/30 p-3 text-center">
                      <p className="text-xs text-muted-foreground">{k}</p>
                      <p className="mt-0.5 font-mono text-sm font-bold">{v}</p>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => void copy(`${fmtDate(iD)} - ISO week ${iInfo.week}, day ${iInfo.doy} of the year`)}
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold transition hover:border-primary/40"
                >
                  <Copy className="h-4 w-4" /> Copy details
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </ToolPageShell>
  );
}
