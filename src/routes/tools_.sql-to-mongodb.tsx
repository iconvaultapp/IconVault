// /tools/sql-to-mongodb - Convert SELECT queries to MongoDB find() or an
// aggregate pipeline. Supported subset: SELECT columns, FROM, WHERE with
// AND/OR and parentheses, =, !=, <>, >, <, >=, <=, LIKE, IN, BETWEEN, IS NULL /
// IS NOT NULL, ORDER BY, LIMIT, OFFSET. JOINs, subqueries and GROUP BY
// aggregations are not supported. Runs fully in your browser.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, Check, Copy, Database, Eraser } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/sql-to-mongodb";
import toolSeoMeta from "@/lib/tool-seo-meta-data/sql-to-mongodb";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/sql-to-mongodb")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/sql-to-mongodb";
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
  component: SqlToMongoTool,
});

const SAMPLE = `SELECT id, name, price FROM products WHERE category = 'books' AND (price < 20 OR in_stock = TRUE) AND published_at IS NOT NULL ORDER BY price DESC LIMIT 10;`;

interface Tok {
  t: "word" | "string" | "number" | "symbol";
  v: string;
}

function tokenize(sql: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  while (i < sql.length) {
    const c = sql[i] ?? "";
    if (c === "'" || c === '"') {
      let j = i + 1;
      let out = "";
      while (j < sql.length) {
        if (sql[j] === c) {
          if (sql[j + 1] === c && c === "'") {
            out += "'";
            j += 2;
            continue;
          }
          j++;
          break;
        }
        if (c === "'" && sql[j] === "\\" && j + 1 < sql.length) {
          out += sql[j + 1];
          j += 2;
          continue;
        }
        out += sql[j];
        j++;
      }
      toks.push({ t: "string", v: out });
      i = j;
    } else if (/\s/.test(c)) {
      i++;
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
      if (["<=", ">=", "<>", "!="].includes(two)) {
        toks.push({ t: "symbol", v: two });
        i += 2;
      } else {
        toks.push({ t: "symbol", v: c });
        i += 1;
      }
    }
  }
  return toks.filter((t) => !(t.t === "symbol" && t.v === ";"));
}

type Cond =
  | { kind: "and" | "or"; items: Cond[] }
  | { kind: "not"; item: Cond }
  | { kind: "cmp"; col: string; op: string; value: unknown }
  | { kind: "in"; col: string; values: unknown[]; neg: boolean }
  | { kind: "between"; col: string; a: unknown; b: unknown }
  | { kind: "null"; col: string; neg: boolean }
  | { kind: "like"; col: string; pattern: string; neg: boolean };

interface Query {
  columns: string[] | null; // null = *
  table: string;
  where: Cond | null;
  orderBy: { col: string; dir: 1 | -1 }[];
  limit: number | null;
  offset: number | null;
}

class Parser {
  private pos = 0;
  constructor(private toks: Tok[]) {}

  peek(): Tok | null {
    return this.toks[this.pos] ?? null;
  }
  next(): Tok {
    const t = this.toks[this.pos];
    if (!t) throw new Error("Unexpected end of query.");
    this.pos++;
    return t;
  }
  expectWord(w: string): void {
    const t = this.next();
    if (t.t !== "word" || t.v.toUpperCase() !== w) throw new Error(`Expected ${w} but found "${t.v}".`);
  }
  peekWord(): string | null {
    const t = this.peek();
    return t && t.t === "word" ? t.v.toUpperCase() : null;
  }

  parseQuery(): Query {
    this.expectWord("SELECT");
    // DISTINCT ignored
    if (this.peekWord() === "DISTINCT") this.next();
    const columns: string[] = [];
    for (;;) {
      const t = this.next();
      if (t.t === "symbol" && t.v === "*") {
        columns.push("*");
      } else if (t.t === "word") {
        let col = t.v;
        // alias: AS x or bare x
        const pw = this.peekWord();
        if (pw === "AS") {
          this.next();
          this.next(); // alias name
        } else {
          const pn = this.peek();
          if (pn && pn.t === "word" && !["FROM", "WHERE", "ORDER", "GROUP", "LIMIT", "OFFSET", "HAVING"].includes(pn.v.toUpperCase())) {
            this.next(); // bare alias
          }
        }
        columns.push(col);
      } else {
        throw new Error(`Unexpected "${t.v}" in the SELECT list. Only plain columns are supported.`);
      }
      const n = this.peek();
      if (n && n.t === "symbol" && n.v === ",") {
        this.next();
        continue;
      }
      break;
    }
    this.expectWord("FROM");
    const table = this.next().v;
    // optional alias
    if (this.peekWord() === "AS") {
      this.next();
      this.next();
    }
    // detect JOIN early for a clear error
    if (this.peekWord() === "JOIN" || ["LEFT", "RIGHT", "INNER", "FULL", "CROSS"].includes(this.peekWord() ?? "")) {
      throw new Error("JOINs are not supported by this converter.");
    }
    let where: Cond | null = null;
    if (this.peekWord() === "WHERE") {
      this.next();
      where = this.parseOr();
    }
    if (this.peekWord() === "GROUP") throw new Error("GROUP BY aggregations are not supported by this converter.");
    const orderBy: { col: string; dir: 1 | -1 }[] = [];
    if (this.peekWord() === "ORDER") {
      this.next();
      this.expectWord("BY");
      for (;;) {
        const col = this.next().v;
        let dir: 1 | -1 = 1;
        const pw = this.peekWord();
        if (pw === "ASC") {
          this.next();
        } else if (pw === "DESC") {
          this.next();
          dir = -1;
        }
        orderBy.push({ col, dir });
        const n = this.peek();
        if (n && n.t === "symbol" && n.v === ",") {
          this.next();
          continue;
        }
        break;
      }
    }
    let limit: number | null = null;
    let offset: number | null = null;
    if (this.peekWord() === "LIMIT") {
      this.next();
      const t = this.next();
      limit = parseInt(t.v, 10);
      if (isNaN(limit)) throw new Error("LIMIT must be a number.");
    }
    if (this.peekWord() === "OFFSET") {
      this.next();
      const t = this.next();
      offset = parseInt(t.v, 10);
      if (isNaN(offset)) throw new Error("OFFSET must be a number.");
    }
    return {
      columns: columns.length === 1 && columns[0] === "*" ? null : columns,
      table,
      where,
      orderBy,
      limit,
      offset,
    };
  }

  private literal(t: Tok): unknown {
    if (t.t === "string") return t.v;
    if (t.t === "number") return Number(t.v);
    if (t.t === "word") {
      const u = t.v.toUpperCase();
      if (u === "NULL") return null;
      if (u === "TRUE") return true;
      if (u === "FALSE") return false;
      throw new Error(`Unexpected value "${t.v}".`);
    }
    throw new Error(`Unexpected value "${t.v}".`);
  }

  private parseOr(): Cond {
    let left = this.parseAnd();
    while (this.peekWord() === "OR") {
      this.next();
      const right = this.parseAnd();
      left = left.kind === "or" ? { kind: "or", items: [...left.items, right] } : { kind: "or", items: [left, right] };
    }
    return left;
  }

  private parseAnd(): Cond {
    let left = this.parseFactor();
    while (this.peekWord() === "AND") {
      this.next();
      const right = this.parseFactor();
      left = left.kind === "and" ? { kind: "and", items: [...left.items, right] } : { kind: "and", items: [left, right] };
    }
    return left;
  }

  private parseFactor(): Cond {
    if (this.peekWord() === "NOT") {
      this.next();
      const p = this.peek();
      if (p && p.t === "symbol" && p.v === "(") {
        this.next();
        const inner = this.parseOr();
        const close = this.next();
        if (close.t !== "symbol" || close.v !== ")") throw new Error('Expected ")".');
        return { kind: "not", item: inner };
      }
      const item = this.parseFactor();
      return { kind: "not", item };
    }
    const p = this.peek();
    if (p && p.t === "symbol" && p.v === "(") {
      this.next();
      const inner = this.parseOr();
      const close = this.next();
      if (close.t !== "symbol" || close.v !== ")") throw new Error('Expected ")".');
      return inner;
    }
    const colTok = this.next();
    if (colTok.t !== "word") throw new Error(`Expected a column name but found "${colTok.v}".`);
    const col = colTok.v;
    let neg = false;
    if (this.peekWord() === "NOT") {
      this.next();
      neg = true;
    }
    const opTok = this.next();
    const op = opTok.v.toUpperCase();
    if (op === "IS") {
      if (this.peekWord() === "NOT") {
        this.next();
        neg = true;
      }
      this.expectWord("NULL");
      return { kind: "null", col, neg };
    }
    if (op === "IN") {
      const open = this.next();
      if (open.t !== "symbol" || open.v !== "(") throw new Error("Expected ( after IN.");
      const values: unknown[] = [];
      for (;;) {
        values.push(this.literal(this.next()));
        const n = this.next();
        if (n.t === "symbol" && n.v === ")") break;
        if (n.t !== "symbol" || n.v !== ",") throw new Error("Expected , or ) in IN list.");
      }
      return { kind: "in", col, values, neg };
    }
    if (op === "BETWEEN") {
      const a = this.literal(this.next());
      this.expectWord("AND");
      const b = this.literal(this.next());
      return { kind: "between", col, a, b };
    }
    if (op === "LIKE") {
      const pat = this.literal(this.next());
      if (typeof pat !== "string") throw new Error("LIKE needs a string pattern.");
      return { kind: "like", col, pattern: pat, neg };
    }
    if (["=", "!=", "<>", ">", "<", ">=", "<="].includes(op)) {
      const value = this.literal(this.next());
      return { kind: "cmp", col, op, value };
    }
    throw new Error(`Unsupported operator "${opTok.v}".`);
  }
}

function likeToRegex(pattern: string): string {
  let out = "";
  for (const c of pattern) {
    if (c === "%") out += ".*";
    else if (c === "_") out += ".";
    else out += c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  return `^${out}$`;
}

function condToMongo(c: Cond): Record<string, unknown> {
  switch (c.kind) {
    case "and":
      return { $and: c.items.map(condToMongo) };
    case "or":
      return { $or: c.items.map(condToMongo) };
    case "not":
      return { $nor: [condToMongo(c.item)] };
    case "cmp": {
      const opMap: Record<string, string> = {
        "=": "$eq", "!=": "$ne", "<>": "$ne", ">": "$gt", "<": "$lt", ">=": "$gte", "<=": "$lte",
      };
      const m = opMap[c.op] ?? "$eq";
      if (m === "$eq") return { [c.col]: c.value };
      return { [c.col]: { [m]: c.value } };
    }
    case "in":
      return c.neg ? { [c.col]: { $nin: c.values } } : { [c.col]: { $in: c.values } };
    case "between":
      return { [c.col]: { $gte: c.a, $lte: c.b } };
    case "null":
      return c.neg ? { [c.col]: { $ne: null } } : { [c.col]: null };
    case "like": {
      const rx = { $regex: likeToRegex(c.pattern) };
      return c.neg ? { [c.col]: { $not: rx } } : { [c.col]: rx };
    }
  }
}

function simplifyFilter(f: Record<string, unknown>): Record<string, unknown> {
  // flatten single-item $and at the top level for cleaner output
  if (Object.keys(f).length === 1 && "$and" in f && Array.isArray(f["$and"]) && f["$and"].length === 1) {
    return f["$and"][0] as Record<string, unknown>;
  }
  return f;
}

function buildFind(q: Query): string {
  const filter = q.where ? simplifyFilter(condToMongo(q.where)) : {};
  const filterJson = JSON.stringify(filter, null, 2);
  const parts: string[] = [];
  if (q.columns) {
    const proj: Record<string, number> = {};
    q.columns.forEach((c) => {
      proj[c] = 1;
    });
    parts.push(JSON.stringify(proj, null, 2));
  }
  let out = `db.${q.table}.find(${filterJson}${parts.length ? `,\n${parts[0]}` : ""})`;
  if (q.orderBy.length > 0) {
    const sort: Record<string, number> = {};
    q.orderBy.forEach((o) => {
      sort[o.col] = o.dir;
    });
    out += `.sort(${JSON.stringify(sort)})`;
  }
  if (q.offset !== null) out += `.skip(${q.offset})`;
  if (q.limit !== null) out += `.limit(${q.limit})`;
  return out + ";";
}

function buildAggregate(q: Query): string {
  const stages: unknown[] = [];
  if (q.where) stages.push({ $match: simplifyFilter(condToMongo(q.where)) });
  if (q.columns) {
    const proj: Record<string, number> = {};
    q.columns.forEach((c) => {
      proj[c] = 1;
    });
    stages.push({ $project: proj });
  }
  if (q.orderBy.length > 0) {
    const sort: Record<string, number> = {};
    q.orderBy.forEach((o) => {
      sort[o.col] = o.dir;
    });
    stages.push({ $sort: sort });
  }
  if (q.offset !== null) stages.push({ $skip: q.offset });
  if (q.limit !== null) stages.push({ $limit: q.limit });
  return `db.${q.table}.aggregate(${JSON.stringify(stages, null, 2)});`;
}

function SqlToMongoTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("sql-to-mongodb", isPro);
  const seo = toolSeo;

  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"find" | "aggregate">("find");
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const convert = () => {
    if (!trial.canUse || !input.trim()) return;
    setError(null);
    try {
      const q = new Parser(tokenize(input)).parseQuery();
      setOutput(mode === "find" ? buildFind(q) : buildAggregate(q));
      trial.recordUse();
      toast.success("Converted to MongoDB");
    } catch (e) {
      setOutput(null);
      setError(e instanceof Error ? e.message : "Could not parse the SQL.");
    }
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
    <ToolPageShell toolId="sql-to-mongodb" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="SQL to MongoDB" left={trial.left} />

      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-sm text-foreground/90">
            <span className="font-bold">Supported subset.</span> SELECT columns, FROM, WHERE with
            AND/OR and parentheses, =, !=, &lt;&gt;, &gt;, &lt;, &gt;=, &lt;=, LIKE, IN, BETWEEN,
            IS NULL / IS NOT NULL, ORDER BY, LIMIT, OFFSET. Not supported: JOINs, subqueries,
            GROUP BY aggregations, or expressions in the SELECT list.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold">SQL SELECT query</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setInput(SAMPLE); setOutput(null); setError(null); }}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50"
              >
                Load sample
              </button>
              <button
                type="button"
                onClick={() => { setInput(""); setOutput(null); setError(null); }}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50"
              >
                <Eraser className="h-3.5 w-3.5" /> Clear
              </button>
            </div>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste a SELECT query…"
            spellCheck={false}
            rows={8}
            className="w-full resize-y rounded-xl border border-border bg-background p-4 font-mono text-[13px] leading-relaxed outline-none focus:border-primary"
          />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex rounded-xl border border-border p-1">
              {(["find", "aggregate"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn(
                    "rounded-lg px-4 py-2 text-sm font-bold transition",
                    mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {m === "find" ? "find()" : "aggregate()"}
                </button>
              ))}
            </div>
            <ActionButton busy={false} disabled={!trial.canUse || !input.trim()} onClick={convert}>
              <ArrowRight className="h-4 w-4" /> Convert
            </ActionButton>
            {!isPro && (
              <p className="text-xs text-muted-foreground">
                {trial.left} of {TOOL_TRIAL_LIMIT} free conversions left. Runs in your browser,
                nothing is uploaded.
              </p>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-5">
            <p className="text-sm font-medium text-red-500">{error}</p>
          </div>
        )}

        {output !== null && !error && (
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-3 flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-bold">
                <Database className="h-4 w-4 text-primary" /> MongoDB{" "}
                {mode === "find" ? "find()" : "aggregate pipeline"}
              </p>
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
