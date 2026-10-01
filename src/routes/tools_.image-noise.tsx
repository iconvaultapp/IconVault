// /tools/image-noise - Add adjustable film-grain noise to an image, 100% in-browser.
// Intensity slider, mono/color toggle, seedable, before/after view. No upload, no watermark.

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

export const Route = createFileRoute("/tools_/image-noise")({
  head: () => {
    const seo = getToolSeoMeta("image-noise");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: NoiseTool,
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

// Seeded PRNG (mulberry32) so the same seed always gives the same grain.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function addNoise(img: HTMLImageElement, intensity: number, mono: boolean, seed: number): HTMLCanvasElement {
  const scale = Math.min(1, 1400 / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);
  const id = ctx.getImageData(0, 0, w, h);
  const d = id.data;
  const rand = mulberry32(seed);
  const amt = (intensity / 100) * 128;
  for (let i = 0; i < d.length; i += 4) {
    if (mono) {
      const n = (rand() * 2 - 1) * amt;
      d[i] = d[i]! + n; d[i + 1] = d[i + 1]! + n; d[i + 2] = d[i + 2]! + n;
    } else {
      d[i] = d[i]! + (rand() * 2 - 1) * amt;
      d[i + 1] = d[i + 1]! + (rand() * 2 - 1) * amt;
      d[i + 2] = d[i + 2]! + (rand() * 2 - 1) * amt;
    }
  }
  ctx.putImageData(id, 0, 0);
  return canvas;
}

function NoiseTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("image-noise", isPro);
  const seo = getToolSeo("image-noise");

  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [name, setName] = useState("");
  const [intensity, setIntensity] = useState(25);
  const [mono, setMono] = useState(true);
  const [seed, setSeed] = useState(1);
  const [showAfter, setShowAfter] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const origRef = useRef<HTMLCanvasElement>(null);
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
    if (!img || !origRef.current || !outRef.current) return;
    setBusy(true);
    const t = setTimeout(() => {
      try {
        const out = addNoise(img, intensity, mono, seed);
        const c = outRef.current!;
        c.width = out.width; c.height = out.height;
        c.getContext("2d")!.drawImage(out, 0, 0);
        const o = origRef.current!;
        o.width = out.width; o.height = out.height;
        o.getContext("2d")!.drawImage(img, 0, 0, out.width, out.height);
      } catch { /* ignore */ }
      setBusy(false);
    }, 30);
    return () => clearTimeout(t);
  }, [img, intensity, mono, seed]);

  const randomizeSeed = () => setSeed(Math.floor(Math.random() * 100000));

  const download = useCallback(() => {
    const c = outRef.current;
    if (!c || c.width === 0 || !trial.canUse) return;
    c.toBlob((b) => {
      if (!b) { setError("Could not encode PNG."); return; }
      downloadBlob(b, `${name || "grain"}-noise.png`);
      trial.recordUse();
      toast.success("Noisy PNG downloaded");
    }, "image/png");
  }, [name, trial]);

  return (
    <ToolPageShell toolId="image-noise" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Image Noise" left={trial.left} />

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
            <p className="mt-1 text-xs text-muted-foreground">Large images are capped at 1400px for speed</p>
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void acceptFile(f); }} />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Grain intensity</p>
              <span className="text-[13px] font-bold text-primary">{intensity}%</span>
            </div>
            <input
              type="range" min={0} max={100} value={intensity}
              onChange={(e) => setIntensity(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Grain style</p>
            <div className="flex gap-2">
              {[
                { id: true, label: "Monochrome" },
                { id: false, label: "Color" },
              ].map((o) => (
                <button
                  key={o.label}
                  type="button"
                  onClick={() => setMono(o.id)}
                  className={cn(
                    "rounded-xl border px-4 py-2 text-sm font-bold transition",
                    mono === o.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Seed</p>
              <button type="button" onClick={randomizeSeed} className="text-[13px] font-bold text-primary hover:underline">
                Randomize
              </button>
            </div>
            <input
              type="number" value={seed} min={0}
              onChange={(e) => setSeed(Math.max(0, Number(e.target.value) || 0))}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-muted-foreground">Same seed, same grain pattern.</p>
          </div>

          <ActionButton busy={busy} disabled={!img || !trial.canUse} onClick={download}>
            <Download className="h-4 w-4" /> {busy ? "Rendering…" : "Download PNG"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free uses left - files never leave your device.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {!img ? (
            <div className="flex h-full min-h-[340px] flex-col items-center justify-center text-center">
              <ImageIcon className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your grainy image appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Preview updates live. Toggle between the noisy result and the original.
              </p>
            </div>
          ) : (
            <div className="flex min-h-[340px] flex-col items-center justify-center gap-4">
              <div className="flex items-center gap-2 rounded-full border border-border p-1 text-sm font-semibold">
                <button
                  type="button" onClick={() => setShowAfter(true)}
                  className={cn("rounded-full px-4 py-1.5 transition", showAfter ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
                >
                  After
                </button>
                <button
                  type="button" onClick={() => setShowAfter(false)}
                  className={cn("rounded-full px-4 py-1.5 transition", !showAfter ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
                >
                  Before
                </button>
              </div>
              <canvas ref={outRef} className={cn("max-h-[520px] max-w-full rounded-lg", !showAfter && "hidden")} />
              <canvas ref={origRef} className={cn("max-h-[520px] max-w-full rounded-lg", showAfter && "hidden")} />
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
