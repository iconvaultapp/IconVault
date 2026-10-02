// /tools/gif-maker - Turn images into an animated GIF with frame delay, loop,
// size and palette controls. 100% in your browser, nothing uploaded.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Download, FileUp, Film, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import { loadImageFile, baseName, formatBytes, drawCover, drawContain } from "@/lib/image-tools";

export const Route = createFileRoute("/tools_/gif-maker")({
  head: () => {
    const seo = getToolSeoMeta("gif-maker");
    const canonical = "https://iconvault.site/tools/gif-maker";
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
  component: GifMakerTool,
});

interface Frame {
  id: string;
  img: HTMLImageElement;
  url: string;
  name: string;
}

type Fit = "inside" | "fill";

let nextId = 1;

function GifMakerTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("gif-maker", isPro);
  const seo = getToolSeo("gif-maker");

  const [frames, setFrames] = useState<Frame[]>([]);
  const [delay, setDelay] = useState(500);
  const [loopMode, setLoopMode] = useState<"forever" | "times">("forever");
  const [loopCount, setLoopCount] = useState(3);
  const [width, setWidth] = useState(480);
  const [fit, setFit] = useState<Fit>("inside");
  const [bg, setBg] = useState("#ffffff");
  const [colors, setColors] = useState(256);
  const [gifUrl, setGifUrl] = useState("");
  const [gifSize, setGifSize] = useState(0);
  const [building, setBuilding] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const builtRef = useRef<Uint8Array | null>(null);
  const debounceRef = useRef<number | null>(null);

  const firstImg = frames[0]?.img;
  const autoHeight = firstImg ? Math.max(1, Math.round((width * firstImg.naturalHeight) / firstImg.naturalWidth)) : 0;

  const addFiles = useCallback(async (list: FileList | File[]) => {
    const imgs = [...list].filter((f) => f.type.startsWith("image/") && !f.type.includes("gif"));
    if (imgs.length === 0) {
      setError("Please choose image files (PNG, JPG, WebP).");
      return;
    }
    setError(null);
    for (const f of imgs) {
      try {
        const loaded = await loadImageFile(f);
        setFrames((p) => [...p, { id: `f${nextId++}`, img: loaded, url: URL.createObjectURL(f), name: f.name }]);
      } catch {
        toast.error(`Could not read ${f.name}`);
      }
    }
  }, []);

  const move = (i: number, dir: -1 | 1) => {
    setFrames((p) => {
      const j = i + dir;
      if (j < 0 || j >= p.length) return p;
      const next = [...p];
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });
  };

  const removeFrame = (id: string) => {
    setFrames((p) => {
      const f = p.find((x) => x.id === id);
      if (f) URL.revokeObjectURL(f.url);
      return p.filter((x) => x.id !== id);
    });
  };

  const buildGif = useCallback(async (): Promise<Uint8Array | null> => {
    if (frames.length < 2) return null;
    const first = frames[0]!.img;
    const w = Math.max(16, Math.min(1200, Math.round(width)));
    const h = Math.max(16, Math.round((w * first.naturalHeight) / first.naturalWidth));
    const repeat = loopMode === "forever" ? 0 : Math.max(1, Math.min(100, Math.round(loopCount)));
    const { GIFEncoder, quantize, applyPalette } = await import("gifenc");
    const gif = GIFEncoder();
    for (let i = 0; i < frames.length; i++) {
      const img = frames[i]!.img;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
      if (fit === "inside") drawContain(ctx, img, img.naturalWidth, img.naturalHeight, 0, 0, w, h);
      else drawCover(ctx, img, img.naturalWidth, img.naturalHeight, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h);
      const rgba = new Uint8Array(data.data.buffer.slice(0));
      const palette = quantize(rgba, colors);
      const index = applyPalette(rgba, palette);
      gif.writeFrame(index, w, h, { palette, delay, repeat: i === 0 ? repeat : 0 });
    }
    gif.finish();
    return gif.bytes();
  }, [frames, delay, loopMode, loopCount, width, fit, bg, colors]);

  // Live animated preview: rebuild (debounced) whenever the setup changes.
  useEffect(() => {
    if (frames.length < 2) {
      setGifUrl("");
      builtRef.current = null;
      return;
    }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      setBuilding(true);
      buildGif()
        .then((bytes) => {
          if (!bytes) return;
          builtRef.current = bytes;
          const blob = new Blob([bytes as unknown as BlobPart], { type: "image/gif" });
          setGifSize(blob.size);
          setGifUrl((old) => {
            if (old) URL.revokeObjectURL(old);
            return URL.createObjectURL(blob);
          });
        })
        .catch((e) => setError(e instanceof Error ? e.message : "Could not build the GIF."))
        .finally(() => setBuilding(false));
    }, 700);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [buildGif, frames.length]);

  const makeGif = useCallback(async () => {
    if (frames.length < 2 || building || !trial.canUse) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    setBuilding(true);
    setError(null);
    try {
      const bytes = await buildGif();
      if (!bytes) throw new Error("Add at least 2 images first.");
      builtRef.current = bytes;
      const blob = new Blob([bytes as unknown as BlobPart], { type: "image/gif" });
      setGifSize(blob.size);
      setGifUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(blob);
      });
      trial.recordUse();
      toast.success("GIF ready, preview it on the right");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not build the GIF.");
    } finally {
      setBuilding(false);
    }
  }, [frames.length, building, trial, buildGif]);

  const downloadGif = () => {
    const bytes = builtRef.current;
    if (!bytes) return;
    downloadBlob(new Blob([bytes as unknown as BlobPart], { type: "image/gif" }), `${baseName(frames[0]?.name ?? "") || "animation"}.gif`);
    toast.success("GIF downloaded");
  };

  return (
    <ToolPageShell toolId="gif-maker" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="GIF Maker" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); void addFiles(e.dataTransfer.files); }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition",
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
            )}
          >
            <FileUp className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold">{frames.length > 0 ? "Add more images" : "Drop 2+ images"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Each image becomes one frame</p>
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              className="hidden"
              onChange={(e) => { if (e.target.files) void addFiles(e.target.files); e.target.value = ""; }}
            />
          </div>

          {frames.length > 0 && (
            <div className="space-y-2">
              <p className="text-[13px] font-medium text-foreground/80">Frames ({frames.length})</p>
              <ul className="max-h-44 space-y-1.5 overflow-auto">
                {frames.map((f, i) => (
                  <li key={f.id} className="flex items-center gap-2 rounded-lg border border-border px-2 py-1.5">
                    <span className="w-5 text-center text-xs font-bold text-muted-foreground">{i + 1}</span>
                    <img src={f.url} alt={f.name} className="h-9 w-9 rounded object-cover" />
                    <span className="min-w-0 flex-1 truncate text-xs">{f.name}</span>
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-1 hover:bg-muted disabled:opacity-30" aria-label="Move up">
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === frames.length - 1} className="rounded p-1 hover:bg-muted disabled:opacity-30" aria-label="Move down">
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => removeFrame(f.id)} className="rounded p-1 text-muted-foreground hover:text-red-500" aria-label="Remove">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Frame delay</p>
              <span className="text-xs font-bold text-primary">{delay} ms</span>
            </div>
            <input type="range" min={50} max={2000} step={50} value={delay} onChange={(e) => setDelay(Number(e.target.value))} className="w-full accent-primary" />
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Loop</p>
            <div className="flex gap-2">
              {(["forever", "times"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setLoopMode(m)}
                  className={cn(
                    "flex-1 rounded-xl border px-3 py-2 text-sm font-bold capitalize transition",
                    loopMode === m ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {m === "forever" ? "Forever" : "Set times"}
                </button>
              ))}
            </div>
            {loopMode === "times" && (
              <div className="mt-2 flex items-center gap-2">
                <label className="text-xs text-muted-foreground" htmlFor="loop-count">Play</label>
                <input
                  id="loop-count"
                  type="number"
                  min={1}
                  max={100}
                  value={loopCount}
                  onChange={(e) => setLoopCount(Number(e.target.value))}
                  className="w-20 rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
                />
                <span className="text-xs text-muted-foreground">times</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[13px] font-medium text-foreground/80" htmlFor="gif-w">Width (px)</label>
              <input
                id="gif-w"
                type="number"
                min={16}
                max={1200}
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">Height auto: {autoHeight > 0 ? `${autoHeight}px` : "-"}. Matches the first image.</p>
            </div>
            <div>
              <p className="mb-1 text-[13px] font-medium text-foreground/80">Fit</p>
              <div className="flex flex-col gap-1.5">
                {(["inside", "fill"] as Fit[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setFit(m)}
                    className={cn(
                      "rounded-lg border px-2 py-1.5 text-xs font-bold transition",
                      fit === m ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {m === "inside" ? "Fit inside" : "Fill and crop"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="mb-1 text-[13px] font-medium text-foreground/80">Background</p>
              <div className="flex items-center gap-2">
                <input type="color" value={bg} onChange={(e) => setBg(e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent p-0.5" aria-label="Background color" />
                <span className="font-mono text-xs uppercase text-muted-foreground">{bg}</span>
              </div>
            </div>
            <div className="flex-1">
              <p className="mb-1 text-[13px] font-medium text-foreground/80">Colors</p>
              <div className="flex gap-1.5">
                {[256, 128, 64].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColors(c)}
                    className={cn(
                      "flex-1 rounded-lg border px-2 py-1.5 text-xs font-bold transition",
                      colors === c ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <ActionButton busy={building} disabled={frames.length < 2 || !trial.canUse} onClick={makeGif}>
                <Film className="h-4 w-4" /> {building ? "Building…" : "Make GIF"}
              </ActionButton>
            </div>
            {gifUrl && (
              <button
                type="button"
                onClick={downloadGif}
                className="inline-flex items-center gap-2 rounded-xl border-2 border-primary px-5 py-3 text-sm font-bold text-primary transition hover:bg-primary/10"
              >
                <Download className="h-4 w-4" /> .gif
              </button>
            )}
          </div>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free GIFs left, files never leave your device.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {!gifUrl ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <Film className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Live preview appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Add at least 2 images and the animated preview builds itself as you tweak delay,
                loop, size and colors.
              </p>
            </div>
          ) : (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-4">
              <div className="rounded-lg bg-[repeating-conic-gradient(#80808033_0_25%,transparent_0_50%)] bg-[length:20px_20px] p-4">
                <img src={gifUrl} alt="GIF preview" className="max-h-[52vh] max-w-full rounded" />
              </div>
              <p className="text-xs text-muted-foreground">
                {frames.length} frames, {delay} ms each, {formatBytes(gifSize)}
                {building && " (rebuilding…)"}
              </p>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
