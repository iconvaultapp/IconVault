// /tools/json-string-converter - Turn text into an escaped JS string
// literal (and back) with double, single or backtick quotes.
// 100% client-side, nothing is uploaded.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Check, Copy, Eraser } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/json-string-converter")({
  head: () => {
    const seo = getToolSeoMeta("json-string-converter");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: JsonStringConverterTool,
});

type Mode = "stringify" | "unstringify";
type Quote = '"' | "'" | "`";

const QUOTES: { id: Quote; label: string }[] = [
  { id: '"', label: 'Double "' },
  { id: "'", label: "Single '" },
  { id: "`", label: "Backtick `" },
];

const SAMPLE = `{"name": "IconVault", "tagline": "say \\"hi\\"", "note": "line one\\nline two"}`;

const selectCls =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm font-bold focus:border-primary focus:outline-none";

/** Escape raw text into a JS string literal wrapped in `quote`. */
function stringifyWithQuote(s: string, quote: Quote): string {
  let body = s
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t")
    .replace(/[\u0000-\u001f]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);
  if (quote === "`") {
    body = body.replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
  } else {
    body = body.split(quote).join(`\\${quote}`);
  }
  return quote + body + quote;
}

/** Parse a quoted string literal back to raw text. */
function unstringify(s: string): string {
  let t = s.trim();
  const first = t[0];
  const last = t[t.length - 1];
  if ((first === '"' || first === "'" || first === "`") && last === first && t.length >= 2) {
    t = t.slice(1, -1);
  }
  // Escape everything so JSON.parse can safely decode the escapes.
  const jsonReady =
    '"' +
    t
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\t/g, "\\t") +
    '"';
  return JSON.parse(jsonReady);
}

function JsonStringConverterTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("json-string-converter", isPro);
  const seo = getToolSeo("json-string-converter");

  const [mode, setMode] = useState<Mode>("stringify");
  const [quote, setQuote] = useState<Quote>('"');
  const [input, setInput] = useState("");
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const convert = () => {
    if (!trial.canUse || !input.trim()) return;
    setError(null);
    try {
      setOutput(mode === "stringify" ? stringifyWithQuote(input, quote) : unstringify(input));
      trial.recordUse();
    } catch {
      setOutput(null);
      setError(
        mode === "stringify"
          ? "Could not stringify that input."
          : "Could not parse that string literal. Make sure it is wrapped in matching quotes.",
      );
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

  return (
    <ToolPageShell toolId="json-string-converter" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="JSON String Converter" left={trial.left} />

      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="flex rounded-lg border border-border p-0.5">
              {(["stringify", "unstringify"] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setMode(m); setOutput(null); setError(null); }}
                  className={cn(
                    "rounded-md px-4 py-2 text-xs font-bold transition",
                    mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {m === "stringify" ? "Text to string" : "String to text"}
                </button>
              ))}
            </div>
            {mode === "stringify" && (
              <select value={quote} onChange={(e) => setQuote(e.target.value as Quote)} className={selectCls} aria-label="Quote style">
                {QUOTES.map((q) => (
                  <option key={q.id} value={q.id}>{q.label}</option>
                ))}
              </select>
            )}
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={() => { setInput(SAMPLE); setOutput(null); setError(null); }}
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
            </div>
          </div>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              mode === "stringify"
                ? "Paste raw text or JSON here…"
                : 'Paste a quoted string literal here, e.g. "hello \\"world\\""'
            }
            spellCheck={false}
            rows={10}
            className="w-full resize-y rounded-xl border border-border bg-background p-4 font-mono text-[13px] leading-relaxed outline-none focus:border-primary"
          />

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <ActionButton busy={false} disabled={!trial.canUse || !input.trim()} onClick={convert}>
              {mode === "stringify" ? "Convert to string" : "Convert back to text"}
            </ActionButton>
            {!isPro && (
              <p className="text-xs text-muted-foreground">
                {trial.left} of {TOOL_TRIAL_LIMIT} free conversions left. Copy is unlimited.
              </p>
            )}
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-500/40 bg-red-500/10 p-5">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <div>
              <p className="font-bold text-red-600 dark:text-red-400">Conversion failed</p>
              <p className="mt-1 text-sm text-red-600/90 dark:text-red-400/90">{error}</p>
            </div>
          </div>
        )}

        {output !== null && !error && (
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-3 flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                <Check className="h-4 w-4" /> Done
              </p>
              <button
                type="button"
                onClick={copy}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="max-h-[400px] overflow-auto whitespace-pre-wrap break-all rounded-xl bg-muted/60 p-4 font-mono text-[13px] leading-relaxed">
              {output}
            </pre>
            <p className="mt-2 text-xs text-muted-foreground">
              {mode === "stringify"
                ? "Paste this literal straight into JavaScript, TypeScript, JSON or most config files."
                : "Escapes like \\n, \\t and \\uXXXX are decoded back to real characters."}
            </p>
          </div>
        )}
      </div>
    </ToolPageShell>
  );
}
