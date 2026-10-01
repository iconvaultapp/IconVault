// /tools/sqlite-browser - Open a SQLite database file in your browser,
// browse tables, run SQL and export results. The sql.js engine (WASM) is
// loaded from a CDN at runtime; the database file never leaves your device.

// Runtime CDN module: sql.js is not bundled. Vite must not try to resolve
// the bare specifier, so the full CDN URL is used with @vite-ignore.
// Types for the CDN module live in src/types/vendor.d.ts.
const SQLJS_CDN = "https://cdn.jsdelivr.net/npm/sql.js@1.14.2/dist/sql-wasm.js";

import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Database, Download, FileUp, Play, Table as TableIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import { downloadBlob } from "@/lib/logo-builder";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/tools_/sqlite-browser")({
  head: () => {
    const seo = getToolSeoMeta("sqlite-browser");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: SqliteBrowserTool,
});

interface TableInfo {
  name: string;
  rows: number;
}
interface ColInfo {
  name: string;
  type: string;
  notnull: number;
  pk: number;
}

let dbRef: SqlJsDatabase | null = null;
let enginePromise: Promise<SqlJsStatic> | null = null;

async function loadEngine(setStatus: (s: string) => void): Promise<SqlJsStatic> {
  if (!enginePromise) {
    setStatus("Downloading the SQLite engine (one-time, cached by your browser)…");
    enginePromise = (async () => {
      const mod = await import(/* @vite-ignore */ SQLJS_CDN);
      setStatus("Starting the SQLite engine…");
      const SQL = await (mod.default as (config?: { locateFile?: (f: string) => string }) => Promise<SqlJsStatic>)({
        locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/sql.js@1.14.2/dist/${f}`,
      });
      return SQL;
    })().catch((e) => {
      enginePromise = null;
      throw e;
    });
  }
  return enginePromise;
}

const cellText = (v: unknown): string => {
  if (v === null || v === undefined) return "NULL";
  if (v instanceof Uint8Array) return `<blob ${v.length} bytes>`;
  return String(v);
};

const csvCell = (v: unknown): string => {
  const s = v === null || v === undefined ? "" : v instanceof Uint8Array ? `<blob ${v.length} bytes>` : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function SqliteBrowserTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("sqlite-browser", isPro);
  const seo = getToolSeo("sqlite-browser");

  const [engineStatus, setEngineStatus] = useState<string | null>(null);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [activeTable, setActiveTable] = useState<string | null>(null);
  const [schema, setSchema] = useState<ColInfo[]>([]);
  const [sql, setSql] = useState("SELECT * FROM ");
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<unknown[][]>([]);
  const [ranAt, setRanAt] = useState<string | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const runQuery = (statement: string): boolean => {
    if (!dbRef) return false;
    setQueryError(null);
    try {
      const res = dbRef.exec(statement);
      const first = res[0];
      setColumns(first ? first.columns : []);
      setRows(first ? first.values : []);
      setRanAt(new Date().toLocaleTimeString());
      if (res.length > 1) toast.success(`Ran ${res.length} statements, showing the first result.`);
      return true;
    } catch (e) {
      setColumns([]);
      setRows([]);
      setQueryError(e instanceof Error ? e.message : "Query failed.");
      return false;
    }
  };

  const openTable = (name: string) => {
    setActiveTable(name);
    if (!dbRef) return;
    try {
      const info = dbRef.exec(`PRAGMA table_info("${name.replace(/"/g, '""')}")`)[0];
      setSchema(
        (info?.values ?? []).map((v) => ({
          name: String(v[1] ?? ""),
          type: String(v[2] ?? ""),
          notnull: Number(v[3] ?? 0),
          pk: Number(v[5] ?? 0),
        })),
      );
    } catch {
      setSchema([]);
    }
    setSql(`SELECT * FROM "${name.replace(/"/g, '""')}" LIMIT 100;`);
    runQuery(`SELECT * FROM "${name.replace(/"/g, '""')}" LIMIT 100;`);
  };

  const acceptFile = async (f: File) => {
    if (!trial.canUse || busy) return;
    setBusy(true);
    setEngineError(null);
    setQueryError(null);
    try {
      const SQL = await loadEngine(setEngineStatus);
      setEngineStatus(null);
      const buf = new Uint8Array(await f.arrayBuffer());
      if (dbRef) {
        try {
          dbRef.close();
        } catch {
          /* ignore */
        }
      }
      dbRef = new SQL.Database(buf);
      const names = dbRef.exec(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )[0];
      const list: TableInfo[] = [];
      for (const row of names?.values ?? []) {
        const t = String(row[0] ?? "");
        let count = 0;
        try {
          const c = dbRef.exec(`SELECT COUNT(*) FROM "${t.replace(/"/g, '""')}"`)[0];
          count = Number(c?.values[0]?.[0] ?? 0);
        } catch {
          count = 0;
        }
        list.push({ name: t, rows: count });
      }
      setTables(list);
      setFileName(f.name);
      const first = list[0];
      if (first) openTable(first.name);
      else {
        setActiveTable(null);
        setColumns([]);
        setRows([]);
      }
      trial.recordUse();
      toast.success(`${f.name} opened: ${list.length} table${list.length === 1 ? "" : "s"}.`);
    } catch (e) {
      setEngineStatus(null);
      setEngineError(
        e instanceof Error
          ? `Could not open the database: ${e.message}. The engine needs network access to cdn.jsdelivr.net on first use.`
          : "Could not open the database.",
      );
    } finally {
      setBusy(false);
    }
  };

  const doRun = () => {
    if (!dbRef || !sql.trim()) return;
    runQuery(sql);
  };

  const exportCsv = () => {
    if (!columns.length) return;
    const out = [columns.map(csvCell).join(","), ...rows.map((r) => r.map(csvCell).join(","))].join("\n");
    downloadBlob(new Blob([out], { type: "text/csv" }), `${activeTable ?? "query"}-results.csv`);
    toast.success("CSV downloaded.");
  };

  const exportJson = () => {
    if (!columns.length) return;
    const out = rows.map((r) => Object.fromEntries(columns.map((c, i) => [c, cellText(r[i])])));
    downloadBlob(new Blob([JSON.stringify(out, null, 2)], { type: "application/json" }), `${activeTable ?? "query"}-results.json`);
    toast.success("JSON downloaded.");
  };

  const copySql = async () => {
    const ok = await copyToClipboard(sql);
    if (ok) toast.success("SQL copied.");
    else toast.error("Could not copy to clipboard.");
  };

  return (
    <ToolPageShell toolId="sqlite-browser" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="SQLite Browser" left={trial.left} />

      {!tables.length && !engineStatus ? (
        <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-5">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) void acceptFile(f); }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-10 text-center transition",
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
            )}
          >
            <FileUp className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold">{busy ? "Opening…" : "Drop a .sqlite / .db / .sqlite3 file"}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              The database engine loads from a CDN once, your file never leaves this browser.
            </p>
            <input ref={inputRef} type="file" accept=".sqlite,.db,.sqlite3,.db3" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void acceptFile(f); }} />
          </div>
          {!isPro && (
            <p className="mt-2 text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free database opens left - runs fully in your browser, nothing is uploaded.
            </p>
          )}
          {engineError && <p className="mt-2 text-sm font-medium text-red-500">{engineError}</p>}
        </div>
      ) : (
        <div>
          {engineStatus && (
            <div className="mb-4 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
              {engineStatus}
            </div>
          )}
          <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
            <div className="space-y-1 rounded-2xl border border-border bg-card p-3">
              <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {fileName} · {tables.length} tables
              </p>
              <div className="max-h-[560px] overflow-y-auto">
                {tables.map((t) => (
                  <button
                    key={t.name}
                    type="button"
                    onClick={() => openTable(t.name)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition",
                      activeTable === t.name ? "bg-primary/10 font-semibold text-primary" : "text-foreground/80 hover:bg-muted",
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <TableIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate font-mono">{t.name}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{t.rows.toLocaleString()}</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="mt-2 w-full rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
              >
                Open another file
              </button>
              <input ref={inputRef} type="file" accept=".sqlite,.db,.sqlite3,.db3" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void acceptFile(f); }} />
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="mb-2 flex items-center justify-between">
                  <Label className="text-[13px] font-medium text-foreground/80">SQL editor</Label>
                  <button
                    type="button"
                    onClick={copySql}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </button>
                </div>
                <Textarea value={sql} onChange={(e) => setSql(e.target.value)} rows={4} spellCheck={false} className="font-mono text-[13px]" />
                <div className="mt-3">
                  <ActionButton busy={false} disabled={!sql.trim()} onClick={doRun}>
                    <Play className="h-4 w-4" /> Run query
                  </ActionButton>
                </div>
                {queryError && <p className="mt-2 text-sm font-medium text-red-500">{queryError}</p>}
              </div>

              <Tabs defaultValue="results">
                <div className="flex items-center justify-between">
                  <TabsList>
                    <TabsTrigger value="results">Results{rows.length > 0 && ` (${rows.length})`}</TabsTrigger>
                    <TabsTrigger value="schema">Schema</TabsTrigger>
                  </TabsList>
                  {columns.length > 0 && (
                    <div className="flex gap-2">
                      <button type="button" onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground">
                        <Download className="h-3.5 w-3.5" /> CSV
                      </button>
                      <button type="button" onClick={exportJson} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground">
                        <Download className="h-3.5 w-3.5" /> JSON
                      </button>
                    </div>
                  )}
                </div>
                <TabsContent value="results" className="pt-3">
                  <div className="overflow-x-auto rounded-2xl border border-border bg-card">
                    {columns.length === 0 ? (
                      <div className="flex min-h-[160px] flex-col items-center justify-center p-8 text-center">
                        <Database className="mb-2 h-8 w-8 text-muted-foreground/50" />
                        <p className="text-sm text-muted-foreground">
                          {ranAt ? "The query returned no rows." : "Run a query or pick a table to see results."}
                        </p>
                      </div>
                    ) : (
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border bg-muted/50 text-left">
                            {columns.map((c) => (
                              <th key={c} className="whitespace-nowrap px-3 py-2 font-mono font-semibold">{c}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r, i) => (
                            <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                              {r.map((v, j) => (
                                <td key={j} className="max-w-64 truncate px-3 py-1.5 font-mono text-muted-foreground" title={cellText(v)}>
                                  {cellText(v)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                  {ranAt && columns.length > 0 && (
                    <p className="mt-1.5 text-xs text-muted-foreground">Ran at {ranAt}. Showing up to the rows the query returned.</p>
                  )}
                </TabsContent>
                <TabsContent value="schema" className="pt-3">
                  <div className="overflow-x-auto rounded-2xl border border-border bg-card">
                    {schema.length === 0 ? (
                      <p className="p-6 text-sm text-muted-foreground">Pick a table to see its columns.</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                            <th className="px-4 py-2">Column</th>
                            <th className="px-4 py-2">Type</th>
                            <th className="px-4 py-2">Not null</th>
                            <th className="px-4 py-2">Key</th>
                          </tr>
                        </thead>
                        <tbody>
                          {schema.map((c) => (
                            <tr key={c.name} className="border-b border-border/50 last:border-0">
                              <td className="px-4 py-2 font-mono font-semibold">{c.name}</td>
                              <td className="px-4 py-2 font-mono text-xs text-primary">{c.type || "(none)"}</td>
                              <td className="px-4 py-2 text-muted-foreground">{c.notnull ? "yes" : "no"}</td>
                              <td className="px-4 py-2 text-muted-foreground">{c.pk ? "PK" : ""}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      )}
    </ToolPageShell>
  );
}
