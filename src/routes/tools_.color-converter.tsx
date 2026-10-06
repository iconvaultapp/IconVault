// /tools/color-converter - Pro-grade color lab: HEX/RGB/HSL/HSV/HWB/CMYK/
// LAB/LCH conversion, harmonies, shades & tints, WCAG contrast, named
// colors, CSS variable export. 100% client-side.

import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Library, Pipette, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/color-converter";
import toolSeoMeta from "@/lib/tool-seo-meta-data/color-converter";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/color-converter")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/color-converter";
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
  component: ColorConverterTool,
});

interface Rgb {
  r: number;
  g: number;
  b: number;
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

// ---------------------------------------------------------------------------
// Conversions
// ---------------------------------------------------------------------------

function hexToRgb(hex: string): Rgb | null {
  const h = hex.trim().replace(/^#/, "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }: Rgb): string {
  const p = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
  return `#${p(r)}${p(g)}${p(b)}`;
}

function rgbToHsl({ r, g, b }: Rgb): { h: number; s: number; l: number } {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  const hn = ((h % 360) + 360) % 360 / 360;
  const sn = clamp(s, 0, 100) / 100;
  const ln = clamp(l, 0, 100) / 100;
  if (sn === 0) {
    const v = Math.round(ln * 255);
    return { r: v, g: v, b: v };
  }
  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
  const p = 2 * ln - q;
  const hue = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return {
    r: Math.round(hue(hn + 1 / 3) * 255),
    g: Math.round(hue(hn) * 255),
    b: Math.round(hue(hn - 1 / 3) * 255),
  };
}

function rgbToHsv({ r, g, b }: Rgb): { h: number; s: number; v: number } {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
    else if (max === gn) h = ((bn - rn) / d + 2) / 6;
    else h = ((rn - gn) / d + 4) / 6;
  }
  return { h: Math.round(h * 360), s: Math.round((max === 0 ? 0 : d / max) * 100), v: Math.round(max * 100) };
}

function hsvToRgb(h: number, s: number, v: number): Rgb {
  const hn = ((h % 360) + 360) % 360 / 60;
  const sn = clamp(s, 0, 100) / 100;
  const vn = clamp(v, 0, 100) / 100;
  const c = vn * sn;
  const x = c * (1 - Math.abs((hn % 2) - 1));
  const m = vn - c;
  let rp = 0, gp = 0, bp = 0;
  if (hn < 1) { rp = c; gp = x; }
  else if (hn < 2) { rp = x; gp = c; }
  else if (hn < 3) { gp = c; bp = x; }
  else if (hn < 4) { gp = x; bp = c; }
  else if (hn < 5) { rp = x; bp = c; }
  else { rp = c; bp = x; }
  return { r: Math.round((rp + m) * 255), g: Math.round((gp + m) * 255), b: Math.round((bp + m) * 255) };
}

function rgbToHwb(c: Rgb): { h: number; w: number; b: number } {
  const { h } = rgbToHsl(c);
  const wn = Math.min(c.r, c.g, c.b) / 255;
  const bn = 1 - Math.max(c.r, c.g, c.b) / 255;
  return { h, w: Math.round(wn * 100), b: Math.round(bn * 100) };
}

function hwbToRgb(h: number, w: number, b: number): Rgb {
  const wn = clamp(w, 0, 100) / 100;
  const bn = clamp(b, 0, 100) / 100;
  const base = hslToRgb(h, 100, 50);
  const mix = (ch: number) => Math.round(ch * (1 - wn - bn) + 255 * wn);
  if (wn + bn >= 1) {
    const g = Math.round((wn / (wn + bn)) * 255);
    return { r: g, g, b: g };
  }
  return { r: mix(base.r), g: mix(base.g), b: mix(base.b) };
}

function rgbToCmyk({ r, g, b }: Rgb): { c: number; m: number; y: number; k: number } {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const k = 1 - Math.max(rn, gn, bn);
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
  const c = ((1 - rn - k) / (1 - k)) * 100;
  const m = ((1 - gn - k) / (1 - k)) * 100;
  const y = ((1 - bn - k) / (1 - k)) * 100;
  return { c: Math.round(c), m: Math.round(m), y: Math.round(y), k: Math.round(k * 100) };
}

function cmykToRgb(c: number, m: number, y: number, k: number): Rgb {
  const cn = clamp(c, 0, 100) / 100, mn = clamp(m, 0, 100) / 100;
  const yn = clamp(y, 0, 100) / 100, kn = clamp(k, 0, 100) / 100;
  return {
    r: Math.round(255 * (1 - cn) * (1 - kn)),
    g: Math.round(255 * (1 - mn) * (1 - kn)),
    b: Math.round(255 * (1 - yn) * (1 - kn)),
  };
}

// sRGB -> CIE LAB (D65)
function rgbToLab({ r, g, b }: Rgb): { l: number; a: number; b: number } {
  const lin = (v: number) => {
    const n = v / 255;
    return n <= 0.04045 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
  };
  const rl = lin(r), gl = lin(g), bl = lin(b);
  let x = (rl * 0.4124 + gl * 0.3576 + bl * 0.1805) / 0.95047;
  let y = rl * 0.2126 + gl * 0.7152 + bl * 0.0722;
  let z = (rl * 0.0193 + gl * 0.1192 + bl * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  x = f(x); y = f(y); z = f(z);
  return {
    l: Math.round((116 * y - 16) * 10) / 10,
    a: Math.round((500 * (x - y)) * 10) / 10,
    b: Math.round((200 * (y - z)) * 10) / 10,
  };
}

function rgbToLch(c: Rgb): { l: number; c: number; h: number } {
  const { l, a, b } = rgbToLab(c);
  const chroma = Math.sqrt(a * a + b * b);
  let h = (Math.atan2(b, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { l: Math.round(l * 10) / 10, c: Math.round(chroma * 10) / 10, h: Math.round(h * 10) / 10 };
}

// ---------------------------------------------------------------------------
// Contrast (WCAG)
// ---------------------------------------------------------------------------

function luminance({ r, g, b }: Rgb): number {
  const lin = (v: number) => {
    const n = v / 255;
    return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrastRatio(a: Rgb, b: Rgb): number {
  const l1 = luminance(a), l2 = luminance(b);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
}

// ---------------------------------------------------------------------------
// Named colors (common CSS set) + nearest match
// ---------------------------------------------------------------------------

const NAMED_COLORS: Array<[string, string]> = [
  ["black", "#000000"], ["white", "#ffffff"], ["red", "#ff0000"], ["lime", "#00ff00"],
  ["blue", "#0000ff"], ["yellow", "#ffff00"], ["cyan", "#00ffff"], ["magenta", "#ff00ff"],
  ["orange", "#ffa500"], ["pink", "#ffc0cb"], ["purple", "#800080"], ["teal", "#008080"],
  ["navy", "#000080"], ["maroon", "#800000"], ["olive", "#808000"], ["gray", "#808080"],
  ["silver", "#c0c0c0"], ["gold", "#ffd700"], ["indigo", "#4b0082"], ["violet", "#ee82ee"],
  ["turquoise", "#40e0d0"], ["coral", "#ff7f50"], ["salmon", "#fa8072"], ["crimson", "#dc143c"],
  ["tomato", "#ff6347"], ["orangered", "#ff4500"], ["darkorange", "#ff8c00"], ["goldenrod", "#daa520"],
  ["khaki", "#f0e68c"], ["lawngreen", "#7cfc00"], ["limegreen", "#32cd32"], ["forestgreen", "#228b22"],
  ["seagreen", "#2e8b57"], ["darkcyan", "#008b8b"], ["deepskyblue", "#00bfff"], ["dodgerblue", "#1e90ff"],
  ["royalblue", "#4169e1"], ["slateblue", "#6a5acd"], ["blueviolet", "#8a2be2"], ["darkviolet", "#9400d3"],
  ["orchid", "#da70d6"], ["hotpink", "#ff69b4"], ["deeppink", "#ff1493"], ["mediumvioletred", "#c71585"],
  ["brown", "#a52a2a"], ["sienna", "#a0522d"], ["chocolate", "#d2691e"], ["peru", "#cd853f"],
  ["tan", "#d2b48c"], ["wheat", "#f5deb3"], ["beige", "#f5f5dc"], ["ivory", "#fffff0"],
  ["snow", "#fffafa"], ["ghostwhite", "#f8f8ff"], ["aliceblue", "#f0f8ff"], ["lavender", "#e6e6fa"],
  ["mistyrose", "#ffe4e1"], ["peachpuff", "#ffdab9"], ["moccasin", "#ffe4b5"], ["papayawhip", "#ffefd5"],
  ["lemonchiffon", "#fffacd"], ["lightyellow", "#ffffe0"], ["honeydew", "#f0fff0"], ["mintcream", "#f5fffa"],
  ["azure", "#f0ffff"], ["lightcyan", "#e0ffff"], ["powderblue", "#b0e0e6"], ["lightblue", "#add8e6"],
  ["lightskyblue", "#87cefa"], ["cornflowerblue", "#6495ed"], ["steelblue", "#4682b4"], ["cadetblue", "#5f9ea0"],
  ["darkslateblue", "#483d8b"], ["midnightblue", "#191970"], ["darkgreen", "#006400"],
  ["darkolivegreen", "#556b2f"], ["olivedrab", "#6b8e23"], ["yellowgreen", "#9acd32"],
  ["greenyellow", "#adff2f"], ["chartreuse", "#7fff00"], ["springgreen", "#00ff7f"],
  ["mediumspringgreen", "#00fa9a"], ["aquamarine", "#7fffd4"], ["mediumaquamarine", "#66cdaa"],
  ["darkseagreen", "#8fbc8f"], ["lightseagreen", "#20b2aa"], ["darkturquoise", "#00ced1"],
  ["mediumturquoise", "#48d1cc"], ["paleturquoise", "#afeeee"], ["lightsteelblue", "#b0c4de"],
  ["lightslategray", "#778899"], ["slategray", "#708090"], ["darkslategray", "#2f4f4f"],
  ["dimgray", "#696969"], ["darkgray", "#a9a9a9"], ["lightgray", "#d3d3d3"], ["gainsboro", "#dcdcdc"],
  ["whitesmoke", "#f5f5f5"], ["floralwhite", "#fffaf0"], ["oldlace", "#fdf5e6"], ["linen", "#faf0e6"],
  ["antiquewhite", "#faebd7"], ["blanchedalmond", "#ffebcd"], ["bisque", "#ffe4c4"], ["navajowhite", "#ffdead"],
];

function nearestNamedColor(c: Rgb): string {
  let best = NAMED_COLORS[0]![0];
  let bestD = Infinity;
  for (const [name, hx] of NAMED_COLORS) {
    const nc = hexToRgb(hx)!;
    const d = (nc.r - c.r) ** 2 + (nc.g - c.g) ** 2 + (nc.b - c.b) ** 2;
    if (d < bestD) {
      bestD = d;
      best = name;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Shades & tints
// ---------------------------------------------------------------------------

function shadeScale(c: Rgb): { shades: Rgb[]; tints: Rgb[] } {
  const mix = (t: Rgb, amt: number): Rgb => ({
    r: Math.round(c.r + (t.r - c.r) * amt),
    g: Math.round(c.g + (t.g - c.g) * amt),
    b: Math.round(c.b + (t.b - c.b) * amt),
  });
  const black = { r: 0, g: 0, b: 0 };
  const white = { r: 255, g: 255, b: 255 };
  return {
    shades: [0.2, 0.4, 0.6, 0.8].map((a) => mix(black, a)),
    tints: [0.2, 0.4, 0.6, 0.8].map((a) => mix(white, a)),
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Color library - coolors.co style browsable collection (1,000+ named colors)
// Loaded lazily from /data/color-library.json; infinite scroll in batches.
// ---------------------------------------------------------------------------

interface LibraryColor {
  n: string;
  h: string;
  f: string;
}

const COLOR_FAMILIES: Array<{ id: string; label: string; dot: string }> = [
  { id: "all", label: "All", dot: "conic-gradient(#f43f5e,#f59e0b,#84cc16,#06b6d4,#3b82f6,#a855f7,#f43f5e)" },
  { id: "red", label: "Red", dot: "#ef4444" },
  { id: "orange", label: "Orange", dot: "#f97316" },
  { id: "brown", label: "Brown", dot: "#92400e" },
  { id: "yellow", label: "Yellow", dot: "#eab308" },
  { id: "green", label: "Green", dot: "#22c55e" },
  { id: "turquoise", label: "Turquoise", dot: "#14b8a6" },
  { id: "blue", label: "Blue", dot: "#3b82f6" },
  { id: "violet", label: "Violet", dot: "#8b5cf6" },
  { id: "pink", label: "Pink", dot: "#ec4899" },
  { id: "white", label: "White", dot: "#ffffff" },
  { id: "gray", label: "Gray", dot: "#9ca3af" },
  { id: "black", label: "Black", dot: "#111111" },
];

const LIBRARY_BATCH = 60;

function ColorLibrary({ onPick }: { onPick: (hex: string) => void }) {
  const [colors, setColors] = useState<LibraryColor[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [family, setFamily] = useState("all");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(LIBRARY_BATCH);
  const sectionRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Lazy-load the dataset when the section nears the viewport.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          fetch("/data/color-library.json")
            .then((r) => {
              if (!r.ok) throw new Error("missing");
              return r.json();
            })
            .then((d: LibraryColor[]) => setColors(d))
            .catch(() => setFailed(true));
        }
      },
      { rootMargin: "500px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const filtered = useMemo(() => {
    if (!colors) return [];
    const q = query.trim().toLowerCase();
    return colors.filter(
      (c) =>
        (family === "all" || c.f === family) &&
        (!q || c.n.toLowerCase().includes(q) || c.h.includes(q)),
    );
  }, [colors, family, query]);

  useEffect(() => {
    setShown(LIBRARY_BATCH);
  }, [family, query]);

  // Infinite scroll - more cards as you keep scrolling.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || shown >= filtered.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown((s) => Math.min(s + LIBRARY_BATCH, filtered.length));
        }
      },
      { rootMargin: "700px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown, filtered.length]);

  return (
    <div ref={sectionRef} className="relative left-1/2 mt-6 w-screen -translate-x-1/2 border-y border-border bg-card py-8">
      <div className="mx-auto w-full max-w-[1440px] px-4">
      <div className="mb-1 flex items-center gap-2">
        <Library className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-extrabold">Color library</h2>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Browse {colors ? colors.length.toLocaleString("en-US") : "1,000+"} named colors -
        tap any card to load it into the converter above.
      </p>

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search colors - try “ocean”, “rose”, “#336699”…"
          spellCheck={false}
          className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary"
        />
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {COLOR_FAMILIES.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFamily(f.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition",
              family === f.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            <span
              className="h-2.5 w-2.5 rounded-full border border-black/20"
              style={{ background: f.dot }}
            />
            {f.label}
          </button>
        ))}
      </div>

      {failed ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Could not load the color library. Check your connection and scroll back here.
        </p>
      ) : !colors ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-24 rounded-xl bg-muted" />
              <div className="mx-0.5 mt-2 h-3 w-2/3 rounded bg-muted" />
              <div className="mx-0.5 mt-1 h-3 w-1/3 rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No colors match “{query}” in {COLOR_FAMILIES.find((f) => f.id === family)?.label}.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {filtered.slice(0, shown).map((c) => (
              <button
                key={`${c.h}-${c.n}`}
                type="button"
                title={`Use ${c.n} (${c.h}) in the converter`}
                onClick={() => onPick(c.h)}
                className="group text-left"
              >
                <span
                  className="block h-24 rounded-xl border border-black/10 shadow-sm transition group-hover:scale-[1.03] group-hover:shadow-md"
                  style={{ backgroundColor: c.h }}
                />
                <span className="mt-1.5 block px-0.5">
                  <span className="block truncate text-sm font-bold leading-tight">{c.n}</span>
                  <span className="block font-mono text-xs uppercase text-muted-foreground">{c.h}</span>
                </span>
              </button>
            ))}
          </div>
          <div ref={sentinelRef} />
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Showing {Math.min(shown, filtered.length)} of {filtered.length} colors
            {shown < filtered.length ? " - keep scrolling for more" : ""}
          </p>
        </>
      )}
      </div>
    </div>
  );
}

function ColorConverterTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("color-converter", isPro);
  const seo = toolSeo;

  const [color, setColor] = useState<Rgb>({ r: 99, g: 102, b: 241 }); // indigo-500
  const [hexInput, setHexInput] = useState(rgbToHex({ r: 99, g: 102, b: 241 }));
  const [copied, setCopied] = useState<string | null>(null);

  const hsl = useMemo(() => rgbToHsl(color), [color]);
  const hsv = useMemo(() => rgbToHsv(color), [color]);
  const hwb = useMemo(() => rgbToHwb(color), [color]);
  const cmyk = useMemo(() => rgbToCmyk(color), [color]);
  const lab = useMemo(() => rgbToLab(color), [color]);
  const lch = useMemo(() => rgbToLch(color), [color]);
  const hex = useMemo(() => rgbToHex(color), [color]);
  const named = useMemo(() => nearestNamedColor(color), [color]);
  const { shades, tints } = useMemo(() => shadeScale(color), [color]);
  const onWhite = useMemo(() => contrastRatio(color, { r: 255, g: 255, b: 255 }), [color]);
  const onBlack = useMemo(() => contrastRatio(color, { r: 0, g: 0, b: 0 }), [color]);

  const applyHex = (raw: string) => {
    setHexInput(raw);
    const parsed = hexToRgb(raw);
    if (parsed) setColor(parsed);
  };

  const applyNamed = (raw: string) => {
    const hit = NAMED_COLORS.find(([n]) => n === raw.trim().toLowerCase());
    if (hit) {
      const parsed = hexToRgb(hit[1])!;
      setColor(parsed);
      setHexInput(hit[1]);
    }
  };

  const copy = async (label: string, value: string) => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      trial.recordUse();
      setTimeout(() => setCopied((c) => (c === label ? null : c)), 1600);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  const numInput = (
    label: string,
    value: number,
    min: number,
    max: number,
    onChange: (n: number) => void,
  ) => (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isFinite(n)) return;
          onChange(clamp(Math.round(n), min, max));
        }}
        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold tabular-nums outline-none focus:border-primary"
      />
    </label>
  );

  const formats: { label: string; value: string }[] = [
    { label: "HEX", value: hex },
    { label: "RGB", value: `rgb(${color.r}, ${color.g}, ${color.b})` },
    { label: "HSL", value: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)` },
    { label: "HSV", value: `hsv(${hsv.h}, ${hsv.s}%, ${hsv.v}%)` },
    { label: "HWB", value: `hwb(${hwb.h}, ${hwb.w}%, ${hwb.b}%)` },
    { label: "CMYK", value: `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)` },
    { label: "LAB", value: `lab(${lab.l}% ${lab.a} ${lab.b})` },
    { label: "LCH", value: `lch(${lch.l}% ${lch.c} ${lch.h})` },
    { label: "Name", value: named },
  ];

  const cssVars = `:root {\n  --color: ${hex};\n  --color-rgb: ${color.r}, ${color.g}, ${color.b};\n  --color-hsl: ${hsl.h}, ${hsl.s}%, ${hsl.l}%;\n}`;

  const swatch = (c: Rgb, key: string, title?: string) => (
    <button
      key={key}
      type="button"
      title={title ?? rgbToHex(c)}
      onClick={() => {
        setColor(c);
        setHexInput(rgbToHex(c));
      }}
      className="aspect-square w-full rounded-lg border border-black/10 transition hover:scale-105"
      style={{ backgroundColor: rgbToHex(c) }}
    />
  );

  const contrastBadge = (ratio: number) => {
    const aa = ratio >= 4.5;
    const aaa = ratio >= 7;
    const largeAA = ratio >= 3;
    return (
      <span className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-black",
        aaa ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
        : aa ? "bg-lime-100 text-lime-700 dark:bg-lime-900/40 dark:text-lime-300"
        : largeAA ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
        : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
      )}>
        {aaa ? "AAA" : aa ? "AA" : largeAA ? "AA large" : "Fail"}
      </span>
    );
  };

  return (
    <ToolPageShell toolId="color-converter" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Color Converter" left={trial.left} />

      <div id="cc-converter" className="grid scroll-mt-24 gap-6 lg:grid-cols-[1fr_360px]">
        {/* Inputs */}
        <div className="space-y-5 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-4">
            <input
              type="color"
              value={hex}
              onChange={(e) => {
                const parsed = hexToRgb(e.target.value);
                if (parsed) {
                  setColor(parsed);
                  setHexInput(e.target.value);
                }
              }}
              aria-label="Pick a color"
              className="h-14 w-20 cursor-pointer rounded-xl border border-border bg-background p-1"
            />
            <div>
              <p className="flex items-center gap-1.5 text-sm font-bold">
                <Pipette className="h-4 w-4 text-muted-foreground" /> Color picker
              </p>
              <p className="text-xs text-muted-foreground">All fields stay in sync as you edit.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">HEX</span>
              <input
                value={hexInput}
                onChange={(e) => applyHex(e.target.value)}
                placeholder="#6366f1"
                spellCheck={false}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Name</span>
              <input
                defaultValue={named}
                key={named}
                onChange={(e) => applyNamed(e.target.value)}
                placeholder="crimson"
                spellCheck={false}
                list="iv-color-names"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary"
              />
              <datalist id="iv-color-names">
                {NAMED_COLORS.map(([n]) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </label>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">RGB</p>
            <div className="grid grid-cols-3 gap-3">
              {numInput("R", color.r, 0, 255, (n) => setColor((c) => ({ ...c, r: n })))}
              {numInput("G", color.g, 0, 255, (n) => setColor((c) => ({ ...c, g: n })))}
              {numInput("B", color.b, 0, 255, (n) => setColor((c) => ({ ...c, b: n })))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">HSL</p>
            <div className="grid grid-cols-3 gap-3">
              {numInput("H", hsl.h, 0, 360, (n) => setColor(hslToRgb(n, hsl.s, hsl.l)))}
              {numInput("S", hsl.s, 0, 100, (n) => setColor(hslToRgb(hsl.h, n, hsl.l)))}
              {numInput("L", hsl.l, 0, 100, (n) => setColor(hslToRgb(hsl.h, hsl.s, n)))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">HSV</p>
            <div className="grid grid-cols-3 gap-3">
              {numInput("H", hsv.h, 0, 360, (n) => setColor(hsvToRgb(n, hsv.s, hsv.v)))}
              {numInput("S", hsv.s, 0, 100, (n) => setColor(hsvToRgb(hsv.h, n, hsv.v)))}
              {numInput("V", hsv.v, 0, 100, (n) => setColor(hsvToRgb(hsv.h, hsv.s, n)))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">CMYK</p>
            <div className="grid grid-cols-4 gap-3">
              {numInput("C", cmyk.c, 0, 100, (n) => setColor(cmykToRgb(n, cmyk.m, cmyk.y, cmyk.k)))}
              {numInput("M", cmyk.m, 0, 100, (n) => setColor(cmykToRgb(cmyk.c, n, cmyk.y, cmyk.k)))}
              {numInput("Y", cmyk.y, 0, 100, (n) => setColor(cmykToRgb(cmyk.c, cmyk.m, n, cmyk.k)))}
              {numInput("K", cmyk.k, 0, 100, (n) => setColor(cmykToRgb(cmyk.c, cmyk.m, cmyk.y, n)))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">HWB</p>
            <div className="grid grid-cols-3 gap-3">
              {numInput("H", hwb.h, 0, 360, (n) => setColor(hwbToRgb(n, hwb.w, hwb.b)))}
              {numInput("W", hwb.w, 0, 100, (n) => setColor(hwbToRgb(hwb.h, n, hwb.b)))}
              {numInput("B", hwb.b, 0, 100, (n) => setColor(hwbToRgb(hwb.h, hwb.w, n)))}
            </div>
          </div>

          {/* Shades & tints */}
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Shades & tints</p>
            <p className="mb-1 text-[11px] font-bold text-muted-foreground">Tints →</p>
            <div className="mb-2 grid grid-cols-4 gap-1.5">
              {[...tints].reverse().map((c, i) => swatch(c, `tint-${i}`))}
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {swatch(color, "base", "Current color")}
              {shades.map((c, i) => swatch(c, `shade-${i}`))}
            </div>
            <p className="mt-1 text-[11px] font-bold text-muted-foreground">← Shades</p>
          </div>

          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left.
            </p>
          )}
        </div>

        {/* Preview + formats + contrast + export */}
        <div className="space-y-5">
          <div
            className="flex h-44 items-end justify-between rounded-2xl border border-border p-5 transition-colors"
            style={{ backgroundColor: hex }}
          >
            <span className="rounded-lg bg-black/50 px-3 py-1.5 font-mono text-lg font-bold text-white">{hex}</span>
            <span className="rounded-lg bg-black/50 px-3 py-1.5 font-mono text-sm font-bold text-white">{named}</span>
          </div>

          <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
            {formats.map((f) => (
              <div key={f.label} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{f.label}</p>
                  <p className="truncate font-mono text-sm font-semibold">{f.value}</p>
                </div>
                <button
                  type="button"
                  onClick={() => copy(f.label, f.value)}
                  disabled={!trial.canUse}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-bold hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {copied === f.label ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied === f.label ? "Copied" : "Copy"}
                </button>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">WCAG contrast</p>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="h-8 w-8 rounded-lg border border-black/10" style={{ backgroundColor: hex }} />
                  <span className="text-sm font-bold">on white</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold tabular-nums">{onWhite}:1</span>
                  {contrastBadge(onWhite)}
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="h-8 w-8 rounded-lg border border-black/10" style={{ backgroundColor: hex }} />
                  <span className="text-sm font-bold">on black</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold tabular-nums">{onBlack}:1</span>
                  {contrastBadge(onBlack)}
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                AA needs 4.5:1 for normal text · full checker lives in the{" "}
                <a href="/tools/contrast-checker" className="font-bold text-primary hover:underline">Contrast Checker</a>.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Export CSS variables</p>
            <pre className="mb-3 overflow-x-auto rounded-xl bg-muted/60 p-3 font-mono text-xs leading-relaxed">{cssVars}</pre>
            <button
              type="button"
              onClick={() => copy("CSS", cssVars)}
              disabled={!trial.canUse}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-xs font-bold hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copied === "CSS" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied === "CSS" ? "Copied" : "Copy CSS variables"}
            </button>
          </div>
        </div>
      </div>

      <ColorLibrary
        onPick={(hexPicked) => {
          const parsed = hexToRgb(hexPicked);
          if (parsed) {
            setColor(parsed);
            setHexInput(hexPicked);
            document.getElementById("cc-converter")?.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }}
      />
    </ToolPageShell>
  );
}
