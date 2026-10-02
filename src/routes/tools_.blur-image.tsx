// /tools/blur-image - Blur a photo with an adjustable strength slider, 100% in-browser.
// No upload, no watermark.

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

export const Route = createFileRoute("/tools_/blur-image")({
  head: () => {
    const seo = getToolSeoMeta("blur-image");
    const canonical = "https://iconvault.site/tools/blur-image";
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
  component: BlurTool,
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

function BlurTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("blur-image", isPro);
  const seo = getToolSeo("blur-image");

  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [name, setName] = useState("");
  const [strength, setStrength] = useState(12);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    const c = canvasRef.current;
    if (!img || !c) return;
    const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    c.width = w; c.height = h;
    const ctx = c.getContext("2d")!;
    ctx.filter = strength > 0 ? `blur(${strength}px)` : "none";
    ctx.drawImage(img, 0, 0, w, h);
    ctx.filter = "none";
  }, [img, strength]);

  const download = useCallback(() => {
    const c = canvasRef.current;
    if (!c || c.width === 0 || !trial.canUse) return;
    c.toBlob((b) => {
      if (!b) { setError("Could not encode PNG."); return; }
      downloadBlob(b, `${name || "blurred"}-blur-${strength}px.png`);
      trial.recordUse();
      toast.success("Blurred PNG downloaded");
    }, "image/png");
  }, [name, strength, trial]);

  return (
    <ToolPageShell toolId="blur-image" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Blur Image" left={trial.left} />

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
            <p className="mt-1 text-xs text-muted-foreground">Large images are capped at 1600px for speed</p>
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void acceptFile(f); }} />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Blur strength</p>
              <span className="text-[13px] font-bold text-primary">{strength}px</span>
            </div>
            <input
              type="range" min={0} max={60} value={strength}
              onChange={(e) => setStrength(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Great for blurring backgrounds, faces or license plates.
            </p>
          </div>

          <ActionButton disabled={!img || !trial.canUse} onClick={download}>
            <Download className="h-4 w-4" /> Download PNG
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free blurs left - files never leave your device.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {!img ? (
            <div className="flex h-full min-h-[340px] flex-col items-center justify-center text-center">
              <ImageIcon className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your blurred image appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                The preview updates live as you move the strength slider.
              </p>
            </div>
          ) : (
            <div className="flex min-h-[340px] items-center justify-center">
              <canvas ref={canvasRef} className="max-h-[560px] max-w-full rounded-lg" />
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
