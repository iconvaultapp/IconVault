// /tools/grafana-dashboard-generator - Build an import-ready Grafana dashboard
// JSON with a visual panel builder, 100% client-side.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Download, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/grafana-dashboard-generator";
import toolSeoMeta from "@/lib/tool-seo-meta-data/grafana-dashboard-generator";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/grafana-dashboard-generator")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/grafana-dashboard-generator";
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
  component: GrafanaTool,
});

type PanelType = "timeseries" | "stat" | "gauge";

interface Panel {
  id: number;
  title: string;
  type: PanelType;
  expr: string;
  unit: string;
}

const TYPES: PanelType[] = ["timeseries", "stat", "gauge"];
const UNITS = ["none", "percent", "percentunit", "bytes", "bytes_per_sec", "ms", "seconds", "ops", "reqps", "currency"];

let nextId = 1;

function defaultPanels(): Panel[] {
  return [
    { id: nextId++, title: "Request rate", type: "timeseries", expr: 'rate(http_requests_total[5m])', unit: "reqps" },
    { id: nextId++, title: "Error rate", type: "stat", expr: 'rate(http_requests_total{status=~"5.."}[5m])', unit: "percentunit" },
  ];
}

function buildDashboard(title: string, uid: string, panels: Panel[]): string {
  const w = 12;
  const grafanaPanels = panels.map((p, i) => {
    const row = Math.floor(i / 2);
    const col = i % 2;
    return {
      id: i + 1,
      title: p.title,
      type: p.type,
      datasource: { type: "prometheus", uid: "prometheus" },
      targets: [{ refId: "A", expr: p.expr, datasource: { type: "prometheus", uid: "prometheus" } }],
      fieldConfig: {
        defaults: { unit: p.unit === "none" ? "none" : p.unit },
        overrides: [],
      },
      gridPos: { h: p.type === "timeseries" ? 8 : 4, w: p.type === "timeseries" ? w : 6, x: p.type === "timeseries" ? 0 : col * 6, y: row * 8 },
      options: {},
    };
  });
  return (
    JSON.stringify(
      {
        uid: uid || "generated-dashboard",
        title: title || "Generated Dashboard",
        timezone: "browser",
        schemaVersion: 39,
        version: 1,
        panels: grafanaPanels,
      },
      null,
      2,
    ) + "\n"
  );
}

const inputCls =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary/60";

function GrafanaTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("grafana-dashboard-generator", isPro);
  const seo = toolSeo;

  const [dashTitle, setDashTitle] = useState("My Service Overview");
  const [uid, setUid] = useState("my-service-overview");
  const [panels, setPanels] = useState<Panel[]>(defaultPanels);

  const json = useMemo(() => buildDashboard(dashTitle, uid, panels), [dashTitle, uid, panels]);

  const update = (id: number, patch: Partial<Panel>) =>
    setPanels((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const remove = (id: number) => setPanels((ps) => ps.filter((p) => p.id !== id));
  const add = () =>
    setPanels((ps) => [...ps, { id: nextId++, title: "New panel", type: "timeseries", expr: 'up{job="my-job"}', unit: "none" }]);

  const copy = async () => {
    if (!panels.length) return;
    try {
      await navigator.clipboard.writeText(json);
      trial.recordUse();
      toast.success("Dashboard JSON copied");
    } catch {
      toast.error("Copy failed. Your browser blocked clipboard access.");
    }
  };

  const download = () => {
    if (!panels.length || !trial.canUse) return;
    downloadBlob(new Blob([json], { type: "application/json" }), `${uid || "dashboard"}.json`);
    trial.recordUse();
    toast.success("Dashboard JSON downloaded");
  };

  return (
    <ToolPageShell toolId="grafana-dashboard-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Grafana Dashboard Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <label className="mb-2 block text-[13px] font-medium text-foreground/80">Dashboard title</label>
            <input value={dashTitle} onChange={(e) => setDashTitle(e.target.value)} className={inputCls} placeholder="My Service Overview" />
          </div>
          <div>
            <label className="mb-2 block text-[13px] font-medium text-foreground/80">UID</label>
            <input
              value={uid}
              onChange={(e) => setUid(e.target.value.replace(/[^a-zA-Z0-9-_]/g, ""))}
              className={inputCls}
              placeholder="my-service-overview"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Panels ({panels.length})</p>
              <button
                type="button"
                onClick={add}
                className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold transition hover:border-primary/40"
              >
                <Plus className="h-3.5 w-3.5" /> Add panel
              </button>
            </div>
            {panels.length === 0 && (
              <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                No panels yet. Add one to start building the dashboard.
              </p>
            )}
            {panels.map((p) => (
              <div key={p.id} className="space-y-2 rounded-xl border border-border p-3">
                <div className="flex items-center gap-2">
                  <input
                    value={p.title}
                    onChange={(e) => update(p.id, { title: e.target.value })}
                    className={cn(inputCls, "flex-1")}
                    placeholder="Panel title"
                  />
                  <button
                    type="button"
                    onClick={() => remove(p.id)}
                    title="Remove panel"
                    className="rounded-lg border border-border p-2 text-muted-foreground transition hover:border-red-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select value={p.type} onChange={(e) => update(p.id, { type: e.target.value as PanelType })} className={inputCls}>
                    {TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <select value={p.unit} onChange={(e) => update(p.id, { unit: e.target.value })} className={inputCls}>
                    {UNITS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <input
                  value={p.expr}
                  onChange={(e) => update(p.id, { expr: e.target.value })}
                  className={cn(inputCls, "font-mono text-xs")}
                  placeholder="PromQL expression"
                />
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <ActionButton disabled={!panels.length} onClick={copy}>
              <Copy className="h-4 w-4" /> Copy JSON
            </ActionButton>
            <ActionButton disabled={!panels.length || !trial.canUse} onClick={download}>
              <Download className="h-4 w-4" /> Download
            </ActionButton>
          </div>
          <p className="text-xs text-muted-foreground">
            Import it in Grafana under Dashboards, New, Import. Datasource UID is assumed "prometheus".
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {panels.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
              <p className="font-semibold">No panels to show</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Add panels on the left and the import-ready dashboard JSON appears here live.
              </p>
            </div>
          ) : (
            <div>
              <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {panels.map((p) => (
                  <div key={p.id} className="rounded-xl border border-border bg-muted/30 p-3">
                    <p className="truncate text-sm font-semibold">{p.title || "Untitled"}</p>
                    <p className="text-xs text-muted-foreground">{p.type} · {p.unit}</p>
                    <p className="mt-1 truncate font-mono text-xs text-primary">{p.expr || "no query"}</p>
                  </div>
                ))}
              </div>
              <p className="mb-2 text-[13px] font-medium text-foreground/80">Live dashboard JSON</p>
              <pre className="max-h-[420px] overflow-auto rounded-xl bg-[#0d1117] p-4 font-mono text-xs leading-relaxed text-[#c9d1d9]">
                {json}
              </pre>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
