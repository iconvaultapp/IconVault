// /tools/app-icon-generator - Build a complete iOS + Android icon package (PNG set + site.webmanifest)
// from one square image. 100% in-browser. No upload, no watermark.

import { useCallback, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileUp, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/app-icon-generator";
import toolSeoMeta from "@/lib/tool-seo-meta-data/app-icon-generator";
import { loadImageFile, canvasToBlob, drawContain } from "@/lib/image-tools";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/app-icon-generator")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/app-icon-generator";
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
  component: AppIconGenerator,
});

const IOS_SIZES = [1024, 180, 167, 152, 120, 87, 80, 60, 58, 40, 29];
const ANDROID_SIZES = [192, 144, 96, 72, 48];
const MASKABLE = 512;

function AppIconGenerator() {
  const { isPro } = usePlan();
  const trial = useToolTrial("app-icon-generator", isPro);
  const seo = toolSeo;

  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [name, setName] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [padding, setPadding] = useState(0);
  const [bg, setBg] = useState("#ffffff");
  const [transparent, setTransparent] = useState(false);
  const [appName, setAppName] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptFile = useCallback(async (f: File) => {
    if (!f.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    try {
      const loaded = await loadImageFile(f);
      setImg(loaded);
      setName(f.name.replace(/\.[^.]+$/, ""));
      setPreviewUrl(URL.createObjectURL(f));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that image.");
    }
  }, []);

  /** Render the icon artwork on a canvas at `size` px with padding + background. */
  const renderIcon = useCallback((size: number): HTMLCanvasElement => {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    if (!transparent) {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, size, size);
    }
    const inset = Math.round((size * padding) / 100 / 2);
    if (img) drawContain(ctx, img, img.naturalWidth, img.naturalHeight, inset, inset, size - inset * 2, size - inset * 2);
    return canvas;
  }, [img, padding, bg, transparent]);

  const generate = useCallback(async () => {
    if (!img || busy || !trial.canUse) return;
    setBusy(true);
    setError(null);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const base = name || "app-icon";
      const label = appName.trim() || base;
      const manifestIcons: { src: string; sizes: string; type: string; purpose?: string }[] = [];

      for (const s of IOS_SIZES) {
        const blob = await canvasToBlob(renderIcon(s), "image/png");
        const fname = `ios/icon-${s}x${s}.png`;
        zip.file(fname, blob);
      }
      for (const s of ANDROID_SIZES) {
        const blob = await canvasToBlob(renderIcon(s), "image/png");
        const fname = `android/icon-${s}x${s}.png`;
        zip.file(fname, blob);
        manifestIcons.push({ src: fname, sizes: `${s}x${s}`, type: "image/png" });
      }
      // Maskable icon: full-bleed artwork with safe-zone padding, needs a background.
      const maskCanvas = document.createElement("canvas");
      maskCanvas.width = MASKABLE;
      maskCanvas.height = MASKABLE;
      const mctx = maskCanvas.getContext("2d")!;
      mctx.fillStyle = transparent ? "#ffffff" : bg;
      mctx.fillRect(0, 0, MASKABLE, MASKABLE);
      drawContain(mctx, img, img.naturalWidth, img.naturalHeight, 51, 51, MASKABLE - 102, MASKABLE - 102);
      const maskBlob = await canvasToBlob(maskCanvas, "image/png");
      zip.file("android/maskable-512x512.png", maskBlob);
      manifestIcons.push({ src: "android/maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" });

      const manifest = {
        name: label,
        short_name: label,
        icons: manifestIcons,
        display: "standalone",
      };
      zip.file("site.webmanifest", JSON.stringify(manifest, null, 2));

      const out = await zip.generateAsync({ type: "blob" });
      downloadBlob(out, `${base}-icons.zip`);
      trial.recordUse();
      toast.success("Icon package downloaded");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setBusy(false);
    }
  }, [img, busy, trial, name, appName, bg, transparent, renderIcon]);

  return (
    <ToolPageShell toolId="app-icon-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="App Icon Generator" left={trial.left} />

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
            <p className="text-sm font-semibold">{name || "Drop a square icon artwork"}</p>
            <p className="mt-1 text-xs text-muted-foreground">1024 x 1024 works best, files never leave your device</p>
            <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void acceptFile(f); }} />
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">App name</label>
            <input
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="My Awesome App"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-[13px] font-medium text-foreground/80">Padding</label>
              <span className="text-xs font-bold text-muted-foreground">{padding}%</span>
            </div>
            <input
              type="range" min={0} max={40} value={padding}
              onChange={(e) => setPadding(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Background</label>
            <div className="flex items-center gap-3">
              <input
                type="color" value={bg}
                onChange={(e) => { setBg(e.target.value); setTransparent(false); }}
                disabled={transparent}
                className="h-10 w-14 cursor-pointer rounded-lg border border-border bg-transparent disabled:opacity-40"
              />
              <button
                type="button"
                onClick={() => setTransparent((t) => !t)}
                className={cn(
                  "rounded-xl border px-3 py-2 text-xs font-semibold transition",
                  transparent ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                Transparent
              </button>
            </div>
          </div>

          <ActionButton busy={busy} disabled={!img || !trial.canUse} onClick={generate}>
            <Download className="h-4 w-4" /> {busy ? "Building…" : "Generate icons"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free packages left - everything runs in your browser.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {!img ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <ImageIcon className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your artwork appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                One ZIP with the full iOS set, Android set, a maskable icon, and a ready-to-drop-in site.webmanifest.
              </p>
            </div>
          ) : (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-6">
              <div className="rounded-lg bg-[repeating-conic-gradient(#80808033_0_25%,transparent_0_50%)] bg-[length:20px_20px] p-6">
                <img src={previewUrl} alt="Source artwork" className="max-h-52 rounded-xl" />
              </div>
              <div className="flex flex-wrap items-end justify-center gap-4">
                {[180, 120, 87, 60, 29].map((s) => (
                  <div key={s} className="flex flex-col items-center gap-1">
                    <img src={previewUrl} alt={`${s}px`} width={s} height={s} className="rounded" />
                    <span className="text-xs font-bold text-muted-foreground">{s}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                ZIP contains: {IOS_SIZES.length} iOS sizes + {ANDROID_SIZES.length} Android sizes + 1 maskable + site.webmanifest
              </p>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
