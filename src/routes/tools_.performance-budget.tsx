// /tools/performance-budget - Scan this page's real network assets or enter
// a manual asset list, set per-type budgets, get pass/fail and rough load
// time estimates. All in your browser.

import { useCallback, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ScanLine, Plus, Trash2, Download, Info, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/tools_/performance-budget")({
  head: () => {
    const seo = getToolSeoMeta("performance-budget");
    const canonical = "https://iconvault.site/tools/performance-budget";
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
  component: PerformanceBudgetTool,
});

type AssetType = "js" | "css" | "img" | "font" | "other";
type Asset = { name: string; type: AssetType; kb: number };

const TYPE_LABEL: Record<AssetType, string> = { js: "JavaScript", css: "CSS", img: "Images", font: "Fonts", other: "Other" };
const DEFAULT_BUDGETS: Record<AssetType, number> = { js: 300, css: 150, img: 1000, font: 200, other: 500 };

const NETWORKS = [
  { name: "Slow 3G", mbps: 0.4, note: "Rural mobile" },
  { name: "4G", mbps: 9, note: "Typical mobile" },
  { name: "WiFi", mbps: 30, note: "Broadband" },
];

function classify(initiator: string, name: string): AssetType {
  const n = name.toLowerCase();
  if (initiator === "script" || /\.m?js($|\?)/.test(n)) return "js";
  if (initiator === "css" || /\.css($|\?)/.test(n)) return "css";
  if (initiator === "img" || /\.(png|jpe?g|webp|avif|gif|svg|ico)($|\?)/.test(n)) return "img";
  if (initiator === "font" || /\.(woff2?|ttf|otf)($|\?)/.test(n)) return "font";
  return "other";
}

function shortName(url: string): string {
  try {
    const u = new URL(url, window.location.href);
    const parts = u.pathname.split("/").filter(Boolean);
    return parts.slice(-2).join("/") || u.hostname;
  } catch {
    return url.slice(0, 60);
  }
}

function formatKb(kb: number): string {
  return kb >= 1024 ? `${(kb / 1024).toFixed(2)} MB` : `${Math.round(kb)} KB`;
}

function PerformanceBudgetTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("performance-budget", isPro);
  const seo = getToolSeo("performance-budget");

  const [assets, setAssets] = useState<Asset[]>([]);
  const [scanned, setScanned] = useState(false);
  const [budgets, setBudgets] = useState<Record<AssetType, number>>(DEFAULT_BUDGETS);
  const [rowName, setRowName] = useState("");
  const [rowKb, setRowKb] = useState("");
  const [rowType, setRowType] = useState<AssetType>("js");

  const scan = useCallback(() => {
    if (!trial.canUse) return;
    const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    const list: Asset[] = entries.map((e) => {
      const bytes = e.transferSize || e.encodedBodySize || e.decodedBodySize || 0;
      return { name: shortName(e.name), type: classify(e.initiatorType, e.name), kb: bytes / 1024 };
    }).filter((a) => a.kb > 0.5);
    list.sort((a, b) => b.kb - a.kb);
    setAssets(list);
    setScanned(true);
    trial.recordUse();
    toast.success(`Found ${list.length} assets on this page`);
  }, [trial]);

  const addRow = () => {
    const kb = parseFloat(rowKb);
    if (!rowName.trim() || Number.isNaN(kb) || kb < 0) {
      toast.error("Enter a name and a size in KB.");
      return;
    }
    setAssets((p) => [...p, { name: rowName.trim(), type: rowType, kb }].sort((a, b) => b.kb - a.kb));
    setRowName("");
    setRowKb("");
  };

  const totals = useMemo(() => {
    const t: Record<AssetType, number> = { js: 0, css: 0, img: 0, font: 0, other: 0 };
    for (const a of assets) t[a.type] += a.kb;
    return t;
  }, [assets]);

  const totalKb = Object.values(totals).reduce((a, b) => a + b, 0);
  const totalBits = totalKb * 1024 * 8;

  const exportCsv = useCallback(() => {
    if (!trial.canUse || assets.length === 0) return;
    const rows = ["name,type,kb", ...assets.map((a) => `"${a.name.replace(/"/g, '""')}",${a.type},${a.kb.toFixed(1)}`)];
    downloadBlob(new Blob([rows.join("\n")], { type: "text/csv" }), "performance-budget.csv");
    trial.recordUse();
    toast.success("CSV exported");
  }, [assets, trial]);

  const budgetRows = (Object.keys(TYPE_LABEL) as AssetType[]).map((t) => ({
    type: t,
    used: totals[t],
    budget: budgets[t],
    pass: totals[t] <= budgets[t],
  }));
  const allPass = budgetRows.every((r) => r.pass);

  return (
    <ToolPageShell toolId="performance-budget" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Performance Budget" left={trial.left} />

      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-border bg-card p-4 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-muted-foreground">
          Set a weight budget per asset type and see what passes. "Scan this page" reads the real network assets of <span className="font-semibold text-foreground">this page</span>. Load times are rough estimates from total weight alone: they ignore latency, render blocking and caching.
        </p>
      </div>

      <Tabs defaultValue="scan">
        <TabsList className="mb-5">
          <TabsTrigger value="scan">Scan this page</TabsTrigger>
          <TabsTrigger value="manual">Manual asset list</TabsTrigger>
        </TabsList>

        <TabsContent value="scan">
          <div className="rounded-2xl border border-border bg-card p-5">
            {!scanned ? (
              <div className="flex min-h-[200px] flex-col items-center justify-center text-center">
                <ScanLine className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="font-semibold">Read this page's real assets</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">Uses the browser's Resource Timing API. Cached assets may report 0 bytes.</p>
                <div className="mt-4">
                  <ActionButton busy={false} disabled={!trial.canUse} onClick={scan}>
                    <ScanLine className="h-4 w-4" /> Scan this page
                  </ActionButton>
                </div>
              </div>
            ) : (
              <AssetReport
                assets={assets}
                totals={totals}
                totalKb={totalKb}
                totalBits={totalBits}
                budgets={budgets}
                setBudgets={setBudgets}
                budgetRows={budgetRows}
                allPass={allPass}
                onExport={exportCsv}
                canExport={trial.canUse}
                onRescan={scan}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="manual">
          <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
            <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
              <h2 className="text-sm font-bold">Add asset</h2>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={rowName} onChange={(e) => setRowName(e.target.value)} placeholder="app.bundle.js" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Size (KB)</Label>
                  <Input value={rowKb} onChange={(e) => setRowKb(e.target.value)} inputMode="decimal" placeholder="180" />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={rowType} onValueChange={(v) => setRowType(v as AssetType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(TYPE_LABEL) as AssetType[]).map((t) => (
                        <SelectItem key={t} value={t}>{TYPE_LABEL[t]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <button type="button" onClick={addRow} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90">
                <Plus className="h-4 w-4" /> Add asset
              </button>
              {assets.length > 0 && (
                <button type="button" onClick={() => { setAssets([]); setScanned(false); }} className="w-full rounded-xl border border-border px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:border-red-500/50 hover:text-red-500">
                  Clear list
                </button>
              )}
              <p className="text-xs text-muted-foreground">Planning a new page? List the assets you expect to ship and check them against your budgets.</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              {assets.length === 0 ? (
                <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
                  <p className="font-semibold">No assets yet</p>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">Add rows on the left, then set budgets below to see pass or fail.</p>
                </div>
              ) : (
                <AssetReport
                  assets={assets}
                  totals={totals}
                  totalKb={totalKb}
                  totalBits={totalBits}
                  budgets={budgets}
                  setBudgets={setBudgets}
                  budgetRows={budgetRows}
                  allPass={allPass}
                  onExport={exportCsv}
                  canExport={trial.canUse}
                  onRemove={(i) => setAssets((p) => p.filter((_, j) => j !== i))}
                />
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {!isPro && (
        <p className="mt-4 text-xs text-muted-foreground">{trial.left} of {TOOL_TRIAL_LIMIT} free scan/export uses left.</p>
      )}
    </ToolPageShell>
  );
}

function AssetReport({
  assets, totals, totalKb, totalBits, budgets, setBudgets, budgetRows, allPass, onExport, canExport, onRescan, onRemove,
}: {
  assets: Asset[];
  totals: Record<AssetType, number>;
  totalKb: number;
  totalBits: number;
  budgets: Record<AssetType, number>;
  setBudgets: (b: Record<AssetType, number>) => void;
  budgetRows: { type: AssetType; used: number; budget: number; pass: boolean }[];
  allPass: boolean;
  onExport: () => void;
  canExport: boolean;
  onRescan?: () => void;
  onRemove?: (i: number) => void;
}) {
  return (
    <div className="space-y-6">
      <div className={cn(
        "flex items-center gap-3 rounded-2xl border p-4",
        allPass ? "border-emerald-500/40 bg-emerald-500/5" : "border-red-500/40 bg-red-500/5",
      )}>
        {allPass ? <CheckCircle2 className="h-6 w-6 text-emerald-600" /> : <XCircle className="h-6 w-6 text-red-500" />}
        <div>
          <p className="font-bold">{allPass ? "All budgets pass" : "Over budget"}</p>
          <p className="text-sm text-muted-foreground">Total weight: <span className="font-mono font-bold text-foreground">{formatKb(totalKb)}</span> across {assets.length} assets</p>
        </div>
        <div className="ml-auto flex gap-2">
          {onRescan && (
            <button type="button" onClick={onRescan} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold transition hover:border-primary/40">
              <ScanLine className="h-4 w-4" /> Re-scan
            </button>
          )}
          <button type="button" onClick={onExport} disabled={!canExport} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold transition hover:border-primary/40 disabled:opacity-40">
            <Download className="h-4 w-4" /> CSV
          </button>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold">Budgets per type (KB)</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {budgetRows.map((r) => (
            <div key={r.type} className={cn("rounded-xl border p-3", r.pass ? "border-border" : "border-red-500/50")}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold">{TYPE_LABEL[r.type]}</p>
                {r.pass
                  ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  : <XCircle className="h-4 w-4 text-red-500" />}
              </div>
              <Input
                value={String(budgets[r.type])}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!Number.isNaN(v) && v >= 0) setBudgets({ ...budgets, [r.type]: v });
                }}
                inputMode="numeric"
                className="mt-2 font-mono"
                aria-label={`${TYPE_LABEL[r.type]} budget in KB`}
              />
              <p className="mt-1.5 font-mono text-xs text-muted-foreground">{formatKb(r.used)} used</p>
              <Progress value={r.budget > 0 ? Math.min(100, (r.used / r.budget) * 100) : 0} className={cn("mt-1.5 h-1.5", !r.pass && "[&>div]:bg-red-500")} />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold">Estimated load time (weight only)</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {NETWORKS.map((n) => {
            const seconds = totalBits / (n.mbps * 1_000_000);
            return (
              <div key={n.name} className="rounded-xl border border-border p-4 text-center">
                <p className="text-xs font-bold text-muted-foreground">{n.name} <span className="font-normal">({n.note})</span></p>
                <p className="mt-1 text-3xl font-black tabular-nums">{seconds < 60 ? `${seconds.toFixed(1)}s` : `${(seconds / 60).toFixed(1)}m`}</p>
                <p className="text-xs text-muted-foreground">{n.mbps} Mbps</p>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Simple division of total bytes by throughput. Real loads add DNS, TLS, latency and render blocking on top.</p>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold">Assets ({assets.length})</h3>
        <div className="max-h-[320px] overflow-y-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Size</TableHead>
                {onRemove && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map((a, i) => (
                <TableRow key={`${a.name}-${i}`}>
                  <TableCell className="max-w-[280px] truncate font-mono text-[13px]" title={a.name}>{a.name}</TableCell>
                  <TableCell><span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{TYPE_LABEL[a.type]}</span></TableCell>
                  <TableCell className="text-right font-mono text-[13px] tabular-nums">{formatKb(a.kb)}</TableCell>
                  {onRemove && (
                    <TableCell className="text-right">
                      <button type="button" onClick={() => onRemove(i)} title="Remove" className="rounded-lg p-1.5 text-red-500 hover:bg-muted">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
