// /tools/json-csv-converter - Convert JSON to CSV and CSV to JSON in your
// browser. Custom delimiters, optional header row, and dot-notation flattening
// for nested objects. 100% client-side, runs in your browser, nothing is uploaded.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeftRight, Check, Copy, Download, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/json-csv-converter";
import toolSeoMeta from "@/lib/tool-seo-meta-data/json-csv-converter";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/json-csv-converter")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/json-csv-converter";
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
  component: JsonCsvConverterTool,
});

type Mode = "json2csv" | "csv2json";

const DELIMS = [
  { id: ",", label: "Comma (,)" },
  { id: ";", label: "Semicolon (;)" },
  { id: "\t", label: "Tab" },
  { id: "|", label: "Pipe (|)" },
];

const SAMPLE_JSON = `[
  { "name": "IconVault", "price": 29, "meta": { "author": "Sameer" } },
  { "name": "Thumbnail Studio", "price": 0, "meta": { "author": "Sameer" } }
]`;

const SAMPLE_CSV = `name,price,meta.author
IconVault,29,Sameer
Thumbnail Studio,0,Sameer`;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function flatten(obj: unknown, prefix: string, out: Record<string, string>) {
  if (isPlainObject(obj)) {
    const keys = Object.keys(obj);
    if (keys.length === 0) out[prefix] = "";
    for (const k of keys) flatten(obj[k], prefix ? `${prefix}.${k}` : k, out);
  } else if (Array.isArray(obj)) {
    out[prefix] = JSON.stringify(obj);
  } else if (obj === null || obj === undefined) {
    out[prefix] = "";
  } else {
    out[prefix] = String(obj);
  }
}

function escapeCell(value: string, delim: string): string {
  if (value.includes('"') || value.includes("\n") || value.includes("\r") || value.includes(delim)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function parseCsv(text: string, delim: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else inQuotes = false;
      } else cell += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delim) {
      row.push(cell);
      cell = "";
    } else if (c === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (c === "\r") {
      // skip, handled with \n
    } else cell += c;
  }
  row.push(cell);
  rows.push(row);
  // drop trailing empty row from final newline
  let lastRow = rows[rows.length - 1];
  while (rows.length > 0 && lastRow !== undefined && lastRow.every((c) => c === "")) {
    rows.pop();
    lastRow = rows[rows.length - 1];
  }
  return rows;
}

function unflatten(flat: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [dotted, value] of Object.entries(flat)) {
    const parts = dotted.split(".");
    let cur: Record<string, unknown> = out;
    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i] ?? "";
      if (!isPlainObject(cur[key])) cur[key] = {};
      cur = cur[key] as Record<string, unknown>;
    }
    cur[parts[parts.length - 1] ?? ""] = value === "" ? "" : value;
  }
  return out;
}

function smartValue(v: string): unknown {
  if (v === "") return "";
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  if (v === "true") return true;
  if (v === "false") return false;
  if (v === "null") return null;
  return v;
}

function JsonCsvConverterTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("json-csv-converter", isPro);
  const seo = toolSeo;

  const [mode, setMode] = useState<Mode>("json2csv");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [delim, setDelim] = useState(",");
  const [header, setHeader] = useState(true);
  const [flattenNested, setFlattenNested] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const convert = () => {
    if (!trial.canUse || busy || !input.trim()) return;
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      if (mode === "json2csv") {
        const parsed: unknown = JSON.parse(input);
        const rows: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
        if (rows.length === 0) throw new Error("JSON array is empty, nothing to convert");
        if (!rows.every(isPlainObject)) throw new Error("JSON must be an array of objects (or a single object)");
        const flatRows = rows.map((r) => {
          const out: Record<string, string> = {};
          if (flattenNested) flatten(r, "", out);
          else for (const [k, v] of Object.entries(r as Record<string, unknown>)) out[k] = isPlainObject(v) || Array.isArray(v) ? JSON.stringify(v) : v === null || v === undefined ? "" : String(v);
          return out;
        });
        const cols = [...new Set(flatRows.flatMap((r) => Object.keys(r)))];
        if (cols.length === 0) throw new Error("No columns found in the JSON objects");
        const lines: string[] = [];
        if (header) lines.push(cols.map((c) => escapeCell(c, delim)).join(delim));
        for (const r of flatRows) lines.push(cols.map((c) => escapeCell(r[c] ?? "", delim)).join(delim));
        setOutput(lines.join("\n"));
      } else {
        const rows = parseCsv(input, delim);
        if (rows.length === 0) throw new Error("No rows found in the CSV");
        const width = Math.max(...rows.map((r) => r.length));
        const norm = rows.map((r) => [...r, ...Array(Math.max(0, width - r.length)).fill("")]);
        let headers: string[];
        let dataRows: string[][];
        if (header) {
          headers = (norm[0] ?? []).map((h, i) => h.trim() || `col_${i + 1}`);
          dataRows = norm.slice(1);
        } else {
          headers = Array.from({ length: width }, (_, i) => `col_${i + 1}`);
          dataRows = norm;
        }
        const objs = dataRows.map((r) => {
          const flat: Record<string, string> = {};
          headers.forEach((h, i) => { flat[h] = r[i] ?? ""; });
          const nested = unflatten(flat);
          // convert numeric-looking strings back to numbers
          const revive = (o: unknown): unknown => {
            if (isPlainObject(o)) { const x: Record<string, unknown> = {}; for (const k of Object.keys(o)) x[k] = revive(o[k]); return x; }
            if (typeof o === "string") return smartValue(o);
            return o;
          };
          return revive(nested);
        });
        setOutput(JSON.stringify(objs, null, 2));
      }
      trial.recordUse();
      toast.success("Converted");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Conversion failed");
      setOutput("");
    } finally {
      setBusy(false);
    }
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setInput("");
    setOutput("");
    setError(null);
    setCopied(false);
  };

  const copy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      toast.success("Copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  const download = () => {
    if (!output) return;
    const ext = mode === "json2csv" ? "csv" : "json";
    downloadBlob(new Blob([output], { type: "text/plain" }), `converted.${ext}`);
    toast.success("File downloaded");
  };

  const fromLabel = mode === "json2csv" ? "JSON" : "CSV";
  const toLabel = mode === "json2csv" ? "CSV" : "JSON";

  const paneClass =
    "h-72 w-full resize-y rounded-xl border border-border bg-background p-3 font-mono text-[13px] leading-relaxed outline-none focus:border-primary";

  const toggleClass = (on: boolean) =>
    cn(
      "relative h-6 w-11 shrink-0 rounded-full transition",
      on ? "bg-primary" : "bg-muted",
    );

  return (
    <ToolPageShell toolId="json-csv-converter" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="JSON to CSV" left={trial.left} />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => switchMode("json2csv")}
          className={cn(
            "rounded-xl border px-4 py-2.5 text-sm font-bold transition",
            mode === "json2csv"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:border-primary/40",
          )}
        >
          JSON to CSV
        </button>
        <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
        <button
          type="button"
          onClick={() => switchMode("csv2json")}
          className={cn(
            "rounded-xl border px-4 py-2.5 text-sm font-bold transition",
            mode === "csv2json"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:border-primary/40",
          )}
        >
          CSV to JSON
        </button>
        <button
          type="button"
          onClick={() => { setInput(mode === "json2csv" ? SAMPLE_JSON : SAMPLE_CSV); setOutput(""); setError(null); }}
          className="ml-2 rounded-xl border border-border px-3 py-2 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
        >
          Sample
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <span className="mb-2 block text-sm font-bold">{fromLabel} input</span>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Paste your ${fromLabel} here...`}
            spellCheck={false}
            className={paneClass}
          />
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-bold">{toLabel} output</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={copy}
                disabled={!output}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copied" : "Copy"}
              </button>
              <button
                type="button"
                onClick={download}
                disabled={!output}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" /> Download
              </button>
            </div>
          </div>
          {output ? (
            <textarea value={output} readOnly spellCheck={false} className={paneClass} />
          ) : (
            <div className="flex h-72 flex-col items-center justify-center rounded-xl border border-dashed border-border text-center">
              <RefreshCcw className="mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm font-semibold text-muted-foreground">Your {toLabel} appears here</p>
            </div>
          )}
          {error && <p className="mt-2 text-sm font-medium text-red-500">{error}</p>}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <div>
            <span className="mb-2 block text-[13px] font-medium text-foreground/80">Delimiter</span>
            <div className="flex flex-wrap gap-2">
              {DELIMS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDelim(d.id)}
                  className={cn(
                    "rounded-xl border px-4 py-2.5 text-sm font-bold transition",
                    delim === d.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          <button type="button" onClick={() => setHeader((h) => !h)} className="flex items-center gap-2.5 pt-6">
            <span className={toggleClass(header)}>
              <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", header ? "left-[22px]" : "left-0.5")} />
            </span>
            <span className="text-sm font-bold">Header row</span>
          </button>
          {mode === "json2csv" && (
            <button type="button" onClick={() => setFlattenNested((f) => !f)} className="flex items-center gap-2.5 pt-6">
              <span className={toggleClass(flattenNested)}>
                <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", flattenNested ? "left-[22px]" : "left-0.5")} />
              </span>
              <span className="text-sm font-bold">Flatten nested objects (dot notation)</span>
            </button>
          )}
          <div className="ml-auto pt-4">
            <ActionButton busy={busy} disabled={!trial.canUse || !input.trim()} onClick={convert}>
              <RefreshCcw className="h-4 w-4" /> {busy ? "Converting..." : `Convert to ${toLabel}`}
            </ActionButton>
          </div>
        </div>
        {!isPro && (
          <p className="mt-3 text-xs text-muted-foreground">
            {trial.left} of {TOOL_TRIAL_LIMIT} free conversions left. Runs in your browser, nothing is uploaded.
          </p>
        )}
      </div>
    </ToolPageShell>
  );
}
