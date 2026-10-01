// /tools/rot13-cipher - ROT13 encoder/decoder plus a Caesar cipher variant
// with an adjustable shift. Transforms live in your browser; copying the
// result counts as the trial use.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeftRight, Check, Copy, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/rot13-cipher")({
  head: () => {
    const seo = getToolSeoMeta("rot13-cipher");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: Rot13Tool,
});

/** Caesar-shift every ASCII letter by `shift` positions (encode direction). */
function caesar(text: string, shift: number, encode: boolean): string {
  const s = encode ? shift : 26 - shift;
  return text.replace(/[a-zA-Z]/g, (ch) => {
    const base = ch <= "Z" ? 65 : 97;
    return String.fromCharCode(((ch.charCodeAt(0) - base + s) % 26) + base);
  });
}

async function copyText(s: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(s);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = s;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      return true;
    } catch {
      return false;
    }
  }
}

function Rot13Tool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("rot13-cipher", isPro);
  const seo = getToolSeo("rot13-cipher");

  const [text, setText] = useState("");
  const [shift, setShift] = useState(13);
  const [encode, setEncode] = useState(true);
  const [copied, setCopied] = useState(false);

  const output = useMemo(() => caesar(text, shift, encode), [text, shift, encode]);
  const isRot13 = shift === 13;

  const doCopy = async () => {
    if (!output || !trial.canUse) return;
    const ok = await copyText(output);
    if (ok) {
      setCopied(true);
      trial.recordUse();
      toast.success("Cipher text copied");
      setTimeout(() => setCopied(false), 1500);
    } else {
      toast.error("Copy failed. Select the text manually.");
    }
  };

  const swap = () => {
    if (!output) return;
    setText(output);
  };

  return (
    <ToolPageShell toolId="rot13-cipher" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="ROT13 Cipher" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Shift</p>
              <span className="rounded-lg bg-muted px-2.5 py-1 font-mono text-sm font-bold">
                {shift}{isRot13 && <span className="ml-1 text-xs font-semibold text-primary">ROT13</span>}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={25}
              value={shift}
              onChange={(e) => setShift(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>1</span>
              <button
                type="button"
                onClick={() => setShift(13)}
                className="font-semibold text-primary hover:underline"
              >
                Reset to ROT13
              </button>
              <span>25</span>
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Direction</p>
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
              {([true, false] as const).map((dir) => (
                <button
                  key={String(dir)}
                  type="button"
                  onClick={() => setEncode(dir)}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-bold transition",
                    encode === dir ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {dir ? "Encode" : "Decode"}
                </button>
              ))}
            </div>
            {isRot13 && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                With shift 13, encode and decode are the same operation.
              </p>
            )}
          </div>

          <div className="rounded-xl bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
            ROT13 replaces each letter with the one 13 places away, so applying it twice returns the
            original text. It hides spoilers and puzzle answers, but it is not encryption - never use
            it for secrets.
          </div>

          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left - the cipher itself runs unlimited in your browser.
            </p>
          )}
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-bold">Input text</label>
              <button
                type="button"
                onClick={swap}
                disabled={!output}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline disabled:opacity-40"
              >
                <ArrowLeftRight className="h-3.5 w-3.5" /> Use output as input
              </button>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              placeholder="Type or paste text to cipher…"
              className="w-full rounded-xl border border-border bg-background p-3 font-mono text-[13px] outline-none focus:border-primary"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-bold">
                Output {isRot13 ? "(ROT13)" : `(Caesar shift ${shift})`}
              </label>
              <button
                type="button"
                onClick={() => void doCopy()}
                disabled={!output || !trial.canUse}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50",
                )}
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy result"}
              </button>
            </div>
            <textarea
              readOnly
              value={output}
              rows={6}
              placeholder="Ciphered text appears here…"
              className="w-full rounded-xl border border-border bg-muted/50 p-3 font-mono text-[13px] outline-none"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <RefreshCcw className="h-3.5 w-3.5 shrink-0" />
            Letters shift, everything else (numbers, punctuation, emoji) passes through unchanged.
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
