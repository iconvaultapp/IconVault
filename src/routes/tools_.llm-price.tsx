// /tools/llm-price - LLM cost calculator: enter your per-request token usage,
// edit the pricing table to match current provider rates, and compare the
// monthly cost across 14 models from 8 providers.

import { useCallback, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Calculator, Pencil } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/llm-price")({
  head: () => {
    const seo = getToolSeoMeta("llm-price");
    const canonical = "https://iconvault.site/tools/llm-price";
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
  component: LlmPrice,
});

interface Model {
  name: string;
  provider: string;
  inPrice: number; // $ per 1M input tokens
  outPrice: number; // $ per 1M output tokens
}

const DEFAULTS: Model[] = [
  { name: "GPT-4o", provider: "OpenAI", inPrice: 2.5, outPrice: 10 },
  { name: "GPT-4o mini", provider: "OpenAI", inPrice: 0.15, outPrice: 0.6 },
  { name: "GPT-4.1", provider: "OpenAI", inPrice: 2, outPrice: 8 },
  { name: "o1", provider: "OpenAI", inPrice: 15, outPrice: 60 },
  { name: "Claude Opus 4", provider: "Anthropic", inPrice: 15, outPrice: 75 },
  { name: "Claude Sonnet 4", provider: "Anthropic", inPrice: 3, outPrice: 15 },
  { name: "Claude Haiku 3.5", provider: "Anthropic", inPrice: 0.8, outPrice: 4 },
  { name: "Gemini 2.5 Pro", provider: "Google", inPrice: 1.25, outPrice: 10 },
  { name: "Gemini 2.5 Flash", provider: "Google", inPrice: 0.3, outPrice: 2.5 },
  { name: "Grok 3", provider: "xAI", inPrice: 3, outPrice: 15 },
  { name: "Llama 3.3 70B", provider: "Meta", inPrice: 0.35, outPrice: 0.4 },
  { name: "Mistral Large", provider: "Mistral", inPrice: 2, outPrice: 6 },
  { name: "DeepSeek V3", provider: "DeepSeek", inPrice: 0.27, outPrice: 1.1 },
  { name: "Command R+", provider: "Cohere", inPrice: 2.5, outPrice: 10 },
];

function fmtCost(n: number): string {
  if (n < 0.01) return `$${n.toFixed(4)}`;
  if (n < 10) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(0)}`;
}

function LlmPrice() {
  const { isPro } = usePlan();
  const trial = useToolTrial("llm-price", isPro);
  const seo = getToolSeo("llm-price");

  const [models, setModels] = useState<Model[]>(DEFAULTS);
  const [inTokens, setInTokens] = useState(2000);
  const [outTokens, setOutTokens] = useState(500);
  const [requests, setRequests] = useState(10000);
  const [editing, setEditing] = useState(false);
  const [done, setDone] = useState(false);

  const rows = useMemo(() => {
    return models
      .map((m) => {
        const perRequest = (inTokens / 1e6) * m.inPrice + (outTokens / 1e6) * m.outPrice;
        return { ...m, perRequest, monthly: perRequest * requests };
      })
      .sort((a, b) => a.monthly - b.monthly);
  }, [models, inTokens, outTokens, requests]);

  const cheapest = rows[0];
  const priciest = rows[rows.length - 1];

  const setPrice = useCallback((idx: number, key: "inPrice" | "outPrice", v: number) => {
    setModels((p) => p.map((m, i) => (i === idx ? { ...m, [key]: Math.max(0, v) } : m)));
  }, []);

  const reset = useCallback(() => setModels(DEFAULTS), []);

  const calculate = useCallback(() => {
    if (!trial.canUse) return;
    setDone(true);
    trial.recordUse();
    toast.success("Costs compared");
  }, [trial]);

  return (
    <ToolPageShell toolId="llm-price" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="LLM Pricing" left={trial.left} />

      <p className="mb-5 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
        Model prices change often: <strong>edit any price in the table</strong> to match your provider's current rate.
        Defaults are approximate list prices, not live quotes.
      </p>

      <div className="mb-5 grid gap-3 rounded-2xl border border-border bg-card p-5 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Input tokens per request</label>
          <input type="number" min={0} value={inTokens}
            onChange={(e) => setInTokens(Math.max(0, Number(e.target.value) || 0))}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Output tokens per request</label>
          <input type="number" min={0} value={outTokens}
            onChange={(e) => setOutTokens(Math.max(0, Number(e.target.value) || 0))}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Requests per month</label>
          <input type="number" min={0} value={requests}
            onChange={(e) => setRequests(Math.max(0, Number(e.target.value) || 0))}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
        </div>
        <div className="sm:col-span-3 flex flex-wrap gap-3">
          <ActionButton disabled={!trial.canUse} onClick={calculate}>
            <Calculator className="h-4 w-4" /> Compare costs
          </ActionButton>
          <button
            type="button"
            onClick={() => setEditing((e) => !e)}
            className={cn(
              "flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-semibold transition",
              editing ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40",
            )}
          >
            <Pencil className="h-4 w-4" /> {editing ? "Done editing" : "Edit prices"}
          </button>
          {editing && (
            <button type="button" onClick={reset} className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:border-primary/40">
              Reset defaults
            </button>
          )}
        </div>
      </div>

      {done && cheapest && priciest && (
        <div className="mb-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
          <p className="font-semibold text-emerald-600 dark:text-emerald-400">
            Cheapest: {cheapest.name} at {fmtCost(cheapest.monthly)}/mo
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Switching from {priciest.name} ({fmtCost(priciest.monthly)}/mo) saves {fmtCost(priciest.monthly - cheapest.monthly)} per month
            ({priciest.monthly > 0 ? (((priciest.monthly - cheapest.monthly) / priciest.monthly) * 100).toFixed(0) : 0}% less).
          </p>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
              <th className="px-4 py-3">Model</th>
              <th className="px-4 py-3">Provider</th>
              <th className="px-4 py-3">$ / 1M in</th>
              <th className="px-4 py-3">$ / 1M out</th>
              <th className="px-4 py-3">Per request</th>
              <th className="px-4 py-3">Per month</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const origIdx = models.findIndex((m) => m.name === r.name && m.provider === r.provider);
              return (
                <tr key={`${r.provider}-${r.name}`} className={cn("border-b border-border/50 last:border-0", i === 0 && done && "bg-emerald-500/5")}>
                  <td className="px-4 py-2.5 font-semibold">{r.name} {i === 0 && done && <span className="ml-1 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">CHEAPEST</span>}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{r.provider}</td>
                  <td className="px-4 py-2.5">
                    {editing ? (
                      <input type="number" min={0} step="any" value={r.inPrice}
                        onChange={(e) => setPrice(origIdx, "inPrice", Number(e.target.value) || 0)}
                        className="w-20 rounded-lg border border-border bg-background px-2 py-1 font-mono text-xs outline-none focus:border-primary" />
                    ) : <span className="font-mono">${r.inPrice}</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    {editing ? (
                      <input type="number" min={0} step="any" value={r.outPrice}
                        onChange={(e) => setPrice(origIdx, "outPrice", Number(e.target.value) || 0)}
                        className="w-20 rounded-lg border border-border bg-background px-2 py-1 font-mono text-xs outline-none focus:border-primary" />
                    ) : <span className="font-mono">${r.outPrice}</span>}
                  </td>
                  <td className="px-4 py-2.5 font-mono">{fmtCost(r.perRequest)}</td>
                  <td className="px-4 py-2.5 font-mono font-bold">{fmtCost(r.monthly)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </ToolPageShell>
  );
}
