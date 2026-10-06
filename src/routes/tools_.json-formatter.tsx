// /tools/json-formatter - Format, minify and validate JSON in the browser.
// 100% client-side; trial use is recorded on successful Format / Minify.

import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Braces, Check, Copy, Download, Eraser } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/json-formatter";
import toolSeoMeta from "@/lib/tool-seo-meta-data/json-formatter";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import { brandFilename } from "@/lib/logo-builder";

export const Route = createFileRoute("/tools_/json-formatter")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/json-formatter";
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
  component: JsonFormatterTool,
});

const SAMPLE = `{"name":"IconVault","icons":421020,"collections":239,"tags":["icons","design","svg"],"pro":{"monthly":11,"lifetime":29}}`;

function JsonFormatterTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("json-formatter", isPro);
  const seo = toolSeo;

  const [input, setInput] = useState("");
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [sortKeys, setSortKeys] = useState(false);

  /** Recursively sort object keys (arrays keep their order). */
  const deepSort = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(deepSort);
    if (v !== null && typeof v === "object") {
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(v as Record<string, unknown>).sort()) {
        out[k] = deepSort((v as Record<string, unknown>)[k]);
      }
      return out;
    }
    return v;
  };

  const transform = (mode: "format" | "minify" | "validate") => {
    if (!trial.canUse && mode !== "validate") return;
    setError(null);
    try {
      const parsed = JSON.parse(input);
      if (mode === "validate") {
        setOutput(null);
        setError(null);
        toast.success("Valid JSON - no errors found.");
        return;
      }
      const final = sortKeys ? deepSort(parsed) : parsed;
      setOutput(mode === "format" ? JSON.stringify(final, null, 2) : JSON.stringify(final));
      trial.recordUse();
    } catch (e) {
      setOutput(null);
      setError(e instanceof Error ? e.message : "Invalid JSON.");
    }
  };

  const copy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  const download = () => {
    if (!output) return;
    const blob = new Blob([output], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = brandFilename("formatted.json");
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadSample = () => {
    setInput(SAMPLE);
    setOutput(null);
    setError(null);
  };

  return (
    <ToolPageShell toolId="json-formatter" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="JSON Formatter" left={trial.left} />

      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold">JSON input</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={loadSample}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50"
              >
                Load sample
              </button>
              <button
                type="button"
                onClick={() => { setInput(""); setOutput(null); setError(null); }}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50"
              >
                <Eraser className="h-3.5 w-3.5" /> Clear
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50"
              >
                Upload .json
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setInput(await f.text());
                  setOutput(null);
                  setError(null);
                  e.target.value = "";
                }}
              />
            </div>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='Paste your JSON here… e.g. {"hello":"world"}'
            spellCheck={false}
            rows={12}
            className="w-full resize-y rounded-xl border border-border bg-background p-4 font-mono text-[13px] leading-relaxed outline-none focus:border-primary"
          />
          <div className="mt-4 flex flex-wrap gap-3">
            <ActionButton busy={false} disabled={!trial.canUse || !input.trim()} onClick={() => transform("format")}>
              <Braces className="h-4 w-4" /> Format (2-space)
            </ActionButton>
            <ActionButton busy={false} disabled={!trial.canUse || !input.trim()} onClick={() => transform("minify")}>
              Minify
            </ActionButton>
            <button
              type="button"
              onClick={() => transform("validate")}
              disabled={!input.trim()}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-bold hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Validate
            </button>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-bold text-muted-foreground transition hover:border-primary/50 hover:text-foreground">
              <input type="checkbox" checked={sortKeys} onChange={() => setSortKeys((v) => !v)} className="h-4 w-4 accent-primary" />
              Sort keys
            </label>
          </div>
          {!isPro && (
            <p className="mt-3 text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free format/minify runs left. Validate is unlimited.
            </p>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-500/40 bg-red-500/10 p-5">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <div>
              <p className="font-bold text-red-600 dark:text-red-400">Invalid JSON</p>
              <p className="mt-1 font-mono text-sm text-red-600/90 dark:text-red-400/90">{error}</p>
            </div>
          </div>
        )}

        {output !== null && !error && (
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-3 flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                <Check className="h-4 w-4" /> Valid JSON
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={copy}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <button
                  type="button"
                  onClick={download}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50"
                >
                  <Download className="h-3.5 w-3.5" /> .json
                </button>
              </div>
            </div>
            <pre className="max-h-[480px] overflow-auto rounded-xl bg-muted/60 p-4 font-mono text-[13px] leading-relaxed">
              {output}
            </pre>
          </div>
        )}
      </div>
    </ToolPageShell>
  );
}
