// /tools/spacing-scale - Build a spacing scale from a base unit and ratio,
// with visual bars and CSS variable / Tailwind theme exports. 100% in-browser.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClipboardCopy, Ruler } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/spacing-scale")({
  head: () => {
    const seo = getToolSeoMeta("spacing-scale");
    const canonical = "https://iconvault.site/tools/spacing-scale";
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
  component: SpacingScaleTool,
});

const PRESETS = [
  { label: "Tailwind-like", base: 4, ratio: null as number | null, steps: [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128, 160, 192, 224, 256] },
  { label: "8pt grid", base: 8, ratio: null, steps: [0, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32] },
  { label: "Golden ratio", base: 8, ratio: 1.618, steps: null as number[] | null },
  { label: "Major third", base: 16, ratio: 1.25, steps: null },
  { label: "Perfect fourth", base: 16, ratio: 1.333, steps: null },
  { label: "Linear 8px", base: 8, ratio: 1, steps: null },
];

function fmt(v: number): string {
  return (Math.round(v * 100) / 100).toString();
}

function SpacingScaleTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("spacing-scale", isPro);
  const seo = getToolSeo("spacing-scale");

  const [base, setBase] = useState("8");
  const [ratio, setRatio] = useState("1.5");
  const [count, setCount] = useState("10");
  const [presetName, setPresetName] = useState<string | null>(null);

  const values = useMemo(() => {
    const b = parseFloat(base);
    if (!isFinite(b) || b <= 0) return null;
    if (presetName) {
      const p = PRESETS.find((x) => x.label === presetName)!;
      return p.steps!.map((mult, i) => ({ step: i, name: `space-${i}`, px: b * mult, rem: (b * mult) / 16 }));
    }
    const r = parseFloat(ratio);
    const n = parseInt(count, 10);
    if (!isFinite(r) || r <= 0 || !isFinite(n) || n < 2 || n > 40) return null;
    return Array.from({ length: n }, (_, i) => {
      const px = b * Math.pow(r, i);
      return { step: i, name: `space-${i}`, px, rem: px / 16 };
    });
  }, [base, ratio, count, presetName]);

  const maxPx = values ? Math.max(...values.map((v) => v.px), 1) : 1;

  const cssVars = values
    ? `:root {\n${values.map((v) => `  --${v.name}: ${fmt(v.px)}px; /* ${fmt(v.rem)}rem */`).join("\n")}\n}`
    : "";

  const twTheme = values
    ? `// tailwind.config.js\ntheme: {\n  extend: {\n    spacing: {\n${values.map((v) => `      ${v.step}: "${fmt(v.rem)}rem", // ${fmt(v.px)}px`).join("\n")}\n    },\n  },\n}`
    : "";

  const applyPreset = (label: string) => {
    const p = PRESETS.find((x) => x.label === label)!;
    setPresetName(label);
    setBase(String(p.base));
    if (p.ratio) setRatio(String(p.ratio));
  };

  const copy = async (text: string, label: string) => {
    if (!trial.canUse) {
      toast.error(`Free trial used up - ${TOOL_TRIAL_LIMIT} copies per tool. Go Pro for unlimited.`);
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      trial.recordUse();
      toast.success(`${label} copied`);
    } catch {
      toast.error("Copy failed - select and copy manually.");
    }
  };

  return (
    <ToolPageShell toolId="spacing-scale" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Spacing Scale" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Presets</p>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(p.label)}
                  className={cn(
                    "rounded-xl border px-2 py-2.5 text-xs font-bold transition",
                    presetName === p.label ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {presetName && (
              <button
                type="button"
                onClick={() => setPresetName(null)}
                className="mt-2 text-xs font-bold text-primary hover:underline"
              >
                Switch to custom geometric scale
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80" htmlFor="sp-base">Base (px)</label>
              <input
                id="sp-base"
                value={base}
                onChange={(e) => { setBase(e.target.value); setPresetName(null); }}
                inputMode="decimal"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80" htmlFor="sp-ratio">Ratio</label>
              <input
                id="sp-ratio"
                value={ratio}
                onChange={(e) => { setRatio(e.target.value); setPresetName(null); }}
                inputMode="decimal"
                disabled={!!presetName}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary disabled:opacity-40"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80" htmlFor="sp-count">Steps</label>
              <input
                id="sp-count"
                value={count}
                onChange={(e) => { setCount(e.target.value); setPresetName(null); }}
                inputMode="numeric"
                disabled={!!presetName}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary disabled:opacity-40"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <ActionButton onClick={() => void copy(cssVars, "CSS variables")} disabled={!trial.canUse || !values}>
              <ClipboardCopy className="h-4 w-4" /> Copy CSS vars
            </ActionButton>
            <button
              type="button"
              onClick={() => void copy(twTheme, "Tailwind theme snippet")}
              disabled={!trial.canUse || !values}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-bold transition hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Tailwind theme
            </button>
          </div>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left - runs fully on your device.
            </p>
          )}
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          {!values ? (
            <div className="flex h-full min-h-[280px] flex-col items-center justify-center text-center">
              <Ruler className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Set a base, ratio and step count</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                A visual scale with exportable CSS variables and a Tailwind theme snippet appears here.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                {values.map((v) => (
                  <div key={v.step} className="flex items-center gap-3">
                    <span className="w-20 shrink-0 font-mono text-xs font-bold text-muted-foreground">space-{v.step}</span>
                    <div className="h-6 min-w-0 flex-1 overflow-hidden rounded-md bg-muted/30">
                      <div
                        className="h-full rounded-md bg-primary/70"
                        style={{ width: `${Math.max((v.px / maxPx) * 100, v.px > 0 ? 1.5 : 0)}%` }}
                      />
                    </div>
                    <span className="w-36 shrink-0 text-right font-mono text-xs">
                      {fmt(v.px)}px <span className="text-muted-foreground">/ {fmt(v.rem)}rem</span>
                    </span>
                  </div>
                ))}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="mb-2 text-[13px] font-medium text-foreground/80">CSS variables</p>
                  <pre className="max-h-56 overflow-auto rounded-xl bg-muted/40 p-3 font-mono text-xs leading-relaxed">{cssVars}</pre>
                </div>
                <div>
                  <p className="mb-2 text-[13px] font-medium text-foreground/80">Tailwind theme</p>
                  <pre className="max-h-56 overflow-auto rounded-xl bg-muted/40 p-3 font-mono text-xs leading-relaxed">{twTheme}</pre>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
