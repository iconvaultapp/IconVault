// /tools/css-layers-lab - Assign CSS rules to cascade layers, drag to reorder,
// and see which rule wins on live demo elements with an explanation.
// 100% client-side; trial use is recorded when the final CSS is copied.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, GripVertical, Layers } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/css-layers-lab")({
  head: () => {
    const seo = getToolSeoMeta("css-layers-lab");
    const canonical = "https://iconvault.site/tools/css-layers-lab";
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
  component: LayersLabTool,
});

const DEFAULT_CSS: Record<string, string> = {
  base: `.layer-demo-title {
  color: #334155;
  font-size: 22px;
}
.layer-demo-btn {
  background: #94a3b8;
  color: #ffffff;
  border: 0;
  border-radius: 8px;
  padding: 12px 28px;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
}`,
  components: `.layer-demo-title {
  color: #0f766e;
}
.layer-demo-btn {
  background: #0f766e;
  padding: 12px 28px;
}`,
  utilities: `.layer-demo-btn {
  background: #7c3aed;
  border-radius: 999px;
}`,
};

/** Find the background value a layer sets on .layer-demo-btn, if any. */
function layerBackground(css: string): string | null {
  const m = css.match(/\.layer-demo-btn\s*\{[^}]*?background(?:-color)?\s*:\s*([^;}!]+)/);
  return m && m[1] ? m[1].trim() : null;
}

function LayersLabTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("css-layers-lab", isPro);
  const seo = getToolSeo("css-layers-lab");

  const [order, setOrder] = useState<string[]>(["base", "components", "utilities"]);
  const [cssByLayer, setCssByLayer] = useState<Record<string, string>>(DEFAULT_CSS);
  const [copied, setCopied] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [supported] = useState(
    () => typeof CSS !== "undefined" && CSS.supports("color: revert-layer"),
  );

  const finalCss = useMemo(() => {
    const decl = `@layer ${order.join(", ")};`;
    const blocks = order.map((name) => `@layer ${name} {\n${(cssByLayer[name] ?? "").trim()}\n}`).join("\n\n");
    return `/* Later layers win over earlier ones at equal specificity */\n${decl}\n\n${blocks}\n`;
  }, [order, cssByLayer]);

  const winner = useMemo(() => {
    for (let i = order.length - 1; i >= 0; i--) {
      const name = order[i] ?? "";
      const bg = layerBackground(cssByLayer[name] ?? "");
      if (bg) return { layer: name, bg };
    }
    return null;
  }, [order, cssByLayer]);

  const moveLayer = (from: number, to: number) => {
    if (to < 0 || to >= order.length || from === to) return;
    setOrder((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      if (item === undefined) return prev;
      next.splice(to, 0, item);
      return next;
    });
  };

  const copy = async () => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(finalCss);
      setCopied(true);
      trial.recordUse();
      toast.success("Layered CSS copied");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  return (
    <ToolPageShell toolId="css-layers-lab" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Cascade Layers Lab" left={trial.left} />

      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-4 text-sm">
        <Layers className="h-4 w-4 text-primary" />
        <span className="font-semibold">Browser support:</span>
        <span
          className={
            supported
              ? "rounded-full bg-green-500/15 px-2.5 py-0.5 text-xs font-bold text-green-600"
              : "rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-600"
          }
        >
          {supported ? "@layer works in this browser" : "@layer not supported here"}
        </span>
        <span className="text-xs text-muted-foreground">
          Cascade layers ship in Chrome 99+, Edge 99+, Safari 15.4+ and Firefox 97+. Rules in a
          later layer beat rules in an earlier layer, no matter the source order or specificity.
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-1 text-sm font-bold">Layer order</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Drag to reorder. The bottom layer wins ties.
            </p>
            <div className="space-y-2">
              {order.map((name, i) => (
                <div
                  key={name}
                  draggable
                  onDragStart={() => setDragIdx(i)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragIdx === null || dragIdx === i) return;
                    const from = dragIdx;
                    setDragIdx(i);
                    setOrder((prev) => {
                      const next = [...prev];
                      const [item] = next.splice(from, 1);
                      if (item === undefined) return prev;
                      next.splice(i, 0, item);
                      return next;
                    });
                  }}
                  onDragEnd={() => setDragIdx(null)}
                  onDrop={() => setDragIdx(null)}
                  className={cn(
                    "flex cursor-grab items-center gap-3 rounded-xl border bg-muted/40 px-3 py-2.5 transition active:cursor-grabbing",
                    dragIdx === i ? "border-primary opacity-60" : "border-border",
                  )}
                >
                  <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="font-mono text-sm font-bold">{name}</span>
                  <span className="ml-auto flex gap-1">
                    <button
                      type="button"
                      aria-label={`Move ${name} up`}
                      onClick={() => moveLayer(i, i - 1)}
                      disabled={i === 0}
                      className="rounded-lg border border-border px-2 py-0.5 text-xs font-bold disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${name} down`}
                      onClick={() => moveLayer(i, i + 1)}
                      disabled={i === order.length - 1}
                      className="rounded-lg border border-border px-2 py-0.5 text-xs font-bold disabled:opacity-30"
                    >
                      ↓
                    </button>
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 font-mono text-xs text-muted-foreground">
              @layer {order.join(", ")};
            </p>
          </div>

          {winner && (
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
              <h2 className="mb-1 text-sm font-bold">Which rule wins?</h2>
              <p className="text-sm leading-relaxed">
                The button background is <code className="font-mono font-bold">{winner.bg}</code> from
                the <code className="font-mono font-bold">{winner.layer}</code> layer.
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {winner.layer} is the last layer in the order that sets a background on
                .layer-demo-btn, so it beats the earlier layers even though all three selectors
                have identical specificity.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-bold">Live demo</h2>
            <div className="rounded-xl bg-muted/40 p-8 text-center">
              <style>{finalCss}</style>
              <h3 className="layer-demo-title mb-4">Layered heading</h3>
              <button type="button" className="layer-demo-btn">Layered button</button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Edit the CSS in any layer tab below, or reorder the layers, and this demo restyles instantly.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold">Layer CSS</h2>
              <button
                type="button"
                onClick={copy}
                disabled={!trial.canUse}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-xs font-bold transition hover:border-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy final CSS"}
              </button>
            </div>
            <div className="space-y-3">
              {order.map((name) => (
                <div key={name}>
                  <p className="mb-1.5 font-mono text-xs font-bold text-primary">@layer {name}</p>
                  <textarea
                    value={cssByLayer[name]}
                    onChange={(e) => setCssByLayer((prev) => ({ ...prev, [name]: e.target.value }))}
                    spellCheck={false}
                    rows={7}
                    className="w-full rounded-xl border border-border bg-muted/40 p-3 font-mono text-xs leading-relaxed focus:border-primary focus:outline-none"
                  />
                </div>
              ))}
            </div>
            {!isPro && (
              <p className="mt-3 text-xs text-muted-foreground">
                {trial.left} of {TOOL_TRIAL_LIMIT} free copies left.
              </p>
            )}
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
