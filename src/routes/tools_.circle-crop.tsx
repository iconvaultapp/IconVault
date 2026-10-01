// /tools/circle-crop - Crop any photo into a perfect circle with an optional
// colored border. Always PNG with transparent corners, 100% in-browser.

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as RPointerEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileUp, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import { loadImageFile, canvasToBlob, baseName } from "@/lib/image-tools";

export const Route = createFileRoute("/tools_/circle-crop")({
  head: () => {
    const seo = getToolSeoMeta("circle-crop");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: CircleCropTool,
});

const DISPLAY = 520;
const OUT_SIZES = ["256", "512", "1024", "original"] as const;

function drawCircleCrop(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  side: number,
  dispScale: number, // side / DISPLAY
  zoom: number,
  ox: number,
  oy: number,
  borderPx: number,
  borderColor: string,
) {
  const k = dispScale;
  canvas.width = side;
  canvas.height = side;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, side, side);
  const R = side / 2;
  const base = DISPLAY / Math.min(img.naturalWidth, img.naturalHeight);
  const dw = img.naturalWidth * base * zoom * k;
  const dh = img.naturalHeight * base * zoom * k;
  const cx = side / 2 + ox * k;
  const cy = side / 2 + oy * k;
  ctx.save();
  ctx.beginPath();
  ctx.arc(R, R, R, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
  ctx.restore();
  const bw = borderPx * k;
  if (bw > 0) {
    ctx.beginPath();
    ctx.arc(R, R, Math.max(0, R - bw / 2), 0, Math.PI * 2);
    ctx.lineWidth = bw;
    ctx.strokeStyle = borderColor;
    ctx.stroke();
  }
}

function clampOffset(
  img: HTMLImageElement,
  zoom: number,
  ox: number,
  oy: number,
): { ox: number; oy: number } {
  const base = DISPLAY / Math.min(img.naturalWidth, img.naturalHeight);
  const dw = img.naturalWidth * base * zoom;
  const dh = img.naturalHeight * base * zoom;
  const mx = Math.max(0, (dw - DISPLAY) / 2);
  const my = Math.max(0, (dh - DISPLAY) / 2);
  return { ox: Math.min(mx, Math.max(-mx, ox)), oy: Math.min(my, Math.max(-my, oy)) };
}

function CircleCropTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("circle-crop", isPro);
  const seo = getToolSeo("circle-crop");

  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [name, setName] = useState("");
  const [zoom, setZoom] = useState(1);
  const [off, setOff] = useState({ ox: 0, oy: 0 });
  const [outSize, setOutSize] = useState<(typeof OUT_SIZES)[number]>("512");
  const [border, setBorder] = useState(0);
  const [borderColor, setBorderColor] = useState("#0f766e");
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const acceptFile = useCallback(async (f: File) => {
    if (!f.type.startsWith("image/")) {
      setError("Please choose a JPG, PNG or WebP image.");
      return;
    }
    try {
      const loaded = await loadImageFile(f);
      setImg(loaded);
      setName(baseName(f.name));
      setZoom(1);
      setOff({ ox: 0, oy: 0 });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that image.");
    }
  }, []);

  const outSide = img
    ? outSize === "original"
      ? Math.min(img.naturalWidth, img.naturalHeight)
      : Number(outSize)
    : 512;

  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !img) return;
    drawCircleCrop(c, img, DISPLAY, 1, zoom, off.ox, off.oy, border, borderColor);
  }, [img, zoom, off, border, borderColor]);

  const toCanvasPoint = (e: RPointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * DISPLAY,
      y: ((e.clientY - rect.top) / rect.height) * DISPLAY,
    };
  };

  const onPointerDown = (e: RPointerEvent) => {
    if (!img) return;
    const p = toCanvasPoint(e);
    dragRef.current = { x: p.x, y: p.y, ox: off.ox, oy: off.oy };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: RPointerEvent) => {
    const d = dragRef.current;
    if (!d || !img) return;
    const p = toCanvasPoint(e);
    setOff(clampOffset(img, zoom, d.ox + (p.x - d.x), d.oy + (p.y - d.y)));
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  const download = useCallback(async () => {
    if (!img || busy || !trial.canUse) return;
    setBusy(true);
    setError(null);
    try {
      const canvas = document.createElement("canvas");
      drawCircleCrop(canvas, img, outSide, outSide / DISPLAY, zoom, off.ox, off.oy, border, borderColor);
      const blob = await canvasToBlob(canvas, "image/png");
      downloadBlob(blob, `${name || "circle-crop"}.png`);
      trial.recordUse();
      toast.success("Circle crop downloaded");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed.");
    } finally {
      setBusy(false);
    }
  }, [img, busy, trial, outSide, zoom, off, border, borderColor, name]);

  return (
    <ToolPageShell toolId="circle-crop" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Circle Crop" left={trial.left} />

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
            <p className="text-sm font-semibold">{name || "Drop an image"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Drag the photo inside the circle to position it</p>
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void acceptFile(f); e.target.value = ""; }} />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Zoom</p>
              <span className="text-xs font-bold text-muted-foreground">{zoom.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              disabled={!img}
              onChange={(e) => {
                const z = Number(e.target.value);
                setZoom(z);
                if (img) setOff((o) => clampOffset(img, z, o.ox, o.oy));
              }}
              className="w-full accent-primary"
            />
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Output size</p>
            <div className="flex flex-wrap gap-2">
              {OUT_SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setOutSize(s)}
                  className={cn(
                    "rounded-xl border px-3.5 py-2 text-sm font-bold transition",
                    outSize === s
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {s === "original" ? "Original" : `${s}px`}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Border width</p>
              <span className="text-xs font-bold text-muted-foreground">{border === 0 ? "Off" : `${border}px`}</span>
            </div>
            <input
              type="range"
              min={0}
              max={40}
              value={border}
              disabled={!img}
              onChange={(e) => setBorder(Number(e.target.value))}
              className="w-full accent-primary"
            />
            {border > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="color"
                  value={borderColor}
                  onChange={(e) => setBorderColor(e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent p-1"
                  aria-label="Border color"
                />
                <input
                  type="text"
                  value={borderColor}
                  onChange={(e) => setBorderColor(e.target.value)}
                  className="w-24 rounded-lg border border-border bg-background px-2 py-1.5 text-sm font-mono"
                  aria-label="Border color hex"
                />
              </div>
            )}
          </div>

          <ActionButton busy={busy} disabled={!img || !trial.canUse} onClick={download}>
            <Download className="h-4 w-4" /> {busy ? "Working…" : "Download PNG"}
          </ActionButton>
          <p className="text-xs text-muted-foreground">
            Always PNG with transparent corners, {outSide}x{outSide}px.
          </p>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free uses left, files never leave your device.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-border bg-card p-6">
          {!img ? (
            <div className="flex flex-col items-center justify-center text-center">
              <ImageIcon className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your circle crop appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Perfect for profile pictures and avatars. Drag to reposition, zoom in, add a border.
              </p>
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              width={DISPLAY}
              height={DISPLAY}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              className="max-h-[520px] max-w-full cursor-grab touch-none active:cursor-grabbing"
              style={{ backgroundImage: "repeating-conic-gradient(#80808033 0 25%, transparent 0 50%)", backgroundSize: "20px 20px" }}
            />
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
