// /tools/favicon-generator - Pick any library icon (or upload an image) and
// render favicon PNGs at every standard size, 100% in-browser. Individual
// PNGs are free; the full favicon kit ZIP (icons + webmanifest) is Pro.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Crown, Download, FileUp, Package } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/favicon-generator";
import toolSeoMeta from "@/lib/tool-seo-meta-data/favicon-generator";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import IconStickerPicker, { drawSvgToCanvas, type PickedIcon } from "@/components/IconStickerPicker";

export const Route = createFileRoute("/tools_/favicon-generator")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/favicon-generator";
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
  component: FaviconTool,
});

const SIZES = [16, 32, 180, 192, 512] as const;

interface Rendered {
  size: number;
  blob: Blob;
  previewUrl: string;
}

type SourceMode = "upload" | "text" | "emoji";

const TEXT_FONTS = [
  { id: "system", label: "System", stack: "system-ui, -apple-system, 'Segoe UI', sans-serif" },
  { id: "serif", label: "Serif", stack: "Georgia, 'Times New Roman', serif" },
  { id: "mono", label: "Monospace", stack: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" },
  { id: "rounded", label: "Rounded", stack: "ui-rounded, 'SF Pro Rounded', system-ui, sans-serif" },
] as const;

const TEXT_SHAPES = [
  { id: "rounded", label: "Rounded square" },
  { id: "circle", label: "Circle" },
  { id: "square", label: "Square" },
] as const;

const EMOJIS = [
  "🚀", "🌟", "🔥", "💡", "🎨", "🎯",
  "📦", "⚡", "💎", "🌈", "☀️", "🌙",
  "⭐", "✨", "💻", "📱", "🎮", "🏠",
  "❤️", "👍", "👑", "🚗", "✈️", "🎵",
] as const;

function loadFile(f: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`Could not read ${f.name}`)); };
    img.src = url;
  });
}

function FaviconTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("favicon-generator", isPro);
  const seo = toolSeo;

  const [icon, setIcon] = useState<PickedIcon | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [imageName, setImageName] = useState("");
  const [renders, setRenders] = useState<Rendered[]>([]);
  const [busy, setBusy] = useState(false);
  const [busyKit, setBusyKit] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // --- Text / emoji source modes ---
  const [mode, setMode] = useState<SourceMode>("upload");
  const [textStr, setTextStr] = useState("IV");
  const [textFont, setTextFont] = useState<string>("system");
  const [textBg, setTextBg] = useState("#7c3aed");
  const [textShape, setTextShape] = useState<(typeof TEXT_SHAPES)[number]["id"]>("rounded");
  const [emoji, setEmoji] = useState<string>(EMOJIS[0]!);
  const [emojiBg, setEmojiBg] = useState("#1e293b");
  const [emojiTransparent, setEmojiTransparent] = useState(false);
  const previewRef = useRef<HTMLCanvasElement>(null);

  /** Render the text/emoji source at 512×512 - feeds the same PNG pipeline as uploads. */
  const makeSourceCanvas = useCallback((): HTMLCanvasElement => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d")!;
    if (mode === "text") {
      const label = textStr.trim().slice(0, 2);
      if (!label) throw new Error("Enter 1–2 characters for the text favicon.");
      ctx.fillStyle = textBg;
      if (textShape === "circle") {
        ctx.beginPath();
        ctx.arc(256, 256, 256, 0, Math.PI * 2);
        ctx.fill();
      } else if (textShape === "rounded") {
        ctx.beginPath();
        ctx.roundRect(0, 0, 512, 512, 128);
        ctx.fill();
      } else {
        ctx.fillRect(0, 0, 512, 512);
      }
      const font = TEXT_FONTS.find((f) => f.id === textFont) ?? TEXT_FONTS[0]!;
      const fs = label.length === 1 ? 300 : 220;
      ctx.fillStyle = "#ffffff";
      ctx.font = `700 ${fs}px ${font.stack}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, 256, 272);
    } else if (mode === "emoji") {
      if (!emojiTransparent) {
        ctx.fillStyle = emojiBg;
        ctx.fillRect(0, 0, 512, 512);
      }
      ctx.font = "380px 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(emoji, 256, 280);
    }
    return canvas;
  }, [mode, textStr, textFont, textBg, textShape, emoji, emojiBg, emojiTransparent]);

  // Live preview for text/emoji modes; clears stale renders when the source changes.
  useEffect(() => {
    if (mode === "upload" || !previewRef.current) return;
    setRenders([]);
    const el = previewRef.current;
    el.width = 256;
    el.height = 256;
    try {
      el.getContext("2d")!.drawImage(makeSourceCanvas(), 0, 0, 256, 256);
    } catch {
      /* invalid input (e.g. empty text) - leave the previous preview */
    }
  }, [mode, makeSourceCanvas]);

  const acceptFile = useCallback(async (f: File) => {
    if (!f.type.startsWith("image/")) {
      setError("Please choose a PNG, JPG or WebP image.");
      return;
    }
    try {
      const img = await loadFile(f);
      setImage(img);
      setImageName(f.name);
      setIcon(null);
      setRenders([]);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that image.");
    }
  }, []);

  const pickIcon = (picked: PickedIcon) => {
    setIcon(picked);
    setImage(null);
    setRenders([]);
    setError(null);
  };

  const hasSource = icon !== null || image !== null || mode !== "upload";

  const switchMode = (m: SourceMode) => {
    setMode(m);
    setRenders([]);
    setError(null);
  };

  const renderAll = useCallback(async () => {
    if (!hasSource || busy || !trial.canUse) return;
    setBusy(true);
    setError(null);
    try {
      const out: Rendered[] = [];
      for (const size of SIZES) {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d")!;
        if (mode === "text" || mode === "emoji") {
          ctx.drawImage(makeSourceCanvas(), 0, 0, size, size);
        } else if (icon) {
          await drawSvgToCanvas(ctx, icon.svg, 0, 0, size, size);
        } else if (image) {
          ctx.drawImage(image, 0, 0, size, size);
        }
        const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
        if (!blob) throw new Error(`Could not render ${size}px PNG`);
        out.push({ size, blob, previewUrl: URL.createObjectURL(blob) });
      }
      setRenders(out);
      trial.recordUse();
      toast.success("Favicons rendered");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rendering failed.");
    } finally {
      setBusy(false);
    }
  }, [hasSource, busy, trial, icon, image, mode, makeSourceCanvas]);

  const downloadKit = async () => {
    if (!renders.length) return;
    if (!isPro) {
      toast.error("The full favicon kit is a Pro feature - $11/mo or $29 once.");
      return;
    }
    setBusyKit(true);
    try {
      // Loaded on demand - the ZIP library only downloads when the user
      // actually clicks the kit download.
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      for (const r of renders) {
        const name =
          r.size === 16 ? "favicon-16x16.png"
          : r.size === 32 ? "favicon-32x32.png"
          : r.size === 180 ? "apple-touch-icon.png"
          : `android-chrome-${r.size}x${r.size}.png`;
        zip.file(name, r.blob);
      }
      zip.file(
        "site.webmanifest",
        JSON.stringify(
          {
            name: "IconVault App",
            short_name: "App",
            icons: [192, 512].map((s) => ({
              src: `android-chrome-${s}x${s}.png`,
              sizes: `${s}x${s}`,
              type: "image/png",
            })),
            theme_color: "#000000",
            background_color: "#ffffff",
            display: "standalone",
          },
          null,
          2,
        ),
      );
      downloadBlob(await zip.generateAsync({ type: "blob" }), "favicon-kit.zip");
      toast.success("Favicon kit downloaded");
    } catch {
      toast.error("Kit export failed.");
    } finally {
      setBusyKit(false);
    }
  };

  return (
    <ToolPageShell toolId="favicon-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Favicon Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">1 · Pick a source</p>
            <div className="grid grid-cols-3 gap-2">
              {(["upload", "text", "emoji"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-sm font-bold capitalize transition",
                    mode === m
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {mode === "upload" && (
            <>
              <div>
                <p className="mb-2 text-[13px] font-medium text-foreground/80">Pick a library icon</p>
                <IconStickerPicker
                  picked={icon}
                  onPick={pickIcon}
                  onClear={() => setIcon(null)}
                />
              </div>

              <div>
                <p className="mb-2 text-[13px] font-medium text-foreground/80">…or upload your own image</p>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) void acceptFile(f); }}
                  onClick={() => inputRef.current?.click()}
                  className={cn(
                    "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition",
                    dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
                  )}
                >
                  <FileUp className="mb-2 h-7 w-7 text-muted-foreground" />
                  <p className="text-sm font-semibold">{imageName || "Drop or click to upload"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">PNG · JPG · WebP</p>
                  <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void acceptFile(f); }} />
                </div>
              </div>
            </>
          )}

          {mode !== "upload" && (
            <div className="flex justify-center">
              <div className="rounded-xl bg-[repeating-conic-gradient(#80808033_0_25%,transparent_0_50%)] bg-[length:16px_16px] p-2">
                <canvas ref={previewRef} width={256} height={256} className="h-28 w-28 rounded-lg" />
              </div>
            </div>
          )}

          {mode === "text" && (
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-medium text-foreground/80">Initials (1–2 characters)</span>
                <input
                  value={textStr}
                  onChange={(e) => setTextStr(e.target.value.slice(0, 3))}
                  maxLength={3}
                  placeholder="IV"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-center text-lg font-bold outline-none focus:border-primary"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-medium text-foreground/80">Font</span>
                <select value={textFont} onChange={(e) => setTextFont(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary">
                  {TEXT_FONTS.map((f) => (
                    <option key={f.id} value={f.id}>{f.label}</option>
                  ))}
                </select>
              </label>
              <div>
                <p className="mb-1.5 text-[13px] font-medium text-foreground/80">Shape</p>
                <div className="grid grid-cols-3 gap-2">
                  {TEXT_SHAPES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setTextShape(s.id)}
                      className={cn(
                        "rounded-xl border px-2 py-2 text-xs font-bold transition",
                        textShape === s.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40",
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-medium text-foreground/80">Background color</span>
                <div className="flex items-center gap-3">
                  <input
                    type="color" value={textBg}
                    onChange={(e) => setTextBg(e.target.value)}
                    aria-label="Text favicon background color"
                    className="h-11 w-14 cursor-pointer rounded-xl border border-border bg-background p-1"
                  />
                  <span className="font-mono text-sm uppercase">{textBg}</span>
                </div>
              </label>
            </div>
          )}

          {mode === "emoji" && (
            <div className="space-y-4">
              <div>
                <p className="mb-1.5 text-[13px] font-medium text-foreground/80">Pick an emoji</p>
                <div className="grid grid-cols-6 gap-1.5">
                  {EMOJIS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setEmoji(e)}
                      aria-label={`Emoji ${e}`}
                      className={cn(
                        "rounded-lg border px-1 py-1.5 text-xl transition",
                        emoji === e
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/40",
                      )}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox" checked={emojiTransparent}
                  onChange={(e) => setEmojiTransparent(e.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                <span className="font-medium text-foreground/80">Transparent background</span>
              </label>
              {!emojiTransparent && (
                <label className="block">
                  <span className="mb-1.5 block text-[13px] font-medium text-foreground/80">Background color</span>
                  <div className="flex items-center gap-3">
                    <input
                      type="color" value={emojiBg}
                      onChange={(e) => setEmojiBg(e.target.value)}
                      aria-label="Emoji favicon background color"
                      className="h-11 w-14 cursor-pointer rounded-xl border border-border bg-background p-1"
                    />
                    <span className="font-mono text-sm uppercase">{emojiBg}</span>
                  </div>
                </label>
              )}
            </div>
          )}

          <ActionButton busy={busy} disabled={!hasSource || !trial.canUse} onClick={renderAll}>
            <Package className="h-4 w-4" /> {busy ? "Rendering…" : "Generate favicons"}
          </ActionButton>

          <button
            type="button" onClick={downloadKit}
            disabled={renders.length === 0 || busyKit}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-amber-400/60 bg-amber-50 px-6 py-3 text-sm font-bold text-amber-700 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-amber-950/20 dark:text-amber-300"
          >
            {busyKit ? "Building…" : isPro ? <Download className="h-4 w-4" /> : <Crown className="h-4 w-4" />}
            Full favicon kit (.zip){!isPro && " - Pro"}
          </button>
          <p className="text-xs text-muted-foreground">
            {isPro
              ? "Pro unlocked - kit includes all PNGs + site.webmanifest."
              : "All individual PNGs are free. The full kit (all PNGs + site.webmanifest) is Pro - $11/mo or $29 once."}
          </p>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free generations left.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {renders.length === 0 ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <Package className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Favicon previews appear here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Every standard size - 16, 32, 180, 192 and 512px - rendered and downloadable for free.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {renders.map((r) => (
                <div key={r.size} className="flex flex-col items-center gap-2 rounded-xl border border-border p-4">
                  <div className="flex h-24 items-center justify-center rounded-lg bg-[repeating-conic-gradient(#80808033_0_25%,transparent_0_50%)] bg-[length:16px_16px] p-3">
                    <img src={r.previewUrl} alt={`${r.size}px favicon`} width={Math.min(r.size, 64)} height={Math.min(r.size, 64)} />
                  </div>
                  <p className="text-sm font-bold">{r.size} × {r.size} px</p>
                  <button
                    type="button" onClick={() => downloadBlob(r.blob, `favicon-${r.size}x${r.size}.png`)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50"
                  >
                    <Download className="h-3.5 w-3.5" /> PNG
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
