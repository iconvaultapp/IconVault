// /tools/css-reading-flow - Learn the CSS reading-flow property: reorder items
// visually with flex/grid, then step through where keyboard focus goes with and
// without reading-flow. The property is experimental, so navigation is simulated
// per the spec algorithm and labelled honestly.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, Copy, Keyboard } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/css-reading-flow")({
  head: () => {
    const seo = getToolSeoMeta("css-reading-flow");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: ReadingFlowTool,
});

type LayoutKind = "row-reverse" | "column-reverse" | "order-shuffle";
type FlowKind = "normal" | "flex-visual" | "flex-flow" | "source-order";

const LAYOUTS: { id: LayoutKind; label: string; blurb: string }[] = [
  { id: "row-reverse", label: "row-reverse", blurb: "flex-direction: row-reverse. Visual order is the mirror of DOM order." },
  { id: "column-reverse", label: "column-reverse", blurb: "flex-direction: column-reverse. Visual order runs bottom to top." },
  { id: "order-shuffle", label: "order shuffle", blurb: "Each card gets an explicit order value, scrambling the visual sequence." },
];

const FLOWS: { id: FlowKind; label: string; blurb: string }[] = [
  { id: "normal", label: "normal", blurb: "Default. Focus follows DOM (source) order, ignoring visual layout." },
  { id: "flex-visual", label: "flex-visual", blurb: "Focus follows the visual order of the flex container." },
  { id: "flex-flow", label: "flex-flow", blurb: "Focus follows the flex flow direction, then wraps per line." },
  { id: "source-order", label: "source-order", blurb: "Explicit: focus follows DOM order even if it looks odd." },
];

const CARDS = [1, 2, 3, 4, 5, 6];
const SHUFFLE_ORDER = [3, 0, 4, 1, 5, 2]; // order value per card index

function visualOrder(layout: LayoutKind): number[] {
  if (layout === "row-reverse" || layout === "column-reverse") return [...CARDS].reverse();
  return [...CARDS].sort((a, b) => SHUFFLE_ORDER[a - 1]! - SHUFFLE_ORDER[b - 1]!);
}

function ReadingFlowTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("css-reading-flow", isPro);
  const seo = getToolSeo("css-reading-flow");

  const [layout, setLayout] = useState<LayoutKind>("row-reverse");
  const [flow, setFlow] = useState<FlowKind>("normal");
  const [focusIdx, setFocusIdx] = useState(0);

  const domOrder = useMemo(() => [...CARDS], []);
  const visOrder = useMemo(() => visualOrder(layout), [layout]);
  const readingOrder = flow === "normal" || flow === "source-order" ? domOrder : visOrder;
  const mismatch = useMemo(() => domOrder.some((c, i) => c !== readingOrder[i]), [domOrder, readingOrder]);

  const step = (dir: 1 | -1) => {
    setFocusIdx((i) => (i + dir + readingOrder.length) % readingOrder.length);
  };

  const containerClass =
    layout === "row-reverse"
      ? "flex-row-reverse"
      : layout === "column-reverse"
        ? "flex-col-reverse"
        : "";

  const copyText = async () => {
    if (!trial.canUse) return;
    const snippet =
      layout === "order-shuffle"
        ? `.deck {\n  display: flex;\n  reading-flow: ${flow};\n}\n.deck > :nth-child(1) { order: 3; }\n/* …assign order per card… */`
        : `.deck {\n  display: flex;\n  flex-direction: ${layout === "row-reverse" ? "row-reverse" : "column-reverse"};\n  reading-flow: ${flow};\n}`;
    try {
      await navigator.clipboard.writeText(snippet);
      trial.recordUse();
      toast.success("CSS copied");
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  const [copied, setCopied] = useState(false);

  return (
    <ToolPageShell toolId="css-reading-flow" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="CSS reading-flow" left={trial.left} />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-400">
          Experimental: simulation
        </span>
        <span className="text-xs text-muted-foreground">
          reading-flow is not in stable browsers yet (Chrome Canary behind a flag). The focus walk below simulates the spec algorithm, and the snippet applies the real property so it works when browsers catch up.
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Visual layout trick</p>
            <div className="space-y-2">
              {LAYOUTS.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => { setLayout(l.id); setFocusIdx(0); }}
                  className={cn(
                    "w-full rounded-xl border p-3 text-left transition",
                    layout === l.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/40",
                  )}
                >
                  <span className={cn("font-mono text-sm font-bold", layout === l.id ? "text-primary" : "")}>{l.label}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{l.blurb}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">reading-flow value</p>
            <div className="space-y-2">
              {FLOWS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => { setFlow(f.id); setFocusIdx(0); }}
                  className={cn(
                    "w-full rounded-xl border p-3 text-left transition",
                    flow === f.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/40",
                  )}
                >
                  <span className={cn("font-mono text-sm font-bold", flow === f.id ? "text-primary" : "")}>{f.label}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{f.blurb}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              void copyText();
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            disabled={!trial.canUse}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy the CSS"}
          </button>
          {!isPro && <p className="text-xs text-muted-foreground">{trial.left} of 5 free uses left. Layout and focus simulation are unlimited.</p>}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[13px] font-medium text-foreground/80">Simulated keyboard walk <span className="text-muted-foreground">(Tab order)</span></p>
              <div className="flex gap-2">
                <button type="button" onClick={() => step(-1)} className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:border-primary/50" aria-label="Previous in reading order">
                  <ArrowLeft className="h-3.5 w-3.5" /> Shift+Tab
                </button>
                <button type="button" onClick={() => step(1)} className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:border-primary/50" aria-label="Next in reading order">
                  Tab <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div
              className={cn("flex gap-3", containerClass, layout === "column-reverse" && "flex-col")}
              style={{ readingFlow: flow } as React.CSSProperties}
            >
              {CARDS.map((c, i) => {
                const focused = readingOrder[focusIdx] === c;
                return (
                  <div
                    key={c}
                    style={layout === "order-shuffle" ? { order: SHUFFLE_ORDER[i] } : undefined}
                    className={cn(
                      "flex h-20 flex-1 items-center justify-center rounded-xl border-2 text-2xl font-black transition",
                      focused ? "border-primary bg-primary/15 text-primary" : "border-border bg-muted/40 text-muted-foreground",
                    )}
                  >
                    {c}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-muted-foreground">Focus path:</span>
              {readingOrder.map((c, i) => (
                <span key={c} className="flex items-center gap-2">
                  <span className={cn("flex h-6 w-6 items-center justify-center rounded-full font-bold", i === focusIdx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                    {c}
                  </span>
                  {i < readingOrder.length - 1 && <span className="text-muted-foreground">→</span>}
                </span>
              ))}
            </div>

            <div className={cn("mt-4 rounded-xl border p-3 text-xs", mismatch && flow !== "normal" && flow !== "source-order" ? "border-green-500/40 bg-green-500/10" : "border-border bg-muted/40")}>
              {flow === "normal" || flow === "source-order" ? (
                <span className="text-muted-foreground">
                  <Keyboard className="mr-1 inline h-3.5 w-3.5" />
                  Focus follows DOM order (1→6) even though it looks scrambled. Keyboard and screen-reader users experience a different order than sighted users see. That mismatch is exactly what reading-flow fixes.
                </span>
              ) : (
                <span className="text-green-700 dark:text-green-400">
                  With <code className="font-mono font-bold">reading-flow: {flow}</code>, focus follows the visual order instead, so what you see matches where Tab goes.
                </span>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Why this matters</p>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
              <li><code className="font-mono">order</code>, <code className="font-mono">flex-direction: row-reverse</code> and grid placement change what sighted users see, but Tab and screen readers still walk the DOM.</li>
              <li><code className="font-mono">reading-flow</code> lets the visual order win for sequential focus navigation, without rewriting your HTML.</li>
              <li>Until browsers ship it, the accessible fix is to reorder the DOM itself. Use this tool to decide which one your layout needs.</li>
            </ul>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
