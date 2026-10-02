// /tools/claudemd-builder - 7-step wizard that generates a CLAUDE.md project-memory
// file from your project details, following CLAUDE.md best practices.

import { useCallback, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, ClipboardCopy, Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/claudemd-builder")({
  head: () => {
    const seo = getToolSeoMeta("claudemd-builder");
    const canonical = "https://iconvault.site/tools/claudemd-builder";
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
  component: ClaudeMdBuilder,
});

const STEPS = [
  "Project basics",
  "Commands",
  "Code style",
  "Architecture",
  "Testing",
  "Rules and gotchas",
  "Review and export",
] as const;

interface Form {
  name: string;
  stack: string;
  description: string;
  devCmd: string;
  buildCmd: string;
  testCmd: string;
  lintCmd: string;
  styleRules: string;
  archNotes: string;
  keyDirs: string;
  testRules: string;
  gotchas: string;
}

const EMPTY: Form = {
  name: "",
  stack: "",
  description: "",
  devCmd: "",
  buildCmd: "",
  testCmd: "",
  lintCmd: "",
  styleRules: "",
  archNotes: "",
  keyDirs: "",
  testRules: "",
  gotchas: "",
};

function buildMarkdown(f: Form): string {
  const L: string[] = [];
  L.push(`# CLAUDE.md`);
  L.push(``);
  L.push(`This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.`);
  L.push(``);
  if (f.description.trim()) {
    L.push(`## Project overview`);
    L.push(``);
    L.push(f.description.trim());
    L.push(``);
  }
  if (f.stack.trim()) {
    L.push(`## Tech stack`);
    L.push(``);
    L.push(`- ${f.stack.trim().split("\n").join("\n- ")}`);
    L.push(``);
  }
  const cmds: [string, string][] = [
    ["Dev", f.devCmd],
    ["Build", f.buildCmd],
    ["Test", f.testCmd],
    ["Lint", f.lintCmd],
  ];
  if (cmds.some(([, c]) => c.trim())) {
    L.push(`## Commands`);
    L.push(``);
    for (const [label, cmd] of cmds) {
      if (cmd.trim()) L.push(`- ${label}: \`${cmd.trim()}\``);
    }
    L.push(``);
  }
  if (f.styleRules.trim()) {
    L.push(`## Code style`);
    L.push(``);
    L.push(...f.styleRules.trim().split("\n").map((l) => (l.startsWith("-") ? l : `- ${l}`)));
    L.push(``);
  }
  if (f.archNotes.trim() || f.keyDirs.trim()) {
    L.push(`## Architecture`);
    L.push(``);
    if (f.archNotes.trim()) {
      L.push(...f.archNotes.trim().split("\n"));
      L.push(``);
    }
    if (f.keyDirs.trim()) {
      L.push(`Key directories:`);
      L.push(``);
      L.push(...f.keyDirs.trim().split("\n").map((l) => (l.startsWith("-") ? l : `- \`${l.trim()}\``)));
      L.push(``);
    }
  }
  if (f.testRules.trim()) {
    L.push(`## Testing`);
    L.push(``);
    L.push(...f.testRules.trim().split("\n").map((l) => (l.startsWith("-") ? l : `- ${l}`)));
    L.push(``);
  }
  if (f.gotchas.trim()) {
    L.push(`## Rules and gotchas`);
    L.push(``);
    L.push(...f.gotchas.trim().split("\n").map((l) => (l.startsWith("-") ? l : `- ${l}`)));
    L.push(``);
  }
  L.push(`---`);
  L.push(``);
  L.push(`Generated with IconVault's CLAUDE.md Builder.`);
  return L.join("\n");
}

function Field({ label, hint, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">{label}</label>
      <input
        {...props}
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
      />
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Area({ label, hint, value, onChange, rows = 4, placeholder }: {
  label: string; hint?: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
      />
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ClaudeMdBuilder() {
  const { isPro } = usePlan();
  const trial = useToolTrial("claudemd-builder", isPro);
  const seo = getToolSeo("claudemd-builder");

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>(EMPTY);

  const set = useCallback((k: keyof Form, v: string) => setForm((p) => ({ ...p, [k]: v })), []);
  const markdown = useMemo(() => buildMarkdown(form), [form]);
  const hasContent = useMemo(
    () => Object.values(form).some((v) => v.trim()),
    [form],
  );

  const copy = useCallback(async () => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(markdown);
      trial.recordUse();
      toast.success("CLAUDE.md copied to clipboard");
    } catch {
      toast.error("Could not access the clipboard.");
    }
  }, [markdown, trial]);

  const download = useCallback(() => {
    if (!trial.canUse) return;
    downloadBlob(new Blob([markdown], { type: "text/markdown" }), "CLAUDE.md");
    trial.recordUse();
    toast.success("CLAUDE.md downloaded");
  }, [markdown, trial]);

  return (
    <ToolPageShell toolId="claudemd-builder" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="CLAUDE.md Builder" left={trial.left} />

      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center gap-2 overflow-x-auto">
          {STEPS.map((s, i) => (
            <div key={s} className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setStep(i)}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition",
                  i === step ? "bg-primary text-primary-foreground"
                    : i < step ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground",
                )}
              >
                {i + 1}
              </button>
              <span className={cn("text-xs font-semibold", i === step ? "text-foreground" : "text-muted-foreground")}>
                {s}
              </span>
              {i < STEPS.length - 1 && <div className="h-px w-6 bg-border" />}
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          {step === 0 && (
            <div className="space-y-4">
              <Field label="Project name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="my-app" />
              <Area label="Tech stack" hint="One per line: languages, frameworks, databases." value={form.stack} onChange={(v) => set("stack", v)} rows={3} placeholder={"TypeScript\nReact 19 + Vite\nPostgreSQL"} />
              <Area label="What does this project do?" hint="2-3 sentences. This becomes the overview section." value={form.description} onChange={(v) => set("description", v)} rows={3} placeholder="A dashboard that tracks…" />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <Field label="Dev command" value={form.devCmd} onChange={(e) => set("devCmd", e.target.value)} placeholder="bun run dev" hint="How to start the project locally." />
              <Field label="Build command" value={form.buildCmd} onChange={(e) => set("buildCmd", e.target.value)} placeholder="bun run build" />
              <Field label="Test command" value={form.testCmd} onChange={(e) => set("testCmd", e.target.value)} placeholder="bun test" />
              <Field label="Lint / typecheck command" value={form.lintCmd} onChange={(e) => set("lintCmd", e.target.value)} placeholder="bun run lint" />
            </div>
          )}

          {step === 2 && (
            <Area label="Code style rules" hint="One per line: naming, formatting, patterns to follow." value={form.styleRules} onChange={(v) => set("styleRules", v)} rows={6}
              placeholder={"Use kebab-case file names\nPrefer early returns over nested ifs\nNo emojis in UI copy\nTailwind for all styling"} />
          )}

          {step === 3 && (
            <div className="space-y-4">
              <Area label="Architecture notes" hint="How the code is organized, key patterns." value={form.archNotes} onChange={(v) => set("archNotes", v)} rows={4}
                placeholder="Feature folders under src/features. API routes in src/routes/api. Shared UI in src/components." />
              <Area label="Key directories" hint="One per line." value={form.keyDirs} onChange={(v) => set("keyDirs", v)} rows={3} placeholder={"src/routes\nsrc/lib\nsrc/components"} />
            </div>
          )}

          {step === 4 && (
            <Area label="Testing rules" hint="How tests run, what must be tested, coverage bar." value={form.testRules} onChange={(v) => set("testRules", v)} rows={6}
              placeholder={"Run bun test before every commit\nNew features need unit tests\nKeep coverage above 80%"} />
          )}

          {step === 5 && (
            <Area label="Rules and gotchas" hint="Things Claude must never do, known traps." value={form.gotchas} onChange={(v) => set("gotchas", v)} rows={6}
              placeholder={"Never commit .env files\nDo not rename database columns without a migration\nAlways run prebuild before build"} />
          )}

          {step === 6 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <p className="font-semibold">Your CLAUDE.md preview</p>
              </div>
              {hasContent ? (
                <pre className="max-h-96 overflow-auto rounded-xl bg-muted/60 p-4 text-xs leading-relaxed">{markdown}</pre>
              ) : (
                <p className="rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">
                  You skipped every step. Go back and fill in at least one field to generate a useful CLAUDE.md.
                </p>
              )}
              <div className="flex flex-wrap gap-3">
                <ActionButton disabled={!trial.canUse || !hasContent} onClick={copy}>
                  <ClipboardCopy className="h-4 w-4" /> Copy markdown
                </ActionButton>
                <button
                  type="button"
                  disabled={!trial.canUse || !hasContent}
                  onClick={download}
                  className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:border-primary/40 disabled:opacity-50"
                >
                  <Download className="h-4 w-4" /> Download CLAUDE.md
                </button>
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between border-t border-border pt-5">
            <button
              type="button"
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-semibold disabled:opacity-40"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <span className="text-xs text-muted-foreground">Step {step + 1} of {STEPS.length}</span>
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
              >
                Next <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <span className="text-xs text-muted-foreground">Copy or download above</span>
            )}
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
