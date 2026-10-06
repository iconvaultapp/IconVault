// /tools/flexbox-generator - Build flexbox layouts visually with live preview.
// 100% client-side; trial use is recorded when the CSS is copied.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/flexbox-generator";
import toolSeoMeta from "@/lib/tool-seo-meta-data/flexbox-generator";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/flexbox-generator")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/flexbox-generator";
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
  component: FlexboxTool,
});

const COLORS = ["#0d9488", "#7c3aed", "#2563eb", "#dc2626", "#d97706", "#059669"];

interface FlexItem {
  id: number;
  grow: number;
  shrink: number;
  basis: string;
  order: number;
}

function FlexboxTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("flexbox-generator", isPro);
  const seo = toolSeo;

  const [direction, setDirection] = useState("row");
  const [wrap, setWrap] = useState("wrap");
  const [justify, setJustify] = useState("flex-start");
  const [alignItems, setAlignItems] = useState("stretch");
  const [alignContent, setAlignContent] = useState("stretch");
  const [gap, setGap] = useState(12);
  const [items, setItems] = useState<FlexItem[]>([
    { id: 1, grow: 0, shrink: 1, basis: "auto", order: 0 },
    { id: 2, grow: 0, shrink: 1, basis: "auto", order: 0 },
    { id: 3, grow: 0, shrink: 1, basis: "auto", order: 0 },
  ]);
  const [nextId, setNextId] = useState(4);
  const [selId, setSelId] = useState(1);
  const [copied, setCopied] = useState(false);

  const selected = items.find((i) => i.id === selId) ?? items[0];

  const updateItem = (id: number, patch: Partial<FlexItem>) =>
    setItems((p) => p.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const addItem = () => {
    setItems((p) => [...p, { id: nextId, grow: 0, shrink: 1, basis: "auto", order: 0 }]);
    setSelId(nextId);
    setNextId((n) => n + 1);
  };

  const removeItem = (id: number) =>
    setItems((p) => {
      if (p.length <= 1) return p;
      const rest = p.filter((i) => i.id !== id);
      if (selId === id && rest[0]) setSelId(rest[0].id);
      return rest;
    });

  const containerCss = useMemo(
    () =>
      `display: flex;\nflex-direction: ${direction};\nflex-wrap: ${wrap};\njustify-content: ${justify};\nalign-items: ${alignItems};\nalign-content: ${alignContent};\ngap: ${gap}px;`,
    [direction, wrap, justify, alignItems, alignContent, gap],
  );

  const itemCss = useMemo(
    () =>
      items
        .map(
          (i) =>
            `/* item ${items.indexOf(i) + 1} */\nflex: ${i.grow} ${i.shrink} ${i.basis};\norder: ${i.order};`,
        )
        .join("\n\n"),
    [items],
  );

  const fullCss = useMemo(
    () => `.flex-container {\n  ${containerCss.replaceAll("\n", "\n  ")}\n}\n\n.flex-item {\n  ${itemCss.replaceAll("\n", "\n  ")}\n}`,
    [containerCss, itemCss],
  );

  const copy = async () => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(fullCss);
      setCopied(true);
      trial.recordUse();
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  const slider = (
    label: string,
    value: number,
    min: number,
    max: number,
    onChange: (n: number) => void,
    unit = "px",
  ) => (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between text-[13px]">
        <span className="font-medium text-foreground/80">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </label>
  );

  const select = (
    label: string,
    value: string,
    options: string[],
    onChange: (v: string) => void,
  ) => (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-foreground/80">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-medium outline-none focus:border-primary"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <ToolPageShell toolId="flexbox-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Flexbox Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-6">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Container</p>
          {select("flex-direction", direction, ["row", "row-reverse", "column", "column-reverse"], setDirection)}
          {select("flex-wrap", wrap, ["nowrap", "wrap", "wrap-reverse"], setWrap)}
          {select("justify-content", justify, ["flex-start", "center", "flex-end", "space-between", "space-around", "space-evenly"], setJustify)}
          {select("align-items", alignItems, ["stretch", "flex-start", "center", "flex-end", "baseline"], setAlignItems)}
          {select("align-content", alignContent, ["stretch", "flex-start", "center", "flex-end", "space-between", "space-around"], setAlignContent)}
          {slider("gap", gap, 0, 40, setGap)}

          <div className="border-t border-border pt-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Items</p>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold hover:border-primary/60"
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {items.map((i, idx) => (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => setSelId(i.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition",
                    selId === i.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  Item {idx + 1}
                  {items.length > 1 && (
                    <Minus
                      className="h-3 w-3 hover:text-red-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeItem(i.id);
                      }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {selected && (
            <div className="space-y-4 rounded-xl bg-muted/50 p-4">
              <p className="text-[13px] font-bold">
                Selected item: Item {items.indexOf(selected) + 1}
              </p>
              {slider("flex-grow", selected.grow, 0, 4, (n) => updateItem(selected.id, { grow: n }), "")}
              {slider("flex-shrink", selected.shrink, 0, 4, (n) => updateItem(selected.id, { shrink: n }), "")}
              {slider("order", selected.order, -5, 5, (n) => updateItem(selected.id, { order: n }), "")}
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-medium text-foreground/80">flex-basis</span>
                <input
                  type="text"
                  value={selected.basis}
                  onChange={(e) => updateItem(selected.id, { basis: e.target.value })}
                  placeholder="auto, 100px, 30%"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary"
                />
              </label>
            </div>
          )}

          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left.
            </p>
          )}
        </div>

        <div className="space-y-5">
          <div
            className="min-h-[320px] rounded-2xl border border-border bg-card p-8"
            style={{ display: "flex", flexDirection: direction as never, flexWrap: wrap as never, justifyContent: justify, alignItems: alignItems, alignContent: alignContent, gap }}
          >
            {items.map((i, idx) => (
              <div
                key={i.id}
                onClick={() => setSelId(i.id)}
                className={cn("flex min-h-[64px] min-w-[64px] cursor-pointer items-center justify-center rounded-xl font-bold text-white transition", selId === i.id && "ring-2 ring-primary ring-offset-2")}
                style={{
                  backgroundColor: COLORS[idx % COLORS.length],
                  flex: `${i.grow} ${i.shrink} ${i.basis}`,
                  order: i.order,
                }}
              >
                {idx + 1}
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">CSS output</p>
            <pre className="overflow-x-auto rounded-xl bg-muted/60 p-4 font-mono text-sm">{fullCss}</pre>
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
