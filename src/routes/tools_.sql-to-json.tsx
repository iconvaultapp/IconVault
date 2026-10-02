// /tools/sql-to-json - Turn SQL INSERT statements into a JSON array.
// Handles quoted strings ('' and \' escapes), NULL, numbers and booleans.
// Runs fully in your browser, nothing is uploaded.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Check, Copy, Download, Eraser } from "lucide-react";
import { toast } from "sonner";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/sql-to-json")({
  head: () => {
    const seo = getToolSeoMeta("sql-to-json");
    const canonical = "https://iconvault.site/tools/sql-to-json";
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
  component: SqlToJsonTool,
});

const SAMPLE = `INSERT INTO users (id, name, email, active, created_at) VALUES
(1, 'Ada Lovelace', 'ada@example.com', TRUE, '2024-01-15'),
(2, 'Alan Turing', 'alan@example.com', TRUE, NULL),
(3, 'Grace Hopper', 'grace@example.com', FALSE, '2024-02-20');`;

interface Parsed {
  table: string;
  columns: string[];
  rows: Record<string, unknown>[];
}

function unquoteIdent(s: string): string {
  const t = s.trim();
  if ((t.startsWith("`") && t.endsWith("`")) || (t.startsWith('"') && t.endsWith('"')) || (t.startsWith("[") && t.endsWith("]"))) {
    return t.slice(1, -1);
  }
  return t;
}

/** Split a string on commas that are at paren depth 0 and outside quotes. */
function splitTopLevel(s: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let cur = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quote) {
      cur += c;
      if (c === "\\" && i + 1 < s.length) {
        cur += s[i + 1];
        i++;
      } else if (c === quote) {
        if (s[i + 1] === quote && quote === "'") {
          cur += quote;
          i++;
        } else {
          quote = null;
        }
      }
    } else if (c === "'" || c === '"') {
      quote = c;
      cur += c;
    } else if (c === "(") {
      depth++;
      cur += c;
    } else if (c === ")") {
      depth--;
      cur += c;
    } else if (c === "," && depth === 0) {
      parts.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  if (cur.trim() !== "" || parts.length > 0) parts.push(cur);
  return parts;
}

/** Split SQL text into statements on semicolons outside quotes/parens. */
function splitStatements(sql: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let cur = "";
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    if (quote) {
      cur += c;
      if (c === "\\" && i + 1 < sql.length) {
        cur += sql[i + 1];
        i++;
      } else if (c === quote) {
        if (sql[i + 1] === quote && quote === "'") {
          cur += quote;
          i++;
        } else {
          quote = null;
        }
      }
    } else if (c === "'" || c === '"') {
      quote = c;
      cur += c;
    } else if (c === "(") {
      depth++;
      cur += c;
    } else if (c === ")") {
      depth--;
      cur += c;
    } else if (c === ";" && depth === 0) {
      parts.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  if (cur.trim() !== "") parts.push(cur);
  return parts;
}

function parseValue(raw: string): unknown {
  const t = raw.trim();
  if (/^null$/i.test(t)) return null;
  if (/^(true|false)$/i.test(t)) return t.toLowerCase() === "true";
  if (/^[+-]?(\d+(\.\d+)?|\.\d+)([eE][+-]?\d+)?$/.test(t)) return Number(t);
  if (t.startsWith("'") && t.endsWith("'") && t.length >= 2) {
    let inner = t.slice(1, -1);
    inner = inner.replace(/''/g, "'");
    inner = inner.replace(/\\'/g, "'").replace(/\\n/g, "\n").replace(/\\t/g, "\t").replace(/\\\\/g, "\\");
    return inner;
  }
  if (t.startsWith('"') && t.endsWith('"') && t.length >= 2) return t.slice(1, -1);
  return t;
}

function parseInsert(stmt: string): Parsed | null {
  const m = stmt.match(/INSERT\s+INTO\s+([\w`"[\].]+)/i);
  if (!m) return null;
  const table = unquoteIdent(m[1] ?? "");
  const afterTable = stmt.slice(m.index! + m[0].length);
  const valuesIdx = afterTable.search(/\bVALUES\b/i);
  if (valuesIdx === -1) return null;
  const headPart = afterTable.slice(0, valuesIdx).trim();
  let columns: string[] = [];
  if (headPart.startsWith("(") && headPart.endsWith(")")) {
    columns = splitTopLevel(headPart.slice(1, -1)).map((c) => unquoteIdent(c));
  }
  const valuesPart = afterTable.slice(valuesIdx + 6).trim();
  // Extract top-level (...) tuples
  const tuples: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let cur = "";
  for (let i = 0; i < valuesPart.length; i++) {
    const c = valuesPart[i];
    if (quote) {
      cur += c;
      if (c === "\\" && i + 1 < valuesPart.length) {
        cur += valuesPart[i + 1];
        i++;
      } else if (c === quote) {
        if (valuesPart[i + 1] === quote && quote === "'") {
          cur += quote;
          i++;
        } else {
          quote = null;
        }
      }
    } else if (c === "'" || c === '"') {
      quote = c;
      cur += c;
    } else if (c === "(") {
      if (depth === 0) cur = "";
      else cur += c;
      depth++;
    } else if (c === ")") {
      depth--;
      if (depth === 0) tuples.push(cur);
      else cur += c;
    } else {
      cur += c;
    }
  }
  const rows = tuples.map((tup) => {
    const vals = splitTopLevel(tup).map(parseValue);
    if (columns.length === 0) columns = vals.map((_, i) => `col${i + 1}`);
    const obj: Record<string, unknown> = {};
    vals.forEach((v, i) => {
      obj[columns[i] ?? `col${i + 1}`] = v;
    });
    return obj;
  });
  return { table, columns, rows };
}

function SqlToJsonTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("sql-to-json", isPro);
  const seo = getToolSeo("sql-to-json");

  const [input, setInput] = useState("");
  const [parsed, setParsed] = useState<Parsed[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const convert = () => {
    if (!trial.canUse || !input.trim()) return;
    setError(null);
    try {
      const stmts = splitStatements(input).map((s) => s.trim()).filter(Boolean);
      const out: Parsed[] = [];
      for (const s of stmts) {
        const p = parseInsert(s);
        if (!p) throw new Error("Could not parse a statement. Only INSERT INTO ... VALUES (...) statements are supported.");
        out.push(p);
      }
      if (out.length === 0) throw new Error("No INSERT statements found.");
      setParsed(out);
      trial.recordUse();
      const total = out.reduce((a, p) => a + p.rows.length, 0);
      toast.success(`Converted ${total} row${total === 1 ? "" : "s"} to JSON`);
    } catch (e) {
      setParsed(null);
      setError(e instanceof Error ? e.message : "Could not parse the SQL.");
    }
  };

  const jsonText = parsed ? JSON.stringify(parsed.length === 1 && parsed[0] ? parsed[0].rows : parsed, null, 2) : "";

  const copy = async () => {
    if (!jsonText) return;
    try {
      await navigator.clipboard.writeText(jsonText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  const download = () => {
    if (!jsonText || !parsed) return;
    const name = parsed.length === 1 && parsed[0] ? `${parsed[0].table}.json` : "inserts.json";
    downloadBlob(new Blob([jsonText], { type: "application/json" }), name);
  };

  return (
    <ToolPageShell toolId="sql-to-json" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="SQL to JSON" left={trial.left} />

      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold">SQL INSERT statements</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setInput(SAMPLE); setParsed(null); setError(null); }}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50"
              >
                Load sample
              </button>
              <button
                type="button"
                onClick={() => { setInput(""); setParsed(null); setError(null); }}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50"
              >
                <Eraser className="h-3.5 w-3.5" /> Clear
              </button>
            </div>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste INSERT INTO … VALUES (…), (…) statements…"
            spellCheck={false}
            rows={11}
            className="w-full resize-y rounded-xl border border-border bg-background p-4 font-mono text-[13px] leading-relaxed outline-none focus:border-primary"
          />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <ActionButton busy={false} disabled={!trial.canUse || !input.trim()} onClick={convert}>
              <ArrowRight className="h-4 w-4" /> Convert to JSON
            </ActionButton>
            {!isPro && (
              <p className="text-xs text-muted-foreground">
                {trial.left} of {TOOL_TRIAL_LIMIT} free conversions left. Runs in your browser,
                nothing is uploaded.
              </p>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Handles quoted strings ('' and \' escapes), NULL, numbers and booleans. Only
            INSERT INTO … VALUES (…) statements are parsed; other statements are skipped with an
            error.
          </p>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-5">
            <p className="text-sm font-medium text-red-500">{error}</p>
          </div>
        )}

        {parsed !== null && !error && (
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold">
                JSON output{" "}
                <span className="text-xs font-medium text-muted-foreground">
                  {parsed.reduce((a, p) => a + p.rows.length, 0)} rows from{" "}
                  {parsed.map((p) => p.table).join(", ")}
                </span>
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={copy}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <button
                  type="button"
                  onClick={download}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50"
                >
                  <Download className="h-3.5 w-3.5" /> .json
                </button>
              </div>
            </div>
            <pre className="max-h-[420px] overflow-auto whitespace-pre rounded-xl border border-border bg-background p-4 font-mono text-[13px] leading-relaxed">
              {jsonText}
            </pre>
          </div>
        )}
      </div>
    </ToolPageShell>
  );
}
