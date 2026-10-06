// /tools/world-clock - Live ticking clocks for world cities, add/remove, 12/24h.

import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Clock3, Copy, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/world-clock";
import toolSeoMeta from "@/lib/tool-seo-meta-data/world-clock";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/world-clock")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/world-clock";
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
  component: WorldClockTool,
});

const INPUT = "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary";

const ALL_ZONES = [
  { city: "New York", tz: "America/New_York" },
  { city: "Chicago", tz: "America/Chicago" },
  { city: "Los Angeles", tz: "America/Los_Angeles" },
  { city: "Sao Paulo", tz: "America/Sao_Paulo" },
  { city: "London", tz: "Europe/London" },
  { city: "Paris", tz: "Europe/Paris" },
  { city: "Berlin", tz: "Europe/Berlin" },
  { city: "Moscow", tz: "Europe/Moscow" },
  { city: "Cairo", tz: "Africa/Cairo" },
  { city: "Johannesburg", tz: "Africa/Johannesburg" },
  { city: "Dubai", tz: "Asia/Dubai" },
  { city: "Karachi", tz: "Asia/Karachi" },
  { city: "Mumbai", tz: "Asia/Kolkata" },
  { city: "Dhaka", tz: "Asia/Dhaka" },
  { city: "Bangkok", tz: "Asia/Bangkok" },
  { city: "Singapore", tz: "Asia/Singapore" },
  { city: "Hong Kong", tz: "Asia/Hong_Kong" },
  { city: "Tokyo", tz: "Asia/Tokyo" },
  { city: "Seoul", tz: "Asia/Seoul" },
  { city: "Perth", tz: "Australia/Perth" },
  { city: "Sydney", tz: "Australia/Sydney" },
  { city: "Auckland", tz: "Pacific/Auckland" },
  { city: "Honolulu", tz: "Pacific/Honolulu" },
];

const DEFAULT = ["America/New_York", "Europe/London", "Asia/Dubai", "Asia/Kolkata", "Asia/Singapore", "Asia/Tokyo", "Australia/Sydney", "America/Los_Angeles"];

function WorldClockTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("world-clock", isPro);
  const seo = toolSeo;

  const [zones, setZones] = useState<string[]>(DEFAULT);
  const [hour12, setHour12] = useState(true);
  const [addTz, setAddTz] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const clocks = useMemo(() => {
    const date = new Date(now);
    return zones.map((tz) => {
      const meta = ALL_ZONES.find((z) => z.tz === tz);
      const timeFmt = new Intl.DateTimeFormat("en-US", {
        timeZone: tz, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12,
      });
      const dateFmt = new Intl.DateTimeFormat("en-US", {
        timeZone: tz, weekday: "short", month: "short", day: "numeric",
      });
      const offParts = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset", hour: "2-digit" }).formatToParts(date);
      return {
        tz,
        city: meta?.city ?? tz,
        time: timeFmt.format(date),
        date: dateFmt.format(date),
        offset: offParts.find((p) => p.type === "timeZoneName")?.value ?? "",
      };
    });
  }, [now, zones, hour12]);

  const available = ALL_ZONES.filter((z) => !zones.includes(z.tz));

  const addCity = () => {
    if (!addTz || !trial.canUse) return;
    setZones((p) => [...p, addTz]);
    setAddTz("");
    trial.recordUse();
    toast.success("City added");
  };

  const removeCity = (tz: string) => setZones((p) => p.filter((z) => z !== tz));

  const copyAll = async () => {
    if (!trial.canUse) return;
    const text = clocks.map((c) => `${c.city}: ${c.time} (${c.offset}), ${c.date}`).join("\n");
    await navigator.clipboard.writeText(text);
    trial.recordUse();
    toast.success("All times copied");
  };

  return (
    <ToolPageShell toolId="world-clock" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="World Clock" left={trial.left} />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          {([true, false] as const).map((h) => (
            <button
              key={String(h)}
              type="button"
              onClick={() => setHour12(h)}
              className={cn(
                "rounded-xl border px-4 py-2 text-sm font-bold transition",
                hour12 === h
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40",
              )}
            >
              {h ? "12-hour" : "24-hour"}
            </button>
          ))}
        </div>
        <div className="flex flex-1 items-center gap-2 sm:max-w-sm">
          <select value={addTz} onChange={(e) => setAddTz(e.target.value)} aria-label="City to add" className={INPUT}>
            <option value="">Add a city…</option>
            {available.map((z) => <option key={z.tz} value={z.tz}>{z.city}</option>)}
          </select>
          <button
            type="button"
            onClick={addCity}
            disabled={!addTz || !trial.canUse}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
        <button
          type="button"
          onClick={() => void copyAll()}
          disabled={!trial.canUse}
          className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold transition hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Copy className="h-4 w-4" /> Copy all
        </button>
      </div>

      {!isPro && (
        <p className="mb-4 text-xs text-muted-foreground">
          {trial.left} of {TOOL_TRIAL_LIMIT} free actions left - the clocks tick live in your browser, no refresh needed.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {clocks.map((c) => (
          <div key={c.tz} className="relative rounded-2xl border border-border bg-card p-5">
            <button
              type="button"
              onClick={() => removeCity(c.tz)}
              aria-label={`Remove ${c.city}`}
              className="absolute right-3 top-3 rounded-lg p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
            <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Clock3 className="h-4 w-4" /> {c.city}
            </p>
            <p className="mt-2 font-mono text-3xl font-bold tabular-nums tracking-tight">{c.time}</p>
            <p className="mt-1 text-xs text-muted-foreground">{c.date} · {c.offset}</p>
          </div>
        ))}
      </div>

      {zones.length === 0 && (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <p className="font-semibold">No cities on the clock</p>
          <p className="mt-1 text-sm text-muted-foreground">Use the dropdown above to add cities back.</p>
        </div>
      )}
    </ToolPageShell>
  );
}
