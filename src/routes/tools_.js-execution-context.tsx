// /tools/js-execution-context - Animated walkthroughs of hoisting, closures
// and this-binding: watch the execution context stack and variable environments.

import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Pause, Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/js-execution-context")({
  head: () => {
    const seo = getToolSeoMeta("js-execution-context");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: ExecContextTool,
});

interface Step {
  note: string;
  stack: { name: string; phase: "creation" | "execution" }[];
  env: { scope: string; vars: [string, string][] }[];
  highlight: number[];
}

interface Lesson {
  id: string;
  name: string;
  blurb: string;
  code: string;
  codeLines: string[];
  steps: Step[];
}

const LESSONS: Lesson[] = [
  {
    id: "hoisting",
    name: "Hoisting",
    blurb: "Why var and function declarations are usable before their line runs, but let and const are not.",
    code: `console.log(a);        // undefined, not an error
console.log(greet);     // the whole function
// console.log(b);      // ReferenceError: TDZ

var a = 10;
let b = 20;

function greet() {
  return "hello";
}`,
    codeLines: [
      "console.log(a);        // undefined, not an error",
      "console.log(greet);     // the whole function",
      "// console.log(b);      // ReferenceError: TDZ",
      "",
      "var a = 10;",
      "let b = 20;",
      "",
      "function greet() {",
      '  return "hello";',
      "}",
    ],
    steps: [
      {
        note: "Global Execution Context is created. Creation phase: memory is allocated for every declaration before a single line runs.",
        stack: [{ name: "Global EC", phase: "creation" }],
        env: [{ scope: "global", vars: [["a", "undefined (var hoisted)"], ["b", "<TDZ> (let, uninitialized)"], ["greet", "ƒ entire function"] ] }],
        highlight: [],
      },
      {
        note: "Execution begins. console.log(a) reads the hoisted var: it exists, but its assignment has not run yet.",
        stack: [{ name: "Global EC", phase: "execution" }],
        env: [{ scope: "global", vars: [["a", "undefined"], ["b", "<TDZ>"], ["greet", "ƒ entire function"]] }],
        highlight: [0],
      },
      {
        note: "greet is already the full function object, so logging it works before its declaration line.",
        stack: [{ name: "Global EC", phase: "execution" }],
        env: [{ scope: "global", vars: [["a", "undefined"], ["b", "<TDZ>"], ["greet", "ƒ entire function"]] }],
        highlight: [1],
      },
      {
        note: "var a = 10 now assigns. let b stays in the temporal dead zone until its own line executes.",
        stack: [{ name: "Global EC", phase: "execution" }],
        env: [{ scope: "global", vars: [["a", "10"], ["b", "<TDZ>"], ["greet", "ƒ entire function"]] }],
        highlight: [4],
      },
      {
        note: "let b = 20 leaves the TDZ. From here on, b is safe to read.",
        stack: [{ name: "Global EC", phase: "execution" }],
        env: [{ scope: "global", vars: [["a", "10"], ["b", "20"], ["greet", "ƒ entire function"]] }],
        highlight: [5],
      },
      {
        note: "The function declaration line runs, but nothing changes: the binding was already complete in the creation phase.",
        stack: [{ name: "Global EC", phase: "execution" }],
        env: [{ scope: "global", vars: [["a", "10"], ["b", "20"], ["greet", "ƒ entire function"]] }],
        highlight: [7, 8, 9],
      },
    ],
  },
  {
    id: "closure",
    name: "Closures",
    blurb: "A returned inner function keeps its outer scope alive after the outer call finishes.",
    code: `function counter() {
  let count = 0;          // lives in counter's scope
  return function () {
    count++;
    return count;
  };
}

const next = counter();
console.log(next());      // 1
console.log(next());      // 2`,
    codeLines: [
      "function counter() {",
      "  let count = 0;          // lives in counter's scope",
      "  return function () {",
      "    count++;",
      "    return count;",
      "  };",
      "}",
      "",
      "const next = counter();",
      "console.log(next());      // 1",
      "console.log(next());      // 2",
    ],
    steps: [
      {
        note: "counter is hoisted as a full function. The global scope gains a binding for next in the TDZ.",
        stack: [{ name: "Global EC", phase: "creation" }],
        env: [{ scope: "global", vars: [["counter", "ƒ entire function"], ["next", "<TDZ>"]] }],
        highlight: [],
      },
      {
        note: "next = counter(): a new Function EC is pushed. Its creation phase allocates count.",
        stack: [{ name: "Global EC", phase: "execution" }, { name: "counter() EC", phase: "creation" }],
        env: [
          { scope: "global", vars: [["counter", "ƒ"], ["next", "<TDZ>"]] },
          { scope: "counter()", vars: [["count", "undefined"]] },
        ],
        highlight: [8],
      },
      {
        note: "count = 0 executes, then the inner function is returned. counter() pops off the stack...",
        stack: [{ name: "Global EC", phase: "execution" }, { name: "counter() EC", phase: "execution" }],
        env: [
          { scope: "global", vars: [["counter", "ƒ"], ["next", "<TDZ>"]] },
          { scope: "counter()", vars: [["count", "0"]] },
        ],
        highlight: [1, 2],
      },
      {
        note: "...but the inner function holds a reference to counter's variable environment, so count survives. next now points at the closure.",
        stack: [{ name: "Global EC", phase: "execution" }],
        env: [
          { scope: "global", vars: [["counter", "ƒ"], ["next", "ƒ closure"]] },
          { scope: "[[closure]] of next", vars: [["count", "0 (kept alive)"]] },
        ],
        highlight: [8],
      },
      {
        note: "next() runs: a fresh EC, but its scope chain includes the saved environment. count++ sees 0 and makes it 1.",
        stack: [{ name: "Global EC", phase: "execution" }, { name: "next() EC", phase: "execution" }],
        env: [
          { scope: "global", vars: [["counter", "ƒ"], ["next", "ƒ closure"]] },
          { scope: "[[closure]] of next", vars: [["count", "1"]] },
        ],
        highlight: [9],
      },
      {
        note: "Second call: same saved environment, so count keeps climbing. That persistence is the closure.",
        stack: [{ name: "Global EC", phase: "execution" }, { name: "next() EC", phase: "execution" }],
        env: [
          { scope: "global", vars: [["counter", "ƒ"], ["next", "ƒ closure"]] },
          { scope: "[[closure]] of next", vars: [["count", "2"]] },
        ],
        highlight: [10],
      },
    ],
  },
  {
    id: "this",
    name: "this binding",
    blurb: "this is decided by how a function is called, not where it is defined. Arrows are the exception.",
    code: `const user = {
  name: "Ava",
  greet() {
    return "hi, " + this.name;
  },
  later() {
    setTimeout(function () {
      console.log(this.name); // undefined: plain call
    }, 0);
    setTimeout(() => {
      console.log(this.name); // "Ava": arrow keeps outer this
    }, 0);
  },
};

user.greet();   // this = user
const f = user.greet;
f();            // this = undefined (strict) / window`,
    codeLines: [
      "const user = {",
      '  name: "Ava",',
      "  greet() {",
      '    return "hi, " + this.name;',
      "  },",
      "  later() {",
      "    setTimeout(function () {",
      "      console.log(this.name); // undefined: plain call",
      "    }, 0);",
      "    setTimeout(() => {",
      '      console.log(this.name); // "Ava": arrow keeps outer this',
      "    }, 0);",
      "  },",
      "};",
      "",
      "user.greet();   // this = user",
      "const f = user.greet;",
      "f();            // this = undefined (strict) / window",
    ],
    steps: [
      {
        note: "Methods are just functions stored on an object. Nothing binds this at definition time.",
        stack: [{ name: "Global EC", phase: "creation" }],
        env: [{ scope: "global", vars: [["user", "{ name, greet, later }"], ["f", "<TDZ>"]] }],
        highlight: [0, 1, 2, 3, 4],
      },
      {
        note: "user.greet(): the call site has a receiver (user), so this is bound to user inside the new EC.",
        stack: [{ name: "Global EC", phase: "execution" }, { name: "greet() EC", phase: "execution" }],
        env: [
          { scope: "global", vars: [["user", "{...}"], ["f", "<TDZ>"]] },
          { scope: "greet()", vars: [["this", "user"]] },
        ],
        highlight: [16],
      },
      {
        note: "const f = user.greet copies the function reference only. The link to user is not carried along.",
        stack: [{ name: "Global EC", phase: "execution" }],
        env: [{ scope: "global", vars: [["user", "{...}"], ["f", "ƒ greet (detached)"]] }],
        highlight: [17],
      },
      {
        note: "f(): a plain call with no receiver, so this is undefined (strict mode). this.name throws.",
        stack: [{ name: "Global EC", phase: "execution" }, { name: "greet() EC", phase: "execution" }],
        env: [
          { scope: "global", vars: [["user", "{...}"], ["f", "ƒ"]] },
          { scope: "greet()", vars: [["this", "undefined"]] },
        ],
        highlight: [18],
      },
      {
        note: "Inside later(), the plain function passed to setTimeout is invoked by the timer with no receiver: this is lost again.",
        stack: [{ name: "later() EC", phase: "execution" }, { name: "timer callback EC", phase: "execution" }],
        env: [
          { scope: "later()", vars: [["this", "user"]] },
          { scope: "callback()", vars: [["this", "undefined (plain call)"]] },
        ],
        highlight: [6, 7, 8],
      },
      {
        note: "The arrow function has no this of its own: it closes over later's this, which is user. Rule of thumb: arrows inherit, regular functions are bound by the call site.",
        stack: [{ name: "later() EC", phase: "execution" }, { name: "arrow callback EC", phase: "execution" }],
        env: [
          { scope: "later()", vars: [["this", "user"]] },
          { scope: "arrow()", vars: [["this", "inherited: user"]] },
        ],
        highlight: [9, 10, 11],
      },
    ],
  },
];

async function copyText(s: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(s);
    return true;
  } catch {
    return false;
  }
}

function ExecContextTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("js-execution-context", isPro);
  const seo = getToolSeo("js-execution-context");

  const [lesson, setLesson] = useState(LESSONS[0]!);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (playing) {
      timer.current = setInterval(() => {
        setIdx((s) => {
          if (s + 1 >= lesson.steps.length) {
            setPlaying(false);
            return s;
          }
          return s + 1;
        });
      }, 2200);
    }
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [playing, lesson.steps.length]);

  const pick = (l: Lesson) => {
    setLesson(l);
    setIdx(0);
    setPlaying(false);
  };

  const step = lesson.steps[idx]!;
  const usedTrial = useRef(false);

  const start = () => {
    if (idx >= lesson.steps.length - 1) setIdx(0);
    if (!usedTrial.current && trial.canUse) {
      usedTrial.current = true;
      trial.recordUse();
    }
    setPlaying(true);
  };

  const copyCode = async () => {
    if (await copyText(lesson.code)) {
      setCopied(true);
      toast.success("Lesson code copied");
      setTimeout(() => setCopied(false), 1500);
    } else {
      toast.error("Copy failed - select the code manually.");
    }
  };

  return (
    <ToolPageShell toolId="js-execution-context" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="JS Execution Context" left={trial.left} />

      <div className="mb-5 flex flex-wrap gap-2">
        {LESSONS.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => pick(l)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-bold transition",
              lesson.id === l.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/40",
            )}
          >
            {l.name}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => { setIdx(0); setPlaying(false); }}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border hover:border-primary/40"
          aria-label="Restart"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => (playing ? setPlaying(false) : start())}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground hover:opacity-90"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <div className="h-2 min-w-[160px] flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${((idx + 1) / lesson.steps.length) * 100}%` }}
          />
        </div>
        <span className="text-xs font-bold tabular-nums text-muted-foreground">
          step {idx + 1} of {lesson.steps.length}
        </span>
        <button
          type="button"
          onClick={copyCode}
          className="ml-auto inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-bold hover:border-primary/40"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy code"}
        </button>
      </div>

      <div className="mb-4 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm font-medium leading-relaxed">
        {step.note}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-2 font-extrabold">Code</h2>
          <pre className="overflow-x-auto rounded-xl bg-zinc-950 p-3 font-mono text-[12px] leading-relaxed">
            {lesson.codeLines.map((line, i) => (
              <div
                key={i}
                className={cn(
                  "rounded px-1",
                  step.highlight.includes(i) ? "bg-primary/25 text-white" : "text-zinc-300",
                )}
              >
                <code>{line || " "}</code>
              </div>
            ))}
          </pre>
          <p className="mt-2 text-xs text-muted-foreground">{lesson.blurb}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 font-extrabold">Execution context stack</h2>
          <div className="flex min-h-[220px] flex-col-reverse gap-2">
            {step.stack.map((s, i) => (
              <div
                key={`${s.name}-${i}`}
                className={cn(
                  "rounded-xl border-2 p-3",
                  i === step.stack.length - 1 ? "border-primary bg-primary/10" : "border-border bg-muted/30",
                )}
              >
                <p className="text-sm font-extrabold">{s.name}</p>
                <p className={cn(
                  "mt-0.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold",
                  s.phase === "creation" ? "bg-violet-500/15 text-violet-600" : "bg-emerald-500/15 text-emerald-600",
                )}>
                  {s.phase === "creation" ? "creation phase: allocating memory" : "execution phase: running code"}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">The top box is the currently running context.</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 font-extrabold">Variable environments</h2>
          <div className="space-y-3">
            {step.env.map((e) => (
              <div key={e.scope} className="rounded-xl bg-muted/40 p-3">
                <p className="mb-1.5 font-mono text-xs font-extrabold text-primary">{e.scope}</p>
                <div className="space-y-1">
                  {e.vars.map(([k, v]) => (
                    <div key={k} className="flex items-baseline justify-between gap-2 font-mono text-xs">
                      <span className="font-bold">{k}</span>
                      <span className={cn("text-right", /TDZ/.test(v) ? "font-bold text-red-500" : "text-muted-foreground")}>
                        {v}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {!isPro && (
        <p className="mt-6 text-center text-xs text-muted-foreground">
          {trial.left} of {TOOL_TRIAL_LIMIT} free walkthroughs left.
        </p>
      )}
    </ToolPageShell>
  );
}
