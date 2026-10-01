// /tools/jwt-builder - Build and sign HS256/HS384/HS512 JSON Web Tokens
// with WebCrypto HMAC, then decode and verify them back.
// For testing only: never paste production secrets. 100% client-side.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Check, Copy, Eye, EyeOff, Info } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/jwt-builder")({
  head: () => {
    const seo = getToolSeoMeta("jwt-builder");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: JwtBuilderTool,
});

const ALGOS = [
  { id: "HS256", hash: "SHA-256" },
  { id: "HS384", hash: "SHA-384" },
  { id: "HS512", hash: "SHA-512" },
] as const;

type AlgoId = (typeof ALGOS)[number]["id"];

const DEFAULT_HEADER = `{
  "alg": "HS256",
  "typ": "JWT"
}`;

const nowSec = () => Math.floor(Date.now() / 1000);
const DEFAULT_PAYLOAD = () =>
  JSON.stringify({ sub: "1234567890", name: "Jane Doe", iat: nowSec(), exp: nowSec() + 3600 }, null, 2);

const enc = new TextEncoder();

function base64urlEncode(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i] ?? 0);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

async function hmacSign(data: string, secret: string, hash: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: { name: hash } }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return base64urlEncode(new Uint8Array(sig));
}

const selectCls =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm font-bold focus:border-primary focus:outline-none";
const labelCls = "mb-1.5 block text-[13px] font-medium text-foreground/80";
const areaCls =
  "w-full resize-y rounded-xl border border-border bg-background p-4 font-mono text-[13px] leading-relaxed outline-none focus:border-primary";

function JwtBuilderTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("jwt-builder", isPro);
  const seo = getToolSeo("jwt-builder");

  const [headerText, setHeaderText] = useState(DEFAULT_HEADER);
  const [payloadText, setPayloadText] = useState(DEFAULT_PAYLOAD);
  const [algo, setAlgo] = useState<AlgoId>("HS256");
  const [secret, setSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [decoded, setDecoded] = useState<{ header: string; payload: string; verified: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const setTimestamp = (field: "iat" | "exp") => {
    try {
      const obj = JSON.parse(payloadText);
      obj[field] = field === "iat" ? nowSec() : nowSec() + 3600;
      setPayloadText(JSON.stringify(obj, null, 2));
      setError(null);
    } catch {
      setError("Payload is not valid JSON, so the timestamp helper could not run.");
    }
  };

  const sign = async () => {
    if (!trial.canUse || busy) return;
    setError(null);
    setToken(null);
    setDecoded(null);
    if (!secret) {
      setError("Enter a secret to sign with.");
      return;
    }
    setBusy(true);
    try {
      const header = JSON.parse(headerText) as Record<string, unknown>;
      const payload = JSON.parse(payloadText);
      const algoEntry = ALGOS.find((a) => a.id === algo)!;
      // Keep the header alg in sync with the selected algorithm.
      header["alg"] = algo;
      const h = base64urlEncode(enc.encode(JSON.stringify(header)));
      const p = base64urlEncode(enc.encode(JSON.stringify(payload)));
      const sig = await hmacSign(`${h}.${p}`, secret, algoEntry.hash);
      const jwt = `${h}.${p}.${sig}`;
      setToken(jwt);
      // Decode back + verify by re-signing.
      const check = await hmacSign(`${h}.${p}`, secret, algoEntry.hash);
      setDecoded({
        header: JSON.stringify(header, null, 2),
        payload: JSON.stringify(payload, null, 2),
        verified: check === sig,
      });
      trial.recordUse();
      toast.success("Token signed");
    } catch (e) {
      setError(e instanceof Error ? e.message.split("\n")[0] ?? e.message : "Could not sign the token. Check that header and payload are valid JSON.");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  return (
    <ToolPageShell toolId="jwt-builder" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="JWT Builder" left={trial.left} />

      <div className="space-y-5">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-5 rounded-2xl border border-border bg-card p-6">
            <div>
              <p className={labelCls}>Header (JSON)</p>
              <textarea value={headerText} onChange={(e) => setHeaderText(e.target.value)} spellCheck={false} rows={6} className={areaCls} />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-[13px] font-medium text-foreground/80">Payload (JSON)</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTimestamp("iat")}
                    className="rounded-lg border border-border px-2.5 py-1 text-xs font-bold hover:border-primary/50"
                  >
                    iat = now
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimestamp("exp")}
                    className="rounded-lg border border-border px-2.5 py-1 text-xs font-bold hover:border-primary/50"
                  >
                    exp = +1h
                  </button>
                </div>
              </div>
              <textarea value={payloadText} onChange={(e) => setPayloadText(e.target.value)} spellCheck={false} rows={9} className={areaCls} />
            </div>
          </div>

          <div className="space-y-5 rounded-2xl border border-border bg-card p-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls} htmlFor="algo-select">Algorithm</label>
                <select id="algo-select" value={algo} onChange={(e) => setAlgo(e.target.value as AlgoId)} className={selectCls}>
                  {ALGOS.map((a) => (
                    <option key={a.id} value={a.id}>{a.id}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls} htmlFor="secret-input">Secret</label>
                <div className="relative">
                  <input
                    id="secret-input"
                    type={showSecret ? "text" : "password"}
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    placeholder="your-256-bit-secret"
                    autoComplete="off"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-10 font-mono text-sm focus:border-primary focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret((v) => !v)}
                    aria-label={showSecret ? "Hide secret" : "Show secret"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                  >
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
            <ActionButton busy={busy} disabled={!trial.canUse} onClick={sign}>
              {busy ? "Signing…" : "Sign token"}
            </ActionButton>
            {!isPro && (
              <p className="text-xs text-muted-foreground">
                {trial.left} of {TOOL_TRIAL_LIMIT} free signs left.
              </p>
            )}
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="text-xs text-muted-foreground">
                Built for testing only. Never paste production secrets: everything runs locally in your browser,
                but treat anything you paste here as potentially visible.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-500/40 bg-red-500/10 p-5">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <div>
              <p className="font-bold text-red-600 dark:text-red-400">Signing failed</p>
              <p className="mt-1 font-mono text-sm text-red-600/90 dark:text-red-400/90">{error}</p>
            </div>
          </div>
        )}

        {token && decoded && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-3 flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  <Check className="h-4 w-4" /> Token signed
                </p>
                <button
                  type="button"
                  onClick={copy}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy token"}
                </button>
              </div>
              <p className="break-all rounded-xl bg-muted/60 p-4 font-mono text-[13px] leading-relaxed">{token}</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-6">
                <p className="mb-3 text-sm font-bold">Decoded header</p>
                <pre className="overflow-auto rounded-xl bg-muted/60 p-4 font-mono text-[13px] leading-relaxed">{decoded.header}</pre>
              </div>
              <div className="rounded-2xl border border-border bg-card p-6">
                <p className="mb-3 text-sm font-bold">Decoded payload</p>
                <pre className="overflow-auto rounded-xl bg-muted/60 p-4 font-mono text-[13px] leading-relaxed">{decoded.payload}</pre>
              </div>
            </div>

            <div
              className={
                decoded.verified
                  ? "rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5"
                  : "rounded-2xl border border-red-500/40 bg-red-500/10 p-5"
              }
            >
              <p className={decoded.verified ? "font-bold text-emerald-600 dark:text-emerald-400" : "font-bold text-red-600 dark:text-red-400"}>
                {decoded.verified
                  ? "Signature verified: re-signing the decoded header and payload with your secret reproduces this token."
                  : "Signature mismatch: something changed between signing and decoding."}
              </p>
            </div>
          </div>
        )}
      </div>
    </ToolPageShell>
  );
}
