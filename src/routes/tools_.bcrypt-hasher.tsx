// /tools/bcrypt-hasher - Hash passwords with bcrypt and verify hashes.
// Client-side demo via bcryptjs; production apps must hash server-side.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, KeyRound, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/bcrypt-hasher";
import toolSeoMeta from "@/lib/tool-seo-meta-data/bcrypt-hasher";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/bcrypt-hasher")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/bcrypt-hasher";
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
  component: BcryptTool,
});

const COSTS = [10, 11, 12, 13, 14] as const;

async function loadBcrypt(): Promise<{ hashSync: (pw: string, rounds: number) => string; compareSync: (pw: string, hash: string) => boolean }> {
  const mod = await import("bcryptjs");
  return mod as unknown as { hashSync: (pw: string, rounds: number) => string; compareSync: (pw: string, hash: string) => boolean };
}

function BcryptTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("bcrypt-hasher", isPro);
  const seo = toolSeo;

  const [mode, setMode] = useState<"hash" | "verify">("hash");
  const [password, setPassword] = useState("");
  const [cost, setCost] = useState<number>(12);
  const [hashInput, setHashInput] = useState("");
  const [output, setOutput] = useState("");
  const [verifyResult, setVerifyResult] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingLib, setLoadingLib] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!trial.canUse || busy) return;
    if (!password) { setError("Enter a password first."); return; }
    if (mode === "verify" && !hashInput) { setError("Paste the bcrypt hash to verify against."); return; }
    setBusy(true);
    setError(null);
    setVerifyResult(null);
    try {
      setLoadingLib(true);
      const bcrypt = await loadBcrypt();
      setLoadingLib(false);
      if (mode === "hash") {
        // bcryptjs is synchronous; run in a macrotask so the UI paints the busy state.
        await new Promise((r) => setTimeout(r, 30));
        const h = bcrypt.hashSync(password, cost);
        setOutput(h);
        trial.recordUse();
        toast.success("Password hashed");
      } else {
        await new Promise((r) => setTimeout(r, 30));
        const ok = bcrypt.compareSync(password, hashInput.trim());
        setVerifyResult(ok);
        trial.recordUse();
        toast[ok ? "success" : "error"](ok ? "Password matches the hash" : "Password does not match");
      }
    } catch (e) {
      setLoadingLib(false);
      setError(e instanceof Error ? e.message : "Hashing failed.");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      toast.success("Hash copied");
    } catch {
      toast.error("Clipboard blocked by the browser");
    }
  };

  return (
    <ToolPageShell toolId="bcrypt-hasher" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Bcrypt Hasher" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div className="flex gap-2 rounded-xl bg-muted p-1">
            {(["hash", "verify"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setOutput(""); setVerifyResult(null); setError(null); }}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition",
                  mode === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m === "hash" ? <KeyRound className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                {m === "hash" ? "Hash" : "Verify"}
              </button>
            ))}
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary/60"
              placeholder="Enter password…"
              autoComplete="new-password"
            />
          </div>

          {mode === "hash" ? (
            <div>
              <p className="mb-2 text-[13px] font-medium text-foreground/80">Cost factor (rounds)</p>
              <div className="flex flex-wrap gap-2">
                {COSTS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCost(c)}
                    className={cn(
                      "rounded-xl border px-4 py-2.5 text-sm font-bold transition",
                      cost === c ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Cost 12 is the common default. Higher costs are slower to brute force but slower to compute (14 can take several seconds).
              </p>
            </div>
          ) : (
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Bcrypt hash to verify against</label>
              <textarea
                value={hashInput}
                onChange={(e) => setHashInput(e.target.value)}
                rows={3}
                spellCheck={false}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-3 font-mono text-xs break-all outline-none placeholder:text-muted-foreground/60 focus:border-primary/60"
                placeholder="$2b$12$…"
              />
            </div>
          )}

          <ActionButton busy={busy} disabled={!password || !trial.canUse || (mode === "verify" && !hashInput)} onClick={() => void run()}>
            {mode === "hash" ? <KeyRound className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
            {busy ? (loadingLib ? "Loading library…" : "Working…") : mode === "hash" ? "Hash password" : "Verify password"}
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
            <h3 className="font-bold">{mode === "hash" ? "Bcrypt hash" : "Verification result"}</h3>
            {mode === "hash" && output && (
              <button type="button" onClick={() => void copy()} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50">
                <Copy className="h-3.5 w-3.5" /> Copy
              </button>
            )}
          </div>
          {mode === "hash" ? (
            !output ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
                <KeyRound className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="font-semibold">Your hash appears here</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Format: $2b$[cost]$[22-char salt][31-char hash]. A new random salt is generated every time, so the same password gives a different hash.
                </p>
              </div>
            ) : (
              <textarea
                value={output}
                readOnly
                rows={4}
                spellCheck={false}
                className="w-full rounded-xl border border-border bg-muted/40 px-3.5 py-3 font-mono text-sm break-all outline-none"
              />
            )
          ) : (
            <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
              {verifyResult === null ? (
                <>
                  <ShieldCheck className="mb-3 h-10 w-10 text-muted-foreground/50" />
                  <p className="font-semibold">Enter a password and a hash to verify</p>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                    Comparison runs locally with constant-time bcrypt verification.
                  </p>
                </>
              ) : verifyResult ? (
                <>
                  <ShieldCheck className="mb-3 h-10 w-10 text-green-500" />
                  <p className="text-lg font-extrabold text-green-600">Match</p>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">The password matches the hash.</p>
                </>
              ) : (
                <>
                  <ShieldCheck className="mb-3 h-10 w-10 text-red-500" />
                  <p className="text-lg font-extrabold text-red-500">No match</p>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">The password does not match the hash.</p>
                </>
              )}
            </div>
          )}
          <p className="mt-4 rounded-xl border border-amber-400/40 bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
            Client-side demo only. Bcrypt is intentionally slow, so hashing belongs on your server - never hash or verify
            passwords in a browser for a real login system. The hash format is standard, so a hash generated here can be
            verified by any server-side bcrypt library.
          </p>
        </div>
      </div>
    </ToolPageShell>
  );
}
