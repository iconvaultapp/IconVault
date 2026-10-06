// /tools/locale-format-explorer - See how one date, number and amount
// look in 25+ locales using the browser's built-in Intl formatters.
// 100% client-side, nothing is uploaded.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/locale-format-explorer";
import toolSeoMeta from "@/lib/tool-seo-meta-data/locale-format-explorer";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/locale-format-explorer")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/locale-format-explorer";
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
  component: LocaleExplorerTool,
});

const LOCALES = [
  "en-US", "en-GB", "en-IN", "de-DE", "fr-FR", "es-ES", "it-IT", "pt-BR",
  "nl-NL", "ja-JP", "zh-CN", "zh-TW", "ko-KR", "hi-IN", "ar-SA", "ar-EG",
  "ru-RU", "tr-TR", "pl-PL", "sv-SE", "da-DK", "nb-NO", "fi-FI", "el-GR",
  "he-IL", "th-TH", "vi-VN", "id-ID", "ms-MY", "uk-UA",
];

const UNITS = ["day", "hour", "minute"] as const;

const labelCls = "mb-1.5 block text-[13px] font-medium text-foreground/80";
const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none";

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function LocaleExplorerTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("locale-format-explorer", isPro);
  const seo = toolSeo;

  const [locale, setLocale] = useState("en-US");
  const [dateStr, setDateStr] = useState(() => toLocalInput(new Date()));
  const [numStr, setNumStr] = useState("1234567.891");
  const [currency, setCurrency] = useState("USD");
  const [amountStr, setAmountStr] = useState("1999.99");
  const [relValue, setRelValue] = useState("-3");
  const [relUnit, setRelUnit] = useState<(typeof UNITS)[number]>("day");
  const [copied, setCopied] = useState<string | null>(null);

  const rows = useMemo(() => {
    const out: { id: string; label: string; value: string; error?: string | undefined }[] = [];
    const date = new Date(dateStr);
    const validDate = !Number.isNaN(date.getTime());
    const num = Number(numStr);
    const amount = Number(amountStr);

    const safe = (fn: () => string) => {
      try {
        return fn();
      } catch {
        return "";
      }
    };

    out.push({
      id: "date",
      label: "Date",
      value: validDate ? safe(() => new Intl.DateTimeFormat(locale, { dateStyle: "full" }).format(date)) : "",
      error: validDate ? undefined : "Invalid date",
    });
    out.push({
      id: "time",
      label: "Time",
      value: validDate ? safe(() => new Intl.DateTimeFormat(locale, { timeStyle: "medium" }).format(date)) : "",
      error: validDate ? undefined : "Invalid date",
    });
    out.push({
      id: "datetime",
      label: "Date + time",
      value: validDate
        ? safe(() => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date))
        : "",
      error: validDate ? undefined : "Invalid date",
    });
    out.push({
      id: "number",
      label: "Number",
      value: numStr.trim() === "" || Number.isNaN(num) ? "" : safe(() => new Intl.NumberFormat(locale).format(num)),
      error: numStr.trim() !== "" && !Number.isNaN(num) ? undefined : "Invalid number",
    });
    let currencyError: string | undefined;
    let currencyValue = "";
    try {
      currencyValue =
        amountStr.trim() === "" || Number.isNaN(amount)
          ? ""
          : new Intl.NumberFormat(locale, { style: "currency", currency: currency.trim().toUpperCase() }).format(amount);
      if (amountStr.trim() === "" || Number.isNaN(amount)) currencyError = "Invalid amount";
    } catch {
      currencyError = "Invalid currency code";
    }
    out.push({ id: "currency", label: `Currency (${currency.trim().toUpperCase() || "?"})`, value: currencyValue, error: currencyError });
    out.push({
      id: "percent",
      label: "Number as percent",
      value: numStr.trim() === "" || Number.isNaN(num) ? "" : safe(() => new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }).format(num / 100)),
      error: numStr.trim() !== "" && !Number.isNaN(num) ? undefined : "Invalid number",
    });
    out.push({
      id: "list",
      label: "List (sample)",
      value: safe(() => new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(["red", "green", "blue"])),
    });
    const rv = Number(relValue);
    out.push({
      id: "relative",
      label: "Relative time",
      value: Number.isNaN(rv) ? "" : safe(() => new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(rv, relUnit)),
      error: Number.isNaN(rv) ? "Invalid value" : undefined,
    });
    return out;
  }, [locale, dateStr, numStr, currency, amountStr, relValue, relUnit]);

  const copy = async (id: string, value: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(id);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  const copyAll = async () => {
    if (!trial.canUse) return;
    const text = rows.map((r) => `${r.label}: ${r.error ? `[${r.error}]` : r.value}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      trial.recordUse();
      toast.success("All formats copied");
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  const downloadJson = () => {
    if (!trial.canUse) return;
    const obj: Record<string, string> = {};
    for (const r of rows) obj[r.id] = r.error ? `[${r.error}]` : r.value;
    downloadBlob(new Blob([JSON.stringify({ locale, formats: obj }, null, 2)], { type: "application/json" }), `locale-${locale}.json`);
    trial.recordUse();
    toast.success("JSON downloaded");
  };

  return (
    <ToolPageShell toolId="locale-format-explorer" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Locale Explorer" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-6">
          <div>
            <label className={labelCls} htmlFor="locale-select">Locale</label>
            <select
              id="locale-select"
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              className={inputCls}
            >
              {LOCALES.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="date-input">Date and time</label>
            <input
              id="date-input"
              type="datetime-local"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="number-input">Number</label>
            <input
              id="number-input"
              inputMode="decimal"
              value={numStr}
              onChange={(e) => setNumStr(e.target.value)}
              className={`${inputCls} font-mono`}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="currency-input">Currency code</label>
              <input
                id="currency-input"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3))}
                placeholder="USD"
                maxLength={3}
                className={`${inputCls} font-mono uppercase`}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="amount-input">Amount</label>
              <input
                id="amount-input"
                inputMode="decimal"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className={`${inputCls} font-mono`}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="rel-input">Relative value</label>
              <input
                id="rel-input"
                inputMode="numeric"
                value={relValue}
                onChange={(e) => setRelValue(e.target.value)}
                className={`${inputCls} font-mono`}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="rel-unit">Relative unit</label>
              <select id="rel-unit" value={relUnit} onChange={(e) => setRelUnit(e.target.value as (typeof UNITS)[number])} className={inputCls}>
                {UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Formats update live using your browser's Intl API. Nothing is uploaded.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-bold">
              Results for <span className="font-mono text-primary">{locale}</span>
            </p>
            <div className="flex gap-2">
              <ActionButton busy={false} disabled={!trial.canUse} onClick={copyAll}>
                <Copy className="h-4 w-4" /> Copy all
              </ActionButton>
              <button
                type="button"
                onClick={downloadJson}
                disabled={!trial.canUse}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" /> JSON
              </button>
            </div>
          </div>
          <div className="divide-y divide-border rounded-xl border border-border">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">{r.label}</p>
                  {r.error ? (
                    <p className="mt-0.5 text-sm font-medium text-red-500">{r.error}</p>
                  ) : (
                    <p className="mt-0.5 truncate text-[15px] font-semibold">{r.value || "n/a"}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => copy(r.id, r.value)}
                  disabled={!r.value || !!r.error}
                  aria-label={`Copy ${r.label}`}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {copied === r.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied === r.id ? "Copied" : "Copy"}
                </button>
              </div>
            ))}
          </div>
          {!isPro && (
            <p className="mt-3 text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copy-all / JSON exports left. Individual copies are unlimited.
            </p>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
