// /tools/character-counter - live character counts with a custom limit
// and remaining-characters indicator. Unicode-aware. 100% client-side.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/character-counter";
import toolSeoMeta from "@/lib/tool-seo-meta-data/character-counter";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/character-counter")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/character-counter";
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
  component: CharacterCounterTool,
});

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function CharacterCounterTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("character-counter", isPro);
  const seo = toolSeo;

  const [text, setText] = useState("");
  const [limitRaw, setLimitRaw] = useState("280");

  const limit = parseInt(limitRaw, 10);
  const safeLimit = Number.isNaN(limit) ? 0 : limit;

  const chars = [...text].length;
  const charsNoSpaces = [...text.replace(/\s/g, "")].length;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const lines = text.length === 0 ? 0 : text.split("\n").length;
  const bytes = new TextEncoder().encode(text).length;
  const remaining = safeLimit - chars;
  const overLimit = remaining < 0;

  const copyText = () => {
    if (!text) {
      toast.error("Nothing to copy yet.");
      return;
    }
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success("Text copied"))
      .catch(() => toast.error("Copy failed"));
  };

  return (
    <ToolPageShell toolId="character-counter" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Character Counter" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Remaining
            </p>
            <p
              className={`mt-1 text-5xl font-extrabold ${
                overLimit ? "text-red-600 dark:text-red-400" : "text-foreground"
              }`}
            >
              {remaining.toLocaleString("en-US")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {chars.toLocaleString("en-US")} of {safeLimit.toLocaleString("en-US")} characters used
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <label htmlFor="cc-limit" className="mb-2 block text-[13px] font-medium text-foreground/80">
              Character limit
            </label>
            <input
              id="cc-limit"
              type="number"
              min={0}
              value={limitRaw}
              onChange={(e) => setLimitRaw(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 font-mono text-sm outline-none focus:border-primary/60"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {[160, 280, 500, 2200].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setLimitRaw(String(preset))}
                  className={`rounded-lg border px-3 py-1.5 font-mono text-xs font-bold transition ${
                    safeLimit === preset
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <StatCard label="Characters" value={chars.toLocaleString("en-US")} />
            <StatCard label="No spaces" value={charsNoSpaces.toLocaleString("en-US")} />
            <StatCard label="Words" value={words.toLocaleString("en-US")} />
            <StatCard label="Lines" value={lines.toLocaleString("en-US")} />
            <StatCard label="Bytes" value={bytes.toLocaleString("en-US")} />
          </div>
          <div className="mt-6 rounded-2xl border border-border bg-card p-5">
            <div className="mb-2 flex items-center justify-between">
              <label htmlFor="cc-text" className="text-[13px] font-medium text-foreground/80">
                Your text
              </label>
              <button
                type="button"
                onClick={copyText}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90"
              >
                <Copy className="h-4 w-4" /> Copy text
              </button>
            </div>
            <textarea
              id="cc-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type or paste your text here..."
              rows={12}
              className="w-full resize-y rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm leading-relaxed outline-none focus:border-primary/60"
            />
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
