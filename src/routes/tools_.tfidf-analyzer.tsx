// /tools/tfidf-analyzer - rank documents by TF-IDF relevance to a query with
// a per-term score breakdown. 100% client-side.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/tfidf-analyzer";
import toolSeoMeta from "@/lib/tool-seo-meta-data/tfidf-analyzer";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/tfidf-analyzer")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/tfidf-analyzer";
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
  component: TfidfAnalyzerTool,
});

const MAX_DOCS = 8;

function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9]+|[\u4e00-\u9fff]/g) ?? [];
}

interface TermScore {
  term: string;
  tf: number;
  df: number;
  idf: number;
  tfidf: number;
}

interface DocResult {
  index: number;
  score: number;
  terms: TermScore[];
  tokenCount: number;
}

function analyze(docs: string[], query: string): DocResult[] {
  const queryTerms = [...new Set(tokenize(query))];
  if (queryTerms.length === 0) return [];
  const N = docs.length;
  const docTokens = docs.map(tokenize);
  const df = new Map<string, number>();
  for (const term of queryTerms) {
    let count = 0;
    for (const tokens of docTokens) {
      if (tokens.includes(term)) count++;
    }
    df.set(term, count);
  }
  return docs.map((_, i) => {
    const tokens = docTokens[i]!;
    const terms: TermScore[] = queryTerms.map((term) => {
      const tf = tokens.length > 0 ? tokens.filter((t) => t === term).length / tokens.length : 0;
      const d = df.get(term) ?? 0;
      const idf = d > 0 ? Math.log(N / d) : 0;
      return { term, tf, df: d, idf, tfidf: tf * idf };
    });
    return {
      index: i,
      score: terms.reduce((a, t) => a + t.tfidf, 0),
      terms,
      tokenCount: tokens.length,
    };
  });
}

const fmt = (n: number) => (n >= 0.0001 ? n.toFixed(4) : n.toExponential(1));

function TfidfAnalyzerTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("tfidf-analyzer", isPro);
  const seo = toolSeo;

  const [docs, setDocs] = useState<string[]>(["", ""]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DocResult[] | null>(null);
  const [selected, setSelected] = useState(0);

  const queryTerms = useMemo(() => [...new Set(tokenize(query))], [query]);

  const run = () => {
    if (!trial.canUse) return;
    const filled = docs.filter((d) => d.trim().length > 0);
    if (filled.length < 2) {
      toast.error("Add text to at least 2 documents");
      return;
    }
    if (queryTerms.length === 0) {
      toast.error("Enter a query first");
      return;
    }
    const ranked = analyze(docs, query).sort((x, y) => y.score - x.score);
    setResults(ranked);
    setSelected(ranked[0]?.index ?? 0);
    trial.recordUse();
    toast.success("Documents ranked");
  };

  const setDoc = (i: number, v: string) => setDocs((p) => p.map((d, j) => (j === i ? v : d)));
  const addDoc = () => {
    if (docs.length >= MAX_DOCS) return;
    setDocs((p) => [...p, ""]);
  };
  const removeDoc = (i: number) => {
    if (docs.length <= 2) return;
    setDocs((p) => p.filter((_, j) => j !== i));
  };

  const selectedResult = results?.find((r) => r.index === selected) ?? null;
  const maxScore = results ? Math.max(0.0001, ...results.map((r) => r.score)) : 1;

  const highlightQuery = (text: string): React.ReactNode => {
    if (queryTerms.length === 0) return text;
    const re = new RegExp(`(${queryTerms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
    const parts = text.split(re);
    return parts.map((p, i) =>
      queryTerms.includes(p.toLowerCase()) ? (
        <mark key={i} className="rounded bg-primary/20 px-0.5 font-bold text-primary">
          {p}
        </mark>
      ) : (
        <span key={i}>{p}</span>
      ),
    );
  };

  return (
    <ToolPageShell toolId="tfidf-analyzer" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="TF-IDF Analyzer" left={trial.left} />

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        {docs.map((d, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold">Doc {i + 1}</span>
              <button
                type="button"
                onClick={() => removeDoc(i)}
                disabled={docs.length <= 2}
                title="Remove document"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Minus className="h-4 w-4" />
              </button>
            </div>
            <textarea
              value={d}
              onChange={(e) => setDoc(i, e.target.value)}
              placeholder={`Paste document ${i + 1} text...`}
              spellCheck={false}
              className="h-40 w-full resize-y rounded-xl border border-border bg-background p-3 text-[13px] leading-relaxed outline-none focus:border-primary"
            />
          </div>
        ))}
        {docs.length < MAX_DOCS && (
          <button
            type="button"
            onClick={addDoc}
            className="flex min-h-[120px] items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border text-sm font-bold text-muted-foreground transition hover:border-primary/40 hover:text-primary"
          >
            <Plus className="h-4 w-4" /> Add document
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-4">
        <label className="min-w-[240px] flex-1">
          <span className="mb-1 block text-xs font-semibold text-muted-foreground">Query</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. machine learning ranking"
            spellCheck={false}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
        </label>
        <div className="pt-5">
          <ActionButton disabled={!trial.canUse} onClick={run}>
            <BarChart3 className="h-4 w-4" /> Rank documents
          </ActionButton>
        </div>
      </div>

      {results && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="rounded-2xl border border-border bg-card p-4">
            <span className="mb-3 block text-sm font-bold">Ranking</span>
            <div className="space-y-2">
              {results.map((r, rank) => (
                <button
                  key={r.index}
                  type="button"
                  onClick={() => setSelected(r.index)}
                  className={cn(
                    "w-full rounded-xl border p-3 text-left transition",
                    selected === r.index ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
                  )}
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold">
                      #{rank + 1} Doc {r.index + 1}
                    </span>
                    <span className="font-mono text-xs font-bold text-primary">{fmt(r.score)}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${(r.score / maxScore) * 100}%` }}
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <span className="mb-3 block text-sm font-bold">
              Per-term breakdown - Doc {(selectedResult?.index ?? 0) + 1}
            </span>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2 font-bold">Term</th>
                    <th className="px-3 py-2 font-bold">TF</th>
                    <th className="px-3 py-2 font-bold">DF</th>
                    <th className="px-3 py-2 font-bold">IDF</th>
                    <th className="px-3 py-2 font-bold">TF x IDF</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedResult?.terms.map((t) => (
                    <tr key={t.term} className="border-b border-border/50 last:border-0">
                      <td className="px-3 py-2 font-mono font-bold">{t.term}</td>
                      <td className="px-3 py-2 font-mono">{fmt(t.tf)}</td>
                      <td className="px-3 py-2 font-mono">
                        {t.df}/{docs.length}
                      </td>
                      <td className="px-3 py-2 font-mono">{fmt(t.idf)}</td>
                      <td className="px-3 py-2 font-mono font-bold text-primary">{fmt(t.tfidf)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mb-2 mt-5 text-sm font-bold">Matched terms in document</p>
            <div className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-xl border border-border bg-background p-3 text-[13px] leading-relaxed">
              {highlightQuery(docs[selectedResult?.index ?? 0] ?? "")}
            </div>
          </div>
        </div>
      )}

      {!results && (
        <div className="mt-6 flex min-h-[160px] flex-col items-center justify-center rounded-2xl border border-dashed border-border text-center">
          <BarChart3 className="mb-2 h-8 w-8 text-muted-foreground/50" />
          <p className="px-6 text-sm font-semibold text-muted-foreground">
            Fill at least 2 documents, enter a query, and hit Rank documents
          </p>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-4">
        {!isPro && (
          <p className="text-xs text-muted-foreground">
            {trial.left} of {TOOL_TRIAL_LIMIT} free analyses left - runs fully in your browser.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Client-side demo ranking: standard TF-IDF with natural-log IDF, tokenized on words, case-insensitive.
        </p>
      </div>
    </ToolPageShell>
  );
}
