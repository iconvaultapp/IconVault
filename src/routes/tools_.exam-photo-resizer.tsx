// /tools/exam-photo-resizer - Resize a photo to the exact dimensions and file
// size asked by Indian exam portals (IBPS, SBI, SSC, UPSC, NEET, JEE). 100%
// in-browser.

import { useCallback, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileUp, IdCard, Image as ImageIcon } from "lucide-react";
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
  formatBytes,
  encodeToSize,
} from "@/lib/image-tools";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/exam-photo-resizer")({
  head: () => {
    const seo = getToolSeoMeta("exam-photo-resizer");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: ExamPhotoResizerTool,
});

interface Preset {
  id: string;
  label: string;
  w: number;
  h: number;
  min: number;
  max: number;
}

const PRESETS: Preset[] = [
  { id: "ibps", label: "IBPS (PO, Clerk, RRB, SO)", w: 200, h: 230, min: 20, max: 50 },
  { id: "sbi", label: "SBI (PO, Clerk)", w: 200, h: 230, min: 20, max: 50 },
  { id: "ssc", label: "SSC (CGL, CHSL, MTS, GD)", w: 276, h: 354, min: 20, max: 50 },
  { id: "upsc", label: "UPSC (CSE, NDA, CDS)", w: 420, h: 540, min: 20, max: 300 },
  { id: "neet", label: "NEET UG (NTA)", w: 276, h: 354, min: 10, max: 200 },
  { id: "jee", label: "JEE Main (NTA)", w: 276, h: 354, min: 10, max: 200 },
  { id: "custom", label: "Custom", w: 300, h: 400, min: 20, max: 50 },
];

const selectCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none";
const numCls =
  "w-28 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none";
const labelCls = "mb-1.5 block text-[13px] font-medium text-foreground/80";

function ExamPhotoResizerTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("exam-photo-resizer", isPro);
  const seo = getToolSeo("exam-photo-resizer");

  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [presetId, setPresetId] = useState("ibps");
  const [w, setW] = useState(200);
  const [h, setH] = useState(230);
  const [minKB, setMinKB] = useState(20);
  const [maxKB, setMaxKB] = useState(50);
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

  const pickPreset = (id: string) => {
    setPresetId(id);
    const p = PRESETS.find((x) => x.id === id)!;
    setW(p.w);
    setH(p.h);
    setMinKB(p.min);
    setMaxKB(p.max);
  };

  const targetW = Math.max(10, Math.round(w));
  const targetH = Math.max(10, Math.round(h));
  const minBytes = Math.max(0, minKB) * 1024;
  const maxBytes = Math.max(1, maxKB) * 1024;

  const resize = useCallback(async () => {
    if (!img || busy || !trial.canUse) return;
    setBusy(true);
    setError(null);
    try {
      const { blob, width: fw, height: fh } = await encodeToSize(
        (canvas) => {
          const ctx = canvas.getContext("2d")!;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          drawCover(ctx, img, img.naturalWidth, img.naturalHeight, 0, 0, canvas.width, canvas.height);
        },
        "image/jpeg",
        maxBytes,
        targetW,
        targetH,
      );

      if (minBytes > 0 && blob.size < minBytes) {
        toast.warning(
          `Heads up: even at full quality this photo is only ${formatBytes(blob.size)}, below your ${minKB} KB minimum. Downloading it anyway.`,
        );
      }
      downloadBlob(blob, "exam-photo.jpg");
      setResult({ url: URL.createObjectURL(blob), w: fw, h: fh, size: blob.size });
      trial.recordUse();
      toast.success("Photo resized");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not resize the photo.");
    } finally {
      setBusy(false);
    }
  }, [img, busy, trial, maxBytes, minBytes, minKB, targetW, targetH]);

  const isCustom = presetId === "custom";

  return (
    <ToolPageShell toolId="exam-photo-resizer" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Exam Photo Resizer" left={trial.left} />

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
            <p className="text-sm font-semibold">{name || "Upload photo"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Drop, click, or paste from clipboard</p>
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void acceptFile(f); }} />
          </div>

          <div>
            <label className={labelCls}>Exam preset</label>
            <select value={presetId} onChange={(e) => pickPreset(e.target.value)} className={selectCls}>
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>

          {!isCustom ? (
            <div className="rounded-xl border border-border bg-background/60 px-4 py-3 text-sm">
              <p className="font-semibold">Target: {targetW} x {targetH} px</p>
              <p className="mt-0.5 text-muted-foreground">File size: {minKB} to {maxKB} KB</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-3">
                <div>
                  <label className={labelCls}>Width (px)</label>
                  <input type="number" min={10} value={w} onChange={(e) => setW(Number(e.target.value) || 10)} className={numCls} />
                </div>
                <div>
                  <label className={labelCls}>Height (px)</label>
                  <input type="number" min={10} value={h} onChange={(e) => setH(Number(e.target.value) || 10)} className={numCls} />
                </div>
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
            </div>
          )}

          <ActionButton busy={busy} disabled={!img || !trial.canUse} onClick={resize}>
            <IdCard className="h-4 w-4" /> {busy ? "Resizing…" : "Resize photo"}
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
              <p className="font-semibold">Your resized photo appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                The photo is center-cropped to {targetW} x {targetH} px and compressed to fit inside {maxKB} KB.
              </p>
              {url && (
                <img src={url} alt="Original photo" className="mt-6 max-h-48 rounded border border-border" />
              )}
            </div>
          ) : (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-4">
              <img src={result.url} alt="Resized exam photo" style={{ maxHeight: 384, width: "auto" }} className="rounded border border-border" />
              <p className="text-sm font-medium text-muted-foreground">
                <Download className="mr-1 inline h-4 w-4" /> {result.w} x {result.h} px, {formatBytes(result.size)} (target {minKB} to {maxKB} KB)
              </p>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
