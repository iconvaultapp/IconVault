// /tools/css-specificity - Calculate (a,b,c) specificity for selectors with
// bar visualization, a Battle mode comparing two selectors, and a 10-question
// quiz. 100% in-browser.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Crown, RefreshCw, Swords, Target } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/css-specificity")({
  head: () => {
    const seo = getToolSeoMeta("css-specificity");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: SpecificityTool,
});

type Score = [number, number, number];

function compareScores(x: Score, y: Score): number {
  if (x[0] !== y[0]) return x[0] - y[0];
  if (x[1] !== y[1]) return x[1] - y[1];
  return x[2] - y[2];
}

function total(s: Score): number {
  return s[0] * 10000 + s[1] * 100 + s[2];
}

/** Calculate CSS specificity (a,b,c): IDs, classes/attrs/pseudo-classes, types/pseudo-elements. */
function specificity(selector: string): Score {
  let a = 0, b = 0, c = 0;
  let s = selector.trim();
  if (!s) return [0, 0, 0];
  // Strip strings
  s = s.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, " ");
  // Functional pseudo-classes :not/:is/:has/:matches take the max of their arguments
  s = s.replace(/:(not|is|has|matches)\(([^()]*(?:\([^()]*\)[^()]*)*)\)/gi, (_m, _fn, inner: string) => {
    let best: Score = [0, 0, 0];
    for (const part of inner.split(",")) {
      const r = specificity(part.trim());
      if (compareScores(r, best) > 0) best = r;
    }
    a += best[0]; b += best[1]; c += best[2];
    return " ";
  });
  // :where() adds nothing, not even its arguments
  s = s.replace(/:where\([^()]*\)/gi, " ");
  // Pseudo-elements -> c
  const pe = s.match(/::[\w-]+/g);
  if (pe) c += pe.length;
  s = s.replace(/::[\w-]+/g, " ");
  // IDs -> a
  const ids = s.match(/#[\w-]+/g);
  if (ids) a += ids.length;
  s = s.replace(/#[\w-]+/g, " ");
  // Classes -> b
  const cls = s.match(/\.[\w-]+/g);
  if (cls) b += cls.length;
  s = s.replace(/\.[\w-]+/g, " ");
  // Attribute selectors -> b
  const attrs = s.match(/\[[^\]]*\]/g);
  if (attrs) b += attrs.length;
  s = s.replace(/\[[^\]]*\]/g, " ");
  // Remaining pseudo-classes -> b
  const pcs = s.match(/:[\w-]+(\([^()]*\))?/g);
  if (pcs) b += pcs.length;
  s = s.replace(/:[\w-]+(\([^()]*\))?/g, " ");
  // Type selectors left over -> c
  const types = s
    .split(/[\s>+~]+/)
    .map((t) => t.trim())
    .filter((t) => t && t !== "*" && /^[a-zA-Z][\w-]*$/.test(t));
  c += types.length;
  return [a, b, c];
}

function ScoreBars({ score, compact }: { score: Score; compact?: boolean }) {
  const max = Math.max(score[0], score[1], score[2], 1);
  const defs = [
    { label: "a (IDs)", value: score[0], color: "bg-red-500" },
    { label: "b (classes)", value: score[1], color: "bg-amber-500" },
    { label: "c (types)", value: score[2], color: "bg-sky-500" },
  ];
  return (
    <div className={cn("w-full", compact ? "space-y-1" : "space-y-1.5")}>
      {defs.map((d) => (
        <div key={d.label} className="flex items-center gap-2">
          <span className={cn("shrink-0 font-mono text-muted-foreground", compact ? "w-20 text-[10px]" : "w-24 text-xs")}>
            {d.label}
          </span>
          <div className={cn("flex-1 rounded-full bg-muted", compact ? "h-1.5" : "h-2")}>
            <div
              className={cn("h-full rounded-full transition-all", d.color)}
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
          <span className={cn("w-6 text-right font-mono font-bold", compact ? "text-[11px]" : "text-xs")}>
            {d.value}
          </span>
        </div>
      ))}
    </div>
  );
}

type Mode = "calc" | "battle" | "quiz";

interface QuizQ {
  selector: string;
  options: Score[];
  answer: number;
  explain: string;
}

const QUIZ: QuizQ[] = [
  { selector: "div", options: [[0,0,0],[0,0,1],[1,0,0],[0,1,0]], answer: 1, explain: "One type selector counts in column c." },
  { selector: ".card", options: [[0,0,1],[0,1,0],[1,0,0],[0,0,0]], answer: 1, explain: "One class counts in column b." },
  { selector: "#main", options: [[0,0,1],[0,1,0],[1,0,0],[1,1,0]], answer: 2, explain: "One ID counts in column a." },
  { selector: "div.card", options: [[0,0,1],[0,1,0],[0,1,1],[1,1,0]], answer: 2, explain: "One type (c) plus one class (b)." },
  { selector: "ul li a:hover", options: [[0,1,3],[0,1,2],[0,0,3],[1,1,3]], answer: 0, explain: "Three types (ul, li, a) and one pseudo-class (:hover)." },
  { selector: "input[type=\"text\"]", options: [[0,1,1],[0,2,1],[1,0,1],[0,1,0]], answer: 0, explain: "One attribute selector (b) plus the input type (c)." },
  { selector: "#nav .link.active", options: [[1,1,0],[1,2,0],[0,2,0],[1,0,0]], answer: 1, explain: "One ID and two classes." },
  { selector: "p::first-line", options: [[0,1,1],[0,0,2],[0,0,1],[0,2,0]], answer: 1, explain: "Pseudo-elements count as types: p + ::first-line." },
  { selector: "div:not(.hero)", options: [[0,1,1],[0,2,1],[0,1,0],[1,1,1]], answer: 0, explain: ":not takes its argument's score (.hero), plus the div." },
  { selector: "main article p.intro strong", options: [[0,1,4],[0,1,3],[1,1,4],[0,0,4]], answer: 0, explain: "Four types (main, article, p, strong) plus one class." },
];

const fmt = (s: Score) => `(${s[0]}, ${s[1]}, ${s[2]})`;

function SpecificityTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("css-specificity", isPro);
  const seo = getToolSeo("css-specificity");

  const [mode, setMode] = useState<Mode>("calc");
  const [text, setText] = useState("#main .card\nul li a:hover\ninput[type=\"text\"]");
  const [selA, setSelA] = useState("#sidebar .widget");
  const [selB, setSelB] = useState("main aside div.widget.active");
  const [quizIdx, setQuizIdx] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizPicked, setQuizPicked] = useState<number | null>(null);
  const [quizDone, setQuizDone] = useState(false);

  const rows = useMemo(() => {
    const list = text.split("\n").map((l) => l.trim()).filter(Boolean);
    return list
      .map((sel) => ({ sel, score: specificity(sel) }))
      .sort((x, y) => total(y.score) - total(x.score));
  }, [text]);

  const runCalc = () => {
    if (!trial.canUse || rows.length === 0) return;
    trial.recordUse();
    toast.success(`${rows.length} selector${rows.length === 1 ? "" : "s"} analyzed`);
  };

  const battle = useMemo(() => {
    const a = specificity(selA);
    const b = specificity(selB);
    const cmp = compareScores(a, b);
    return { a, b, cmp };
  }, [selA, selB]);

  const battleExplain = useMemo(() => {
    if (battle.cmp === 0) return "Tie - with equal specificity, the selector that appears later in the stylesheet wins.";
    const win = battle.cmp > 0 ? "A" : "B";
    const [w, l] = battle.cmp > 0 ? [battle.a, battle.b] : [battle.b, battle.a];
    const parts: string[] = [];
    if (w[0] !== l[0]) parts.push(`${w[0]} ID${w[0] === 1 ? "" : "s"} vs ${l[0]}`);
    if (w[1] !== l[1]) parts.push(`${w[1]} class-level vs ${l[1]}`);
    if (w[2] !== l[2]) parts.push(`${w[2]} type-level vs ${l[2]}`);
    return `Selector ${win} wins: ${parts.join(", ")}. IDs always beat any number of classes, and classes beat any number of types.`;
  }, [battle]);

  const pickQuiz = (i: number) => {
    if (quizPicked !== null) return;
    setQuizPicked(i);
    if (i === QUIZ[quizIdx]?.answer) setQuizScore((s) => s + 1);
    if (quizIdx + 1 === QUIZ.length) {
      trial.recordUse();
    }
  };

  const nextQuiz = () => {
    if (quizIdx + 1 >= QUIZ.length) setQuizDone(true);
    else { setQuizIdx((i) => i + 1); setQuizPicked(null); }
  };

  const resetQuiz = () => {
    setQuizIdx(0); setQuizScore(0); setQuizPicked(null); setQuizDone(false);
  };

  const q: QuizQ = QUIZ[quizIdx] ?? { selector: "", options: [], answer: 0, explain: "" };

  return (
    <ToolPageShell toolId="css-specificity" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="CSS Specificity" left={trial.left} />

      <div className="mb-5 flex gap-2">
        {(
          [
            { id: "calc", label: "Calculator" },
            { id: "battle", label: "Battle" },
            { id: "quiz", label: "Quiz" },
          ] as { id: Mode; label: string }[]
        ).map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={cn(
              "rounded-xl border px-4 py-2 text-sm font-bold transition",
              mode === m.id ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === "calc" && (
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">
                Selectors, one per line
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={8}
                spellCheck={false}
                className="w-full rounded-xl border border-border bg-background p-3 font-mono text-sm outline-none focus:border-primary"
              />
            </div>
            <button
              type="button" onClick={runCalc} disabled={!trial.canUse || rows.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Target className="h-4 w-4" /> Analyze
            </button>
            {!isPro && (
              <p className="text-xs text-muted-foreground">
                {trial.left} of 5 free analyses left - everything runs in your browser.
              </p>
            )}
          </div>
          <div className="space-y-3">
            {rows.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                Type at least one selector to see its specificity score.
              </p>
            ) : (
              rows.map((r, i) => (
                <div key={`${r.sel}-${i}`} className="rounded-2xl border border-border bg-card p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <code className="truncate font-mono text-sm font-bold">{r.sel}</code>
                    <span className="shrink-0 rounded-lg bg-muted px-2.5 py-1 font-mono text-sm font-bold">
                      {fmt(r.score)}
                    </span>
                  </div>
                  <ScoreBars score={r.score} />
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {mode === "battle" && (
        <div className="grid gap-4 md:grid-cols-2">
          {(
            [
              { label: "Selector A", value: selA, set: setSelA, score: battle.a, winner: battle.cmp > 0 },
              { label: "Selector B", value: selB, set: setSelB, score: battle.b, winner: battle.cmp < 0 },
            ] as const
          ).map((p) => (
            <div
              key={p.label}
              className={cn(
                "space-y-3 rounded-2xl border-2 p-5",
                p.winner ? "border-amber-400 bg-amber-400/5" : "border-border bg-card",
              )}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold">{p.label}</p>
                {p.winner && (
                  <span className="flex items-center gap-1 rounded-full bg-amber-400/20 px-2.5 py-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                    <Crown className="h-3.5 w-3.5" /> Winner
                  </span>
                )}
              </div>
              <input
                value={p.value}
                onChange={(e) => p.set(e.target.value)}
                spellCheck={false}
                className="w-full rounded-xl border border-border bg-background p-2.5 font-mono text-sm outline-none focus:border-primary"
              />
              <p className="font-mono text-sm font-bold">Specificity {fmt(p.score)}</p>
              <ScoreBars score={p.score} compact />
            </div>
          ))}
          <div className="flex items-start gap-2 rounded-2xl border border-border bg-card p-4 md:col-span-2">
            <Swords className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p className="text-sm leading-relaxed">{battleExplain}</p>
          </div>
        </div>
      )}

      {mode === "quiz" && (
        <div className="mx-auto max-w-2xl">
          {!quizDone ? (
            <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold">Question {quizIdx + 1} of {QUIZ.length}</span>
                <span className="font-mono font-bold text-primary">Score: {quizScore}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary transition-all" style={{ width: `${((quizIdx + 1) / QUIZ.length) * 100}%` }} />
              </div>
              <p className="text-center">
                What is the specificity of <code className="rounded bg-muted px-2 py-1 font-mono font-bold">{q.selector}</code>?
              </p>
              <div className="grid grid-cols-2 gap-2">
                {q.options.map((opt, i) => {
                  const isAnswer = i === q.answer;
                  const isPicked = i === quizPicked;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => pickQuiz(i)}
                      disabled={quizPicked !== null}
                      className={cn(
                        "rounded-xl border px-4 py-3 font-mono text-lg font-bold transition",
                        quizPicked === null && "border-border hover:border-primary/50",
                        isPicked && isAnswer && "border-green-500 bg-green-500/10",
                        isPicked && !isAnswer && "border-red-500 bg-red-500/10",
                        quizPicked !== null && !isPicked && isAnswer && "border-green-500 bg-green-500/10",
                        quizPicked !== null && !isPicked && !isAnswer && "border-border opacity-60",
                      )}
                    >
                      {fmt(opt)}
                    </button>
                  );
                })}
              </div>
              {quizPicked !== null && (
                <div className="space-y-3 rounded-xl bg-muted/60 p-4">
                  <p className="text-sm">
                    {quizPicked === q.answer ? (
                      <span className="font-bold text-green-600 dark:text-green-400">Correct. </span>
                    ) : (
                      <span className="font-bold text-red-500">Not quite. </span>
                    )}
                    {q.explain}
                  </p>
                  <button
                    type="button" onClick={nextQuiz}
                    className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90"
                  >
                    {quizIdx + 1 === QUIZ.length ? "Finish quiz" : "Next question"}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 rounded-2xl border border-border bg-card p-8 text-center">
              <Crown className="mx-auto h-10 w-10 text-amber-500" />
              <p className="text-xl font-extrabold">Quiz complete</p>
              <p className="text-sm text-muted-foreground">
                You scored <span className="font-mono font-bold text-primary">{quizScore} / {QUIZ.length}</span>
                {quizScore === QUIZ.length ? " - flawless specificity master." : quizScore >= 7 ? " - solid. A couple of tricky ones." : " - review the (a,b,c) columns and try again."}
              </p>
              <button
                type="button" onClick={resetQuiz}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90"
              >
                <RefreshCw className="h-4 w-4" /> Play again
              </button>
            </div>
          )}
        </div>
      )}
    </ToolPageShell>
  );
}
