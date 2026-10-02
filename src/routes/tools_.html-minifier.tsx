// /tools/html-minifier - Minify HTML: strip comments, collapse whitespace,
// remove optional quotes, basic inline CSS/JS minification. 100% in-browser.
// <pre>, <textarea>, <script> and <style> contents are always preserved.

import { useCallback, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Download, Eraser, Minimize2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/html-minifier")({
  head: () => {
    const seo = getToolSeoMeta("html-minifier");
    const canonical = "https://iconvault.site/tools/html-minifier";
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
  component: HtmlMinifierTool,
});

interface Options {
  stripComments: boolean;
  collapseWhitespace: boolean;
  removeQuotes: boolean;
  minifyInline: boolean;
}

/** Hide blocks whose whitespace must never be touched. */
function protectBlocks(html: string): { code: string; blocks: string[] } {
  const blocks: string[] = [];
  const code = html.replace(
    /<(pre|textarea|script|style)(\s[^>]*)?>[\s\S]*?<\/\1\s*>/gi,
    (m) => {
      blocks.push(m);
      return `@@BLK${blocks.length - 1}@@`;
    },
  );
  return { code, blocks };
}

function minifyInlineCss(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}:;,>+~])\s*/g, "$1")
    .replace(/;}/g, "}")
    .trim();
}

/** Basic inline JS cleanup: string-aware comment strip + whitespace collapse. */
function minifyInlineJs(js: string): string {
  const tokens: string[] = [];
  const ph = (s: string) => `@@JS${tokens.push(s) - 1}@@`;
  let c = js
    .replace(/\/\*[\s\S]*?\*\//g, ph)
    .replace(/\/\/[^\n]*/g, ph)
    .replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g, ph);
  c = c.replace(/[ \t]+/g, " ");
  return c.replace(/@@JS(\d+)@@/g, (_, i: string) => tokens[Number(i)] ?? "");
}

function minifyHtml(html: string, opts: Options): string {
  const { code, blocks } = protectBlocks(html);
  let c = code;
  if (opts.stripComments) c = c.replace(/<!--(?!\[)[\s\S]*?-->/g, "");
  if (opts.minifyInline) {
    c = c.replace(/(<style(\s[^>]*)?>)([\s\S]*?)(<\/style\s*>)/gi, (_, open, _a, body, close) => open + minifyInlineCss(body) + close);
    c = c.replace(/(<script(\s[^>]*)?>)([\s\S]*?)(<\/script\s*>)/gi, (_, open, _a, body, close) => open + minifyInlineJs(body) + close);
  }
  if (opts.collapseWhitespace) {
    c = c
      .replace(/>\s+</g, "><")
      .replace(/\s+/g, " ")
      .replace(/^\s+|\s+$/g, "");
  }
  if (opts.removeQuotes) {
    // Only quote-free values with no whitespace or special chars.
    c = c.replace(/="([A-Za-z0-9\-_:.]+)"/g, "=$1");
  }
  return c.replace(/@@BLK(\d+)@@/g, (_, i: string) => blocks[Number(i)] ?? "");
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

const OPT_LABELS: { key: keyof Options; label: string }[] = [
  { key: "stripComments", label: "Strip comments" },
  { key: "collapseWhitespace", label: "Collapse whitespace" },
  { key: "removeQuotes", label: "Remove optional quotes" },
  { key: "minifyInline", label: "Minify inline CSS/JS (basic)" },
];

function HtmlMinifierTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("html-minifier", isPro);
  const seo = getToolSeo("html-minifier");

  const [opts, setOpts] = useState<Options>({
    stripComments: true,
    collapseWhitespace: true,
    removeQuotes: true,
    minifyInline: true,
  });
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(() => {
    if (!input.trim() || !trial.canUse) return;
    try {
      setOutput(minifyHtml(input, opts));
      setError(null);
      trial.recordUse();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not minify that HTML.");
    }
  }, [input, opts, trial]);

  const copy = useCallback(async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      toast.success("Output copied");
    } catch {
      toast.error("Copy failed - select the text manually.");
    }
  }, [output]);

  const download = useCallback(() => {
    if (!output) return;
    downloadBlob(new Blob([output], { type: "text/html" }), "index.min.html");
    toast.success("File downloaded");
  }, [output]);

  const before = new TextEncoder().encode(input).length;
  const after = new TextEncoder().encode(output).length;
  const saved = before > 0 && output ? Math.max(0, Math.round((1 - after / before) * 100)) : 0;

  return (
    <ToolPageShell toolId="html-minifier" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="HTML Minifier" left={trial.left} />

      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-2 text-[13px] font-medium text-foreground/80">Options</p>
          <div className="mb-4 flex flex-wrap gap-2">
            {OPT_LABELS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setOpts((p) => ({ ...p, [key]: !p[key] }))}
                className={cn(
                  "rounded-xl border px-3.5 py-2 text-sm font-semibold transition",
                  opts[key]
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste HTML here"
            spellCheck={false}
            className="h-44 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <ActionButton disabled={!input.trim() || !trial.canUse} onClick={run}>
              <Minimize2 className="h-4 w-4" /> Minify
            </ActionButton>
            <button type="button" onClick={() => { setInput(""); setOutput(""); setError(null); }} className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
              <Eraser className="h-3.5 w-3.5" /> Clear
            </button>
            {output && (
              <div className="flex gap-4 text-sm">
                <span className="text-muted-foreground">Before <b className="text-foreground">{fmtBytes(before)}</b></span>
                <span className="text-muted-foreground">After <b className="text-foreground">{fmtBytes(after)}</b></span>
                <span className="font-bold text-green-600">{saved}% smaller</span>
              </div>
            )}
            {!isPro && (
              <p className="text-xs text-muted-foreground">
                {trial.left} of {TOOL_TRIAL_LIMIT} free runs left - runs in your browser, nothing is uploaded.
              </p>
            )}
          </div>
          {error && <p className="mt-2 text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[13px] font-medium text-foreground/80">Minified output</p>
            {output && (
              <div className="flex gap-2">
                <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
                  <Copy className="h-3.5 w-3.5" /> Copy
                </button>
                <button type="button" onClick={download} className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
                  <Download className="h-3.5 w-3.5" /> Download
                </button>
              </div>
            )}
          </div>
          <textarea
            value={output}
            readOnly
            placeholder="Minified HTML appears here"
            spellCheck={false}
            className="h-44 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm"
          />
        </div>

        <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
          The contents of <code className="rounded bg-muted px-1">&lt;pre&gt;</code>,
          <code className="rounded bg-muted px-1">&lt;textarea&gt;</code>,
          <code className="rounded bg-muted px-1">&lt;script&gt;</code> and
          <code className="rounded bg-muted px-1">&lt;style&gt;</code> blocks are never
          whitespace-collapsed. Optional quotes are only removed from simple values with no
          spaces or special characters.
        </p>
      </div>
    </ToolPageShell>
  );
}
