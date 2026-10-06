// /tools/reading-time - Reading and speaking time calculator with
// per-section analysis, Flesch readability scores, and a "min read" badge builder.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, ClipboardCopy, Clock, Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/reading-time";
import toolSeoMeta from "@/lib/tool-seo-meta-data/reading-time";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/reading-time")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/reading-time";
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
  component: ReadingTimeTool,
});

const SAMPLE_TEXT = `# Why Readability Matters

Most readers skim before they commit. A page that looks like a wall of text loses them in seconds, while short paragraphs and clear headings pull them down the page.

## The Reading Speed Baseline

The average adult reads about 200 to 250 words per minute on screen. Speaking is slower, closer to 130 to 150 words per minute, which is why a five minute read becomes a seven minute listen.

## Shorter Is Kinder

Cut filler words. One idea per paragraph. Your readers will thank you by actually finishing the article.`;

type Section = { title: string; words: number; minutes: number };

function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const groups = w.replace(/[^aeiouy]+/g, " ").trim().split(/\s+/);
  let n = groups.filter(Boolean).length;
  if (w.endsWith("e")) n -= 1;
  if (w.endsWith("le") && w.length > 2 && !/[aeiouy]/.test(w[w.length - 3] ?? "")) n += 1;
  return Math.max(n, 1);
}

function fmtTime(minutes: number): string {
  if (minutes < 1) {
    const s = Math.max(1, Math.round(minutes * 60));
    return `${s} sec`;
  }
  const m = Math.floor(minutes);
  const s = Math.round((minutes - m) * 60);
  return s > 0 ? `${m} min ${s} sec` : `${m} min`;
}

function ReadingTimeTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("reading-time", isPro);
  const seo = toolSeo;

  const [text, setText] = useState(SAMPLE_TEXT);
  const [wpm, setWpm] = useState(225);
  const [speakWpm, setSpeakWpm] = useState(140);
  const [analyzed, setAnalyzed] = useState(false);

  const analyze = () => {
    if (!trial.canUse) return;
    trial.recordUse();
    setAnalyzed(true);
  };

  const clean = text.replace(/^#+\s*/gm, "").replace(/[*_`~>\-[\]()]/g, " ");
  const words = clean.trim() ? clean.trim().split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;
  const charCount = text.length;
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const sentenceCount = Math.max(sentences.length, 1);
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length;
  const syllables = words.reduce((a, w) => a + countSyllables(w), 0);

  const readMinutes = wordCount / wpm;
  const speakMinutes = wordCount / speakWpm;
  const flesch = wordCount === 0 ? 0 : 206.835 - 1.015 * (wordCount / sentenceCount) - 84.6 * (syllables / Math.max(wordCount, 1));
  const fkGrade = wordCount === 0 ? 0 : 0.39 * (wordCount / sentenceCount) + 11.8 * (syllables / Math.max(wordCount, 1)) - 15.59;

  const sections: Section[] = (() => {
    const lines = text.split("\n");
    const result: Section[] = [];
    let t = "Intro";
    let buf: string[] = [];
    const flush = () => {
      const w = buf.join(" ").replace(/[*_`~>\-[\]()]/g, " ").trim().split(/\s+/).filter(Boolean).length;
      if (w > 0) result.push({ title: t, words: w, minutes: w / wpm });
      buf = [];
    };
    for (const line of lines) {
      const h = line.match(/^#+\s+(.*)/);
      if (h) { flush(); t = (h[1] ?? "").trim() || "Untitled"; }
      else buf.push(line);
    }
    flush();
    return result;
  })();

  const maxSection = Math.max(...sections.map((s) => s.minutes), 0.01);
  const readLabel = `${Math.max(1, Math.ceil(readMinutes))} min read`;

  const badgeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="36" role="img" aria-label="${readLabel}">
  <rect width="150" height="36" rx="18" fill="#0f766e"/>
  <circle cx="20" cy="18" r="8" fill="none" stroke="#ffffff" stroke-width="2"/>
  <path d="M20 14v4l3 2" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
  <text x="34" y="23" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="#ffffff">${readLabel}</text>
</svg>`;

  const copy = async (t: string, label: string) => {
    try {
      await navigator.clipboard.writeText(t);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Clipboard blocked - select and copy manually.");
    }
  };

  const stat = (label: string, value: string) => (
    <div className="rounded-xl border border-border bg-card p-4 text-center">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-primary">{value}</p>
    </div>
  );

  return (
    <ToolPageShell toolId="reading-time" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Reading Time" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-base font-bold">
                <FileText className="h-5 w-5 text-primary" /> Your text
              </h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setText(SAMPLE_TEXT); setAnalyzed(false); }}
                  className="rounded-xl border border-border px-4 py-2 text-sm font-bold hover:border-primary/40"
                >
                  Load sample
                </button>
                <ActionButton disabled={!trial.canUse || !text.trim()} onClick={analyze}>
                  <Clock className="h-4 w-4" /> Analyze
                </ActionButton>
              </div>
            </div>
            <textarea
              value={text}
              onChange={(e) => { setText(e.target.value); setAnalyzed(false); }}
              rows={12}
              spellCheck={false}
              placeholder="Paste your article here…"
              className="w-full rounded-xl border border-border bg-background p-4 text-sm leading-relaxed outline-none focus:border-primary"
            />
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-[13px] font-medium text-foreground/80">Reading speed</label>
                  <span className="text-sm font-bold text-primary">{wpm} wpm</span>
                </div>
                <input type="range" min={100} max={400} step={5} value={wpm} onChange={(e) => setWpm(Number(e.target.value))} className="w-full accent-primary" />
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-[13px] font-medium text-foreground/80">Speaking speed</label>
                  <span className="text-sm font-bold text-primary">{speakWpm} wpm</span>
                </div>
                <input type="range" min={80} max={250} step={5} value={speakWpm} onChange={(e) => setSpeakWpm(Number(e.target.value))} className="w-full accent-primary" />
              </div>
            </div>
          </div>

          {analyzed && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {stat("Reading time", fmtTime(readMinutes))}
                {stat("Speaking time", fmtTime(speakMinutes))}
                {stat("Words", wordCount.toLocaleString())}
                {stat("Characters", charCount.toLocaleString())}
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {stat("Sentences", sentenceCount.toLocaleString())}
                {stat("Paragraphs", paragraphs.toLocaleString())}
                {stat("Flesch ease", wordCount ? flesch.toFixed(1) : "n/a")}
                {stat("Grade level", wordCount ? fkGrade.toFixed(1) : "n/a")}
              </div>
              <p className="text-xs text-muted-foreground">
                Flesch Reading Ease runs 0 to 100 (higher is easier; 60-70 is plain English). Grade level is the US
                school grade needed to understand the text. Syllable counting is heuristic, so scores are approximate.
              </p>

              <div className="rounded-2xl border border-border bg-card p-5">
                <h2 className="mb-3 text-base font-bold">Per-section analysis</h2>
                {sections.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No sections found. Use markdown headings (# Title) to split the text.</p>
                ) : (
                  <ul className="space-y-2.5">
                    {sections.map((s, i) => (
                      <li key={i}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="truncate font-semibold">{s.title}</span>
                          <span className="ml-3 shrink-0 text-muted-foreground">
                            {s.words.toLocaleString()} words · {fmtTime(s.minutes)}
                          </span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max((s.minutes / maxSection) * 100, 2)}%` }} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>

        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <BadgeCheck className="h-5 w-5 text-primary" /> "Min read" badge
          </h2>
          <p className="text-sm text-muted-foreground">
            A Medium-style badge for your article header, generated from the current reading speed.
          </p>
          <div className="flex justify-center rounded-xl bg-muted p-6">
            <div dangerouslySetInnerHTML={{ __html: badgeSvg }} />
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton
              disabled={!trial.canUse}
              onClick={() => {
                trial.recordUse();
                downloadBlob(new Blob([badgeSvg], { type: "image/svg+xml" }), "reading-time-badge.svg");
                toast.success("Badge downloaded");
              }}
            >
              <Download className="h-4 w-4" /> Download SVG
            </ActionButton>
            <button
              type="button"
              onClick={() => void copy(badgeSvg, "Badge SVG")}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-bold hover:border-primary/40"
            >
              <ClipboardCopy className="h-4 w-4" /> Copy SVG
            </button>
          </div>
          <div className={cn("rounded-xl border p-4 text-sm", flesch >= 60 ? "border-emerald-500/40 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/5")}>
            <p className="font-bold">Quick readability verdict</p>
            <p className="mt-1 text-muted-foreground">
              {wordCount === 0
                ? "Paste some text and hit Analyze."
                : flesch >= 60
                  ? "Reads easily for a general audience. Ship it."
                  : "A bit dense. Shorter sentences and simpler words would widen the audience."}
            </p>
          </div>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free analyses left.
            </p>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
