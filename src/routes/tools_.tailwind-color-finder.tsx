// /tools/tailwind-color-finder - Pick any color and find the closest Tailwind
// v3/v4 palette shade (e.g. sky-500) by RGB distance. 100% in-browser.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClipboardCopy, Palette } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/tailwind-color-finder")({
  head: () => {
    const seo = getToolSeoMeta("tailwind-color-finder");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: TailwindColorFinder,
});

const SHADES = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"];

/** Tailwind v3 default palette (black/white plus the full 11-shade ramps). */
const PALETTE: Record<string, string[]> = {
  slate: ["#f8fafc","#f1f5f9","#e2e8f0","#cbd5e1","#94a3b8","#64748b","#475569","#334155","#1e293b","#0f172a","#020617"],
  gray: ["#f9fafb","#f3f4f6","#e5e7eb","#d1d5db","#9ca3af","#6b7280","#4b5563","#374151","#1f2937","#111827","#030712"],
  zinc: ["#fafafa","#f4f4f5","#e4e4e7","#d4d4d8","#a1a1aa","#71717a","#52525b","#3f3f46","#27272a","#18181b","#09090b"],
  neutral: ["#fafafa","#f5f5f5","#e5e5e5","#d4d4d4","#a3a3a3","#737373","#525252","#404040","#262626","#171717","#0a0a0a"],
  stone: ["#fafaf9","#f5f5f4","#e7e5e4","#d6d3d1","#a8a29e","#78716c","#57534e","#44403c","#292524","#1c1917","#0c0a09"],
  red: ["#fef2f2","#fee2e2","#fecaca","#fca5a5","#f87171","#ef4444","#dc2626","#b91c1c","#991b1b","#7f1d1d","#450a0a"],
  orange: ["#fff7ed","#ffedd5","#fed7aa","#fdba74","#fb923c","#f97316","#ea580c","#c2410c","#9a3412","#7c2d12","#431407"],
  amber: ["#fffbeb","#fef3c7","#fde68a","#fcd34d","#fbbf24","#f59e0b","#d97706","#b45309","#92400e","#78350f","#451a03"],
  yellow: ["#fefce8","#fef9c3","#fef08a","#fde047","#facc15","#eab308","#ca8a04","#a16207","#854d0e","#713f12","#422006"],
  lime: ["#f7fee7","#ecfccb","#d9f99d","#bef264","#a3e635","#84cc16","#65a30d","#4d7c0f","#3f6212","#365314","#1a2e05"],
  green: ["#f0fdf4","#dcfce7","#bbf7d0","#86efac","#4ade80","#22c55e","#16a34a","#15803d","#166534","#14532d","#052e16"],
  emerald: ["#ecfdf5","#d1fae5","#a7f3d0","#6ee7b7","#34d399","#10b981","#059669","#047857","#065f46","#064e3b","#022c22"],
  teal: ["#f0fdfa","#ccfbf1","#99f6e4","#5eead4","#2dd4bf","#14b8a6","#0d9488","#0f766e","#115e59","#134e4a","#042f2e"],
  cyan: ["#ecfeff","#cffafe","#a5f3fc","#67e8f9","#22d3ee","#06b6d4","#0891b2","#0e7490","#155e75","#164e63","#083344"],
  sky: ["#f0f9ff","#e0f2fe","#bae6fd","#7dd3fc","#38bdf8","#0ea5e9","#0284c7","#0369a1","#075985","#0c4a6e","#082f49"],
  blue: ["#eff6ff","#dbeafe","#bfdbfe","#93c5fd","#60a5fa","#3b82f6","#2563eb","#1d4ed8","#1e40af","#1e3a8a","#172554"],
  indigo: ["#eef2ff","#e0e7ff","#c7d2fe","#a5b4fc","#818cf8","#6366f1","#4f46e5","#4338ca","#3730a3","#312e81","#1e1b4b"],
  violet: ["#f5f3ff","#ede9fe","#ddd6fe","#c4b5fd","#a78bfa","#8b5cf6","#7c3aed","#6d28d9","#5b21b6","#4c1d95","#2e1065"],
  purple: ["#faf5ff","#f3e8ff","#e9d5ff","#d8b4fe","#c084fc","#a855f7","#9333ea","#7e22ce","#6b21a8","#581c87","#3b0764"],
  fuchsia: ["#fdf4ff","#fae8ff","#f5d0fe","#f0abfc","#e879f9","#d946ef","#c026d3","#a21caf","#86198f","#701a75","#4a044e"],
  pink: ["#fdf2f8","#fce7f3","#fbcfe8","#f9a8d4","#f472b6","#ec4899","#db2777","#be185d","#9d174d","#831843","#500724"],
  rose: ["#fff1f2","#ffe4e6","#fecdd3","#fda4af","#fb7185","#f43f5e","#e11d48","#be123c","#9f1239","#881337","#4c0519"],
  black: ["#000000"],
  white: ["#ffffff"],
};

type Entry = { name: string; hex: string; r: number; g: number; b: number };

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(m)) return null;
  return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)];
}

const ALL_ENTRIES: Entry[] = Object.entries(PALETTE).flatMap(([color, shades]) =>
  shades.map((hex, i) => {
    const rgb = hexToRgb(hex)!;
    return { name: color === "black" || color === "white" ? color : `${color}-${SHADES[i]}`, hex, r: rgb[0], g: rgb[1], b: rgb[2] };
  }),
);

/** Weighted Euclidean RGB distance (redmean-style approximation). */
function distance(a: [number, number, number], b: Entry): number {
  const dr = a[0] - b.r, dg = a[1] - b.g, db = a[2] - b.b;
  const rm = (a[0] + b.r) / 2 / 255;
  return Math.sqrt((2 + rm) * dr * dr + 4 * dg * dg + (2 + (1 - rm)) * db * db);
}

function TailwindColorFinder() {
  const { isPro } = usePlan();
  const trial = useToolTrial("tailwind-color-finder", isPro);
  const seo = getToolSeo("tailwind-color-finder");

  const [hex, setHex] = useState("#0ea5e9");
  const [searched, setSearched] = useState<[number, number, number] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const results = useMemo(() => {
    if (!searched) return null;
    return ALL_ENTRIES
      .map((e) => ({ ...e, d: distance(searched, e) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 8);
  }, [searched]);

  const best = results?.[0] ?? null;

  const find = () => {
    const rgb = hexToRgb(hex.trim());
    if (!rgb) {
      setError("Enter a valid 6-digit hex like #0ea5e9.");
      return;
    }
    if (!trial.canUse) {
      setError(`Free trial used up - ${TOOL_TRIAL_LIMIT} lookups per tool. Go Pro for unlimited.`);
      return;
    }
    setError(null);
    setSearched(rgb);
    trial.recordUse();
  };

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Copy failed - select and copy manually.");
    }
  };

  const previewRgb = hexToRgb(hex.trim());
  const previewCss = previewRgb ? `rgb(${previewRgb.join(", ")})` : "#000";

  return (
    <ToolPageShell toolId="tailwind-color-finder" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Tailwind Color Finder" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Your color</p>
            <div className="flex gap-2">
              <input
                type="color"
                value={previewRgb ? `#${previewRgb.map((v) => v.toString(16).padStart(2, "0")).join("")}` : "#000000"}
                onChange={(e) => setHex(e.target.value)}
                className="h-11 w-14 cursor-pointer rounded-lg border border-border bg-transparent"
                aria-label="Pick a color"
              />
              <input
                value={hex}
                onChange={(e) => setHex(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") find(); }}
                placeholder="#0ea5e9"
                spellCheck={false}
                className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary"
              />
            </div>
            <div className="mt-3 h-14 w-full rounded-xl border border-border" style={{ background: previewCss }} />
          </div>

          <ActionButton onClick={find} disabled={!trial.canUse}>
            <Palette className="h-4 w-4" /> Find closest shade
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free lookups left - everything runs on your device.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}

          <p className="text-xs text-muted-foreground">
            Searches the full Tailwind default palette (black, white, and all 11 shades of 22 color ramps) using weighted RGB distance.
          </p>
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          {!results || !best ? (
            <div className="flex h-full min-h-[280px] flex-col items-center justify-center text-center">
              <Palette className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Pick a color to find its match</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                The closest Tailwind shade, its hex, and how far away it is will appear here.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-muted/30 p-4">
                <div className="h-16 w-16 rounded-xl border border-border" style={{ background: previewCss }} title="Your color" />
                <span className="text-xs font-bold text-muted-foreground">vs</span>
                <div className="h-16 w-16 rounded-xl border border-border" style={{ background: best.hex }} title={best.name} />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">Closest match</p>
                  <p className="font-mono text-2xl font-bold text-primary">{best.name}</p>
                  <p className="font-mono text-sm text-muted-foreground">{best.hex} - distance {best.d.toFixed(1)}</p>
                </div>
                <div className="ml-auto flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void copy(best.name, "Class name")}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold hover:border-primary/40"
                  >
                    <ClipboardCopy className="h-3.5 w-3.5" /> Copy class
                  </button>
                  <button
                    type="button"
                    onClick={() => void copy(best.hex, "Hex value")}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold hover:border-primary/40"
                  >
                    <ClipboardCopy className="h-3.5 w-3.5" /> Copy hex
                  </button>
                </div>
              </div>

              <div>
                <p className="mb-2 text-[13px] font-medium text-foreground/80">Runner-up matches</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {results.slice(1).map((r) => (
                    <button
                      key={r.name}
                      type="button"
                      onClick={() => void copy(r.name, "Class name")}
                      title="Click to copy class name"
                      className={cn(
                        "flex items-center gap-3 rounded-xl border border-border px-3 py-2 text-left transition hover:border-primary/40",
                      )}
                    >
                      <span className="h-8 w-8 shrink-0 rounded-lg border border-border" style={{ background: r.hex }} />
                      <span className="min-w-0">
                        <span className="block font-mono text-sm font-bold">{r.name}</span>
                        <span className="block font-mono text-xs text-muted-foreground">{r.hex} - d {r.d.toFixed(1)}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
