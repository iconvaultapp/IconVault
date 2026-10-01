// /tools/sitemap-generator - XML sitemap builder with validation.
// 100% client-side.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Download, ListTree, TriangleAlert, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/sitemap-generator")({
  head: () => {
    const seo = getToolSeoMeta("sitemap-generator");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: SitemapGeneratorTool,
});

const CHANGEFREQ = ["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"] as const;
const PRIORITIES = ["1.0", "0.9", "0.8", "0.7", "0.6", "0.5", "0.4", "0.3", "0.2", "0.1", "0.0"];

const inputCls =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary/60";
const labelCls = "mb-1.5 block text-[13px] font-medium text-foreground/80";

function escXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function isHttpUrl(u: string): boolean {
  return /^https?:\/\//i.test(u);
}

function SitemapGeneratorTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("sitemap-generator", isPro);
  const seo = getToolSeo("sitemap-generator");

  const [urlsText, setUrlsText] = useState("");
  const [changefreq, setChangefreq] = useState<(typeof CHANGEFREQ)[number]>("weekly");
  const [priority, setPriority] = useState("0.8");
  const [lastmod, setLastmod] = useState("");
  const [useToday, setUseToday] = useState(true);

  const allUrls = urlsText.split("\n").map((u) => u.trim()).filter(Boolean);
  const validUrls = allUrls.filter(isHttpUrl);
  const invalidUrls = allUrls.filter((u) => !isHttpUrl(u));

  const today = new Date().toISOString().slice(0, 10);
  const lm = useToday ? today : lastmod;

  const entries = validUrls.map((u) => {
    const lines = ["  <url>", `    <loc>${escXml(u)}</loc>`];
    if (lm) lines.push(`    <lastmod>${lm}</lastmod>`);
    lines.push(`    <changefreq>${changefreq}</changefreq>`, `    <priority>${priority}</priority>`, "  </url>");
    return lines.join("\n");
  });

  const output = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    "</urlset>",
  ].join("\n");

  const overLimit = validUrls.length > 50000;

  const generate = () => {
    if (!trial.canUse) return;
    trial.recordUse();
    toast.success("Sitemap generated - copy or download it below");
  };

  const copy = () => {
    navigator.clipboard
      .writeText(output)
      .then(() => toast.success("sitemap.xml copied"))
      .catch(() => toast.error("Copy failed"));
  };

  const download = () => {
    try {
      const blob = new Blob([output], { type: "application/xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "sitemap.xml";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("sitemap.xml downloaded");
    } catch {
      toast.error("Download failed");
    }
  };

  return (
    <ToolPageShell toolId="sitemap-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Sitemap Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div>
            <label className={labelCls} htmlFor="sm-urls">Page URLs (one per line)</label>
            <textarea
              id="sm-urls" className={`${inputCls} min-h-[180px] resize-y font-mono text-xs`} value={urlsText}
              onChange={(e) => setUrlsText(e.target.value)}
              placeholder={"https://example.com/\nhttps://example.com/about\nhttps://example.com/blog/post-1"}
              spellCheck={false}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {validUrls.length} valid URL{validUrls.length === 1 ? "" : "s"}
              {invalidUrls.length > 0 && (
                <span className="font-semibold text-amber-600"> - {invalidUrls.length} skipped (must start with http)</span>
              )}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="sm-freq">Change frequency</label>
              <select id="sm-freq" className={inputCls} value={changefreq} onChange={(e) => setChangefreq(e.target.value as (typeof CHANGEFREQ)[number])}>
                {CHANGEFREQ.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="sm-prio">Priority</label>
              <select id="sm-prio" className={inputCls} value={priority} onChange={(e) => setPriority(e.target.value)}>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls} htmlFor="sm-lastmod">Last modified date</label>
            <input
              id="sm-lastmod" type="date" className={inputCls} value={useToday ? today : lastmod}
              disabled={useToday} onChange={(e) => setLastmod(e.target.value)}
            />
            <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm font-semibold text-foreground/80">
              <input type="checkbox" checked={useToday} onChange={(e) => setUseToday(e.target.checked)} className="h-4 w-4 accent-primary" />
              Use today as the lastmod date
            </label>
          </div>

          {overLimit && (
            <p className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs font-semibold text-amber-700 dark:text-amber-300">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              {validUrls.length.toLocaleString("en-US")} URLs exceeds the sitemap protocol limit of 50,000 per file. Split them into multiple sitemaps.
            </p>
          )}

          <ActionButton disabled={!trial.canUse} onClick={generate}>
            <Wand2 className="h-4 w-4" /> Generate sitemap
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free generations left - everything runs in your browser.
            </p>
          )}
        </div>

        <div className="flex flex-col rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-bold">
              <ListTree className="h-4 w-4 text-primary" /> sitemap.xml
            </p>
            <div className="flex gap-2">
              <button
                type="button" onClick={copy}
                className="flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-bold transition hover:border-primary/40 hover:text-primary"
              >
                <Copy className="h-4 w-4" /> Copy
              </button>
              <button
                type="button" onClick={download}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90"
              >
                <Download className="h-4 w-4" /> Download
              </button>
            </div>
          </div>
          <textarea
            readOnly value={output} spellCheck={false}
            className="min-h-[420px] w-full flex-1 resize-y rounded-xl border border-border bg-muted/40 p-4 font-mono text-xs leading-relaxed outline-none"
            placeholder="Your sitemap.xml appears here as you type"
          />
        </div>
      </div>
    </ToolPageShell>
  );
}
