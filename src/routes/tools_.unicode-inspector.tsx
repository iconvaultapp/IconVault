// /tools/unicode-inspector - Per-character Unicode breakdown: code point, UTF-8/UTF-16, category, HTML entity.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/unicode-inspector")({
  head: () => {
    const seo = getToolSeoMeta("unicode-inspector");
    const canonical = "https://iconvault.site/tools/unicode-inspector";
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
  component: UnicodeInspectorTool,
});

const CATS: [string, string][] = [
  ["Lu", "Uppercase Letter"], ["Ll", "Lowercase Letter"], ["Lt", "Titlecase Letter"],
  ["Lm", "Modifier Letter"], ["Lo", "Other Letter"],
  ["Nd", "Decimal Number"], ["Nl", "Letter Number"], ["No", "Other Number"],
  ["Pc", "Connector Punctuation"], ["Pd", "Dash Punctuation"], ["Ps", "Open Punctuation"],
  ["Pe", "Close Punctuation"], ["Pi", "Initial Punctuation"], ["Pf", "Final Punctuation"],
  ["Po", "Other Punctuation"],
  ["Sm", "Math Symbol"], ["Sc", "Currency Symbol"], ["Sk", "Modifier Symbol"], ["So", "Other Symbol"],
  ["Zs", "Space Separator"], ["Zl", "Line Separator"], ["Zp", "Paragraph Separator"],
  ["Cc", "Control"], ["Cf", "Format"], ["Cs", "Surrogate"], ["Co", "Private Use"],
  ["Mn", "Nonspacing Mark"], ["Mc", "Spacing Mark"], ["Me", "Enclosing Mark"],
];
const CAT_REGEXES = CATS.map(([code, name]) => ({ code, name, re: new RegExp(`\\p{${code}}`, "u") }));

function categoryOf(ch: string): string {
  for (const c of CAT_REGEXES) {
    try {
      if (c.re.test(ch)) return `${c.code} - ${c.name}`;
    } catch {
      /* ignore */
    }
  }
  return "Cn - Unassigned";
}

const NAMED_ENTITIES: Record<string, string> = { "&": "amp", "<": "lt", ">": "gt", '"': "quot", "'": "apos" };

const encoder = new TextEncoder();
const hex = (n: number, pad: number) => n.toString(16).toUpperCase().padStart(pad, "0");

type CharInfo = {
  ch: string;
  codePoint: string;
  utf8: string;
  utf16: string;
  category: string;
  entity: string;
};

function inspect(text: string): CharInfo[] {
  return Array.from(text).map((ch) => {
    const cp = ch.codePointAt(0) ?? 0;
    const cpHex = hex(cp, cp > 0xffff ? 6 : 4);
    const utf8 = [...encoder.encode(ch)].map((b) => hex(b, 2)).join(" ");
    const units: string[] = [];
    for (let i = 0; i < ch.length; i++) units.push(hex(ch.charCodeAt(i), 4));
    const named = NAMED_ENTITIES[ch];
    return {
      ch,
      codePoint: `U+${cpHex}`,
      utf8,
      utf16: units.join(" "),
      category: categoryOf(ch),
      entity: named ? `&${named};` : `&#x${cpHex};`,
    };
  });
}

const MAX_ROWS = 500;

function UnicodeInspectorTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("unicode-inspector", isPro);
  const seo = getToolSeo("unicode-inspector");

  const [text, setText] = useState("Hello 👋");

  const infos = useMemo(() => inspect(text), [text]);
  const shown = infos.slice(0, MAX_ROWS);
  const unique = useMemo(() => new Set(infos.map((i) => i.ch)).size, [infos]);

  const copyChar = async (ch: string) => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(ch);
      trial.recordUse();
      toast.success("Character copied");
    } catch {
      toast.error("Copy failed");
    }
  };
  const copyAll = async () => {
    if (!trial.canUse) return;
    const tsv = ["char\tcode point\tutf-8\tutf-16\tcategory\thtml entity", ...infos.map((i) => `${i.ch}\t${i.codePoint}\t${i.utf8}\t${i.utf16}\t${i.category}\t${i.entity}`)].join("\n");
    try {
      await navigator.clipboard.writeText(tsv);
      trial.recordUse();
      toast.success("Table copied as TSV");
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <ToolPageShell toolId="unicode-inspector" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Unicode Inspector" left={trial.left} />

      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-5">
          <label className="mb-2 block text-[13px] font-medium text-foreground/80">Text to inspect</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="Paste or type text - emoji, accents, symbols..."
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/60"
          />
          <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span><strong className="text-foreground">{infos.length}</strong> characters (code points)</span>
            <span><strong className="text-foreground">{unique}</strong> unique</span>
            <span><strong className="text-foreground">{encoder.encode(text).length}</strong> UTF-8 bytes</span>
            <button
              type="button"
              onClick={copyAll}
              disabled={!trial.canUse || infos.length === 0}
              className="ml-auto flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:border-primary/50 disabled:opacity-40"
            >
              <Copy className="h-4 w-4" /> Copy table
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Char</th>
                <th className="px-4 py-3 font-semibold">Code point</th>
                <th className="px-4 py-3 font-semibold">UTF-8 bytes</th>
                <th className="px-4 py-3 font-semibold">UTF-16 units</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">HTML entity</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((info, i) => (
                <tr
                  key={i}
                  onClick={() => void copyChar(info.ch)}
                  title="Click to copy this character"
                  className="cursor-pointer border-t border-border transition hover:bg-primary/5"
                >
                  <td className="px-4 py-2 text-xl">{info.ch === " " ? <span className="text-muted-foreground">{"\u2423"}</span> : info.ch}</td>
                  <td className="px-4 py-2 font-mono text-[13px] font-semibold text-primary">{info.codePoint}</td>
                  <td className="px-4 py-2 font-mono text-[13px]">{info.utf8}</td>
                  <td className="px-4 py-2 font-mono text-[13px]">{info.utf16}</td>
                  <td className="px-4 py-2 text-[13px] text-muted-foreground">{info.category}</td>
                  <td className="px-4 py-2 font-mono text-[13px]">{info.entity}</td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Type something above to inspect its characters.</td>
                </tr>
              )}
            </tbody>
          </table>
          {infos.length > MAX_ROWS && (
            <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
              Showing first {MAX_ROWS} of {infos.length} characters.
            </p>
          )}
        </div>
        {!isPro && (
          <p className="text-xs text-muted-foreground">
            {trial.left} of {TOOL_TRIAL_LIMIT} free copies left - click any row to copy that character.
          </p>
        )}
      </div>
    </ToolPageShell>
  );
}
