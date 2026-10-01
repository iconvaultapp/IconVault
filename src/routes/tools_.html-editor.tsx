// /tools/html-editor - WYSIWYG HTML editor: contentEditable area with a
// formatting toolbar, live clean HTML output below. 100% client-side.

import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bold, Check, Code2, Copy, Italic, Link2, List, ListOrdered, PenLine, RemoveFormatting, Underline,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/html-editor")({
  head: () => {
    const seo = getToolSeoMeta("html-editor");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: HtmlEditorTool,
});

/** Strip style attributes and event handlers so the output HTML is clean. */
function cleanHtml(html: string): string {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return "";
  root.querySelectorAll("*").forEach((el) => {
    [...el.attributes].forEach((attr) => {
      if (attr.name === "style" || attr.name.startsWith("on")) el.removeAttribute(attr.name);
    });
  });
  return root.innerHTML;
}

function HtmlEditorTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("html-editor", isPro);
  const seo = getToolSeo("html-editor");

  const editorRef = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState("");
  const [copied, setCopied] = useState(false);

  const refresh = () => {
    const raw = editorRef.current?.innerHTML ?? "";
    setHtml(cleanHtml(raw));
    setCopied(false);
  };

  const exec = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    refresh();
  };

  const addLink = () => {
    const url = window.prompt("Enter the link URL:", "https://");
    if (!url) return;
    exec("createLink", url);
  };

  const toolBtn = (title: string, onClick: () => void, children: React.ReactNode) => (
    <button
      key={title}
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className="flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-bold text-muted-foreground transition hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  );

  const copy = () => {
    if (!html || !trial.canUse) return;
    navigator.clipboard
      .writeText(html)
      .then(() => {
        setCopied(true);
        trial.recordUse();
        toast.success("HTML copied");
      })
      .catch(() => toast.error("Copy failed"));
  };

  return (
    <ToolPageShell toolId="html-editor" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="HTML Editor" left={trial.left} />

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center gap-1 rounded-xl bg-muted/60 p-2">
          {toolBtn("Bold", () => exec("bold"), <Bold className="h-4 w-4" />)}
          {toolBtn("Italic", () => exec("italic"), <Italic className="h-4 w-4" />)}
          {toolBtn("Underline", () => exec("underline"), <Underline className="h-4 w-4" />)}
          <span className="mx-1 h-6 w-px bg-border" />
          {toolBtn("Heading 1", () => exec("formatBlock", "<h1>"), <span>H1</span>)}
          {toolBtn("Heading 2", () => exec("formatBlock", "<h2>"), <span>H2</span>)}
          {toolBtn("Heading 3", () => exec("formatBlock", "<h3>"), <span>H3</span>)}
          {toolBtn("Paragraph", () => exec("formatBlock", "<p>"), <span className="text-xs">P</span>)}
          <span className="mx-1 h-6 w-px bg-border" />
          {toolBtn("Bullet list", () => exec("insertUnorderedList"), <List className="h-4 w-4" />)}
          {toolBtn("Numbered list", () => exec("insertOrderedList"), <ListOrdered className="h-4 w-4" />)}
          <span className="mx-1 h-6 w-px bg-border" />
          {toolBtn("Insert link", addLink, <Link2 className="h-4 w-4" />)}
          {toolBtn("Clear formatting", () => exec("removeFormat"), <RemoveFormatting className="h-4 w-4" />)}
        </div>

        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={refresh}
          data-placeholder="Start typing or paste content here..."
          className={cn(
            "prose prose-sm max-w-none dark:prose-invert min-h-[240px] rounded-xl border border-border bg-background p-4 outline-none focus:border-primary",
            "empty:before:pointer-events-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]",
          )}
        />
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-bold">
            <Code2 className="h-4 w-4 text-muted-foreground" /> Clean HTML output
          </span>
          <button
            type="button"
            onClick={copy}
            disabled={!html || !trial.canUse}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy HTML"}
          </button>
        </div>
        {html ? (
          <textarea
            value={html}
            readOnly
            spellCheck={false}
            className="h-48 w-full resize-y rounded-xl border border-border bg-background p-3 font-mono text-[13px] leading-relaxed outline-none"
          />
        ) : (
          <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-border text-center">
            <PenLine className="mb-2 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm font-semibold text-muted-foreground">
              The HTML for your formatted text appears here as you type
            </p>
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Style attributes and event handlers are stripped automatically, so the markup stays clean.
        </p>
      </div>

      {!isPro && (
        <p className="mt-6 text-xs text-muted-foreground">
          {trial.left} of {TOOL_TRIAL_LIMIT} free copies left - everything runs in your browser, nothing is uploaded.
        </p>
      )}
    </ToolPageShell>
  );
}
