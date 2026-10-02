// /tools/html-to-markdown - turn HTML into clean Markdown: headings, bold,
// links, images, lists, blockquotes, code blocks, tables. 100% client-side.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Download, FileCode2, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/html-to-markdown")({
  head: () => {
    const seo = getToolSeoMeta("html-to-markdown");
    const canonical = "https://iconvault.site/tools/html-to-markdown";
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
  component: HtmlToMarkdownTool,
});

const BLOCK_TAGS = new Set([
  "h1", "h2", "h3", "h4", "h5", "h6", "p", "div", "section", "article",
  "header", "footer", "main", "blockquote", "ul", "ol", "li", "pre", "hr",
  "table", "thead", "tbody", "tr",
]);

function inlineText(node: Node): string {
  let out = "";
  node.childNodes.forEach((child) => {
    if (child.nodeType === 3) {
      out += (child.textContent ?? "").replace(/\s+/g, " ");
    } else if (child.nodeType === 1) {
      const el = child as HTMLElement;
      const tag = el.tagName.toLowerCase();
      const inner = inlineText(el);
      switch (tag) {
        case "strong":
        case "b":
          out += `**${inner}**`;
          break;
        case "em":
        case "i":
          out += `*${inner}*`;
          break;
        case "s":
        case "strike":
        case "del":
          out += `~~${inner}~~`;
          break;
        case "u":
          out += `__${inner}__`;
          break;
        case "code":
          out += `\`${inner}\``;
          break;
        case "a": {
          const href = el.getAttribute("href") ?? "";
          out += href ? `[${inner}](${href})` : inner;
          break;
        }
        case "img": {
          const src = el.getAttribute("src") ?? "";
          const alt = el.getAttribute("alt") ?? "";
          out += `![${alt}](${src})`;
          break;
        }
        case "br":
          out += "\n";
          break;
        default:
          out += inner;
      }
    }
  });
  return out;
}

function blockToMd(el: Element, depth: number): string {
  const tag = el.tagName.toLowerCase();
  switch (tag) {
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6":
      return `${"#".repeat(Number(tag.charAt(1)))} ${inlineText(el).trim()}\n\n`;
    case "p":
    case "div":
    case "section":
    case "article":
    case "header":
    case "footer":
    case "main": {
      const t = blockChildren(el, depth).trim();
      return t ? `${t}\n\n` : "";
    }
    case "blockquote": {
      const t = blockChildren(el, depth).trim();
      if (!t) return "";
      return `${t.split("\n").map((l) => `> ${l}`).join("\n")}\n\n`;
    }
    case "ul":
    case "ol":
      return listToMd(el, depth);
    case "li":
      return `- ${inlineText(el).trim()}\n`;
    case "pre": {
      const code = (el.textContent ?? "").replace(/^\n+|\n+$/g, "");
      return `\`\`\`\n${code}\n\`\`\`\n\n`;
    }
    case "hr":
      return `---\n\n`;
    case "table":
      return tableToMd(el);
    default:
      return blockChildren(el, depth);
  }
}

function blockChildren(el: Element, depth: number): string {
  let out = "";
  el.childNodes.forEach((n) => {
    if (n.nodeType === 3) {
      const t = (n.textContent ?? "").replace(/\s+/g, " ");
      if (t.trim()) out += t;
    } else if (n.nodeType === 1) {
      const tag = (n as Element).tagName.toLowerCase();
      out += BLOCK_TAGS.has(tag) ? blockToMd(n as Element, depth) : inlineText(n);
    }
  });
  return out;
}

function liToMd(li: Element, depth: number, marker: string): string {
  const indent = "  ".repeat(depth);
  let first = "";
  let rest = "";
  li.childNodes.forEach((n) => {
    if (n.nodeType === 1) {
      const tag = (n as Element).tagName.toLowerCase();
      if (tag === "ul" || tag === "ol") rest += listToMd(n as Element, depth + 1);
      else if (BLOCK_TAGS.has(tag)) rest += blockToMd(n as Element, depth + 1);
      else first += inlineText(n);
    } else if (n.nodeType === 3) {
      first += (n.textContent ?? "").replace(/\s+/g, " ");
    }
  });
  return `${indent}${marker}${first.trim()}\n${rest}`;
}

function listToMd(el: Element, depth: number): string {
  const ordered = el.tagName.toLowerCase() === "ol";
  let out = "";
  let i = 1;
  el.childNodes.forEach((n) => {
    if (n.nodeType === 1 && (n as Element).tagName.toLowerCase() === "li") {
      out += liToMd(n as Element, depth, ordered ? `${i}. ` : "- ");
      i++;
    }
  });
  return `${out}${depth === 0 ? "\n" : ""}`;
}

function tableToMd(table: Element): string {
  const rows: string[][] = [];
  table.querySelectorAll("tr").forEach((tr) => {
    const cells: string[] = [];
    tr.querySelectorAll("th, td").forEach((c) => cells.push(inlineText(c).trim().replace(/\|/g, "\\|")));
    if (cells.length > 0) rows.push(cells);
  });
  if (rows.length === 0) return "";
  const header = rows[0]!;
  const sep = header.map(() => "---");
  const body = rows.slice(1).map((r) => `| ${r.join(" | ")} |`);
  return `| ${header.join(" | ")} |\n| ${sep.join(" | ")} |\n${body.join("\n")}\n\n`;
}

function htmlToMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return "";
  const md = blockToMd(root, 0);
  return md.replace(/\n{3,}/g, "\n\n").trim();
}

const SAMPLE = `<h2>Welcome to Markdown</h2>
<p>This is <strong>bold</strong>, <em>italic</em> and a <a href="https://iconvault.site">link</a>.</p>
<ul><li>First item</li><li>Second item</li></ul>
<blockquote>A quoted line.</blockquote>
<pre><code>const x = 1;</code></pre>`;

function HtmlToMarkdownTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("html-to-markdown", isPro);
  const seo = getToolSeo("html-to-markdown");

  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const convert = () => {
    if (!input.trim() || !trial.canUse) return;
    setBusy(true);
    try {
      setOutput(htmlToMarkdown(input));
      setCopied(false);
      trial.recordUse();
      toast.success("HTML converted to Markdown");
    } catch {
      toast.error("Could not parse that HTML");
    } finally {
      setBusy(false);
    }
  };

  const copy = () => {
    if (!output) return;
    navigator.clipboard
      .writeText(output)
      .then(() => {
        setCopied(true);
        toast.success("Markdown copied");
      })
      .catch(() => toast.error("Copy failed"));
  };

  const download = () => {
    if (!output || !trial.canUse) return;
    downloadBlob(new Blob([output], { type: "text/markdown" }), "converted.md");
    trial.recordUse();
    toast.success("Markdown file downloaded");
  };

  return (
    <ToolPageShell toolId="html-to-markdown" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="HTML to Markdown" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-bold">HTML input</span>
            <button
              type="button"
              onClick={() => setInput(SAMPLE)}
              className="text-xs font-bold text-primary hover:underline"
            >
              Load sample
            </button>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste HTML here..."
            spellCheck={false}
            className="h-72 w-full resize-y rounded-xl border border-border bg-background p-3 font-mono text-[13px] leading-relaxed outline-none focus:border-primary"
          />
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-bold">Markdown output</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={copy}
                disabled={!output}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                type="button"
                onClick={download}
                disabled={!output || !trial.canUse}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-bold transition hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="h-4 w-4" /> .md
              </button>
            </div>
          </div>
          {output ? (
            <textarea
              value={output}
              readOnly
              spellCheck={false}
              className="h-72 w-full resize-y rounded-xl border border-border bg-background p-3 font-mono text-[13px] leading-relaxed outline-none"
            />
          ) : (
            <div className="flex h-72 flex-col items-center justify-center rounded-xl border border-dashed border-border text-center">
              <FileCode2 className="mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm font-semibold text-muted-foreground">
                Paste HTML, hit convert, clean Markdown appears here
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex items-center gap-4">
        <ActionButton busy={busy} disabled={!input.trim() || !trial.canUse} onClick={convert}>
          <RefreshCcw className="h-4 w-4" /> {busy ? "Converting…" : "Convert to Markdown"}
        </ActionButton>
        {!isPro && (
          <p className="text-xs text-muted-foreground">
            {trial.left} of {TOOL_TRIAL_LIMIT} free conversions left - runs fully in your browser.
          </p>
        )}
      </div>
    </ToolPageShell>
  );
}
