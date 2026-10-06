// /tools/css-typed-om - CSS Typed OM lab: construct CSSUnitValues, run real unit
// arithmetic (with honest type errors), build a CSSTransformValue chain with a
// live preview, and drive a box through attributeStyleMap. 100% client-side;
// Typed OM is Chromium-first, support is detected per feature.

import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Braces, Check, Copy, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/css-typed-om";
import toolSeoMeta from "@/lib/tool-seo-meta-data/css-typed-om";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/css-typed-om")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/css-typed-om";
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
  component: TypedOmTool,
});

const UNITS = ["px", "deg", "ms", "percent", "%"] as const;
type UnitKey = (typeof UNITS)[number];

const CTORS: Record<UnitKey, string> = { px: "px", deg: "deg", ms: "ms", percent: "percent", "%": "percent" };

function supportInfo(): { values: boolean; transforms: boolean; styleMap: boolean } {
  if (typeof CSS === "undefined" || typeof window === "undefined") return { values: false, transforms: false, styleMap: false };
  const anyCss = CSS as unknown as Record<string, unknown>;
  const values = typeof anyCss["px"] === "function" && typeof anyCss["number"] === "function";
  const transforms = typeof (window as unknown as { CSSTranslate?: unknown }).CSSTranslate === "function";
  let styleMap = false;
  try {
    styleMap = "attributeStyleMap" in document.documentElement;
  } catch {
    styleMap = false;
  }
  return { values, transforms, styleMap };
}

function describe(v: unknown): string {
  if (v == null) return "null";
  const o = v as { value?: unknown; unit?: unknown };
  return `${String(v)}  (value: ${String(o.value)}, unit: ${String(o.unit)})`;
}

function makeValue(n: number, unit: UnitKey): unknown {
  const anyCss = CSS as unknown as Record<string, (n: number) => unknown>;
  const fn = anyCss[CTORS[unit]];
  if (typeof fn !== "function") throw new Error(`CSS.${CTORS[unit]}() is not available in this browser.`);
  return fn(n);
}

function arithmetic(a: unknown, b: unknown, op: string): unknown {
  const x = a as { add(y: unknown): unknown; sub(y: unknown): unknown; mul(y: unknown): unknown; div(y: unknown): unknown };
  if (op === "+") return x.add(b);
  if (op === "-") return x.sub(b);
  if (op === "*") return x.mul(b);
  return x.div(b);
}

type Step = { kind: "translate" | "rotate" | "scale"; x: number; y: number };

function TypedOmTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("css-typed-om", isPro);
  const seo = toolSeo;
  const support = useMemo(supportInfo, []);

  // section 1: value builder + arithmetic
  const [aVal, setAVal] = useState(24);
  const [aUnit, setAUnit] = useState<UnitKey>("px");
  const [bVal, setBVal] = useState(8);
  const [bUnit, setBUnit] = useState<UnitKey>("px");
  const [op, setOp] = useState("+");

  const calc = useMemo(() => {
    try {
      const a = makeValue(aVal, aUnit);
      const b = makeValue(bVal, bUnit);
      const r = arithmetic(a, b, op);
      return { ok: true as const, a: describe(a), b: describe(b), r: describe(r) };
    } catch (e) {
      return { ok: false as const, err: e instanceof Error ? e.message : "Arithmetic failed." };
    }
  }, [aVal, aUnit, bVal, bUnit, op]);

  // section 2: transform builder
  const [steps, setSteps] = useState<Step[]>([
    { kind: "translate", x: 40, y: 0 },
    { kind: "rotate", x: 25, y: 0 },
  ]);
  const [newKind, setNewKind] = useState<Step["kind"]>("scale");

  const transformCode = useMemo(() => {
    const parts = steps.map((s) => {
      if (s.kind === "translate") return `new CSSTranslate(CSS.px(${s.x}), CSS.px(${s.y}))`;
      if (s.kind === "rotate") return `new CSSRotate(CSS.deg(${s.x}))`;
      return `new CSSScale(CSS.number(${s.x / 50}), CSS.number(${s.y / 50 || s.x / 50}))`;
    });
    return `const t = new CSSTransformValue([\n  ${parts.join(",\n  ")}\n]);\nel.attributeStyleMap.set("transform", t);`;
  }, [steps]);

  useEffect(() => {
    const el = document.getElementById("ivtom-preview");
    if (!el || !support.transforms) return;
    try {
      const w = window as unknown as {
        CSSTranslate: new (x: unknown, y: unknown) => unknown;
        CSSRotate: new (a: unknown) => unknown;
        CSSScale: new (x: unknown, y: unknown) => unknown;
        CSSTransformValue: new (parts: unknown[]) => unknown;
      };
      const parts = steps.map((s) => {
        if (s.kind === "translate") return new w.CSSTranslate(makeValue(s.x, "px"), makeValue(s.y, "px"));
        if (s.kind === "rotate") return new w.CSSRotate(makeValue(s.x, "deg"));
        const fx = s.x / 50;
        const fy = (s.y || s.x) / 50;
        return new w.CSSScale((CSS as unknown as { number(n: number): unknown }).number(fx), (CSS as unknown as { number(n: number): unknown }).number(fy));
      });
      const t = new w.CSSTransformValue(parts);
      (el as unknown as { attributeStyleMap: { set(p: string, v: unknown): void } }).attributeStyleMap.set("transform", t);
    } catch {
      /* leave last good transform in place */
    }
  }, [steps, support.transforms]);

  // section 3: styleMap lab
  const [smW, setSmW] = useState(160);
  const [smR, setSmR] = useState(0);
  const [smO, setSmO] = useState(1);
  const [smReadout, setSmReadout] = useState("Press Apply to drive the box through attributeStyleMap.");

  const applyStyleMap = () => {
    const el = document.getElementById("ivtom-box");
    if (!el) return;
    try {
      const sm = (el as unknown as { attributeStyleMap: { set(p: string, v: unknown): void; get(p: string): unknown } }).attributeStyleMap;
      sm.set("width", makeValue(smW, "px"));
      sm.set("rotate", makeValue(smR, "deg"));
      sm.set("opacity", (CSS as unknown as { number(n: number): unknown }).number(smO));
      setSmReadout(`width -> ${describe(sm.get("width"))}\nrotate -> ${describe(sm.get("rotate"))}\nopacity -> ${describe(sm.get("opacity"))}`);
      trial.recordUse();
    } catch (e) {
      setSmReadout(e instanceof Error ? e.message : "attributeStyleMap is not available in this browser.");
    }
  };

  const copyText = async (text: string, msg: string) => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(text);
      trial.recordUse();
      toast.success(msg);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copyWithFlag = (key: string, text: string, msg: string) => {
    void copyText(text, msg);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const valueSnippet = `const a = CSS.${CTORS[aUnit]}(${aVal});\nconst b = CSS.${CTORS[bUnit]}(${bVal});\nconst result = a.${op === "+" ? "add" : op === "-" ? "sub" : op === "*" ? "mul" : "div"}(b); // ${calc.ok ? String(calc.r).split("  ")[0] : "throws on incompatible units"}`;

  return (
    <ToolPageShell toolId="css-typed-om" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="CSS Typed OM" left={trial.left} />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {[
          { ok: support.values, label: "CSSUnitValue" },
          { ok: support.transforms, label: "CSSTransformValue" },
          { ok: support.styleMap, label: "attributeStyleMap" },
        ].map((s) => (
          <span key={s.label} className={cn("rounded-full px-3 py-1 font-mono text-xs font-bold", s.ok ? "bg-green-500/15 text-green-700 dark:text-green-400" : "bg-amber-500/15 text-amber-700 dark:text-amber-400")}>
            {s.label}: {s.ok ? "yes" : "no"}
          </span>
        ))}
        <span className="text-xs text-muted-foreground">Typed OM is Chromium-first; Safari and Firefox support varies by feature. Everything below is attempted for real and reports honest errors.</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* values + arithmetic */}
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <h3 className="flex items-center gap-1.5 text-sm font-bold"><Braces className="h-4 w-4" /> Typed values and unit arithmetic</h3>
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Value A</label>
              <div className="flex gap-1">
                <input type="number" value={aVal} onChange={(e) => setAVal(Number(e.target.value))} className="w-full rounded-lg border border-border bg-muted/40 px-2 py-1.5 font-mono text-sm outline-none focus:border-primary/60" />
                <select value={aUnit} onChange={(e) => setAUnit(e.target.value as UnitKey)} className="rounded-lg border border-border bg-muted/40 px-1 font-mono text-sm" aria-label="Unit A">
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <select value={op} onChange={(e) => setOp(e.target.value)} className="rounded-lg border border-border bg-muted/40 px-2 py-1.5 font-mono text-lg font-bold" aria-label="Operator">
              {["+", "-", "*", "/"].map((o) => <option key={o}>{o}</option>)}
            </select>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Value B</label>
              <div className="flex gap-1">
                <input type="number" value={bVal} onChange={(e) => setBVal(Number(e.target.value))} className="w-full rounded-lg border border-border bg-muted/40 px-2 py-1.5 font-mono text-sm outline-none focus:border-primary/60" />
                <select value={bUnit} onChange={(e) => setBUnit(e.target.value as UnitKey)} className="rounded-lg border border-border bg-muted/40 px-1 font-mono text-sm" aria-label="Unit B">
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-muted/50 p-3 font-mono text-xs">
            {calc.ok ? (
              <div className="space-y-1">
                <p>a = {calc.a}</p>
                <p>b = {calc.b}</p>
                <p className="font-bold text-primary">result = {calc.r}</p>
              </div>
            ) : (
              <p className="text-amber-700 dark:text-amber-400">TypeError, as the spec demands: {calc.err} Try px with px, or deg * number.</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => copyWithFlag("v", valueSnippet, "Snippet copied")}
            disabled={!trial.canUse}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:border-primary/50 hover:text-primary disabled:opacity-50"
          >
            {copiedKey === "v" ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />} Copy snippet
          </button>
          <p className="text-xs text-muted-foreground">Unlike strings, typed values know their units: <code className="font-mono">px + px</code> works, <code className="font-mono">px + deg</code> throws, and <code className="font-mono">.to("px")</code> converts compatible units.</p>
        </div>

        {/* styleMap lab */}
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-bold">attributeStyleMap lab</h3>
          <div className="flex min-h-[180px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 p-4">
            <div id="ivtom-box" className="flex h-20 items-center justify-center rounded-xl bg-teal-600 text-sm font-bold text-white" style={{ width: 160 }}>
              Typed box
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">width: {smW}px</label>
              <input type="range" min={80} max={280} value={smW} onChange={(e) => setSmW(Number(e.target.value))} className="w-full" aria-label="Width" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">rotate: {smR}deg</label>
              <input type="range" min={-180} max={180} value={smR} onChange={(e) => setSmR(Number(e.target.value))} className="w-full" aria-label="Rotate" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">opacity: {smO.toFixed(1)}</label>
              <input type="range" min={0.2} max={1} step={0.1} value={smO} onChange={(e) => setSmO(Number(e.target.value))} className="w-full" aria-label="Opacity" />
            </div>
          </div>
          <button
            type="button"
            onClick={applyStyleMap}
            disabled={!trial.canUse}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            Apply via attributeStyleMap
          </button>
          <pre className="whitespace-pre-wrap rounded-xl bg-muted/50 p-3 font-mono text-xs">{smReadout}</pre>
        </div>
      </div>

      {/* transform builder */}
      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <h3 className="mb-1 text-sm font-bold">Transform chain builder (CSSTransformValue)</h3>
        <p className="mb-4 text-xs text-muted-foreground">Order matters: each step is applied in sequence. The preview is driven by a real CSSTransformValue, not a string.</p>
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-2">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-2 rounded-xl border border-border p-2.5">
                <span className="w-20 font-mono text-xs font-bold capitalize">{s.kind}</span>
                <input type="number" value={s.x} onChange={(e) => setSteps((p) => p.map((x, j) => (j === i ? { ...x, x: Number(e.target.value) } : x)))} className="w-20 rounded-lg border border-border bg-muted/40 px-2 py-1 font-mono text-xs outline-none focus:border-primary/60" aria-label={`${s.kind} x`} />
                {s.kind !== "rotate" && (
                  <input type="number" value={s.y} onChange={(e) => setSteps((p) => p.map((x, j) => (j === i ? { ...x, y: Number(e.target.value) } : x)))} className="w-20 rounded-lg border border-border bg-muted/40 px-2 py-1 font-mono text-xs outline-none focus:border-primary/60" aria-label={`${s.kind} y`} />
                )}
                <span className="font-mono text-xs text-muted-foreground">{s.kind === "rotate" ? "deg" : s.kind === "scale" ? "x50 = factor" : "px"}</span>
                <button type="button" onClick={() => setSteps((p) => p.filter((_, j) => j !== i))} className="ml-auto rounded-lg p-1.5 text-muted-foreground hover:text-red-500" aria-label="Remove step">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <select value={newKind} onChange={(e) => setNewKind(e.target.value as Step["kind"])} className="rounded-xl border border-border bg-muted/40 px-3 py-2 font-mono text-sm" aria-label="New step kind">
                <option value="translate">translate</option>
                <option value="rotate">rotate</option>
                <option value="scale">scale</option>
              </select>
              <button
                type="button"
                onClick={() => setSteps((p) => [...p, newKind === "rotate" ? { kind: newKind, x: 45, y: 0 } : newKind === "scale" ? { kind: newKind, x: 100, y: 100 } : { kind: newKind, x: 30, y: 0 }])}
                className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-semibold hover:border-primary/50 hover:text-primary"
              >
                <Plus className="h-4 w-4" /> Add step
              </button>
              <button type="button" onClick={() => setSteps([])} className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-semibold text-muted-foreground hover:border-primary/40">
                <RotateCcw className="h-4 w-4" /> Clear
              </button>
            </div>
            <div className="overflow-hidden rounded-xl border border-border">
              <div className="flex items-center justify-between border-b border-border px-4 py-2">
                <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Generated JS</span>
                <button
                  type="button"
                  onClick={() => copyWithFlag("t", transformCode, "Transform code copied")}
                  disabled={!trial.canUse}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold hover:border-primary/50 hover:text-primary disabled:opacity-50"
                >
                  {copiedKey === "t" ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />} Copy
                </button>
              </div>
              <pre className="max-h-56 overflow-auto p-4 text-xs leading-relaxed text-foreground/90">{transformCode}</pre>
            </div>
          </div>
          <div className="flex min-h-[260px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/30">
            {support.transforms ? (
              <div id="ivtom-preview" className="flex h-24 w-24 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 text-sm font-black text-white shadow-lg">
                T
              </div>
            ) : (
              <p className="max-w-[220px] text-center text-xs text-muted-foreground">CSSTransformValue is not available in this browser, so the preview is disabled. The generated code is still valid where supported.</p>
            )}
          </div>
        </div>
      </div>
      {!isPro && <p className="mt-4 text-xs text-muted-foreground">{trial.left} of 5 free uses left. Builders, sliders and the preview are unlimited.</p>}
    </ToolPageShell>
  );
}
