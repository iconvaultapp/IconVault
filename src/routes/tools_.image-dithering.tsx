// /tools/image-dithering - Retro dithering: Floyd-Steinberg, ordered Bayer 4x4/8x8, Atkinson.
// Grayscale palettes (B/W, 4-color, 16-color), 100% in-browser. No upload, no watermark.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileUp, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/image-dithering";
import toolSeoMeta from "@/lib/tool-seo-meta-data/image-dithering";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/image-dithering")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/image-dithering";
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
  component: DitherTool,
});

type Algo = "floyd-steinberg" | "bayer4" | "bayer8" | "atkinson";

const PALETTES: Record<string, number[][]> = {
  bw: [[0, 0, 0], [255, 255, 255]],
  gray4: [[0, 0, 0], [85, 85, 85], [170, 170, 170], [255, 255, 255]],
  gray16: Array.from({ length: 16 }, (_, i) => { const v = Math.round((i * 255) / 15); return [v, v, v]; }),
};

const ALGOS: { id: Algo; name: string; blurb: string }[] = [
  { id: "floyd-steinberg", name: "Floyd-Steinberg", blurb: "Classic error diffusion. Smooth, detailed." },
  { id: "atkinson", name: "Atkinson", blurb: "Apple's MacPaint look. Higher contrast." },
  { id: "bayer4", name: "Ordered Bayer 4x4", blurb: "Retro crosshatch pattern." },
  { id: "bayer8", name: "Ordered Bayer 8x8", blurb: "Finer retro pattern." },
];

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const BAYER8 = [
  0, 48, 12, 60, 3, 51, 15, 63, 32, 16, 44, 28, 35, 19, 47, 31,
  8, 56, 4, 52, 11, 59, 7, 55, 40, 24, 36, 20, 43, 27, 39, 23,
  2, 50, 14, 62, 1, 49, 13, 61, 34, 18, 46, 30, 33, 17, 45, 29,
  10, 58, 6, 54, 9, 57, 5, 53, 42, 26, 38, 22, 41, 25, 37, 21,
];

function loadFile(f: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`Could not read ${f.name}`)); };
    img.src = url;
  });
}

function nearest(palette: number[][], r: number, g: number, b: number): number[] {
  let best: number[] = palette[0]!;
  let bestD = Infinity;
  for (const c of palette) {
    const d = (r - c[0]!) ** 2 + (g - c[1]!) ** 2 + (b - c[2]!) ** 2;
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}

function dither(img: HTMLImageElement, algo: Algo, paletteKey: string): HTMLCanvasElement {
  const scale = Math.min(1, 1000 / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);
  const id = ctx.getImageData(0, 0, w, h);
  const d = id.data;
  const palette: number[][] = PALETTES[paletteKey]!;

  if (algo === "bayer4" || algo === "bayer8") {
    const matrix = algo === "bayer4" ? BAYER4 : BAYER8;
    const n = algo === "bayer4" ? 4 : 8;
    const size = n * n;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const lum = (d[i]! * 0.299 + d[i + 1]! * 0.587 + d[i + 2]! * 0.114) / 255;
        const t = (matrix[(y % n) * n + (x % n)]! + 0.5) / size;
        // spread palette steps across threshold range
        const steps = palette.length;
        const level = Math.min(steps - 1, Math.max(0, Math.floor(lum * steps + (t - 0.5))));
        const c: number[] = palette[steps - 1 - level] ?? palette[0]!;
        d[i] = c[0]!; d[i + 1] = c[1]!; d[i + 2] = c[2]!; d[i + 3] = 255;
      }
    }
  } else {
    // error diffusion (Floyd-Steinberg or Atkinson)
    const buf = new Float32Array(w * h * 3);
    for (let i = 0; i < w * h; i++) { buf[i * 3] = d[i * 4]!; buf[i * 3 + 1] = d[i * 4 + 1]!; buf[i * 3 + 2] = d[i * 4 + 2]!; }
    const spread: [number, number, number][] = algo === "floyd-steinberg"
      ? [[1, 0, 7 / 16], [-1, 1, 3 / 16], [0, 1, 5 / 16], [1, 1, 1 / 16]]
      : [[1, 0, 1 / 8], [2, 0, 1 / 8], [-1, 1, 1 / 8], [0, 1, 1 / 8], [1, 1, 1 / 8], [0, 2, 1 / 8]];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const bi = (y * w + x) * 3;
        const old = [buf[bi]!, buf[bi + 1]!, buf[bi + 2]!];
        const nc = nearest(palette, old[0]!, old[1]!, old[2]!);
        const di = (y * w + x) * 4;
        d[di] = nc[0]!; d[di + 1] = nc[1]!; d[di + 2] = nc[2]!; d[di + 3] = 255;
        for (const [dx, dy, f] of spread) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= w || ny >= h) continue;
          const ni = (ny * w + nx) * 3;
          buf[ni] = buf[ni]! + (old[0]! - nc[0]!) * f;
          buf[ni + 1] = buf[ni + 1]! + (old[1]! - nc[1]!) * f;
          buf[ni + 2] = buf[ni + 2]! + (old[2]! - nc[2]!) * f;
        }
      }
    }
  }
  ctx.putImageData(id, 0, 0);
  return canvas;
}

function DitherTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("image-dithering", isPro);
  const seo = toolSeo;

  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [name, setName] = useState("");
  const [algo, setAlgo] = useState<Algo>("floyd-steinberg");
  const [palette, setPalette] = useState("bw");
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const outRef = useRef<HTMLCanvasElement>(null);

  const acceptFile = useCallback(async (f: File) => {
    if (!f.type.startsWith("image/")) { setError("Please choose an image file."); return; }
    try {
      const loaded = await loadFile(f);
      setImg(loaded);
      setName(f.name.replace(/\.[^.]+$/, ""));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that image.");
    }
  }, []);

  useEffect(() => {
    if (!img || !outRef.current) return;
    setBusy(true);
    const t = setTimeout(() => {
      try {
        const out = dither(img, algo, palette);
        const c = outRef.current!;
        c.width = out.width; c.height = out.height;
        c.getContext("2d")!.drawImage(out, 0, 0);
      } catch { /* ignore */ }
      setBusy(false);
    }, 30);
    return () => clearTimeout(t);
  }, [img, algo, palette]);

  const download = useCallback(() => {
    const c = outRef.current;
    if (!c || c.width === 0 || !trial.canUse) return;
    c.toBlob((b) => {
      if (!b) { setError("Could not encode PNG."); return; }
      downloadBlob(b, `${name || "dithered"}-${algo}.png`);
      trial.recordUse();
      toast.success("Dithered PNG downloaded");
    }, "image/png");
  }, [name, algo, trial]);

  return (
    <ToolPageShell toolId="image-dithering" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Image Dithering" left={trial.left} />

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
            <p className="mt-1 text-xs text-muted-foreground">Large images are capped at 1000px for speed</p>
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void acceptFile(f); }} />
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Algorithm</p>
            <div className="space-y-2">
              {ALGOS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAlgo(a.id)}
                  className={cn(
                    "w-full rounded-xl border px-3 py-2.5 text-left transition",
                    algo === a.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/40",
                  )}
                >
                  <p className="text-sm font-semibold">{a.name}</p>
                  <p className="text-xs text-muted-foreground">{a.blurb}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Palette</p>
            <div className="flex gap-2">
              {[
                { id: "bw", label: "B/W" },
                { id: "gray4", label: "4-color" },
                { id: "gray16", label: "16-color" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPalette(p.id)}
                  className={cn(
                    "rounded-xl border px-4 py-2 text-sm font-bold transition",
                    palette === p.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <ActionButton busy={busy} disabled={!img || !trial.canUse} onClick={download}>
            <Download className="h-4 w-4" /> {busy ? "Rendering…" : "Download PNG"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free dithers left - files never leave your device.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {!img ? (
            <div className="flex h-full min-h-[340px] flex-col items-center justify-center text-center">
              <ImageIcon className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your dithered image appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Preview updates live as you switch algorithms and palettes.
              </p>
            </div>
          ) : (
            <div className="flex min-h-[340px] items-center justify-center">
              <canvas ref={outRef} className="max-h-[560px] max-w-full rounded-lg" style={{ imageRendering: "pixelated" }} />
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
