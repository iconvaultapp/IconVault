// /tools/passport-photo-sheet - Arrange passport photos on a printable 4x6in
// or A4 sheet with cut guides, at 300 DPI. 100% in-browser.

import { useCallback, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileUp, Image as ImageIcon, LayoutGrid } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import {
  loadImageFile,
  drawCover,
  canvasToBlob,
  pngWithDpi,
} from "@/lib/image-tools";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/passport-photo-sheet")({
  head: () => {
    const seo = getToolSeoMeta("passport-photo-sheet");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: SheetTool,
});

const PX_PER_MM = 300 / 25.4;

const PHOTO_SIZES = [
  { id: "35x45", label: "35 x 45 mm (India, UK, EU)", w: 35, h: 45 },
  { id: "2x2", label: "2 x 2 in (US)", w: 50.8, h: 50.8 },
  { id: "51x51", label: "51 x 51 mm (OCI, visa)", w: 51, h: 51 },
];

const SHEETS = [
  { id: "4x6", label: "4 x 6 in", w: 101.6, h: 152.4 },
  { id: "a4", label: "A4", w: 210, h: 297 },
];

const selectCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none";
const numCls =
  "w-28 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none";
const labelCls = "mb-1.5 block text-[13px] font-medium text-foreground/80";

function capacity(sheetW: number, sheetH: number, photoW: number, photoH: number, gap: number) {
  const cols = Math.floor((sheetW + gap) / (photoW + gap));
  const rows = Math.floor((sheetH + gap) / (photoH + gap));
  return { cols: Math.max(0, cols), rows: Math.max(0, rows), total: Math.max(0, cols * rows) };
}

function SheetTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("passport-photo-sheet", isPro);
  const seo = getToolSeo("passport-photo-sheet");

  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [photoSizeId, setPhotoSizeId] = useState("35x45");
  const [sheetId, setSheetId] = useState("4x6");
  const [orientation, setOrientation] = useState<"auto" | "portrait" | "landscape">("auto");
  const [gapMm, setGapMm] = useState<0 | 2 | 5>(2);
  const [count, setCount] = useState(8);
  const [cutGuides, setCutGuides] = useState(true);
  const [thinBorder, setThinBorder] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<{ url: string; n: number; sheet: string; orient: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptFile = useCallback(async (f: File) => {
    if (!f.type.startsWith("image/")) {
      setError("Please choose an image file (JPG, PNG or WebP).");
      return;
    }
    try {
      const loaded = await loadImageFile(f);
      setImg(loaded);
      setName(f.name);
      setUrl(URL.createObjectURL(f));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that image.");
    }
  }, []);

  const onPaste = (e: React.ClipboardEvent) => {
    const f = e.clipboardData?.files?.[0];
    if (f && f.type.startsWith("image/")) {
      e.preventDefault();
      void acceptFile(f);
      toast.success("Image pasted");
    }
  };

  const photoSize = PHOTO_SIZES.find((p) => p.id === photoSizeId)!;
  const sheet = SHEETS.find((s) => s.id === sheetId)!;
  const capP = capacity(sheet.w, sheet.h, photoSize.w, photoSize.h, gapMm);
  const capL = capacity(sheet.h, sheet.w, photoSize.w, photoSize.h, gapMm);
  const usedOrient: "portrait" | "landscape" =
    orientation === "auto" ? (capL.total > capP.total ? "landscape" : "portrait") : orientation;
  const cap = usedOrient === "portrait" ? capP : capL;
  const sheetWmm = usedOrient === "portrait" ? sheet.w : sheet.h;
  const sheetHmm = usedOrient === "portrait" ? sheet.h : sheet.w;
  const want = Math.max(1, Math.min(Math.round(count), Math.max(1, cap.total)));

  const create = useCallback(async () => {
    if (!img || busy || !trial.canUse) return;
    setBusy(true);
    setError(null);
    try {
      const n = want;
      const usedCols = Math.min(cap.cols, n);
      const usedRows = Math.ceil(n / usedCols);
      const gridW = usedCols * photoSize.w + (usedCols - 1) * gapMm;
      const gridH = usedRows * photoSize.h + (usedRows - 1) * gapMm;
      const ox = (sheetWmm - gridW) / 2;
      const oy = (sheetHmm - gridH) / 2;

      const canvas = document.createElement("canvas");
      canvas.width = Math.round(sheetWmm * PX_PER_MM);
      canvas.height = Math.round(sheetHmm * PX_PER_MM);
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const mm = PX_PER_MM;
      let placed = 0;
      for (let r = 0; r < usedRows && placed < n; r++) {
        for (let c = 0; c < usedCols && placed < n; c++) {
          const x = (ox + c * (photoSize.w + gapMm)) * mm;
          const y = (oy + r * (photoSize.h + gapMm)) * mm;
          const wPx = photoSize.w * mm;
          const hPx = photoSize.h * mm;
          drawCover(ctx, img, img.naturalWidth, img.naturalHeight, x, y, wPx, hPx);
          if (thinBorder) {
            ctx.strokeStyle = "#999999";
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 0.5, y + 0.5, wPx - 1, hPx - 1);
          }
          if (cutGuides) {
            const inset = (gapMm / 2) * mm;
            ctx.save();
            ctx.strokeStyle = "#888888";
            ctx.lineWidth = Math.max(1, 0.3 * mm);
            ctx.setLineDash([6, 4]);
            ctx.strokeRect(x - inset, y - inset, wPx + inset * 2, hPx + inset * 2);
            ctx.restore();
          }
          placed++;
        }
      }

      const blob = await canvasToBlob(canvas, "image/png");
      const withDpi = await pngWithDpi(blob, 300);
      downloadBlob(withDpi, "passport-photo-sheet.png");
      setResult({
        url: URL.createObjectURL(withDpi),
        n,
        sheet: sheet.label,
        orient: usedOrient,
      });
      trial.recordUse();
      toast.success("Sheet downloaded");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the sheet.");
    } finally {
      setBusy(false);
    }
  }, [img, busy, trial, want, cap.cols, photoSize, gapMm, sheetWmm, sheetHmm, sheet.label, usedOrient, cutGuides, thinBorder]);

  const pillCls = (active: boolean) =>
    cn(
      "rounded-xl border px-4 py-2.5 text-sm font-bold transition",
      active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
    );

  return (
    <ToolPageShell toolId="passport-photo-sheet" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Passport Photo Sheet" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) void acceptFile(f); }}
            onPaste={onPaste}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition",
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
            )}
          >
            <FileUp className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold">{name || "Upload photo"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Drop, click, or paste from clipboard</p>
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void acceptFile(f); }} />
          </div>

          <div>
            <label className={labelCls}>Photo size</label>
            <select value={photoSizeId} onChange={(e) => setPhotoSizeId(e.target.value)} className={selectCls}>
              {PHOTO_SIZES.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>

          <div>
            <p className={labelCls}>Sheet</p>
            <div className="flex gap-2">
              {SHEETS.map((s) => (
                <button key={s.id} type="button" onClick={() => setSheetId(s.id)} className={pillCls(sheetId === s.id)}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className={labelCls}>Orientation</p>
            <div className="flex gap-2">
              {(["auto", "portrait", "landscape"] as const).map((o) => (
                <button key={o} type="button" onClick={() => setOrientation(o)} className={pillCls(orientation === o)}>
                  {o.charAt(0).toUpperCase() + o.slice(1)}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Auto picks the orientation that fits more photos.
            </p>
          </div>

          <div>
            <p className={labelCls}>Gap between photos</p>
            <div className="flex gap-2">
              {([0, 2, 5] as const).map((g) => (
                <button key={g} type="button" onClick={() => setGapMm(g)} className={pillCls(gapMm === g)}>
                  {g === 0 ? "None" : `${g} mm`}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Number of photos</label>
            <input type="number" min={1} value={count} onChange={(e) => setCount(Number(e.target.value) || 1)} className={numCls} />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Up to {cap.total} fit on this sheet ({cap.cols} x {cap.rows}).
            </p>
          </div>

          <div className="space-y-3">
            <label className="flex cursor-pointer items-center gap-2.5">
              <input type="checkbox" checked={cutGuides} onChange={(e) => setCutGuides(e.target.checked)} className="h-4 w-4 accent-primary" />
              <span className="text-sm font-medium">Cut guides</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2.5">
              <input type="checkbox" checked={thinBorder} onChange={(e) => setThinBorder(e.target.checked)} className="h-4 w-4 accent-primary" />
              <span className="text-sm font-medium">Thin border around each photo</span>
            </label>
          </div>

          <p className="rounded-xl border border-border bg-background/60 px-4 py-3 text-xs text-muted-foreground">
            Print at 100% / actual size, not fit to page, or the photo sizes will be wrong.
          </p>

          <ActionButton busy={busy} disabled={!img || cap.total === 0 || !trial.canUse} onClick={create}>
            <LayoutGrid className="h-4 w-4" /> {busy ? "Creating…" : "Create sheet"}
          </ActionButton>
          <p className="text-xs text-muted-foreground">
            Files never leave your device: everything runs in your browser.
          </p>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free sheets left.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {!result ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <ImageIcon className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your photo sheet appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Photos are laid out at 300 DPI with cut guides, ready to print and trim.
              </p>
              {url && (
                <img src={url} alt="Source photo" className="mt-6 max-h-48 rounded border border-border" />
              )}
            </div>
          ) : (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-4">
              <img src={result.url} alt="Passport photo sheet" className="max-h-[480px] max-w-full rounded border border-border bg-white" />
              <p className="text-sm font-medium text-muted-foreground">
                <Download className="mr-1 inline h-4 w-4" /> {result.n} photos on {result.sheet} ({result.orient}), 300 DPI
              </p>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
