// /tools/add-watermark - Stamp text or a logo onto a photo: font, size,
// color, opacity, 3x3 position presets and rotation. 100% in-browser.

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

export const Route = createFileRoute("/tools_/add-watermark")({
  head: () => {
    const seo = getToolSeoMeta("add-watermark");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: AddWatermarkTool,
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

type Pos = { x: "left" | "center" | "right"; y: "top" | "middle" | "bottom" };
const POSITIONS: Pos[] = [
  { x: "left", y: "top" }, { x: "center", y: "top" }, { x: "right", y: "top" },
  { x: "left", y: "middle" }, { x: "center", y: "middle" }, { x: "right", y: "middle" },
  { x: "left", y: "bottom" }, { x: "center", y: "bottom" }, { x: "right", y: "bottom" },
];

export type WatermarkOpts = {
  text: string;
  fontCss: string;
  bold: boolean;
  sizePct: number;
  color: string;
  opacity: number;
  pos: Pos;
  marginPct: number;
  rotation: number;
  logo: HTMLImageElement | null;
};

export function drawWatermark(ctx: CanvasRenderingContext2D, W: number, H: number, o: WatermarkOpts) {
  const margin = (o.marginPct / 100) * W;
  const ax = o.pos.x === "left" ? margin : o.pos.x === "center" ? W / 2 : W - margin;
  const ay = o.pos.y === "top" ? margin : o.pos.y === "middle" ? H / 2 : H - margin;

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, o.opacity / 100));
  ctx.translate(ax, ay);
  ctx.rotate((o.rotation * Math.PI) / 180);
  ctx.fillStyle = o.color;

  if (o.logo) {
    const targetW = (o.sizePct / 100) * W;
    const scale = targetW / o.logo.naturalWidth;
    const dw = o.logo.naturalWidth * scale;
    const dh = o.logo.naturalHeight * scale;
    ctx.drawImage(o.logo, -dw / 2, -dh / 2, dw, dh);
  } else {
    const fontPx = Math.max(4, (o.sizePct / 100) * W);
    ctx.font = `${o.bold ? "bold " : ""}${fontPx}px ${o.fontCss}`;
    ctx.textAlign = o.pos.x;
    ctx.textBaseline = o.pos.y === "top" ? "top" : o.pos.y === "middle" ? "middle" : "bottom";
    ctx.fillText(o.text || "Your name", 0, 0);
  }
  ctx.restore();
}

function AddWatermarkTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("add-watermark", isPro);
  const seo = getToolSeo("add-watermark");

  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<"text" | "logo">("text");
  const [text, setText] = useState("Your name");
  const [fontId, setFontId] = useState("arial");
  const [bold, setBold] = useState(true);
  const [sizePct, setSizePct] = useState(5);
  const [color, setColor] = useState("#ffffff");
  const [opacity, setOpacity] = useState(60);
  const [posIdx, setPosIdx] = useState(7);
  const [marginPct, setMarginPct] = useState(3);
  const [rotation, setRotation] = useState(0);
  const [logo, setLogo] = useState<HTMLImageElement | null>(null);
  const [logoName, setLogoName] = useState("");
  const [format, setFormat] = useState<"png" | "jpg">("png");
  const [quality, setQuality] = useState(92);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);

  const fontCss = FONTS.find((f) => f.id === fontId)?.css ?? "Arial, sans-serif";
  const opts: WatermarkOpts = {
    text, fontCss, bold, sizePct, color, opacity,
    pos: POSITIONS[posIdx]!, marginPct, rotation, logo,
  };

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

  useEffect(() => {
    const c = previewRef.current;
    if (!c || !img) return;
    const W = img.naturalWidth;
    const H = img.naturalHeight;
    const s = Math.min(1, 720 / Math.max(W, H));
    c.width = Math.max(1, Math.round(W * s));
    c.height = Math.max(1, Math.round(H * s));
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0, c.width, c.height);
    drawWatermark(ctx, c.width, c.height, { ...opts, sizePct, marginPct });
  }, [img, text, fontId, bold, sizePct, color, opacity, posIdx, marginPct, rotation, logo]);

  const apply = useCallback(async () => {
    if (!img || busy || !trial.canUse) return;
    if (type === "logo" && !logo) {
      setError("Upload a logo image first, or switch to text.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      drawWatermark(ctx, canvas.width, canvas.height, opts);
      const mime = format === "jpg" ? "image/jpeg" : "image/png";
      const blob = await canvasToBlob(canvas, mime, quality / 100);
      downloadBlob(blob, `${name || "watermarked"}.${format === "jpg" ? "jpg" : "png"}`);
      trial.recordUse();
      toast.success("Watermarked image downloaded");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed.");
    } finally {
      setBusy(false);
    }
  }, [img, busy, trial, type, logo, opts, format, quality, name]);

  return (
    <ToolPageShell toolId="add-watermark" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Add Watermark" left={trial.left} />

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
            <p className="mt-1 text-xs text-muted-foreground">Your stamp stays private on this device</p>
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void acceptFile(f); e.target.value = ""; }} />
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
              <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={bold}
                  onChange={(e) => setBold(e.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                Bold
              </label>
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
              max={25}
              value={sizePct}
              disabled={!img}
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
              disabled={!img}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Position</p>
            <div className="grid w-28 grid-cols-3 gap-1">
              {POSITIONS.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPosIdx(i)}
                  aria-label={`Position ${p.x} ${p.y}`}
                  className={cn(
                    "h-8 rounded-md border transition",
                    posIdx === i
                      ? "border-primary bg-primary/20"
                      : "border-border bg-muted/40 hover:border-primary/40",
                  )}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Margin</p>
              <span className="text-xs font-bold text-muted-foreground">{marginPct}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={20}
              value={marginPct}
              disabled={!img}
              onChange={(e) => setMarginPct(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Rotation</p>
              <span className="text-xs font-bold text-muted-foreground">{rotation} deg</span>
            </div>
            <input
              type="range"
              min={-45}
              max={45}
              value={rotation}
              disabled={!img}
              onChange={(e) => setRotation(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Format</p>
            <div className="flex gap-2">
              {(["png", "jpg"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormat(f)}
                  className={cn(
                    "rounded-xl border px-4 py-2 text-sm font-bold uppercase transition",
                    format === f
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {format === "jpg" && (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <p className="text-[13px] font-medium text-foreground/80">Quality</p>
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

          <ActionButton busy={busy} disabled={!img || !trial.canUse} onClick={apply}>
            <Download className="h-4 w-4" /> {busy ? "Working…" : "Add watermark"}
          </ActionButton>
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
              <p className="font-semibold">Your watermarked photo appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                The preview updates live as you change text, position, opacity and rotation.
              </p>
            </div>
          ) : (
            <canvas ref={previewRef} className="max-h-[560px] max-w-full rounded-xl" />
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
