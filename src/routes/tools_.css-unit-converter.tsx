// /tools/css-unit-converter - Convert between px, rem, em, %, vw, vh and pt
// with a configurable base font size and viewport. Live conversion table with
// per-row copy. 100% in-browser.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRightLeft, Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/css-unit-converter")({
  head: () => {
    const seo = getToolSeoMeta("css-unit-converter");
    const canonical = "https://iconvault.site/tools/css-unit-converter";
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
  component: UnitConverterTool,
});

type Unit = "px" | "rem" | "em" | "%" | "vw" | "vh" | "pt";

const UNITS: { id: Unit; note: string }[] = [
  { id: "px", note: "Absolute pixels" },
  { id: "rem", note: "Relative to root font size" },
  { id: "em", note: "Relative to parent font size" },
  { id: "%", note: "% of base font size" },
  { id: "vw", note: "% of viewport width" },
  { id: "vh", note: "% of viewport height" },
  { id: "pt", note: "Points, 1in = 72pt = 96px" },
];

const round2 = (n: number) => {
  const r = Math.round(n * 100) / 100;
  return Number.isFinite(r) ? String(r) : "-";
};

function UnitConverterTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("css-unit-converter", isPro);
  const seo = getToolSeo("css-unit-converter");

  const [value, setValue] = useState("16");
  const [fromUnit, setFromUnit] = useState<Unit>("px");
  const [baseFont, setBaseFont] = useState(16);
  const [vpW, setVpW] = useState(1920);
  const [vpH, setVpH] = useState(1080);
  const [copiedRow, setCopiedRow] = useState<string | null>(null);

  const px = useMemo(() => {
    const v = parseFloat(value);
    if (!Number.isFinite(v)) return NaN;
    const safeFont = baseFont > 0 ? baseFont : 16;
    const safeW = vpW > 0 ? vpW : 1920;
    const safeH = vpH > 0 ? vpH : 1080;
    switch (fromUnit) {
      case "px": return v;
      case "rem": return v * safeFont;
      case "em": return v * safeFont;
      case "%": return (v / 100) * safeFont;
      case "vw": return (v / 100) * safeW;
      case "vh": return (v / 100) * safeH;
      case "pt": return v * (96 / 72);
    }
  }, [value, fromUnit, baseFont, vpW, vpH]);

  const rows = useMemo(() => {
    if (!Number.isFinite(px)) return [];
    const safeFont = baseFont > 0 ? baseFont : 16;
    const safeW = vpW > 0 ? vpW : 1920;
    const safeH = vpH > 0 ? vpH : 1080;
    const vals: Record<Unit, number> = {
      px,
      rem: px / safeFont,
      em: px / safeFont,
      "%": (px / safeFont) * 100,
      vw: (px / safeW) * 100,
      vh: (px / safeH) * 100,
      pt: px * (72 / 96),
    };
    return UNITS.map((u) => ({ ...u, display: `${round2(vals[u.id])}${u.id}`, value: vals[u.id] }));
  }, [px, baseFont, vpW, vpH]);

  const copyRow = (unit: Unit, display: string) => {
    if (!trial.canUse) return;
    void navigator.clipboard.writeText(display).then(() => {
      trial.recordUse();
      setCopiedRow(unit);
      toast.success(`Copied ${display}`);
      setTimeout(() => setCopiedRow(null), 1200);
    });
  };

  const numInput = (v: number, set: (n: number) => void) => (
    <input
      value={v}
      inputMode="decimal"
      onChange={(e) => {
        const n = parseFloat(e.target.value);
        set(Number.isFinite(n) && n > 0 ? n : 0);
      }}
      className="w-full rounded-lg border border-border bg-background px-2 py-1.5 font-mono text-sm outline-none"
    />
  );

  return (
    <ToolPageShell toolId="css-unit-converter" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="CSS Unit Converter" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Value</label>
            <div className="flex gap-2">
              <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                inputMode="decimal"
                className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary"
              />
              <select
                value={fromUnit}
                onChange={(e) => setFromUnit(e.target.value as Unit)}
                className="rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none"
              >
                {UNITS.map((u) => (
                  <option key={u.id} value={u.id}>{u.id}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">
              Base font size (for rem / em / %)
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1">{numInput(baseFont, setBaseFont)}</div>
              <span className="text-sm text-muted-foreground">px</span>
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[13px] font-medium text-foreground/80">Viewport (for vw / vh)</p>
            <div className="flex items-center gap-2">
              <div className="flex-1">{numInput(vpW, setVpW)}</div>
              <span className="text-sm text-muted-foreground">x</span>
              <div className="flex-1">{numInput(vpH, setVpH)}</div>
              <span className="text-sm text-muted-foreground">px</span>
            </div>
          </div>

          <div className="rounded-xl bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
            em is computed against the parent font size; here the base font size is used as the parent.
            % for font-size is relative to the parent, also based on the value above.
          </div>

          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of 5 free copies left - everything runs in your browser.
            </p>
          )}
        </div>

        <div>
          {!Number.isFinite(px) ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-border text-center">
              <ArrowRightLeft className="mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="font-semibold">Enter a number to convert</p>
              <p className="mt-1 text-sm text-muted-foreground">The conversion table updates as you type.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border">
              {rows.map((r, i) => (
                <div
                  key={r.id}
                  className={cn(
                    "flex items-center justify-between gap-3 px-4 py-3",
                    i % 2 === 0 ? "bg-card" : "bg-muted/40",
                    r.id === fromUnit && "bg-primary/5",
                  )}
                >
                  <div>
                    <span className="font-mono text-sm font-bold">{r.id}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{r.note}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold">{r.display}</span>
                    <button
                      type="button"
                      onClick={() => copyRow(r.id, r.display)}
                      disabled={!trial.canUse}
                      className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-primary/10 hover:text-primary disabled:opacity-40"
                      aria-label={`Copy ${r.display}`}
                    >
                      {copiedRow === r.id ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
