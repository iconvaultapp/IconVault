// /tools/meme-generator - Classic meme maker: top/bottom text plus draggable extra layers,
// Impact white-on-black style, JPG/PNG export. 100% in-browser. No upload, no watermark.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileUp, Image as ImageIcon, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/meme-generator";
import toolSeoMeta from "@/lib/tool-seo-meta-data/meme-generator";
import { loadImageFile, canvasToBlob, baseName, fillBackground } from "@/lib/image-tools";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/meme-generator")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/meme-generator";
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
  component: MemeTool,
});

type Layer = { id: number; text: string; x: number; y: number };

function MemeTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("meme-generator", isPro);
  const seo = toolSeo;

  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [fileName, setFileName] = useState("");
  const [topText, setTopText] = useState("");
  const [bottomText, setBottomText] = useState("");
  const [fontPct, setFontPct] = useState(10);
  const [format, setFormat] = useState<"png" | "jpg">("png");
  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedLayer, setSelectedLayer] = useState<number | null>(null);
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
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that image.");
    }
  }, []);

  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
    const words = text.toUpperCase().split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines.length ? lines : [""];
  };

  const drawMeme = useCallback((canvas: HTMLCanvasElement, w: number, h: number) => {
    if (!img) return;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, w, h);
    const fontSize = Math.max(12, Math.round((h * fontPct) / 100));
    ctx.font = `${fontSize}px Impact, Haettenschweiler, 'Arial Black', sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = Math.max(2, fontSize / 12);

    const drawBlock = (text: string, centerY: number) => {
      const lines = wrapText(ctx, text, w * 0.94);
      const lineH = fontSize * 1.15;
      const startY = centerY - ((lines.length - 1) * lineH) / 2;
      lines.forEach((ln, i) => {
        const y = startY + i * lineH;
        ctx.strokeText(ln, w / 2, y);
        ctx.fillText(ln, w / 2, y);
      });
    };

    if (topText.trim()) drawBlock(topText, fontSize * 0.7);
    if (bottomText.trim()) drawBlock(bottomText, h - fontSize * 0.7);
    for (const layer of layers) {
      if (!layer.text.trim()) continue;
      const lines = wrapText(ctx, layer.text, w * 0.94);
      const lineH = fontSize * 1.15;
      const startY = layer.y * h - ((lines.length - 1) * lineH) / 2;
      lines.forEach((ln, i) => {
        const y = startY + i * lineH;
        ctx.strokeText(ln, layer.x * w, y);
        ctx.fillText(ln, layer.x * w, y);
      });
    }
  }, [img, topText, bottomText, fontPct, layers]);

  // Live preview.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    const maxSide = 560;
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    drawMeme(canvas, Math.round(img.naturalWidth * scale), Math.round(img.naturalHeight * scale));
  }, [img, drawMeme]);

  const addLayer = () => {
    if (layers.length >= 5) {
      toast.info("Five extra text layers is the limit.");
      return;
    }
    const id = nextId.current++;
    setLayers((p) => [...p, { id, text: "", x: 0.5, y: 0.5 }]);
    setSelectedLayer(id);
  };

  const exportMeme = useCallback(async () => {
    if (!img || busy || !trial.canUse) return;
    setBusy(true);
    setError(null);
    try {
      const canvas = document.createElement("canvas");
      drawMeme(canvas, img.naturalWidth, img.naturalHeight);
      if (format === "jpg") fillBackground(canvas, "#000000");
      const blob = await canvasToBlob(canvas, format === "jpg" ? "image/jpeg" : "image/png", 0.92);
      downloadBlob(blob, `${fileName || "meme"}.${format === "jpg" ? "jpg" : "png"}`);
      trial.recordUse();
      toast.success("Meme exported");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  }, [img, busy, trial, drawMeme, format, fileName]);

  // Draggable layer handles on the preview canvas.
  const previewDragRef = useRef<number | null>(null);
  const onPreviewPointerDown = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    const layer = [...layers].reverse().find(
      (l) => Math.abs(l.x - nx) < 0.12 && Math.abs(l.y - ny) < 0.08,
    );
    if (layer) {
      previewDragRef.current = layer.id;
      setSelectedLayer(layer.id);
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    }
  };
  const onPreviewPointerMove = (e: React.PointerEvent) => {
    if (previewDragRef.current == null) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const nx = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const ny = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    const id = previewDragRef.current;
    setLayers((p) => p.map((l) => (l.id === id ? { ...l, x: nx, y: ny } : l)));
  };
  const onPreviewPointerUp = () => {
    previewDragRef.current = null;
  };

  return (
    <ToolPageShell toolId="meme-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Meme Generator" left={trial.left} />

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
            <p className="text-sm font-semibold">{fileName || "Drop an image"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Files never leave your device</p>
            <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void acceptFile(f); }} />
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Top text</label>
            <input
              value={topText} onChange={(e) => setTopText(e.target.value)}
              placeholder="TOP TEXT"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm uppercase outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Bottom text</label>
            <input
              value={bottomText} onChange={(e) => setBottomText(e.target.value)}
              placeholder="BOTTOM TEXT"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm uppercase outline-none focus:border-primary"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-[13px] font-medium text-foreground/80">Font size</label>
              <span className="text-xs font-bold text-muted-foreground">{fontPct}% of height</span>
            </div>
            <input
              type="range" min={4} max={20} value={fontPct}
              onChange={(e) => setFontPct(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          <button
            type="button" onClick={addLayer}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-2.5 text-sm font-semibold transition hover:border-primary/60"
          >
            <Plus className="h-4 w-4" /> Add extra text
          </button>
          {layers.map((l) => (
            <div key={l.id} className={cn("rounded-xl border p-3", selectedLayer === l.id ? "border-primary" : "border-border")}>
              <div className="flex items-center gap-2">
                <input
                  value={l.text} onChange={(e) => setLayers((p) => p.map((x) => (x.id === l.id ? { ...x, text: e.target.value } : x)))}
                  placeholder="Extra text"
                  onFocus={() => setSelectedLayer(l.id)}
                  className="w-full rounded-lg border border-border bg-background px-2.5 py-2 text-sm uppercase outline-none focus:border-primary"
                />
                <button
                  type="button" onClick={() => setLayers((p) => p.filter((x) => x.id !== l.id))}
                  className="rounded-lg p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Delete text layer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">Drag the text on the preview to move it.</p>
            </div>
          ))}

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Format</p>
            <div className="flex gap-2">
              {(["png", "jpg"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormat(f)}
                  className={cn(
                    "flex-1 rounded-xl border px-3 py-2.5 text-sm font-bold uppercase transition",
                    format === f ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <ActionButton busy={busy} disabled={!img || !trial.canUse} onClick={exportMeme}>
            <Download className="h-4 w-4" /> {busy ? "Exporting…" : "Export meme"}
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
              <p className="font-semibold">Your meme appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Classic meme look: Impact, white fill, black stroke. Long lines wrap automatically.
              </p>
            </div>
          ) : (
            <div className="flex min-h-[320px] items-center justify-center">
              <canvas
                ref={canvasRef}
                onPointerDown={onPreviewPointerDown}
                onPointerMove={onPreviewPointerMove}
                onPointerUp={onPreviewPointerUp}
                className="max-h-[70vh] max-w-full cursor-move rounded-xl"
              />
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
