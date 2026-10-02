// /tools/word-filter - scan text against a built-in word list plus your own
// custom words, highlight matches or clean them to ***. 100% client-side.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, ScanSearch, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/word-filter")({
  head: () => {
    const seo = getToolSeoMeta("word-filter");
    const canonical = "https://iconvault.site/tools/word-filter";
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
  component: WordFilterTool,
});

// A moderate starter list of common English sensitive words. This is a demo
// list only - users should add their own words for real moderation.
const BASE_WORDS = [
  "damn", "hell", "crap", "shit", "fuck", "fucking", "bitch", "bastard", "asshole",
  "dick", "piss", "slut", "whore", "douche", "wanker", "twat", "prick", "bollocks",
  "bugger", "arse", "tits", "boobs", "horny", "porn", "nude", "sexy", "sucks",
  "dumbass", "jackass", "bastards",
];

const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

interface Match {
  word: string;
  index: number;
  length: number;
}

function findMatches(text: string, words: string[]): Match[] {
  const active = words.map((w) => w.trim().toLowerCase()).filter((w) => w.length > 0);
  if (active.length === 0 || !text) return [];
  const re = new RegExp(`\\b(${active.map(escRe).join("|")})\\b`, "gi");
  const out: Match[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.push({ word: m[1]!.toLowerCase(), index: m.index, length: m[0].length });
  }
  return out;
}

function WordFilterTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("word-filter", isPro);
  const seo = getToolSeo("word-filter");

  const [input, setInput] = useState("");
  const [custom, setCustom] = useState("");
  const [mode, setMode] = useState<"highlight" | "clean">("highlight");
  const [scanned, setScanned] = useState(false);
  const [copied, setCopied] = useState(false);

  const words = useMemo(() => {
    const extra = custom.split(/[\n,]+/).map((w) => w.trim()).filter((w) => w.length > 0);
    return [...BASE_WORDS, ...extra];
  }, [custom]);

  const matches = useMemo(() => (scanned ? findMatches(input, words) : []), [input, words, scanned]);
  const uniqueFound = useMemo(() => [...new Set(matches.map((m) => m.word))].sort(), [matches]);

  const cleaned = useMemo(() => {
    if (matches.length === 0) return input;
    let out = "";
    let last = 0;
    for (const m of matches) {
      out += input.slice(last, m.index) + "***";
      last = m.index + m.length;
    }
    return out + input.slice(last);
  }, [input, matches]);

  const scan = () => {
    if (!input.trim() || !trial.canUse) return;
    const found = findMatches(input, words);
    setScanned(true);
    setCopied(false);
    trial.recordUse();
    toast.success(
      found.length > 0 ? `Found ${found.length} match${found.length === 1 ? "" : "es"}` : "No matches found",
    );
  };

  const copy = () => {
    if (!cleaned || !trial.canUse) return;
    navigator.clipboard
      .writeText(cleaned)
      .then(() => {
        setCopied(true);
        trial.recordUse();
        toast.success("Cleaned text copied");
      })
      .catch(() => toast.error("Copy failed"));
  };

  const highlighted = useMemo(() => {
    if (matches.length === 0) return input;
    const parts: React.ReactNode[] = [];
    let last = 0;
    matches.forEach((m, i) => {
      if (m.index > last) parts.push(<span key={`t${i}`}>{input.slice(last, m.index)}</span>);
      parts.push(
        <mark key={`m${i}`} className="rounded bg-red-500/25 px-0.5 font-bold text-red-600 dark:text-red-400">
          {input.slice(m.index, m.index + m.length)}
        </mark>,
      );
      last = m.index + m.length;
    });
    if (last < input.length) parts.push(<span key="tend">{input.slice(last)}</span>);
    return parts;
  }, [input, matches]);

  return (
    <ToolPageShell toolId="word-filter" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Word Filter" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <span className="mb-2 block text-sm font-bold">Text to scan</span>
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setScanned(false);
            }}
            placeholder="Paste the text you want to check..."
            spellCheck={false}
            className="h-60 w-full resize-y rounded-xl border border-border bg-background p-3 text-[13px] leading-relaxed outline-none focus:border-primary"
          />
          <label className="mt-3 block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">
              Your own words (comma or line separated)
            </span>
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="e.g. spoiler, leak, internal"
              spellCheck={false}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
          <p className="mt-2 text-xs text-muted-foreground">
            {words.length} words active ({BASE_WORDS.length} built-in + {words.length - BASE_WORDS.length} yours).
            Matching is case-insensitive, whole words only.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-bold">
              Result
              {scanned && (
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-bold",
                    matches.length > 0 ? "bg-red-500/15 text-red-600 dark:text-red-400" : "bg-green-500/15 text-green-600 dark:text-green-400",
                  )}
                >
                  {matches.length} match{matches.length === 1 ? "" : "es"}
                </span>
              )}
            </span>
            <div className="flex gap-2">
              <div className="inline-flex gap-1 rounded-xl bg-muted p-1">
                {(["highlight", "clean"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition",
                      mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={copy}
                disabled={!scanned || !trial.canUse}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          {!scanned ? (
            <div className="flex h-60 flex-col items-center justify-center rounded-xl border border-dashed border-border text-center">
              <ShieldAlert className="mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="px-6 text-sm font-semibold text-muted-foreground">
                Hit Scan and matches are highlighted here (or cleaned to ***)
              </p>
            </div>
          ) : mode === "highlight" ? (
            <div className="h-60 overflow-y-auto whitespace-pre-wrap rounded-xl border border-border bg-background p-3 text-[13px] leading-relaxed">
              {matches.length > 0 ? highlighted : input}
            </div>
          ) : (
            <textarea
              value={cleaned}
              readOnly
              spellCheck={false}
              className="h-60 w-full resize-y rounded-xl border border-border bg-background p-3 text-[13px] leading-relaxed outline-none"
            />
          )}

          {scanned && uniqueFound.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {uniqueFound.map((w) => (
                <span key={w} className="rounded-lg bg-red-500/10 px-2.5 py-1 font-mono text-xs font-bold text-red-600 dark:text-red-400">
                  {w}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <ActionButton disabled={!input.trim() || !trial.canUse} onClick={scan}>
          <ScanSearch className="h-4 w-4" /> Scan text
        </ActionButton>
        {!isPro && (
          <p className="text-xs text-muted-foreground">
            {trial.left} of {TOOL_TRIAL_LIMIT} free scans left - runs fully in your browser.
          </p>
        )}
      </div>

      <p className="mt-4 max-w-3xl text-xs leading-relaxed text-muted-foreground">
        The built-in list is a small demo set of common English sensitive words; it is not a moderation
        dataset. Add your own words above for anything serious, and always review results before publishing.
      </p>
    </ToolPageShell>
  );
}
