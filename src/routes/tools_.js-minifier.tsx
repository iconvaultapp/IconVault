// /tools/js-minifier - Minify or beautify JavaScript with a real string/regex
// aware tokenizer. Newlines are preserved where ASI safety needs them.
// 100% in-browser.

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

export const Route = createFileRoute("/tools_/js-minifier")({
  head: () => {
    const seo = getToolSeoMeta("js-minifier");
    const canonical = "https://iconvault.site/tools/js-minifier";
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
  component: JsMinifierTool,
});

type TokType = "word" | "num" | "str" | "regex" | "op" | "ws" | "comment";
interface Tok { type: TokType; value: string; newline: boolean }

const REGEX_AFTER = new Set([
  "(", ",", "=", ":", "[", "!", "&", "|", "?", "{", "}", ";", "+", "-", "*", "%",
  "<", ">", "^", "~", "return", "typeof", "case", "do", "else", "in", "of",
  "new", "delete", "void", "throw", "yield", "await",
]);

function tokenize(code: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  let prevSignificant: Tok | null = null;
  const push = (t: Tok) => {
    toks.push(t);
    if (t.type !== "ws" && t.type !== "comment") prevSignificant = t;
  };
  while (i < code.length) {
    const ch = code[i] ?? "";
    // whitespace
    if (/\s/.test(ch)) {
      let j = i;
      let nl = false;
      while (j < code.length && /\s/.test(code[j] ?? "")) {
        if (code[j] === "\n") nl = true;
        j++;
      }
      push({ type: "ws", value: code.slice(i, j), newline: nl });
      i = j;
      continue;
    }
    // line comment
    if (ch === "/" && code[i + 1] === "/") {
      let j = i + 2;
      while (j < code.length && code[j] !== "\n") j++;
      push({ type: "comment", value: code.slice(i, j), newline: false });
      i = j;
      continue;
    }
    // block comment
    if (ch === "/" && code[i + 1] === "*") {
      const end = code.indexOf("*/", i + 2);
      const j = end < 0 ? code.length : end + 2;
      push({ type: "comment", value: code.slice(i, j), newline: code.slice(i, j).includes("\n") });
      i = j;
      continue;
    }
    // strings
    if (ch === "'" || ch === '"') {
      let j = i + 1;
      while (j < code.length && (code[j] !== ch || code[j - 1] === "\\")) j++;
      j = Math.min(code.length, j + 1);
      push({ type: "str", value: code.slice(i, j), newline: false });
      i = j;
      continue;
    }
    // template literal (with ${} nesting)
    if (ch === "`") {
      let j = i + 1;
      let depth = 0;
      while (j < code.length) {
        if (code[j] === "\\") { j += 2; continue; }
        if (code[j] === "`" && depth === 0) { j++; break; }
        if (code[j] === "$" && code[j + 1] === "{") { depth++; j += 2; continue; }
        if (code[j] === "}" && depth > 0) depth--;
        j++;
      }
      push({ type: "str", value: code.slice(i, j), newline: false });
      i = j;
      continue;
    }
    // regex literal: only valid where an expression can start
    const prevSig = prevSignificant as Tok | null;
    if (ch === "/" && (!prevSig || REGEX_AFTER.has(prevSig.value) || prevSig.type === "op")) {
      let j = i + 1;
      let inClass = false;
      while (j < code.length) {
        if (code[j] === "\\") { j += 2; continue; }
        if (code[j] === "[") inClass = true;
        if (code[j] === "]") inClass = false;
        if (code[j] === "/" && !inClass) break;
        if (code[j] === "\n") break;
        j++;
      }
      if (j < code.length && code[j] === "/") {
        j++;
        while (j < code.length && /[a-z]/i.test(code[j] ?? "")) j++;
        push({ type: "regex", value: code.slice(i, j), newline: false });
        i = j;
        continue;
      }
    }
    // numbers
    if (/\d/.test(ch) || (ch === "." && /\d/.test(code[i + 1] || ""))) {
      const m = code.slice(i).match(/^(?:0[xX][\da-fA-F]+|0[bB][01]+|0[oO][0-7]+|\d*\.?\d+(?:[eE][+-]?\d+)?)/);
      if (m) {
        push({ type: "num", value: m[0] ?? "", newline: false });
        i += (m[0] ?? "").length;
        continue;
      }
    }
    // words
    if (/[A-Za-z_$]/.test(ch)) {
      const m = code.slice(i).match(/^[A-Za-z_$][\w$]*/)!;
      push({ type: "word", value: m[0] ?? "", newline: false });
      i += (m[0] ?? "").length;
      continue;
    }
    // operators (longest match)
    const m = code.slice(i).match(/^(>>>=|>>>|<<=|>>=|\.\.\.|=>|===|!==|<<|>>|&&|\|\||\?\?|[-+*/%&|^!<>]=?|[?:=.,;(){}\[\]])/);
    if (m) {
      push({ type: "op", value: m[0] ?? "", newline: false });
      i += (m[0] ?? "").length;
      continue;
    }
    push({ type: "op", value: ch, newline: false });
    i++;
  }
  return toks;
}

const ALNUM = new Set<TokType>(["word", "num", "str", "regex"]);

/** Minify safely: strip comments, collapse whitespace. Newlines are kept so ASI behavior never changes. */
function minifyJs(code: string): string {
  const toks = tokenize(code);
  let out = "";
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (!t) continue;
    if (t.type === "comment") continue;
    if (t.type === "ws") {
      const prev = toks.slice(0, i).reverse().find((x) => x.type !== "comment");
      const next = toks.slice(i + 1).find((x) => x.type !== "comment");
      if (!prev || !next) continue;
      if (prev && next && ALNUM.has(prev.type) && ALNUM.has(next.type)) {
        out += t.newline ? "\n" : " ";
      } else if (t.newline) {
        out += "\n";
      }
      continue;
    }
    out += t.value;
  }
  return out.replace(/\n{2,}/g, "\n").trim();
}

/** Beautify: brace/paren aware newlines and indentation. */
function beautifyJs(code: string): string {
  const toks = tokenize(code).filter((t) => t.type !== "comment");
  const lines: string[] = [];
  let cur = "";
  let parenDepth = 0;
  const flush = () => {
    if (cur.trim()) lines.push(cur.trim());
    cur = "";
  };
  for (const t of toks) {
    if (t.type === "ws") {
      if (t.newline) flush();
      else if (cur && !cur.endsWith(" ")) cur += " ";
      continue;
    }
    if (t.value === "(") parenDepth++;
    if (t.value === ")") parenDepth--;
    if (t.value === "{") {
      if (cur.trim()) cur += " ";
      cur += "{";
      flush();
      continue;
    }
    if (t.value === "}") {
      flush();
      cur = "}";
      continue;
    }
    if (t.value === ";" && parenDepth === 0) {
      cur += ";";
      flush();
      continue;
    }
    cur += (cur && !/[\s({\[,;:]$/.test(cur) && ALNUM.has(t.type) ? " " : "") + t.value;
  }
  flush();
  let depth = 0;
  return lines
    .map((line) => {
      const stripped = line.replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g, "");
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

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function JsMinifierTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("js-minifier", isPro);
  const seo = getToolSeo("js-minifier");

  const [mode, setMode] = useState<"minify" | "beautify">("minify");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(() => {
    if (!input.trim() || !trial.canUse) return;
    try {
      setOutput(mode === "minify" ? minifyJs(input) : beautifyJs(input));
      setError(null);
      trial.recordUse();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not process that code.");
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
    downloadBlob(new Blob([output], { type: "text/javascript" }), mode === "minify" ? "script.min.js" : "script.js");
    toast.success("File downloaded");
  }, [output, mode]);

  const before = new TextEncoder().encode(input).length;
  const after = new TextEncoder().encode(output).length;
  const saved = before > 0 && output ? Math.max(0, Math.round((1 - after / before) * 100)) : 0;

  return (
    <ToolPageShell toolId="js-minifier" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="JS Minifier" left={trial.left} />

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
            placeholder="Paste JavaScript here"
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
          The minifier uses a real tokenizer that understands strings, template literals and
          regular expressions, so <code className="rounded bg-muted px-1">//</code> inside a
          string is never treated as a comment. Newlines are kept where automatic semicolon
          insertion could change your code, so minified output stays behavior-identical.
        </p>
      </div>
    </ToolPageShell>
  );
}
