// /tools/tailwind-converter - Convert Tailwind utilities to plain CSS and back
// using a static utility table. Best-effort, covers common utilities only.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRightLeft, ClipboardCopy, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/tailwind-converter")({
  head: () => {
    const seo = getToolSeoMeta("tailwind-converter");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: TailwindConverter,
});

const SPACING: Record<string, string> = {
  "0": "0", px: "1px", "0.5": "0.125rem", "1": "0.25rem", "1.5": "0.375rem", "2": "0.5rem",
  "2.5": "0.625rem", "3": "0.75rem", "3.5": "0.875rem", "4": "1rem", "5": "1.25rem",
  "6": "1.5rem", "7": "1.75rem", "8": "2rem", "9": "2.25rem", "10": "2.5rem",
  "11": "2.75rem", "12": "3rem", "14": "3.5rem", "16": "4rem", "20": "5rem",
  "24": "6rem", "28": "7rem", "32": "8rem", "36": "9rem", "40": "10rem",
  "44": "11rem", "48": "12rem", "52": "13rem", "56": "14rem", "60": "15rem",
  "64": "16rem", "72": "18rem", "80": "20rem", "96": "24rem",
};
const SPACING_REV = new Map<string, string>(Object.entries(SPACING).map(([k, v]) => [v, k]));

const TEXT_SIZE: Record<string, string> = {
  "text-xs": "0.75rem", "text-sm": "0.875rem", "text-base": "1rem", "text-lg": "1.125rem",
  "text-xl": "1.25rem", "text-2xl": "1.5rem", "text-3xl": "1.875rem", "text-4xl": "2.25rem",
  "text-5xl": "3rem", "text-6xl": "3.75rem", "text-7xl": "4.5rem", "text-8xl": "6rem", "text-9xl": "8rem",
};
const TEXT_SIZE_REV = new Map(Object.entries(TEXT_SIZE).map(([k, v]) => [v, k]));

const FONT_WEIGHT: Record<string, string> = {
  "font-thin": "100", "font-extralight": "200", "font-light": "300", "font-normal": "400",
  "font-medium": "500", "font-semibold": "600", "font-bold": "700", "font-extrabold": "800", "font-black": "900",
};
const FONT_WEIGHT_REV = new Map(Object.entries(FONT_WEIGHT).map(([k, v]) => [v, k]));

const DISPLAY: Record<string, string> = {
  block: "block", "inline-block": "inline-block", inline: "inline", flex: "flex",
  "inline-flex": "inline-flex", table: "table", grid: "grid", "inline-grid": "inline-grid",
  contents: "contents", "list-item": "list-item", hidden: "none",
};

const FLEX_DIR: Record<string, string> = {
  "flex-row": "row", "flex-row-reverse": "row-reverse", "flex-col": "column", "flex-col-reverse": "column-reverse",
};

const ITEMS: Record<string, string> = {
  "items-start": "flex-start", "items-end": "flex-end", "items-center": "center",
  "items-baseline": "baseline", "items-stretch": "stretch",
};

const JUSTIFY: Record<string, string> = {
  "justify-start": "flex-start", "justify-end": "flex-end", "justify-center": "center",
  "justify-between": "space-between", "justify-around": "space-around", "justify-evenly": "space-evenly",
};

const ROUNDED: Record<string, string> = {
  "rounded-none": "0px", rounded: "0.25rem", "rounded-sm": "0.125rem", "rounded-md": "0.375rem",
  "rounded-lg": "0.5rem", "rounded-xl": "0.75rem", "rounded-2xl": "1rem", "rounded-3xl": "1.5rem", "rounded-full": "9999px",
};

const BORDER_W: Record<string, string> = { border: "1px", "border-0": "0px", "border-2": "2px", "border-4": "4px", "border-8": "8px" };

const SHADOW: Record<string, string> = {
  "shadow-sm": "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  shadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
  "shadow-md": "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  "shadow-lg": "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  "shadow-xl": "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
  "shadow-2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)",
  "shadow-none": "0 0 #0000",
};

const ALIGN: Record<string, string> = {
  "text-left": "left", "text-center": "center", "text-right": "right", "text-justify": "justify",
  "text-start": "start", "text-end": "end",
};
const ALIGN_REV = new Map(Object.entries(ALIGN).map(([k, v]) => [v, k]));

/** Compact Tailwind v3 palette (shades 50-950) used by color utilities. */
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
};
const SHADES = ["50","100","200","300","400","500","600","700","800","900","950"];
const COLOR_MAP = new Map<string, string>();
for (const [color, shades] of Object.entries(PALETTE)) {
  shades.forEach((hex, i) => COLOR_MAP.set(`${color}-${SHADES[i]}`, hex));
}
COLOR_MAP.set("black", "#000000");
COLOR_MAP.set("white", "#ffffff");
COLOR_MAP.set("transparent", "transparent");
const HEX_TO_CLASS = new Map<string, string>();
for (const [cls, hex] of COLOR_MAP) if (!HEX_TO_CLASS.has(hex)) HEX_TO_CLASS.set(hex, cls);

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.toLowerCase().replace(/^#/, "");
  if (!/^[0-9a-f]{6}$/.test(m)) return null;
  return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)];
}

function closestColorClass(hex: string): string | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  let best: string | null = null;
  let bestD = Infinity;
  for (const [cls, h] of COLOR_MAP) {
    const c = hexToRgb(h);
    if (!c) continue;
    const d = (rgb[0] - c[0]) ** 2 + (rgb[1] - c[1]) ** 2 + (rgb[2] - c[2]) ** 2;
    if (d < bestD) { bestD = d; best = cls; }
  }
  return bestD < 1200 ? best : null;
}

/** Convert one Tailwind class to CSS declarations. Returns null for unknown. */
function twToCss(cls: string): string[] | null {
  const negative = cls.startsWith("-");
  const body = negative ? cls.slice(1) : cls;
  const neg = (v: string) => (negative && v !== "0" ? `-${v}` : v);

  // spacing: m/p + side + size
  const sp = body.match(/^(m|p)(x|y|t|r|b|l|s|e)?-(.+)$/);
  if (sp) {
    const base = sp[1] === "m" ? "margin" : "padding";
    const side = sp[2] || "";
    const key = sp[3];
    if (!key) return null;
    const val = SPACING[key];
    if (val === undefined) return null;
    const v = neg(val);
    switch (side) {
      case "": return [`${base}: ${v}`];
      case "x": return [`${base}-left: ${v}`, `${base}-right: ${v}`];
      case "y": return [`${base}-top: ${v}`, `${base}-bottom: ${v}`];
      case "t": return [`${base}-top: ${v}`];
      case "r": return [`${base}-right: ${v}`];
      case "b": return [`${base}-bottom: ${v}`];
      case "l": return [`${base}-left: ${v}`];
      case "s": return [`${base}-inline-start: ${v}`];
      case "e": return [`${base}-inline-end: ${v}`];
      default: return null;
    }
  }
  if (body === "space-x-0" || body === "space-y-0") return null;

  // gap
  const gap = body.match(/^gap(-[xy])?-(.+)$/);
  if (gap) {
    const key = gap[2];
    if (!key) return null;
    const val = SPACING[key];
    if (val === undefined) return null;
    const axis = gap[1];
    return axis ? [`${axis === "-x" ? "column-gap" : "row-gap"}: ${val}`] : [`gap: ${val}`];
  }

  // colors
  const col = body.match(/^(text|bg|border|ring|decoration|outline|placeholder)-(.*)$/);
  const colPrefix = col?.[1];
  const colName = col?.[2];
  if (col && colPrefix && colName && COLOR_MAP.has(colName)) {
    const hex = COLOR_MAP.get(colName)!;
    const prop: Record<string, string> = {
      text: "color", bg: "background-color", border: "border-color",
      ring: "--tw-ring-color", decoration: "text-decoration-color",
      outline: "outline-color", placeholder: "color",
    };
    const propName = prop[colPrefix];
    if (!propName) return null;
    return [`${propName}: ${hex}`];
  }

  // text sizes / weights / alignment
  if (TEXT_SIZE[body]) return [`font-size: ${TEXT_SIZE[body]}`];
  if (FONT_WEIGHT[body]) return [`font-weight: ${FONT_WEIGHT[body]}`];
  if (ALIGN[body]) return [`text-align: ${ALIGN[body]}`];
  if (body === "uppercase") return ["text-transform: uppercase"];
  if (body === "lowercase") return ["text-transform: lowercase"];
  if (body === "capitalize") return ["text-transform: capitalize"];
  if (body === "underline") return ["text-decoration-line: underline"];
  if (body === "line-through") return ["text-decoration-line: line-through"];
  if (body === "no-underline") return ["text-decoration-line: none"];
  if (body === "italic") return ["font-style: italic"];
  if (body === "not-italic") return ["font-style: normal"];

  // display / flexbox
  if (DISPLAY[body]) return [`display: ${DISPLAY[body]}`];
  if (FLEX_DIR[body]) return [`flex-direction: ${FLEX_DIR[body]}`];
  if (ITEMS[body]) return [`align-items: ${ITEMS[body]}`];
  if (JUSTIFY[body]) return [`justify-content: ${JUSTIFY[body]}`];
  if (body === "flex-wrap") return ["flex-wrap: wrap"];
  if (body === "flex-nowrap") return ["flex-wrap: nowrap"];
  if (body === "flex-1") return ["flex: 1 1 0%"];
  if (body === "flex-auto") return ["flex: 1 1 auto"];
  if (body === "flex-none") return ["flex: none"];

  // width / height
  const wh = body.match(/^(w|h)-(.+)$/);
  if (wh) {
    const prop = wh[1] === "w" ? "width" : "height";
    const key = wh[2];
    if (!key) return null;
    const spVal = SPACING[key];
    if (spVal) return [`${prop}: ${spVal}`];
    const frac = key.match(/^(\d+)\/(\d+)$/);
    const num = frac?.[1];
    const den = frac?.[2];
    if (frac && num && den) return [`${prop}: ${(parseInt(num, 10) / parseInt(den, 10) * 100).toFixed(4).replace(/\.?0+$/, "")}%`];
    const named: Record<string, string> = {
      auto: "auto", full: "100%", screen: wh[1] === "w" ? "100vw" : "100vh",
      min: "min-content", max: "max-content", fit: "fit-content",
    };
    const namedVal = named[key];
    if (namedVal) return [`${prop}: ${namedVal}`];
    return null;
  }
  if (body === "min-w-full") return ["min-width: 100%"];
  if (body === "max-w-full") return ["max-width: 100%"];

  // rounded / borders / shadow
  if (ROUNDED[body]) return [`border-radius: ${ROUNDED[body]}`];
  if (BORDER_W[body]) return ["border-width: " + BORDER_W[body], "border-style: solid"];
  const bs = body.match(/^border-([trbl])-(0|2|4|8)$/);
  const bsSide = bs?.[1];
  const bsWidth = bs?.[2];
  if (bs && bsSide && bsWidth) {
    const side: Record<string, string> = { t: "top", r: "right", b: "bottom", l: "left" };
    const sideName = side[bsSide];
    const wVal = BORDER_W["border-" + bsWidth];
    if (!sideName || !wVal) return null;
    return [`border-${sideName}-width: ${wVal}`, `border-${sideName}-style: solid`];
  }
  if (SHADOW[body]) return [`box-shadow: ${SHADOW[body]}`];
  if (body === "overflow-hidden") return ["overflow: hidden"];
  if (body === "overflow-auto") return ["overflow: auto"];
  if (body === "overflow-scroll") return ["overflow: scroll"];
  if (body === "relative") return ["position: relative"];
  if (body === "absolute") return ["position: absolute"];
  if (body === "fixed") return ["position: fixed"];
  if (body === "sticky") return ["position: sticky"];

  return null;
}

function tailwindToCss(input: string): { css: string; unknown: string[] } {
  const classes = input.split(/[\s,]+/).map((c) => c.trim()).filter(Boolean);
  const decls: string[] = [];
  const unknown: string[] = [];
  for (const cls of classes) {
    const out = twToCss(cls);
    if (out) decls.push(...out);
    else unknown.push(cls);
  }
  const lines = decls.map((d) => `  ${d};`);
  for (const u of unknown) lines.push(`  /* unknown class skipped: ${u} */`);
  return { css: `.converted {\n${lines.join("\n")}\n}`, unknown };
}

function cssToTailwind(input: string): { classes: string; unknown: string[] } {
  const classes: string[] = [];
  const unknown: string[] = [];
  const decls = input
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/[{}]/g, " ")
    .split(";")
    .map((d) => d.trim())
    .filter(Boolean);
  for (const decl of decls) {
    const [rawProp, ...rest] = decl.split(":");
    const prop = (rawProp || "").trim().toLowerCase();
    const val = rest.join(":").trim().toLowerCase();
    let cls: string | null = null;

    if (prop === "display" && DISPLAY[val]) cls = val;
    else if (prop === "flex-direction") cls = Object.keys(FLEX_DIR).find((k) => FLEX_DIR[k] === val) ?? null;
    else if (prop === "align-items") cls = Object.keys(ITEMS).find((k) => ITEMS[k] === val) ?? null;
    else if (prop === "justify-content") cls = Object.keys(JUSTIFY).find((k) => JUSTIFY[k] === val) ?? null;
    else if (prop === "text-align") cls = ALIGN_REV.get(val) ?? null;
    else if (prop === "font-size") cls = TEXT_SIZE_REV.get(val) ?? null;
    else if (prop === "font-weight") cls = FONT_WEIGHT_REV.get(val) ?? null;
    else if (prop === "gap" || prop === "column-gap" || prop === "row-gap") {
      const k = SPACING_REV.get(val);
      if (k) cls = prop === "gap" ? `gap-${k}` : prop === "column-gap" ? `gap-x-${k}` : `gap-y-${k}`;
    } else if (prop === "color") cls = HEX_TO_CLASS.get(val) ? `text-${HEX_TO_CLASS.get(val)}` : closestColorClass(val) ? `text-${closestColorClass(val)}` : null;
    else if (prop === "background-color") cls = HEX_TO_CLASS.get(val) ? `bg-${HEX_TO_CLASS.get(val)}` : closestColorClass(val) ? `bg-${closestColorClass(val)}` : null;
    else if (prop === "border-color") cls = HEX_TO_CLASS.get(val) ? `border-${HEX_TO_CLASS.get(val)}` : closestColorClass(val) ? `border-${closestColorClass(val)}` : null;
    else if (prop === "border-radius") {
      const k = Object.keys(ROUNDED).find((x) => ROUNDED[x] === val);
      if (k) cls = k;
    } else if (prop === "box-shadow") {
      const k = Object.keys(SHADOW).find((x) => SHADOW[x] === val);
      if (k) cls = k;
    } else {
      const mp = prop.match(/^(margin|padding)(-(top|right|bottom|left|inline-start|inline-end))?$/);
      if (mp) {
        const prefix = mp[1] === "margin" ? "m" : "p";
        const sideMap: Record<string, string> = { top: "t", right: "r", bottom: "b", left: "l", "inline-start": "s", "inline-end": "e" };
        const neg = val.startsWith("-");
        const k = SPACING_REV.get(neg ? val.slice(1) : val);
        const mpSide = mp[3];
        const sideCode = mpSide ? sideMap[mpSide] ?? "" : "";
        if (k) cls = `${neg ? "-" : ""}${prefix}${sideCode}-${k}`;
      } else {
        const wv = prop.match(/^(width|height)$/);
        if (wv) {
          const k = SPACING_REV.get(val);
          const prefix = wv[1] === "width" ? "w" : "h";
          if (k) cls = `${prefix}-${k}`;
          else if (val === "100%") cls = `${prefix}-full`;
          else if (val === "auto") cls = `${prefix}-auto`;
        }
      }
    }

    if (cls) classes.push(cls);
    else unknown.push(decl);
  }
  return { classes: classes.join(" "), unknown };
}

function TailwindConverter() {
  const { isPro } = usePlan();
  const trial = useToolTrial("tailwind-converter", isPro);
  const seo = getToolSeo("tailwind-converter");

  const [mode, setMode] = useState<"tw2css" | "css2tw">("tw2css");
  const [input, setInput] = useState("flex items-center justify-between gap-4 p-6 bg-slate-100 rounded-xl text-sky-600 font-semibold text-lg");
  const [output, setOutput] = useState("");
  const [unknown, setUnknown] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const convert = () => {
    if (!trial.canUse) {
      setError(`Free trial used up - ${TOOL_TRIAL_LIMIT} conversions per tool. Go Pro for unlimited.`);
      return;
    }
    setError(null);
    if (mode === "tw2css") {
      const r = tailwindToCss(input);
      setOutput(r.css);
      setUnknown(r.unknown);
    } else {
      const r = cssToTailwind(input);
      setOutput(r.classes);
      setUnknown(r.unknown);
    }
    trial.recordUse();
    toast.success("Converted");
  };

  const copy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Copy failed - select and copy manually.");
    }
  };

  return (
    <ToolPageShell toolId="tailwind-converter" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Tailwind Converter" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div className="flex gap-2">
            {(["tw2css", "css2tw"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setOutput(""); setUnknown([]); }}
                className={cn(
                  "flex-1 rounded-xl border px-3 py-2.5 text-sm font-bold transition",
                  mode === m ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                {m === "tw2css" ? "Tailwind to CSS" : "CSS to Tailwind"}
              </button>
            ))}
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">
              {mode === "tw2css" ? "Tailwind classes" : "CSS declarations"}
            </p>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={8}
              spellCheck={false}
              placeholder={mode === "tw2css" ? "flex items-center gap-4 p-6 ..." : "display: flex;\nalign-items: center;\ngap: 1rem;"}
              className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary"
            />
          </div>

          <div className="flex gap-2">
            <ActionButton onClick={convert} disabled={!trial.canUse}>
              <RefreshCcw className="h-4 w-4" /> Convert
            </ActionButton>
            <button
              type="button"
              onClick={() => { setMode((m) => (m === "tw2css" ? "css2tw" : "tw2css")); setInput(output || ""); setOutput(""); setUnknown([]); }}
              title="Swap direction"
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-bold text-muted-foreground transition hover:border-primary/40"
            >
              <ArrowRightLeft className="h-4 w-4" /> Swap
            </button>
          </div>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free conversions left - runs fully on your device.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Honest note: this covers common utilities only (spacing, colors, flex, text sizes, widths, borders, shadows). Arbitrary values like text-[#123456] or grid-cols-[1fr_2fr] are not supported.
          </p>
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-foreground/80">
              {mode === "tw2css" ? "Plain CSS" : "Tailwind classes"}
            </p>
            {output && (
              <button
                type="button"
                onClick={copy}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold hover:border-primary/40"
              >
                <ClipboardCopy className="h-3.5 w-3.5" /> Copy
              </button>
            )}
          </div>
          {!output ? (
            <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-dashed border-border text-center">
              <p className="max-w-xs text-sm text-muted-foreground">
                {mode === "tw2css"
                  ? "Paste Tailwind classes and hit Convert to get plain CSS."
                  : "Paste CSS declarations and hit Convert to get Tailwind classes (best-effort)."}
              </p>
            </div>
          ) : (
            <>
              <pre className="max-h-[420px] overflow-auto rounded-xl bg-muted/40 p-4 font-mono text-[13px] leading-relaxed">{output}</pre>
              {unknown.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Skipped {unknown.length} unsupported item{unknown.length > 1 ? "s" : ""}: {unknown.slice(0, 6).join(", ")}{unknown.length > 6 ? "..." : ""}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
