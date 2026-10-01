// /tools/hash-generator - MD5, SHA-1, SHA-256, SHA-384 and SHA-512 digests
// of any text. SHA-* via WebCrypto, MD5 via a compact inline
// implementation. 100% client-side.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Fingerprint } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/hash-generator")({
  head: () => {
    const seo = getToolSeoMeta("hash-generator");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: HashGeneratorTool,
});

const K = [
  0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee, 0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501,
  0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be, 0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821,
  0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa, 0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
  0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed, 0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a,
  0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c, 0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70,
  0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05, 0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
  0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039, 0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1,
  0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1, 0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391,
];
const SHIFTS = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];

/** MD5 per RFC 1321. md5("abc") = 900150983cd24fb0d6963f7d28e17f72. */
function md5(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const bitLen = bytes.length * 8;
  const paddedLen = (((bytes.length + 8) >>> 6) + 1) * 64;
  const msg = new Uint8Array(paddedLen);
  msg.set(bytes);
  msg[bytes.length] = 0x80;
  const dv = new DataView(msg.buffer);
  dv.setUint32(paddedLen - 8, bitLen >>> 0, true);
  dv.setUint32(paddedLen - 4, Math.floor(bitLen / 4294967296), true);

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;
  const rotl = (x: number, n: number) => ((x << n) | (x >>> (32 - n))) >>> 0;

  for (let off = 0; off < paddedLen; off += 64) {
    const M: number[] = [];
    for (let i = 0; i < 16; i++) M.push(dv.getUint32(off + i * 4, true));
    let A = a0;
    let B = b0;
    let C = c0;
    let D = d0;
    for (let i = 0; i < 64; i++) {
      let F: number;
      let g: number;
      if (i < 16) {
        F = (B & C) | (~B & D);
        g = i;
      } else if (i < 32) {
        F = (D & B) | (~D & C);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        F = B ^ C ^ D;
        g = (3 * i + 5) % 16;
      } else {
        F = C ^ (B | ~D);
        g = (7 * i) % 16;
      }
      F = (F + A + K[i]! + M[g]!) >>> 0;
      A = D;
      D = C;
      C = B;
      B = (B + rotl(F, SHIFTS[i]!)) >>> 0;
    }
    a0 = (a0 + A) >>> 0;
    b0 = (b0 + B) >>> 0;
    c0 = (c0 + C) >>> 0;
    d0 = (d0 + D) >>> 0;
  }
  return [a0, b0, c0, d0].map((x) => x.toString(16).padStart(8, "0")).join("");
}

async function subtleHash(algo: string, text: string): Promise<string> {
  const buf = await crypto.subtle.digest(algo, new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** HMAC-SHA-2* via WebCrypto, hex output. */
async function hmacHex(algo: "SHA-256" | "SHA-512", secret: string, text: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: { name: algo } },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(text));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time-ish comparison (case-insensitive, trimmed). */
function constantTimeEqual(a: string, b: string): boolean {
  const x = a.trim().toLowerCase();
  const y = b.trim().toLowerCase();
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

const ROWS = ["MD5", "SHA-1", "SHA-256", "SHA-384", "SHA-512"];
const HMAC_ROWS = ["HMAC-SHA-256", "HMAC-SHA-512"];

type HashMode = "hash" | "hmac";

function HashGeneratorTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("hash-generator", isPro);
  const seo = getToolSeo("hash-generator");

  const [input, setInput] = useState("");
  const [hashes, setHashes] = useState<Record<string, string> | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<HashMode>("hash");
  const [secret, setSecret] = useState("");
  const [expected, setExpected] = useState("");

  const rows = mode === "hmac" ? HMAC_ROWS : ROWS;

  const hashAll = async () => {
    if (!input) {
      toast.error("Enter some text to hash.");
      return;
    }
    if (mode === "hmac" && !secret) {
      toast.error("Enter a secret key for HMAC.");
      return;
    }
    if (!trial.canUse) return;
    setBusy(true);
    try {
      const out: Record<string, string> = {};
      if (mode === "hmac") {
        out["HMAC-SHA-256"] = await hmacHex("SHA-256", secret, input);
        out["HMAC-SHA-512"] = await hmacHex("SHA-512", secret, input);
      } else {
        out["MD5"] = md5(input);
        for (const algo of ["SHA-1", "SHA-256", "SHA-384", "SHA-512"]) {
          out[algo] = await subtleHash(algo, input);
        }
      }
      setHashes(out);
      trial.recordUse();
    } catch {
      toast.error("Hashing failed in this browser - WebCrypto needs a secure context.");
    } finally {
      setBusy(false);
    }
  };

  const copy = async (algo: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${algo} copied to clipboard.`);
    } catch {
      toast.error("Could not copy - select the hash and copy it manually.");
    }
  };

  return (
    <ToolPageShell toolId="hash-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Hash Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div className="inline-flex rounded-xl bg-muted/60 p-1" role="group" aria-label="Hash mode">
            {(["hash", "hmac"] as HashMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setHashes(null); }}
                className={cn(
                  "rounded-lg px-5 py-2 text-sm font-bold uppercase transition",
                  mode === m ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m}
              </button>
            ))}
          </div>

          {mode === "hmac" && (
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-foreground/80">
                Secret key
              </span>
              <input
                type="text"
                value={secret} onChange={(e) => setSecret(e.target.value)}
                placeholder="HMAC secret - keep it safe, it never leaves your browser"
                spellCheck={false}
                className="w-full rounded-xl border border-border bg-background p-3 font-mono text-[13px] outline-none focus:border-primary"
              />
            </label>
          )}

          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-foreground/80">
              Text to hash
            </span>
            <textarea
              value={input} onChange={(e) => setInput(e.target.value)}
              placeholder="Paste or type any text…"
              spellCheck={false}
              className="h-44 w-full resize-y rounded-xl border border-border bg-background p-3 font-mono text-[13px] leading-relaxed outline-none focus:border-primary"
            />
          </label>

          <ActionButton busy={busy} disabled={!trial.canUse} onClick={hashAll}>
            <Fingerprint className="h-4 w-4" />{" "}
            {busy ? "Computing…" : mode === "hmac" ? "Compute HMAC" : "Generate hashes"}
          </ActionButton>

          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-foreground/80">
              Expected hash <span className="font-normal text-muted-foreground">(optional - verify against output)</span>
            </span>
            <input
              type="text"
              value={expected} onChange={(e) => setExpected(e.target.value)}
              placeholder="Paste an expected digest to compare…"
              spellCheck={false}
              className="w-full rounded-xl border border-border bg-background p-3 font-mono text-[13px] outline-none focus:border-primary"
            />
          </label>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free generations left - your text never leaves
              your browser.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {hashes === null ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <Fingerprint className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Hashes appear here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {mode === "hmac"
                  ? "HMAC-SHA-256 and HMAC-SHA-512 keyed digests - all computed instantly on your device."
                  : "MD5, SHA-1, SHA-256, SHA-384 and SHA-512 - all computed instantly on your device."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {rows.map((algo) => {
                const digest = hashes[algo] ?? "";
                const exp = expected.trim();
                const match = exp.length > 0 && constantTimeEqual(exp, digest);
                return (
                  <div key={algo} className="rounded-xl border border-border p-4">
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 text-sm font-extrabold">
                        {algo}
                        {exp.length > 0 && (
                          <span
                            className={cn(
                              "rounded-md px-2 py-0.5 text-[11px] font-extrabold",
                              match ? "bg-emerald-500/15 text-emerald-500" : "bg-red-500/15 text-red-500",
                            )}
                          >
                            {match ? "Match ✓" : "Mismatch ✕"}
                          </span>
                        )}
                      </span>
                      <button
                        type="button" onClick={() => copy(algo, digest)}
                        aria-label={`Copy ${algo}`}
                        className="rounded-lg border border-border p-1.5 hover:border-primary/50"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="break-all font-mono text-[13px] leading-relaxed text-muted-foreground">
                      {digest}
                    </p>
                  </div>
                );
              })}
              <p className="pt-1 text-xs leading-relaxed text-muted-foreground">
                Hashes are one-way fingerprints, great for checksums and integrity checks. Never use
                fast hashes like these to store passwords - use bcrypt, scrypt or Argon2 instead.
              </p>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
