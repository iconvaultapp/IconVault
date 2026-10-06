// /tools/base64 - Encode/decode Base64 text and convert files to data URLs.
// 100% client-side; trial use is recorded on successful encode/decode/convert.

import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Binary, Check, Copy, FileUp } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/base64";
import toolSeoMeta from "@/lib/tool-seo-meta-data/base64";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/base64")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/base64";
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
  component: Base64Tool,
});

type Tab = "text" | "file";

/** Unicode-safe base64 encode. */
function encodeText(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

/** Unicode-safe base64 decode. */
function decodeText(b64: string): string {
  const bin = atob(b64.trim().replace(/\s+/g, ""));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function readAsDataUrl(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error(`Could not read ${f.name}`));
    r.readAsDataURL(f);
  });
}

type Alphabet = "standard" | "urlsafe";
type Mode = "encode" | "decode";

/** Convert standard base64 to URL-safe (uses - and _, drops = padding). */
function toUrlSafe(b64: string): string {
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Convert URL-safe base64 back to standard, restoring padding. */
function fromUrlSafe(s: string): string {
  let b = s.trim().replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  b += "=".repeat((4 - (b.length % 4)) % 4);
  return b;
}

const B64_SHAPE = /^[A-Za-z0-9+/=_-]+\s*$/;

/** Heuristic: does the pasted text already look like base64? */
function looksLikeBase64(s: string): boolean {
  if (s.trim().length < 4 || !B64_SHAPE.test(s)) return false;
  try {
    decodeText(fromUrlSafe(s));
    return true;
  } catch {
    return false;
  }
}

function Base64Tool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("base64", isPro);
  const seo = toolSeo;

  const [tab, setTab] = useState<Tab>("text");
  const [text, setText] = useState("");
  const [mode, setMode] = useState<Mode>("encode");
  const [alphabet, setAlphabet] = useState<Alphabet>("standard");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const run = (m: Mode) => {
    if (!trial.canUse) return;
    setError(null);
    try {
      const out =
        m === "encode"
          ? alphabet === "urlsafe"
            ? toUrlSafe(encodeText(text))
            : encodeText(text)
          : decodeText(alphabet === "urlsafe" ? fromUrlSafe(text) : text);
      setResult(out);
      trial.recordUse();
    } catch {
      setResult(null);
      setError(m === "decode" ? "Invalid Base64 - check the input string." : "Encoding failed.");
      toast.error(m === "decode" ? "Invalid Base64 input." : "Encoding failed.");
    }
  };

  const handleFile = async (f: File | undefined) => {
    if (!f || !trial.canUse) return;
    setError(null);
    try {
      setResult(await readAsDataUrl(f));
      trial.recordUse();
    } catch (e) {
      setError(e instanceof Error ? e.message : "File conversion failed.");
      toast.error("File conversion failed.");
    }
  };

  const copy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  return (
    <ToolPageShell toolId="base64" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Base64 Encoder" left={trial.left} />

      <div className="space-y-5 rounded-2xl border border-border bg-card p-6">
        <div className="inline-flex rounded-xl bg-muted/60 p-1">
          {(["text", "file"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setTab(t); setResult(null); setError(null); }}
              className={cn(
                "rounded-lg px-5 py-2 text-sm font-bold capitalize transition",
                tab === t ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "text" ? (
          <>
            <textarea
              value={text}
              onChange={(e) => {
                const v = e.target.value;
                setText(v);
                // Auto-detect direction on paste/type: looks like base64 → decode, else encode.
                if (v.trim().length > 0) setMode(looksLikeBase64(v) ? "decode" : "encode");
              }}
              placeholder="Paste text to encode, or Base64 to decode…"
              spellCheck={false}
              rows={7}
              className="w-full resize-y rounded-xl border border-border bg-background p-4 font-mono text-[13px] leading-relaxed outline-none focus:border-primary"
            />
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex rounded-xl bg-muted/60 p-1" role="group" aria-label="Direction">
                {(["encode", "decode"] as Mode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={cn(
                      "rounded-lg px-5 py-2 text-sm font-bold capitalize transition",
                      mode === m ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <div className="inline-flex rounded-xl bg-muted/60 p-1" role="group" aria-label="Alphabet">
                {(["standard", "urlsafe"] as Alphabet[]).map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAlphabet(a)}
                    className={cn(
                      "rounded-lg px-5 py-2 text-sm font-bold transition",
                      alphabet === a ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {a === "standard" ? "Standard" : "URL-safe"}
                  </button>
                ))}
              </div>
              <ActionButton busy={false} disabled={!trial.canUse || !text} onClick={() => run(mode)}>
                <Binary className="h-4 w-4" />{" "}
                {mode === "encode" ? (alphabet === "urlsafe" ? "Encode (URL-safe)" : "Encode") : "Decode"}
              </ActionButton>
            </div>
          </>
        ) : (
          <div
            onClick={() => fileRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border px-4 py-12 text-center transition hover:border-primary/40"
          >
            <FileUp className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold">Click to choose a file</p>
            <p className="mt-1 text-xs text-muted-foreground">Converted to a Base64 data URL in your browser - never uploaded</p>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ""; }}
            />
          </div>
        )}

        {!isPro && (
          <p className="text-xs text-muted-foreground">
            {trial.left} of {TOOL_TRIAL_LIMIT} free conversions left.
          </p>
        )}

        {error && <p className="text-sm font-medium text-red-500">{error}</p>}

        {result !== null && !error && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-bold">Result</p>
              <button
                type="button"
                onClick={copy}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <textarea
              readOnly
              value={result}
              rows={7}
              spellCheck={false}
              className="w-full rounded-xl border border-border bg-muted/40 p-4 font-mono text-[13px] leading-relaxed outline-none"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Output length: <span className="font-bold tabular-nums">{result.length.toLocaleString()}</span> characters.
            </p>
          </div>
        )}
      </div>
    </ToolPageShell>
  );
}
