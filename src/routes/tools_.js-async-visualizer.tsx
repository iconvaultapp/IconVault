// /tools/js-async-visualizer - Watch async/await functions suspend and resume on
// animated lanes. A tiny real interpreter runs your code step by step.

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

export const Route = createFileRoute("/tools_/js-async-visualizer")({
  head: () => {
    const seo = getToolSeoMeta("js-async-visualizer");
    const canonical = "https://iconvault.site/tools/js-async-visualizer";
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
  component: AsyncVizTool,
});

/* ---------------- parser ---------------- */

type AStmt =
  | { k: "log"; line: number; text: string; isVar: boolean }
  | { k: "call"; line: number; target: string; assign?: string | undefined }
  | { k: "awaitSleep"; line: number; ms: number; assign?: string | undefined }
  | { k: "awaitVar"; line: number; name: string; assign?: string | undefined }
  | { k: "awaitCall"; line: number; target: string; assign?: string | undefined }
  | { k: "return"; line: number; value?: string | undefined; isVar?: boolean | undefined };

interface AFunc { name: string; async: boolean; body: AStmt[]; startLine: number; }

const LOG_RE = /^console\.log\(\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|(\w+))\s*\)$/;
const AWAIT_SLEEP_RE = /^(?:(?:const|let|var)\s+(\w+)\s*=\s*)?await\s+sleep\(\s*(\d+)\s*\)$/;
const AWAIT_CALL_RE = /^(?:(?:const|let|var)\s+(\w+)\s*=\s*)?await\s+(\w+)\(\s*\)$/;
const AWAIT_VAR_RE = /^(?:(?:const|let|var)\s+(\w+)\s*=\s*)?await\s+(\w+)$/;
const CALL_RE = /^(?:(?:const|let|var)\s+(\w+)\s*=\s*)?(\w+)\(\s*\)$/;
const RETURN_RE = /^return(?:\s+(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|(\d+(?:\.\d+)?)|(\w+)))?$/;

function parseAsync(src: string): { funcs: Map<string, AFunc>; entry: string[]; errors: string[]; lines: string[] } {
  const errors: string[] = [];
  const funcs = new Map<string, AFunc>();
  const entry: string[] = [];
  const rawLines = src.split("\n");
  const lines = rawLines.map((l) => l);

  let i = 0;
  const parseStmt = (text: string, line: number): AStmt | null => {
    const t = text.trim().replace(/;$/, "").trim();
    if (!t || t.startsWith("//")) return null;
    let m = t.match(LOG_RE);
    if (m) return { k: "log", line, text: m[1] ?? m[2] ?? m[3]!, isVar: m[3] !== undefined };
    m = t.match(AWAIT_SLEEP_RE);
    if (m) return { k: "awaitSleep", line, ms: parseInt(m[2]!, 10), assign: m[1] };
    m = t.match(AWAIT_CALL_RE);
    if (m) return { k: "awaitCall", line, target: m[2]!, assign: m[1] };
    m = t.match(AWAIT_VAR_RE);
    if (m) return { k: "awaitVar", line, name: m[2]!, assign: m[1] };
    m = t.match(CALL_RE);
    if (m) return { k: "call", line, target: m[2]!, assign: m[1] };
    m = t.match(RETURN_RE);
    if (m) {
      const value = m[1] ?? m[2] ?? m[3] ?? m[4];
      return { k: "return", line, value, isVar: m[4] !== undefined };
    }
    errors.push(`Line ${line + 1}: could not understand "${t.slice(0, 48)}".`);
    return null;
  };

  while (i < rawLines.length) {
    const line = rawLines[i]!;
    const fm = line.match(/^\s*(async\s+)?function\s+(\w+)\s*\(\s*\)\s*\{\s*$/);
    if (fm) {
      const name = fm[2]!;
      const body: AStmt[] = [];
      const startLine = i;
      i++;
      let depth = 1;
      while (i < rawLines.length && depth > 0) {
        const l = rawLines[i]!;
        for (const ch of l) {
          if (ch === "{") depth++;
          else if (ch === "}") depth--;
        }
        if (depth === 0) break;
        const st = parseStmt(l, i);
        if (st) body.push(st);
        i++;
      }
      if (depth !== 0) errors.push(`Function ${name} is missing its closing }.`);
      funcs.set(name, { name, async: fm[1] !== undefined, body, startLine });
      i++;
      continue;
    }
    const t = line.trim().replace(/;$/, "").trim();
    if (t && !t.startsWith("//")) {
      const cm = t.match(/^(\w+)\(\s*\)$/);
      if (cm) entry.push(cm[1]!);
      else errors.push(`Line ${i + 1}: only function declarations and top-level calls like main() are supported.`);
    }
    i++;
  }
  return { funcs, entry, errors, lines };
}

/* ---------------- interpreter ---------------- */

type Value = { t: "str"; v: string } | { t: "num"; v: number } | { t: "prom"; id: number } | { t: "undef" };

interface PromiseObj { id: number; label: string; state: "pending" | "fulfilled"; value: Value; waiters: FrameObj[]; }

interface FrameObj {
  id: number;
  func: AFunc;
  pc: number;
  locals: Map<string, Value>;
  status: "running" | "suspended" | "done";
  retPromise?: PromiseObj;
  awaitDep?: PromiseObj;
  awaitAssign?: string | undefined;
  awaitKind?: string;
}

interface AFrame {
  lanes: { id: number; name: string; status: string; at: string }[];
  line: number;
  note: string;
  time: number;
  out: string[];
  micros: string[];
  timers: { label: string; ms: number }[];
}

function valText(v: Value, promises: Map<number, PromiseObj>): string {
  if (v.t === "str") return `"${v.v}"`;
  if (v.t === "num") return String(v.v);
  if (v.t === "prom") {
    const p = promises.get(v.id);
    return p ? `Promise(${p.label}, ${p.state})` : "Promise(?)";
  }
  return "undefined";
}

function simulateAsync(funcs: Map<string, AFunc>, entry: string[]): { frames: AFrame[]; errors: string[] } {
  const errors: string[] = [];
  const frames: AFrame[] = [];
  const allFrames: FrameObj[] = [];
  const promises = new Map<number, PromiseObj>();
  const timers: { label: string; ms: number; prom: PromiseObj }[] = [];
  const micros: { label: string; run: () => void }[] = [];
  const out: string[] = [];
  let time = 0;
  let fid = 0;
  let pid = 0;

  const snap = (line: number, note: string): AFrame => ({
    lanes: allFrames.map((f) => ({
      id: f.id,
      name: `${f.func.name}()`,
      status: f.status,
      at: f.status === "done" ? "returned" : f.pc < f.func.body.length ? stmtText(f.func.body[f.pc]!) : "done",
    })),
    line,
    note,
    time,
    out: [...out],
    micros: micros.map((m) => m.label),
    timers: timers.map((t) => ({ label: t.label, ms: t.ms })),
  });
  const emit = (line: number, note: string) => {
    if (frames.length < 400) frames.push(snap(line, note));
  };

  const newPromise = (label: string): PromiseObj => {
    const p: PromiseObj = { id: ++pid, label, state: "pending", value: { t: "undef" }, waiters: [] };
    promises.set(p.id, p);
    return p;
  };

  function fulfill(p: PromiseObj, value: Value) {
    if (p.state === "fulfilled") return;
    p.state = "fulfilled";
    p.value = value;
    for (const w of p.waiters) {
      micros.push({ label: `resume ${w.func.name}()`, run: () => resume(w) });
    }
    p.waiters = [];
  }

  function stmtText(s: AStmt): string {
    switch (s.k) {
      case "log": return s.isVar ? `console.log(${s.text})` : `console.log("${s.text}")`;
      case "call": return `${s.assign ? `const ${s.assign} = ` : ""}${s.target}()`;
      case "awaitSleep": return `${s.assign ? `const ${s.assign} = ` : ""}await sleep(${s.ms})`;
      case "awaitVar": return `${s.assign ? `const ${s.assign} = ` : ""}await ${s.name}`;
      case "awaitCall": return `${s.assign ? `const ${s.assign} = ` : ""}await ${s.target}()`;
      case "return": return s.value === undefined ? "return" : `return ${s.value}`;
    }
  }

  function finishFrame(f: FrameObj, value: Value, line: number) {
    f.status = "done";
    if (f.retPromise) {
      fulfill(f.retPromise, value);
      emit(line, `${f.func.name}() returns ${valText(value, promises)}: its promise fulfills, waking anyone awaiting it.`);
    } else {
      emit(line, `${f.func.name}() returns ${valText(value, promises)}.`);
    }
  }

  function suspendOn(f: FrameObj, dep: PromiseObj, assign: string | undefined, kind: string, line: number) {
    f.status = "suspended";
    f.awaitDep = dep;
    f.awaitAssign = assign;
    f.awaitKind = kind;
    emit(
      line,
      `${f.func.name}() hits await (${kind}): it SUSPENDS, freezing its locals, and control returns to the caller. The rest of the function becomes a continuation.`
    );
    if (dep.state === "fulfilled") {
      micros.push({ label: `resume ${f.func.name}()`, run: () => resume(f) });
    } else {
      dep.waiters.push(f);
    }
  }

  function resume(f: FrameObj) {
    const dep = f.awaitDep!;
    f.status = "running";
    if (f.awaitAssign) f.locals.set(f.awaitAssign, dep.value);
    f.pc++;
    const line = f.pc - 1 < f.func.body.length ? f.func.body[f.pc - 1]!.line : f.func.startLine;
    emit(line, `${f.func.name}() RESUMES: the awaited ${f.awaitKind} settled with ${valText(dep.value, promises)}, so the continuation runs as a microtask.`);
    execute(f);
  }

  function invoke(caller: FrameObj | null, target: string, line: number): Value {
    const fn = funcs.get(target);
    if (!fn) {
      errors.push(`Unknown function "${target}".`);
      return { t: "undef" };
    }
    if (target === "sleep") {
      errors.push(`sleep() can only be used with await.`);
      return { t: "undef" };
    }
    const f: FrameObj = { id: ++fid, func: fn, pc: 0, locals: new Map(), status: "running" };
    allFrames.push(f);
    let retP: PromiseObj | undefined;
    if (fn.async) {
      retP = newPromise(`${target}()`);
      f.retPromise = retP;
    }
    emit(line, `${caller ? `${caller.func.name}()` : "Top level"} calls ${target}(): a new frame opens on its own lane.`);
    execute(f);
    if (fn.async) return { t: "prom", id: retP!.id };
    return f.locals.get("__ret") ?? { t: "undef" };
  }

  function resolveLogText(s: { text: string; isVar: boolean }, f: FrameObj): string {
    if (!s.isVar) return s.text;
    const v = f.locals.get(s.text);
    return v ? valText(v, promises) : `undefined (${s.text} is not set)`;
  }

  function execute(f: FrameObj) {
    while (f.pc < f.func.body.length && f.status === "running") {
      const s = f.func.body[f.pc]!;
      if (s.k === "log") {
        const text = resolveLogText(s, f);
        out.push(text);
        emit(s.line, `console.log runs synchronously inside ${f.func.name}().`);
        f.pc++;
      } else if (s.k === "call") {
        const v = invoke(f, s.target, s.line);
        if (s.assign) f.locals.set(s.assign, v);
        f.pc++;
      } else if (s.k === "awaitSleep") {
        const p = newPromise(`sleep(${s.ms})`);
        timers.push({ label: `sleep(${s.ms})`, ms: s.ms, prom: p });
        emit(s.line, `await sleep(${s.ms}): a timer starts in Web APIs. Nothing blocks: the thread is free.`);
        suspendOn(f, p, s.assign, `sleep(${s.ms})`, s.line);
        return;
      } else if (s.k === "awaitVar") {
        const v = f.locals.get(s.name);
        if (!v || v.t !== "prom") {
          errors.push(`Line ${s.line + 1}: can only await a promise, but "${s.name}" is not one.`);
          f.status = "done";
          return;
        }
        suspendOn(f, promises.get(v.id)!, s.assign, `promise ${s.name}`, s.line);
        return;
      } else if (s.k === "awaitCall") {
        const v = invoke(f, s.target, s.line);
        if (v.t !== "prom") {
          errors.push(`Line ${s.line + 1}: await ${s.target}() did not return a promise.`);
          f.status = "done";
          return;
        }
        if (s.assign) f.locals.set(s.assign, v);
        suspendOn(f, promises.get(v.id)!, undefined, `${s.target}()`, s.line);
        return;
      } else {
        let v: Value = { t: "undef" };
        if (s.value !== undefined) {
          if (s.isVar) v = f.locals.get(s.value) ?? { t: "undef" };
          else if (/^\d+(\.\d+)?$/.test(s.value)) v = { t: "num", v: parseFloat(s.value) };
          else v = { t: "str", v: s.value };
        }
        f.locals.set("__ret", v);
        finishFrame(f, v, s.line);
        return;
      }
    }
    if (f.status === "running") {
      const v = f.locals.get("__ret") ?? { t: "undef" };
      finishFrame(f, v, f.func.body.length ? f.func.body[f.func.body.length - 1]!.line : f.func.startLine);
    }
  }

  for (const name of entry) {
    if (name === "sleep") {
      errors.push("sleep() can only be used with await inside a function.");
      continue;
    }
    invoke(null, name, funcs.get(name)?.startLine ?? 0);
  }

  let guard = 0;
  while (guard++ < 300) {
    while (micros.length) {
      const m = micros.shift()!;
      m.run();
    }
    const active = allFrames.some((f) => f.status === "suspended");
    if (!active) break;
    if (!timers.length) {
      errors.push("Deadlock: a function awaits something that never settles.");
      break;
    }
    const min = Math.min(...timers.map((t) => t.ms));
    time += min;
    for (const t of timers) t.ms -= min;
    const due = timers.filter((t) => t.ms <= 0);
    for (const d of due) {
      const idx = timers.indexOf(d);
      if (idx >= 0) timers.splice(idx, 1);
      emit(-1, `Timer ${d.label} fires after ${time}ms: its promise fulfills, queueing continuations as microtasks.`);
      fulfill(d.prom, { t: "str", v: "slept" });
    }
  }
  emit(-1, "All functions settled: every lane is done.");
  return { frames, errors };
}

/* ---------------- presets ---------------- */

const PRESETS = [
  {
    name: "Sequential awaits",
    code: `async function fetchUser() {\n  console.log("fetchUser: start");\n  await sleep(800);\n  console.log("fetchUser: got user");\n  return "Ada";\n}\nasync function fetchPosts() {\n  console.log("fetchPosts: start");\n  await sleep(500);\n  console.log("fetchPosts: got posts");\n  return "3 posts";\n}\nasync function main() {\n  console.log("main: start");\n  const user = await fetchUser();\n  const posts = await fetchPosts();\n  console.log("main: done");\n}\nmain();`,
  },
  {
    name: "Parallel then join",
    code: `async function loadA() {\n  await sleep(900);\n  console.log("A ready");\n  return "a";\n}\nasync function loadB() {\n  await sleep(400);\n  console.log("B ready");\n  return "b";\n}\nasync function main() {\n  console.log("main: start both");\n  const pa = loadA();\n  const pb = loadB();\n  console.log("main: waiting");\n  const a = await pa;\n  const b = await pb;\n  console.log("main: both done");\n}\nmain();`,
  },
  {
    name: "Nested calls",
    code: `async function inner() {\n  console.log("inner: working");\n  await sleep(300);\n  console.log("inner: done");\n  return 42;\n}\nasync function outer() {\n  console.log("outer: before inner");\n  const v = await inner();\n  console.log("outer: after inner");\n  return v;\n}\nasync function main() {\n  console.log("main: start");\n  const r = await outer();\n  console.log("main: end");\n}\nmain();`,
  },
];

const LANE_STYLE: Record<string, string> = {
  running: "border-primary bg-primary/10 text-primary",
  suspended: "border-amber-500/60 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  done: "border-border bg-muted/40 text-muted-foreground",
};
const LANE_DOT: Record<string, string> = {
  running: "bg-primary animate-pulse",
  suspended: "bg-amber-500",
  done: "bg-muted-foreground/40",
};

function AsyncVizTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("js-async-visualizer", isPro);
  const seo = getToolSeo("js-async-visualizer");

  const [code, setCode] = useState(PRESETS[0]!.code);
  const [applied, setApplied] = useState(PRESETS[0]!.code);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const runId = useRef(0);

  const parsed = useMemo(() => parseAsync(applied), [applied]);
  const sim = useMemo(
    () => (parsed.errors.length ? { frames: [] as AFrame[], errors: [] as string[] } : simulateAsync(parsed.funcs, parsed.entry)),
    [parsed]
  );

  useEffect(() => {
    setErrors([...parsed.errors, ...sim.errors]);
    setStep(0);
    setPlaying(false);
  }, [parsed, sim]);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setStep((s) => {
        if (s >= sim.frames.length - 1) {
          window.clearInterval(id);
          setPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, 1100);
    return () => window.clearInterval(id);
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
    <ToolPageShell toolId="js-async-visualizer" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Async Visualizer" left={trial.left} />

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
              rows={16}
              className="w-full rounded-xl border border-border bg-background p-3 font-mono text-xs leading-relaxed outline-none focus:border-primary/60"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Subset: async functions, console.log, calls, return, await sleep(ms), await promise. No arguments yet.
            </p>
          </div>
          <ActionButton onClick={() => { runId.current++; setApplied(code); }}>
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
                <p className="mt-1 font-mono text-xs text-muted-foreground">virtual time: {frame.time}ms</p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Function lanes</p>
                <div className="space-y-2">
                  {frame.lanes.map((l) => (
                    <div key={l.id} className={cn("flex items-center gap-3 rounded-xl border px-3 py-2.5 transition", LANE_STYLE[l.status] ?? "border-border")}>
                      <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", LANE_DOT[l.status] ?? "bg-muted-foreground/40")} />
                      <span className="font-mono text-sm font-bold">{l.name}</span>
                      <span className="rounded-full bg-black/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide dark:bg-white/10">
                        {l.status}
                      </span>
                      <span className="ml-auto truncate font-mono text-xs opacity-70">{l.at}</span>
                    </div>
                  ))}
                  {frame.lanes.length === 0 && <p className="text-xs text-muted-foreground">No functions called yet.</p>}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-border bg-card p-3">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Source</p>
                  <pre className="max-h-64 overflow-auto rounded-lg bg-muted/40 p-3 font-mono text-[11px] leading-relaxed">
                    {parsed.lines.map((l, i) => (
                      <div key={i} className={cn("rounded px-1", frame.line === i && "bg-primary/15 font-bold text-primary")}>
                        <span className="mr-2 select-none text-muted-foreground/50">{String(i + 1).padStart(2, " ")}</span>
                        {l || " "}
                      </div>
                    ))}
                  </pre>
                </div>
                <div className="space-y-3">
                  <div className="rounded-xl border border-border bg-card p-3">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Microtasks (continuations)</p>
                    <div className="flex min-h-[36px] flex-wrap content-start gap-1.5">
                      {frame.micros.length === 0 ? (
                        <span className="text-xs text-muted-foreground/60">Empty</span>
                      ) : (
                        frame.micros.map((m, i) => (
                          <span key={i} className="rounded-lg bg-violet-500/15 px-2.5 py-1.5 font-mono text-xs font-bold text-violet-600 dark:text-violet-400">{m}</span>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-3">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Timers (Web APIs)</p>
                    <div className="flex min-h-[36px] flex-wrap content-start gap-1.5">
                      {frame.timers.length === 0 ? (
                        <span className="text-xs text-muted-foreground/60">Empty</span>
                      ) : (
                        frame.timers.map((t, i) => (
                          <span key={i} className="rounded-lg bg-amber-500/15 px-2.5 py-1.5 font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                            {t.label} · {t.ms}ms
                          </span>
                        ))
                      )}
                    </div>
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
            Simplified model: await always yields through the microtask queue, even for already-settled promises, which is exactly what real engines do. Real scheduling also interleaves rendering and I/O.
          </p>
        </div>
      </div>
    </ToolPageShell>
  );
}
