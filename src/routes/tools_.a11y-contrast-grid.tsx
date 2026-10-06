// /tools/a11y-contrast-grid - WCAG contrast matrix for lists of foreground
// and background colors, with AA/AAA badges, cell detail, and CSV export.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, X, Download } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/a11y-contrast-grid";
import toolSeoMeta from "@/lib/tool-seo-meta-data/a11y-contrast-grid";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import { brandFilename } from "@/lib/logo-builder";

export const Route = createFileRoute("/tools_/a11y-contrast-grid")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/a11y-contrast-grid";
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
  component: ContrastGridTool,
});

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.trim().replace(/^#/, "");
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
}

function luminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [rv, gv, bv] = rgb;
  const chan = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * chan(rv) + 0.7152 * chan(gv) + 0.0722 * chan(bv);
}

function contrastRatio(fg: string, bg: string): number {
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

type Level = "AAA" | "AA" | "AA-large" | "Fail";

function levelFor(ratio: number): Level {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "AA-large";
  return "Fail";
}

const LEVEL_STYLE: Record<Level, string> = {
  AAA: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
  AA: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  "AA-large": "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  Fail: "bg-red-500/10 text-red-500 border-red-500/30",
};

const FG_PRESETS = ["#000000", "#1e293b", "#475569", "#ffffff", "#f8fafc", "#0f766e"];
const BG_PRESETS = ["#ffffff", "#f1f5f9", "#0f172a", "#0f766e", "#f59e0b", "#ef4444"];

function normalizeHex(v: string): string | null {
  const rgb = hexToRgb(v);
  if (!rgb) return null;
  return "#" + rgb.map((n) => n.toString(16).padStart(2, "0")).join("");
}

function ContrastGridTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("a11y-contrast-grid", isPro);
  const seo = toolSeo;

  const [foregrounds, setForegrounds] = useState<string[]>(["#0f172a", "#ffffff", "#0f766e", "#ef4444"]);
  const [backgrounds, setBackgrounds] = useState<string[]>(["#ffffff", "#f1f5f9", "#0f172a", "#0f766e"]);
  const [fgInput, setFgInput] = useState("#6366f1");
  const [bgInput, setBgInput] = useState("#fef08a");
  const [selected, setSelected] = useState<{ fg: string; bg: string } | null>(null);

  const addColor = (list: "fg" | "bg", value: string) => {
    const hex = normalizeHex(value);
    if (!hex) {
      toast.error("Enter a valid hex color, like #1e293b.");
      return;
    }
    const set = list === "fg" ? setForegrounds : setBackgrounds;
    set((p) => (p.includes(hex) ? p : [...p, hex]));
  };

  const removeColor = (list: "fg" | "bg", value: string) => {
    const set = list === "fg" ? setForegrounds : setBackgrounds;
    const arr = list === "fg" ? foregrounds : backgrounds;
    if (arr.length <= 1) {
      toast.error("Keep at least one color in each list.");
      return;
    }
    set((p) => p.filter((c) => c !== value));
  };

  const matrix = useMemo(
    () =>
      foregrounds.map((fg) => ({
        fg,
        cells: backgrounds.map((bg) => {
          const ratio = contrastRatio(fg, bg);
          return { bg, ratio, level: levelFor(ratio) };
        }),
      })),
    [foregrounds, backgrounds],
  );

  const exportCsv = () => {
    if (!trial.canUse) return;
    const lines = ["foreground,background,contrast_ratio,AA_normal,AAA,AA_large_text"];
    for (const row of matrix) {
      for (const cell of row.cells) {
        const aa = cell.ratio >= 4.5 ? "pass" : "fail";
        const aaa = cell.ratio >= 7 ? "pass" : "fail";
        const large = cell.ratio >= 3 ? "pass" : "fail";
        lines.push(`${row.fg},${cell.bg},${cell.ratio.toFixed(2)},${aa},${aaa},${large}`);
      }
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = brandFilename("contrast-grid.csv");
    a.click();
    URL.revokeObjectURL(url);
    trial.recordUse();
    toast.success("CSV exported");
  };

  const detail = selected
    ? { ratio: contrastRatio(selected.fg, selected.bg), level: levelFor(contrastRatio(selected.fg, selected.bg)) }
    : null;

  return (
    <ToolPageShell toolId="a11y-contrast-grid" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Contrast Grid" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Foreground colors</p>
            <div className="mb-2 flex flex-wrap gap-2">
              {foregrounds.map((c) => (
                <span key={c} className="inline-flex items-center gap-1.5 rounded-full border border-border py-1 pl-1 pr-2 text-xs font-mono">
                  <span className="h-5 w-5 rounded-full border border-border" style={{ background: c }} />
                  {c}
                  <button type="button" onClick={() => removeColor("fg", c)} aria-label={`Remove ${c}`} className="text-muted-foreground hover:text-destructive">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="color"
                value={fgInput}
                onChange={(e) => setFgInput(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded-lg border border-border bg-background p-1"
              />
              <button
                type="button"
                onClick={() => addColor("fg", fgInput)}
                className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border border-border text-sm font-bold hover:border-primary/40"
              >
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {FG_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => addColor("fg", c)}
                  className="h-6 w-6 rounded-full border border-border transition hover:scale-110"
                  style={{ background: c }}
                  title={c}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Background colors</p>
            <div className="mb-2 flex flex-wrap gap-2">
              {backgrounds.map((c) => (
                <span key={c} className="inline-flex items-center gap-1.5 rounded-full border border-border py-1 pl-1 pr-2 text-xs font-mono">
                  <span className="h-5 w-5 rounded-full border border-border" style={{ background: c }} />
                  {c}
                  <button type="button" onClick={() => removeColor("bg", c)} aria-label={`Remove ${c}`} className="text-muted-foreground hover:text-destructive">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="color"
                value={bgInput}
                onChange={(e) => setBgInput(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded-lg border border-border bg-background p-1"
              />
              <button
                type="button"
                onClick={() => addColor("bg", bgInput)}
                className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border border-border text-sm font-bold hover:border-primary/40"
              >
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {BG_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => addColor("bg", c)}
                  className="h-6 w-6 rounded-full border border-border transition hover:scale-110"
                  style={{ background: c }}
                  title={c}
                />
              ))}
            </div>
          </div>

          <ActionButton disabled={!trial.canUse} onClick={exportCsv}>
            <Download className="h-4 w-4" /> Export CSV
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free exports left - WCAG 2.1 contrast math, in your browser.
            </p>
          )}
        </div>

        <div className="space-y-6">
          <div className="overflow-x-auto rounded-2xl border border-border bg-card p-5">
            <table className="w-full min-w-[480px] border-collapse">
              <thead>
                <tr>
                  <th className="p-2 text-left text-xs text-muted-foreground">FG \ BG</th>
                  {backgrounds.map((bg) => (
                    <th key={bg} className="p-2">
                      <span className="mx-auto block h-8 w-8 rounded-lg border border-border" style={{ background: bg }} title={bg} />
                      <span className="mt-1 block font-mono text-[10px] font-normal text-muted-foreground">{bg}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map((row) => (
                  <tr key={row.fg}>
                    <td className="p-2">
                      <span className="inline-block h-8 w-8 rounded-lg border border-border" style={{ background: row.fg }} title={row.fg} />
                      <span className="mt-1 block font-mono text-[10px] text-muted-foreground">{row.fg}</span>
                    </td>
                    {row.cells.map((cell) => (
                      <td key={cell.bg} className="p-1.5">
                        <button
                          type="button"
                          onClick={() => setSelected({ fg: row.fg, bg: cell.bg })}
                          className={cn(
                            "w-full rounded-xl border px-2 py-3 text-center transition hover:scale-[1.03]",
                            LEVEL_STYLE[cell.level],
                            selected?.fg === row.fg && selected?.bg === cell.bg && "ring-2 ring-primary",
                          )}
                        >
                          <span className="block text-base font-extrabold">{cell.ratio.toFixed(2)}</span>
                          <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-wide">{cell.level}</span>
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            {detail && selected ? (
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm font-bold">Pair detail</p>
                  <div className="rounded-xl p-6 text-center" style={{ background: selected.bg }}>
                    <p className="text-3xl font-extrabold" style={{ color: selected.fg }}>Aa</p>
                    <p className="mt-2 text-sm font-semibold" style={{ color: selected.fg }}>
                      The quick brown fox jumps over the lazy dog
                    </p>
                  </div>
                  <p className="mt-2 font-mono text-xs text-muted-foreground">
                    {selected.fg} on {selected.bg}
                  </p>
                </div>
                <div className="space-y-2 text-sm">
                  {[
                    { label: "Contrast ratio", value: `${detail.ratio.toFixed(2)} : 1` },
                    { label: "AAA (7.0+, normal text)", pass: detail.ratio >= 7 },
                    { label: "AA (4.5+, normal text)", pass: detail.ratio >= 4.5 },
                    { label: "AA large text (3.0+)", pass: detail.ratio >= 3 },
                  ].map((r) => (
                    <div key={r.label} className="flex items-center justify-between rounded-xl border border-border px-4 py-2.5">
                      <span className="font-medium">{r.label}</span>
                      {"pass" in r ? (
                        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", r.pass ? "bg-green-500/15 text-green-600 dark:text-green-400" : "bg-red-500/10 text-red-500")}>
                          {r.pass ? "PASS" : "FAIL"}
                        </span>
                      ) : (
                        <span className="font-mono font-bold">{r.value}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground">Click any cell to inspect that pair in detail.</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-green-500/15 px-3 py-1 font-bold text-green-600 dark:text-green-400">AAA 7.0+</span>
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 font-bold text-emerald-600 dark:text-emerald-400">AA 4.5+</span>
            <span className="rounded-full bg-amber-500/10 px-3 py-1 font-bold text-amber-600 dark:text-amber-400">AA-LARGE 3.0+</span>
            <span className="rounded-full bg-red-500/10 px-3 py-1 font-bold text-red-500">FAIL below 3.0</span>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
