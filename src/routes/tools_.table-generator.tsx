// /tools/table-generator - Build a table in an editable grid and export
// it as HTML, Markdown, CSV, JSON, LaTeX or ASCII art.
// 100% client-side, nothing is uploaded.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Download, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/table-generator")({
  head: () => {
    const seo = getToolSeoMeta("table-generator");
    const canonical = "https://iconvault.site/tools/table-generator";
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
  component: TableGeneratorTool,
});

type Format = "html" | "markdown" | "csv" | "json" | "latex" | "ascii";

const FORMATS: { id: Format; label: string; ext: string; mime: string }[] = [
  { id: "html", label: "HTML", ext: "html", mime: "text/html" },
  { id: "markdown", label: "Markdown", ext: "md", mime: "text/markdown" },
  { id: "csv", label: "CSV", ext: "csv", mime: "text/csv" },
  { id: "json", label: "JSON", ext: "json", mime: "application/json" },
  { id: "latex", label: "LaTeX", ext: "tex", mime: "text/plain" },
  { id: "ascii", label: "ASCII", ext: "txt", mime: "text/plain" },
];

const MAX_ROWS = 30;
const MAX_COLS = 12;

const escHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escLatex = (s: string) =>
  s
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/&/g, "\\&")
    .replace(/%/g, "\\%")
    .replace(/\$/g, "\\$")
    .replace(/#/g, "\\#")
    .replace(/_/g, "\\_")
    .replace(/{/g, "\\{")
    .replace(/}/g, "\\}")
    .replace(/\^/g, "\\textasciicircum{}")
    .replace(/~/g, "\\textasciitilde{}");
const escCsv = (s: string) =>
  /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;

function buildOutput(rows: string[][], hasHeader: boolean, format: Format): string {
  const data = rows.map((r) => r.slice());
  const first = data[0] ?? [];
  const header = hasHeader ? first : first.map((_, i) => `col${i + 1}`);
  const body = hasHeader ? data.slice(1) : data;

  switch (format) {
    case "html": {
      const th = header.map((c) => `      <th>${escHtml(c)}</th>`).join("\n");
      const trs = body
        .map((r) => `    <tr>\n${r.map((c) => `      <td>${escHtml(c)}</td>`).join("\n")}\n    </tr>`)
        .join("\n");
      return `<table>\n  <thead>\n    <tr>\n${th}\n    </tr>\n  </thead>\n  <tbody>\n${trs}\n  </tbody>\n</table>`;
    }
    case "markdown": {
      const row = (cells: string[]) => `| ${cells.join(" | ")} |`;
      const sep = `| ${header.map(() => "---").join(" | ")} |`;
      return [row(header), sep, ...body.map(row)].join("\n");
    }
    case "csv": {
      return [header, ...body].map((r) => r.map(escCsv).join(",")).join("\n");
    }
    case "json": {
      const arr = body.map((r) => {
        const obj: Record<string, string> = {};
        header.forEach((h, i) => {
          obj[h || `col${i + 1}`] = r[i] ?? "";
        });
        return obj;
      });
      return JSON.stringify(arr, null, 2);
    }
    case "latex": {
      const cols = header.map(() => "l").join(" ");
      const row = (cells: string[]) => cells.map(escLatex).join(" & ") + " \\\\";
      const lines = [
        `\\begin{tabular}{${cols}}`,
        "\\hline",
        row(header),
        "\\hline",
        ...body.flatMap((r) => [row(r), "\\hline"]),
        "\\end{tabular}",
      ];
      return lines.join("\n");
    }
    case "ascii": {
      const all = [header, ...body];
      const widths = header.map((_, c) => Math.max(...all.map((r) => (r[c] ?? "").length)));
      const line = "+" + widths.map((w) => "-".repeat(w + 2)).join("+") + "+";
      const row = (cells: string[]) => "| " + cells.map((c, i) => (c ?? "").padEnd(widths[i] ?? 0)).join(" | ") + " |";
      return [line, row(header), line, ...body.map(row), line].join("\n");
    }
  }
}

function TableGeneratorTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("table-generator", isPro);
  const seo = getToolSeo("table-generator");

  const [rows, setRows] = useState<string[][]>([
    ["Name", "Role", "City"],
    ["Ava", "Designer", "Mumbai"],
    ["Rohan", "Developer", "Delhi"],
    ["Meera", "Manager", "Bengaluru"],
  ]);
  const [hasHeader, setHasHeader] = useState(true);
  const [format, setFormat] = useState<Format>("markdown");
  const [copied, setCopied] = useState(false);

  const cols = rows[0]?.length ?? 0;

  const setCell = (r: number, c: number, v: string) =>
    setRows((p) => p.map((row, i) => (i === r ? row.map((cell, j) => (j === c ? v : cell)) : row)));

  const addRow = () => {
    if (rows.length >= MAX_ROWS) {
      toast.error(`Tables are capped at ${MAX_ROWS} rows.`);
      return;
    }
    setRows((p) => [...p, Array(cols).fill("")]);
  };
  const removeRow = () => {
    if (rows.length <= 1) return;
    setRows((p) => p.slice(0, -1));
  };
  const addCol = () => {
    if (cols >= MAX_COLS) {
      toast.error(`Tables are capped at ${MAX_COLS} columns.`);
      return;
    }
    setRows((p) => p.map((row) => [...row, ""]));
  };
  const removeCol = () => {
    if (cols <= 1) return;
    setRows((p) => p.map((row) => row.slice(0, -1)));
  };

  const output = useMemo(() => buildOutput(rows, hasHeader, format), [rows, hasHeader, format]);
  const meta = FORMATS.find((f) => f.id === format)!;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  const download = () => {
    if (!trial.canUse) return;
    downloadBlob(new Blob([output], { type: meta.mime }), `table.${meta.ext}`);
    trial.recordUse();
    toast.success("Table downloaded");
  };

  return (
    <ToolPageShell toolId="table-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Table Generator" left={trial.left} />

      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-bold">Click any cell to edit</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={addRow} className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50">
                <Plus className="h-3.5 w-3.5" /> Row
              </button>
              <button type="button" onClick={removeRow} disabled={rows.length <= 1} className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50 disabled:opacity-50">
                <Minus className="h-3.5 w-3.5" /> Row
              </button>
              <button type="button" onClick={addCol} className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50">
                <Plus className="h-3.5 w-3.5" /> Column
              </button>
              <button type="button" onClick={removeCol} disabled={cols <= 1} className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50 disabled:opacity-50">
                <Minus className="h-3.5 w-3.5" /> Column
              </button>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50">
                <input type="checkbox" checked={hasHeader} onChange={() => setHasHeader((v) => !v)} className="h-3.5 w-3.5 accent-primary" />
                Header row
              </label>
            </div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full border-collapse">
              <tbody>
                {rows.map((row, r) => (
                  <tr key={r} className={cn(hasHeader && r === 0 && "bg-muted/50")}>
                    {row.map((cell, c) => (
                      <td key={c} className="border border-border p-0">
                        <input
                          value={cell}
                          onChange={(e) => setCell(r, c, e.target.value)}
                          className={cn(
                            "w-full bg-transparent px-3 py-2 text-sm outline-none focus:bg-primary/5",
                            hasHeader && r === 0 && "font-bold",
                          )}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1 rounded-lg border border-border p-1">
              {FORMATS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFormat(f.id)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-bold transition",
                    format === f.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={copy}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
              <ActionButton busy={false} disabled={!trial.canUse} onClick={download}>
                <Download className="h-4 w-4" /> .{meta.ext}
              </ActionButton>
            </div>
          </div>
          <pre className="max-h-[440px] overflow-auto rounded-xl bg-muted/60 p-4 font-mono text-[13px] leading-relaxed">
            {output}
          </pre>
          {!isPro && (
            <p className="mt-3 text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free downloads left. Editing and copying are unlimited.
            </p>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
