// /tools/model-picker - A decision guide for picking an AI model. Answer 3
// questions, tune the scoring weights, get ranked recommendations.
// 100% heuristic: not live benchmarks, prices are approximate.

import { useCallback, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bot, Info, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/model-picker")({
  head: () => {
    const seo = getToolSeoMeta("model-picker");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: ModelPickerTool,
});

type TaskId = "coding" | "chat" | "vision" | "docs" | "everyday";
const TASKS: { id: TaskId; name: string; desc: string }[] = [
  { id: "coding", name: "Coding", desc: "Write, debug and review code" },
  { id: "chat", name: "Chat & writing", desc: "Drafts, brainstorming, editing" },
  { id: "vision", name: "Vision & images", desc: "Read screenshots, diagrams, photos" },
  { id: "docs", name: "Long documents", desc: "Summarize and reason over big files" },
  { id: "everyday", name: "Everyday assistant", desc: "Quick questions, fast answers" },
];

const BUDGETS = [
  { id: 0, name: "Free only", desc: "No API spend at all" },
  { id: 1, name: "Cheap", desc: "A few dollars a month" },
  { id: 2, name: "Moderate", desc: "Happy to pay for quality" },
  { id: 3, name: "Price no object", desc: "Best result wins" },
] as const;

const LATENCIES = [
  { id: "instant", name: "Instant", desc: "Feels like autocomplete" },
  { id: "fast", name: "Fast", desc: "A few seconds is fine" },
  { id: "patient", name: "Can wait", desc: "Quality over speed" },
] as const;
type LatencyId = (typeof LATENCIES)[number]["id"];

interface Model {
  name: string;
  provider: string;
  quality: number; // 0-10
  speed: number;
  cheap: number; // 0-10, higher = cheaper
  context: number; // 0-10, higher = longer context
  costTier: 0 | 1 | 2 | 3; // free / cheap / mid / expensive
  priceHint: string;
  bestFor: string;
  fit: Record<TaskId, number>;
}

const MODELS: Model[] = [
  { name: "Claude Opus 4.5", provider: "Anthropic", quality: 9.7, speed: 5, cheap: 3, context: 9, costTier: 3, priceHint: "Premium per-token pricing", bestFor: "Hardest coding and reasoning problems", fit: { coding: 1.15, chat: 1.1, vision: 1.05, docs: 1.15, everyday: 0.95 } },
  { name: "Claude Sonnet 4.5", provider: "Anthropic", quality: 9.2, speed: 7, cheap: 5, context: 9, costTier: 2, priceHint: "Mid-range per-token pricing", bestFor: "Coding agents and daily pro work", fit: { coding: 1.15, chat: 1.05, vision: 1, docs: 1.1, everyday: 1.05 } },
  { name: "GPT-5", provider: "OpenAI", quality: 9.5, speed: 5.5, cheap: 3, context: 8, costTier: 3, priceHint: "Premium per-token pricing", bestFor: "Top-tier general reasoning", fit: { coding: 1.1, chat: 1.1, vision: 1.05, docs: 1.05, everyday: 1 } },
  { name: "Gemini 2.5 Pro", provider: "Google", quality: 9.3, speed: 6, cheap: 5, context: 10, costTier: 2, priceHint: "Mid-range, huge context window", bestFor: "Giant documents and multimodal work", fit: { coding: 1.05, chat: 1, vision: 1.1, docs: 1.2, everyday: 1.05 } },
  { name: "Gemini 2.5 Flash", provider: "Google", quality: 7.5, speed: 9, cheap: 8, context: 9, costTier: 1, priceHint: "Very cheap per-token pricing", bestFor: "Fast, cheap everyday answers", fit: { coding: 1, chat: 1.05, vision: 1.05, docs: 1, everyday: 1.1 } },
  { name: "DeepSeek V3", provider: "DeepSeek", quality: 8.5, speed: 6.5, cheap: 9, context: 7, costTier: 1, priceHint: "One of the cheapest strong models", bestFor: "Strong coding on a budget", fit: { coding: 1.1, chat: 1, vision: 0.95, docs: 1, everyday: 1.05 } },
  { name: "Qwen3 235B", provider: "Alibaba (open)", quality: 8.6, speed: 5.5, cheap: 9, context: 8, costTier: 0, priceHint: "Open weights, free to self-host", bestFor: "Private, self-hosted coding help", fit: { coding: 1.05, chat: 1, vision: 0.95, docs: 1.05, everyday: 1 } },
  { name: "Kimi K2", provider: "Moonshot", quality: 8.7, speed: 7, cheap: 8, context: 8, costTier: 1, priceHint: "Cheap API, agentic strengths", bestFor: "Agentic coding at low cost", fit: { coding: 1.05, chat: 1, vision: 0.95, docs: 1, everyday: 1.05 } },
  { name: "Grok 4", provider: "xAI", quality: 8.8, speed: 6, cheap: 4, context: 7, costTier: 2, priceHint: "Mid-range per-token pricing", bestFor: "Real-time-flavored chat", fit: { coding: 1, chat: 1.05, vision: 1, docs: 1, everyday: 1 } },
  { name: "Mistral Large 2", provider: "Mistral", quality: 8.2, speed: 7, cheap: 7, context: 7, costTier: 1, priceHint: "Affordable EU-hosted option", bestFor: "EU-hosted, multilingual work", fit: { coding: 1, chat: 1.05, vision: 0.95, docs: 1, everyday: 1.05 } },
  { name: "Llama 3.3 70B", provider: "Meta (open)", quality: 8, speed: 6, cheap: 9, context: 7, costTier: 0, priceHint: "Open weights, free to self-host", bestFor: "Fully private local setups", fit: { coding: 1, chat: 1, vision: 0.9, docs: 1, everyday: 1 } },
];

interface Weights { quality: number; cheap: number; speed: number; context: number; }

const WEIGHT_LABELS: { id: keyof Weights; name: string; desc: string }[] = [
  { id: "quality", name: "Answer quality", desc: "How smart the answers are" },
  { id: "cheap", name: "Low cost", desc: "How cheap it is to run" },
  { id: "speed", name: "Speed", desc: "How fast responses arrive" },
  { id: "context", name: "Long context", desc: "How much it can read at once" },
];

const DEFAULT_WEIGHTS: Record<TaskId, Weights> = {
  coding: { quality: 90, cheap: 40, speed: 55, context: 70 },
  chat: { quality: 80, cheap: 50, speed: 70, context: 40 },
  vision: { quality: 80, cheap: 50, speed: 60, context: 50 },
  docs: { quality: 80, cheap: 40, speed: 40, context: 100 },
  everyday: { quality: 60, cheap: 70, speed: 90, context: 30 },
};

const BUDGET_PENALTY = [1, 0.9, 0.75, 0.6]; // applied when model tier exceeds budget tier... computed below

function ModelPickerTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("model-picker", isPro);
  const seo = getToolSeo("model-picker");

  const [task, setTask] = useState<TaskId>("coding");
  const [budget, setBudget] = useState<number>(1);
  const [latency, setLatency] = useState<LatencyId>("fast");
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS.coding);
  const [weightsTouched, setWeightsTouched] = useState(false);
  const [results, setResults] = useState<{ model: Model; score: number }[] | null>(null);

  const pickTask = (t: TaskId) => {
    setTask(t);
    if (!weightsTouched) setWeights(DEFAULT_WEIGHTS[t]);
    setResults(null);
  };

  const rank = useCallback(() => {
    if (!trial.canUse) return;
    trial.recordUse();
    // Latency preference scales the speed weight so the control is real.
    const speedMult = latency === "instant" ? 1.6 : latency === "patient" ? 0.6 : 1;
    const wSpeed = weights.speed * speedMult;
    const wsum = weights.quality + weights.cheap + wSpeed + weights.context || 1;
    const ranked = MODELS.map((m) => {
      const base =
        (m.quality * weights.quality +
          m.cheap * weights.cheap +
          m.speed * wSpeed +
          m.context * weights.context) /
        wsum;
      const tierGap = Math.max(0, m.costTier - budget);
      const budgetPenalty = tierGap === 0 ? 1 : (BUDGET_PENALTY[Math.min(3, tierGap)] ?? 1);
      const score = Math.round(base * 10 * m.fit[task] * budgetPenalty);
      return { model: m, score };
    }).sort((a, b) => b.score - a.score);
    setResults(ranked);
    toast.success("Recommendations ready - remember these are heuristics, not benchmarks.");
  }, [trial, weights, task, budget, latency]);

  const bars = useMemo(
    () =>
      results?.slice(0, 3).map((r) => ({
        ...r,
        parts: [
          { label: "Quality", v: r.model.quality },
          { label: "Cost", v: r.model.cheap },
          { label: "Speed", v: r.model.speed },
          { label: "Context", v: r.model.context },
        ],
      })) ?? [],
    [results],
  );

  return (
    <ToolPageShell toolId="model-picker" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="AI Model Picker" left={trial.left} />

      <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3">
        <p className="text-sm font-semibold text-sky-700 dark:text-sky-400">
          Honest note: these rankings are heuristics, not live benchmarks.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Scores come from public knowledge up to early 2026 and approximate pricing. Real performance varies by task - always check the provider's current docs and pricing before committing.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-sm font-black text-foreground">1. What is the main job?</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {TASKS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => pickTask(t.id)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition",
                    task === t.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/40",
                  )}
                >
                  <p className={cn("text-sm font-black", task === t.id ? "text-primary" : "text-foreground")}>{t.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-black text-foreground">2. What is your budget?</p>
            <div className="grid gap-2 sm:grid-cols-4">
              {BUDGETS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => { setBudget(b.id); setResults(null); }}
                  className={cn(
                    "rounded-xl border p-3 text-left transition",
                    budget === b.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/40",
                  )}
                >
                  <p className={cn("text-sm font-black", budget === b.id ? "text-primary" : "text-foreground")}>{b.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{b.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-black text-foreground">3. How fast must it feel?</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {LATENCIES.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => { setLatency(l.id); setResults(null); }}
                  className={cn(
                    "rounded-xl border p-3 text-left transition",
                    latency === l.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/40",
                  )}
                >
                  <p className={cn("text-sm font-black", latency === l.id ? "text-primary" : "text-foreground")}>{l.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{l.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-black text-foreground">4. Tune the scoring (optional)</p>
              <button
                type="button"
                onClick={() => { setWeights(DEFAULT_WEIGHTS[task]); setWeightsTouched(false); setResults(null); }}
                className="text-xs font-bold text-muted-foreground underline-offset-2 hover:underline"
              >
                Reset to task defaults
              </button>
            </div>
            <div className="space-y-3">
              {WEIGHT_LABELS.map((w) => (
                <div key={w.id}>
                  <div className="mb-1 flex items-baseline justify-between">
                    <p className="text-[13px] font-medium text-foreground/80">
                      {w.name} <span className="text-xs text-muted-foreground">- {w.desc}</span>
                    </p>
                    <p className="text-sm font-black text-foreground">{weights[w.id]}</p>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={weights[w.id]}
                    onChange={(e) => { setWeights((p) => ({ ...p, [w.id]: Number(e.target.value) })); setWeightsTouched(true); setResults(null); }}
                    className="w-full accent-primary"
                    aria-label={w.name}
                  />
                </div>
              ))}
            </div>
          </div>

          <ActionButton busy={false} disabled={!trial.canUse} onClick={rank}>
            <Sparkles className="h-4 w-4" /> Find my model
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free picks left.
            </p>
          )}
        </div>

        <div className="space-y-4">
          {!results ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-border bg-card p-6 text-center">
              <Bot className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your top 3 picks appear here</p>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                Answer the 3 questions, tune the weights if you like, then hit "Find my model".
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 rounded-xl border border-muted bg-card px-4 py-3 text-xs text-muted-foreground">
                <Info className="h-4 w-4 shrink-0" />
                Scores are weighted heuristics for "{TASKS.find((t) => t.id === task)?.name}", not measured benchmarks.
              </div>
              {bars.map((r, i) => (
                <div key={r.model.name} className={cn("rounded-2xl border bg-card p-5", i === 0 ? "border-primary/60" : "border-border")}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="flex items-center gap-2 font-black text-foreground">
                        {i === 0 && <span className="rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-black uppercase text-primary-foreground">Top pick</span>}
                        {r.model.name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{r.model.provider} - {r.model.priceHint}</p>
                    </div>
                    <p className="text-3xl font-black text-primary">{r.score}</p>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    <span className="font-bold text-foreground">Why:</span> {r.model.bestFor}.
                  </p>
                  <div className="mt-3 space-y-1.5">
                    {r.parts.map((p) => (
                      <div key={p.label} className="flex items-center gap-2">
                        <span className="w-14 text-[11px] font-bold text-muted-foreground">{p.label}</span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${p.v * 10}%` }} />
                        </div>
                        <span className="w-7 text-right text-[11px] font-bold text-muted-foreground">{p.v.toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {results.length > 3 && (
                <details className="rounded-2xl border border-border bg-card p-4">
                  <summary className="cursor-pointer text-sm font-bold text-muted-foreground">
                    See all {results.length} models ranked
                  </summary>
                  <div className="mt-3 space-y-1.5">
                    {results.slice(3).map((r) => (
                      <div key={r.model.name} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{r.model.name} <span className="text-xs">({r.model.provider})</span></span>
                        <span className="font-black text-foreground">{r.score}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
