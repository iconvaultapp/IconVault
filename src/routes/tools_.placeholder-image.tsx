// /tools/placeholder-image - Generate custom placeholder images with your own
// dimensions, colors, text and font size. Live preview, PNG/JPG download. 100% in-browser.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/placeholder-image")({
  head: () => {
    const seo = getToolSeoMeta("placeholder-image");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: PlaceholderTool,
});

function PlaceholderTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("placeholder-image", isPro);
  const seo = getToolSeo("placeholder-image");

  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(600);
  const [bg, setBg] = useState("#0f766e");
  const [fg, setFg] = useState("#ffffff");
  const [text, setText] = useState("");
  const [fontSize, setFontSize] = useState(64);
  const [format, setFormat] = useState<"png" | "jpg">("png");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const label = text.trim() || `${width} x ${height}`;

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const w = Math.min(2000, Math.max(1, width || 1));
    const h = Math.min(2000, Math.max(1, height || 1));
    c.width = w; c.height = h;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = fg;
    ctx.font = `700 ${fontSize}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, w / 2, h / 2, w * 0.92);
  }, [width, height, bg, fg, label, fontSize]);

  const download = useCallback(() => {
    const c = canvasRef.current;
    if (!c || c.width === 0 || !trial.canUse) return;
    c.toBlob((b) => {
      if (!b) { toast.error("Could not encode image."); return; }
      downloadBlob(b, `placeholder-${width}x${height}.${format}`);
      trial.recordUse();
      toast.success(`Placeholder ${format.toUpperCase()} downloaded`);
    }, format === "png" ? "image/png" : "image/jpeg", 0.92);
  }, [width, height, format, trial]);

  const numInput = (value: number, set: (n: number) => void, labelText: string) => (
    <div>
      <p className="mb-1.5 text-[13px] font-medium text-foreground/80">{labelText}</p>
      <input
        type="number" value={value} min={1} max={2000}
        onChange={(e) => set(Math.min(2000, Math.max(1, Number(e.target.value) || 1)))}
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
      />
    </div>
  );

  const colorInput = (value: string, set: (c: string) => void, labelText: string) => (
    <div>
      <p className="mb-1.5 text-[13px] font-medium text-foreground/80">{labelText}</p>
      <div className="flex items-center gap-2">
        <input
          type="color" value={value}
          onChange={(e) => set(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded-lg border border-border bg-background"
          aria-label={labelText}
        />
        <input
          type="text" value={value}
          onChange={(e) => { const v = e.target.value; if (/^#[0-9a-fA-F]{6}$/.test(v)) set(v); }}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm uppercase"
          maxLength={7}
        />
      </div>
    </div>
  );

  return (
    <ToolPageShell toolId="placeholder-image" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Placeholder Image" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div className="grid grid-cols-2 gap-3">
            {numInput(width, setWidth, "Width (px)")}
            {numInput(height, setHeight, "Height (px)")}
          </div>

          {colorInput(bg, setBg, "Background color")}
          {colorInput(fg, setFg, "Text color")}

          <div>
            <p className="mb-1.5 text-[13px] font-medium text-foreground/80">Text (blank = W x H)</p>
            <input
              type="text" value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="800 x 600"
              maxLength={60}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Font size</p>
              <span className="text-[13px] font-bold text-primary">{fontSize}px</span>
            </div>
            <input
              type="range" min={12} max={300} value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Download format</p>
            <div className="flex gap-2">
              {(["png", "jpg"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormat(f)}
                  className={cn(
                    "rounded-xl border px-4 py-2 text-sm font-bold uppercase transition",
                    format === f ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <ActionButton disabled={!trial.canUse} onClick={download}>
            <Download className="h-4 w-4" /> Download {format.toUpperCase()}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free placeholders left - generated locally in your browser.
            </p>
          )}
        </div>

        <div className="flex min-h-[340px] flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card p-5">
          <canvas ref={canvasRef} className="max-h-[540px] max-w-full rounded-lg border border-border" />
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ImageIcon className="h-3.5 w-3.5" /> Live preview - exactly what downloads.
          </p>
        </div>
      </div>
    </ToolPageShell>
  );
}
