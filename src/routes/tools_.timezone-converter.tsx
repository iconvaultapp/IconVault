// /tools/timezone-converter - Convert times between zones + a 4-zone meeting planner.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeftRight, Copy, Globe2, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/timezone-converter")({
  head: () => {
    const seo = getToolSeoMeta("timezone-converter");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: TimezoneTool,
});

const INPUT = "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary";
const LABEL = "mb-1.5 block text-[13px] font-medium text-foreground/80";

const ZONES: { tz: string; label: string }[] = [
  { tz: "UTC", label: "UTC (Coordinated Universal Time)" },
  { tz: "America/New_York", label: "New York (ET)" },
  { tz: "America/Chicago", label: "Chicago (CT)" },
  { tz: "America/Denver", label: "Denver (MT)" },
  { tz: "America/Los_Angeles", label: "Los Angeles (PT)" },
  { tz: "America/Anchorage", label: "Anchorage (AKT)" },
  { tz: "Pacific/Honolulu", label: "Honolulu (HST)" },
  { tz: "America/Toronto", label: "Toronto (ET)" },
  { tz: "America/Sao_Paulo", label: "Sao Paulo (BRT)" },
  { tz: "Atlantic/Azores", label: "Azores" },
  { tz: "Europe/London", label: "London (GMT/BST)" },
  { tz: "Europe/Paris", label: "Paris (CET)" },
  { tz: "Europe/Berlin", label: "Berlin (CET)" },
  { tz: "Europe/Moscow", label: "Moscow (MSK)" },
  { tz: "Africa/Cairo", label: "Cairo (EET)" },
  { tz: "Africa/Johannesburg", label: "Johannesburg (SAST)" },
  { tz: "Asia/Dubai", label: "Dubai (GST)" },
  { tz: "Asia/Karachi", label: "Karachi (PKT)" },
  { tz: "Asia/Kolkata", label: "Mumbai / Delhi (IST)" },
  { tz: "Asia/Dhaka", label: "Dhaka (BST)" },
  { tz: "Asia/Bangkok", label: "Bangkok (ICT)" },
  { tz: "Asia/Singapore", label: "Singapore (SGT)" },
  { tz: "Asia/Hong_Kong", label: "Hong Kong (HKT)" },
  { tz: "Asia/Tokyo", label: "Tokyo (JST)" },
  { tz: "Asia/Seoul", label: "Seoul (KST)" },
  { tz: "Australia/Perth", label: "Perth (AWST)" },
  { tz: "Australia/Sydney", label: "Sydney (AEST/AEDT)" },
  { tz: "Pacific/Auckland", label: "Auckland (NZST)" },
];

const zoneLabel = (tz: string) => ZONES.find((z) => z.tz === tz)?.label ?? tz;

/** Interpret a "YYYY-MM-DDTHH:mm" wall time in the given zone and return the instant. */
function zonedWallToInstant(wall: string, timeZone: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(wall);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number) as [unknown, number, number, number, number, number];
  const asUtc = Date.UTC(y, mo - 1, d, h, mi);
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone, hour12: false, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  let guess = asUtc;
  for (let i = 0; i < 3; i++) {
    const parts: Record<string, string> = {};
    for (const p of dtf.formatToParts(new Date(guess))) parts[p.type] = p.value;
    const asIfUtc = Date.UTC(
      Number(parts["year"]), Number(parts["month"]) - 1, Number(parts["day"]),
      Number(parts["hour"]) % 24, Number(parts["minute"]), Number(parts["second"]),
    );
    guess += asUtc - asIfUtc;
  }
  return new Date(guess);
}

function fmtInZone(d: Date, timeZone: string): { text: string; offset: string } {
  const text = new Intl.DateTimeFormat("en-US", {
    timeZone, weekday: "short", year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  }).format(d);
  const offParts = new Intl.DateTimeFormat("en-US", {
    timeZone, timeZoneName: "shortOffset", hour: "2-digit",
  }).formatToParts(d);
  const offset = offParts.find((p) => p.type === "timeZoneName")?.value ?? "";
  return { text, offset };
}

function TimezoneTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("timezone-converter", isPro);
  const seo = getToolSeo("timezone-converter");

  const [tab, setTab] = useState<"convert" | "meeting">("convert");

  // --- converter ---
  const [dt, setDt] = useState("");
  const [from, setFrom] = useState("America/New_York");
  const [to, setTo] = useState("Asia/Kolkata");
  const [converted, setConverted] = useState<{ instant: Date; fromLabel: string; toLabel: string } | null>(null);

  // --- meeting planner ---
  const [mDt, setMDt] = useState("");
  const [mBase, setMBase] = useState("UTC");
  const [mZones, setMZones] = useState<string[]>(["America/New_York", "Europe/London", "Asia/Tokyo", "Australia/Sydney"]);
  const [meeting, setMeeting] = useState<{ instant: Date } | null>(null);

  const doConvert = () => {
    if (!trial.canUse) return;
    const instant = zonedWallToInstant(dt, from);
    if (!instant) { toast.error("Pick a date and time first."); return; }
    setConverted({ instant, fromLabel: zoneLabel(from), toLabel: zoneLabel(to) });
    trial.recordUse();
    toast.success("Time converted");
  };

  const planMeeting = () => {
    if (!trial.canUse) return;
    const instant = zonedWallToInstant(mDt, mBase);
    if (!instant) { toast.error("Pick a meeting date and time first."); return; }
    setMeeting({ instant });
    trial.recordUse();
    toast.success("Meeting planned across 4 zones");
  };

  const swapZones = () => { setFrom(to); setTo(from); setConverted(null); };

  const setNow = () => {
    const n = new Date();
    const pad = (x: number) => String(x).padStart(2, "0");
    setDt(`${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}T${pad(n.getHours())}:${pad(n.getMinutes())}`);
  };

  const copy = async (text: string) => {
    if (!trial.canUse) return;
    await navigator.clipboard.writeText(text);
    trial.recordUse();
    toast.success("Copied to clipboard");
  };

  const trialNote = !isPro && (
    <p className="text-xs text-muted-foreground">
      {trial.left} of {TOOL_TRIAL_LIMIT} free conversions left - everything runs in your browser.
    </p>
  );

  const conv = converted ? fmtInZone(converted.instant, to) : null;
  const convFrom = converted ? fmtInZone(converted.instant, from) : null;

  return (
    <ToolPageShell toolId="timezone-converter" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Timezone Converter" left={trial.left} />

      <div className="mb-5 flex gap-2">
        {([
          { k: "convert", label: "Convert time", icon: ArrowLeftRight },
          { k: "meeting", label: "Meeting planner", icon: Users },
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

      {tab === "convert" ? (
        <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
          <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className={LABEL} htmlFor="tz-dt">Date and time</label>
                <button type="button" onClick={setNow} className="text-xs font-semibold text-primary hover:underline">
                  Use now
                </button>
              </div>
              <input id="tz-dt" type="datetime-local" value={dt} onChange={(e) => setDt(e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className={LABEL} htmlFor="tz-from">From timezone</label>
              <select id="tz-from" value={from} onChange={(e) => setFrom(e.target.value)} className={INPUT}>
                {ZONES.map((z) => <option key={z.tz} value={z.tz}>{z.label}</option>)}
              </select>
            </div>
            <button
              type="button"
              onClick={swapZones}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold transition hover:border-primary/40"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" /> Swap zones
            </button>
            <div>
              <label className={LABEL} htmlFor="tz-to">To timezone</label>
              <select id="tz-to" value={to} onChange={(e) => setTo(e.target.value)} className={INPUT}>
                {ZONES.map((z) => <option key={z.tz} value={z.tz}>{z.label}</option>)}
              </select>
            </div>
            <ActionButton disabled={!dt || !trial.canUse} onClick={doConvert}>
              <Globe2 className="h-4 w-4" /> Convert
            </ActionButton>
            {trialNote}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            {!converted || !conv || !convFrom ? (
              <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center">
                <Globe2 className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="font-semibold">Your converted time appears here</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  DST-aware conversion between 28 common timezones, with the UTC offset shown.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <p className="text-xs font-medium text-muted-foreground">{converted.fromLabel}</p>
                  <p className="mt-1 font-mono text-sm font-bold">{convFrom.text} <span className="text-muted-foreground">({convFrom.offset})</span></p>
                </div>
                <div className="rounded-xl border border-primary/40 bg-primary/5 p-4">
                  <p className="text-xs font-medium text-muted-foreground">{converted.toLabel}</p>
                  <p className="mt-1 font-mono text-lg font-bold text-primary">{conv.text} <span className="text-sm font-semibold text-muted-foreground">({conv.offset})</span></p>
                </div>
                <button
                  type="button"
                  onClick={() => void copy(`${convFrom.text} (${convFrom.offset}) in ${converted.fromLabel} = ${conv.text} (${conv.offset}) in ${converted.toLabel}`)}
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold transition hover:border-primary/40"
                >
                  <Copy className="h-4 w-4" /> Copy conversion
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
          <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
            <div>
              <label className={LABEL} htmlFor="mt-dt">Meeting date and time</label>
              <input id="mt-dt" type="datetime-local" value={mDt} onChange={(e) => setMDt(e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className={LABEL} htmlFor="mt-base">That time is in</label>
              <select id="mt-base" value={mBase} onChange={(e) => setMBase(e.target.value)} className={INPUT}>
                {ZONES.map((z) => <option key={z.tz} value={z.tz}>{z.label}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <p className={LABEL}>Show in these 4 zones</p>
              {mZones.map((z, i) => (
                <select
                  key={i}
                  value={z}
                  aria-label={`Meeting zone ${i + 1}`}
                  onChange={(e) => setMZones((p) => p.map((x, j) => (j === i ? e.target.value : x)))}
                  className={INPUT}
                >
                  {ZONES.map((zone) => <option key={zone.tz} value={zone.tz}>{zone.label}</option>)}
                </select>
              ))}
            </div>
            <ActionButton disabled={!mDt || !trial.canUse} onClick={planMeeting}>
              <Users className="h-4 w-4" /> Plan across zones
            </ActionButton>
            {trialNote}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            {!meeting ? (
              <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center">
                <Users className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="font-semibold">One time, four zones</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Pick a meeting time and see it instantly in four timezones - no more "what time is that for me?".
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {mZones.map((z, i) => {
                    const f = fmtInZone(meeting.instant, z);
                    return (
                      <div key={`${z}-${i}`} className="rounded-xl border border-border bg-muted/30 p-4">
                        <p className="text-xs font-medium text-muted-foreground">{zoneLabel(z)}</p>
                        <p className="mt-1 font-mono text-sm font-bold">{f.text}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{f.offset}</p>
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => void copy(
                    `Meeting: ${mZones.map((z) => { const f = fmtInZone(meeting.instant, z); return `${zoneLabel(z)}: ${f.text} (${f.offset})`; }).join(" | ")}`,
                  )}
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold transition hover:border-primary/40"
                >
                  <Copy className="h-4 w-4" /> Copy all times
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </ToolPageShell>
  );
}
