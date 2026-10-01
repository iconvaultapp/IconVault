// /tools/fluid-typography - Generate clamp() fluid type from min/max font-size
// and min/max viewport width. Live preview with a draggable viewport simulator
// and an optional fluid spacing scale. 100% in-browser.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Type } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/fluid-typography")({
  head: () => {
    const seo = getToolSeoMeta("fluid-typography");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: FluidTypeTool,
});

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Build a clamp() expression for a value that scales linearly between two widths. */
function fluidClamp(minVal: number, maxVal: number, minW: number, maxW: number, unit = "px"): string {
  const slope = ((maxVal - minVal) / (maxW - minW)) * 100;
  const intercept = minVal - (slope / 100) * minW;
  const f = (n: number) => (round2(n) === Math.round(n) ? String(Math.round(n)) : String(round2(n)));
  return `clamp(${f(minVal)}${unit}, ${f(intercept)}${unit} + ${f(slope)}vw, ${f(maxVal)}${unit})`;
}

const SPACING_STEPS = [
  { name: "--space-xs", mult: 0.25 },
  { name: "--space-sm", mult: 0.5 },
  { name: "--space-md", mult: 1 },
  { name: "--space-lg", mult: 1.5 },
  { name: "--space-xl", mult: 2.5 },
];

function NumField({ label, value, onChange, suffix }: {
  label: string; value: number; onChange: (v: number) => void; suffix: string;
}) {
  return (
    <label className="text-[13px] font-medium text-foreground/80">
      {label}
      <div className="mt-1.5 flex items-center gap-2">
        <input
          value={value}
          inputMode="decimal"
          onChange={(e) => {
            const n = parseFloat(e.target.value);
            if (Number.isFinite(n) && n >= 0) onChange(n);
          }}
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary"
        />
        <span className="shrink-0 text-sm text-muted-foreground">{suffix}</span>
      </div>
    </label>
  );
}

function FluidTypeTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("fluid-typography", isPro);
  const seo = getToolSeo("fluid-typography");

  const [minF, setMinF] = useState(16);
  const [maxF, setMaxF] = useState(28);
  const [minW, setMinW] = useState(320);
  const [maxW, setMaxW] = useState(1440);
  const [simW, setSimW] = useState(900);
  const [spacing, setSpacing] = useState(false);
  const [copied, setCopied] = useState(false);

  const valid = minF > 0 && maxF > minF && minW > 0 && maxW > minW;

  const clampExpr = useMemo(
    () => (valid ? fluidClamp(minF, maxF, minW, maxW) : ""),
    [minF, maxF, minW, maxW, valid],
  );

  // Simulated font size at the simulated viewport width (same math as the clamp)
  const simSize = useMemo(() => {
    if (!valid) return 0;
    const slope = (maxF - minF) / (maxW - minW);
    return Math.min(maxF, Math.max(minF, minF + slope * (simW - minW)));
  }, [minF, maxF, minW, maxW, simW, valid]);

  const css = useMemo(() => {
    if (!valid) return "";
    const lines = [`font-size: ${clampExpr};`];
    if (spacing) {
      lines.push("");
      lines.push(":root {");
      for (const s of SPACING_STEPS) {
        const lo = round2(minF * s.mult);
        const hi = round2(maxF * s.mult);
        lines.push(`  ${s.name}: ${fluidClamp(lo, hi, minW, maxW)};`);
      }
      lines.push("}");
    }
    return lines.join("\n");
  }, [valid, clampExpr, spacing, minF, maxF, minW, maxW]);

  const copyCss = () => {
    if (!trial.canUse || !valid) return;
    void navigator.clipboard.writeText(css).then(() => {
      trial.recordUse();
      setCopied(true);
      toast.success("Fluid CSS copied");
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <ToolPageShell toolId="fluid-typography" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Fluid Typography" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div className="grid grid-cols-2 gap-3">
            <NumField label="Min font size" value={minF} onChange={setMinF} suffix="px" />
            <NumField label="Max font size" value={maxF} onChange={setMaxF} suffix="px" />
            <NumField label="Min viewport" value={minW} onChange={setMinW} suffix="px" />
            <NumField label="Max viewport" value={maxW} onChange={setMaxW} suffix="px" />
          </div>
          {!valid && (
            <p className="rounded-lg bg-red-500/10 p-2.5 text-xs font-medium text-red-500">
              Max values must be larger than min values.
            </p>
          )}

          <label className="flex cursor-pointer items-center justify-between text-[13px] font-medium text-foreground/80">
            Fluid spacing scale
            <button
              type="button" role="switch" aria-checked={spacing}
              onClick={() => setSpacing((s) => !s)}
              className={cn("relative h-6 w-11 rounded-full transition", spacing ? "bg-primary" : "bg-muted")}
            >
              <span className={cn(
                "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                spacing ? "left-[22px]" : "left-0.5",
              )} />
            </button>
          </label>
          {spacing && (
            <p className="text-xs text-muted-foreground">
              Generates --space-xs through --space-xl, scaled from your type range.
            </p>
          )}

          <ActionButton disabled={!trial.canUse || !valid} onClick={copyCss}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy CSS"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of 5 free copies left - everything runs in your browser.
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">
                Viewport simulator - drag to resize
              </p>
              <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs">{simW}px</span>
            </div>
            <input
              type="range" min={320} max={1440} value={simW}
              onChange={(e) => setSimW(Number(e.target.value))}
              className="mb-4 w-full accent-primary"
            />
            <div className="overflow-hidden rounded-xl border border-border bg-background p-6">
              <div style={{ maxWidth: simW }} className="mx-auto transition-all">
                <p style={{ fontSize: round2(simSize) }} className="font-extrabold leading-tight">
                  The quick brown fox jumps over the lazy dog
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  At a simulated {simW}px viewport this text renders at {round2(simSize)}px.
                  The real clamp() below does this automatically in the browser.
                </p>
              </div>
            </div>
          </div>
          {valid ? (
            <pre className="overflow-x-auto rounded-2xl border border-border bg-card p-4 font-mono text-[13px] leading-relaxed">{css}</pre>
          ) : (
            <div className="flex min-h-[120px] flex-col items-center justify-center rounded-2xl border border-dashed border-border text-center">
              <Type className="mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Fix the ranges above to generate your clamp().</p>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
