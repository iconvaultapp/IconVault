// /tools/photo-signature-joiner - Join a passport photo and a signature into one
// JPG image for Indian exam / government form portals. 100% in-browser.

import { useCallback, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Columns2, Download, FileUp, Image as ImageIcon, PenLine } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import {
  loadImageFile,
  drawCover,
  drawContain,
  formatBytes,
  encodeToSize,
} from "@/lib/image-tools";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/photo-signature-joiner")({
  head: () => {
    const seo = getToolSeoMeta("photo-signature-joiner");
    const canonical = "https://iconvault.site/tools/photo-signature-joiner";
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
  component: JoinerTool,
});

type PhotoShape = "passport" | "ibps" | "square";
type StripShape = "wide" | "half" | "third";

const PHOTO_SHAPES: { id: PhotoShape; label: string; ratio: number }[] = [
  { id: "passport", label: "3.5 x 4.5 passport", ratio: 45 / 35 },
  { id: "ibps", label: "200 x 230 (IBPS, SBI)", ratio: 230 / 200 },
  { id: "square", label: "Square", ratio: 1 },
];

const STRIP_SHAPES: { id: StripShape; label: string; ratio: number }[] = [
  { id: "wide", label: "Wide 140 x 60", ratio: 60 / 140 },
  { id: "half", label: "2:1", ratio: 1 / 2 },
  { id: "third", label: "Very wide 3:1", ratio: 1 / 3 },
];

/** Whiten every pixel brighter than the threshold (paper cleanup). */
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

/** Crop to the bounding box of non-white pixels. Returns null when fully blank. */
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

function imgToCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  c.getContext("2d")!.drawImage(img, 0, 0);
  return c;
}

const selectCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none";
const numCls =
  "w-28 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none";
const labelCls = "mb-1.5 block text-[13px] font-medium text-foreground/80";

interface Slot {
  img: HTMLImageElement | null;
  name: string;
  url: string;
}

function JoinerTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("photo-signature-joiner", isPro);
  const seo = getToolSeo("photo-signature-joiner");

  const [photo, setPhoto] = useState<Slot>({ img: null, name: "", url: "" });
  const [sign, setSign] = useState<Slot>({ img: null, name: "", url: "" });
  const [width, setWidth] = useState(300);
  const [photoShape, setPhotoShape] = useState<PhotoShape>("passport");
  const [stripShape, setStripShape] = useState<StripShape>("wide");
  const [labelOn, setLabelOn] = useState(true);
  const [labelText, setLabelText] = useState("Signature");
  const [cleanBg, setCleanBg] = useState(true);
  const [minKB, setMinKB] = useState(0);
  const [maxKB, setMaxKB] = useState(50);
  const [busy, setBusy] = useState(false);
  const [dragSlot, setDragSlot] = useState<"photo" | "sign" | null>(null);
  const [result, setResult] = useState<{ url: string; w: number; h: number; size: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const signRef = useRef<HTMLInputElement>(null);

  const acceptFile = useCallback(async (f: File, slot: "photo" | "sign") => {
    if (!f.type.startsWith("image/")) {
      setError("Please choose an image file (JPG, PNG or WebP).");
      return;
    }
    try {
      const loaded = await loadImageFile(f);
      const next: Slot = { img: loaded, name: f.name, url: URL.createObjectURL(f) };
      if (slot === "photo") setPhoto(next);
      else setSign(next);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that image.");
    }
  }, []);

  const onPaste = (e: React.ClipboardEvent, slot: "photo" | "sign") => {
    const f = e.clipboardData?.files?.[0];
    if (f && f.type.startsWith("image/")) {
      e.preventDefault();
      void acceptFile(f, slot);
      toast.success("Image pasted");
    }
  };

  const photoRatio = PHOTO_SHAPES.find((s) => s.id === photoShape)!.ratio;
  const stripRatio = STRIP_SHAPES.find((s) => s.id === stripShape)!.ratio;

  const join = useCallback(async () => {
    if (!photo.img || !sign.img || busy || !trial.canUse) return;
    setBusy(true);
    setError(null);
    try {
      const W = Math.max(100, Math.round(width));
      const photoH = Math.round(W * photoRatio);
      const stripH = Math.round(W * stripRatio);
      const labelH = labelOn ? Math.round(W * 0.12) : 0;
      const totalH = photoH + stripH + labelH;
      const maxBytes = Math.max(1, maxKB) * 1024;
      const minBytes = Math.max(0, minKB) * 1024;

      let signCanvas = imgToCanvas(sign.img);
      if (cleanBg) signCanvas = whiten(signCanvas, 120);
      const trimmed = trimWhite(signCanvas);

      const { blob, width: fw, height: fh } = await encodeToSize(
        (canvas) => {
          const ctx = canvas.getContext("2d")!;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          // Photo on top, center-cropped to the shape.
          drawCover(ctx, photo.img!, photo.img!.naturalWidth, photo.img!.naturalHeight, 0, 0, canvas.width, (photoH / totalH) * canvas.height);
          const sy = (photoH / totalH) * canvas.height;
          const sh = (stripH / totalH) * canvas.height;
          // Signature strip below.
          const pad = sh * 0.06;
          if (trimmed) {
            drawContain(ctx, trimmed, trimmed.width, trimmed.height, pad, sy + pad, canvas.width - pad * 2, sh - pad * 2);
          }
          // Label under the signature.
          if (labelOn) {
            const lh = (labelH / totalH) * canvas.height;
            ctx.fillStyle = "#111111";
            ctx.font = `600 ${Math.round(lh * 0.5)}px Arial, sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(labelText || "Signature", canvas.width / 2, sy + sh + lh / 2);
          }
        },
        "image/jpeg",
        maxBytes,
        W,
        totalH,
      );

      if (minBytes > 0 && blob.size < minBytes) {
        toast.warning(
          `Heads up: even at full quality this image is only ${formatBytes(blob.size)}, below your ${minKB} KB minimum. Downloading it anyway.`,
        );
      }
      downloadBlob(blob, "photo-signature.jpg");
      setResult({ url: URL.createObjectURL(blob), w: fw, h: fh, size: blob.size });
      trial.recordUse();
      toast.success("Joined image downloaded");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not join the images.");
    } finally {
      setBusy(false);
    }
  }, [photo.img, sign.img, busy, trial, width, photoRatio, stripRatio, labelOn, labelText, cleanBg, minKB, maxKB]);

  const dropCls = (slot: "photo" | "sign") =>
    cn(
      "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-7 text-center transition",
      dragSlot === slot ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
    );

  return (
    <ToolPageShell toolId="photo-signature-joiner" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Photo and Signature Joiner" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          {/* Photo upload */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragSlot("photo"); }}
            onDragLeave={() => setDragSlot(null)}
            onDrop={(e) => { e.preventDefault(); setDragSlot(null); const f = e.dataTransfer.files[0]; if (f) void acceptFile(f, "photo"); }}
            onPaste={(e) => onPaste(e, "photo")}
            onClick={() => photoRef.current?.click()}
            className={dropCls("photo")}
          >
            <FileUp className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold">{photo.name || "Add photo"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Drop, click, or paste from clipboard</p>
            <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void acceptFile(f, "photo"); }} />
          </div>

          {/* Signature upload */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragSlot("sign"); }}
            onDragLeave={() => setDragSlot(null)}
            onDrop={(e) => { e.preventDefault(); setDragSlot(null); const f = e.dataTransfer.files[0]; if (f) void acceptFile(f, "sign"); }}
            onPaste={(e) => onPaste(e, "sign")}
            onClick={() => signRef.current?.click()}
            className={dropCls("sign")}
          >
            <PenLine className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold">{sign.name || "Add signature"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Drop, click, or paste from clipboard</p>
            <input ref={signRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void acceptFile(f, "sign"); }} />
          </div>

          <div>
            <label className={labelCls}>Image width (px)</label>
            <input type="number" min={100} max={2000} value={width} onChange={(e) => setWidth(Number(e.target.value) || 300)} className={numCls} />
          </div>

          <div>
            <label className={labelCls}>Photo shape</label>
            <select value={photoShape} onChange={(e) => setPhotoShape(e.target.value as PhotoShape)} className={selectCls}>
              {PHOTO_SHAPES.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Signature strip</label>
            <select value={stripShape} onChange={(e) => setStripShape(e.target.value as StripShape)} className={selectCls}>
              {STRIP_SHAPES.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <label className="flex cursor-pointer items-center gap-2.5">
              <input type="checkbox" checked={labelOn} onChange={(e) => setLabelOn(e.target.checked)} className="h-4 w-4 accent-primary" />
              <span className="text-sm font-medium">Label under signature</span>
            </label>
            {labelOn && (
              <input value={labelText} onChange={(e) => setLabelText(e.target.value)} placeholder="Signature" className={selectCls} />
            )}
            <label className="flex cursor-pointer items-center gap-2.5">
              <input type="checkbox" checked={cleanBg} onChange={(e) => setCleanBg(e.target.checked)} className="h-4 w-4 accent-primary" />
              <span className="text-sm font-medium">Clean signature background <span className="text-muted-foreground">(whiten paper)</span></span>
            </label>
          </div>

          <div className="flex gap-3">
            <div>
              <label className={labelCls}>Min KB</label>
              <input type="number" min={0} value={minKB} onChange={(e) => setMinKB(Math.max(0, Number(e.target.value) || 0))} className={numCls} />
            </div>
            <div>
              <label className={labelCls}>Max KB</label>
              <input type="number" min={1} value={maxKB} onChange={(e) => setMaxKB(Math.max(1, Number(e.target.value) || 1))} className={numCls} />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Some portals ask for one combined image. Check your notification for the exact size.
          </p>

          <ActionButton busy={busy} disabled={!photo.img || !sign.img || !trial.canUse} onClick={join}>
            <Columns2 className="h-4 w-4" /> {busy ? "Joining…" : "Join images"}
          </ActionButton>
          <p className="text-xs text-muted-foreground">
            Files never leave your device: everything runs in your browser.
          </p>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free joins left.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {!result ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <ImageIcon className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your joined image appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Add a photo and a signature, pick the shapes, then join them into a single JPG sized for your portal.
              </p>
              <div className="mt-6 flex items-center gap-4">
                {photo.url && <img src={photo.url} alt="Photo" className="max-h-40 rounded border border-border" />}
                {sign.url && <img src={sign.url} alt="Signature" className="max-h-24 rounded border border-border bg-white" />}
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-4">
              <img src={result.url} alt="Joined photo and signature" className="max-h-96 rounded border border-border bg-white" />
              <p className="text-sm font-medium text-muted-foreground">
                <Download className="mr-1 inline h-4 w-4" /> {result.w} x {result.h} px, {formatBytes(result.size)}
              </p>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
