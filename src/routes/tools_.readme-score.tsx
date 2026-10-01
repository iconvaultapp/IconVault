// /tools/readme-score - Grade a README against 16 proven practices (title,
// description, badges, screenshots, install, usage, API, contributing,
// license, TOC, changelog and more). Runs 100% in the browser.

import { useCallback, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, CircleAlert, FileText, RotateCcw, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/readme-score")({
  head: () => {
    const seo = getToolSeoMeta("readme-score");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: ReadmeScoreTool,
});

interface Check {
  id: string;
  label: string;
  pass: boolean;
  tip: string;
}

function getHeadings(md: string): string[] {
  return md
    .split("\n")
    .filter((l) => /^#{1,6}\s+/.test(l.trim()))
    .map((l) => l.trim());
}

function headingMatch(headings: string[], words: string[]): boolean {
  return headings.some((h) => words.some((w) => h.toLowerCase().includes(w)));
}

function analyze(md: string): Check[] {
  const text = md;
  const lower = md.toLowerCase();
  const headings = getHeadings(md);
  const checks: Check[] = [];

  const firstHeading = headings.find((h) => h.startsWith("# "));
  checks.push({
    id: "title",
    label: "Clear H1 title",
    pass: !!firstHeading,
    tip: "Start with a single H1 (a # line) that states exactly what the project does.",
  });

  const afterTitle = firstHeading ? text.slice(text.indexOf(firstHeading) + firstHeading.length, text.indexOf(firstHeading) + 1200) : text.slice(0, 1200);
  const firstPara = afterTitle.replace(/^[\s#*\-\n]+/, "").split(/\n\s*\n/)[0] ?? "";
  checks.push({
    id: "description",
    label: "One-paragraph description",
    pass: firstPara.replace(/[#*_`[\]]/g, "").trim().length >= 60,
    tip: "Add one plain-language paragraph under the title: what it is, who it is for, why it matters.",
  });

  checks.push({
    id: "badges",
    label: "Status badges",
    pass: /img\.shields\.io|shields\.io\/badge|!\[[^\]]*badge[^\]]*\]|!\[[^\]]*\]\(.*badge.*\)/i.test(text.slice(0, 1500)),
    tip: "Add shields.io badges (build status, version, license) near the top so visitors trust the project instantly.",
  });

  checks.push({
    id: "screenshots",
    label: "Screenshots or demo",
    pass: /!\[[^\]]*\]\(|<img/i.test(text) || /gif|youtube\.com|youtu\.be|loom\.com|demo/i.test(text),
    tip: "Show the product: add a screenshot, GIF demo or video link high up in the README.",
  });

  checks.push({
    id: "install",
    label: "Installation section",
    pass: headingMatch(headings, ["install", "setup", "getting started", "prerequisite"]),
    tip: "Add an 'Installation' section with copy-paste commands for every supported platform.",
  });

  checks.push({
    id: "usage",
    label: "Usage / quick start",
    pass: headingMatch(headings, ["usage", "quick start", "quickstart", "example", "getting started"]),
    tip: "Add a 'Usage' or 'Quick start' section showing the smallest working example.",
  });

  checks.push({
    id: "api",
    label: "API reference",
    pass: headingMatch(headings, ["api", "reference", "props", "options", "configuration"]),
    tip: "Document the API (functions, props, options) in a reference section or link to hosted docs.",
  });

  checks.push({
    id: "contributing",
    label: "Contributing guide",
    pass: headingMatch(headings, ["contributing", "contribute", "development", "contributors"]) || /contributing\.md/i.test(text),
    tip: "Tell contributors how to help: dev setup, PR process, code style.",
  });

  checks.push({
    id: "license",
    label: "License section",
    pass: headingMatch(headings, ["license"]) || /mit|apache-2\.0|gpl|bsd/i.test(text.slice(0, 3000)),
    tip: "State the license (MIT, Apache 2.0...) so users know what they may do with the code.",
  });

  checks.push({
    id: "toc",
    label: "Table of contents",
    pass: headingMatch(headings, ["table of contents", "contents"]) || (text.match(/\]\(#[\w-]+\)/g) ?? []).length >= 4,
    tip: "Long READMEs need a table of contents with anchor links so readers can jump around.",
  });

  checks.push({
    id: "changelog",
    label: "Changelog",
    pass: headingMatch(headings, ["changelog", "release", "what's new", "history"]) || /changelog\.md|releases/i.test(text),
    tip: "Keep a changelog (or link to Releases) so users can see what changed between versions.",
  });

  checks.push({
    id: "docs",
    label: "Links to full docs / site",
    pass: /documentation|full docs|docs:|live demo|website/i.test(text) && /https?:\/\//.test(text),
    tip: "Link out to full documentation, a live demo or the project website.",
  });

  checks.push({
    id: "code",
    label: "Syntax-highlighted code samples",
    pass: /```(js|ts|javascript|typescript|python|py|bash|sh|go|rust|java|php|ruby|c|cpp|json|yaml)/i.test(text),
    tip: "Use fenced code blocks with a language tag (```js) so examples render with syntax highlighting.",
  });

  checks.push({
    id: "length",
    label: "Substantial content",
    pass: text.trim().length >= 1000,
    tip: "Expand the README: aim for at least a few full sections, not just a title and a line.",
  });

  checks.push({
    id: "structure",
    label: "Well-structured with headings",
    pass: headings.length >= 5,
    tip: "Break the README into sections with headings; 5 or more keeps long docs scannable.",
  });

  checks.push({
    id: "support",
    label: "Support / contact",
    pass: headingMatch(headings, ["support", "contact", "help", "faq", "troubleshoot"]) || /issues|discord|mailto:/i.test(text),
    tip: "Tell users where to get help: issues page, discussions, chat or email.",
  });

  return checks;
}

function grade(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 50) return "Needs work";
  return "Bare bones";
}

function ReadmeScoreTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("readme-score", isPro);
  const seo = getToolSeo("readme-score");

  const [md, setMd] = useState("");
  const [checks, setChecks] = useState<Check[] | null>(null);

  const run = useCallback(() => {
    if (!md.trim()) {
      toast.error("Paste your README markdown first.");
      return;
    }
    if (!trial.canUse) {
      toast.error("Trial limit reached. Go Pro for unlimited scans.");
      return;
    }
    setChecks(analyze(md));
    trial.recordUse();
  }, [md, trial]);

  const passed = checks ? checks.filter((c) => c.pass).length : 0;
  const score = checks ? Math.round((passed / checks.length) * 100) : 0;

  return (
    <ToolPageShell toolId="readme-score" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="README Score" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div>
            <label htmlFor="readme-input" className="mb-2 block text-[13px] font-medium text-foreground/80">
              Paste your README markdown
            </label>
            <textarea
              id="readme-input"
              value={md}
              onChange={(e) => setMd(e.target.value)}
              rows={16}
              placeholder={"# My Project\n\nOne paragraph about what this does...\n\n## Installation\n..."}
              className="w-full resize-y rounded-xl border border-border bg-background p-3 font-mono text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary/60"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {md.length.toLocaleString()} characters - everything stays in your browser.
            </p>
          </div>
          <div className="flex gap-2">
            <ActionButton busy={false} disabled={!md.trim() || !trial.canUse} onClick={run}>
              <FileText className="h-4 w-4" /> Grade my README
            </ActionButton>
            {checks && (
              <button
                type="button"
                onClick={() => setChecks(null)}
                className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
              >
                <RotateCcw className="h-4 w-4" /> Reset
              </button>
            )}
          </div>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free scans left.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {!checks ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <FileText className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your score appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                We check 16 practices used by the most-starred open-source projects, then tell you exactly what to add.
              </p>
            </div>
          ) : (
            <div>
              <div className="mb-5 flex items-center gap-4">
                <div
                  className={cn(
                    "flex h-20 w-20 items-center justify-center rounded-2xl text-2xl font-black",
                    score >= 75 ? "bg-green-500/10 text-green-600" : score >= 50 ? "bg-amber-500/10 text-amber-600" : "bg-red-500/10 text-red-500",
                  )}
                >
                  {score}
                </div>
                <div>
                  <p className="text-lg font-bold">{grade(score)}</p>
                  <p className="text-sm text-muted-foreground">
                    {passed} of {checks.length} practices passed
                  </p>
                </div>
              </div>
              <div className="mb-4 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full transition-all", score >= 75 ? "bg-green-500" : score >= 50 ? "bg-amber-500" : "bg-red-500")}
                  style={{ width: `${score}%` }}
                />
              </div>
              <ul className="space-y-2.5">
                {checks.map((c) => (
                  <li key={c.id} className="rounded-xl border border-border p-3">
                    <div className="flex items-start gap-2.5">
                      {c.pass ? (
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                      ) : (
                        <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                      )}
                      <div>
                        <p className="text-sm font-semibold">{c.label}</p>
                        {!c.pass && (
                          <p className="mt-0.5 flex items-start gap-1 text-xs text-muted-foreground">
                            <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                            {c.tip}
                          </p>
                        )}
                      </div>
                    </div>
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
