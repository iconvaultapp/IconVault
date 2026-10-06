// /tools/color-mixer - Mix two colors with a blend mode and weight, see the
// result in HEX/RGB/HSL, and browse mix steps. 100% client-side; trial use is
// recorded when a value is copied.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Palette } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/color-mixer";
import toolSeoMeta from "@/lib/tool-seo-meta-data/color-mixer";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/color-mixer")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/color-mixer";
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
  component: ColorMixerTool,
});

const MODES = ["normal", "multiply", "screen", "overlay", "darken", "lighten"] as const;
type Mode = (typeof MODES)[number];

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace(/^#/, "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [
    parseInt(full.slice(0, 2), 16) || 0,
    parseInt(full.slice(2, 4), 16) || 0,
    parseInt(full.slice(4, 6), 16) || 0,
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, Math.round(l * 100)];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function blendChannel(mode: Mode, a: number, b: number): number {
  switch (mode) {
    case "multiply": return a * b;
    case "screen": return 1 - (1 - a) * (1 - b);
    case "overlay": return a < 0.5 ? 2 * a * b : 1 - 2 * (1 - a) * (1 - b);
    case "darken": return Math.min(a, b);
    case "lighten": return Math.max(a, b);
    default: return b;
  }
}

/** Blend color B over color A, then mix the blended result back toward A by weight. */
function mixColors(aHex: string, bHex: string, mode: Mode, weight: number): [number, number, number] {
  const a = hexToRgb(aHex).map((v) => v / 255);
  const b = hexToRgb(bHex).map((v) => v / 255);
  const blended = [0, 1, 2].map((i) => blendChannel(mode, a[i] ?? 0, b[i] ?? 0));
  const t = weight / 100;
  return blended.map((v, i) => ((a[i] ?? 0) + (v - (a[i] ?? 0)) * t) * 255) as [number, number, number];
}

function ColorMixerTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("color-mixer", isPro);
  const seo = toolSeo;

  const [colorA, setColorA] = useState("#0F766E");
  const [colorB, setColorB] = useState("#7C3AED");
  const [weight, setWeight] = useState(50);
  const [mode, setMode] = useState<Mode>("normal");
  const [stepsCount, setStepsCount] = useState(9);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const result = useMemo(() => mixColors(colorA, colorB, mode, weight), [colorA, colorB, mode, weight]);
  const [rr, gg, bb] = result;
  const hex = rgbToHex(rr, gg, bb);
  const [hh, ss, ll] = rgbToHsl(rr, gg, bb);
  const rgbStr = `rgb(${Math.round(rr)}, ${Math.round(gg)}, ${Math.round(bb)})`;
  const hslStr = `hsl(${hh}, ${ss}%, ${ll}%)`;

  const steps = useMemo(() => {
    const a = hexToRgb(colorA);
    return Array.from({ length: stepsCount }, (_, i) => {
      const t = stepsCount === 1 ? 0 : i / (stepsCount - 1);
      const c: [number, number, number] = [
        a[0] + (rr - a[0]) * t,
        a[1] + (gg - a[1]) * t,
        a[2] + (bb - a[2]) * t,
      ];
      return rgbToHex(c[0], c[1], c[2]);
    });
  }, [colorA, rr, gg, bb, stepsCount]);

  const copyValue = async (key: string, value: string) => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      trial.recordUse();
      toast.success("Copied to clipboard");
      setTimeout(() => setCopiedKey(null), 1600);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  const picker = (label: string, value: string, onChange: (v: string) => void) => (
    <div>
      <p className="mb-1.5 text-[13px] font-medium text-foreground/80">{label}</p>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className="h-12 w-16 cursor-pointer rounded-xl border border-border bg-background p-1"
        />
        <input
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v.toUpperCase());
          }}
          spellCheck={false}
          className="w-28 rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm uppercase focus:border-primary focus:outline-none"
        />
      </div>
    </div>
  );

  return (
    <ToolPageShell toolId="color-mixer" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Color Mixer" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          {picker("Color 1 (base)", colorA, setColorA)}
          {picker("Color 2 (blend)", colorB, setColorB)}

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Blend mode</p>
            <div className="grid grid-cols-3 gap-2">
              {MODES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn(
                    "rounded-xl border px-2 py-2 text-xs font-bold capitalize transition",
                    mode === m
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between text-[13px]">
              <span className="font-medium text-foreground/80">Blend amount</span>
              <span className="tabular-nums text-muted-foreground">{weight}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              0% keeps color 1, 100% applies the full {mode} blend.
            </p>
          </div>

          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left.
            </p>
          )}
        </div>

        <div className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="overflow-hidden rounded-2xl border border-border">
              <div className="flex h-40 items-end justify-between p-4" style={{ background: hex }}>
                <Palette className="h-6 w-6 text-white/80" />
                <span className="rounded-lg bg-black/40 px-2.5 py-1 font-mono text-sm font-bold text-white">
                  {hex}
                </span>
              </div>
              <div className="space-y-2 bg-card p-4">
                {[
                  { key: "hex", label: "HEX", value: hex },
                  { key: "rgb", label: "RGB", value: rgbStr },
                  { key: "hsl", label: "HSL", value: hslStr },
                ].map((row) => (
                  <div key={row.key} className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-muted-foreground">{row.label}</span>
                    <code className="truncate font-mono text-xs">{row.value}</code>
                    <button
                      type="button"
                      onClick={() => copyValue(row.key, row.value)}
                      disabled={!trial.canUse}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-[11px] font-bold transition hover:border-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {copiedKey === row.key ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                      {copiedKey === row.key ? "Copied" : "Copy"}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold">Mix steps</h2>
                <div className="flex gap-1 rounded-xl bg-muted p-1">
                  {[5, 9].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setStepsCount(n)}
                      className={cn(
                        "rounded-lg px-3 py-1 text-xs font-bold transition",
                        stepsCount === n ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-1.5">
                {steps.map((s) => (
                  <button
                    key={s}
                    type="button"
                    title={`Copy ${s}`}
                    onClick={() => copyValue(`step-${s}`, s)}
                    className="group relative h-16 flex-1 rounded-lg transition hover:scale-105"
                    style={{ background: s }}
                  >
                    <span className="absolute inset-x-0 -bottom-6 hidden text-center font-mono text-[9px] text-muted-foreground group-hover:block">
                      {s}
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
                Steps run from color 1 to the mixed result. Click any step to copy its HEX.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
