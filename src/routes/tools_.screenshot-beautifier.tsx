// /tools/screenshot-beautifier - Frame screenshots on gorgeous gradient backgrounds with
// padding, rounded corners, shadows and optional macOS window chrome. 100% in-browser.

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
import { loadImageFile, canvasToBlob, baseName } from "@/lib/image-tools";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/screenshot-beautifier")({
  head: () => {
    const seo = getToolSeoMeta("screenshot-beautifier");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: BeautifierTool,
});

const GRADIENTS: { name: string; stops: [string, string] }[] = [
  { name: "Sunset", stops: ["#ff9a56", "#ff5e78"] },
  { name: "Ocean", stops: ["#38bdf8", "#6366f1"] },
  { name: "Dusk", stops: ["#7c3aed", "#db2777"] },
  { name: "Peach", stops: ["#fbbf24", "#f472b6"] },
  { name: "Midnight", stops: ["#0f172a", "#334155"] },
  { name: "Mint", stops: ["#6ee7b7", "#3b82f6"] },
  { name: "Candy", stops: ["#f472b6", "#a78bfa"] },
  { name: "Lavender", stops: ["#c4b5fd", "#818cf8"] },
  { name: "Slate", stops: ["#64748b", "#1e293b"] },
  { name: "Aurora", stops: ["#22d3ee", "#34d399"] },
];

type BgChoice = string; // gradient name | "Solid color" | "Transparent"

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function BeautifierTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("screenshot-beautifier", isPro);
  const seo = getToolSeo("screenshot-beautifier");

  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [fileName, setFileName] = useState("");
  const [bgChoice, setBgChoice] = useState<BgChoice>("Ocean");
  const [solidColor, setSolidColor] = useState("#6366f1");
  const [padding, setPadding] = useState(64);
  const [radius, setRadius] = useState(12);
  const [shadow, setShadow] = useState<"None" | "Soft" | "Strong">("Soft");
  const [frame, setFrame] = useState<"None" | "macOS" | "macOS dark">("None");
  const [aspect, setAspect] = useState<"Auto" | "16:9" | "1:1" | "4:3">("Auto");
  const [exportSize, setExportSize] = useState<1 | 2>(1);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const acceptFile = useCallback(async (f: File) => {
    if (!f.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    try {
      const loaded = await loadImageFile(f);
      setImg(loaded);
      setFileName(baseName(f.name));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that image.");
    }
  }, []);

  const draw = useCallback((canvas: HTMLCanvasElement, targetW: number) => {
    if (!img) return;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;

    // Screenshot box: fit image to a target width with aspect constraint.
    const shotTargetW = targetW - padding * 2;
    let shotW = shotTargetW;
    let shotH = Math.round((shotTargetW * ih) / iw);
    const shotScale = shotTargetW / iw;
    if (aspect !== "Auto") {
      const ratio = aspect === "16:9" ? 16 / 9 : aspect === "1:1" ? 1 : 4 / 3;
      // Constrain shot box to the aspect; draw image cover-cropped.
      if (shotW / shotH > ratio) {
        shotH = Math.round(shotW / ratio);
      } else {
        shotW = Math.round(shotH * ratio);
      }
    }

    const totalW = Math.round(shotW + padding * 2);
    const totalH = Math.round(shotH + padding * 2);
    canvas.width = totalW;
    canvas.height = totalH;
    const ctx = canvas.getContext("2d")!;

    // Background.
    if (bgChoice === "Transparent") {
      // Leave transparent.
    } else if (bgChoice === "Solid color") {
      ctx.fillStyle = solidColor;
      ctx.fillRect(0, 0, totalW, totalH);
    } else {
      const grad = GRADIENTS.find((g) => g.name === bgChoice) ?? GRADIENTS[1]!;
      const g = ctx.createLinearGradient(0, 0, totalW, totalH);
      g.addColorStop(0, grad.stops[0]);
      g.addColorStop(1, grad.stops[1]);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, totalW, totalH);
    }

    const sx = padding;
    const sy = padding;
    const frameH = frame === "None" ? 0 : Math.round(34 * shotScale);

    // Shadow.
    if (shadow !== "None") {
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.45)";
      ctx.shadowBlur = shadow === "Strong" ? 60 : 28;
      ctx.shadowOffsetY = shadow === "Strong" ? 22 : 10;
      roundRect(ctx, sx, sy, shotW, shotH + frameH, radius);
      ctx.fillStyle = "rgba(0,0,0,0.01)";
      ctx.fill();
      ctx.restore();
    }

    // Screenshot body with rounded corners.
    ctx.save();
    roundRect(ctx, sx, sy, shotW, shotH + frameH, radius);
    ctx.clip();
    const imgScale = Math.max(shotW / iw, shotH / ih);
    const dw = iw * imgScale;
    const dh = ih * imgScale;
    ctx.drawImage(img, sx + (shotW - dw) / 2, sy + frameH + (shotH - dh) / 2, dw, dh);

    // macOS title bar.
    if (frame !== "None") {
      const dark = frame === "macOS dark";
      ctx.fillStyle = dark ? "#2d2d2f" : "#ececee";
      ctx.fillRect(sx, sy, shotW, frameH);
      const dots: string[] = ["#ff5f57", "#febc2e", "#28c840"];
      dots.forEach((c, i) => {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(sx + 18 + i * 22, sy + frameH / 2, 6.5, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    ctx.restore();
  }, [img, bgChoice, solidColor, padding, radius, shadow, frame, aspect]);

  // Live preview.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    const maxSide = 720;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const shotScale = Math.min(1, 720 / Math.max(iw, ih));
    const targetW = Math.max(420, Math.round(iw * shotScale) + padding * 2);
    draw(canvas, targetW);
  }, [img, draw, padding]);

  const exportPng = useCallback(async () => {
    if (!img || busy || !trial.canUse) return;
    setBusy(true);
    setError(null);
    try {
      const canvas = document.createElement("canvas");
      const targetW = Math.round((img.naturalWidth + padding * 2) * exportSize);
      draw(canvas, targetW);
      const blob = await canvasToBlob(canvas, "image/png");
      downloadBlob(blob, `${fileName || "screenshot"}-beautified.png`);
      trial.recordUse();
      toast.success("Screenshot exported");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  }, [img, busy, trial, draw, padding, exportSize, fileName]);

  return (
    <ToolPageShell toolId="screenshot-beautifier" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Screenshot Beautifier" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="max-h-[80vh] space-y-5 overflow-y-auto rounded-2xl border border-border bg-card p-5">
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
            <p className="text-sm font-semibold">{fileName || "Drop a screenshot"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Files never leave your device</p>
            <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void acceptFile(f); }} />
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Background</p>
            <div className="grid grid-cols-5 gap-2">
              {GRADIENTS.map((g) => (
                <button
                  key={g.name}
                  type="button"
                  onClick={() => setBgChoice(g.name)}
                  title={g.name}
                  className={cn(
                    "h-10 rounded-lg border-2 transition",
                    bgChoice === g.name ? "border-primary" : "border-transparent hover:border-primary/40",
                  )}
                  style={{ background: `linear-gradient(135deg, ${g.stops[0]}, ${g.stops[1]})` }}
                />
              ))}
              <button
                type="button"
                onClick={() => setBgChoice("Solid color")}
                title="Solid color"
                className={cn(
                  "h-10 overflow-hidden rounded-lg border-2 transition",
                  bgChoice === "Solid color" ? "border-primary" : "border-transparent hover:border-primary/40",
                )}
              >
                <input
                  type="color" value={solidColor}
                  onChange={(e) => setSolidColor(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="h-full w-full cursor-pointer"
                  aria-label="Solid background color"
                />
              </button>
              <button
                type="button"
                onClick={() => setBgChoice("Transparent")}
                title="Transparent"
                className={cn(
                  "h-10 rounded-lg border-2 bg-[repeating-conic-gradient(#80808033_0_25%,transparent_0_50%)] bg-[length:12px_12px] transition",
                  bgChoice === "Transparent" ? "border-primary" : "border-transparent hover:border-primary/40",
                )}
              />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">{bgChoice === "Solid color" ? `Solid color ${solidColor}` : bgChoice}</p>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-[13px] font-medium text-foreground/80">Padding</label>
              <span className="text-xs font-bold text-muted-foreground">{padding}px</span>
            </div>
            <input type="range" min={0} max={160} value={padding} onChange={(e) => setPadding(Number(e.target.value))} className="w-full accent-primary" />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-[13px] font-medium text-foreground/80">Corner radius</label>
              <span className="text-xs font-bold text-muted-foreground">{radius}px</span>
            </div>
            <input type="range" min={0} max={48} value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="w-full accent-primary" />
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Shadow</p>
            <div className="flex gap-2">
              {(["None", "Soft", "Strong"] as const).map((s) => (
                <button
                  key={s} type="button" onClick={() => setShadow(s)}
                  className={cn("flex-1 rounded-xl border px-3 py-2 text-xs font-semibold transition", shadow === s ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40")}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Window frame</p>
            <div className="flex gap-2">
              {(["None", "macOS", "macOS dark"] as const).map((f) => (
                <button
                  key={f} type="button" onClick={() => setFrame(f)}
                  className={cn("flex-1 rounded-xl border px-2 py-2 text-xs font-semibold transition", frame === f ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40")}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Aspect</p>
            <div className="flex gap-2">
              {(["Auto", "16:9", "1:1", "4:3"] as const).map((a) => (
                <button
                  key={a} type="button" onClick={() => setAspect(a)}
                  className={cn("flex-1 rounded-xl border px-2 py-2 text-xs font-semibold transition", aspect === a ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40")}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Export size</p>
            <div className="flex gap-2">
              {([1, 2] as const).map((s) => (
                <button
                  key={s} type="button" onClick={() => setExportSize(s)}
                  className={cn("flex-1 rounded-xl border px-3 py-2 text-xs font-semibold transition", exportSize === s ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40")}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          <ActionButton busy={busy} disabled={!img || !trial.canUse} onClick={exportPng}>
            <Download className="h-4 w-4" /> {busy ? "Exporting…" : "Export PNG"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free exports left - everything runs in your browser.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {!img ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <ImageIcon className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your beautified screenshot appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Pick a gradient, tune padding and corners, add a macOS frame, export a crisp PNG.
              </p>
            </div>
          ) : (
            <div className="flex min-h-[320px] items-center justify-center overflow-auto">
              <canvas ref={canvasRef} className="max-h-[70vh] max-w-full rounded-xl" />
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
