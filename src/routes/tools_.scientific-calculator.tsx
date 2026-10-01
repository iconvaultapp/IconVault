// /tools/scientific-calculator - Full scientific calculator with trig, logs,
// powers, roots, factorial, constants, DEG/RAD toggle, history tape and
// keyboard support. 100% in-browser.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClipboardCopy, Delete, History } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/scientific-calculator")({
  head: () => {
    const seo = getToolSeoMeta("scientific-calculator");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: ScientificCalculatorTool,
});

const FNS = ["sin", "cos", "tan", "asin", "acos", "atan", "ln", "log", "sqrt", "cbrt"];

function factorial(n: number): number {
  if (!Number.isInteger(n) || n < 0) throw new Error("Factorial needs a non-negative integer");
  if (n > 170) throw new Error("Result too large");
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

type Token =
  | { kind: "num"; value: number }
  | { kind: "op"; op: string }
  | { kind: "fn"; name: string }
  | { kind: "paren"; open: boolean };

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  const re = /(\d*\.?\d+|sin|cos|tan|asin|acos|atan|ln|log|sqrt|cbrt|π|e|[+\-*/^%()!])/gi;
  let m: RegExpExecArray | null;
  let prev: Token | null = null;
  while ((m = re.exec(expr)) !== null) {
    const s = m[0];
    let t: Token;
    if (/^\d*\.?\d+$/.test(s)) {
      t = { kind: "num", value: parseFloat(s) };
    } else if (FNS.includes(s.toLowerCase())) {
      t = { kind: "fn", name: s.toLowerCase() };
    } else if (s === "π") {
      t = { kind: "num", value: Math.PI };
    } else if (s === "e" && !/^\d/.test(m[0])) {
      t = { kind: "num", value: Math.E };
    } else if (s === "(" || s === ")") {
      t = { kind: "paren", open: s === "(" };
    } else if (s === "-") {
      const unary: boolean = !prev || prev.kind === "op" || (prev.kind === "paren" && prev.open) || prev.kind === "fn";
      t = { kind: "op", op: unary ? "u-" : "-" };
    } else {
      t = { kind: "op", op: s };
    }
    tokens.push(t);
    prev = t;
  }
  return tokens;
}

const PREC: Record<string, number> = { "+": 2, "-": 2, "*": 3, "/": 3, "%": 3, "u-": 4, "^": 5, "!": 6 };
const RIGHT_ASSOC = new Set(["^", "u-"]);

function toRPN(tokens: Token[]): Token[] {
  const out: Token[] = [];
  const stack: Token[] = [];
  for (const t of tokens) {
    if (t.kind === "num") out.push(t);
    else if (t.kind === "fn") stack.push(t);
    else if (t.kind === "op") {
      if (t.op === "!") {
        out.push(t); // postfix: applies immediately
        continue;
      }
      while (stack.length) {
        const top = stack[stack.length - 1]!;
        if (top.kind === "fn") {
          out.push(stack.pop()!);
          continue;
        }
        if (top.kind === "op" && top.op !== "(") {
          const pTop = PREC[top.op] ?? 0;
          const pCur = PREC[t.op] ?? 0;
          if (pTop > pCur || (pTop === pCur && !RIGHT_ASSOC.has(t.op))) {
            out.push(stack.pop()!);
            continue;
          }
        }
        break;
      }
      stack.push(t);
    } else if (t.kind === "paren") {
      if (t.open) stack.push(t);
      else {
        let found = false;
        while (stack.length) {
          const top = stack.pop()!;
          if (top.kind === "paren" && top.open) {
            found = true;
            break;
          }
          out.push(top);
        }
        if (!found) throw new Error("Mismatched parentheses");
        const top2 = stack[stack.length - 1];
        if (top2 && top2.kind === "fn") out.push(stack.pop()!);
      }
    }
  }
  while (stack.length) {
    const top = stack.pop()!;
    if (top.kind === "paren") throw new Error("Mismatched parentheses");
    out.push(top);
  }
  return out;
}

function applyFn(name: string, x: number, deg: boolean): number {
  const toRad = (v: number) => (deg ? (v * Math.PI) / 180 : v);
  const fromRad = (v: number) => (deg ? (v * 180) / Math.PI : v);
  switch (name) {
    case "sin": return Math.sin(toRad(x));
    case "cos": return Math.cos(toRad(x));
    case "tan": return Math.tan(toRad(x));
    case "asin": return fromRad(Math.asin(x));
    case "acos": return fromRad(Math.acos(x));
    case "atan": return fromRad(Math.atan(x));
    case "ln": return Math.log(x);
    case "log": return Math.log10(x);
    case "sqrt": return Math.sqrt(x);
    case "cbrt": return Math.cbrt(x);
    default: throw new Error(`Unknown function ${name}`);
  }
}

function evalRPN(rpn: Token[], deg: boolean): number {
  const stack: number[] = [];
  for (const t of rpn) {
    if (t.kind === "num") {
      stack.push(t.value);
    } else if (t.kind === "fn") {
      const a = stack.pop();
      if (a === undefined) throw new Error("Bad expression");
      stack.push(applyFn(t.name, a, deg));
    } else if (t.kind === "op") {
      if (t.op === "u-") {
        const a = stack.pop();
        if (a === undefined) throw new Error("Bad expression");
        stack.push(-a);
        continue;
      }
      if (t.op === "!") {
        const a = stack.pop();
        if (a === undefined) throw new Error("Bad expression");
        stack.push(factorial(a));
        continue;
      }
      const b = stack.pop();
      const a = stack.pop();
      if (a === undefined || b === undefined) throw new Error("Bad expression");
      let r: number;
      switch (t.op) {
        case "+": r = a + b; break;
        case "-": r = a - b; break;
        case "*": r = a * b; break;
        case "/":
          if (b === 0) throw new Error("Cannot divide by zero");
          r = a / b;
          break;
        case "%": r = a % b; break;
        case "^": r = Math.pow(a, b); break;
        default: throw new Error("Bad operator");
      }
      stack.push(r);
    }
  }
  if (stack.length !== 1) throw new Error("Bad expression");
  return stack[0]!;
}

export function evaluate(expr: string, deg: boolean): number {
  if (!expr.trim()) throw new Error("Empty");
  const tokens = tokenize(expr);
  if (tokens.length === 0) throw new Error("Empty");
  const value = evalRPN(toRPN(tokens), deg);
  if (!isFinite(value)) throw new Error("Result is not a finite number");
  return value;
}

export function formatResult(v: number): string {
  if (!isFinite(v)) throw new Error("Result is not a finite number");
  if (v === 0) return "0";
  const rounded = Number(v.toPrecision(12));
  return String(rounded);
}

interface Key {
  label: string;
  insert?: string;
  action?: "clear" | "back" | "equals" | "deg";
  span?: number;
  accent?: boolean;
}

const KEYS: Key[] = [
  { label: "AC", action: "clear", accent: true },
  { label: "(", insert: "(" },
  { label: ")", insert: ")" },
  { label: "⌫", action: "back", accent: true },
  { label: "DEG", action: "deg" },
  { label: "sin", insert: "sin(" },
  { label: "cos", insert: "cos(" },
  { label: "tan", insert: "tan(" },
  { label: "asin", insert: "asin(" },
  { label: "acos", insert: "acos(" },
  { label: "atan", insert: "atan(" },
  { label: "ln", insert: "ln(" },
  { label: "log", insert: "log(" },
  { label: "√", insert: "sqrt(" },
  { label: "∛", insert: "cbrt(" },
  { label: "7", insert: "7" },
  { label: "8", insert: "8" },
  { label: "9", insert: "9" },
  { label: "÷", insert: "/" },
  { label: "%", insert: "%" },
  { label: "4", insert: "4" },
  { label: "5", insert: "5" },
  { label: "6", insert: "6" },
  { label: "×", insert: "*" },
  { label: "x²", insert: "^2" },
  { label: "1", insert: "1" },
  { label: "2", insert: "2" },
  { label: "3", insert: "3" },
  { label: "−", insert: "-" },
  { label: "x!", insert: "!" },
  { label: "0", insert: "0" },
  { label: ".", insert: "." },
  { label: "π", insert: "π" },
  { label: "e", insert: "e" },
  { label: "+", insert: "+" },
  { label: "xʸ", insert: "^" },
  { label: "=", action: "equals", span: 4, accent: true },
];

function ScientificCalculatorTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("scientific-calculator", isPro);
  const seo = getToolSeo("scientific-calculator");

  const [expr, setExpr] = useState("");
  const [deg, setDeg] = useState(true);
  const [history, setHistory] = useState<{ expr: string; result: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const displayRef = useRef<HTMLDivElement>(null);

  const preview = useMemo(() => {
    if (!expr.trim()) return "";
    try {
      return formatResult(evaluate(expr, deg));
    } catch {
      return "";
    }
  }, [expr, deg]);

  const doEquals = useCallback(() => {
    if (!expr.trim()) return;
    try {
      const result = formatResult(evaluate(expr, deg));
      setHistory((h) => [{ expr, result }, ...h].slice(0, 50));
      setExpr(result);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid expression");
    }
  }, [expr, deg]);

  const press = useCallback((key: Key) => {
    setError(null);
    if (key.action === "clear") setExpr("");
    else if (key.action === "back") setExpr((p) => p.slice(0, -1));
    else if (key.action === "equals") doEquals();
    else if (key.action === "deg") setDeg((d) => !d);
    else if (key.insert) setExpr((p) => p + key.insert);
  }, [doEquals]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      const k = e.key;
      if (/^[0-9.]$/.test(k) || ["+", "-", "*", "/", "%", "^", "!", "(", ")"].includes(k)) {
        setExpr((p) => p + k);
        setError(null);
      } else if (k === "Enter") {
        e.preventDefault();
        doEquals();
      } else if (k === "Backspace") {
        setExpr((p) => p.slice(0, -1));
      } else if (k === "Escape") {
        setExpr("");
      } else if (k === "p" || k === "P") {
        setExpr((p) => p + "π");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doEquals]);

  useEffect(() => {
    displayRef.current?.scrollTo({ left: displayRef.current.scrollWidth });
  }, [expr]);

  const copyResult = async () => {
    if (!trial.canUse) {
      toast.error(`Free trial used up - ${TOOL_TRIAL_LIMIT} copies per tool. Go Pro for unlimited.`);
      return;
    }
    const text = `${expr} = ${preview || "?"}`;
    try {
      await navigator.clipboard.writeText(text);
      trial.recordUse();
      toast.success("Result copied");
    } catch {
      toast.error("Copy failed - select and copy manually.");
    }
  };

  const clearHistory = () => setHistory([]);

  return (
    <ToolPageShell toolId="scientific-calculator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Scientific Calculator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <div ref={displayRef} className="min-h-[2.5rem] overflow-x-auto whitespace-nowrap text-right font-mono text-lg text-muted-foreground">
              {expr || <span className="opacity-50">Type or tap keys</span>}
            </div>
            <div className="mt-1 min-h-[3rem] overflow-x-auto whitespace-nowrap text-right font-mono text-4xl font-bold text-primary">
              {preview || (error ? "" : "0")}
            </div>
            {error && <p className="mt-1 text-right text-sm font-medium text-red-500">{error}</p>}
            <div className="mt-2 flex items-center justify-between">
              <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", deg ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                {deg ? "DEGREES" : "RADIANS"}
              </span>
              <button
                type="button"
                onClick={copyResult}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold hover:border-primary/40"
              >
                <ClipboardCopy className="h-3.5 w-3.5" /> Copy result
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-5 gap-2">
            {KEYS.map((key, i) => (
              <button
                key={i}
                type="button"
                onClick={() => press(key)}
                className={cn(
                  "rounded-xl border px-1 py-3 font-mono text-sm font-bold transition",
                  key.action === "deg" && deg ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40",
                  key.action === "equals" ? "bg-primary text-primary-foreground hover:opacity-90 border-primary" : "",
                  key.accent && key.action !== "equals" && key.action !== "deg" ? "bg-muted/60" : "",
                )}
                style={key.span ? { gridColumn: `span ${key.span} / span ${key.span}` } : undefined}
              >
                {key.action === "deg" ? (deg ? "DEG" : "RAD") : key.label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Keyboard works too: digits, + - * / % ^ ! ( ), Enter for =, Backspace to delete, Esc to clear, P for pi.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-2 text-[13px] font-medium text-foreground/80">
              <History className="h-4 w-4" /> History tape
            </p>
            {history.length > 0 && (
              <button type="button" onClick={clearHistory} className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground">
                <Delete className="h-3.5 w-3.5" /> Clear
              </button>
            )}
          </div>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Press = to record results here. The tape keeps your last 50 calculations.</p>
          ) : (
            <div className="max-h-[480px] space-y-2 overflow-y-auto">
              {history.map((h, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => { setExpr(h.result); setError(null); }}
                  className="w-full rounded-xl border border-border p-3 text-left transition hover:border-primary/40"
                  title="Reuse this result"
                >
                  <p className="truncate font-mono text-xs text-muted-foreground">{h.expr}</p>
                  <p className="mt-0.5 font-mono text-lg font-bold text-primary">= {h.result}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
