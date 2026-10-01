// /tools/ai-cost-calculator - Estimate what AI API calls cost from per-1M-token
// prices for popular models. 100% in-browser.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bot, Copy } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/ai-cost-calculator")({
  head: () => {
    const seo = getToolSeoMeta("ai-cost-calculator");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: AiCostTool,
});

interface Model {
  name: string;
  vendor: string;
  inputPer1M: number;
  outputPer1M: number;
}

// Listed prices in USD per 1M tokens. Prices change often - verify with the provider.
const MODELS: Model[] = [
  { name: "GPT-4o", vendor: "OpenAI", inputPer1M: 2.5, outputPer1M: 10 },
  { name: "GPT-4o mini", vendor: "OpenAI", inputPer1M: 0.15, outputPer1M: 0.6 },
  { name: "GPT-4.1", vendor: "OpenAI", inputPer1M: 2, outputPer1M: 8 },
  { name: "GPT-4.1 mini", vendor: "OpenAI", inputPer1M: 0.4, outputPer1M: 1.6 },
  { name: "o3", vendor: "OpenAI", inputPer1M: 2, outputPer1M: 8 },
  { name: "o4-mini", vendor: "OpenAI", inputPer1M: 1.1, outputPer1M: 4.4 },
  { name: "Claude Sonnet 4", vendor: "Anthropic", inputPer1M: 3, outputPer1M: 15 },
  { name: "Claude Opus 4", vendor: "Anthropic", inputPer1M: 15, outputPer1M: 75 },
  { name: "Claude Haiku 3.5", vendor: "Anthropic", inputPer1M: 0.8, outputPer1M: 4 },
  { name: "Gemini 2.5 Pro", vendor: "Google", inputPer1M: 1.25, outputPer1M: 10 },
  { name: "Gemini 2.5 Flash", vendor: "Google", inputPer1M: 0.3, outputPer1M: 2.5 },
  { name: "Gemini 2.0 Flash", vendor: "Google", inputPer1M: 0.1, outputPer1M: 0.4 },
  { name: "Grok 3", vendor: "xAI", inputPer1M: 3, outputPer1M: 15 },
  { name: "DeepSeek V3", vendor: "DeepSeek", inputPer1M: 0.27, outputPer1M: 1.1 },
  { name: "Mistral Large", vendor: "Mistral", inputPer1M: 2, outputPer1M: 6 },
  { name: "Llama 3.3 70B", vendor: "Meta (hosted)", inputPer1M: 0.35, outputPer1M: 0.4 },
];

const inputCls =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary/60";

function num(v: string): number {
  const n = parseFloat(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function fmtUsd(v: number): string {
  if (v >= 1000) return `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (v >= 1) return `$${v.toFixed(2)}`;
  if (v >= 0.01) return `$${v.toFixed(4)}`;
  return `$${v.toFixed(6)}`;
}

function AiCostTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("ai-cost-calculator", isPro);
  const seo = getToolSeo("ai-cost-calculator");

  const [modelName, setModelName] = useState(MODELS![0]!.name!);
  const [inTokens, setInTokens] = useState("2000");
  const [outTokens, setOutTokens] = useState("500");
  const [runsPerDay, setRunsPerDay] = useState("100");

  const result = useMemo(() => {
    const model = MODELS.find((m) => m.name === modelName) ?? MODELS[0];
    const inN = num(inTokens);
    const outN = num(outTokens);
    const runs = num(runsPerDay);
    const perRun = (inN / 1_000_000) * model!.inputPer1M + (outN / 1_000_000) * model!.outputPer1M;
    const inputShare = perRun > 0 ? ((inN / 1_000_000) * model!.inputPer1M) / perRun : 0;
    return { model, inN, outN, runs, perRun, inputShare, perDay: perRun * runs, perMonth: perRun * runs * 30 };
  }, [modelName, inTokens, outTokens, runsPerDay]);

  const copyEstimate = async () => {
    if (!trial.canUse) return;
    const text =
      `AI cost estimate - ${result.model!.name} (${result.model!.vendor})\n` +
      `Price: $${result.model!.inputPer1M} / $${result.model!.outputPer1M} per 1M input/output tokens\n` +
      `Per request: ${result.inN.toLocaleString()} input + ${result.outN.toLocaleString()} output tokens = ${fmtUsd(result.perRun)}\n` +
      `At ${result.runs.toLocaleString()} requests/day: ${fmtUsd(result.perDay)}/day, ${fmtUsd(result.perMonth)}/month (30 days)\n` +
      `Note: prices change often, verify with the provider before budgeting.`;
    try {
      await navigator.clipboard.writeText(text);
      trial.recordUse();
      toast.success("Estimate copied to clipboard");
    } catch {
      toast.error("Could not copy - your browser blocked clipboard access");
    }
  };

  const VENDORS = [...new Set(MODELS.map((m) => m.vendor))];

  return (
    <ToolPageShell toolId="ai-cost-calculator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="AI Cost Calculator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Model</label>
            <select value={modelName} onChange={(e) => setModelName(e.target.value)} className={inputCls}>
              {VENDORS.map((v) => (
                <optgroup key={v} label={v}>
                  {MODELS.filter((m) => m.vendor === v).map((m) => (
                    <option key={m.name} value={m.name}>
                      {m.name} (${m.inputPer1M} / ${m.outputPer1M} per 1M)
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">
                Input tokens
              </label>
              <input type="number" min={0} value={inTokens} onChange={(e) => setInTokens(e.target.value)} className={inputCls} placeholder="e.g. 2000" />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">
                Output tokens
              </label>
              <input type="number" min={0} value={outTokens} onChange={(e) => setOutTokens(e.target.value)} className={inputCls} placeholder="e.g. 500" />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">
              Requests per day
            </label>
            <input type="number" min={0} value={runsPerDay} onChange={(e) => setRunsPerDay(e.target.value)} className={inputCls} placeholder="e.g. 100" />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Optional - scales the per-request cost into daily and monthly figures.
            </p>
          </div>

          <ActionButton busy={false} disabled={!trial.canUse} onClick={copyEstimate}>
            <Copy className="h-4 w-4" /> Copy estimate
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left - everything runs on your device.
            </p>
          )}

          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5">
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">Honest note</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              AI prices change often, and some vendors charge differently by region, tier, or batch
              API. Verify the current price with the provider before budgeting.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="space-y-6">
            <div className="rounded-xl bg-primary/5 p-5 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Cost per request
              </p>
              <p className="mt-1 text-3xl font-extrabold text-primary">{fmtUsd(result.perRun)}</p>
              <p className="mt-0.5 text-sm font-medium text-foreground/70">
                {result.model!.name} - {result.inN.toLocaleString()} in / {result.outN.toLocaleString()} out tokens
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs text-muted-foreground">Per day ({result.runs.toLocaleString()} requests)</p>
                <p className="mt-1 text-xl font-bold tabular-nums">{fmtUsd(result.perDay)}</p>
              </div>
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs text-muted-foreground">Per month (30 days)</p>
                <p className="mt-1 text-xl font-bold tabular-nums">{fmtUsd(result.perMonth)}</p>
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="font-medium text-foreground/80">Cost split</span>
                <span className="text-muted-foreground">
                  Input {Math.round(result.inputShare * 100)}% / Output {Math.round((1 - result.inputShare) * 100)}%
                </span>
              </div>
              <div className="flex h-3 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary transition-all" style={{ width: `${result.inputShare * 100}%` }} />
                <div className="h-full bg-secondary transition-all" style={{ width: `${(1 - result.inputShare) * 100}%` }} />
              </div>
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span>Input: ${result.model!.inputPer1M} / 1M tokens</span>
                <span>Output: ${result.model!.outputPer1M} / 1M tokens</span>
              </div>
            </div>

            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <Bot className="mt-0.5 h-4 w-4 shrink-0" />
              Reasoning models also bill hidden reasoning tokens as output, which can multiply the
              real cost. Cached-input discounts, if your provider offers them, are not included.
            </p>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
