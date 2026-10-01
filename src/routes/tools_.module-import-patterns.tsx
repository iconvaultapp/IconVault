// /tools/module-import-patterns - Static vs dynamic imports, top-level await
// (both executed for real with blob modules) and circular dependencies with a
// faithful ESM evaluation simulator showing TDZ errors.

import { useCallback, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, GitBranch, Package, Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/module-import-patterns")({
  head: () => {
    const seo = getToolSeoMeta("module-import-patterns");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: ImportPatternsTool,
});

type Tab = "dynamic" | "tla" | "circular";

function CodeBlock({ code, onCopy }: { code: string; onCopy: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-[#0d1117]">
      <button
        type="button"
        onClick={() => { onCopy(); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        className="absolute right-2 top-2 flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/20"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied" : "Copy"}
      </button>
      <pre className="overflow-x-auto p-4 pr-20 font-mono text-[13px] leading-relaxed text-[#e6edf3]">{code}</pre>
    </div>
  );
}

const copyText = (code: string, label: string) => {
  void navigator.clipboard.writeText(code).then(() => toast.success(label)).catch(() => toast.error("Copy failed"));
};

// ---------- dynamic import demo ----------

const DYNAMIC_SRC = `export const answer = 42;
export function greet(name) {
  return "hello " + name;
}
export default { version: "1.0.0" };`;

const DYNAMIC_CODE = `// Static imports must be at the top and always load.
// Dynamic import() loads a module on demand, conditionally, lazily.
const url = URL.createObjectURL(
  new Blob([\`export const answer = 42;\`], { type: "text/javascript" })
);
const mod = await import(url); // real module namespace object
mod.answer; // 42`;

function DynamicTab({ trial }: { trial: ReturnType<typeof useToolTrial> }) {
  const [running, setRunning] = useState(false);
  const [out, setOut] = useState<string[]>([]);

  const run = useCallback(async () => {
    if (running || !trial.canUse) return;
    setRunning(true);
    setOut([]);
    const t0 = performance.now();
    try {
      const url = URL.createObjectURL(new Blob([DYNAMIC_SRC], { type: "text/javascript" }));
      const mod = await import(/* @vite-ignore */ url);
      const ms = Math.round(performance.now() - t0);
      setOut([
        `import() resolved in ${ms}ms`,
        `mod.answer -> ${String((mod as Record<string, unknown>)["answer"])}`,
        `mod.greet("sameer") -> "${String(((mod as Record<string, (n: string) => string>)["greet"]!)("sameer"))}"`,
        `mod.default -> ${JSON.stringify((mod as Record<string, unknown>)["default"])}`,
        `typeof mod -> "${typeof mod}" (module namespace, frozen)`,
      ]);
      URL.revokeObjectURL(url);
    } catch (e) {
      setOut([`Error: ${e instanceof Error ? e.message : String(e)}`]);
    }
    setRunning(false);
    trial.recordUse();
  }, [running, trial]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Static <code className="font-mono">import</code> is hoisted and unconditional. <code className="font-mono">import()</code> is
          a real function call that returns a promise for the module namespace, so you can load code only when the user needs it.
          This demo builds a module from a Blob URL and imports it for real.
        </p>
        <ActionButton onClick={() => void run()} busy={running} disabled={running || !trial.canUse}>
          <Play className="h-4 w-4" /> {running ? "Importing…" : "Dynamic import()"}
        </ActionButton>
        <div className="min-h-[150px] space-y-1.5 rounded-xl border border-border bg-card p-4 font-mono text-[13px]">
          {out.length === 0 && <p className="font-sans text-sm text-muted-foreground">The imported module namespace appears here…</p>}
          {out.map((l, i) => <p key={i} className="break-all">{l}</p>)}
        </div>
      </div>
      <div className="space-y-4">
        <CodeBlock code={DYNAMIC_CODE} onCopy={() => copyText(DYNAMIC_CODE, "Dynamic import code copied")} />
        <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
          <p className="mb-1 font-bold text-foreground">When to reach for import()</p>
          <p>Route-level code splitting, heavy libraries behind a user gesture (charts, editors, PDF renderers), and feature-flagged modules. Bundlers turn each import() into a separate chunk automatically.</p>
        </div>
      </div>
    </div>
  );
}

// ---------- top-level await demo ----------

const TLA_SRC = `// this module pauses its own evaluation until the data arrives
const res = await new Promise((resolve) =>
  setTimeout(() => resolve({ user: "sameer", plan: "pro" }), 1200)
);
export default res;`;

const TLA_CODE = `// data.js - top-level await pauses THIS module's evaluation
const res = await fetch("/api/me").then((r) => r.json());
export default res;

// app.js - importing data.js waits for it, but sibling
// modules without the dependency keep evaluating
import user from "./data.js";`;

function TlaTab({ trial }: { trial: ReturnType<typeof useToolTrial> }) {
  const [state, setState] = useState<"idle" | "pending" | "done">("idle");
  const [ms, setMs] = useState(0);
  const [value, setValue] = useState("");

  const run = useCallback(async () => {
    if (state === "pending" || !trial.canUse) return;
    setState("pending");
    setValue("");
    const t0 = performance.now();
    const timer = setInterval(() => setMs(Math.round(performance.now() - t0)), 100);
    try {
      const url = URL.createObjectURL(new Blob([TLA_SRC], { type: "text/javascript" }));
      const mod = await import(/* @vite-ignore */ url);
      clearInterval(timer);
      setMs(Math.round(performance.now() - t0));
      setValue(JSON.stringify((mod as Record<string, unknown>)["default"]));
      setState("done");
      URL.revokeObjectURL(url);
    } catch (e) {
      clearInterval(timer);
      setValue(`Error: ${e instanceof Error ? e.message : String(e)}`);
      setState("done");
    }
    trial.recordUse();
  }, [state, trial]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Top-level await pauses the module's evaluation until the promise settles. Importers wait too, which makes it
          perfect for config and auth bootstrapping, and dangerous inside hot dependency chains. Watch a real module block for 1.2s:
        </p>
        <ActionButton onClick={() => void run()} disabled={state === "pending" || !trial.canUse}>
          <Play className="h-4 w-4" /> Import module with top-level await
        </ActionButton>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className={cn("font-bold", state === "pending" ? "text-amber-500" : state === "done" ? "text-emerald-500" : "text-muted-foreground")}>
              {state === "idle" ? "waiting" : state === "pending" ? "import pending…" : "import resolved"}
            </span>
            <span className="font-mono text-muted-foreground">{ms}ms</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted">
            <div className={cn("h-full rounded-full transition-all", state === "done" ? "bg-emerald-500" : "bg-amber-500")} style={{ width: state === "idle" ? "0%" : state === "pending" ? `${Math.min(95, (ms / 1200) * 100)}%` : "100%" }} />
          </div>
          {value && <p className="mt-3 font-mono text-[13px]">default export -&gt; {value}</p>}
        </div>
      </div>
      <CodeBlock code={TLA_CODE} onCopy={() => copyText(TLA_CODE, "Top-level await code copied")} />
    </div>
  );
}

// ---------- circular dependency simulator ----------

type Cell = { initialized: boolean; value: unknown };
type FnDef = { params: string[]; body: string };

type SimModule = {
  id: string;
  imports: string[]; // module ids
  body: string;
  cells: Map<string, Cell>;
  aliases: Map<string, Cell>;
  fns: Map<string, FnDef>;
};

const DEFAULT_BODIES: Record<string, string> = {
  A: `import { b } from "./B.js";
export const a = "a";
export function getA() { return a; }
console.log("A evaluated, sees b =", b);`,
  B: `import { a } from "./A.js";
export const b = "b";
console.log("B evaluated, sees a =", a);`,
  C: `import { a } from "./A.js";
export const c = a + "-c";`,
};

function specToId(spec: string): string | null {
  const m = spec.trim().match(/["']\.\/([A-Za-z0-9_-]+)\.js["']/);
  return m ? (m[1] ?? null) : null;
}

class TDZError extends Error {
  constructor(name: string) { super(`Cannot access '${name}' before initialization`); this.name = "ReferenceError"; }
}

function makeParser(cells: Map<string, Cell>, aliases: Map<string, Cell>, fns: Map<string, FnDef>) {
  const lookup = (name: string): Cell => {
    if (aliases.has(name)) return aliases.get(name)!;
    if (cells.has(name)) return cells.get(name)!;
    throw new TDZError(name);
  };

  const tokenize = (src: string): string[] => {
    const tokens: string[] = [];
    let i = 0;
    while (i < src.length) {
      const ch = src[i] ?? "";
      if (/\s/.test(ch)) { i++; continue; }
      if (ch === '"' || ch === "'") {
        let j = i + 1;
        while (j < src.length && src[j] !== ch) { if (src[j] === "\\") j++; j++; }
        tokens.push(src.slice(i, j + 1)); i = j + 1; continue;
      }
      if (/[0-9]/.test(ch)) {
        const m = src.slice(i).match(/^[0-9]+(\.[0-9]+)?/);
        tokens.push(m![0]); i += m![0].length; continue;
      }
      if (/[A-Za-z_$]/.test(ch)) {
        const m = src.slice(i).match(/^[A-Za-z_$][A-Za-z0-9_$]*/);
        tokens.push(m![0]); i += m![0].length; continue;
      }
      tokens.push(ch); i++;
    }
    return tokens;
  };

  const evalExpr = (src: string): unknown => {
    const s = src.trim();
    if (s.startsWith("`") && s.endsWith("`") && s.length >= 2) return evalTemplate(s.slice(1, -1));
    const tokens = tokenize(s);
    const pos = { i: 0 };
    const v = parseAdd(tokens, pos);
    if (pos.i !== tokens.length) throw new Error(`Unexpected token ${tokens[pos.i]}`);
    return v;
  };

  const evalTemplate = (inner: string): string => {
    let out = "";
    let i = 0;
    while (i < inner.length) {
      const j = inner.indexOf("${", i);
      if (j === -1) { out += inner.slice(i); break; }
      out += inner.slice(i, j);
      let depth = 1, k = j + 2;
      while (k < inner.length && depth > 0) {
        if (inner[k] === "{") depth++;
        else if (inner[k] === "}") depth--;
        k++;
      }
      out += String(evalExpr(inner.slice(j + 2, k - 1)));
      i = k;
    }
    return out;
  };

  const parseAdd = (tokens: string[], pos: { i: number }): unknown => {
    let left = parseMul(tokens, pos);
    while (tokens[pos.i] === "+" || tokens[pos.i] === "-") {
      const op = tokens[pos.i++];
      const right = parseMul(tokens, pos);
      if (op === "+") {
        left = typeof left === "string" || typeof right === "string"
          ? String(left) + String(right)
          : (left as number) + (right as number);
      } else {
        left = (left as number) - (right as number);
      }
    }
    return left;
  };

  const parseMul = (tokens: string[], pos: { i: number }): unknown => {
    let left = parsePrimary(tokens, pos);
    while (tokens[pos.i] === "*" || tokens[pos.i] === "/") {
      const op = tokens[pos.i++];
      const right = parsePrimary(tokens, pos);
      left = op === "*" ? (left as number) * (right as number) : (left as number) / (right as number);
    }
    return left;
  };

  const parsePrimary = (tokens: string[], pos: { i: number }): unknown => {
    const t = tokens[pos.i++];
    if (t === undefined) throw new Error("Unexpected end of expression");
    if (t === "(") { const v = parseAdd(tokens, pos); pos.i++; return v; }
    if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
      return t.slice(1, -1).replace(/\\n/g, "\n");
    }
    if (/^[0-9]/.test(t)) return Number(t);
    if (t === "undefined") return undefined;
    if (/^[A-Za-z_$]/.test(t)) {
      if (tokens[pos.i] === "(") {
        pos.i++;
        const args: unknown[] = [];
        while (tokens[pos.i] !== ")") {
          args.push(parseAdd(tokens, pos));
          if (tokens[pos.i] === ",") pos.i++;
        }
        pos.i++;
        return callFn(t, args);
      }
      const cell = lookup(t);
      if (!cell.initialized) throw new TDZError(t);
      return cell.value;
    }
    throw new Error(`Unexpected token ${t}`);
  };

  const callFn = (name: string, args: unknown[]): unknown => {
    const fn = fns.get(name);
    if (!fn) throw new Error(`Unknown function ${name}`);
    const saved = new Map<string, Cell | undefined>();
    fn.params.forEach((p, idx) => {
      saved.set(p, cells.get(p));
      cells.set(p, { initialized: true, value: args[idx] });
    });
    try {
      return evalExpr(fn.body);
    } finally {
      for (const [p, prev] of saved) {
        if (prev) cells.set(p, prev);
        else cells.delete(p);
      }
    }
  };

  return { evalExpr };
}

function runStatement(
  line: string,
  mod: SimModule,
  mods: Map<string, SimModule>,
  logs: string[],
): void {
  const t = line.trim();
  if (!t || t.startsWith("//")) return;
  const { evalExpr } = makeParser(mod.cells, mod.aliases, mod.fns);

  let m = t.match(/^import\s*\{([^}]*)\}\s*from\s*(.+);?$/);
  if (m) {
    const names = m[1]!.split(",").map((s) => s.trim()).filter(Boolean);
    const fromId = specToId(m[2]!);
    const target = fromId ? mods.get(fromId) : undefined;
    if (!target) throw new Error(`Cannot resolve ${m[2]}`);
    for (const n of names) {
      let cell = target.cells.get(n);
      if (!cell) { cell = { initialized: false, value: undefined }; target.cells.set(n, cell); }
      mod.aliases.set(n, cell);
    }
    logs.push(`  link: import { ${names.join(", ")} } from ./${target.id}.js (live bindings)`);
    return;
  }
  m = t.match(/^(?:export\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{\s*return\s+(.+?);?\s*\}$/);
  if (m) {
    mod.fns.set(m[1]!, { params: m[2]!.split(",").map((s) => s.trim()).filter(Boolean), body: m[3]! });
    mod.cells.set(m[1]!, { initialized: true, value: `[function ${m[1]!}]` });
    return;
  }
  m = t.match(/^(?:export\s+)?(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(.+);?$/);
  if (m) {
    const value = evalExpr(m[2]!);
    mod.cells.set(m[1]!, { initialized: true, value });
    return;
  }
  m = t.match(/^console\.log\((.*)\);?$/);
  if (m) {
    const parts = splitArgs(m[1]!);
    logs.push("  log: " + parts.map((p) => fmtSim(evalExpr(p))).join(" "));
    return;
  }
  m = t.match(/^export\s*\{([^}]*)\};?$/);
  if (m) return;
  throw new Error(`Unsupported statement: ${t}`);
}

function splitArgs(src: string): string[] {
  const parts: string[] = [];
  let depth = 0, cur = "", inStr: string | null = null;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inStr) { cur += ch; if (ch === inStr) inStr = null; continue; }
    if (ch === '"' || ch === "'" || ch === "`") { inStr = ch; cur += ch; continue; }
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) { parts.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

function fmtSim(v: unknown): string {
  if (typeof v === "string") return v;
  if (v === undefined) return "undefined";
  try { return JSON.stringify(v) ?? String(v); } catch { return String(v); }
}

function evaluateGraph(bodies: Record<string, string>, entry: string): string[] {
  const logs: string[] = [];
  const mods = new Map<string, SimModule>();
  for (const id of Object.keys(bodies)) {
    mods.set(id, { id, imports: [], body: bodies[id] ?? "", cells: new Map(), aliases: new Map(), fns: new Map() });
  }
  // parse imports for graph edges
  for (const mod of mods.values()) {
    for (const line of mod.body.split("\n")) {
      const m = line.trim().match(/^import\s*\{[^}]*\}\s*from\s*(.+);?$/);
      if (m) {
        const fromId = specToId(m[1]!);
        if (fromId && mods.has(fromId)) mod.imports.push(fromId);
      }
    }
  }
  // hoist function declarations
  for (const mod of mods.values()) {
    for (const line of mod.body.split("\n")) {
      const m = line.trim().match(/^(?:export\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{\s*return\s+(.+?);?\s*\}$/);
      if (m) {
        mod.fns.set(m[1]!, { params: m[2]!.split(",").map((s) => s.trim()).filter(Boolean), body: m[3]! });
        mod.cells.set(m[1]!, { initialized: true, value: `[function ${m[1]!}]` });
      }
    }
  }
  // DFS post-order
  const order: string[] = [];
  const visiting = new Set<string>();
  const visit = (id: string) => {
    if (order.includes(id) || visiting.has(id)) {
      if (visiting.has(id)) logs.push(`cycle: ${id} is already being linked, using its uninitialized bindings`);
      return;
    }
    visiting.add(id);
    logs.push(`visit ${id}.js`);
    for (const dep of mods.get(id)!.imports) visit(dep);
    visiting.delete(id);
    order.push(id);
  };
  if (!mods.has(entry)) return [`Unknown entry module ${entry}`];
  logs.push(`entry: ${entry}.js`);
  visit(entry);
  logs.push(`evaluation order: ${order.map((o) => o + ".js").join(" -> ")}`);
  // evaluate
  for (const id of order) {
    const mod = mods.get(id)!;
    logs.push(`evaluate ${id}.js`);
    try {
      for (const line of mod.body.split("\n")) runStatement(line, mod, mods, logs);
    } catch (e) {
      logs.push(`  ${e instanceof TDZError ? "ReferenceError (TDZ)" : "Error"}: ${e instanceof Error ? e.message : String(e)}`);
      logs.push(`evaluation halted: the classic circular-import TDZ trap`);
      break;
    }
  }
  return logs;
}

function CircularTab({ trial }: { trial: ReturnType<typeof useToolTrial> }) {
  const [bodies, setBodies] = useState<Record<string, string>>(DEFAULT_BODIES);
  const [entry, setEntry] = useState("A");
  const [logs, setLogs] = useState<string[]>([]);

  const edges = useMemo<[string, string][]>(() => {
    const out: [string, string][] = [];
    for (const [id, body] of Object.entries(bodies)) {
      for (const line of body.split("\n")) {
        const m = line.trim().match(/^import\s*\{[^}]*\}\s*from\s*(.+);?$/);
        if (m) {
          const fromId = specToId(m[1]!);
          if (fromId && bodies[fromId] !== undefined && !out.some(([a, b]) => a === id && b === fromId)) {
            out.push([id, fromId]);
          }
        }
      }
    }
    return out;
  }, [bodies]);

  const evaluate = useCallback(() => {
    if (!trial.canUse) return;
    setLogs(evaluateGraph(bodies, entry));
    trial.recordUse();
  }, [bodies, entry, trial]);

  const reset = useCallback(() => { setBodies(DEFAULT_BODIES); setLogs([]); }, []);

  const ids = ["A", "B", "C"];
  const nodePos: Record<string, { x: number; y: number }> = { A: { x: 70, y: 90 }, B: { x: 230, y: 90 }, C: { x: 150, y: 20 } };

  return (
    <div className="space-y-5">
      <p className="max-w-3xl text-sm text-muted-foreground">
        Circular imports are legal in ESM, but evaluation order can bite: a module that reads an imported
        <code className="font-mono"> const </code> during its own evaluation hits the temporal dead zone. Edit the module
        bodies to change the import graph, pick an entry module, then evaluate to see the real DFS post-order and any TDZ errors.
        The simulator runs a faithful subset of ESM semantics (hoisted functions, live bindings, TDZ).
      </p>
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <p className="flex items-center gap-2 text-sm font-bold"><GitBranch className="h-4 w-4 text-primary" /> Import graph</p>
          <svg viewBox="0 0 300 130" className="w-full">
            {edges.map(([a, b]) => {
              const p1 = nodePos[a]!, p2 = nodePos[b]!;
              const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2 - 14;
              return (
                <g key={`${a}${b}`}>
                  <path d={`M ${p1.x} ${p1.y} Q ${mx} ${my} ${p2.x} ${p2.y}`} fill="none" stroke="#0F766E" strokeWidth="2" markerEnd="url(#arrow)" />
                </g>
              );
            })}
            <defs>
              <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                <path d="M 0 0 L 8 4 L 0 8 z" fill="#0F766E" />
              </marker>
            </defs>
            {ids.map((id) => (
              <g key={id}>
                <circle cx={nodePos[id]!.x} cy={nodePos[id]!.y} r="24" fill={entry === id ? "#0F766E" : "#0F766E22"} stroke="#0F766E" strokeWidth="2" />
                <text x={nodePos[id]!.x} y={nodePos[id]!.y + 7} textAnchor="middle" fontSize="16" fontWeight="800" fill={entry === id ? "#fff" : "#0F766E"}>{id}</text>
              </g>
            ))}
          </svg>
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">The graph is drawn from the import statements in the module bodies. Edit a body to add or remove an edge.</p>
            {ids.flatMap((a) => ids.filter((b) => b !== a).map((b) => {
              const on = edges.some(([x, y]) => x === a && y === b);
              return (
                <div
                  key={`${a}${b}`}
                  className={cn(
                    "w-full rounded-lg border px-3 py-1.5 font-mono text-xs",
                    on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground/60",
                  )}
                >
                  {a}.js {on ? "imports" : "does not import"} {b}.js
                </div>
              );
            }))}
          </div>
          <label className="block text-xs font-semibold text-muted-foreground">
            Entry module
            <select value={entry} onChange={(e) => setEntry(e.target.value)} className="mt-1 block w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary">
              {ids.map((id) => <option key={id} value={id}>{id}.js</option>)}
            </select>
          </label>
          <div className="flex gap-2">
            <ActionButton onClick={evaluate} disabled={!trial.canUse}><Play className="h-4 w-4" /> Evaluate</ActionButton>
            <button type="button" onClick={reset} className="flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground">
              <RotateCcw className="h-4 w-4" /> Reset
            </button>
          </div>
        </div>
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {ids.map((id) => (
              <label key={id} className="block text-xs font-semibold text-muted-foreground">
                {id}.js
                <textarea
                  value={bodies[id]}
                  onChange={(e) => setBodies((p) => ({ ...p, [id]: e.target.value }))}
                  rows={8}
                  spellCheck={false}
                  className="mt-1 block w-full rounded-xl border border-border bg-[#0d1117] p-3 font-mono text-[11.5px] leading-relaxed text-[#e6edf3] outline-none focus:border-primary"
                />
              </label>
            ))}
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Evaluation trace</p>
            <div className="max-h-[260px] space-y-1 overflow-auto rounded-xl bg-[#0d1117] p-4 font-mono text-[12.5px] leading-relaxed text-[#e6edf3]">
              {logs.length === 0 && <p className="text-white/40">Press Evaluate to run the ESM linking and evaluation phases…</p>}
              {logs.map((l, i) => (
                <p key={i} className={cn(
                  l.includes("TDZ") || l.includes("halted") ? "text-red-400" : l.startsWith("  log:") ? "text-emerald-300" : l.startsWith("cycle:") ? "text-amber-300" : "text-white/70",
                )}>{l}</p>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Supported statements: import, export const/let, function declarations, console.log, arithmetic, template literals and calls.
            The fix for a TDZ cycle: only read the imported binding inside functions, never during module evaluation.
          </p>
        </div>
      </div>
    </div>
  );
}

function ImportPatternsTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("module-import-patterns", isPro);
  const seo = getToolSeo("module-import-patterns");
  const [tab, setTab] = useState<Tab>("dynamic");

  const tabs: { id: Tab; label: string }[] = [
    { id: "dynamic", label: "Dynamic import()" },
    { id: "tla", label: "Top-level await" },
    { id: "circular", label: "Circular deps" },
  ];

  return (
    <ToolPageShell toolId="module-import-patterns" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="ES Module Patterns" left={trial.left} />
      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-semibold transition",
              tab === t.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
            )}
          >
            <Package className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>
      {tab === "dynamic" && <DynamicTab trial={trial} />}
      {tab === "tla" && <TlaTab trial={trial} />}
      {tab === "circular" && <CircularTab trial={trial} />}
      {!isPro && (
        <p className="mt-6 text-xs text-muted-foreground">{trial.left} of {TOOL_TRIAL_LIMIT} free runs left. Runs fully in your browser.</p>
      )}
    </ToolPageShell>
  );
}
