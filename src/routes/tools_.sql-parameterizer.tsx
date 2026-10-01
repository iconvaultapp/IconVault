// /tools/sql-parameterizer - Replace inline SQL literals with placeholders.
// Styles: ?, $1, :p1, @p1. Outputs parameterized SQL plus an ordered parameter
// list with original values. Runs fully in your browser, nothing is uploaded.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Eraser, Zap } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/sql-parameterizer")({
  head: () => {
    const seo = getToolSeoMeta("sql-parameterizer");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: SqlParameterizerTool,
});

const SAMPLE = `SELECT id, name FROM users WHERE email = 'ada@example.com' AND active = 1 AND created_at > '2024-01-01' AND score >= 9.5 ORDER BY name LIMIT 25;`;

type Style = "question" | "dollar" | "colon" | "at";

const STYLES: { id: Style; label: string }[] = [
  { id: "question", label: "?  (MySQL, SQLite, JDBC)" },
  { id: "dollar", label: "$1, $2  (PostgreSQL)" },
  { id: "colon", label: ":p1, :p2  (Oracle-style named)" },
  { id: "at", label: "@p1, @p2  (SQL Server)" },
];

interface Param {
  placeholder: string;
  value: string;
  type: "string" | "number";
}

function placeholderFor(style: Style, n: number): string {
  switch (style) {
    case "question":
      return "?";
    case "dollar":
      return `$${n}`;
    case "colon":
      return `:p${n}`;
    case "at":
      return `@p${n}`;
  }
}

function parameterize(sql: string, style: Style): { sql: string; params: Param[] } {
  const params: Param[] = [];
  let out = "";
  let i = 0;
  let n = 0;
  const addParam = (value: string, type: "string" | "number") => {
    n += 1;
    const ph = placeholderFor(style, n);
    params.push({ placeholder: ph, value, type });
    return ph;
  };
  while (i < sql.length) {
    const c = sql[i] ?? "";
    // line comment
    if (c === "-" && sql[i + 1] === "-") {
      let j = i + 2;
      while (j < sql.length && sql[j] !== "\n") j++;
      out += sql.slice(i, j);
      i = j;
      continue;
    }
    // block comment
    if (c === "/" && sql[i + 1] === "*") {
      let j = i + 2;
      while (j < sql.length && !(sql[j] === "*" && sql[j + 1] === "/")) j++;
      j = Math.min(sql.length, j + 2);
      out += sql.slice(i, j);
      i = j;
      continue;
    }
    // string literal
    if (c === "'") {
      let j = i + 1;
      let val = "";
      while (j < sql.length) {
        if (sql[j] === "'") {
          if (sql[j + 1] === "'") {
            val += "'";
            j += 2;
            continue;
          }
          j++;
          break;
        }
        if (sql[j] === "\\" && j + 1 < sql.length) {
          val += sql[j + 1];
          j += 2;
          continue;
        }
        val += sql[j];
        j++;
      }
      out += addParam(val, "string");
      i = j;
      continue;
    }
    // double-quoted: treat as identifier, leave alone
    if (c === '"') {
      let j = i + 1;
      while (j < sql.length && sql[j] !== '"') j++;
      out += sql.slice(i, Math.min(sql.length, j + 1));
      i = Math.min(sql.length, j + 1);
      continue;
    }
    // backtick identifier
    if (c === "`") {
      let j = i + 1;
      while (j < sql.length && sql[j] !== "`") j++;
      out += sql.slice(i, Math.min(sql.length, j + 1));
      i = Math.min(sql.length, j + 1);
      continue;
    }
    // number literal (not part of an identifier, not a placeholder already)
    const prev = sql[i - 1] ?? "";
    if (
      /[0-9]/.test(c) &&
      !/[A-Za-z0-9_$.]/.test(prev) &&
      prev !== "?" &&
      prev !== "$" &&
      prev !== ":" &&
      prev !== "@"
    ) {
      const m = sql.slice(i).match(/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?/);
      if (m) {
        out += addParam(m[0], "number");
        i += m[0].length;
        continue;
      }
    }
    out += c;
    i++;
  }
  return { sql: out, params };
}

function SqlParameterizerTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("sql-parameterizer", isPro);
  const seo = getToolSeo("sql-parameterizer");

  const [input, setInput] = useState("");
  const [style, setStyle] = useState<Style>("question");
  const [result, setResult] = useState<{ sql: string; params: Param[] } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedParams, setCopiedParams] = useState(false);

  const run = () => {
    if (!trial.canUse || !input.trim()) return;
    setResult(parameterize(input, style));
    trial.recordUse();
    toast.success("SQL parameterized");
  };

  const copyText = async (
    text: string,
    setCopied: (v: boolean) => void,
  ) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  const paramsText = result
    ? result.params.map((p) => `${p.placeholder} = ${p.type === "string" ? `'${p.value.replace(/'/g, "''")}'` : p.value}`).join("\n")
    : "";

  return (
    <ToolPageShell toolId="sql-parameterizer" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="SQL Parameterizer" left={trial.left} />

      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold">SQL with inline literals</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setInput(SAMPLE); setResult(null); }}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50"
              >
                Load sample
              </button>
              <button
                type="button"
                onClick={() => { setInput(""); setResult(null); }}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50"
              >
                <Eraser className="h-3.5 w-3.5" /> Clear
              </button>
            </div>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste SQL with inline values…"
            spellCheck={false}
            rows={9}
            className="w-full resize-y rounded-xl border border-border bg-background p-4 font-mono text-[13px] leading-relaxed outline-none focus:border-primary"
          />
          <div className="mt-4 grid gap-4 sm:grid-cols-[280px_1fr]">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80" htmlFor="sqlp-style">
                Placeholder style
              </label>
              <select
                id="sqlp-style"
                value={style}
                onChange={(e) => setStyle(e.target.value as Style)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              >
                {STYLES.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <ActionButton busy={false} disabled={!trial.canUse || !input.trim()} onClick={run}>
                <Zap className="h-4 w-4" /> Parameterize
              </ActionButton>
            </div>
          </div>
          {!isPro && (
            <p className="mt-3 text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free runs left. Runs in your browser, nothing is
              uploaded.
            </p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            Single-quoted strings and standalone numbers become placeholders. NULL, TRUE/FALSE,
            identifiers, comments and existing placeholders are left untouched.
          </p>
        </div>

        {result && (
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-bold">Parameterized SQL</p>
                <button
                  type="button"
                  onClick={() => copyText(result.sql, setCopiedSql)}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50"
                >
                  {copiedSql ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedSql ? "Copied" : "Copy SQL"}
                </button>
              </div>
              <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap rounded-xl border border-border bg-background p-4 font-mono text-[13px] leading-relaxed">
                {result.sql}
              </pre>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-bold">
                  Parameters{" "}
                  <span className="text-xs font-medium text-muted-foreground">
                    ({result.params.length} in order)
                  </span>
                </p>
                <button
                  type="button"
                  onClick={() => copyText(paramsText, setCopiedParams)}
                  disabled={result.params.length === 0}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {copiedParams ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedParams ? "Copied" : "Copy params"}
                </button>
              </div>
              {result.params.length === 0 ? (
                <p className="text-sm text-muted-foreground">No literals found to parameterize.</p>
              ) : (
                <div className="max-h-[360px] space-y-2 overflow-auto">
                  {result.params.map((p, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3"
                    >
                      <span className="shrink-0 rounded-lg bg-primary/10 px-2.5 py-1 font-mono text-xs font-bold text-primary">
                        {p.placeholder}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-mono text-[13px]">
                        {p.type === "string" ? `'${p.value}'` : p.value}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">{p.type}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ToolPageShell>
  );
}
