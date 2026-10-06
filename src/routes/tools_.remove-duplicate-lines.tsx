// /tools/remove-duplicate-lines - drop repeated lines, keep first occurrence.
// 100% client-side.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, ListX } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/remove-duplicate-lines";
import toolSeoMeta from "@/lib/tool-seo-meta-data/remove-duplicate-lines";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/remove-duplicate-lines")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/remove-duplicate-lines";
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
  component: RemoveDuplicateLinesTool,
});

interface DedupeOptions {
  caseInsensitive: boolean;
  trimWhitespace: boolean;
  removeEmpty: boolean;
  sortAlpha: boolean;
}

interface DedupeResult {
  unique: string[];
  duplicates: number;
  total: number;
}

function dedupe(raw: string, opts: DedupeOptions): DedupeResult {
  const lines = raw.split("\n");
  const seen = new Set<string>();
  const unique: string[] = [];
  let duplicates = 0;
  for (const line of lines) {
    const l = opts.trimWhitespace ? line.trim() : line;
    if (opts.removeEmpty && l === "") continue;
    const key = opts.caseInsensitive ? l.toLowerCase() : l;
    if (seen.has(key)) {
      duplicates++;
      continue;
    }
    seen.add(key);
    unique.push(l);
  }
  if (opts.sortAlpha) unique.sort((a, b) => a.localeCompare(b));
  return { unique, duplicates, total: lines.length };
}

function RemoveDuplicateLinesTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("remove-duplicate-lines", isPro);
  const seo = toolSeo;

  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [stats, setStats] = useState<DedupeResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [caseInsensitive, setCaseInsensitive] = useState(false);
  const [trimWhitespace, setTrimWhitespace] = useState(true);
  const [removeEmpty, setRemoveEmpty] = useState(true);
  const [sortAlpha, setSortAlpha] = useState(false);

  const run = () => {
    if (!trial.canUse) return;
    if (!input) {
      toast.error("Paste some lines first");
      return;
    }
    const result = dedupe(input, { caseInsensitive, trimWhitespace, removeEmpty, sortAlpha });
    setOutput(result.unique.join("\n"));
    setStats(result);
    setCopied(false);
    trial.recordUse();
    toast.success(
      result.duplicates === 0
        ? "No duplicates found"
        : `${result.duplicates} duplicate${result.duplicates === 1 ? "" : "s"} removed`,
    );
  };

  const copy = () => {
    if (!output) return;
    navigator.clipboard
      .writeText(output)
      .then(() => {
        setCopied(true);
        toast.success("Unique lines copied");
      })
      .catch(() => toast.error("Copy failed"));
  };

  const options: { label: string; value: boolean; set: (v: boolean) => void }[] = [
    { label: "Case-insensitive", value: caseInsensitive, set: setCaseInsensitive },
    { label: "Trim whitespace", value: trimWhitespace, set: setTrimWhitespace },
    { label: "Remove empty lines", value: removeEmpty, set: setRemoveEmpty },
    { label: "Sort alphabetically", value: sortAlpha, set: setSortAlpha },
  ];

  return (
    <ToolPageShell toolId="remove-duplicate-lines" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Remove Duplicate Lines" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-2">
        <label className="block rounded-2xl border border-border bg-card p-4">
          <span className="mb-2 block text-sm font-bold">Input</span>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={"apple\nbanana\napple\ncherry\nbanana"}
            spellCheck={false}
            className="h-56 w-full resize-y rounded-xl border border-border bg-background p-3 font-mono text-[13px] leading-relaxed outline-none focus:border-primary"
          />
        </label>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-bold">Unique lines</span>
            <button
              type="button"
              onClick={copy}
              disabled={!output}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          {output || stats ? (
            <textarea
              value={output}
              readOnly
              spellCheck={false}
              placeholder="Unique lines appear here..."
              className="h-56 w-full resize-y rounded-xl border border-border bg-background p-3 font-mono text-[13px] leading-relaxed outline-none"
            />
          ) : (
            <div className="flex h-56 flex-col items-center justify-center rounded-xl border border-dashed border-border text-center">
              <ListX className="mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm font-semibold text-muted-foreground">
                Deduplicated lines appear here
              </p>
            </div>
          )}
        </div>
      </div>

      {stats && (
        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            { label: "Total lines", value: stats.total },
            { label: "Duplicates removed", value: stats.duplicates },
            { label: "Unique lines", value: stats.unique.length },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-4 text-center">
              <p className="text-2xl font-extrabold">{s.value.toLocaleString("en-US")}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <span className="mb-3 block text-sm font-bold">Options</span>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {options.map((o) => (
            <label key={o.label} className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-foreground/80">
              <input
                type="checkbox"
                checked={o.value}
                onChange={(e) => o.set(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              {o.label}
            </label>
          ))}
        </div>
        <div className="mt-4">
          <ActionButton disabled={!trial.canUse} onClick={run}>
            <ListX className="h-4 w-4" /> Remove duplicates
          </ActionButton>
        </div>
        {!isPro && (
          <p className="mt-3 text-xs text-muted-foreground">
            {trial.left} of {TOOL_TRIAL_LIMIT} free runs left - everything runs in your browser, nothing is uploaded.
          </p>
        )}
      </div>
    </ToolPageShell>
  );
}
