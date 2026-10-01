// /tools/source-map-explorer - Upload a .js.map file and see which
// sources it contains, with approximate byte weights from mapping
// counts. 100% client-side; nothing is uploaded.

import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FileUp, Map as MapIcon, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/tools_/source-map-explorer")({
  head: () => {
    const seo = getToolSeoMeta("source-map-explorer");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: SourceMapExplorerTool,
});

interface SourceStat {
  name: string;
  mappings: number;
  approxBytes: number;
}

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const B64_MAP: Record<string, number> = {};
for (let i = 0; i < B64.length; i++) B64_MAP[B64[i] as string] = i;

function decodeVLQSegment(seg: string): number[] {
  const out: number[] = [];
  let value = 0;
  let shift = 0;
  for (const ch of seg) {
    const digit = B64_MAP[ch];
    if (digit === undefined) throw new Error(`Invalid base64 character "${ch}" in mappings.`);
    const cont = digit & 32;
    value += (digit & 31) << shift;
    shift += 5;
    if (!cont) {
      const neg = value & 1;
      value >>= 1;
      out.push(neg ? -value : value);
      value = 0;
      shift = 0;
    }
  }
  return out;
}

/** Count mappings per source index from the mappings string. */
function countMappings(mappings: string, sourceCount: number): { counts: number[]; total: number } {
  const counts = new Array<number>(sourceCount).fill(0);
  let total = 0;
  const lines = mappings.split(";");
  for (const line of lines) {
    if (!line) continue;
    let srcIdx = 0;
    for (const seg of line.split(",")) {
      if (!seg) continue;
      const fields = decodeVLQSegment(seg);
      if (fields.length >= 4) {
        srcIdx += fields[1] as number;
        if (srcIdx >= 0 && srcIdx < sourceCount) {
          counts[srcIdx] = (counts[srcIdx] as number) + 1;
          total++;
        }
      }
    }
  }
  return { counts, total };
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1048576).toFixed(2)} MB`;
}

function SourceMapExplorerTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("source-map-explorer", isPro);
  const seo = getToolSeo("source-map-explorer");

  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [stats, setStats] = useState<SourceStat[] | null>(null);
  const [totalMappings, setTotalMappings] = useState(0);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptFile = async (f: File) => {
    if (!trial.canUse || busy) return;
    setBusy(true);
    setError(null);
    try {
      const text = await f.text();
      let map: { version?: number; sources?: unknown; mappings?: unknown; sourcesContent?: unknown[] };
      try {
        map = JSON.parse(text) as typeof map;
      } catch {
        throw new Error("That file is not valid JSON.");
      }
      if (map.version !== 3) throw new Error("Only source map version 3 is supported.");
      if (!Array.isArray(map.sources)) throw new Error("No sources array found in this map.");
      if (typeof map.mappings !== "string") throw new Error("No mappings string found in this map.");
      const sources = map.sources as string[];
      const { counts, total } = countMappings(map.mappings, sources.length);
      // Approximate weight: distribute the file size across sources by mapping share.
      const list: SourceStat[] = sources
        .map((name, i) => ({
          name,
          mappings: counts[i] as number,
          approxBytes: total > 0 ? Math.round(((counts[i] as number) / total) * f.size) : 0,
        }))
        .sort((a, b) => b.mappings - a.mappings);
      setStats(list);
      setTotalMappings(total);
      setFileName(f.name);
      setFileSize(f.size);
      setFilter("");
      trial.recordUse();
      toast.success(`Analyzed ${sources.length} sources.`);
    } catch (e) {
      setStats(null);
      setError(e instanceof Error ? e.message : "Could not read that source map.");
    } finally {
      setBusy(false);
    }
  };

  const filtered = (stats ?? []).filter((s) => s.name.toLowerCase().includes(filter.toLowerCase()));
  const maxMappings = Math.max(1, ...((stats ?? []).map((s) => s.mappings)));

  return (
    <ToolPageShell toolId="source-map-explorer" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Source Map Explorer" left={trial.left} />

      <div className="mb-6 rounded-2xl border border-border bg-card p-5">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) void acceptFile(f); }}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition",
            dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
          )}
        >
          <FileUp className="mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-semibold">{fileName || "Drop a .js.map file"}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {busy ? "Analyzing…" : "Source maps never leave your device"}
          </p>
          <input ref={inputRef} type="file" accept=".map,application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void acceptFile(f); }} />
        </div>
        {!isPro && (
          <p className="mt-2 text-xs text-muted-foreground">
            {trial.left} of {TOOL_TRIAL_LIMIT} free analyses left - runs fully in your browser, nothing is uploaded.
          </p>
        )}
        {error && <p className="mt-2 text-sm font-medium text-red-500">{error}</p>}
      </div>

      {!stats ? (
        <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-border bg-card text-center">
          <MapIcon className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="font-semibold">Source breakdown appears here</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Sources are listed by mapping count with approximate byte weights.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "File", value: fileName },
              { label: "Map size", value: formatBytes(fileSize) },
              { label: "Sources", value: String(stats.length) },
              { label: "Mappings", value: totalMappings.toLocaleString() },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-card p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{s.label}</p>
                <p className="mt-0.5 truncate font-mono text-sm font-bold" title={s.value}>{s.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <Label className="text-[13px] font-medium text-foreground/80">Sources by weight</Label>
              <div className="relative w-56">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Filter sources"
                  className="pl-8 text-sm"
                />
              </div>
            </div>
            <div className="max-h-[480px] space-y-2 overflow-y-auto">
              {filtered.map((s) => (
                <div key={s.name} className="rounded-lg bg-muted/60 px-3 py-2">
                  <div className="mb-1 flex items-baseline justify-between gap-3">
                    <p className="truncate font-mono text-[13px] font-semibold" title={s.name}>{s.name}</p>
                    <p className="shrink-0 text-xs text-muted-foreground">
                      ~{formatBytes(s.approxBytes)} · {s.mappings.toLocaleString()} mappings
                    </p>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-border/60">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${Math.max(1, (s.mappings / maxMappings) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
              {filtered.length === 0 && <p className="text-sm text-muted-foreground">No sources match that filter.</p>}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Weights are approximate: they are estimated from each source's share of VLQ mapping counts,
              not from exact byte ranges in the bundle.
            </p>
          </div>
        </div>
      )}
    </ToolPageShell>
  );
}
