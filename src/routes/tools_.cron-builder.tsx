// /tools/cron-builder - Visual cron builder with presets, plain-English
// explanation and next run times. 100% client-side; nothing is uploaded.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/cron-builder";
import toolSeoMeta from "@/lib/tool-seo-meta-data/cron-builder";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import parseExpression from "cron-parser";

export const Route = createFileRoute("/tools_/cron-builder")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/cron-builder";
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
  component: CronBuilderTool,
});

type FieldKey = "minute" | "hour" | "dom" | "month" | "dow";
type Mode = "every" | "list" | "step" | "range";

interface FieldState {
  mode: Mode;
  list: number[];
  step: number;
  from: number;
  to: number;
}

interface FieldDef {
  key: FieldKey;
  label: string;
  min: number;
  max: number;
  names: string[] | null;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOW_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const FIELDS: FieldDef[] = [
  { key: "minute", label: "Minute", min: 0, max: 59, names: null },
  { key: "hour", label: "Hour", min: 0, max: 23, names: null },
  { key: "dom", label: "Day of month", min: 1, max: 31, names: null },
  { key: "month", label: "Month", min: 1, max: 12, names: MONTH_NAMES },
  { key: "dow", label: "Day of week", min: 0, max: 6, names: DOW_NAMES },
];

const PRESETS: { label: string; expr: string }[] = [
  { label: "Every minute", expr: "* * * * *" },
  { label: "Hourly", expr: "0 * * * *" },
  { label: "Daily", expr: "0 0 * * *" },
  { label: "Weekly", expr: "0 0 * * 0" },
  { label: "Monthly", expr: "0 0 1 * *" },
  { label: "Weekdays", expr: "0 9 * * 1-5" },
];

const MONTH_WORDS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};
const DOW_WORDS: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

const everyState = (min: number): FieldState => ({ mode: "every", list: [], step: 1, from: min, to: min });

function defaultFields(): Record<FieldKey, FieldState> {
  return {
    minute: everyState(0),
    hour: everyState(0),
    dom: everyState(1),
    month: everyState(1),
    dow: everyState(0),
  };
}

/** Convert one field token to builder state (used for presets + custom input). */
function tokenToState(token: string, def: FieldDef, words: Record<string, number> | null): FieldState | null {
  let t = token.trim().toLowerCase();
  if (t === "*") return everyState(def.min);
  const asNum = (s: string): number | null => {
    if (/^\d+$/.test(s)) return parseInt(s, 10);
    if (words) {
      const w = words[s.slice(0, 3)];
      if (w !== undefined) return w;
    }
    return null;
  };
  if (t.startsWith("*/")) {
    const n = asNum(t.slice(2));
    if (n === null || n < 1 || n > def.max) return null;
    return { mode: "step", list: [], step: n, from: def.min, to: def.min };
  }
  const range = t.match(/^([a-z0-9]+)-([a-z0-9]+)(?:\/([0-9]+))?$/);
  if (range && !t.includes(",")) {
    const a = asNum(range[1] ?? "");
    const b = asNum(range[2] ?? "");
    if (a === null || b === null || a < def.min || b > def.max || a >= b) return null;
    return { mode: "range", list: [], step: 1, from: a, to: b };
  }
  const parts = t.split(",");
  const nums: number[] = [];
  for (const p of parts) {
    const n = asNum(p);
    if (n === null || n < def.min || n > def.max) return null;
    nums.push(n);
  }
  if (nums.length === 0) return null;
  return { mode: "list", list: [...new Set(nums)].sort((a, b) => a - b), step: 1, from: def.min, to: def.min };
}

function exprToFields(expr: string): Record<FieldKey, FieldState> | null {
  const tokens = expr.trim().split(/\s+/);
  if (tokens.length === 5) {
    const out = defaultFields();
    const wordMaps: (Record<string, number> | null)[] = [null, null, null, MONTH_WORDS, DOW_WORDS];
    for (let i = 0; i < 5; i++) {
      const st = tokenToState(tokens[i] ?? "", FIELDS[i] as FieldDef, wordMaps[i] ?? null);
      if (!st) return null;
      out[(FIELDS[i] as FieldDef).key] = st;
    }
    return out;
  }
  return null;
}

function fieldToToken(st: FieldState): string {
  if (st.mode === "every") return "*";
  if (st.mode === "step") return `*/${st.step}`;
  if (st.mode === "range") return `${st.from}-${st.to}`;
  return st.list.length ? st.list.join(",") : "*";
}

function fieldDesc(tok: string, unit: string, names: string[] | null, plural: string): string {
  if (tok === "*") return `every ${unit}`;
  if (tok.startsWith("*/")) return `every ${tok.slice(2)} ${plural}`;
  const fmt = (v: string): string => {
    const r = v.match(/^(\d+)-(\d+)(?:\/(\d+))?$/);
    if (r) {
      const a = names ? (names[parseInt(r[1] ?? "0", 10)] ?? r[1]) : r[1];
      const b = names ? (names[parseInt(r[2] ?? "0", 10)] ?? r[2]) : r[2];
      return `${a} through ${b}${r[3] ? ` every ${r[3]}` : ""}`;
    }
    const n = parseInt(v, 10);
    if (names && !Number.isNaN(n) && n >= 0 && n < names.length) return names[n] ?? v;
    return v;
  };
  const parts = tok.split(",").map(fmt);
  return `${plural} ${parts.join(", ")}`;
}

/** Plain-English explanation of a 5-part cron expression. */
function describeCron(tokens: string[]): string {
  const [minute, hour, dom, month, dow] = tokens as [string, string, string, string, string];
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dowNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const pad = (n: number) => String(n).padStart(2, "0");

  let time: string;
  const minSingle = /^\d+$/.test(minute ?? "");
  const hourSingle = /^\d+$/.test(hour ?? "");
  if (minute === "*" && hour === "*") time = "every minute";
  else if (hour === "*") time = `at ${fieldDesc(minute ?? "*", "minute", null, "minutes")} of every hour`;
  else if (minute === "*") time = `every minute during ${fieldDesc(hour ?? "*", "hour", null, "hours")}`;
  else if (minSingle && hourSingle) time = `at ${pad(parseInt(hour ?? "0", 10))}:${pad(parseInt(minute ?? "0", 10))}`;
  else time = `at ${fieldDesc(hour ?? "*", "hour", null, "hours")} ${fieldDesc(minute ?? "*", "minute", null, "minutes")}`;

  let date = "";
  if (dom === "*" && month === "*" && dow === "*") date = "every day";
  else if (dom === "*" && month === "*") date = `on ${fieldDesc(dow ?? "*", "day of the week", dowNames, "days of the week")}`;
  else if (dom !== "*" && month === "*" && dow === "*")
    date = `on ${fieldDesc(dom ?? "*", "day of the month", null, "days of the month")} of every month`;
  else {
    const domPart = dom === "*" ? "" : fieldDesc(dom ?? "*", "day of the month", null, "days of the month");
    const monPart = month === "*" ? "" : fieldDesc(month ?? "*", "month", monthNames, "months");
    const dowPart = dow === "*" ? "" : fieldDesc(dow ?? "*", "day of the week", dowNames, "days of the week");
    date = `on ${[domPart, monPart && `of ${monPart}`, dowPart].filter(Boolean).join(" ")}`;
  }
  return `Runs ${time}, ${date}.`;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function CronBuilderTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("cron-builder", isPro);
  const seo = toolSeo;

  const [fields, setFields] = useState<Record<FieldKey, FieldState>>(defaultFields);
  const [custom, setCustom] = useState("");
  const [customError, setCustomError] = useState<string | null>(null);

  const expr = useMemo(
    () => FIELDS.map((f) => fieldToToken(fields[f.key])).join(" "),
    [fields],
  );

  const explanation = useMemo(() => describeCron(expr.split(" ")), [expr]);

  const runs = useMemo(() => {
    try {
      const it = parseExpression.parse(expr);
      const out: string[] = [];
      for (let i = 0; i < 5; i++) out.push(it.next().toDate().toLocaleString());
      return { ok: true as const, runs: out, error: null as string | null };
    } catch (e) {
      return { ok: false as const, runs: [] as string[], error: e instanceof Error ? e.message : "Invalid expression." };
    }
  }, [expr]);

  const update = (key: FieldKey, patch: Partial<FieldState>) =>
    setFields((p) => ({ ...p, [key]: { ...p[key], ...patch } }));

  const applyPreset = (preset: string) => {
    const next = exprToFields(preset);
    if (next) {
      setFields(next);
      setCustomError(null);
    } else {
      toast.error("That preset could not be applied.");
    }
  };

  const applyCustom = () => {
    const trimmed = custom.trim();
    if (!trimmed) {
      setCustomError("Enter a cron expression first.");
      return;
    }
    if (trimmed.split(/\s+/).length !== 5) {
      setCustomError("Use exactly 5 fields: minute hour day-of-month month day-of-week (seconds are not supported).");
      return;
    }
    const next = exprToFields(trimmed);
    if (!next) {
      setCustomError("Could not parse that expression. Check field ranges and separators.");
      return;
    }
    setFields(next);
    setCustomError(null);
    toast.success("Expression loaded into the builder.");
  };

  const toggleValue = (key: FieldKey, v: number) =>
    setFields((p) => {
      const cur = p[key];
      const list = cur.list.includes(v) ? cur.list.filter((x) => x !== v) : [...cur.list, v].sort((a, b) => a - b);
      return { ...p, [key]: { ...cur, mode: "list", list } };
    });

  const copy = async () => {
    if (!trial.canUse) return;
    const ok = await copyToClipboard(expr);
    if (ok) {
      trial.recordUse();
      toast.success("Cron expression copied.");
    } else {
      toast.error("Could not copy to clipboard.");
    }
  };

  const MODES: { key: Mode; label: string }[] = [
    { key: "every", label: "Every" },
    { key: "list", label: "Specific" },
    { key: "step", label: "Every N" },
    { key: "range", label: "Range" },
  ];

  return (
    <ToolPageShell toolId="cron-builder" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Cron Builder" left={trial.left} />

      <div className="mb-5 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => applyPreset(p.expr)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-[13px] font-semibold transition",
              expr === p.expr
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <Tabs defaultValue="minute">
            <TabsList className="flex w-full flex-wrap">
              {FIELDS.map((f) => (
                <TabsTrigger key={f.key} value={f.key} className="flex-1">
                  {f.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {FIELDS.map((f) => {
              const st = fields[f.key];
              const values: number[] = [];
              for (let v = f.min; v <= f.max; v++) values.push(v);
              return (
                <TabsContent key={f.key} value={f.key} className="pt-4">
                  <div className="mb-4 flex flex-wrap gap-2">
                    {MODES.map((m) => (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => update(f.key, { mode: m.key })}
                        className={cn(
                          "rounded-lg border px-3.5 py-1.5 text-[13px] font-semibold transition",
                          st.mode === m.key
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/40",
                        )}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  {st.mode === "every" && (
                    <p className="text-sm text-muted-foreground">
                      Every {f.label.toLowerCase()} <span className="font-mono text-foreground">*</span>
                    </p>
                  )}

                  {st.mode === "step" && (
                    <div className="flex items-center gap-3">
                      <Label className="text-sm">Every</Label>
                      <Input
                        type="number"
                        min={1}
                        max={f.max}
                        value={st.step}
                        onChange={(e) => update(f.key, { step: Math.max(1, Math.min(f.max, parseInt(e.target.value || "1", 10))) })}
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">{f.label.toLowerCase()}s</span>
                      <span className="font-mono text-sm text-foreground">*/{st.step}</span>
                    </div>
                  )}

                  {st.mode === "range" && (
                    <div className="flex items-center gap-3">
                      <Label className="text-sm">From</Label>
                      <Input
                        type="number"
                        min={f.min}
                        max={f.max}
                        value={st.from}
                        onChange={(e) => update(f.key, { from: Math.max(f.min, Math.min(f.max, parseInt(e.target.value || String(f.min), 10))) })}
                        className="w-24"
                      />
                      <Label className="text-sm">to</Label>
                      <Input
                        type="number"
                        min={f.min}
                        max={f.max}
                        value={st.to}
                        onChange={(e) => update(f.key, { to: Math.max(f.min, Math.min(f.max, parseInt(e.target.value || String(f.min), 10))) })}
                        className="w-24"
                      />
                      {st.from >= st.to && (
                        <span className="text-xs font-medium text-red-500">From must be smaller than to.</span>
                      )}
                    </div>
                  )}

                  {st.mode === "list" && (
                    <div>
                      <div className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto">
                        {values.map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => toggleValue(f.key, v)}
                            className={cn(
                              "min-w-9 rounded-md border px-2 py-1 text-xs font-semibold transition",
                              st.list.includes(v)
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border text-muted-foreground hover:border-primary/40",
                            )}
                          >
                            {f.names ? f.names[v - f.min] : v}
                          </button>
                        ))}
                      </div>
                      {st.list.length === 0 && (
                        <p className="mt-2 text-xs font-medium text-red-500">Pick at least one value.</p>
                      )}
                    </div>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>

          <div className="border-t border-border pt-5">
            <Label className="mb-2 block text-[13px] font-medium text-foreground/80">Custom expression</Label>
            <div className="flex gap-2">
              <Input
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="e.g. 30 2 * * 1-5"
                className="font-mono"
              />
              <ActionButton onClick={applyCustom}>Load</ActionButton>
            </div>
            {customError && <p className="mt-1.5 text-sm font-medium text-red-500">{customError}</p>}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-1 text-[13px] font-medium text-foreground/80">Expression</p>
            <p className="rounded-lg bg-muted px-3 py-2.5 font-mono text-lg font-bold text-primary">{expr}</p>
            <p className="mt-3 text-sm leading-relaxed text-foreground/90">{explanation}</p>
            <ActionButton busy={false} disabled={!trial.canUse || !runs.ok} onClick={copy}>
              <Copy className="h-4 w-4" /> Copy expression
            </ActionButton>
            {!isPro && (
              <p className="mt-2 text-xs text-muted-foreground">
                {trial.left} of {TOOL_TRIAL_LIMIT} free copies left - runs fully in your browser, nothing is uploaded.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Next 5 runs</p>
            {runs.ok ? (
              <ul className="space-y-1.5">
                {runs.runs.map((r, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {i + 1}
                    </span>
                    <span className="text-foreground/90">{r}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm font-medium text-red-500">{runs.error}</p>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              Run times use your device timezone and standard 5-field cron (no seconds).
            </p>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
