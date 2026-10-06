// /tools/hreflang-generator - Build valid hreflang alternate link tags for
// multilingual pages. 100% client-side, nothing leaves the browser.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Globe, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/hreflang-generator";
import toolSeoMeta from "@/lib/tool-seo-meta-data/hreflang-generator";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/hreflang-generator")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/hreflang-generator";
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
  component: HreflangTool,
});

const COMMON_LOCALES = [
  "en", "en-US", "en-GB", "es", "fr", "de", "it", "pt", "pt-BR",
  "nl", "ja", "ko", "zh-CN", "zh-TW", "ar", "hi", "ru", "pl", "sv", "tr",
];

interface Row { id: number; lang: string; url: string; }

let nextId = 3;

const initialRows: Row[] = [
  { id: 1, lang: "en", url: "https://example.com/" },
  { id: 2, lang: "es", url: "https://example.com/es/" },
];

function HreflangTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("hreflang-generator", isPro);
  const seo = toolSeo;

  const [rows, setRows] = useState<Row[]>(initialRows);
  const [xDefault, setXDefault] = useState("https://example.com/");
  const [copied, setCopied] = useState(false);

  const output = useMemo(() => {
    const lines: string[] = [];
    for (const r of rows) {
      const lang = r.lang.trim();
      const url = r.url.trim();
      if (!lang || !url) continue;
      lines.push(`<link rel="alternate" hreflang="${lang}" href="${url}" />`);
    }
    if (xDefault.trim()) lines.push(`<link rel="alternate" hreflang="x-default" href="${xDefault.trim()}" />`);
    return lines.join("\n");
  }, [rows, xDefault]);

  const update = (id: number, key: "lang" | "url", value: string) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [key]: value } : r)));

  const addRow = () => setRows((rs) => [...rs, { id: nextId++, lang: "", url: "" }]);
  const removeRow = (id: number) =>
    setRows((rs) => (rs.length <= 1 ? rs : rs.filter((r) => r.id !== id)));

  const copy = async () => {
    if (!output || !trial.canUse) return;
    try {
      await navigator.clipboard.writeText(output);
      trial.recordUse();
      setCopied(true);
      toast.success("Hreflang tags copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Clipboard blocked by the browser - select the text manually.");
    }
  };

  return (
    <ToolPageShell toolId="hreflang-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Hreflang Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold">
              <Globe className="h-5 w-5 text-primary" /> Language versions
            </h2>
            <button
              type="button"
              onClick={addRow}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:border-primary/50 hover:text-primary"
            >
              <Plus className="h-3.5 w-3.5" /> Add language
            </button>
          </div>

          <div className="space-y-2.5">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center gap-2">
                <input
                  list="hreflang-locales"
                  value={r.lang}
                  onChange={(e) => update(r.id, "lang", e.target.value)}
                  placeholder="en-US"
                  className="w-28 rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none"
                />
                <input
                  value={r.url}
                  onChange={(e) => update(r.id, "url", e.target.value)}
                  placeholder="https://example.com/en/"
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeRow(r.id)}
                  disabled={rows.length <= 1}
                  aria-label="Remove row"
                  className="rounded-lg p-2 text-muted-foreground transition hover:bg-red-500/10 hover:text-red-500 disabled:opacity-30"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <datalist id="hreflang-locales">
            {COMMON_LOCALES.map((l) => <option key={l} value={l} />)}
          </datalist>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">
              x-default URL <span className="text-muted-foreground">(fallback for unmatched languages)</span>
            </label>
            <input
              value={xDefault}
              onChange={(e) => setXDefault(e.target.value)}
              placeholder="https://example.com/"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Use ISO 639-1 codes like en, or language-region pairs like en-US. Every version should
            link back to all others, including itself.
          </p>
        </div>

        <div className="flex flex-col rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 text-base font-bold">Generated tags</h2>
          <pre className="min-h-[260px] flex-1 overflow-auto whitespace-pre-wrap rounded-xl bg-muted/60 p-4 font-mono text-[13px] leading-relaxed">
            {output || <span className="text-muted-foreground">Add at least one language and URL…</span>}
          </pre>
          <div className="mt-4">
            <ActionButton disabled={!output || !trial.canUse} onClick={() => void copy()}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy tags"}
            </ActionButton>
            {!isPro && (
              <p className={cn("mt-2 text-xs text-muted-foreground")}>
                {trial.left} of {TOOL_TRIAL_LIMIT} free generations left.
              </p>
            )}
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
