// /tools/nato-phonetic - Text to NATO phonetic alphabet and back.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeftRight, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/nato-phonetic";
import toolSeoMeta from "@/lib/tool-seo-meta-data/nato-phonetic";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/nato-phonetic")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/nato-phonetic";
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
  component: NatoTool,
});

const NATO: Record<string, string> = {
  A: "Alpha", B: "Bravo", C: "Charlie", D: "Delta", E: "Echo", F: "Foxtrot",
  G: "Golf", H: "Hotel", I: "India", J: "Juliett", K: "Kilo", L: "Lima",
  M: "Mike", N: "November", O: "Oscar", P: "Papa", Q: "Quebec", R: "Romeo",
  S: "Sierra", T: "Tango", U: "Uniform", V: "Victor", W: "Whiskey", X: "X-ray",
  Y: "Yankee", Z: "Zulu",
  "0": "Zero", "1": "One", "2": "Two", "3": "Three", "4": "Four",
  "5": "Five", "6": "Six", "7": "Seven", "8": "Eight", "9": "Niner",
};
const WORD_TO_CHAR = new Map<string, string>();
for (const [ch, word] of Object.entries(NATO)) WORD_TO_CHAR.set(word.toLowerCase().replace(/-/g, ""), ch);
WORD_TO_CHAR.set("nine", "9"); // accept the common variant on decode

function toNato(text: string): string {
  const out: string[] = [];
  for (const ch of text.toUpperCase()) {
    if (ch === " ") continue;
    const word = NATO[ch];
    if (word) out.push(word);
  }
  return out.join(" ");
}

function fromNato(text: string): { ok: boolean; text: string; unknown: string[] } {
  const unknown: string[] = [];
  const chars: string[] = [];
  for (const raw of text.split(/[\s,.-]+/).filter(Boolean)) {
    const key = raw.toLowerCase().replace(/-/g, "");
    const ch = WORD_TO_CHAR.get(key);
    if (ch) chars.push(ch);
    else unknown.push(raw);
  }
  return { ok: unknown.length === 0, text: chars.join(""), unknown };
}

function NatoTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("nato-phonetic", isPro);
  const seo = toolSeo;

  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [input, setInput] = useState("Hello World 123");

  const result = useMemo(() => {
    if (mode === "encode") return { ok: true as const, text: toNato(input), unknown: [] as string[] };
    return fromNato(input);
  }, [input, mode]);

  const copy = async () => {
    if (!trial.canUse || !result.ok) return;
    try {
      await navigator.clipboard.writeText(result.text);
      trial.recordUse();
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <ToolPageShell toolId="nato-phonetic" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="NATO Phonetic" left={trial.left} />

      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl border border-border p-1">
              {(
                [
                  ["encode", "Text to NATO"],
                  ["decode", "NATO to text"],
                ] as const
              ).map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn(
                    "rounded-lg px-4 py-1.5 text-sm font-semibold transition",
                    mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => { setMode(mode === "encode" ? "decode" : "encode"); if (result.ok) setInput(result.text); }}
              className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium hover:border-primary/50"
            >
              <ArrowLeftRight className="h-4 w-4" /> Swap
            </button>
            <button
              type="button"
              onClick={copy}
              disabled={!trial.canUse || !result.ok || !result.text}
              className="ml-auto flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-semibold hover:border-primary/50 disabled:opacity-40"
            >
              <Copy className="h-4 w-4" /> Copy
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-[13px] font-medium text-foreground/80">
                {mode === "encode" ? "Text (letters and digits)" : "NATO words (space separated)"}
              </label>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={6}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/60"
              />
            </div>
            <div>
              <label className="mb-2 block text-[13px] font-medium text-foreground/80">Result</label>
              <div className="min-h-[168px] rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm leading-relaxed">
                {result.text || <span className="text-muted-foreground">Nothing to convert yet.</span>}
              </div>
              {!result.ok && (
                <p className="mt-1.5 text-xs font-medium text-red-500">
                  Unknown words skipped: {result.unknown.slice(0, 8).join(", ")}
                  {result.unknown.length > 8 && ` (+${result.unknown.length - 8} more)`}
                </p>
              )}
            </div>
          </div>
          {!isPro && (
            <p className="mt-4 text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left - digits use the official "Niner" for 9.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold">Full NATO alphabet reference</h2>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-6">
            {Object.entries(NATO).map(([ch, word]) => (
              <div key={ch} className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-sm font-bold text-primary">{ch}</span>
                <span className="text-sm">{word}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
