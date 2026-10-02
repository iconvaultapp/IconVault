// /tools/trusted-types-playground - Trusted Types sandbox: create policies,
// fire XSS payloads at a DOM sink, watch the policy neutralize them.
// Honest: real enforcement needs a CSP require-trusted-types-for header.

import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bug, Copy, Info, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/trusted-types-playground")({
  head: () => {
    const seo = getToolSeoMeta("trusted-types-playground");
    const canonical = "https://iconvault.site/tools/trusted-types-playground";
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
  component: TrustedTypesTool,
});

const PAYLOADS = [
  { name: "img onerror", html: `<img src="x" onerror="alert('XSS')">` },
  { name: "svg onload", html: `<svg onload="alert('XSS')"><circle r="10"/></svg>` },
  { name: "script tag", html: `<script>alert('XSS')<\/script><p>hello</p>` },
  { name: "link javascript", html: `<a href="javascript:alert('XSS')">click me</a>` },
  { name: "clean html", html: `<p>Hello <strong>world</strong>, this one is safe.</p>` },
] as const;

/** Demo-only sanitizer: strips script tags, event handlers and javascript: URLs.
 *  For production use DOMPurify instead of regexes. */
function demoSanitize(dirty: string): string {
  return dirty
    .replace(/<script[\s\S]*?<\/script\s*>/gi, "")
    .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/href\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, 'href="#"');
}

const POLICY_CODE = `// Create a Trusted Types policy once, then route every
// innerHTML assignment through it.
const policy = trustedTypes.createPolicy("escape", {
  createHTML: (input) => sanitize(input), // your sanitizer here
});

// The sink now only accepts TrustedHTML, never raw strings:
el.innerHTML = policy.createHTML(userInput);

// Without a policy this throws once the CSP below is live:
//   el.innerHTML = userInput; // TypeError: requires TrustedHTML
//
// Enforce it with a real header:
//   Content-Security-Policy: require-trusted-types-for 'script';`;

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function TrustedTypesTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("trusted-types-playground", isPro);
  const seo = getToolSeo("trusted-types-playground");

  const [supported, setSupported] = useState(false);
  const [payload, setPayload] = useState<string>(PAYLOADS[0]!.html);
  const [sanitized, setSanitized] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSupported(typeof (window as unknown as { trustedTypes?: unknown }).trustedTypes !== "undefined");
  }, []);

  const runThroughPolicy = () => {
    if (!trial.canUse) return;
    trial.recordUse();
    const clean = demoSanitize(payload);
    setSanitized(clean);
    try {
      const tt = (window as unknown as { trustedTypes?: { createPolicy: (n: string, r: { createHTML: (s: string) => string }) => { createHTML: (s: string) => unknown } } }).trustedTypes;
      if (tt && previewRef.current) {
        const policy = tt.createPolicy("iconvault-demo", { createHTML: (s: string) => demoSanitize(s) });
        previewRef.current.innerHTML = policy.createHTML(payload) as unknown as string;
      } else if (previewRef.current) {
        previewRef.current.innerHTML = clean;
      }
    } catch {
      if (previewRef.current) previewRef.current.innerHTML = clean;
    }
    toast.success("Payload neutralized by the policy");
  };

  return (
    <ToolPageShell toolId="trusted-types-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Trusted Types" left={trial.left} />

      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
        <p className="text-sm text-muted-foreground">
          Trusted Types is a browser API, not a library: sinks like{" "}
          <span className="font-mono">innerHTML</span> reject raw strings once you deploy the CSP header{" "}
          <span className="font-mono">require-trusted-types-for &apos;script&apos;</span>. This page simulates a
          policy so you can see the mechanics. Demo sanitizer is regex-based, use DOMPurify in production.
          {supported
            ? " Your browser supports the real trustedTypes API, used for the preview below."
            : " Your browser lacks trustedTypes, so the preview falls back to the same sanitize step."}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <Bug className="h-4 w-4 text-red-500" /> Attack payloads
            </h2>
            <div className="flex flex-wrap gap-2">
              {PAYLOADS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => {
                    setPayload(p.html);
                    setSanitized(null);
                  }}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 font-mono text-xs transition",
                    payload === p.html
                      ? "border-red-500 bg-red-500/10 text-red-500"
                      : "border-border text-muted-foreground hover:border-red-500/40",
                  )}
                >
                  {p.name}
                </button>
              ))}
            </div>
            <label className="mb-1.5 mt-4 block text-[13px] font-medium text-foreground/80">
              Or paste your own payload
            </label>
            <textarea
              value={payload}
              onChange={(e) => {
                setPayload(e.target.value);
                setSanitized(null);
              }}
              rows={4}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary"
            />
            <div className="mt-4">
              <ActionButton busy={false} disabled={!trial.canUse} onClick={runThroughPolicy}>
                <ShieldCheck className="h-4 w-4" /> Run through policy
              </ActionButton>
            </div>
            {!isPro && (
              <p className="mt-2 text-xs text-muted-foreground">
                {trial.left} of {TOOL_TRIAL_LIMIT} free runs left.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 font-semibold">Policy code</h2>
            <pre className="max-h-80 overflow-auto rounded-xl bg-black/80 p-4 font-mono text-[13px] leading-relaxed text-sky-300">
              {POLICY_CODE}
            </pre>
            <button
              type="button"
              onClick={async () => {
                const ok = await copyText(POLICY_CODE);
                if (ok) {
                  trial.recordUse();
                  toast.success("Policy code copied");
                }
              }}
              disabled={!trial.canUse}
              className="mt-3 flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-semibold transition hover:border-primary/40 disabled:opacity-40"
            >
              <Copy className="h-4 w-4" /> Copy code
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 font-semibold">Rendered through the policy</h2>
            <div
              ref={previewRef}
              className="min-h-28 rounded-xl border border-border bg-background p-4 text-sm"
            >
              {sanitized === null && (
                <p className="text-muted-foreground">
                  Click &quot;Run through policy&quot;. The raw payload never touches the DOM as a string.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 font-semibold">Before vs after</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-red-500">Attacker input</p>
                <pre className="overflow-auto rounded-xl bg-black/80 p-3 font-mono text-xs leading-relaxed text-red-300">
                  {payload}
                </pre>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-500">
                  Policy output
                </p>
                <pre className="overflow-auto rounded-xl bg-black/80 p-3 font-mono text-xs leading-relaxed text-emerald-300">
                  {sanitized ?? "// run the policy to see the sanitized output"}
                </pre>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              With the CSP header live, assigning the left side directly to{" "}
              <span className="font-mono">innerHTML</span> throws a TypeError. That is the whole point: dangerous
              sinks stop accepting strings entirely, so one missed sanitize call cannot become an XSS.
            </p>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
