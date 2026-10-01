// /tools/a11y-scanner - Static accessibility scan of pasted HTML: missing alt
// text, empty links and buttons, unlabeled inputs, missing lang, heading
// order, duplicate ids, basic inline color contrast. Runs 100% in the browser.

import { useCallback, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Info, ScanSearch, ShieldAlert, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/a11y-scanner")({
  head: () => {
    const seo = getToolSeoMeta("a11y-scanner");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: A11yScannerTool,
});

type Severity = "error" | "warning";

interface Issue {
  severity: Severity;
  title: string;
  detail: string;
  count: number;
}

function describe(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const id = el.getAttribute("id");
  const cls = (el.getAttribute("class") ?? "").split(/\s+/).filter(Boolean)[0];
  const src = el.getAttribute("src");
  const snippet = (el.textContent ?? "").trim().slice(0, 40);
  if (id) return `<${tag}#${id}>`;
  if (cls) return `<${tag}.${cls}>`;
  if (src) return `<${tag} src="${src.slice(0, 40)}">`;
  if (snippet) return `<${tag}> "${snippet}"`;
  return `<${tag}>`;
}

/** Parse #rgb, #rrggbb, rgb() colors to [r,g,b]. Null when not parseable. */
function parseColor(s: string): [number, number, number] | null {
  const v = s.trim().toLowerCase();
  const hex = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (hex) {
    const h = hex[1];
    if (!h) return null;
    const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    if ([r, g, b].some((n) => Number.isNaN(n))) return null;
    return [r, g, b];
  }
  const rgb = v.match(/^rgba?\((\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/);
  if (rgb) {
    const r = parseInt(rgb[1] ?? "", 10);
    const g = parseInt(rgb[2] ?? "", 10);
    const b = parseInt(rgb[3] ?? "", 10);
    if ([r, g, b].some((n) => Number.isNaN(n))) return null;
    return [r, g, b];
  }
  return null;
}

function firstOf(arr: Element[]): string {
  const el = arr[0];
  return el ? describe(el) : "";
}

function luminance([r, g, b]: [number, number, number]): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrastRatio(a: [number, number, number], b: [number, number, number]): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function scan(html: string): Issue[] {
  const issues: Issue[] = [];
  const doc = new DOMParser().parseFromString(html, "text/html");
  const els = Array.from(doc.querySelectorAll("*"));

  // 1. Images missing alt
  const imgs = Array.from(doc.querySelectorAll("img"));
  const missingAlt = imgs.filter((i) => !i.hasAttribute("alt"));
  if (missingAlt.length > 0) {
    issues.push({
      severity: "error",
      title: `${missingAlt.length} image${missingAlt.length > 1 ? "s" : ""} missing alt text`,
      detail: `Add an alt attribute to every image, or alt="" for decorative ones. First: ${firstOf(missingAlt)}.`,
      count: missingAlt.length,
    });
  }

  // 2. Empty links
  const emptyLinks = Array.from(doc.querySelectorAll("a")).filter(
    (a) => a.textContent!.trim().length === 0 && !a.hasAttribute("aria-label") && !a.hasAttribute("aria-labelledby") && !a.querySelector("img[alt]"),
  );
  if (emptyLinks.length > 0) {
    issues.push({
      severity: "error",
      title: `${emptyLinks.length} link${emptyLinks.length > 1 ? "s" : ""} with no accessible name`,
      detail: `Links need readable text or an aria-label. First: ${firstOf(emptyLinks)}.`,
      count: emptyLinks.length,
    });
  }

  // 3. Empty buttons
  const emptyButtons = Array.from(doc.querySelectorAll("button")).filter(
    (b) => b.textContent!.trim().length === 0 && !b.hasAttribute("aria-label") && !b.hasAttribute("aria-labelledby"),
  );
  if (emptyButtons.length > 0) {
    issues.push({
      severity: "error",
      title: `${emptyButtons.length} button${emptyButtons.length > 1 ? "s" : ""} with no accessible name`,
      detail: `Icon-only buttons need an aria-label. First: ${firstOf(emptyButtons)}.`,
      count: emptyButtons.length,
    });
  }

  // 4. Inputs missing labels
  const labelled = new Set<string>();
  doc.querySelectorAll("label[for]").forEach((l) => { const f = l.getAttribute("for"); if (f) labelled.add(f); });
  const unlabeled = Array.from(doc.querySelectorAll("input, select, textarea")).filter((el) => {
    const tag = el.tagName.toLowerCase();
    if (tag === "input") {
      const type = (el.getAttribute("type") ?? "text").toLowerCase();
      if (["hidden", "submit", "button", "reset", "image"].includes(type)) return false;
    }
    const id = el.getAttribute("id");
    return !(id && labelled.has(id)) && !el.hasAttribute("aria-label") && !el.hasAttribute("aria-labelledby") && !el.closest("label");
  });
  if (unlabeled.length > 0) {
    issues.push({
      severity: "error",
      title: `${unlabeled.length} form field${unlabeled.length > 1 ? "s" : ""} without a label`,
      detail: `Associate each field with a <label>, aria-label or aria-labelledby. First: ${firstOf(unlabeled)}.`,
      count: unlabeled.length,
    });
  }

  // 5. Missing html lang
  if (!doc.documentElement.hasAttribute("lang")) {
    issues.push({
      severity: "error",
      title: "Missing lang attribute on <html>",
      detail: `Set <html lang="en"> (or your language) so screen readers pick the right voice and pronunciation.`,
      count: 1,
    });
  }

  // 6. Duplicate ids
  const seen = new Map<string, number>();
  els.forEach((el) => { const id = el.getAttribute("id"); if (id) seen.set(id, (seen.get(id) ?? 0) + 1); });
  const dupes = [...seen.entries()].filter(([, n]) => n > 1);
  if (dupes.length > 0) {
    issues.push({
      severity: "error",
      title: `${dupes.length} duplicate id${dupes.length > 1 ? "s" : ""}`,
      detail: `Duplicate ids break label associations and scripts. Repeated: ${dupes.slice(0, 3).map(([id]) => `#${id}`).join(", ")}.`,
      count: dupes.length,
    });
  }

  // 7. Heading order
  const headings = Array.from(doc.querySelectorAll("h1, h2, h3, h4, h5, h6"));
  let prev = 0;
  let skips = 0;
  for (const h of headings) {
    const level = parseInt(h.tagName.slice(1), 10);
    if (prev > 0 && level > prev + 1) skips++;
    prev = level;
  }
  if (headings.filter((h) => h.tagName === "H1").length > 1) {
    issues.push({
      severity: "warning",
      title: "Multiple H1 tags",
      detail: "Use one H1 per page; make sections H2 and below.",
      count: headings.filter((h) => h.tagName === "H1").length,
    });
  }
  if (skips > 0) {
    issues.push({
      severity: "warning",
      title: `${skips} skipped heading level${skips > 1 ? "s" : ""}`,
      detail: "Do not skip levels (H1 straight to H3). Screen readers use heading order to navigate.",
      count: skips,
    });
  }

  // 8. Basic inline color contrast
  const lowContrast: Element[] = [];
  for (const el of els) {
    const style = el.getAttribute("style");
    if (!style) continue;
    const fg = style.match(/(^|;)\s*color\s*:\s*([^;]+)/i)?.[2];
    if (!fg) continue;
    const bg = style.match(/(^|;)\s*background(?:-color)?\s*:\s*([^;]+)/i)?.[2];
    const fgRgb = parseColor(fg);
    if (!fgRgb) continue;
    const bgRgb: [number, number, number] | null = bg ? parseColor(bg) : [255, 255, 255];
    if (!bgRgb) continue;
    if (contrastRatio(fgRgb, bgRgb) < 4.5) lowContrast.push(el);
  }
  if (lowContrast.length > 0) {
    issues.push({
      severity: "warning",
      title: `${lowContrast.length} element${lowContrast.length > 1 ? "s" : ""} with low-contrast inline colors`,
      detail: `Basic check: text-to-background contrast below 4.5:1 (WCAG AA for normal text). First: ${firstOf(lowContrast)}.`,
      count: lowContrast.length,
    });
  }

  return issues.sort((a, b) => (a.severity === b.severity ? b.count - a.count : a.severity === "error" ? -1 : 1));
}

function A11yScannerTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("a11y-scanner", isPro);
  const seo = getToolSeo("a11y-scanner");

  const [html, setHtml] = useState("");
  const [issues, setIssues] = useState<Issue[] | null>(null);

  const run = useCallback(() => {
    if (!html.trim()) {
      toast.error("Paste some HTML first.");
      return;
    }
    if (!trial.canUse) {
      toast.error("Trial limit reached. Go Pro for unlimited scans.");
      return;
    }
    setIssues(scan(html));
    trial.recordUse();
    toast.success("Scan complete");
  }, [html, trial]);

  const errors = issues?.filter((i) => i.severity === "error").length ?? 0;
  const warnings = issues?.filter((i) => i.severity === "warning").length ?? 0;

  return (
    <ToolPageShell toolId="a11y-scanner" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="A11y Scanner" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div>
            <label htmlFor="a11y-input" className="mb-2 block text-[13px] font-medium text-foreground/80">
              Paste your HTML
            </label>
            <textarea
              id="a11y-input"
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              rows={16}
              placeholder={'<html lang="en">\n  <img src="photo.jpg" alt="...">\n  ...'}
              className="w-full resize-y rounded-xl border border-border bg-background p-3 font-mono text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary/60"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {html.length.toLocaleString()} characters - parsed locally, nothing is sent anywhere.
            </p>
          </div>
          <ActionButton busy={false} disabled={!html.trim() || !trial.canUse} onClick={run}>
            <ScanSearch className="h-4 w-4" /> Scan for issues
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free scans left.
            </p>
          )}
          <p className="flex items-start gap-2 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            This is a static scan of the markup you paste. It catches common mistakes but it is not a replacement for
            manual testing with a screen reader or a full audit tool.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {!issues ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <ScanSearch className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your scan results appear here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                We check the most common accessibility failures in your HTML and rank them by severity.
              </p>
            </div>
          ) : issues.length === 0 ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <ShieldCheck className="mb-3 h-10 w-10 text-green-500" />
              <p className="font-semibold">No issues found</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                This static scan found nothing - the page still deserves a real screen-reader test.
              </p>
            </div>
          ) : (
            <div>
              <div className="mb-4 flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1 text-xs font-bold text-red-500">
                  <XCircle className="h-3.5 w-3.5" /> {errors} error{errors === 1 ? "" : "s"}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-600">
                  <ShieldAlert className="h-3.5 w-3.5" /> {warnings} warning{warnings === 1 ? "" : "s"}
                </span>
              </div>
              <ul className="space-y-2.5">
                {issues.map((issue, i) => (
                  <li
                    key={i}
                    className={cn(
                      "rounded-xl border p-3.5",
                      issue.severity === "error" ? "border-red-500/40 bg-red-500/5" : "border-amber-500/40 bg-amber-500/5",
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      {issue.severity === "error" ? (
                        <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                      ) : (
                        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                      )}
                      <div>
                        <p className="text-sm font-semibold">
                          {issue.title}
                          <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                            {issue.severity}
                          </span>
                        </p>
                        <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                          {issue.detail}
                        </p>
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
