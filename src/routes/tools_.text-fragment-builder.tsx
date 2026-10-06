// /tools/text-fragment-builder - Build #:~:text= deep links with
// prefix/suffix context, live preview and copy. 100% in-browser.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, ExternalLink, Info } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/text-fragment-builder";
import toolSeoMeta from "@/lib/tool-seo-meta-data/text-fragment-builder";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/text-fragment-builder")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/text-fragment-builder";
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
  component: TextFragmentTool,
});

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(ta);
    }
  }
}

const enc = (s: string) => encodeURIComponent(s.trim());

function TextFragmentTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("text-fragment-builder", isPro);
  const seo = toolSeo;

  const [pageUrl, setPageUrl] = useState("https://example.com/article");
  const [text, setText] = useState("the quick brown fox");
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("jumps over the lazy dog");

  const fragment = useMemo(() => {
    const parts: string[] = [];
    if (prefix.trim()) parts.push(enc(prefix));
    parts.push(enc(text || "text"));
    if (suffix.trim()) parts.push(enc(suffix));
    return parts.join(",");
  }, [text, prefix, suffix]);

  const fullUrl = useMemo(() => {
    const base = pageUrl.trim().replace(/#.*$/, "") || "https://example.com";
    return `${base}#:~:text=${fragment}`;
  }, [pageUrl, fragment]);

  const valid = text.trim().length > 0;

  const copyUrl = async () => {
    if (!valid || !trial.canUse) return;
    const ok = await copyText(fullUrl);
    if (ok) {
      trial.recordUse();
      toast.success("Text fragment link copied");
    } else {
      toast.error("Copy failed, select the URL manually");
    }
  };

  const fieldCls =
    "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

  return (
    <ToolPageShell toolId="text-fragment-builder" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Text Fragment Builder" left={trial.left} />

      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-blue-500/30 bg-blue-500/5 p-4">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
        <p className="text-sm text-muted-foreground">
          Text fragments (<span className="font-mono">#:~~:text=</span>) make the browser scroll to and highlight
          exact text on any page. They work in Chrome, Edge, Safari and Firefox 131+. Prefix and suffix narrow the
          match when the phrase appears more than once.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[440px_1fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Page URL</label>
            <input value={pageUrl} onChange={(e) => setPageUrl(e.target.value)} className={fieldCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">
              Exact text to highlight <span className="text-red-500">*</span>
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              className={fieldCls}
              placeholder="The exact phrase on the page"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">
              Prefix (text just before, optional)
            </label>
            <input value={prefix} onChange={(e) => setPrefix(e.target.value)} className={fieldCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">
              Suffix (text just after, optional)
            </label>
            <input value={suffix} onChange={(e) => setSuffix(e.target.value)} className={fieldCls} />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Add prefix or suffix when the phrase repeats on the page. The browser picks the occurrence that is
              wrapped by your context.
            </p>
          </div>

          <ActionButton busy={false} disabled={!valid || !trial.canUse} onClick={copyUrl}>
            <Copy className="h-4 w-4" /> Copy fragment link
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free links left.
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 font-semibold">Generated link</h2>
            <div className="break-all rounded-xl bg-black/80 p-4 font-mono text-[13px] leading-relaxed text-emerald-300">
              {valid ? fullUrl : <span className="text-white/40">Enter the exact text first.</span>}
            </div>
            {valid && (
              <a
                href={fullUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-semibold transition hover:border-primary/40"
              >
                <ExternalLink className="h-4 w-4" /> Test the link (opens new tab)
              </a>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 font-semibold">Try it right here</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              This very page contains the sentence: the quick brown fox{" "}
              <mark className="rounded bg-yellow-300/80 px-1 text-black">jumps over the lazy dog</mark> near the
              top of the article. Copy the link above, paste it in a new tab on any page containing that phrase,
              and the browser scrolls straight to it and highlights it in yellow.
            </p>
            <div className="mt-4 rounded-xl border border-border bg-background p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Live highlight simulation
              </p>
              <p className="text-sm leading-7">
                Lorem ipsum dolor sit amet. The quick brown fox{" "}
                <mark className="rounded bg-yellow-300 px-1 text-black">{text || "the quick brown fox"}</mark>{" "}
                jumps over the lazy dog. Consectetur adipiscing elit, sed do eiusmod tempor.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                The fragment part of your URL: <span className="font-mono">#:~~:text={fragment}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
