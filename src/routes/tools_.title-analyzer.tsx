// /tools/title-analyzer - Score a blog title across 16 headline elements and
// get actionable fixes. 100% client-side.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Type } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/title-analyzer";
import toolSeoMeta from "@/lib/tool-seo-meta-data/title-analyzer";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/title-analyzer")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/title-analyzer";
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
  component: TitleAnalyzerTool,
});

const POWER_WORDS = new Set([
  "ultimate", "proven", "secret", "amazing", "essential", "powerful", "free",
  "exclusive", "surprising", "effective", "easy", "quick", "best", "new",
  "breakthrough", "unbelievable", "insane", "incredible", "simple", "fast",
]);

const SENTIMENT_WORDS = new Set([
  "love", "hate", "fear", "joy", "amazing", "terrible", "stunning", "shocking",
  "worst", "best", "happy", "angry", "sad", "excited", "brilliant", "awful",
]);

const UNIQUENESS_WORDS = new Set([
  "secret", "never", "always", "first", "last", "only", "everyone", "nobody",
  "why", "how", "what", "mistake", "myth", "truth", "hack", "mistakes",
]);

interface Element { name: string; pass: boolean; suggestion: string; }

function analyze(title: string): Element[] {
  const t = title.trim();
  const words = t.toLowerCase().split(/\s+/).filter(Boolean);
  const lower = t.toLowerCase();
  const wordCount: Record<string, number> = {};
  for (const w of words) wordCount[w] = (wordCount[w] || 0) + 1;
  const maxRepeat = Math.max(0, ...Object.values(wordCount));
  const has = (set: Set<string>) => words.some((w) => set.has(w));
  const firstThree = words.slice(0, 3);

  return [
    {
      name: "Length is 50-60 characters (ideal for search)",
      pass: t.length >= 50 && t.length <= 60,
      suggestion: `Currently ${t.length} chars. ${t.length < 50 ? "Too short - add a benefit or keyword." : "Too long - trim words that do not change the meaning."}`,
    },
    {
      name: "Not too short (over 30 characters)",
      pass: t.length > 30,
      suggestion: "Titles under 30 characters waste SERP space. Add a keyword or number.",
    },
    {
      name: "Word count of 6-9 words (scannable)",
      pass: words.length >= 6 && words.length <= 9,
      suggestion: `Currently ${words.length} words. Aim for 6-9 scannable words.`,
    },
    {
      name: "Contains a number (listicle power)",
      pass: /\d/.test(t),
      suggestion: "Add a number, e.g. \"7 ways…\" or \"2026 guide…\". Numbers lift clicks.",
    },
    {
      name: "Uses a power word",
      pass: has(POWER_WORDS),
      suggestion: "Add a power word like ultimate, proven, essential or free.",
    },
    {
      name: "Uses a sentiment word (emotional hook)",
      pass: has(SENTIMENT_WORDS),
      suggestion: "Add an emotional word like amazing, worst, love or shocking.",
    },
    {
      name: "Uses a uniqueness word",
      pass: has(UNIQUENESS_WORDS),
      suggestion: "Words like secret, why, how, never, everyone add curiosity.",
    },
    {
      name: "Speaks to the reader (you / your)",
      pass: /\b(you|your|yours)\b/.test(lower),
      suggestion: "Address the reader directly with \"you\" or \"your\".",
    },
    {
      name: "Starts with how, what, why or a number",
      pass: /^(how|what|why|\d)/.test(lower),
      suggestion: "Opening with how/what/why or a number pulls the eye.",
    },
    {
      name: "Keyword within the first 3 words",
      pass: firstThree.some((w) => w.length > 4),
      suggestion: "Put your main keyword in the first three words so searchers and Google see it first.",
    },
    {
      name: "Uses brackets or parentheses",
      pass: /[\[\(]/.test(t),
      suggestion: "A bracketed tag like [Guide] or (2026) can lift CTR.",
    },
    {
      name: "Asks a question",
      pass: /\?/.test(t),
      suggestion: "A question headline invites curiosity - try it if the content answers one.",
    },
    {
      name: "Not ALL CAPS (or mostly caps)",
      pass: !(/[A-Z]{4,}/.test(t) && t.replace(/[^A-Za-z]/g, "").length > 0 && t === t.toUpperCase()),
      suggestion: "Avoid all-caps titles - they read as shouting and get truncated oddly.",
    },
    {
      name: "No excessive punctuation (!!!, …)",
      pass: !/!!|…{2,}|\.{3,}|[!?]{3,}/.test(t),
      suggestion: "Remove repeated exclamation marks or ellipses - one punctuation mark is enough.",
    },
    {
      name: "No repeated keyword stuffing",
      pass: maxRepeat <= 2,
      suggestion: `A word appears ${maxRepeat} times. Repeating keywords reads as spam.`,
    },
    {
      name: "Capitalized cleanly (title or sentence case)",
      pass: !/\b[a-z][A-Z]/.test(t),
      suggestion: "Fix mixed capitalization - use title case or sentence case consistently.",
    },
  ];
}

function grade(score: number): { letter: string; color: string } {
  if (score >= 90) return { letter: "A", color: "text-emerald-500" };
  if (score >= 75) return { letter: "B", color: "text-lime-500" };
  if (score >= 60) return { letter: "C", color: "text-amber-500" };
  if (score >= 40) return { letter: "D", color: "text-orange-500" };
  return { letter: "F", color: "text-red-500" };
}

function TitleAnalyzerTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("title-analyzer", isPro);
  const seo = toolSeo;

  const [title, setTitle] = useState("");
  const [elements, setElements] = useState<Element[] | null>(null);

  const run = () => {
    if (!title.trim() || !trial.canUse) return;
    setElements(analyze(title));
    trial.recordUse();
  };

  const score = elements ? Math.round((elements.filter((e) => e.pass).length / elements.length) * 100) : 0;
  const g = grade(score);
  const failed = elements?.filter((e) => !e.pass) ?? [];

  return (
    <ToolPageShell toolId="title-analyzer" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Title Analyzer" left={trial.left} />

      <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <label className="mb-1 block text-[13px] font-medium text-foreground/80">Blog title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. 10 proven ways to write headlines that get clicked"
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-base focus:border-primary focus:outline-none"
        />
        <div className="flex items-center gap-3">
          <ActionButton disabled={!title.trim() || !trial.canUse} onClick={run}>
            <Type className="h-4 w-4" /> Analyze title
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free analyses left.
            </p>
          )}
        </div>
      </div>

      {elements && (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-6">
            <p className={cn("text-7xl font-black", g.color)}>{score}</p>
            <p className={cn("mt-1 text-2xl font-black", g.color)}>Grade {g.letter}</p>
            <p className="mt-3 text-sm text-muted-foreground">
              {elements.filter((e) => e.pass).length} of 16 elements passed
            </p>
            <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${score}%` }} />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 text-base font-bold">Actionable suggestions</h2>
            {failed.length === 0 ? (
              <p className="flex items-center gap-2 text-sm font-semibold text-emerald-500">
                <CheckCircle2 className="h-5 w-5" /> Perfect title - all 16 elements passed.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {failed.map((e) => (
                  <li key={e.name} className="flex gap-2.5 rounded-xl border border-border p-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <div>
                      <p className="text-sm font-bold">{e.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{e.suggestion}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-bold text-muted-foreground">
                Show all 16 elements ({elements.filter((e) => e.pass).length} passed)
              </summary>
              <ul className="mt-2 space-y-1.5">
                {elements.map((e) => (
                  <li key={e.name} className="flex items-start gap-2 text-sm">
                    {e.pass
                      ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />}
                    <span className={e.pass ? "text-foreground/80" : "font-semibold"}>{e.name}</span>
                  </li>
                ))}
              </ul>
            </details>
          </div>
        </div>
      )}
    </ToolPageShell>
  );
}
