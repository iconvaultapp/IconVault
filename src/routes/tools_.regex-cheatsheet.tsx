// /tools/regex-cheatsheet - 65 regex patterns grouped, searchable, click to copy (JS flavor).

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/regex-cheatsheet";
import toolSeoMeta from "@/lib/tool-seo-meta-data/regex-cheatsheet";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/regex-cheatsheet")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/regex-cheatsheet";
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
  component: RegexCheatTool,
});

type Entry = { p: string; d: string };
type Group = { g: string; items: Entry[] };

const GROUPS: Group[] = [
  {
    g: "Anchors",
    items: [
      { p: "^", d: "Start of string (or line with the m flag)" },
      { p: "$", d: "End of string (or line with the m flag)" },
      { p: "\\b", d: "Word boundary - between \\w and \\W" },
      { p: "\\B", d: "Not a word boundary" },
      { p: "^abc$", d: "Full match - the whole string must be abc" },
      { p: "\\bcat\\b", d: "Whole word cat, not concatenate" },
    ],
  },
  {
    g: "Character classes",
    items: [
      { p: ".", d: "Any character except line breaks (with s flag, any char)" },
      { p: "\\d", d: "Digit: 0-9" },
      { p: "\\D", d: "Any non-digit" },
      { p: "\\w", d: "Word character: A-Z, a-z, 0-9 and _" },
      { p: "\\W", d: "Any non-word character" },
      { p: "\\s", d: "Whitespace: space, tab, newline" },
      { p: "\\S", d: "Any non-whitespace" },
      { p: "[abc]", d: "One of a, b or c" },
      { p: "[^abc]", d: "Anything except a, b or c" },
      { p: "[a-z]", d: "Any lowercase letter" },
      { p: "[A-Z0-9]", d: "Any uppercase letter or digit" },
      { p: "\\p{L}", d: "Any letter in any language (needs the u flag)" },
      { p: "[\\s\\S]", d: "Literally any character including newlines" },
    ],
  },
  {
    g: "Quantifiers",
    items: [
      { p: "*", d: "Zero or more of the previous" },
      { p: "+", d: "One or more of the previous" },
      { p: "?", d: "Zero or one - makes it optional" },
      { p: "{3}", d: "Exactly 3" },
      { p: "{2,}", d: "2 or more" },
      { p: "{2,5}", d: "Between 2 and 5" },
      { p: "*?", d: "Lazy star - match as few as possible" },
      { p: "+?", d: "Lazy plus - match as few as possible" },
      { p: "??", d: "Lazy optional" },
    ],
  },
  {
    g: "Groups and backreferences",
    items: [
      { p: "(abc)", d: "Capturing group - also available as $1 in replacements" },
      { p: "(?:abc)", d: "Non-capturing group - groups without saving" },
      { p: "(?<year>\\d{4})", d: "Named group - access as match.groups.year" },
      { p: "(a)(b)\\1\\2", d: "Backreference - matches abab" },
      { p: "\\k<year>", d: "Backreference to a named group" },
      { p: "(a|b)", d: "Alternation group - matches a or b" },
    ],
  },
  {
    g: "Lookaround assertions",
    items: [
      { p: "(?=abc)", d: "Positive lookahead - followed by abc, not consumed" },
      { p: "(?!abc)", d: "Negative lookahead - NOT followed by abc" },
      { p: "(?<=abc)", d: "Positive lookbehind - preceded by abc" },
      { p: "(?<!abc)", d: "Negative lookbehind - NOT preceded by abc" },
      { p: "\\d+(?=px)", d: "Number followed by px - matches only the number" },
    ],
  },
  {
    g: "Flags",
    items: [
      { p: "g", d: "Global - find all matches, not just the first" },
      { p: "i", d: "Case-insensitive matching" },
      { p: "m", d: "Multiline - ^ and $ match line starts and ends" },
      { p: "s", d: "DotAll - . also matches newlines" },
      { p: "u", d: "Unicode - correct handling of emoji and astral chars" },
      { p: "y", d: "Sticky - match only at lastIndex position" },
    ],
  },
  {
    g: "Common recipes",
    items: [
      { p: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$", d: "Email - practical, covers 99% of real addresses" },
      { p: "https?:\\/\\/[^\\s/$.?#].[^\\s]*", d: "URL starting with http or https" },
      { p: "^\\d{4}-\\d{2}-\\d{2}$", d: "Date as YYYY-MM-DD" },
      { p: "^([01]\\d|2[0-3]):[0-5]\\d$", d: "24-hour time HH:MM" },
      { p: "^\\+?[\\d\\s().-]{7,}$", d: "Phone number - loose, international friendly" },
      { p: "\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b", d: "IPv4 address (format check, not range-validated)" },
      { p: "^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$", d: "Hex color like #fff or #1a2b3c" },
      { p: "^[a-z0-9]+(?:-[a-z0-9]+)*$", d: "URL slug - lowercase words joined by dashes" },
      { p: "<([a-z][\\w-]*)[^>]*>", d: "Opening HTML tag, tag name captured" },
      { p: "\"(?:[^\"\\\\]|\\\\.)*\"", d: "Double-quoted string with escaped quotes" },
      { p: "^\\s+|\\s+$", d: "Leading or trailing whitespace - use with g to trim" },
      { p: "^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d]{8,}$", d: "Password - 8+ chars with at least one letter and one digit" },
    ],
  },
];

const TOTAL = GROUPS.reduce((a, g) => a + g.items.length, 0);

function RegexCheatTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("regex-cheatsheet", isPro);
  const seo = toolSeo;

  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return GROUPS;
    return GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((e) => e.p.toLowerCase().includes(q) || e.d.toLowerCase().includes(q)),
    })).filter((g) => g.items.length > 0);
  }, [query]);

  const copy = async (p: string) => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(p);
      trial.recordUse();
      toast.success("Pattern copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <ToolPageShell toolId="regex-cheatsheet" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Regex Cheatsheet" left={trial.left} />

      <div className="space-y-6">
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search patterns, e.g. email, lookahead, flag..."
              className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary/60"
            />
          </div>
          <p className="text-xs text-muted-foreground sm:ml-auto">
            {TOTAL} patterns - <strong className="text-foreground">JavaScript (ECMAScript) flavor</strong>, tested with new RegExp. Click any pattern to copy it.
          </p>
        </div>

        {filtered.map((g) => (
          <section key={g.g} className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">{g.g} <span className="ml-1 text-xs font-semibold normal-case">({g.items.length})</span></h2>
            <div className="grid gap-1.5 md:grid-cols-2">
              {g.items.map((e) => (
                <button
                  key={e.p}
                  type="button"
                  onClick={() => void copy(e.p)}
                  title="Click to copy"
                  disabled={!trial.canUse}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border border-border px-3 py-2.5 text-left transition",
                    "hover:border-primary/50 hover:bg-primary/5 disabled:opacity-40",
                  )}
                >
                  <code className="shrink-0 rounded-md bg-muted px-2 py-1 font-mono text-[13px] font-bold text-primary">{e.p}</code>
                  <span className="text-[13px] leading-snug text-muted-foreground">{e.d}</span>
                </button>
              ))}
            </div>
          </section>
        ))}
        {filtered.length === 0 && (
          <p className="rounded-2xl border border-border bg-card py-10 text-center text-sm text-muted-foreground">
            No patterns match "{query}".
          </p>
        )}
        {!isPro && (
          <p className="text-xs text-muted-foreground">
            {trial.left} of {TOOL_TRIAL_LIMIT} free copies left.
          </p>
        )}
      </div>
    </ToolPageShell>
  );
}
