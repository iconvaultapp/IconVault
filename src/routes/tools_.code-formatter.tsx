// /tools/code-formatter - Lightweight code formatter (indentation, brace newlines,
// spacing) for JS/TS, CSS, HTML, YAML, Markdown and JSON. 100% in-browser.
// Honest note: this is a lightweight formatter, not a full Prettier port.

import { useCallback, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Eraser, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/code-formatter")({
  head: () => {
    const seo = getToolSeoMeta("code-formatter");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: CodeFormatterTool,
});

const LANGS = [
  { id: "js", label: "JavaScript / TypeScript" },
  { id: "css", label: "CSS" },
  { id: "html", label: "HTML" },
  { id: "json", label: "JSON" },
  { id: "yaml", label: "YAML" },
  { id: "markdown", label: "Markdown" },
] as const;

/** Strip strings and comments so brace/tag counting ignores them. */
function stripStrings(line: string): string {
  return line
    .replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g, (m) => " ".repeat(m.length))
    .replace(/\/\/.*$/, "")
    .replace(/\/\*[\s\S]*?\*\//g, (m) => " ".repeat(m.length));
}

function indentByBraces(lines: string[]): string {
  let depth = 0;
  return lines
    .map((raw) => {
      const line = raw.trim();
      if (!line) return "";
      const stripped = stripStrings(line);
      const startsClose = stripped.startsWith("}");
      const d = Math.max(0, startsClose ? depth - 1 : depth);
      const out = "  ".repeat(d) + line;
      const opens = (stripped.match(/\{/g) || []).length;
      const closes = (stripped.match(/\}/g) || []).length;
      depth = Math.max(0, depth + opens - closes);
      return out;
    })
    .join("\n");
}

function normalizeJsSpacing(code: string): string {
  return code
    .split("\n")
    .map((line) => {
      let s = line
        .replace(/[ \t]+/g, " ")
        .replace(/,(?=\S)/g, ", ")
        .replace(/;(?=\S)/g, "; ")
        .replace(/(?<![=!<>])=(?![=>])/g, " = ")
        .replace(/=>(?=\S)/g, "=> ")
        .replace(/\s+=>/g, " =>")
        .replace(/\)(?=\S)/g, ") ")
        .replace(/\s{2,}/g, " ");
      return s.replace(/[ \t]+$/g, "");
    })
    .join("\n");
}

function formatJs(code: string): string {
  // Protect strings and comments, split braces onto their own lines, then indent.
  const tokens: string[] = [];
  const ph = (s: string) => `@@${tokens.push(s) - 1}@@`;
  let c = code
    .replace(/\/\*[\s\S]*?\*\//g, ph)
    .replace(/\/\/[^\n]*/g, ph)
    .replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g, ph);
  c = c
    .replace(/\{/g, "\n{\n")
    .replace(/\}/g, "\n}\n")
    .replace(/;(?![^{}]*})/g, ";\n");
  c = indentByBraces(c.split("\n")).replace(/\n{3,}/g, "\n\n");
  const restore = (s: string) =>
    s.replace(/@@(\d+)@@/g, (_, i: string) => tokens[Number(i)] ?? "");
  return normalizeJsSpacing(restore(c)).replace(/[ \t]+\n/g, "\n").trim() + "\n";
}

function formatCss(code: string): string {
  const tokens: string[] = [];
  const ph = (s: string) => `@@${tokens.push(s) - 1}@@`;
  let c = code
    .replace(/\/\*[\s\S]*?\*\//g, ph)
    .replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g, ph);
  c = c
    .replace(/\s*{\s*/g, " {\n")
    .replace(/\s*}\s*/g, "\n}\n")
    .replace(/\s*;\s*/g, ";\n")
    .replace(/\s*:\s*/g, ": ")
    .replace(/,\s*/g, ", ");
  const restore = (s: string) =>
    s.replace(/@@(\d+)@@/g, (_, i: string) => tokens[Number(i)] ?? "");
  return restore(indentByBraces(c.split("\n")))
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim() + "\n";
}

const HTML_VOID = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input", "link",
  "meta", "param", "source", "track", "wbr",
]);

function formatHtml(code: string): string {
  const tokens: string[] = [];
  const ph = (s: string) => `@@${tokens.push(s) - 1}@@`;
  let c = code
    .replace(/<!--[\s\S]*?-->/g, ph)
    .replace(/<script[\s>][\s\S]*?<\/script\s*>/gi, ph)
    .replace(/<style[\s>][\s\S]*?<\/style\s*>/gi, ph)
    .replace(/<pre[\s>][\s\S]*?<\/pre\s*>/gi, ph);
  c = c.replace(/>\s*</g, ">\n<");
  const lines = c.split("\n").map((l) => l.trim()).filter((l) => l !== "");
  let depth = 0;
  const out = lines.map((line) => {
    const close = line.match(/^<\/([A-Za-z][\w-]*)/);
    const open = line.match(/^<([A-Za-z][\w-]*)(?=[\s>/])/);
    const selfClose = /\/>$/.test(line) || (open && open[1] !== undefined && HTML_VOID.has(open[1].toLowerCase()));
    let d = depth;
    if (close) d = Math.max(0, depth - 1);
    const indented = "  ".repeat(d) + line;
    if (close) depth = Math.max(0, depth - 1);
    else if (open && !selfClose && !/^<[^>]*>.*<\/[^>]+>$/.test(line)) depth += 1;
    return indented;
  });
  const restore = (s: string) =>
    s.replace(/@@(\d+)@@/g, (_, i: string) => tokens[Number(i)] ?? "");
  return restore(out.join("\n")) + "\n";
}

function formatPlain(code: string): string {
  return code
    .split("\n")
    .map((l) => l.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim() + "\n";
}

function formatCode(code: string, lang: string): string {
  switch (lang) {
    case "json":
      return JSON.stringify(JSON.parse(code), null, 2) + "\n";
    case "js":
      return formatJs(code);
    case "css":
      return formatCss(code);
    case "html":
      return formatHtml(code);
    case "yaml":
    case "markdown":
      return formatPlain(code);
    default:
      return code;
  }
}

function CodeFormatterTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("code-formatter", isPro);
  const seo = getToolSeo("code-formatter");

  const [lang, setLang] = useState<(typeof LANGS)[number]["id"]>("js");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const format = useCallback(() => {
    if (!input.trim() || !trial.canUse) return;
    try {
      setOutput(formatCode(input, lang));
      setError(null);
      trial.recordUse();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not format that code.");
    }
  }, [input, lang, trial]);

  const copy = useCallback(async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      toast.success("Formatted code copied");
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
    <ToolPageShell toolId="code-formatter" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Code Formatter" left={trial.left} />

      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
            <label className="text-[13px] font-medium text-foreground/80">
              Language
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as typeof lang)}
                className="ml-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
              >
                {LANGS.map((l) => (
                  <option key={l.id} value={l.id}>{l.label}</option>
                ))}
              </select>
            </label>
            <button type="button" onClick={clear} className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
              <Eraser className="h-3.5 w-3.5" /> Clear
            </button>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste your code here"
            spellCheck={false}
            className="h-52 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <ActionButton disabled={!input.trim() || !trial.canUse} onClick={format}>
              <Sparkles className="h-4 w-4" /> Format
            </ActionButton>
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
            <p className="text-[13px] font-medium text-foreground/80">Formatted output</p>
            {output && (
              <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
                <Copy className="h-3.5 w-3.5" /> Copy
              </button>
            )}
          </div>
          <textarea
            value={output}
            readOnly
            placeholder="Formatted code appears here"
            spellCheck={false}
            className="h-52 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm"
          />
        </div>

        <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
          This is a lightweight formatter, not a full Prettier port. It fixes indentation,
          brace placement and common spacing issues, and validates JSON strictly. It does
          not reflow long lines or enforce style rules.
        </p>
      </div>
    </ToolPageShell>
  );
}
