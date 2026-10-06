// /tools/word-counter - live word, character, sentence and paragraph
// counts plus reading and speaking time estimates. 100% client-side.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/word-counter";
import toolSeoMeta from "@/lib/tool-seo-meta-data/word-counter";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/word-counter")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/word-counter";
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
  component: WordCounterTool,
});

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

/** "X min Y sec" from a words-per-minute rate. */
function timeLabel(words: number, wpm: number): string {
  if (words === 0) return "0 min 0 sec";
  const totalSec = Math.round((words / wpm) * 60);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min} min ${sec} sec`;
}

function WordCounterTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("word-counter", isPro);
  const seo = toolSeo;

  const [text, setText] = useState("");

  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const characters = text.length;
  const charactersNoSpaces = text.replace(/\s/g, "").length;
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
  const paragraphs = text.split("\n").filter((l) => l.trim().length > 0).length;

  return (
    <ToolPageShell toolId="word-counter" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Word Counter" left={trial.left} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Words" value={words.toLocaleString("en-US")} />
        <StatCard label="Characters" value={characters.toLocaleString("en-US")} />
        <StatCard label="Characters (no spaces)" value={charactersNoSpaces.toLocaleString("en-US")} />
        <StatCard label="Sentences" value={sentences.toLocaleString("en-US")} />
        <StatCard label="Paragraphs" value={paragraphs.toLocaleString("en-US")} />
        <StatCard label="Reading time" value={timeLabel(words, 200)} />
        <StatCard label="Speaking time" value={timeLabel(words, 130)} />
        <div className="flex items-center rounded-2xl border border-dashed border-border p-4">
          <p className="text-xs text-muted-foreground">
            Reading at 200 wpm, speaking at 130 wpm. Counts update as you type.
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <label htmlFor="wc-text" className="mb-2 block text-[13px] font-medium text-foreground/80">
          Your text
        </label>
        <textarea
          id="wc-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type or paste your text here..."
          rows={14}
          className="w-full resize-y rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm leading-relaxed outline-none focus:border-primary/60"
        />
      </div>
    </ToolPageShell>
  );
}
