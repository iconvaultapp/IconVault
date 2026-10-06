// /tools/basic-auth-generator - Build an HTTP Basic Authorization header
// from a username and password. Unicode-safe Base64, local only.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/basic-auth-generator";
import toolSeoMeta from "@/lib/tool-seo-meta-data/basic-auth-generator";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/basic-auth-generator")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/basic-auth-generator";
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
  component: BasicAuthTool,
});

function utf8ToB64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

function BasicAuthTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("basic-auth-generator", isPro);
  const seo = toolSeo;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [generated, setGenerated] = useState(false);

  const header = useMemo(
    () => (username ? `Authorization: Basic ${utf8ToB64(`${username}:${password}`)}` : ""),
    [username, password],
  );

  const generate = () => {
    if (!trial.canUse || !username) return;
    setGenerated(true);
    trial.recordUse();
    toast.success("Header generated");
  };

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Clipboard blocked by the browser");
    }
  };

  return (
    <ToolPageShell toolId="basic-auth-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Basic Auth Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary/60"
              placeholder="api-user"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary/60"
              placeholder="••••••••"
              autoComplete="new-password"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              A colon inside the password is allowed - only the first colon separates username from password.
            </p>
          </div>
          <ActionButton disabled={!username || !trial.canUse} onClick={generate}>
            <KeyRound className="h-4 w-4" /> Generate header
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free runs left - everything stays in your browser.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-3 font-bold">Authorization header</h3>
          {!generated || !header ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
              <KeyRound className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your header appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Enter a username and generate to get the ready-to-paste header.
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <code className="font-mono text-sm break-all">{header}</code>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => void copy(header, "Header")} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-bold hover:border-primary/50">
                  <Copy className="h-4 w-4" /> Copy full header
                </button>
                <button type="button" onClick={() => void copy(header.replace("Authorization: Basic ", ""), "Token")} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-bold hover:border-primary/50">
                  <Copy className="h-4 w-4" /> Copy token only
                </button>
              </div>
              <div className="mt-4 rounded-xl border border-border bg-background p-4">
                <p className="mb-1 text-[13px] font-semibold">cURL example</p>
                <code className="font-mono text-xs break-all text-muted-foreground">
                  curl -H "{header}" https://api.example.com/
                </code>
              </div>
            </>
          )}
          <p className="mt-4 rounded-xl border border-amber-400/40 bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
            Basic auth only encodes credentials - it does not encrypt them. Always use it over HTTPS, and prefer
            tokens or API keys where you can. Unicode usernames and passwords are encoded as UTF-8 before Base64,
            matching modern server behavior.
          </p>
        </div>
      </div>
    </ToolPageShell>
  );
}
