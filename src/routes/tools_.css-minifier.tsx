// /tools/css-minifier - Minify or beautify CSS: strips comments, collapses
// whitespace, shortens hex colors, drops trailing semicolons. 100% in-browser.

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

export const Route = createFileRoute("/tools_/css-minifier")({
  head: () => {
    const seo = getToolSeoMeta("css-minifier");
    const canonical = "https://iconvault.site/tools/css-minifier";
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
  component: CssMinifierTool,
});

/** Protect strings so comment stripping never touches them. */
function protectStrings(css: string): { code: string; strings: string[] } {
  const strings: string[] = [];
  const code = css.replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g, (m) => {
    strings.push(m);
    return `@@STR${strings.length - 1}@@`;
  });
  return { code, strings };
}

function restoreStrings(css: string, strings: string[]): string {
  return css.replace(/@@STR(\d+)@@/g, (_, i: string) => strings[Number(i)] ?? "");
}

function minifyCss(css: string): string {
  const { code, strings } = protectStrings(css);
  let c = code.replace(/\/\*[\s\S]*?\*\//g, "");
  c = c
    .replace(/\s+/g, " ")
    .replace(/\s*([{}:;,>+~()])\s*/g, "$1")
    .replace(/@media\(/g, "@media (")
    .replace(/@supports\(/g, "@supports (")
    .replace(/\band\(/g, "and (")
    .replace(/\bor\(/g, "or (")
    .replace(/\bnot\(/g, "not (")
    // shorten #aabbcc -> #abc
    .replace(/#([0-9a-fA-F])\1([0-9a-fA-F])\2([0-9a-fA-F])\3\b/g, "#$1$2$3")
    // 0px -> 0
    .replace(/\b0(?:px|em|rem|ex|ch|vw|vh|vmin|vmax|pt|pc|in|cm|mm)\b/gi, "0")
    // drop last semicolon in a block
    .replace(/;}/g, "}")
    .trim();
  return restoreStrings(c, strings);
}

function beautifyCss(css: string): string {
  const { code, strings } = protectStrings(css);
  let c = code.replace(/\/\*[\s\S]*?\*\//g, "");
  c = c
    .replace(/\s*{\s*/g, " {\n")
    .replace(/\s*}\s*/g, "\n}\n")
    .replace(/\s*;\s*/g, ";\n")
    .replace(/\s*:\s*/g, ": ")
    .replace(/,\s*/g, ", ")
    .replace(/\s*>\s*/g, " > ")
    .replace(/\s*\+\s*/g, " + ")
    .replace(/\s*~\s*/g, " ~ ");
  const lines = c.split("\n").map((l) => l.trim()).filter((l) => l !== "");
  let depth = 0;
  const out = lines.map((line) => {
    const startsClose = line.startsWith("}");
    const d = Math.max(0, startsClose ? depth - 1 : depth);
    const indented = "  ".repeat(d) + line;
    const opens = (line.match(/\{/g) || []).length;
    const closes = (line.match(/\}/g) || []).length;
    depth = Math.max(0, depth + opens - closes);
    return indented;
  });
  return restoreStrings(out.join("\n"), strings).trim() + "\n";
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function CssMinifierTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("css-minifier", isPro);
  const seo = getToolSeo("css-minifier");

  const [mode, setMode] = useState<"minify" | "beautify">("minify");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(() => {
    if (!input.trim() || !trial.canUse) return;
    try {
      setOutput(mode === "minify" ? minifyCss(input) : beautifyCss(input));
      setError(null);
      trial.recordUse();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not process that CSS.");
    }
  }, [input, mode, trial]);

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
    downloadBlob(new Blob([output], { type: "text/css" }), mode === "minify" ? "style.min.css" : "style.css");
    toast.success("File downloaded");
  }, [output, mode]);

  const before = new TextEncoder().encode(input).length;
  const after = new TextEncoder().encode(output).length;
  const saved = before > 0 && output ? Math.max(0, Math.round((1 - after / before) * 100)) : 0;

  return (
    <ToolPageShell toolId="css-minifier" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="CSS Minifier" left={trial.left} />

      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
            <div className="flex rounded-xl border border-border p-1">
              {(["minify", "beautify"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn(
                    "rounded-lg px-4 py-1.5 text-sm font-semibold capitalize transition",
                    mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => { setInput(""); setOutput(""); setError(null); }} className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
              <Eraser className="h-3.5 w-3.5" /> Clear
            </button>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste CSS here"
            spellCheck={false}
            className="h-48 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <ActionButton disabled={!input.trim() || !trial.canUse} onClick={run}>
              <Minimize2 className="h-4 w-4" /> {mode === "minify" ? "Minify" : "Beautify"}
            </ActionButton>
            {output && (
              <div className="flex gap-4 text-sm">
                <span className="text-muted-foreground">Before <b className="text-foreground">{fmtBytes(before)}</b></span>
                <span className="text-muted-foreground">After <b className="text-foreground">{fmtBytes(after)}</b></span>
                {mode === "minify" && <span className="font-bold text-green-600">{saved}% smaller</span>}
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
            <p className="text-[13px] font-medium text-foreground/80">Output</p>
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
            placeholder="Result appears here"
            spellCheck={false}
            className="h-48 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm"
          />
        </div>

        <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
          Minifying strips comments, collapses whitespace, shortens colors like
          <code className="rounded bg-muted px-1">#ffffff</code> to
          <code className="rounded bg-muted px-1">#fff</code>, turns
          <code className="rounded bg-muted px-1">0px</code> into
          <code className="rounded bg-muted px-1">0</code>, and drops the last
          semicolon in each block. Quoted strings are protected throughout.
        </p>
      </div>
    </ToolPageShell>
  );
}
