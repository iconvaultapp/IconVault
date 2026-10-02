// /tools/photo-gps-extractor - Pull GPS coordinates out of photo EXIF data in
// your browser. Nothing is uploaded.

import { useCallback, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileUp, MapPin, Navigation } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/photo-gps-extractor")({
  head: () => {
    const seo = getToolSeoMeta("photo-gps-extractor");
    const canonical = "https://iconvault.site/tools/photo-gps-extractor";
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
  component: PhotoGpsExtractorTool,
});

interface GpsRow {
  id: string;
  name: string;
  lat: number | null;
  lon: number | null;
}

function PhotoGpsExtractorTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("photo-gps-extractor", isPro);
  const seo = getToolSeo("photo-gps-extractor");

  const [rows, setRows] = useState<GpsRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const found = rows.filter((r) => r.lat !== null && r.lon !== null);

  const scan = useCallback(async (list: FileList | File[]) => {
    const imgs = [...list].filter((f) => f.type.startsWith("image/"));
    if (imgs.length === 0) {
      setError("Please choose image files.");
      return;
    }
    if (!trial.canUse) return;
    setBusy(true);
    setError(null);
    try {
      const mod = await import("exifr");
      const exifr = (mod as any).default ?? mod;
      const out: GpsRow[] = [];
      for (const f of imgs) {
        let lat: number | null = null;
        let lon: number | null = null;
        try {
          const gps = await exifr.gps(f);
          if (gps && Number.isFinite(gps.latitude) && Number.isFinite(gps.longitude)) {
            lat = gps.latitude;
            lon = gps.longitude;
          }
        } catch {
          /* no GPS in this file */
        }
        out.push({ id: `${f.name}-${f.size}-${out.length}`, name: f.name, lat, lon });
      }
      setRows(out);
      trial.recordUse();
      const n = out.filter((r) => r.lat !== null).length;
      if (n === 0) toast.info("No GPS coordinates found in these photos");
      else toast.success(`Found GPS coordinates in ${n} photo${n > 1 ? "s" : ""}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scanning failed.");
    } finally {
      setBusy(false);
    }
  }, [trial]);

  const exportCsv = useCallback(() => {
    const lines = ["filename,latitude,longitude"];
    for (const r of found) lines.push(`"${r.name.replace(/"/g, '""')}",${r.lat},${r.lon}`);
    downloadBlob(new Blob([lines.join("\n")], { type: "text/csv" }), "photo-gps.csv");
    toast.success("CSV exported");
  }, [found]);

  return (
    <ToolPageShell toolId="photo-gps-extractor" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Photo GPS Extractor" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); void scan(e.dataTransfer.files); }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition",
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
            )}
          >
            <FileUp className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold">
              {rows.length > 0 ? `${rows.length} photo${rows.length > 1 ? "s" : ""} scanned` : "Drop photos here"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Scans EXIF GPS tags only</p>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => { if (e.target.files) void scan(e.target.files); e.target.value = ""; }}
            />
          </div>

          <ActionButton busy={busy} disabled={found.length === 0} onClick={exportCsv}>
            <Download className="h-4 w-4" /> {busy ? "Scanning…" : "Export CSV"}
          </ActionButton>
          <p className="text-xs text-muted-foreground">
            CSV export unlocks once at least one photo has coordinates. Files never leave your device.
          </p>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free scans left.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {rows.length === 0 ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <Navigation className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">GPS results appear here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Every photo is listed with its latitude and longitude when the camera recorded one,
                plus a one-click link to open the spot in a map.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-bold">Photo</th>
                    <th className="px-4 py-3 font-bold">Latitude</th>
                    <th className="px-4 py-3 font-bold">Longitude</th>
                    <th className="px-4 py-3 font-bold">Map</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0 odd:bg-muted/40">
                      <td className="max-w-[220px] truncate px-4 py-2.5 font-medium">{r.name}</td>
                      <td className="px-4 py-2.5 font-mono text-[13px]">
                        {r.lat === null ? <span className="text-muted-foreground">No GPS data</span> : r.lat.toFixed(6)}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[13px]">
                        {r.lon === null ? <span className="text-muted-foreground">No GPS data</span> : r.lon.toFixed(6)}
                      </td>
                      <td className="px-4 py-2.5">
                        {r.lat !== null && r.lon !== null ? (
                          <a
                            href={`https://www.google.com/maps?q=${r.lat},${r.lon}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                          >
                            <MapPin className="h-3.5 w-3.5" /> Open in maps
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
