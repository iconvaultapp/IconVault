// /tools/redact-image - Permanently black out (or color-fill) regions of an
// image in your browser. Covered pixels are gone for good. Nothing uploaded.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileUp, Square, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import { loadImageFile, baseName, extForMime, fillBackground } from "@/lib/image-tools";

export const Route = createFileRoute("/tools_/redact-image")({
  head: () => {
    const seo = getToolSeoMeta("redact-image");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: RedactImageTool,
});

interface Box {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

type Format = "same" | "jpg" | "png" | "webp";

const MAX_DISPLAY = 860;
let nextId = 1;

function RedactImageTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("redact-image", isPro);
  const seo = getToolSeo("redact-image");

  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [fileName, setFileName] = useState("");
  const [srcMime, setSrcMime] = useState("image/png");
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [color, setColor] = useState("#000000");
  const [format, setFormat] = useState<Format>("same");
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragMode = useRef<"none" | "new" | "move" | "resize">("none");
  const dragAnchor = useRef({ x: 0, y: 0, bx: 0, by: 0, bw: 0, bh: 0 });

  const acceptFile = useCallback(async (f: File) => {
    if (!f.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    try {
      const loaded = await loadImageFile(f);
      setImg(loaded);
      setFileName(f.name);
      setSrcMime(f.type || "image/png");
      setBoxes([]);
      setSelectedId(null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that image.");
    }
  }, []);

  const view = img
    ? (() => {
        const s = Math.min(1, MAX_DISPLAY / Math.max(img.naturalWidth, img.naturalHeight));
        return { w: Math.round(img.naturalWidth * s), h: Math.round(img.naturalHeight * s) };
      })()
    : null;

  // Render image + redaction boxes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !img || !view) return;
    canvas.width = view.w;
    canvas.height = view.h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, view.w, view.h);
    boxes.forEach((b, i) => {
      const x = b.x * view.w;
      const y = b.y * view.h;
      const w = b.w * view.w;
      const h = b.h * view.h;
      const selected = b.id === selectedId;
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(x, y, w, h);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = selected ? "#0F766E" : "#ffffff";
      ctx.lineWidth = selected ? 3 : 2;
      ctx.setLineDash([8, 5]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
      ctx.fillStyle = selected ? "#0F766E" : "#111827";
      ctx.font = "bold 13px system-ui";
      const label = ` ${i + 1} `;
      const tw = ctx.measureText(label).width;
      ctx.fillRect(x, y, tw + 8, 22);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(label, x + 4, y + 16);
      if (selected) {
        ctx.fillStyle = "#0F766E";
        ctx.fillRect(x + w - 9, y + h - 9, 18, 18);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.strokeRect(x + w - 9, y + h - 9, 18, 18);
      }
    });
  }, [img, boxes, selectedId, color, view]);

  const toNorm = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    };
  };

  const boxAt = (p: { x: number; y: number }) => {
    for (let i = boxes.length - 1; i >= 0; i--) {
      const b = boxes[i];
      if (!b) continue;
      if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) return b;
    }
    return null;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!img || !view) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const p = toNorm(e);
    const sel = boxes.find((b) => b.id === selectedId);
    if (sel && view) {
      const hx = (sel.x + sel.w) * view.w;
      const hy = (sel.y + sel.h) * view.h;
      const rect = canvasRef.current!.getBoundingClientRect();
      const scale = rect.width / view.w;
      if (Math.abs(e.clientX - rect.left - hx * scale) < 14 && Math.abs(e.clientY - rect.top - hy * scale) < 14) {
        dragMode.current = "resize";
        dragAnchor.current = { x: p.x, y: p.y, bx: sel.x, by: sel.y, bw: sel.w, bh: sel.h };
        return;
      }
    }
    const hit = boxAt(p);
    if (hit) {
      setSelectedId(hit.id);
      dragMode.current = "move";
      dragAnchor.current = { x: p.x, y: p.y, bx: hit.x, by: hit.y, bw: hit.w, bh: hit.h };
    } else {
      const id = nextId++;
      setSelectedId(id);
      setBoxes((prev) => [...prev, { id, x: p.x, y: p.y, w: 0, h: 0 }]);
      dragMode.current = "new";
      dragAnchor.current = { x: p.x, y: p.y, bx: p.x, by: p.y, bw: 0, bh: 0 };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const mode = dragMode.current;
    if (mode === "none") return;
    const p = toNorm(e);
    const a = dragAnchor.current;
    const id = selectedId;
    if (id === null) return;
    setBoxes((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        if (mode === "new") {
          const x = Math.min(a.bx, p.x);
          const y = Math.min(a.by, p.y);
          return { ...b, x, y, w: Math.abs(p.x - a.bx), h: Math.abs(p.y - a.by) };
        }
        if (mode === "move") {
          const nx = Math.min(1 - b.w, Math.max(0, a.bx + p.x - a.x));
          const ny = Math.min(1 - b.h, Math.max(0, a.by + p.y - a.y));
          return { ...b, x: nx, y: ny };
        }
        return {
          ...b,
          w: Math.max(0.01, Math.min(1 - b.x, p.x - b.x)),
          h: Math.max(0.01, Math.min(1 - b.y, p.y - b.y)),
        };
      }),
    );
  };

  const onPointerUp = () => {
    if (dragMode.current === "new" && selectedId !== null) {
      const id = selectedId;
      setBoxes((prev) => prev.filter((b) => b.id !== id || (b.w > 0.015 && b.h > 0.015)));
    }
    dragMode.current = "none";
  };

  const deleteSelected = () => {
    if (selectedId === null) return;
    setBoxes((prev) => prev.filter((b) => b.id !== selectedId));
    setSelectedId(null);
  };

  const exportImage = useCallback(async () => {
    if (!img || boxes.length === 0 || busy || !trial.canUse) return;
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
      setError("Fill color must be a 6-digit hex code like #000000.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const W = img.naturalWidth;
      const H = img.naturalHeight;
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d")!;
      let mime = format === "same" ? srcMime : `image/${format}`;
      if (!["image/jpeg", "image/png", "image/webp"].includes(mime)) mime = "image/png";
      if (mime === "image/jpeg") fillBackground(canvas, "#ffffff");
      ctx.drawImage(img, 0, 0, W, H);
      // Solid fill, full opacity: the covered pixels are destroyed, not hidden.
      ctx.fillStyle = color;
      for (const b of boxes) {
        ctx.fillRect(Math.round(b.x * W), Math.round(b.y * H), Math.max(1, Math.round(b.w * W)), Math.max(1, Math.round(b.h * H)));
      }
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Could not encode the image."))),
          mime,
          0.92,
        );
      });
      downloadBlob(blob, `${baseName(fileName) || "photo"}-redacted.${extForMime(mime)}`);
      trial.recordUse();
      toast.success("Redacted image downloaded");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  }, [img, boxes, busy, trial, color, format, fileName, srcMime]);

  return (
    <ToolPageShell toolId="redact-image" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Redact Image" left={trial.left} />

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
            <p className="text-sm font-semibold">{fileName || "Drop an image here"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Then drag boxes over what to cover</p>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void acceptFile(f); e.target.value = ""; }}
            />
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Fill color</p>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-11 w-14 cursor-pointer rounded-lg border border-border bg-transparent p-1"
                aria-label="Fill color"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                spellCheck={false}
                className="w-28 rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm uppercase"
                aria-label="Fill color hex"
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Save format</p>
            <div className="grid grid-cols-4 gap-2">
              {(["same", "jpg", "png", "webp"] as Format[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormat(f)}
                  className={cn(
                    "rounded-xl border px-2 py-2 text-xs font-bold uppercase transition",
                    format === f
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-muted/60 p-4 text-xs leading-relaxed text-muted-foreground">
            The image is re-encoded, so covered pixels are gone for good. Metadata is removed too.
          </div>

          <ActionButton busy={busy} disabled={!img || boxes.length === 0 || !trial.canUse} onClick={exportImage}>
            <Download className="h-4 w-4" /> {busy ? "Exporting…" : "Export image"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free exports left, files never leave your device.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {!img ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <Square className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Draw boxes to redact</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Upload an image, drag boxes over names, numbers, faces or anything sensitive, then
                export. Drag a box to move it, use its corner handle to resize.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={deleteSelected}
                  disabled={selectedId === null}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground hover:border-red-400 hover:text-red-500 disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete box
                </button>
                <button
                  type="button"
                  onClick={() => { setBoxes([]); setSelectedId(null); }}
                  disabled={boxes.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground hover:border-primary/40 disabled:opacity-40"
                >
                  <X className="h-3.5 w-3.5" /> Clear all
                </button>
                <span className="ml-auto text-xs text-muted-foreground">
                  {boxes.length} box{boxes.length === 1 ? "" : "es"}
                </span>
              </div>
              <div className="flex justify-center overflow-hidden rounded-xl bg-[repeating-conic-gradient(#80808033_0_25%,transparent_0_50%)] bg-[length:20px_20px] p-4">
                <canvas
                  ref={canvasRef}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  className="max-h-[70vh] w-auto max-w-full cursor-crosshair touch-none rounded"
                  style={{ aspectRatio: view ? `${view.w} / ${view.h}` : undefined }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
