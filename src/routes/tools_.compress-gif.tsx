// /tools/compress-gif - Shrink an animated GIF with fewer colors, dropped
// frames, lossy frame differencing and scaling. 100% in your browser.

import { useCallback, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileUp, Minimize2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/compress-gif";
import toolSeoMeta from "@/lib/tool-seo-meta-data/compress-gif";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import { baseName, formatBytes } from "@/lib/image-tools";

export const Route = createFileRoute("/tools_/compress-gif")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/compress-gif";
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
  component: CompressGifTool,
});

/** Ordered Bayer 4x4 dithering (gifenc 1.0.3 has no built-in dither option). */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
function bayerDither(rgba: Uint8Array, w: number, h: number) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (rgba[i + 3]! < 128) continue;
      const t = (BAYER[(y % 4) * 4 + (x % 4)]! / 16 - 0.5) * 24;
      rgba[i] = Math.min(255, Math.max(0, rgba[i]! + t));
      rgba[i + 1] = Math.min(255, Math.max(0, rgba[i + 1]! + t));
      rgba[i + 2] = Math.min(255, Math.max(0, rgba[i + 2]! + t));
    }
  }
}

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
    // Sub-block: 0x03 0x01 <lo> <hi> 0x00
    if (buf[k] === 3 && buf[k + 1] === 1) return buf[k + 2]! | (buf[k + 3]! << 8);
  }
  return 0;
}

function CompressGifTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("compress-gif", isPro);
  const seo = toolSeo;

  const [fileName, setFileName] = useState("");
  const [origSize, setOrigSize] = useState(0);
  const [colors, setColors] = useState(128);
  const [drop, setDrop] = useState(1);
  const [lossy, setLossy] = useState(20);
  const [scale, setScale] = useState(100);
  const [dither, setDither] = useState(false);
  const [gifUrl, setGifUrl] = useState("");
  const [newSize, setNewSize] = useState(0);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const builtRef = useRef<Uint8Array | null>(null);
  const sourceRef = useRef<File | null>(null);

  const acceptFile = useCallback((f: File) => {
    if (f.type !== "image/gif" && !/\.gif$/i.test(f.name)) {
      setError("Please choose a GIF file.");
      return;
    }
    setError(null);
    setFileName(f.name);
    setOrigSize(f.size);
    setGifUrl("");
    builtRef.current = null;
    sourceRef.current = f;
  }, []);

  const compress = useCallback(async () => {
    const src = sourceRef.current;
    if (!src || busy || !trial.canUse) return;
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

      const w0 = decoded[0]!.dims.width;
      const h0 = decoded[0]!.dims.height;
      const s = Math.max(0.1, Math.min(1, scale / 100));
      const w = Math.max(1, Math.round(w0 * s));
      const h = Math.max(1, Math.round(h0 * s));

      // Render every frame at the target size.
      const render = (patch: Uint8ClampedArray, fw: number, fh: number): Uint8Array => {
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const ctx = c.getContext("2d")!;
        const src2 = document.createElement("canvas");
        src2.width = fw;
        src2.height = fh;
        src2.getContext("2d")!.putImageData(new ImageData(patch as Uint8ClampedArray<ArrayBuffer>, fw, fh), 0, 0);
        ctx.drawImage(src2, 0, 0, w, h);
        return new Uint8Array(ctx.getImageData(0, 0, w, h).data.buffer.slice(0));
      };

      const rendered = decoded.map((fr: any) => ({
        rgba: render(fr.patch, fr.dims.width, fr.dims.height),
        delay: Math.max(10, fr.delay ?? 100),
      }));

      // Drop frames: keep every Nth, adding dropped delays to the kept frame
      // so the total duration stays the same.
      const kept: { rgba: Uint8Array; delay: number }[] = [];
      for (let i = 0; i < rendered.length; i += drop) {
        let delay = 0;
        for (let j = i; j < Math.min(i + drop, rendered.length); j++) delay += rendered[j]!.delay;
        kept.push({ rgba: rendered[i]!.rgba, delay });
      }

      const gif = GIFEncoder();
      const diffThreshold = lossy * 7.65; // 0..100 -> 0..765 channel-diff budget
      let prev: Uint8Array | null = null;
      let pendingDelay = 0;

      for (let i = 0; i < kept.length; i++) {
        setProgress(`Encoding frame ${i + 1} of ${kept.length}…`);
        const { rgba, delay } = kept[i]!;
        const work = new Uint8Array(rgba);
        if (dither) bayerDither(work, w, h);

        if (i === 0 || !prev || lossy === 0) {
          const palette = quantize(work, colors);
          if (!palette || palette.length === 0) throw new Error("Could not build a color palette.");
          const index = applyPalette(work, palette);
          gif.writeFrame(index, w, h, { palette, delay: delay + pendingDelay, repeat: loopCount });
          pendingDelay = 0;
        } else {
          // Lossy frame differencing: near-identical pixels become transparent
          // and cost almost nothing in the output.
          const diff = new Uint8Array(work.length);
          let changed = 0;
          for (let p = 0; p < w * h; p++) {
            const o = p * 4;
            const d = Math.abs(work[o]! - prev[o]!) + Math.abs(work[o + 1]! - prev[o + 1]!) + Math.abs(work[o + 2]! - prev[o + 2]!);
            if (d <= diffThreshold) {
              diff[o + 3] = 0; // transparent = unchanged
            } else {
              diff[o] = work[o]!;
              diff[o + 1] = work[o + 1]!;
              diff[o + 2] = work[o + 2]!;
              diff[o + 3] = 255;
              changed++;
            }
          }
          if (changed === 0) {
            // Whole frame identical: fold its time into the next written frame.
            pendingDelay += delay;
          } else {
            const palette = quantize(diff, colors, { format: "rgba4444" });
            if (!palette || palette.length === 0) throw new Error("Could not build a color palette.");
            const index = applyPalette(diff, palette, "rgba4444");
            for (let p = 0; p < w * h; p++) {
              if (diff[p * 4 + 3] === 0) index[p] = 0;
            }
            palette[0] = [0, 0, 0, 0];
            gif.writeFrame(index, w, h, {
              palette,
              delay: delay + pendingDelay,
              transparent: true,
              transparentIndex: 0,
              dispose: 1, // keep previous frame underneath the transparent pixels
            } as { palette: number[][]; delay: number });
            pendingDelay = 0;
          }
        }
        prev = new Uint8Array(rgba);
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
      toast.success("GIF compressed");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Compression failed.");
    } finally {
      setBusy(false);
      setProgress("");
    }
  }, [busy, trial, colors, drop, lossy, scale, dither]);

  const downloadGif = () => {
    const bytes = builtRef.current;
    if (!bytes) return;
    downloadBlob(new Blob([bytes as unknown as BlobPart], { type: "image/gif" }), `${baseName(fileName) || "compressed"}-small.gif`);
    toast.success("Compressed GIF downloaded");
  };

  const saved = origSize > 0 && newSize > 0 ? Math.round((1 - newSize / origSize) * 100) : 0;

  return (
    <ToolPageShell toolId="compress-gif" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Compress GIF" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) acceptFile(f); }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition",
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
            )}
          >
            <FileUp className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold">{fileName || "Drop a GIF here"}</p>
            <p className="mt-1 text-xs text-muted-foreground">{origSize > 0 ? formatBytes(origSize) : "Animated GIFs only"}</p>
            <input
              ref={inputRef}
              type="file"
              accept="image/gif"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) acceptFile(f); e.target.value = ""; }}
            />
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Colors</p>
            <div className="flex gap-1.5">
              {[256, 128, 64, 32].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColors(c)}
                  className={cn(
                    "flex-1 rounded-lg border px-2 py-2 text-xs font-bold transition",
                    colors === c ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Drop frames</p>
            <div className="grid grid-cols-4 gap-1.5">
              {[1, 2, 3, 4].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDrop(d)}
                  className={cn(
                    "rounded-lg border px-2 py-2 text-xs font-bold transition",
                    drop === d ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {d === 1 ? "Keep all" : `1/${d}`}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Total duration stays the same.</p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Lossy</p>
              <span className="text-xs font-bold text-primary">{lossy}</span>
            </div>
            <input type="range" min={0} max={100} value={lossy} onChange={(e) => setLossy(Number(e.target.value))} className="w-full accent-primary" />
            <p className="mt-1 text-xs text-muted-foreground">Treats near-identical pixels as unchanged.</p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Size</p>
              <span className="text-xs font-bold text-primary">{scale}%</span>
            </div>
            <input type="range" min={10} max={100} value={scale} onChange={(e) => setScale(Number(e.target.value))} className="w-full accent-primary" />
          </div>

          <label className="flex cursor-pointer items-center gap-3 text-sm">
            <input type="checkbox" checked={dither} onChange={(e) => setDither(e.target.checked)} className="h-4 w-4 accent-primary" />
            <span>
              <span className="font-semibold">Dithering</span>
              <span className="block text-xs text-muted-foreground">Ordered Bayer, smoother gradients with few colors.</span>
            </span>
          </label>

          <ActionButton busy={busy} disabled={!sourceRef.current || !trial.canUse} onClick={compress}>
            <Minimize2 className="h-4 w-4" /> {busy ? "Compressing…" : "Compress GIF"}
          </ActionButton>
          {progress && <p className="text-xs font-medium text-primary">{progress}</p>}
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free compressions left, files never leave your device.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {!gifUrl ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <Minimize2 className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Compressed preview appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Drop a GIF, tune colors, frame dropping, lossy differencing and size, then hit
                Compress GIF to see the animated result with before and after sizes.
              </p>
            </div>
          ) : (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-4">
              <div className="rounded-lg bg-[repeating-conic-gradient(#80808033_0_25%,transparent_0_50%)] bg-[length:20px_20px] p-4">
                <img src={gifUrl} alt="Compressed GIF preview" className="max-h-[46vh] max-w-full rounded" />
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground line-through">{formatBytes(origSize)}</span>
                <span className="font-bold text-primary">{formatBytes(newSize)}</span>
                {saved > 0 && (
                  <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-700 dark:bg-green-900/40 dark:text-green-300">
                    {saved}% smaller
                  </span>
                )}
              </div>
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
