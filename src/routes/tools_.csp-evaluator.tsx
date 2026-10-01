// /tools/csp-evaluator - Paste a Content-Security-Policy header and get a
// 0-100 score with per-check pass/warn/fail explanations. 100% client-side.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Check, CheckCircle2, Copy, Shield, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/csp-evaluator")({
  head: () => {
    const seo = getToolSeoMeta("csp-evaluator");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: CspEvaluatorTool,
});

type Status = "pass" | "warn" | "fail";

interface Check {
  id: string;
  label: string;
  status: Status;
  detail: string;
  delta: number;
}

function parseCsp(raw: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  const cleaned = raw.replace(/^Content-Security-Policy(-Report-Only)?:\s*/i, "");
  for (const part of cleaned.split(";")) {
    const tokens = part.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) continue;
    map.set(tokens![0]!.toLowerCase!(), tokens.slice(1));
  }
  return map;
}

function evaluate(raw: string): { score: number; checks: Check[] } {
  const dirs = parseCsp(raw);
  const checks: Check[] = [];
  let score = 100;
  const add = (c: Check) => {
    checks.push(c);
    score += c.delta;
  };
  const has = (name: string) => dirs.has(name);
  const srcs = (name: string) => dirs.get(name) ?? [];
  const allSources = [...dirs.values()].flat();

  add({
    id: "default-src",
    label: "default-src is set",
    status: has("default-src") ? "pass" : "fail",
    detail: has("default-src")
      ? "A fallback exists for every fetch directive you did not set explicitly."
      : "Without default-src, any unset fetch directive has no restriction at all.",
    delta: has("default-src") ? 0 : -15,
  });

  const inlineDirs = ["script-src", "style-src"].filter((d) => srcs(d).includes("'unsafe-inline'"));
  add({
    id: "unsafe-inline",
    label: "No 'unsafe-inline'",
    status: inlineDirs.length === 0 ? "pass" : "fail",
    detail: inlineDirs.length === 0
      ? "Inline scripts and styles are blocked, which stops most injected script attacks."
      : `'unsafe-inline' found in ${inlineDirs.join(", ")}. Any injected inline script will run. Use nonces or hashes instead.`,
    delta: inlineDirs.length === 0 ? 0 : -20,
  });

  const evalDirs = [...dirs.keys()].filter((d) => srcs(d).includes("'unsafe-eval'"));
  add({
    id: "unsafe-eval",
    label: "No 'unsafe-eval'",
    status: evalDirs.length === 0 ? "pass" : "fail",
    detail: evalDirs.length === 0
      ? "eval() and friends are blocked."
      : `'unsafe-eval' found in ${evalDirs.join(", ")}. It re-enables string-to-code execution.`,
    delta: evalDirs.length === 0 ? 0 : -15,
  });

  const wildDirs = [...dirs.keys()].filter((d) => srcs(d).includes("*"));
  add({
    id: "wildcard",
    label: "No wildcard sources",
    status: wildDirs.length === 0 ? "pass" : "fail",
    detail: wildDirs.length === 0
      ? "No directive trusts every origin."
      : `Wildcard * found in ${wildDirs.join(", ")}. Any site on the internet can provide resources.`,
    delta: wildDirs.length === 0 ? 0 : -15,
  });

  const httpDirs = [...dirs.keys()].filter((d) => srcs(d).some((s) => s === "http:" || /^http:\/\//i.test(s)));
  add({
    id: "http",
    label: "No plain http: sources",
    status: httpDirs.length === 0 ? "pass" : "fail",
    detail: httpDirs.length === 0
      ? "Resources cannot be loaded over unencrypted HTTP."
      : `http: sources in ${httpDirs.join(", ")}. A network attacker can replace these resources.`,
    delta: httpDirs.length === 0 ? 0 : -10,
  });

  const dataScript = srcs("script-src").includes("data:");
  add({
    id: "data-script",
    label: "No data: in script-src",
    status: dataScript ? "fail" : "pass",
    detail: dataScript
      ? "data: URIs in script-src let attackers run arbitrary code via data:text/javascript."
      : "Scripts cannot be smuggled in through data: URIs.",
    delta: dataScript ? -10 : 0,
  });

  add({
    id: "object-src",
    label: "object-src is restricted",
    status: !has("object-src") ? "warn" : srcs("object-src").includes("'none'") ? "pass" : "warn",
    detail: !has("object-src")
      ? "Missing object-src leaves plugins and embeds unrestricted. Set it to 'none'."
      : srcs("object-src").includes("'none'")
        ? "Plugins and embeds are fully blocked."
        : `object-src allows ${srcs("object-src").join(" ")}. Prefer 'none' unless you embed plugins.`,
    delta: !has("object-src") ? -10 : srcs("object-src").includes("'none'") ? 0 : -5,
  });

  add({
    id: "base-uri",
    label: "base-uri is set",
    status: has("base-uri") ? "pass" : "warn",
    detail: has("base-uri")
      ? "Attackers cannot hijack relative URLs with a rogue <base> tag."
      : "Missing base-uri lets an attacker inject a <base> tag and redirect relative URLs.",
    delta: has("base-uri") ? 0 : -5,
  });

  add({
    id: "form-action",
    label: "form-action is set",
    status: has("form-action") ? "pass" : "warn",
    detail: has("form-action")
      ? "Forms can only submit to the listed destinations."
      : "Missing form-action lets injected forms exfiltrate data to any site.",
    delta: has("form-action") ? 0 : -5,
  });

  add({
    id: "frame-ancestors",
    label: "frame-ancestors is set",
    status: has("frame-ancestors") ? "pass" : "warn",
    detail: has("frame-ancestors")
      ? "Clickjacking protection is in place."
      : "Missing frame-ancestors leaves the page embeddable anywhere (clickjacking risk).",
    delta: has("frame-ancestors") ? 0 : -10,
  });

  const upgraded = allSources.includes("upgrade-insecure-requests") || raw.toLowerCase().includes("upgrade-insecure-requests");
  add({
    id: "upgrade",
    label: "upgrade-insecure-requests",
    status: "pass",
    detail: upgraded
      ? "Insecure subresource requests are upgraded to HTTPS. Bonus points."
      : "Not present. Consider adding it so http:// subresources auto-upgrade to https://.",
    delta: upgraded ? 5 : 0,
  });

  const reporting = has("report-uri") || has("report-to");
  add({
    id: "report",
    label: "Violation reporting",
    status: "pass",
    detail: reporting
      ? "Violations are reported, so you will hear about breakage and attacks."
      : "No report-uri/report-to. Reporting is optional but helps you spot real-world violations.",
    delta: 0,
  });

  return { score: Math.max(0, Math.min(100, score)), checks };
}

function grade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 55) return "D";
  return "F";
}

const STATUS_STYLE: Record<Status, { icon: typeof Check; cls: string; badge: string }> = {
  pass: { icon: CheckCircle2, cls: "text-green-500", badge: "bg-green-500/10 text-green-600" },
  warn: { icon: AlertTriangle, cls: "text-amber-500", badge: "bg-amber-500/10 text-amber-600" },
  fail: { icon: XCircle, cls: "text-red-500", badge: "bg-red-500/10 text-red-600" },
};

function CspEvaluatorTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("csp-evaluator", isPro);
  const seo = getToolSeo("csp-evaluator");

  const [input, setInput] = useState("");
  const [result, setResult] = useState<{ score: number; checks: Check[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const run = () => {
    if (!trial.canUse || busy || !input.trim()) return;
    setBusy(true);
    try {
      setResult(evaluate(input));
      trial.recordUse();
      toast.success("Policy evaluated");
    } finally {
      setBusy(false);
    }
  };

  const copyReport = async () => {
    if (!result) return;
    const lines = [
      `CSP evaluation: ${result.score}/100 (grade ${grade(result.score)})`,
      "",
      ...result.checks.map(
        (c) => `[${c.status.toUpperCase()}] ${c.label} (${c.delta >= 0 ? "+" : ""}${c.delta}): ${c.detail}`,
      ),
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      toast.success("Report copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed.");
    }
  };

  const g = result ? grade(result.score) : null;
  const scoreColor = !result
    ? ""
    : result.score >= 80 ? "text-green-500" : result.score >= 55 ? "text-amber-500" : "text-red-500";

  return (
    <ToolPageShell toolId="csp-evaluator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="CSP Evaluator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <label className="mb-2 block text-sm font-bold">Paste your CSP</label>
            <textarea
              value={input}
              onChange={(e) => { setInput(e.target.value); setResult(null); }}
              rows={9}
              placeholder={"default-src 'self'; script-src 'self'; object-src 'none'…"}
              className="w-full rounded-xl border border-border bg-background p-3 font-mono text-[13px] outline-none focus:border-primary"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Paste the policy value with or without the Content-Security-Policy: prefix.
            </p>
          </div>

          <ActionButton busy={busy} disabled={!trial.canUse || !input.trim()} onClick={run}>
            <Shield className="h-4 w-4" /> {busy ? "Evaluating…" : "Evaluate policy"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free evaluations left - analysis runs locally.
            </p>
          )}

          <button
            type="button"
            onClick={() => setInput("default-src * 'unsafe-inline' 'unsafe-eval' http: https: data:")}
            className="text-xs font-semibold text-primary hover:underline"
          >
            Try a deliberately weak policy
          </button>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {!result ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <Shield className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your score appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                12 checks covering inline scripts, wildcards, missing directives and more.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-5">
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-muted">
                  <span className={cn("text-4xl font-extrabold", scoreColor)}>{result.score}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Overall grade</p>
                  <p className={cn("text-5xl font-extrabold", scoreColor)}>{g}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void copyReport()}
                  className="ml-auto inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-bold transition hover:border-primary/40"
                >
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy report"}
                </button>
              </div>

              <div className="space-y-2.5">
                {result.checks.map((c) => {
                  const st = STATUS_STYLE[c.status];
                  const Icon = st.icon;
                  return (
                    <div key={c.id} className="flex gap-3 rounded-xl border border-border p-3.5">
                      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", st.cls)} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold">{c.label}</p>
                          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold uppercase", st.badge)}>
                            {c.status}
                          </span>
                          <span className={cn("font-mono text-xs font-bold", c.delta < 0 ? "text-red-500" : "text-muted-foreground")}>
                            {c.delta >= 0 ? `+${c.delta}` : c.delta}
                          </span>
                        </div>
                        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{c.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
