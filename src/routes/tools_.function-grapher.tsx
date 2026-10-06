// /tools/function-grapher - Interactive function grapher with a hand-written
// expression parser (no eval): plot multiple f(x) on canvas, zoom/pan,
// export PNG. Client-side only.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Camera, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/function-grapher";
import toolSeoMeta from "@/lib/tool-seo-meta-data/function-grapher";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/function-grapher")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/function-grapher";
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
  component: FunctionGrapherTool,
});

// ---------- hand-written expression parser (tokenizer + shunting-yard) ----------

type Token =
  | { t: "num"; v: number }
  | { t: "x" }
  | { t: "op"; v: string }
  | { t: "fn"; v: string }
  | { t: "lp" }
  | { t: "rp" }
  | { t: "comma" };

const FUNCS: Record<string, (x: number) => number> = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  asin: Math.asin, acos: Math.acos, atan: Math.atan,
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
  sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs,
  ln: Math.log, log: Math.log10, exp: Math.exp,
  floor: Math.floor, ceil: Math.ceil, round: Math.round,
  sign: Math.sign,
};

const CONSTS: Record<string, number> = { pi: Math.PI, e: Math.E, tau: Math.PI * 2 };

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let prev: Token | null = null;
  const isUnaryPos = () => prev === null || prev.t === "op" || prev.t === "lp" || prev.t === "comma";
  while (i < src.length) {
    const ch = src[i]!;
    if (/\s/.test(ch)) { i++; continue; }
    if (/[0-9.]/.test(ch)) {
      let j = i;
      while (j < src.length && /[0-9.eE+-]/.test(src[j]!)) {
        // keep exponent sign attached
        if ((src[j] === "+" || src[j] === "-") && src[j - 1] !== "e" && src[j - 1] !== "E") break;
        j++;
      }
      const v = Number(src.slice(i, j));
      if (!Number.isFinite(v)) throw new Error(`Bad number near "${src.slice(i, j)}"`);
      tokens.push({ t: "num", v });
      prev = tokens[tokens.length - 1]!;
      i = j;
      continue;
    }
    if (/[a-zA-Z]/.test(ch)) {
      let j = i;
      while (j < src.length && /[a-zA-Z]/.test(src[j]!)) j++;
      const word = src.slice(i, j).toLowerCase();
      if (word === "x") tokens.push({ t: "x" });
      else if (word in FUNCS) tokens.push({ t: "fn", v: word });
      else if (word in CONSTS) tokens.push({ t: "num", v: CONSTS[word]! });
      else throw new Error(`Unknown name "${word}"`);
      prev = tokens[tokens.length - 1]!;
      i = j;
      continue;
    }
    if (ch === "(") { tokens.push({ t: "lp" }); prev = tokens[tokens.length - 1]!; i++; continue; }
    if (ch === ")") { tokens.push({ t: "rp" }); prev = tokens[tokens.length - 1]!; i++; continue; }
    if (ch === ",") { tokens.push({ t: "comma" }); prev = tokens[tokens.length - 1]!; i++; continue; }
    if ("+-*/^".includes(ch)) {
      if ((ch === "-" || ch === "+") && isUnaryPos()) {
        // unary minus/plus -> 0 - x trick via explicit neg function
        tokens.push({ t: "num", v: 0 });
        tokens.push({ t: "op", v: ch });
      } else {
        tokens.push({ t: "op", v: ch });
      }
      prev = tokens[tokens.length - 1]!;
      i++;
      continue;
    }
    throw new Error(`Unexpected character "${ch}"`);
  }
  return tokens;
}

const PRECEDENCE: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2, "^": 3 };

function toRPN(tokens: Token[]): Token[] {
  const out: Token[] = [];
  const stack: Token[] = [];
  for (const tok of tokens) {
    if (tok.t === "num" || tok.t === "x") out.push(tok);
    else if (tok.t === "fn") stack.push(tok);
    else if (tok.t === "op") {
      while (stack.length > 0) {
        const top = stack[stack.length - 1]!;
        if (top.t === "op" && (PRECEDENCE[top.v]! > PRECEDENCE[tok.v]! || (PRECEDENCE[top.v] === PRECEDENCE[tok.v] && tok.v !== "^"))) {
          out.push(stack.pop()!);
        } else break;
      }
      stack.push(tok);
    } else if (tok.t === "lp") stack.push(tok);
    else if (tok.t === "comma") {
      while (stack.length > 0 && stack[stack.length - 1]!.t !== "lp") out.push(stack.pop()!);
      if (stack.length === 0) throw new Error("Misplaced comma");
    } else if (tok.t === "rp") {
      while (stack.length > 0 && stack[stack.length - 1]!.t !== "lp") out.push(stack.pop()!);
      if (stack.length === 0) throw new Error("Mismatched parentheses");
      stack.pop();
      if (stack.length > 0 && stack[stack.length - 1]!.t === "fn") out.push(stack.pop()!);
    }
  }
  while (stack.length > 0) {
    const top = stack.pop()!;
    if (top.t === "lp" || top.t === "rp") throw new Error("Mismatched parentheses");
    out.push(top);
  }
  return out;
}

function compile(rpn: Token[]): (x: number) => number {
  return (x: number) => {
    const st: number[] = [];
    for (const tok of rpn) {
      if (tok.t === "num") st.push(tok.v);
      else if (tok.t === "x") st.push(x);
      else if (tok.t === "fn") {
        const a = st.pop();
        if (a === undefined) throw new Error("Bad expression");
        st.push(FUNCS[tok.v]!(a));
      } else if (tok.t === "op") {
        const b = st.pop();
        const a = st.pop();
        if (a === undefined || b === undefined) throw new Error("Bad expression");
        switch (tok.v) {
          case "+": st.push(a + b); break;
          case "-": st.push(a - b); break;
          case "*": st.push(a * b); break;
          case "/": st.push(a / b); break;
          case "^": st.push(Math.pow(a, b)); break;
          default: throw new Error("Bad expression");
        }
      }
    }
    if (st.length !== 1) throw new Error("Bad expression");
    return st[0]!;
  };
}

export function parseExpression(src: string): (x: number) => number {
  if (!src.trim()) throw new Error("Empty expression");
  return compile(toRPN(tokenize(src)));
}

// ---------- component ----------

const COLORS = ["#0ea5e9", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

interface FnEntry {
  id: number;
  expr: string;
  color: string;
  visible: boolean;
  error: string | null;
}

let nextId = 1;

interface View { cx: number; cy: number; scale: number }

function drawGraph(canvas: HTMLCanvasElement, fns: FnEntry[], view: View) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = canvas.clientWidth;
  const h = 420;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  const px = (x: number) => w / 2 + (x - view.cx) * view.scale;
  const py = (y: number) => h / 2 - (y - view.cy) * view.scale;

  // grid
  const target = 60;
  const rawStep = target / view.scale;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= rawStep) ?? 10 * mag;
  ctx.strokeStyle = "rgba(128,128,128,0.18)";
  ctx.fillStyle = "rgba(128,128,128,0.85)";
  ctx.font = "11px system-ui";
  ctx.lineWidth = 1;
  const x0 = Math.ceil((view.cx - w / 2 / view.scale) / step) * step;
  const x1 = view.cx + w / 2 / view.scale;
  for (let gx = x0; gx <= x1; gx += step) {
    ctx.beginPath(); ctx.moveTo(px(gx), 0); ctx.lineTo(px(gx), h); ctx.stroke();
    const label = Math.abs(gx) < step / 100 ? "0" : String(Number(gx.toPrecision(4)));
    ctx.fillText(label, px(gx) + 4, h / 2 + 14);
  }
  const y0 = Math.ceil((view.cy - h / 2 / view.scale) / step) * step;
  const y1 = view.cy + h / 2 / view.scale;
  for (let gy = y0; gy <= y1; gy += step) {
    ctx.beginPath(); ctx.moveTo(0, py(gy)); ctx.lineTo(w, py(gy)); ctx.stroke();
    if (Math.abs(gy) > step / 100) ctx.fillText(String(Number(gy.toPrecision(4))), w / 2 + 6, py(gy) - 4);
  }

  // axes
  ctx.strokeStyle = "rgba(128,128,128,0.6)";
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, py(0)); ctx.lineTo(w, py(0)); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(px(0), 0); ctx.lineTo(px(0), h); ctx.stroke();

  // functions
  for (const f of fns) {
    if (!f.visible || f.error) continue;
    let fn: (x: number) => number;
    try { fn = parseExpression(f.expr); } catch { continue; }
    ctx.strokeStyle = f.color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    let pen = false;
    let lastY = 0;
    for (let i = 0; i <= w; i += 2) {
      const x = view.cx + (i - w / 2) / view.scale;
      let yv: number;
      try { yv = fn(x); } catch { pen = false; continue; }
      if (!Number.isFinite(yv) || Math.abs(yv) > 1e6) { pen = false; continue; }
      const sy = py(yv);
      if (!pen) { ctx.moveTo(i, sy); pen = true; }
      // break the line on vertical jumps (asymptotes)
      else if (Math.abs(sy - lastY) > h * 4) ctx.moveTo(i, sy);
      else ctx.lineTo(i, sy);
      lastY = sy;
    }
    ctx.stroke();
  }
}

function FunctionGrapherTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("function-grapher", isPro);
  const seo = toolSeo;

  const [fns, setFns] = useState<FnEntry[]>([
    { id: nextId++, expr: "x^2", color: COLORS[0]!, visible: true, error: null },
    { id: nextId++, expr: "sin(x)", color: COLORS[1]!, visible: true, error: null },
  ]);
  const [view, setView] = useState<View>({ cx: 0, cy: 0, scale: 40 });
  const [exporting, setExporting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) drawGraph(canvas, fns, view);
  }, [fns, view]);

  useEffect(() => { redraw(); }, [redraw]);
  useEffect(() => {
    const onResize = () => redraw();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [redraw]);

  const updateExpr = (id: number, expr: string) => {
    setFns((prev) => prev.map((f) => {
      if (f.id !== id) return f;
      let error: string | null = null;
      try { parseExpression(expr); } catch (e) { error = e instanceof Error ? e.message : "Invalid"; }
      return { ...f, expr, error };
    }));
  };

  const addFn = () => {
    if (fns.length >= 6) { toast.error("Up to 6 functions."); return; }
    setFns((prev) => [...prev, { id: nextId++, expr: "", color: COLORS[prev.length % COLORS.length]!, visible: true, error: "Empty expression" }]);
  };

  const exportPng = () => {
    if (!trial.canUse) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    setExporting(true);
    canvas.toBlob((blob) => {
      setExporting(false);
      if (!blob) { toast.error("Export failed."); return; }
      downloadBlob(blob, "function-graph.png");
      trial.recordUse();
      toast.success("PNG exported");
    }, "image/png");
  };

  const validCount = useMemo(() => fns.filter((f) => f.visible && !f.error && f.expr.trim()).length, [fns]);

  return (
    <ToolPageShell toolId="function-grapher" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Function Grapher" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Functions</h2>
          {fns.map((f) => (
            <div key={f.id} className="rounded-xl border border-border p-3">
              <div className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ background: f.color }} />
                <input
                  value={f.expr}
                  onChange={(e) => updateExpr(f.id, e.target.value)}
                  placeholder="e.g. x^2 + 2*sin(x)"
                  spellCheck={false}
                  className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 font-mono text-sm outline-none focus:border-primary"
                />
                <button type="button" onClick={() => setFns((p) => p.map((x) => x.id === f.id ? { ...x, visible: !x.visible } : x))} className="rounded p-1 text-muted-foreground hover:text-foreground" title="Toggle">
                  {f.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button type="button" onClick={() => setFns((p) => p.filter((x) => x.id !== f.id))} className="rounded p-1 text-muted-foreground hover:text-red-500" title="Delete">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {f.error && <p className="mt-1.5 text-xs font-medium text-red-500">{f.error}</p>}
            </div>
          ))}
          <button
            type="button" onClick={addFn}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-2.5 text-sm font-bold text-muted-foreground transition hover:border-primary/40 hover:text-primary"
          >
            <Plus className="h-4 w-4" /> Add function
          </button>
          <p className="text-xs text-muted-foreground">
            Operators: + - * / ^ and parentheses. Functions: sin cos tan asin acos atan sinh cosh tanh sqrt cbrt abs ln log exp floor ceil round sign. Constants: pi e tau. Example: <code className="font-mono">2*sin(x)+x^2</code>
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <ActionButton busy={exporting} disabled={!trial.canUse || validCount === 0} onClick={exportPng}>
              <Camera className="h-4 w-4" /> Export PNG
            </ActionButton>
          </div>
          {!isPro && <p className="text-xs text-muted-foreground">{trial.left} of {TOOL_TRIAL_LIMIT} free exports left.</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <canvas
            ref={canvasRef}
            className={cn("w-full touch-none rounded-xl bg-background", "cursor-grab active:cursor-grabbing")}
            style={{ height: 420 }}
            onWheel={(e) => {
              e.preventDefault();
              setView((v) => ({ ...v, scale: Math.min(2000, Math.max(2, v.scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15))) }));
            }}
            onPointerDown={(e) => { drag.current = { x: e.clientX, y: e.clientY }; (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId); }}
            onPointerMove={(e) => {
              if (!drag.current) return;
              const dx = e.clientX - drag.current.x;
              const dy = e.clientY - drag.current.y;
              drag.current = { x: e.clientX, y: e.clientY };
              setView((v) => ({ ...v, cx: v.cx - dx / v.scale, cy: v.cy + dy / v.scale }));
            }}
            onPointerUp={() => { drag.current = null; }}
            onPointerLeave={() => { drag.current = null; }}
            onDoubleClick={() => setView({ cx: 0, cy: 0, scale: 40 })}
          />
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Scroll to zoom, drag to pan, double-click to reset. Asymptote jumps are split automatically.
          </p>
        </div>
      </div>
    </ToolPageShell>
  );
}
