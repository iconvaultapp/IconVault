// /tools/string-escaper - escape a string for Java, Python, C#, SQL or CSV:
// quotes, backslashes, newlines handled per language rules. 100% client-side.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Code2, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/string-escaper")({
  head: () => {
    const seo = getToolSeoMeta("string-escaper");
    const canonical = "https://iconvault.site/tools/string-escaper";
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
  component: StringEscaperTool,
});

type Lang = "java" | "python" | "csharp" | "sql" | "csv";

const LANGS: { id: Lang; label: string; rule: string }[] = [
  { id: "java", label: "Java", rule: "Backslash escapes: \\ \" \n \r \t" },
  { id: "python", label: "Python", rule: "Backslash escapes: \\ \" \n \r \t" },
  { id: "csharp", label: "C#", rule: "Backslash escapes: \\ \" \n \r \t" },
  { id: "sql", label: "SQL", rule: "Single quotes are doubled: ' becomes ''" },
  { id: "csv", label: "CSV", rule: "Field is wrapped in quotes; inner quotes are doubled" },
];

function escapeFor(lang: Lang, s: string): string {
  switch (lang) {
    case "java":
    case "python":
    case "csharp":
      return s
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"')
        .replace(/\r/g, "\\r")
        .replace(/\n/g, "\\n")
        .replace(/\t/g, "\\t");
    case "sql":
      return s.replace(/'/g, "''");
    case "csv":
      return `"${s.replace(/"/g, '""')}"`;
  }
}

function StringEscaperTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("string-escaper", isPro);
  const seo = getToolSeo("string-escaper");

  const [lang, setLang] = useState<Lang>("java");
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);

  const output = useMemo(() => escapeFor(lang, input), [lang, input]);
  const activeRule = LANGS.find((l) => l.id === lang)?.rule ?? "";

  const copy = () => {
    if (!output || !trial.canUse) return;
    navigator.clipboard
      .writeText(output)
      .then(() => {
        setCopied(true);
        trial.recordUse();
        toast.success("Escaped string copied");
      })
      .catch(() => toast.error("Copy failed"));
  };

  return (
    <ToolPageShell toolId="string-escaper" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="String Escaper" left={trial.left} />

      <div className="mb-6">
        <span className="mb-3 block text-sm font-bold">Target language</span>
        <div className="flex flex-wrap gap-2">
          {LANGS.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => {
                setLang(l.id);
                setCopied(false);
              }}
              className={cn(
                "rounded-xl border px-4 py-2.5 text-sm font-bold transition",
                lang === l.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40",
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
        <p className="mt-2 font-mono text-xs text-muted-foreground">{activeRule}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <label className="block rounded-2xl border border-border bg-card p-4">
          <span className="mb-2 block text-sm font-bold">Raw string</span>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='Type or paste your string, e.g. He said "hi" and left.'
            spellCheck={false}
            className="h-60 w-full resize-y rounded-xl border border-border bg-background p-3 font-mono text-[13px] leading-relaxed outline-none focus:border-primary"
          />
        </label>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-bold">
              <Code2 className="h-4 w-4 text-muted-foreground" /> Escaped for {LANGS.find((l) => l.id === lang)?.label}
            </span>
            <button
              type="button"
              onClick={copy}
              disabled={!output || !trial.canUse}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          {output ? (
            <textarea
              value={output}
              readOnly
              spellCheck={false}
              className="h-60 w-full resize-y rounded-xl border border-border bg-background p-3 font-mono text-[13px] leading-relaxed outline-none"
            />
          ) : (
            <div className="flex h-60 flex-col items-center justify-center rounded-xl border border-dashed border-border text-center">
              <Code2 className="mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm font-semibold text-muted-foreground">
                The escaped string appears here as you type
              </p>
            </div>
          )}
        </div>
      </div>

      <p className="mt-6 max-w-3xl text-xs leading-relaxed text-muted-foreground">
        Java, C# and Python share the same backslash escaping shown here. SQL doubling works for string
        literals in MySQL, PostgreSQL and SQL Server. CSV quoting follows RFC 4180.
      </p>

      {!isPro && (
        <p className="mt-4 text-xs text-muted-foreground">
          {trial.left} of {TOOL_TRIAL_LIMIT} free copies left - everything runs in your browser, nothing is uploaded.
        </p>
      )}
    </ToolPageShell>
  );
}
