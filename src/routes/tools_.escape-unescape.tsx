// /tools/escape-unescape - escape and unescape strings for JS, regex, URL and
// HTML. 100% client-side.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownUp, Check, Copy, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/escape-unescape")({
  head: () => {
    const seo = getToolSeoMeta("escape-unescape");
    const canonical = "https://iconvault.site/tools/escape-unescape";
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
  component: EscapeUnescapeTool,
});

type Mode = "js" | "regex" | "url" | "html";
type Dir = "escape" | "unescape";

const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: "js", label: "JS string", hint: "Escapes quotes, backslashes and control chars (JSON-style): \"  \\\\  \\n  \\t" },
  { id: "regex", label: "Regex", hint: "Escapes . * + ? ^ $ { } ( ) | [ ] \\ so the text matches literally" },
  { id: "url", label: "URL", hint: "encodeURIComponent / decodeURIComponent for query strings and path parts" },
  { id: "html", label: "HTML", hint: "Escapes & < > \" ' to entities and back" },
];

function escapeJs(s: string): string {
  return JSON.stringify(s).slice(1, -1);
}

function unescapeJs(s: string): string {
  return JSON.parse(`"${s.replace(/\n/g, "\\n")}"`);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function unescapeRegex(s: string): string {
  return s.replace(/\\(.)/gs, "$1");
}

function escapeUrl(s: string): string {
  return encodeURIComponent(s);
}

function unescapeUrl(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return decodeURI(s);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function unescapeHtml(s: string): string {
  const el = document.createElement("textarea");
  el.innerHTML = s;
  return el.value;
}

function transform(mode: Mode, dir: Dir, s: string): { text: string; error: string | null } {
  try {
    switch (mode) {
      case "js":
        return { text: dir === "escape" ? escapeJs(s) : unescapeJs(s), error: null };
      case "regex":
        return { text: dir === "escape" ? escapeRegex(s) : unescapeRegex(s), error: null };
      case "url":
        return { text: dir === "escape" ? escapeUrl(s) : unescapeUrl(s), error: null };
      case "html":
        return { text: dir === "escape" ? escapeHtml(s) : unescapeHtml(s), error: null };
    }
  } catch (e) {
    return { text: "", error: e instanceof Error ? e.message : "Conversion failed" };
  }
}

function EscapeUnescapeTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("escape-unescape", isPro);
  const seo = getToolSeo("escape-unescape");

  const [mode, setMode] = useState<Mode>("js");
  const [dir, setDir] = useState<Dir>("escape");
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => transform(mode, dir, input), [mode, dir, input]);
  const activeHint = MODES.find((m) => m.id === mode)?.hint ?? "";

  const copy = () => {
    if (!result.text || !trial.canUse) return;
    navigator.clipboard
      .writeText(result.text)
      .then(() => {
        setCopied(true);
        trial.recordUse();
        toast.success("Result copied");
      })
      .catch(() => toast.error("Copy failed"));
  };

  const swap = () => {
    setInput(result.text);
    setDir(dir === "escape" ? "unescape" : "escape");
    setCopied(false);
  };

  return (
    <ToolPageShell toolId="escape-unescape" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Escape / Unescape" left={trial.left} />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="inline-flex gap-1 rounded-xl bg-muted p-1">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                setMode(m.id);
                setCopied(false);
              }}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-bold transition",
                mode === m.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="inline-flex gap-1 rounded-xl border border-border p-1">
          {(["escape", "unescape"] as Dir[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => {
                setDir(d);
                setCopied(false);
              }}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-bold capitalize transition",
                dir === d ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {d}
            </button>
          ))}
        </div>
        <p className="w-full text-xs text-muted-foreground">{activeHint}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <label className="block rounded-2xl border border-border bg-card p-4">
          <span className="mb-2 block text-sm font-bold capitalize">{dir === "escape" ? "Raw" : "Escaped"} input</span>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={dir === "escape" ? "Type or paste raw text..." : "Type or paste escaped text..."}
            spellCheck={false}
            className="h-60 w-full resize-y rounded-xl border border-border bg-background p-3 font-mono text-[13px] leading-relaxed outline-none focus:border-primary"
          />
        </label>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-bold">
              <Zap className="h-4 w-4 text-muted-foreground" /> {dir === "escape" ? "Escaped" : "Unescaped"} output
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={swap}
                disabled={!result.text}
                title="Use output as input and flip direction"
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-bold transition hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ArrowDownUp className="h-4 w-4" /> Swap
              </button>
              <button
                type="button"
                onClick={copy}
                disabled={!result.text || !trial.canUse}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
          {result.error ? (
            <div className="flex h-60 flex-col items-center justify-center rounded-xl border border-red-500/30 bg-red-500/5 px-6 text-center">
              <p className="text-sm font-bold text-red-500">Could not {dir}</p>
              <p className="mt-1 text-xs text-muted-foreground">{result.error}</p>
            </div>
          ) : result.text ? (
            <textarea
              value={result.text}
              readOnly
              spellCheck={false}
              className="h-60 w-full resize-y rounded-xl border border-border bg-background p-3 font-mono text-[13px] leading-relaxed outline-none"
            />
          ) : (
            <div className="flex h-60 flex-col items-center justify-center rounded-xl border border-dashed border-border text-center">
              <Zap className="mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm font-semibold text-muted-foreground">Your converted string appears here</p>
            </div>
          )}
        </div>
      </div>

      {!isPro && (
        <p className="mt-6 text-xs text-muted-foreground">
          {trial.left} of {TOOL_TRIAL_LIMIT} free copies left - everything runs in your browser, nothing is uploaded.
        </p>
      )}
    </ToolPageShell>
  );
}
