// /tools/hmac-generator - HMAC message authentication codes via WebCrypto,
// with a compare mode to check a received tag against a computed one.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Key, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/hmac-generator")({
  head: () => {
    const seo = getToolSeoMeta("hmac-generator");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: HmacTool,
});

const ALGOS = [
  { id: "SHA-256", label: "HMAC-SHA-256" },
  { id: "SHA-384", label: "HMAC-SHA-384" },
  { id: "SHA-512", label: "HMAC-SHA-512" },
  { id: "SHA-1", label: "HMAC-SHA-1" },
] as const;

const enc = new TextEncoder();

function u8ToB64(u8: Uint8Array): string {
  let s = "";
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return btoa(s);
}

function u8ToHex(u8: Uint8Array): string {
  return Array.from(u8).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function computeHmac(algo: string, message: string, keyText: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", enc.encode(keyText), { name: "HMAC", hash: algo }, false, ["sign"]);
  const sig = await crypto.subtle.sign({ name: "HMAC", hash: algo }, key, enc.encode(message));
  return new Uint8Array(sig);
}

function HmacTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("hmac-generator", isPro);
  const seo = getToolSeo("hmac-generator");

  const [message, setMessage] = useState("");
  const [secret, setSecret] = useState("");
  const [algo, setAlgo] = useState<string>("SHA-256");
  const [format, setFormat] = useState<"hex" | "base64">("hex");
  const [expected, setExpected] = useState("");
  const [output, setOutput] = useState("");
  const [match, setMatch] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    if (!trial.canUse || busy) return;
    if (!message) { setError("Enter a message first."); return; }
    if (!secret) { setError("Enter the secret key first."); return; }
    setBusy(true);
    setError(null);
    setMatch(null);
    try {
      const mac = await computeHmac(algo, message, secret);
      const tag = format === "hex" ? u8ToHex(mac) : u8ToB64(mac);
      setOutput(tag);
      if (expected.trim()) {
        setMatch(expected.trim().toLowerCase() === tag.toLowerCase());
      }
      trial.recordUse();
      toast.success("HMAC computed");
    } catch (e) {
      setError(e instanceof Error ? e.message : "HMAC computation failed.");
      setOutput("");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      toast.success("HMAC copied");
    } catch {
      toast.error("Clipboard blocked by the browser");
    }
  };

  return (
    <ToolPageShell toolId="hmac-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="HMAC Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              spellCheck={false}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary/60"
              placeholder="The data to authenticate…"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Secret key</label>
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 font-mono text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary/60"
              placeholder="Shared secret…"
              autoComplete="off"
            />
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Algorithm</p>
            <div className="grid grid-cols-2 gap-2">
              {ALGOS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAlgo(a.id)}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-sm font-bold transition",
                    algo === a.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 rounded-xl bg-muted p-1">
            {(["hex", "base64"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFormat(f)}
                className={cn(
                  "flex-1 rounded-lg px-4 py-2 text-sm font-bold transition",
                  format === f ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f === "hex" ? "Hex" : "Base64"}
              </button>
            ))}
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">
              Expected tag <span className="text-muted-foreground/70">(optional, for compare mode)</span>
            </label>
            <input
              value={expected}
              onChange={(e) => setExpected(e.target.value)}
              spellCheck={false}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 font-mono text-xs outline-none placeholder:text-muted-foreground/60 focus:border-primary/60"
              placeholder="Paste a tag to compare against…"
            />
          </div>

          <ActionButton busy={busy} disabled={!message || !secret || !trial.canUse} onClick={() => void generate()}>
            <Key className="h-4 w-4" /> {busy ? "Computing…" : "Generate HMAC"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free runs left - everything stays in your browser.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold">HMAC tag</h3>
            {output && (
              <button type="button" onClick={() => void copy()} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50">
                <Copy className="h-3.5 w-3.5" /> Copy
              </button>
            )}
          </div>
          {!output ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
              <Key className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your HMAC appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Common uses: webhook signature verification, signed API requests, and API token integrity checks.
              </p>
            </div>
          ) : (
            <>
              <textarea
                value={output}
                readOnly
                rows={5}
                spellCheck={false}
                className="w-full rounded-xl border border-border bg-muted/40 px-3.5 py-3 font-mono text-xs break-all outline-none"
              />
              {match !== null && (
                <div className={cn(
                  "mt-4 flex items-center gap-2.5 rounded-xl border p-4",
                  match ? "border-green-500/40 bg-green-50 dark:bg-green-950/20" : "border-red-500/40 bg-red-50 dark:bg-red-950/20",
                )}>
                  {match ? <Check className="h-5 w-5 text-green-600" /> : <X className="h-5 w-5 text-red-500" />}
                  <p className={cn("text-sm font-bold", match ? "text-green-700 dark:text-green-300" : "text-red-600 dark:text-red-300")}>
                    {match ? "Tags match - the message and key produce exactly this tag." : "Tags differ - message, key, algorithm or format does not match."}
                  </p>
                </div>
              )}
            </>
          )}
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            SHA-1 output is included for legacy API compatibility, but prefer SHA-256 or SHA-512 for new integrations.
            The comparison ignores letter case and trims whitespace. The secret never leaves your browser.
          </p>
        </div>
      </div>
    </ToolPageShell>
  );
}
