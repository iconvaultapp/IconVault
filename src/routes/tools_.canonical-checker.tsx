// /tools/canonical-checker - Paste a page's HTML and audit its canonical tag,
// title, meta description and robots directives. 100% client-side.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Link2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/canonical-checker";
import toolSeoMeta from "@/lib/tool-seo-meta-data/canonical-checker";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/canonical-checker")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/canonical-checker";
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
  component: CanonicalTool,
});

type Severity = "error" | "warning" | "ok";

interface Issue { severity: Severity; title: string; detail: string; }
interface Result {
  canonical: string | null;
  canonicalCount: number;
  title: string | null;
  description: string | null;
  robots: string | null;
  issues: Issue[];
}

function analyze(html: string): Result {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const links = [...doc.querySelectorAll('link[rel="canonical"]')];
  const canonical = links[0]?.getAttribute("href")?.trim() || null;
  const title = doc.querySelector("title")?.textContent?.trim() || null;
  const description = doc.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() || null;
  const robots = doc.querySelector('meta[name="robots"]')?.getAttribute("content")?.trim().toLowerCase() || null;

  const issues: Issue[] = [];
  const ok: Issue = { severity: "ok", title: "", detail: "" };

  if (links.length === 0) {
    issues.push({
      severity: "error",
      title: "Missing canonical tag",
      detail: "No <link rel=\"canonical\"> found. Every indexable page should declare one to avoid duplicate-content issues.",
    });
  } else {
    if (links.length > 1) {
      issues.push({
        severity: "error",
        title: `${links.length} canonical tags found`,
        detail: "Only one canonical is allowed. Extra tags are ignored by Google, which may pick the wrong one.",
      });
    } else {
      issues.push({ ...ok, title: "Canonical present", detail: canonical ?? "" });
    }
    if (canonical) {
      if (!/^https?:\/\//i.test(canonical)) {
        issues.push({
          severity: "error",
          title: "Canonical is a relative URL",
          detail: `"${canonical}" is not absolute. Google expects a full URL including https://.`,
        });
      } else if (/^http:\/\//i.test(canonical)) {
        issues.push({
          severity: "warning",
          title: "Canonical uses http:// instead of https://",
          detail: "If your site serves HTTPS, point the canonical at the HTTPS version.",
        });
      }
    }
  }

  if (robots && /noindex/.test(robots) && canonical) {
    issues.push({
      severity: "warning",
      title: "noindex combined with a canonical",
      detail: "A noindexed page with a canonical sends mixed signals. Usually a noindex page should not declare a canonical for another page.",
    });
  }

  if (!title) {
    issues.push({ severity: "error", title: "Missing <title>", detail: "The page has no title tag." });
  } else if (title.length > 60) {
    issues.push({ severity: "warning", title: "Title is long", detail: `${title.length} characters - Google typically shows around 50 to 60.` });
  } else {
    issues.push({ ...ok, title: "Title present", detail: `${title.length} characters` });
  }

  if (!description) {
    issues.push({ severity: "warning", title: "Missing meta description", detail: "A description improves click-through from search results." });
  } else if (description.length > 160) {
    issues.push({ severity: "warning", title: "Description is long", detail: `${description.length} characters - keep it under 160.` });
  } else {
    issues.push({ ...ok, title: "Meta description present", detail: `${description.length} characters` });
  }

  return { canonical, canonicalCount: links.length, title, description, robots, issues };
}

function CanonicalTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("canonical-checker", isPro);
  const seo = toolSeo;

  const [html, setHtml] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  const run = () => {
    if (!html.trim() || !trial.canUse) return;
    setResult(analyze(html));
    trial.recordUse();
    toast.success("Page HTML analyzed");
  };

  const sevIcon = (s: Severity) =>
    s === "error" ? <XCircle className="h-4 w-4 text-red-500" />
    : s === "warning" ? <AlertTriangle className="h-4 w-4 text-amber-500" />
    : <CheckCircle2 className="h-4 w-4 text-emerald-500" />;

  const counts = result
    ? {
        errors: result.issues.filter((i) => i.severity === "error").length,
        warnings: result.issues.filter((i) => i.severity === "warning").length,
        ok: result.issues.filter((i) => i.severity === "ok").length,
      }
    : null;

  return (
    <ToolPageShell toolId="canonical-checker" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Canonical Checker" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <label className="mb-2 block text-[13px] font-medium text-foreground/80">
              Paste the page's HTML source <span className="text-muted-foreground">(view-source of the page)</span>
            </label>
            <textarea
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              placeholder="&lt;!DOCTYPE html&gt;&#10;&lt;html&gt;&#10;&lt;head&gt;…"
              rows={9}
              spellCheck={false}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-xs focus:border-primary focus:outline-none"
            />
            <div className="mt-3 flex items-center justify-between">
              <ActionButton disabled={!html.trim() || !trial.canUse} onClick={run}>
                <Link2 className="h-4 w-4" /> Check canonical
              </ActionButton>
              {!isPro && (
                <p className="text-xs text-muted-foreground">
                  {trial.left} of {TOOL_TRIAL_LIMIT} free checks left.
                </p>
              )}
            </div>
          </div>

          {result && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="mb-3 text-base font-bold">Extracted tags</h2>
              <dl className="space-y-2 text-sm">
                {[
                  ["Canonical", result.canonical],
                  ["Title", result.title],
                  ["Meta description", result.description],
                  ["Robots", result.robots],
                ].map(([label, value]) => (
                  <div key={label} className="grid gap-1 rounded-lg bg-muted/50 px-3 py-2 sm:grid-cols-[140px_1fr]">
                    <dt className="font-semibold text-foreground/70">{label}</dt>
                    <dd className={cn("break-all font-mono text-xs", value ? "" : "italic text-muted-foreground")}>
                      {value || "(not found)"}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 text-base font-bold">Issues</h2>
          {!result ? (
            <p className="text-sm text-muted-foreground">
              Paste HTML and run the check to see missing, relative or conflicting canonical tags.
            </p>
          ) : (
            <>
              {counts && (
                <div className="mb-3 flex gap-2 text-xs font-bold">
                  <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-red-500">{counts.errors} errors</span>
                  <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-amber-500">{counts.warnings} warnings</span>
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-500">{counts.ok} passed</span>
                </div>
              )}
              <div className="space-y-2.5">
                {result.issues.map((i, idx) => (
                  <div key={idx} className="flex gap-2.5 rounded-xl border border-border p-3">
                    <span className="mt-0.5 shrink-0">{sevIcon(i.severity)}</span>
                    <div>
                      <p className="text-sm font-bold">{i.title}</p>
                      <p className="mt-0.5 break-words text-xs text-muted-foreground">{i.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
