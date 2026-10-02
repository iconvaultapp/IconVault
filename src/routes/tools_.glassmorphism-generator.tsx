// /tools/glassmorphism-generator - Frosted-glass card CSS (backdrop-filter blur,
// translucent background, border, shadow, radius) with a live preview over
// colorful gradient backgrounds. 100% in-browser.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/glassmorphism-generator")({
  head: () => {
    const seo = getToolSeoMeta("glassmorphism-generator");
    const canonical = "https://iconvault.site/tools/glassmorphism-generator";
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
  component: GlassmorphismTool,
});

const BACKGROUNDS = [
  { name: "Sunset", css: "linear-gradient(135deg,#ff9a9e 0%,#fecfef 30%,#a18cd1 60%,#5ee7df 100%)" },
  { name: "Ocean", css: "linear-gradient(135deg,#0f2027 0%,#203a43 50%,#2c5364 100%)" },
  { name: "Candy", css: "linear-gradient(135deg,#f093fb 0%,#f5576c 50%,#ffd166 100%)" },
  { name: "Forest", css: "linear-gradient(135deg,#134e5e 0%,#71b280 100%)" },
] as const;

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function Slider({ label, value, min, max, onChange, suffix }: {
  label: string; value: number; min: number; max: number;
  onChange: (v: number) => void; suffix?: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-[13px] font-medium text-foreground/80">{label}</label>
        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{value}{suffix ?? ""}</span>
      </div>
      <input
        type="range" min={min} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </div>
  );
}

function GlassmorphismTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("glassmorphism-generator", isPro);
  const seo = getToolSeo("glassmorphism-generator");

  const [blur, setBlur] = useState(12);
  const [bgOpacity, setBgOpacity] = useState(25);
  const [borderWidth, setBorderWidth] = useState(1);
  const [borderColor, setBorderColor] = useState("#ffffff");
  const [borderOpacity, setBorderOpacity] = useState(30);
  const [radius, setRadius] = useState(16);
  const [shadowBlur, setShadowBlur] = useState(32);
  const [shadowOpacity, setShadowOpacity] = useState(20);
  const [bgIndex, setBgIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const css = useMemo(() => {
    const lines = [
      `background: ${hexToRgba("#ffffff", bgOpacity / 100)};`,
      `backdrop-filter: blur(${blur}px);`,
      `-webkit-backdrop-filter: blur(${blur}px);`,
      `border-radius: ${radius}px;`,
      borderWidth > 0
        ? `border: ${borderWidth}px solid ${hexToRgba(borderColor, borderOpacity / 100)};`
        : `border: none;`,
      `box-shadow: 0 8px ${shadowBlur}px ${hexToRgba("#000000", shadowOpacity / 100)};`,
    ];
    return lines.join("\n");
  }, [blur, bgOpacity, borderWidth, borderColor, borderOpacity, radius, shadowBlur, shadowOpacity]);

  const cardStyle = useMemo(
    () => ({
      background: hexToRgba("#ffffff", bgOpacity / 100),
      backdropFilter: `blur(${blur}px)`,
      WebkitBackdropFilter: `blur(${blur}px)`,
      borderRadius: radius,
      border: borderWidth > 0 ? `${borderWidth}px solid ${hexToRgba(borderColor, borderOpacity / 100)}` : "none",
      boxShadow: `0 8px ${shadowBlur}px ${hexToRgba("#000000", shadowOpacity / 100)}`,
    }),
    [blur, bgOpacity, borderWidth, borderColor, borderOpacity, radius, shadowBlur, shadowOpacity],
  );

  const copyCss = () => {
    if (!trial.canUse) return;
    void navigator.clipboard.writeText(css).then(() => {
      trial.recordUse();
      setCopied(true);
      toast.success("Glassmorphism CSS copied");
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <ToolPageShell toolId="glassmorphism-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Glassmorphism Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <Slider label="Blur" value={blur} min={0} max={40} onChange={setBlur} suffix="px" />
          <Slider label="Background opacity" value={bgOpacity} min={0} max={100} onChange={setBgOpacity} suffix="%" />
          <Slider label="Border width" value={borderWidth} min={0} max={6} onChange={setBorderWidth} suffix="px" />
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Border color</label>
              <input
                type="color" value={borderColor}
                onChange={(e) => setBorderColor(e.target.value)}
                className="h-9 w-full cursor-pointer rounded-lg border border-border bg-background"
              />
            </div>
            <div className="flex-1">
              <Slider label="Border opacity" value={borderOpacity} min={0} max={100} onChange={setBorderOpacity} suffix="%" />
            </div>
          </div>
          <Slider label="Border radius" value={radius} min={0} max={48} onChange={setRadius} suffix="px" />
          <Slider label="Shadow blur" value={shadowBlur} min={0} max={80} onChange={setShadowBlur} suffix="px" />
          <Slider label="Shadow opacity" value={shadowOpacity} min={0} max={100} onChange={setShadowOpacity} suffix="%" />

          <ActionButton disabled={!trial.canUse} onClick={copyCss}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy CSS"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of 5 free copies left - everything runs in your browser.
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div
            className="relative flex min-h-[380px] items-center justify-center overflow-hidden rounded-2xl p-8 transition-all"
            style={{ background: BACKGROUNDS[bgIndex]?.css ?? "" }}
          >
            <div style={cardStyle} className="w-64 p-6 text-center">
              <p className="text-sm font-bold text-white drop-shadow">Frosted glass card</p>
              <p className="mt-1 text-xs text-white/80 drop-shadow">
                Blur {blur}px, radius {radius}px, border {borderWidth}px
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {BACKGROUNDS.map((b, i) => (
              <button
                key={b.name}
                type="button"
                onClick={() => setBgIndex(i)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition",
                  bgIndex === i ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40",
                )}
              >
                <span className="h-6 w-6 rounded-md" style={{ background: b.css }} />
                {b.name}
              </button>
            ))}
          </div>
          <pre className="overflow-x-auto rounded-2xl border border-border bg-card p-4 font-mono text-[13px] leading-relaxed">{css}</pre>
        </div>
      </div>
    </ToolPageShell>
  );
}
