// /tools/css-transition-generator - Build CSS transitions visually, with
// a cubic-bezier curve editor and a live hover/click demo. 100%
// client-side; trial use is recorded when the CSS is copied.

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

export const Route = createFileRoute("/tools_/css-transition-generator")({
  head: () => {
    const seo = getToolSeoMeta("css-transition-generator");
    const canonical = "https://iconvault.site/tools/css-transition-generator";
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
  component: TransitionTool,
});

const TIMING_PRESETS = ["ease", "linear", "ease-in", "ease-out", "ease-in-out", "step-start", "step-end"];

const BEZIER_PRESETS: { name: string; v: [number, number, number, number] }[] = [
  { name: "Spring", v: [0.34, 1.56, 0.64, 1] },
  { name: "Overshoot", v: [0.68, -0.55, 0.27, 1.55] },
  { name: "Smooth", v: [0.25, 0.1, 0.25, 1] },
  { name: "Snap", v: [0.85, 0, 0.15, 1] },
];

const PROPERTIES = [
  { value: "all", label: "all" },
  { value: "transform", label: "transform" },
  { value: "opacity", label: "opacity" },
  { value: "background-color", label: "background-color" },
  { value: "color", label: "color" },
  { value: "box-shadow", label: "box-shadow" },
  { value: "width", label: "width" },
  { value: "border-radius", label: "border-radius" },
  { value: "filter", label: "filter" },
];

function TransitionTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("css-transition-generator", isPro);
  const seo = getToolSeo("css-transition-generator");

  const [property, setProperty] = useState("transform");
  const [duration, setDuration] = useState(400);
  const [delay, setDelay] = useState(0);
  const [timing, setTiming] = useState("cubic-bezier(0.34, 1.56, 0.64, 1)");
  const [custom, setCustom] = useState(false);
  const [bx1, setBx1] = useState(0.34);
  const [by1, setBy1] = useState(1.56);
  const [bx2, setBx2] = useState(0.64);
  const [by2, setBy2] = useState(1);
  const [trigger, setTrigger] = useState<"hover" | "click">("hover");
  const [clicked, setClicked] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [copied, setCopied] = useState(false);

  const timingValue = custom ? `cubic-bezier(${bx1}, ${by1}, ${bx2}, ${by2})` : timing;
  const transition = `${property} ${duration}ms ${timingValue} ${delay}ms`;
  const css = `transition: ${transition};`;

  const active = trigger === "hover" ? hovering : clicked;

  const demoStyle = useMemo((): React.CSSProperties => {
    const base: React.CSSProperties = { transition };
    if (!active) return base;
    switch (property) {
      case "transform":
        return { ...base, transform: "translateY(-24px) scale(1.1) rotate(8deg)" };
      case "opacity":
        return { ...base, opacity: 0.25 };
      case "background-color":
        return { ...base, backgroundColor: "#7c3aed" };
      case "color":
        return { ...base, color: "#7c3aed" };
      case "box-shadow":
        return { ...base, boxShadow: "0 20px 40px rgba(0,0,0,0.3)" };
      case "width":
        return { ...base, width: "100%" };
      case "border-radius":
        return { ...base, borderRadius: "50%" };
      case "filter":
        return { ...base, filter: "grayscale(100%) brightness(1.3)" };
      case "all":
      default:
        return { ...base, transform: "translateY(-16px) scale(1.08)", backgroundColor: "#7c3aed", boxShadow: "0 16px 32px rgba(0,0,0,0.25)" };
    }
  }, [active, property, transition]);

  const curve = useMemo(() => {
    const W = 200;
    const H = 120;
    const px = (t: number) => 10 + t * (W - 20);
    const py = (t: number) => 10 + (1 - t) * (H - 20);
    let d = `M ${px(0)} ${py(0)}`;
    for (let i = 1; i <= 40; i++) {
      const t = i / 40;
      const mt = 1 - t;
      const bx = 3 * mt * mt * t * bx1 + 3 * mt * t * t * bx2 + t * t * t;
      const by = 3 * mt * mt * t * by1 + 3 * mt * t * t * by2 + t * t * t;
      d += ` L ${px(bx).toFixed(1)} ${py(by).toFixed(1)}`;
    }
    return { d, p1x: px(bx1), p1y: py(by1), p2x: px(bx2), p2y: py(by2) };
  }, [bx1, by1, bx2, by2]);

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

  const pickTiming = (t: string) => {
    setTiming(t);
    setCustom(false);
  };

  const slider = (
    label: string,
    value: number,
    min: number,
    max: number,
    onChange: (n: number) => void,
    unit = "ms",
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
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </label>
  );

  const bezSlider = (label: string, value: number, onChange: (n: number) => void) => (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between text-[13px]">
        <span className="font-mono font-medium">{label}</span>
        <span className="tabular-nums text-muted-foreground">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={-1}
        max={2}
        step={0.01}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </label>
  );

  return (
    <ToolPageShell toolId="css-transition-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="CSS Transition Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-6">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-foreground/80">Property</span>
            <select
              value={property}
              onChange={(e) => setProperty(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary"
            >
              {PROPERTIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>

          {slider("Duration", duration, 0, 2000, setDuration)}
          {slider("Delay", delay, 0, 1000, setDelay)}

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Timing function
            </p>
            <div className="flex flex-wrap gap-2">
              {TIMING_PRESETS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => pickTiming(t)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 font-mono text-xs font-bold transition",
                    !custom && timing === t ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/60",
                  )}
                >
                  {t}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCustom(true)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-bold transition",
                  custom ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/60",
                )}
              >
                Custom bezier
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {BEZIER_PRESETS.map((b) => (
                <button
                  key={b.name}
                  type="button"
                  onClick={() => {
                    setBx1(b.v[0]); setBy1(b.v[1]); setBx2(b.v[2]); setBy2(b.v[3]);
                    setCustom(true);
                  }}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:border-primary/60 hover:text-foreground"
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>

          {custom && (
            <div className="rounded-xl bg-muted/50 p-4">
              <svg viewBox="0 0 200 120" className="mb-3 w-full rounded-lg bg-background">
                <line x1="10" y1="110" x2="190" y2="110" stroke="currentColor" strokeOpacity="0.2" />
                <line x1="10" y1="10" x2="10" y2="110" stroke="currentColor" strokeOpacity="0.2" />
                <line x1="10" y1="110" x2={curve.p1x} y2={curve.p1y} stroke="#0d9488" strokeDasharray="4 3" />
                <line x1="190" y1="10" x2={curve.p2x} y2={curve.p2y} stroke="#0d9488" strokeDasharray="4 3" />
                <path d={curve.d} fill="none" stroke="#0d9488" strokeWidth="2.5" />
                <circle cx="10" cy="110" r="4" fill="#0d9488" />
                <circle cx="190" cy="10" r="4" fill="#0d9488" />
                <circle cx={curve.p1x} cy={curve.p1y} r="5" fill="white" stroke="#0d9488" strokeWidth="2" />
                <circle cx={curve.p2x} cy={curve.p2y} r="5" fill="white" stroke="#0d9488" strokeWidth="2" />
              </svg>
              {bezSlider("x1", bx1, setBx1)}
              {bezSlider("y1", by1, setBy1)}
              {bezSlider("x2", bx2, setBx2)}
              {bezSlider("y2", by2, setBy2)}
              <p className="mt-2 font-mono text-xs text-muted-foreground">
                cubic-bezier({bx1.toFixed(2)}, {by1.toFixed(2)}, {bx2.toFixed(2)}, {by2.toFixed(2)})
              </p>
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Demo trigger</p>
            <div className="grid grid-cols-2 gap-2">
              {(["hover", "click"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTrigger(t)}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-sm font-bold capitalize transition",
                    trigger === t ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {t} to trigger
                </button>
              ))}
            </div>
          </div>

          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left.
            </p>
          )}
        </div>

        <div className="space-y-5">
          <div className="flex min-h-[380px] flex-col items-center justify-center gap-5 rounded-2xl border border-border bg-card p-10">
            <div className="w-full max-w-sm">
              <div
                onMouseEnter={() => setHovering(true)}
                onMouseLeave={() => setHovering(false)}
                onClick={() => trigger === "click" && setClicked((c) => !c)}
                className={cn("flex h-28 w-40 cursor-pointer items-center justify-center rounded-2xl bg-primary font-bold text-primary-foreground", property === "width" && "w-40 max-w-full")}
                style={demoStyle}
              >
                Demo box
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {trigger === "hover" ? "Hover the box to play the transition" : "Click the box to toggle the transition"}
            </p>
            {trigger === "click" && clicked && (
              <button
                type="button"
                onClick={() => setClicked(false)}
                className="rounded-xl border border-border px-4 py-2 text-xs font-bold hover:border-primary/60"
              >
                Reset
              </button>
            )}
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
