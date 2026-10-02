// /tools/add-border - Put a colored frame around a photo: width, color,
// rounded corners, drop shadow. Auto-PNG when transparency is needed.

import { useCallback, useEffect, useRef, useState } from "react";
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

export const Route = createFileRoute("/tools_/add-border")({
  head: () => {
    const seo = getToolSeoMeta("add-border");
    const canonical = "https://iconvault.site/tools/add-border";
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
  component: AddBorderTool,
});

const SHADOW_PAD = 28;

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function renderBordered(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  widthVal: number,
  unit: "px" | "%",
  color: string,
  transparent: boolean,
  rounded: number,
  shadow: boolean,
  scale: number,
) {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const bw = Math.round(unit === "%" ? (Math.min(w, h) * widthVal) / 100 : widthVal);
  const pad = shadow ? SHADOW_PAD : 0;
  canvas.width = Math.max(1, Math.round((w + bw * 2 + pad * 2) * scale));
  canvas.height = Math.max(1, Math.round((h + bw * 2 + pad * 2) * scale));
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.scale(scale, scale);

  const outerX = 0;
  const outerY = 0;
  const outerW = w + bw * 2 + pad * 2;
  const outerH = h + bw * 2 + pad * 2;
  const imgX = bw + pad;
  const imgY = bw + pad;
  const outerR = rounded + bw;

  if (rounded > 0) {
    roundedRectPath(ctx, outerX, outerY, outerW, outerH, outerR);
    ctx.clip();
  }

  // Border background (skip when fully transparent).
  if (!transparent) {
    ctx.fillStyle = color;
    ctx.fillRect(outerX, outerY, outerW, outerH);
  }

  // Photo with optional drop shadow.
  if (shadow) {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 10;
    if (rounded > 0) {
      roundedRectPath(ctx, imgX, imgY, w, h, rounded);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
    }
    ctx.drawImage(img, imgX, imgY, w, h);
    ctx.restore();
  } else if (rounded > 0) {
    ctx.save();
    roundedRectPath(ctx, imgX, imgY, w, h, rounded);
    ctx.clip();
    ctx.drawImage(img, imgX, imgY, w, h);
    ctx.restore();
  } else {
    ctx.drawImage(img, imgX, imgY, w, h);
  }
}

function AddBorderTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("add-border", isPro);
  const seo = getToolSeo("add-border");

  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [name, setName] = useState("");
  const [widthVal, setWidthVal] = useState(20);
  const [unit, setUnit] = useState<"px" | "%">("px");
  const [color, setColor] = useState("#0f766e");
  const [transparent, setTransparent] = useState(false);
  const [rounded, setRounded] = useState(0);
  const [shadow, setShadow] = useState(false);
  const [quality, setQuality] = useState(92);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);

  const acceptFile = useCallback(async (f: File) => {
    if (!f.type.startsWith("image/")) {
      setError("Please choose a JPG, PNG or WebP image.");
      return;
    }
    try {
      const loaded = await loadImageFile(f);
      setImg(loaded);
      setName(baseName(f.name));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that image.");
    }
  }, []);

  const needsPng = transparent || rounded > 0 || shadow;

  useEffect(() => {
    const c = previewRef.current;
    if (!c || !img) return;
    const bw = unit === "%" ? (Math.min(img.naturalWidth, img.naturalHeight) * widthVal) / 100 : widthVal;
    const pad = shadow ? SHADOW_PAD : 0;
    const totalW = img.naturalWidth + bw * 2 + pad * 2;
    const totalH = img.naturalHeight + bw * 2 + pad * 2;
    const s = Math.min(1, 520 / Math.max(totalW, totalH));
    renderBordered(c, img, widthVal, unit, color, transparent, rounded, shadow, s);
  }, [img, widthVal, unit, color, transparent, rounded, shadow]);

  const download = useCallback(async () => {
    if (!img || busy || !trial.canUse) return;
    setBusy(true);
    setError(null);
    try {
      const canvas = document.createElement("canvas");
      renderBordered(canvas, img, widthVal, unit, color, transparent, rounded, shadow, 1);
      const mime = needsPng ? "image/png" : "image/jpeg";
      const blob = await canvasToBlob(canvas, mime, quality / 100);
      downloadBlob(blob, `${name || "bordered"}.${mime === "image/png" ? "png" : "jpg"}`);
      trial.recordUse();
      toast.success("Bordered image downloaded");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed.");
    } finally {
      setBusy(false);
    }
  }, [img, busy, trial, widthVal, unit, color, transparent, rounded, shadow, quality, needsPng, name]);

  return (
    <ToolPageShell toolId="add-border" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Add Border" left={trial.left} />

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
            <p className="mt-1 text-xs text-muted-foreground">A clean frame, ready for social posts</p>
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void acceptFile(f); e.target.value = ""; }} />
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Border width</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={500}
                value={widthVal}
                onChange={(e) => setWidthVal(Math.max(0, Number(e.target.value) || 0))}
                className="w-24 rounded-lg border border-border bg-background px-2.5 py-2 text-sm"
                aria-label="Border width"
              />
              <div className="flex gap-1">
                {(["px", "%"] as const).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUnit(u)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-sm font-bold transition",
                      unit === u
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">% is relative to the shortest side.</p>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Border color</p>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => { setColor(e.target.value); setTransparent(false); }}
                className="h-10 w-14 cursor-pointer rounded border border-border bg-transparent p-1"
                aria-label="Border color"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => { setColor(e.target.value); setTransparent(false); }}
                className="w-24 rounded-lg border border-border bg-background px-2 py-2 text-sm font-mono"
                aria-label="Border color hex"
              />
              <button
                type="button"
                onClick={() => setTransparent((t) => !t)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm font-semibold transition",
                  transparent
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                Transparent
              </button>
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Rounded corners</p>
              <span className="text-xs font-bold text-muted-foreground">{rounded === 0 ? "Off" : `${rounded}px`}</span>
            </div>
            <input
              type="range"
              min={0}
              max={120}
              value={rounded}
              disabled={!img}
              onChange={(e) => setRounded(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium">
            <input
              type="checkbox"
              checked={shadow}
              onChange={(e) => setShadow(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            Drop shadow
          </label>

          {!needsPng && (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <p className="text-[13px] font-medium text-foreground/80">JPG quality</p>
                <span className="text-xs font-bold text-muted-foreground">{quality}</span>
              </div>
              <input
                type="range"
                min={50}
                max={100}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
          )}

          <ActionButton busy={busy} disabled={!img || !trial.canUse} onClick={download}>
            <Download className="h-4 w-4" /> {busy ? "Working…" : `Download ${needsPng ? "PNG" : "JPG"}`}
          </ActionButton>
          <p className="text-xs text-muted-foreground">
            {needsPng
              ? "Exports as PNG automatically, because the border, corners or shadow need transparency."
              : "Exports as JPG. Transparent border, rounded corners or shadow switch to PNG."}
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
              <p className="font-semibold">Your framed photo appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Set the width, pick a color, round the corners or add a soft drop shadow.
              </p>
            </div>
          ) : (
            <div
              className="max-h-[560px] max-w-full overflow-auto"
              style={{ backgroundImage: needsPng ? "repeating-conic-gradient(#80808033 0 25%, transparent 0 50%)" : undefined, backgroundSize: "20px 20px" }}
            >
              <canvas ref={previewRef} className="max-w-full" />
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
