// /tools/sql-formatter - Format SQL with a lightweight tokenizer, in your browser.
// Clause newlines, indentation, comma handling, keyword casing, per-dialect
// keyword vocabulary. Nothing is uploaded.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Eraser, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/sql-formatter";
import toolSeoMeta from "@/lib/tool-seo-meta-data/sql-formatter";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/sql-formatter")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/sql-formatter";
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
  component: SqlFormatterTool,
});

const SAMPLE = `select u.id, u.name, count(o.id) as orders from users u left join orders o on o.user_id = u.id where u.active = 1 and u.created_at > '2024-01-01' group by u.id, u.name having count(o.id) > 2 order by orders desc limit 10;`;

type Dialect = "generic" | "mysql" | "postgres" | "sqlserver" | "sqlite";
type Casing = "upper" | "lower" | "preserve";

const BASE_KEYWORDS = [
  "SELECT", "DISTINCT", "FROM", "WHERE", "GROUP", "BY", "ORDER", "HAVING", "LIMIT", "OFFSET",
  "JOIN", "INNER", "LEFT", "RIGHT", "FULL", "OUTER", "CROSS", "ON", "USING", "AND", "OR", "NOT",
  "INSERT", "INTO", "VALUES", "UPDATE", "SET", "DELETE", "CREATE", "TABLE", "ALTER", "DROP",
  "AS", "ASC", "DESC", "UNION", "INTERSECT", "EXCEPT", "ALL", "CASE", "WHEN", "THEN", "ELSE",
  "END", "BETWEEN", "LIKE", "IN", "IS", "NULL", "EXISTS", "INTO", "TOP", "PRIMARY", "KEY",
  "FOREIGN", "REFERENCES", "CONSTRAINT", "INDEX", "VIEW", "PROCEDURE", "RETURNING", "WITH",
  "RECURSIVE", "OVER", "PARTITION", "ROWS", "RANGE", "UNBOUNDED", "PRECEDING", "FOLLOWING",
  "CURRENT", "ROW", "FETCH", "ONLY", "TIES", "WINDOW", "FILTER",
];

const DIALECT_EXTRA: Record<Dialect, string[]> = {
  generic: [],
  mysql: ["STRAIGHT_JOIN", "DUPLICATE", "IGNORE", "REPLACE", "USE", "FORCE", "SQL_CALC_FOUND_ROWS", "LOCK"],
  postgres: ["ILIKE", "CONFLICT", "DO", "NOTHING", "TABLESAMPLE", "LATERAL"],
  sqlserver: ["NOLOCK", "ROWLOCK", "UPDLOCK", "HOLDLOCK", "PIVOT", "UNPIVOT", "MERGE", "OUTPUT"],
  sqlite: ["AUTOINCREMENT", "GLOB", "VACUUM", "PRAGMA", "ABORT", "FAIL"],
};

interface Tok {
  t: "word" | "string" | "number" | "symbol" | "ws" | "comment";
  v: string;
}

function tokenize(sql: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  while (i < sql.length) {
    const c = sql[i] ?? "";
    if (c === "-" && sql[i + 1] === "-") {
      let j = i + 2;
      while (j < sql.length && sql[j] !== "\n") j++;
      toks.push({ t: "comment", v: sql.slice(i, j) });
      i = j;
    } else if (c === "/" && sql[i + 1] === "*") {
      let j = i + 2;
      while (j < sql.length && !(sql[j] === "*" && sql[j + 1] === "/")) j++;
      j = Math.min(sql.length, j + 2);
      toks.push({ t: "comment", v: sql.slice(i, j) });
      i = j;
    } else if (c === "'" || c === '"' || c === "`") {
      let j = i + 1;
      let out = c;
      while (j < sql.length) {
        if (sql[j] === c) {
          out += c;
          if (sql[j + 1] === c) {
            out += c;
            j += 2;
            continue;
          }
          j++;
          break;
        }
        if (c === "'" && sql[j] === "\\" && j + 1 < sql.length) {
          out += (sql[j] ?? "") + (sql[j + 1] ?? "");
          j += 2;
          continue;
        }
        out += sql[j];
        j++;
      }
      toks.push({ t: "string", v: out });
      i = j;
    } else if (/\s/.test(c)) {
      let j = i + 1;
      while (j < sql.length && /\s/.test(sql[j] ?? "")) j++;
      toks.push({ t: "ws", v: " " });
      i = j;
    } else if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(sql[i + 1] ?? ""))) {
      const m = sql.slice(i).match(/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?/);
      const v = m?.[0] ?? c;
      toks.push({ t: "number", v });
      i += v.length;
    } else if (/[A-Za-z_$]/.test(c)) {
      let j = i + 1;
      while (j < sql.length && /[A-Za-z0-9_$.]/.test(sql[j] ?? "")) j++;
      toks.push({ t: "word", v: sql.slice(i, j) });
      i = j;
    } else {
      const two = sql.slice(i, i + 2);
      if (["<=", ">=", "<>", "!=", "::", "||"].includes(two)) {
        toks.push({ t: "symbol", v: two });
        i += 2;
      } else {
        toks.push({ t: "symbol", v: c });
        i += 1;
      }
    }
  }
  return toks;
}

const CLAUSES = new Set([
  "SELECT", "FROM", "WHERE", "GROUP BY", "ORDER BY", "HAVING", "LIMIT", "OFFSET",
  "UNION", "INTERSECT", "EXCEPT", "VALUES", "SET", "RETURNING", "WINDOW",
]);
const JOIN_STARTS = new Set(["LEFT", "RIGHT", "FULL", "INNER", "OUTER", "CROSS", "STRAIGHT_JOIN"]);
const COMBINERS = new Set(["AND", "OR", "ON"]);

function isKeyword(word: string, kw: Set<string>): boolean {
  return kw.has(word.toUpperCase());
}

/** Combine multi-word clauses: GROUP BY, ORDER BY, INSERT INTO, DELETE FROM, LEFT JOIN, ... */
function combineWords(toks: Tok[], kw: Set<string>): Tok[] {
  const out: Tok[] = [];
  const sig = toks.filter((t) => t.t !== "ws");
  let k = 0;
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (!t) continue;
    if (t.t !== "word") {
      out.push(t);
      continue;
    }
    k = sig.indexOf(t, k);
    const n1 = sig[k + 1];
    const n1w = n1 && n1.t === "word" ? n1.v.toUpperCase() : "";
    const u = t.v.toUpperCase();
    let merged: string | null = null;
    if ((u === "GROUP" || u === "ORDER") && n1w === "BY") merged = `${u} BY`;
    else if (u === "INSERT" && n1w === "INTO") merged = "INSERT INTO";
    else if (u === "DELETE" && n1w === "FROM") merged = "DELETE FROM";
    else if (JOIN_STARTS.has(u) && n1w === "JOIN") merged = `${u} JOIN`;
    else if (u === "CREATE" && n1w === "TABLE") merged = "CREATE TABLE";
    if (merged && n1 && isKeyword(n1w, kw)) {
      out.push({ t: "word", v: merged });
      // skip the second word: mark via advancing past it in sig; easier: push ws-normalized
      const idx = toks.indexOf(n1, toks.indexOf(t));
      i = idx;
      k += 1;
    } else {
      out.push(t);
      k += 1;
    }
  }
  return out;
}

function formatSql(sql: string, dialect: Dialect, casing: Casing): string {
  const kw = new Set([...BASE_KEYWORDS, ...DIALECT_EXTRA[dialect]]);
  const raw = tokenize(sql).filter((t) => t.t !== "comment");
  const toks = combineWords(raw, kw);
  const sig = toks.filter((t) => t.t !== "ws");

  const caseKw = (w: string) =>
    casing === "upper" ? w.toUpperCase() : casing === "lower" ? w.toLowerCase() : w;

  let out = "";
  let indent = 0;
  let atLineStart = true;
  let inlineParen = 0; // depth of short inline parens

  const nl = (level: number) => {
    out = out.replace(/[ \t]+$/, "");
    out += `\n${"  ".repeat(level)}`;
    atLineStart = true;
  };
  const push = (s: string) => {
    if (atLineStart) {
      out += s;
      atLineStart = false;
    } else {
      out += s;
    }
  };
  const space = () => {
    if (!atLineStart && !/[ (\n]$/.test(out)) out += " ";
  };

  // Decide whether a paren group is short enough to stay inline.
  const parenEnd = (openIdx: number): number => {
    let depth = 0;
    let len = 0;
    for (let j = openIdx; j < sig.length && j < openIdx + 40; j++) {
      const t = sig[j];
      if (!t) continue;
      len += t.v.length + 1;
      if (t.t === "symbol" && t.v === "(") depth++;
      if (t.t === "symbol" && t.v === ")") {
        depth--;
        if (depth === 0) return len < 70 && !/[ \n]/.test("") ? j : -1;
      }
      if (t.t === "word" && isKeyword(t.v, kw) && CLAUSES.has(t.v.toUpperCase())) return -1;
      if (len > 70) return -1;
    }
    return -1;
  };

  let i = 0;
  for (const t of toks) {
    if (t.t === "ws") continue;
    if (t.t === "string" || t.t === "number") {
      if (inlineParen > 0) {
        push(t.v);
      } else {
        space();
        push(t.v);
      }
      i++;
      continue;
    }
    if (t.t === "word") {
      const u = t.v.toUpperCase();
      const isKw = isKeyword(t.v, kw);
      if (isKw && CLAUSES.has(u)) {
        nl(indent);
        push(caseKw(u));
        indent = indent; // clause at current level
        i++;
        continue;
      }
      if (isKw && u === "JOIN") {
        nl(indent);
        push(caseKw(u));
        i++;
        continue;
      }
      if (isKw && COMBINERS.has(u)) {
        nl(indent + 1);
        push(caseKw(u));
        i++;
        continue;
      }
      if (isKw && u === "CASE") {
        space();
        push(caseKw(u));
        indent += 1;
        i++;
        continue;
      }
      if (isKw && u === "END") {
        indent = Math.max(0, indent - 1);
        space();
        push(caseKw(u));
        i++;
        continue;
      }
      if (isKw && (u === "WHEN" || u === "THEN" || u === "ELSE")) {
        nl(indent);
        push(caseKw(u));
        i++;
        continue;
      }
      // regular word or non-clause keyword
      if (inlineParen > 0) {
        // inside short parens: space before unless first
        const prev = sig[i - 1];
        if (prev && !(prev.t === "symbol" && (prev.v === "(" || prev.v === ","))) space();
        push(isKw ? caseKw(u) : t.v);
      } else {
        const prev = sig[i - 1];
        const noSpaceBefore =
          prev &&
          ((prev.t === "symbol" && (prev.v === "." || prev.v === "(")) ||
            (prev.t === "word" && isKeyword(prev.v, kw) && (prev.v.toUpperCase() === "CASE" || prev.v.toUpperCase() === "WHEN")));
        if (!noSpaceBefore) space();
        push(isKw ? caseKw(u) : t.v);
      }
      i++;
      continue;
    }
    // symbols
    if (t.v === "(") {
      const end = inlineParen === 0 ? parenEnd(i) : -1;
      if (end !== -1) {
        // short group: keep inline
        space();
        push("(");
        inlineParen++;
        i++;
        continue;
      }
      if (inlineParen > 0) {
        push("(");
        inlineParen++;
        i++;
        continue;
      }
      push("(");
      indent += 1;
      nl(indent);
      i++;
      continue;
    }
    if (t.v === ")") {
      if (inlineParen > 0) {
        inlineParen--;
        push(")");
        i++;
        continue;
      }
      indent = Math.max(0, indent - 1);
      nl(indent);
      push(")");
      i++;
      continue;
    }
    if (t.v === ",") {
      push(",");
      if (inlineParen > 0) {
        push(" ");
      } else {
        nl(indent + 1);
      }
      i++;
      continue;
    }
    if (t.v === ";") {
      push(";");
      nl(0);
      i++;
      continue;
    }
    if (t.v === ".") {
      push(".");
      i++;
      continue;
    }
    if (inlineParen > 0) {
      push(t.v);
    } else {
      space();
      push(t.v);
    }
    i++;
  }
  return out.replace(/[ \t]+\n/g, "\n").trim() + (sql.trim().endsWith(";") ? "" : "");
}

const DIALECTS: { id: Dialect; label: string }[] = [
  { id: "generic", label: "Generic" },
  { id: "mysql", label: "MySQL" },
  { id: "postgres", label: "PostgreSQL" },
  { id: "sqlserver", label: "SQL Server" },
  { id: "sqlite", label: "SQLite" },
];

const inputCls =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary";
const labelCls = "mb-1.5 block text-[13px] font-medium text-foreground/80";

function SqlFormatterTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("sql-formatter", isPro);
  const seo = toolSeo;

  const [input, setInput] = useState("");
  const [dialect, setDialect] = useState<Dialect>("generic");
  const [casing, setCasing] = useState<Casing>("upper");
  const [output, setOutput] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const format = () => {
    if (!trial.canUse || !input.trim()) return;
    setOutput(formatSql(input, dialect, casing));
    trial.recordUse();
    toast.success("SQL formatted");
  };

  const copy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  return (
    <ToolPageShell toolId="sql-formatter" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="SQL Formatter" left={trial.left} />

      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold">SQL input</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setInput(SAMPLE); setOutput(null); }}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50"
              >
                Load sample
              </button>
              <button
                type="button"
                onClick={() => { setInput(""); setOutput(null); }}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50"
              >
                <Eraser className="h-3.5 w-3.5" /> Clear
              </button>
            </div>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste your SQL query…"
            spellCheck={false}
            rows={10}
            className="w-full resize-y rounded-xl border border-border bg-background p-4 font-mono text-[13px] leading-relaxed outline-none focus:border-primary"
          />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls} htmlFor="sqlf-dialect">Dialect</label>
              <select
                id="sqlf-dialect"
                value={dialect}
                onChange={(e) => setDialect(e.target.value as Dialect)}
                className={inputCls}
              >
                {DIALECTS.map((d) => (
                  <option key={d.id} value={d.id}>{d.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="sqlf-casing">Keyword casing</label>
              <select
                id="sqlf-casing"
                value={casing}
                onChange={(e) => setCasing(e.target.value as Casing)}
                className={inputCls}
              >
                <option value="upper">UPPERCASE</option>
                <option value="lower">lowercase</option>
                <option value="preserve">Preserve</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <ActionButton busy={false} disabled={!trial.canUse || !input.trim()} onClick={format}>
              <Wand2 className="h-4 w-4" /> Format
            </ActionButton>
            {!isPro && (
              <p className="text-xs text-muted-foreground">
                {trial.left} of {TOOL_TRIAL_LIMIT} free formats left. Runs in your browser, nothing
                is uploaded.
              </p>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Lightweight tokenizer-based formatter: clause newlines, indentation, comma-per-line and
            inline short parentheses. The dialect adds a few extra keywords to the formatter's
            vocabulary; formatting rules stay the same. Very exotic dialect syntax may not format
            perfectly.
          </p>
        </div>

        {output !== null && (
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold">Formatted SQL</p>
              <button
                type="button"
                onClick={copy}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="max-h-[420px] overflow-auto whitespace-pre rounded-xl border border-border bg-background p-4 font-mono text-[13px] leading-relaxed">
              {output}
            </pre>
          </div>
        )}
      </div>
    </ToolPageShell>
  );
}
