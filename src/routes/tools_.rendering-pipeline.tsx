// /tools/rendering-pipeline - Interactive browser rendering pipeline lab:
// search which CSS properties trigger layout, paint or composite,
// watch the pipeline light up, and copy reference lists. Client-side only.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowDown, Copy, Layers, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/rendering-pipeline")({
  head: () => {
    const seo = getToolSeoMeta("rendering-pipeline");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: RenderingPipelineTool,
});

type Stage = "layout" | "paint" | "composite";

interface PropRow {
  name: string;
  stage: Stage;
}

const PROPS: PropRow[] = [
  // layout (style + layout + paint + composite)
  ...["width", "height", "min-width", "max-width", "min-height", "max-height", "aspect-ratio",
    "margin", "margin-top", "margin-right", "margin-bottom", "margin-left",
    "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
    "border-width", "border", "box-sizing", "display", "position",
    "top", "left", "right", "bottom", "float", "clear", "overflow",
    "font-size", "line-height", "font-family", "font-weight", "text-align",
    "text-indent", "vertical-align", "white-space", "word-spacing", "letter-spacing",
    "flex-direction", "flex-wrap", "justify-content", "align-items", "align-content",
    "gap", "grid-template-columns", "grid-template-rows", "grid-column", "grid-row",
  ].map((name) => ({ name, stage: "layout" as Stage })),
  // paint (style + paint + composite)
  ...["color", "background", "background-color", "background-image", "background-size",
    "background-position", "border-color", "border-style", "border-radius",
    "outline", "outline-color", "box-shadow", "text-shadow", "text-decoration",
    "visibility", "clip-path", "filter", "backdrop-filter", "mask", "mix-blend-mode",
  ].map((name) => ({ name, stage: "paint" as Stage })),
  // composite (style + composite only)
  ...["transform", "translate", "rotate", "scale", "opacity"].map((name) => ({ name, stage: "composite" as Stage })),
];

const STAGE_INFO: { id: Stage; label: string; cost: string; blurb: string; color: string; ring: string; chip: string }[] = [
  {
    id: "layout", label: "Layout", cost: "most expensive",
    blurb: "The browser recomputes geometry: positions, sizes and flow for the element and often its neighbours and descendants.",
    color: "bg-red-500", ring: "border-red-500/60", chip: "bg-red-500/10 text-red-500",
  },
  {
    id: "paint", label: "Paint", cost: "medium",
    blurb: "Geometry is unchanged. The browser repaints pixels: colors, backgrounds, shadows and decoration.",
    color: "bg-amber-500", ring: "border-amber-500/60", chip: "bg-amber-500/10 text-amber-600",
  },
  {
    id: "composite", label: "Composite", cost: "cheapest",
    blurb: "Already-painted layers are just moved, scaled or faded on the GPU. This is the fast path for animations.",
    color: "bg-emerald-500", ring: "border-emerald-500/60", chip: "bg-emerald-500/10 text-emerald-600",
  },
];

const PIPELINE = ["Style", "Layout", "Paint", "Composite"] as const;

function stagesFor(row: PropRow): Stage[] {
  if (row.stage === "layout") return ["layout", "paint", "composite"];
  if (row.stage === "paint") return ["paint", "composite"];
  return ["composite"];
}

function RenderingPipelineTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("rendering-pipeline", isPro);
  const seo = getToolSeo("rendering-pipeline");

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Stage | "all">("all");
  const [selected, setSelected] = useState<PropRow | null>(PROPS.find((p) => p.name === "transform")!);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PROPS.filter(
      (p) => (filter === "all" || p.stage === filter) && (q === "" || p.name.includes(q)),
    );
  }, [query, filter]);

  const active = selected ? stagesFor(selected) : [];
  const counts = useMemo(
    () => ({
      layout: PROPS.filter((p) => p.stage === "layout").length,
      paint: PROPS.filter((p) => p.stage === "paint").length,
      composite: PROPS.filter((p) => p.stage === "composite").length,
    }),
    [],
  );

  const copyList = async () => {
    if (!trial.canUse) return;
    const list = (filter === "all" ? PROPS : PROPS.filter((p) => p.stage === filter))
      .map((p) => `${p.name} - triggers ${p.stage}`);
    try {
      await navigator.clipboard.writeText(list.join("\n"));
      trial.recordUse();
      toast.success(`Copied ${list.length} properties`);
    } catch {
      toast.error("Copy failed - clipboard not available.");
    }
  };

  return (
    <ToolPageShell toolId="rendering-pipeline" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Rendering Pipeline Lab" left={trial.left} />

      <div className="space-y-6">
        {/* Interactive pipeline diagram */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">The pipeline</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Click a property below to see which stages it runs. Animating <code className="rounded bg-muted px-1">transform</code> and{" "}
            <code className="rounded bg-muted px-1">opacity</code> stays on the cheap composite path.
          </p>
          <div className="mt-4 flex flex-col items-stretch gap-1 sm:flex-row sm:items-center">
            {PIPELINE.map((stage, i) => {
              const key = stage.toLowerCase();
              const lit =
                key === "style" ||
                (key === "layout" && active.includes("layout")) ||
                (key === "paint" && active.includes("paint")) ||
                (key === "composite" && active.includes("composite"));
              const info = STAGE_INFO.find((s) => s.id === key);
              return (
                <div key={stage} className="flex flex-1 items-center gap-1">
                  <div
                    className={cn(
                      "flex-1 rounded-xl border-2 px-3 py-4 text-center transition",
                      lit ? info?.ring ?? "border-sky-500/60" : "border-border opacity-60",
                      lit && "bg-card shadow-sm",
                    )}
                  >
                    <p className="font-bold">{stage}</p>
                    {info && <p className={cn("mt-0.5 text-xs font-medium", info.chip, "rounded-full inline-block px-2 py-0.5")}>{info.cost}</p>}
                  </div>
                  {i < PIPELINE.length - 1 && (
                    <ArrowDown className="h-4 w-4 shrink-0 rotate-0 text-muted-foreground sm:-rotate-90" />
                  )}
                </div>
              );
            })}
          </div>
          {selected && (
            <div className="mt-4 rounded-xl bg-muted/60 p-4 text-sm">
              <p className="font-semibold">
                <code className="rounded bg-background px-1.5 py-0.5 font-mono">{selected.name}</code>
                {" "}triggers:{" "}
                {active.map((s) => (
                  <span key={s} className={cn("ml-1 rounded-full px-2 py-0.5 text-xs font-bold", STAGE_INFO.find((i) => i.id === s)!.chip)}>
                    {s.toUpperCase()}
                  </span>
                ))}
              </p>
              <p className="mt-2 text-muted-foreground">
                {STAGE_INFO.find((i) => i.id === selected.stage)!.blurb}
              </p>
            </div>
          )}
        </section>

        {/* Property search */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search a CSS property, e.g. box-shadow"
                className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-3 text-sm outline-none focus:border-primary"
              />
            </div>
            <div className="flex gap-2">
              {(["all", "layout", "paint", "composite"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-bold capitalize transition",
                    filter === f ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground",
                  )}
                >
                  {f === "all" ? "All" : `${f} (${counts[f]})`}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 max-h-80 overflow-y-auto rounded-xl border border-border">
            {rows.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No properties match.</p>}
            {rows.map((p) => {
              const info = STAGE_INFO.find((i) => i.id === p.stage)!;
              return (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => setSelected(p)}
                  className={cn(
                    "flex w-full items-center justify-between border-b border-border px-4 py-2 text-left text-sm last:border-0 transition hover:bg-muted/60",
                    selected?.name === p.name && "bg-primary/5",
                  )}
                >
                  <code className="font-mono">{p.name}</code>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold uppercase", info.chip)}>{p.stage}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <ActionButton disabled={!trial.canUse} onClick={copyList}>
              <Copy className="h-4 w-4" /> Copy {filter === "all" ? "full" : filter} list
            </ActionButton>
            {!isPro && (
              <p className="text-xs text-muted-foreground">
                {trial.left} of {TOOL_TRIAL_LIMIT} free copies left.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
          <p className="flex items-start gap-2">
            <Layers className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              Simplified model: real browsers merge and skip stages based on layer promotion, containment and caching.
              A reference built on the public CSS Triggers data, good for intuition and interview prep, not a profiler replacement.
            </span>
          </p>
        </section>
      </div>
    </ToolPageShell>
  );
}
