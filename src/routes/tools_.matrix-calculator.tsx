// /tools/matrix-calculator - Matrix add/subtract/multiply/transpose/det/inverse/solve with steps.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Calculator, Copy, Grid3x3 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/matrix-calculator")({
  head: () => {
    const seo = getToolSeoMeta("matrix-calculator");
    const canonical = "https://iconvault.site/tools/matrix-calculator";
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
  component: MatrixTool,
});

type Mat = number[][];

const OPS = [
  { k: "add", label: "A + B" },
  { k: "sub", label: "A - B" },
  { k: "mul", label: "A x B" },
  { k: "transpose", label: "Transpose A" },
  { k: "det", label: "Det(A)" },
  { k: "inv", label: "Inverse A" },
  { k: "solve", label: "Solve Ax = b" },
] as const;
type Op = (typeof OPS)[number]["k"];

const clean = (x: number) => (Math.abs(x) < 1e-12 ? 0 : Math.round(x * 100000) / 100000);
const f = (x: number) => String(clean(x));

function emptyGrid(n: number): string[][] {
  return Array.from({ length: n }, () => Array.from({ length: n }, () => ""));
}
function resizeGrid(g: string[][], n: number): string[][] {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (g[i] && g[i][j] !== undefined ? g[i][j] : "")),
  );
}
function parseGrid(g: string[][]): Mat | null {
  const m: Mat = [];
  for (const row of g) {
    const r: number[] = [];
    for (const cell of row) {
      const v = parseFloat(cell);
      if (cell.trim() === "" || isNaN(v)) return null;
      r.push(v);
    }
    m.push(r);
  }
  return m;
}

function detWithSteps(m: Mat): { value: number; steps: string[] } {
  const n = m.length;
  const steps: string[] = [];
  if (n === 1) {
    steps.push(`det = ${f(m![0]![0]!)}`);
    return { value: m![0]![0]!, steps };
  }
  if (n === 2) {
    const v = m![0]![0]! * m![1]![1]! - m![0]![1]! * m![1]![0]!;
    steps.push(`det = (${f(m![0]![0]!)} x ${f(m![1]![1]!)}) - (${f(m![0]![1]!)} x ${f(m![1]![0]!)}) = ${f(v)}`);
    return { value: v, steps };
  }
  if (n === 3) {
    steps.push("Cofactor expansion along the first row:");
    let total = 0;
    for (let j = 0; j < 3; j++) {
      const minor = [[m![1]![(j + 1) % 3]!, m![1]![(j + 2) % 3]!], [m![2]![(j + 1) % 3]!, m![2]![(j + 2) % 3]!]];
      const md = minor![0]![0]! * minor![1]![1]! - minor![0]![1]! * minor![1]![0]!;
      const cofactor = (j % 2 === 0 ? 1 : -1) * m![0]![j]! * md;
      steps.push(`C(1,${j + 1}) = ${j % 2 === 0 ? "+" : "-"}${f(m![0]![j]!)} x ${f(md)} = ${f(cofactor)}`);
      total += cofactor;
    }
    steps.push(`det = ${f(total)}`);
    return { value: total, steps };
  }
  // 4x4: elimination with partial pivoting
  const a = m.map((r) => [...r]);
  let sign = 1;
  steps.push("Gaussian elimination (partial pivoting):");
  for (let k = 0; k < n; k++) {
    let piv = k;
    for (let i = k + 1; i < n; i++) if (Math.abs(a![i]![k]!) > Math.abs(a![piv]![k]!)) piv = i;
    if (Math.abs(a![piv]![k]!) < 1e-12) {
      steps.push(`Column ${k + 1} pivot is zero: determinant = 0`);
      return { value: 0, steps };
    }
    if (piv !== k) {
      [a[k]!, a[piv]!] = [a[piv]!, a[k]!];
      sign *= -1;
      steps.push(`R${k + 1} <-> R${piv + 1}: sign flips to ${sign > 0 ? "+1" : "-1"}`);
    }
    for (let i = k + 1; i < n; i++) {
      const factor = a![i]![k]! / a![k]![k]!;
      for (let j = k; j < n; j++) a![i]![j]! -= factor * a![k]![j]!;
    }
    steps.push(`Eliminated column ${k + 1}, pivot = ${f(a![k]![k]!)}`);
  }
  const v = sign * a.reduce((p, r, i) => p * r![i]!, 1);
  steps.push(`det = ${sign > 0 ? "" : "-"}(${a.map((r, i) => f(r![i]!)).join(" x ")}) = ${f(v)}`);
  return { value: v, steps };
}

/** Gauss-Jordan inverse, returns null when singular. */
function inverseWithSteps(m: Mat): { inv: Mat; steps: string[] } | null {
  const n = m.length;
  const steps: string[] = [];
  const a = m.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  steps.push("Augmenting with the identity and reducing to [I | A^-1]:");
  for (let k = 0; k < n; k++) {
    let piv = k;
    for (let i = k + 1; i < n; i++) if (Math.abs(a![i]![k]!) > Math.abs(a![piv]![k]!)) piv = i;
    if (Math.abs(a![piv]![k]!) < 1e-12) return null;
    if (piv !== k) {
      [a[k]!, a[piv]!] = [a[piv]!, a[k]!];
      steps.push(`R${k + 1} <-> R${piv + 1}`);
    }
    const pivVal = a![k]![k]!;
    for (let j = 0; j < 2 * n; j++) a![k]![j]! /= pivVal!;
    steps.push(`R${k + 1} = R${k + 1} / ${f(pivVal!)} (pivot becomes 1)`);
    for (let i = 0; i < n; i++) {
      if (i === k) continue;
      const factor = a![i]![k]!;
      if (Math.abs(factor!) < 1e-12) continue;
      for (let j = 0; j < 2 * n; j++) a![i]![j]! -= factor! * a![k]![j]!;
      steps.push(`R${i + 1} = R${i + 1} - ${f(factor!)} x R${k + 1}`);
    }
  }
  const inv = a.map((r) => r.slice(n).map(clean));
  return { inv, steps };
}

function solveWithSteps(m: Mat, b: number[]): { x: number[]; steps: string[] } | null {
  const n = m.length;
  const steps: string[] = [];
  const a = m.map((r, i) => [...r, b[i]]);
  steps.push("Forward elimination on the augmented matrix [A | b]:");
  for (let k = 0; k < n; k++) {
    let piv = k;
    for (let i = k + 1; i < n; i++) if (Math.abs(a![i]![k]!) > Math.abs(a![piv]![k]!)) piv = i;
    if (Math.abs(a![piv]![k]!) < 1e-12) return null;
    if (piv !== k) {
      [a[k]!, a[piv]!] = [a[piv]!, a[k]!];
      steps.push(`R${k + 1} <-> R${piv + 1}`);
    }
    for (let i = k + 1; i < n; i++) {
      const factor = a![i]![k]! / a![k]![k]!;
      for (let j = k; j <= n; j++) a![i]![j]! -= factor * a![k]![j]!;
      steps.push(`R${i + 1} = R${i + 1} - ${f(factor)} x R${k + 1}`);
    }
  }
  steps.push("Back substitution:");
  const x = new Array<number>(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = a![i]![n]!;
    for (let j = i + 1; j < n; j++) s! -= a![i]![j]! * x![j]!;
    x[i] = s! / a![i]![i]!;
    steps.push(`x${i + 1} = ${f(x![i]!)}`);
  }
  return { x: x.map(clean), steps };
}

function MatrixEditor({
  label, grid, setGrid, n,
}: {
  label: string; grid: string[][]; setGrid: (g: string[][]) => void; n: number;
}) {
  const cell = "w-full rounded-lg border border-border bg-background px-1 py-1.5 text-center font-mono text-sm outline-none focus:border-primary";
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[13px] font-bold">{label}</p>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setGrid(Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? "1" : "0"))))}
            className="rounded-lg border border-border px-2 py-1 text-xs font-semibold text-muted-foreground transition hover:border-primary/40"
          >
            Identity
          </button>
          <button
            type="button"
            onClick={() => setGrid(emptyGrid(n))}
            className="rounded-lg border border-border px-2 py-1 text-xs font-semibold text-muted-foreground transition hover:border-primary/40"
          >
            Clear
          </button>
        </div>
      </div>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
        {grid.map((row, i) =>
          row.map((v, j) => (
            <input
              key={`${i}-${j}`}
              value={v}
              aria-label={`${label} row ${i + 1} column ${j + 1}`}
              onChange={(e) => {
                const next = grid.map((r) => [...r]);
                next![i]![j]! = e.target.value;
                setGrid(next);
              }}
              inputMode="decimal"
              className={cell}
            />
          )),
        )}
      </div>
    </div>
  );
}

function ResultMatrix({ m }: { m: Mat }) {
  return (
    <div className="inline-grid gap-1.5" style={{ gridTemplateColumns: `repeat(${m![0]!.length!}, minmax(0, 1fr))` }}>
      {m.map((row, i) =>
        row.map((v, j) => (
          <div key={`${i}-${j}`} className="min-w-[64px] rounded-lg border border-border bg-muted/30 px-3 py-2 text-center font-mono text-sm font-bold">
            {f(v)}
          </div>
        )),
      )}
    </div>
  );
}

function MatrixTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("matrix-calculator", isPro);
  const seo = getToolSeo("matrix-calculator");

  const [n, setN] = useState(3);
  const [op, setOp] = useState<Op>("add");
  const [A, setA] = useState<string[][]>(emptyGrid(3));
  const [B, setB] = useState<string[][]>(emptyGrid(3));
  const [b, setBv] = useState<string[]>(["", "", ""]);
  const [result, setResult] = useState<{ kind: "matrix"; m: Mat } | { kind: "scalar"; v: number; label: string } | { kind: "vector"; x: number[] } | null>(null);
  const [steps, setSteps] = useState<string[]>([]);

  const changeSize = (size: number) => {
    setN(size);
    setA((p) => resizeGrid(p, size));
    setB((p) => resizeGrid(p, size));
    setBv((p) => Array.from({ length: size }, (_, i) => p[i] ?? ""));
    setResult(null);
    setSteps([]);
  };

  const calculate = () => {
    if (!trial.canUse) return;
    const a = parseGrid(A);
    if (!a) { toast.error("Fill every cell of matrix A with a number."); return; }
    const stepsOut: string[] = [];

    if (op === "transpose") {
      const t = a[0]!.map((_, j) => a.map((r) => r[j]!));
      stepsOut.push("Transposing swaps rows and columns: (A^T)[i][j] = A[j][i]");
      setResult({ kind: "matrix", m: t });
    } else if (op === "det") {
      const { value, steps } = detWithSteps(a);
      setResult({ kind: "scalar", v: clean(value), label: "det(A)" });
      setSteps(steps);
      trial.recordUse();
      toast.success("Determinant calculated");
      return;
    } else if (op === "inv") {
      const r = inverseWithSteps(a);
      if (!r) { toast.error("Matrix A is singular - no inverse exists."); return; }
      setResult({ kind: "matrix", m: r.inv });
      setSteps(r.steps);
    } else if (op === "solve") {
      const bv = b.map((s) => parseFloat(s));
      if (bv.some((v, i) => b![i]!.trim() === "" || isNaN(v))) { toast.error("Fill every entry of vector b with a number."); return; }
      const r = solveWithSteps(a, bv);
      if (!r) { toast.error("No unique solution - the matrix is singular."); return; }
      setResult({ kind: "vector", x: r.x });
      setSteps(r.steps);
    } else {
      const bb = parseGrid(B);
      if (!bb) { toast.error("Fill every cell of matrix B with a number."); return; }
      if (op === "add" || op === "sub") {
        for (let i = 0; i < n; i++)
          for (let j = 0; j < n; j++)
            stepsOut.push(`C[${i + 1}][${j + 1}] = ${f(a![i]![j]!)} ${op === "add" ? "+" : "-"} ${f(bb![i]![j]!)} = ${f(op === "add" ? a![i]![j]! + bb![i]![j]! : a![i]![j]! - bb![i]![j]!)}`);
        const c = a.map((r, i) => r.map((v, j) => clean(op === "add" ? v + bb![i]![j]! : v - bb![i]![j]!)));
        setResult({ kind: "matrix", m: c });
      } else {
        const c: Mat = Array.from({ length: n }, () => Array.from({ length: n }, () => 0));
        for (let i = 0; i < n; i++)
          for (let j = 0; j < n; j++) {
            const terms = a![i]!.map((v, k) => `${f(v)} x ${f(bb![k]![j]!)}`);
            const sum = a![i]!.reduce((s, v, k) => s + v * bb![k]![j]!, 0);
            c![i]![j]! = clean(sum);
            stepsOut.push(`C[${i + 1}][${j + 1}] = ${terms.join(" + ")} = ${f(sum)}`);
          }
        setResult({ kind: "matrix", m: c });
      }
    }
    setSteps(stepsOut);
    trial.recordUse();
    toast.success("Calculated");
  };

  const copyResult = async () => {
    if (!result || !trial.canUse) return;
    const text =
      result.kind === "scalar"
        ? `${result.label} = ${f(result.v)}`
        : result.kind === "vector"
          ? result.x.map((v, i) => `x${i + 1} = ${f(v)}`).join("\n")
          : result.m.map((r) => r.map(f).join("\t")).join("\n");
    await navigator.clipboard.writeText(text);
    trial.recordUse();
    toast.success("Result copied");
  };

  const needsB = op === "add" || op === "sub" || op === "mul";

  return (
    <ToolPageShell toolId="matrix-calculator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Matrix Calculator" left={trial.left} />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="text-[13px] font-medium text-muted-foreground">Size:</span>
        {[2, 3, 4].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => changeSize(s)}
            className={cn(
              "rounded-xl border px-4 py-2 text-sm font-bold transition",
              n === s ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
            )}
          >
            {s}x{s}
          </button>
        ))}
        <span className="ml-2 text-[13px] font-medium text-muted-foreground">Operation:</span>
        <div className="flex flex-wrap gap-2">
          {OPS.map(({ k, label }) => (
            <button
              key={k}
              type="button"
              onClick={() => { setOp(k); setResult(null); setSteps([]); }}
              className={cn(
                "rounded-xl border px-3.5 py-2 text-sm font-bold transition",
                op === k ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <div className="space-y-6 rounded-2xl border border-border bg-card p-5">
          <MatrixEditor label="Matrix A" grid={A} setGrid={setA} n={n} />
          {needsB && <MatrixEditor label="Matrix B" grid={B} setGrid={setB} n={n} />}
          {op === "solve" && (
            <div>
              <p className="mb-2 text-[13px] font-bold">Vector b</p>
              <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
                {b.map((v, i) => (
                  <input
                    key={i}
                    value={v}
                    aria-label={`b row ${i + 1}`}
                    onChange={(e) => setBv((p) => p.map((x, j) => (j === i ? e.target.value : x)))}
                    inputMode="decimal"
                    className="w-full rounded-lg border border-border bg-background px-1 py-1.5 text-center font-mono text-sm outline-none focus:border-primary"
                  />
                ))}
              </div>
            </div>
          )}
          <ActionButton disabled={!trial.canUse} onClick={calculate}>
            <Calculator className="h-4 w-4" /> Calculate
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free calculations left - everything runs in your browser.
            </p>
          )}
        </div>

        <div className="space-y-6 rounded-2xl border border-border bg-card p-5">
          {!result ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <Grid3x3 className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your result appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Fill in the matrices, pick an operation, and see the answer with each step shown.
              </p>
            </div>
          ) : (
            <>
              <div>
                <p className="mb-3 text-[13px] font-medium text-muted-foreground">Result</p>
                {result.kind === "scalar" ? (
                  <p className="font-mono text-3xl font-bold">{result.label} = {f(result.v)}</p>
                ) : result.kind === "vector" ? (
                  <div className="space-y-1.5">
                    {result.x.map((v, i) => (
                      <p key={i} className="font-mono text-lg font-bold">x{i + 1} = {f(v)}</p>
                    ))}
                  </div>
                ) : (
                  <ResultMatrix m={result.m} />
                )}
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => void copyResult()}
                    className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold transition hover:border-primary/40"
                  >
                    <Copy className="h-4 w-4" /> Copy result
                  </button>
                </div>
              </div>
              {steps.length > 0 && (
                <div>
                  <p className="mb-2 text-[13px] font-medium text-muted-foreground">Steps</p>
                  <ol className="max-h-72 space-y-1.5 overflow-y-auto rounded-xl border border-border bg-muted/30 p-4 text-[13px] font-mono">
                    {steps.map((s, i) => (
                      <li key={i}><span className="mr-2 text-muted-foreground">{i + 1}.</span>{s}</li>
                    ))}
                  </ol>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
