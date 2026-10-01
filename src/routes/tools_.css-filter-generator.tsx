// /tools/css-filter-generator - Build CSS filters visually with a sample
// image or upload. 100% client-side; trial use is recorded when the CSS
// is copied.

import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, FileUp } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/css-filter-generator")({
  head: () => {
    const seo = getToolSeoMeta("css-filter-generator");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: FilterTool,
});

const SAMPLE_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#38bdf8"/><stop offset="1" stop-color="#fbbf24"/>
    </linearGradient>
  </defs>
  <rect width="640" height="400" fill="url(#sky)"/>
  <circle cx="500" cy="90" r="60" fill="#fef3c7"/>
  <path d="M0 280 Q160 200 320 270 T640 250 L640 400 L0 400 Z" fill="#166534"/>
  <path d="M0 320 Q200 270 400 320 T640 310 L640 400 L0 400 Z" fill="#14532d"/>
  <rect x="90" y="140" width="120" height="110" fill="#b91c1c"/>
  <polygon points="150,60 200,140 100,140" fill="#b91c1c"/>
  <rect x="100" y="170" width="30" height="30" fill="#fde68a"/>
  <rect x="150" y="170" width="30" height="30" fill="#fde68a"/>
  <ellipse cx="430" cy="330" rx="90" ry="24" fill="#0f172a" opacity="0.25"/>
</svg>`,
)}`;

const DEFAULTS = {
  blur: 0, brightness: 100, contrast: 100, grayscale: 0, hueRotate: 0,
  invert: 0, opacity: 100, saturate: 100, sepia: 0,
  dsX: 0, dsY: 8, dsBlur: 24, dsColor: "#000000", dsOpacity: 60, dropShadow: false,
};

const PRESETS: { name: string; v: Partial<typeof DEFAULTS> }[] = [
  { name: "Normal", v: { ...DEFAULTS } },
  { name: "Vintage", v: { sepia: 55, contrast: 90, brightness: 105, saturate: 80 } },
  { name: "Cold", v: { hueRotate: -20, saturate: 70, brightness: 105, contrast: 105 } },
  { name: "Warm", v: { sepia: 30, saturate: 130, brightness: 102, contrast: 102 } },
  { name: "Noir", v: { grayscale: 100, contrast: 125, brightness: 95 } },
  { name: "X-Ray", v: { invert: 100 } },
  { name: "Fade", v: { opacity: 70, saturate: 60 } },
];

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace(/^#/, "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
}

function FilterTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("css-filter-generator", isPro);
  const seo = getToolSeo("css-filter-generator");

  const [v, setV] = useState({ ...DEFAULTS });
  const [imgSrc, setImgSrc] = useState(SAMPLE_SVG);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof typeof DEFAULTS>(k: K, val: (typeof DEFAULTS)[K]) =>
    setV((p) => ({ ...p, [k]: val }));

  const applyPreset = (p: (typeof PRESETS)[number]) =>
    setV((prev) => ({ ...DEFAULTS, ...p.v, dsColor: prev.dsColor, dropShadow: prev.dropShadow, dsX: prev.dsX, dsY: prev.dsY, dsBlur: prev.dsBlur, dsOpacity: prev.dsOpacity }));

  const filter = useMemo(() => {
    const parts: string[] = [];
    if (v.blur > 0) parts.push(`blur(${v.blur}px)`);
    if (v.brightness !== 100) parts.push(`brightness(${v.brightness}%)`);
    if (v.contrast !== 100) parts.push(`contrast(${v.contrast}%)`);
    if (v.grayscale > 0) parts.push(`grayscale(${v.grayscale}%)`);
    if (v.hueRotate !== 0) parts.push(`hue-rotate(${v.hueRotate}deg)`);
    if (v.invert > 0) parts.push(`invert(${v.invert}%)`);
    if (v.opacity !== 100) parts.push(`opacity(${v.opacity}%)`);
    if (v.saturate !== 100) parts.push(`saturate(${v.saturate}%)`);
    if (v.sepia > 0) parts.push(`sepia(${v.sepia}%)`);
    if (v.dropShadow) parts.push(`drop-shadow(${v.dsX}px ${v.dsY}px ${v.dsBlur}px ${hexToRgba(v.dsColor, v.dsOpacity / 100)})`);
    return parts.length ? parts.join(" ") : "none";
  }, [v]);

  const css = `filter: ${filter};`;

  const copy = async () => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(css);
      setCopied(true);
      trial.recordUse();
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  const acceptFile = (f: File) => {
    if (!f.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    setImgSrc(URL.createObjectURL(f));
  };

  const slider = (
    label: string,
    key: keyof typeof DEFAULTS,
    min: number,
    max: number,
    unit: string,
  ) => (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between text-[13px]">
        <span className="font-medium text-foreground/80">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {v[key]}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={Number(v[key])}
        onChange={(e) => set(key, Number(e.target.value) as never)}
        className="w-full accent-primary"
      />
    </label>
  );

  return (
    <ToolPageShell toolId="css-filter-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="CSS Filter Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-6">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Presets</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:border-primary/60 hover:text-foreground"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {slider("Blur", "blur", 0, 20, "px")}
          {slider("Brightness", "brightness", 0, 200, "%")}
          {slider("Contrast", "contrast", 0, 200, "%")}
          {slider("Grayscale", "grayscale", 0, 100, "%")}
          {slider("Hue rotate", "hueRotate", 0, 360, "deg")}
          {slider("Invert", "invert", 0, 100, "%")}
          {slider("Opacity", "opacity", 0, 100, "%")}
          {slider("Saturate", "saturate", 0, 200, "%")}
          {slider("Sepia", "sepia", 0, 100, "%")}

          <div className="border-t border-border pt-4">
            <label className="mb-3 flex cursor-pointer items-center gap-2.5 text-sm font-medium">
              <input
                type="checkbox"
                checked={v.dropShadow}
                onChange={(e) => set("dropShadow", e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              Drop shadow
            </label>
            {v.dropShadow && (
              <div className="space-y-4">
                {slider("Shadow X", "dsX", -60, 60, "px")}
                {slider("Shadow Y", "dsY", -60, 60, "px")}
                {slider("Shadow blur", "dsBlur", 0, 60, "px")}
                <div>
                  <div className="mb-1.5 text-[13px] font-medium text-foreground/80">Shadow color</div>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={v.dsColor}
                      onChange={(e) => set("dsColor", e.target.value)}
                      aria-label="Shadow color"
                      className="h-11 w-14 cursor-pointer rounded-xl border border-border bg-background p-1"
                    />
                    <span className="font-mono text-sm uppercase">{v.dsColor}</span>
                  </div>
                </div>
                {slider("Shadow opacity", "dsOpacity", 0, 100, "%")}
              </div>
            )}
          </div>

          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left.
            </p>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-8">
            <div className="mb-4 flex items-center gap-3">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-xs font-bold hover:border-primary/60"
              >
                <FileUp className="h-4 w-4" /> Upload image
              </button>
              <button
                type="button"
                onClick={() => setImgSrc(SAMPLE_SVG)}
                className="rounded-xl border border-border px-4 py-2 text-xs font-bold hover:border-primary/60"
              >
                Use sample
              </button>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) acceptFile(f);
                  e.target.value = "";
                }}
              />
            </div>
            <div className="flex justify-center">
              <img
                src={imgSrc}
                alt="Filter preview"
                className="max-h-[420px] rounded-xl shadow-lg"
                style={{ filter }}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">CSS output</p>
            <pre className="overflow-x-auto rounded-xl bg-muted/60 p-4 font-mono text-sm">{css}</pre>
            <button
              type="button"
              onClick={copy}
              disabled={!trial.canUse}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied!" : "Copy CSS"}
            </button>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
