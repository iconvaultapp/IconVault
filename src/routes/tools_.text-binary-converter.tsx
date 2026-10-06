// /tools/text-binary-converter - UTF-8 aware text <-> binary converter with delimiter options.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeftRight, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/text-binary-converter";
import toolSeoMeta from "@/lib/tool-seo-meta-data/text-binary-converter";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/text-binary-converter")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/text-binary-converter";
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
  component: BinaryTool,
});

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function textToBinary(text: string, delimiter: string): string {
  return [...encoder.encode(text)].map((b) => b.toString(2).padStart(8, "0")).join(delimiter);
}

function binaryToText(binary: string): { ok: boolean; text: string; error?: string } {
  const cleaned = binary.replace(/[\s]/g, "");
  if (cleaned.length === 0) return { ok: true, text: "" };
  if (/[^01]/.test(cleaned)) return { ok: false, text: "", error: "Binary input may only contain 0, 1 and whitespace." };
  if (cleaned.length % 8 !== 0)
    return { ok: false, text: "", error: `Length ${cleaned.length} is not a multiple of 8. Each byte needs 8 bits.` };
  const bytes = new Uint8Array(cleaned.length / 8);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(cleaned.slice(i * 8, i * 8 + 8), 2);
  try {
    return { ok: true, text: decoder.decode(bytes) };
  } catch {
    return { ok: false, text: "", error: "Those bytes are not valid UTF-8." };
  }
}

function BinaryTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("text-binary-converter", isPro);
  const seo = toolSeo;

  const [mode, setMode] = useState<"toBinary" | "toText">("toBinary");
  const [input, setInput] = useState("Hello");
  const [delimiter, setDelimiter] = useState<"space" | "none">("space");

  const result = useMemo(() => {
    if (mode === "toBinary") return { ok: true as const, text: textToBinary(input, delimiter === "space" ? " " : "") };
    return binaryToText(input);
  }, [input, mode, delimiter]);

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
    <ToolPageShell toolId="text-binary-converter" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Text to Binary" left={trial.left} />

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-border p-1">
            {(
              [
                ["toBinary", "Text to binary"],
                ["toText", "Binary to text"],
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
            onClick={() => { setMode(mode === "toBinary" ? "toText" : "toBinary"); if (result.ok) setInput(result.text); }}
            className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium hover:border-primary/50"
          >
            <ArrowLeftRight className="h-4 w-4" /> Swap
          </button>
          {mode === "toBinary" && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Delimiter:</span>
              <div className="flex rounded-xl border border-border p-1">
                {(
                  [
                    ["space", "Space"],
                    ["none", "None"],
                  ] as const
                ).map(([d, label]) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDelimiter(d)}
                    className={cn(
                      "rounded-lg px-3 py-1 text-[13px] font-semibold transition",
                      delimiter === d ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-[13px] font-medium text-foreground/80">
              {mode === "toBinary" ? "Text" : "Binary (8-bit groups)"}
            </label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={8}
              spellCheck={false}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary/60"
            />
            {mode === "toBinary" && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                {input.length} chars = {encoder.encode(input).length} UTF-8 bytes = {encoder.encode(input).length * 8} bits
              </p>
            )}
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-[13px] font-medium text-foreground/80">Result</label>
              <button
                type="button"
                onClick={copy}
                disabled={!trial.canUse || !result.ok || !result.text}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-semibold hover:border-primary/50 disabled:opacity-40"
              >
                <Copy className="h-4 w-4" /> Copy
              </button>
            </div>
            <textarea
              value={result.ok ? result.text : ""}
              readOnly
              rows={8}
              placeholder={result.ok ? "" : result.error}
              className={cn(
                "w-full rounded-xl border bg-muted/40 px-3 py-2.5 font-mono text-sm outline-none",
                result.ok ? "border-border" : "border-red-500/60 placeholder:text-red-500",
              )}
            />
            {!result.ok && <p className="mt-1.5 text-xs font-medium text-red-500">{result.error}</p>}
          </div>
        </div>
        {!isPro && (
          <p className="mt-4 text-xs text-muted-foreground">
            {trial.left} of {TOOL_TRIAL_LIMIT} free copies left - conversion is UTF-8 aware, so emoji work too.
          </p>
        )}
      </div>
    </ToolPageShell>
  );
}
