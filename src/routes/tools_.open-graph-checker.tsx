// /tools/open-graph-checker - Paste a page's HTML and validate its Open Graph
// and Twitter card tags. 100% client-side. URL fetching is only attempted on
// request and is usually blocked by CORS - paste HTML for a full check.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Globe, Search, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/open-graph-checker")({
  head: () => {
    const seo = getToolSeoMeta("open-graph-checker");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: OgCheckerTool,
});

interface Check {
  tag: string;
  status: "pass" | "warn" | "fail";
  value: string | null;
  hint: string;
}

const REQUIRED: { tag: string; hint: string }[] = [
  { tag: "og:title", hint: "Needs a compelling title under 60 characters." },
  { tag: "og:type", hint: "Usually \"website\" or \"article\"." },
  { tag: "og:image", hint: "Absolute https URL, ideally 1200 x 630." },
  { tag: "og:url", hint: "The canonical URL of this page." },
];

const RECOMMENDED: { tag: string; hint: string }[] = [
  { tag: "og:description", hint: "Keep it under 200 characters for best display." },
  { tag: "og:site_name", hint: "Your site or brand name." },
  { tag: "twitter:card", hint: "summary or summary_large_image." },
  { tag: "og:image:width", hint: "Explicit dimensions help scrapers render faster." },
  { tag: "og:image:height", hint: "Pair with og:image:width, e.g. 1200 and 630." },
];

function checkHtml(html: string): Check[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const metas = new Map<string, string>();
  doc.querySelectorAll("meta").forEach((m) => {
    const key = (m.getAttribute("property") || m.getAttribute("name") || "").trim().toLowerCase();
    if (key) metas.set(key, (m.getAttribute("content") || "").trim());
  });

  const out: Check[] = [];
  for (const r of REQUIRED) {
    const value = metas.get(r.tag) ?? null;
    if (value === null || value === "") {
      out.push({ tag: r.tag, status: "fail", value: null, hint: `Missing. ${r.hint}` });
    } else {
      let status: Check["status"] = "pass";
      let hint = r.hint;
      if (r.tag === "og:image") {
        if (!/^https?:\/\//i.test(value)) {
          status = "fail";
          hint = "Image URL must be absolute (https://...), relative URLs break link previews.";
        } else if (!/\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(value)) {
          status = "warn";
          hint = "URL does not end in a common image extension - double-check the scraper can read it.";
        } else if (/^http:\/\//i.test(value)) {
          status = "warn";
          hint = "Use an https:// URL so previews load on secure pages.";
        }
      }
      if (r.tag === "og:url" && !/^https?:\/\//i.test(value)) {
        status = "fail";
        hint = "og:url must be an absolute URL.";
      }
      out.push({ tag: r.tag, status, value, hint });
    }
  }
  for (const r of RECOMMENDED) {
    const value = metas.get(r.tag) ?? null;
    if (value === null || value === "") {
      out.push({ tag: r.tag, status: "warn", value: null, hint: `Recommended, not required. ${r.hint}` });
    } else {
      out.push({ tag: r.tag, status: "pass", value, hint: r.hint });
    }
  }
  return out;
}

function OgCheckerTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("open-graph-checker", isPro);
  const seo = getToolSeo("open-graph-checker");

  const [html, setHtml] = useState("");
  const [url, setUrl] = useState("");
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [fetching, setFetching] = useState(false);

  const runPaste = () => {
    if (!html.trim() || !trial.canUse) return;
    setChecks(checkHtml(html));
    trial.recordUse();
    toast.success("Tags analyzed");
  };

  const runUrl = async () => {
    if (!url.trim() || !trial.canUse) return;
    setFetching(true);
    try {
      const res = await fetch(url.trim(), { mode: "cors" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      setChecks(checkHtml(text));
      trial.recordUse();
      toast.success("Page fetched and analyzed");
    } catch {
      toast.error("Could not fetch that URL - remote fetching is often blocked by CORS. Paste the page HTML for a full check.");
    } finally {
      setFetching(false);
    }
  };

  const icon = (s: Check["status"]) =>
    s === "pass" ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
    : s === "warn" ? <AlertTriangle className="h-4 w-4 text-amber-500" />
    : <XCircle className="h-4 w-4 text-red-500" />;

  const fails = checks?.filter((c) => c.status === "fail").length ?? 0;
  const warns = checks?.filter((c) => c.status === "warn").length ?? 0;
  const passes = checks?.filter((c) => c.status === "pass").length ?? 0;

  return (
    <ToolPageShell toolId="open-graph-checker" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="OG Checker" left={trial.left} />

      <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <label className="mb-1 block text-[13px] font-medium text-foreground/80">
          Paste the page's HTML source <span className="text-muted-foreground">(recommended - full check)</span>
        </label>
        <textarea
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          placeholder="&lt;head&gt;…&lt;meta property=&quot;og:title&quot; …&gt;…"
          rows={7}
          spellCheck={false}
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-xs focus:border-primary focus:outline-none"
        />
        <div className="flex items-center gap-3">
          <ActionButton disabled={!html.trim() || !trial.canUse} onClick={runPaste}>
            <Search className="h-4 w-4" /> Validate tags
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free checks left.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-dashed border-border p-4">
          <label className="mb-1 block text-[13px] font-medium text-foreground/80">
            Or fetch a page by URL
          </label>
          <div className="flex gap-2">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/page"
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            <button
              type="button"
              disabled={!url.trim() || fetching || !trial.canUse}
              onClick={() => void runUrl()}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-bold text-muted-foreground transition hover:border-primary/50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Globe className="h-4 w-4" /> {fetching ? "Fetching…" : "Fetch"}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Honest note: remote fetching is often blocked by CORS or bot protection, so the fetch may
            fail on many sites. Paste the page HTML above for a guaranteed full check.
          </p>
        </div>
      </div>

      {checks && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold">
            <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-red-500">{fails} missing</span>
            <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-amber-500">{warns} to improve</span>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-500">{passes} good</span>
          </div>
          <div className="space-y-2">
            {checks.map((c) => (
              <div key={c.tag} className="flex gap-3 rounded-xl border border-border p-3">
                <span className="mt-0.5 shrink-0">{icon(c.status)}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <code className="font-mono text-sm font-bold">{c.tag}</code>
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-bold uppercase",
                      c.status === "pass" ? "bg-emerald-500/10 text-emerald-600"
                      : c.status === "warn" ? "bg-amber-500/10 text-amber-600"
                      : "bg-red-500/10 text-red-500",
                    )}>
                      {c.status === "pass" ? "Pass" : c.status === "warn" ? "Improve" : "Missing"}
                    </span>
                  </div>
                  {c.value !== null && (
                    <p className="mt-1 break-all font-mono text-xs text-foreground/70">{c.value}</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">{c.hint}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </ToolPageShell>
  );
}
