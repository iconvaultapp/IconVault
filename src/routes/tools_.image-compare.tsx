// /tools/image-compare - Compare two images side by side with a draggable before/after
// slider, plus a pixel-difference mode with threshold slider and diff stats. 100% in-browser.

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

export const Route = createFileRoute("/tools_/image-compare")({
  head: () => {
    const seo = getToolSeoMeta("image-compare");
    const canonical = "https://iconvault.site/tools/image-compare";
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
  component: CompareTool,
});

function loadFile(f: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`Could not read ${f.name}`)); };
    img.src = url;
  });
}

function CompareTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("image-compare", isPro);
  const seo = getToolSeo("image-compare");

  const [imgA, setImgA] = useState<HTMLImageElement | null>(null);
  const [imgB, setImgB] = useState<HTMLImageElement | null>(null);
  const [mode, setMode] = useState<"compare" | "diff">("compare");
  const [pos, setPos] = useState(0.5); // slider position 0..1
  const [threshold, setThreshold] = useState(32);
  const [diffPct, setDiffPct] = useState<number | null>(null);
  const [diffPixels, setDiffPixels] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<"a" | "b" | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputARef = useRef<HTMLInputElement>(null);
  const inputBRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const acceptFile = useCallback(async (f: File, slot: "a" | "b") => {
    if (!f.type.startsWith("image/")) { setError("Please choose an image file."); return; }
    try {
      const loaded = await loadFile(f);
      if (slot === "a") setImgA(loaded); else setImgB(loaded);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that image.");
    }
  }, []);

  // Render compare view: draw B full, then clip A to the left of the slider.
  const renderCompare = useCallback(() => {
    const c = canvasRef.current;
    if (!c || !imgA || !imgB) return;
    const scale = Math.min(1, 1400 / Math.max(imgA.width, imgA.height));
    const w = Math.max(1, Math.round(imgA.width * scale));
    const h = Math.max(1, Math.round(imgA.height * scale));
    c.width = w; c.height = h;
    const ctx = c.getContext("2d")!;
    // both images cover-drawn to the same frame (image A sets the frame)
    ctx.drawImage(imgB, 0, 0, w, h);
    const cut = Math.round(w * pos);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, cut, h);
    ctx.clip();
    ctx.drawImage(imgA, 0, 0, w, h);
    ctx.restore();
    // divider line
    ctx.fillStyle = "#fff";
    ctx.fillRect(cut - 1, 0, 2, h);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(cut - 9, 0, 2, h);
    ctx.fillRect(cut + 7, 0, 2, h);
  }, [imgA, imgB, pos]);

  // Render diff view: pixels differing more than threshold glow red on a dark copy of A.
  const renderDiff = useCallback(() => {
    const c = canvasRef.current;
    if (!c || !imgA || !imgB) return;
    const scale = Math.min(1, 1000 / Math.max(imgA.width, imgA.height));
    const w = Math.max(1, Math.round(imgA.width * scale));
    const h = Math.max(1, Math.round(imgA.height * scale));
    c.width = w; c.height = h;
    const ctx = c.getContext("2d")!;
    const tmp = document.createElement("canvas");
    tmp.width = w; tmp.height = h;
    const tctx = tmp.getContext("2d")!;
    tctx.drawImage(imgA, 0, 0, w, h);
    const aData = tctx.getImageData(0, 0, w, h).data;
    tctx.drawImage(imgB, 0, 0, w, h);
    const bData = tctx.getImageData(0, 0, w, h).data;

    const out = ctx.createImageData(w, h);
    const od = out.data;
    let diff = 0;
    for (let i = 0; i < aData.length; i += 4) {
      const delta = (Math.abs(aData[i]! - bData[i]!) + Math.abs(aData[i + 1]! - bData[i + 1]!) + Math.abs(aData[i + 2]! - bData[i + 2]!)) / 3;
      if (delta > threshold) {
        diff++;
        od[i] = 255; od[i + 1] = 40; od[i + 2] = 40; od[i + 3] = 255;
      } else {
        const v = Math.round((aData[i]! + aData[i + 1]! + aData[i + 2]!) / 3) * 0.35;
        od[i] = v; od[i + 1] = v; od[i + 2] = v; od[i + 3] = 255;
      }
    }
    ctx.putImageData(out, 0, 0);
    const total = w * h;
    setDiffPixels(diff);
    setDiffPct((diff / total) * 100);
  }, [imgA, imgB, threshold]);

  useEffect(() => {
    if (mode === "compare") renderCompare(); else renderDiff();
  }, [mode, renderCompare, renderDiff]);

  const onPointer = useCallback((clientX: number) => {
    const wrap = wrapRef.current;
    if (!wrap || !dragging) return;
    const rect = wrap.getBoundingClientRect();
    setPos(Math.min(0.98, Math.max(0.02, (clientX - rect.left) / rect.width)));
  }, [dragging]);

  const download = useCallback(() => {
    const c = canvasRef.current;
    if (!c || c.width === 0 || !trial.canUse) return;
    c.toBlob((b) => {
      if (!b) { setError("Could not encode PNG."); return; }
      downloadBlob(b, `comparison-${mode}.png`);
      trial.recordUse();
      toast.success("Comparison downloaded");
    }, "image/png");
  }, [mode, trial]);

  const ready = imgA && imgB;

  const uploadBox = (slot: "a" | "b", label: string, ref: React.RefObject<HTMLInputElement | null>, img: HTMLImageElement | null) => (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(slot); }}
      onDragLeave={() => setDragOver(null)}
      onDrop={(e) => { e.preventDefault(); setDragOver(null); const f = e.dataTransfer.files[0]; if (f) void acceptFile(f, slot); }}
      onClick={() => ref.current?.click()}
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed px-4 py-4 transition",
        dragOver === slot ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
      )}
    >
      <FileUp className="h-6 w-6 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-sm font-semibold">{label}</p>
        <p className="truncate text-xs text-muted-foreground">{img ? "Loaded - click to replace" : "Drop or click to choose"}</p>
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void acceptFile(f, slot); }} />
    </div>
  );

  return (
    <ToolPageShell toolId="image-compare" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Image Compare" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          {uploadBox("a", "Before (A)", inputARef, imgA)}
          {uploadBox("b", "After (B)", inputBRef, imgB)}

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">View</p>
            <div className="flex gap-2">
              <button
                type="button" onClick={() => setMode("compare")}
                className={cn("rounded-xl border px-4 py-2 text-sm font-bold transition", mode === "compare" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40")}
              >
                Slider
              </button>
              <button
                type="button" onClick={() => setMode("diff")}
                className={cn("rounded-xl border px-4 py-2 text-sm font-bold transition", mode === "diff" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40")}
              >
                Difference
              </button>
            </div>
          </div>

          {mode === "diff" && (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-[13px] font-medium text-foreground/80">Diff threshold</p>
                <span className="text-[13px] font-bold text-primary">{threshold}</span>
              </div>
              <input
                type="range" min={0} max={255} value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Pixels differing by more than this glow red.
              </p>
              {diffPct !== null && (
                <div className="mt-3 rounded-xl bg-muted/60 p-3 text-sm">
                  <p className="font-bold text-primary">{diffPct.toFixed(2)}% different</p>
                  <p className="text-xs text-muted-foreground">{diffPixels?.toLocaleString()} of the pixels differ</p>
                </div>
              )}
            </div>
          )}

          <ActionButton disabled={!ready || !trial.canUse} onClick={download}>
            <Download className="h-4 w-4" /> Download comparison
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free comparisons left - files never leave your device.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Images are scaled to the same frame to compare and diff them.
          </p>
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {!ready ? (
            <div className="flex h-full min-h-[340px] flex-col items-center justify-center text-center">
              <ImageIcon className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Upload two images to compare</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Drag the slider to wipe between before and after, or switch to Difference to see exactly what changed.
              </p>
            </div>
          ) : (
            <div className="flex min-h-[340px] flex-col items-center justify-center gap-4">
              <div
                ref={wrapRef}
                className={cn("relative select-none", mode === "compare" && "cursor-ew-resize")}
                onPointerDown={(e) => { if (mode === "compare") { setDragging(true); (e.target as HTMLElement).setPointerCapture?.(e.pointerId); onPointer(e.clientX); } }}
                onPointerMove={(e) => onPointer(e.clientX)}
                onPointerUp={() => setDragging(false)}
                onPointerCancel={() => setDragging(false)}
                style={{ touchAction: mode === "compare" ? "none" : undefined }}
              >
                <canvas ref={canvasRef} className="max-h-[540px] max-w-full rounded-lg" />
                {mode === "compare" && (
                  <>
                    <span className="pointer-events-none absolute left-2 top-2 rounded-md bg-black/60 px-2 py-0.5 text-xs font-bold text-white">A</span>
                    <span className="pointer-events-none absolute right-2 top-2 rounded-md bg-black/60 px-2 py-0.5 text-xs font-bold text-white">B</span>
                  </>
                )}
              </div>
              {mode === "compare" && (
                <p className="text-xs text-muted-foreground">Drag across the image to move the before/after divider.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
