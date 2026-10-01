// /tools/heading-visualizer - Paste HTML and see the H1-H6 outline as an
// indented tree. Flags skipped levels, multiple H1s and empty headings.
// Runs 100% in the browser.

import { useCallback, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, CircleAlert, Copy, ListTree, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/heading-visualizer")({
  head: () => {
    const seo = getToolSeoMeta("heading-visualizer");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: HeadingVisualizerTool,
});

interface Heading {
  level: number;
  text: string;
  issues: string[];
}

interface Outline {
  headings: Heading[];
  warnings: string[];
}

function buildOutline(html: string): Outline {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const nodes = Array.from(doc.querySelectorAll("h1, h2, h3, h4, h5, h6"));
  const headings: Heading[] = [];
  const warnings: string[] = [];
  const h1Count = nodes.filter((n) => n.tagName === "H1").length;

  if (h1Count === 0) warnings.push("No H1 found. Every page should have exactly one H1 as its main title.");
  if (h1Count > 1) warnings.push(`${h1Count} H1 tags found. Use exactly one H1 per page and H2s for sections.`);

  let prevLevel = 0;
  for (const node of nodes) {
    const level = parseInt(node.tagName.slice(1), 10);
    const text = (node.textContent ?? "").trim().replace(/\s+/g, " ");
    const issues: string[] = [];
    if (text.length === 0) {
      issues.push("Empty heading - screen readers announce a heading with no name.");
    }
    if (prevLevel > 0 && level > prevLevel + 1) {
      issues.push(`Skipped level: jumped from H${prevLevel} to H${level}. Fill in H${prevLevel + 1} first.`);
    }
    if (level === 1 && prevLevel > 0) {
      issues.push("H1 appears after other headings. The H1 should be the first heading on the page.");
    }
    headings.push({ level, text, issues });
    prevLevel = level;
  }

  return { headings, warnings };
}

function HeadingVisualizerTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("heading-visualizer", isPro);
  const seo = getToolSeo("heading-visualizer");

  const [html, setHtml] = useState("");
  const [outline, setOutline] = useState<Outline | null>(null);

  const run = useCallback(() => {
    if (!html.trim()) {
      toast.error("Paste some HTML first.");
      return;
    }
    if (!trial.canUse) {
      toast.error("Trial limit reached. Go Pro for unlimited scans.");
      return;
    }
    const result = buildOutline(html);
    if (result.headings.length === 0) {
      toast.error("No H1-H6 tags found in that HTML.");
      return;
    }
    setOutline(result);
    trial.recordUse();
  }, [html, trial]);

  const copyOutline = useCallback(() => {
    if (!outline) return;
    const lines = outline.headings.map((h) => `${"#".repeat(h.level)} ${h.text || "(empty)"}`);
    void navigator.clipboard.writeText(lines.join("\n")).then(() => toast.success("Outline copied as text"));
  }, [outline]);

  return (
    <ToolPageShell toolId="heading-visualizer" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Heading Visualizer" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div>
            <label htmlFor="html-input" className="mb-2 block text-[13px] font-medium text-foreground/80">
              Paste your HTML
            </label>
            <textarea
              id="html-input"
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              rows={16}
              placeholder={"<h1>My Page Title</h1>\n<h2>Introduction</h2>\n<h3>Details</h3>"}
              className="w-full resize-y rounded-xl border border-border bg-background p-3 font-mono text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary/60"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {html.length.toLocaleString()} characters - parsed locally, nothing is sent anywhere.
            </p>
          </div>
          <div className="flex gap-2">
            <ActionButton busy={false} disabled={!html.trim() || !trial.canUse} onClick={run}>
              <ListTree className="h-4 w-4" /> Visualize headings
            </ActionButton>
            {outline && (
              <button
                type="button"
                onClick={copyOutline}
                className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
              >
                <Copy className="h-4 w-4" /> Copy outline
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
          {!outline ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <ListTree className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your heading tree appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Headings are the table of contents for screen readers and search engines. See your page the way they do.
              </p>
            </div>
          ) : (
            <div>
              {outline.warnings.length > 0 && (
                <div className="mb-4 space-y-2">
                  {outline.warnings.map((w, i) => (
                    <p key={i} className="flex items-start gap-2 rounded-xl bg-red-500/10 p-3 text-sm font-medium text-red-500">
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> {w}
                    </p>
                  ))}
                </div>
              )}
              <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                {outline.headings.length} headings found
              </div>
              <ol className="space-y-1">
                {outline.headings.map((h, i) => (
                  <li
                    key={i}
                    style={{ marginLeft: `${(h.level - 1) * 1.5}rem` }}
                    className={cn(
                      "rounded-lg border p-2.5",
                      h.issues.length > 0 ? "border-amber-500/50 bg-amber-500/5" : "border-border",
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={cn(
                          "shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px] font-bold",
                          h.level === 1 ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                        )}
                      >
                        H{h.level}
                      </span>
                      <div className="min-w-0">
                        <p className={cn("truncate text-sm font-medium", h.text ? "" : "italic text-muted-foreground")}>
                          {h.text || "(empty heading)"}
                        </p>
                        {h.issues.map((issue, j) => (
                          <p key={j} className="mt-1 flex items-start gap-1 text-xs text-amber-600">
                            <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {issue}
                          </p>
                        ))}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
