// /tools/css-grid-generator - Build CSS grids visually, including a
// grid-template-areas painter. 100% client-side; trial use is recorded
// when the CSS is copied.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/css-grid-generator")({
  head: () => {
    const seo = getToolSeoMeta("css-grid-generator");
    const canonical = "https://iconvault.site/tools/css-grid-generator";
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
  component: GridTool,
});

const AREA_COLORS = ["#0d9488", "#7c3aed", "#2563eb", "#dc2626", "#d97706", "#059669", "#0891b2", "#db2777"];

function GridTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("css-grid-generator", isPro);
  const seo = getToolSeo("css-grid-generator");

  const [cols, setCols] = useState("1fr 1fr 1fr");
  const [rows, setRows] = useState("auto auto");
  const [rowGap, setRowGap] = useState(12);
  const [colGap, setColGap] = useState(12);
  const [justifyItems, setJustifyItems] = useState("stretch");
  const [alignItems, setAlignItems] = useState("stretch");

  // Areas painter
  const [areaRows, setAreaRows] = useState(3);
  const [areaCols, setAreaCols] = useState(4);
  const [areas, setAreas] = useState<string[]>(["header", "main", "sidebar"]);
  const [newArea, setNewArea] = useState("");
  const [selArea, setSelArea] = useState("header");
  const [grid, setGrid] = useState<string[][]>(() => {
    const g: string[][] = [];
    for (let r = 0; r < 3; r++) g.push(new Array(4).fill(r === 0 ? "header" : r === 2 ? "sidebar" : "main"));
    return g;
  });

  const [copied, setCopied] = useState(false);

  const resizeGrid = (r: number, c: number) => {
    setAreaRows(r);
    setAreaCols(c);
    setGrid((old) => {
      const g: string[][] = [];
      for (let i = 0; i < r; i++) {
        const row: string[] = [];
        for (let j = 0; j < c; j++) row.push(old[i]?.[j] ?? "");
        g.push(row);
      }
      return g;
    });
  };

  const paint = (r: number, c: number) => {
    setGrid((old) => {
      const g = old.map((row) => [...row]);
      const row = g[r];
      if (row) row[c] = row[c] === selArea ? "" : selArea;
      return g;
    });
  };

  const clearAll = () => setGrid(Array.from({ length: areaRows }, () => new Array(areaCols).fill("")));

  const addArea = () => {
    const name = newArea.trim().replace(/\s+/g, "-").toLowerCase();
    if (!name || areas.includes(name)) return;
    setAreas((a) => [...a, name]);
    setSelArea(name);
    setNewArea("");
  };

  const removeArea = (name: string) => {
    setAreas((a) => a.filter((x) => x !== name));
    if (selArea === name) setSelArea(areas[0] === name ? (areas[1] ?? "") : (areas[0] ?? ""));
    setGrid((old) => old.map((row) => row.map((cell) => (cell === name ? "" : cell))));
  };

  const areaColor = (name: string) => {
    const idx = areas.indexOf(name);
    return idx >= 0 ? AREA_COLORS[idx % AREA_COLORS.length] : "#cbd5e1";
  };

  const css = useMemo(() => {
    const areaRowsStr = grid.map((row) => `"${row.map((c) => c || ".").join(" ")}"`).join("\n");
    return (
      `.grid-container {\n  display: grid;\n  grid-template-columns: ${cols};\n  grid-template-rows: ${rows};\n  gap: ${rowGap}px ${colGap}px;\n  justify-items: ${justifyItems};\n  align-items: ${alignItems};\n` +
      (areas.length > 0 && grid.some((row) => row.some((c) => c))
        ? `  grid-template-areas:\n${areaRowsStr
            .split("\n")
            .map((l) => `    ${l}`)
            .join("\n")};\n`
        : "") +
      `}\n\n` +
      areas
        .map((a) => (grid.some((row) => row.some((c) => c === a)) ? `.${a} {\n  grid-area: ${a};\n}` : null))
        .filter(Boolean)
        .join("\n\n")
    );
  }, [cols, rows, rowGap, colGap, justifyItems, alignItems, grid, areas]);

  const copy = async () => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(css);
      setCopied(true);
      trial.recordUse();
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  const textInput = (label: string, value: string, onChange: (v: string) => void, placeholder: string) => (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-foreground/80">{label}</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary"
      />
    </label>
  );

  const slider = (label: string, value: number, min: number, max: number, onChange: (n: number) => void) => (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between text-[13px]">
        <span className="font-medium text-foreground/80">{label}</span>
        <span className="tabular-nums text-muted-foreground">{value}px</span>
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

  const select = (label: string, value: string, options: string[], onChange: (v: string) => void) => (
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

  const countSelect = (label: string, value: number, onChange: (n: number) => void) => (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-foreground/80">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-medium outline-none focus:border-primary"
      >
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <ToolPageShell toolId="css-grid-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="CSS Grid Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-6">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Tracks</p>
          {textInput("grid-template-columns", cols, setCols, "1fr 1fr 1fr")}
          {textInput("grid-template-rows", rows, setRows, "auto auto")}
          {slider("row-gap", rowGap, 0, 40, setRowGap)}
          {slider("column-gap", colGap, 0, 40, setColGap)}
          {select("justify-items", justifyItems, ["stretch", "start", "center", "end"], setJustifyItems)}
          {select("align-items", alignItems, ["stretch", "start", "center", "end"], setAlignItems)}

          <div className="border-t border-border pt-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Areas painter
            </p>
            <div className="grid grid-cols-2 gap-3">
              {countSelect("Rows", areaRows, (n) => resizeGrid(n, areaCols))}
              {countSelect("Columns", areaCols, (n) => resizeGrid(areaRows, n))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={newArea}
                onChange={(e) => setNewArea(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addArea()}
                placeholder="New area name, e.g. footer"
                className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={addArea}
                className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-border px-3 py-2 text-xs font-bold hover:border-primary/60"
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {areas.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setSelArea(a)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition",
                    selArea === a ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground",
                  )}
                >
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: areaColor(a) }} />
                  {a}
                  <X
                    className="h-3 w-3 hover:text-red-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeArea(a);
                    }}
                  />
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={clearAll}
              className="mt-2 text-xs font-bold text-muted-foreground underline hover:text-foreground"
            >
              Clear painted cells
            </button>
          </div>

          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left.
            </p>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-8">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Painter - click a cell to assign the selected area (click again to erase)
            </p>
            <div
              className="grid w-full overflow-hidden rounded-xl border border-border"
              style={{ gridTemplateColumns: `repeat(${areaCols}, 1fr)`, gridAutoRows: "minmax(56px, auto)", gap: 4, backgroundColor: "var(--muted)" }}
            >
              {grid.map((row, r) =>
                row.map((cell, c) => (
                  <button
                    key={`${r}-${c}`}
                    type="button"
                    onClick={() => paint(r, c)}
                    className="flex min-h-[56px] items-center justify-center px-2 py-3 text-xs font-bold text-white/95 transition"
                    style={{ backgroundColor: cell ? areaColor(cell) : "rgba(148,163,184,0.18)", color: cell ? "#fff" : "var(--muted-foreground)" }}
                    title={`Cell ${r + 1},${c + 1}`}
                  >
                    {cell || "·"}
                  </button>
                )),
              )}
            </div>

            <p className="mb-3 mt-8 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Live grid preview
            </p>
            <div
              className="min-h-[220px] rounded-xl border border-border p-4"
              style={{
                display: "grid",
                gridTemplateColumns: cols || "1fr 1fr 1fr",
                gridTemplateRows: rows || "auto",
                rowGap,
                columnGap: colGap,
                justifyItems,
                alignItems,
                gridTemplateAreas: grid.some((row) => row.some((c) => c))
                  ? grid.map((row) => `"${row.map((c) => c || ".").join(" ")}"`).join(" ")
                  : undefined,
              }}
            >
              {areas
                .filter((a) => grid.some((row) => row.some((c) => c === a)))
                .map((a) => (
                  <div
                    key={a}
                    className="flex min-h-[64px] items-center justify-center rounded-lg font-bold text-white"
                    style={{ backgroundColor: areaColor(a), gridArea: a }}
                  >
                    {a}
                  </div>
                ))}
              {areas.filter((a) => grid.some((row) => row.some((c) => c === a))).length === 0 && (
                <p className="text-sm text-muted-foreground">Paint cells above to preview areas here.</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">CSS output</p>
            <pre className="overflow-x-auto rounded-xl bg-muted/60 p-4 font-mono text-sm">{css}</pre>
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
