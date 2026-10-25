// /tools/mockup-studio - Turn any screenshot into a device mockup: pick a
// frame, set background/padding/shadow, download a PNG. Everything runs in
// the browser; the image never leaves the device.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createLazyFileRoute } from "@tanstack/react-router";
import { Download, FileUp, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/mockup-studio";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";
import { loadImageFile, canvasToBlob, baseName } from "@/lib/image-tools";
import {
  BG_PRESETS,
  MOCKUP_FRAMES,
  fitRect,
  layoutFor,
  roundedRectPath,
  type BgPreset,
  type MockupFrame,
} from "@/lib/mockup-frames";

export const Route = createLazyFileRoute("/tools_/mockup-studio")({
  component: MockupStudioTool,
});

const SAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><rect width="1200" height="800" fill="#ffffff"/><rect width="1200" height="72" fill="#0f766e"/><circle cx="64" cy="36" r="20" fill="#ffffff"/><rect x="100" y="26" width="140" height="20" rx="10" fill="#ffffff"/><rect x="900" y="26" width="70" height="20" rx="10" fill="#99f6e4"/><rect x="990" y="26" width="70" height="20" rx="10" fill="#99f6e4"/><rect x="1080" y="26" width="70" height="20" rx="10" fill="#99f6e4"/><rect x="80" y="140" width="520" height="44" rx="8" fill="#111827"/><rect x="80" y="204" width="420" height="44" rx="8" fill="#111827"/><rect x="80" y="280" width="640" height="20" rx="10" fill="#9ca3af"/><rect x="80" y="312" width="560" height="20" rx="10" fill="#d1d5db"/><rect x="80" y="372" width="180" height="52" rx="26" fill="#0d7a68"/><rect x="80" y="480" width="340" height="220" rx="16" fill="#ccfbf1"/><rect x="430" y="480" width="340" height="220" rx="16" fill="#e0e7ff"/><rect x="780" y="480" width="340" height="220" rx="16" fill="#fce7f3"/><rect x="110" y="510" width="280" height="16" rx="8" fill="#0f766e"/><rect x="110" y="540" width="220" height="12" rx="6" fill="#5b7280"/><rect x="460" y="510" width="280" height="16" rx="8" fill="#4338ca"/><rect x="460" y="540" width="220" height="12" rx="6" fill="#5b7280"/><rect x="810" y="510" width="280" height="16" rx="8" fill="#be185d"/><rect x="810" y="540" width="220" height="12" rx="6" fill="#5b7280"/></svg>`;

const SAMPLE_SRC = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(SAMPLE_SVG)}`;

const CATEGORIES = ["Phones", "Tablets", "Laptops", "Desktops", "Watches", "Browsers"] as const;

function renderMockup(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  frame: MockupFrame,
  colorBody: string,
  bg: BgPreset,
  customBg: string,
  paddingPct: number,
  shadow: number,
  fit: "cover" | "contain",
  scale: number,
  fileName: string,
): void {
  const unit = layoutFor(frame, 1000);
  const pad = Math.round((1000 * paddingPct) / 100);
  const bezelH = unit.totalH - unit.baseH - unit.standH;
  canvas.width = Math.max(1, Math.round((unit.totalW + pad * 2) * scale));
  canvas.height = Math.max(1, Math.round((unit.totalH + pad * 2) * scale));
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.scale(scale, scale);

  // Background.
  const bgFill = bg.id === "custom" ? { type: "solid" as const, color: customBg } : bg.canvas;
  if (bgFill) {
    if (bgFill.type === "solid") {
      ctx.fillStyle = bgFill.color;
      ctx.fillRect(0, 0, unit.totalW + pad * 2, unit.totalH + pad * 2);
    } else {
      const rad = (bgFill.angle * Math.PI) / 180;
      const gx = Math.cos(rad);
      const gy = Math.sin(rad);
      const w = unit.totalW + pad * 2;
      const h = unit.totalH + pad * 2;
      const grad = ctx.createLinearGradient(w * (0.5 - gx / 2), h * (0.5 - gy / 2), w * (0.5 + gx / 2), h * (0.5 + gy / 2));
      grad.addColorStop(0, bgFill.from);
      grad.addColorStop(1, bgFill.to);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }
  }

  const ox = pad;
  const oy = pad;

  // Bezel with drop shadow.
  ctx.save();
  if (shadow > 0) {
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = shadow * 0.8;
    ctx.shadowOffsetY = shadow * 0.35;
  }
  roundedRectPath(ctx, ox, oy, unit.totalW, bezelH, unit.radius);
  ctx.fillStyle = colorBody;
  ctx.fill();
  ctx.restore();

  // Screen.
  const scrR = Math.max(0, unit.radius - unit.bezel);
  const sx = ox + unit.screenX;
  const sy = oy + unit.screenY;
  ctx.save();
  roundedRectPath(ctx, sx, sy, unit.screenW, unit.screenH, scrR);
  ctx.clip();
  if (fit === "contain") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(sx, sy, unit.screenW, unit.screenH);
  }
  const f = fitRect(img.naturalWidth, img.naturalHeight, unit.screenW, unit.screenH, fit);
  ctx.drawImage(img, f.sx, f.sy, f.sw, f.sh, sx + f.dx, sy + f.dy, f.dw, f.dh);
  ctx.restore();

  // Notch overlays.
  ctx.fillStyle = "#000000";
  if (frame.notch === "dynamic-island") {
    const w = unit.screenW * 0.32;
    const h = Math.max(10, unit.screenW * 0.055);
    roundedRectPath(ctx, sx + (unit.screenW - w) / 2, sy + unit.screenH * 0.025, w, h, h / 2);
    ctx.fill();
  } else if (frame.notch === "notch") {
    const w = unit.screenW * 0.42;
    const h = Math.max(10, unit.screenW * 0.05);
    roundedRectPath(ctx, sx + (unit.screenW - w) / 2, sy, w, h, h / 2);
    ctx.fill();
  } else if (frame.notch === "punch-hole") {
    const d = Math.max(8, unit.screenW * 0.045);
    ctx.beginPath();
    ctx.arc(sx + unit.screenW / 2, sy + unit.screenH * 0.035 + d / 2, d / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Browser chrome bar.
  if (frame.chrome === "browser") {
    ctx.fillStyle = colorBody;
    ctx.fillRect(sx, oy + unit.bezel, unit.screenW, unit.chromeH);
    const dotY = oy + unit.bezel + unit.chromeH / 2;
    const dotR = Math.max(3, unit.chromeH * 0.14);
    ["#ff5f57", "#febc2e", "#28c840"].forEach((c, i) => {
      ctx.beginPath();
      ctx.fillStyle = c;
      ctx.arc(sx + unit.bezel + 8 + i * (dotR * 2 + 6) + dotR, dotY, dotR, 0, Math.PI * 2);
      ctx.fill();
    });
    const pillW = unit.screenW * 0.5;
    const pillH = unit.chromeH * 0.56;
    ctx.fillStyle = "rgba(128,128,128,0.25)";
    roundedRectPath(ctx, sx + (unit.screenW - pillW) / 2, dotY - pillH / 2, pillW, pillH, pillH / 2);
    ctx.fill();
    void fileName;
  }

  // Laptop base.
  if (frame.chrome === "laptop-base") {
    const baseY = oy + bezelH;
    const baseW = unit.totalW * 1.12;
    const baseX = ox + (unit.totalW - baseW) / 2;
    ctx.fillStyle = colorBody;
    roundedRectPath(ctx, baseX, baseY, baseW, unit.baseH, unit.baseH / 2);
    ctx.fill();
  }

  // Desktop stand.
  if (frame.chrome === "stand") {
    const neckW = unit.totalW * 0.12;
    const neckH = unit.standH * 0.7;
    ctx.fillStyle = colorBody;
    ctx.fillRect(ox + (unit.totalW - neckW) / 2, oy + bezelH, neckW, neckH);
    const footW = unit.totalW * 0.34;
    const footH = unit.standH * 0.3;
    roundedRectPath(ctx, ox + (unit.totalW - footW) / 2, oy + bezelH + neckH, footW, footH, footH / 2);
    ctx.fill();
  }

  // Watch crown.
  if (frame.chrome === "crown") {
    const d = Math.max(8, unit.screenW * 0.06);
    ctx.fillStyle = colorBody;
    ctx.beginPath();
    ctx.arc(ox + unit.totalW + d / 4, oy + bezelH * 0.32, d / 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function MockupStudioTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("mockup-studio", isPro);
  const seo = toolSeo;

  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("Phones");
  const [frameId, setFrameId] = useState("iphone-pro");
  const [colorIdx, setColorIdx] = useState(0);
  const [bgId, setBgId] = useState("sunset");
  const [customBg, setCustomBg] = useState("#0d7a68");
  const [paddingPct, setPaddingPct] = useState(6);
  const [shadow, setShadow] = useState(60);
  const [fit, setFit] = useState<"cover" | "contain">("cover");
  const [scale, setScale] = useState<1 | 2>(2);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const frame = MOCKUP_FRAMES.find((f) => f.id === frameId) ?? MOCKUP_FRAMES[0]!;
  const color = frame.colors[Math.min(colorIdx, frame.colors.length - 1)]!;
  const bg = bgId === "custom" ? { id: "custom", name: "Custom", css: customBg, canvas: null } : (BG_PRESETS.find((b) => b.id === bgId) ?? BG_PRESETS[0]!);
  const framesInCategory = MOCKUP_FRAMES.filter((f) => f.category === category);

  const acceptFile = useCallback(async (f: File) => {
    if (!f.type.startsWith("image/")) {
      setError("Please choose a JPG, PNG or WebP image.");
      return;
    }
    try {
      const loaded = await loadImageFile(f);
      setImg(loaded);
      setImgSrc(URL.createObjectURL(f));
      setName(baseName(f.name));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that image.");
    }
  }, []);

  const useSample = useCallback(() => {
    const im = new Image();
    im.onload = () => {
      setImg(im);
      setImgSrc(SAMPLE_SRC);
      setName("sample-website");
      setError(null);
    };
    im.onerror = () => setError("Could not load the sample image.");
    im.src = SAMPLE_SRC;
  }, []);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const f = e.clipboardData?.files?.[0];
      if (f) void acceptFile(f);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [acceptFile]);

  // Preview geometry: fit the whole device into a 640x560 box.
  const preview = useMemo(() => {
    const unit = layoutFor(frame, 1000);
    const s = Math.min(640 / unit.totalW, 560 / unit.totalH);
    return layoutFor(frame, Math.max(50, Math.round(1000 * s)));
  }, [frame]);
  const padPx = Math.round((preview.screenW * paddingPct) / 100);
  const scrR = Math.max(0, preview.radius - preview.bezel);
  const bgCss = bg.id === "custom" ? customBg : bg.css;

  const download = useCallback(async () => {
    if (!img || busy || !trial.canUse) return;
    setBusy(true);
    setError(null);
    try {
      const canvas = document.createElement("canvas");
      renderMockup(canvas, img, frame, color.body, bg, customBg, paddingPct, shadow, fit, scale, name);
      const blob = await canvasToBlob(canvas, "image/png");
      downloadBlob(blob, `${name || "mockup"}-mockup.png`);
      trial.recordUse();
      toast.success("Mockup downloaded");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed.");
    } finally {
      setBusy(false);
    }
  }, [img, busy, trial, frame, color.body, bg, customBg, paddingPct, shadow, fit, scale, name]);

  const selectFrame = (id: string) => {
    setFrameId(id);
    setColorIdx(0);
  };

  return (
    <ToolPageShell toolId="mockup-studio" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Mockup Studio" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
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
            <p className="text-sm font-semibold">{name || "Drop a screenshot"}</p>
            <p className="mt-1 text-xs text-muted-foreground">JPG, PNG or WebP — or paste from clipboard</p>
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void acceptFile(f); e.target.value = ""; }} />
          </div>
          {!img && (
            <button type="button" onClick={useSample} className="w-full rounded-lg border border-border py-2 text-sm font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground">
              Try a sample screenshot
            </button>
          )}

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Device</p>
            <div className="mb-2 flex flex-wrap gap-1">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => { setCategory(c); const first = MOCKUP_FRAMES.find((f) => f.category === c); if (first) selectFrame(first.id); }}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-bold transition",
                    category === c ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {framesInCategory.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => selectFrame(f.id)}
                  className={cn(
                    "rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition",
                    f.id === frameId ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Frame color</p>
            <div className="flex flex-wrap gap-1.5">
              {frame.colors.map((c, i) => (
                <button
                  key={c.name}
                  type="button"
                  title={c.name}
                  onClick={() => setColorIdx(i)}
                  className={cn("h-8 w-8 rounded-full border-2 transition", i === colorIdx ? "border-primary" : "border-border")}
                  style={{ background: c.body }}
                  aria-label={c.name}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Background</p>
            <div className="flex flex-wrap gap-1.5">
              {BG_PRESETS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  title={b.name}
                  onClick={() => setBgId(b.id)}
                  className={cn(
                    "h-8 w-8 rounded-full border-2 transition",
                    bgId === b.id ? "border-primary" : "border-border",
                    b.id === "transparent" && "bg-[repeating-conic-gradient(#d4d4d4_0%_25%,#ffffff_0%_50%)] bg-[length:12px_12px]",
                  )}
                  style={b.id === "transparent" ? undefined : { background: b.css }}
                  aria-label={b.name}
                />
              ))}
              <label className="flex h-8 cursor-pointer items-center gap-1 rounded-full border border-border px-2 text-xs font-semibold text-muted-foreground" title="Custom color">
                <input type="color" value={customBg} onChange={(e) => { setCustomBg(e.target.value); setBgId("custom"); }} className="h-5 w-5 cursor-pointer border-0 bg-transparent p-0" aria-label="Custom background color" />
                Custom
              </label>
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Padding</p>
              <span className="text-xs font-bold text-muted-foreground">{paddingPct}%</span>
            </div>
            <input type="range" min={0} max={12} value={paddingPct} onChange={(e) => setPaddingPct(Number(e.target.value))} className="w-full" aria-label="Padding" />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Shadow</p>
              <span className="text-xs font-bold text-muted-foreground">{shadow === 0 ? "Off" : `${shadow}%`}</span>
            </div>
            <input type="range" min={0} max={100} value={shadow} onChange={(e) => setShadow(Number(e.target.value))} className="w-full" aria-label="Shadow" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-2 text-[13px] font-medium text-foreground/80">Screen fit</p>
              <div className="flex gap-1">
                {(["cover", "contain"] as const).map((f) => (
                  <button key={f} type="button" onClick={() => setFit(f)} className={cn("flex-1 rounded-lg border px-2 py-2 text-xs font-bold capitalize transition", fit === f ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40")}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[13px] font-medium text-foreground/80">Export size</p>
              <div className="flex gap-1">
                {([1, 2] as const).map((s) => (
                  <button key={s} type="button" onClick={() => setScale(s)} className={cn("flex-1 rounded-lg border px-2 py-2 text-xs font-bold transition", scale === s ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40")}>
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void download()}
            disabled={!img || busy || !trial.canUse}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download className="h-4 w-4" />
            {busy ? "Working..." : trial.canUse ? "Download PNG" : "Trial used up"}
          </button>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
        </div>

        <div className="flex min-h-[420px] items-center justify-center overflow-auto rounded-2xl border border-border bg-muted/40 p-6">
          {img && imgSrc ? (
            <div
              style={{
                background: bg.id === "transparent" ? "repeating-conic-gradient(#d4d4d4 0% 25%, #ffffff 0% 50%)" : bgCss,
                backgroundSize: bg.id === "transparent" ? "16px 16px" : undefined,
                padding: padPx,
                borderRadius: 24,
              }}
            >
              <div className="relative" style={{ width: preview.totalW, height: preview.totalH }}>
                <div
                  className="absolute"
                  style={{
                    top: 0,
                    left: 0,
                    width: preview.totalW,
                    height: preview.totalH - preview.baseH - preview.standH,
                    background: color.body,
                    borderRadius: preview.radius,
                    boxShadow: shadow > 0 ? `0 ${Math.round(shadow * 0.3)}px ${Math.round(shadow * 0.8)}px rgba(0,0,0,${0.1 + shadow / 200})` : undefined,
                    border: `1px solid ${color.edge}`,
                  }}
                >
                  {frame.chrome === "browser" && (
                    <div className="absolute flex items-center gap-1.5 px-3" style={{ top: 0, left: preview.bezel, right: preview.bezel, height: preview.chromeH }}>
                      <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                      <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                      <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                      <span className="ml-2 flex-1 rounded-full bg-black/10 px-3 py-1 text-[10px] text-muted-foreground dark:bg-white/10">{name || "your-website.com"}</span>
                    </div>
                  )}
                  <div className="absolute overflow-hidden bg-white" style={{ left: preview.screenX, top: preview.screenY, width: preview.screenW, height: preview.screenH, borderRadius: scrR }}>
                    <img src={imgSrc} alt="Mockup screen" className="h-full w-full" style={{ objectFit: fit }} />
                    {frame.notch === "dynamic-island" && (
                      <span className="absolute left-1/2 top-[2.5%] h-[5.5%] w-[32%] -translate-x-1/2 rounded-full bg-black" />
                    )}
                    {frame.notch === "notch" && (
                      <span className="absolute left-1/2 top-0 h-[5%] w-[42%] -translate-x-1/2 rounded-b-2xl bg-black" />
                    )}
                    {frame.notch === "punch-hole" && (
                      <span className="absolute left-1/2 top-[3.5%] aspect-square w-[4.5%] -translate-x-1/2 rounded-full bg-black" />
                    )}
                  </div>
                </div>
                {frame.chrome === "laptop-base" && (
                  <div
                    className="absolute"
                    style={{
                      left: -preview.totalW * 0.06,
                      top: preview.totalH - preview.baseH - preview.standH,
                      width: preview.totalW * 1.12,
                      height: preview.baseH,
                      background: `linear-gradient(${color.body}, ${color.edge})`,
                      borderRadius: `0 0 ${preview.baseH / 2}px ${preview.baseH / 2}px`,
                    }}
                  />
                )}
                {frame.chrome === "stand" && (
                  <>
                    <div className="absolute" style={{ left: preview.totalW * 0.44, top: preview.totalH - preview.baseH - preview.standH, width: preview.totalW * 0.12, height: preview.standH * 0.7, background: color.body }} />
                    <div className="absolute" style={{ left: preview.totalW * 0.33, top: preview.totalH - preview.standH * 0.3, width: preview.totalW * 0.34, height: preview.standH * 0.3, background: color.body, borderRadius: preview.standH * 0.15 }} />
                  </>
                )}
                {frame.chrome === "crown" && (
                  <span className="absolute rounded-full" style={{ left: preview.totalW, top: preview.totalH * 0.3, width: Math.max(6, preview.screenW * 0.05), height: Math.max(6, preview.screenW * 0.05), background: color.body }} />
                )}
              </div>
            </div>
          ) : (
            <div className="text-center">
              <ImageIcon className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
              <p className="text-sm font-semibold">Your mockup appears here</p>
              <p className="mt-1 text-xs text-muted-foreground">Drop a screenshot, pick a device, download a PNG.</p>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
