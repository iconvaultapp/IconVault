// /tools/js-type-coercion - Step-by-step loose vs strict equality visualizer:
// walk the ToPrimitive / ToNumber coercions of ==, compare with ===, and
// browse a gallery of classic gotchas. Simplified model, runs in your browser.

import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Pause, Play, RotateCcw, StepBack, StepForward, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/js-type-coercion";
import toolSeoMeta from "@/lib/tool-seo-meta-data/js-type-coercion";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/js-type-coercion")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/js-type-coercion";
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
  component: CoercionTool,
});

/* ---------------- literal parser ---------------- */

type JVal = number | string | boolean | null | undefined | JVal[] | { [k: string]: JVal };

class LitParser {
  pos = 0;
  constructor(private s: string) {}
  skip() { while (this.pos < this.s.length && /\s/.test(this.s[this.pos]!)) this.pos++; }
  expect(ch: string) {
    this.skip();
    if (this.s[this.pos] !== ch) throw new Error(`Expected "${ch}"`);
    this.pos++;
  }
  value(): JVal {
    this.skip();
    const c = this.s[this.pos];
    if (c === undefined) throw new Error("Unexpected end of input");
    if (c === '"' || c === "'") return this.str();
    if (c === "[") return this.arr();
    if (c === "{") return this.obj();
    if (c === "-" || c === "." || (c >= "0" && c <= "9")) return this.num();
    const rest = this.s.slice(this.pos);
    const kws: [string, JVal][] = [
      ["true", true], ["false", false], ["null", null],
      ["undefined", undefined], ["NaN", NaN], ["Infinity", Infinity],
    ];
    for (const [kw, v] of kws) {
      if (rest.startsWith(kw)) { this.pos += kw.length; return v; }
    }
    throw new Error(`Could not parse near "${rest.slice(0, 14)}"`);
  }
  num(): number {
    const rest = this.s.slice(this.pos);
    if (rest.startsWith("-Infinity")) { this.pos += 9; return -Infinity; }
    const m = rest.match(/^(-?(?:0[xX][0-9a-fA-F]+|0[bB][01]+|0[oO][0-7]+|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?))/);
    if (!m) throw new Error(`Expected a number near "${rest.slice(0, 14)}"`);
    this.pos += m[1]!.length;
    return Number(m[1]);
  }
  str(): string {
    const q = this.s[this.pos]!;
    this.pos++;
    let out = "";
    while (this.pos < this.s.length) {
      const c = this.s[this.pos]!;
      if (c === q) { this.pos++; return out; }
      if (c === "\\") {
        this.pos++;
        const e = this.s[this.pos] ?? "";
        if (e === "n") out += "\n";
        else if (e === "t") out += "\t";
        else if (e === "r") out += "\r";
        else if (e === "u") {
          out += String.fromCharCode(parseInt(this.s.slice(this.pos + 1, this.pos + 5), 16));
          this.pos += 4;
        } else out += e;
        this.pos++;
      } else {
        out += c;
        this.pos++;
      }
    }
    throw new Error("Unterminated string");
  }
  arr(): JVal[] {
    this.expect("[");
    const out: JVal[] = [];
    this.skip();
    if (this.s[this.pos] === "]") { this.pos++; return out; }
    for (;;) {
      out.push(this.value());
      this.skip();
      const c = this.s[this.pos];
      if (c === ",") { this.pos++; continue; }
      if (c === "]") { this.pos++; return out; }
      throw new Error(`Expected "," or "]" near "${this.s.slice(this.pos, this.pos + 14)}"`);
    }
  }
  obj(): { [k: string]: JVal } {
    this.expect("{");
    const out: { [k: string]: JVal } = {};
    this.skip();
    if (this.s[this.pos] === "}") { this.pos++; return out; }
    for (;;) {
      this.skip();
      let key: string;
      const c = this.s[this.pos];
      if (c === '"' || c === "'") key = this.str();
      else {
        const m = this.s.slice(this.pos).match(/^[A-Za-z_$][A-Za-z0-9_$]*/);
        if (!m) throw new Error(`Expected a key near "${this.s.slice(this.pos, this.pos + 14)}"`);
        key = m[0]!;
        this.pos += key.length;
      }
      this.expect(":");
      out[key] = this.value();
      this.skip();
      const d = this.s[this.pos];
      if (d === ",") { this.pos++; continue; }
      if (d === "}") { this.pos++; return out; }
      throw new Error(`Expected "," or "}" near "${this.s.slice(this.pos, this.pos + 14)}"`);
    }
  }
}

function parseLiteral(src: string): JVal {
  const p = new LitParser(src.trim());
  const v = p.value();
  p.skip();
  if (p.pos < (p as unknown as { s: string }).s.length) throw new Error("Trailing characters after the value");
  return v;
}

function repr(v: JVal): string {
  if (typeof v === "string") return JSON.stringify(v);
  if (typeof v === "number") return Object.is(v, -0) ? "-0" : String(v);
  if (v === undefined) return "undefined";
  if (v === null) return "null";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (Array.isArray(v)) return `[${v.map(repr).join(", ")}]`;
  return `{${Object.entries(v).map(([k, val]) => `${k}: ${repr(val)}`).join(", ")}}`;
}

function jtype(v: JVal): "Undefined" | "Null" | "Boolean" | "Number" | "String" | "Object" {
  if (v === undefined) return "Undefined";
  if (v === null) return "Null";
  if (typeof v === "boolean") return "Boolean";
  if (typeof v === "number") return "Number";
  if (typeof v === "string") return "String";
  return "Object";
}

function typeName(v: JVal): string {
  return Array.isArray(v) ? "Array" : jtype(v);
}

/* ---------------- coercion walk ---------------- */

interface Step {
  a: JVal;
  b: JVal;
  rule: string;
  detail: string;
  done?: boolean;
  result?: boolean;
}

function toNumberWhy(v: JVal): { n: number; why: string } {
  if (typeof v === "number") return { n: v, why: `${repr(v)} is already a number` };
  if (typeof v === "string") {
    const t = v.trim();
    if (t === "") return { n: 0, why: `An empty or whitespace-only string becomes 0` };
    const n = Number(t);
    if (Number.isNaN(n)) return { n: NaN, why: `Number(${repr(v)}) is NaN` };
    return { n, why: `Number(${repr(v)}) is ${String(n)}` };
  }
  if (typeof v === "boolean") return { n: v ? 1 : 0, why: v ? "true becomes 1" : "false becomes 0" };
  if (v === null) return { n: 0, why: "null becomes +0" };
  return { n: NaN, why: "undefined becomes NaN" };
}

function toPrimitiveWhy(v: JVal): { p: JVal; lines: string } {
  if (jtype(v) !== "Object" || v === null || v === undefined) return { p: v, lines: "Already a primitive." };
  if (Array.isArray(v)) {
    const joined = v.map((x) => (x === null || x === undefined ? "" : String(x as JVal))).join(",");
    return {
      p: joined,
      lines: `${repr(v)}.valueOf() returns the array itself (still an object, not a primitive), so the engine falls back to toString(), which joins with commas: ${JSON.stringify(joined)}.`,
    };
  }
  return {
    p: "[object Object]",
    lines: `${repr(v)}.valueOf() returns the object itself (still an object, not a primitive), so the engine falls back to toString(), which gives "[object Object]".`,
  };
}

function strictCompare(a: JVal, b: JVal): { result: boolean; detail: string } {
  const t = jtype(a);
  if (t === "Number") {
    const x = a as number;
    const y = b as number;
    if (Number.isNaN(x) || Number.isNaN(y))
      return { result: false, detail: "NaN is never equal to anything, not even itself." };
    if (x === 0 && y === 0)
      return { result: true, detail: "+0 and -0 compare equal with ===. Only Object.is tells them apart." };
    return {
      result: x === y,
      detail: x === y ? `Both sides are the number ${String(x)}.` : `${String(x)} and ${String(y)} are different numbers.`,
    };
  }
  if (t === "Object")
    return {
      result: false,
      detail: "Two separately written objects are never strictly equal: === needs the exact same reference, and these are two different objects.",
    };
  return {
    result: a === b,
    detail: a === b ? `Both sides are ${repr(a)}.` : `${repr(a)} and ${repr(b)} are different.`,
  };
}

function walkEquality(
  a0: JVal, b0: JVal, op: "==" | "===",
): { steps: Step[]; result: boolean; note: string } {
  const steps: Step[] = [
    { a: a0, b: b0, rule: "Start", detail: `Left is ${typeName(a0)}, right is ${typeName(b0)}.` },
  ];
  let a = a0;
  let b = b0;

  if (op === "===") {
    if (jtype(a) !== jtype(b)) {
      steps.push({
        a, b, rule: "Types differ", detail: "Strict equality converts nothing: different types are never strictly equal.",
        done: true, result: false,
      });
      return { steps, result: false, note: "Loose equality (==) might still say true here. Flip the operator to see." };
    }
    const s = strictCompare(a, b);
    steps.push({ a, b, rule: "Same type: compare directly", detail: s.detail, done: true, result: s.result });
    return { steps, result: s.result, note: "" };
  }

  for (let i = 0; i < 14; i++) {
    const ta = jtype(a);
    const tb = jtype(b);
    if (ta === tb) {
      const s = strictCompare(a, b);
      steps.push({ a, b, rule: "Same type now: compare directly", detail: s.detail, done: true, result: s.result });
      const strict0 = jtype(a0) === jtype(b0) ? strictCompare(a0, b0).result : false;
      const note = s.result !== strict0
        ? `=== on the originals says ${strict0 ? "true" : "false"}. Coercion changed the answer.`
        : "";
      return { steps, result: s.result, note };
    }
    const nullish = (v: JVal) => v === null || v === undefined;
    if (nullish(a) && nullish(b)) {
      steps.push({
        a, b, rule: "null == undefined",
        detail: "The spec special-cases this exact pair: null loosely equals undefined, and nothing else.",
        done: true, result: true,
      });
      return { steps, result: true, note: "=== says false here: the types differ." };
    }
    if (ta === "Number" && tb === "String") {
      const tn = toNumberWhy(b);
      steps.push({ a, b: tn.n, rule: `ToNumber(${repr(b)})`, detail: `${tn.why}. The number side stays as it is.` });
      b = tn.n; continue;
    }
    if (ta === "String" && tb === "Number") {
      const tn = toNumberWhy(a);
      steps.push({ a: tn.n, b, rule: `ToNumber(${repr(a)})`, detail: `${tn.why}. The number side stays as it is.` });
      a = tn.n; continue;
    }
    if (ta === "Boolean") {
      const tn = toNumberWhy(a);
      steps.push({ a: tn.n, b, rule: `ToNumber(${repr(a)})`, detail: `A boolean always converts first: ${tn.why}.` });
      a = tn.n; continue;
    }
    if (tb === "Boolean") {
      const tn = toNumberWhy(b);
      steps.push({ a, b: tn.n, rule: `ToNumber(${repr(b)})`, detail: `A boolean always converts first: ${tn.why}.` });
      b = tn.n; continue;
    }
    if ((ta === "String" || ta === "Number") && tb === "Object") {
      const tp = toPrimitiveWhy(b);
      steps.push({ a, b: tp.p, rule: `ToPrimitive(${repr(b)})`, detail: tp.lines });
      b = tp.p; continue;
    }
    if (ta === "Object" && (tb === "String" || tb === "Number")) {
      const tp = toPrimitiveWhy(a);
      steps.push({ a: tp.p, b, rule: `ToPrimitive(${repr(a)})`, detail: tp.lines });
      a = tp.p; continue;
    }
    steps.push({
      a, b, rule: "No rule applies",
      detail: "None of the loose-equality rules cover this pair (null, for example, never coerces to 0), so the answer is false.",
      done: true, result: false,
    });
    return { steps, result: false, note: "" };
  }
  steps.push({ a, b, rule: "Too many steps", detail: "Gave up after 14 conversions.", done: true, result: false });
  return { steps, result: false, note: "" };
}

/* ---------------- gotchas ---------------- */

interface Gotcha { expr: string; a: string; b: string; op: "==" | "==="; take: string; result: boolean }

function buildGotchas(): Gotcha[] {
  const raw: Omit<Gotcha, "result">[] = [
    { expr: "[] == ![]", a: "[]", b: "false", op: "==", take: "An empty array is truthy, so ![] is false. Then [] becomes \"\" and then 0." },
    { expr: '"0" == false', a: '"0"', b: "false", op: "==", take: "false becomes 0 first, then \"0\" becomes 0. True, but nobody should rely on it." },
    { expr: '0 == " "', a: "0", b: '" "', op: "==", take: "A whitespace-only string trims to \"\", which becomes 0." },
    { expr: "null == undefined", a: "null", b: "undefined", op: "==", take: "The one blessed pair: true by special case, not by conversion." },
    { expr: "null == 0", a: "null", b: "0", op: "==", take: "False. null only loosely equals undefined. It never becomes 0 in a comparison." },
    { expr: "[] == 0", a: "[]", b: "0", op: "==", take: "[] becomes \"\", which becomes 0. An empty array loosely equals zero." },
    { expr: '[1, 2] == "1,2"', a: "[1, 2]", b: '"1,2"', op: "==", take: "The array stringifies with commas before the numeric comparison happens." },
    { expr: "NaN == NaN", a: "NaN", b: "NaN", op: "==", take: "Always false. Use Number.isNaN() to test for NaN." },
    { expr: "0 == -0", a: "0", b: "-0", op: "==", take: "True for == and === alike. Only Object.is(0, -0) is false." },
    { expr: '{} == "[object Object]"', a: "{}", b: '"[object Object]"', op: "==", take: "A plain object stringifies to [object Object] before comparing." },
  ];
  return raw.map((g) => ({
    ...g,
    result: walkEquality(parseLiteral(g.a), parseLiteral(g.b), g.op).result,
  }));
}

const GOTCHAS = buildGotchas();

/* ---------------- component ---------------- */

interface Analysis { steps: Step[]; result: boolean; note: string; op: "==" | "==="; expr: string }

function CoercionTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("js-type-coercion", isPro);
  const seo = toolSeo;

  const [left, setLeft] = useState("[]");
  const [right, setRight] = useState("false");
  const [op, setOp] = useState<"==" | "===">("==");
  const [expr, setExpr] = useState("[] == ![]");
  const [analysis, setAnalysis] = useState<Analysis | null>(() => {
    const w = walkEquality(parseLiteral("[]"), parseLiteral("false"), "==");
    return { ...w, op: "==", expr: "[] == ![]" };
  });
  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!playing || !analysis) return;
    const t = setInterval(() => {
      setStepIdx((i) => {
        if (i >= analysis.steps.length - 1) { setPlaying(false); return i; }
        return i + 1;
      });
    }, 2000);
    return () => clearInterval(t);
  }, [playing, analysis]);

  const analyze = (l: string, r: string, o: "==" | "===", label?: string) => {
    if (!trial.canUse) return;
    try {
      const w = walkEquality(parseLiteral(l), parseLiteral(r), o);
      setAnalysis({ ...w, op: o, expr: label ?? `${l} ${o} ${r}` });
      setStepIdx(0);
      setPlaying(false);
      setError(null);
      trial.recordUse();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not parse that input.");
    }
  };

  const loadGotcha = (g: Gotcha) => {
    setLeft(g.a);
    setRight(g.b);
    setOp(g.op);
    analyze(g.a, g.b, g.op, g.expr);
  };

  const copyWalkthrough = async () => {
    if (!trial.canUse || !analysis) return;
    const lines = [
      `Coercion walkthrough: ${analysis.expr}`,
      "",
      ...analysis.steps.map((s, i) =>
        `Step ${i + 1} - ${s.rule}: ${repr(s.a)} ${analysis.op} ${repr(s.b)}. ${s.detail}` +
        (s.done ? ` Result: ${s.result ? "true" : "false"}.` : ""),
      ),
      "",
      `Final answer: ${analysis.result ? "true" : "false"}`,
      analysis.note,
    ].filter((l) => l !== "");
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      trial.recordUse();
      toast.success("Walkthrough copied");
    } catch {
      toast.error("Could not access the clipboard");
    }
  };

  const step = analysis?.steps[stepIdx];

  return (
    <ToolPageShell toolId="js-type-coercion" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Coercion Visualizer" left={trial.left} />

      <div className="mb-6 rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <label className="flex-1">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Left value</span>
            <input
              value={left}
              onChange={(e) => setLeft(e.target.value)}
              spellCheck={false}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 font-mono text-sm outline-none transition focus:border-primary"
              placeholder='e.g. [], "0", 0, null'
            />
          </label>
          <div className="flex gap-2">
            {(["==", "==="] as const).map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setOp(o)}
                className={cn(
                  "rounded-xl border px-5 py-2.5 font-mono text-sm font-bold transition",
                  op === o ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                {o}
              </button>
            ))}
          </div>
          <label className="flex-1">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Right value</span>
            <input
              value={right}
              onChange={(e) => setRight(e.target.value)}
              spellCheck={false}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 font-mono text-sm outline-none transition focus:border-primary"
              placeholder="e.g. false, 0, undefined"
            />
          </label>
          <ActionButton onClick={() => analyze(left, right, op)} disabled={!trial.canUse}>
            <Wand2 className="h-4 w-4" /> Analyze
          </ActionButton>
        </div>
        {error && <p className="mt-2 text-sm font-medium text-red-500">{error}</p>}
        <p className="mt-2 text-xs text-muted-foreground">
          Type any JS literal: numbers (0x10, 1e3, -0, NaN, Infinity), quoted strings, true, false, null, undefined, arrays and objects.
        </p>
      </div>

      {analysis && step && (
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-sm font-bold">{analysis.expr}</p>
              <span
                className={cn(
                  "rounded-full px-3 py-1 font-mono text-sm font-bold",
                  analysis.result ? "bg-green-500/15 text-green-600" : "bg-red-500/15 text-red-500",
                )}
              >
                {analysis.result ? "true" : "false"}
              </span>
            </div>
            {analysis.note && <p className="mb-3 text-xs font-semibold text-amber-600">{analysis.note}</p>}

            <div className="rounded-xl bg-muted/60 p-4">
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Step {stepIdx + 1} of {analysis.steps.length}: {step.rule}
              </p>
              <p className="mb-2 break-all font-mono text-lg font-bold">
                {repr(step.a)} <span className="text-primary">{analysis.op}</span> {repr(step.b)}
              </p>
              <p className="text-sm text-muted-foreground">{step.detail}</p>
              {step.done && (
                <p className={cn("mt-2 text-sm font-bold", step.result ? "text-green-600" : "text-red-500")}>
                  Final answer: {step.result ? "true" : "false"}
                </p>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button" onClick={() => { setPlaying(false); setStepIdx(0); }}
                className="rounded-lg border border-border p-2 text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                aria-label="Reset"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                type="button" onClick={() => { setPlaying(false); setStepIdx((i) => Math.max(0, i - 1)); }}
                disabled={stepIdx === 0}
                className="rounded-lg border border-border p-2 text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:opacity-40"
                aria-label="Previous step"
              >
                <StepBack className="h-4 w-4" />
              </button>
              {playing ? (
                <button type="button" onClick={() => setPlaying(false)} className="rounded-lg border border-border p-2 text-foreground transition hover:border-primary/40" aria-label="Pause">
                  <Pause className="h-4 w-4" />
                </button>
              ) : (
                <button type="button" onClick={() => { if (!trial.canUse) return; trial.recordUse(); setPlaying(true); }} disabled={!trial.canUse} className="rounded-lg bg-primary p-2 text-primary-foreground transition hover:opacity-90 disabled:opacity-40" aria-label="Play">
                  <Play className="h-4 w-4" />
                </button>
              )}
              <button
                type="button" onClick={() => { setPlaying(false); setStepIdx((i) => Math.min(analysis.steps.length - 1, i + 1)); }}
                disabled={stepIdx >= analysis.steps.length - 1}
                className="rounded-lg border border-border p-2 text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:opacity-40"
                aria-label="Next step"
              >
                <StepForward className="h-4 w-4" />
              </button>
              <div className="mx-1 hidden h-6 w-px bg-border sm:block" />
              <ActionButton onClick={copyWalkthrough} disabled={!trial.canUse}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copy walkthrough
              </ActionButton>
            </div>
            {!isPro && (
              <p className="mt-2 text-xs text-muted-foreground">
                {trial.left} of {TOOL_TRIAL_LIMIT} free analyses left. Stepping through a walkthrough is always free.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 text-sm font-bold">All steps</p>
            <ol className="space-y-1.5">
              {analysis.steps.map((s, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => { setPlaying(false); setStepIdx(i); }}
                    className={cn(
                      "w-full rounded-lg border px-3 py-2 text-left text-xs transition",
                      i === stepIdx ? "border-primary bg-primary/10 font-semibold" : "border-border hover:border-primary/40",
                    )}
                  >
                    <span className="font-bold">{i + 1}. {s.rule}</span>
                    <span className="block truncate font-mono text-muted-foreground">
                      {repr(s.a)} {analysis.op} {repr(s.b)}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      <div className="mt-6">
        <p className="mb-3 text-sm font-bold">Gotcha gallery: click one to walk through it</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {GOTCHAS.map((g) => (
            <button
              key={g.expr}
              type="button"
              onClick={() => loadGotcha(g)}
              className="rounded-2xl border border-border bg-card p-4 text-left transition hover:border-primary/50"
            >
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="truncate font-mono text-sm font-bold">{g.expr}</span>
                <span className={cn(
                  "shrink-0 rounded-full px-2.5 py-0.5 font-mono text-xs font-bold",
                  g.result ? "bg-green-500/15 text-green-600" : "bg-red-500/15 text-red-500",
                )}>
                  {g.result ? "true" : "false"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{g.take}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5 text-xs text-muted-foreground">
        <p className="mb-1 font-bold text-foreground">Simplified model</p>
        <p>This follows the real Abstract Equality algorithm for the everyday cases: null, undefined, booleans, numbers, strings, arrays and plain objects. BigInt, Symbol and exotic ToPrimitive overrides are left out. When in doubt, write === and convert explicitly with Number() or String().</p>
      </div>
    </ToolPageShell>
  );
}
