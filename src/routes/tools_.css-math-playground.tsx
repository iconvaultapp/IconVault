// /tools/css-math-playground - Visual builder for CSS math: calc/min/max/clamp + trig
// (sin/cos/tan) with live preview. 100% in-browser.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Download, Sigma } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/css-math-playground")({
  head: () => {
    const seo = getToolSeoMeta("css-math-playground");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: CssMathTool,
});

type Mode = "calc" | "min" | "max" | "clamp" | "sin" | "cos" | "tan";

const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: "calc", label: "calc()", hint: "Mix units in one expression" },
  { id: "min", label: "min()", hint: "Pick the smallest value" },
  { id: "max", label: "max()", hint: "Pick the largest value" },
  { id: "clamp", label: "clamp()", hint: "Responsive value with bounds" },
  { id: "sin", label: "sin()", hint: "Trig-driven layout" },
  { id: "cos", label: "cos()", hint: "Trig-driven layout" },
  { id: "tan", label: "tan()", hint: "Trig-driven layout" },
];

const UNITS = ["px", "%", "rem", "vw", "vh"] as const;

function NumInput({ value, onChange, min = 0, max = 1000 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
      className="w-20 rounded-lg border border-border bg-background px-2 py-1.5 text-sm font-mono"
    />
  );
}

function UnitSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm">
      {UNITS.map((u) => (
        <option key={u} value={u}>{u}</option>
      ))}
    </select>
  );
}

function CssMathTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("css-math-playground", isPro);
  const seo = getToolSeo("css-math-playground");

  const [mode, setMode] = useState<Mode>("clamp");
  const [a, setA] = useState(200);
  const [unitA, setUnitA] = useState("px");
  const [op, setOp] = useState("+");
  const [b, setB] = useState(10);
  const [unitB, setUnitB] = useState("%");
  const [c, setC] = useState(600);
  const [unitC, setUnitC] = useState("px");
  const [angle, setAngle] = useState(45);
  const [amp, setAmp] = useState(120);
  const [demoH, setDemoH] = useState(180);

  const expr = useMemo(() => {
    switch (mode) {
      case "calc": return `calc(${a}${unitA} ${op} ${b}${unitB})`;
      case "min": return `min(${a}${unitA}, ${b}${unitB})`;
      case "max": return `max(${a}${unitA}, ${b}${unitB})`;
      case "clamp": return `clamp(${a}${unitA}, ${b}${unitB}, ${c}${unitC})`;
      case "sin": return `calc(sin(${angle}deg) * ${amp}px)`;
      case "cos": return `calc(cos(${angle}deg) * ${amp}px)`;
      case "tan": return `calc(tan(${angle}deg) * ${amp}px)`;
    }
  }, [mode, a, unitA, op, b, unitB, c, unitC, angle, amp]);

  const css = useMemo(() => {
    if (mode === "sin" || mode === "cos" || mode === "tan") {
      return `.mover {\n  transform: translateX(${expr});\n}`;
    }
    return `.box {\n  width: ${expr};\n}`;
  }, [expr, mode]);

  const isTrig = mode === "sin" || mode === "cos" || mode === "tan";

  const copy = () => {
    if (!trial.canUse) return;
    void navigator.clipboard.writeText(css);
    trial.recordUse();
    toast.success("CSS copied to clipboard");
  };

  const download = () => {
    if (!trial.canUse) return;
    downloadBlob(new Blob([`/* CSS Math Playground - ${mode} */\n${css}\n`], { type: "text/css" }), `css-math-${mode}.css`);
    trial.recordUse();
    toast.success("CSS file downloaded");
  };

  return (
    <ToolPageShell toolId="css-math-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="CSS Math Playground" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* Controls */}
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Function</p>
            <div className="flex flex-wrap gap-2">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  title={m.hint}
                  className={cn(
                    "rounded-xl border px-3 py-2 font-mono text-sm font-bold transition",
                    mode === m.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{MODES.find((m) => m.id === mode)?.hint}. Trig functions need a modern browser (Chrome 111+, Safari 15.4+).</p>
          </div>

          {!isTrig ? (
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-[13px] font-medium text-foreground/80">{mode === "clamp" ? "Minimum" : "Value A"}</p>
                <div className="flex gap-2"><NumInput value={a} onChange={setA} /><UnitSelect value={unitA} onChange={setUnitA} /></div>
              </div>
              {mode === "calc" ? (
                <div>
                  <p className="mb-2 text-[13px] font-medium text-foreground/80">Operator</p>
                  <div className="flex gap-2">
                    {["+", "-", "*", "/"].map((o) => (
                      <button key={o} type="button" onClick={() => setOp(o)}
                        className={cn("rounded-lg border px-4 py-1.5 font-mono text-sm font-bold", op === o ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}>{o}</button>
                    ))}
                  </div>
                </div>
              ) : null}
              <div>
                <p className="mb-2 text-[13px] font-medium text-foreground/80">{mode === "clamp" ? "Preferred" : "Value B"}</p>
                <div className="flex gap-2"><NumInput value={b} onChange={setB} /><UnitSelect value={unitB} onChange={setUnitB} /></div>
              </div>
              {mode === "clamp" && (
                <div>
                  <p className="mb-2 text-[13px] font-medium text-foreground/80">Maximum</p>
                  <div className="flex gap-2"><NumInput value={c} onChange={setC} /><UnitSelect value={unitC} onChange={setUnitC} /></div>
                </div>
              )}
              <div>
                <div className="mb-1 flex justify-between text-[13px] font-medium text-foreground/80"><span>Demo box height</span><span className="font-mono">{demoH}px</span></div>
                <input type="range" min={80} max={320} value={demoH} onChange={(e) => setDemoH(Number(e.target.value))} className="w-full accent-primary" />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="mb-1 flex justify-between text-[13px] font-medium text-foreground/80"><span>Angle</span><span className="font-mono">{angle}deg</span></div>
                <input type="range" min={0} max={360} value={angle} onChange={(e) => setAngle(Number(e.target.value))} className="w-full accent-primary" />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-[13px] font-medium text-foreground/80"><span>Amplitude</span><span className="font-mono">{amp}px</span></div>
                <input type="range" min={20} max={200} value={amp} onChange={(e) => setAmp(Number(e.target.value))} className="w-full accent-primary" />
              </div>
              <p className="text-xs text-muted-foreground">The dot below is positioned with a real <span className="font-mono">{mode}()</span> expression, not JavaScript math.</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <ActionButton onClick={copy} disabled={!trial.canUse}><Copy className="h-4 w-4" /> Copy CSS</ActionButton>
            <button type="button" onClick={download} disabled={!trial.canUse}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-bold transition hover:border-primary/50 disabled:opacity-50">
              <Download className="h-4 w-4" /> .css
            </button>
          </div>
          {!isPro && (
            <p className="text-xs text-muted-foreground">{trial.left} of {TOOL_TRIAL_LIMIT} free copies left. Everything runs in your browser.</p>
          )}
        </div>

        {/* Live preview */}
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
          <div className="min-h-[340px] flex-1 rounded-xl border border-border bg-[repeating-conic-gradient(#80808018_0_25%,transparent_0_50%)] bg-[length:24px_24px] p-6">
            {!isTrig ? (
              <div className="flex h-full items-center justify-center">
                <div
                  className="flex items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg transition-[width] duration-200"
                  style={{ width: expr, height: demoH, maxWidth: "100%" }}
                >
                  <span className="px-3 text-center font-mono text-xs font-bold sm:text-sm">{expr}</span>
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-6">
                <div className="relative h-10 w-full max-w-md rounded-full bg-muted/60">
                  <div className="absolute left-1/2 top-1/2 h-px w-full -translate-x-1/2 bg-border" />
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 shadow-lg" style={{ transform: `translateX(${expr})` }} />
                  </div>
                </div>
                <p className="font-mono text-sm text-muted-foreground">translateX({expr})</p>
              </div>
            )}
          </div>
          <div className="rounded-xl bg-muted/50 p-4">
            <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <Sigma className="h-3.5 w-3.5" /> Generated CSS
            </div>
            <pre className="overflow-x-auto font-mono text-sm text-foreground">{css}</pre>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
