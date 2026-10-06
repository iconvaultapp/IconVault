// /tools/regex-engine-visualizer - Watch a backtracking regex engine work.
// A simplified NFA-style simulator: type a pattern and test string, then step
// through every match attempt, backtrack and capture, token by token.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Play, Pause, StepForward, StepBack, RotateCcw, Copy, Braces } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/regex-engine-visualizer";
import toolSeoMeta from "@/lib/tool-seo-meta-data/regex-engine-visualizer";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/regex-engine-visualizer")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/regex-engine-visualizer";
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
  component: RegexEngineLab,
});

/* ---------------- simplified regex engine ---------------- */

interface RxBase {
  id: number;
  raw: string;
}
type RxNode = RxBase &
  (
    | { kind: "lit"; ch: string }
    | { kind: "dot" }
    | { kind: "class"; chars: string; neg: boolean }
    | { kind: "start" }
    | { kind: "end" }
    | { kind: "group"; idx: number; children: RxNode[] }
    | { kind: "quant"; child: RxNode; min: number; max: number }
    | { kind: "alt"; branches: RxNode[][] }
  );

type StepKind = "try" | "ok" | "fail" | "back" | "info" | "done";
interface RxStep {
  n: number;
  kind: StepKind;
  pos: number;
  nodeId: number;
  text: string;
}
interface RxFlags {
  i: boolean;
  m: boolean;
  s: boolean;
}
interface EngineResult {
  error?: string;
  top: RxNode[];
  steps: RxStep[];
  capped: boolean;
  matched: boolean;
  start: number;
  end: number;
  groups: { idx: number; text: string }[];
}

const MAX_STEPS = 600;

function disp(ch: string): string {
  if (ch === "\n") return "\\n";
  if (ch === "\t") return "\\t";
  if (ch === "\r") return "\\r";
  return ch;
}
function eq(a: string, b: string, ci: boolean): boolean {
  return ci ? a.toLowerCase() === b.toLowerCase() : a === b;
}

/** escape -> expanded char set (or a plain literal) */
function escapeToClass(e: string): { chars: string; neg: boolean } | { lit: string } {
  switch (e) {
    case "d":
      return { chars: "0123456789", neg: false };
    case "D":
      return { chars: "0123456789", neg: true };
    case "w":
      return { chars: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_", neg: false };
    case "W":
      return { chars: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_", neg: true };
    case "s":
      return { chars: " \t\n\r\f\v", neg: false };
    case "S":
      return { chars: " \t\n\r\f\v", neg: true };
    case "n":
      return { lit: "\n" };
    case "t":
      return { lit: "\t" };
    case "r":
      return { lit: "\r" };
    case "f":
      return { lit: "\f" };
    case "v":
      return { lit: "\v" };
    default:
      return { lit: e };
  }
}

function parseRx(p: string): RxNode[] {
  let seq = 0;
  let i = 0;
  let groupCount = 0;
  const nid = () => seq++;

  function parseSeq(stop: string): RxNode[][] {
    const branches: RxNode[][] = [[]];
    while (i < p.length && !stop.includes(p[i]!)) {
      if (p[i] === "|") {
        i++;
        branches.push([]);
        continue;
      }
      let atom = parseAtom();
      atom = applyQuant(atom);
      branches[branches.length - 1]!.push(atom);
    }
    return branches;
  }

  function parseAtom(): RxNode {
    const c = p[i]!;
    if (c === "(") {
      const start = i;
      i++;
      const idx = ++groupCount;
      const branches = parseSeq(")");
      if (p[i] !== ")") throw new Error("Unbalanced ( in pattern");
      i++;
      const children: RxNode[] =
        branches.length > 1 ? [{ id: nid(), raw: p.slice(start, i), kind: "alt", branches }] : branches[0]!;
      return { id: nid(), raw: p.slice(start, i), kind: "group", idx, children };
    }
    if (c === "[") return parseClass();
    if (c === "\\") {
      const start = i;
      i++;
      const e = p[i];
      if (e === undefined) throw new Error("Trailing backslash in pattern");
      if (/[0-9]/.test(e)) throw new Error("Backreferences are not supported in this simplified engine");
      i++;
      const r = escapeToClass(e);
      if ("chars" in r) return { id: nid(), raw: p.slice(start, i), kind: "class", chars: r.chars, neg: r.neg };
      return { id: nid(), raw: p.slice(start, i), kind: "lit", ch: r.lit };
    }
    if (c === ".") {
      i++;
      return { id: nid(), raw: ".", kind: "dot" };
    }
    if (c === "^") {
      i++;
      return { id: nid(), raw: "^", kind: "start" };
    }
    if (c === "$") {
      i++;
      return { id: nid(), raw: "$", kind: "end" };
    }
    if (c === ")") throw new Error("Unbalanced ) in pattern");
    i++;
    return { id: nid(), raw: c, kind: "lit", ch: c };
  }

  function applyQuant(atom: RxNode): RxNode {
    const c = p[i];
    if (c === "*" || c === "+" || c === "?") {
      i++;
      const min = c === "+" ? 1 : 0;
      const max = c === "?" ? 1 : -1;
      return { id: nid(), raw: atom.raw + c, kind: "quant", child: atom, min, max };
    }
    if (c === "{") {
      const m = /^\{(\d+)(,(\d+)?)?\}/.exec(p.slice(i));
      if (!m) throw new Error("Bad quantifier");
      i += m[0].length;
      const min = parseInt(m[1]!, 10);
      const max = m[2] === undefined ? min : m[3] === undefined ? -1 : parseInt(m[3]!, 10);
      if (max !== -1 && max < min) throw new Error("Bad quantifier range");
      return { id: nid(), raw: atom.raw + m[0], kind: "quant", child: atom, min, max };
    }
    return atom;
  }

  function parseClass(): RxNode {
    const start = i;
    i++; // [
    let neg = false;
    if (p[i] === "^") {
      neg = true;
      i++;
    }
    const parts: string[] = [];
    const excluded: string[] = [];
    let closed = false;
    while (i < p.length) {
      const c = p[i]!;
      if (c === "]") {
        i++;
        closed = true;
        break;
      }
      let ch: string;
      if (c === "\\") {
        i++;
        const e = p[i] ?? "";
        i++;
        const r = escapeToClass(e);
        if ("chars" in r) {
          if (r.neg) excluded.push(r.chars);
          else parts.push(r.chars);
          continue;
        }
        ch = r.lit;
      } else {
        i++;
        ch = c;
      }
      if (p[i] === "-" && p[i + 1] !== undefined && p[i + 1] !== "]") {
        i++;
        let endCh: string;
        if (p[i] === "\\") {
          i++;
          const e2 = p[i] ?? "";
          i++;
          const r2 = escapeToClass(e2);
          endCh = "chars" in r2 ? r2.chars[0] ?? "" : r2.lit;
        } else {
          endCh = p[i]!;
          i++;
        }
        const a = ch.charCodeAt(0);
        const b = endCh.charCodeAt(0);
        let s = "";
        for (let k = Math.min(a, b); k <= Math.max(a, b); k++) s += String.fromCharCode(k);
        parts.push(s);
      } else {
        parts.push(ch);
      }
    }
    if (!closed) throw new Error("Unbalanced [ in pattern");
    let chars = parts.join("");
    if (excluded.length > 0) {
      const ex = new Set(excluded.join(""));
      chars = [...chars].filter((x) => !ex.has(x)).join("");
    }
    return { id: nid(), raw: p.slice(start, i), kind: "class", chars, neg };
  }

  const branches = parseSeq("");
  const top = branches.length > 1 ? [{ id: nid(), raw: p, kind: "alt" as const, branches }] : branches[0]!;
  return top;
}

interface Ctx {
  text: string;
  flags: RxFlags;
  steps: RxStep[];
  groups: Map<number, [number, number]>;
  capped: boolean;
}

function log(ctx: Ctx, kind: StepKind, pos: number, nodeId: number, text: string) {
  if (ctx.steps.length >= MAX_STEPS) {
    ctx.capped = true;
    return;
  }
  ctx.steps.push({ n: ctx.steps.length + 1, kind, pos, nodeId, text });
}

function matchOne(node: RxNode, pos: number, ctx: Ctx): number {
  const t = ctx.text;
  switch (node.kind) {
    case "lit": {
      const c = t[pos];
      if (c !== undefined && eq(c, node.ch, ctx.flags.i)) {
        log(ctx, "ok", pos, node.id, `match '${disp(node.ch)}' at index ${pos}`);
        return pos + 1;
      }
      log(ctx, "fail", pos, node.id, `'${disp(node.ch)}' vs '${disp(c ?? "end of string")}' at ${pos} - no match`);
      return -1;
    }
    case "dot": {
      const c = t[pos];
      if (c !== undefined && (ctx.flags.s || c !== "\n")) {
        log(ctx, "ok", pos, node.id, `dot matches '${disp(c)}' at index ${pos}`);
        return pos + 1;
      }
      log(ctx, "fail", pos, node.id, "dot needs a character - no match");
      return -1;
    }
    case "class": {
      const c = t[pos];
      if (c !== undefined) {
        const inSet = ctx.flags.i
          ? node.chars.toLowerCase().includes(c.toLowerCase())
          : node.chars.includes(c);
        const hit = node.neg ? !inSet : inSet;
        if (hit) {
          log(ctx, "ok", pos, node.id, `class ${node.raw} matches '${disp(c)}' at ${pos}`);
          return pos + 1;
        }
      }
      log(ctx, "fail", pos, node.id, `class ${node.raw} vs '${disp(c ?? "end of string")}' at ${pos} - no match`);
      return -1;
    }
    case "start": {
      const ok = pos === 0 || (ctx.flags.m && pos > 0 && t[pos - 1] === "\n");
      log(ctx, ok ? "ok" : "fail", pos, node.id, ok ? "^ anchor holds here" : "^ anchor fails here");
      return ok ? pos : -1;
    }
    case "end": {
      const ok = pos === t.length || (ctx.flags.m && t[pos] === "\n");
      log(ctx, ok ? "ok" : "fail", pos, node.id, ok ? "$ anchor holds here" : "$ anchor fails here");
      return ok ? pos : -1;
    }
    case "group": {
      ctx.groups.set(node.idx, [pos, -1]);
      log(ctx, "info", pos, node.id, `enter group ${node.idx}`);
      const r = matchFrom(node.children, 0, pos, ctx);
      if (r === -1) {
        ctx.groups.delete(node.idx);
        log(ctx, "fail", pos, node.id, `group ${node.idx} failed`);
        return -1;
      }
      ctx.groups.set(node.idx, [pos, r]);
      log(ctx, "ok", pos, node.id, `group ${node.idx} captured "${t.slice(pos, r)}"`);
      return r;
    }
    case "alt": {
      for (let b = 0; b < node.branches.length; b++) {
        log(ctx, "info", pos, node.id, `alternation: try branch ${b + 1}`);
        const r = matchFrom(node.branches[b]!, 0, pos, ctx);
        if (r !== -1) {
          log(ctx, "ok", pos, node.id, `branch ${b + 1} matched`);
          return r;
        }
      }
      log(ctx, "fail", pos, node.id, "no alternation branch matched");
      return -1;
    }
    case "quant":
      return -2; // handled in matchFrom
  }
}

function matchFrom(nodes: RxNode[], idx: number, pos: number, ctx: Ctx): number {
  if (ctx.capped) return -1;
  if (idx >= nodes.length) return pos;
  const node = nodes[idx]!;
  if (node.kind === "quant") {
    const marks: number[] = [pos];
    let cur = pos;
    for (let iter = 0; iter < 400; iter++) {
      if (node.max !== -1 && marks.length - 1 >= node.max) break;
      const np = matchOne(node.child, cur, ctx);
      if (np === -1 || np === cur) break;
      cur = np;
      marks.push(cur);
    }
    const maxK = marks.length - 1;
    for (let k = maxK; k >= node.min; k--) {
      log(ctx, "info", marks[k]!, node.id, `${node.raw}: greedy, try ${k} repetition${k === 1 ? "" : "s"}`);
      const r = matchFrom(nodes, idx + 1, marks[k]!, ctx);
      if (r !== -1) return r;
      if (k > node.min)
        log(ctx, "back", marks[k]!, node.id, `backtrack: give up one repetition of ${node.child.raw}`);
    }
    log(ctx, "fail", pos, node.id, `${node.raw} could not satisfy the rest of the pattern`);
    return -1;
  }
  const np = matchOne(node, pos, ctx);
  if (np === -1) return -1;
  return matchFrom(nodes, idx + 1, np, ctx);
}

function collectIds(node: RxNode, out: Set<number>) {
  out.add(node.id);
  if (node.kind === "group") node.children.forEach((c) => collectIds(c, out));
  if (node.kind === "quant") collectIds(node.child, out);
  if (node.kind === "alt") node.branches.forEach((b) => b.forEach((c) => collectIds(c, out)));
}

function runEngine(pattern: string, flags: RxFlags, text: string): EngineResult {
  const empty: EngineResult = { top: [], steps: [], capped: false, matched: false, start: 0, end: 0, groups: [] };
  if (pattern.length === 0) return { ...empty, error: "Type a pattern to start." };
  if (pattern.length > 80) return { ...empty, error: "Pattern is too long for this lab (80 chars max)." };
  if (text.length > 120) return { ...empty, error: "Test string is too long for this lab (120 chars max)." };
  const flagStr = (flags.i ? "i" : "") + (flags.m ? "m" : "") + (flags.s ? "s" : "");
  try {
    new RegExp(pattern, flagStr);
  } catch {
    return { ...empty, error: "That pattern is not valid JavaScript regex syntax." };
  }
  if (/\(\?/.test(pattern))
    return { ...empty, error: "Lookarounds (like (?=...)) are not simulated in this simplified engine." };
  let top: RxNode[];
  try {
    top = parseRx(pattern);
  } catch (e) {
    return { ...empty, error: e instanceof Error ? e.message : "Could not parse pattern." };
  }
  const ctx: Ctx = { text, flags, steps: [], groups: new Map(), capped: false };
  let matched = false;
  let start = 0;
  let end = 0;
  for (let s = 0; s <= text.length; s++) {
    ctx.groups = new Map();
    log(ctx, "try", s, -1, `engine: try a match starting at index ${s}`);
    const r = matchFrom(top, 0, s, ctx);
    if (r !== -1) {
      matched = true;
      start = s;
      end = r;
      log(ctx, "done", r, -1, `match found: "${text.slice(s, r)}" at ${s}-${r}`);
      break;
    }
    if (ctx.capped) break;
  }
  if (!matched && !ctx.capped) log(ctx, "done", 0, -1, "no match anywhere in the string");
  const groups: { idx: number; text: string }[] = [];
  ctx.groups.forEach(([gs, ge], idx) => {
    if (ge >= 0) groups.push({ idx, text: text.slice(gs, ge) });
  });
  groups.sort((a, b) => a.idx - b.idx);
  return { top, steps: ctx.steps, capped: ctx.capped, matched, start, end, groups };
}

/* ---------------- presets ---------------- */

const PRESETS = [
  { name: "Email-ish", pattern: "(\\w+)@(\\w+)\\.com", flags: { i: false, m: false, s: false }, text: "mail sam@example.com today" },
  { name: "Phone parts", pattern: "(\\d{3})-(\\d{4})", flags: { i: false, m: false, s: false }, text: "Call 415-5555 or 212-0000" },
  { name: "Backtracking", pattern: "a+ab", flags: { i: false, m: false, s: false }, text: "aaab" },
  { name: "Alternation", pattern: "\\b(cat|dog)s?\\b", flags: { i: false, m: false, s: false }, text: "cats and dogs" },
];

/* ---------------- component ---------------- */

const STEP_STYLE: Record<StepKind, string> = {
  try: "border-sky-500/40 bg-sky-500/10 text-sky-300",
  ok: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  fail: "border-rose-500/40 bg-rose-500/10 text-rose-300",
  back: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  info: "border-border bg-muted/40 text-muted-foreground",
  done: "border-primary/50 bg-primary/10 text-primary",
};

function RegexEngineLab() {
  const { isPro } = usePlan();
  const trial = useToolTrial("regex-engine-visualizer", isPro);
  const seo = toolSeo;

  const [pattern, setPattern] = useState("(\\w+)@(\\w+)\\.com");
  const [flags, setFlags] = useState<RxFlags>({ i: false, m: false, s: false });
  const [text, setText] = useState("mail sam@example.com today");
  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(4);
  const [copied, setCopied] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const result = useMemo(() => runEngine(pattern, flags, text), [pattern, flags, text]);
  const steps = result.steps;
  const total = steps.length;

  useEffect(() => {
    setStepIdx(0);
    setPlaying(false);
  }, [pattern, flags, text]);

  useEffect(() => {
    if (!playing) return;
    if (stepIdx >= total - 1) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setStepIdx((s) => Math.min(s + 1, total - 1)), 1000 / speed);
    return () => clearTimeout(t);
  }, [playing, stepIdx, speed, total]);

  const cur = steps[Math.min(stepIdx, total - 1)];

  const tokenSets = useMemo(() => {
    return result.top.map((n) => {
      const s = new Set<number>();
      collectIds(n, s);
      return s;
    });
  }, [result.top]);

  useEffect(() => {
    const el = logRef.current?.querySelector(`[data-step="${stepIdx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [stepIdx]);

  const copyTrace = useCallback(() => {
    if (!trial.canUse) return;
    const flagStr = (flags.i ? "i" : "") + (flags.m ? "m" : "") + (flags.s ? "s" : "");
    const lines = [
      `Pattern: /${pattern}/${flagStr}`,
      `Test string: "${text}"`,
      `Result: ${result.matched ? `match "${text.slice(result.start, result.end)}" at ${result.start}-${result.end}` : "no match"}`,
      ...result.groups.map((g) => `Group ${g.idx}: "${g.text}"`),
      "",
      ...steps.map((s) => `Step ${s.n} [pos ${s.pos}] ${s.kind.toUpperCase()}: ${s.text}`),
      "",
      "Simulated with IconVault Regex Engine Lab (simplified backtracking model).",
    ];
    void navigator.clipboard.writeText(lines.join("\n")).then(() => {
      trial.recordUse();
      setCopied(true);
      toast.success("Trace copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    });
  }, [pattern, flags, text, result, steps, trial]);

  const setFlag = (k: keyof RxFlags) => setFlags((f) => ({ ...f, [k]: !f[k] }));

  return (
    <ToolPageShell toolId="regex-engine-visualizer" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Regex Engine" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* controls */}
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Pattern</label>
            <div className="flex items-center gap-1 rounded-xl border border-border bg-background px-3">
              <span className="font-mono text-muted-foreground">/</span>
              <input
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                spellCheck={false}
                className="w-full bg-transparent py-2.5 font-mono text-sm outline-none"
                placeholder="a+b"
              />
              <span className="font-mono text-muted-foreground">/</span>
            </div>
            <div className="mt-2 flex gap-2">
              {(["i", "m", "s"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFlag(f)}
                  title={f === "i" ? "case-insensitive" : f === "m" ? "multiline ^$" : "dot matches newlines"}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 font-mono text-xs font-bold transition",
                    flags[f]
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Test string</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              spellCheck={false}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary/60"
            />
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Presets</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => {
                    setPattern(p.pattern);
                    setFlags(p.flags);
                    setText(p.text);
                  }}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* playback */}
          <div className="rounded-xl border border-border bg-background p-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStepIdx(0)}
                className="rounded-lg border border-border p-2 text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
                title="Reset"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setStepIdx((s) => Math.max(0, s - 1))}
                disabled={stepIdx === 0}
                className="rounded-lg border border-border p-2 text-muted-foreground transition hover:border-primary/50 hover:text-foreground disabled:opacity-40"
                title="Step back"
              >
                <StepBack className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setPlaying((p) => !p)}
                disabled={total === 0}
                className="rounded-lg bg-primary p-2.5 text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
                title={playing ? "Pause" : "Play"}
              >
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={() => setStepIdx((s) => Math.min(total - 1, s + 1))}
                disabled={stepIdx >= total - 1}
                className="rounded-lg border border-border p-2 text-muted-foreground transition hover:border-primary/50 hover:text-foreground disabled:opacity-40"
                title="Step forward"
              >
                <StepForward className="h-4 w-4" />
              </button>
              <span className="ml-auto font-mono text-xs text-muted-foreground">
                {total === 0 ? "0 / 0" : `${stepIdx + 1} / ${total}`}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={Math.max(0, total - 1)}
              value={stepIdx}
              onChange={(e) => {
                setStepIdx(Number(e.target.value));
                setPlaying(false);
              }}
              className="mt-3 w-full accent-primary"
            />
            <div className="mt-2 flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Speed</span>
              <input
                type="range"
                min={1}
                max={20}
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <span className="font-mono text-xs text-muted-foreground">{speed}/s</span>
            </div>
          </div>

          <ActionButton disabled={!trial.canUse || total === 0} onClick={copyTrace}>
            {copied ? <Braces className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy engine trace"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left - everything runs locally in your browser.
            </p>
          )}
        </div>

        {/* visualization */}
        <div className="space-y-5">
          {result.error ? (
            <div className="rounded-2xl border border-rose-500/40 bg-rose-500/5 p-6 text-center">
              <p className="font-semibold text-rose-400">{result.error}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Supported: literals, character classes, dot, ^, $, groups, quantifiers (* + ? {"{m,n}"}), alternation.
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-border bg-card p-5">
                <p className="mb-3 text-[13px] font-medium text-foreground/80">Pattern tokens</p>
                <div className="flex flex-wrap gap-2">
                  {result.top.map((n, ti) => {
                    const active = cur !== undefined && tokenSets[ti]?.has(cur.nodeId);
                    return (
                      <span
                        key={n.id}
                        className={cn(
                          "rounded-lg border px-2.5 py-1.5 font-mono text-xs transition",
                          active
                            ? "border-primary bg-primary/15 text-primary shadow-[0_0_12px_rgba(0,0,0,0.15)]"
                            : "border-border bg-background text-muted-foreground",
                        )}
                      >
                        {n.raw}
                      </span>
                    );
                  })}
                </div>

                <p className="mb-3 mt-6 text-[13px] font-medium text-foreground/80">Test string (caret = engine position)</p>
                <div className="flex flex-wrap gap-0.5 font-mono text-sm">
                  {text.split("").map((ch, ci) => {
                    const inMatch = result.matched && ci >= result.start && ci < result.end;
                    const atCaret = cur !== undefined && ci === cur.pos;
                    return (
                      <span
                        key={ci}
                        className={cn(
                          "relative rounded px-1 py-1",
                          inMatch ? "bg-emerald-500/25 text-emerald-200" : "bg-background text-foreground/80",
                          atCaret && "outline outline-2 outline-primary",
                        )}
                      >
                        {ch === " " ? "␣" : ch}
                      </span>
                    );
                  })}
                  {cur !== undefined && cur.pos === text.length && (
                    <span className="rounded bg-primary/20 px-1 py-1 font-mono text-sm text-primary outline outline-2 outline-primary">
                      ⏎
                    </span>
                  )}
                </div>

                {cur && (
                  <div className={cn("mt-4 rounded-xl border px-4 py-3 font-mono text-sm", STEP_STYLE[cur.kind])}>
                    <span className="font-bold">Step {cur.n}.</span> {cur.text}
                  </div>
                )}
                {result.capped && (
                  <p className="mt-2 text-xs text-amber-400">
                    Step cap reached ({MAX_STEPS} steps) - the trace was truncated to keep the lab fast. This is a simplified model.
                  </p>
                )}
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="rounded-2xl border border-border bg-card p-5">
                  <p className="mb-3 text-[13px] font-medium text-foreground/80">Engine log</p>
                  <div ref={logRef} className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
                    {steps.map((s, si) => (
                      <div
                        key={s.n}
                        data-step={si}
                        className={cn(
                          "rounded-lg border px-2.5 py-1.5 font-mono text-xs",
                          si === stepIdx ? "ring-2 ring-primary/60 " : "opacity-70",
                          STEP_STYLE[s.kind],
                        )}
                      >
                        <span className="font-bold">{s.n}.</span> {s.text}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-card p-5">
                  <p className="mb-3 text-[13px] font-medium text-foreground/80">Match result</p>
                  {result.matched ? (
                    <div className="space-y-2">
                      <p className="font-mono text-sm">
                        Matched <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-emerald-300">"{text.slice(result.start, result.end)}"</span>
                      </p>
                      <p className="font-mono text-xs text-muted-foreground">span {result.start}-{result.end}</p>
                      {result.groups.length > 0 ? (
                        <div className="space-y-1.5 pt-1">
                          {result.groups.map((g) => (
                            <div key={g.idx} className="flex items-center gap-2 font-mono text-xs">
                              <span className="rounded bg-primary/15 px-2 py-0.5 font-bold text-primary">group {g.idx}</span>
                              <span className="rounded bg-background px-2 py-0.5">"{g.text}"</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">No capture groups in this pattern.</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No match. Try the presets or adjust the pattern.</p>
                  )}
                  <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
                    Simplified model: greedy matching, no lazy quantifiers, no lookarounds, no backreferences. Real engines (V8, PCRE) share this backtracking core.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
