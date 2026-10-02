// /tools/markdown-preview - live Markdown editor with HTML preview.
// 100% client-side: marked + DOMPurify, highlight.js for code blocks.

import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Code2, FileText } from "lucide-react";
import { marked } from "marked";
import "highlight.js/styles/github.css";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/markdown-preview")({
  head: () => {
    const seo = getToolSeoMeta("markdown-preview");
    const canonical = "https://iconvault.site/tools/markdown-preview";
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
  component: MarkdownPreviewTool,
});

/** XSS-safe HTML via DOMPurify (replaces the old regex sanitizer). Loaded on
 *  demand so the purify library is not part of the initial route chunk. */
async function sanitize(html: string): Promise<string> {
  const { default: DOMPurify } = await import("dompurify");
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}

const DEFAULT_MD = `# Markdown Preview

Write **Markdown** on the left, see clean HTML on the right.

## Features

- Live preview as you type
- *Italic*, **bold** and \`inline code\`
- [Links](https://iconvault.site) and images

> Blockquotes render nicely too.

\`\`\`js
const hello = "world";
console.log(hello);
\`\`\`

| Syntax | Renders |
| ------ | ------- |
| Table  | Neatly  |

1. Ordered
2. Lists work

---

Hit **Copy HTML** to grab embed-ready markup.`;

const PREVIEW_CLASSES =
  "min-h-[420px] text-sm leading-relaxed " +
  "[&_h1]:mb-3 [&_h1]:text-2xl [&_h1]:font-extrabold " +
  "[&_h2]:mb-2 [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-bold " +
  "[&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-bold " +
  "[&_p]:mb-4 " +
  "[&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:ml-1 " +
  "[&_a]:text-primary [&_a]:underline " +
  "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px] " +
  "[&_pre]:mb-4 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-muted [&_pre]:p-4 [&_pre_code]:bg-transparent [&_pre_code]:p-0 " +
  "[&_blockquote]:mb-4 [&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground " +
  "[&_table]:mb-4 [&_table]:w-full [&_table]:text-left [&_th]:border [&_th]:border-border [&_th]:bg-muted/60 [&_th]:px-3 [&_th]:py-2 [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 " +
  "[&_hr]:my-6 [&_hr]:border-border";

function MarkdownPreviewTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("markdown-preview", isPro);
  const seo = getToolSeo("markdown-preview");

  const [md, setMd] = useState(DEFAULT_MD);
  // DOMPurify needs a DOM, so sanitize on the client only - SSR renders the
  // shell and the preview fills in on mount (no SSR throw).
  const [html, setHtml] = useState("");
  useEffect(() => {
    let cancelled = false;
    void sanitize(marked.parse(md) as string).then((h) => {
      if (!cancelled) setHtml(h);
    });
    return () => {
      cancelled = true;
    };
  }, [md]);
  const previewRef = useRef<HTMLDivElement>(null);

  /** Lazy-load highlight.js only when a code block is actually rendered. */
  useEffect(() => {
    const root = previewRef.current;
    if (!root || !root.querySelector("pre code:not(.hljs)")) return;
    let cancelled = false;
    import("highlight.js/lib/common")
      .then((m) => {
        if (cancelled) return;
        const hljs = m.default;
        root.querySelectorAll("pre code:not(.hljs)").forEach((el) => {
          try {
            hljs.highlightElement(el as HTMLElement);
          } catch {
            /* leave plain */
          }
        });
      })
      .catch(() => {
        /* highlighting unavailable - plain code blocks still render */
      });
    return () => {
      cancelled = true;
    };
  }, [html]);

  const copyHtml = async () => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(html);
      toast.success("HTML copied to clipboard.");
      trial.recordUse();
    } catch {
      toast.error("Could not copy - select the preview HTML and copy it manually.");
    }
  };

  return (
    <ToolPageShell toolId="markdown-preview" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Markdown Preview" left={trial.left} />
      {/* hljs github theme is light; adapt code blocks to dark mode */}
      <style>{`.dark .hljs{background:#0d1117!important;color:#c9d1d9!important}`}</style>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <ActionButton busy={false} disabled={!trial.canUse} onClick={copyHtml}>
          <Code2 className="h-4 w-4" /> Copy HTML
        </ActionButton>
        {!isPro && (
          <p className="text-xs text-muted-foreground">
            {trial.left} of {TOOL_TRIAL_LIMIT} free copies left - previewing is always free and
            unlimited, and your text never leaves your browser.
          </p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <span className="mb-2 block text-sm font-bold">Markdown</span>
          <textarea
            value={md} onChange={(e) => setMd(e.target.value)}
            placeholder="Write Markdown here…"
            spellCheck={false}
            className="h-[420px] w-full resize-y rounded-xl border border-border bg-background p-3 font-mono text-[13px] leading-relaxed outline-none focus:border-primary"
          />
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <span className="mb-2 flex items-center gap-1.5 text-sm font-bold">
            <FileText className="h-4 w-4 text-muted-foreground" /> Live preview
          </span>
          <div
            ref={previewRef}
            className={`max-h-[420px] overflow-y-auto rounded-xl border border-border bg-background p-4 ${PREVIEW_CLASSES}`}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
    </ToolPageShell>
  );
}
