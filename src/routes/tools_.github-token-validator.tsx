// /tools/github-token-validator - Check a GitHub personal access token without storing it.
// The request goes directly from your browser to GitHub. The token is kept
// in memory only and never saved anywhere.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Eye, EyeOff, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/github-token-validator")({
  head: () => {
    const seo = getToolSeoMeta("github-token-validator");
    const canonical = "https://iconvault.site/tools/github-token-validator";
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
  component: TokenValidatorTool,
});

interface Result {
  valid: boolean;
  login?: string;
  scopes?: string[];
  rateLimit?: string;
  message?: string;
}

function TokenValidatorTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("github-token-validator", isPro);
  const seo = getToolSeo("github-token-validator");
  const [token, setToken] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const validate = async () => {
    if (!token.trim() || busy || !trial.canUse) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("https://api.github.com/user", {
        headers: { Authorization: "Bearer " + token.trim(), Accept: "application/vnd.github+json" },
      });
      if (res.ok) {
        const data = await res.json();
        const scopesHeader = res.headers.get("x-oauth-scopes") ?? "";
        const scopes = scopesHeader ? scopesHeader.split(",").map((s) => s.trim()).filter(Boolean) : [];
        const rateLimit = res.headers.get("x-ratelimit-remaining") ?? "";
        setResult({ valid: true, login: data.login, scopes, rateLimit });
        toast.success(`Token is valid for @${data.login}`);
      } else if (res.status === 401 || res.status === 403) {
        setResult({ valid: false, message: "Invalid, expired or revoked token (HTTP " + res.status + ")." });
        toast.error("Token is not valid");
      } else {
        setResult({ valid: false, message: `GitHub returned HTTP ${res.status}. Try again in a moment.` });
      }
      trial.recordUse();
    } catch {
      setResult({ valid: false, message: "Network error. Check your connection and try again." });
    } finally {
      setBusy(false);
    }
  };

  const clear = () => {
    setToken("");
    setResult(null);
    toast.message("Token cleared from memory");
  };

  return (
    <ToolPageShell toolId="github-token-validator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="GitHub Token Validator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="rounded-2xl border border-border bg-card p-5">
          <label className="mb-2 block text-[13px] font-medium text-foreground/80">
            Personal access token
          </label>
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void validate(); }}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              spellCheck={false}
              autoComplete="off"
              className="w-full rounded-xl border border-border bg-background py-3 pl-4 pr-11 font-mono text-sm outline-none focus:border-primary/50"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? "Hide token" : "Show token"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <ActionButton busy={busy} disabled={!token.trim() || !trial.canUse} onClick={validate}>
              {busy ? "Validating…" : "Validate token"}
            </ActionButton>
            <button
              type="button"
              onClick={clear}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-red-500/40 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" /> Clear
            </button>
          </div>

          <p className="mt-4 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
            The request goes directly from your browser to GitHub. The token is kept in memory only,
            never stored, never sent to our servers. Press Clear to wipe it.
          </p>

          {result && (
            <div
              className={cn(
                "mt-4 rounded-xl border p-4",
                result.valid ? "border-green-500/40 bg-green-500/5" : "border-red-500/40 bg-red-500/5",
              )}
            >
              <div className="flex items-center gap-2">
                {result.valid ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <p className="font-bold">{result.valid ? "Token is valid" : "Token is invalid"}</p>
              </div>
              {result.valid && (
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex gap-2">
                    <dt className="w-28 shrink-0 text-muted-foreground">Username</dt>
                    <dd className="font-mono font-semibold">@{result.login}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-28 shrink-0 text-muted-foreground">Scopes</dt>
                    <dd>
                      {result.scopes && result.scopes.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {result.scopes.map((s) => (
                            <span key={s} className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-xs font-bold text-primary">
                              {s}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No OAuth scopes on this token</span>
                      )}
                    </dd>
                  </div>
                  {result.rateLimit && (
                    <div className="flex gap-2">
                      <dt className="w-28 shrink-0 text-muted-foreground">API quota left</dt>
                      <dd className="font-mono">{result.rateLimit} requests</dd>
                    </div>
                  )}
                </dl>
              )}
              {!result.valid && result.message && (
                <p className="mt-2 text-sm text-muted-foreground">{result.message}</p>
              )}
            </div>
          )}
        </div>

        <div className="h-fit rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-bold">Why validate?</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Confirm a token works before pasting it into CI or a deployment.</li>
            <li>See exactly which scopes it grants, so you can keep permissions minimal.</li>
            <li>Catch expired or revoked tokens early instead of debugging failed builds.</li>
          </ul>
          {!isPro && (
            <p className="mt-4 text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free validations left.
            </p>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
