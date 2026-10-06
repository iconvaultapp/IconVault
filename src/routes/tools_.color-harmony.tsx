// /tools/color-harmony - Pick a base color, generate a harmony palette
// (complementary, triadic, analogous...), click any swatch to copy its HEX,
// and export CSS variables. 100% client-side; trial use is recorded on export.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Palette } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/color-harmony";
import toolSeoMeta from "@/lib/tool-seo-meta-data/color-harmony";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/color-harmony")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/color-harmony";
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
  component: ColorHarmonyTool,
});

const HARMONIES = [
  { id: "complementary", name: "Complementary", desc: "Two colors opposite on the wheel. High contrast, bold pairs." },
  { id: "analogous", name: "Analogous", desc: "Neighbors on the wheel. Calm, cohesive, natural." },
  { id: "triadic", name: "Triadic", desc: "Three evenly spaced hues. Vibrant but balanced." },
  { id: "tetradic", name: "Tetradic", desc: "Two complementary pairs. Rich; let one hue dominate." },
  { id: "split-complementary", name: "Split complementary", desc: "A hue plus the two beside its opposite. Contrast without tension." },
  { id: "monochromatic", name: "Monochromatic", desc: "One hue at five lightness levels. Elegant and safe." },
  { id: "shades", name: "Shades", desc: "One hue from near-black to near-white. Perfect for scales." },
] as const;
type HarmonyId = (typeof HARMONIES)[number]["id"];

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

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

function harmonyColors(baseHex: string, id: HarmonyId): string[] {
  const [h, s, l] = rgbToHsl(...hexToRgb(baseHex));
  const at = (hh: number, ss = s, ll = l) => {
    const norm = ((hh % 360) + 360) % 360;
    const [r, g, b] = hslToRgb(norm, Math.min(100, Math.max(0, ss)), Math.min(100, Math.max(0, ll)));
    return rgbToHex(r, g, b);
  };
  switch (id) {
    case "complementary": return [baseHex.toUpperCase(), at(h + 180)];
    case "analogous": return [at(h - 30), baseHex.toUpperCase(), at(h + 30)];
    case "triadic": return [baseHex.toUpperCase(), at(h + 120), at(h + 240)];
    case "tetradic": return [baseHex.toUpperCase(), at(h + 90), at(h + 180), at(h + 270)];
    case "split-complementary": return [baseHex.toUpperCase(), at(h + 150), at(h + 210)];
    case "monochromatic": return [at(h, s, l - 30), at(h, s, l - 15), baseHex.toUpperCase(), at(h, s, l + 15), at(h, s, l + 30)];
    case "shades": return [12, 28, 44, 60, 76, 90].map((ll) => at(h, s, ll));
  }
}

function ColorHarmonyTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("color-harmony", isPro);
  const seo = toolSeo;

  const [base, setBase] = useState("#0F766E");
  const [harmony, setHarmony] = useState<HarmonyId>("complementary");
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [copiedExport, setCopiedExport] = useState(false);

  const palette = useMemo(() => harmonyColors(base, harmony), [base, harmony]);
  const harmonyInfo = HARMONIES.find((x) => x.id === harmony)!;
  const [baseH] = useMemo(() => rgbToHsl(...hexToRgb(base)), [base]);

  const cssVars = useMemo(
    () =>
      `:root {\n${palette.map((c, i) => `  --harmony-${i + 1}: ${c};`).join("\n")}\n}`,
    [palette],
  );

  const copyHex = async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopiedHex(hex);
      toast.success(`${hex} copied`);
      setTimeout(() => setCopiedHex(null), 1400);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  const copyExport = async () => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(cssVars);
      setCopiedExport(true);
      trial.recordUse();
      toast.success("CSS variables copied");
      setTimeout(() => setCopiedExport(false), 1600);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  return (
    <ToolPageShell toolId="color-harmony" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Color Harmony" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-1.5 text-[13px] font-medium text-foreground/80">Base color</p>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={base}
                onChange={(e) => setBase(e.target.value)}
                aria-label="Base color"
                className="h-12 w-16 cursor-pointer rounded-xl border border-border bg-background p-1"
              />
              <input
                value={base}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/^#[0-9a-fA-F]{6}$/.test(v)) setBase(v.toUpperCase());
                }}
                spellCheck={false}
                className="w-28 rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm uppercase focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Harmony rule</p>
            <div className="space-y-2">
              {HARMONIES.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setHarmony(h.id)}
                  className={cn(
                    "w-full rounded-xl border px-3 py-2.5 text-left transition",
                    harmony === h.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  <span className={cn("block text-xs font-bold", harmony === h.id ? "text-primary" : "")}>
                    {h.name}
                  </span>
                  <span className="block text-[11px] leading-snug text-muted-foreground">{h.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free exports left.
            </p>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold">{harmonyInfo.name} palette</h2>
              <span className="ml-auto text-xs text-muted-foreground">Click a swatch to copy its HEX</span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {palette.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => copyHex(c)}
                  className="group overflow-hidden rounded-xl border border-border text-left transition hover:scale-[1.02]"
                >
                  <div className="flex h-24 items-end p-2" style={{ background: c }}>
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 font-mono text-[11px] font-bold opacity-0 transition group-hover:opacity-100",
                        copiedHex === c ? "bg-black/60 text-white opacity-100" : "bg-black/40 text-white",
                      )}
                    >
                      {copiedHex === c ? "Copied" : "Copy"}
                    </span>
                  </div>
                  <div className="bg-card px-3 py-2">
                    <p className="font-mono text-xs font-bold">{c}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-5 flex items-center gap-5">
              <div
                className="relative h-28 w-28 shrink-0 rounded-full"
                style={{
                  background: "conic-gradient(#f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
                }}
                aria-label="Color wheel with harmony markers"
              >
                {palette.map((c) => {
                  const [ph] = rgbToHsl(...hexToRgb(c));
                  const angle = ((ph - 90) * Math.PI) / 180;
                  return (
                    <span
                      key={c}
                      title={c}
                      className="absolute h-4 w-4 rounded-full border-2 border-white shadow"
                      style={{
                        background: c,
                        left: `calc(50% + ${Math.cos(angle) * 38}% - 8px)`,
                        top: `calc(50% + ${Math.sin(angle) * 38}% - 8px)`,
                      }}
                    />
                  );
                })}
                <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow" />
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                The markers show where each palette hue sits on the color wheel, starting from your
                base hue of {baseH} degrees. {harmonyInfo.desc}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold">Export CSS variables</h2>
              <button
                type="button"
                onClick={copyExport}
                disabled={!trial.canUse}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {copiedExport ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedExport ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="overflow-x-auto rounded-xl bg-muted/60 p-4 font-mono text-xs leading-relaxed">
              {cssVars}
            </pre>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
