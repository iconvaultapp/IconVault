// /tools/text-on-image - Add styled, draggable text layers to any image. Export JPG/PNG/WebP
// or the original format. 100% in-browser. No upload, no watermark.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileUp, Image as ImageIcon, Plus, Trash2, Type } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import { loadImageFile, canvasToBlob, baseName, extForMime, fillBackground } from "@/lib/image-tools";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/text-on-image")({
  head: () => {
    const seo = getToolSeoMeta("text-on-image");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: TextOnImageTool,
});

type Layer = {
  id: number;
  text: string;
  font: string;
  size: number;
  color: string;
  bold: boolean;
  shadow: boolean;
  x: number;
  y: number;
};

const FONTS = [
  { name: "Inter", css: "Inter, sans-serif" },
  { name: "Arial", css: "Arial, sans-serif" },
  { name: "Georgia", css: "Georgia, serif" },
  { name: "Times", css: "'Times New Roman', serif" },
  { name: "Courier", css: "'Courier New', monospace" },
  { name: "Impact", css: "Impact, 'Arial Black', sans-serif" },
  { name: "Comic Sans", css: "'Comic Sans MS', cursive" },
];

function TextOnImageTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("text-on-image", isPro);
  const seo = getToolSeo("text-on-image");

  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState("image/png");
  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [format, setFormat] = useState<"same" | "jpg" | "png" | "webp">("same");
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nextId = useRef(1);

  const acceptFile = useCallback(async (f: File) => {
    if (!f.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    try {
      const loaded = await loadImageFile(f);
      setImg(loaded);
      setFileName(baseName(f.name));
      setFileType(f.type);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that image.");
    }
  }, []);

  const drawLayers = useCallback((canvas: HTMLCanvasElement, w: number, h: number) => {
    if (!img) return;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, w, h);
    const scale = w / img.naturalWidth;
    for (const l of layers) {
      if (!l.text) continue;
      const size = l.size * scale;
      ctx.font = `${l.bold ? "700 " : ""}${size}px ${l.font}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      if (l.shadow) {
        ctx.shadowColor = "rgba(0,0,0,0.6)";
        ctx.shadowBlur = size / 8;
        ctx.shadowOffsetY = size / 14;
      } else {
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
      }
      const lines = l.text.split("\n");
      const lineH = size * 1.2;
      const startY = l.y * h - ((lines.length - 1) * lineH) / 2;
      lines.forEach((ln, i) => {
        ctx.fillStyle = l.color;
        ctx.fillText(ln, l.x * w, startY + i * lineH);
      });
    }
  }, [img, layers]);

  // Live preview.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    const maxSide = 620;
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    drawLayers(canvas, Math.round(img.naturalWidth * scale), Math.round(img.naturalHeight * scale));
  }, [img, drawLayers]);

  const addLayer = () => {
    if (layers.length >= 8) {
      toast.info("Eight text layers is the limit.");
      return;
    }
    const id = nextId.current++;
    setLayers((p) => [...p, {
      id, text: "", font: FONTS[0]!.css, size: 48, color: "#ffffff",
      bold: false, shadow: true, x: 0.5, y: 0.3 + p.length * 0.12,
    }]);
    setSelectedId(id);
  };

  const updateLayer = (id: number, patch: Partial<Layer>) =>
    setLayers((p) => p.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const exportImage = useCallback(async () => {
    if (!img || busy || !trial.canUse) return;
    setBusy(true);
    setError(null);
    try {
      const mime = format === "same" ? fileType : format === "jpg" ? "image/jpeg" : format === "png" ? "image/png" : "image/webp";
      const canvas = document.createElement("canvas");
      drawLayers(canvas, img.naturalWidth, img.naturalHeight);
      if (mime === "image/jpeg") fillBackground(canvas, "#ffffff");
      const blob = await canvasToBlob(canvas, mime, 0.92);
      downloadBlob(blob, `${fileName || "image"}.${extForMime(mime)}`);
      trial.recordUse();
      toast.success("Image exported");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  }, [img, busy, trial, drawLayers, format, fileType, fileName]);

  // Drag layers on the preview.
  const dragIdRef = useRef<number | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    const layer = [...layers].reverse().find(
      (l) => Math.abs(l.x - nx) < 0.18 && Math.abs(l.y - ny) < 0.07,
    );
    if (layer) {
      dragIdRef.current = layer.id;
      setSelectedId(layer.id);
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragIdRef.current == null) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const nx = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const ny = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    updateLayer(dragIdRef.current, { x: nx, y: ny });
  };
  const onPointerUp = () => {
    dragIdRef.current = null;
  };

  const selected = layers.find((l) => l.id === selectedId);

  return (
    <ToolPageShell toolId="text-on-image" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Text on Image" left={trial.left} />

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
            <p className="text-sm font-semibold">{fileName || "Drop an image"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Files never leave your device</p>
            <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void acceptFile(f); }} />
          </div>

          <button
            type="button" onClick={addLayer}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-2.5 text-sm font-semibold transition hover:border-primary/60"
          >
            <Plus className="h-4 w-4" /> Add text
          </button>

          {layers.length > 0 && (
            <div className="space-y-2">
              {layers.map((l, i) => (
                <button
                  key={l.id} type="button"
                  onClick={() => setSelectedId(l.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition",
                    selectedId === l.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
                  )}
                >
                  <Type className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate font-medium">{l.text || `Text layer ${i + 1}`}</span>
                </button>
              ))}
            </div>
          )}

          {selected && (
            <div className="space-y-4 rounded-xl border border-primary/40 p-4">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Text</label>
                <textarea
                  value={selected.text}
                  onChange={(e) => updateLayer(selected.id, { text: e.target.value })}
                  rows={2} placeholder="Your text here"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Font</label>
                <select
                  value={selected.font}
                  onChange={(e) => updateLayer(selected.id, { font: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                >
                  {FONTS.map((f) => (
                    <option key={f.name} value={f.css}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-[13px] font-medium text-foreground/80">Size</label>
                  <span className="text-xs font-bold text-muted-foreground">{selected.size}px</span>
                </div>
                <input
                  type="range" min={12} max={200} value={selected.size}
                  onChange={(e) => updateLayer(selected.id, { size: Number(e.target.value) })}
                  className="w-full accent-primary"
                />
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Color</label>
                  <input
                    type="color" value={selected.color}
                    onChange={(e) => updateLayer(selected.id, { color: e.target.value })}
                    className="h-10 w-16 cursor-pointer rounded-lg border border-border bg-transparent"
                  />
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                  <input type="checkbox" checked={selected.bold} onChange={(e) => updateLayer(selected.id, { bold: e.target.checked })} className="h-4 w-4 accent-primary" />
                  Bold
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                  <input type="checkbox" checked={selected.shadow} onChange={(e) => updateLayer(selected.id, { shadow: e.target.checked })} className="h-4 w-4 accent-primary" />
                  Shadow
                </label>
              </div>
              <button
                type="button"
                onClick={() => {
                  setLayers((p) => p.filter((l) => l.id !== selected.id));
                  setSelectedId(null);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/40 px-3 py-2 text-xs font-semibold text-destructive transition hover:bg-destructive/5"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete this layer
              </button>
            </div>
          )}

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Save as</p>
            <div className="flex gap-2">
              {(["same", "jpg", "png", "webp"] as const).map((f) => (
                <button
                  key={f} type="button" onClick={() => setFormat(f)}
                  className={cn("flex-1 rounded-xl border px-2 py-2 text-xs font-bold uppercase transition", format === f ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40")}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <ActionButton busy={busy} disabled={!img || !trial.canUse} onClick={exportImage}>
            <Download className="h-4 w-4" /> {busy ? "Exporting…" : "Export image"}
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
              <p className="font-semibold">Your image appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Add text layers, drag them anywhere on the photo, style each one, then export.
              </p>
            </div>
          ) : (
            <div className="flex min-h-[320px] items-center justify-center">
              <canvas
                ref={canvasRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                className="max-h-[70vh] max-w-full cursor-move rounded-xl"
              />
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
