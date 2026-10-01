// /tools/prompt-price - Prompt token cost estimator: paste any text, count
// tokens with a hand-written approximate tokenizer (word/punctuation
// heuristic, ~4 chars per token for English), then price it across 10 models.

import { useCallback, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Calculator, Coins } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/prompt-price")({
  head: () => {
    const seo = getToolSeoMeta("prompt-price");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: PromptPrice,
});

/**
 * Hand-written approximate tokenizer. Real BPE tokenizers (tiktoken etc.)
 * are model-specific; this heuristic splits words into ~4-char chunks and
 * treats punctuation as its own token, which lands close for English text.
 */
function tokenize(text: string): string[] {
  const tokens: string[] = [];
  const re = /[\p{L}]+|[\p{N}]+|[^\s\p{L}\p{N}]/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const t = m[0];
    if (/^[\p{L}]+$/u.test(t) && t.length > 6) {
      for (let i = 0; i < t.length; i += 4) tokens.push(t.slice(i, i + 4));
    } else {
      tokens.push(t);
    }
  }
  return tokens;
}

interface Model {
  name: string;
  provider: string;
  inPrice: number;
  outPrice: number;
}

const MODELS: Model[] = [
  { name: "GPT-4o mini", provider: "OpenAI", inPrice: 0.15, outPrice: 0.6 },
  { name: "GPT-4o", provider: "OpenAI", inPrice: 2.5, outPrice: 10 },
  { name: "Claude Haiku 3.5", provider: "Anthropic", inPrice: 0.8, outPrice: 4 },
  { name: "Claude Sonnet 4", provider: "Anthropic", inPrice: 3, outPrice: 15 },
  { name: "Gemini 2.5 Flash", provider: "Google", inPrice: 0.3, outPrice: 2.5 },
  { name: "Gemini 2.5 Pro", provider: "Google", inPrice: 1.25, outPrice: 10 },
  { name: "DeepSeek V3", provider: "DeepSeek", inPrice: 0.27, outPrice: 1.1 },
  { name: "Llama 3.3 70B", provider: "Meta", inPrice: 0.35, outPrice: 0.4 },
  { name: "Mistral Large", provider: "Mistral", inPrice: 2, outPrice: 6 },
  { name: "Grok 3", provider: "xAI", inPrice: 3, outPrice: 15 },
];

function fmtCost(n: number): string {
  if (n < 0.01) return `$${n.toFixed(5)}`;
  if (n < 1) return `$${n.toFixed(3)}`;
  return `$${n.toFixed(2)}`;
}

const SAMPLE = `You are a helpful assistant. Summarize the following meeting notes into 5 bullet points, then draft a follow-up email to the client in a friendly but professional tone.`;

function PromptPrice() {
  const { isPro } = usePlan();
  const trial = useToolTrial("prompt-price", isPro);
  const seo = getToolSeo("prompt-price");

  const [text, setText] = useState(SAMPLE);
  const [outPct, setOutPct] = useState(25);
  const [done, setDone] = useState(false);

  const tokens = useMemo(() => tokenize(text), [text]);
  const outTokens = useMemo(() => Math.round((tokens.length * outPct) / 100), [tokens.length, outPct]);

  const rows = useMemo(() => {
    return MODELS.map((m) => {
      const perPrompt = (tokens.length / 1e6) * m.inPrice + (outTokens / 1e6) * m.outPrice;
      return { ...m, perPrompt, per1k: perPrompt * 1000 };
    }).sort((a, b) => a.perPrompt - b.perPrompt);
  }, [tokens.length, outTokens]);

  const estimate = useCallback(() => {
    if (!trial.canUse) return;
    if (!text.trim()) {
      toast.error("Paste some text first.");
      return;
    }
    setDone(true);
    trial.recordUse();
    toast.success("Cost estimated");
  }, [text, trial]);

  return (
    <ToolPageShell toolId="prompt-price" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Prompt Cost Estimator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Your prompt</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              placeholder="Paste your system prompt or user message…"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span><strong className="text-foreground">{text.length.toLocaleString()}</strong> characters</span>
              <span><strong className="text-foreground">{tokens.length.toLocaleString()}</strong> tokens (est.)</span>
              <span><strong className="text-foreground">{tokens.length > 0 ? (text.length / tokens.length).toFixed(1) : "-"}</strong> chars/token</span>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-[13px] font-medium text-foreground/80">Expected output length</label>
              <span className="text-sm font-bold text-primary">{outPct}% of input = ~{outTokens.toLocaleString()} tokens</span>
            </div>
            <input
              type="range" min={0} max={200} value={outPct}
              onChange={(e) => setOutPct(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <p className="mt-1 text-xs text-muted-foreground">Output tokens are usually pricier than input tokens.</p>
          </div>

          {done && tokens.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="mb-2 text-sm font-semibold">How the tokenizer split your text</p>
              <div className="flex max-h-32 flex-wrap gap-1 overflow-y-auto">
                {tokens.slice(0, 120).map((t, i) => (
                  <span key={i} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">{t}</span>
                ))}
                {tokens.length > 120 && <span className="text-xs text-muted-foreground">+{(tokens.length - 120).toLocaleString()} more</span>}
              </div>
            </div>
          )}

          <ActionButton disabled={!trial.canUse || !text.trim()} onClick={estimate}>
            <Calculator className="h-4 w-4" /> Estimate cost
          </ActionButton>
          <p className="text-xs text-muted-foreground">
            Token counts are approximate (hand-written heuristic, not tiktoken). Prices are approximate list rates, verify with your provider.
          </p>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-5">
            {!done ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
                <Coins className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="font-semibold">Cost per provider appears here</p>
                <p className="mt-1 text-sm text-muted-foreground">Hit Estimate cost to price your prompt across 10 models.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <p className="text-sm font-semibold">~{tokens.length.toLocaleString()} in / ~{outTokens.toLocaleString()} out tokens</p>
                {rows.map((r, i) => (
                  <div key={r.name} className={cn("rounded-xl border border-border p-3", i === 0 && "border-emerald-500/50 bg-emerald-500/5")}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold">{r.name}</p>
                      <p className="font-mono text-sm font-extrabold">{fmtCost(r.perPrompt)}</p>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{r.provider}</span>
                      <span>{fmtCost(r.per1k)} per 1k prompts</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
