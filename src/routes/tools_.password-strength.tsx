// /tools/password-strength - Local password entropy analysis with
// crack-time estimates for three attacker speeds, a 5-bar meter and tips.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/password-strength")({
  head: () => {
    const seo = getToolSeoMeta("password-strength");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: StrengthTool,
});

function poolSize(pw: string): { pool: number; classes: string[] } {
  let pool = 0;
  const classes: string[] = [];
  if (/[a-z]/.test(pw)) { pool += 26; classes.push("lowercase"); }
  if (/[A-Z]/.test(pw)) { pool += 26; classes.push("uppercase"); }
  if (/[0-9]/.test(pw)) { pool += 10; classes.push("digits"); }
  if (/[^a-zA-Z0-9]/.test(pw)) { pool += 32; classes.push("symbols"); }
  return { pool, classes };
}

function humanTime(seconds: number): string {
  if (!isFinite(seconds)) return "practically forever";
  if (seconds < 1) return "instantly";
  const units: [string, number][] = [
    ["second", 60], ["minute", 3600], ["hour", 86400], ["day", 2592000],
    ["month", 31536000], ["year", 3153600000], ["century", 315360000000],
  ];
  let idx = 0;
  while (idx < units.length - 1 && seconds >= units[idx + 1]![1]) idx++;
  const [name] = units[idx]!;
  const v = Math.floor(seconds / (idx === 0 ? 1 : units[idx - 1]![1]));
  if (name === "century" && v > 999) return `${(seconds / 315360000000).toExponential(1)} centuries`;
  return `${v.toLocaleString()} ${name}${v === 1 ? "" : "s"}`;
}

interface Analysis {
  bits: number;
  score: number;
  verdict: string;
  classes: string[];
  guesses: number;
  tips: string[];
}

function analyze(pw: string): Analysis {
  const { pool, classes } = poolSize(pw);
  const bits = pool > 0 ? pw.length * Math.log2(pool) : 0;
  const guesses = Math.pow(2, bits - 1);
  const score = bits < 40 ? 1 : bits < 60 ? 2 : bits < 80 ? 3 : bits < 110 ? 4 : 5;
  const verdict = ["", "Very weak", "Weak", "Fair", "Strong", "Very strong"][score]!;

  const tips: string[] = [];
  if (pw.length < 12) tips.push(`Make it longer - at least 12 characters (currently ${pw.length}). Length beats complexity.`);
  if (!classes.includes("lowercase") || !classes.includes("uppercase")) tips.push("Mix upper and lower case letters.");
  if (!classes.includes("digits")) tips.push("Add digits.");
  if (!classes.includes("symbols")) tips.push("Add symbols like ! # $ % for the biggest pool boost.");
  if (/(.)\1\1/.test(pw)) tips.push("Avoid repeated characters like \"aaa\" - they add length without adding entropy.");
  if (/^(password|qwerty|123456|letmein|welcome|admin|abc123)/i.test(pw)) tips.push("This starts like a known common password - attackers try those first.");
  if (/\d{4}$/.test(pw)) tips.push("A year or number at the end is a common pattern attackers expect.");
  if (tips.length === 0) tips.push("Solid. Consider a memorable passphrase (4+ random words) - easier to remember, harder to crack.");
  return { bits, score, verdict, classes, guesses, tips };
}

const SPEEDS = [
  { name: "Online attack", rate: 10, note: "login form rate limit" },
  { name: "Slow hash (bcrypt)", rate: 10_000, note: "stolen bcrypt database" },
  { name: "Fast hash (SHA-1)", rate: 10_000_000_000, note: "stolen SHA-1/MD5 database, GPU rig" },
] as const;

function StrengthTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("password-strength", isPro);
  const seo = getToolSeo("password-strength");

  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [checked, setChecked] = useState(false);

  const analysis = useMemo(() => (password ? analyze(password) : null), [password]);

  const check = () => {
    if (!trial.canUse || !password) return;
    setChecked(true);
    trial.recordUse();
    toast.success("Password analyzed locally");
  };

  const barColors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-lime-500", "bg-green-500"];

  return (
    <ToolPageShell toolId="password-strength" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Password Strength" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Password</label>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setChecked(false); }}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 pr-11 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary/60"
                placeholder="Type a password to test…"
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
            <p className="mt-1.5 text-xs text-muted-foreground">
              Your password is analyzed in this tab only - it is never sent, stored or logged.
            </p>
          </div>

          {analysis && (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[13px] font-medium text-foreground/80">Strength</span>
                <span className="text-sm font-extrabold">{analysis.verdict}</span>
              </div>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((b) => (
                  <div
                    key={b}
                    className={cn(
                      "h-2.5 flex-1 rounded-full",
                      b <= analysis.score ? barColors[analysis.score - 1] : "bg-muted",
                    )}
                  />
                ))}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                <span className="font-bold text-foreground">{analysis.bits.toFixed(1)} bits</span> of entropy
                ({password.length} chars, pool of {poolSize(password).pool})
              </p>
            </div>
          )}

          <ActionButton disabled={!password || !trial.canUse} onClick={check}>
            <ShieldCheck className="h-4 w-4" /> Analyze password
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free runs left - everything stays in your browser.
            </p>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-3 font-bold">Estimated time to crack</h3>
            {!checked || !analysis ? (
              <div className="flex min-h-[140px] flex-col items-center justify-center text-center">
                <ShieldCheck className="mb-2 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Analyze a password to see crack-time estimates</p>
              </div>
            ) : (
              <div className="space-y-3">
                {SPEEDS.map((s) => (
                  <div key={s.name} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/40 px-4 py-3">
                    <div>
                      <p className="text-sm font-bold">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.note}</p>
                    </div>
                    <p className="text-right text-sm font-extrabold">{humanTime(analysis.guesses / s.rate)}</p>
                  </div>
                ))}
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Estimates assume random guessing against the full character pool. Real attackers also try
                  dictionaries, leaks and patterns first - so common words and patterns fall far faster than the
                  math suggests.
                </p>
              </div>
            )}
          </div>

          {checked && analysis && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="mb-3 font-bold">How to make it stronger</h3>
              <ul className="space-y-2">
                {analysis.tips.map((t, i) => (
                  <li key={i} className="flex gap-2.5 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
