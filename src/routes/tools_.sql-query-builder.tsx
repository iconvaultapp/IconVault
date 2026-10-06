// /tools/sql-query-builder - Build SELECT/INSERT/UPDATE/DELETE visually.
// Live-generated SQL with per-dialect identifier quoting. Runs fully in your
// browser, nothing is uploaded.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Blocks, Check, Copy, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/sql-query-builder";
import toolSeoMeta from "@/lib/tool-seo-meta-data/sql-query-builder";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/sql-query-builder")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/sql-query-builder";
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
  component: SqlQueryBuilderTool,
});

type Statement = "SELECT" | "INSERT" | "UPDATE" | "DELETE";
type Dialect = "generic" | "mysql" | "postgres" | "sqlserver" | "sqlite";
type Dir = "ASC" | "DESC";

interface WhereRow {
  id: number;
  column: string;
  operator: string;
  value: string;
  connector: "AND" | "OR";
}

interface SetRow {
  id: number;
  column: string;
  value: string;
}

const OPERATORS = ["=", "!=", "<>", ">", "<", ">=", "<=", "LIKE", "IN", "BETWEEN", "IS NULL", "IS NOT NULL"];
const DIALECTS: { id: Dialect; label: string }[] = [
  { id: "generic", label: "Generic (\"col\")" },
  { id: "mysql", label: "MySQL (`col`)" },
  { id: "postgres", label: "PostgreSQL (\"col\")" },
  { id: "sqlserver", label: "SQL Server ([col])" },
  { id: "sqlite", label: "SQLite (\"col\")" },
];

const inputCls =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary";
const labelCls = "mb-1.5 block text-[13px] font-medium text-foreground/80";

let rowId = 1;
const nextId = () => rowId++;

function quoteIdent(dialect: Dialect, name: string): string {
  const n = name.trim();
  if (n === "" || n === "*" || /[()\s]/.test(n) && !/^[\w$]+$/.test(n.replace(/["`[\]]/g, ""))) {
    // expressions like count(*) pass through untouched
    if (/[(*/+\-]/.test(n)) return n;
  }
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(n)) {
    if (dialect === "mysql") return `\`${n}\``;
    if (dialect === "sqlserver") return `[${n}]`;
    return `"${n}"`;
  }
  return n;
}

function valueSql(v: string): string {
  const t = v.trim();
  if (t === "") return "NULL";
  if (/^null$/i.test(t)) return "NULL";
  if (/^[+-]?(\d+(\.\d+)?|\.\d+)([eE][+-]?\d+)?$/.test(t)) return t;
  if (/^(true|false)$/i.test(t)) return t.toUpperCase();
  return `'${t.replace(/'/g, "''")}'`;
}

function whereSql(rows: WhereRow[], dialect: Dialect): string {
  const parts: string[] = [];
  rows.forEach((r, i) => {
    if (!r.column.trim()) return;
    const col = quoteIdent(dialect, r.column);
    let cond: string;
    if (r.operator === "IS NULL" || r.operator === "IS NOT NULL") {
      cond = `${col} ${r.operator}`;
    } else if (r.operator === "IN") {
      const vals = r.value.split(",").map((v) => valueSql(v)).join(", ");
      cond = `${col} IN (${vals})`;
    } else if (r.operator === "BETWEEN") {
      const [a, b] = r.value.split(",").map((v) => (v ?? "").trim());
      cond = `${col} BETWEEN ${valueSql(a ?? "")} AND ${valueSql(b ?? "")}`;
    } else {
      cond = `${col} ${r.operator} ${valueSql(r.value)}`;
    }
    parts.push(`${i > 0 ? `${r.connector} ` : ""}${cond}`);
  });
  return parts.join(" ");
}

function SqlQueryBuilderTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("sql-query-builder", isPro);
  const seo = toolSeo;

  const [statement, setStatement] = useState<Statement>("SELECT");
  const [dialect, setDialect] = useState<Dialect>("generic");
  const [table, setTable] = useState("users");
  const [columns, setColumns] = useState<string[]>(["id", "name", "email"]);
  const [whereRows, setWhereRows] = useState<WhereRow[]>([
    { id: nextId(), column: "active", operator: "=", value: "1", connector: "AND" },
  ]);
  const [setRows, setSetRows] = useState<SetRow[]>([
    { id: nextId(), column: "name", value: "Ada" },
  ]);
  const [orderCol, setOrderCol] = useState("id");
  const [orderDir, setOrderDir] = useState<Dir>("ASC");
  const [useOrder, setUseOrder] = useState(false);
  const [limit, setLimit] = useState("100");
  const [useLimit, setUseLimit] = useState(true);
  const [copied, setCopied] = useState(false);

  const sql = useMemo(() => {
    const t = quoteIdent(dialect, table || "table_name");
    const where = whereSql(whereRows, dialect);
    switch (statement) {
      case "SELECT": {
        const cols = columns.filter((c) => c.trim()).map((c) => quoteIdent(dialect, c));
        let q = `SELECT ${cols.length ? cols.join(", ") : "*"}\nFROM ${t}`;
        if (where) q += `\nWHERE ${where}`;
        if (useOrder && orderCol.trim()) q += `\nORDER BY ${quoteIdent(dialect, orderCol)} ${orderDir}`;
        if (useLimit && limit.trim()) q += `\nLIMIT ${limit.trim()}`;
        return q + ";";
      }
      case "INSERT": {
        const cols = columns.filter((c) => c.trim());
        const colSql = cols.map((c) => quoteIdent(dialect, c)).join(", ");
        const valSql = cols.map((c, i) => valueSql(setRows[i]?.value ?? "")).join(", ");
        return `INSERT INTO ${t} (${colSql})\nVALUES (${valSql});`;
      }
      case "UPDATE": {
        const sets = setRows
          .filter((r) => r.column.trim())
          .map((r) => `${quoteIdent(dialect, r.column)} = ${valueSql(r.value)}`)
          .join(", ");
        let q = `UPDATE ${t}\nSET ${sets || "-- add a column above"}`;
        if (where) q += `\nWHERE ${where}`;
        return q + ";";
      }
      case "DELETE": {
        let q = `DELETE FROM ${t}`;
        if (where) q += `\nWHERE ${where}`;
        else q += `\n-- WARNING: no WHERE clause, this deletes every row`;
        return q + ";";
      }
    }
  }, [statement, dialect, table, columns, whereRows, setRows, orderCol, orderDir, useOrder, limit, useLimit]);

  const addWhere = () =>
    setWhereRows((p) => [...p, { id: nextId(), column: "", operator: "=", value: "", connector: "AND" }]);
  const addColumn = () => setColumns((p) => [...p, ""]);
  const addSet = () => setSetRows((p) => [...p, { id: nextId(), column: "", value: "" }]);

  const copy = async () => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(sql);
      trial.recordUse();
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  const whereEditor = (
    <div>
      <p className={labelCls}>WHERE conditions</p>
      <div className="space-y-2">
        {whereRows.map((r, i) => (
          <div key={r.id} className="flex items-center gap-2">
            {i > 0 ? (
              <select
                value={r.connector}
                onChange={(e) =>
                  setWhereRows((p) => p.map((x) => (x.id === r.id ? { ...x, connector: e.target.value as "AND" | "OR" } : x)))
                }
                className="w-20 shrink-0 rounded-xl border border-border bg-background px-2 py-2.5 text-sm outline-none focus:border-primary"
              >
                <option>AND</option>
                <option>OR</option>
              </select>
            ) : (
              <span className="w-20 shrink-0 text-center text-xs font-bold text-muted-foreground">WHERE</span>
            )}
            <input
              value={r.column}
              onChange={(e) => setWhereRows((p) => p.map((x) => (x.id === r.id ? { ...x, column: e.target.value } : x)))}
              placeholder="column"
              spellCheck={false}
              className={cn(inputCls, "font-mono")}
            />
            <select
              value={r.operator}
              onChange={(e) => setWhereRows((p) => p.map((x) => (x.id === r.id ? { ...x, operator: e.target.value } : x)))}
              className="w-32 shrink-0 rounded-xl border border-border bg-background px-2 py-2.5 text-sm outline-none focus:border-primary"
            >
              {OPERATORS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
            {!["IS NULL", "IS NOT NULL"].includes(r.operator) && (
              <input
                value={r.value}
                onChange={(e) => setWhereRows((p) => p.map((x) => (x.id === r.id ? { ...x, value: e.target.value } : x)))}
                placeholder={r.operator === "BETWEEN" ? "a, b" : r.operator === "IN" ? "1, 2, 3" : "value"}
                spellCheck={false}
                className={cn(inputCls, "font-mono")}
              />
            )}
            <button
              type="button"
              onClick={() => setWhereRows((p) => p.filter((x) => x.id !== r.id))}
              className="shrink-0 rounded-lg border border-border p-2.5 text-muted-foreground hover:border-red-500/50 hover:text-red-500"
              aria-label="Remove condition"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addWhere}
        className="mt-2 flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50"
      >
        <Plus className="h-3.5 w-3.5" /> Add condition
      </button>
    </div>
  );

  return (
    <ToolPageShell toolId="sql-query-builder" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="SQL Query Builder" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls} htmlFor="sqb-stmt">Statement</label>
              <select
                id="sqb-stmt"
                value={statement}
                onChange={(e) => setStatement(e.target.value as Statement)}
                className={inputCls}
              >
                {(["SELECT", "INSERT", "UPDATE", "DELETE"] as Statement[]).map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="sqb-dialect">Dialect</label>
              <select
                id="sqb-dialect"
                value={dialect}
                onChange={(e) => setDialect(e.target.value as Dialect)}
                className={inputCls}
              >
                {DIALECTS.map((d) => (
                  <option key={d.id} value={d.id}>{d.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls} htmlFor="sqb-table">Table</label>
            <input
              id="sqb-table"
              value={table}
              onChange={(e) => setTable(e.target.value)}
              placeholder="table_name"
              spellCheck={false}
              className={cn(inputCls, "font-mono")}
            />
          </div>

          {(statement === "SELECT" || statement === "INSERT") && (
            <div>
              <p className={labelCls}>Columns {statement === "INSERT" && <span className="text-muted-foreground">(values come from the SET rows below)</span>}</p>
              <div className="space-y-2">
                {columns.map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={c}
                      onChange={(e) => setColumns((p) => p.map((x, j) => (j === i ? e.target.value : x)))}
                      placeholder={statement === "SELECT" ? "column or expression" : "column"}
                      spellCheck={false}
                      className={cn(inputCls, "font-mono")}
                    />
                    <button
                      type="button"
                      onClick={() => setColumns((p) => p.filter((_, j) => j !== i))}
                      className="shrink-0 rounded-lg border border-border p-2.5 text-muted-foreground hover:border-red-500/50 hover:text-red-500"
                      aria-label="Remove column"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addColumn}
                className="mt-2 flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50"
              >
                <Plus className="h-3.5 w-3.5" /> Add column
              </button>
            </div>
          )}

          {(statement === "INSERT" || statement === "UPDATE") && (
            <div>
              <p className={labelCls}>{statement === "INSERT" ? "Values (one per column, in order)" : "SET assignments"}</p>
              <div className="space-y-2">
                {setRows.map((r) => (
                  <div key={r.id} className="flex items-center gap-2">
                    {statement === "UPDATE" && (
                      <input
                        value={r.column}
                        onChange={(e) => setSetRows((p) => p.map((x) => (x.id === r.id ? { ...x, column: e.target.value } : x)))}
                        placeholder="column"
                        spellCheck={false}
                        className={cn(inputCls, "font-mono")}
                      />
                    )}
                    <input
                      value={r.value}
                      onChange={(e) => setSetRows((p) => p.map((x) => (x.id === r.id ? { ...x, value: e.target.value } : x)))}
                      placeholder="value"
                      spellCheck={false}
                      className={cn(inputCls, "font-mono")}
                    />
                    <button
                      type="button"
                      onClick={() => setSetRows((p) => p.filter((x) => x.id !== r.id))}
                      className="shrink-0 rounded-lg border border-border p-2.5 text-muted-foreground hover:border-red-500/50 hover:text-red-500"
                      aria-label="Remove row"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addSet}
                className="mt-2 flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50"
              >
                <Plus className="h-3.5 w-3.5" /> Add {statement === "INSERT" ? "value" : "assignment"}
              </button>
            </div>
          )}

          {statement !== "INSERT" && whereEditor}

          {statement === "SELECT" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={cn(labelCls, "flex items-center gap-2")}>
                  <input
                    type="checkbox"
                    checked={useOrder}
                    onChange={() => setUseOrder((v) => !v)}
                    className="h-4 w-4 accent-primary"
                  />
                  ORDER BY
                </label>
                <div className="flex gap-2">
                  <input
                    value={orderCol}
                    onChange={(e) => setOrderCol(e.target.value)}
                    disabled={!useOrder}
                    placeholder="column"
                    spellCheck={false}
                    className={cn(inputCls, "font-mono")}
                  />
                  <select
                    value={orderDir}
                    onChange={(e) => setOrderDir(e.target.value as Dir)}
                    disabled={!useOrder}
                    className="w-24 shrink-0 rounded-xl border border-border bg-background px-2 py-2.5 text-sm outline-none focus:border-primary"
                  >
                    <option>ASC</option>
                    <option>DESC</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={cn(labelCls, "flex items-center gap-2")}>
                  <input
                    type="checkbox"
                    checked={useLimit}
                    onChange={() => setUseLimit((v) => !v)}
                    className="h-4 w-4 accent-primary"
                  />
                  LIMIT
                </label>
                <input
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  disabled={!useLimit}
                  placeholder="100"
                  spellCheck={false}
                  inputMode="numeric"
                  className={cn(inputCls, "font-mono")}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col rounded-2xl border border-border bg-card p-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-bold">
              <Blocks className="h-4 w-4 text-primary" /> Generated SQL
            </p>
            <button
              type="button"
              onClick={copy}
              disabled={!trial.canUse}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="min-h-[280px] flex-1 overflow-auto whitespace-pre-wrap rounded-xl border border-border bg-background p-4 font-mono text-[13px] leading-relaxed">
            {sql}
          </pre>
          {!isPro && (
            <p className="mt-3 text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left. Runs in your browser, nothing is
              uploaded.
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            Numbers and true/false stay unquoted, everything else becomes a quoted string, and
            single quotes are escaped. JOINs, subqueries and aggregations are not part of this
            builder.
          </p>
        </div>
      </div>
    </ToolPageShell>
  );
}
