// /tools/exif-viewer - Read a photo's EXIF metadata (camera, date, GPS,
// exposure) 100% in your browser. The photo is never uploaded.

import { useCallback, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Camera, ClipboardCopy, FileUp, MapPin } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import { formatBytes, baseName } from "@/lib/image-tools";

export const Route = createFileRoute("/tools_/exif-viewer")({
  head: () => {
    const seo = getToolSeoMeta("exif-viewer");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: ExifViewerTool,
});

interface Row {
  label: string;
  value: string;
  mapsUrl?: string;
}

function fmtExposure(v: unknown): string {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return String(v);
  if (n >= 1) return `${n} s`;
  const inv = Math.round(1 / n);
  return `1/${inv} s`;
}

function fmtNumber(v: unknown, suffix = ""): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return `${Math.round(n * 100) / 100}${suffix}`;
}

function fmtDate(v: unknown): string {
  if (v instanceof Date) return v.toLocaleString();
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString();
}

function dms(lat: number, lon: number): string {
  const la = `${Math.abs(lat).toFixed(6)}° ${lat >= 0 ? "N" : "S"}`;
  const lo = `${Math.abs(lon).toFixed(6)}° ${lon >= 0 ? "E" : "W"}`;
  return `${la}, ${lo}`;
}

function buildRows(tags: Record<string, any>, gps: { latitude: number; longitude: number } | null): Row[] {
  const rows: Row[] = [];
  const camera = [tags["Make"], tags["Model"]].filter(Boolean).join(" ").trim();
  if (camera) rows.push({ label: "Camera", value: camera });
  if (tags["LensModel"]) rows.push({ label: "Lens", value: String(tags["LensModel"]) });
  const taken = tags["DateTimeOriginal"] ?? tags["CreateDate"] ?? tags["ModifyDate"];
  if (taken) rows.push({ label: "Date taken", value: fmtDate(taken) });
  const w = tags["ImageWidth"] ?? tags["ExifImageWidth"] ?? tags["PixelXDimension"];
  const h = tags["ImageHeight"] ?? tags["ExifImageHeight"] ?? tags["PixelYDimension"];
  if (w && h) rows.push({ label: "Dimensions", value: `${w} × ${h} px` });
  if (tags["ExposureTime"]) rows.push({ label: "Exposure", value: fmtExposure(tags["ExposureTime"]) });
  if (tags["FNumber"]) rows.push({ label: "Aperture", value: `f/${fmtNumber(tags["FNumber"])}` });
  if (tags["ISO"] ?? tags["ISOSpeedRatings"]) rows.push({ label: "ISO", value: String(tags["ISO"] ?? tags["ISOSpeedRatings"]) });
  if (tags["FocalLength"]) rows.push({ label: "Focal length", value: fmtNumber(tags["FocalLength"], " mm") });
  if (tags["FocalLengthIn35mmFormat"]) rows.push({ label: "Focal length (35mm)", value: `${tags["FocalLengthIn35mmFormat"]} mm` });
  if (tags["Flash"] !== undefined) rows.push({ label: "Flash", value: String(tags["Flash"]).includes("Fired") || Number(tags["Flash"]) % 2 === 1 ? "Fired" : "Did not fire" });
  if (tags["WhiteBalance"] !== undefined) rows.push({ label: "White balance", value: Number(tags["WhiteBalance"]) === 1 ? "Manual" : "Auto" });
  if (tags["Orientation"]) rows.push({ label: "Orientation", value: String(tags["Orientation"]) });
  if (tags["ColorSpace"]) rows.push({ label: "Color space", value: String(tags["ColorSpace"]) });
  if (tags["Software"]) rows.push({ label: "Software", value: String(tags["Software"]) });
  if (gps && Number.isFinite(gps.latitude) && Number.isFinite(gps.longitude)) {
    rows.push({
      label: "GPS location",
      value: dms(gps.latitude, gps.longitude),
      mapsUrl: `https://www.google.com/maps?q=${gps.latitude},${gps.longitude}`,
    });
  }
  return rows;
}

function ExifViewerTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("exif-viewer", isPro);
  const seo = getToolSeo("exif-viewer");

  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [previewUrl, setPreviewUrl] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [rawJson, setRawJson] = useState("");
  const [showRaw, setShowRaw] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const readFile = useCallback(async (f: File) => {
    if (!f.type.startsWith("image/")) {
      setError("Please choose an image file (JPG, PNG, WebP, HEIC...).");
      return;
    }
    if (!trial.canUse) return;
    setBusy(true);
    setError(null);
    try {
      const mod = await import("exifr");
      const exifr = (mod as any).default ?? mod;
      const tags = (await exifr.parse(f)) ?? {};
      let gps: { latitude: number; longitude: number } | null = null;
      try {
        gps = await exifr.gps(f);
      } catch {
        gps = null;
      }
      const r = buildRows(tags as Record<string, any>, gps);
      setRows(r);
      setRawJson(JSON.stringify({ file: f.name, size: f.size, exif: tags, gps }, null, 2));
      setHasData(true);
      setFileName(f.name);
      setFileSize(f.size);
      setPreviewUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(f);
      });
      trial.recordUse();
      if (r.length === 0) toast.info("No EXIF metadata found in this image");
      else toast.success(`Found ${r.length} metadata fields`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read metadata from that file.");
    } finally {
      setBusy(false);
    }
  }, [trial]);

  const copyJson = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(rawJson);
      toast.success("Metadata copied as JSON");
    } catch {
      downloadBlob(new Blob([rawJson], { type: "application/json" }), `${baseName(fileName) || "photo"}-exif.json`);
      toast.success("Metadata downloaded as JSON");
    }
  }, [rawJson, fileName]);

  return (
    <ToolPageShell toolId="exif-viewer" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="EXIF Viewer" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) void readFile(f); }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition",
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
            )}
          >
            <FileUp className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold">{fileName || "Drop a photo here"}</p>
            <p className="mt-1 text-xs text-muted-foreground">JPG, PNG, WebP, HEIC and more</p>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void readFile(f); e.target.value = ""; }}
            />
          </div>

          <div className="rounded-xl bg-muted/60 p-4 text-xs leading-relaxed text-muted-foreground">
            <p className="font-semibold text-foreground">Private by design</p>
            <p className="mt-1">
              Read in your browser. The photo is never uploaded. EXIF can reveal your camera, the
              exact time a photo was taken, and sometimes your GPS location, so check before you share.
            </p>
          </div>

          {hasData && (
            <ActionButton busy={busy} disabled={!trial.canUse} onClick={copyJson}>
              <ClipboardCopy className="h-4 w-4" /> Copy all as JSON
            </ActionButton>
          )}
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free reads left, files never leave your device.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {!hasData ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <Camera className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Metadata appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Drop a photo to see its camera model, capture date, exposure settings, dimensions
                and GPS location in a clean table.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-4">
                {previewUrl && (
                  <img src={previewUrl} alt={fileName} className="h-20 w-20 rounded-lg object-cover" />
                )}
                <div>
                  <p className="font-bold">{fileName}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(fileSize)}</p>
                </div>
              </div>
              {rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  This image carries no EXIF metadata. Screenshots, downloaded web images and
                  photos stripped by social apps usually have none.
                </p>
              ) : (
                <div className="overflow-hidden rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.label} className="border-b border-border last:border-0 odd:bg-muted/40">
                          <td className="w-40 px-4 py-2.5 font-semibold text-muted-foreground">{r.label}</td>
                          <td className="px-4 py-2.5">
                            <span className="mr-2">{r.value}</span>
                            {r.mapsUrl && (
                              <a
                                href={r.mapsUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                              >
                                <MapPin className="h-3.5 w-3.5" /> Open in maps
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <button
                type="button"
                onClick={() => setShowRaw((v) => !v)}
                className="text-xs font-bold text-primary hover:underline"
              >
                {showRaw ? "Hide raw JSON" : "Show raw JSON"}
              </button>
              {showRaw && (
                <pre className="max-h-72 overflow-auto rounded-xl bg-muted/60 p-4 text-[11px] leading-relaxed">
                  {rawJson}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
