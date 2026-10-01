// /tools/css-matrix-calculator - Build transform stacks and watch the 2D
// matrix math step by step: per-step 3x3 matrices, the combined matrix, a
// live geometric preview, and copyable matrix() / transform output.
// Free, client-side only. Pure math, works in every browser.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Info, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/css-matrix-calculator")({
  head: () => {
    const seo = getToolSeoMeta("css-matrix-calculator");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: MatrixTool,
});

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
    return true;
  } catch {
    toast.error("Copy failed. Select the code manually.");
    return false;
  }
}

type Mat = [number, number, number, number, number, number, number, number, number];

const IDENTITY: Mat = [1, 0, 0, 0, 1, 0, 0, 0, 1];

function mul(a: Mat, b: Mat): Mat {
  const r = new Array(9).fill(0) as Mat;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      let s = 0;
      for (let k = 0; k < 3; k++) s += (a[row * 3 + k] ?? 0) * (b[k * 3 + col] ?? 0);
      r[row * 3 + col] = s;
    }
  }
  return r;
}

type StepKind = "translate" | "rotate" | "scale" | "skewX" | "skewY";
interface Step { id: number; kind: StepKind; p1: number; p2: number }

const STEP_FIELDS: Record<StepKind, [string, string] | [string]> = {
  translate: ["tx (px)", "ty (px)"],
  rotate: ["angle (deg)"],
  scale: ["sx", "sy"],
  skewX: ["angle (deg)"],
  skewY: ["angle (deg)"],
};

function stepMatrix(s: Step): Mat {
  switch (s.kind) {
    case "translate": return [1, 0, s.p1, 0, 1, s.p2, 0, 0, 1];
    case "rotate": {
      const r = (s.p1 * Math.PI) / 180;
      const c = Math.cos(r), q = Math.sin(r);
      return [c, -q, 0, q, c, 0, 0, 0, 1];
    }
    case "scale": return [s.p1, 0, 0, 0, s.p2, 0, 0, 0, 1];
    case "skewX": return [1, Math.tan((s.p1 * Math.PI) / 180), 0, 0, 1, 0, 0, 0, 1];
    case "skewY": return [1, 0, 0, Math.tan((s.p1 * Math.PI) / 180), 1, 0, 0, 0, 1];
  }
}

function stepLabel(s: Step): string {
  const f = (n: number) => String(Math.round(n * 100) / 100);
  switch (s.kind) {
    case "translate": return `translate(${f(s.p1)}px, ${f(s.p2)}px)`;
    case "rotate": return `rotate(${f(s.p1)}deg)`;
    case "scale": return `scale(${f(s.p1)}, ${f(s.p2)})`;
    case "skewX": return `skewX(${f(s.p1)}deg)`;
    case "skewY": return `skewY(${f(s.p1)}deg)`;
  }
}

const fmt = (n: number) => {
  const v = Math.round(n * 10000) / 10000;
  return Object.is(v, -0) ? 0 : v;
};

function MatrixGrid({ m, highlight }: { m: Mat; highlight?: boolean }) {
  return (
    <div className={cn("grid grid-cols-3 gap-1 rounded-lg p-2 font-mono text-xs", highlight ? "bg-primary/10" : "bg-muted/60")}>
      {m.map((v, i) => (
        <div key={i} className="rounded bg-background px-2 py-1.5 text-center">{fmt(v)}</div>
      ))}
    </div>
  );
}

let nextId = 1;

function MatrixTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("css-matrix-calculator", isPro);
  const seo = getToolSeo("css-matrix-calculator");

  const [steps, setSteps] = useState<Step[]>([
    { id: nextId++, kind: "translate", p1: 60, p2: 20 },
    { id: nextId++, kind: "rotate", p1: 25, p2: 0 },
    { id: nextId++, kind: "scale", p1: 1.2, p2: 0.8 },
  ]);
  const [kind, setKind] = useState<StepKind>("translate");
  const [p1, setP1] = useState(40);
  const [p2, setP2] = useState(0);

  const { perStep, combined, matrixCss, transformCss } = useMemo(() => {
    const perStep = steps.map((s) => ({ s, m: stepMatrix(s) }));
    // CSS applies transforms left to right, so the combined matrix is M_n * ... * M_1.
    const combined = perStep.reduce<Mat>((acc, { m }) => mul(m, acc), IDENTITY);
    const [a, c, e, b, d, f] = [combined[0], combined[1], combined[2], combined[3], combined[4], combined[5]];
    const matrixCss = `matrix(${fmt(a ?? 0)}, ${fmt(b ?? 0)}, ${fmt(c ?? 0)}, ${fmt(d ?? 0)}, ${fmt(e ?? 0)}, ${fmt(f ?? 0)})`;
    const transformCss = steps.map(stepLabel).join(" ");
    return { perStep, combined, matrixCss, transformCss };
  }, [steps]);

  const addStep = () => {
    const defaults: Record<StepKind, [number, number]> = {
      translate: [40, 0], rotate: [30, 0], scale: [1.2, 1.2], skewX: [15, 0], skewY: [15, 0],
    };
    const [d1, d2] = defaults[kind] ?? [0, 0];
    setSteps((s) => [...s, { id: nextId++, kind, p1: d1, p2: d2 }]);
  };

  const updateStep = (id: number, patch: Partial<Step>) =>
    setSteps((s) => s.map((st) => (st.id === id ? { ...st, ...patch } : st)));

  const removeStep = (id: number) => setSteps((s) => s.filter((st) => st.id !== id));

  const copyMatrix = async () => {
    if (!trial.canUse) return;
    if (await copyText(`.box {\n  transform: ${matrixCss};\n}`)) trial.recordUse();
  };
  const copyStack = async () => {
    if (!trial.canUse) return;
    if (await copyText(`.box {\n  transform: ${transformCss || "none"};\n}`)) trial.recordUse();
  };

  // Geometric preview: transform the square's corners around the center (100,100).
  const corners: [number, number][] = [[70, 70], [130, 70], [130, 130], [70, 130]];
  const pts = corners.map(([x, y]) => {
    const dx = x - 100, dy = y - 100;
    const nx = 100 + (combined[0] ?? 0) * dx + (combined[1] ?? 0) * dy + (combined[2] ?? 0);
    const ny = 100 + (combined[3] ?? 0) * dx + (combined[4] ?? 0) * dy + (combined[5] ?? 0);
    return `${fmt(nx)},${fmt(ny)}`;
  }).join(" ");

  return (
    <ToolPageShell toolId="css-matrix-calculator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="CSS Matrix Calculator" left={trial.left} />

      <div className="mb-6 flex gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        <p className="text-muted-foreground">
          <span className="font-semibold text-foreground">Pure math, works everywhere.</span> Every CSS 2D transform is a
          3x3 matrix. Stacking transforms multiplies their matrices left to right, and the result is identical to the
          single <span className="font-mono">matrix()</span> below.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <p className="text-sm font-bold">Transform stack</p>
          {steps.length === 0 && (
            <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              No steps. Add one below.
            </p>
          )}
          {steps.map((s, i) => {
            const fields = STEP_FIELDS[s.kind] ?? ["value"];
            return (
              <div key={s.id} className="rounded-xl border border-border bg-background p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-primary">{i + 1}. {stepLabel(s)}</span>
                  <button type="button" onClick={() => removeStep(s.id)} className="rounded p-1 text-muted-foreground hover:text-red-500" aria-label="Remove step">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {fields.map((label, fi) => (
                    <label key={label} className="text-[11px] text-muted-foreground">
                      {label}
                      <input
                        type="number"
                        step="any"
                        value={fi === 0 ? s.p1 : s.p2}
                        onChange={(e) => updateStep(s.id, fi === 0 ? { p1: Number(e.target.value) } : { p2: Number(e.target.value) })}
                        className="mt-0.5 w-full rounded-lg border border-border bg-card px-2 py-1 font-mono text-xs text-foreground"
                      />
                    </label>
                  ))}
                </div>
              </div>
            );
          })}

          <div className="rounded-xl border border-dashed border-border p-3">
            <p className="mb-2 text-xs font-bold text-muted-foreground">Add a step</p>
            <div className="flex gap-2">
              <select value={kind} onChange={(e) => setKind(e.target.value as StepKind)} className="flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-sm">
                {(Object.keys(STEP_FIELDS) as StepKind[]).map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
              <button type="button" onClick={addStep} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground hover:opacity-90">
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-bold">Combined matrix</p>
              <MatrixGrid m={combined} highlight />
              <div className="mt-3 flex flex-wrap gap-2">
                <ActionButton disabled={!trial.canUse} onClick={copyMatrix}>
                  <Copy className="h-4 w-4" /> Copy matrix()
                </ActionButton>
                <button type="button" disabled={!trial.canUse} onClick={copyStack} className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-bold hover:border-primary/40 disabled:opacity-50">
                  <Copy className="h-4 w-4" /> Copy stack
                </button>
              </div>
              <pre className="mt-3 overflow-x-auto whitespace-pre rounded-xl bg-muted/60 p-3 font-mono text-xs">transform: {matrixCss};</pre>
            </div>
            <div>
              <p className="mb-2 text-sm font-bold">Geometric preview</p>
              <svg viewBox="0 0 200 200" className="w-full rounded-xl border border-border bg-background">
                <line x1="100" y1="0" x2="100" y2="200" stroke="#8884" strokeWidth="1" />
                <line x1="0" y1="100" x2="200" y2="100" stroke="#8884" strokeWidth="1" />
                <polygon points="70,70 130,70 130,130 70,130" fill="none" stroke="#8888" strokeDasharray="4 3" strokeWidth="1.5" />
                <polygon points={pts} fill="#0d948833" stroke="#0d9488" strokeWidth="2" />
                <circle cx="100" cy="100" r="3" fill="#ef4444" />
              </svg>
              <p className="mt-1 text-xs text-muted-foreground">Dashed: original. Teal: transformed. Red dot: origin.</p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-bold">Step-by-step multiplication</p>
            <div className="space-y-2">
              {perStep.map(({ s, m }, i) => (
                <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-background p-3">
                  <span className="min-w-[190px] font-mono text-xs font-bold text-primary">{i + 1}. {stepLabel(s)}</span>
                  <MatrixGrid m={m} />
                  {i < perStep.length - 1 && <span className="font-mono text-muted-foreground">×</span>}
                </div>
              ))}
              {perStep.length === 0 && (
                <p className="text-sm text-muted-foreground">Add steps to see the multiplication chain.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
