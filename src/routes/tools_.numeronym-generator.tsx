// /tools/numeronym-generator - Words to i18n-style numeronyms (first letter + middle count + last letter).

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/numeronym-generator";
import toolSeoMeta from "@/lib/tool-seo-meta-data/numeronym-generator";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/numeronym-generator")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/numeronym-generator";
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
  component: NumeronymTool,
});

type Row = { word: string; numeronym: string; skipped: boolean };

function numeronymize(input: string): Row[] {
  return input
    .split(/[\s,;]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((word) => {
      const letters = word.replace(/[^A-Za-z]/g, "");
      if (letters.length <= 3) return { word, numeronym: word, skipped: true };
      return {
        word,
        numeronym: `${letters[0]}${letters.length - 2}${letters[letters.length - 1]}`,
        skipped: false,
      };
    });
}

const EXAMPLES = ["internationalization", "localization", "accessibility", "Kubernetes", "documentation"];

function NumeronymTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("numeronym-generator", isPro);
  const seo = toolSeo;

  const [input, setInput] = useState("internationalization\nlocalization\naccessibility");

  const rows = useMemo(() => numeronymize(input), [input]);
  const list = useMemo(() => rows.map((r) => r.numeronym).join("\n"), [rows]);

  const copy = async () => {
    if (!trial.canUse || rows.length === 0) return;
    try {
      await navigator.clipboard.writeText(list);
      trial.recordUse();
      toast.success(`${rows.length} numeronyms copied`);
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <ToolPageShell toolId="numeronym-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Numeronym Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <label className="mb-2 block text-[13px] font-medium text-foreground/80">Words (one per line or space separated)</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={10}
            placeholder="internationalization"
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/60"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {EXAMPLES.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setInput((p) => (p.trim() ? `${p.trim()}\n${w}` : w))}
                className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:border-primary/50"
              >
                + {w}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Words of 3 letters or fewer are kept as-is - a numeronym needs a first letter, a count, and a last letter.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Numeronyms ({rows.length})</h2>
            <button
              type="button"
              onClick={copy}
              disabled={!trial.canUse || rows.length === 0}
              className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-sm font-semibold hover:border-primary/50 disabled:opacity-40"
            >
              <Copy className="h-4 w-4" /> Copy list
            </button>
          </div>
          {rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Type some words to generate numeronyms.</p>
          ) : (
            <ul className="max-h-80 space-y-1.5 overflow-y-auto">
              {rows.map((r, i) => (
                <li
                  key={i}
                  className={cn(
                    "flex items-center justify-between rounded-lg border px-3 py-2",
                    r.skipped ? "border-border opacity-60" : "border-primary/30 bg-primary/5",
                  )}
                >
                  <span className="text-sm text-muted-foreground">{r.word}</span>
                  <span className="font-mono text-sm font-bold text-primary">{r.numeronym}</span>
                </li>
              ))}
            </ul>
          )}
          {!isPro && (
            <p className="mt-3 text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left.
            </p>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
