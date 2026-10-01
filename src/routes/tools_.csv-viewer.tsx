// /tools/csv-viewer - Paste or upload CSV and explore it as an interactive
// table: sorting, search filter, auto delimiter detection, JSON export.
// Runs fully in your browser, nothing is uploaded.

import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Check, Copy, Download, Eraser, FileUp, Search, Table2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/csv-viewer")({
  head: () => {
    const seo = getToolSeoMeta("csv-viewer");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: CsvViewerTool,
});

const SAMPLE = `name,role,city,salary
Ada Lovelace,Engineer,London,95000
Alan Turing,Researcher,"Cambridge, UK",88000
Grace Hopper,Admiral,Arlington,120000
"Edsger, Dijkstra",Professor,Austin,91000
Katherine Johnson,Mathematician,Hampton,102000`;

type Delim = "auto" | "," | ";" | "\t" | "|";

const DELIMS: { id: Delim; label: string }[] = [
  { id: "auto", label: "Auto-detect" },
  { id: ",", label: "Comma (,)" },
  { id: ";", label: "Semicolon (;)" },
  { id: "\t", label: "Tab" },
  { id: "|", label: "Pipe (|)" },
];

function parseCsv(text: string, delim: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delim) {
      row.push(field);
      field = "";
    } else if (c === "\r") {
      // skip, handled with \n
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => !(r.length === 1 && (r[0] ?? "").trim() === ""));
}

function detectDelimiter(text: string): string {
  const candidates = [",", ";", "\t", "|"];
  const lines = text.split("\n").filter((l) => l.trim() !== "").slice(0, 5);
  if (lines.length === 0) return ",";
  let best = ",";
  let bestScore = -1;
  for (const d of candidates) {
    // count occurrences outside quotes on the sample lines
    let count = 0;
    for (const line of lines) {
      let inQ = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') inQ = !inQ;
        else if (c === d && !inQ) count++;
      }
    }
    if (count > bestScore) {
      bestScore = count;
      best = d;
    }
  }
  return best;
}

type Sort = { col: number; dir: 1 | -1 } | null;

function CsvViewerTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("csv-viewer", isPro);
  const seo = getToolSeo("csv-viewer");

  const [input, setInput] = useState("");
  const [delim, setDelim] = useState<Delim>("auto");
  const [parsed, setParsed] = useState<string[][] | null>(null);
  const [usedDelim, setUsedDelim] = useState(",");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>(null);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const parse = () => {
    if (!trial.canUse || !input.trim()) return;
    const d = delim === "auto" ? detectDelimiter(input) : delim;
    const rows = parseCsv(input, d);
    if (rows.length === 0) {
      toast.error("No rows found. Check the delimiter.");
      return;
    }
    // normalize column counts
    const width = Math.max(...rows.map((r) => r.length));
    const norm = rows.map((r) => {
      const copy = [...r];
      while (copy.length < width) copy.push("");
      return copy;
    });
    setParsed(norm);
    setUsedDelim(d);
    setSort(null);
    setSearch("");
    trial.recordUse();
    toast.success(`Parsed ${norm.length - 1} data rows, ${width} columns`);
  };

  const headers: string[] = parsed ? (parsed[0] ?? []) : [];
  const dataRows = parsed ? parsed.slice(1) : [];

  const visible = useMemo(() => {
    let rows = [...dataRows];
    const q = search.trim().toLowerCase();
    if (q) rows = rows.filter((r) => r.some((c) => c.toLowerCase().includes(q)));
    if (sort) {
      const { col, dir } = sort;
      rows.sort((a, b) => {
        const x = a[col] ?? "";
        const y = b[col] ?? "";
        const nx = parseFloat(x);
        const ny = parseFloat(y);
        let cmp: number;
        if (x !== "" && y !== "" && !isNaN(nx) && !isNaN(ny)) cmp = nx - ny;
        else cmp = x.localeCompare(y);
        return cmp * dir;
      });
    }
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed, search, sort]);

  const toggleSort = (col: number) => {
    setSort((s) => {
      if (!s || s.col !== col) return { col, dir: 1 };
      if (s.dir === 1) return { col, dir: -1 };
      return null;
    });
  };

  const jsonText = useMemo(() => {
    if (!parsed) return "";
    const seen = new Map<string, number>();
    const keys = headers.map((h, i) => {
      let k = h.trim() === "" ? `col${i + 1}` : h.trim();
      const n = seen.get(k) ?? 0;
      seen.set(k, n + 1);
      return n > 0 ? `${k}_${n + 1}` : k;
    });
    const arr = dataRows.map((r) => {
      const obj: Record<string, string> = {};
      keys.forEach((k, i) => {
        obj[k] = r[i] ?? "";
      });
      return obj;
    });
    return JSON.stringify(arr, null, 2);
  }, [parsed, headers, dataRows]);

  const copyJson = async () => {
    if (!jsonText) return;
    try {
      await navigator.clipboard.writeText(jsonText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  const downloadJson = () => {
    if (!trial.canUse || !jsonText) return;
    downloadBlob(new Blob([jsonText], { type: "application/json" }), "data.json");
    trial.recordUse();
    toast.success("JSON downloaded");
  };

  const loadSample = () => {
    setInput(SAMPLE);
    setParsed(null);
  };

  const delimLabel = usedDelim === "\t" ? "Tab" : usedDelim === "," ? "Comma" : usedDelim === ";" ? "Semicolon" : "Pipe";

  return (
    <ToolPageShell toolId="csv-viewer" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="CSV Viewer" left={trial.left} />

      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold">CSV data</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={loadSample}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50"
              >
                Load sample
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50"
              >
                <FileUp className="h-3.5 w-3.5" /> Upload .csv
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.tsv,.txt,text/csv"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setInput(await f.text());
                  setParsed(null);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => { setInput(""); setParsed(null); setSearch(""); }}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50"
              >
                <Eraser className="h-3.5 w-3.5" /> Clear
              </button>
            </div>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste CSV here, or upload a .csv file…"
            spellCheck={false}
            rows={8}
            className="w-full resize-y rounded-xl border border-border bg-background p-4 font-mono text-[13px] leading-relaxed outline-none focus:border-primary"
          />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80" htmlFor="csv-delim">
                Delimiter
              </label>
              <select
                id="csv-delim"
                value={delim}
                onChange={(e) => setDelim(e.target.value as Delim)}
                className="w-44 rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              >
                {DELIMS.map((d) => (
                  <option key={d.id} value={d.id}>{d.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end pt-6">
              <ActionButton busy={false} disabled={!trial.canUse || !input.trim()} onClick={parse}>
                <Table2 className="h-4 w-4" /> View table
              </ActionButton>
            </div>
            {!isPro && (
              <p className="pt-6 text-xs text-muted-foreground">
                {trial.left} of {TOOL_TRIAL_LIMIT} free parses/exports left. Runs in your browser,
                nothing is uploaded.
              </p>
            )}
          </div>
        </div>

        {parsed && (
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-bold">
                Table{" "}
                <span className="text-xs font-medium text-muted-foreground">
                  {dataRows.length} rows x {headers.length} columns (delimiter: {delimLabel})
                </span>
              </p>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Filter rows…"
                    spellCheck={false}
                    className="w-52 rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary"
                  />
                </div>
                <button
                  type="button"
                  onClick={copyJson}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2.5 text-xs font-bold hover:border-primary/50"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy JSON"}
                </button>
                <button
                  type="button"
                  onClick={downloadJson}
                  disabled={!trial.canUse}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2.5 text-xs font-bold hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" /> JSON
                </button>
              </div>
            </div>
            {visible.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No rows match the current filter.
              </p>
            ) : (
              <div className="max-h-[480px] overflow-auto rounded-xl border border-border">
                <table className="w-full border-collapse text-sm">
                  <thead className="sticky top-0">
                    <tr>
                      {headers.map((h, i) => (
                        <th key={i} className="border-b border-border bg-muted/60 p-0 text-left">
                          <button
                            type="button"
                            onClick={() => toggleSort(i)}
                            className={cn(
                              "flex w-full items-center gap-1.5 whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wide hover:text-primary",
                              sort?.col === i ? "text-primary" : "text-foreground/80",
                            )}
                          >
                            {h === "" ? `(col ${i + 1})` : h}
                            {sort?.col === i ? (
                              sort.dir === 1 ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
                            ) : (
                              <span className="text-muted-foreground/40">↕</span>
                            )}
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visible.slice(0, 2000).map((r, ri) => (
                      <tr key={ri} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                        {r.map((c, ci) => (
                          <td key={ci} className="max-w-[320px] truncate px-4 py-2.5 font-mono text-[13px]" title={c}>
                            {c}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {visible.length > 2000 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Showing the first 2,000 of {visible.length} rows. Use the filter or JSON export for
                the full set.
              </p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              Click a column header to sort ascending, descending, then back to unsorted. JSON export
              uses the first row as keys (numbers stay as text, matching CSV semantics).
            </p>
          </div>
        )}
      </div>
    </ToolPageShell>
  );
}
