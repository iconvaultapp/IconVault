// /tools/content-editable-playground - Rich-text editing lab: execCommand toolbar,
// plaintext-only vs rich mode, live selection inspector, and HTML output. In-browser.

import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bold, Copy, Download, Italic, List, ListOrdered, ScanSearch, Strikethrough, Underline } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/content-editable-playground")({
  head: () => {
    const seo = getToolSeoMeta("content-editable-playground");
    const canonical = "https://iconvault.site/tools/content-editable-playground";
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
  component: ContentEditableLab,
});

type Mode = "true" | "plaintext-only";

const STARTER = `<h2>Try editing me</h2><p>Select some text and hit <b>bold</b> or <i>italic</i>. Switch to <code>plaintext-only</code> mode to see formatting get stripped on paste and input.</p><ul><li>Bullet one</li><li>Bullet two</li></ul>`;

function ContentEditableLab() {
  const { isPro } = usePlan();
  const trial = useToolTrial("content-editable-playground", isPro);
  const seo = getToolSeo("content-editable-playground");

  const [mode, setMode] = useState<Mode>("true");
  const [html, setHtml] = useState(STARTER);
  const [selInfo, setSelInfo] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const exec = (cmd: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    setHtml(editorRef.current?.innerHTML ?? "");
  };

  const inspect = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) { setSelInfo("No selection right now. Select text in the editor first."); return; }
    const r = sel.getRangeAt(0);
    const nodeName = (n: Node | null) => n ? `${n.nodeName.toLowerCase()}${n.nodeType === 3 ? ` ("${(n.textContent ?? "").slice(0, 24)}")` : ""}` : "none";
    setSelInfo(
      `collapsed: ${r.collapsed}\nselected text: "${sel.toString().slice(0, 80)}"\nstart: ${nodeName(r.startContainer)} @ offset ${r.startOffset}\nend: ${nodeName(r.endContainer)} @ offset ${r.endOffset}\ncommon ancestor: ${nodeName(r.commonAncestorContainer)}`,
    );
  };

  const copyHtml = () => {
    if (!trial.canUse) return;
    void navigator.clipboard.writeText(html);
    trial.recordUse();
    toast.success("Editor HTML copied");
  };

  const download = () => {
    if (!trial.canUse) return;
    downloadBlob(new Blob([html], { type: "text/html" }), "contenteditable-output.html");
    trial.recordUse();
    toast.success("HTML downloaded");
  };

  const toolBtn = (title: string, onClick: () => void, icon: React.ReactNode, label?: string) => (
    <button key={title} type="button" title={title} aria-label={title} onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-2 text-sm font-bold transition hover:border-primary/50 hover:text-primary">
      {icon}{label && <span className="text-xs">{label}</span>}
    </button>
  );

  return (
    <ToolPageShell toolId="content-editable-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="ContentEditable Playground" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center gap-2">
            {toolBtn("Bold", () => exec("bold"), <Bold className="h-4 w-4" />)}
            {toolBtn("Italic", () => exec("italic"), <Italic className="h-4 w-4" />)}
            {toolBtn("Underline", () => exec("underline"), <Underline className="h-4 w-4" />)}
            {toolBtn("Strikethrough", () => exec("strikeThrough"), <Strikethrough className="h-4 w-4" />)}
            {toolBtn("Bullet list", () => exec("insertUnorderedList"), <List className="h-4 w-4" />)}
            {toolBtn("Numbered list", () => exec("insertOrderedList"), <ListOrdered className="h-4 w-4" />)}
            {toolBtn("Heading", () => exec("formatBlock", "h3"), null, "H3")}
            {toolBtn("Paragraph", () => exec("formatBlock", "p"), null, "P")}
            {toolBtn("Clear formatting", () => exec("removeFormat"), null, "Tx")}
          </div>

          <div
            ref={editorRef}
            contentEditable={mode === "true" ? true : "plaintext-only"}
            suppressContentEditableWarning
            onInput={(e) => setHtml((e.target as HTMLDivElement).innerHTML)}
            className={cn(
              "prose prose-sm min-h-[280px] max-w-none rounded-xl border border-border bg-background p-4 text-sm outline-none transition focus:border-primary/60",
              "dark:prose-invert [&_h2]:text-lg [&_h2]:font-extrabold [&_h3]:text-base [&_h3]:font-extrabold",
            )}
            dangerouslySetInnerHTML={{ __html: STARTER }}
          />

          <div className="flex flex-wrap gap-2">
            <ActionButton onClick={inspect}><ScanSearch className="h-4 w-4" /> Inspect selection</ActionButton>
            <button type="button" onClick={copyHtml} disabled={!trial.canUse}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-bold transition hover:border-primary/50 disabled:opacity-50">
              <Copy className="h-4 w-4" /> Copy HTML
            </button>
            <button type="button" onClick={download} disabled={!trial.canUse}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-bold transition hover:border-primary/50 disabled:opacity-50">
              <Download className="h-4 w-4" /> .html
            </button>
          </div>
          {!isPro && <p className="text-xs text-muted-foreground">{trial.left} of {TOOL_TRIAL_LIMIT} free copies left.</p>}

          {selInfo && (
            <div className="rounded-xl bg-muted/50 p-4">
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">Selection inspector</p>
              <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed">{selInfo}</pre>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Editing mode</p>
            <div className="flex gap-2">
              {(["true", "plaintext-only"] as Mode[]).map((m) => (
                <button key={m} type="button" onClick={() => setMode(m)}
                  className={cn("rounded-xl border px-3 py-2 font-mono text-sm font-bold transition",
                    mode === m ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40")}>
                  {m === "true" ? "rich text" : "plaintext-only"}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {mode === "true"
                ? "Full rich text: pasted content keeps its formatting, execCommand styles apply."
                : "Plaintext-only: the browser strips formatting on paste and input, while keeping line breaks. Great for comment boxes."}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Live innerHTML output</p>
            <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap break-all rounded-xl bg-muted/60 p-3 font-mono text-xs leading-relaxed">{html}</pre>
            <p className="mt-2 text-xs text-muted-foreground">Note: document.execCommand is officially deprecated but remains the only built-in rich-text editing API, so every browser still supports it.</p>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
