// /tools/chart-builder - Build bar, line, and pie charts from editable data
// rows, restyle with palettes, download as PNG. 100% in-browser.

import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2, Copy, Check, Download, BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export const Route = createFileRoute("/tools_/chart-builder")({
  head: () => {
    const seo = getToolSeoMeta("chart-builder");
    const canonical = "https://iconvault.site/tools/chart-builder";
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
  component: ChartBuilderTool,
});

type ChartType = "bar" | "line" | "pie";

interface Row {
  id: number;
  label: string;
  value: number;
}

let rowId = 0;
const mkRow = (label: string, value: number): Row => ({ id: ++rowId, label, value });

const PALETTES: { name: string; colors: string[] }[] = [
  { name: "Vibrant", colors: ["#6366f1", "#f43f5e", "#f59e0b", "#10b981", "#0ea5e9", "#8b5cf6", "#ec4899", "#84cc16"] },
  { name: "Ocean", colors: ["#0ea5e9", "#0284c7", "#0369a1", "#38bdf8", "#7dd3fc", "#0c4a6e", "#075985", "#bae6fd"] },
  { name: "Sunset", colors: ["#f97316", "#ef4444", "#f59e0b", "#fb7185", "#fbbf24", "#ea580c", "#fda4af", "#fdba74"] },
  { name: "Forest", colors: ["#10b981", "#059669", "#047857", "#34d399", "#6ee7b7", "#065f46", "#a7f3d0", "#14b8a6"] },
  { name: "Mono", colors: ["#1e293b", "#475569", "#64748b", "#94a3b8", "#cbd5e1", "#334155", "#0f172a", "#e2e8f0"] },
];

const TYPES: { id: ChartType; name: string; icon: typeof BarChart3 }[] = [
  { id: "bar", name: "Bar", icon: BarChart3 },
  { id: "line", name: "Line", icon: LineChartIcon },
  { id: "pie", name: "Pie", icon: PieChartIcon },
];

function ChartBuilderTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("chart-builder", isPro);
  const seo = getToolSeo("chart-builder");

  const [rows, setRows] = useState<Row[]>([
    mkRow("Jan", 42),
    mkRow("Feb", 58),
    mkRow("Mar", 35),
    mkRow("Apr", 72),
    mkRow("May", 64),
    mkRow("Jun", 88),
  ]);
  const [type, setType] = useState<ChartType>("bar");
  const [paletteIdx, setPaletteIdx] = useState(0);
  const [title, setTitle] = useState("Monthly sales");
  const [xLabel, setXLabel] = useState("Month");
  const [yLabel, setYLabel] = useState("Revenue");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const chartWrapRef = useRef<HTMLDivElement>(null);

  const palette = PALETTES[paletteIdx]!.colors;
  const colorAt = (i: number): string => palette[i % palette.length] ?? "#6366f1";

  const data = useMemo(
    () => rows.map((r, i) => ({ name: r.label || `Item ${i + 1}`, value: r.value, fill: colorAt(i) })),
    [rows, palette],
  );

  const updateRow = (id: number, patch: Partial<Row>) =>
    setRows((p) => p.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const addRow = () => {
    if (rows.length >= 12) {
      toast.error("Maximum 12 rows.");
      return;
    }
    setRows((p) => [...p, mkRow(`Item ${p.length + 1}`, 50)]);
  };

  const removeRow = (id: number) => {
    if (rows.length <= 2) {
      toast.error("A chart needs at least 2 rows.");
      return;
    }
    setRows((p) => p.filter((r) => r.id !== id));
  };

  const copyJson = async () => {
    const json = JSON.stringify({ title, type, xAxis: xLabel, yAxis: yLabel, data: rows.map((r) => ({ label: r.label, value: r.value })) }, null, 2);
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      toast.success("Data copied as JSON");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  const downloadPng = async () => {
    if (busy || !trial.canUse) return;
    const svg = chartWrapRef.current?.querySelector("svg");
    if (!svg) {
      toast.error("Chart is not ready yet.");
      return;
    }
    setBusy(true);
    try {
      const rect = svg.getBoundingClientRect();
      const clone = svg.cloneNode(true) as SVGSVGElement;
      clone.setAttribute("width", String(Math.round(rect.width)));
      clone.setAttribute("height", String(Math.round(rect.height)));
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      const xml = new XMLSerializer().serializeToString(clone);
      const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Could not render the chart image."));
        img.src = url;
      });
      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(rect.width * scale);
      canvas.height = Math.round(rect.height * scale);
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, rect.width, rect.height);
      URL.revokeObjectURL(url);
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
      if (!blob) throw new Error("Could not encode PNG.");
      downloadBlob(blob, `${title || "chart"}.png`);
      trial.recordUse();
      toast.success("Chart PNG downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "PNG export failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolPageShell toolId="chart-builder" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Chart Builder" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Chart type</p>
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-bold transition",
                    type === t.id ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40",
                  )}
                >
                  <t.icon className="h-4 w-4" /> {t.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Data rows</p>
              <button
                type="button"
                onClick={addRow}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:border-primary/40"
              >
                <Plus className="h-3.5 w-3.5" /> Add row
              </button>
            </div>
            <div className="max-h-56 space-y-2 overflow-auto pr-1">
              {rows.map((r, i) => (
                <div key={r.id} className="flex items-center gap-2">
                  <span className="h-5 w-5 shrink-0 rounded" style={{ background: colorAt(i) }} />
                  <input
                    type="text"
                    value={r.label}
                    onChange={(e) => updateRow(r.id, { label: e.target.value })}
                    placeholder="Label"
                    className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
                  />
                  <input
                    type="number"
                    value={r.value}
                    onChange={(e) => updateRow(r.id, { value: Number(e.target.value) || 0 })}
                    className="w-20 rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => removeRow(r.id)}
                    aria-label="Remove row"
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Color palette</p>
            <div className="flex flex-wrap gap-2">
              {PALETTES.map((pal, i) => (
                <button
                  key={pal.name}
                  type="button"
                  onClick={() => setPaletteIdx(i)}
                  title={pal.name}
                  className={cn(
                    "flex items-center gap-0.5 rounded-xl border p-2 transition",
                    paletteIdx === i ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40",
                  )}
                >
                  {pal.colors.slice(0, 5).map((c) => (
                    <span key={c} className="h-5 w-5 rounded-full border border-white/40" style={{ background: c }} />
                  ))}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Chart title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">X axis label</label>
                <input
                  type="text"
                  value={xLabel}
                  onChange={(e) => setXLabel(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Y axis label</label>
                <input
                  type="text"
                  value={yLabel}
                  onChange={(e) => setYLabel(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <ActionButton busy={busy} disabled={!trial.canUse} onClick={downloadPng}>
                <Download className="h-4 w-4" /> {busy ? "Exporting…" : "Download PNG"}
              </ActionButton>
            </div>
            <button
              type="button"
              onClick={copyJson}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-3 text-sm font-bold hover:border-primary/40"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} JSON
            </button>
          </div>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free PNG exports left - charts render locally with recharts.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-4 text-center text-lg font-bold">{title || "Untitled chart"}</p>
          <div ref={chartWrapRef} className="h-[420px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {type === "bar" ? (
                <BarChart data={data} margin={{ top: 8, right: 16, bottom: 32, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" label={{ value: xLabel, position: "insideBottom", offset: -18, fontSize: 12 }} fontSize={12} />
                  <YAxis label={{ value: yLabel, angle: -90, position: "insideLeft", fontSize: 12 }} fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {data.map((d, i) => (
                      <Cell key={i} fill={d.fill} />
                    ))}
                  </Bar>
                </BarChart>
              ) : type === "line" ? (
                <LineChart data={data} margin={{ top: 8, right: 16, bottom: 32, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" label={{ value: xLabel, position: "insideBottom", offset: -18, fontSize: 12 }} fontSize={12} />
                  <YAxis label={{ value: yLabel, angle: -90, position: "insideLeft", fontSize: 12 }} fontSize={12} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke={colorAt(0)} strokeWidth={3} dot={{ fill: colorAt(0) }} />
                </LineChart>
              ) : (
                <PieChart>
                  <Pie data={data} dataKey="value" nameKey="name" outerRadius="75%" label={({ name }) => name} fontSize={12}>
                    {data.map((d, i) => (
                      <Cell key={i} fill={d.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
