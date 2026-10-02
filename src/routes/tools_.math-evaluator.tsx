// /tools/math-evaluator - Hand-written expression parser: no eval(), no Function().

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Delete, Equal, Sigma } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/math-evaluator")({
  head: () => {
    const seo = getToolSeoMeta("math-evaluator");
    const canonical = "https://iconvault.site/tools/math-evaluator";
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
  component: MathTool,
});

const INPUT = "w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary";

// ---------- tokenizer ----------
type Tok =
  | { k: "num"; v: number }
  | { k: "op"; v: string }
  | { k: "name"; v: string }
  | { k: "lp" } | { k: "rp" };

function tokenize(src: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i]!;
    if (c === " " || c === "\t" || c === "\n") { i++; continue; }
    if ((c >= "0" && c <= "9") || c === ".") {
      let j = i;
      while (j < src.length && ((src![j]! >= "0" && src![j]! <= "9") || src[j] === ".")) j++;
      const v = parseFloat(src.slice(i, j));
      if (isNaN(v)) throw new Error(`Bad number near "${src.slice(i, j)}"`);
      toks.push({ k: "num", v });
      i = j;
      continue;
    }
    if ((c >= "a" && c <= "z") || (c >= "A" && c <= "Z")) {
      let j = i;
      while (j < src.length && /[a-zA-Z]/.test(src[j]!)) j++;
      toks.push({ k: "name", v: src.slice(i, j).toLowerCase() });
      i = j;
      continue;
    }
    if ("+-*/^%(),".includes(c)) {
      toks.push(c === "(" ? { k: "lp" } : c === ")" ? { k: "rp" } : { k: "op", v: c });
      i++;
      continue;
    }
    throw new Error(`Unexpected character "${c}"`);
  }
  return toks;
}

// ---------- parser (recursive descent) ----------
// expr   := term (("+" | "-") term)*
// term   := unary (("*" | "/" | "%") unary)*
// unary  := "-" unary | power
// power  := primary ("^" power)?            (right associative)
// primary:= number | const | func "(" expr ")" | "(" expr ")"
const FUNCS: Record<string, (x: number) => number> = {
  sin: (x) => Math.sin(x),
  cos: (x) => Math.cos(x),
  tan: (x) => Math.tan(x),
  sqrt: (x) => { if (x < 0) throw new Error("sqrt of a negative number"); return Math.sqrt(x); },
  log: (x) => { if (x <= 0) throw new Error("log of a non-positive number"); return Math.log10(x); },
  ln: (x) => { if (x <= 0) throw new Error("ln of a non-positive number"); return Math.log(x); },
  abs: (x) => Math.abs(x),
};
const CONSTS: Record<string, number> = { pi: Math.PI, e: Math.E };

class Parser {
  toks: Tok[];
  pos = 0;
  constructor(toks: Tok[]) { this.toks = toks; }
  peek(): Tok | undefined { return this.toks[this.pos]; }
  next(): Tok {
    const t = this.toks[this.pos++];
    if (!t) throw new Error("Unexpected end of expression");
    return t;
  }
  parseExpr(): number {
    let v = this.parseTerm();
    for (;;) {
      const t = this.peek();
      if (t && t.k === "op" && (t.v === "+" || t.v === "-")) {
        this.next();
        const r = this.parseTerm();
        v = t.v === "+" ? v + r : v - r;
      } else return v;
    }
  }
  parseTerm(): number {
    let v = this.parseUnary();
    for (;;) {
      const t = this.peek();
      if (t && t.k === "op" && (t.v === "*" || t.v === "/" || t.v === "%")) {
        this.next();
        const r = this.parseUnary();
        if (t.v === "*") v *= r;
        else if (t.v === "/") { if (r === 0) throw new Error("Division by zero"); v /= r; }
        else { if (r === 0) throw new Error("Modulo by zero"); v %= r; }
      } else return v;
    }
  }
  parseUnary(): number {
    const t = this.peek();
    if (t && t.k === "op" && t.v === "-") { this.next(); return -this.parseUnary(); }
    if (t && t.k === "op" && t.v === "+") { this.next(); return this.parseUnary(); }
    return this.parsePower();
  }
  parsePower(): number {
    const base = this.parsePrimary();
    const t = this.peek();
    if (t && t.k === "op" && t.v === "^") { this.next(); return Math.pow(base, this.parsePower()); }
    return base;
  }
  parsePrimary(): number {
    const t = this.next();
    if (t.k === "num") return t.v;
    if (t.k === "lp") {
      const v = this.parseExpr();
      const c = this.next();
      if (c.k !== "rp") throw new Error("Missing closing parenthesis");
      return v;
    }
    if (t.k === "name") {
      if (t.v in CONSTS) return CONSTS[t.v]!;
      const fn = FUNCS[t.v];
      if (!fn) throw new Error(`Unknown function or constant "${t.v}"`);
      const lp = this.next();
      if (lp.k !== "lp") throw new Error(`Expected "(" after ${t.v}`);
      const arg = this.parseExpr();
      const rp = this.next();
      if (rp.k !== "rp") throw new Error("Missing closing parenthesis");
      return fn(arg);
    }
    throw new Error('Expected a number, function, or "("');
  }
}

function evaluate(src: string): number {
  const toks = tokenize(src);
  if (toks.length === 0) throw new Error("Enter an expression");
  const p = new Parser(toks);
  const v = p.parseExpr();
  if (p.pos !== toks.length) throw new Error("Unexpected trailing input");
  if (!isFinite(v)) throw new Error("Result is not finite");
  return v;
}

const fmt = (x: number) => {
  const r = Math.round(x * 1e10) / 1e10;
  return r.toLocaleString("en-US", { maximumFractionDigits: 10 });
};

const KEYPAD = ["7", "8", "9", "/", "4", "5", "6", "*", "1", "2", "3", "-", "0", ".", "^", "+"];

function MathTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("math-evaluator", isPro);
  const seo = getToolSeo("math-evaluator");

  const [expr, setExpr] = useState("sqrt(16) + 2^3 * sin(pi/2)");
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<{ e: string; v: number }[]>([]);

  const run = () => {
    if (!trial.canUse) return;
    try {
      const v = evaluate(expr);
      setResult(v);
      setError(null);
      setHistory((h) => [{ e: expr, v }, ...h].slice(0, 20));
      trial.recordUse();
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : "Could not evaluate");
    }
  };

  const copy = async () => {
    if (result === null || !trial.canUse) return;
    await navigator.clipboard.writeText(String(result));
    trial.recordUse();
    toast.success("Result copied");
  };

  const press = (k: string) => setExpr((e) => e + k);
  const clearExpr = () => { setExpr(""); setResult(null); setError(null); };
  const backspace = () => setExpr((e) => e.slice(0, -1));

  return (
    <ToolPageShell toolId="math-evaluator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Math Evaluator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80" htmlFor="me-expr">Expression</label>
            <input
              id="me-expr"
              value={expr}
              onChange={(e) => setExpr(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") run(); }}
              placeholder="e.g. sqrt(16) + 2^3 * sin(pi/2)"
              className={INPUT}
              spellCheck={false}
              autoComplete="off"
            />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {KEYPAD.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => press(k)}
                className="rounded-xl border border-border bg-muted/30 py-2.5 font-mono text-sm font-bold transition hover:border-primary/40"
              >
                {k}
              </button>
            ))}
            <button type="button" onClick={() => press("(")} className="rounded-xl border border-border bg-muted/30 py-2.5 font-mono text-sm font-bold transition hover:border-primary/40">(</button>
            <button type="button" onClick={() => press(")")} className="rounded-xl border border-border bg-muted/30 py-2.5 font-mono text-sm font-bold transition hover:border-primary/40">)</button>
            <button type="button" onClick={backspace} aria-label="Backspace" className="rounded-xl border border-border bg-muted/30 py-2.5 transition hover:border-primary/40">
              <Delete className="mx-auto h-4 w-4" />
            </button>
            <button type="button" onClick={clearExpr} className="rounded-xl border border-border bg-muted/30 py-2.5 font-mono text-sm font-bold transition hover:border-primary/40">C</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {["sin(", "cos(", "tan(", "sqrt(", "log(", "ln(", "abs(", "pi", "e", "%"].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => press(k)}
                className="rounded-lg border border-border px-2.5 py-1.5 font-mono text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
              >
                {k}
              </button>
            ))}
          </div>
          <ActionButton disabled={!expr.trim() || !trial.canUse} onClick={run}>
            <Equal className="h-4 w-4" /> Evaluate
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free evaluations left - parsed locally, never eval().
            </p>
          )}
        </div>

        <div className="space-y-6 rounded-2xl border border-border bg-card p-5">
          {!result && result !== 0 && !error ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <Sigma className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your answer appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                A real hand-written parser handles +, -, *, /, ^, %, parentheses, trig and log functions - no eval() anywhere.
              </p>
            </div>
          ) : error ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center text-center">
              <p className="font-semibold text-red-500">Could not evaluate</p>
              <p className="mt-1 max-w-sm font-mono text-sm text-muted-foreground">{error}</p>
            </div>
          ) : (
            <div>
              <p className="text-[13px] font-medium text-muted-foreground">Result</p>
              <p className="mt-1 break-all font-mono text-3xl font-bold tracking-tight">{fmt(result ?? 0)}</p>
              <button
                type="button"
                onClick={() => void copy()}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold transition hover:border-primary/40"
              >
                <Copy className="h-4 w-4" /> Copy result
              </button>
            </div>
          )}

          {history.length > 0 && (
            <div>
              <p className="mb-2 text-[13px] font-medium text-muted-foreground">History</p>
              <ul className="max-h-64 space-y-1.5 overflow-y-auto">
                {history.map((h, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => { setExpr(h.e); setResult(h.v); setError(null); }}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-3 py-2 text-left transition hover:border-primary/40"
                      title="Load this expression"
                    >
                      <span className="truncate font-mono text-sm">{h.e}</span>
                      <span className="shrink-0 font-mono text-sm font-bold text-primary">= {fmt(h.v)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
