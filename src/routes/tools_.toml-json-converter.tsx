// /tools/toml-json-converter - Convert TOML to JSON and JSON to TOML, entirely
// in your browser. The TOML parser loads on demand only. Runs in your browser,
// nothing is uploaded.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeftRight, Check, Copy, Download, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/toml-json-converter";
import toolSeoMeta from "@/lib/tool-seo-meta-data/toml-json-converter";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/toml-json-converter")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/toml-json-converter";
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
  component: TomlJsonConverterTool,
});

type Mode = "toml2json" | "json2toml";

const SAMPLE_TOML = `[site]
name = "IconVault"
version = 2
stable = true

[site.meta]
author = "Sameer"
license = "MIT"

[database]
ports = [8000, 8001, 8002]`;

const SAMPLE_JSON = `{
  "name": "IconVault",
  "version": 2,
  "stable": true
}`;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function TomlJsonConverterTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("toml-json-converter", isPro);
  const seo = toolSeo;

  const [mode, setMode] = useState<Mode>("toml2json");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const convert = async () => {
    if (!trial.canUse || busy || !input.trim()) return;
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      const TOML = await import("smol-toml");
      if (mode === "toml2json") {
        const parsed: unknown = TOML.parse(input);
        setOutput(JSON.stringify(parsed, null, 2));
      } else {
        const parsed: unknown = JSON.parse(input);
        if (!isPlainObject(parsed)) throw new Error("TOML documents must be objects at the root. Wrap your value in an object.");
        setOutput(TOML.stringify(parsed as Record<string, unknown>));
      }
      trial.recordUse();
      toast.success("Converted");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Conversion failed";
      setError(mode === "toml2json" ? `Invalid TOML: ${msg}` : `Invalid JSON: ${msg}`);
      setOutput("");
    } finally {
      setBusy(false);
    }
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setInput("");
    setOutput("");
    setError(null);
    setCopied(false);
  };

  const copy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      toast.success("Copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  const download = () => {
    if (!output) return;
    const ext = mode === "toml2json" ? "json" : "toml";
    downloadBlob(new Blob([output], { type: "text/plain" }), `converted.${ext}`);
    toast.success("File downloaded");
  };

  const fromLabel = mode === "toml2json" ? "TOML" : "JSON";
  const toLabel = mode === "toml2json" ? "JSON" : "TOML";

  const paneClass =
    "h-72 w-full resize-y rounded-xl border border-border bg-background p-3 font-mono text-[13px] leading-relaxed outline-none focus:border-primary";

  return (
    <ToolPageShell toolId="toml-json-converter" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="TOML to JSON" left={trial.left} />

      <div className="mb-6 flex items-center gap-2">
        <button
          type="button"
          onClick={() => switchMode("toml2json")}
          className={cn(
            "rounded-xl border px-4 py-2.5 text-sm font-bold transition",
            mode === "toml2json"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:border-primary/40",
          )}
        >
          TOML to JSON
        </button>
        <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
        <button
          type="button"
          onClick={() => switchMode("json2toml")}
          className={cn(
            "rounded-xl border px-4 py-2.5 text-sm font-bold transition",
            mode === "json2toml"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:border-primary/40",
          )}
        >
          JSON to TOML
        </button>
        <button
          type="button"
          onClick={() => { setInput(mode === "toml2json" ? SAMPLE_TOML : SAMPLE_JSON); setOutput(""); setError(null); }}
          className="ml-2 rounded-xl border border-border px-3 py-2 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
        >
          Sample
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <span className="mb-2 block text-sm font-bold">{fromLabel} input</span>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Paste your ${fromLabel} here...`}
            spellCheck={false}
            className={paneClass}
          />
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-bold">{toLabel} output</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={copy}
                disabled={!output}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copied" : "Copy"}
              </button>
              <button
                type="button"
                onClick={download}
                disabled={!output}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" /> Download
              </button>
            </div>
          </div>
          {output ? (
            <textarea value={output} readOnly spellCheck={false} className={paneClass} />
          ) : (
            <div className="flex h-72 flex-col items-center justify-center rounded-xl border border-dashed border-border text-center">
              <RefreshCcw className="mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm font-semibold text-muted-foreground">Your {toLabel} appears here</p>
            </div>
          )}
          {error && <p className="mt-2 text-sm font-medium text-red-500">{error}</p>}
        </div>
      </div>

      <div className="mt-6">
        <ActionButton busy={busy} disabled={!trial.canUse || !input.trim()} onClick={() => void convert()}>
          <RefreshCcw className="h-4 w-4" /> {busy ? "Converting..." : `Convert to ${toLabel}`}
        </ActionButton>
      </div>
      {!isPro && (
        <p className="mt-3 text-xs text-muted-foreground">
          {trial.left} of {TOOL_TRIAL_LIMIT} free conversions left. Runs in your browser, nothing is uploaded.
        </p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        Note: TOML dates become ISO date strings in JSON, and JSON to TOML needs an object at the root (TOML has no bare arrays or scalars).
      </p>
    </ToolPageShell>
  );
}
