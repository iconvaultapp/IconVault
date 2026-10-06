// /tools/remove-extra-spaces - collapse extra spaces, trim lines, fix tabs and NBSP.
// 100% client-side.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/remove-extra-spaces";
import toolSeoMeta from "@/lib/tool-seo-meta-data/remove-extra-spaces";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/remove-extra-spaces")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/remove-extra-spaces";
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
  component: RemoveExtraSpacesTool,
});

interface CleanOptions {
  collapseSpaces: boolean;
  trimLines: boolean;
  removeEmpty: boolean;
  tabsToSpaces: boolean;
  normalizeUnicode: boolean;
}

/** Code points of unicode space characters that look like a normal space (incl. NBSP). */
const UNICODE_SPACE_CODES = new Set([
  0x00a0, 0x1680, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004,
  0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200a,
  0x202f, 0x205f, 0x3000,
]);

function normalizeUnicodeSpaces(s: string): string {
  let out = "";
  for (const ch of s) {
    out += UNICODE_SPACE_CODES.has(ch.codePointAt(0) ?? 0) ? " " : ch;
  }
  return out;
}

function cleanText(raw: string, opts: CleanOptions): string {
  let s = raw;
  if (opts.normalizeUnicode) s = normalizeUnicodeSpaces(s);
  if (opts.tabsToSpaces) s = s.replace(/\t/g, " ");
  let lines = s.split("\n");
  if (opts.collapseSpaces) lines = lines.map((l) => l.replace(/ {2,}/g, " "));
  if (opts.trimLines) lines = lines.map((l) => l.trim());
  if (opts.removeEmpty) lines = lines.filter((l) => l !== "");
  return lines.join("\n");
}

function RemoveExtraSpacesTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("remove-extra-spaces", isPro);
  const seo = toolSeo;

  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [charsBefore, setCharsBefore] = useState(0);
  const [charsAfter, setCharsAfter] = useState(0);
  const [ran, setRan] = useState(false);
  const [copied, setCopied] = useState(false);
  const [collapseSpaces, setCollapseSpaces] = useState(true);
  const [trimLines, setTrimLines] = useState(true);
  const [removeEmpty, setRemoveEmpty] = useState(false);
  const [tabsToSpaces, setTabsToSpaces] = useState(true);
  const [normalizeUnicode, setNormalizeUnicode] = useState(true);

  const run = () => {
    if (!trial.canUse) return;
    if (!input) {
      toast.error("Paste some text first");
      return;
    }
    const cleaned = cleanText(input, {
      collapseSpaces,
      trimLines,
      removeEmpty,
      tabsToSpaces,
      normalizeUnicode,
    });
    setOutput(cleaned);
    setCharsBefore(input.length);
    setCharsAfter(cleaned.length);
    setRan(true);
    setCopied(false);
    trial.recordUse();
    const removed = input.length - cleaned.length;
    toast.success(removed === 0 ? "Text is already clean" : `${removed} character${removed === 1 ? "" : "s"} removed`);
  };

  const copy = () => {
    if (!output) return;
    navigator.clipboard
      .writeText(output)
      .then(() => {
        setCopied(true);
        toast.success("Cleaned text copied");
      })
      .catch(() => toast.error("Copy failed"));
  };

  const options: { label: string; value: boolean; set: (v: boolean) => void }[] = [
    { label: "Collapse multiple spaces", value: collapseSpaces, set: setCollapseSpaces },
    { label: "Trim each line", value: trimLines, set: setTrimLines },
    { label: "Remove empty lines", value: removeEmpty, set: setRemoveEmpty },
    { label: "Tabs to spaces", value: tabsToSpaces, set: setTabsToSpaces },
    { label: "Normalize unicode spaces (NBSP)", value: normalizeUnicode, set: setNormalizeUnicode },
  ];

  const spacesRemoved = Math.max(0, charsBefore - charsAfter);

  return (
    <ToolPageShell toolId="remove-extra-spaces" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Remove Extra Spaces" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-2">
        <label className="block rounded-2xl border border-border bg-card p-4">
          <span className="mb-2 block text-sm font-bold">Input</span>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste messy text with  extra   spaces..."
            spellCheck={false}
            className="h-56 w-full resize-y rounded-xl border border-border bg-background p-3 text-[13px] leading-relaxed outline-none focus:border-primary"
          />
        </label>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-bold">Cleaned</span>
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
          {ran ? (
            <textarea
              value={output}
              readOnly
              spellCheck={false}
              placeholder="Cleaned text appears here..."
              className="h-56 w-full resize-y rounded-xl border border-border bg-background p-3 text-[13px] leading-relaxed outline-none"
            />
          ) : (
            <div className="flex h-56 flex-col items-center justify-center rounded-xl border border-dashed border-border text-center">
              <Sparkles className="mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm font-semibold text-muted-foreground">
                Cleaned text appears here
              </p>
            </div>
          )}
        </div>
      </div>

      {ran && (
        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            { label: "Characters before", value: charsBefore },
            { label: "Characters after", value: charsAfter },
            { label: "Characters removed", value: spacesRemoved },
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
            <Sparkles className="h-4 w-4" /> Clean text
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
