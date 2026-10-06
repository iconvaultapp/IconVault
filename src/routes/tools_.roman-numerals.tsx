// /tools/roman-numerals - Live two-way conversion between integers and Roman numerals.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeftRight, Copy, Hash } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/roman-numerals";
import toolSeoMeta from "@/lib/tool-seo-meta-data/roman-numerals";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/roman-numerals")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/roman-numerals";
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
  component: RomanTool,
});

const INPUT = "w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary";
const LABEL = "mb-1.5 block text-[13px] font-medium text-foreground/80";

const TABLE: [number, string][] = [
  [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
  [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
  [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
];

const ROMAN_RE = /^M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;

function toRoman(n: number): { roman: string; parts: string[] } {
  const parts: string[] = [];
  let rest = n;
  for (const [v, s] of TABLE) {
    while (rest >= v) { parts.push(s); rest -= v; }
  }
  return { roman: parts.join(""), parts };
}

function fromRoman(s: string): number | null {
  const t = s.toUpperCase().trim();
  if (!t || !ROMAN_RE.test(t)) return null;
  let i = 0;
  let total = 0;
  for (const [v, sym] of TABLE) {
    while (t.startsWith(sym, i)) { total += v; i += sym.length; }
  }
  return total;
}

function RomanTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("roman-numerals", isPro);
  const seo = toolSeo;

  const [num, setNum] = useState("2026");
  const [roman, setRoman] = useState("MMXXVI");
  const [numError, setNumError] = useState<string | null>(null);
  const [romanError, setRomanError] = useState<string | null>(null);

  const onNum = (v: string) => {
    setNum(v);
    if (v.trim() === "") { setRoman(""); setNumError(null); return; }
    const n = Math.floor(Number(v));
    if (!Number.isFinite(n) || !/^\d+$/.test(v.trim()) || n < 1 || n > 3999) {
      setNumError("Enter a whole number from 1 to 3999.");
      return;
    }
    setNumError(null);
    setRomanError(null);
    const { roman: r } = toRoman(n);
    setRoman(r);
  };

  const onRoman = (v: string) => {
    setRoman(v.toUpperCase());
    if (v.trim() === "") { setNum(""); setRomanError(null); return; }
    const n = fromRoman(v);
    if (n === null) {
      setRomanError("Not a valid Roman numeral (use I V X L C D M, e.g. MMXXVI).");
      return;
    }
    setRomanError(null);
    setNumError(null);
    setNum(String(n));
  };

  const breakdown = (() => {
    const n = Number(num);
    if (!numError && Number.isInteger(n) && n >= 1 && n <= 3999) return toRoman(n).parts;
    return null;
  })();

  const copy = async (text: string, label: string) => {
    if (!text || !trial.canUse) return;
    await navigator.clipboard.writeText(text);
    trial.recordUse();
    toast.success(`${label} copied`);
  };

  return (
    <ToolPageShell toolId="roman-numerals" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Roman Numerals" left={trial.left} />

      <div className="mx-auto max-w-2xl space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-8">
        <div>
          <label className={LABEL} htmlFor="rn-num">Integer (1 - 3999)</label>
          <input
            id="rn-num"
            value={num}
            onChange={(e) => onNum(e.target.value)}
            inputMode="numeric"
            placeholder="e.g. 2026"
            className={INPUT}
          />
          {numError && <p className="mt-1.5 text-sm font-medium text-red-500">{numError}</p>}
        </div>

        <div className="flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/30 px-4 py-1.5 text-xs font-bold text-muted-foreground">
            <ArrowLeftRight className="h-3.5 w-3.5" /> converts both ways, live
          </span>
        </div>

        <div>
          <label className={LABEL} htmlFor="rn-roman">Roman numeral</label>
          <input
            id="rn-roman"
            value={roman}
            onChange={(e) => onRoman(e.target.value)}
            placeholder="e.g. MMXXVI"
            spellCheck={false}
            autoComplete="off"
            className={INPUT}
          />
          {romanError && <p className="mt-1.5 text-sm font-medium text-red-500">{romanError}</p>}
        </div>

        {breakdown && breakdown.length > 0 && (
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Breakdown</p>
            <p className="font-mono text-sm font-bold tracking-wide">{breakdown.join(" + ")}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void copy(roman, "Roman numeral")}
            disabled={!roman || !!romanError}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold transition hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Copy className="h-4 w-4" /> Copy Roman
          </button>
          <button
            type="button"
            onClick={() => void copy(num, "Number")}
            disabled={!num || !!numError}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold transition hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Copy className="h-4 w-4" /> Copy number
          </button>
        </div>

        {!isPro && (
          <p className="text-xs text-muted-foreground">
            {trial.left} of {TOOL_TRIAL_LIMIT} free copies left - everything runs in your browser.
          </p>
        )}

        <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/20 p-4">
          <Hash className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            Standard form only: subtractive pairs (IV, IX, XL, XC, CD, CM) are used, so 4 is IV and 9 is IX - not IIII or VIIII.
          </p>
        </div>
      </div>
    </ToolPageShell>
  );
}
