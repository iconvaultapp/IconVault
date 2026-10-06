// /tools/box-shadow-generator - Build CSS box-shadows visually with live preview.
// 100% client-side; trial use is recorded when the CSS is copied.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Layers } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/box-shadow-generator";
import toolSeoMeta from "@/lib/tool-seo-meta-data/box-shadow-generator";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/box-shadow-generator")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/box-shadow-generator";
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
  component: BoxShadowTool,
});

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace(/^#/, "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
}

function BoxShadowTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("box-shadow-generator", isPro);
  const seo = toolSeo;

  const [x, setX] = useState(4);
  const [y, setY] = useState(8);
  const [blur, setBlur] = useState(24);
  const [spread, setSpread] = useState(0);
  const [color, setColor] = useState("#000000");
  const [opacity, setOpacity] = useState(35);
  const [inset, setInset] = useState(false);
  const [copied, setCopied] = useState(false);

  /** One-click presets: x, y, blur, spread, color, opacity, inset */
  const PRESETS: { name: string; v: [number, number, number, number, string, number, boolean] }[] = [
    { name: "Soft card", v: [0, 4, 16, 0, "#000000", 12, false] },
    { name: "Floating", v: [0, 20, 40, 0, "#000000", 18, false] },
    { name: "Button press", v: [0, 3, 0, 0, "#000000", 25, false] },
    { name: "Neumorphic", v: [8, 8, 16, 0, "#b8c2cc", 80, false] },
    { name: "Glow", v: [0, 0, 24, 4, "#7c3aed", 55, false] },
    { name: "Inner", v: [0, 2, 8, 0, "#000000", 20, true] },
    { name: "Sharp edge", v: [6, 6, 0, 0, "#111827", 100, false] },
    { name: "Diffuse", v: [0, 0, 48, 12, "#000000", 14, false] },
  ];

  const applyPreset = (p: (typeof PRESETS)[number]) => {
    const [px, py, pb, ps, pc, po, pi] = p.v;
    setX(px); setY(py); setBlur(pb); setSpread(ps); setColor(pc); setOpacity(po); setInset(pi);
  };

  const css = useMemo(
    () => `box-shadow: ${inset ? "inset " : ""}${x}px ${y}px ${blur}px ${spread}px ${hexToRgba(color, opacity / 100)};`,
    [x, y, blur, spread, color, opacity, inset],
  );

  /** Tailwind arbitrary-value class for the same shadow. */
  const tailwindShadow = useMemo(
    () =>
      `shadow-[${inset ? "inset_" : ""}${x}px_${y}px_${blur}px_${spread}px_${hexToRgba(color, opacity / 100)}]`,
    [x, y, blur, spread, color, opacity, inset],
  );
  const [copiedTw, setCopiedTw] = useState(false);

  const copyTw = async () => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(tailwindShadow);
      setCopiedTw(true);
      trial.recordUse();
      setTimeout(() => setCopiedTw(false), 1600);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

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
    onChange: (n: number) => void,
    unit = "px",
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

  return (
    <ToolPageShell toolId="box-shadow-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Box Shadow Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-6">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Presets</p>
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
          {slider("X offset", x, -50, 50, setX)}
          {slider("Y offset", y, -50, 50, setY)}
          {slider("Blur radius", blur, 0, 100, setBlur)}
          {slider("Spread", spread, -50, 50, setSpread)}
          <div>
            <div className="mb-1.5 flex items-center justify-between text-[13px]">
              <span className="font-medium text-foreground/80">Shadow color</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                aria-label="Shadow color"
                className="h-11 w-14 cursor-pointer rounded-xl border border-border bg-background p-1"
              />
              <span className="font-mono text-sm uppercase">{color}</span>
            </div>
          </div>
          {slider("Opacity", opacity, 0, 100, setOpacity, "%")}
          <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium">
            <input
              type="checkbox"
              checked={inset}
              onChange={(e) => setInset(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            Inset shadow
          </label>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left.
            </p>
          )}
        </div>

        <div className="space-y-5">
          <div
            className="flex min-h-[320px] items-center justify-center rounded-2xl border border-border p-10"
            style={{
              backgroundImage:
                "linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)",
              backgroundSize: "24px 24px",
              backgroundPosition: "0 0, 0 12px, 12px -12px, -12px 0px",
              backgroundColor: "#f8fafc",
            }}
          >
            <div
              className="flex h-36 w-56 items-center justify-center rounded-2xl bg-white"
              style={{ boxShadow: css.replace(/^box-shadow:\s*/, "").replace(/;$/, "") }}
            >
              <Layers className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">CSS output</p>
            <pre className="overflow-x-auto rounded-xl bg-muted/60 p-4 font-mono text-sm">{css}</pre>
            <p className="mb-2 mt-4 text-xs font-bold uppercase tracking-wide text-muted-foreground">Tailwind output</p>
            <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/60 px-4 py-3">
              <code className="break-all font-mono text-sm">{tailwindShadow}</code>
              <button
                type="button" onClick={copyTw} disabled={!trial.canUse}
                className="shrink-0 rounded-lg border border-border p-2 hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Copy Tailwind class"
              >
                {copiedTw ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
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
