// /tools/totp-generator - Time-based one-time passwords (RFC 6238).
// Shows the live 6-digit code with a countdown ring, validates codes,
// and renders an otpauth:// QR with the project's existing qrcode lib.

import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Dices, QrCode, ShieldCheck, Timer } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/totp-generator";
import toolSeoMeta from "@/lib/tool-seo-meta-data/totp-generator";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/totp-generator")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/totp-generator";
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
  component: TotpTool,
});

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const enc = new TextEncoder();

function base32Decode(s: string): Uint8Array {
  const clean = s.trim().replace(/\s/g, "").replace(/=+$/, "").toUpperCase();
  if (!/^[A-Z2-7]*$/.test(clean)) throw new Error("Secret is not valid Base32 (A-Z, 2-7 only).");
  const out: number[] = [];
  let bits = 0;
  let value = 0;
  for (const ch of clean) {
    value = (value << 5) | B32.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  if (out.length === 0) throw new Error("Secret is empty.");
  return new Uint8Array(out);
}

function base32Encode(bytes: Uint8Array): string {
  let out = "";
  let bits = 0;
  let value = 0;
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

async function hotp(key: Uint8Array, counter: bigint, algo: string): Promise<string> {
  const msg = new Uint8Array(8);
  let c = counter;
  for (let i = 7; i >= 0; i--) {
    msg[i] = Number(c & 0xffn);
    c >>= 8n;
  }
  const cryptoKey = await crypto.subtle.importKey("raw", key as BufferSource, { name: "HMAC", hash: algo }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign({ name: "HMAC", hash: algo }, cryptoKey, msg as BufferSource));
  const offset = mac![mac.length - 1]! & 0x0f;
  const code = ((mac![offset]! & 0x7f) << 24) | (mac![offset + 1]! << 16) | (mac![offset + 2]! << 8) | mac![offset + 3]!;
  return (code % 1_000_000).toString().padStart(6, "0");
}

const ALGOS = [
  { id: "SHA-1", label: "SHA-1" },
  { id: "SHA-256", label: "SHA-256" },
  { id: "SHA-512", label: "SHA-512" },
] as const;

const RING_R = 54;
const RING_C = 2 * Math.PI * RING_R;

function TotpTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("totp-generator", isPro);
  const seo = toolSeo;

  const [secret, setSecret] = useState("");
  const [algo, setAlgo] = useState<string>("SHA-1");
  const [label, setLabel] = useState("my-account");
  const [code, setCode] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [validBusy, setValidBusy] = useState(false);
  const [validResult, setValidResult] = useState<boolean | null>(null);
  const [checkCode, setCheckCode] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [qrBusy, setQrBusy] = useState(false);
  const [secretError, setSecretError] = useState<string | null>(null);
  const [mode, setMode] = useState<"generate" | "validate">("generate");

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const { secondsLeft, progress } = useMemo(() => {
    const sec = Math.floor(now / 1000);
    const left = 30 - (sec % 30);
    return { secondsLeft: left, progress: left / 30 };
  }, [now]);

  // Recompute the code once per 30s window.
  useEffect(() => {
    let cancelled = false;
    const window_ = Math.floor(now / 1000 / 30);
    (async () => {
      try {
        const key = base32Decode(secret);
        setSecretError(null);
        const c = await hotp(key, BigInt(window_), algo);
        if (!cancelled) setCode(c);
      } catch (e) {
        if (!cancelled) {
          setCode("");
          setSecretError(secret.trim() ? (e instanceof Error ? e.message : "Invalid secret.") : null);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [secret, algo, Math.floor(now / 30000)]);

  const generateRandom = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(20));
    setSecret(base32Encode(bytes));
    setQrUrl("");
    toast.success("New random secret generated");
  };

  const copyCode = async () => {
    if (!code) return;
    if (!trial.canUse) { toast.error("Free runs used up - go Pro for unlimited."); return; }
    try {
      await navigator.clipboard.writeText(code);
      trial.recordUse();
      toast.success("Code copied");
    } catch {
      toast.error("Clipboard blocked by the browser");
    }
  };

  const showQr = async () => {
    if (!secret || qrBusy) return;
    setQrBusy(true);
    try {
      const { default: QRCode } = await import("qrcode");
      const uri = `otpauth://totp/${encodeURIComponent("IconVault")}:${encodeURIComponent(label.trim() || "account")}?secret=${secret.replace(/\s/g, "").toUpperCase()}&issuer=${encodeURIComponent("IconVault")}&algorithm=${algo.replace("-", "")}&digits=6&period=30`;
      const url = await QRCode.toDataURL(uri, { width: 220, margin: 1 });
      setQrUrl(url);
      if (trial.canUse) trial.recordUse();
    } catch {
      toast.error("Could not render the QR code");
    } finally {
      setQrBusy(false);
    }
  };

  const validate = async () => {
    if (!trial.canUse || validBusy) return;
    const digits = checkCode.replace(/\D/g, "");
    if (digits.length !== 6) { setValidResult(false); return; }
    setValidBusy(true);
    try {
      const key = base32Decode(secret);
      const w = Math.floor(now / 1000 / 30);
      const codes = await Promise.all([w - 1, w, w + 1].map((x) => hotp(key, BigInt(x), algo)));
      setValidResult(codes.includes(digits));
      trial.recordUse();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invalid secret.");
      setValidResult(false);
    } finally {
      setValidBusy(false);
    }
  };

  return (
    <ToolPageShell toolId="totp-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="TOTP Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div className="flex gap-2 rounded-xl bg-muted p-1">
            {(["generate", "validate"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setValidResult(null); }}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition",
                  mode === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m === "generate" ? <Timer className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                {m === "generate" ? "Codes" : "Validate"}
              </button>
            ))}
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="block text-[13px] font-medium text-foreground/80">Secret (Base32)</label>
              <button
                type="button"
                onClick={generateRandom}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-primary hover:bg-primary/10"
              >
                <Dices className="h-3.5 w-3.5" /> Random
              </button>
            </div>
            <input
              value={secret}
              onChange={(e) => { setSecret(e.target.value); setQrUrl(""); }}
              spellCheck={false}
              autoComplete="off"
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 font-mono text-sm uppercase outline-none placeholder:text-muted-foreground/60 focus:border-primary/60"
              placeholder="JBSW Y3DP EHPK 3PXP"
            />
            {secretError && <p className="mt-1.5 text-xs font-medium text-red-500">{secretError}</p>}
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Hash algorithm</p>
            <div className="flex gap-2">
              {ALGOS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAlgo(a.id)}
                  className={cn(
                    "flex-1 rounded-xl border px-3 py-2.5 text-sm font-bold transition",
                    algo === a.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {mode === "validate" ? (
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Code to check</label>
              <input
                value={checkCode}
                onChange={(e) => { setCheckCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setValidResult(null); }}
                inputMode="numeric"
                autoComplete="off"
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-center font-mono text-2xl tracking-[0.4em] outline-none placeholder:text-muted-foreground/60 focus:border-primary/60"
                placeholder="000000"
              />
              <div className="mt-4">
                <ActionButton busy={validBusy} disabled={!secret || !checkCode || !trial.canUse} onClick={() => void validate()}>
                  <ShieldCheck className="h-4 w-4" /> {validBusy ? "Checking…" : "Validate code"}
                </ActionButton>
              </div>
              {validResult !== null && (
                <p className={cn("mt-3 rounded-xl border p-3 text-sm font-bold", validResult ? "border-green-500/40 bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-300" : "border-red-500/40 bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-300")}>
                  {validResult ? "Valid code (matches the current or adjacent 30s window)." : "Invalid code."}
                </p>
              )}
            </div>
          ) : (
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Account label (for the QR)</label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary/60"
                placeholder="my-account"
              />
            </div>
          )}

          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free runs left - everything stays in your browser.
            </p>
          )}
        </div>

        <div className="flex flex-col items-center justify-center gap-6 rounded-2xl border border-border bg-card p-8 text-center">
          {mode === "validate" ? (
            <>
              <Timer className="h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Paste a 6-digit code on the left to check it against the secret</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Validation accepts the current 30-second window plus one window either side, to tolerate clock skew.
              </p>
            </>
          ) : code ? (
            <>
              <div className="relative">
                <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
                  <circle cx="70" cy="70" r={RING_R} fill="none" strokeWidth="8" className="stroke-muted" />
                  <circle
                    cx="70" cy="70" r={RING_R} fill="none" strokeWidth="8"
                    stroke="currentColor" className="text-primary transition-all duration-300"
                    strokeLinecap="round" strokeDasharray={RING_C} strokeDashoffset={RING_C * (1 - progress)}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-extrabold tabular-nums">{secondsLeft}</span>
                  <span className="text-[11px] font-semibold text-muted-foreground">seconds</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void copyCode()}
                disabled={!trial.canUse}
                title="Copy code"
                className="font-mono text-5xl font-extrabold tracking-[0.25em] transition hover:text-primary disabled:opacity-60"
              >
                {code}
              </button>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button type="button" onClick={() => void copyCode()} disabled={!trial.canUse} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-bold hover:border-primary/50 disabled:opacity-60">
                  <Copy className="h-4 w-4" /> Copy code
                </button>
                <button type="button" onClick={() => void showQr()} disabled={!secret || qrBusy} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-bold hover:border-primary/50 disabled:opacity-60">
                  <QrCode className="h-4 w-4" /> {qrBusy ? "Rendering…" : qrUrl ? "Refresh QR" : "Show QR"}
                </button>
              </div>
              {qrUrl && (
                <div className="rounded-xl border border-border bg-white p-3">
                  <img src={qrUrl} alt="TOTP setup QR code" width={220} height={220} />
                  <p className="mt-1 max-w-[220px] text-[11px] text-muted-foreground">Scan with your authenticator app</p>
                </div>
              )}
              <p className="max-w-md text-xs text-muted-foreground">
                Do not paste real account secrets into any website - this tool runs fully offline in your browser, but
                your authenticator app remains the right place to store them.
              </p>
            </>
          ) : (
            <>
              <Timer className="h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Enter a Base32 secret or generate a random one</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                The same secret you would scan from a site's "set up 2FA" QR code.
              </p>
            </>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}

