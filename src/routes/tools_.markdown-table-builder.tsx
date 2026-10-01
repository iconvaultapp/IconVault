// /tools/markdown-table-builder - Editable grid to Markdown table with per-column alignment.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Download, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/markdown-table-builder")({
  head: () => {
    const seo = getToolSeoMeta("markdown-table-builder");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: MdTableTool,
});

type Align = "left" | "center" | "right";
const MAX_ROWS = 30;
const MAX_COLS = 12;

function emptyGrid(rows: number, cols: number): string[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => ""));
}

function toMarkdown(cells: string[][], aligns: Align[], header: boolean): string {
  const esc = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");
  const row = (r: string[]) => `| ${r.map(esc).join(" | ")} |`;
  const lines = cells.map(row);
  if (header && lines.length > 0) {
    const sep = aligns.map((a) => (a === "center" ? ":---:" : a === "right" ? "---:" : "---"));
    lines.splice(1, 0, `| ${sep.join(" | ")} |`);
  }
  return lines.join("\n");
}

function MdTableTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("markdown-table-builder", isPro);
  const seo = getToolSeo("markdown-table-builder");

  const [cells, setCells] = useState<string[][]>(() => emptyGrid(3, 3));
  const [aligns, setAligns] = useState<Align[]>(["left", "left", "left"]);
  const [header, setHeader] = useState(true);

  const rows = cells.length;
  const cols = cells[0]?.length ?? 0;

  const setCell = (r: number, c: number, v: string) =>
    setCells((p) => p.map((row, ri) => (ri === r ? row.map((cell, ci) => (ci === c ? v : cell)) : row)));

  const addRow = () => {
    if (rows >= MAX_ROWS) { toast.error(`Max ${MAX_ROWS} rows`); return; }
    setCells((p) => [...p, Array.from({ length: cols }, () => "")]);
  };
  const removeRow = () => {
    if (rows <= 1) return;
    setCells((p) => p.slice(0, -1));
  };
  const addCol = () => {
    if (cols >= MAX_COLS) { toast.error(`Max ${MAX_COLS} columns`); return; }
    setCells((p) => p.map((r) => [...r, ""]));
    setAligns((p) => [...p, "left"]);
  };
  const removeCol = () => {
    if (cols <= 1) return;
    setCells((p) => p.map((r) => r.slice(0, -1)));
    setAligns((p) => p.slice(0, -1));
  };
  const setAlign = (c: number, a: Align) => setAligns((p) => p.map((x, i) => (i === c ? a : x)));

  const markdown = useMemo(() => toMarkdown(cells, aligns, header), [cells, aligns, header]);

  const copy = async () => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(markdown);
      trial.recordUse();
      toast.success("Markdown table copied");
    } catch {
      toast.error("Copy failed");
    }
  };
  const download = () => {
    if (!trial.canUse) return;
    downloadBlob(new Blob([markdown], { type: "text/markdown" }), "table.md");
    trial.recordUse();
    toast.success("table.md downloaded");
  };

  return (
    <ToolPageShell toolId="markdown-table-builder" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Markdown Table Builder" left={trial.left} />

      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button type="button" onClick={addRow} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:border-primary/50">
              <Plus className="h-4 w-4" /> Row
            </button>
            <button type="button" onClick={removeRow} disabled={rows <= 1} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:border-primary/50 disabled:opacity-40">
              <Minus className="h-4 w-4" /> Row
            </button>
            <button type="button" onClick={addCol} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:border-primary/50">
              <Plus className="h-4 w-4" /> Column
            </button>
            <button type="button" onClick={removeCol} disabled={cols <= 1} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:border-primary/50 disabled:opacity-40">
              <Minus className="h-4 w-4" /> Column
            </button>
            <label className="ml-1 flex cursor-pointer items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={header} onChange={(e) => setHeader(e.target.checked)} className="h-4 w-4 accent-primary" />
              Header row
            </label>
            <span className="ml-auto text-xs text-muted-foreground">{rows} rows x {cols} cols - click any cell to edit</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  {aligns.map((a, c) => (
                    <th key={c} className="border-b border-border p-1.5">
                      <select
                        value={a}
                        onChange={(e) => setAlign(c, e.target.value as Align)}
                        className="w-full rounded-md border border-border bg-background px-1.5 py-1 text-xs font-medium"
                        aria-label={`Column ${c + 1} alignment`}
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cells.map((row, r) => (
                  <tr key={r} className={cn(header && r === 0 && "bg-muted/30")}>
                    {row.map((cell, c) => (
                      <td key={c} className="border-b border-r border-border last:border-r-0">
                        <input
                          value={cell}
                          onChange={(e) => setCell(r, c, e.target.value)}
                          placeholder={header && r === 0 ? `Header ${c + 1}` : ""}
                          className="w-full bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground/50 focus:bg-primary/5"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Markdown output</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={copy}
                disabled={!trial.canUse}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:border-primary/50 disabled:opacity-40"
              >
                <Copy className="h-4 w-4" /> Copy
              </button>
              <ActionButton disabled={!trial.canUse} onClick={download}>
                <Download className="h-4 w-4" /> Download .md
              </ActionButton>
            </div>
          </div>
          <pre className="max-h-72 overflow-auto rounded-xl bg-muted/40 p-4 font-mono text-[13px] leading-relaxed">{markdown}</pre>
          {!isPro && (
            <p className="mt-3 text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free uses left - everything runs in your browser.
            </p>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
