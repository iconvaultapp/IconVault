// /tools/signature-resizer - Clean and resize a signature image to the exact
// dimensions and file size asked by exam portals. 100% in-browser.

import { useCallback, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileUp, Image as ImageIcon, PenLine } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import {
  loadImageFile,
  drawContain,
  formatBytes,
  encodeToSize,
} from "@/lib/image-tools";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/signature-resizer")({
  head: () => {
    const seo = getToolSeoMeta("signature-resizer");
    const canonical = "https://iconvault.site/tools/signature-resizer";
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
  component: SignatureResizerTool,
});

const DIMS: { id: string; label: string; w: number; h: number }[] = [
  { id: "ibps", label: "140 x 60 (IBPS, SBI)", w: 140, h: 60 },
  { id: "ssc", label: "315 x 157 (SSC 4 x 2 cm)", w: 315, h: 157 },
  { id: "neet", label: "350 x 150 (NEET, JEE)", w: 350, h: 150 },
  { id: "upsc", label: "700 x 350 (UPSC)", w: 700, h: 350 },
  { id: "custom", label: "Custom", w: 0, h: 0 },
];

function whiten(src: HTMLCanvasElement, threshold: number): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = src.width;
  out.height = src.height;
  const ctx = out.getContext("2d")!;
  ctx.drawImage(src, 0, 0);
  const d = ctx.getImageData(0, 0, out.width, out.height);
  const px = d.data;
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i]!;
    const g = px[i + 1]!;
    const b = px[i + 2]!;
    const lum = (r + g + b) / 3;
    if (lum > threshold) {
      px[i] = 255;
      px[i + 1] = 255;
      px[i + 2] = 255;
    }
    px[i + 3] = 255;
  }
  ctx.putImageData(d, 0, 0);
  return out;
}

function trimWhite(src: HTMLCanvasElement): HTMLCanvasElement | null {
  const ctx = src.getContext("2d")!;
  const d = ctx.getImageData(0, 0, src.width, src.height);
  const px = d.data;
  let minX = src.width, minY = src.height, maxX = -1, maxY = -1;
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const i = (y * src.width + x) * 4;
      const r = px[i]!;
      const g = px[i + 1]!;
      const b = px[i + 2]!;
      if (r < 245 || g < 245 || b < 245) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX) return null;
  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
  const crop = document.createElement("canvas");
  crop.width = bw;
  crop.height = bh;
  crop.getContext("2d")!.drawImage(src, minX, minY, bw, bh, 0, 0, bw, bh);
  return crop;
}

const selectCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none";
const numCls =
  "w-28 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none";
const labelCls = "mb-1.5 block text-[13px] font-medium text-foreground/80";

function SignatureResizerTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("signature-resizer", isPro);
  const seo = getToolSeo("signature-resizer");

  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [cleanBg, setCleanBg] = useState(true);
  const [darkness, setDarkness] = useState(60);
  const [sizeOpt, setSizeOpt] = useState<"10" | "20" | "custom">("20");
  const [customKB, setCustomKB] = useState(20);
  const [dimId, setDimId] = useState("ibps");
  const [customW, setCustomW] = useState(140);
  const [customH, setCustomH] = useState(60);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<{ url: string; w: number; h: number; size: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptFile = useCallback(async (f: File) => {
    if (!f.type.startsWith("image/")) {
      setError("Please choose an image file (JPG, PNG or WebP).");
      return;
    }
    try {
      const loaded = await loadImageFile(f);
      setImg(loaded);
      setName(f.name);
      setUrl(URL.createObjectURL(f));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that image.");
    }
  }, []);

  const onPaste = (e: React.ClipboardEvent) => {
    const f = e.clipboardData?.files?.[0];
    if (f && f.type.startsWith("image/")) {
      e.preventDefault();
      void acceptFile(f);
      toast.success("Image pasted");
    }
  };

  const preset = DIMS.find((d) => d.id === dimId)!;
  const targetW = dimId === "custom" ? Math.max(10, Math.round(customW)) : preset.w;
  const targetH = dimId === "custom" ? Math.max(10, Math.round(customH)) : preset.h;
  const maxKB = sizeOpt === "10" ? 10 : sizeOpt === "20" ? 20 : Math.max(1, customKB);

  const resize = useCallback(async () => {
    if (!img || busy || !trial.canUse) return;
    setBusy(true);
    setError(null);
    try {
      const base = document.createElement("canvas");
      base.width = img.naturalWidth;
      base.height = img.naturalHeight;
      base.getContext("2d")!.drawImage(img, 0, 0);
      let cleaned = base;
      if (cleanBg) cleaned = whiten(base, darkness);
      const trimmed = trimWhite(cleaned);

      const { blob, width: fw, height: fh } = await encodeToSize(
        (canvas) => {
          const ctx = canvas.getContext("2d")!;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          const pad = canvas.width * 0.03;
          if (trimmed) {
            drawContain(ctx, trimmed, trimmed.width, trimmed.height, pad, pad, canvas.width - pad * 2, canvas.height - pad * 2);
          }
        },
        "image/jpeg",
        maxKB * 1024,
        targetW,
        targetH,
      );

      downloadBlob(blob, "signature.jpg");
      setResult({ url: URL.createObjectURL(blob), w: fw, h: fh, size: blob.size });
      trial.recordUse();
      toast.success("Signature resized");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not resize the signature.");
    } finally {
      setBusy(false);
    }
  }, [img, busy, trial, cleanBg, darkness, maxKB, targetW, targetH]);

  return (
    <ToolPageShell toolId="signature-resizer" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Signature Resizer" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) void acceptFile(f); }}
            onPaste={onPaste}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition",
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
            )}
          >
            <FileUp className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold">{name || "Upload signature image"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Drop, click, or paste from clipboard</p>
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void acceptFile(f); }} />
          </div>

          <label className="flex cursor-pointer items-center gap-2.5">
            <input type="checkbox" checked={cleanBg} onChange={(e) => setCleanBg(e.target.checked)} className="h-4 w-4 accent-primary" />
            <span className="text-sm font-medium">Clean background <span className="text-muted-foreground">(pure white paper, dark ink)</span></span>
          </label>

          {cleanBg && (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-[13px] font-medium text-foreground/80">Ink darkness</label>
                <span className="text-sm font-bold text-primary">{darkness}</span>
              </div>
              <input
                type="range" min={10} max={200} value={darkness}
                onChange={(e) => setDarkness(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">Lower keeps only dark ink, higher keeps light pencil strokes too.</p>
            </div>
          )}

          <div>
            <p className={labelCls}>Max file size</p>
            <div className="flex flex-wrap gap-2">
              {(["10", "20"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setSizeOpt(opt)}
                  className={cn(
                    "rounded-xl border px-4 py-2.5 text-sm font-bold transition",
                    sizeOpt === opt ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {opt} KB
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSizeOpt("custom")}
                className={cn(
                  "rounded-xl border px-4 py-2.5 text-sm font-bold transition",
                  sizeOpt === "custom" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                Custom
              </button>
            </div>
            {sizeOpt === "custom" && (
              <div className="mt-3 flex items-center gap-2">
                <input type="number" min={1} max={1000} value={customKB} onChange={(e) => setCustomKB(Math.max(1, Number(e.target.value) || 1))} className={numCls} />
                <span className="text-sm text-muted-foreground">KB</span>
              </div>
            )}
          </div>

          <div>
            <label className={labelCls}>Dimensions</label>
            <select value={dimId} onChange={(e) => setDimId(e.target.value)} className={selectCls}>
              {DIMS.map((d) => (
                <option key={d.id} value={d.id}>{d.label}</option>
              ))}
            </select>
            {dimId === "custom" && (
              <div className="mt-3 flex gap-3">
                <div>
                  <label className={labelCls}>Width (px)</label>
                  <input type="number" min={10} value={customW} onChange={(e) => setCustomW(Number(e.target.value) || 10)} className={numCls} />
                </div>
                <div>
                  <label className={labelCls}>Height (px)</label>
                  <input type="number" min={10} value={customH} onChange={(e) => setCustomH(Number(e.target.value) || 10)} className={numCls} />
                </div>
              </div>
            )}
          </div>

          <ActionButton busy={busy} disabled={!img || !trial.canUse} onClick={resize}>
            <PenLine className="h-4 w-4" /> {busy ? "Resizing…" : "Resize signature"}
          </ActionButton>
          <p className="text-xs text-muted-foreground">
            Files never leave your device: everything runs in your browser.
          </p>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free resizes left.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {!result ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <ImageIcon className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your resized signature appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                The tool trims the paper edges, centers your signature on a pure white canvas, and fits it inside your file size limit.
              </p>
              {url && (
                <img src={url} alt="Original signature" className="mt-6 max-h-32 rounded border border-border bg-white" />
              )}
            </div>
          ) : (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-4">
              <div className="rounded-lg border border-border bg-white p-6">
                <img src={result.url} alt="Resized signature" style={{ width: Math.min(result.w, 420) }} />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                <Download className="mr-1 inline h-4 w-4" /> {result.w} x {result.h} px, {formatBytes(result.size)} (max {maxKB} KB)
              </p>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
