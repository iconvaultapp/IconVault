// /tools/case-converter - convert text between UPPER, lower, Title, Sentence,
// camelCase, PascalCase, snake_case, kebab-case, CONSTANT_CASE, aLtErNaTiNg, iNvErSe.
// 100% client-side.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Type } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/case-converter")({
  head: () => {
    const seo = getToolSeoMeta("case-converter");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: CaseConverterTool,
});

type CaseId =
  | "upper"
  | "lower"
  | "title"
  | "sentence"
  | "camel"
  | "pascal"
  | "snake"
  | "kebab"
  | "constant"
  | "alternating"
  | "inverse";

const CASES: { id: CaseId; label: string }[] = [
  { id: "upper", label: "UPPER" },
  { id: "lower", label: "lower" },
  { id: "title", label: "Title" },
  { id: "sentence", label: "Sentence" },
  { id: "camel", label: "camelCase" },
  { id: "pascal", label: "PascalCase" },
  { id: "snake", label: "snake_case" },
  { id: "kebab", label: "kebab-case" },
  { id: "constant", label: "CONSTANT_CASE" },
  { id: "alternating", label: "aLtErNaTiNg" },
  { id: "inverse", label: "iNvErSe" },
];

const SMALL_WORDS = new Set(["a", "an", "the", "and", "or", "of", "in", "on", "to", "for"]);

function wordsOf(t: string): string[] {
  return t.split(/[\s_-]+/).filter((w) => w.length > 0);
}

function capitalize(w: string): string {
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
}

function convert(t: string, c: CaseId): string {
  switch (c) {
    case "upper":
      return t.toUpperCase();
    case "lower":
      return t.toLowerCase();
    case "title": {
      const words = wordsOf(t);
      return words
        .map((w, i) => {
          const lw = w.toLowerCase();
          if (i > 0 && i < words.length - 1 && SMALL_WORDS.has(lw)) return lw;
          return capitalize(w);
        })
        .join(" ");
    }
    case "sentence":
      return t.toLowerCase().replace(/(^\s*[a-z])|([.!?]\s+[a-z])/g, (m) => m.toUpperCase());
    case "camel": {
      const words = wordsOf(t);
      return words.map((w, i) => (i === 0 ? w.toLowerCase() : capitalize(w))).join("");
    }
    case "pascal":
      return wordsOf(t).map(capitalize).join("");
    case "snake":
      return wordsOf(t).map((w) => w.toLowerCase()).join("_");
    case "kebab":
      return wordsOf(t).map((w) => w.toLowerCase()).join("-");
    case "constant":
      return wordsOf(t).map((w) => w.toUpperCase()).join("_");
    case "alternating": {
      let i = 0;
      return [...t]
        .map((ch) => {
          if (!/[a-zA-Z]/.test(ch)) return ch;
          const out = i % 2 === 0 ? ch.toLowerCase() : ch.toUpperCase();
          i++;
          return out;
        })
        .join("");
    }
    case "inverse":
      return [...t]
        .map((ch) => (ch === ch.toLowerCase() ? ch.toUpperCase() : ch.toLowerCase()))
        .join("");
  }
}

function CaseConverterTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("case-converter", isPro);
  const seo = getToolSeo("case-converter");

  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [activeCase, setActiveCase] = useState<CaseId | null>(null);
  const [copied, setCopied] = useState(false);

  const applyCase = (c: CaseId) => {
    if (!trial.canUse) return;
    if (!input.trim()) {
      toast.error("Enter some text first");
      return;
    }
    setOutput(convert(input, c));
    setActiveCase(c);
    setCopied(false);
    trial.recordUse();
  };

  const copy = () => {
    if (!output) return;
    navigator.clipboard
      .writeText(output)
      .then(() => {
        setCopied(true);
        toast.success("Converted text copied");
      })
      .catch(() => toast.error("Copy failed"));
  };

  const activeLabel = CASES.find((c) => c.id === activeCase)?.label;

  return (
    <ToolPageShell toolId="case-converter" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Case Converter" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-2">
        <label className="block rounded-2xl border border-border bg-card p-4">
          <span className="mb-2 block text-sm font-bold">Input</span>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type or paste your text here..."
            spellCheck={false}
            className="h-56 w-full resize-y rounded-xl border border-border bg-background p-3 text-[13px] leading-relaxed outline-none focus:border-primary"
          />
        </label>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-bold">Output{activeLabel ? ` - ${activeLabel}` : ""}</span>
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
          {output ? (
            <textarea
              value={output}
              readOnly
              spellCheck={false}
              className="h-56 w-full resize-y rounded-xl border border-border bg-background p-3 text-[13px] leading-relaxed outline-none"
            />
          ) : (
            <div className="flex h-56 flex-col items-center justify-center rounded-xl border border-dashed border-border text-center">
              <Type className="mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm font-semibold text-muted-foreground">
                Pick a case below to convert your text
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <span className="mb-3 block text-sm font-bold">Choose a case</span>
        <div className="flex flex-wrap gap-2">
          {CASES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => applyCase(c.id)}
              disabled={!trial.canUse}
              className={`rounded-xl border px-4 py-2.5 font-mono text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                activeCase === c.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="mt-4">
          <ActionButton disabled={!trial.canUse || !activeCase} onClick={() => activeCase && applyCase(activeCase)}>
            <Type className="h-4 w-4" /> Re-apply{activeLabel ? ` ${activeLabel}` : ""}
          </ActionButton>
        </div>
        {!isPro && (
          <p className="mt-3 text-xs text-muted-foreground">
            {trial.left} of {TOOL_TRIAL_LIMIT} free conversions left - everything runs in your browser, nothing is uploaded.
          </p>
        )}
      </div>
    </ToolPageShell>
  );
}
