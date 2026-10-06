// /tools/grid-area-painter - Paint CSS grid areas visually and export
// grid-template-areas. 100% client-side.

import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Download, Eraser } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/grid-area-painter";
import toolSeoMeta from "@/lib/tool-seo-meta-data/grid-area-painter";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/grid-area-painter")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/grid-area-painter";
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
  component: GridAreaPainter,
});

const AREA_COLORS = [
  "#0ea5e9", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16",
];

function sanitizeName(n: string) {
  return n.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "").slice(0, 20) || "area";
}

function GridAreaPainter() {
  const { isPro } = usePlan();
  const trial = useToolTrial("grid-area-painter", isPro);
  const seo = toolSeo;

  const [cols, setCols] = useState(4);
  const [rows, setRows] = useState(3);
  const [cells, setCells] = useState<string[]>(() => Array(12).fill(""));
  const [areaName, setAreaName] = useState("header");
  const [eraser, setEraser] = useState(false);
  const painting = useRef(false);

  const resize = (c: number, r: number) => {
    const nc = Math.min(12, Math.max(1, c));
    const nr = Math.min(12, Math.max(1, r));
    setCols(nc);
    setRows(nr);
    setCells((old) => {
      const next = Array(nc * nr).fill("");
      const oldCols = cols;
      for (let y = 0; y < nr; y++) {
        for (let x = 0; x < nc; x++) {
          const oi = y * oldCols + x;
          if (oi < old.length) next[y * nc + x] = old[oi];
        }
      }
      return next;
    });
  };

  const areas = useMemo(() => {
    const order: string[] = [];
    for (const c of cells) if (c && !order.includes(c)) order.push(c);
    const map = new Map<string, string>();
    order.forEach((name, i) => map.set(name, AREA_COLORS[i % AREA_COLORS.length] ?? "#0ea5e9"));
    return map;
  }, [cells]);

  const paint = (i: number) => {
    const name = eraser ? "" : sanitizeName(areaName);
    setCells((p) => {
      if (p[i] === name) return p;
      const n = [...p];
      n[i] = name;
      return n;
    });
  };

  const css = useMemo(() => {
    const lines: string[] = [];
    for (let y = 0; y < rows; y++) {
      const row = cells.slice(y * cols, y * cols + cols).map((c) => c || ".");
      lines.push(`  "${row.join(" ")}"`);
    }
    const areaClasses = [...areas.keys()]
      .map((a) => `.${a} {\n  grid-area: ${a};\n}`)
      .join("\n\n");
    return (
      `.grid {\n  display: grid;\n  grid-template-columns: repeat(${cols}, 1fr);\n  grid-template-rows: repeat(${rows}, auto);\n  grid-template-areas:\n${lines.join("\n")};\n}` +
      (areaClasses ? `\n\n${areaClasses}` : "")
    );
  }, [cells, cols, rows, areas]);

  const copyCss = async () => {
    if (!trial.canUse) return;
    if (areas.size === 0) {
      toast.error("Paint at least one area first.");
      return;
    }
    try {
      await navigator.clipboard.writeText(css);
      trial.recordUse();
      toast.success("CSS copied");
    } catch {
      toast.error("Could not access the clipboard.");
    }
  };

  const downloadCss = () => {
    downloadBlob(new Blob([css], { type: "text/css" }), "grid-areas.css");
    toast.success("CSS downloaded");
  };

  const clearAll = () => {
    setCells(Array(cols * rows).fill(""));
    toast.success("Canvas cleared");
  };

  return (
    <ToolPageShell toolId="grid-area-painter" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Grid Area Painter" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[13px] font-medium text-foreground/80">Columns</label>
              <input
                type="number"
                min={1}
                max={12}
                value={cols}
                onChange={(e) => resize(Number(e.target.value) || 1, rows)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-medium text-foreground/80">Rows</label>
              <input
                type="number"
                min={1}
                max={12}
                value={rows}
                onChange={(e) => resize(cols, Number(e.target.value) || 1)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Area name</label>
            <div className="flex gap-2">
              <input
                value={areaName}
                onChange={(e) => {
                  setAreaName(e.target.value);
                  setEraser(false);
                }}
                spellCheck={false}
                placeholder="header"
                className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setEraser((v) => !v)}
                title="Eraser"
                className={cn(
                  "rounded-xl border px-3 transition",
                  eraser ? "border-red-500 bg-red-500/10 text-red-500" : "border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                <Eraser className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Areas ({areas.size})</p>
              <button type="button" onClick={clearAll} className="text-xs font-semibold text-muted-foreground hover:text-red-500">
                Clear all
              </button>
            </div>
            {areas.size === 0 ? (
              <p className="text-xs text-muted-foreground">Click and drag on the canvas to paint areas.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {[...areas.entries()].map(([name, color]) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      setAreaName(name);
                      setEraser(false);
                    }}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-xs font-semibold transition",
                      sanitizeName(areaName) === name && !eraser
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <ActionButton disabled={!trial.canUse} onClick={copyCss}>
            <Copy className="h-4 w-4" /> Copy CSS
          </ActionButton>
          <button
            type="button"
            onClick={downloadCss}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
          >
            <Download className="h-4 w-4" /> Download .css
          </button>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div
              className="grid gap-1.5 touch-none select-none"
              style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
              onPointerLeave={() => {
                painting.current = false;
              }}
            >
              {cells.map((c, i) => (
                <div
                  key={i}
                  onPointerDown={(e) => {
                    painting.current = true;
                    (e.target as HTMLElement).setPointerCapture(e.pointerId);
                    paint(i);
                  }}
                  onPointerEnter={() => {
                    if (painting.current) paint(i);
                  }}
                  onPointerUp={() => {
                    painting.current = false;
                  }}
                  className={cn(
                    "flex h-16 cursor-pointer items-center justify-center rounded-lg border text-xs font-bold transition-colors sm:h-20",
                    c ? "border-transparent text-white" : "border-dashed border-border text-muted-foreground/40 hover:border-primary/40",
                  )}
                  style={c ? { background: areas.get(c) } : undefined}
                >
                  {c || `${(i % cols) + 1},${Math.floor(i / cols) + 1}`}
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Tip: paint the same area name across adjacent cells to make it span multiple tracks. Empty cells become "." in the output.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 text-sm font-bold">Exported CSS</p>
            <pre className="max-h-[320px] overflow-auto rounded-xl bg-zinc-950 p-4 font-mono text-xs leading-relaxed text-zinc-200">
              {css}
            </pre>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
