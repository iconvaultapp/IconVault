// /tools/scroll-snap-builder - Visually configure scroll-snap layouts: axis,
// type, alignment, gap and item sizing, with a live scrolling preview. In-browser.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/scroll-snap-builder")({
  head: () => {
    const seo = getToolSeoMeta("scroll-snap-builder");
    const canonical = "https://iconvault.site/tools/scroll-snap-builder";
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
  component: ScrollSnapBuilder,
});

type Axis = "x" | "y";
type SnapType = "mandatory" | "proximity";
type Align = "start" | "center" | "end";

function Seg<T extends string>({ label, options, value, onChange }: { label: string; options: { v: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div>
      <p className="mb-2 text-[13px] font-medium text-foreground/80">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button key={o.v} type="button" onClick={() => onChange(o.v)}
            className={cn("rounded-xl border px-3 py-2 font-mono text-sm font-bold transition",
              value === o.v ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40")}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Slider({ label, value, onChange, min, max, suffix }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; suffix: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-[13px] font-medium text-foreground/80"><span>{label}</span><span className="font-mono">{value}{suffix}</span></div>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-primary" />
    </div>
  );
}

function ScrollSnapBuilder() {
  const { isPro } = usePlan();
  const trial = useToolTrial("scroll-snap-builder", isPro);
  const seo = getToolSeo("scroll-snap-builder");

  const [axis, setAxis] = useState<Axis>("x");
  const [type, setType] = useState<SnapType>("mandatory");
  const [align, setAlign] = useState<Align>("center");
  const [gap, setGap] = useState(16);
  const [itemSize, setItemSize] = useState(70);
  const [count, setCount] = useState(7);
  const [pad, setPad] = useState(24);

  const css = useMemo(() => {
    const padProp = axis === "x" ? `padding: 0 ${pad}px;` : `padding: ${pad}px 0;`;
    return `/* Scroll container */\n.scroller {\n  display: flex;\n  flex-direction: ${axis === "x" ? "row" : "column"};\n  gap: ${gap}px;\n  overflow-${axis}: auto;\n  scroll-snap-type: ${axis} ${type};\n  ${padProp}\n}\n\n/* Items */\n.scroller > * {\n  flex: 0 0 ${itemSize}%;\n  scroll-snap-align: ${align};\n}`;
  }, [axis, type, align, gap, itemSize, count, pad]);

  const copy = () => {
    if (!trial.canUse) return;
    void navigator.clipboard.writeText(css);
    trial.recordUse();
    toast.success("Scroll-snap CSS copied");
  };

  const download = () => {
    if (!trial.canUse) return;
    downloadBlob(new Blob([`/* Scroll Snap Builder */\n${css}\n`], { type: "text/css" }), `scroll-snap-${axis}-${type}.css`);
    trial.recordUse();
    toast.success("CSS file downloaded");
  };

  return (
    <ToolPageShell toolId="scroll-snap-builder" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Scroll Snap Builder" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <Seg label="Scroll axis" value={axis} onChange={setAxis}
            options={[{ v: "x", label: "x (horizontal)" }, { v: "y", label: "y (vertical)" }]} />
          <Seg label="Snap strictness" value={type} onChange={setType}
            options={[{ v: "mandatory", label: "mandatory" }, { v: "proximity", label: "proximity" }]} />
          <Seg label="Snap alignment" value={align} onChange={setAlign}
            options={[{ v: "start", label: "start" }, { v: "center", label: "center" }, { v: "end", label: "end" }]} />
          <div className="space-y-4">
            <Slider label="Gap" value={gap} onChange={setGap} min={0} max={48} suffix="px" />
            <Slider label="Item size" value={itemSize} onChange={setItemSize} min={20} max={100} suffix="%" />
            <Slider label="Item count" value={count} onChange={setCount} min={3} max={12} suffix="" />
            <Slider label="Edge padding" value={pad} onChange={setPad} min={0} max={80} suffix="px" />
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton onClick={copy} disabled={!trial.canUse}><Copy className="h-4 w-4" /> Copy CSS</ActionButton>
            <button type="button" onClick={download} disabled={!trial.canUse} className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-bold transition hover:border-primary/50 disabled:opacity-50"><Download className="h-4 w-4" /> .css</button>
          </div>
          {!isPro && <p className="text-xs text-muted-foreground">{trial.left} of {TOOL_TRIAL_LIMIT} free copies left.</p>}
          <p className="text-xs text-muted-foreground">Mandatory always snaps to the nearest item; proximity only snaps when you stop near one.</p>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Live preview - scroll it</p>
          <div
            className={cn("flex gap-4 overflow-auto rounded-xl border border-border bg-muted/30 p-0", axis === "x" ? "flex-row" : "flex-col")}
            style={{
              gap,
              height: 360,
              scrollSnapType: `${axis} ${type}`,
              padding: axis === "x" ? `0 ${pad}px` : `${pad}px 0`,
              scrollbarWidth: "thin",
            }}
          >
            {Array.from({ length: count }).map((_, i) => (
              <div key={i}
                className={cn("flex shrink-0 items-center justify-center rounded-xl text-2xl font-extrabold text-white shadow",
                  axis === "x" ? "h-full" : "w-full")}
                style={{
                  flexBasis: `${itemSize}%`,
                  scrollSnapAlign: align,
                }}
              >
                <div className={cn("flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-br",
                  i % 5 === 0 && "from-teal-500 to-emerald-600",
                  i % 5 === 1 && "from-cyan-500 to-sky-600",
                  i % 5 === 2 && "from-emerald-500 to-teal-600",
                  i % 5 === 3 && "from-sky-500 to-indigo-600",
                  i % 5 === 4 && "from-teal-600 to-cyan-500",
                )}>
                  {i + 1}
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-xl bg-muted/50 p-4">
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">Generated CSS</p>
            <pre className="overflow-x-auto whitespace-pre font-mono text-sm">{css}</pre>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
