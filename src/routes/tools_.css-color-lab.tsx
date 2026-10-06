// /tools/css-color-lab - Modern CSS color playground: color-mix(),
// oklch conversion, relative colors, gamut mapping and palettes.
// Real math in JS, 100% client-side.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Pipette } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/css-color-lab";
import toolSeoMeta from "@/lib/tool-seo-meta-data/css-color-lab";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/css-color-lab")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/css-color-lab";
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
  component: CssColorLab,
});

// ---------- color math ----------

function hexToRgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
}

function rgbToHex(r: number, g: number, b: number): string {
  const t = (x: number) => Math.round(Math.min(1, Math.max(0, x)) * 255).toString(16).padStart(2, "0");
  return `#${t(r)}${t(g)}${t(b)}`.toUpperCase();
}

function toLinear(c: number) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function toSrgb(c: number) {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

function rgbToOklab(r: number, g: number, b: number): [number, number, number] {
  const R = toLinear(r);
  const G = toLinear(g);
  const B = toLinear(b);
  const l = 0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B;
  const m = 0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B;
  const s = 0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B;
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);
  return [
    0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  ];
}

function oklabToRgb(L: number, a: number, b: number): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  return [
    toSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    toSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    toSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

function rgbToOklch(r: number, g: number, b: number): [number, number, number] {
  const [L, a, bb] = rgbToOklab(r, g, b);
  const C = Math.hypot(a, bb);
  let H = (Math.atan2(bb, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return [L, C, H];
}

function oklchToRgb(L: number, C: number, H: number): [number, number, number] {
  const rad = (H * Math.PI) / 180;
  return oklabToRgb(L, C * Math.cos(rad), C * Math.sin(rad));
}

function inSrgbGamut(r: number, g: number, b: number) {
  const e = 0.001;
  return r >= -e && r <= 1 + e && g >= -e && g <= 1 + e && b >= -e && b <= 1 + e;
}

/** Linear sRGB -> display-p3 (encoded, 0..1). */
function linearSrgbToP3(r: number, g: number, b: number): [number, number, number] {
  const X = 0.4123907993 * r + 0.3575843394 * g + 0.1804807884 * b;
  const Y = 0.2126390059 * r + 0.7151686788 * g + 0.0721923154 * b;
  const Z = 0.0193308187 * r + 0.1191947798 * g + 0.9505321522 * b;
  const R = 2.4934969119 * X - 0.9313836179 * Y - 0.4027107845 * Z;
  const G = -0.8294889696 * X + 1.7626640603 * Y + 0.0236246858 * Z;
  const B = 0.0358458302 * X - 0.0761723893 * Y + 0.956884524 * Z;
  return [toSrgb(R), toSrgb(G), toSrgb(B)];
}

function oklchToLinearSrgb(L: number, C: number, H: number): [number, number, number] {
  const rad = (H * Math.PI) / 180;
  const a = C * Math.cos(rad);
  const b = C * Math.sin(rad);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

function mixSrgb(a: string, b: string, p: number): string {
  const [r1, g1, bl1] = hexToRgb(a);
  const [r2, g2, bl2] = hexToRgb(b);
  const L1 = [toLinear(r1), toLinear(g1), toLinear(bl1)];
  const L2 = [toLinear(r2), toLinear(g2), toLinear(bl2)];
  const m = L1.map((v, i) => toSrgb(v * p + (L2[i] ?? 0) * (1 - p)));
  return rgbToHex(m[0] ?? 0, m[1] ?? 0, m[2] ?? 0);
}

const fmt = (n: number, d = 3) => (Math.round(n * 10 ** d) / 10 ** d).toFixed(d);

// ---------- UI ----------

const TABS = [
  { key: "mix", label: "color-mix()" },
  { key: "oklch", label: "oklch" },
  { key: "relative", label: "Relative colors" },
  { key: "gamut", label: "Gamut mapping" },
  { key: "palette", label: "Palettes" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function ColorInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">{label}</label>
      <div className="flex gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-border bg-background p-1"
        />
        <input
          value={value}
          spellCheck={false}
          onChange={(e) => {
            const v = e.target.value.trim().toUpperCase();
            if (/^#[0-9A-F]{6}$/.test(v)) onChange(v);
          }}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm uppercase"
        />
      </div>
    </div>
  );
}

function Range({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[13px] font-medium text-foreground/80">{label}</span>
        <span className="text-[13px] font-bold tabular-nums">
          {value}
          {unit}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-primary" />
    </div>
  );
}

function Swatch({ hex, label, css }: { hex: string; label?: string; css?: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="h-20" style={{ background: css ?? hex }} />
      <div className="px-2.5 py-2">
        <p className="font-mono text-xs font-bold">{hex}</p>
        {label && <p className="text-[11px] text-muted-foreground">{label}</p>}
      </div>
    </div>
  );
}

function CssColorLab() {
  const { isPro } = usePlan();
  const trial = useToolTrial("css-color-lab", isPro);
  const seo = toolSeo;

  const [tab, setTab] = useState<TabKey>("mix");

  // mix tab
  const [mixA, setMixA] = useState("#0D9488");
  const [mixB, setMixB] = useState("#F59E0B");
  const [mixP, setMixP] = useState(50);

  // oklch tab
  const [okHex, setOkHex] = useState("#8B5CF6");
  const [okL, setOkL] = useState(0.65);
  const [okC, setOkC] = useState(0.15);
  const [okH, setOkH] = useState(290);

  // relative tab
  const [relBase, setRelBase] = useState("#0D9488");
  const [relL, setRelL] = useState(0.05);
  const [relC, setRelC] = useState(1.3);
  const [relH, setRelH] = useState(30);

  // gamut tab
  const [gL, setGL] = useState(0.7);
  const [gC, setGC] = useState(0.25);
  const [gH, setGH] = useState(150);

  // palette tab
  const [palBase, setPalBase] = useState("#0D9488");

  const mix = useMemo(() => {
    const hex = mixSrgb(mixA, mixB, mixP / 100);
    return { hex, css: `color-mix(in srgb, ${mixA} ${mixP}%, ${mixB})` };
  }, [mixA, mixB, mixP]);

  const okFromHex = useMemo(() => {
    const [r, g, b] = hexToRgb(okHex);
    const [L, C, H] = rgbToOklch(r, g, b);
    return { L, C, H };
  }, [okHex]);

  const okFromSliders = useMemo(() => {
    const [r, g, b] = oklchToRgb(okL, okC, okH);
    const gamut = inSrgbGamut(r, g, b);
    return { hex: rgbToHex(r, g, b), css: `oklch(${fmt(okL)} ${fmt(okC)} ${fmt(okH)})`, gamut };
  }, [okL, okC, okH]);

  const relative = useMemo(() => {
    const [r, g, b] = hexToRgb(relBase);
    const [L, C, H] = rgbToOklch(r, g, b);
    const nL = Math.min(1, Math.max(0, L + relL));
    const nC = Math.max(0, C * relC);
    const nH = ((H + relH) % 360 + 360) % 360;
    const [rr, gg, bb] = oklchToRgb(nL, nC, nH);
    const css =
      `oklch(from ${relBase} calc(l ${relL >= 0 ? "+" : "-"} ${fmt(Math.abs(relL))}) ` +
      `calc(c * ${fmt(relC, 2)}) calc(h ${relH >= 0 ? "+" : "-"} ${Math.abs(relH)}))`;
    return { hex: rgbToHex(rr, gg, bb), css, gamut: inSrgbGamut(rr, gg, bb) };
  }, [relBase, relL, relC, relH]);

  const gamut = useMemo(() => {
    const lin = oklchToLinearSrgb(gL, gC, gH);
    const srgb = lin.map(toSrgb) as [number, number, number];
    const inGamut = inSrgbGamut(srgb[0], srgb[1], srgb[2]);
    const p3 = linearSrgbToP3(lin[0], lin[1], lin[2]);
    const p3Css = `color(display-p3 ${fmt(p3[0], 4)} ${fmt(p3[1], 4)} ${fmt(p3[2], 4)})`;
    return {
      inGamut,
      mapped: rgbToHex(srgb[0], srgb[1], srgb[2]),
      p3Css,
      oklch: `oklch(${fmt(gL)} ${fmt(gC)} ${fmt(gH)})`,
    };
  }, [gL, gC, gH]);

  const palette = useMemo(() => {
    const [r, g, b] = hexToRgb(palBase);
    const [L, C, H] = rgbToOklch(r, g, b);
    const ramp = [0.95, 0.8, 0.65, 0.5, 0.35].map((l) => {
      const [rr, gg, bb] = oklchToRgb(l, C, H);
      return rgbToHex(rr, gg, bb);
    });
    const analog = [-30, 0, 30].map((dh) => {
      const [rr, gg, bb] = oklchToRgb(L, C, ((H + dh) % 360 + 360) % 360);
      return rgbToHex(rr, gg, bb);
    });
    return { ramp, analog };
  }, [palBase]);

  const outputCss = useMemo(() => {
    switch (tab) {
      case "mix":
        return `background: ${mix.css}; /* = ${mix.hex} */`;
      case "oklch":
        return `color: ${okFromSliders.css}; /* = ${okFromSliders.hex} */`;
      case "relative":
        return `color: ${relative.css}; /* = ${relative.hex} */`;
      case "gamut":
        return `/* intended: ${gamut.oklch} */\ncolor: ${gamut.p3Css}; /* wide gamut */\ncolor: ${gamut.mapped}; /* sRGB fallback */`;
      case "palette":
        return `:root {\n${palette.ramp.map((h, i) => `  --tone-${i + 1}: ${h};`).join("\n")}\n}`;
    }
  }, [tab, mix, okFromSliders, relative, gamut, palette]);

  const copyCss = async () => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(outputCss);
      trial.recordUse();
      toast.success("CSS copied");
    } catch {
      toast.error("Could not access the clipboard.");
    }
  };

  return (
    <ToolPageShell toolId="css-color-lab" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="CSS Color Lab" left={trial.left} />

      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-xs font-bold transition",
              tab === t.key
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/40",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          {tab === "mix" && (
            <>
              <ColorInput label="Color A" value={mixA} onChange={setMixA} />
              <ColorInput label="Color B" value={mixB} onChange={setMixB} />
              <Range label="Mix amount (A)" value={mixP} min={0} max={100} step={1} unit="%" onChange={setMixP} />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Browsers mix in a perceptual space. This preview mixes in linear sRGB, which is very close.
              </p>
            </>
          )}

          {tab === "oklch" && (
            <>
              <ColorInput label="Convert from hex" value={okHex} onChange={setOkHex} />
              <div className="rounded-xl bg-background p-3 font-mono text-xs">
                oklch({fmt(okFromHex.L)} {fmt(okFromHex.C)} {fmt(okFromHex.H, 1)})
              </div>
              <div className="border-t border-border pt-4">
                <p className="mb-3 text-[13px] font-bold">Build from sliders</p>
                <div className="space-y-4">
                  <Range label="Lightness" value={okL} min={0} max={1} step={0.01} unit="" onChange={setOkL} />
                  <Range label="Chroma" value={okC} min={0} max={0.4} step={0.005} unit="" onChange={setOkC} />
                  <Range label="Hue" value={okH} min={0} max={360} step={1} unit="°" onChange={setOkH} />
                </div>
                {!okFromSliders.gamut && (
                  <p className="mt-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
                    Outside sRGB gamut. Browsers clip it; use the Gamut tab to map it.
                  </p>
                )}
              </div>
            </>
          )}

          {tab === "relative" && (
            <>
              <ColorInput label="Base color" value={relBase} onChange={setRelBase} />
              <Range label="Lightness shift" value={relL} min={-0.5} max={0.5} step={0.01} unit="" onChange={setRelL} />
              <Range label="Chroma scale" value={relC} min={0} max={2.5} step={0.05} unit="x" onChange={setRelC} />
              <Range label="Hue rotate" value={relH} min={-180} max={180} step={1} unit="°" onChange={setRelH} />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Relative color syntax derives a new color from an existing one, perfect for hover states and
                design tokens.
              </p>
            </>
          )}

          {tab === "gamut" && (
            <>
              <Range label="Lightness" value={gL} min={0} max={1} step={0.01} unit="" onChange={setGL} />
              <Range label="Chroma" value={gC} min={0} max={0.4} step={0.005} unit="" onChange={setGC} />
              <Range label="Hue" value={gH} min={0} max={360} step={1} unit="°" onChange={setGH} />
              <p className="text-xs leading-relaxed text-muted-foreground">
                High chroma oklch colors often fall outside sRGB. The lab shows the wide-gamut display-p3
                rendering next to the clipped sRGB fallback.
              </p>
            </>
          )}

          {tab === "palette" && (
            <>
              <ColorInput label="Base color" value={palBase} onChange={setPalBase} />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Ramps step through oklch lightness so every tone is perceptually even, unlike naive
                white/black mixing.
              </p>
            </>
          )}

          <ActionButton disabled={!trial.canUse} onClick={copyCss}>
            <Copy className="h-4 w-4" /> Copy CSS output
          </ActionButton>
        </div>

        <div className="space-y-5">
          {tab === "mix" && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="grid grid-cols-3 gap-3">
                <Swatch hex={mixA} label="Color A" />
                <Swatch hex={mixB} label="Color B" />
                <Swatch hex={mix.hex} label={`${mixP}% A`} />
              </div>
              <div className="mt-4 h-16 rounded-xl border border-border" style={{ background: mix.css }} />
            </div>
          )}

          {tab === "oklch" && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="mb-3 text-sm font-bold">Slider-built color</p>
              <Swatch hex={okFromSliders.hex} label={okFromSliders.css} css={okFromSliders.css} />
              <p className="mt-3 text-xs text-muted-foreground">
                oklch is perceptually uniform: the same lightness number looks equally bright in any hue.
              </p>
            </div>
          )}

          {tab === "relative" && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="grid grid-cols-2 gap-3">
                <Swatch hex={relBase} label="Base" />
                <Swatch hex={relative.hex} label="Derived" css={relative.css} />
              </div>
            </div>
          )}

          {tab === "gamut" && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-3 flex items-center gap-2">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-bold",
                    gamut.inGamut
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                  )}
                >
                  {gamut.inGamut ? "Inside sRGB gamut" : "Outside sRGB gamut"}
                </span>
                <span className="font-mono text-xs text-muted-foreground">{gamut.oklch}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Swatch hex={gamut.mapped} label="sRGB fallback (clipped)" />
                <Swatch hex={gamut.mapped} label="display-p3 rendering" css={gamut.p3Css} />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                On wide-gamut screens the display-p3 swatch shows more vivid color; elsewhere it falls back
                gracefully to the clipped sRGB value.
              </p>
            </div>
          )}

          {tab === "palette" && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-border bg-card p-5">
                <p className="mb-3 text-sm font-bold">Perceptual lightness ramp</p>
                <div className="grid grid-cols-5 gap-2">
                  {palette.ramp.map((h, i) => (
                    <Swatch key={h + i} hex={h} label={`--tone-${i + 1}`} />
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5">
                <p className="mb-3 text-sm font-bold">Analogous hues</p>
                <div className="grid grid-cols-3 gap-3">
                  {palette.analog.map((h, i) => (
                    <Swatch key={h + i} hex={h} label={["-30°", "base", "+30°"][i] ?? ""} />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 flex items-center gap-2 text-sm font-bold">
              <Pipette className="h-4 w-4" /> CSS output
            </p>
            <pre className="overflow-auto rounded-xl bg-zinc-950 p-4 font-mono text-xs leading-relaxed text-zinc-200">
              {outputCss}
            </pre>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
