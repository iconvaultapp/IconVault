// /tools/bip39-generator - Generate and validate BIP39 seed phrases
// (12/24 words). English wordlist, everything local via the bip39 package.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Dices, ShieldCheck, Wallet } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/bip39-generator")({
  head: () => {
    const seo = getToolSeoMeta("bip39-generator");
    const canonical = "https://iconvault.site/tools/bip39-generator";
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
  component: Bip39Tool,
});

interface Bip39Lib {
  generateMnemonic: (strength?: number) => string;
  validateMnemonic: (mnemonic: string) => boolean;
  mnemonicToEntropy: (mnemonic: string) => string;
}

async function loadBip39(): Promise<Bip39Lib> {
  const mod = await import("bip39");
  return mod as unknown as Bip39Lib;
}

function Bip39Tool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("bip39-generator", isPro);
  const seo = getToolSeo("bip39-generator");

  const [mode, setMode] = useState<"generate" | "validate">("generate");
  const [wordCount, setWordCount] = useState<12 | 24>(12);
  const [mnemonic, setMnemonic] = useState("");
  const [validateInput, setValidateInput] = useState("");
  const [validResult, setValidResult] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingLib, setLoadingLib] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    if (!trial.canUse || busy) return;
    setBusy(true);
    setError(null);
    try {
      setLoadingLib(true);
      const bip39 = await loadBip39();
      setLoadingLib(false);
      const m = bip39.generateMnemonic(wordCount === 12 ? 128 : 256);
      setMnemonic(m);
      trial.recordUse();
      toast.success(`${wordCount}-word phrase generated`);
    } catch (e) {
      setLoadingLib(false);
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setBusy(false);
    }
  };

  const validate = async () => {
    if (!trial.canUse || busy) return;
    const clean = validateInput.trim().toLowerCase().replace(/\s+/g, " ");
    if (!clean) { setError("Paste a mnemonic to validate."); return; }
    setBusy(true);
    setError(null);
    try {
      setLoadingLib(true);
      const bip39 = await loadBip39();
      setLoadingLib(false);
      const ok = bip39.validateMnemonic(clean);
      setValidResult(ok);
      trial.recordUse();
      toast[ok ? "success" : "error"](ok ? "Valid BIP39 mnemonic" : "Not a valid BIP39 mnemonic");
    } catch (e) {
      setLoadingLib(false);
      setError(e instanceof Error ? e.message : "Validation failed.");
      setValidResult(false);
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!mnemonic) return;
    try {
      await navigator.clipboard.writeText(mnemonic);
      toast.success("Phrase copied");
    } catch {
      toast.error("Clipboard blocked by the browser");
    }
  };

  const words = mnemonic ? mnemonic.split(" ") : [];

  return (
    <ToolPageShell toolId="bip39-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="BIP39 Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div className="flex gap-2 rounded-xl bg-muted p-1">
            {(["generate", "validate"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setValidResult(null); setError(null); }}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition",
                  mode === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m === "generate" ? <Dices className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                {m === "generate" ? "Generate" : "Validate"}
              </button>
            ))}
          </div>

          {mode === "generate" ? (
            <div>
              <p className="mb-2 text-[13px] font-medium text-foreground/80">Phrase length</p>
              <div className="flex gap-2">
                {([12, 24] as const).map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setWordCount(w)}
                    className={cn(
                      "flex-1 rounded-xl border px-4 py-2.5 text-sm font-bold transition",
                      wordCount === w ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {w} words
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                12 words = 128-bit entropy, 24 words = 256-bit. Both use the official English BIP39 wordlist.
              </p>
            </div>
          ) : (
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Mnemonic to validate</label>
              <textarea
                value={validateInput}
                onChange={(e) => { setValidateInput(e.target.value); setValidResult(null); }}
                rows={4}
                spellCheck={false}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary/60"
                placeholder="abandon abandon abandon …"
              />
            </div>
          )}

          {mode === "generate" ? (
            <ActionButton busy={busy} disabled={!trial.canUse} onClick={() => void generate()}>
              <Dices className="h-4 w-4" /> {busy ? (loadingLib ? "Loading library…" : "Generating…") : "Generate phrase"}
            </ActionButton>
          ) : (
            <ActionButton busy={busy} disabled={!validateInput.trim() || !trial.canUse} onClick={() => void validate()}>
              <ShieldCheck className="h-4 w-4" /> {busy ? (loadingLib ? "Loading library…" : "Checking…") : "Validate mnemonic"}
            </ActionButton>
          )}
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free runs left - everything stays in your browser.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
          <p className="rounded-xl border border-border bg-muted/40 p-3.5 text-xs leading-relaxed text-muted-foreground">
            Entropy comes from your browser's secure random generator. This demo uses the English wordlist only;
            other languages use different lists and are not checked here.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {mode === "validate" ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
              {validResult === null ? (
                <>
                  <ShieldCheck className="mb-3 h-10 w-10 text-muted-foreground/50" />
                  <p className="font-semibold">Paste a mnemonic on the left to validate it</p>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                    Checks every word against the BIP39 English list and verifies the checksum.
                  </p>
                </>
              ) : validResult ? (
                <>
                  <ShieldCheck className="mb-3 h-10 w-10 text-green-500" />
                  <p className="text-lg font-extrabold text-green-600">Valid BIP39 mnemonic</p>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">Wordlist and checksum both check out.</p>
                </>
              ) : (
                <>
                  <ShieldCheck className="mb-3 h-10 w-10 text-red-500" />
                  <p className="text-lg font-extrabold text-red-500">Invalid mnemonic</p>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                    A word is not in the list or the checksum does not match.
                  </p>
                </>
              )}
            </div>
          ) : !mnemonic ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
              <Wallet className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your seed phrase appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Generated locally with a checksum, ready to import into any BIP39-compatible wallet.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-bold">{wordCount}-word seed phrase</h3>
                <button type="button" onClick={() => void copy()} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50">
                  <Copy className="h-3.5 w-3.5" /> Copy
                </button>
              </div>
              <div className={cn("grid gap-2", wordCount === 12 ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-3 sm:grid-cols-6")}>
                {words.map((w, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-2">
                    <span className="text-[11px] font-bold text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                    <span className="text-sm font-semibold">{w}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 rounded-xl border border-red-400/40 bg-red-50 p-3.5 text-xs leading-relaxed text-red-900 dark:bg-red-950/20 dark:text-red-200">
                Anyone with this phrase controls the wallet. Never share it, never type it into a site you do not
                trust, and store the written backup offline. This is a demo-grade generator - real funds deserve a
                hardware wallet.
              </p>
            </>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
