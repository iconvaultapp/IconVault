// /tools/image-splitter - Slice one image into a grid of tiles, or into
// Instagram carousel slices. Download tiles one by one or as a ZIP.

import { useCallback, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileUp, Image as ImageIcon, Scissors } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/image-splitter";
import toolSeoMeta from "@/lib/tool-seo-meta-data/image-splitter";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import { loadImageFile, canvasToBlob, baseName, extForMime } from "@/lib/image-tools";

export const Route = createFileRoute("/tools_/image-splitter")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/image-splitter";
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
  component: ImageSplitterTool,
});

type Tile = { canvas: HTMLCanvasElement; label: string };

const PRESETS = [
  { label: "2x2", rows: 2, cols: 2, mode: "grid" as const },
  { label: "3x3 profile grid", rows: 3, cols: 3, mode: "grid" as const },
  { label: "2 halves", rows: 1, cols: 2, mode: "grid" as const },
  { label: "3 across", rows: 1, cols: 3, mode: "grid" as const },
];

const CAROUSEL_W = 1080;

function ImageSplitterTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("image-splitter", isPro);
  const seo = toolSeo;

  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"grid" | "carousel">("grid");
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [format, setFormat] = useState<"same" | "jpg" | "png" | "webp">("same");
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [tileUrls, setTileUrls] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const count = mode === "grid" ? Math.max(1, rows) * Math.max(1, cols) : Math.max(1, cols);

  const acceptFile = useCallback(async (f: File) => {
    if (!f.type.startsWith("image/")) {
      setError("Please choose a JPG, PNG or WebP image.");
      return;
    }
    try {
      const loaded = await loadImageFile(f);
      setImg(loaded);
      setFile(f);
      setTiles([]);
      setTileUrls([]);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that image.");
    }
  }, []);

  const mimeFor = useCallback((): string => {
    if (format === "same") return file?.type || "image/png";
    return format === "jpg" ? "image/jpeg" : `image/${format}`;
  }, [format, file]);

  const split = useCallback(async () => {
    if (!img || busy || !trial.canUse) return;
    setBusy(true);
    setError(null);
    try {
      const W = img.naturalWidth;
      const H = img.naturalHeight;
      const out: Tile[] = [];
      if (mode === "grid") {
        const r = Math.max(1, Math.min(10, rows));
        const c = Math.max(1, Math.min(10, cols));
        const tw = W / c;
        const th = H / r;
        for (let y = 0; y < r; y++) {
          for (let x = 0; x < c; x++) {
            const canvas = document.createElement("canvas");
            canvas.width = Math.max(1, Math.round(tw));
            canvas.height = Math.max(1, Math.round(th));
            canvas.getContext("2d")!.drawImage(img, x * tw, y * th, tw, th, 0, 0, canvas.width, canvas.height);
            out.push({ canvas, label: `tile-${y + 1}-${x + 1}` });
          }
        }
      } else {
        // Instagram carousel: 4:5 portrait slices panned across the width.
        const c = Math.max(1, Math.min(10, cols));
        let cropW = W / c;
        let cropH = cropW * 1.25;
        if (cropH > H) {
          cropH = H;
          cropW = cropH * 0.8;
        }
        const tileH = Math.round((CAROUSEL_W * cropH) / cropW);
        for (let i = 0; i < c; i++) {
          const sx = c === 1 ? 0 : (i * (W - cropW)) / (c - 1);
          const sy = (H - cropH) / 2;
          const canvas = document.createElement("canvas");
          canvas.width = CAROUSEL_W;
          canvas.height = tileH;
          canvas.getContext("2d")!.drawImage(img, sx, sy, cropW, cropH, 0, 0, CAROUSEL_W, tileH);
          out.push({ canvas, label: `carousel-${i + 1}` });
        }
      }
      setTiles(out);
      setTileUrls(out.map((t) => t.canvas.toDataURL("image/png")));
      trial.recordUse();
      toast.success(`Split into ${out.length} tiles`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Split failed.");
    } finally {
      setBusy(false);
    }
  }, [img, busy, trial, mode, rows, cols]);

  const downloadTile = useCallback(
    async (t: Tile) => {
      try {
        const blob = await canvasToBlob(t.canvas, mimeFor(), 0.92);
        downloadBlob(blob, `${baseName(file?.name ?? "split")}-${t.label}.${extForMime(blob.type)}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Download failed.");
      }
    },
    [mimeFor, file],
  );

  const downloadZip = useCallback(async () => {
    if (tiles.length === 0 || busy) return;
    setBusy(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const mime = mimeFor();
      for (const t of tiles) {
        const blob = await canvasToBlob(t.canvas, mime, 0.92);
        zip.file(`${baseName(file?.name ?? "split")}-${t.label}.${extForMime(blob.type)}`, blob);
      }
      const out = await zip.generateAsync({ type: "blob" });
      downloadBlob(out, `${baseName(file?.name ?? "split")}-tiles.zip`);
      toast.success("ZIP downloaded");
    } catch (e) {
      setError(e instanceof Error ? e.message : "ZIP failed.");
    } finally {
      setBusy(false);
    }
  }, [tiles, busy, mimeFor, file]);

  return (
    <ToolPageShell toolId="image-splitter" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Image Splitter" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
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
            <p className="text-sm font-semibold">{file ? file.name : "Drop an image"}</p>
            <p className="mt-1 text-xs text-muted-foreground">High resolution gives sharper tiles</p>
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void acceptFile(f); e.target.value = ""; }} />
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Mode</p>
            <div className="flex gap-2">
              {(
                [
                  { id: "grid", label: "Grid" },
                  { id: "carousel", label: "Instagram carousel" },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => { setMode(m.id); setTiles([]); setTileUrls([]); }}
                  className={cn(
                    "rounded-xl border px-4 py-2 text-sm font-bold transition",
                    mode === m.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {mode === "carousel" && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                Each slice is a 4:5 portrait, panned across your photo. Post tiles in reverse order for a profile grid.
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {mode === "grid" && (
              <div>
                <p className="mb-1 text-[13px] font-medium text-foreground/80">Rows</p>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={rows}
                  onChange={(e) => { setRows(Math.max(1, Math.min(10, Number(e.target.value) || 1))); setTiles([]); setTileUrls([]); }}
                  className="w-20 rounded-lg border border-border bg-background px-2.5 py-2 text-sm"
                  aria-label="Rows"
                />
              </div>
            )}
            <div>
              <p className="mb-1 text-[13px] font-medium text-foreground/80">{mode === "grid" ? "Columns" : "Slices"}</p>
              <input
                type="number"
                min={1}
                max={10}
                value={cols}
                onChange={(e) => { setCols(Math.max(1, Math.min(10, Number(e.target.value) || 1))); setTiles([]); setTileUrls([]); }}
                className="w-20 rounded-lg border border-border bg-background px-2.5 py-2 text-sm"
                aria-label="Columns"
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Presets</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => { setMode(p.mode); setRows(p.rows); setCols(p.cols); setTiles([]); setTileUrls([]); }}
                  className="rounded-xl border border-border px-3 py-2 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Format</p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { id: "same", label: "Same" },
                  { id: "jpg", label: "JPG" },
                  { id: "png", label: "PNG" },
                  { id: "webp", label: "WebP" },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFormat(f.id)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-sm font-bold transition",
                    format === f.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <ActionButton busy={busy} disabled={!img || !trial.canUse} onClick={split}>
            <Scissors className="h-4 w-4" /> {busy ? "Splitting…" : `Split into ${count} tile${count > 1 ? "s" : ""}`}
          </ActionButton>
          {tiles.length > 1 && (
            <button
              type="button"
              disabled={busy}
              onClick={downloadZip}
              className="w-full rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition hover:border-primary/50 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Download all as ZIP
            </button>
          )}
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free uses left, files never leave your device.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {tiles.length === 0 ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <ImageIcon className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your tiles appear here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Choose a mode and grid, split, then download each tile or grab them all as a ZIP. Tip: post tiles in reverse order for a profile grid.
              </p>
            </div>
          ) : (
            <div className={cn("grid gap-3", mode === "carousel" ? "grid-cols-2 sm:grid-cols-3" : tiles.length > 4 ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3")}>
              {tiles.map((t, i) => (
                <div key={t.label} className="overflow-hidden rounded-xl border border-border">
                  <img src={tileUrls[i]} alt={t.label} className="aspect-square w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => void downloadTile(t)}
                    className="flex w-full items-center justify-center gap-1.5 bg-muted/40 px-2 py-2 text-xs font-bold text-foreground/80 transition hover:bg-primary/10 hover:text-primary"
                  >
                    <Download className="h-3.5 w-3.5" /> {t.label}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
