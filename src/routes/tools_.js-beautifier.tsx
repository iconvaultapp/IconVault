// /tools/js-beautifier - Format and beautify JavaScript with indent/quote
// options and a minify mode. Hand-written tokenizer protects strings,
// comments and regex literals. 100% in-browser.

import { useCallback, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Brush, Copy, Download, Eraser, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/js-beautifier";
import toolSeoMeta from "@/lib/tool-seo-meta-data/js-beautifier";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/js-beautifier")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/js-beautifier";
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
  component: JsBeautifierTool,
});

type Mode = "beautify" | "minify";
type QuoteOpt = "preserve" | "single" | "double";
type IndentOpt = "2" | "4" | "tab";

const SAMPLE = `const greet=(name)=>{if(!name){return "hello, stranger";}return 'hello, '+name;};
const user={name:"sam",tags:["dev","tools"],meta:{active:true}};
// usage
for(let i=0;i<3;i++){greet(user.name);}`;

interface Tok {
  kind: "str" | "com" | "regex" | "code";
  text: string;
}

const REGEX_KEYWORDS = ["return", "typeof", "instanceof", "in", "of", "new", "delete", "void", "throw", "case", "do", "else", "yield", "await"];

function tokenize(src: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  const n = src.length;
  let code = "";
  let lastCode = "";
  const pushCode = () => {
    if (code) toks.push({ kind: "code", text: code });
    code = "";
  };
  while (i < n) {
    const c = src[i]!;
    const next = i + 1 < n ? src[i + 1]! : "";
    if (c === "/" && next === "/") {
      pushCode();
      let j = i;
      while (j < n && src[j] !== "\n") j++;
      toks.push({ kind: "com", text: src.slice(i, j) });
      i = j;
      continue;
    }
    if (c === "/" && next === "*") {
      pushCode();
      const end = src.indexOf("*/", i + 2);
      const j = end === -1 ? n : end + 2;
      toks.push({ kind: "com", text: src.slice(i, j) });
      i = j;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      pushCode();
      let j = i + 1;
      while (j < n) {
        const d = src[j]!;
        if (d === "\\") {
          j += 2;
          continue;
        }
        if (d === c) {
          j++;
          break;
        }
        if (c !== "`" && d === "\n") break;
        j++;
      }
      toks.push({ kind: "str", text: src.slice(i, j) });
      i = j;
      continue;
    }
    if (c === "/" && next !== "/" && next !== "*") {
      const t = lastCode.trimEnd();
      const lastWord = t.match(/[A-Za-z_$][A-Za-z0-9_$]*$/)?.[0] ?? "";
      const lastCh = t[t.length - 1] ?? "";
      const allow =
        t === "" ||
        "([{,;=:!&|?+-*%^~<>".includes(lastCh) ||
        REGEX_KEYWORDS.includes(lastWord);
      if (allow) {
        pushCode();
        let j = i + 1;
        let inClass = false;
        while (j < n) {
          const d = src[j]!;
          if (d === "\\") {
            j += 2;
            continue;
          }
          if (d === "[") inClass = true;
          else if (d === "]") inClass = false;
          else if (d === "/" && !inClass) break;
          else if (d === "\n") break;
          j++;
        }
        j++;
        while (j < n && /[a-z]/i.test(src[j]!)) j++;
        toks.push({ kind: "regex", text: src.slice(i, j) });
        i = j;
        continue;
      }
    }
    code += c;
    if (c.trim() !== "") lastCode = c;
    i++;
  }
  pushCode();
  return toks;
}

function normalizeQuotes(s: string, quote: QuoteOpt): string {
  if (quote === "preserve" || s.length < 2) return s;
  const q = s[0]!;
  if (q !== "'" && q !== '"') return s; // template literals stay
  const target = quote === "single" ? "'" : '"';
  if (q === target) return s;
  const inner = s.slice(1, -1);
  if (inner.includes(target)) return s; // would need escaping, leave as-is
  const unescaped = inner.split("\\" + q).join(q);
  return target + unescaped + target;
}

const OP3 = ["===", "!==", ">>>", "..."];
const OP2 = ["==", "!=", "<=", ">=", "&&", "||", "++", "--", "+=", "-=", "*=", "/=", "%=", "**", "<<", ">>", "=>", "??", "?."];
const CTRL_WORDS = ["if", "for", "while", "switch", "catch", "with"];
const AFTER_KEYWORDS = ["return", "typeof", "new", "delete", "void", "throw", "in", "of", "instanceof", "yield", "await", "case"];

function readOp(code: string, j: number): string {
  const c3 = code.slice(j, j + 3);
  if (OP3.includes(c3)) return c3;
  const c2 = code.slice(j, j + 2);
  if (OP2.includes(c2)) return c2;
  return code[j]!;
}

function beautify(src: string, indentUnit: string, quote: QuoteOpt): string {
  const toks = tokenize(src);
  const out: string[] = [];
  let level = 0;
  let line = "";
  let paren = 0;
  const flush = () => {
    const t = line.replace(/\s+$/, "");
    if (t) out.push(indentUnit.repeat(level) + t);
    line = "";
  };
  const isWs = (c: string) => c === " " || c === "\t" || c === "\n" || c === "\r";

  for (const tok of toks) {
    if (tok.kind === "str" || tok.kind === "regex") {
      line += normalizeQuotes(tok.text, quote);
      continue;
    }
    if (tok.kind === "com") {
      flush();
      const t = tok.text.trim();
      if (t) out.push(indentUnit.repeat(level) + t);
      continue;
    }
    const code = tok.text;
    let j = 0;
    while (j < code.length) {
      const ch = code[j]!;
      if (isWs(ch)) {
        if (line && !line.endsWith(" ")) line += " ";
        j++;
        continue;
      }
      if (ch === "(") {
        paren++;
        const w = line.trimEnd().match(/(\w+)$/)?.[1] ?? "";
        if (CTRL_WORDS.includes(w)) line = line.trimEnd() + " ";
        line += ch;
        j++;
        continue;
      }
      if (ch === ")") {
        paren = Math.max(0, paren - 1);
        line = line.trimEnd() + ch;
        j++;
        continue;
      }
      if (ch === "{") {
        line = line.trimEnd();
        line += (line ? " " : "") + "{";
        flush();
        level++;
        j++;
        continue;
      }
      if (ch === "}") {
        flush();
        level = Math.max(0, level - 1);
        line = "}";
        const rest = code.slice(j + 1).match(/^\s*(else|catch|finally|while)\b/);
        if (!rest) flush();
        j++;
        continue;
      }
      if (ch === ";" && paren === 0) {
        line = line.trimEnd() + ";";
        flush();
        j++;
        continue;
      }
      if (ch === "[") {
        line = line.trimEnd() + ch;
        j++;
        continue;
      }
      if (ch === "]" || ch === ".") {
        line = line.trimEnd() + ch;
        j++;
        continue;
      }
      if ("=+-*/%<>!&|^~?:".includes(ch)) {
        const op = readOp(code, j);
        j += op.length;
        const prev = line.trimEnd();
        const prevCh = prev[prev.length - 1] ?? "";
        const prevWord = prev.match(/(\w+)$/)?.[1] ?? "";
        const unaryCtx =
          prev === "" ||
          "([{,;=!~?:+-*/%<>&|^".includes(prevCh) ||
          AFTER_KEYWORDS.includes(prevWord);
        if (op === "?.") {
          line = prev + op;
        } else if (op === "++" || op === "--") {
          line = unaryCtx ? prev + op : prev + op;
        } else if (op === "," ) {
          line = prev + ", ";
        } else if (op === ":") {
          line = prev + ": ";
        } else if (op === "?") {
          line = prev + " ? ";
        } else if ((op === "+" || op === "-" || op === "!" || op === "~") && unaryCtx) {
          line = prev + op;
        } else {
          line = (prev ? prev + " " : "") + op + " ";
        }
        while (j < code.length && (code[j] === " " || code[j] === "\t")) j++;
        continue;
      }
      line += ch;
      j++;
    }
  }
  flush();
  return out.join("\n");
}

function minify(src: string): string {
  const toks = tokenize(src);
  const strings: string[] = [];
  let acc = "";
  for (const tok of toks) {
    if (tok.kind === "com") continue;
    if (tok.kind === "str" || tok.kind === "regex") {
      acc += `\u0000${strings.length}\u0000`;
      strings.push(tok.text);
      continue;
    }
    acc += tok.text;
  }
  acc = acc.replace(/\s+/g, " ").replace(/\s*([{}();,:[\]])\s*/g, "$1").trim();
  strings.forEach((s, idx) => {
    acc = acc.split(`\u0000${idx}\u0000`).join(s);
  });
  return acc;
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function JsBeautifierTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("js-beautifier", isPro);
  const seo = toolSeo;

  const [input, setInput] = useState(SAMPLE);
  const [mode, setMode] = useState<Mode>("beautify");
  const [indent, setIndent] = useState<IndentOpt>("2");
  const [quote, setQuote] = useState<QuoteOpt>("preserve");
  const [output, setOutput] = useState("");
  const [busy, setBusy] = useState(false);

  const run = useCallback(() => {
    if (!input.trim() || busy || !trial.canUse) return;
    setBusy(true);
    try {
      const result =
        mode === "beautify"
          ? beautify(input, indent === "tab" ? "\t" : " ".repeat(Number(indent)), quote)
          : minify(input);
      setOutput(result);
      trial.recordUse();
      toast.success(mode === "beautify" ? "Code formatted" : "Code minified");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Formatting failed.");
    } finally {
      setBusy(false);
    }
  }, [input, mode, indent, quote, busy, trial]);

  const copy = useCallback(async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Copy failed in this browser.");
    }
  }, [output]);

  const download = useCallback(() => {
    if (!output) return;
    downloadBlob(new Blob([output], { type: "text/javascript" }), mode === "minify" ? "script.min.js" : "script.formatted.js");
    toast.success("File downloaded");
  }, [output, mode]);

  const stats = useMemo(() => {
    if (!output) return null;
    const inLen = new Blob([input]).size;
    const outLen = new Blob([output]).size;
    return {
      inLen,
      outLen,
      lines: output.split("\n").length,
      delta: outLen - inLen,
    };
  }, [input, output]);

  const indentLabel: Record<IndentOpt, string> = { "2": "2 spaces", "4": "4 spaces", tab: "Tab" };

  return (
    <ToolPageShell toolId="js-beautifier" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="JS Beautifier" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Mode</p>
            <div className="grid grid-cols-2 gap-2">
              {(["beautify", "minify"] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-bold capitalize transition",
                    mode === m
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {m === "beautify" ? <Sparkles className="h-4 w-4" /> : <Brush className="h-4 w-4" />}
                  {m}
                </button>
              ))}
            </div>
          </div>

          {mode === "beautify" && (
            <>
              <div>
                <p className="mb-2 text-[13px] font-medium text-foreground/80">Indentation</p>
                <div className="flex gap-2">
                  {(Object.keys(indentLabel) as IndentOpt[]).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setIndent(k)}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-sm font-bold transition",
                        indent === k
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40",
                      )}
                    >
                      {indentLabel[k]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-[13px] font-medium text-foreground/80">Quotes</p>
                <div className="flex gap-2">
                  {(
                    [
                      ["preserve", "Keep"],
                      ["single", "Single"],
                      ["double", "Double"],
                    ] as [QuoteOpt, string][]
                  ).map(([k, label]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setQuote(k)}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-sm font-bold transition",
                        quote === k
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Template literals are never touched; quotes that need escaping are left alone.
                </p>
              </div>
            </>
          )}

          <ActionButton busy={busy} disabled={!input.trim() || !trial.canUse} onClick={run}>
            {mode === "beautify" ? <Sparkles className="h-4 w-4" /> : <Brush className="h-4 w-4" />}
            {busy ? "Working..." : mode === "beautify" ? "Beautify code" : "Minify code"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free runs left. Your code never leaves this tab.
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Input JavaScript</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setInput(SAMPLE)}
                  className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                >
                  Sample
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInput("");
                    setOutput("");
                  }}
                  className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                >
                  <Eraser className="h-3.5 w-3.5" /> Clear
                </button>
              </div>
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              spellCheck={false}
              placeholder="Paste minified or messy JavaScript here..."
              className="h-56 w-full resize-y rounded-xl border border-border bg-background p-3 font-mono text-[13px] leading-relaxed outline-none focus:border-primary/60"
            />
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Output</p>
              {stats && (
                <p className="text-xs text-muted-foreground">
                  {fmtBytes(stats.inLen)} to {fmtBytes(stats.outLen)} ({stats.lines} lines
                  {stats.delta !== 0 ? `, ${stats.delta > 0 ? "+" : ""}${fmtBytes(Math.abs(stats.delta))} ${stats.delta > 0 ? "larger" : "smaller"}` : ""})
                </p>
              )}
            </div>
            {output ? (
              <>
                <pre className="max-h-80 overflow-auto rounded-xl border border-border bg-background p-3 font-mono text-[13px] leading-relaxed">
                  {output}
                </pre>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={copy}
                    className="flex items-center gap-1.5 rounded-xl border border-border px-3.5 py-2 text-sm font-semibold transition hover:border-primary/40"
                  >
                    <Copy className="h-4 w-4" /> Copy
                  </button>
                  <button
                    type="button"
                    onClick={download}
                    className="flex items-center gap-1.5 rounded-xl border border-border px-3.5 py-2 text-sm font-semibold transition hover:border-primary/40"
                  >
                    <Download className="h-4 w-4" /> Download .js
                  </button>
                </div>
              </>
            ) : (
              <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Formatted code appears here after you press {mode === "beautify" ? "Beautify" : "Minify"}.
              </p>
            )}
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
