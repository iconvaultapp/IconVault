// /tools/markdown-editor - A full markdown editor: toolbar, live split-view
// preview, localStorage autosave, word counts, .md and HTML export. Distinct
// from the markdown-preview tool, which is a viewer only.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { marked } from "marked";
import {
  Bold, Check, ClipboardCopy, Code, Download, FileText, Heading1, Heading2, Heading3,
  Image, Italic, Link2, List, ListOrdered, ListTodo, Minus, Quote, Strikethrough, Table,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/markdown-editor")({
  head: () => {
    const seo = getToolSeoMeta("markdown-editor");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: MarkdownEditorTool,
});

const STORAGE_KEY = "iv_markdown_editor_draft";
const SAMPLE = `# My Document

Write markdown on the left, see it rendered live on the right. Your draft **autosaves** in this browser.

## Formatting

- **Bold**, *italic*, ~~strikethrough~~ and \`inline code\`
- [Links](https://example.com) and images
- > Blockquotes

### Code

\`\`\`js
console.log("hello world");
\`\`\`

1. Numbered lists work too
2. As do task lists

- [x] Autosave to localStorage
- [ ] Export when done

| Column A | Column B |
|----------|----------|
| Cell 1   | Cell 2   |
`;

function MarkdownEditorTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("markdown-editor", isPro);
  const seo = getToolSeo("markdown-editor");

  const [md, setMd] = useState("");
  const [html, setHtml] = useState("");
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Load draft once on mount (client only).
  useEffect(() => {
    try {
      const draft = localStorage.getItem(STORAGE_KEY);
      setMd(draft ?? SAMPLE);
    } catch {
      setMd(SAMPLE);
    }
    setLoaded(true);
  }, []);

  // Autosave with debounce.
  useEffect(() => {
    if (!loaded) return;
    setSaved(false);
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, md);
        setSaved(true);
      } catch {
        /* storage full or blocked */
      }
    }, 800);
    return () => window.clearTimeout(t);
  }, [md, loaded]);

  // Render preview client-side (DOMPurify throws during SSR).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { default: DOMPurify } = await import("dompurify");
      const raw = marked.parse(md, { breaks: true }) as string;
      if (!cancelled) setHtml(DOMPurify.sanitize(raw));
    })();
    return () => { cancelled = true; };
  }, [md]);

  const insert = (before: string, after = "", placeholder = "") => {
    const ta = taRef.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e, value } = ta;
    const selected = value.slice(s, e) || placeholder;
    const next = value.slice(0, s) + before + selected + after + value.slice(e);
    setMd(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = s + before.length + selected.length;
      ta.setSelectionRange(before && after && !value.slice(s, e) ? s + before.length : pos, pos);
    });
  };

  const insertLine = (prefix: string) => {
    const ta = taRef.current;
    if (!ta) return;
    const { selectionStart: s, value } = ta;
    const lineStart = value.lastIndexOf("\n", s - 1) + 1;
    const next = value.slice(0, lineStart) + prefix + value.slice(lineStart);
    setMd(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(s + prefix.length, s + prefix.length);
    });
  };

  const tools: { label: string; icon: ReactNode; run: () => void }[] = [
    { label: "Heading 1", icon: <Heading1 className="h-4 w-4" />, run: () => insertLine("# ") },
    { label: "Heading 2", icon: <Heading2 className="h-4 w-4" />, run: () => insertLine("## ") },
    { label: "Heading 3", icon: <Heading3 className="h-4 w-4" />, run: () => insertLine("### ") },
    { label: "Bold", icon: <Bold className="h-4 w-4" />, run: () => insert("**", "**", "bold") },
    { label: "Italic", icon: <Italic className="h-4 w-4" />, run: () => insert("*", "*", "italic") },
    { label: "Strikethrough", icon: <Strikethrough className="h-4 w-4" />, run: () => insert("~~", "~~", "strike") },
    { label: "Inline code", icon: <Code className="h-4 w-4" />, run: () => insert("`", "`", "code") },
    { label: "Code block", icon: <FileText className="h-4 w-4" />, run: () => insert("```\n", "\n```", "code") },
    { label: "Link", icon: <Link2 className="h-4 w-4" />, run: () => insert("[", "](https://)", "text") },
    { label: "Image", icon: <Image className="h-4 w-4" />, run: () => insert("![", "](https://)", "alt") },
    { label: "Quote", icon: <Quote className="h-4 w-4" />, run: () => insertLine("> ") },
    { label: "Bullet list", icon: <List className="h-4 w-4" />, run: () => insertLine("- ") },
    { label: "Numbered list", icon: <ListOrdered className="h-4 w-4" />, run: () => insertLine("1. ") },
    { label: "Task list", icon: <ListTodo className="h-4 w-4" />, run: () => insertLine("- [ ] ") },
    { label: "Table", icon: <Table className="h-4 w-4" />, run: () => insert("\n| A | B |\n|---|---|\n| 1 | 2 |\n") },
    { label: "Divider", icon: <Minus className="h-4 w-4" />, run: () => insert("\n---\n") },
  ];

  const words = md.trim() ? md.trim().split(/\s+/).length : 0;
  const chars = md.length;

  const exportMd = () => {
    if (!trial.canUse) return;
    trial.recordUse();
    downloadBlob(new Blob([md], { type: "text/markdown" }), "document.md");
    toast.success("Markdown file downloaded");
  };

  const exportHtml = () => {
    if (!trial.canUse) return;
    trial.recordUse();
    const doc = `<!doctype html>\n<html>\n<head>\n<meta charset="utf-8">\n<title>Exported document</title>\n</head>\n<body>\n${html}\n</body>\n</html>\n`;
    downloadBlob(new Blob([doc], { type: "text/html" }), "document.html");
    toast.success("HTML file downloaded");
  };

  const copyHtml = async () => {
    try {
      await navigator.clipboard.writeText(html);
      toast.success("HTML copied");
    } catch {
      toast.error("Clipboard blocked - export the file instead.");
    }
  };

  const clearDraft = () => {
    if (!window.confirm("Clear the editor and delete the autosaved draft?")) return;
    setMd("");
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  };

  return (
    <ToolPageShell toolId="markdown-editor" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Markdown Editor" left={trial.left} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span><strong className="text-foreground">{words}</strong> words</span>
          <span><strong className="text-foreground">{chars}</strong> chars</span>
          <span className={cn("inline-flex items-center gap-1", saved && "text-emerald-500")}>
            {saved && <Check className="h-3.5 w-3.5" />}
            {saved ? "Autosaved" : "Saving…"}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={clearDraft}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold hover:border-primary/40"
          >
            New / clear
          </button>
          <button
            type="button"
            onClick={copyHtml}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-bold hover:border-primary/40"
          >
            <ClipboardCopy className="h-4 w-4" /> Copy HTML
          </button>
          <ActionButton disabled={!trial.canUse} onClick={exportHtml}>
            <Download className="h-4 w-4" /> Export .html
          </ActionButton>
          <ActionButton disabled={!trial.canUse} onClick={exportMd}>
            <Download className="h-4 w-4" /> Export .md
          </ActionButton>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/40 p-2">
          {tools.map((t) => (
            <button
              key={t.label}
              type="button"
              title={t.label}
              aria-label={t.label}
              onClick={t.run}
              className="rounded-lg p-2 text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
            >
              {t.icon}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-2">
          <div className="border-b border-border lg:border-b-0 lg:border-r">
            <p className="border-b border-border px-4 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Editor
            </p>
            <textarea
              ref={taRef}
              value={md}
              onChange={(e) => setMd(e.target.value)}
              spellCheck={false}
              placeholder="Write markdown here…"
              className="h-[480px] w-full resize-none bg-transparent p-4 font-mono text-sm leading-relaxed outline-none"
            />
          </div>
          <div>
            <p className="border-b border-border px-4 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Live preview
            </p>
            <div
              className="prose prose-sm h-[480px] max-w-none overflow-y-auto p-4 dark:prose-invert prose-pre:rounded-xl prose-pre:bg-muted prose-pre:p-3"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        </div>
      </div>

      {!isPro && (
        <p className="mt-4 text-xs text-muted-foreground">
          {trial.left} of {TOOL_TRIAL_LIMIT} free exports left. Your draft stays in this browser only.
        </p>
      )}
    </ToolPageShell>
  );
}
