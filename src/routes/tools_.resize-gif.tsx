// /tools/resize-gif - Resize an animated GIF by pixels or percent, every frame
// scaled and the loop preserved. 100% in your browser.

import { useCallback, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileUp, Scaling } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import { baseName, formatBytes } from "@/lib/image-tools";

export const Route = createFileRoute("/tools_/resize-gif")({
  head: () => {
    const seo = getToolSeoMeta("resize-gif");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: ResizeGifTool,
});

/** Read the NETSCAPE2.0 loop count from raw GIF bytes (0 = loop forever). */
function readLoopCount(buf: Uint8Array): number {
  const tag = "NETSCAPE2.0";
  for (let i = 0; i + tag.length + 5 < buf.length; i++) {
    let ok = true;
    for (let j = 0; j < tag.length; j++) {
      if (buf[i + j] !== tag.charCodeAt(j)) { ok = false; break; }
    }
    if (!ok) continue;
    const k = i + tag.length;
    if (buf[k] === 3 && buf[k + 1] === 1) return buf[k + 2]! | (buf[k + 3]! << 8);
  }
  return 0;
}

function ResizeGifTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("resize-gif", isPro);
  const seo = getToolSeo("resize-gif");

  const [fileName, setFileName] = useState("");
  const [origW, setOrigW] = useState(0);
  const [origH, setOrigH] = useState(0);
  const [mode, setMode] = useState<"pixels" | "percent">("pixels");
  const [width, setWidth] = useState(320);
  const [height, setHeight] = useState(320);
  const [percent, setPercent] = useState(50);
  const [keepAspect, setKeepAspect] = useState(true);
  const [gifUrl, setGifUrl] = useState("");
  const [newSize, setNewSize] = useState(0);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const builtRef = useRef<Uint8Array | null>(null);
  const sourceRef = useRef<File | null>(null);

  const acceptFile = useCallback(async (f: File) => {
    if (f.type !== "image/gif" && !/\.gif$/i.test(f.name)) {
      setError("Please choose a GIF file.");
      return;
    }
    setError(null);
    setFileName(f.name);
    setGifUrl("");
    builtRef.current = null;
    sourceRef.current = f;
    try {
      const { parseGIF } = await import("gifuct-js");
      const g = parseGIF(await f.arrayBuffer());
      setOrigW(g.lsd.width);
      setOrigH(g.lsd.height);
      setWidth(g.lsd.width);
      setHeight(g.lsd.height);
    } catch {
      /* dims filled in at resize time */
    }
  }, []);

  const targetW = mode === "pixels" ? width : Math.max(1, Math.round((origW * percent) / 100));
  const targetH = mode === "pixels"
    ? (keepAspect && origW > 0 ? Math.max(1, Math.round((width * origH) / origW)) : height)
    : Math.max(1, Math.round((origH * percent) / 100));

  const resize = useCallback(async () => {
    const src = sourceRef.current;
    if (!src || busy || !trial.canUse) return;
    const tw = Math.max(1, Math.min(2000, targetW));
    const th = Math.max(1, Math.min(2000, targetH));
    setBusy(true);
    setError(null);
    setProgress("Reading frames…");
    try {
      const { parseGIF, decompressFrames } = await import("gifuct-js");
      const { GIFEncoder, quantize, applyPalette } = await import("gifenc");
      const raw = new Uint8Array(await src.arrayBuffer());
      const loopCount = readLoopCount(raw);
      const decoded = decompressFrames(parseGIF(raw.buffer), true);
      if (decoded.length === 0) throw new Error("No frames found in that GIF.");

      const gif = GIFEncoder();
      for (let i = 0; i < decoded.length; i++) {
        setProgress(`Resizing frame ${i + 1} of ${decoded.length}…`);
        const fr: any = decoded[i];
        const fw = fr.dims.width;
        const fh = fr.dims.height;
        const c = document.createElement("canvas");
        c.width = tw;
        c.height = th;
        const ctx = c.getContext("2d")!;
        const src2 = document.createElement("canvas");
        src2.width = fw;
        src2.height = fh;
        src2.getContext("2d")!.putImageData(new ImageData(fr.patch, fw, fh), 0, 0);
        ctx.drawImage(src2, 0, 0, tw, th);
        const data = ctx.getImageData(0, 0, tw, th);
        const rgba = new Uint8Array(data.data.buffer.slice(0));
        const palette = quantize(rgba, 256);
        if (!palette || palette.length === 0) throw new Error("Could not build a color palette.");
        const index = applyPalette(rgba, palette);
        gif.writeFrame(index, tw, th, {
          palette,
          delay: Math.max(10, fr.delay ?? 100),
          repeat: i === 0 ? loopCount : 0, // loop preserved
        });
        await new Promise((r) => setTimeout(r, 0));
      }
      gif.finish();
      const bytes = gif.bytes();
      builtRef.current = bytes;
      const blob = new Blob([bytes as unknown as BlobPart], { type: "image/gif" });
      setNewSize(blob.size);
      setGifUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(blob);
      });
      trial.recordUse();
      toast.success("GIF resized");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Resize failed.");
    } finally {
      setBusy(false);
      setProgress("");
    }
  }, [busy, trial, targetW, targetH]);

  const downloadGif = () => {
    const bytes = builtRef.current;
    if (!bytes) return;
    downloadBlob(new Blob([bytes as unknown as BlobPart], { type: "image/gif" }), `${baseName(fileName) || "resized"}-${targetW}x${targetH}.gif`);
    toast.success("Resized GIF downloaded");
  };

  return (
    <ToolPageShell toolId="resize-gif" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Resize GIF" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) void acceptFile(f); }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition",
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
            )}
          >
            <FileUp className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold">{fileName || "Drop a GIF here"}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {origW > 0 ? `Original ${origW} × ${origH} px` : "Animated GIFs only"}
            </p>
            <input
              ref={inputRef}
              type="file"
              accept="image/gif"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void acceptFile(f); e.target.value = ""; }}
            />
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Resize by</p>
            <div className="flex gap-2">
              {(["pixels", "percent"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn(
                    "flex-1 rounded-xl border px-3 py-2.5 text-sm font-bold capitalize transition",
                    mode === m ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {mode === "pixels" ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[13px] font-medium text-foreground/80" htmlFor="rg-w">Width (px)</label>
                <input
                  id="rg-w"
                  type="number"
                  min={1}
                  max={2000}
                  value={width}
                  onChange={(e) => setWidth(Number(e.target.value))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-[13px] font-medium text-foreground/80" htmlFor="rg-h">Height (px)</label>
                <input
                  id="rg-h"
                  type="number"
                  min={1}
                  max={2000}
                  value={height}
                  disabled={keepAspect}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm disabled:opacity-50"
                />
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[13px] font-medium text-foreground/80">Scale</p>
                <span className="text-xs font-bold text-primary">{percent}%</span>
              </div>
              <input type="range" min={5} max={200} value={percent} onChange={(e) => setPercent(Number(e.target.value))} className="w-full accent-primary" />
            </div>
          )}

          <label className="flex cursor-pointer items-center gap-3 text-sm">
            <input type="checkbox" checked={keepAspect} onChange={(e) => setKeepAspect(e.target.checked)} className="h-4 w-4 accent-primary" />
            <span className="font-semibold">Keep aspect ratio</span>
          </label>

          {origW > 0 && (
            <p className="rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
              {origW} × {origH} px → {targetW} × {targetH} px. Every frame is resized and the
              animation loop is preserved.
            </p>
          )}

          <ActionButton busy={busy} disabled={!sourceRef.current || !trial.canUse} onClick={resize}>
            <Scaling className="h-4 w-4" /> {busy ? "Resizing…" : "Resize GIF"}
          </ActionButton>
          {progress && <p className="text-xs font-medium text-primary">{progress}</p>}
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free resizes left, files never leave your device.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {!gifUrl ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <Scaling className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Resized preview appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Drop a GIF, pick pixels or a percentage, and every frame is scaled to the new size
                with the loop intact.
              </p>
            </div>
          ) : (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-4">
              <div className="rounded-lg bg-[repeating-conic-gradient(#80808033_0_25%,transparent_0_50%)] bg-[length:20px_20px] p-4">
                <img src={gifUrl} alt="Resized GIF preview" className="max-h-[46vh] max-w-full rounded" />
              </div>
              <p className="text-xs text-muted-foreground">
                {targetW} × {targetH} px, {formatBytes(newSize)}
              </p>
              <button
                type="button"
                onClick={downloadGif}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90"
              >
                <Download className="h-4 w-4" /> Download .gif
              </button>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
