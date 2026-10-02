// /tools/temporal-api-playground - Explore the Temporal API (PlainDate,
// PlainTime, ZonedDateTime, Duration) with graceful fallback when the
// browser does not support it yet. 100% in-browser.

import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarClock, Info, Play } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/temporal-api-playground")({
  head: () => {
    const seo = getToolSeoMeta("temporal-api-playground");
    const canonical = "https://iconvault.site/tools/temporal-api-playground";
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
  component: TemporalTool,
});

interface DemoResult {
  id: string;
  title: string;
  output: string[];
  code: string;
}

const FALLBACK_NOTE =
  "Your browser does not support Temporal yet, so this demo ran on the classic Date object instead. Temporal ships in Chrome 129+, Edge 129+ and Safari 18.4+.";

function TemporalTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("temporal-api-playground", isPro);
  const seo = getToolSeo("temporal-api-playground");

  const [supported, setSupported] = useState(false);
  const [results, setResults] = useState<DemoResult[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSupported(typeof (globalThis as unknown as { Temporal?: unknown }).Temporal !== "undefined");
  }, []);

  const pushResult = (r: DemoResult) =>
    setResults((p) => [r, ...p.filter((x) => x.id !== r.id)].slice(0, 6));

  const runDemo = (id: string) => {
    if (busy || !trial.canUse) return;
    setBusy(true);
    trial.recordUse();
    try {
      const T = (globalThis as unknown as { Temporal?: any }).Temporal;
      if (!T) {
        const now = new Date();
        if (id === "plaindate") {
          pushResult({
            id,
            title: "PlainDate (fallback: Date)",
            output: [
              `today: ${now.toISOString().slice(0, 10)}`,
              `plus 45 days: ${new Date(now.getTime() + 45 * 86400000).toISOString().slice(0, 10)}`,
              "With classic Date this is manual millisecond math. Temporal makes it Temporal.Now.plainDateISO().add({ days: 45 }).",
            ],
            code: FALLBACK_NOTE,
          });
        } else if (id === "plaintime") {
          pushResult({
            id,
            title: "PlainTime (fallback: Date)",
            output: [
              `local time: ${now.toTimeString().slice(0, 8)}`,
              "Classic Date always carries a full date and a timezone. Temporal.PlainTime is just a wall-clock time, no date attached.",
            ],
            code: FALLBACK_NOTE,
          });
        } else if (id === "zoned") {
          pushResult({
            id,
            title: "ZonedDateTime (fallback: Date)",
            output: [
              `Tokyo: ${new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Tokyo", dateStyle: "medium", timeStyle: "medium" }).format(now)}`,
              `New York: ${new Intl.DateTimeFormat("en-GB", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "medium" }).format(now)}`,
              "Intl.DateTimeFormat handles the display, but the math is yours. Temporal.ZonedDateTime carries the instant plus its zone.",
            ],
            code: FALLBACK_NOTE,
          });
        } else {
          const diff = new Date("2026-12-31T23:59:59") .getTime() - now.getTime();
          const days = Math.max(0, Math.floor(diff / 86400000));
          pushResult({
            id,
            title: "Duration (fallback: math)",
            output: [
              `days until 2026-12-31: ${days}`,
              "You did the subtraction by hand. Temporal gives you Temporal.Now.instant().until(deadline) as a real Duration object.",
            ],
            code: FALLBACK_NOTE,
          });
        }
        toast.info("Temporal not supported here, used Date fallback");
      } else {
        if (id === "plaindate") {
          const today = T.Now.plainDateISO();
          const future = today.add({ days: 45 });
          const until = today.until(future);
          pushResult({
            id,
            title: "PlainDate: calendar dates without time",
            output: [
              `today: ${today.toString()}`,
              `today + 45 days: ${future.toString()}`,
              `difference: ${until.toString()} (${until.days} days)`,
              `day of week: ${today.dayOfWeek} (${["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][today.dayOfWeek]})`,
              `days in month: ${today.daysInMonth}`,
            ],
            code: `const today = Temporal.Now.plainDateISO();
const future = today.add({ days: 45 });
const diff = today.until(future); // P45D`,
          });
        } else if (id === "plaintime") {
          const now = T.Now.plainTimeISO();
          const meeting = T.PlainTime.from("14:30");
          const until = now.until(meeting);
          pushResult({
            id,
            title: "PlainTime: wall-clock time without a date",
            output: [
              `now: ${now.toString()}`,
              `meeting at 14:30, in: ${until.toString()}`,
              `rounded to 15 min: ${now.round({ smallestUnit: "minute", roundingIncrement: 15 }).toString()}`,
            ],
            code: `const now = Temporal.Now.plainTimeISO();
const meeting = Temporal.PlainTime.from("14:30");
const wait = now.until(meeting);`,
          });
        } else if (id === "zoned") {
          const tokyo = T.Now.zonedDateTimeISO("Asia/Tokyo");
          const ny = tokyo.withTimeZone("America/New_York");
          pushResult({
            id,
            title: "ZonedDateTime: an instant plus its timezone",
            output: [
              `Tokyo: ${tokyo.toString()}`,
              `same instant in New York: ${ny.toString()}`,
              `DST-safe add 1 day in Tokyo: ${tokyo.add({ days: 1 }).toString()}`,
              `epoch ms: ${tokyo.epochMilliseconds}`,
            ],
            code: `const tokyo = Temporal.Now.zonedDateTimeISO("Asia/Tokyo");
const ny = tokyo.withTimeZone("America/New_York");
// arithmetic respects DST transitions automatically`,
          });
        } else {
          const start = T.Instant.from("2026-09-29T00:00:00Z");
          const end = T.Instant.from("2026-12-31T23:59:59Z");
          const dur = start.until(end);
          const human = dur.round({ largestUnit: "days" });
          pushResult({
            id,
            title: "Duration and Instant arithmetic",
            output: [
              `from Sep 29 to Dec 31: ${dur.toString()}`,
              `as days: ${human.days} days`,
              `90 minutes as duration: ${T.Duration.from({ minutes: 90 }).toString()} (1h 30m, no 5400000 ms in sight)`,
              `total seconds: ${dur.total({ unit: "seconds" }).toLocaleString()}s`,
            ],
            code: `const dur = start.until(end); // a real Duration
dur.total({ unit: "seconds" });`,
          });
        }
        toast.success("Demo ran on Temporal");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Demo failed");
    } finally {
      setBusy(false);
    }
  };

  const DEMOS = [
    { id: "plaindate", name: "PlainDate", desc: "Calendar dates: add, subtract, compare, no timezones." },
    { id: "plaintime", name: "PlainTime", desc: "Wall-clock times: rounding, until, no dates attached." },
    { id: "zoned", name: "ZonedDateTime", desc: "An exact instant viewed through a timezone. DST-safe math." },
    { id: "duration", name: "Duration", desc: "Human time spans: P45D instead of magic millisecond numbers." },
  ];

  return (
    <ToolPageShell toolId="temporal-api-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Temporal API" left={trial.left} />

      <div
        className={cn(
          "mb-5 flex items-start gap-3 rounded-2xl border p-4",
          supported ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5",
        )}
      >
        <Info className={cn("mt-0.5 h-5 w-5 shrink-0", supported ? "text-emerald-500" : "text-amber-500")} />
        <p className="text-sm text-muted-foreground">
          {supported
            ? "Temporal is available in this browser. Every demo below runs on the real Temporal API."
            : "Temporal is not available in this browser yet (needs Chrome 129+, Edge 129+ or Safari 18.4+). Demos still run, using classic Date fallbacks so you can compare."}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {DEMOS.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => runDemo(d.id)}
            disabled={busy || !trial.canUse}
            className="rounded-2xl border border-border bg-card p-4 text-left transition hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-primary" />
              <p className="font-semibold">{d.name}</p>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{d.desc}</p>
            <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
              <Play className="h-3.5 w-3.5" /> Run demo
            </span>
          </button>
        ))}
      </div>
      {!isPro && (
        <p className="mt-3 text-xs text-muted-foreground">
          {trial.left} of {TOOL_TRIAL_LIMIT} free runs left.
        </p>
      )}

      <div className="mt-6 space-y-4">
        {results.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Pick a demo above. Live output and the exact code appear here.
          </div>
        )}
        {results.map((r) => (
          <div key={r.id} className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 font-semibold">{r.title}</h2>
            <div className="rounded-xl bg-black/80 p-4 font-mono text-[13px] leading-relaxed">
              {r.output.map((line, i) => (
                <p key={i} className="text-emerald-300">
                  {line}
                </p>
              ))}
            </div>
            <pre className="mt-3 overflow-auto rounded-xl bg-black/80 p-4 font-mono text-[13px] leading-relaxed text-sky-300">
              {r.code}
            </pre>
          </div>
        ))}
      </div>
    </ToolPageShell>
  );
}
