// /tools/jwt-decoder - decode JWT header + payload 100% client-side.
// Optional HMAC signature verification (HS256/384/512) with a user-supplied
// secret; secrets never leave the browser.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, KeyRound, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/jwt-decoder";
import toolSeoMeta from "@/lib/tool-seo-meta-data/jwt-decoder";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/jwt-decoder")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/jwt-decoder";
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
  component: JwtDecoderTool,
});

function b64UrlDecode(segment: string): string {
  let b64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4;
  if (pad) b64 += "=".repeat(4 - pad);
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function expiryLabel(expSec: number): { text: string; ok: boolean } {
  const diff = expSec * 1000 - Date.now();
  const abs = Math.abs(diff);
  const units: [string, number][] = [
    ["day", 86400000],
    ["hour", 3600000],
    ["minute", 60000],
    ["second", 1000],
  ];
  for (const [name, ms] of units) {
    if (abs >= ms) {
      const n = Math.floor(abs / ms);
      const part = `${n} ${name}${n === 1 ? "" : "s"}`;
      return diff > 0 ? { text: `Expires in ${part}`, ok: true } : { text: `Expired ${part} ago`, ok: false };
    }
  }
  return diff > 0 ? { text: "Expires in less than a second", ok: true } : { text: "Just expired", ok: false };
}

interface Decoded {
  header: string;
  payload: string;
  payloadObj: Record<string, unknown>;
  signature: string;
  unsigned: string;
  alg: string;
  expSec: number | null;
  expiry: { text: string; ok: boolean } | null;
  issuedAt: string | null;
}

interface SecurityIssue {
  level: "red" | "amber" | "green";
  title: string;
  detail: string;
}

/** Heuristic security checks over the decoded header + payload. */
function securityIssues(alg: string, payloadObj: Record<string, unknown>, expSec: number | null): SecurityIssue[] {
  const issues: SecurityIssue[] = [];
  if (alg === "none") {
    issues.push({
      level: "red",
      title: "Unsigned token",
      detail: 'header.alg is "none" - anyone can forge this token, treat it as untrusted.',
    });
  }
  if (expSec === null) {
    issues.push({
      level: "amber",
      title: "No expiry",
      detail: "no exp claim - this token never expires.",
    });
  } else if (expSec * 1000 < Date.now()) {
    issues.push({
      level: "red",
      title: "Token expired",
      detail: "exp is in the past - this token is no longer valid.",
    });
  }
  const hasSensitiveKey = Object.keys(payloadObj).some((k) => {
    const kl = k.toLowerCase();
    return kl.includes("password") || kl.includes("secret");
  });
  if (hasSensitiveKey) {
    issues.push({
      level: "amber",
      title: "Sensitive data in payload",
      detail: "a payload key looks like a password or secret - JWT payloads are only base64, not encrypted.",
    });
  }
  if (issues.length === 0) {
    issues.push({
      level: "green",
      title: "No issues found",
      detail: "token is signed, has an expiry, and carries no sensitive-looking keys.",
    });
  }
  return issues;
}

type VerifyState = "idle" | "checking" | "valid" | "invalid" | "unsupported";

function b64UrlEncode(bytes: Uint8Array): string {
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Verify an HS256/384/512 signature with the WebCrypto API. */
async function verifyHmac(unsigned: string, signatureB64Url: string, secret: string, alg: string): Promise<boolean | null> {
  const bits = { HS256: "SHA-256", HS384: "SHA-384", HS512: "SHA-512" }[alg];
  if (!bits) return null; // unsupported algorithm
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: bits },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(unsigned));
  const expected = b64UrlEncode(new Uint8Array(sig));
  if (expected.length !== signatureB64Url.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signatureB64Url.charCodeAt(i);
  return diff === 0;
}

function fmtDate(sec: number): string {
  try {
    return new Date(sec * 1000).toLocaleString();
  } catch {
    return "-";
  }
}

const SAMPLE =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjQ3ODUyMzkwMjJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

function copy(text: string, label: string) {
  navigator.clipboard
    .writeText(text)
    .then(() => toast.success(`${label} copied`))
    .catch(() => toast.error("Copy failed"));
}

function JwtDecoderTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("jwt-decoder", isPro);
  const seo = toolSeo;

  const [token, setToken] = useState("");
  const [decoded, setDecoded] = useState<Decoded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [secret, setSecret] = useState("");
  const [verifyState, setVerifyState] = useState<VerifyState>("idle");

  const decode = () => {
    if (!trial.canUse) return;
    const t = token.trim();
    if (!t) {
      setError("Paste a JWT token first.");
      setDecoded(null);
      return;
    }
    try {
      const parts = t.split(".");
      if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2])
        throw new Error("A JWT has exactly 3 dot-separated parts (header.payload.signature).");
      const [hPart, pPart, sPart] = parts as [string, string, string];
      const headerObj = JSON.parse(b64UrlDecode(hPart)) as Record<string, unknown>;
      const payloadObj = JSON.parse(b64UrlDecode(pPart)) as Record<string, unknown>;
      const exp = typeof payloadObj["exp"] === "number" ? (payloadObj["exp"] as number) : null;
      const iat = typeof payloadObj["iat"] === "number" ? (payloadObj["iat"] as number) : null;
      setDecoded({
        header: JSON.stringify(headerObj, null, 2),
        payload: JSON.stringify(payloadObj, null, 2),
        payloadObj,
        signature: sPart,
        unsigned: `${hPart}.${pPart}`,
        alg: typeof headerObj["alg"] === "string" ? (headerObj["alg"] as string) : "-",
        expSec: exp,
        expiry: exp === null ? null : expiryLabel(exp),
        issuedAt: iat === null ? null : fmtDate(iat),
      });
      setVerifyState("idle");
      setError(null);
      trial.recordUse();
    } catch (e) {
      setDecoded(null);
      setError(e instanceof Error ? e.message : "Could not decode this token.");
    }
  };

  const verify = async () => {
    if (!decoded || verifyState === "checking") return;
    if (!secret) {
      toast.error("Enter the HMAC secret first.");
      return;
    }
    setVerifyState("checking");
    try {
      const ok = await verifyHmac(decoded.unsigned, decoded.signature, secret, decoded.alg);
      setVerifyState(ok === null ? "unsupported" : ok ? "valid" : "invalid");
    } catch {
      setVerifyState("invalid");
    }
  };

  const issues = decoded ? securityIssues(decoded.alg, decoded.payloadObj, decoded.expSec) : [];

  return (
    <ToolPageShell toolId="jwt-decoder" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="JWT Decoder" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-foreground/80">JWT token</span>
            <textarea
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste your token here - e.g. eyJhbGciOi…"
              rows={7}
              spellCheck={false}
              className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-xs break-all outline-none focus:border-primary"
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <ActionButton disabled={!token.trim() || !trial.canUse} onClick={decode}>
              <KeyRound className="h-4 w-4" /> Decode token
            </ActionButton>
            <button
              type="button"
              onClick={() => setToken(SAMPLE)}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:border-primary/50 hover:text-foreground"
            >
              Try sample
            </button>
          </div>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free decodes left - tokens never leave your browser.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="space-y-4">
          {!decoded ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-border bg-card p-5 text-center">
              <KeyRound className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Decoded header & payload appear here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Header, payload and expiry as readable JSON - plus optional HMAC signature verification with your secret.
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-bold">Header</h3>
                  <button
                    type="button" onClick={() => copy(decoded.header, "Header")}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </button>
                </div>
                <pre className="max-h-48 overflow-auto rounded-xl bg-muted/60 p-4 font-mono text-xs leading-relaxed">{decoded.header}</pre>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold">Payload</h3>
                  <div className="flex items-center gap-2">
                    {decoded.issuedAt && (
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground" title="Issued at">
                        Issued {decoded.issuedAt}
                      </span>
                    )}
                    {decoded.expiry && (
                      <span
                        className={
                          decoded.expiry.ok
                            ? "rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400"
                            : "rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-bold text-red-600 dark:text-red-400"
                        }
                      >
                        {decoded.expiry.text}
                      </span>
                    )}
                    <button
                      type="button" onClick={() => copy(decoded.payload, "Payload")}
                      className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
                    >
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </button>
                  </div>
                </div>
                <pre className="max-h-64 overflow-auto rounded-xl bg-muted/60 p-4 font-mono text-xs leading-relaxed">{decoded.payload}</pre>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="mb-2 flex items-center gap-2">
                  <h3 className="text-sm font-bold">Signature</h3>
                  {verifyState === "valid" && (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="h-3 w-3" /> Signature valid
                    </span>
                  )}
                  {verifyState === "invalid" && (
                    <span className="flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-bold text-red-600 dark:text-red-400">
                      <ShieldAlert className="h-3 w-3" /> Signature invalid
                    </span>
                  )}
                  {verifyState === "unsupported" && (
                    <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                      <Check className="h-3 w-3" /> Only HS256/384/512 can be verified
                    </span>
                  )}
                  {(verifyState === "idle" || verifyState === "checking") && (
                    <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                      <Check className="h-3 w-3" /> Not verified
                    </span>
                  )}
                </div>
                <p className="mb-3 rounded-xl bg-muted/60 p-4 font-mono text-xs break-all">{decoded.signature}</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="password"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && verify()}
                    placeholder="HMAC secret (optional)"
                    autoComplete="off"
                    spellCheck={false}
                    className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-xs outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={verify}
                    disabled={verifyState === "checking"}
                    className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-60"
                  >
                    {verifyState === "checking" ? "Verifying…" : "Verify signature"}
                  </button>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Your secret is used only in memory to check the HMAC - it is never stored or sent anywhere.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="mb-3 text-sm font-bold">Security check</h3>
                <div className="space-y-2">
                  {issues.map((iss, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex items-start gap-2.5 rounded-xl px-3.5 py-2.5",
                        iss.level === "red" && "bg-red-500/10 text-red-700 dark:text-red-400",
                        iss.level === "amber" && "bg-amber-500/10 text-amber-700 dark:text-amber-400",
                        iss.level === "green" && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                      )}
                    >
                      {iss.level === "green" ? (
                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                      ) : (
                        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                      )}
                      <div>
                        <p className="text-xs font-bold">{iss.title}</p>
                        <p className="text-xs opacity-80">{iss.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
