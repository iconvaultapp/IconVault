// /tools/js-scope-visualizer - See lexical scopes, hoisting, the temporal dead
// zone and closures come alive. A tiny real interpreter executes your code step by step.

import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Pause, Play, RotateCcw, StepBack, StepForward } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/js-scope-visualizer")({
  head: () => {
    const seo = getToolSeoMeta("js-scope-visualizer");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: ScopeVizTool,
});

/* ---------------- parser ---------------- */

type SExpr =
  | { k: "lit"; v: string | number | boolean }
  | { k: "undef" }
  | { k: "id"; name: string }
  | { k: "bin"; op: "+" | "-" | "*"; l: SExpr; r: SExpr }
  | { k: "call"; name: string };

type SStmt =
  | { k: "decl"; kind: "var" | "let" | "const"; name: string; init?: SExpr | undefined; line: number }
  | { k: "assign"; name: string; expr: SExpr; line: number }
  | { k: "call"; name: string; line: number; assign?: { kind: "var" | "let" | "const"; name: string } }
  | { k: "return"; expr?: SExpr | undefined; line: number }
  | { k: "log"; expr: SExpr; line: number };

interface SFunc { name: string; body: SStmt[]; startLine: number; parent: string | null; }

function parseExpr(src: string): SExpr | null {
  const s = src.trim();
  const bin = s.match(/^(.+?)\s*([+-])\s*(.+)$/);
  if (bin) {
    const l = parseExpr(bin[1]!);
    const r = parseExpr(bin[3]!);
    if (l && r && (bin[2] === "+" || bin[2] === "-")) return { k: "bin", op: bin[2], l, r };
  }
  const mul = s.match(/^(.+?)\s*\*\s*(.+)$/);
  if (mul) {
    const l = parseExpr(mul[1]!);
    const r = parseExpr(mul[2]!);
    if (l && r) return { k: "bin", op: "*", l, r };
  }
  let m = s.match(/^(\d+(?:\.\d+)?)$/);
  if (m) return { k: "lit", v: parseFloat(m[1]!) };
  m = s.match(/^"((?:[^"\\]|\\.)*)"$/);
  if (m) return { k: "lit", v: m[1]! };
  m = s.match(/^'((?:[^'\\]|\\.)*)'$/);
  if (m) return { k: "lit", v: m[1]! };
  if (s === "true") return { k: "lit", v: true };
  if (s === "false") return { k: "lit", v: false };
  if (s === "undefined") return { k: "undef" };
  m = s.match(/^(\w+)\(\s*\)$/);
  if (m) return { k: "call", name: m[1]! };
  m = s.match(/^(\w+)$/);
  if (m) return { k: "id", name: m[1]! };
  return null;
}

function parseScope(src: string): { funcs: Map<string, SFunc>; entry: SStmt[]; errors: string[]; lines: string[] } {
  const errors: string[] = [];
  const funcs = new Map<string, SFunc>();
  const rawLines = src.split("\n");

  const parseStmt = (text: string, line: number): SStmt | null => {
    const t = text.trim().replace(/;$/, "").trim();
    if (!t || t.startsWith("//")) return null;
    let m = t.match(/^(var|let|const)\s+(\w+)\s*=\s*(\w+)\(\s*\)$/);
    if (m) return { k: "call", name: m[3]!, line, assign: { kind: m[1] as "var" | "let" | "const", name: m[2]! } };
    m = t.match(/^(var|let|const)\s+(\w+)(?:\s*=\s*(.+))?$/);
    if (m) {
      let init: SExpr | undefined;
      if (m[3] !== undefined) {
        const e = parseExpr(m[3]);
        if (!e) { errors.push(`Line ${line + 1}: could not read the value in "${t.slice(0, 48)}".`); return null; }
        init = e;
      }
      return { k: "decl", kind: m[1] as "var" | "let" | "const", name: m[2]!, init, line };
    }
    m = t.match(/^console\.log\((.+)\)$/);
    if (m) {
      const e = parseExpr(m[1]!);
      if (!e) { errors.push(`Line ${line + 1}: could not read console.log argument.`); return null; }
      return { k: "log", expr: e, line };
    }
    m = t.match(/^return(?:\s+(.+))?$/);
    if (m) {
      let expr: SExpr | undefined;
      if (m[1] !== undefined) {
        const e = parseExpr(m[1]);
        if (!e) { errors.push(`Line ${line + 1}: could not read return value.`); return null; }
        expr = e;
      }
      return { k: "return", expr, line };
    }
    m = t.match(/^(\w+)\(\s*\)$/);
    if (m) return { k: "call", name: m[1]!, line };
    m = t.match(/^(\w+)\s*=\s*(.+)$/);
    if (m) {
      const e = parseExpr(m[2]!);
      if (!e) { errors.push(`Line ${line + 1}: could not read the value in "${t.slice(0, 48)}".`); return null; }
      return { k: "assign", name: m[1]!, expr: e, line };
    }
    errors.push(`Line ${line + 1}: could not understand "${t.slice(0, 48)}".`);
    return null;
  };

  // Recursive: parseBody consumes lines from idx until the matching close brace.
  function parseBody(idx: number, owner: string | null): { stmts: SStmt[]; next: number } {
    const stmts: SStmt[] = [];
    let i = idx;
    while (i < rawLines.length) {
      const line = rawLines[i]!;
      const fm = line.match(/^\s*function\s+(\w+)\s*\(\s*\)\s*\{\s*$/);
      if (fm) {
        const name = fm[1]!;
        const inner = parseBody(i + 1, name);
        funcs.set(name, { name, body: inner.stmts, startLine: i, parent: owner });
        i = inner.next;
        continue;
      }
      if (/^\s*\}\s*$/.test(line)) return { stmts, next: i + 1 };
      const st = parseStmt(line, i);
      if (st) stmts.push(st);
      i++;
    }
    return { stmts, next: i };
  }

  const top = parseBody(0, null);
  return { funcs, entry: top.stmts, errors, lines: rawLines };
}

/* ---------------- interpreter ---------------- */

type SVal =
  | { t: "num"; v: number }
  | { t: "str"; v: string }
  | { t: "bool"; v: boolean }
  | { t: "undef" }
  | { t: "func"; name: string; home: number };

interface Binding { kind: string; value: SVal; init: boolean; }
interface Scope { id: number; name: string; depth: number; parent: number | null; bindings: Map<string, Binding>; }
interface SnapScope { id: number; name: string; depth: number; bindings: { name: string; kind: string; value: string; tdz: boolean }[]; }
interface SFrame { scopes: SnapScope[]; current: number; line: number; note: string; out: string[]; halted: boolean; }

function valText(v: SVal): string {
  if (v.t === "num") return String(v.v);
  if (v.t === "str") return `"${v.v}"`;
  if (v.t === "bool") return String(v.v);
  if (v.t === "func") return `function ${v.name}`;
  return "undefined";
}

function simulateScope(funcs: Map<string, SFunc>, entry: SStmt[]): { frames: SFrame[]; errors: string[] } {
  const errors: string[] = [];
  const frames: SFrame[] = [];
  const scopes: Scope[] = [];
  const out: string[] = [];
  let sid = 0;
  let halted = false;

  const global: Scope = { id: ++sid, name: "global", depth: 0, parent: null, bindings: new Map() };
  scopes.push(global);

  const snap = (current: number, line: number, note: string): SFrame => ({
    scopes: scopes.map((s) => ({
      id: s.id, name: s.name, depth: s.depth,
      bindings: [...s.bindings.entries()].map(([name, b]) => ({
        name, kind: b.kind, value: b.init ? valText(b.value) : "-", tdz: !b.init,
      })),
    })),
    current, line, note, out: [...out], halted,
  });
  const emit = (current: number, line: number, note: string) => {
    if (frames.length < 400) frames.push(snap(current, line, note));
  };
  const byId = (id: number): Scope => scopes.find((s) => s.id === id)!;

  function resolve(scope: Scope, name: string): { scope: Scope; b: Binding } | null {
    let s: Scope | undefined = scope;
    while (s) {
      const b = s.bindings.get(name);
      if (b) return { scope: s, b };
      s = s.parent !== null ? byId(s.parent) : undefined;
    }
    return null;
  }

  /** Creation phase: hoist vars, pre-declare let/const in TDZ, bind function decls. */
  function createScope(name: string, home: number, body: SStmt[], line: number, owner: string | null): Scope {
    const scope: Scope = { id: ++sid, name, depth: byId(home).depth + 1, parent: home, bindings: new Map() };
    scopes.push(scope);
    for (const s of body) {
      if (s.k === "decl" && !scope.bindings.has(s.name)) {
        if (s.kind === "var") scope.bindings.set(s.name, { kind: "var", value: { t: "undef" }, init: true });
        else scope.bindings.set(s.name, { kind: s.kind, value: { t: "undef" }, init: false });
      }
    }
    for (const [fname, f] of funcs) {
      if (f.parent === owner && !scope.bindings.has(fname)) {
        scope.bindings.set(fname, { kind: "function", value: { t: "func", name: fname, home: scope.id }, init: true });
      }
    }
    emit(
      scope.id, line,
      name === "global"
        ? "Creation phase for global: var is hoisted as undefined, function declarations are hoisted whole, let/const are created but locked in the temporal dead zone."
        : `Creation phase for ${name}: its parent scope is where the function was DEFINED (lexical scope), not where it was called. var hoists, let/const enter the dead zone.`
    );
    return scope;
  }

  function evalExpr(scope: Scope, e: SExpr, line: number): SVal | null {
    if (e.k === "lit") {
      if (typeof e.v === "number") return { t: "num", v: e.v };
      if (typeof e.v === "string") return { t: "str", v: e.v };
      return { t: "bool", v: e.v };
    }
    if (e.k === "undef") return { t: "undef" };
    if (e.k === "id") {
      const r = resolve(scope, e.name);
      if (!r) { errors.push(`Line ${line + 1}: "${e.name}" is not defined.`); halted = true; return null; }
      if (!r.b.init) {
        errors.push(`Line ${line + 1}: Cannot access "${e.name}" before initialization (temporal dead zone).`);
        halted = true;
        emit(scope.id, line, `ReferenceError: "${e.name}" is in the temporal dead zone. let/const exist but cannot be touched until their declaration runs.`);
        return null;
      }
      return r.b.value;
    }
    if (e.k === "bin") {
      const l = evalExpr(scope, e.l, line);
      const r = evalExpr(scope, e.r, line);
      if (!l || !r || halted) return null;
      if (e.op === "+") {
        if (l.t === "str" || r.t === "str") {
          const ls = l.t === "str" ? l.v : l.t === "num" ? String(l.v) : valText(l);
          const rs = r.t === "str" ? r.v : r.t === "num" ? String(r.v) : valText(r);
          return { t: "str", v: ls + rs };
        }
        if (l.t === "num" && r.t === "num") return { t: "num", v: l.v + r.v };
        return { t: "num", v: NaN };
      }
      if (l.t === "num" && r.t === "num") return { t: "num", v: e.op === "-" ? l.v - r.v : l.v * r.v };
      return { t: "num", v: NaN };
    }
    return doCall(scope, e.name, line, undefined);
  }

  function doCall(caller: Scope, name: string, line: number, assign: { kind: "var" | "let" | "const"; name: string } | undefined): SVal | null {
    const r = resolve(caller, name);
    if (!r || r.b.value.t !== "func") {
      errors.push(`Line ${line + 1}: "${name}" is not a function.`);
      halted = true;
      return null;
    }
    if (!r.b.init) {
      errors.push(`Line ${line + 1}: Cannot access "${name}" before initialization (temporal dead zone).`);
      halted = true;
      return null;
    }
    const fv = r.b.value;
    const fn = funcs.get(fv.name)!;
    const scope = createScope(`${fn.name}()`, fv.home, fn.body, line, fn.name);
    if (r.scope.id !== caller.id || fv.home !== caller.id) {
      emit(scope.id, line, `Calling ${fn.name}(): the new scope chains to its DEFINITION scope, so it still sees variables from there even when called elsewhere. That is a closure.`);
    }
    const ret = runBody(scope, fn.body);
    if (halted) return null;
    if (assign) {
      const target = caller;
      const dup = target.bindings.get(assign.name);
      if (dup && dup.init && dup.kind !== "var") {
        errors.push(`Line ${line + 1}: "${assign.name}" is already declared in this scope.`);
        halted = true;
        return null;
      }
      target.bindings.set(assign.name, { kind: assign.kind, value: ret, init: true });
      emit(caller.id, line, `${assign.kind} ${assign.name} = ${valText(ret)} (return value of ${fn.name}()).`);
    }
    return ret;
  }

  function runBody(scope: Scope, body: SStmt[]): SVal {
    let ret: SVal = { t: "undef" };
    for (const s of body) {
      if (halted) break;
      if (s.k === "decl") {
        let b = scope.bindings.get(s.name);
        if (!b) {
          b = { kind: s.kind, value: { t: "undef" }, init: s.kind === "var" };
          scope.bindings.set(s.name, b);
        } else if (b.init && b.kind !== "var") {
          errors.push(`Line ${s.line + 1}: "${s.name}" is already declared in this scope.`);
          halted = true;
          break;
        }
        if (s.kind !== "var" && !b.init) {
          emit(scope.id, s.line, `${s.kind} ${s.name}: declared but uninitialized, it sits in the temporal dead zone.`);
        }
        if (s.init) {
          const v = evalExpr(scope, s.init, s.line);
          if (halted || !v) break;
          b.value = v;
          b.init = true;
          emit(scope.id, s.line, `${s.kind} ${s.name} = ${valText(v)}: initialized, the dead zone ends.`);
        } else if (s.kind === "var") {
          emit(scope.id, s.line, `var ${s.name}: already hoisted as undefined.`);
        }
      } else if (s.k === "assign") {
        const r = resolve(scope, s.name);
        if (!r) { errors.push(`Line ${s.line + 1}: "${s.name}" is not defined.`); halted = true; break; }
        if (!r.b.init) {
          errors.push(`Line ${s.line + 1}: Cannot access "${s.name}" before initialization (temporal dead zone).`);
          halted = true;
          emit(scope.id, s.line, `ReferenceError: assigning to "${s.name}" while it is still in the temporal dead zone.`);
          break;
        }
        if (r.b.kind === "const") { errors.push(`Line ${s.line + 1}: Assignment to constant "${s.name}".`); halted = true; break; }
        const v = evalExpr(scope, s.expr, s.line);
        if (halted || !v) break;
        r.b.value = v;
        emit(scope.id, s.line, `${s.name} = ${valText(v)}: resolved through the scope chain in ${r.scope.name}.`);
      } else if (s.k === "log") {
        const v = evalExpr(scope, s.expr, s.line);
        if (halted || !v) break;
        out.push(valText(v));
        emit(scope.id, s.line, `console.log prints ${valText(v)}.`);
      } else if (s.k === "call") {
        const v = doCall(scope, s.name, s.line, s.assign);
        if (halted || !v) break;
      } else if (s.k === "return") {
        if (s.expr) {
          const v = evalExpr(scope, s.expr, s.line);
          if (halted || !v) break;
          ret = v;
          emit(scope.id, s.line, `return ${valText(v)}: the scope is discarded, unless a closure still references it.`);
        } else {
          emit(scope.id, s.line, `return: the scope is discarded, unless a closure still references it.`);
        }
        break;
      }
    }
    return ret;
  }

  /** Creation phase for the real global scope (no phantom scope). */
  function createGlobal(body: SStmt[]) {
    for (const s of body) {
      if (s.k === "decl" && !global.bindings.has(s.name)) {
        if (s.kind === "var") global.bindings.set(s.name, { kind: "var", value: { t: "undef" }, init: true });
        else global.bindings.set(s.name, { kind: s.kind, value: { t: "undef" }, init: false });
      }
    }
    for (const [fname, f] of funcs) {
      if (f.parent === null && !global.bindings.has(fname)) {
        global.bindings.set(fname, { kind: "function", value: { t: "func", name: fname, home: global.id }, init: true });
      }
    }
    emit(
      global.id, 0,
      "Creation phase for global: var is hoisted as undefined, function declarations are hoisted whole, let/const are created but locked in the temporal dead zone."
    );
  }

  createGlobal(entry);
  runBody(global, entry);
  emit(global.id, -1, halted ? "Execution stopped on an error." : "Program finished.");
  return { frames, errors };
}

/* ---------------- presets ---------------- */

const PRESETS = [
  {
    name: "Closure counter",
    code: `function makeCounter() {\n  let count = 0;\n  function inc() {\n    count = count + 1;\n    return count;\n  }\n  return inc;\n}\nconst c = makeCounter();\nconsole.log(c());\nconsole.log(c());`,
  },
  {
    name: "var hoisting gotcha",
    code: `var x = 1;\nfunction f() {\n  console.log(x);\n  var x = 2;\n  console.log(x);\n}\nf();`,
  },
  {
    name: "let dead zone",
    code: `function g() {\n  console.log(y);\n  let y = 3;\n}\ng();`,
  },
  {
    name: "Closure keeps scope alive",
    code: `function outer() {\n  const msg = "hi";\n  function inner() {\n    console.log(msg);\n  }\n  return inner;\n}\nconst fn = outer();\nfn();`,
  },
];

function ScopeVizTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("js-scope-visualizer", isPro);
  const seo = getToolSeo("js-scope-visualizer");

  const [code, setCode] = useState(PRESETS[0]!.code);
  const [applied, setApplied] = useState(PRESETS[0]!.code);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const parsed = useMemo(() => parseScope(applied), [applied]);
  const sim = useMemo(
    () => (parsed.errors.length ? { frames: [] as SFrame[], errors: [] as string[] } : simulateScope(parsed.funcs, parsed.entry)),
    [parsed]
  );

  useEffect(() => {
    setErrors([...parsed.errors, ...sim.errors]);
    setStep(0);
    setPlaying(false);
  }, [parsed, sim]);

  const timerRef = useRef<number | null>(null);
  useEffect(() => {
    if (!playing) return;
    timerRef.current = window.setInterval(() => {
      setStep((s) => {
        if (s >= sim.frames.length - 1) {
          if (timerRef.current !== null) window.clearInterval(timerRef.current);
          setPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, 1200);
    return () => { if (timerRef.current !== null) window.clearInterval(timerRef.current); };
  }, [playing, sim.frames.length]);

  const frame = sim.frames.length ? sim.frames[Math.min(step, sim.frames.length - 1)]! : null;

  const copyCode = async () => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(code);
      trial.recordUse();
      setCopied(true);
      toast.success("Code copied");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed in this browser");
    }
  };

  return (
    <ToolPageShell toolId="js-scope-visualizer" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Scope Visualizer" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Presets</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => { setCode(p.code); setApplied(p.code); }}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs font-bold transition",
                    applied === p.code
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  )}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Your code</p>
              <button
                type="button"
                onClick={copyCode}
                disabled={!trial.canUse}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:opacity-50"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              rows={14}
              className="w-full rounded-xl border border-border bg-background p-3 font-mono text-xs leading-relaxed outline-none focus:border-primary/60"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Subset: function () {"{...}"} (nesting ok), var/let/const, console.log, calls, return, + - *. No parameters yet.
            </p>
          </div>
          <ActionButton onClick={() => setApplied(code)}>
            <RotateCcw className="h-4 w-4" /> Apply and reset
          </ActionButton>
          {errors.length > 0 && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3">
              {errors.map((e, i) => (
                <p key={i} className="text-xs font-medium text-red-500">{e}</p>
              ))}
            </div>
          )}
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free runs left. Stepping through a trace is always free.
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              disabled={sim.frames.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {playing ? "Pause" : "Play"}
            </button>
            <button
              type="button"
              onClick={() => { setPlaying(false); setStep((s) => Math.max(0, s - 1)); }}
              disabled={sim.frames.length === 0 || step === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-bold transition hover:border-primary/40 disabled:opacity-50"
            >
              <StepBack className="h-4 w-4" /> Back
            </button>
            <button
              type="button"
              onClick={() => { setPlaying(false); setStep((s) => Math.min(sim.frames.length - 1, s + 1)); }}
              disabled={sim.frames.length === 0 || step >= sim.frames.length - 1}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-bold transition hover:border-primary/40 disabled:opacity-50"
            >
              <StepForward className="h-4 w-4" /> Step
            </button>
            <button
              type="button"
              onClick={() => { setPlaying(false); setStep(0); }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-bold transition hover:border-primary/40"
            >
              <RotateCcw className="h-4 w-4" /> Reset
            </button>
            <span className="ml-auto text-xs font-bold text-muted-foreground">
              {sim.frames.length ? `Step ${step + 1} of ${sim.frames.length}` : "No trace yet"}
            </span>
          </div>

          {frame && (
            <>
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-sm leading-relaxed">{frame.note}</p>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-2xl border border-border bg-card p-4">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Scope chain</p>
                  <div className="space-y-2">
                    {frame.scopes.map((s) => (
                      <div
                        key={s.id}
                        style={{ marginLeft: s.depth * 16 }}
                        className={cn(
                          "rounded-xl border-2 p-3 transition",
                          s.id === frame.current ? "border-primary bg-primary/5" : "border-border bg-card"
                        )}
                      >
                        <p className="mb-2 font-mono text-xs font-bold">
                          {s.name}
                          {s.id === frame.current && <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] uppercase text-primary">active</span>}
                        </p>
                        {s.bindings.length === 0 ? (
                          <p className="text-[11px] text-muted-foreground/60">no bindings</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {s.bindings.map((b) => (
                              <span
                                key={b.name}
                                title={b.tdz ? "Temporal dead zone" : b.kind}
                                className={cn(
                                  "rounded-lg px-2 py-1 font-mono text-[11px] font-bold",
                                  b.tdz
                                    ? "bg-red-500/15 text-red-500 line-through"
                                    : b.kind === "function"
                                      ? "bg-violet-500/15 text-violet-600 dark:text-violet-400"
                                      : "bg-muted text-muted-foreground"
                                )}
                              >
                                {b.kind === "function" ? "ƒ " : `${b.kind} `}{b.name}{b.tdz ? "" : `: ${b.value}`}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    <span className="font-bold text-red-500 line-through">struck</span> = temporal dead zone (declared, not yet usable).
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="rounded-xl border border-border bg-card p-3">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Source</p>
                    <pre className="max-h-72 overflow-auto rounded-lg bg-muted/40 p-3 font-mono text-[11px] leading-relaxed">
                      {parsed.lines.map((l, i) => (
                        <div key={i} className={cn("rounded px-1", frame.line === i && "bg-primary/15 font-bold text-primary")}>
                          <span className="mr-2 select-none text-muted-foreground/50">{String(i + 1).padStart(2, " ")}</span>
                          {l || " "}
                        </div>
                      ))}
                    </pre>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-3">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Console</p>
                    <div className="min-h-[48px] rounded-lg bg-black/90 p-3 font-mono text-xs leading-relaxed text-emerald-300">
                      {frame.out.length === 0 ? <span className="text-white/30">Nothing logged yet</span> : frame.out.map((o, i) => <div key={i}>&gt; {o}</div>)}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          <p className="text-xs text-muted-foreground">
            Simplified model: function-scoped only (no block scopes or parameters yet), but hoisting, the dead zone and lexical closures behave like the real language.
          </p>
        </div>
      </div>
    </ToolPageShell>
  );
}
