// /tools/pixel-art-maker - Draw pixel art on an 8x8 to 64x64 grid.
// Palette + custom color, brush/eraser/fill, undo/redo, scaled PNG export and
// data-URL copy. 100% in-browser.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Download, Eraser, PaintBucket, Paintbrush, Redo, Undo } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/pixel-art-maker")({
  head: () => {
    const seo = getToolSeoMeta("pixel-art-maker");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: PixelArtTool,
});

const SIZES = [8, 16, 24, 32, 48, 64];
const DEFAULT_PALETTE = [
  "#000000", "#ffffff", "#9ca3af", "#ef4444", "#f97316", "#facc15", "#22c55e",
  "#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899", "#78350f", "#1e3a8a", "#064e3b",
  "#fde68a", "#fbcfe8",
];

function emptyGrid(size: number): string[][] {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => ""));
}

function PixelArtTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("pixel-art-maker", isPro);
  const seo = getToolSeo("pixel-art-maker");

  const [size, setSize] = useState(16);
  const [grid, setGrid] = useState<string[][]>(() => emptyGrid(16));
  const [history, setHistory] = useState<string[][][]>([]);
  const [future, setFuture] = useState<string[][][]>([]);
  const [color, setColor] = useState("#14b8a6");
  const [customColor, setCustomColor] = useState("#14b8a6");
  const [tool, setTool] = useState<"brush" | "eraser" | "fill">("brush");
  const [drawing, setDrawing] = useState(false);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);

  const pushHistory = useCallback((g: string[][]) => {
    setHistory((h) => [...h.slice(-29), g.map((row) => [...row])]);
    setFuture([]);
  }, []);

  const changeSize = (s: number) => {
    pushHistory(grid);
    setSize(s);
    setGrid(emptyGrid(s));
    setHistory([]);
    setFuture([]);
  };

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      setGrid((g) => { setFuture((f) => [g.map((row) => [...row]), ...f].slice(0, 30)); return h[h.length - 1]!; });
      return h.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      setGrid((g) => { setHistory((h) => [...h.slice(-29), g.map((row) => [...row])]); return f[0]!; });
      return f.slice(1);
    });
  }, []);

  const paintCell = useCallback((gx: number, gy: number, g: string[][], paint: string) => {
    if (gx < 0 || gy < 0 || gx >= g.length || gy >= g.length) return;
    if (tool === "fill") {
      const target = g[gy]![gx]!;
      if (target === paint) return;
      const n = g.length;
      const stack: [number, number][] = [[gx, gy]];
      const seen = new Set<number>();
      while (stack.length) {
        const [x, y] = stack.pop()!;
        const key = y * n + x;
        if (seen.has(key) || x < 0 || y < 0 || x >= n || y >= n || g[y]![x]! !== target) continue;
        seen.add(key);
        g[y]![x] = paint;
        stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      }
    } else {
      g[gy]![gx] = tool === "eraser" ? "" : paint;
    }
  }, [tool]);

  const cellFromEvent = (e: React.PointerEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const gx = Math.floor(((e.clientX - rect.left) / rect.width) * size);
    const gy = Math.floor(((e.clientY - rect.top) / rect.height) * size);
    return { gx, gy };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    drawingRef.current = true;
    setDrawing(true);
    pushHistory(grid);
    const { gx, gy } = cellFromEvent(e);
    setGrid((g) => { const n = g.map((row) => [...row]); paintCell(gx, gy, n, color); return n; });
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawingRef.current || tool === "fill") return;
    const { gx, gy } = cellFromEvent(e);
    setGrid((g) => {
      if (g[gy]?.[gx] === (tool === "eraser" ? "" : color)) return g;
      const n = g.map((row) => [...row]);
      paintCell(gx, gy, n, color);
      return n;
    });
  };

  const endDraw = () => { drawingRef.current = false; setDrawing(false); };

  // render grid to canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const disp = 480;
    canvas.width = disp; canvas.height = disp;
    const ctx = canvas.getContext("2d")!;
    const cell = disp / size;
    ctx.clearRect(0, 0, disp, disp);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, disp, disp);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (grid[y]![x]) {
          ctx.fillStyle = grid[y]![x]!;
          ctx.fillRect(x * cell, y * cell, cell, cell);
        }
      }
    }
    if (size <= 32) {
      ctx.strokeStyle = "rgba(0,0,0,0.08)";
      ctx.lineWidth = 1;
      for (let i = 1; i < size; i++) {
        ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, disp); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * cell); ctx.lineTo(disp, i * cell); ctx.stroke();
      }
    }
  }, [grid, size]);

  const exportPng = useCallback(() => {
    if (!trial.canUse) return;
    const scale = 16;
    const canvas = document.createElement("canvas");
    canvas.width = size * scale; canvas.height = size * scale;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (grid[y]![x]) {
          ctx.fillStyle = grid[y]![x]!;
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
    }
    canvas.toBlob((b) => {
      if (!b) { toast.error("Could not encode PNG."); return; }
      downloadBlob(b, `pixel-art-${size}x${size}.png`);
      trial.recordUse();
      toast.success("Pixel art PNG downloaded");
    }, "image/png");
  }, [grid, size, trial]);

  const copyDataUrl = useCallback(async () => {
    if (!trial.canUse) return;
    const scale = 16;
    const canvas = document.createElement("canvas");
    canvas.width = size * scale; canvas.height = size * scale;
    const ctx = canvas.getContext("2d")!;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (grid[y]![x]) { ctx.fillStyle = grid[y]![x]!; ctx.fillRect(x * scale, y * scale, scale, scale); }
      }
    }
    try {
      await navigator.clipboard.writeText(canvas.toDataURL("image/png"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      trial.recordUse();
      toast.success("Data URL copied");
    } catch {
      toast.error("Copy failed - clipboard blocked by the browser.");
    }
  }, [grid, size, trial]);

  return (
    <ToolPageShell toolId="pixel-art-maker" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Pixel Art Maker" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Grid size</p>
            <div className="flex flex-wrap gap-2">
              {SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => changeSize(s)}
                  className={cn(
                    "rounded-xl border px-3.5 py-2 text-sm font-bold transition",
                    size === s ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {s}x{s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Tool</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "brush", label: "Brush", Icon: Paintbrush },
                { id: "eraser", label: "Eraser", Icon: Eraser },
                { id: "fill", label: "Fill", Icon: PaintBucket },
              ].map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTool(id as typeof tool)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl border px-3 py-2.5 transition",
                    tool === id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-xs font-bold">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Color</p>
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg border border-border" style={{ backgroundColor: color }} />
                <input
                  type="color" value={customColor}
                  onChange={(e) => { setCustomColor(e.target.value); setColor(e.target.value); }}
                  className="h-8 w-10 cursor-pointer rounded-lg border border-border bg-background"
                  aria-label="Custom color"
                />
              </div>
            </div>
            <div className="grid grid-cols-8 gap-1.5">
              {DEFAULT_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Color ${c}`}
                  className={cn(
                    "aspect-square rounded-lg border transition",
                    color === c ? "border-primary ring-2 ring-primary/40" : "border-border hover:scale-110",
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button" onClick={undo} disabled={history.length === 0}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-sm font-semibold transition hover:border-primary/40 disabled:opacity-40"
            >
              <Undo className="h-4 w-4" /> Undo
            </button>
            <button
              type="button" onClick={redo} disabled={future.length === 0}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-sm font-semibold transition hover:border-primary/40 disabled:opacity-40"
            >
              <Redo className="h-4 w-4" /> Redo
            </button>
          </div>

          <div className="flex gap-2">
            <ActionButton disabled={!trial.canUse} onClick={exportPng}>
              <Download className="h-4 w-4" /> PNG
            </ActionButton>
            <ActionButton disabled={!trial.canUse} onClick={copyDataUrl}>
              <Copy className="h-4 w-4" /> {copied ? "Copied" : "Data URL"}
            </ActionButton>
          </div>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free exports left - everything runs in your browser.
            </p>
          )}
        </div>

        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-card p-5">
          <canvas
            ref={canvasRef}
            className="max-w-full cursor-crosshair rounded-lg border border-border"
            style={{ aspectRatio: "1/1", width: "min(100%, 480px)" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDraw}
            onPointerCancel={endDraw}
            onContextMenu={(e) => e.preventDefault()}
          />
          <p className="text-xs text-muted-foreground">
            {drawing ? "Drawing..." : "Click and drag to draw. Pick Fill to flood-fill an area."}
          </p>
        </div>
      </div>
    </ToolPageShell>
  );
}
