// /tools/color-name-finder - Pick any color and find the nearest of the 148
// CSS named colors by RGB distance, with swatch, name and hex. 100% in-browser.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClipboardCopy, Tag } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/color-name-finder")({
  head: () => {
    const seo = getToolSeoMeta("color-name-finder");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: ColorNameFinder,
});

/** All 148 CSS named colors. */
const COLORS: [string, string][] = [
  ["aliceblue","#f0f8ff"],["antiquewhite","#faebd7"],["aqua","#00ffff"],["aquamarine","#7fffd4"],
  ["azure","#f0ffff"],["beige","#f5f5dc"],["bisque","#ffe4c4"],["black","#000000"],
  ["blanchedalmond","#ffebcd"],["blue","#0000ff"],["blueviolet","#8a2be2"],["brown","#a52a2a"],
  ["burlywood","#deb887"],["cadetblue","#5f9ea0"],["chartreuse","#7fff00"],["chocolate","#d2691e"],
  ["coral","#ff7f50"],["cornflowerblue","#6495ed"],["cornsilk","#fff8dc"],["crimson","#dc143c"],
  ["cyan","#00ffff"],["darkblue","#00008b"],["darkcyan","#008b8b"],["darkgoldenrod","#b8860b"],
  ["darkgray","#a9a9a9"],["darkgrey","#a9a9a9"],["darkgreen","#006400"],["darkkhaki","#bdb76b"],
  ["darkmagenta","#8b008b"],["darkolivegreen","#556b2f"],["darkorange","#ff8c00"],["darkorchid","#9932cc"],
  ["darkred","#8b0000"],["darksalmon","#e9967a"],["darkseagreen","#8fbc8f"],["darkslateblue","#483d8b"],
  ["darkslategray","#2f4f4f"],["darkslategrey","#2f4f4f"],["darkturquoise","#00ced1"],["darkviolet","#9400d3"],
  ["deeppink","#ff1493"],["deepskyblue","#00bfff"],["dimgray","#696969"],["dimgrey","#696969"],
  ["dodgerblue","#1e90ff"],["firebrick","#b22222"],["floralwhite","#fffaf0"],["forestgreen","#228b22"],
  ["fuchsia","#ff00ff"],["gainsboro","#dcdcdc"],["ghostwhite","#f8f8ff"],["gold","#ffd700"],
  ["goldenrod","#daa520"],["gray","#808080"],["grey","#808080"],["green","#008000"],
  ["greenyellow","#adff2f"],["honeydew","#f0fff0"],["hotpink","#ff69b4"],["indianred","#cd5c5c"],
  ["indigo","#4b0082"],["ivory","#fffff0"],["khaki","#f0e68c"],["lavender","#e6e6fa"],
  ["lavenderblush","#fff0f5"],["lawngreen","#7cfc00"],["lemonchiffon","#fffacd"],["lightblue","#add8e6"],
  ["lightcoral","#f08080"],["lightcyan","#e0ffff"],["lightgoldenrodyellow","#fafad2"],["lightgray","#d3d3d3"],
  ["lightgrey","#d3d3d3"],["lightgreen","#90ee90"],["lightpink","#ffb6c1"],["lightsalmon","#ffa07a"],
  ["lightseagreen","#20b2aa"],["lightskyblue","#87cefa"],["lightslategray","#778899"],["lightslategrey","#778899"],
  ["lightsteelblue","#b0c4de"],["lightyellow","#ffffe0"],["lime","#00ff00"],["limegreen","#32cd32"],
  ["linen","#faf0e6"],["magenta","#ff00ff"],["maroon","#800000"],["mediumaquamarine","#66cdaa"],
  ["mediumblue","#0000cd"],["mediumorchid","#ba55d3"],["mediumpurple","#9370db"],["mediumseagreen","#3cb371"],
  ["mediumslateblue","#7b68ee"],["mediumspringgreen","#00fa9a"],["mediumturquoise","#48d1cc"],["mediumvioletred","#c71585"],
  ["midnightblue","#191970"],["mintcream","#f5fffa"],["mistyrose","#ffe4e1"],["moccasin","#ffe4b5"],
  ["navajowhite","#ffdead"],["navy","#000080"],["oldlace","#fdf5e6"],["olive","#808000"],
  ["olivedrab","#6b8e23"],["orange","#ffa500"],["orangered","#ff4500"],["orchid","#da70d6"],
  ["palegoldenrod","#eee8aa"],["palegreen","#98fb98"],["paleturquoise","#afeeee"],["palevioletred","#db7093"],
  ["papayawhip","#ffefd5"],["peachpuff","#ffdab9"],["peru","#cd853f"],["pink","#ffc0cb"],
  ["plum","#dda0dd"],["powderblue","#b0e0e6"],["purple","#800080"],["rebeccapurple","#663399"],
  ["red","#ff0000"],["rosybrown","#bc8f8f"],["royalblue","#4169e1"],["saddlebrown","#8b4513"],
  ["salmon","#fa8072"],["sandybrown","#f4a460"],["seagreen","#2e8b57"],["seashell","#fff5ee"],
  ["sienna","#a0522d"],["silver","#c0c0c0"],["skyblue","#87ceeb"],["slateblue","#6a5acd"],
  ["slategray","#708090"],["slategrey","#708090"],["snow","#fffafa"],["springgreen","#00ff7f"],
  ["steelblue","#4682b4"],["tan","#d2b48c"],["teal","#008080"],["thistle","#d8bfd8"],
  ["tomato","#ff6347"],["turquoise","#40e0d0"],["violet","#ee82ee"],["wheat","#f5deb3"],
  ["white","#ffffff"],["whitesmoke","#f5f5f5"],["yellow","#ffff00"],["yellowgreen","#9acd32"],
];

type Entry = { name: string; hex: string; r: number; g: number; b: number };

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(m)) return null;
  return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)];
}

const ENTRIES: Entry[] = COLORS.map(([name, hex]) => {
  const rgb = hexToRgb(hex)!;
  return { name, hex, r: rgb[0], g: rgb[1], b: rgb[2] };
});

/** Weighted Euclidean RGB distance (redmean-style approximation). */
function distance(a: [number, number, number], b: Entry): number {
  const dr = a[0] - b.r, dg = a[1] - b.g, db = a[2] - b.b;
  const rm = (a[0] + b.r) / 2 / 255;
  return Math.sqrt((2 + rm) * dr * dr + 4 * dg * dg + (2 + (1 - rm)) * db * db);
}

function ColorNameFinder() {
  const { isPro } = usePlan();
  const trial = useToolTrial("color-name-finder", isPro);
  const seo = getToolSeo("color-name-finder");

  const [hex, setHex] = useState("#e86a8a");
  const [searched, setSearched] = useState<[number, number, number] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const results = useMemo(() => {
    if (!searched) return null;
    return ENTRIES
      .map((e) => ({ ...e, d: distance(searched, e) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 9);
  }, [searched]);

  const best = results?.[0] ?? null;

  const find = () => {
    const rgb = hexToRgb(hex.trim());
    if (!rgb) {
      setError("Enter a valid 6-digit hex like #e86a8a.");
      return;
    }
    if (!trial.canUse) {
      setError(`Free trial used up - ${TOOL_TRIAL_LIMIT} lookups per tool. Go Pro for unlimited.`);
      return;
    }
    setError(null);
    setSearched(rgb);
    trial.recordUse();
    toast.success("Match found");
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
    <ToolPageShell toolId="color-name-finder" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Color Name Finder" left={trial.left} />

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
                placeholder="#e86a8a"
                spellCheck={false}
                className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary"
              />
            </div>
            <div className="mt-3 h-14 w-full rounded-xl border border-border" style={{ background: previewCss }} />
          </div>

          <ActionButton onClick={find} disabled={!trial.canUse}>
            <Tag className="h-4 w-4" /> Find color name
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free lookups left - everything runs on your device.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}

          <p className="text-xs text-muted-foreground">
            Searches all 148 CSS named colors by weighted RGB distance and returns the closest match.
          </p>
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          {!results || !best ? (
            <div className="flex h-full min-h-[280px] flex-col items-center justify-center text-center">
              <Tag className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Pick a color to name it</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                The nearest CSS named color, its hex, and a swatch will appear here.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-muted/30 p-4">
                <div className="h-16 w-16 rounded-xl border border-border" style={{ background: previewCss }} title="Your color" />
                <span className="text-xs font-bold text-muted-foreground">vs</span>
                <div className="h-16 w-16 rounded-xl border border-border" style={{ background: best.hex }} title={best.name} />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">Nearest named color</p>
                  <p className="text-2xl font-bold text-primary">{best.name}</p>
                  <p className="font-mono text-sm text-muted-foreground">{best.hex} - distance {best.d.toFixed(1)}</p>
                </div>
                <div className="ml-auto flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void copy(best.name, "Color name")}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold hover:border-primary/40"
                  >
                    <ClipboardCopy className="h-3.5 w-3.5" /> Copy name
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
                <p className="mb-2 text-[13px] font-medium text-foreground/80">More matches</p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {results.slice(1).map((r) => (
                    <button
                      key={r.name}
                      type="button"
                      onClick={() => void copy(r.name, "Color name")}
                      title="Click to copy name"
                      className={cn(
                        "flex items-center gap-3 rounded-xl border border-border px-3 py-2 text-left transition hover:border-primary/40",
                      )}
                    >
                      <span className="h-8 w-8 shrink-0 rounded-lg border border-border" style={{ background: r.hex }} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold">{r.name}</span>
                        <span className="block font-mono text-xs text-muted-foreground">{r.hex}</span>
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
