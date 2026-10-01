// /tools/commit-generator - Conventional Commits message builder: type,
// scope, subject, body, breaking-change toggle and a gitmoji picker.
// Live preview with the 50-char subject guideline, one-click copy.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, GitCommitHorizontal } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/commit-generator")({
  head: () => {
    const seo = getToolSeoMeta("commit-generator");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: CommitGeneratorTool,
});

const TYPES = [
  { id: "feat", desc: "A new feature" },
  { id: "fix", desc: "A bug fix" },
  { id: "docs", desc: "Documentation only" },
  { id: "style", desc: "Formatting, no code change" },
  { id: "refactor", desc: "Code change, no fix or feature" },
  { id: "perf", desc: "Performance improvement" },
  { id: "test", desc: "Adding or fixing tests" },
  { id: "build", desc: "Build system or deps" },
  { id: "ci", desc: "CI config changes" },
  { id: "chore", desc: "Other maintenance" },
  { id: "revert", desc: "Reverts a previous commit" },
];

const GITMOJIS = [
  { emoji: "✨", name: "sparkles", use: "new feature" },
  { emoji: "🐛", name: "bug", use: "fix a bug" },
  { emoji: "📝", name: "memo", use: "docs" },
  { emoji: "💄", name: "lipstick", use: "UI / style" },
  { emoji: "♻️", name: "recycle", use: "refactor" },
  { emoji: "⚡️", name: "zap", use: "performance" },
  { emoji: "✅", name: "white-check-mark", use: "tests" },
  { emoji: "🔧", name: "wrench", use: "config" },
  { emoji: "🚀", name: "rocket", use: "deploy" },
  { emoji: "⬆️", name: "arrow-up", use: "upgrade deps" },
  { emoji: "⬇️", name: "arrow-down", use: "downgrade deps" },
  { emoji: "🔥", name: "fire", use: "remove code" },
  { emoji: "🎉", name: "tada", use: "initial commit" },
  { emoji: "🔒", name: "lock", use: "security fix" },
];

function CommitGeneratorTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("commit-generator", isPro);
  const seo = getToolSeo("commit-generator");

  const [type, setType] = useState("feat");
  const [scope, setScope] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [breaking, setBreaking] = useState(false);
  const [breakingText, setBreakingText] = useState("");
  const [gitmoji, setGitmoji] = useState("");

  const message = useMemo(() => {
    const s = scope.trim();
    const head = `${gitmoji ? gitmoji + " " : ""}${type}${s ? `(${s})` : ""}${breaking ? "!" : ""}: ${subject.trim() || "<subject>"}`;
    const parts = [head];
    if (body.trim()) parts.push("", body.trim());
    if (breaking && breakingText.trim()) parts.push("", `BREAKING CHANGE: ${breakingText.trim()}`);
    return parts.join("\n");
  }, [type, scope, subject, body, breaking, breakingText, gitmoji]);

  const subjectLen = subject.trim().length;
  const overLimit = subjectLen > 50;

  const copyMsg = async () => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(message);
      trial.recordUse();
      toast.success("Commit message copied");
    } catch {
      toast.error("Copy failed, select the text manually.");
    }
  };

  return (
    <ToolPageShell toolId="commit-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Commit Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-foreground/80">
              <GitCommitHorizontal className="h-4 w-4" /> Commit type
            </p>
            <div className="grid grid-cols-2 gap-2">
              {TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id)}
                  title={t.desc}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-left transition",
                    type === t.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/40",
                  )}
                >
                  <span className="block font-mono text-sm font-bold">{t.id}</span>
                  <span className="block text-[11px] text-muted-foreground">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Scope <span className="text-muted-foreground">(optional)</span></label>
              <input
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                placeholder="auth"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Subject</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="add login with Google"
                maxLength={120}
                className={cn(
                  "w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary",
                  overLimit ? "border-amber-400" : "border-border",
                )}
              />
            </div>
          </div>
          <p className={cn("text-xs", overLimit ? "font-semibold text-amber-600" : "text-muted-foreground")}>
            Subject: {subjectLen}/50 {overLimit ? "- keep it short, move detail to the body" : "characters"}
          </p>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Body <span className="text-muted-foreground">(optional)</span></label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              placeholder="Why this change was needed..."
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </div>

          <div>
            <button
              type="button"
              onClick={() => setBreaking((b) => !b)}
              aria-pressed={breaking}
              className={cn(
                "flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-bold transition",
                breaking ? "border-red-400 bg-red-500/10 text-red-600" : "border-border text-muted-foreground hover:border-red-400/60",
              )}
            >
              Breaking change
              <span className={cn("relative h-5 w-9 rounded-full transition", breaking ? "bg-red-500" : "bg-muted")}>
                <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all", breaking ? "left-[18px]" : "left-0.5")} />
              </span>
            </button>
            {breaking && (
              <textarea
                value={breakingText}
                onChange={(e) => setBreakingText(e.target.value)}
                rows={2}
                placeholder="What breaks and how to migrate..."
                className="mt-2 w-full rounded-xl border border-red-400/60 bg-background px-3 py-2.5 text-sm outline-none focus:border-red-500"
              />
            )}
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Gitmoji <span className="text-muted-foreground">(optional)</span></p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setGitmoji("")}
                className={cn(
                  "rounded-lg border px-2.5 py-1.5 text-xs font-bold transition",
                  gitmoji === "" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                none
              </button>
              {GITMOJIS.map((g) => (
                <button
                  key={g.name}
                  type="button"
                  onClick={() => setGitmoji(g.emoji)}
                  title={`${g.name} - ${g.use}`}
                  className={cn(
                    "rounded-lg border px-2 py-1.5 text-lg leading-none transition",
                    gitmoji === g.emoji ? "border-primary bg-primary/10" : "border-border hover:border-primary/40",
                  )}
                >
                  {g.emoji}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border bg-muted/40 px-5 py-3">
            <p className="text-sm font-bold">Commit message</p>
          </div>
          <pre className="min-h-[220px] flex-1 whitespace-pre-wrap p-5 font-mono text-[13px] leading-relaxed">{message}</pre>
          <div className="border-t border-border p-5">
            <button
              type="button"
              disabled={!trial.canUse}
              onClick={copyMsg}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Copy className="h-4 w-4" /> Copy commit message
            </button>
            {!isPro && (
              <p className="mt-3 text-xs text-muted-foreground">
                Follows the Conventional Commits spec (type, optional scope, subject, body, BREAKING CHANGE footer).
              </p>
            )}
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
