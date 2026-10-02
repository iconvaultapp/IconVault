// /tools/security-headers - Checklist builder for HTTP security headers with
// recommended values, Nginx/Apache/Express config output, and a self-grade
// quiz (A-F). 100% client-side.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/security-headers")({
  head: () => {
    const seo = getToolSeoMeta("security-headers");
    const canonical = "https://iconvault.site/tools/security-headers";
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
  component: SecurityHeadersTool,
});

interface HeaderDef {
  key: string;
  desc: string;
  weight: number;
  recommended: string;
}

const HEADERS: HeaderDef[] = [
  {
    key: "Strict-Transport-Security",
    desc: "Forces HTTPS for all future visits, blocking SSL-stripping attacks.",
    weight: 25,
    recommended: "max-age=31536000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    desc: "Restricts where scripts, styles and other resources may load from.",
    weight: 20,
    recommended: "default-src 'self'; object-src 'none'; base-uri 'self'",
  },
  {
    key: "X-Content-Type-Options",
    desc: "Stops browsers guessing content types, blocking MIME-sniffing attacks.",
    weight: 15,
    recommended: "nosniff",
  },
  {
    key: "X-Frame-Options",
    desc: "Refuses to render inside frames, blocking clickjacking.",
    weight: 15,
    recommended: "DENY",
  },
  {
    key: "Permissions-Policy",
    desc: "Disables powerful features (camera, mic, geolocation) your site does not use.",
    weight: 15,
    recommended: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Referrer-Policy",
    desc: "Limits how much referrer data leaks to other sites.",
    weight: 10,
    recommended: "strict-origin-when-cross-origin",
  },
];

type ConfigTab = "nginx" | "apache" | "express";

function buildConfig(tab: ConfigTab, selected: { key: string; value: string }[]): string {
  if (tab === "nginx") {
    return selected
      .map((h) => `add_header ${h.key} "${h.value}" always;`)
      .join("\n");
  }
  if (tab === "apache") {
    return selected
      .map((h) => `Header always set ${h.key} "${h.value}"`)
      .join("\n");
  }
  return selected
    .map((h) => `res.setHeader("${h.key}", "${h.value}");`)
    .join("\n");
}

function grade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

function SecurityHeadersTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("security-headers", isPro);
  const seo = getToolSeo("security-headers");

  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(HEADERS.map((h) => [h.key, true])),
  );
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(HEADERS.map((h) => [h.key, h.recommended])),
  );
  const [configTab, setConfigTab] = useState<ConfigTab>("nginx");
  const [copied, setCopied] = useState(false);

  const selected = useMemo(
    () =>
      HEADERS.filter((h) => enabled[h.key]).map((h) => ({
        key: h.key,
        value: values[h.key] || h.recommended,
      })),
    [enabled, values],
  );

  const score = useMemo(
    () => HEADERS.reduce((sum, h) => sum + (enabled[h.key] ? h.weight : 0), 0),
    [enabled],
  );
  const g = grade(score);
  const scoreColor =
    score >= 75 ? "text-green-500" : score >= 40 ? "text-amber-500" : "text-red-500";

  const config = buildConfig(configTab, selected);

  const doCopy = async () => {
    if (!trial.canUse || selected.length === 0) return;
    try {
      await navigator.clipboard.writeText(config);
      setCopied(true);
      trial.recordUse();
      toast.success("Config copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed.");
    }
  };

  const configTabs: { id: ConfigTab; label: string }[] = [
    { id: "nginx", label: "Nginx" },
    { id: "apache", label: "Apache" },
    { id: "express", label: "Express" },
  ];

  return (
    <ToolPageShell toolId="security-headers" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Security Headers" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="space-y-3">
          {HEADERS.map((h) => {
            const on = enabled[h.key];
            return (
              <div key={h.key} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-label={`Enable ${h.key}`}
                    onClick={() => setEnabled((p) => ({ ...p, [h.key]: !p[h.key] }))}
                    className={cn(
                      "relative h-6 w-11 shrink-0 rounded-full transition",
                      on ? "bg-primary" : "bg-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                        on ? "left-[22px]" : "left-0.5",
                      )}
                    />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={cn("font-mono text-sm font-bold", !on && "text-muted-foreground")}>{h.key}</p>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                        +{h.weight} pts
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{h.desc}</p>
                  </div>
                </div>
                {on && (
                  <input
                    value={values[h.key]}
                    onChange={(e) => setValues((p) => ({ ...p, [h.key]: e.target.value }))}
                    className="mt-3 w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-[13px] outline-none focus:border-primary"
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-2 text-sm font-bold">Your security grade</p>
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted">
                <span className={cn("text-4xl font-extrabold", scoreColor)}>{g}</span>
              </div>
              <div className="flex-1">
                <div className="mb-1 flex justify-between text-xs font-semibold text-muted-foreground">
                  <span>{score} / 100</span>
                  <span>{selected.length} of {HEADERS.length} headers</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full transition-all", score >= 75 ? "bg-green-500" : score >= 40 ? "bg-amber-500" : "bg-red-500")}
                    style={{ width: `${score}%` }}
                  />
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {score >= 90
                    ? "Excellent. A hardened header set."
                    : score >= 75
                      ? "Good. Add the missing headers to reach A."
                      : score >= 60
                        ? "Fair. A few important headers are off."
                        : "Weak. Enable the high-weight headers first."}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold">Server config</p>
              <div className="flex gap-2">
                {configTabs.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setConfigTab(t.id)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-bold transition",
                      configTab === t.id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap break-all rounded-xl bg-muted p-3 font-mono text-[12px] leading-relaxed">
              {selected.length > 0 ? config : "Enable at least one header."}
            </pre>
            <div className="mt-4">
              <ActionButton disabled={!trial.canUse || selected.length === 0} onClick={() => void doCopy()}>
                {copied ? <Check className="h-4 w-4 text-green-200" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy config"}
              </ActionButton>
            </div>
            {!isPro && (
              <p className="mt-3 text-xs text-muted-foreground">
                {trial.left} of {TOOL_TRIAL_LIMIT} free copies left.
              </p>
            )}
            <div className="mt-4 flex gap-2 rounded-xl bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
              <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
              <span>
                HSTS needs HTTPS to work, and <code className="font-mono">preload</code> submits you to
                browser preload lists. Test every change, headers can break embedded content.
              </span>
            </div>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
