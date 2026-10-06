// /tools/css-font-size-adjust - X-height normalization with font-size-adjust:
// keep text the same readable size when fallback fonts swap in.
// Free, client-side only. Works in all modern browsers (numeric values).

import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Info, Ruler } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/css-font-size-adjust";
import toolSeoMeta from "@/lib/tool-seo-meta-data/css-font-size-adjust";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/css-font-size-adjust")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/css-font-size-adjust";
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
  component: FontSizeAdjustTool,
});

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
    return true;
  } catch {
    toast.error("Copy failed. Select the code manually.");
    return false;
  }
}

// Approximate x-height ratios (x-height / font-size) for common fonts.
// Displayed as approximate: exact values vary by version and platform.
const FONTS = [
  { name: "Arial", ratio: 0.519 },
  { name: "Verdana", ratio: 0.545 },
  { name: "Georgia", ratio: 0.481 },
  { name: '"Times New Roman"', ratio: 0.448 },
  { name: '"Trebuchet MS"', ratio: 0.521 },
  { name: '"Courier New"', ratio: 0.425 },
  { name: "system-ui", ratio: 0.52 },
] as const;

const SAMPLE = "Pack my box with five dozen liquor jugs. 0123456789";

function FontSizeAdjustTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("css-font-size-adjust", isPro);
  const seo = toolSeo;

  const [supported, setSupported] = useState<boolean | null>(null);
  const [fontA, setFontA] = useState(2); // Georgia
  const [fontB, setFontB] = useState(0); // Arial
  const [size, setSize] = useState(28);
  const [adjust, setAdjust] = useState<number | null>(0.481);
  const [showBars, setShowBars] = useState(true);

  useEffect(() => {
    try {
      setSupported(typeof CSS !== "undefined" && CSS.supports("font-size-adjust: 0.5"));
    } catch {
      setSupported(false);
    }
  }, []);

  const ratioA = FONTS[fontA]?.ratio ?? 0.5;
  const ratioB = FONTS[fontB]?.ratio ?? 0.5;
  const xHeightA = size * ratioA;
  // With font-size-adjust set, the browser forces x-height = adjust * font-size.
  const xHeightB = adjust === null ? size * ratioB : size * adjust;

  const matchAdjust = () => setAdjust(Number(ratioA.toFixed(3)));

  const css = useMemo(() => {
    return [
      "/* Primary font with a webfont that may fail to load */",
      ".headline {",
      `  font-family: ${FONTS[fontA]?.name ?? "Georgia"}, ${FONTS[fontB]?.name ?? "Arial"}, sans-serif;`,
      `  font-size: ${size}px;`,
      adjust === null
        ? "  /* no adjustment: fallback renders at its own x-height */"
        : `  font-size-adjust: ${adjust};   /* x-height forced to ${Math.round(size * adjust)}px, matching ${FONTS[fontA]?.name ?? "the primary"} */`,
      "}",
      "",
      "/* Newer keyword forms (Chrome 127+, Firefox) */",
      ".headline {",
      "  font-size-adjust: from-font;   /* use the primary font's own x-height */",
      "}",
    ].join("\n");
  }, [fontA, fontB, size, adjust]);

  const copy = async () => {
    if (!trial.canUse) return;
    if (await copyText(css)) trial.recordUse();
  };

  return (
    <ToolPageShell toolId="css-font-size-adjust" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="CSS font-size-adjust" left={trial.left} />

      {supported === false && (
        <div className="mb-6 flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">Your browser did not pass the feature check.</span> Numeric
            font-size-adjust works in all modern browsers; the x-height bars below still demonstrate the concept.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Primary font (A)</p>
            <select value={fontA} onChange={(e) => setFontA(Number(e.target.value))} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm">
              {FONTS.map((f, i) => (
                <option key={f.name} value={i}>{f.name.replace(/"/g, "")} (x-height ~{f.ratio})</option>
              ))}
            </select>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Fallback font (B)</p>
            <select value={fontB} onChange={(e) => setFontB(Number(e.target.value))} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm">
              {FONTS.map((f, i) => (
                <option key={f.name} value={i}>{f.name.replace(/"/g, "")} (x-height ~{f.ratio})</option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-1 flex justify-between text-[13px] font-medium text-foreground/80">
              <span>Font size</span>
              <span className="font-mono text-muted-foreground">{size}px</span>
            </div>
            <input type="range" min={16} max={48} value={size} onChange={(e) => setSize(Number(e.target.value))} className="w-full accent-primary" />
          </div>

          <div>
            <div className="mb-1 flex justify-between text-[13px] font-medium text-foreground/80">
              <span>font-size-adjust on B</span>
              <span className="font-mono text-muted-foreground">{adjust === null ? "off" : adjust}</span>
            </div>
            <input
              type="range"
              min={0.35}
              max={0.65}
              step={0.005}
              value={adjust ?? 0.5}
              disabled={adjust === null}
              onChange={(e) => setAdjust(Number(e.target.value))}
              className="w-full accent-primary disabled:opacity-40"
            />
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={matchAdjust}
                className="rounded-lg border border-primary/50 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20"
              >
                Match A ({ratioA.toFixed(3)})
              </button>
              <button
                type="button"
                onClick={() => setAdjust((a) => (a === null ? ratioA : null))}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground hover:border-primary/40"
              >
                {adjust === null ? "Enable" : "Disable"}
              </button>
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 text-sm">
            <input type="checkbox" checked={showBars} onChange={(e) => setShowBars(e.target.checked)} className="h-4 w-4 accent-primary" />
            <span className="flex items-center gap-1.5 font-medium">
              <Ruler className="h-4 w-4" /> Show x-height bars
            </span>
          </label>

          <p className="text-xs leading-relaxed text-muted-foreground">
            Slide the adjust value until the teal x-height bars line up: that is the value that keeps your fallback
            text the same readable size when the primary font fails to load.
          </p>
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          {[
            { label: "A: primary font", font: FONTS[fontA]?.name ?? "Georgia", xh: xHeightA, adj: null as number | null },
            { label: "B: fallback font", font: FONTS[fontB]?.name ?? "Arial", xh: xHeightB, adj: adjust },
          ].map((row) => (
            <div key={row.label} className="rounded-xl border border-border bg-background p-5">
              <p className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <span>{row.label}</span>
                <span className="font-mono normal-case">
                  x-height ~{row.xh.toFixed(1)}px{row.adj !== null ? ` (adjust ${row.adj})` : ""}
                </span>
              </p>
              <div className="flex items-end gap-4">
                <p
                  className="leading-tight"
                  style={{
                    fontFamily: row.font,
                    fontSize: size,
                    ...(row.adj !== null ? { fontSizeAdjust: row.adj } : {}),
                  }}
                >
                  {SAMPLE}
                </p>
                {showBars && (
                  <div className="flex shrink-0 flex-col items-center gap-1">
                    <div className="w-10 rounded-sm bg-teal-500/80" style={{ height: Math.max(2, row.xh) }} title={`x-height ${row.xh.toFixed(1)}px`} />
                    <span className="font-mono text-[10px] text-muted-foreground">x</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div className={cn("rounded-xl border p-4 text-sm", Math.abs(xHeightA - xHeightB) < 1.5 ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-muted/40")}>
            {Math.abs(xHeightA - xHeightB) < 1.5 ? (
              <p><span className="font-bold text-emerald-600">Matched.</span> <span className="text-muted-foreground">The fallback keeps the same x-height, so text will not shrink or jump when fonts swap.</span></p>
            ) : (
              <p className="text-muted-foreground">
                <span className="font-bold text-foreground">x-height differs by {Math.abs(xHeightA - xHeightB).toFixed(1)}px.</span> Without
                adjustment, a font swap changes the perceived size and can cause layout shift (a CLS hit).
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-extrabold">Copy the CSS</h2>
          <ActionButton disabled={!trial.canUse} onClick={copy}>
            <Copy className="h-4 w-4" /> Copy CSS
          </ActionButton>
        </div>
        <pre className="overflow-x-auto whitespace-pre rounded-xl bg-muted/60 p-4 font-mono text-xs leading-relaxed">{css}</pre>
        {!isPro && <p className="mt-2 text-xs text-muted-foreground">{trial.left} of 5 free copies left. Ratios shown are approximate and vary by platform.</p>}
      </div>
    </ToolPageShell>
  );
}
