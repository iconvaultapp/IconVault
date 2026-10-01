// /tools/yaml-formatter - Validate and format YAML in the browser,
// with a one-click view as JSON. 100% client-side; the yaml parser is
// loaded on demand, nothing is uploaded.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Braces, Check, Copy, Download, Eraser } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/yaml-formatter")({
  head: () => {
    const seo = getToolSeoMeta("yaml-formatter");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: YamlFormatterTool,
});

const SAMPLE = `server:
  host: localhost
  port: 8080
  tls: true
features:
  - auth
  - billing
  - webhooks
limits:
  free: 5
  pro: null`;

type ViewMode = "yaml" | "json";

function YamlFormatterTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("yaml-formatter", isPro);
  const seo = getToolSeo("yaml-formatter");

  const [input, setInput] = useState("");
  const [yamlOut, setYamlOut] = useState<string | null>(null);
  const [jsonOut, setJsonOut] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("yaml");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<"yaml" | "json" | null>(null);

  const format = async () => {
    if (!trial.canUse || !input.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const YAML = await import("yaml");
      const doc = YAML.parse(input);
      setYamlOut(YAML.stringify(doc));
      setJsonOut(JSON.stringify(doc, null, 2));
      trial.recordUse();
    } catch (e) {
      setYamlOut(null);
      setJsonOut(null);
      const pos = (e as { linePos?: { line: number; col: number }[] } | null)?.linePos?.[0];
      const where = pos ? `Line ${pos.line}, column ${pos.col}: ` : "";
      setError(where + (e instanceof Error ? e.message.split("\n")[0] : "Invalid YAML."));
    } finally {
      setBusy(false);
    }
  };

  const copy = async (kind: "yaml" | "json") => {
    const text = kind === "yaml" ? yamlOut : jsonOut;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  const download = () => {
    const text = view === "yaml" ? yamlOut : jsonOut;
    if (!text) return;
    downloadBlob(
      new Blob([text], { type: view === "yaml" ? "text/yaml" : "application/json" }),
      view === "yaml" ? "formatted.yaml" : "converted.json",
    );
    toast.success("File downloaded");
  };

  const showing = view === "yaml" ? yamlOut : jsonOut;

  return (
    <ToolPageShell toolId="yaml-formatter" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="YAML Formatter" left={trial.left} />

      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold">YAML input</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setInput(SAMPLE); setYamlOut(null); setJsonOut(null); setError(null); }}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50"
              >
                Load sample
              </button>
              <button
                type="button"
                onClick={() => { setInput(""); setYamlOut(null); setJsonOut(null); setError(null); }}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50"
              >
                <Eraser className="h-3.5 w-3.5" /> Clear
              </button>
            </div>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste your YAML here…"
            spellCheck={false}
            rows={12}
            className="w-full resize-y rounded-xl border border-border bg-background p-4 font-mono text-[13px] leading-relaxed outline-none focus:border-primary"
          />
          <div className="mt-4 flex flex-wrap gap-3">
            <ActionButton busy={busy} disabled={!trial.canUse || !input.trim()} onClick={format}>
              <Braces className="h-4 w-4" /> {busy ? "Formatting…" : "Validate & Format"}
            </ActionButton>
          </div>
          {!isPro && (
            <p className="mt-3 text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free format runs left. Runs fully in your browser, nothing is uploaded.
            </p>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-500/40 bg-red-500/10 p-5">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <div>
              <p className="font-bold text-red-600 dark:text-red-400">Invalid YAML</p>
              <p className="mt-1 font-mono text-sm text-red-600/90 dark:text-red-400/90">{error}</p>
            </div>
          </div>
        )}

        {showing !== null && !error && (
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <p className="flex items-center gap-1.5 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  <Check className="h-4 w-4" /> Valid YAML
                </p>
                <div className="flex rounded-lg border border-border p-0.5">
                  {(["yaml", "json"] as ViewMode[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setView(m)}
                      className={cn(
                        "rounded-md px-3 py-1.5 text-xs font-bold transition",
                        view === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {m === "yaml" ? "Formatted YAML" : "View as JSON"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => copy("yaml")}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50"
                >
                  {copied === "yaml" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied === "yaml" ? "Copied" : "Copy YAML"}
                </button>
                <button
                  type="button"
                  onClick={() => copy("json")}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50"
                >
                  {copied === "json" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied === "json" ? "Copied" : "Copy JSON"}
                </button>
                <button
                  type="button"
                  onClick={download}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50"
                >
                  <Download className="h-3.5 w-3.5" /> Download
                </button>
              </div>
            </div>
            <pre className="max-h-[480px] overflow-auto rounded-xl bg-muted/60 p-4 font-mono text-[13px] leading-relaxed">
              {showing}
            </pre>
          </div>
        )}
      </div>
    </ToolPageShell>
  );
}
