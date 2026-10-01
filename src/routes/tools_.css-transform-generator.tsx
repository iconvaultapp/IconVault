// /tools/css-transform-generator - Build CSS transforms visually with
// transform-origin picker. 100% client-side; trial use is recorded when
// the CSS is copied.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/css-transform-generator")({
  head: () => {
    const seo = getToolSeoMeta("css-transform-generator");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: TransformTool,
});

const ORIGINS = [
  ["left top", "center top", "right top"],
  ["left center", "center center", "right center"],
  ["left bottom", "center bottom", "right bottom"],
];

const PRESETS: { name: string; v: [number, number, number, number, number, number, number, string] }[] = [
  // translateX, translateY, rotate, scaleX, scaleY, skewX, skewY, origin
  { name: "None", v: [0, 0, 0, 1, 1, 0, 0, "center center"] },
  { name: "Flip horizontal", v: [0, 0, 0, -1, 1, 0, 0, "center center"] },
  { name: "Tilt", v: [0, 0, -6, 1, 1, -6, 2, "center center"] },
  { name: "Lift", v: [0, -10, 0, 1.05, 1.05, 0, 0, "center center"] },
  { name: "Upside down", v: [0, 0, 180, 1, 1, 0, 0, "center center"] },
  { name: "Squash", v: [0, 0, 0, 1.25, 0.75, 0, 0, "center bottom"] },
  { name: "Skew pop", v: [0, 0, 0, 1.1, 1.1, -12, 0, "center center"] },
];

function TransformTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("css-transform-generator", isPro);
  const seo = getToolSeo("css-transform-generator");

  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [rot, setRot] = useState(0);
  const [sx, setSx] = useState(1);
  const [sy, setSy] = useState(1);
  const [skx, setSkx] = useState(0);
  const [sky, setSky] = useState(0);
  const [origin, setOrigin] = useState("center center");
  const [copied, setCopied] = useState(false);

  const applyPreset = (p: (typeof PRESETS)[number]) => {
    const [a, b, c, d, e, f, g, o] = p.v;
    setTx(a); setTy(b); setRot(c); setSx(d); setSy(e); setSkx(f); setSky(g); setOrigin(o);
  };

  const transform = useMemo(() => {
    const parts: string[] = [];
    if (tx !== 0 || ty !== 0) parts.push(`translate(${tx}px, ${ty}px)`);
    if (rot !== 0) parts.push(`rotate(${rot}deg)`);
    if (sx !== 1 || sy !== 1) parts.push(`scale(${sx}, ${sy})`);
    if (skx !== 0) parts.push(`skewX(${skx}deg)`);
    if (sky !== 0) parts.push(`skewY(${sky}deg)`);
    return parts.length ? parts.join(" ") : "none";
  }, [tx, ty, rot, sx, sy, skx, sky]);

  const css = `transform: ${transform};\ntransform-origin: ${origin};`;

  const copy = async () => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(css);
      setCopied(true);
      trial.recordUse();
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  const slider = (
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    onChange: (n: number) => void,
    unit: string,
  ) => (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between text-[13px]">
        <span className="font-medium text-foreground/80">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </label>
  );

  return (
    <ToolPageShell toolId="css-transform-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="CSS Transform Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-6">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Presets</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:border-primary/60 hover:text-foreground"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {slider("translateX", tx, -200, 200, 1, setTx, "px")}
          {slider("translateY", ty, -200, 200, 1, setTy, "px")}
          {slider("rotate", rot, -180, 180, 1, setRot, "deg")}
          {slider("scaleX", sx, -2, 3, 0.05, setSx, "")}
          {slider("scaleY", sy, -2, 3, 0.05, setSy, "")}
          {slider("skewX", skx, -45, 45, 1, setSkx, "deg")}
          {slider("skewY", sky, -45, 45, 1, setSky, "deg")}

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              transform-origin
            </p>
            <div className="grid w-fit grid-cols-3 gap-1.5">
              {ORIGINS.map((row) =>
                row.map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => setOrigin(o)}
                    aria-label={`Origin ${o}`}
                    title={o}
                    className={cn(
                      "h-9 w-9 rounded-lg border transition",
                      origin === o ? "border-primary bg-primary/20" : "border-border hover:border-primary/40",
                    )}
                  />
                )),
              )}
            </div>
            <p className="mt-1.5 font-mono text-xs text-muted-foreground">{origin}</p>
          </div>

          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left.
            </p>
          )}
        </div>

        <div className="space-y-5">
          <div className="flex min-h-[380px] items-center justify-center overflow-hidden rounded-2xl border border-border bg-card p-10">
            <div className="flex h-40 w-40 items-center justify-center">
              <div
                className="flex h-32 w-32 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground shadow-xl"
                style={{ transform, transformOrigin: origin }}
              >
                T
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">CSS output</p>
            <pre className="overflow-x-auto rounded-xl bg-muted/60 p-4 font-mono text-sm">{css}</pre>
            <button
              type="button"
              onClick={copy}
              disabled={!trial.canUse}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied!" : "Copy CSS"}
            </button>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
