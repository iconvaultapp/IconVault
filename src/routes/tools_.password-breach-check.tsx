// /tools/password-breach-check - Check a password against HaveIBeenPwned
// with k-anonymity: only the first 5 SHA-1 chars ever leave the browser.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Eye, EyeOff, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/password-breach-check";
import toolSeoMeta from "@/lib/tool-seo-meta-data/password-breach-check";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/password-breach-check")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/password-breach-check";
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
  component: BreachTool,
});

const enc = new TextEncoder();

async function sha1Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-1", enc.encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

type Result = { kind: "clean" } | { kind: "breached"; count: number } | { kind: "error"; message: string };

function BreachTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("password-breach-check", isPro);
  const seo = toolSeo;

  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  const check = async () => {
    if (!trial.canUse || busy || !password) return;
    setBusy(true);
    setResult(null);
    try {
      const full = await sha1Hex(password);
      const prefix = full.slice(0, 5);
      const suffix = full.slice(5);
      let res: Response;
      try {
        res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
          headers: { "Add-Padding": "true" },
        });
      } catch {
        setResult({ kind: "error", message: "Could not reach the breach database. Check your connection and try again." });
        return;
      }
      if (!res.ok) {
        setResult({ kind: "error", message: `The breach service returned an error (HTTP ${res.status}). Try again in a moment.` });
        return;
      }
      const text = await res.text();
      let count = 0;
      for (const line of text.split("\n")) {
        const [hashSuffix, n] = line.trim().split(":");
        if (hashSuffix === suffix) {
          count = parseInt(n!.replace(/,/g, ""), 10) || 0;
          break;
        }
      }
      setResult(count > 0 ? { kind: "breached", count } : { kind: "clean" });
      trial.recordUse();
      if (count > 0) toast.error("This password has appeared in breaches");
      else toast.success("No breach found for this password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolPageShell toolId="password-breach-check" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Breach Check" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Password</label>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setResult(null); }}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 pr-11 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary/60"
                placeholder="Type a password to check…"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={show ? "Hide password" : "Show password"}
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <ActionButton busy={busy} disabled={!password || !trial.canUse} onClick={() => void check()}>
            <ShieldAlert className="h-4 w-4" /> {busy ? "Checking…" : "Check for breaches"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free runs left.
            </p>
          )}

          <div className="rounded-xl border border-border bg-muted/40 p-3.5">
            <p className="text-[13px] font-bold">How your privacy is protected</p>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-xs leading-relaxed text-muted-foreground">
              <li>Your password is hashed with SHA-1 <span className="font-semibold text-foreground">in this browser</span>.</li>
              <li>Only the <span className="font-semibold text-foreground">first 5 characters</span> of that hash are sent to HaveIBeenPwned.</li>
              <li>Your full password - and even the full hash - <span className="font-semibold text-foreground">never leaves this tab</span>.</li>
            </ol>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-8 text-center">
          {!result ? (
            <>
              <ShieldAlert className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Enter a password and run the check</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Compares against hundreds of millions of passwords exposed in real data breaches, using
                k-anonymity so the service cannot see your password.
              </p>
            </>
          ) : result.kind === "error" ? (
            <>
              <ShieldAlert className="mb-3 h-10 w-10 text-amber-500" />
              <p className="font-semibold">Check did not complete</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">{result.message}</p>
            </>
          ) : result.kind === "clean" ? (
            <>
              <ShieldCheck className="mb-3 h-12 w-12 text-green-500" />
              <p className="text-lg font-extrabold text-green-600">Not found in any known breach</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                This password does not appear in the breach corpus. That does not make it strong - pair this check
                with the Password Strength tool.
              </p>
            </>
          ) : (
            <>
              <ShieldAlert className="mb-3 h-12 w-12 text-red-500" />
              <p className="text-lg font-extrabold text-red-500">Seen {result.count.toLocaleString()} times in breaches</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                This password has appeared in real data breaches. Attackers try breached passwords first - change it
                everywhere you used it, starting with email and banking.
              </p>
            </>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
