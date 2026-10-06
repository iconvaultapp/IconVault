// /tools/js-event-loop - Animated JavaScript event loop visualizer: step through
// the call stack, Web APIs, microtask and macrotask queues with play/step/reset.

import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Pause, Play, RotateCcw, StepBack, StepForward } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/js-event-loop";
import toolSeoMeta from "@/lib/tool-seo-meta-data/js-event-loop";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/js-event-loop")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/js-event-loop";
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
  component: EventLoopTool,
});

/* ---------------- tiny parser (supported subset) ---------------- */

type Stmt =
  | { k: "log"; text: string }
  | { k: "timeout"; body: Stmt[]; delay: number; id: number }
  | { k: "promise"; body: Stmt[]; id: number };

interface Frame {
  stack: string[];
  micros: string[];
  macros: string[];
  timers: { label: string; ms: number }[];
  out: string[];
  note: string;
  time: number;
  phase: string;
}

function extractBrace(s: string, start: number): { body: string; next: number } {
  let depth = 1;
  let i = start;
  while (i < s.length && depth > 0) {
    const c = s[i]!;
    if (c === "{") depth++;
    else if (c === "}") depth--;
    else if (c === '"' || c === "'") {
      const q = c;
      i++;
      while (i < s.length && s[i] !== q) {
        if (s[i] === "\\") i++;
        i++;
      }
    }
    i++;
  }
  return { body: s.slice(start, i - 1), next: i };
}

function parseProgram(src: string): { stmts: Stmt[]; errors: string[] } {
  const errors: string[] = [];
  let cb = 0;
  function parseBlock(s: string, depth: number): Stmt[] {
    const stmts: Stmt[] = [];
    let i = 0;
    const n = s.length;
    while (i < n) {
      while (i < n && /\s/.test(s[i]!)) i++;
      if (i >= n) break;
      if (s[i] === ";") { i++; continue; }
      const rest = s.slice(i);
      let m = rest.match(/^console\.log\(\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')\s*\)\s*;?/);
      if (m) {
        stmts.push({ k: "log", text: m[1] ?? m[2] ?? "" });
        i += m[0].length;
        continue;
      }
      m = rest.match(/^setTimeout\(\s*(?:\(\s*\)\s*=>|function\s*\(\s*\))\s*\{/);
      if (m) {
        i += m[0].length;
        const ex = extractBrace(s, i);
        i = ex.next;
        const dm = s.slice(i).match(/^\s*,\s*(\d+)\s*\)\s*;?/);
        if (!dm) {
          errors.push("setTimeout needs a delay: setTimeout(() => { ... }, 1000).");
          break;
        }
        i += dm[0].length;
        cb++;
        if (depth > 5) {
          errors.push("Nesting deeper than 5 levels is not supported in this demo.");
          break;
        }
        stmts.push({ k: "timeout", body: parseBlock(ex.body, depth + 1), delay: parseInt(dm[1]!, 10), id: cb });
        continue;
      }
      m = rest.match(/^Promise\.resolve\(\)\.then\(\s*(?:\(\s*\)\s*=>|function\s*\(\s*\))\s*\{/);
      if (m) {
        i += m[0].length;
        const ex = extractBrace(s, i);
        i = ex.next;
        const cm = s.slice(i).match(/^\s*\)\s*;?/);
        if (!cm) {
          errors.push("Promise .then(...) looks unfinished: .then(() => { ... }).");
          break;
        }
        i += cm[0].length;
        cb++;
        stmts.push({ k: "promise", body: parseBlock(ex.body, depth + 1), id: cb });
        continue;
      }
      const nl = rest.indexOf("\n");
      const snippet = (nl === -1 ? rest : rest.slice(0, nl)).trim().slice(0, 48);
      if (snippet) {
        errors.push(
          `Could not understand "${snippet}". Supported: console.log("..."), setTimeout(() => { ... }, ms), Promise.resolve().then(() => { ... }).`
        );
      }
      break;
    }
    return stmts;
  }
  return { stmts: parseBlock(src, 0), errors };
}

/* ---------------- discrete event-loop simulation ---------------- */

function simulate(stmts: Stmt[]): Frame[] {
  const frames: Frame[] = [];
  const st = {
    stack: ["<script>"],
    micros: [] as { label: string; body: Stmt[] }[],
    macros: [] as { label: string; body: Stmt[] }[],
    timers: [] as { label: string; ms: number; body: Stmt[] }[],
    out: [] as string[],
    time: 0,
  };
  const emit = (note: string, phase: string) => {
    if (frames.length >= 600) return;
    frames.push({
      stack: [...st.stack],
      micros: st.micros.map((m) => m.label),
      macros: st.macros.map((m) => m.label),
      timers: st.timers.map((t) => ({ label: t.label, ms: t.ms })),
      out: [...st.out],
      note,
      time: st.time,
      phase,
    });
  };

  function drainMicros() {
    while (st.micros.length) {
      const m = st.micros.shift()!;
      st.stack.push(`microtask ${m.label}`);
      emit(
        `Microtask ${m.label} runs: the microtask queue always drains completely before the next macrotask.`,
        "Microtasks"
      );
      runBody(m.body, `microtask ${m.label}`, true);
      st.stack.pop();
      emit(`Microtask ${m.label} finished.`, "Microtasks");
    }
  }

  function runBody(body: Stmt[], ctx: string, drainAfter: boolean) {
    for (const s of body) {
      if (s.k === "log") {
        st.out.push(s.text);
        emit(`console.log("${s.text}") runs immediately: synchronous code never waits for the queues.`, ctx);
      } else if (s.k === "timeout") {
        const label = `cb${s.id}`;
        st.stack.push(`setTimeout(${label})`);
        emit(`setTimeout called: callback ${label} is handed to Web APIs and a ${s.delay}ms timer starts ticking.`, ctx);
        st.stack.pop();
        st.timers.push({ label, ms: s.delay, body: s.body });
        emit(`Back in ${ctx}: the timer for ${label} ticks in Web APIs while synchronous code continues.`, ctx);
      } else {
        const label = `cb${s.id}`;
        st.stack.push(`then(${label})`);
        emit(`Promise is already resolved, so .then(${label}) queues a microtask right away.`, ctx);
        st.stack.pop();
        st.micros.push({ label, body: s.body });
        emit(`Microtask ${label} waits in the microtask queue.`, ctx);
      }
    }
    if (drainAfter) drainMicros();
  }

  runBody(stmts, "Script", false);
  st.stack.pop();
  emit("Main script finished: the call stack is empty. The loop drains microtasks before touching macrotasks.", "Script");
  drainMicros();

  let guard = 0;
  while ((st.macros.length > 0 || st.timers.length > 0) && guard++ < 200) {
    if (st.macros.length === 0) {
      const min = Math.min(...st.timers.map((t) => t.ms));
      st.time += min;
      for (const t of st.timers) t.ms -= min;
      emit(
        min === 0
          ? "A 0ms timer is already due, but it still waits its turn behind the queues."
          : `Nothing runnable: the loop fast-forwards ${min}ms until the next timer fires.`,
        "Macrotasks"
      );
      const due = st.timers.filter((t) => t.ms <= 0);
      st.timers = st.timers.filter((t) => t.ms > 0);
      for (const d of due) st.macros.push({ label: d.label, body: d.body });
      if (due.length > 0) {
        emit(
          `Timer fired: ${due.map((d) => d.label).join(", ")} move${due.length > 1 ? "" : "s"} to the macrotask queue.`,
          "Macrotasks"
        );
      }
    }
    const m = st.macros.shift()!;
    st.stack.push(`macrotask ${m.label}`);
    emit(`Macrotask ${m.label} runs: the loop processes exactly one macrotask per turn.`, "Macrotasks");
    runBody(m.body, `macrotask ${m.label}`, true);
    st.stack.pop();
    emit(`Macrotask ${m.label} finished.`, "Macrotasks");
  }
  emit("Event loop idle: every queue is empty.", "Done");
  return frames;
}

/* ---------------- presets ---------------- */

const PRESETS = [
  {
    name: "Classic order",
    code: `console.log("start");\nsetTimeout(() => {\n  console.log("timeout");\n}, 0);\nPromise.resolve().then(() => {\n  console.log("promise");\n});\nconsole.log("end");`,
  },
  {
    name: "Nested timers",
    code: `console.log("a");\nsetTimeout(() => {\n  console.log("b");\n  setTimeout(() => {\n    console.log("c");\n  }, 100);\n}, 500);\nPromise.resolve().then(() => {\n  console.log("d");\n});`,
  },
  {
    name: "Promise chain",
    code: `Promise.resolve().then(() => {\n  console.log("first");\n  Promise.resolve().then(() => {\n    console.log("second");\n  });\n});\nconsole.log("sync");`,
  },
];

const PHASE_COLORS: Record<string, string> = {
  Script: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  Microtasks: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  Macrotasks: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  Done: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
};

function QueueBox({ title, items, empty, accent }: { title: string; items: string[]; empty: string; accent: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</p>
      <div className="flex min-h-[44px] flex-wrap content-start gap-1.5">
        {items.length === 0 ? (
          <span className="text-xs text-muted-foreground/60">{empty}</span>
        ) : (
          items.map((it, i) => (
            <span key={`${it}-${i}`} className={cn("rounded-lg px-2.5 py-1.5 font-mono text-xs font-bold", accent)}>
              {it}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

function EventLoopTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("js-event-loop", isPro);
  const seo = toolSeo;

  const [code, setCode] = useState(PRESETS[0]!.code);
  const [applied, setApplied] = useState(PRESETS[0]!.code);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [parseErrors, setParseErrors] = useState<string[]>([]);

  const parsed = useMemo(() => parseProgram(applied), [applied]);
  const frames = useMemo(() => (parsed.errors.length ? [] : simulate(parsed.stmts)), [parsed]);
  const frame: Frame | null = frames.length ? frames[Math.min(step, frames.length - 1)]! : null;

  useEffect(() => {
    setParseErrors(parsed.errors);
    setStep(0);
    setPlaying(false);
  }, [parsed]);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setStep((s) => {
        if (s >= frames.length - 1) {
          window.clearInterval(id);
          setPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, 900);
    return () => window.clearInterval(id);
  }, [playing, frames.length]);

  const apply = () => setApplied(code);

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
    <ToolPageShell toolId="js-event-loop" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Event Loop Visualizer" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
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
              rows={12}
              className="w-full rounded-xl border border-border bg-background p-3 font-mono text-xs leading-relaxed outline-none focus:border-primary/60"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Supported: console.log("..."), setTimeout(() =&gt; {"{...}"}, ms), Promise.resolve().then(() =&gt; {"{...}"}).
            </p>
          </div>
          <ActionButton onClick={apply}>
            <RotateCcw className="h-4 w-4" /> Apply and reset
          </ActionButton>
          {parseErrors.length > 0 && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3">
              {parseErrors.map((e, i) => (
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
              disabled={frames.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {playing ? "Pause" : "Play"}
            </button>
            <button
              type="button"
              onClick={() => { setPlaying(false); setStep((s) => Math.max(0, s - 1)); }}
              disabled={frames.length === 0 || step === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-bold transition hover:border-primary/40 disabled:opacity-50"
            >
              <StepBack className="h-4 w-4" /> Back
            </button>
            <button
              type="button"
              onClick={() => { setPlaying(false); setStep((s) => Math.min(frames.length - 1, s + 1)); }}
              disabled={frames.length === 0 || step >= frames.length - 1}
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
              {frames.length ? `Step ${step + 1} of ${frames.length}` : "No trace yet"}
            </span>
          </div>

          {frame && (
            <>
              <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
                <span className={cn("mt-0.5 shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold", PHASE_COLORS[frame.phase] ?? "bg-muted text-muted-foreground")}>
                  {frame.phase}
                </span>
                <p className="text-sm leading-relaxed">{frame.note}</p>
                <span className="ml-auto shrink-0 font-mono text-xs text-muted-foreground">t = {frame.time}ms</span>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-border bg-card p-3">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Call stack</p>
                  <div className="flex min-h-[44px] flex-col-reverse gap-1.5">
                    {frame.stack.length === 0 ? (
                      <span className="text-xs text-muted-foreground/60">Empty: the engine is between tasks</span>
                    ) : (
                      frame.stack.map((f, i) => (
                        <div
                          key={`${f}-${i}`}
                          className={cn(
                            "rounded-lg border px-3 py-1.5 font-mono text-xs font-bold",
                            i === frame.stack.length - 1
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-muted/50 text-muted-foreground"
                          )}
                        >
                          {f}
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-card p-3">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Web APIs (timers)</p>
                  <div className="flex min-h-[44px] flex-wrap content-start gap-1.5">
                    {frame.timers.length === 0 ? (
                      <span className="text-xs text-muted-foreground/60">No active timers</span>
                    ) : (
                      frame.timers.map((t) => (
                        <span key={t.label} className="rounded-lg bg-amber-500/15 px-2.5 py-1.5 font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                          {t.label} · {t.ms}ms
                        </span>
                      ))
                    )}
                  </div>
                </div>
                <QueueBox title="Microtask queue" items={frame.micros} empty="Empty" accent="bg-violet-500/15 text-violet-600 dark:text-violet-400" />
                <QueueBox title="Macrotask queue" items={frame.macros} empty="Empty" accent="bg-amber-500/15 text-amber-600 dark:text-amber-400" />
              </div>

              <div className="rounded-xl border border-border bg-card p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Console output</p>
                <div className="min-h-[52px] rounded-lg bg-black/90 p-3 font-mono text-xs leading-relaxed text-emerald-300">
                  {frame.out.length === 0 ? (
                    <span className="text-white/30">Nothing logged yet</span>
                  ) : (
                    frame.out.map((o, i) => <div key={i}>&gt; {o}</div>)
                  )}
                </div>
              </div>
            </>
          )}

          <p className="text-xs text-muted-foreground">
            Simplified model: real browsers also juggle rendering, network and user-input tasks, but the ordering rules shown here (sync first, then all microtasks, then one macrotask per turn) match the real engine.
          </p>
        </div>
      </div>
    </ToolPageShell>
  );
}
