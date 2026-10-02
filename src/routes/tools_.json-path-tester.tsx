// /tools/json-path-tester - Evaluate JSONPath queries against your JSON in the
// browser. Supports $, .child, ['child'], [0], [-1], [*], .*, ..child, ..* and
// [?()] filters. 100% client-side, runs in your browser, nothing is uploaded.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Play, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/json-path-tester")({
  head: () => {
    const seo = getToolSeoMeta("json-path-tester");
    const canonical = "https://iconvault.site/tools/json-path-tester";
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
  component: JsonPathTesterTool,
});

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

type Seg =
  | { t: "child"; name: string }
  | { t: "wildcard" }
  | { t: "index"; i: number }
  | { t: "recursive"; name: string }
  | { t: "recursiveWildcard" }
  | { t: "filter"; expr: string };

function parseQuery(q: string): Seg[] {
  const s = q.trim();
  if (!s.startsWith("$")) throw new Error('Query must start with "$"');
  const segs: Seg[] = [];
  let i = 1;
  const readBare = () => {
    const m = /^[A-Za-z0-9_$]+/.exec(s.slice(i));
    if (!m) throw new Error(`Expected a name at position ${i}`);
    i += m[0].length;
    return m[0];
  };
  while (i < s.length) {
    if (s.startsWith("..", i)) {
      i += 2;
      if (s[i] === "*") { segs.push({ t: "recursiveWildcard" }); i++; }
      else segs.push({ t: "recursive", name: readBare() });
    } else if (s[i] === ".") {
      i++;
      if (s[i] === "*") { segs.push({ t: "wildcard" }); i++; }
      else segs.push({ t: "child", name: readBare() });
    } else if (s[i] === "[") {
      const j = s.indexOf("]", i);
      if (j < 0) throw new Error("Unclosed [ bracket");
      const inner = s.slice(i + 1, j).trim();
      i = j + 1;
      if (inner === "*") segs.push({ t: "wildcard" });
      else if (inner.startsWith("?(") && inner.endsWith(")")) segs.push({ t: "filter", expr: inner.slice(2, -1) });
      else if (/^-?\d+$/.test(inner)) segs.push({ t: "index", i: parseInt(inner, 10) });
      else {
        const m = /^['"](.*)['"]$/.exec(inner);
        if (!m) throw new Error(`Cannot parse [${inner}]. Slices like [1:3] are not supported.`);
        segs.push({ t: "child", name: m[1] ?? "" });
      }
    } else {
      throw new Error(`Unexpected "${s[i]}" at position ${i}`);
    }
  }
  return segs;
}

interface Ctx { path: string; value: unknown }

function childPath(base: string, key: string | number, parentIsArray: boolean): string {
  if (parentIsArray) return `${base}[${key}]`;
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(String(key)) ? `${base}.${key}` : `${base}["${key}"]`;
}

function walkDescendants(value: unknown, path: string, cb: (v: unknown, p: string) => void) {
  if (Array.isArray(value)) {
    value.forEach((v, idx) => {
      const p = `${path}[${idx}]`;
      cb(v, p);
      walkDescendants(v, p, cb);
    });
  } else if (isPlainObject(value)) {
    for (const k of Object.keys(value)) {
      const p = childPath(path, k, false);
      cb(value[k], p);
      walkDescendants(value[k], p, cb);
    }
  }
}

// --- filter expression parser: comparisons, &&, ||, !, parens, @.path ---

type Tok =
  | { t: "at"; path: string[] }
  | { t: "str"; v: string }
  | { t: "num"; v: number }
  | { t: "bool"; v: boolean }
  | { t: "null" }
  | { t: "op"; v: string }
  | { t: "lp" }
  | { t: "rp" };

function tokenize(expr: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  while (i < expr.length) {
    const c = expr[i] ?? "";
    if (/\s/.test(c)) { i++; continue; }
    if (c === "(") { toks.push({ t: "lp" }); i++; continue; }
    if (c === ")") { toks.push({ t: "rp" }); i++; continue; }
    const op2 = expr.slice(i, i + 2);
    if (["==", "!=", "<=", ">=", "&&", "||"].includes(op2)) { toks.push({ t: "op", v: op2 }); i += 2; continue; }
    if (["<", ">", "!"].includes(c)) { toks.push({ t: "op", v: c }); i++; continue; }
    if (c === "@") {
      i++;
      const path: string[] = [];
      while (expr[i] === ".") {
        i++;
        const m = /^[A-Za-z0-9_$]+/.exec(expr.slice(i));
        if (!m) throw new Error("Bad @.path in filter");
        path.push(m[0]);
        i += m[0].length;
      }
      toks.push({ t: "at", path });
      continue;
    }
    if (c === "'" || c === '"') {
      const j = expr.indexOf(c, i + 1);
      if (j < 0) throw new Error("Unterminated string in filter");
      toks.push({ t: "str", v: expr.slice(i + 1, j) });
      i = j + 1;
      continue;
    }
    const nm = /^-?\d+(\.\d+)?/.exec(expr.slice(i));
    if (nm) { toks.push({ t: "num", v: parseFloat(nm[0]) }); i += nm[0].length; continue; }
    if (expr.startsWith("true", i)) { toks.push({ t: "bool", v: true }); i += 4; continue; }
    if (expr.startsWith("false", i)) { toks.push({ t: "bool", v: false }); i += 5; continue; }
    if (expr.startsWith("null", i)) { toks.push({ t: "null" }); i += 4; continue; }
    throw new Error(`Cannot parse "${expr.slice(i, i + 10)}" in filter`);
  }
  return toks;
}

function getAt(node: unknown, path: string[]): unknown {
  let cur: unknown = node;
  for (const p of path) {
    if (isPlainObject(cur) && p in cur) cur = cur[p];
    else if (Array.isArray(cur) && /^\d+$/.test(p) && Number(p) < cur.length) cur = cur[Number(p)];
    else return undefined;
  }
  return cur;
}

function eqVal(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function evalFilter(expr: string, node: unknown): boolean {
  const toks = tokenize(expr);
  let pos = 0;
  const peek = () => toks[pos];
  function parseOr(): boolean {
    let v = parseAnd();
    while (peek()?.t === "op" && (peek() as { v: string }).v === "||") { pos++; v = parseAnd() || v; }
    return v;
  }
  function parseAnd(): boolean {
    let v = parseCmp();
    while (peek()?.t === "op" && (peek() as { v: string }).v === "&&") { pos++; v = parseCmp() && v; }
    return v;
  }
  function parseCmp(): boolean {
    const left = parseUnary();
    const t = peek();
    if (t?.t === "op" && ["==", "!=", "<", "<=", ">", ">="].includes(t.v)) {
      pos++;
      const right = parseUnary();
      const l = (left as { val: unknown }).val;
      const r = (right as { val: unknown }).val;
      switch (t.v) {
        case "==": return eqVal(l, r);
        case "!=": return !eqVal(l, r);
        case "<": return typeof l === "number" && typeof r === "number" && l < r;
        case "<=": return typeof l === "number" && typeof r === "number" && l <= r;
        case ">": return typeof l === "number" && typeof r === "number" && l > r;
        case ">=": return typeof l === "number" && typeof r === "number" && l >= r;
      }
    }
    return truthy((left as { val: unknown }).val);
  }
  function parseUnary(): { val: unknown } {
    const t = peek();
    if (t?.t === "op" && t.v === "!") { pos++; return { val: !truthy(parseUnary().val) }; }
    if (t?.t === "lp") {
      pos++;
      const v = parseOr();
      if (peek()?.t !== "rp") throw new Error("Missing ) in filter");
      pos++;
      return { val: v };
    }
    if (!t) throw new Error("Unexpected end of filter");
    pos++;
    if (t.t === "at") return { val: getAt(node, t.path) };
    if (t.t === "str") return { val: t.v };
    if (t.t === "num") return { val: t.v };
    if (t.t === "bool") return { val: t.v };
    if (t.t === "null") return { val: null };
    throw new Error("Bad operand in filter");
  }
  function truthy(v: unknown): boolean {
    return !(v === undefined || v === null || v === false || v === 0 || v === "" || (Array.isArray(v) && v.length === 0));
  }
  const result = parseOr();
  if (pos !== toks.length) throw new Error("Trailing characters in filter");
  return result;
}

function evaluate(segs: Seg[], root: unknown): Ctx[] {
  let cur: Ctx[] = [{ path: "$", value: root }];
  for (const sg of segs) {
    const next: Ctx[] = [];
    for (const { path, value } of cur) {
      if (sg.t === "child") {
        if (isPlainObject(value) && sg.name in value) next.push({ path: childPath(path, sg.name, false), value: value[sg.name] });
      } else if (sg.t === "wildcard") {
        if (Array.isArray(value)) value.forEach((v, i) => next.push({ path: `${path}[${i}]`, value: v }));
        else if (isPlainObject(value)) for (const k of Object.keys(value)) next.push({ path: childPath(path, k, false), value: value[k] });
      } else if (sg.t === "index") {
        if (Array.isArray(value)) {
          const idx = sg.i < 0 ? value.length + sg.i : sg.i;
          if (idx >= 0 && idx < value.length) next.push({ path: `${path}[${idx}]`, value: value[idx] });
        }
      } else if (sg.t === "recursive") {
        const collect = (v: unknown, p: string) => {
          if (isPlainObject(v) && sg.name in v) next.push({ path: childPath(p, sg.name, false), value: v[sg.name] });
          if (Array.isArray(v)) v.forEach((el, i) => collect(el, `${p}[${i}]`));
          else if (isPlainObject(v)) for (const k of Object.keys(v)) collect(v[k], childPath(p, k, false));
        };
        collect(value, path);
      } else if (sg.t === "recursiveWildcard") {
        walkDescendants(value, path, (v, p) => next.push({ path: p, value: v }));
      } else if (sg.t === "filter") {
        const items: Ctx[] = [];
        if (Array.isArray(value)) value.forEach((v, i) => items.push({ path: `${path}[${i}]`, value: v }));
        else if (isPlainObject(value)) for (const k of Object.keys(value)) items.push({ path: childPath(path, k, false), value: value[k] });
        for (const it of items) {
          if (evalFilter(sg.expr, it.value)) next.push(it);
        }
      }
    }
    cur = next;
  }
  return cur;
}

const SAMPLE_JSON = `{
  "store": {
    "book": [
      { "title": "JSON Handbook", "price": 29, "inStock": true },
      { "title": "API Design", "price": 45, "inStock": false },
      { "title": "CSS Secrets", "price": 12, "inStock": true }
    ],
    "bicycle": { "color": "red", "price": 199 }
  }
}`;

const EXAMPLES = [
  "$.store.book[*].title",
  "$..price",
  "$.store.book[?(@.price < 30)].title",
  "$.store.book[-1].title",
];

function fmtVal(v: unknown): string {
  const s = JSON.stringify(v);
  if (s === undefined) return "undefined";
  return s.length > 160 ? `${s.slice(0, 160)}...` : s;
}

function JsonPathTesterTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("json-path-tester", isPro);
  const seo = getToolSeo("json-path-tester");

  const [jsonText, setJsonText] = useState("");
  const [query, setQuery] = useState("$.store.book[*].title");
  const [results, setResults] = useState<Ctx[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const evaluateQuery = () => {
    if (!trial.canUse || busy) return;
    setBusy(true);
    setError(null);
    let root: unknown;
    try {
      root = JSON.parse(jsonText);
    } catch (e) {
      setError(`Invalid JSON: ${e instanceof Error ? e.message : "parse error"}`);
      setResults(null);
      setBusy(false);
      return;
    }
    try {
      const segs = parseQuery(query);
      const out = evaluate(segs, root);
      setResults(out);
      trial.recordUse();
      toast.success(out.length === 0 ? "Query ran, no matches" : `${out.length} match${out.length === 1 ? "" : "es"} found`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Query failed");
      setResults(null);
    } finally {
      setBusy(false);
    }
  };

  const copyValue = async (v: unknown) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(v, null, 2));
      toast.success("Value copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <ToolPageShell toolId="json-path-tester" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="JSONPath Tester" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-bold">JSON document</span>
            <button
              type="button"
              onClick={() => { setJsonText(SAMPLE_JSON); setResults(null); setError(null); }}
              className="rounded-xl border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              Load sample
            </button>
          </div>
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder="Paste your JSON here..."
            spellCheck={false}
            className="h-72 w-full resize-y rounded-xl border border-border bg-background p-3 font-mono text-[13px] leading-relaxed outline-none focus:border-primary"
          />
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <span className="mb-2 block text-sm font-bold">JSONPath query</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="$.store.book[*].title"
              spellCheck={false}
              className="w-full rounded-xl border border-border bg-background p-3 font-mono text-sm outline-none focus:border-primary"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setQuery(ex)}
                  className={cn(
                    "rounded-lg border px-2.5 py-1.5 font-mono text-xs transition",
                    query === ex
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                  )}
                >
                  {ex}
                </button>
              ))}
            </div>
            <div className="mt-3">
              <ActionButton busy={busy} disabled={!trial.canUse || !jsonText.trim() || !query.trim()} onClick={evaluateQuery}>
                <Play className="h-4 w-4" /> {busy ? "Evaluating..." : "Evaluate"}
              </ActionButton>
            </div>
            {!isPro && (
              <p className="mt-3 text-xs text-muted-foreground">
                {trial.left} of {TOOL_TRIAL_LIMIT} free evaluations left. Runs in your browser, nothing is uploaded.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <span className="mb-2 block text-sm font-bold">Supported syntax</span>
            <div className="flex flex-wrap gap-1.5">
              {["$", ".child", "['child']", "[0]", "[-1]", "[*]", ".*", "..child", "..*", "[?(@.price < 10)]", "[?(@.a == 'x' && @.b)]"].map((s) => (
                <code key={s} className="rounded-lg bg-muted px-2 py-1 font-mono text-xs">{s}</code>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Honest limits: slices like [1:3], script expressions, and union keys are not supported. Filters support
              comparisons (==, !=, &lt;, &lt;=, &gt;, &gt;=), &amp;&amp;, ||, ! and @.path lookups.
            </p>
          </div>
        </div>
      </div>

      {error && <p className="mt-4 text-sm font-medium text-red-500">{error}</p>}

      {results && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-bold">
              Results ({results.length})
            </span>
            <span className="text-xs text-muted-foreground">click a result to copy its value</span>
          </div>
          {results.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm font-semibold text-muted-foreground">
              The query ran fine but matched nothing. Try $..price or one of the examples above.
            </p>
          ) : (
            <div className="max-h-[420px] space-y-2 overflow-auto">
              {results.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => void copyValue(r.value)}
                  className="flex w-full items-start gap-3 rounded-xl border border-border bg-background p-3 text-left transition hover:border-primary/40"
                >
                  <Copy className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs font-bold text-primary">{r.path}</p>
                    <p className="mt-1 break-all font-mono text-[13px]">{fmtVal(r.value)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </ToolPageShell>
  );
}
