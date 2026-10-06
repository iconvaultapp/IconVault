// /tools/array-methods-visualizer - Step through map, filter, reduce, find and
// sort like a debugger: watch the index pointer move and the result grow.

import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Play, Pause, StepForward, StepBack, RotateCcw, Copy, List } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/array-methods-visualizer";
import toolSeoMeta from "@/lib/tool-seo-meta-data/array-methods-visualizer";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/array-methods-visualizer")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/array-methods-visualizer";
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
  component: ArrayLab,
});

type Method = "map" | "filter" | "reduce" | "find" | "sort";
type Val = number | string;

interface Step {
  i: number | null; // index pointer
  note: string;
  result: Val[]; // result so far
  acc: string; // accumulator / status text
  mark: "read" | "keep" | "drop" | "swap" | "cmp" | null;
  a: number | null;
  b: number | null;
  done: boolean;
}

const METHODS: { id: Method; label: string; hint: string }[] = [
  { id: "map", label: "map", hint: "transform every element" },
  { id: "filter", label: "filter", hint: "keep elements that pass" },
  { id: "reduce", label: "reduce", hint: "fold into one value" },
  { id: "find", label: "find", hint: "first element that passes" },
  { id: "sort", label: "sort", hint: "bubble sort, animated" },
];

function parseInput(raw: string): { values: Val[]; error?: string } {
  const parts = raw
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (parts.length === 0) return { values: [], error: "Enter some comma-separated values." };
  if (parts.length > 24) return { values: [], error: "Keep it to 24 values or fewer for the lab." };
  const nums = parts.map((p) => Number(p));
  if (nums.every((n) => !Number.isNaN(n))) return { values: nums as Val[] };
  return { values: parts };
}

function makeFn(expr: string): (x: Val, i: number, arr: Val[]) => unknown {
  // User-typed expression, compiled locally in the browser. Never leaves the device.
  return new Function("x", "i", "arr", `"use strict"; return (${expr});`) as (
    x: Val,
    i: number,
    arr: Val[],
  ) => unknown;
}

function fmt(v: unknown): string {
  if (typeof v === "string") return `"${v}"`;
  if (v === undefined) return "undefined";
  try {
    return JSON.stringify(v) ?? String(v);
  } catch {
    return String(v);
  }
}

function buildSteps(method: Method, arr: Val[], opts: { expr: string; init: string; dir: "asc" | "desc" }): { steps: Step[]; error?: string } {
  const steps: Step[] = [];
  const push = (s: Step) => steps.push(s);
  if (method === "sort") {
    const a = [...arr];
    push({ i: null, note: `start bubble sort (${opts.dir === "asc" ? "ascending" : "descending"})`, result: [], acc: `array: [${a.map(fmt).join(", ")}]`, mark: null, a: null, b: null, done: false });
    const n = a.length;
    for (let pass = 0; pass < n - 1; pass++) {
      for (let j = 0; j < n - 1 - pass; j++) {
        push({ i: j, note: `compare ${fmt(a[j])} and ${fmt(a[j + 1])}`, result: [], acc: `pass ${pass + 1}`, mark: "cmp", a: j, b: j + 1, done: false });
        const bad = opts.dir === "asc" ? (a[j]! as number) > (a[j + 1]! as number) : (a[j]! as number) < (a[j + 1]! as number);
        if (typeof a[j] === "number" && typeof a[j + 1] === "number" && bad) {
          const t = a[j]!;
          a[j] = a[j + 1]!;
          a[j + 1] = t;
          push({ i: j, note: `swap -> [${a.map(fmt).join(", ")}]`, result: [], acc: `pass ${pass + 1}`, mark: "swap", a: j, b: j + 1, done: false });
        }
      }
    }
    push({ i: null, note: `sorted: [${a.map(fmt).join(", ")}]`, result: [...a], acc: "done", mark: null, a: null, b: null, done: true });
    return { steps };
  }

  let fn: (x: Val, i: number, arr: Val[]) => unknown;
  try {
    fn = makeFn(opts.expr);
  } catch {
    return { steps, error: "That callback expression does not parse. Try something like x * 2." };
  }
  const safeCall = (x: Val, i: number): { ok: boolean; value?: unknown; err?: string } => {
    try {
      return { ok: true, value: fn(x, i, arr) };
    } catch (e) {
      return { ok: false, err: e instanceof Error ? e.message : "callback threw" };
    }
  };

  if (method === "map") {
    const out: Val[] = [];
    push({ i: null, note: `start map over ${arr.length} elements`, result: [], acc: "result: []", mark: null, a: null, b: null, done: false });
    for (let k = 0; k < arr.length; k++) {
      const r = safeCall(arr[k]!, k);
      if (!r.ok) return { steps, error: `Callback threw at index ${k}: ${r.err}` };
      const v = r.value as Val;
      out.push(v);
      push({ i: k, note: `fn(${fmt(arr[k])}) -> ${fmt(v)}`, result: [...out], acc: `result: [${out.map(fmt).join(", ")}]`, mark: "keep", a: k, b: null, done: false });
    }
    push({ i: null, note: `done: [${out.map(fmt).join(", ")}]`, result: [...out], acc: `result: [${out.map(fmt).join(", ")}]`, mark: null, a: null, b: null, done: true });
    return { steps };
  }
  if (method === "filter") {
    const out: Val[] = [];
    push({ i: null, note: `start filter over ${arr.length} elements`, result: [], acc: "result: []", mark: null, a: null, b: null, done: false });
    for (let k = 0; k < arr.length; k++) {
      const r = safeCall(arr[k]!, k);
      if (!r.ok) return { steps, error: `Callback threw at index ${k}: ${r.err}` };
      if (r.value) {
        out.push(arr[k]!);
        push({ i: k, note: `fn(${fmt(arr[k])}) is truthy - keep`, result: [...out], acc: `result: [${out.map(fmt).join(", ")}]`, mark: "keep", a: k, b: null, done: false });
      } else {
        push({ i: k, note: `fn(${fmt(arr[k])}) is falsy - drop`, result: [...out], acc: `result: [${out.map(fmt).join(", ")}]`, mark: "drop", a: k, b: null, done: false });
      }
    }
    push({ i: null, note: `done: [${out.map(fmt).join(", ")}]`, result: [...out], acc: `result: [${out.map(fmt).join(", ")}]`, mark: null, a: null, b: null, done: true });
    return { steps };
  }
  if (method === "reduce") {
    let acc: unknown;
    let startK = 0;
    const initTrim = opts.init.trim();
    if (initTrim.length > 0) {
      try {
        acc = new Function(`"use strict"; return (${initTrim});`)();
      } catch {
        return { steps, error: "The initial value does not parse. Try 0, [], or \"\"." };
      }
    } else {
      if (arr.length === 0) return { steps, error: "reduce on an empty array needs an initial value." };
      acc = arr[0];
      startK = 1;
    }
    push({ i: null, note: `start reduce, acc = ${fmt(acc)}`, result: [], acc: `acc = ${fmt(acc)}`, mark: null, a: null, b: null, done: false });
    for (let k = startK; k < arr.length; k++) {
      let r: { ok: boolean; value?: unknown; err?: string };
      try {
        r = { ok: true, value: (fn as unknown as (a: unknown, x: Val) => unknown)(acc, arr[k]!) };
      } catch (e) {
        r = { ok: false, err: e instanceof Error ? e.message : "callback threw" };
      }
      if (!r.ok) return { steps, error: `Callback threw at index ${k}: ${r.err}` };
      const before = fmt(acc);
      acc = r.value;
      push({ i: k, note: `fn(${before}, ${fmt(arr[k])}) -> ${fmt(acc)}`, result: [], acc: `acc = ${fmt(acc)}`, mark: "keep", a: k, b: null, done: false });
    }
    push({ i: null, note: `done: ${fmt(acc)}`, result: [], acc: `acc = ${fmt(acc)}`, mark: null, a: null, b: null, done: true });
    return { steps };
  }
  // find
  push({ i: null, note: `start find over ${arr.length} elements`, result: [], acc: "not found yet", mark: null, a: null, b: null, done: false });
  for (let k = 0; k < arr.length; k++) {
    const r = safeCall(arr[k]!, k);
    if (!r.ok) return { steps, error: `Callback threw at index ${k}: ${r.err}` };
    if (r.value) {
      push({ i: k, note: `fn(${fmt(arr[k])}) is truthy - found ${fmt(arr[k])}, stop`, result: [arr[k]!], acc: `found ${fmt(arr[k])}`, mark: "keep", a: k, b: null, done: true });
      return { steps };
    }
    push({ i: k, note: `fn(${fmt(arr[k])}) is falsy - keep looking`, result: [], acc: "not found yet", mark: "drop", a: k, b: null, done: false });
  }
  push({ i: null, note: "done: undefined (nothing matched)", result: [], acc: "undefined", mark: null, a: null, b: null, done: true });
  return { steps };
}

function codeFor(method: Method, input: string, expr: string, init: string, dir: "asc" | "desc"): string {
  const head = `const input = [${input}];`;
  switch (method) {
    case "map":
      return `${head}\nconst result = input.map((x, i) => ${expr});`;
    case "filter":
      return `${head}\nconst result = input.filter((x, i) => ${expr});`;
    case "reduce": {
      const initPart = init.trim().length > 0 ? `, ${init.trim()}` : "";
      return `${head}\nconst result = input.reduce((acc, x) => ${expr}${initPart});`;
    }
    case "find":
      return `${head}\nconst result = input.find((x, i) => ${expr});`;
    case "sort":
      return `${head}\nconst result = [...input].sort((a, b) => ${dir === "asc" ? "a - b" : "b - a"});`;
  }
}

const DEFAULT_EXPR: Record<Method, string> = {
  map: "x * 2",
  filter: "x > 5",
  reduce: "acc + x",
  find: "x > 5",
  sort: "",
};

function ArrayLab() {
  const { isPro } = usePlan();
  const trial = useToolTrial("array-methods-visualizer", isPro);
  const seo = toolSeo;

  const [method, setMethod] = useState<Method>("map");
  const [input, setInput] = useState("3, 8, 1, 9, 4, 12");
  const [exprs, setExprs] = useState<Record<Method, string>>({ ...DEFAULT_EXPR });
  const [init, setInit] = useState("0");
  const [dir, setDir] = useState<"asc" | "desc">("asc");
  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(3);
  const [copied, setCopied] = useState(false);

  const expr = exprs[method]!;

  const built = useMemo(() => {
    const parsed = parseInput(input);
    if (parsed.error) return { steps: [] as Step[], error: parsed.error };
    return buildSteps(method, parsed.values, { expr, init, dir });
  }, [method, input, expr, init, dir]);

  const steps = built.steps;
  const total = steps.length;

  useEffect(() => {
    setStepIdx(0);
    setPlaying(false);
  }, [method, input, expr, init, dir]);

  useEffect(() => {
    if (!playing) return;
    if (stepIdx >= total - 1) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setStepIdx((s) => Math.min(s + 1, total - 1)), 1000 / speed);
    return () => clearTimeout(t);
  }, [playing, stepIdx, speed, total]);

  const cur: Step | undefined = steps[Math.min(stepIdx, Math.max(0, total - 1))];
  const parsed = useMemo(() => parseInput(input), [input]);
  const arr = parsed.values;

  const setExpr = (v: string) => setExprs((e) => ({ ...e, [method]: v }));

  const copyCode = useCallback(() => {
    if (!trial.canUse) return;
    const code = codeFor(method, input, expr, init, dir);
    void navigator.clipboard.writeText(code).then(() => {
      trial.recordUse();
      setCopied(true);
      toast.success("Code copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    });
  }, [method, input, expr, init, dir, trial]);

  const cellColor = (ci: number): string => {
    if (!cur) return "border-border bg-background";
    if (cur.a === ci || cur.b === ci) {
      if (cur.mark === "swap") return "border-rose-500 bg-rose-500/20";
      if (cur.mark === "cmp") return "border-amber-500 bg-amber-500/20";
      if (cur.mark === "keep") return "border-emerald-500 bg-emerald-500/20";
      if (cur.mark === "drop") return "border-border bg-background opacity-40";
    }
    if (cur.i === ci) return "border-primary bg-primary/15";
    return "border-border bg-background";
  };

  return (
    <ToolPageShell toolId="array-methods-visualizer" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Array Visualizer" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Method</p>
            <div className="flex flex-wrap gap-2">
              {METHODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethod(m.id)}
                  title={m.hint}
                  className={cn(
                    "rounded-xl border px-4 py-2 font-mono text-sm font-bold transition",
                    method === m.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">{METHODS.find((m) => m.id === method)?.hint}</p>
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Input array (comma-separated)</label>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              spellCheck={false}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary/60"
              placeholder="3, 8, 1, 9, 4"
            />
          </div>

          {method !== "sort" && (
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">
                Callback expression <span className="font-mono text-muted-foreground">(x, i)</span>
              </label>
              <input
                value={expr}
                onChange={(e) => setExpr(e.target.value)}
                spellCheck={false}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary/60"
                placeholder={method === "reduce" ? "acc + x" : "x * 2"}
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Your expression runs locally in your browser - try <span className="font-mono">x * 2</span>, <span className="font-mono">x % 2 === 0</span>, <span className="font-mono">acc + x</span>.
              </p>
            </div>
          )}

          {method === "reduce" && (
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Initial value (optional)</label>
              <input
                value={init}
                onChange={(e) => setInit(e.target.value)}
                spellCheck={false}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary/60"
                placeholder="0"
              />
            </div>
          )}

          {method === "sort" && (
            <div>
              <p className="mb-2 text-[13px] font-medium text-foreground/80">Direction</p>
              <div className="flex gap-2">
                {(["asc", "desc"] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDir(d)}
                    className={cn(
                      "rounded-xl border px-4 py-2 text-sm font-bold transition",
                      dir === d
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {d === "asc" ? "Ascending" : "Descending"}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-border bg-background p-4">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setStepIdx(0)} className="rounded-lg border border-border p-2 text-muted-foreground transition hover:border-primary/50 hover:text-foreground" title="Reset">
                <RotateCcw className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setStepIdx((s) => Math.max(0, s - 1))} disabled={stepIdx === 0} className="rounded-lg border border-border p-2 text-muted-foreground transition hover:border-primary/50 hover:text-foreground disabled:opacity-40" title="Step back">
                <StepBack className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setPlaying((p) => !p)} disabled={total === 0} className="rounded-lg bg-primary p-2.5 text-primary-foreground transition hover:opacity-90 disabled:opacity-40" title={playing ? "Pause" : "Play"}>
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <button type="button" onClick={() => setStepIdx((s) => Math.min(total - 1, s + 1))} disabled={stepIdx >= total - 1} className="rounded-lg border border-border p-2 text-muted-foreground transition hover:border-primary/50 hover:text-foreground disabled:opacity-40" title="Step forward">
                <StepForward className="h-4 w-4" />
              </button>
              <span className="ml-auto font-mono text-xs text-muted-foreground">{total === 0 ? "0 / 0" : `${stepIdx + 1} / ${total}`}</span>
            </div>
            <input type="range" min={0} max={Math.max(0, total - 1)} value={stepIdx} onChange={(e) => { setStepIdx(Number(e.target.value)); setPlaying(false); }} className="mt-3 w-full accent-primary" />
            <div className="mt-2 flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Speed</span>
              <input type="range" min={1} max={12} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="w-full accent-primary" />
              <span className="font-mono text-xs text-muted-foreground">{speed}/s</span>
            </div>
          </div>

          <ActionButton disabled={!trial.canUse} onClick={copyCode}>
            {copied ? <List className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy code"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left - everything runs locally in your browser.
            </p>
          )}
        </div>

        <div className="space-y-5">
          {built.error ? (
            <div className="rounded-2xl border border-rose-500/40 bg-rose-500/5 p-6 text-center">
              <p className="font-semibold text-rose-400">{built.error}</p>
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-border bg-card p-5">
                <p className="mb-3 text-[13px] font-medium text-foreground/80">Input array</p>
                <div className="flex flex-wrap gap-2">
                  {arr.map((v, ci) => (
                    <div key={ci} className={cn("flex min-w-[64px] flex-col items-center rounded-xl border-2 px-3 py-2 transition", cellColor(ci))}>
                      <span className="font-mono text-[10px] text-muted-foreground">{ci}</span>
                      <span className="font-mono text-sm font-bold">{fmt(v)}</span>
                    </div>
                  ))}
                </div>
                {cur && (
                  <div className="mt-4 rounded-xl border border-primary/40 bg-primary/5 px-4 py-3">
                    <p className="font-mono text-sm">
                      <span className="font-bold text-primary">Step {stepIdx + 1}.</span>{" "}
                      <span className="text-foreground/90">{cur.note}</span>
                    </p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">{cur.acc}</p>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <p className="mb-3 text-[13px] font-medium text-foreground/80">
                  {method === "reduce" ? "Accumulator" : method === "sort" ? "Working array" : "Result so far"}
                </p>
                {method === "reduce" ? (
                  <p className="font-mono text-lg font-bold text-primary">{cur?.acc ?? ""}</p>
                ) : method === "sort" ? (
                  <p className="font-mono text-sm text-muted-foreground">Watch the input array cells above - swaps happen in place.</p>
                ) : cur && cur.result.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {cur.result.map((v, ri) => (
                      <span key={ri} className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 font-mono text-sm font-bold text-emerald-300">
                        {fmt(v)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="font-mono text-sm text-muted-foreground">[] - nothing collected yet</p>
                )}
                {cur?.done && (
                  <p className="mt-3 inline-block rounded-lg bg-emerald-500/15 px-3 py-1.5 text-sm font-bold text-emerald-300">
                    Finished in {total} steps
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <p className="mb-3 text-[13px] font-medium text-foreground/80">Equivalent code</p>
                <pre className="overflow-x-auto rounded-xl bg-background p-4 font-mono text-sm text-foreground/90">
                  {codeFor(method, input, expr, init, dir)}
                </pre>
              </div>
            </>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
