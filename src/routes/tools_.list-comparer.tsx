// /tools/list-comparer - compare two lists line by line: only in A, only in B,
// in both, and combined unique. 100% client-side.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, ListX } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/list-comparer")({
  head: () => {
    const seo = getToolSeoMeta("list-comparer");
    const canonical = "https://iconvault.site/tools/list-comparer";
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
  component: ListComparerTool,
});

const SECTIONS = [
  { key: "onlyA", label: "Only in List A", empty: "Everything in A also appears in B" },
  { key: "onlyB", label: "Only in List B", empty: "Everything in B also appears in A" },
  { key: "both", label: "In both lists", empty: "No shared items" },
  { key: "combined", label: "Combined unique", empty: "Both lists are empty" },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

function ListComparerTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("list-comparer", isPro);
  const seo = getToolSeo("list-comparer");

  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [trim, setTrim] = useState(true);
  const [ignoreCase, setIgnoreCase] = useState(false);
  const [copiedKey, setCopiedKey] = useState<SectionKey | null>(null);

  const result = useMemo(() => {
    const norm = (s: string) => (ignoreCase ? s.toLowerCase() : s);
    const aLines = a.split("\n").map((l) => (trim ? l.trim() : l)).filter((l) => l.length > 0);
    const bLines = b.split("\n").map((l) => (trim ? l.trim() : l)).filter((l) => l.length > 0);
    const aMap = new Map<string, string>();
    const bMap = new Map<string, string>();
    for (const l of aLines) {
      const k = norm(l);
      if (!aMap.has(k)) aMap.set(k, l);
    }
    for (const l of bLines) {
      const k = norm(l);
      if (!bMap.has(k)) bMap.set(k, l);
    }
    const onlyA = [...aMap.entries()].filter(([k]) => !bMap.has(k)).map(([, v]) => v);
    const onlyB = [...bMap.entries()].filter(([k]) => !aMap.has(k)).map(([, v]) => v);
    const both = [...aMap.entries()].filter(([k]) => bMap.has(k)).map(([, v]) => v);
    const combined = [...aMap.values()];
    for (const [k, v] of bMap.entries()) {
      if (!aMap.has(k)) combined.push(v);
    }
    return { onlyA, onlyB, both, combined, aCount: aLines.length, bCount: bLines.length };
  }, [a, b, trim, ignoreCase]);

  const copySection = (key: SectionKey) => {
    const lines = result[key];
    if (lines.length === 0 || !trial.canUse) return;
    navigator.clipboard
      .writeText(lines.join("\n"))
      .then(() => {
        setCopiedKey(key);
        trial.recordUse();
        toast.success("Result copied");
      })
      .catch(() => toast.error("Copy failed"));
  };

  const Toggle = ({
    label,
    checked,
    onChange,
  }: {
    label: string;
    checked: boolean;
    onChange: (v: boolean) => void;
  }) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition",
        checked ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
      )}
    >
      <span
        className={cn(
          "relative h-5 w-9 rounded-full transition",
          checked ? "bg-primary" : "bg-muted",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all",
            checked ? "left-[18px]" : "left-0.5",
          )}
        />
      </span>
      {label}
    </button>
  );

  return (
    <ToolPageShell toolId="list-comparer" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="List Comparer" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-2">
        <label className="block rounded-2xl border border-border bg-card p-4">
          <span className="mb-2 flex items-center justify-between text-sm font-bold">
            List A
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
              {result.aCount} items
            </span>
          </span>
          <textarea
            value={a}
            onChange={(e) => setA(e.target.value)}
            placeholder="One item per line..."
            spellCheck={false}
            className="h-52 w-full resize-y rounded-xl border border-border bg-background p-3 text-[13px] leading-relaxed outline-none focus:border-primary"
          />
        </label>
        <label className="block rounded-2xl border border-border bg-card p-4">
          <span className="mb-2 flex items-center justify-between text-sm font-bold">
            List B
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
              {result.bCount} items
            </span>
          </span>
          <textarea
            value={b}
            onChange={(e) => setB(e.target.value)}
            placeholder="One item per line..."
            spellCheck={false}
            className="h-52 w-full resize-y rounded-xl border border-border bg-background p-3 text-[13px] leading-relaxed outline-none focus:border-primary"
          />
        </label>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4">
        <span className="text-sm font-bold">Options</span>
        <Toggle label="Trim whitespace" checked={trim} onChange={setTrim} />
        <Toggle label="Ignore case" checked={ignoreCase} onChange={setIgnoreCase} />
        <div className="ml-auto">
          <ActionButton
            disabled={result.aCount + result.bCount === 0}
            onClick={() => {
              setA("");
              setB("");
              setCopiedKey(null);
            }}
          >
            <ListX className="h-4 w-4" /> Clear lists
          </ActionButton>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {SECTIONS.map((s) => {
          const lines = result[s.key];
          return (
            <div key={s.key} className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-bold">
                  {s.label}
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                    {lines.length}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => copySection(s.key)}
                  disabled={lines.length === 0 || !trial.canUse}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {copiedKey === s.key ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copiedKey === s.key ? "Copied" : "Copy"}
                </button>
              </div>
              {lines.length > 0 ? (
                <textarea
                  value={lines.join("\n")}
                  readOnly
                  spellCheck={false}
                  className="h-44 w-full resize-y rounded-xl border border-border bg-background p-3 font-mono text-[13px] leading-relaxed outline-none"
                />
              ) : (
                <div className="flex h-44 flex-col items-center justify-center rounded-xl border border-dashed border-border text-center">
                  <ListX className="mb-2 h-7 w-7 text-muted-foreground/50" />
                  <p className="text-sm font-medium text-muted-foreground">{s.empty}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!isPro && (
        <p className="mt-6 text-xs text-muted-foreground">
          {trial.left} of {TOOL_TRIAL_LIMIT} free copies left - comparison runs live in your browser, nothing is uploaded.
        </p>
      )}
    </ToolPageShell>
  );
}
