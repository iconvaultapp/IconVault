// /tools/base32-converter - Encode and decode Base32 (RFC 4648) with a
// hand-written implementation, no dependencies. Padding toggle included.
// 100% client-side.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Binary } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/base32-converter")({
  head: () => {
    const seo = getToolSeoMeta("base32-converter");
    const canonical = "https://iconvault.site/tools/base32-converter";
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
  component: Base32Tool,
});

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** RFC 4648 Base32 encode, written by hand. */
function base32Encode(bytes: Uint8Array, pad: boolean): string {
  let out = "";
  let bits = 0;
  let value = 0;
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  if (pad) while (out.length % 8 !== 0) out += "=";
  return out;
}

/** RFC 4648 Base32 decode, written by hand. Accepts padded or unpadded input. */
function base32Decode(s: string): Uint8Array {
  const clean = s.trim().replace(/\s+/g, "").replace(/=+$/, "").toUpperCase();
  if (clean.length === 0) return new Uint8Array(0);
  if (!/^[A-Z2-7]+$/.test(clean)) {
    throw new Error("Invalid Base32: only A-Z and 2-7 are allowed.");
  }
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;
  for (const ch of clean) {
    value = (value << 5) | ALPHABET.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(bytes);
}

type Mode = "encode" | "decode";

function Base32Tool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("base32-converter", isPro);
  const seo = getToolSeo("base32-converter");

  const [mode, setMode] = useState<Mode>("encode");
  const [input, setInput] = useState("");
  const [pad, setPad] = useState(true);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = () => {
    if (!trial.canUse || busy || !input) return;
    setBusy(true);
    setError(null);
    try {
      const out =
        mode === "encode"
          ? base32Encode(new TextEncoder().encode(input), pad)
          : new TextDecoder().decode(base32Decode(input));
      setResult(out);
      trial.recordUse();
      toast.success(mode === "encode" ? "Base32 encoded" : "Base32 decoded");
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : "Conversion failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolPageShell toolId="base32-converter" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Base32 Converter" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
            {(["encode", "decode"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setResult(null); setError(null); }}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-bold capitalize transition",
                  mode === m ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m}
              </button>
            ))}
          </div>

          {mode === "encode" && (
            <label className="flex cursor-pointer items-center justify-between rounded-xl border border-border px-4 py-3">
              <span className="text-sm font-medium">
                Include <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">=</code> padding
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={pad}
                onClick={() => setPad((v) => !v)}
                className={cn(
                  "relative h-6 w-11 shrink-0 rounded-full transition",
                  pad ? "bg-primary" : "bg-muted",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                    pad ? "left-[22px]" : "left-0.5",
                  )}
                />
              </button>
            </label>
          )}

          <ActionButton busy={busy} disabled={!trial.canUse || !input} onClick={run}>
            <Binary className="h-4 w-4" /> {busy ? "Working…" : mode === "encode" ? "Encode" : "Decode"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free conversions left - data never leaves your browser.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}

          <div className="rounded-xl bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
            Base32 uses only uppercase letters and digits 2-7, so it survives case changes and is easy
            to read aloud. It is the standard encoding for TOTP secrets and some file checksums.
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div>
            <label className="mb-2 block text-sm font-bold">
              {mode === "encode" ? "Text to encode" : "Base32 to decode"}
            </label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={6}
              placeholder={mode === "encode" ? "Type or paste text…" : "Paste Base32, e.g. JBSWY3DP…"}
              className="w-full rounded-xl border border-border bg-background p-3 font-mono text-[13px] outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold">Result</label>
            <textarea
              readOnly
              value={result ?? ""}
              rows={6}
              placeholder="Result appears here…"
              className="w-full rounded-xl border border-border bg-muted/50 p-3 font-mono text-[13px] outline-none"
            />
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
