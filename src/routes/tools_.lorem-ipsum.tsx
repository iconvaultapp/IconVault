// /tools/lorem-ipsum - placeholder text generator: paragraphs, sentences
// or words. 100% client-side, no network calls.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlignLeft, Copy, Type } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/lorem-ipsum";
import toolSeoMeta from "@/lib/tool-seo-meta-data/lorem-ipsum";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/lorem-ipsum")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/lorem-ipsum";
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
  component: LoremIpsumTool,
});

type GenType = "paragraphs" | "sentences" | "words";
type OutFormat = "plain" | "html-paragraphs" | "html-list";

const OUT_FORMATS: { id: OutFormat; label: string }[] = [
  { id: "plain", label: "Plain text" },
  { id: "html-paragraphs", label: "HTML paragraphs" },
  { id: "html-list", label: "HTML list" },
];

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Apply the output format on top of generation. `blocks` are the raw
 * paragraphs (a single block for the sentences/words granularity).
 * HTML paragraphs wraps each paragraph in <p>; HTML list wraps each
 * sentence in <li> inside <ul> (words granularity: each word).
 */
function formatBlocks(blocks: string[], format: OutFormat, type: GenType): string {
  if (format === "html-paragraphs") {
    return blocks.map((b) => `<p>${escapeHtml(b)}</p>`).join("\n");
  }
  if (format === "html-list") {
    const items =
      type === "words"
        ? (blocks[0] ?? "").split(" ").filter(Boolean)
        : blocks.flatMap((b) =>
            b
              .split(/(?<=[.!?])\s+/)
              .map((s) => s.trim())
              .filter(Boolean),
          );
    return `<ul>\n${items.map((s) => `  <li>${escapeHtml(s)}</li>`).join("\n")}\n</ul>`;
  }
  return blocks.join("\n\n");
}

const CLASSIC =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";

const WORDS = (
  "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt " +
  "ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco " +
  "laboris nisi aliquip ex ea commodo consequat duis aute irure dolor in reprehenderit " +
  "voluptate velit esse cillum dolore fugiat nulla pariatur excepteur sint occaecat cupidatat " +
  "non proident sunt culpa qui officia deserunt mollit anim id est laborum perspiciatis unde " +
  "omnis iste natus error sit voluptatem accusantium doloremque laudantium totam rem aperiam " +
  "eaque ipsa ab illo inventore veritatis quasi architecto beatae vitae dicta sunt explicabo"
).split(" ");

const randWord = (): string => WORDS[Math.floor(Math.random() * WORDS.length)] ?? "";

function makeSentence(): string {
  const n = 6 + Math.floor(Math.random() * 9);
  const words = Array.from({ length: n }, randWord);
  const w0 = words[0] ?? "";
  words[0] = w0.charAt(0).toUpperCase() + w0.slice(1);
  return `${words.join(" ")}.`;
}

function makeParagraph(): string {
  const n = 3 + Math.floor(Math.random() * 4);
  const sents = [CLASSIC];
  for (let i = 1; i < n; i++) sents.push(makeSentence());
  return sents.join(" ");
}

function makeWords(n: number): string {
  const seq = ["Lorem", "ipsum", "dolor", "sit", "amet"];
  while (seq.length < n) seq.push(randWord());
  return seq.slice(0, n).join(" ");
}

function LoremIpsumTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("lorem-ipsum", isPro);
  const seo = toolSeo;

  const [type, setType] = useState<GenType>("paragraphs");
  const [count, setCount] = useState(3);
  const [format, setFormat] = useState<OutFormat>("plain");
  const [output, setOutput] = useState("");
  // Raw generated blocks + the granularity they were made with, so changing
  // the output format re-applies the format without regenerating the text.
  const [lastGen, setLastGen] = useState<{ blocks: string[]; type: GenType } | null>(null);

  const generate = () => {
    if (!trial.canUse) return;
    const c = Math.max(1, Math.min(50, Math.floor(count) || 1));
    setCount(c);
    let blocks: string[];
    if (type === "paragraphs") {
      blocks = Array.from({ length: c }, makeParagraph);
    } else if (type === "sentences") {
      const sents = [CLASSIC];
      for (let i = 1; i < c; i++) sents.push(makeSentence());
      blocks = [sents.join(" ")];
    } else {
      blocks = [makeWords(c)];
    }
    setLastGen({ blocks, type });
    setOutput(formatBlocks(blocks, format, type));
    trial.recordUse();
  };

  const applyFormat = (f: OutFormat) => {
    setFormat(f);
    if (lastGen) setOutput(formatBlocks(lastGen.blocks, f, lastGen.type));
  };

  const copy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      toast.success("Placeholder text copied to clipboard.");
    } catch {
      toast.error("Could not copy - select the text and copy it manually.");
    }
  };

  return (
    <ToolPageShell toolId="lorem-ipsum" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Lorem Ipsum Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-foreground/80">
              Generate
            </span>
            <select
              value={type} onChange={(e) => setType(e.target.value as GenType)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            >
              <option value="paragraphs">Paragraphs</option>
              <option value="sentences">Sentences</option>
              <option value="words">Words</option>
            </select>
          </label>

          <label className="block">
            <div className="mb-1.5 flex items-center justify-between text-[13px]">
              <span className="font-medium text-foreground/80">How many? (1–50)</span>
              <span className="tabular-nums text-muted-foreground">{count}</span>
            </div>
            <input
              type="number" min={1} max={50} value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </label>

          <div>
            <span className="mb-2 block text-[13px] font-medium text-foreground/80">
              Output format
            </span>
            <div className="flex flex-wrap gap-1.5 rounded-xl border border-border p-1">
              {OUT_FORMATS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => applyFormat(f.id)}
                  className={`flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] font-semibold transition ${
                    format === f.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <ActionButton busy={false} disabled={!trial.canUse} onClick={generate}>
            <Type className="h-4 w-4" /> Generate text
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free generations left - everything runs in your
              browser.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {output === "" ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <AlignLeft className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Placeholder text appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Pick paragraphs, sentences or words, choose a count and hit Generate - perfect for
                mockups, wireframes and font previews.
              </p>
            </div>
          ) : (
            <div>
              <textarea
                value={output} readOnly
                className="h-[320px] w-full resize-y rounded-xl border border-border bg-muted/40 p-4 text-sm leading-relaxed outline-none"
              />
              <button
                type="button" onClick={copy}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-bold hover:border-primary/50"
              >
                <Copy className="h-4 w-4" /> Copy output
              </button>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
