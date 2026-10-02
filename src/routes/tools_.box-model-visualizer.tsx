// /tools/box-model-visualizer - Interactive CSS box model: sliders for content
// size, padding, border and margin with uniform or per-side values, a live
// labeled diagram with pixel measurements, and copy-ready CSS. 100% in-browser.

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

export const Route = createFileRoute("/tools_/box-model-visualizer")({
  head: () => {
    const seo = getToolSeoMeta("box-model-visualizer");
    const canonical = "https://iconvault.site/tools/box-model-visualizer";
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
  component: BoxModelTool,
});

type Sides = { top: number; right: number; bottom: number; left: number };

const SIDES: (keyof Sides)[] = ["top", "right", "bottom", "left"];
const SHORT = { top: "T", right: "R", bottom: "B", left: "L" } as const;

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

function SideSliders({ label, sides, onChange }: {
  label: string; sides: Sides; onChange: (s: Sides) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-[13px] font-medium text-foreground/80">{label} (per side)</p>
      <div className="grid grid-cols-4 gap-2">
        {SIDES.map((s) => (
          <div key={s}>
            <p className="mb-1 text-center font-mono text-[11px] font-bold text-muted-foreground">{SHORT[s]}</p>
            <input
              type="range" min={0} max={s === "top" || s === "bottom" ? 80 : 80} value={sides[s]}
              onChange={(e) => onChange({ ...sides, [s]: Number(e.target.value) })}
              className="w-full accent-primary"
            />
            <p className="mt-1 text-center font-mono text-[11px]">{sides[s]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function BoxModelTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("box-model-visualizer", isPro);
  const seo = getToolSeo("box-model-visualizer");

  const [cw, setCw] = useState(220);
  const [ch, setCh] = useState(120);
  const [uniform, setUniform] = useState(true);
  const [padding, setPadding] = useState<Sides>({ top: 24, right: 24, bottom: 24, left: 24 });
  const [border, setBorder] = useState<Sides>({ top: 6, right: 6, bottom: 6, left: 6 });
  const [margin, setMargin] = useState<Sides>({ top: 32, right: 32, bottom: 32, left: 32 });
  const [copied, setCopied] = useState(false);

  const setAll = (s: Sides, v: number): Sides => ({ top: v, right: v, bottom: v, left: v });

  const css = useMemo(() => {
    const fmt4 = (s: Sides) => `${s.top}px ${s.right}px ${s.bottom}px ${s.left}px`;
    return [
      `width: ${cw}px;`,
      `height: ${ch}px;`,
      `padding: ${fmt4(padding)};`,
      `border-width: ${fmt4(border)};`,
      `border-style: solid;`,
      `margin: ${fmt4(margin)};`,
    ].join("\n");
  }, [cw, ch, padding, border, margin]);

  const totals = useMemo(() => {
    const w = cw + padding.left + padding.right + border.left + border.right;
    const h = ch + padding.top + padding.bottom + border.top + border.bottom;
    return {
      borderW: w,
      borderH: h,
      outerW: w + margin.left + margin.right,
      outerH: h + margin.top + margin.bottom,
    };
  }, [cw, ch, padding, border, margin]);

  const copyCss = () => {
    if (!trial.canUse) return;
    void navigator.clipboard.writeText(css).then(() => {
      trial.recordUse();
      setCopied(true);
      toast.success("Box model CSS copied");
      setTimeout(() => setCopied(false), 1500);
    });
  };

  // Diagram colors: margin amber, border orange, padding teal, content sky
  const label = (v: number, dark?: boolean) => (
    <span
      className={cn(
        "rounded px-1 font-mono text-[10px] font-bold leading-none",
        dark ? "bg-black/25 text-white" : "bg-black/40 text-white",
      )}
    >
      {v}
    </span>
  );

  return (
    <ToolPageShell toolId="box-model-visualizer" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Box Model Visualizer" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <Slider label="Content width" value={cw} min={40} max={420} onChange={setCw} suffix="px" />
          <Slider label="Content height" value={ch} min={20} max={260} onChange={setCh} suffix="px" />

          <label className="flex cursor-pointer items-center justify-between text-[13px] font-medium text-foreground/80">
            Uniform sides
            <button
              type="button" role="switch" aria-checked={uniform}
              onClick={() => setUniform((u) => !u)}
              className={cn("relative h-6 w-11 rounded-full transition", uniform ? "bg-primary" : "bg-muted")}
            >
              <span className={cn(
                "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                uniform ? "left-[22px]" : "left-0.5",
              )} />
            </button>
          </label>

          {uniform ? (
            <>
              <Slider label="Padding" value={padding.top} min={0} max={80} onChange={(v) => setPadding(setAll(padding, v))} suffix="px" />
              <Slider label="Border" value={border.top} min={0} max={40} onChange={(v) => setBorder(setAll(border, v))} suffix="px" />
              <Slider label="Margin" value={margin.top} min={0} max={100} onChange={(v) => setMargin(setAll(margin, v))} suffix="px" />
            </>
          ) : (
            <>
              <SideSliders label="Padding" sides={padding} onChange={setPadding} />
              <SideSliders label="Border" sides={border} onChange={setBorder} />
              <SideSliders label="Margin" sides={margin} onChange={setMargin} />
            </>
          )}

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
          <div className="flex min-h-[420px] items-center justify-center overflow-auto rounded-2xl border border-border bg-card p-8">
            {/* Margin layer */}
            <div
              className="relative bg-amber-500/20 outline outline-1 outline-dashed outline-amber-500"
              style={{
                paddingTop: margin.top, paddingRight: margin.right,
                paddingBottom: margin.bottom, paddingLeft: margin.left,
              }}
            >
              <span className="absolute left-1 top-1 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                margin
              </span>
              <span className="absolute left-1/2 top-0.5 -translate-x-1/2">{label(margin.top)}</span>
              <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2">{label(margin.bottom)}</span>
              <span className="absolute left-0.5 top-1/2 -translate-y-1/2">{label(margin.left)}</span>
              <span className="absolute right-0.5 top-1/2 -translate-y-1/2">{label(margin.right)}</span>
              {/* Border layer */}
              <div
                className="relative bg-orange-500/30 outline outline-1 outline-orange-600"
                style={{
                  paddingTop: border.top, paddingRight: border.right,
                  paddingBottom: border.bottom, paddingLeft: border.left,
                }}
              >
                <span className="absolute left-1 top-1 text-[10px] font-bold uppercase tracking-wide text-orange-800 dark:text-orange-300">
                  border
                </span>
                {/* Padding layer */}
                <div
                  className="relative bg-teal-500/25 outline outline-1 outline-dashed outline-teal-600"
                  style={{
                    paddingTop: padding.top, paddingRight: padding.right,
                    paddingBottom: padding.bottom, paddingLeft: padding.left,
                  }}
                >
                  <span className="absolute left-1 top-1 text-[10px] font-bold uppercase tracking-wide text-teal-800 dark:text-teal-300">
                    padding
                  </span>
                  <span className="absolute left-1/2 top-0.5 -translate-x-1/2">{label(padding.top)}</span>
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2">{label(padding.bottom)}</span>
                  <span className="absolute left-0.5 top-1/2 -translate-y-1/2">{label(padding.left)}</span>
                  <span className="absolute right-0.5 top-1/2 -translate-y-1/2">{label(padding.right)}</span>
                  {/* Content layer */}
                  <div
                    className="flex items-center justify-center bg-sky-500/40 outline outline-1 outline-sky-600"
                    style={{ width: cw, height: ch }}
                  >
                    <span className="rounded bg-black/40 px-2 py-1 text-center font-mono text-[11px] font-bold leading-tight text-white">
                      {cw} x {ch}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { k: "Border box", v: `${totals.borderW} x ${totals.borderH}` },
              { k: "Outer (with margin)", v: `${totals.outerW} x ${totals.outerH}` },
              { k: "Content", v: `${cw} x ${ch}` },
            ].map((s) => (
              <div key={s.k} className="rounded-xl border border-border bg-card p-3 text-center">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{s.k}</p>
                <p className="mt-1 font-mono text-sm font-bold">{s.v}</p>
              </div>
            ))}
          </div>

          <pre className="overflow-x-auto rounded-2xl border border-border bg-card p-4 font-mono text-[13px] leading-relaxed">{css}</pre>
        </div>
      </div>
    </ToolPageShell>
  );
}
