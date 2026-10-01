// /tools/aes-encryptor - AES-256-GCM text encryption with PBKDF2 key
// derivation, random salt and IV per operation. 100% in-browser via WebCrypto.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Lock, LockOpen } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/aes-encryptor")({
  head: () => {
    const seo = getToolSeoMeta("aes-encryptor");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: AesTool,
});

const enc = new TextEncoder();
const dec = new TextDecoder();

function u8ToB64(u8: Uint8Array): string {
  let s = "";
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return btoa(s);
}

function b64ToU8(b64: string): Uint8Array {
  const bin = atob(b64.replace(/\s/g, ""));
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: 310_000, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encryptText(plain: string, passphrase: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, enc.encode(plain)));
  const packed = new Uint8Array(16 + 12 + ct.length);
  packed.set(salt, 0);
  packed.set(iv, 16);
  packed.set(ct, 28);
  return u8ToB64(packed);
}

async function decryptText(b64: string, passphrase: string): Promise<string> {
  const packed = b64ToU8(b64);
  if (packed.length < 28) throw new Error("Input is too short to be a valid payload.");
  const salt = packed.slice(0, 16);
  const iv = packed.slice(16, 28);
  const ct = packed.slice(28);
  const key = await deriveKey(passphrase, salt);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, ct as BufferSource);
  return dec.decode(pt);
}

function AesTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("aes-encryptor", isPro);
  const seo = getToolSeo("aes-encryptor");

  const [mode, setMode] = useState<"encrypt" | "decrypt">("encrypt");
  const [input, setInput] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [output, setOutput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!trial.canUse) return;
    if (!input) { setError("Enter some text first."); return; }
    if (!passphrase) { setError("Enter a passphrase first."); return; }
    setBusy(true);
    setError(null);
    try {
      const res = mode === "encrypt" ? await encryptText(input, passphrase) : await decryptText(input, passphrase);
      setOutput(res);
      trial.recordUse();
      toast.success(mode === "encrypt" ? "Text encrypted" : "Text decrypted");
    } catch (e) {
      setError(e instanceof Error ? e.message.replace("DOMException", "Decryption").trim() : "Operation failed.");
      if (mode === "decrypt") setError("Decryption failed. Check the passphrase or the pasted payload.");
      setOutput("");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Clipboard blocked by the browser");
    }
  };

  return (
    <ToolPageShell toolId="aes-encryptor" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="AES Encryptor" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div className="flex gap-2 rounded-xl bg-muted p-1">
            {(["encrypt", "decrypt"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setOutput(""); setError(null); }}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition",
                  mode === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m === "encrypt" ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
                {m === "encrypt" ? "Encrypt" : "Decrypt"}
              </button>
            ))}
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">
              {mode === "encrypt" ? "Plain text" : "Base64 payload to decrypt"}
            </label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={6}
              spellCheck={false}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-3 font-mono text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary/60"
              placeholder={mode === "encrypt" ? "Type or paste the text to encrypt…" : "Paste the Base64 output of a previous encryption…"}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Passphrase</label>
            <input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary/60"
              placeholder="Strong passphrase…"
              autoComplete="off"
            />
          </div>

          <ActionButton busy={busy} disabled={!input || !passphrase || !trial.canUse} onClick={() => void run()}>
            {mode === "encrypt" ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
            {busy ? "Working…" : mode === "encrypt" ? "Encrypt text" : "Decrypt text"}
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
            <h3 className="font-bold">{mode === "encrypt" ? "Encrypted output (Base64)" : "Decrypted output"}</h3>
            {output && (
              <button type="button" onClick={() => void copy()} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50">
                <Copy className="h-3.5 w-3.5" /> Copy
              </button>
            )}
          </div>
          {!output ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
              <Lock className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your result appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                AES-256-GCM with a 310,000-round PBKDF2 key derivation. A fresh random salt and IV are generated on every encryption.
              </p>
            </div>
          ) : (
            <textarea
              value={output}
              readOnly
              rows={12}
              spellCheck={false}
              className="w-full rounded-xl border border-border bg-muted/40 px-3.5 py-3 font-mono text-xs break-all outline-none"
            />
          )}
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            The Base64 payload packs salt (16 bytes), IV (12 bytes) and ciphertext. To decrypt elsewhere you need the same
            passphrase; the same recipe is standard AES-256-GCM + PBKDF2-SHA256. Nothing is uploaded - the passphrase
            never leaves your device.
          </p>
        </div>
      </div>
    </ToolPageShell>
  );
}
