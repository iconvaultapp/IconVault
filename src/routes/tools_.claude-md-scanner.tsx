// /tools/claude-md-scanner - Paste a CLAUDE.md / agent config and scan it for
// leaked secrets, dangerous commands and overly permissive rules. Hand-written
// heuristic pattern checks, 100% in-browser. Not a substitute for a real audit.

import { useCallback, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Copy, FileUp, ScanSearch, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/claude-md-scanner";
import toolSeoMeta from "@/lib/tool-seo-meta-data/claude-md-scanner";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/claude-md-scanner")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/claude-md-scanner";
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
  component: ClaudeMdScannerTool,
});

type Severity = "critical" | "high" | "medium" | "low";

interface Check {
  id: string;
  group: "Secret exposure" | "Dangerous command" | "Overly permissive rule" | "Possible injection";
  severity: Severity;
  pattern: RegExp;
  title: string;
  advice: string;
  maxHits: number;
}

const CHECKS: Check[] = [
  // ---- secrets ----
  {
    id: "aws-key", group: "Secret exposure", severity: "critical",
    pattern: /\bAKIA[0-9A-Z]{16}\b/, title: "AWS access key ID",
    advice: "Rotate this key in the AWS console and move it to a secret manager or .env file that is never committed.",
    maxHits: 5,
  },
  {
    id: "github-token", group: "Secret exposure", severity: "critical",
    pattern: /\b(ghp_|gho_|ghu_|ghs_|ghr_|github_pat_)[A-Za-z0-9_]{10,}\b/, title: "GitHub token",
    advice: "Revoke this token on GitHub immediately and store the replacement in a password manager or secret store.",
    maxHits: 5,
  },
  {
    id: "openai-key", group: "Secret exposure", severity: "critical",
    pattern: /\bsk-(?!ant-)[A-Za-z0-9]{20,}\b/, title: "OpenAI-style API key",
    advice: "Rotate the key at the provider dashboard and never paste live keys into agent instructions.",
    maxHits: 5,
  },
  {
    id: "anthropic-key", group: "Secret exposure", severity: "critical",
    pattern: /\bsk-ant-[A-Za-z0-9_-]{10,}\b/, title: "Anthropic API key",
    advice: "Rotate this key in the Anthropic console and keep it out of any file the agent might share.",
    maxHits: 5,
  },
  {
    id: "stripe-key", group: "Secret exposure", severity: "critical",
    pattern: /\b(sk_live|rk_live|whsec_)[A-Za-z0-9]{10,}\b/, title: "Stripe live secret",
    advice: "Roll this key in the Stripe dashboard at once - live payment keys are prime targets.",
    maxHits: 5,
  },
  {
    id: "slack-token", group: "Secret exposure", severity: "critical",
    pattern: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/, title: "Slack token",
    advice: "Revoke the token in the Slack app settings and re-issue it through your secret manager.",
    maxHits: 5,
  },
  {
    id: "private-key", group: "Secret exposure", severity: "critical",
    pattern: /-----BEGIN (?:RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----/, title: "Private key material",
    advice: "A private key must never live in an agent config. Move it to ~/.ssh or a vault and reference the path only.",
    maxHits: 5,
  },
  {
    id: "bearer-token", group: "Secret exposure", severity: "high",
    pattern: /Bearer\s+[A-Za-z0-9\-._~+/=]{20,}/i, title: "Bearer token",
    advice: "Bearer tokens grant access to whoever holds them. Store in an env var and inject at runtime.",
    maxHits: 5,
  },
  {
    id: "url-creds", group: "Secret exposure", severity: "high",
    pattern: /https?:\/\/[^/\s:]+:[^/\s@]{4,}@/, title: "Credentials embedded in a URL",
    advice: "Strip the credentials from the URL and pass them via headers or env vars instead.",
    maxHits: 5,
  },
  {
    id: "assigned-secret", group: "Secret exposure", severity: "high",
    pattern: /(api[_-]?key|secret|token|password|passwd|pwd|client_secret)\s*[:=]\s*['"]?[A-Za-z0-9_\-./+]{16,}['"]?/i,
    title: "Secret assigned to a variable",
    advice: "Replace hardcoded values with ${ENV_VAR} placeholders and document them in a .env.example.",
    maxHits: 8,
  },
  {
    id: "entropy", group: "Secret exposure", severity: "medium",
    pattern: /['"][A-Za-z0-9+/=]{40,}['"]/, title: "Long high-entropy string",
    advice: "This looks like it could be a token or hash. If it is a real secret, rotate it and remove it.",
    maxHits: 5,
  },
  // ---- dangerous commands ----
  {
    id: "rm-rf", group: "Dangerous command", severity: "critical",
    pattern: /\brm\s+-[a-z]*r[a-z]*f\b/, title: "Recursive forced delete (rm -rf)",
    advice: "Telling an agent to rm -rf is risky - scope deletes to explicit paths and require confirmation for anything outside the project.",
    maxHits: 5,
  },
  {
    id: "curl-bash", group: "Dangerous command", severity: "critical",
    pattern: /\b(curl|wget)\b[^|\n]*\|\s*(sudo\s+)?(bash|sh)\b/, title: "Piping a download straight into a shell",
    advice: "curl | bash executes remote code unseen. Pin a version, verify a checksum, or vendor the script instead.",
    maxHits: 5,
  },
  {
    id: "dd-mkfs", group: "Dangerous command", severity: "critical",
    pattern: /\b(dd\s+.*of=\/dev|mkfs\b)/, title: "Raw disk write or format",
    advice: "This can destroy a drive. Never let an agent run it without explicit, case-by-case approval.",
    maxHits: 5,
  },
  {
    id: "forkbomb", group: "Dangerous command", severity: "critical",
    pattern: /:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;/, title: "Fork bomb",
    advice: "Remove this. It crashes the host by spawning processes forever.",
    maxHits: 3,
  },
  {
    id: "sudo", group: "Dangerous command", severity: "high",
    pattern: /\bsudo\b/, title: "sudo usage",
    advice: "Agents running as root can change anything. Prefer user-level commands and approve sudo one at a time.",
    maxHits: 5,
  },
  {
    id: "chmod777", group: "Dangerous command", severity: "high",
    pattern: /\bchmod\s+(-R\s+)?777\b/, title: "chmod 777",
    advice: "777 makes files world-writable. Use 755/644 or a group permission instead.",
    maxHits: 5,
  },
  {
    id: "eval", group: "Dangerous command", severity: "high",
    pattern: /\beval\s*\(/, title: "eval()",
    advice: "eval runs strings as code. Avoid it, and never let an agent eval untrusted text.",
    maxHits: 5,
  },
  {
    id: "no-verify", group: "Dangerous command", severity: "medium",
    pattern: /--no-verify\b/, title: "Bypassing git hooks (--no-verify)",
    advice: "Hooks often run tests and linters. Skipping them should be the exception, not the default rule.",
    maxHits: 5,
  },
  {
    id: "force-push", group: "Dangerous command", severity: "medium",
    pattern: /git\s+push\s+(-f|--force)/, title: "Force push",
    advice: "Force pushes rewrite shared history. Prefer --force-with-lease and only on personal branches.",
    maxHits: 5,
  },
  {
    id: "clean-fd", group: "Dangerous command", severity: "medium",
    pattern: /git\s+clean\s+-[a-z]*f[a-z]*d/, title: "git clean -fd",
    advice: "This deletes untracked files permanently. Never set it as an automatic cleanup step.",
    maxHits: 5,
  },
  {
    id: "reset-hard", group: "Dangerous command", severity: "medium",
    pattern: /git\s+reset\s+--hard/, title: "git reset --hard",
    advice: "Discards all uncommitted work. Fine to run manually, risky as a standing agent instruction.",
    maxHits: 5,
  },
  // ---- overly permissive rules ----
  {
    id: "always-sudo", group: "Overly permissive rule", severity: "high",
    pattern: /always\s+(run\s+)?(with\s+|use\s+)?sudo|sudo\s+for\s+everything/i, title: "\"Always use sudo\"",
    advice: "Blanket sudo permission removes the last guardrail. Require the agent to explain and ask first.",
    maxHits: 3,
  },
  {
    id: "never-ask", group: "Overly permissive rule", severity: "high",
    pattern: /never\s+ask|without\s+(asking|confirmation)|skip\s+(all\s+)?confirmation|always\s+approve/i,
    title: "\"Never ask\" / skip confirmations",
    advice: "Confirmations are the safety net for destructive actions. Keep them for deletes, deploys and payments.",
    maxHits: 5,
  },
  {
    id: "auto-push", group: "Overly permissive rule", severity: "medium",
    pattern: /always\s+(commit\s+and\s+)?push|auto[-\s]?commit|push\s+without\s+review/i, title: "Automatic commit and push",
    advice: "Auto-pushing sends unreviewed code to the remote. Ask the agent to commit locally and let you push.",
    maxHits: 5,
  },
  {
    id: "bypass-sec", group: "Overly permissive rule", severity: "medium",
    pattern: /bypass\s+(security|auth)|disable\s+(security|auth|firewall)|ignore\s+(all\s+)?(security\s+)?warnings/i,
    title: "Disabling security controls",
    advice: "Do not normalize disabling security tooling. Fix the underlying issue instead.",
    maxHits: 5,
  },
  {
    id: "ignore-errors", group: "Overly permissive rule", severity: "medium",
    pattern: /ignore\s+(all\s+)?errors|continue\s+on\s+(error|failure)/i, title: "\"Ignore errors\"",
    advice: "Ignoring errors hides real breakage. Prefer failing loudly with a clear message.",
    maxHits: 5,
  },
  // ---- injection-ish ----
  {
    id: "ignore-prev", group: "Possible injection", severity: "high",
    pattern: /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i, title: "\"Ignore previous instructions\"",
    advice: "This is the classic prompt-injection pattern. If you did not write it yourself, find where it came from.",
    maxHits: 3,
  },
  {
    id: "reveal-system", group: "Possible injection", severity: "medium",
    pattern: /reveal\s+(your\s+)?system\s+prompt|print\s+(your\s+)?system\s+prompt/i, title: "Asking to reveal the system prompt",
    advice: "Harmless in your own config, but it is a known exfiltration probe in shared prompts. Keep it out.",
    maxHits: 3,
  },
  {
    id: "internal-ip", group: "Possible injection", severity: "low",
    pattern: /\b(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b/,
    title: "Internal IP address",
    advice: "Internal addresses leak network layout. Fine for a personal setup, risky in a shared or public config.",
    maxHits: 5,
  },
];

interface Finding {
  check: Check;
  line: number;
  snippet: string;
}

const PENALTY: Record<Severity, number> = { critical: 20, high: 10, medium: 5, low: 2 };

function scan(text: string): Finding[] {
  const lines = text.split("\n");
  const findings: Finding[] = [];
  for (const check of CHECKS) {
    let hits = 0;
    for (let i = 0; i < lines.length && hits < check.maxHits; i++) {
      const line = lines[i];
      if (line === undefined) continue;
      const m = check.pattern.exec(line);
      if (m) {
        const start = Math.max(0, (m.index ?? 0) - 24);
        findings.push({
          check,
          line: i + 1,
          snippet: line.slice(start, start + 90).trim() || "(match)",
        });
        hits++;
      }
    }
  }
  findings.sort((a, b) => {
    const order: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return order[a.check.severity] - order[b.check.severity] || a.line - b.line;
  });
  return findings;
}

const SEV_STYLE: Record<Severity, string> = {
  critical: "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400",
  high: "border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400",
  medium: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  low: "border-slate-500/40 bg-slate-500/10 text-slate-500",
};

function grade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

function ClaudeMdScannerTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("claude-md-scanner", isPro);
  const seo = toolSeo;

  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [scanned, setScanned] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const findings = useMemo(() => (scanned && text.trim() ? scan(text) : []), [scanned, text]);
  const score = useMemo(() => {
    if (!scanned || !text.trim()) return 100;
    return Math.max(0, 100 - findings.reduce((a, f) => a + PENALTY[f.check.severity], 0));
  }, [scanned, text, findings]);

  const runScan = useCallback(() => {
    if (!text.trim() || !trial.canUse) return;
    trial.recordUse();
    setScanned(true);
  }, [text, trial]);

  const acceptFile = useCallback(async (f: File) => {
    const content = await f.text();
    setText(content.slice(0, 200_000));
    setName(f.name);
    setScanned(false);
    toast.success(`Loaded ${f.name}`);
  }, []);

  const copyReport = useCallback(async () => {
    if (!scanned) return;
    const lines = [
      `CLAUDE.md scan report - score ${score}/100 (grade ${grade(score)})`,
      `Findings: ${findings.length}`,
      "",
      ...findings.map((f) => `[${f.check.severity.toUpperCase()}] ${f.check.title} (line ${f.line}): ${f.snippet}`),
      "",
      "Note: heuristic pattern scan, not a full security audit.",
    ].join("\n");
    try {
      await navigator.clipboard.writeText(lines);
      toast.success("Report copied");
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  }, [scanned, score, findings]);

  const radius = 52;
  const circ = 2 * Math.PI * radius;

  return (
    <ToolPageShell toolId="claude-md-scanner" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="CLAUDE.md Scanner" left={trial.left} />

      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
        <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
          Honest note: this is heuristic pattern matching, not a full security audit.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          It catches common mistakes fast, but a clean score does not mean a file is safe. Nothing you paste ever leaves your browser.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-foreground/80">
              {name ? `Loaded: ${name}` : "Paste your CLAUDE.md or agent config"}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:border-primary/40"
              >
                <FileUp className="h-3.5 w-3.5" /> Load .md
              </button>
              <button
                type="button"
                onClick={() => { setText(""); setName(""); setScanned(false); }}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:border-primary/40"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear
              </button>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".md,.txt,text/markdown,text/plain"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void acceptFile(f); e.target.value = ""; }}
            />
          </div>
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); setScanned(false); }}
            placeholder={"# CLAUDE.md\n\nPaste your agent instructions here...\n\n## Rules\n- Always run tests before pushing\n- ..."}
            rows={18}
            spellCheck={false}
            className="w-full resize-y rounded-xl border border-border bg-background p-4 font-mono text-[13px] leading-relaxed outline-none transition focus:border-primary/60"
          />
          <div className="flex items-center gap-3">
            <ActionButton busy={false} disabled={!text.trim() || !trial.canUse} onClick={runScan}>
              <ScanSearch className="h-4 w-4" /> Scan config
            </ActionButton>
            {scanned && (
              <button
                type="button"
                onClick={copyReport}
                className="flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-muted-foreground transition hover:border-primary/40"
              >
                <Copy className="h-4 w-4" /> Copy report
              </button>
            )}
          </div>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free scans left - everything runs locally in your browser.
            </p>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            {!scanned || !text.trim() ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
                <ShieldAlert className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="font-semibold">Your score appears here</p>
                <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                  Paste a config and run a scan to get a 0-100 safety score and a list of every finding.
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-5">
                <div className="relative h-32 w-32 shrink-0">
                  <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                    <circle cx="60" cy="60" r={radius} fill="none" strokeWidth="10" className="stroke-border" />
                    <circle
                      cx="60"
                      cy="60"
                      r={radius}
                      fill="none"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={circ}
                      strokeDashoffset={circ - (circ * score) / 100}
                      className={cn(
                        score >= 75 ? "stroke-emerald-500" : score >= 40 ? "stroke-amber-500" : "stroke-red-500",
                      )}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-foreground">{score}</span>
                    <span className="text-xs font-bold text-muted-foreground">grade {grade(score)}</span>
                  </div>
                </div>
                <div>
                  <p className="text-lg font-black text-foreground">
                    {findings.length === 0 ? "Clean" : `${findings.length} finding${findings.length === 1 ? "" : "s"}`}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {findings.length === 0
                      ? "No known-dangerous patterns detected. Still review secrets manually."
                      : "Review each finding below and fix the critical ones first."}
                  </p>
                </div>
              </div>
            )}
          </div>

          {scanned && text.trim() && (
            <div className="space-y-3">
              {findings.length === 0 ? (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-sm text-emerald-700 dark:text-emerald-400">
                  No patterns matched. This scan is a first pass only - rotate any secrets you are unsure about and re-read the file with fresh eyes.
                </div>
              ) : (
                findings.map((f, i) => (
                  <div key={`${f.check.id}-${f.line}-${i}`} className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("rounded-md border px-2 py-0.5 text-[11px] font-black uppercase", SEV_STYLE[f.check.severity])}>
                        {f.check.severity}
                      </span>
                      <span className="text-[11px] font-bold text-muted-foreground">{f.check.group}</span>
                      <span className="ml-auto text-[11px] font-bold text-muted-foreground">line {f.line}</span>
                    </div>
                    <p className="mt-2 font-bold text-foreground">{f.check.title}</p>
                    <p className="mt-1 rounded-lg bg-muted/60 px-3 py-2 font-mono text-xs text-muted-foreground">{f.snippet}</p>
                    <p className="mt-2 flex gap-1.5 text-xs text-muted-foreground">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {f.check.advice}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
