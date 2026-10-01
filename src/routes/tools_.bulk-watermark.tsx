// /tools/bulk-watermark - Stamp a repeating tiled watermark across many
// photos at once, then download them all as a ZIP. 100% in-browser.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileUp, Image as ImageIcon, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import { loadImageFile, canvasToBlob, baseName, extForMime } from "@/lib/image-tools";

export const Route = createFileRoute("/tools_/bulk-watermark")({
  head: () => {
    const seo = getToolSeoMeta("bulk-watermark");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: BulkWatermarkTool,
});

const FONTS = [
  { id: "arial", label: "Arial", css: "Arial, sans-serif" },
  { id: "system", label: "System", css: "system-ui, sans-serif" },
  { id: "georgia", label: "Georgia", css: "Georgia, serif" },
  { id: "times", label: "Times", css: "'Times New Roman', serif" },
  { id: "mono", label: "Monospace", css: "ui-monospace, monospace" },
  { id: "verdana", label: "Verdana", css: "Verdana, sans-serif" },
  { id: "trebuchet", label: "Trebuchet", css: "'Trebuchet MS', sans-serif" },
  { id: "impact", label: "Impact", css: "Impact, sans-serif" },
] as const;

type Item = { id: number; name: string; url: string; img: HTMLImageElement };

let nextId = 1;

type TileOpts = {
  text: string;
  fontCss: string;
  sizePct: number;
  color: string;
  opacity: number;
  spacingPct: number;
  angle: number;
  logo: HTMLImageElement | null;
};

function renderTiled(canvas: HTMLCanvasElement, img: HTMLImageElement, o: TileOpts) {
  const W = img.naturalWidth;
  const H = img.naturalHeight;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);

  const unit = W / 100; // 1% of width
  const fontPx = Math.max(4, o.sizePct * unit);
  const gap = o.spacingPct * unit;

  let tileW: number;
  let tileH: number;
  if (o.logo) {
    const s = (o.sizePct * unit) / o.logo.naturalWidth;
    tileW = o.logo.naturalWidth * s;
    tileH = o.logo.naturalHeight * s;
  } else {
    ctx.font = `bold ${fontPx}px ${o.fontCss}`;
    tileW = ctx.measureText(o.text || "Your name").width;
    tileH = fontPx;
  }
  const stepX = tileW + gap;
  const stepY = tileH + gap;

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, o.opacity / 100));
  ctx.translate(W / 2, H / 2);
  ctx.rotate((o.angle * Math.PI) / 180);
  ctx.fillStyle = o.color;
  const diag = Math.sqrt(W * W + H * H);
  if (o.logo) {
    for (let y = -diag / 2; y < diag / 2; y += stepY) {
      for (let x = -diag / 2; x < diag / 2; x += stepX) {
        ctx.drawImage(o.logo, x, y, tileW, tileH);
      }
    }
  } else {
    ctx.font = `bold ${fontPx}px ${o.fontCss}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    for (let y = -diag / 2; y < diag / 2; y += stepY) {
      for (let x = -diag / 2; x < diag / 2; x += stepX) {
        ctx.fillText(o.text || "Your name", x, y);
      }
    }
  }
  ctx.restore();
}

function BulkWatermarkTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("bulk-watermark", isPro);
  const seo = getToolSeo("bulk-watermark");

  const [items, setItems] = useState<Item[]>([]);
  const [type, setType] = useState<"text" | "logo">("text");
  const [text, setText] = useState("Your name");
  const [fontId, setFontId] = useState("arial");
  const [sizePct, setSizePct] = useState(4);
  const [color, setColor] = useState("#ffffff");
  const [opacity, setOpacity] = useState(30);
  const [spacingPct, setSpacingPct] = useState(8);
  const [angle, setAngle] = useState(-30);
  const [logo, setLogo] = useState<HTMLImageElement | null>(null);
  const [logoName, setLogoName] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);

  const fontCss = FONTS.find((f) => f.id === fontId)?.css ?? "Arial, sans-serif";
  const opts: TileOpts = { text, fontCss, sizePct, color, opacity, spacingPct, angle, logo };

  const acceptFiles = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) {
      setError("Please choose image files (JPG, PNG, WebP).");
      return;
    }
    try {
      const loaded: Item[] = await Promise.all(
        list.map(async (f) => ({ id: nextId++, name: f.name, url: URL.createObjectURL(f), img: await loadImageFile(f) })),
      );
      setItems((p) => [...p, ...loaded]);
      setError(null);
    } catch {
      setError("Could not read one of those images.");
    }
  }, []);

  const removeItem = useCallback((id: number) => {
    setItems((p) => {
      const it = p.find((x) => x.id === id);
      if (it) URL.revokeObjectURL(it.url);
      return p.filter((x) => x.id !== id);
    });
  }, []);

  const acceptLogo = useCallback(async (f: File) => {
    if (!f.type.startsWith("image/")) {
      setError("Please choose an image file for the logo.");
      return;
    }
    try {
      const loaded = await loadImageFile(f);
      setLogo(loaded);
      setLogoName(f.name);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that logo.");
    }
  }, []);

  // Live preview of the first photo.
  useEffect(() => {
    const c = previewRef.current;
    const first = items[0];
    if (!c || !first) return;
    const W = first.img.naturalWidth;
    const H = first.img.naturalHeight;
    const s = Math.min(1, 720 / Math.max(W, H));
    const full = document.createElement("canvas");
    renderTiled(full, first.img, opts);
    c.width = Math.max(1, Math.round(W * s));
    c.height = Math.max(1, Math.round(H * s));
    c.getContext("2d")!.drawImage(full, 0, 0, c.width, c.height);
  }, [items, text, fontId, sizePct, color, opacity, spacingPct, angle, logo]);

  const watermarkAll = useCallback(async () => {
    if (items.length === 0 || busy || !trial.canUse) return;
    if (type === "logo" && !logo) {
      setError("Upload a logo image first, or switch to text.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      for (const it of items) {
        const canvas = document.createElement("canvas");
        renderTiled(canvas, it.img, opts);
        const blob = await canvasToBlob(canvas, "image/png");
        zip.file(`${baseName(it.name)}-watermarked.${extForMime(blob.type)}`, blob);
      }
      const out = await zip.generateAsync({ type: "blob" });
      downloadBlob(out, "watermarked-photos.zip");
      trial.recordUse();
      toast.success(`Watermarked ${items.length} photo${items.length > 1 ? "s" : ""}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Watermarking failed.");
    } finally {
      setBusy(false);
    }
  }, [items, busy, trial, type, logo, opts]);

  return (
    <ToolPageShell toolId="bulk-watermark" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Bulk Watermark" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); void acceptFiles(e.dataTransfer.files); }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition",
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
            )}
          >
            <FileUp className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold">{items.length === 0 ? "Drop your photos" : `${items.length} photo${items.length > 1 ? "s" : ""} ready`}</p>
            <p className="mt-1 text-xs text-muted-foreground">One tiled stamp, applied to every photo</p>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => { if (e.target.files) void acceptFiles(e.target.files); e.target.value = ""; }}
            />
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Watermark type</p>
            <div className="flex gap-2">
              {(
                [
                  { id: "text", label: "Text" },
                  { id: "logo", label: "Logo" },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id)}
                  className={cn(
                    "rounded-xl border px-4 py-2 text-sm font-bold transition",
                    type === t.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {type === "text" ? (
            <>
              <div>
                <p className="mb-1 text-[13px] font-medium text-foreground/80">Text</p>
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <p className="mb-1 text-[13px] font-medium text-foreground/80">Font</p>
                <select
                  value={fontId}
                  onChange={(e) => setFontId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  {FONTS.map((f) => (
                    <option key={f.id} value={f.id}>{f.label}</option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <div>
              <p className="mb-1 text-[13px] font-medium text-foreground/80">Logo image</p>
              <button
                type="button"
                onClick={() => logoRef.current?.click()}
                className="w-full rounded-xl border border-dashed border-border px-3 py-3 text-sm font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
              >
                {logoName || "Upload logo (PNG with transparency works best)"}
              </button>
              <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void acceptLogo(f); e.target.value = ""; }} />
            </div>
          )}

          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Size</p>
              <span className="text-xs font-bold text-muted-foreground">{sizePct}% of width</span>
            </div>
            <input
              type="range"
              min={1}
              max={15}
              value={sizePct}
              disabled={items.length === 0}
              onChange={(e) => setSizePct(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          {type === "text" && (
            <div>
              <p className="mb-2 text-[13px] font-medium text-foreground/80">Color</p>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded border border-border bg-transparent p-1"
                  aria-label="Watermark color"
                />
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-24 rounded-lg border border-border bg-background px-2 py-2 text-sm font-mono"
                  aria-label="Watermark color hex"
                />
              </div>
            </div>
          )}

          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Opacity</p>
              <span className="text-xs font-bold text-muted-foreground">{opacity}%</span>
            </div>
            <input
              type="range"
              min={5}
              max={100}
              value={opacity}
              disabled={items.length === 0}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Tile spacing</p>
              <span className="text-xs font-bold text-muted-foreground">{spacingPct}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={30}
              value={spacingPct}
              disabled={items.length === 0}
              onChange={(e) => setSpacingPct(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Angle</p>
              <span className="text-xs font-bold text-muted-foreground">{angle} deg</span>
            </div>
            <input
              type="range"
              min={-90}
              max={90}
              value={angle}
              disabled={items.length === 0}
              onChange={(e) => setAngle(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          <ActionButton busy={busy} disabled={items.length === 0 || !trial.canUse} onClick={watermarkAll}>
            <Download className="h-4 w-4" /> {busy ? "Working…" : `Watermark all (${items.length})`}
          </ActionButton>
          <p className="text-xs text-muted-foreground">Downloads a ZIP of PNGs, files never leave your device.</p>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free uses left.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {items.length === 0 ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <ImageIcon className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your tiled watermark preview appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                A repeating diagonal pattern across the whole photo makes it much harder to crop out.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {items.map((it) => (
                  <div key={it.id} className="group relative overflow-hidden rounded-lg border border-border">
                    <img src={it.url} alt={it.name} className="h-16 w-16 object-cover" />
                    <button
                      type="button"
                      onClick={() => removeItem(it.id)}
                      className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition group-hover:opacity-100"
                      aria-label={`Remove ${it.name}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed border-border text-muted-foreground transition hover:border-primary/40"
                  aria-label="Add more photos"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
              <div className="flex justify-center">
                <canvas ref={previewRef} className="max-h-[520px] max-w-full rounded-xl" />
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Preview of {items[0]!.name}, every photo gets the same pattern.
              </p>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
