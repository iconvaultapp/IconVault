// /tools/neumorphism-generator - Soft-UI shadows (two box-shadows from a base
// color) with flat / concave / convex / pressed shapes, light angle and dark
// mode. Copy-ready CSS. 100% in-browser.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/neumorphism-generator")({
  head: () => {
    const seo = getToolSeoMeta("neumorphism-generator");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: NeumorphismTool,
});

type Shape = "flat" | "concave" | "convex" | "pressed";

const SHAPES: { id: Shape; label: string }[] = [
  { id: "flat", label: "Flat" },
  { id: "concave", label: "Concave" },
  { id: "convex", label: "Convex" },
  { id: "pressed", label: "Pressed" },
];

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Mix hex color toward white (t>0) or black (t<0); t in [-1,1]. */
function shade(hex: string, t: number): string {
  const [r, g, b] = hexToRgb(hex);
  const f = (c: number) => Math.round(t >= 0 ? c + (255 - c) * t : c * (1 + t));
  const to2 = (n: number) => n.toString(16).padStart(2, "0");
  return `#${to2(f(r))}${to2(f(g))}${to2(f(b))}`;
}

function Slider({ label, value, min, max, onChange, suffix }: {
  label: string; value: number; min: number; max: number;
  onChange: (v: number) => void; suffix?: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-[13px] font-medium text-foreground/80">{label}</label>
        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{value}{suffix ?? ""}</span>
      </div>
      <input
        type="range" min={min} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </div>
  );
}

function NeumorphismTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("neumorphism-generator", isPro);
  const seo = getToolSeo("neumorphism-generator");

  const [base, setBase] = useState("#e0e5ec");
  const [distance, setDistance] = useState(12);
  const [blur, setBlur] = useState(24);
  const [intensity, setIntensity] = useState(40);
  const [shape, setShape] = useState<Shape>("flat");
  const [angle, setAngle] = useState(135);
  const [dark, setDark] = useState(false);
  const [copied, setCopied] = useState(false);

  const pageBase = dark ? "#2b2e3a" : base;

  const { css, style } = useMemo(() => {
    const rad = (angle * Math.PI) / 180;
    const dx = Math.round(distance * Math.cos(rad));
    const dy = Math.round(distance * Math.sin(rad));
    const t = intensity / 100;
    const darkC = shade(pageBase, -t * 0.5);
    const lightC = shade(pageBase, t * 0.5);

    let shadows = "";
    let extraBg = "";
    if (shape === "pressed") {
      shadows = `inset ${dx}px ${dy}px ${blur}px ${darkC}, inset ${-dx}px ${-dy}px ${blur}px ${lightC}`;
    } else {
      shadows = `${dx}px ${dy}px ${blur}px ${darkC}, ${-dx}px ${-dy}px ${blur}px ${lightC}`;
      if (shape === "concave") extraBg = `linear-gradient(145deg, ${darkC}, ${lightC})`;
      if (shape === "convex") extraBg = `linear-gradient(145deg, ${lightC}, ${darkC})`;
    }

    const lines = [
      `background: ${extraBg || pageBase};`,
      `box-shadow: ${shadows};`,
    ];
    const st: React.CSSProperties = {
      background: extraBg || pageBase,
      boxShadow: shadows,
    };
    return { css: lines.join("\n"), style: st };
  }, [pageBase, distance, blur, intensity, shape, angle]);

  const copyCss = () => {
    if (!trial.canUse) return;
    void navigator.clipboard.writeText(css).then(() => {
      trial.recordUse();
      setCopied(true);
      toast.success("Neumorphism CSS copied");
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <ToolPageShell toolId="neumorphism-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Neumorphism Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Base color</label>
            <div className="flex items-center gap-2">
              <input
                type="color" value={dark ? "#2b2e3a" : base}
                onChange={(e) => { setBase(e.target.value); setDark(false); }}
                className="h-9 w-16 cursor-pointer rounded-lg border border-border bg-background"
              />
              <span className="font-mono text-xs text-muted-foreground">{dark ? "#2b2e3a" : base}</span>
            </div>
          </div>
          <Slider label="Shadow distance" value={distance} min={0} max={60} onChange={setDistance} suffix="px" />
          <Slider label="Shadow blur" value={blur} min={0} max={80} onChange={setBlur} suffix="px" />
          <Slider label="Shadow intensity" value={intensity} min={0} max={100} onChange={setIntensity} suffix="%" />
          <Slider label="Light angle" value={angle} min={0} max={360} onChange={setAngle} suffix="deg" />

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Shape</p>
            <div className="grid grid-cols-2 gap-2">
              {SHAPES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setShape(s.id)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-sm font-semibold transition",
                    shape === s.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex cursor-pointer items-center justify-between text-[13px] font-medium text-foreground/80">
            Dark mode preview
            <button
              type="button" role="switch" aria-checked={dark}
              onClick={() => setDark((d) => !d)}
              className={cn(
                "relative h-6 w-11 rounded-full transition",
                dark ? "bg-primary" : "bg-muted",
              )}
            >
              <span className={cn(
                "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                dark ? "left-[22px]" : "left-0.5",
              )} />
            </button>
          </label>

          <ActionButton disabled={!trial.canUse} onClick={copyCss}>
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
          <div
            className="flex min-h-[380px] items-center justify-center gap-8 rounded-2xl p-8 transition-colors"
            style={{ background: pageBase }}
          >
            <div style={style} className="flex h-36 w-36 items-center justify-center rounded-3xl">
              <span className="text-sm font-bold" style={{ color: shade(pageBase, dark ? 0.55 : -0.55) }}>
                Soft UI
              </span>
            </div>
            <div style={style} className="hidden h-36 w-36 items-center justify-center rounded-full sm:flex">
              <span className="text-sm font-bold" style={{ color: shade(pageBase, dark ? 0.55 : -0.55) }}>
                Circle
              </span>
            </div>
          </div>
          <pre className="overflow-x-auto rounded-2xl border border-border bg-card p-4 font-mono text-[13px] leading-relaxed">{css}</pre>
        </div>
      </div>
    </ToolPageShell>
  );
}
