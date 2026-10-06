// /tools/keyword-density - keyword density analyzer: total words, keyword
// count, density percentage and top single-word / two-word phrase tables.
// 100% client-side.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, FileText } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/keyword-density";
import toolSeoMeta from "@/lib/tool-seo-meta-data/keyword-density";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/keyword-density")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/keyword-density";
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
  component: KeywordDensityTool,
});

/** Lowercase, strip punctuation, split on whitespace. */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

interface DensityResult {
  totalWords: number;
  keywordCount: number;
  density: number;
  uniqueWords: number;
  topWords: [string, number][];
  topPhrases: [string, number][];
}

function analyzeText(text: string, keyword: string): DensityResult {
  const words = tokenize(text);
  const totalWords = words.length;

  const escaped = keyword
    .trim()
    .toLowerCase()
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = text.toLowerCase().match(new RegExp(`\\b${escaped}\\b`, "g"));
  const keywordCount = matches ? matches.length : 0;

  const wordMap = new Map<string, number>();
  for (const w of words) {
    if (w.length < 3) continue;
    wordMap.set(w, (wordMap.get(w) ?? 0) + 1);
  }

  const phraseMap = new Map<string, number>();
  for (let i = 0; i < words.length - 1; i++) {
    const a = words[i];
    const b = words[i + 1];
    if (a === undefined || b === undefined) continue;
    if (a.length < 3 || b.length < 3) continue;
    const phrase = `${a} ${b}`;
    phraseMap.set(phrase, (phraseMap.get(phrase) ?? 0) + 1);
  }

  const topN = (m: Map<string, number>): [string, number][] =>
    [...m.entries()].sort((x, y) => y[1] - x[1]).slice(0, 10);

  return {
    totalWords,
    keywordCount,
    density: totalWords === 0 ? 0 : (keywordCount / totalWords) * 100,
    uniqueWords: new Set(words).size,
    topWords: topN(wordMap),
    topPhrases: topN(phraseMap),
  };
}

function densityColor(d: number): string {
  if (d < 2) return "text-emerald-600 dark:text-emerald-400";
  if (d <= 4) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function StatCard({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${valueClass ?? ""}`}>{value}</p>
    </div>
  );
}

function FrequencyTable({
  title,
  rows,
  totalWords,
}: {
  title: string;
  rows: [string, number][];
  totalWords: number;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <p className="border-b border-border px-5 py-3 text-sm font-bold">{title}</p>
      {rows.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted-foreground">No data yet - analyze some text first.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-2.5 font-semibold">Term</th>
              <th className="px-5 py-2.5 text-right font-semibold">Count</th>
              <th className="px-5 py-2.5 text-right font-semibold">Density</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([term, count]) => (
              <tr key={term} className="border-t border-border/60">
                <td className="px-5 py-2.5 font-medium">{term}</td>
                <td className="px-5 py-2.5 text-right font-mono">{count}</td>
                <td className="px-5 py-2.5 text-right font-mono text-muted-foreground">
                  {totalWords === 0 ? "0.00" : ((count / totalWords) * 100).toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function KeywordDensityTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("keyword-density", isPro);
  const seo = toolSeo;

  const [text, setText] = useState("");
  const [keyword, setKeyword] = useState("");
  const [result, setResult] = useState<DensityResult | null>(null);

  const analyze = () => {
    if (!trial.canUse) return;
    if (!text.trim()) {
      toast.error("Paste some article text first.");
      return;
    }
    if (!keyword.trim()) {
      toast.error("Enter a target keyword.");
      return;
    }
    setResult(analyzeText(text, keyword));
    trial.recordUse();
  };

  return (
    <ToolPageShell toolId="keyword-density" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Keyword Density Checker" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div>
            <label
              htmlFor="kd-keyword"
              className="mb-2 block text-[13px] font-medium text-foreground/80"
            >
              Target keyword
            </label>
            <input
              id="kd-keyword"
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="e.g. running shoes"
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary/60"
            />
          </div>
          <div>
            <label htmlFor="kd-text" className="mb-2 block text-[13px] font-medium text-foreground/80">
              Article text
            </label>
            <textarea
              id="kd-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your article here..."
              rows={12}
              className="w-full resize-y rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary/60"
            />
          </div>
          <ActionButton disabled={!trial.canUse} onClick={analyze}>
            <BarChart3 className="h-4 w-4" /> Analyze density
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free analyses left - everything runs in your browser.
            </p>
          )}
        </div>

        <div>
          {!result ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-border bg-card text-center">
              <FileText className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your density report appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Paste an article, enter your target keyword and hit Analyze to see word
                counts, density and the most frequent terms.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard label="Total words" value={result.totalWords.toLocaleString("en-US")} />
                <StatCard label="Keyword count" value={result.keywordCount.toLocaleString("en-US")} />
                <StatCard
                  label="Density"
                  value={`${result.density.toFixed(2)}%`}
                  valueClass={densityColor(result.density)}
                />
                <StatCard label="Unique words" value={result.uniqueWords.toLocaleString("en-US")} />
              </div>
              <p className="text-xs text-muted-foreground">
                Aim for 1-2% density - below 2% is safe, 2-4% is worth reviewing, above 4%
                looks like keyword stuffing.
              </p>
              <div className="grid gap-6 xl:grid-cols-2">
                <FrequencyTable title="Top 10 keywords" rows={result.topWords} totalWords={result.totalWords} />
                <FrequencyTable title="Top 10 phrases" rows={result.topPhrases} totalWords={result.totalWords} />
              </div>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
