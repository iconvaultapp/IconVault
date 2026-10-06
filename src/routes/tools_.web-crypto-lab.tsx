// /tools/web-crypto-lab - Interactive WebCrypto explorer: hashing,
// HMAC, AES-GCM encryption, RSA signing and random values, each with a
// plain-English note on what the primitive is for. 100% client-side.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Atom, Check, Copy, Dices, Fingerprint, KeyRound, Lock, PenLine } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/web-crypto-lab";
import toolSeoMeta from "@/lib/tool-seo-meta-data/web-crypto-lab";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/web-crypto-lab")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/web-crypto-lab";
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
  component: WebCryptoLab,
});

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64.trim().replace(/\s+/g, ""));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function pemEncode(spki: ArrayBuffer): string {
  const b64 = bytesToBase64(new Uint8Array(spki));
  const lines = b64.match(/.{1,64}/g)?.join("\n") ?? b64;
  return `-----BEGIN PUBLIC KEY-----\n${lines}\n-----END PUBLIC KEY-----`;
}

async function copyText(s: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(s);
    return true;
  } catch {
    return false;
  }
}

function Section({
  icon: Icon,
  title,
  note,
  children,
}: {
  icon: typeof Atom;
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-1 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-4.5 w-4.5" />
        </span>
        <h2 className="text-lg font-extrabold">{title}</h2>
      </div>
      <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">{note}</p>
      {children}
    </section>
  );
}

function CopyBtn({ value, label }: { value: string | null; label: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      disabled={!value}
      onClick={() => {
        if (!value) return;
        void copyText(value).then((done) => {
          if (done) {
            setOk(true);
            toast.success(`${label} copied`);
            setTimeout(() => setOk(false), 1500);
          } else {
            toast.error("Copy failed.");
          }
        });
      }}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-bold transition hover:border-primary/40 disabled:opacity-40"
    >
      {ok ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
      {ok ? "Copied" : label}
    </button>
  );
}

const inputCls =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-[13px] outline-none focus:border-primary";
const outputCls =
  "w-full rounded-xl border border-border bg-muted/50 p-3 font-mono text-[12px] break-all outline-none";

type HashAlgo = "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512";

function WebCryptoLab() {
  const { isPro } = usePlan();
  const trial = useToolTrial("web-crypto-lab", isPro);
  const seo = toolSeo;

  // hash
  const [hashInput, setHashInput] = useState("");
  const [hashAlgo, setHashAlgo] = useState<HashAlgo>("SHA-256");
  const [hashOut, setHashOut] = useState<{ hex: string; b64: string } | null>(null);
  // hmac
  const [hmacMsg, setHmacMsg] = useState("");
  const [hmacKey, setHmacKey] = useState("");
  const [hmacOut, setHmacOut] = useState<string | null>(null);
  // aes
  const [aesPw, setAesPw] = useState("");
  const [aesPlain, setAesPlain] = useState("");
  const [aesBundle, setAesBundle] = useState<string | null>(null);
  const [aesCipherIn, setAesCipherIn] = useState("");
  const [aesPlainOut, setAesPlainOut] = useState<string | null>(null);
  // rsa
  const [rsaKeys, setRsaKeys] = useState<{ pub: CryptoKey; priv: CryptoKey; pem: string } | null>(null);
  const [rsaMsg, setRsaMsg] = useState("");
  const [rsaSig, setRsaSig] = useState<string | null>(null);
  const [rsaVerify, setRsaVerify] = useState<boolean | null>(null);
  // random
  const [randCount, setRandCount] = useState(16);
  const [randFmt, setRandFmt] = useState<"hex" | "base64" | "uuid">("hex");
  const [randOut, setRandOut] = useState<string | null>(null);

  const [busy, setBusy] = useState<string | null>(null);

  const guard = () => {
    if (!trial.canUse) {
      toast.error("Free trial used up. Go Pro for unlimited runs.");
      return false;
    }
    return true;
  };

  const runHash = async () => {
    if (!guard() || busy || !hashInput) return;
    setBusy("hash");
    try {
      const d = await crypto.subtle.digest(hashAlgo, new TextEncoder().encode(hashInput));
      const bytes = new Uint8Array(d);
      setHashOut({ hex: bytesToHex(bytes), b64: bytesToBase64(bytes) });
      trial.recordUse();
    } catch {
      toast.error("Hashing failed.");
    } finally {
      setBusy(null);
    }
  };

  const runHmac = async () => {
    if (!guard() || busy || !hmacMsg || !hmacKey) return;
    setBusy("hmac");
    try {
      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(hmacKey),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );
      const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(hmacMsg));
      setHmacOut(bytesToHex(new Uint8Array(sig)));
      trial.recordUse();
    } catch {
      toast.error("HMAC failed.");
    } finally {
      setBusy(null);
    }
  };

  const aesKeyFromPassword = async (password: string, salt: Uint8Array) => {
    const base = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveKey"],
    );
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: salt as BufferSource, iterations: 100000, hash: "SHA-256" },
      base,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
  };

  const runEncrypt = async () => {
    if (!guard() || busy || !aesPw || !aesPlain) return;
    setBusy("enc");
    try {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await aesKeyFromPassword(aesPw, salt);
      const ct = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv as BufferSource },
        key,
        new TextEncoder().encode(aesPlain),
      );
      const bundle = JSON.stringify({
        salt: bytesToBase64(salt),
        iv: bytesToBase64(iv),
        ct: bytesToBase64(new Uint8Array(ct)),
      });
      setAesBundle(bytesToBase64(new TextEncoder().encode(bundle)));
      trial.recordUse();
      toast.success("Encrypted");
    } catch {
      toast.error("Encryption failed.");
    } finally {
      setBusy(null);
    }
  };

  const runDecrypt = async () => {
    if (!guard() || busy || !aesPw || !aesCipherIn.trim()) return;
    setBusy("dec");
    try {
      const bundle = JSON.parse(new TextDecoder().decode(base64ToBytes(aesCipherIn.trim()))) as {
        salt: string;
        iv: string;
        ct: string;
      };
      const key = await aesKeyFromPassword(aesPw, base64ToBytes(bundle.salt));
      const pt = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: base64ToBytes(bundle.iv) as BufferSource },
        key,
        base64ToBytes(bundle.ct),
      );
      setAesPlainOut(new TextDecoder().decode(pt));
      trial.recordUse();
      toast.success("Decrypted");
    } catch {
      setAesPlainOut(null);
      toast.error("Decryption failed. Wrong password or corrupted data.");
    } finally {
      setBusy(null);
    }
  };

  const runGenRsa = async () => {
    if (!guard() || busy) return;
    setBusy("rsa-gen");
    try {
      const pair = await crypto.subtle.generateKey(
        {
          name: "RSASSA-PKCS1-v1_5",
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: "SHA-256",
        },
        true,
        ["sign", "verify"],
      );
      const spki = await crypto.subtle.exportKey("spki", pair.publicKey);
      setRsaKeys({ pub: pair.publicKey, priv: pair.privateKey, pem: pemEncode(spki) });
      setRsaSig(null);
      setRsaVerify(null);
      trial.recordUse();
      toast.success("RSA key pair generated");
    } catch {
      toast.error("Key generation failed.");
    } finally {
      setBusy(null);
    }
  };

  const runSign = async () => {
    if (!guard() || busy || !rsaKeys || !rsaMsg) return;
    setBusy("rsa-sign");
    try {
      const sig = await crypto.subtle.sign(
        "RSASSA-PKCS1-v1_5",
        rsaKeys.priv,
        new TextEncoder().encode(rsaMsg),
      );
      setRsaSig(bytesToBase64(new Uint8Array(sig)));
      setRsaVerify(null);
      trial.recordUse();
    } catch {
      toast.error("Signing failed.");
    } finally {
      setBusy(null);
    }
  };

  const runVerify = async () => {
    if (!guard() || busy || !rsaKeys || !rsaSig || !rsaMsg) return;
    setBusy("rsa-verify");
    try {
      const ok = await crypto.subtle.verify(
        "RSASSA-PKCS1-v1_5",
        rsaKeys.pub,
        base64ToBytes(rsaSig),
        new TextEncoder().encode(rsaMsg),
      );
      setRsaVerify(ok);
      trial.recordUse();
      toast[ok ? "success" : "error"](ok ? "Signature is valid" : "Signature is NOT valid");
    } catch {
      setRsaVerify(false);
      toast.error("Verification failed.");
    } finally {
      setBusy(null);
    }
  };

  const runRandom = () => {
    if (!guard() || busy) return;
    const n = Math.max(1, Math.min(1024, randCount));
    if (randFmt === "uuid") {
      setRandOut(crypto.randomUUID());
    } else {
      const bytes = crypto.getRandomValues(new Uint8Array(n));
      setRandOut(randFmt === "hex" ? bytesToHex(bytes) : bytesToBase64(bytes));
    }
    trial.recordUse();
  };

  const hashAlgos: HashAlgo[] = ["SHA-1", "SHA-256", "SHA-384", "SHA-512"];

  return (
    <ToolPageShell toolId="web-crypto-lab" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Web Crypto Lab" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Section
          icon={Fingerprint}
          title="Hash"
          note="A hash is a one-way fingerprint: the same input always gives the same output, but you cannot reverse it. Used for file integrity checks, password storage (with a salt and a slow KDF) and content addressing. SHA-1 is shown only for legacy comparison, never use it for security."
        >
          <div className="space-y-3">
            <textarea
              value={hashInput}
              onChange={(e) => setHashInput(e.target.value)}
              rows={3}
              placeholder="Text to hash…"
              className={inputCls}
            />
            <div className="flex flex-wrap items-center gap-2">
              {hashAlgos.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setHashAlgo(a)}
                  className={cn(
                    "rounded-xl border px-3 py-1.5 font-mono text-xs font-bold transition",
                    hashAlgo === a
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {a}
                </button>
              ))}
              <div className="ml-auto">
                <ActionButton busy={busy === "hash"} disabled={!hashInput || !trial.canUse} onClick={() => void runHash()}>
                  Hash
                </ActionButton>
              </div>
            </div>
            {hashOut && (
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <code className={cn(outputCls, "flex-1")}>{hashOut.hex}</code>
                  <CopyBtn value={hashOut.hex} label="Hex" />
                </div>
                <div className="flex items-start gap-2">
                  <code className={cn(outputCls, "flex-1")}>{hashOut.b64}</code>
                  <CopyBtn value={hashOut.b64} label="B64" />
                </div>
              </div>
            )}
          </div>
        </Section>

        <Section
          icon={KeyRound}
          title="HMAC"
          note="HMAC proves a message is authentic and untampered: only someone holding the secret key can produce the tag. This is how API webhooks (Stripe, GitHub) prove the payload really came from them. Both sides must share the key."
        >
          <div className="space-y-3">
            <input value={hmacMsg} onChange={(e) => setHmacMsg(e.target.value)} placeholder="Message…" className={inputCls} />
            <input value={hmacKey} onChange={(e) => setHmacKey(e.target.value)} placeholder="Secret key…" type="password" className={inputCls} />
            <ActionButton busy={busy === "hmac"} disabled={!hmacMsg || !hmacKey || !trial.canUse} onClick={() => void runHmac()}>
              Compute HMAC-SHA-256
            </ActionButton>
            {hmacOut && (
              <div className="flex items-start gap-2">
                <code className={cn(outputCls, "flex-1")}>{hmacOut}</code>
                <CopyBtn value={hmacOut} label="Copy" />
              </div>
            )}
          </div>
        </Section>

        <Section
          icon={Lock}
          title="AES-GCM encrypt / decrypt"
          note="AES-GCM is authenticated encryption: it scrambles data so only the password holder can read it, and detects tampering on decrypt. Your password is stretched with PBKDF2 (100,000 rounds) and every encryption uses a fresh random salt and IV."
        >
          <div className="space-y-3">
            <input value={aesPw} onChange={(e) => setAesPw(e.target.value)} placeholder="Password…" type="password" className={inputCls} />
            <textarea value={aesPlain} onChange={(e) => setAesPlain(e.target.value)} rows={3} placeholder="Plaintext to encrypt…" className={inputCls} />
            <ActionButton busy={busy === "enc"} disabled={!aesPw || !aesPlain || !trial.canUse} onClick={() => void runEncrypt()}>
              Encrypt
            </ActionButton>
            {aesBundle && (
              <div className="flex items-start gap-2">
                <code className={cn(outputCls, "flex-1")}>{aesBundle}</code>
                <CopyBtn value={aesBundle} label="Copy" />
              </div>
            )}
            <div className="border-t border-border pt-3">
              <textarea value={aesCipherIn} onChange={(e) => setAesCipherIn(e.target.value)} rows={3} placeholder="Paste an encrypted bundle to decrypt…" className={inputCls} />
              <div className="mt-2">
                <ActionButton busy={busy === "dec"} disabled={!aesPw || !aesCipherIn.trim() || !trial.canUse} onClick={() => void runDecrypt()}>
                  Decrypt with password above
                </ActionButton>
              </div>
              {aesPlainOut !== null && (
                <code className={cn(outputCls, "mt-2 block")}>{aesPlainOut}</code>
              )}
            </div>
          </div>
        </Section>

        <Section
          icon={PenLine}
          title="RSA sign / verify"
          note="RSA signing proves authorship: sign with the private key, anyone verifies with the public key. This is how software updates and certificates prove they are genuine. Keys are generated in your browser and never leave it."
        >
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <ActionButton busy={busy === "rsa-gen"} disabled={!trial.canUse} onClick={() => void runGenRsa()}>
                {rsaKeys ? "Generate new key pair" : "Generate 2048-bit key pair"}
              </ActionButton>
              {rsaKeys && <CopyBtn value={rsaKeys.pem} label="Public key PEM" />}
            </div>
            {rsaKeys && (
              <>
                <input value={rsaMsg} onChange={(e) => { setRsaMsg(e.target.value); setRsaVerify(null); }} placeholder="Message to sign…" className={inputCls} />
                <div className="flex flex-wrap gap-2">
                  <ActionButton busy={busy === "rsa-sign"} disabled={!rsaMsg || !trial.canUse} onClick={() => void runSign()}>
                    Sign
                  </ActionButton>
                  <ActionButton busy={busy === "rsa-verify"} disabled={!rsaSig || !rsaMsg || !trial.canUse} onClick={() => void runVerify()}>
                    Verify signature
                  </ActionButton>
                </div>
                {rsaSig && (
                  <div className="flex items-start gap-2">
                    <code className={cn(outputCls, "flex-1")}>{rsaSig}</code>
                    <CopyBtn value={rsaSig} label="Copy" />
                  </div>
                )}
                {rsaVerify !== null && (
                  <p className={cn("text-sm font-bold", rsaVerify ? "text-green-500" : "text-red-500")}>
                    {rsaVerify
                      ? "Signature valid: this message was signed by the private key."
                      : "Signature invalid: message or signature was changed."}
                  </p>
                )}
              </>
            )}
          </div>
        </Section>

        <Section
          icon={Dices}
          title="Random values"
          note="crypto.getRandomValues is the browser's cryptographically secure random generator, suitable for tokens, salts and nonces. Math.random is not: it is predictable and must never be used for security."
        >
          <div className="space-y-3 lg:col-span-1">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                Bytes
                <input
                  type="number"
                  min={1}
                  max={1024}
                  value={randCount}
                  onChange={(e) => setRandCount(Number(e.target.value))}
                  className="w-20 rounded-xl border border-border bg-background px-2 py-1.5 font-mono text-sm outline-none focus:border-primary"
                />
              </label>
              <div className="flex gap-2">
                {(["hex", "base64", "uuid"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setRandFmt(f)}
                    className={cn(
                      "rounded-xl border px-3 py-1.5 font-mono text-xs font-bold transition",
                      randFmt === f
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <ActionButton busy={false} disabled={!trial.canUse} onClick={runRandom}>
                Generate
              </ActionButton>
            </div>
            {randOut && (
              <div className="flex items-start gap-2">
                <code className={cn(outputCls, "flex-1")}>{randOut}</code>
                <CopyBtn value={randOut} label="Copy" />
              </div>
            )}
          </div>
        </Section>

        <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-5 text-sm leading-relaxed text-muted-foreground">
          <Atom className="h-5 w-5 shrink-0 text-primary" />
          <p>
            Everything on this page uses the <strong className="font-bold text-foreground">Web Crypto API</strong> built
            into your browser, the same primitives real apps use. Keys and passwords never leave this
            tab. This page is for learning: for production password storage use a dedicated KDF like
            Argon2 or bcrypt on a server.
          </p>
        </div>
      </div>
    </ToolPageShell>
  );
}
