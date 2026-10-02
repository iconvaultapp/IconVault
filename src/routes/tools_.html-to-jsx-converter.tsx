// /tools/html-to-jsx-converter - Convert HTML markup to JSX (className, htmlFor,
// style objects, JSX comments, self-closing void tags). 100% in-browser.

import { useCallback, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRightLeft, Copy, Eraser } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/html-to-jsx-converter")({
  head: () => {
    const seo = getToolSeoMeta("html-to-jsx-converter");
    const canonical = "https://iconvault.site/tools/html-to-jsx-converter";
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
  component: HtmlToJsxTool,
});

const VOID_TAGS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
]);

const ATTR_MAP: Record<string, string> = {
  class: "className",
  for: "htmlFor",
  tabindex: "tabIndex",
  maxlength: "maxLength",
  readonly: "readOnly",
  colspan: "colSpan",
  rowspan: "rowSpan",
  srcset: "srcSet",
  "http-equiv": "httpEquiv",
  "accept-charset": "acceptCharset",
  accesskey: "accessKey",
  crossorigin: "crossOrigin",
  datetime: "dateTime",
  enctype: "encType",
  hreflang: "hrefLang",
  spellcheck: "spellCheck",
  usemap: "useMap",
  frameborder: "frameBorder",
  contenteditable: "contentEditable",
  allowfullscreen: "allowFullScreen",
};

function camelize(name: string): string {
  return name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

function styleToJsx(style: string): string {
  const entries = style
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((decl) => {
      const i = decl.indexOf(":");
      if (i < 0) return null;
      const key = camelize(decl.slice(0, i).trim());
      const val = decl.slice(i + 1).trim().replace(/"/g, "'");
      return `${key}: "${val}"`;
    })
    .filter(Boolean);
  return `{{ ${entries.join(", ")} }}`;
}

function convertAttr(attr: string): string {
  const m = attr.match(/^([A-Za-z-]+)(\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?$/);
  if (!m) return attr;
  const lower = (m[1] ?? "").toLowerCase();
  let jsxName =
    ATTR_MAP[lower] ??
    (/^on[a-z]/.test(lower)
      ? "on" + (lower[2] ?? "").toUpperCase() + lower.slice(3)
      : camelize(lower));
  if (!m[2]) return jsxName; // boolean attribute
  const eq = m[2].trim();
  const valMatch = eq.match(/^=\s*(["'])([\s\S]*)\1$/);
  if (lower === "style" && valMatch) return `${jsxName}=${styleToJsx(valMatch[2] ?? "")}`;
  if (valMatch) return `${jsxName}=${valMatch[1]}${valMatch[2]}${valMatch[1]}`;
  return `${jsxName}${m[2]}`;
}

function convertTag(tag: string): string {
  if (/^<!--[\s\S]*-->$/.test(tag)) return `{/*${tag.slice(4, -3)}*/}`;
  if (tag.startsWith("</") || tag.startsWith("<!") || tag.startsWith("<?")) return tag;
  const m = tag.match(/^<([A-Za-z][\w-]*)((?:\s[\s\S]*)?)\/?>$/s);
  if (!m) return tag;
  const name = m[1] ?? "";
  const attrs = (m[2] ?? "")
    .replace(/[A-Za-z-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?/g, convertAttr)
    .replace(/\s{2,}/g, " ");
  const needsClose = /\/>$/.test(tag) || VOID_TAGS.has(name.toLowerCase());
  return `<${name}${attrs}${needsClose ? " /" : ""}>`;
}

function convertHtmlToJsx(html: string): string {
  return html.replace(
    /<!--[\s\S]*?-->|<![A-Za-z][^>]*>|<[A-Za-z][\w-]*(?:\s[^<>]*)?\/?>|<\/[A-Za-z][\w-]*\s*>/g,
    convertTag,
  );
}

const SAMPLE = `<div class="card" onclick="doThing()">
  <!-- card header -->
  <img src="/logo.png" alt="logo">
  <label for="email">Email</label>
  <input type="email" id="email" tabindex="1" style="margin-top: 8px; color: red;">
  <br>
  <button class="btn" disabled>Save</button>
</div>`;

function HtmlToJsxTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("html-to-jsx-converter", isPro);
  const seo = getToolSeo("html-to-jsx-converter");

  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const convert = useCallback(() => {
    if (!input.trim() || !trial.canUse) return;
    try {
      setOutput(convertHtmlToJsx(input));
      setError(null);
      trial.recordUse();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Conversion failed.");
    }
  }, [input, trial]);

  const copy = useCallback(async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      toast.success("JSX copied to clipboard");
    } catch {
      toast.error("Copy failed - select the text manually.");
    }
  }, [output]);

  const clear = useCallback(() => {
    setInput("");
    setOutput("");
    setError(null);
  }, []);

  return (
    <ToolPageShell toolId="html-to-jsx-converter" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="HTML to JSX" left={trial.left} />

      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[13px] font-medium text-foreground/80">HTML input</p>
            <button type="button" onClick={() => setInput(SAMPLE)} className="text-xs font-semibold text-primary hover:underline">
              Load sample
            </button>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='<div class="card">...</div>'
            spellCheck={false}
            className="h-48 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ActionButton disabled={!input.trim() || !trial.canUse} onClick={convert}>
            <ArrowRightLeft className="h-4 w-4" /> Convert to JSX
          </ActionButton>
          <button
            type="button"
            onClick={clear}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-primary/40"
          >
            <Eraser className="h-4 w-4" /> Clear
          </button>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free conversions left - runs in your browser, nothing is uploaded.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[13px] font-medium text-foreground/80">JSX output</p>
            {output && (
              <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
                <Copy className="h-3.5 w-3.5" /> Copy
              </button>
            )}
          </div>
          <textarea
            value={output}
            readOnly
            placeholder="Converted JSX appears here"
            spellCheck={false}
            className="h-48 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm"
          />
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-2 text-sm font-semibold">What it converts</p>
          <ul className="grid gap-1.5 text-sm text-muted-foreground sm:grid-cols-2">
            <li><code className="rounded bg-muted px-1">class</code> to <code className="rounded bg-muted px-1">className</code>, <code className="rounded bg-muted px-1">for</code> to <code className="rounded bg-muted px-1">htmlFor</code></li>
            <li><code className="rounded bg-muted px-1">style="..."</code> to <code className="rounded bg-muted px-1">style=&#123;&#123;...&#125;&#125;</code></li>
            <li><code className="rounded bg-muted px-1">&lt;!-- --&gt;</code> comments to <code className="rounded bg-muted px-1">&#123;/* */&#125;</code></li>
            <li>Void tags like <code className="rounded bg-muted px-1">&lt;img&gt;</code> self-close to <code className="rounded bg-muted px-1">&lt;img /&gt;</code></li>
            <li><code className="rounded bg-muted px-1">onclick</code> to <code className="rounded bg-muted px-1">onClick</code>, hyphenated attrs camelCased</li>
            <li>Closing tags, doctype and boolean attributes pass through</li>
          </ul>
        </div>
      </div>
    </ToolPageShell>
  );
}
