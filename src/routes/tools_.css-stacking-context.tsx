// /tools/css-stacking-context - Interactive z-index and paint-order lab: tweak
// position, z-index, opacity, transform, isolation and filter on three boxes,
// watch the real render change, and read the spec-correct paint order back to
// front. Gotcha alerts explain why an element wins or loses. 100% client-side.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Layers } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/css-stacking-context")({
  head: () => {
    const seo = getToolSeoMeta("css-stacking-context");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: StackingContextTool,
});

type Position = "static" | "relative" | "absolute";

type Box = {
  id: string;
  label: string;
  color: string;
  position: Position;
  zIndex: number;
  opacity: number;
  transform: boolean;
  isolate: boolean;
  filter: boolean;
};

const DEFAULTS: Box[] = [
  { id: "a", label: "A", color: "#be123c", position: "absolute", zIndex: 1, opacity: 1, transform: false, isolate: false, filter: false },
  { id: "b", label: "B", color: "#0f766e", position: "absolute", zIndex: 2, opacity: 1, transform: false, isolate: false, filter: false },
  { id: "c", label: "C", color: "#b45309", position: "absolute", zIndex: 3, opacity: 1, transform: false, isolate: false, filter: false },
];

const OFFSETS = [
  { top: 24, left: 24 },
  { top: 64, left: 84 },
  { top: 104, left: 144 },
];

function formsStackingContext(b: Box): string[] {
  const reasons: string[] = [];
  if (b.position !== "static" && b.zIndex !== 0) reasons.push(`position: ${b.position} with z-index ${b.zIndex} (a positioned z-index always creates one)`);
  if (b.opacity < 1) reasons.push(`opacity: ${b.opacity} (anything below 1 creates one)`);
  if (b.transform) reasons.push("transform: translateZ(0) (any transform except none creates one)");
  if (b.isolate) reasons.push("isolation: isolate (explicitly creates one)");
  if (b.filter) reasons.push("filter: grayscale(0%) (any filter except none creates one)");
  return reasons;
}

/** Simplified spec paint order for our boxes: negative z, then non-positioned,
 *  then positioned z:auto / stacking contexts at z 0, then positive z. */
function paintOrder(boxes: Box[]): Box[] {
  const neg: Box[] = [];
  const zero: Box[] = [];
  const pos: Box[] = [];
  for (const b of boxes) {
    const positioned = b.position !== "static";
    const sc = formsStackingContext(b).length > 0;
    if (positioned && b.zIndex < 0) neg.push(b);
    else if (positioned && b.zIndex > 0) pos.push(b);
    else zero.push(b);
    void sc;
  }
  const byZ = (x: Box, y: Box) => x.zIndex - y.zIndex || boxes.indexOf(x) - boxes.indexOf(y);
  neg.sort(byZ);
  pos.sort(byZ);
  return [...neg, ...zero, ...pos];
}

function boxStyle(b: Box, i: number): React.CSSProperties {
  return {
    position: b.position,
    zIndex: b.position === "static" ? undefined : b.zIndex,
    opacity: b.opacity,
    transform: b.transform ? "translateZ(0)" : undefined,
    isolation: b.isolate ? "isolate" : undefined,
    filter: b.filter ? "grayscale(0%)" : undefined,
    background: b.color,
    top: b.position === "absolute" ? OFFSETS[i]!.top : undefined,
    left: b.position === "absolute" ? OFFSETS[i]!.left : undefined,
  };
}

function BoxControls({ box, onChange }: { box: Box; onChange: (b: Box) => void }) {
  const set = (patch: Partial<Box>) => onChange({ ...box, ...patch });
  const scReasons = formsStackingContext(box);
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg text-sm font-black text-white" style={{ background: box.color }}>
          {box.label}
        </span>
        <span className="text-sm font-bold">Box {box.label}</span>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-1 rounded-xl bg-muted/60 p-1">
        {(["static", "relative", "absolute"] as Position[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => set({ position: p })}
            className={cn("rounded-lg px-2 py-1.5 font-mono text-xs font-bold transition", box.position === p ? "bg-card text-primary shadow" : "text-muted-foreground")}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-foreground/80">z-index</span>
        <span className="font-mono font-bold">{box.position === "static" ? "ignored" : box.zIndex}</span>
      </div>
      <input type="range" min={-5} max={10} value={box.zIndex} onChange={(e) => set({ zIndex: Number(e.target.value) })} className="mb-3 w-full" aria-label={`z-index box ${box.label}`} disabled={box.position === "static"} />

      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-foreground/80">opacity</span>
        <span className="font-mono font-bold">{box.opacity.toFixed(1)}</span>
      </div>
      <input type="range" min={0.2} max={1} step={0.1} value={box.opacity} onChange={(e) => set({ opacity: Number(e.target.value) })} className="mb-3 w-full" aria-label={`opacity box ${box.label}`} />

      <div className="flex flex-wrap gap-2">
        {[
          { k: "transform" as const, label: "transform" },
          { k: "isolate" as const, label: "isolation" },
          { k: "filter" as const, label: "filter" },
        ].map((t) => (
          <button
            key={t.k}
            type="button"
            onClick={() => set({ [t.k]: !box[t.k] } as Partial<Box>)}
            aria-pressed={box[t.k]}
            className={cn("rounded-lg border px-2.5 py-1 font-mono text-xs font-bold transition", box[t.k] ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}
          >
            {t.label}
          </button>
        ))}
      </div>

      {box.position === "static" && (
        <p className="mt-2 rounded-lg bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-400">
          Gotcha: z-index has no effect on <code className="font-mono">position: static</code> elements.
        </p>
      )}
      {scReasons.length > 0 && (
        <div className="mt-2 rounded-lg bg-blue-500/10 p-2 text-xs text-blue-700 dark:text-blue-400">
          <span className="font-bold">Stacking context:</span>
          <ul className="mt-1 list-disc pl-4">{scReasons.map((r) => <li key={r}>{r}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

function StackingContextTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("css-stacking-context", isPro);
  const seo = getToolSeo("css-stacking-context");

  const [boxes, setBoxes] = useState<Box[]>(DEFAULTS);
  const [copied, setCopied] = useState(false);

  const order = useMemo(() => paintOrder(boxes), [boxes]);

  const snippet = useMemo(() => {
    const lines = boxes.map((b) => {
      const decls = [
        `  position: ${b.position};`,
        b.position !== "static" ? `  z-index: ${b.zIndex};` : `  /* z-index ignored on static */`,
        b.opacity < 1 ? `  opacity: ${b.opacity};` : null,
        b.transform ? `  transform: translateZ(0);` : null,
        b.isolate ? `  isolation: isolate;` : null,
        b.filter ? `  filter: grayscale(0%);` : null,
      ].filter(Boolean);
      return `.box-${b.label.toLowerCase()} {\n${decls.join("\n")}\n}`;
    });
    return `/* Paint order, back to front: ${order.map((b) => b.label).join(" → ")} */\n${lines.join("\n\n")}`;
  }, [boxes, order]);

  const copyText = async () => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(snippet);
      trial.recordUse();
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success("CSS copied");
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  return (
    <ToolPageShell toolId="css-stacking-context" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="CSS Stacking Context" left={trial.left} />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-green-500/15 px-3 py-1 text-xs font-bold text-green-700 dark:text-green-400">
          Fully live: real CSS
        </span>
        <span className="text-xs text-muted-foreground">
          The stage uses your exact values, so the render and the paint-order readout always agree.
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 flex items-center gap-1.5 text-[13px] font-medium text-foreground/80">
              <Layers className="h-4 w-4" /> Live stage (boxes overlap on purpose)
            </p>
            <div className="relative h-64 overflow-hidden rounded-xl border border-border bg-muted/30">
              {boxes.map((b, i) => (
                <div key={b.id} className="flex h-28 w-40 items-center justify-center rounded-xl text-2xl font-black text-white shadow-lg" style={boxStyle(b, i)}>
                  {b.label}
                </div>
              ))}
            </div>
            <div className="mt-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Paint order (back to front)</p>
              <div className="flex flex-wrap items-center gap-2">
                {order.map((b, i) => (
                  <span key={b.id} className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-black text-white" style={{ background: b.color }}>
                      {b.label}
                    </span>
                    {i < order.length - 1 && <span className="text-muted-foreground">→</span>}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Spec order: negative z-index stacking contexts, then non-positioned blocks, then positioned z-index 0/auto (and z:auto stacking contexts in DOM order), then positive z-index. A parent that forms a stacking context traps its children inside it: no child z-index can ever escape above a sibling stacking context.
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Current setup as CSS</span>
              <button
                type="button"
                onClick={copyText}
                disabled={!trial.canUse}
                className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold hover:border-primary/50 hover:text-primary disabled:opacity-50"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="max-h-64 overflow-auto p-4 text-xs leading-relaxed text-foreground/90">{snippet}</pre>
          </div>
          {!isPro && <p className="text-xs text-muted-foreground">{trial.left} of 5 free uses left. All controls and the live stage are unlimited.</p>}
        </div>

        <div className="space-y-4">
          {boxes.map((b) => (
            <BoxControls key={b.id} box={b} onChange={(nb) => setBoxes((prev) => prev.map((p) => (p.id === b.id ? nb : p)))} />
          ))}
        </div>
      </div>
    </ToolPageShell>
  );
}
