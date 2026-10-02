// /tools/svg-to-png - paste or upload an SVG, rasterize to PNG at
// 256/512/1024/2048px, or export all sizes as a ZIP. 100% in-browser.

import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Download, FileUp, ImageDown } from "lucide-react";
import JSZip from "jszip";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/svg-to-png")({
  head: () => {
    const seo = getToolSeoMeta("svg-to-png");
    const canonical = "https://iconvault.site/tools/svg-to-png";
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
  component: SvgToPngTool,
});

const SIZES = [256, 512, 1024, 2048];

interface PngResult {
  size: number;
  blob: Blob;
  url: string;
  w: number;
  h: number;
}

/** The opening <svg …> tag - null when the pasted text has no SVG root. */
function svgRootTag(svg: string): string | null {
  const m = svg.match(/<svg\b[^>]*>/i);
  return m ? m[0] : null;
}

/** width/height in px read ONLY from the root <svg> tag (never stroke-width etc).
 *  Ignores % and relative units - those aren't absolute pixel sizes. */
function rootAttrPx(tag: string, name: "width" | "height"): number {
  const m = tag.match(new RegExp(`(?:\\s|^)${name}\\s*=\\s*["']([^"']+)["']`, "i"));
  if (!m) return 0;
  const raw = m[1];
  if (!raw) return 0;
  const v = raw.trim();
  const num = parseFloat(v);
  if (!Number.isFinite(num) || num <= 0) return 0;
  if (/%|em|ex|cm|mm|in|pc|pt/.test(v)) return 0;
  return num;
}

function rootViewBox(tag: string): { w: number; h: number } | null {
  const m = tag.match(/viewBox\s*=\s*["']\s*-?[\d.]+\s+-?[\d.]+\s+([\d.]+)\s+([\d.]+)\s*["']/i);
  if (!m) return null;
  const w = parseFloat(m[1] ?? "");
  const h = parseFloat(m[2] ?? "");
  return w > 0 && h > 0 ? { w, h } : null;
}

/** Height/width ratio from the root tag's viewBox (or width/height attrs); 1 = square. */
function parseAspect(svg: string): number {
  const tag = svgRootTag(svg);
  if (!tag) return 1;
  const vb = rootViewBox(tag);
  if (vb) return vb.h / vb.w;
  const w = rootAttrPx(tag, "width");
  const h = rootAttrPx(tag, "height");
  if (w > 0) return h / w;
  return 1;
}

/** Natural rendered size of the SVG in px - width/height attrs first, then viewBox. */
function parseNaturalSize(svg: string): { w: number; h: number } {
  const tag = svgRootTag(svg);
  if (!tag) return { w: 512, h: 512 };
  const w = rootAttrPx(tag, "width");
  const h = rootAttrPx(tag, "height");
  if (w > 0 && h > 0) return { w, h };
  const vb = rootViewBox(tag);
  if (vb) return vb;
  return { w: 512, h: 512 };
}

/** Inject explicit width/height so browsers rasterize at the target size. */
function withSize(svg: string, w: number, h: number): string {
  return svg.replace(/<svg([^>]*)>/, (_m, attrs: string) => {
    const a = String(attrs).replace(/\s(width|height)="[^"]*"/g, "");
    return `<svg${a} width="${w}" height="${h}">`;
  });
}

function renderPng(svg: string, size: number, bg: string | null): Promise<{ blob: Blob; w: number; h: number }> {
  return new Promise((resolve, reject) => {
    if (!svgRootTag(svg)) {
      reject(new Error("That doesn't look like SVG markup - no <svg> tag found."));
      return;
    }
    const ratio = parseAspect(svg);
    const w = size;
    const h = Math.max(1, Math.round(size * ratio));
    const sized = withSize(svg, w, h);
    const url = URL.createObjectURL(new Blob([sized], { type: "image/svg+xml;charset=utf-8" }));
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas is not supported in this browser.");
        if (bg) {
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, w, h);
        }
        ctx.drawImage(img, 0, 0, w, h);
        // Accuracy guard: never hand back a blank PNG silently. If every
        // sampled pixel is (near-)transparent, the SVG didn't render anything.
        const data = ctx.getImageData(0, 0, w, h).data;
        let visible = false;
        for (let i = 3; i < data.length; i += 32) {
          if ((data[i] ?? 0) > 8) { visible = true; break; }
        }
        if (!visible && !bg) {
          throw new Error("The SVG rendered blank - check that the markup is valid and has visible content.");
        }
        canvas.toBlob(
          (b) => (b ? resolve({ blob: b, w, h }) : reject(new Error("PNG encoding failed."))),
          "image/png",
        );
      } catch (e) {
        reject(e instanceof Error ? e : new Error("Render failed."));
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Invalid SVG - the browser could not render it."));
    };
    img.src = url;
  });
}

function SvgToPngTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("svg-to-png", isPro);
  const seo = getToolSeo("svg-to-png");

  const [svg, setSvg] = useState("");
  const [fileName, setFileName] = useState("icon");
  const [size, setSize] = useState(1024);
  const [scale, setScale] = useState<number | null>(null);
  const [bg, setBg] = useState<"transparent" | "white" | "black" | "custom">("transparent");
  const [customBg, setCustomBg] = useState("#6366f1");
  const [results, setResults] = useState<PngResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const bgFill = bg === "transparent" ? null : bg === "custom" ? customBg : bg;
  const ratio = parseAspect(svg);
  const dimW = size;
  const dimH = Math.max(1, Math.round(size * ratio));

  const pickSize = (s: number) => {
    setSize(s);
    setScale(null);
  };

  const applyScale = (s: number) => {
    if (!svg.trim()) {
      toast.error("Paste an SVG or upload a file first.");
      return;
    }
    const natural = parseNaturalSize(svg);
    setSize(Math.max(1, Math.round(Math.max(natural.w, natural.h) * s)));
    setScale(s);
  };

  const setWidth = (w: number) => {
    if (!Number.isFinite(w) || w <= 0) return;
    setSize(ratio >= 1 ? Math.max(1, Math.round(w * ratio)) : w);
    setScale(null);
  };

  const setHeight = (h: number) => {
    if (!Number.isFinite(h) || h <= 0) return;
    setSize(ratio >= 1 ? h : Math.max(1, Math.round(h / ratio)));
    setScale(null);
  };

  const acceptFile = async (f: File | undefined) => {
    if (!f) return;
    if (!/\.svg$/i.test(f.name) && f.type !== "image/svg+xml") {
      toast.error("Please upload an .svg file.");
      return;
    }
    try {
      const text = await f.text();
      setSvg(text);
      setFileName(f.name.replace(/\.svg$/i, "") || "icon");
      setResults([]);
      setError(null);
    } catch {
      toast.error("Could not read that file.");
    }
  };

  const convert = async (targetSize: number) => {
    if (!svg.trim()) {
      toast.error("Paste an SVG or upload a file first.");
      return;
    }
    if (busy || !trial.canUse) return;
    setBusy(true);
    setError(null);
    try {
      const { blob, w, h } = await renderPng(svg, targetSize, bgFill);
      setResults((prev) => {
        const rest = prev.filter((r) => r.size !== targetSize);
        return [...rest, { size: targetSize, blob, url: URL.createObjectURL(blob), w, h }].sort(
          (a, b) => a.size - b.size,
        );
      });
      trial.recordUse();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Conversion failed.");
    } finally {
      setBusy(false);
    }
  };

  const downloadZip = async () => {
    if (!svg.trim() || busy || !trial.canUse) return;
    setBusy(true);
    setError(null);
    try {
      const zip = new JSZip();
      for (const s of SIZES) {
        const { blob, w, h } = await renderPng(svg, s, bgFill);
        zip.file(`${fileName}-${w}x${h}.png`, blob);
      }
      downloadBlob(await zip.generateAsync({ type: "blob" }), `${fileName}-png-sizes.zip`);
      toast.success("All 4 sizes exported as ZIP.");
      trial.recordUse();
    } catch (e) {
      setError(e instanceof Error ? e.message : "ZIP export failed.");
    } finally {
      setBusy(false);
    }
  };

  const preview = results.find((r) => r.size === size) ?? results[results.length - 1];

  return (
    <ToolPageShell toolId="svg-to-png" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="SVG to PNG Converter" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <textarea
            value={svg}
            onChange={(e) => { setSvg(e.target.value); setResults([]); }}
            placeholder="<svg …> paste your SVG markup here…"
            spellCheck={false}
            className="h-44 w-full resize-y rounded-xl border border-border bg-background p-3 font-mono text-xs outline-none focus:border-primary"
          />

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border px-4 py-3 text-sm font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
          >
            <FileUp className="h-4 w-4" /> Or upload an .svg file
            <input
              ref={inputRef}
              type="file"
              accept=".svg,image/svg+xml"
              className="hidden"
              onChange={(e) => { acceptFile(e.target.files?.[0]); e.target.value = ""; }}
            />
          </button>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Output size (longest edge)</p>
            <div className="grid grid-cols-4 gap-2">
              {SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => pickSize(s)}
                  className={cn(
                    "rounded-xl border px-2 py-2.5 text-sm font-bold transition",
                    size === s
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Scale from natural size</p>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => applyScale(s)}
                  className={cn(
                    "rounded-xl border px-2 py-2.5 text-sm font-bold transition",
                    scale === s
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">
              Custom dimensions <span className="font-normal text-muted-foreground">(aspect preserved)</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">Width (px)</span>
                <input
                  type="number"
                  min={1}
                  value={dimW}
                  onChange={(e) => setWidth(Math.floor(Number(e.target.value)))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">Height (px)</span>
                <input
                  type="number"
                  min={1}
                  value={dimH}
                  onChange={(e) => setHeight(Math.floor(Number(e.target.value)))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </label>
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Background</p>
            <div className="grid grid-cols-2 gap-2">
              {(["transparent", "white", "black", "custom"] as const).map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBg(b)}
                  className={cn(
                    "rounded-xl border px-2 py-2.5 text-sm font-bold capitalize transition",
                    bg === b
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {b}
                </button>
              ))}
            </div>
            {bg === "custom" && (
              <input
                type="color"
                value={customBg}
                onChange={(e) => setCustomBg(e.target.value)}
                aria-label="Custom background color"
                className="mt-2 h-10 w-full cursor-pointer rounded-xl border border-border bg-background p-1"
              />
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <ActionButton busy={busy} disabled={!svg.trim() || !trial.canUse} onClick={() => convert(size)}>
              <ImageDown className="h-4 w-4" /> {busy ? "Rendering…" : `Convert to ${size}px PNG`}
            </ActionButton>
          </div>

          <button
            type="button"
            onClick={downloadZip}
            disabled={!svg.trim() || busy || !trial.canUse}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-bold transition hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> All sizes ZIP (256 → 2048)
          </button>

          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free conversions left - files never leave your device.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {!preview ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <ImageDown className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your PNG preview appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Aspect ratio is preserved from the SVG's viewBox - icons stay crisp at every size.
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-center rounded-xl bg-muted/50 p-8">
                <img
                  src={preview.url}
                  alt={`PNG preview at ${preview.size}px`}
                  style={bgFill ? { backgroundColor: bgFill } : undefined}
                  className={cn(
                    "max-h-72 max-w-full rounded-lg",
                    !bgFill && "bg-[repeating-conic-gradient(#e5e5e5_0_25%,#fff_0_50%)] bg-[length:24px_24px]",
                  )}
                />
              </div>
              <div className="mt-4 space-y-2">
                {results.map((r) => (
                  <div key={r.size} className="flex items-center justify-between rounded-xl border border-border px-4 py-2.5 text-sm">
                    <span className="font-bold">
                      {r.w}×{r.h} <span className="font-normal text-muted-foreground">({(r.blob.size / 1024).toFixed(1)} KB)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => downloadBlob(r.blob, `${fileName}-${r.w}x${r.h}.png`)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90"
                    >
                      <Download className="h-3.5 w-3.5" /> Download
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
