// /tools/title-score - FAST 0-100 headline scorer focused on CTR likelihood
// (power words, sentiment, numbers, brackets, pixel length). NOT the deep
// "Title Analyzer" tool: no full SEO audit here, just a fast score with fixes.

import { useCallback, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, ClipboardCopy, Gauge, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/title-score";
import toolSeoMeta from "@/lib/tool-seo-meta-data/title-score";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/title-score")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/title-score";
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
  component: TitleScoreTool,
});

const POWER_WORDS = [
  "ultimate", "proven", "secret", "free", "best", "new", "easy", "quick", "simple",
  "powerful", "essential", "complete", "definitive", "guaranteed", "exclusive", "insider",
  "master", "step-by-step", "beginner", "advanced", "top", "amazing", "incredible",
];
const EMOTION_WORDS = [
  "love", "hate", "fear", "amazing", "shocking", "surprising", "brilliant", "terrible",
  "beautiful", "ugly", "funny", "sad", "angry", "excited", "worried", "confident",
  "bold", "brave", "curious", "delightful", "painful", "smart", "stupid",
];
const CLICKBAIT = ["shocking", "you won't believe", "mind-blowing", "unbelievable", "crazy", "insane", "jaw-dropping", "what happens next"];
const LEADING_STOP = ["the", "a", "an", "this", "that", "these", "those"];

interface CheckResult {
  label: string;
  weight: number;
  pass: boolean;
  tip: string;
}

function measurePixels(text: string): number {
  try {
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d");
    if (!ctx) return 0;
    ctx.font = "400 20px Arial";
    return ctx.measureText(text).width;
  } catch {
    return 0;
  }
}

function scoreTitle(raw: string): { score: number; checks: CheckResult[]; pixels: number } {
  const title = raw.trim();
  const lower = title.toLowerCase();
  const words = lower.split(/\s+/).filter(Boolean);
  const checks: CheckResult[] = [];
  const pixels = measurePixels(title);

  const add = (label: string, weight: number, pass: boolean, tip: string) =>
    checks.push({ label, weight, pass, tip });

  add("Character length 40-60", 8, title.length >= 40 && title.length <= 60,
    title.length < 40 ? "Aim for 40-60 characters: too short wastes SERP space." : "Trim to 40-60 characters to avoid truncation.");
  add("Pixel width under 580px", 8, pixels > 0 && pixels <= 580,
    "Google truncates around 580-600px. Shorten it or swap wide words.");
  add("Word count 6-12", 6, words.length >= 6 && words.length <= 12,
    "Headlines with 6-12 words balance detail and scannability.");
  add("Contains a number", 8, /\d/.test(title), "Numbers lift CTR: odd numbers and lists work best.");
  const numMatch = title.match(/\d+/);
  add("Odd or list number", 4, !!numMatch && parseInt(numMatch[0], 10) % 2 === 1,
    "Odd numbers (7, 9, 21) outperform even ones in headline tests.");
  add("Power word", 8, POWER_WORDS.some((w) => lower.includes(w)),
    "Add a power word: ultimate, proven, secret, free, best, new, easy, complete.");
  add("Emotional word", 8, EMOTION_WORDS.some((w) => lower.includes(w)),
    "Emotional words (love, fear, surprising, brilliant) trigger clicks.");
  add("Brackets or parentheses", 6, /[\[\({]/.test(title),
    "Titles with [brackets] or (parentheses) earn more clicks.");
  add("Asks a question", 5, /\?/.test(title), "A question headline invites the click for the answer.");
  add("How-to format", 6, /\bhow to\b/.test(lower), "\"How to...\" titles match search intent directly.");
  add("Current year", 5, /\b(2025|2026|2027)\b/.test(title), "Adding the current year signals freshness.");
  add("Starts with the keyword", 5,
    words.length > 0 && !LEADING_STOP.includes(words[0]!),
    "Lead with your main keyword, not a filler word like \"the\".");
  add("No ALL-CAPS words", 5, !/\b[A-Z]{2,}\b/.test(title), "All-caps words read as spam and hurt trust.");
  add("At most one exclamation", 4, (title.match(/!/g) || []).length <= 1,
    "More than one exclamation mark reads as clickbait.");
  add("No clickbait spam words", 6, !CLICKBAIT.some((w) => lower.includes(w)),
    "Avoid \"shocking\", \"you won't believe\", \"mind-blowing\": they erode trust.");
  add("No repeated words", 8,
    words.length > 0 && new Set(words).size === words.length,
    "Repeating a word wastes space and weakens the headline.");

  const score = checks.reduce((sum, c) => sum + (c.pass ? c.weight : 0), 0);
  return { score, checks, pixels };
}

function gradeFor(score: number): { grade: string; color: string; note: string } {
  if (score >= 90) return { grade: "A", color: "text-emerald-500", note: "Publish it. This headline is built to get clicked." };
  if (score >= 75) return { grade: "B", color: "text-lime-500", note: "Strong. Fix the misses below for an easy boost." };
  if (score >= 60) return { grade: "C", color: "text-amber-500", note: "Average. The failed checks below are costing you clicks." };
  if (score >= 40) return { grade: "D", color: "text-orange-500", note: "Weak. Rework using the tips below." };
  return { grade: "F", color: "text-red-500", note: "Rewrite this one. Start with a number and a power word." };
}

function TitleScoreTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("title-score", isPro);
  const seo = toolSeo;

  const [title, setTitle] = useState("7 Proven Ways to Double Your Blog Traffic in 2026");
  const result = useMemo(() => scoreTitle(title), [title]);
  const grade = useMemo(() => gradeFor(result.score), [result.score]);
  const failed = useMemo(() => result.checks.filter((c) => !c.pass), [result.checks]);

  const copyReport = useCallback(async () => {
    if (!trial.canUse) return;
    const lines = [
      `Title: ${title.trim() || "(empty)"}`,
      `Score: ${result.score}/100 (Grade ${grade.grade})`,
      "",
      ...result.checks.map((c) => `${c.pass ? "[PASS]" : "[FAIL]"} ${c.label} (+${c.weight})${c.pass ? "" : " - " + c.tip}`),
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      trial.recordUse();
      toast.success("Score report copied");
    } catch {
      toast.error("Could not access the clipboard.");
    }
  }, [title, result, grade, trial]);

  return (
    <ToolPageShell toolId="title-score" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Title Score" left={trial.left} />

      <p className="mb-5 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
        A <strong>fast 0-100 CTR score</strong>, not a deep SEO audit. For a full technical title analysis, use our
        Title Analyzer instead.
      </p>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Your headline</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              className="w-full rounded-xl border border-border bg-background px-3 py-3 text-base outline-none focus:border-primary"
              placeholder="Paste or type your headline…"
            />
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span><strong className="text-foreground">{title.trim().length}</strong> characters</span>
              <span><strong className="text-foreground">{result.pixels ? Math.round(result.pixels) : 0}px</strong> pixel width</span>
              <span><strong className="text-foreground">{title.trim().split(/\s+/).filter(Boolean).length}</strong> words</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <ActionButton disabled={!trial.canUse || !title.trim()} onClick={copyReport}>
                <ClipboardCopy className="h-4 w-4" /> Copy score report
              </ActionButton>
              <button
                type="button"
                onClick={() => setTitle("")}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:border-primary/40"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 text-sm font-semibold">16 scoring checks</p>
            <ul className="space-y-2">
              {result.checks.map((c) => (
                <li key={c.label} className="flex items-start gap-2.5 rounded-xl bg-muted/40 px-3 py-2.5">
                  {c.pass ? (
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  ) : (
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      {c.label} <span className="text-xs font-normal text-muted-foreground">+{c.weight}</span>
                    </p>
                    {!c.pass && <p className="text-xs text-muted-foreground">{c.tip}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <p className="flex items-center justify-center gap-1.5 text-sm font-semibold text-muted-foreground">
              <Gauge className="h-4 w-4" /> CTR score
            </p>
            <div className="relative mx-auto mt-4 h-40 w-40">
              <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
                <circle cx="80" cy="80" r="70" fill="none" strokeWidth="14" className="stroke-muted" />
                <circle
                  cx="80" cy="80" r="70" fill="none" strokeWidth="14" strokeLinecap="round"
                  strokeDasharray={`${(result.score / 100) * 439.8} 439.8`}
                  className={cn("transition-all", result.score >= 75 ? "stroke-emerald-500" : result.score >= 60 ? "stroke-amber-500" : "stroke-red-500")}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-extrabold">{result.score}</span>
                <span className={cn("text-xl font-extrabold", grade.color)}>Grade {grade.grade}</span>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{grade.note}</p>
            {failed.length > 0 && (
              <div className="mt-4 rounded-xl bg-muted/40 p-3 text-left">
                <p className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Top {Math.min(3, failed.length)} quick wins
                </p>
                <ul className="space-y-1">
                  {failed.slice(0, 3).map((f) => (
                    <li key={f.label} className="text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">{f.label}:</span> {f.tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
