// /tools/turing-machine - A real Turing machine lab: edit the rule table,
// write a tape, then run / step the head and watch the machine compute.

import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Play, Pause, StepForward, StepBack, RotateCcw, Copy, Plus, Trash2, Cpu } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/turing-machine")({
  head: () => {
    const seo = getToolSeoMeta("turing-machine");
    const canonical = "https://iconvault.site/tools/turing-machine";
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
  component: TuringLab,
});

interface Rule {
  id: number;
  state: string;
  read: string;
  write: string;
  move: "L" | "R";
  next: string;
}

interface MachineState {
  tape: string[];
  head: number;
  state: string;
  log: string[];
  halted: boolean;
  haltReason: string;
  steps: number;
}

const BLANK = "_";
const MAX_STEPS = 1000;

function emptyTape(input: string): string[] {
  const cells = input.split("").map((c) => (c === " " ? BLANK : c));
  return cells.length === 0 ? [BLANK] : cells;
}

function stepMachine(ms: MachineState, rules: Rule[]): MachineState {
  if (ms.halted) return ms;
  if (ms.steps >= MAX_STEPS) {
    return { ...ms, halted: true, haltReason: `stopped after ${MAX_STEPS} steps - possible infinite loop` };
  }
  const read = ms.tape[ms.head] ?? BLANK;
  const rule = rules.find((r) => r.state === ms.state && r.read === read);
  if (!rule) {
    const kind = ms.state.startsWith("accept") ? "ACCEPTED" : ms.state.startsWith("reject") ? "REJECTED" : "HALTED";
    const reason =
      ms.state.startsWith("accept")
        ? "reached an accept state"
        : ms.state.startsWith("reject")
          ? "reached a reject state"
          : `no rule for (state=${ms.state}, read=${read})`;
    return { ...ms, halted: true, haltReason: `${kind} - ${reason}` };
  }
  const tape = [...ms.tape];
  tape[ms.head] = rule.write;
  let head = ms.head + (rule.move === "R" ? 1 : -1);
  if (head < 0) {
    tape.unshift(BLANK);
    head = 0;
  }
  if (head >= tape.length) tape.push(BLANK);
  const entry = `(${rule.state}, ${read}) -> write ${rule.write}, move ${rule.move}, goto ${rule.next}`;
  return {
    tape,
    head,
    state: rule.next,
    log: [...ms.log, entry],
    halted: false,
    haltReason: "",
    steps: ms.steps + 1,
  };
}

function freshMachine(input: string, startState: string): MachineState {
  return { tape: emptyTape(input), head: 0, state: startState, log: [], halted: false, haltReason: "", steps: 0 };
}

let ruleSeq = 100;
const mkRule = (state: string, read: string, write: string, move: "L" | "R", next: string): Rule => ({
  id: ruleSeq++,
  state,
  read,
  write,
  move,
  next,
});

const EXAMPLES: { name: string; desc: string; input: string; start: string; rules: Rule[] }[] = [
  {
    name: "Binary increment",
    desc: "Adds 1 to a binary number, e.g. 1011 -> 1100. q0 walks right to the end, q1 carries the 1 left.",
    input: "1011",
    start: "q0",
    rules: [
      mkRule("q0", "0", "0", "R", "q0"),
      mkRule("q0", "1", "1", "R", "q0"),
      mkRule("q0", BLANK, BLANK, "L", "q1"),
      mkRule("q1", "1", "0", "L", "q1"),
      mkRule("q1", "0", "1", "L", "halt"),
      mkRule("q1", BLANK, "1", "L", "halt"),
    ],
  },
  {
    name: "Palindrome check",
    desc: "Accepts strings like abba, rejects abab. Marks matching outer pairs with X until nothing is left.",
    input: "abba",
    start: "q0",
    rules: [
      mkRule("q0", "a", "X", "R", "qra"),
      mkRule("q0", "b", "X", "R", "qrb"),
      mkRule("q0", "X", "X", "R", "q0"),
      mkRule("q0", BLANK, BLANK, "R", "accept"),
      mkRule("qra", "a", "a", "R", "qra"),
      mkRule("qra", "b", "b", "R", "qra"),
      mkRule("qra", "X", "X", "R", "qra"),
      mkRule("qra", BLANK, BLANK, "L", "qchka"),
      mkRule("qchka", "a", "X", "L", "qback"),
      mkRule("qchka", "b", "b", "R", "reject"),
      mkRule("qchka", "X", "X", "L", "qchka"),
      mkRule("qchka", BLANK, BLANK, "R", "accept"),
      mkRule("qrb", "a", "a", "R", "qrb"),
      mkRule("qrb", "b", "b", "R", "qrb"),
      mkRule("qrb", "X", "X", "R", "qrb"),
      mkRule("qrb", BLANK, BLANK, "L", "qchkb"),
      mkRule("qchkb", "b", "X", "L", "qback"),
      mkRule("qchkb", "a", "a", "R", "reject"),
      mkRule("qchkb", "X", "X", "L", "qchkb"),
      mkRule("qchkb", BLANK, BLANK, "R", "accept"),
      mkRule("qback", "a", "a", "L", "qback"),
      mkRule("qback", "b", "b", "L", "qback"),
      mkRule("qback", "X", "X", "L", "qback"),
      mkRule("qback", BLANK, BLANK, "R", "q0"),
    ],
  },
  {
    name: "Flip bits",
    desc: "Turns every 0 into 1 and every 1 into 0, e.g. 1010 -> 0101.",
    input: "1010",
    start: "q0",
    rules: [
      mkRule("q0", "0", "1", "R", "q0"),
      mkRule("q0", "1", "0", "R", "q0"),
      mkRule("q0", BLANK, BLANK, "R", "halt"),
    ],
  },
];

function TuringLab() {
  const { isPro } = usePlan();
  const trial = useToolTrial("turing-machine", isPro);
  const seo = getToolSeo("turing-machine");

  const [rules, setRules] = useState<Rule[]>(() => EXAMPLES[0]!.rules.map((r) => ({ ...r })));
  const [input, setInput] = useState(EXAMPLES[0]!.input);
  const [startState, setStartState] = useState(EXAMPLES[0]!.start);
  const [exampleDesc, setExampleDesc] = useState(EXAMPLES[0]!.desc);
  const [ms, setMs] = useState<MachineState>(() => freshMachine(EXAMPLES[0]!.input, EXAMPLES[0]!.start));
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(6);
  const [copied, setCopied] = useState(false);

  const reset = useCallback((inp: string, start: string) => {
    setMs(freshMachine(inp, start));
    setPlaying(false);
  }, []);

  useEffect(() => {
    if (!playing || ms.halted) {
      if (ms.halted) setPlaying(false);
      return;
    }
    const t = setTimeout(() => setMs((m) => stepMachine(m, rules)), 1000 / speed);
    return () => clearTimeout(t);
  }, [playing, ms, rules, speed]);

  const loadExample = (ex: (typeof EXAMPLES)[number]) => {
    setRules(ex.rules.map((r) => ({ ...r, id: ruleSeq++ })));
    setInput(ex.input);
    setStartState(ex.start);
    setExampleDesc(ex.desc);
    reset(ex.input, ex.start);
  };

  const updateRule = (id: number, patch: Partial<Rule>) =>
    setRules((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const addRule = () =>
    setRules((rs) => [...rs, { id: ruleSeq++, state: "q0", read: BLANK, write: BLANK, move: "R" as const, next: "halt" }]);

  const delRule = (id: number) => setRules((rs) => rs.filter((r) => r.id !== id));

  const copyRules = useCallback(() => {
    if (!trial.canUse) return;
    const text = [
      `# Turing machine rules (state, read -> write, move, next)`,
      `# blank symbol: ${BLANK}`,
      ...rules.map((r) => `${r.state}, ${r.read} -> ${r.write}, ${r.move}, ${r.next}`),
      ``,
      `Start state: ${startState}`,
      `Example input: ${input}`,
    ].join("\n");
    void navigator.clipboard.writeText(text).then(() => {
      trial.recordUse();
      setCopied(true);
      toast.success("Rules copied");
      setTimeout(() => setCopied(false), 1500);
    });
  }, [rules, startState, input, trial]);

  const tapeView = useMemo(() => {
    const lo = Math.max(0, ms.head - 8);
    const hi = Math.min(ms.tape.length - 1, ms.head + 8);
    const cells: { i: number; v: string }[] = [];
    for (let k = lo; k <= hi; k++) cells.push({ i: k, v: ms.tape[k] ?? BLANK });
    return cells;
  }, [ms]);

  const haltColor = ms.haltReason.startsWith("ACCEPTED")
    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
    : ms.haltReason.startsWith("REJECTED")
      ? "border-rose-500/50 bg-rose-500/10 text-rose-300"
      : "border-border bg-muted/40 text-muted-foreground";

  return (
    <ToolPageShell toolId="turing-machine" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Turing Machine" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Example machines</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex.name}
                  type="button"
                  onClick={() => loadExample(ex)}
                  className="rounded-xl border border-border px-3.5 py-2 text-sm font-bold text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
                >
                  {ex.name}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">{exampleDesc}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Tape input</label>
              <input
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  reset(e.target.value, startState);
                }}
                spellCheck={false}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary/60"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Start state</label>
              <input
                value={startState}
                onChange={(e) => {
                  setStartState(e.target.value);
                  reset(input, e.target.value);
                }}
                spellCheck={false}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary/60"
              />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background p-4">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => reset(input, startState)} className="rounded-lg border border-border p-2 text-muted-foreground transition hover:border-primary/50 hover:text-foreground" title="Reset">
                <RotateCcw className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setMs((m) => stepMachine(m, rules))} disabled={ms.halted} className="rounded-lg border border-border p-2 text-muted-foreground transition hover:border-primary/50 hover:text-foreground disabled:opacity-40" title="Single step">
                <StepForward className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setPlaying((p) => !p)} disabled={ms.halted} className="rounded-lg bg-primary p-2.5 text-primary-foreground transition hover:opacity-90 disabled:opacity-40" title={playing ? "Pause" : "Run"}>
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <button type="button" onClick={() => { setPlaying(false); let cur = freshMachine(input, startState); let guard = 0; while (!cur.halted && guard++ < MAX_STEPS) cur = stepMachine(cur, rules); setMs(cur); }} className="rounded-lg border border-border px-3 py-2 text-xs font-bold text-muted-foreground transition hover:border-primary/50 hover:text-foreground" title="Run to completion">
                Run all
              </button>
              <span className="ml-auto font-mono text-xs text-muted-foreground">{ms.steps} steps</span>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Speed</span>
              <input type="range" min={1} max={30} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="w-full accent-primary" />
              <span className="font-mono text-xs text-muted-foreground">{speed}/s</span>
            </div>
          </div>

          <ActionButton disabled={!trial.canUse} onClick={copyRules}>
            {copied ? <Cpu className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy rules"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left - everything runs locally in your browser.
            </p>
          )}
        </div>

        <div className="space-y-5">
          {/* tape */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Tape</p>
              <span className={cn("rounded-lg border px-2.5 py-1 font-mono text-xs font-bold", ms.halted ? haltColor : "border-primary/50 bg-primary/10 text-primary")}>
                state: {ms.state}
              </span>
            </div>
            <div className="flex flex-wrap items-stretch justify-center gap-1">
              {tapeView.map((c) => (
                <div key={c.i} className="flex flex-col items-center">
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-lg border-2 font-mono text-lg font-bold transition",
                      c.i === ms.head ? "border-primary bg-primary/20 text-primary shadow-[0_0_16px_rgba(0,0,0,0.25)]" : "border-border bg-background text-foreground/80",
                    )}
                  >
                    {c.v}
                  </div>
                  <span className={cn("mt-1 font-mono text-[10px]", c.i === ms.head ? "font-bold text-primary" : "text-muted-foreground")}>
                    {c.i === ms.head ? "head" : c.i}
                  </span>
                </div>
              ))}
            </div>
            {ms.halted && (
              <div className={cn("mt-4 rounded-xl border px-4 py-3 font-mono text-sm font-bold", haltColor)}>
                {ms.haltReason}
              </div>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              Blank symbol is <span className="font-mono">{BLANK}</span>. A machine halts when no rule matches; states starting with <span className="font-mono">accept</span> or <span className="font-mono">reject</span> are reported as accepted or rejected.
            </p>
          </div>

          {/* rule table */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Rule table (state, read, write, move, next)</p>
              <button type="button" onClick={addRule} className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold text-muted-foreground transition hover:border-primary/50 hover:text-foreground">
                <Plus className="h-3.5 w-3.5" /> Add rule
              </button>
            </div>
            <div className="space-y-1.5">
              <div className="grid grid-cols-[1fr_1fr_1fr_64px_1fr_32px] gap-1.5 px-1 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                <span>state</span>
                <span>read</span>
                <span>write</span>
                <span>move</span>
                <span>next</span>
                <span />
              </div>
              {rules.map((r) => (
                <div key={r.id} className="grid grid-cols-[1fr_1fr_1fr_64px_1fr_32px] gap-1.5">
                  <input value={r.state} onChange={(e) => updateRule(r.id, { state: e.target.value })} spellCheck={false} className="rounded-lg border border-border bg-background px-2 py-1.5 font-mono text-xs outline-none focus:border-primary/60" />
                  <input value={r.read} onChange={(e) => updateRule(r.id, { read: e.target.value.slice(0, 1) || BLANK })} spellCheck={false} className="rounded-lg border border-border bg-background px-2 py-1.5 text-center font-mono text-xs outline-none focus:border-primary/60" />
                  <input value={r.write} onChange={(e) => updateRule(r.id, { write: e.target.value.slice(0, 1) || BLANK })} spellCheck={false} className="rounded-lg border border-border bg-background px-2 py-1.5 text-center font-mono text-xs outline-none focus:border-primary/60" />
                  <button type="button" onClick={() => updateRule(r.id, { move: r.move === "L" ? "R" : "L" })} className="rounded-lg border border-border bg-background px-2 py-1.5 font-mono text-xs font-bold text-primary transition hover:border-primary/60">
                    {r.move}
                  </button>
                  <input value={r.next} onChange={(e) => updateRule(r.id, { next: e.target.value })} spellCheck={false} className="rounded-lg border border-border bg-background px-2 py-1.5 font-mono text-xs outline-none focus:border-primary/60" />
                  <button type="button" onClick={() => delRule(r.id)} className="rounded-lg border border-border p-1.5 text-muted-foreground transition hover:border-rose-500/60 hover:text-rose-400" title="Delete rule">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* log */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 text-[13px] font-medium text-foreground/80">Transition log</p>
            {ms.log.length === 0 ? (
              <p className="text-sm text-muted-foreground">Press run or step - every transition the head makes is listed here.</p>
            ) : (
              <div className="max-h-56 space-y-1 overflow-y-auto">
                {ms.log.map((l, li) => (
                  <p key={li} className="rounded-lg bg-background px-3 py-1.5 font-mono text-xs text-foreground/85">
                    <span className="mr-2 font-bold text-muted-foreground">{li + 1}.</span>
                    {l}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
