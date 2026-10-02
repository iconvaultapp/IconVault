// /tools/robots-txt - robots.txt generator with dynamic rule rows.
// 100% client-side.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bot, Copy, Download, Plus, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/robots-txt")({
  head: () => {
    const seo = getToolSeoMeta("robots-txt");
    const canonical = "https://iconvault.site/tools/robots-txt";
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
  component: RobotsTxtTool,
});

interface Rule {
  id: number;
  userAgent: string;
  allow: string;
  disallow: string;
}

const inputCls =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary/60";
const labelCls = "mb-1.5 block text-[13px] font-medium text-foreground/80";

function buildRobots(rules: Rule[], crawlDelay: string, sitemapUrl: string): string {
  const out: string[] = [];
  rules.forEach((r, i) => {
    if (i > 0) out.push("");
    out.push(`User-agent: ${r.userAgent.trim() || "*"}`);
    r.allow
      .split("\n")
      .map((p) => p.trim())
      .filter(Boolean)
      .forEach((p) => out.push(`Allow: ${p}`));
    r.disallow
      .split("\n")
      .map((p) => p.trim())
      .filter(Boolean)
      .forEach((p) => out.push(`Disallow: ${p}`));
  });
  const delay = crawlDelay.trim();
  if (delay) {
    out.push("");
    out.push(`Crawl-delay: ${delay}`);
  }
  const sm = sitemapUrl.trim();
  if (sm) {
    out.push("");
    out.push(`Sitemap: ${sm}`);
  }
  return out.join("\n");
}

function RobotsTxtTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("robots-txt", isPro);
  const seo = getToolSeo("robots-txt");

  const [rules, setRules] = useState<Rule[]>([{ id: 1, userAgent: "*", allow: "", disallow: "" }]);
  const [nextId, setNextId] = useState(2);
  const [crawlDelay, setCrawlDelay] = useState("");
  const [sitemapUrl, setSitemapUrl] = useState("");

  const output = buildRobots(rules, crawlDelay, sitemapUrl);

  const updateRule = (id: number, patch: Partial<Rule>) => {
    setRules((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const addRule = () => {
    setRules((rs) => [...rs, { id: nextId, userAgent: "", allow: "", disallow: "" }]);
    setNextId((n) => n + 1);
  };

  const removeRule = (id: number) => {
    setRules((rs) => (rs.length <= 1 ? rs : rs.filter((r) => r.id !== id)));
  };

  const generate = () => {
    if (!trial.canUse) return;
    trial.recordUse();
    toast.success("robots.txt updated - copy or download it below");
  };

  const copy = () => {
    navigator.clipboard
      .writeText(output)
      .then(() => toast.success("robots.txt copied"))
      .catch(() => toast.error("Copy failed"));
  };

  const download = () => {
    try {
      const blob = new Blob([output], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "robots.txt";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("robots.txt downloaded");
    } catch {
      toast.error("Download failed");
    }
  };

  return (
    <ToolPageShell toolId="robots-txt" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Robots.txt Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-bold"><Bot className="h-4 w-4 text-primary" /> Crawl rules</p>
            <button
              type="button" onClick={addRule}
              className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-bold text-foreground transition hover:border-primary/40 hover:text-primary"
            >
              <Plus className="h-3.5 w-3.5" /> Add rule
            </button>
          </div>

          {rules.map((r, idx) => (
            <div key={r.id} className="space-y-3 rounded-xl border border-border bg-muted/30 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Rule {idx + 1}</span>
                {rules.length > 1 && (
                  <button
                    type="button" onClick={() => removeRule(r.id)} aria-label={`Remove rule ${idx + 1}`}
                    className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-background hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div>
                <label className={labelCls} htmlFor={`rb-ua-${r.id}`}>User-agent</label>
                <input
                  id={`rb-ua-${r.id}`} className={inputCls} value={r.userAgent}
                  onChange={(e) => updateRule(r.id, { userAgent: e.target.value })}
                  placeholder="*"
                />
              </div>
              <div>
                <label className={labelCls} htmlFor={`rb-allow-${r.id}`}>Allow (one path per line)</label>
                <textarea
                  id={`rb-allow-${r.id}`} className={`${inputCls} min-h-[56px] resize-y font-mono text-xs`} value={r.allow}
                  onChange={(e) => updateRule(r.id, { allow: e.target.value })}
                  placeholder="/public/"
                />
              </div>
              <div>
                <label className={labelCls} htmlFor={`rb-disallow-${r.id}`}>Disallow (one path per line)</label>
                <textarea
                  id={`rb-disallow-${r.id}`} className={`${inputCls} min-h-[56px] resize-y font-mono text-xs`} value={r.disallow}
                  onChange={(e) => updateRule(r.id, { disallow: e.target.value })}
                  placeholder="/private/"
                />
              </div>
            </div>
          ))}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="rb-delay">Crawl-delay (optional)</label>
              <input
                id="rb-delay" className={inputCls} value={crawlDelay}
                onChange={(e) => setCrawlDelay(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="10" inputMode="numeric"
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="rb-sitemap">Sitemap URL (optional)</label>
              <input
                id="rb-sitemap" className={inputCls} value={sitemapUrl}
                onChange={(e) => setSitemapUrl(e.target.value)}
                placeholder="https://example.com/sitemap.xml" inputMode="url"
              />
            </div>
          </div>

          <ActionButton disabled={!trial.canUse} onClick={generate}>
            <Wand2 className="h-4 w-4" /> Generate robots.txt
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free generations left - everything runs in your browser.
            </p>
          )}
        </div>

        <div className="flex flex-col rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold">robots.txt</p>
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
          />
        </div>
      </div>
    </ToolPageShell>
  );
}
