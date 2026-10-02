// /tools/grid-calculator - Visual CSS grid layout calculator with
// responsive presets and breakpoints. 100% client-side.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Columns3, Copy, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/grid-calculator")({
  head: () => {
    const seo = getToolSeoMeta("grid-calculator");
    const canonical = "https://iconvault.site/tools/grid-calculator";
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
  component: GridCalculator,
});

const PRESETS = [
  { label: "Custom", width: 1200, cols: 12, gap: 24 },
  { label: "Desktop 1440", width: 1440, cols: 12, gap: 24 },
  { label: "Laptop 1280", width: 1280, cols: 12, gap: 20 },
  { label: "Tablet 768", width: 768, cols: 8, gap: 16 },
  { label: "Mobile 375", width: 375, cols: 4, gap: 12 },
  { label: "Bootstrap container", width: 1320, cols: 12, gap: 24 },
];

interface Bp {
  id: number;
  maxWidth: number;
  cols: number;
}

let nextBp = 1;

function GridCalculator() {
  const { isPro } = usePlan();
  const trial = useToolTrial("grid-calculator", isPro);
  const seo = getToolSeo("grid-calculator");

  const [width, setWidth] = useState(1200);
  const [cols, setCols] = useState(12);
  const [gap, setGap] = useState(24);
  const [preset, setPreset] = useState("Custom");
  const [bps, setBps] = useState<Bp[]>([
    { id: nextBp++, maxWidth: 768, cols: 8 },
    { id: nextBp++, maxWidth: 480, cols: 4 },
  ]);

  const applyPreset = (label: string) => {
    const p = PRESETS.find((x) => x.label === label);
    if (!p) return;
    setPreset(label);
    setWidth(p.width);
    setCols(p.cols);
    setGap(p.gap);
  };

  const colW = useMemo(() => (width - gap * (cols - 1)) / cols, [width, cols, gap]);

  const css = useMemo(() => {
    const sorted = [...bps].sort((a, b) => b.maxWidth - a.maxWidth);
    const base = [
      ".grid {",
      "  display: grid;",
      `  grid-template-columns: repeat(${cols}, 1fr);`,
      `  gap: ${gap}px;`,
      `  max-width: ${width}px;`,
      "}",
    ].join("\n");
    const mq = sorted
      .map(
        (b) =>
          `\n\n@media (max-width: ${b.maxWidth}px) {\n  .grid {\n    grid-template-columns: repeat(${b.cols}, 1fr);\n  }\n}`,
      )
      .join("");
    return base + mq;
  }, [cols, gap, width, bps]);

  const copyCss = async () => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(css);
      trial.recordUse();
      toast.success("Grid CSS copied");
    } catch {
      toast.error("Could not access the clipboard.");
    }
  };

  const num = (label: string, value: number, set: (v: number) => void, min: number, max: number, unit: string) => (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[13px] font-medium text-foreground/80">{label}</span>
        <span className="text-[13px] font-bold tabular-nums">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => set(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </div>
  );

  return (
    <ToolPageShell toolId="grid-calculator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Grid Calculator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Preset</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(p.label)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                    preset === p.label
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {num("Container width", width, (v) => { setWidth(v); setPreset("Custom"); }, 320, 1920, "px")}
          {num("Columns", cols, (v) => { setCols(v); setPreset("Custom"); }, 1, 24, "")}
          {num("Gap", gap, (v) => { setGap(v); setPreset("Custom"); }, 0, 64, "px")}

          <div className="rounded-xl bg-background p-4 text-center">
            <p className="text-xs text-muted-foreground">Each column</p>
            <p className="text-3xl font-extrabold tabular-nums text-primary">{colW.toFixed(1)}px</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              ({width} - {gap} x {cols - 1}) / {cols}
            </p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Breakpoints</p>
              <button
                type="button"
                onClick={() => setBps((b) => [...b, { id: nextBp++, maxWidth: 640, cols: 6 }])}
                className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            </div>
            <div className="space-y-2">
              {bps.map((b) => (
                <div key={b.id} className="flex items-center gap-2 rounded-xl bg-background px-3 py-2">
                  <span className="font-mono text-xs text-muted-foreground">@media</span>
                  <input
                    type="number"
                    min={240}
                    max={2560}
                    value={b.maxWidth}
                    onChange={(e) =>
                      setBps((ps) => ps.map((x) => (x.id === b.id ? { ...x, maxWidth: Number(e.target.value) } : x)))
                    }
                    className="w-20 rounded-lg border border-border bg-card px-2 py-1 font-mono text-xs"
                  />
                  <span className="font-mono text-xs text-muted-foreground">px:</span>
                  <input
                    type="number"
                    min={1}
                    max={24}
                    value={b.cols}
                    onChange={(e) =>
                      setBps((ps) => ps.map((x) => (x.id === b.id ? { ...x, cols: Number(e.target.value) } : x)))
                    }
                    className="w-16 rounded-lg border border-border bg-card px-2 py-1 font-mono text-xs"
                  />
                  <span className="font-mono text-xs text-muted-foreground">cols</span>
                  <button
                    type="button"
                    onClick={() => setBps((ps) => ps.filter((x) => x.id !== b.id))}
                    className="ml-auto rounded-lg p-1 text-muted-foreground transition hover:bg-red-500/10 hover:text-red-500"
                    aria-label="Remove breakpoint"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {bps.length === 0 && <p className="text-xs text-muted-foreground">No breakpoints. Add one for responsive output.</p>}
            </div>
          </div>

          <ActionButton disabled={!trial.canUse} onClick={copyCss}>
            <Copy className="h-4 w-4" /> Copy CSS
          </ActionButton>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold">Visual preview</p>
              <p className="font-mono text-xs text-muted-foreground">
                {width}px container, {cols} cols, {gap}px gap
              </p>
            </div>
            <div className="overflow-x-auto">
              <div
                className="mx-auto grid"
                style={{ width: Math.min(width, 900), gridTemplateColumns: `repeat(${cols}, 1fr)`, gap }}
              >
                {Array.from({ length: cols }).map((_, i) => (
                  <div
                    key={i}
                    className="flex h-24 items-center justify-center rounded-lg bg-primary/10 font-mono text-xs font-bold text-primary"
                  >
                    {colW.toFixed(0)}
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Columns3 className="h-3.5 w-3.5" /> Each cell shows its computed column width in pixels.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 text-sm font-bold">Generated CSS</p>
            <pre className="max-h-[320px] overflow-auto rounded-xl bg-zinc-950 p-4 font-mono text-xs leading-relaxed text-zinc-200">
              {css}
            </pre>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
