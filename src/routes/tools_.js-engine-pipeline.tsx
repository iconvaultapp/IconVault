// /tools/js-engine-pipeline - Follow JavaScript source through the V8 pipeline:
// tokenizer, parser (AST), Ignition bytecode and TurboFan optimization.

import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, ChevronRight, Copy, Pause, Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/js-engine-pipeline";
import toolSeoMeta from "@/lib/tool-seo-meta-data/js-engine-pipeline";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/js-engine-pipeline")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/js-engine-pipeline";
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
  component: EngineTool,
});

/* ---------------- tokenizer ---------------- */

type TokType = "keyword" | "identifier" | "number" | "string" | "punct";
interface Tok { type: TokType; value: string; start: number; end: number; }

const KEYWORDS = new Set(["function", "const", "let", "var", "return"]);

function tokenize(src: string): { tokens: Tok[]; errors: string[] } {
  const tokens: Tok[] = [];
  const errors: string[] = [];
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i]!;
    if (/\s/.test(c)) { i++; continue; }
    if (c === "/" && src[i + 1] === "/") { while (i < n && src[i] !== "\n") i++; continue; }
    if (c === '"' || c === "'") {
      const q = c;
      const start = i;
      i++;
      let v = "";
      while (i < n && src[i] !== q) {
        if (src[i] === "\\" && i + 1 < n) { v += src[i + 1]; i += 2; } else { v += src[i]; i++; }
      }
      if (i >= n) { errors.push("Unterminated string."); break; }
      i++;
      tokens.push({ type: "string", value: v, start, end: i });
      continue;
    }
    if (/\d/.test(c)) {
      const start = i;
      let v = "";
      while (i < n && /[\d.]/.test(src[i]!)) { v += src[i]; i++; }
      tokens.push({ type: "number", value: v, start, end: i });
      continue;
    }
    if (/[A-Za-z_$]/.test(c)) {
      const start = i;
      let v = "";
      while (i < n && /[\w$]/.test(src[i]!)) { v += src[i]; i++; }
      tokens.push({ type: KEYWORDS.has(v) ? "keyword" : "identifier", value: v, start, end: i });
      continue;
    }
    const three = src.slice(i, i + 3);
    const two = src.slice(i, i + 2);
    const start = i;
    if (["===", "!=="].includes(three)) { tokens.push({ type: "punct", value: three, start, end: i + 3 }); i += 3; continue; }
    if (["=>", "==", "!=", "<=", ">="].includes(two)) { tokens.push({ type: "punct", value: two, start, end: i + 2 }); i += 2; continue; }
    if ("(){}[],;.=+-*/<>!".includes(c)) { tokens.push({ type: "punct", value: c, start, end: i + 1 }); i++; continue; }
    errors.push(`Unexpected character "${c}".`);
    i++;
  }
  return { tokens, errors };
}

/* ---------------- parser (subset) ---------------- */

interface ANode { label: string; detail?: string; children: ANode[]; }

function parseTokens(tokens: Tok[]): { ast: ANode | null; errors: string[] } {
  const errors: string[] = [];
  let i = 0;
  const peek = () => tokens[i];
  const next = () => tokens[i++]!;
  const expect = (v: string): boolean => {
    const t = peek();
    if (t && t.value === v) { i++; return true; }
    errors.push(`Expected "${v}" but found "${t ? t.value : "end of input"}".`);
    return false;
  };

  function parseExpr(): ANode | null {
    let left = parseTerm();
    if (!left) return null;
    while (peek() && (peek()!.value === "+" || peek()!.value === "-")) {
      const op = next().value;
      const right = parseTerm();
      if (!right) return null;
      left = { label: `BinaryExpression (${op})`, children: [left, right] };
    }
    return left;
  }
  function parseTerm(): ANode | null {
    let left = parsePrimary();
    if (!left) return null;
    while (peek() && peek()!.value === "*") {
      next();
      const right = parsePrimary();
      if (!right) return null;
      left = { label: "BinaryExpression (*)", children: [left, right] };
    }
    return left;
  }
  function parsePrimary(): ANode | null {
    const t = peek();
    if (!t) { errors.push("Unexpected end of input in expression."); return null; }
    if (t.type === "number") { next(); return { label: `Literal (${t.value})`, children: [] }; }
    if (t.type === "string") { next(); return { label: `Literal ("${t.value}")`, children: [] }; }
    if (t.type === "identifier") {
      next();
      if (peek() && peek()!.value === "(") {
        next();
        const args: ANode[] = [];
        while (peek() && peek()!.value !== ")") {
          const a = parseExpr();
          if (!a) return null;
          args.push(a);
          if (peek() && peek()!.value === ",") next();
        }
        if (!expect(")")) return null;
        return { label: `CallExpression (${t.value})`, children: args };
      }
      return { label: `Identifier (${t.value})`, children: [] };
    }
    if (t.value === "(") {
      next();
      const e = parseExpr();
      if (!e || !expect(")")) return null;
      return e;
    }
    errors.push(`Unexpected token "${t.value}" in expression.`);
    return null;
  }
  function parseStmt(): ANode | null {
    const t = peek();
    if (!t) return null;
    if (t.value === "function") {
      next();
      const id = peek();
      if (!id || id.type !== "identifier") { errors.push("Expected a function name."); return null; }
      next();
      if (!expect("(")) return null;
      const params: ANode[] = [];
      while (peek() && peek()!.value !== ")") {
        const p = peek()!;
        if (p.type !== "identifier") { errors.push("Expected a parameter name."); return null; }
        next();
        params.push({ label: `Identifier (${p.value})`, children: [] });
        if (peek() && peek()!.value === ",") next();
      }
      if (!expect(")")) return null;
      if (!expect("{")) return null;
      const body: ANode[] = [];
      while (peek() && peek()!.value !== "}") {
        const s = parseStmt();
        if (!s) return null;
        body.push(s);
      }
      if (!expect("}")) return null;
      return { label: `FunctionDeclaration (${id.value})`, children: [...params, ...body] };
    }
    if (t.value === "const" || t.value === "let" || t.value === "var") {
      const kind = next().value;
      const id = peek();
      if (!id || id.type !== "identifier") { errors.push("Expected a variable name."); return null; }
      next();
      if (!expect("=")) return null;
      const init = parseExpr();
      if (!init) return null;
      if (peek() && peek()!.value === ";") next();
      return { label: `VariableDeclaration (${kind} ${id.value})`, children: [init] };
    }
    if (t.value === "return") {
      next();
      const arg = parseExpr();
      if (!arg) return null;
      if (peek() && peek()!.value === ";") next();
      return { label: "ReturnStatement", children: [arg] };
    }
    const e = parseExpr();
    if (!e) return null;
    if (peek() && peek()!.value === ";") next();
    return { label: "ExpressionStatement", children: [e] };
  }

  const body: ANode[] = [];
  while (i < tokens.length && errors.length === 0) {
    const s = parseStmt();
    if (!s) break;
    body.push(s);
  }
  if (errors.length) return { ast: null, errors };
  return { ast: { label: "Program", children: body }, errors };
}

/* ---------------- Ignition-ish codegen (illustrative) ---------------- */

function genBytecode(ast: ANode): string[] {
  const lines: string[] = [];
  let reg = 0;
  const newReg = () => `r${reg++}`;

  function genExpr(n: ANode, target: string): void {
    const m = n.label.match(/^Literal \((.+)\)$/);
    if (m) {
      const v = m[1]!;
      if (/^"[^"]*"$/.test(v)) lines.push(`LdaConstant [${v}]`);
      else lines.push(`LdaSmi [${v}]`);
      if (target !== "acc") lines.push(`Star ${target}`);
      return;
    }
    const im = n.label.match(/^Identifier \((.+)\)$/);
    if (im) {
      lines.push(`LdaGlobal [${im[1]}]`);
      if (target !== "acc") lines.push(`Star ${target}`);
      return;
    }
    const bm = n.label.match(/^BinaryExpression \((.)\)$/);
    if (bm && n.children.length === 2) {
      const r = newReg();
      genExpr(n.children[0]!, r);
      lines.push(`Ldar ${r}`);
      const r2 = newReg();
      genExpr(n.children[1]!, r2);
      lines.push(`${bm[1] === "+" ? "Add" : bm[1] === "-" ? "Sub" : "Mul"} ${r2}, [0]`);
      if (target !== "acc") lines.push(`Star ${target}`);
      return;
    }
    const cm = n.label.match(/^CallExpression \((.+)\)$/);
    if (cm) {
      const argRegs = n.children.map(() => newReg());
      n.children.forEach((a, k) => genExpr(a, argRegs[k]!));
      lines.push(`LdaGlobal [${cm[1]}]`);
      const fr = newReg();
      lines.push(`Star ${fr}`);
      lines.push(`CallProperty${argRegs.length} ${fr}, ${argRegs.join(", ")}`);
      if (target !== "acc") lines.push(`Star ${target}`);
      return;
    }
    lines.push(`# (unhandled node: ${n.label})`);
  }

  for (const stmt of ast.children) {
    const fm = stmt.label.match(/^FunctionDeclaration \((.+)\)$/);
    if (fm) {
      reg = 0;
      lines.push(`# --- function ${fm[1]} ---`);
      lines.push(`CreateClosure [${fm[1]}]`);
      for (const s of stmt.children) {
        const vm = s.label.match(/^VariableDeclaration \(\w+ (\w+)\)$/);
        if (vm && s.children[0]) {
          const r = newReg();
          genExpr(s.children[0], r);
          lines.push(`# ${vm[1]} lives in ${r}`);
        } else if (s.label === "ReturnStatement" && s.children[0]) {
          genExpr(s.children[0], "acc");
          lines.push("Return");
        }
      }
      lines.push("");
      continue;
    }
    if (stmt.label === "ExpressionStatement" && stmt.children[0]) {
      reg = 0;
      lines.push("# --- top level ---");
      genExpr(stmt.children[0], "acc");
      lines.push("Return");
    }
  }
  return lines;
}

/* ---------------- TurboFan passes (illustrative) ---------------- */

const PASSES = [
  { name: "Inlining", text: "Small hot functions are pasted into their caller, removing call overhead." },
  { name: "Type specialization", text: "Feedback says a and b are small integers (Smis), so generic add becomes a single integer add." },
  { name: "Constant folding", text: "add(2, 3) with known arguments folds at compile time: the call becomes the constant 5." },
  { name: "Dead code elimination", text: "Registers and checks that can never affect the result are dropped." },
  { name: "Deopt guard", text: "A cheap check stays behind: if a and b ever stop being Smis, execution deoptimizes back to Ignition." },
];

/* ---------------- presets ---------------- */

const PRESETS = [
  {
    name: "add function",
    code: `function add(a, b) {\n  const sum = a + b;\n  return sum;\n}\nadd(2, 3);`,
  },
  {
    name: "area",
    code: `function area(w, h) {\n  return w * h;\n}\nconst a = area(4, 5);`,
  },
  {
    name: "greet",
    code: `function greet(name) {\n  return "hi " + name;\n}\ngreet("Ada");`,
  },
];

const STAGES = ["Source", "Tokenizer", "Parser (AST)", "Ignition", "TurboFan"] as const;

const TOK_COLORS: Record<TokType, string> = {
  keyword: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  identifier: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  number: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  string: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  punct: "bg-muted text-muted-foreground",
};

function AstNode({ node, depth }: { node: ANode; depth: number }) {
  const [open, setOpen] = useState(depth < 2);
  return (
    <div style={{ marginLeft: depth * 14 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded px-1 py-0.5 text-left font-mono text-xs hover:bg-muted/60"
      >
        {node.children.length > 0 && (
          <ChevronRight className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")} />
        )}
        <span className={cn("font-bold", depth === 0 ? "text-primary" : "text-foreground")}>{node.label}</span>
      </button>
      {open && node.children.map((c, i) => <AstNode key={i} node={c} depth={depth + 1} />)}
    </div>
  );
}

function EngineTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("js-engine-pipeline", isPro);
  const seo = toolSeo;

  const [code, setCode] = useState(PRESETS[0]!.code);
  const [applied, setApplied] = useState(PRESETS[0]!.code);
  const [stage, setStage] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [scanIdx, setScanIdx] = useState(-1);
  const [scanning, setScanning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [optStep, setOptStep] = useState(PASSES.length);

  const lexed = useMemo(() => tokenize(applied), [applied]);
  const parsed = useMemo(
    () => (lexed.errors.length ? { ast: null as ANode | null, errors: [] as string[] } : parseTokens(lexed.tokens)),
    [lexed]
  );
  const bytecode = useMemo(() => (parsed.ast ? genBytecode(parsed.ast) : []), [parsed]);

  useEffect(() => {
    setStage(0);
    setScanIdx(-1);
    setScanning(false);
    setPlaying(false);
    setOptStep(0);
  }, [applied]);

  const timerRef = useRef<number | null>(null);
  useEffect(() => {
    if (!playing) return;
    timerRef.current = window.setInterval(() => {
      setStage((s) => {
        if (s >= STAGES.length - 1) {
          if (timerRef.current !== null) window.clearInterval(timerRef.current);
          setPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, 2200);
    return () => { if (timerRef.current !== null) window.clearInterval(timerRef.current); };
  }, [playing]);

  useEffect(() => {
    if (!scanning) return;
    const id = window.setInterval(() => {
      setScanIdx((v) => {
        if (v >= lexed.tokens.length - 1) {
          window.clearInterval(id);
          setScanning(false);
          return v;
        }
        return v + 1;
      });
    }, 260);
    return () => window.clearInterval(id);
  }, [scanning, lexed.tokens.length]);

  useEffect(() => {
    if (stage !== 4) return;
    setOptStep(0);
    const id = window.setInterval(() => {
      setOptStep((v) => {
        if (v >= PASSES.length) { window.clearInterval(id); return v; }
        return v + 1;
      });
    }, 900);
    return () => window.clearInterval(id);
  }, [stage]);

  const copyCode = async () => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(code);
      trial.recordUse();
      setCopied(true);
      toast.success("Code copied");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed in this browser");
    }
  };

  const errors = [...lexed.errors, ...parsed.errors];
  const activeTok = scanIdx >= 0 && scanIdx < lexed.tokens.length ? lexed.tokens[scanIdx]! : null;

  return (
    <ToolPageShell toolId="js-engine-pipeline" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="V8 Pipeline" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Presets</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => { setCode(p.code); setApplied(p.code); }}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs font-bold transition",
                    applied === p.code
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  )}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">JavaScript source</p>
              <button
                type="button"
                onClick={copyCode}
                disabled={!trial.canUse}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:opacity-50"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              rows={10}
              className="w-full rounded-xl border border-border bg-background p-3 font-mono text-xs leading-relaxed outline-none focus:border-primary/60"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Subset: functions, const/let/var, return, calls, + - * and literals.
            </p>
          </div>
          <ActionButton onClick={() => setApplied(code)}>
            <RotateCcw className="h-4 w-4" /> Apply and reset
          </ActionButton>
          {errors.length > 0 && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3">
              {errors.map((e, i) => (
                <p key={i} className="text-xs font-medium text-red-500">{e}</p>
              ))}
            </div>
          )}
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free runs left.
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {STAGES.map((s, i) => (
              <button
                key={s}
                type="button"
                onClick={() => { setPlaying(false); setStage(i); }}
                className={cn(
                  "rounded-xl border px-3 py-2 text-xs font-bold transition",
                  stage === i ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                )}
              >
                {i + 1}. {s}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              disabled={errors.length > 0}
              className="ml-auto inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {playing ? "Pause tour" : "Play walkthrough"}
            </button>
          </div>

          {stage === 0 && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Stage 1 · Source</p>
              <pre className="rounded-xl bg-muted/40 p-4 font-mono text-sm leading-relaxed">{applied}</pre>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Everything starts as plain text. V8 first scans it character by character, turning it into a stream of tokens. Press play or step to the next stage.
              </p>
            </div>
          )}

          {stage === 1 && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Stage 2 · Tokenizer</p>
                <button
                  type="button"
                  onClick={() => { setScanIdx(-1); setScanning(true); }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold transition hover:border-primary/40"
                >
                  <Play className="h-3.5 w-3.5" /> Animate scan
                </button>
              </div>
              <div className="mb-3 rounded-xl bg-muted/40 p-3 font-mono text-sm leading-loose">
                {(() => {
                  if (!activeTok) return applied;
                  const t = activeTok;
                  return (
                    <>
                      {applied.slice(0, t.start)}
                      <span className="rounded bg-primary/25 px-0.5 font-bold text-primary">{applied.slice(t.start, t.end)}</span>
                      {applied.slice(t.end)}
                    </>
                  );
                })()}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {lexed.tokens.map((t, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => { setScanning(false); setScanIdx(i); }}
                    className={cn(
                      "rounded-lg px-2 py-1 font-mono text-xs font-bold transition",
                      TOK_COLORS[t.type],
                      scanIdx === i && "ring-2 ring-primary"
                    )}
                  >
                    {t.value}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                The scanner produced {lexed.tokens.length} tokens. Click any token to see where it came from in the source. Keywords, names, numbers, strings and punctuation each get their own kind.
              </p>
            </div>
          )}

          {stage === 2 && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Stage 3 · Parser (AST)</p>
              {parsed.ast ? (
                <div className="max-h-96 overflow-auto rounded-xl bg-muted/40 p-3">
                  <AstNode node={parsed.ast} depth={0} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Fix the parse errors to see the tree.</p>
              )}
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                The parser checks the grammar and builds an Abstract Syntax Tree: the structural meaning of your code with all punctuation stripped away. Click nodes to expand them.
              </p>
            </div>
          )}

          {stage === 3 && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Stage 4 · Ignition bytecode</p>
              <pre className="max-h-96 overflow-auto rounded-xl bg-black/90 p-4 font-mono text-xs leading-relaxed text-sky-200">
                {bytecode.map((l, i) => (
                  <div key={i} className={l.startsWith("#") ? "text-white/40" : ""}>{l || " "}</div>
                ))}
              </pre>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Ignition compiles the AST to compact bytecode for its accumulator machine. Simplified model: real Ignition output adds type-feedback slots and is more verbose, but the shape (load, operate, store, call, return) is faithful.
              </p>
            </div>
          )}

          {stage === 4 && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Stage 5 · TurboFan optimizer</p>
              <div className="space-y-2">
                {PASSES.map((p, i) => (
                  <div
                    key={p.name}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border p-3 transition",
                      i < optStep ? "border-emerald-500/40 bg-emerald-500/5" : "border-border opacity-50"
                    )}
                  >
                    <span className={cn(
                      "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      i < optStep ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                    )}>
                      {i < optStep ? <Check className="h-3.5 w-3.5" /> : i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-bold">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              {optStep >= PASSES.length && (
                <div className="mt-3 rounded-xl bg-black/90 p-4 font-mono text-xs leading-relaxed text-emerald-300">
                  <div className="text-white/40"># optimized: add(2, 3) fully folded</div>
                  <div>LdaSmi [5]</div>
                  <div>Return</div>
                </div>
              )}
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Once a function runs hot, TurboFan recompiles it with speculative optimizations. Illustrative: real TurboFan emits machine code, but these are the actual passes it applies. If a speculation proves wrong, V8 deoptimizes back to Ignition.
              </p>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Honest scope: the tokenizer and parser here are real for the supported subset. The Ignition and TurboFan stages are simplified models of V8 internals, clearly labeled where they illustrate rather than replicate.
          </p>
        </div>
      </div>
    </ToolPageShell>
  );
}
