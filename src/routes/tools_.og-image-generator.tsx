// /tools/og-image-generator - Bannerbear-style social card studio:
// 6 canvas presets, Google Fonts, patterns, logo upload, badge pills,
// icon stickers, PNG/JPG export at 1x/2x, copy to clipboard.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, ClipboardCopy, Download, ImagePlus, Type } from "lucide-react";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/og-image-generator";
import toolSeoMeta from "@/lib/tool-seo-meta-data/og-image-generator";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import IconStickerPicker, { drawSvgToCanvas, type PickedIcon } from "@/components/IconStickerPicker";

export const Route = createFileRoute("/tools_/og-image-generator")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/og-image-generator";
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
  component: OgGeneratorTool,
});

const PRESETS = [
  { id: "og", name: "Open Graph", w: 1200, h: 630 },
  { id: "x", name: "X / Twitter", w: 1200, h: 600 },
  { id: "linkedin", name: "LinkedIn", w: 1200, h: 627 },
  { id: "square", name: "Square post", w: 1080, h: 1080 },
  { id: "portrait", name: "Portrait", w: 1080, h: 1350 },
  { id: "story", name: "Story / Reel", w: 1080, h: 1920 },
];

const GRADIENTS = [
  ["#6366f1", "#a855f7"],
  ["#0ea5e9", "#6366f1"],
  ["#f43f5e", "#f97316"],
  ["#10b981", "#0ea5e9"],
  ["#facc15", "#f97316"],
  ["#111827", "#374151"],
  ["#7c3aed", "#db2777"],
  ["#059669", "#84cc16"],
  ["#0f172a", "#1e3a8a"],
  ["#881337", "#f43f5e"],
  ["#134e4a", "#10b981"],
  ["#fef3c7", "#f59e0b"],
];

const FONTS = [
  { id: "inter", name: "Inter", family: `"Inter", system-ui, sans-serif`, google: "Inter:wght@500;800" },
  { id: "montserrat", name: "Montserrat", family: `"Montserrat", sans-serif`, google: "Montserrat:wght@500;800" },
  { id: "poppins", name: "Poppins", family: `"Poppins", sans-serif`, google: "Poppins:wght@500;700" },
  { id: "bebas", name: "Bebas Neue", family: `"Bebas Neue", sans-serif`, google: "Bebas+Neue" },
  { id: "oswald", name: "Oswald", family: `"Oswald", sans-serif`, google: "Oswald:wght@500;700" },
  { id: "playfair", name: "Playfair", family: `"Playfair Display", serif`, google: "Playfair+Display:wght@700;800" },
  { id: "roboto", name: "Roboto", family: `"Roboto", sans-serif`, google: "Roboto:wght@500;900" },
  { id: "raleway", name: "Raleway", family: `"Raleway", sans-serif`, google: "Raleway:wght@600;800" },
];

const PATTERNS = [
  { id: "none", name: "None" },
  { id: "dots", name: "Dots" },
  { id: "grid", name: "Grid" },
  { id: "rays", name: "Rays" },
  { id: "stripes", name: "Stripes" },
] as const;

type PatternId = (typeof PATTERNS)[number]["id"];

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="mb-1.5 block text-[13px] font-medium text-foreground/80">{label}</span>
    {children}
  </label>
);

const textInput = "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary";

function paintPattern(ctx: CanvasRenderingContext2D, w: number, h: number, pattern: PatternId) {
  if (pattern === "none") return;
  const pc = "rgba(255,255,255,0.10)";
  ctx.save();
  if (pattern === "dots") {
    ctx.fillStyle = pc;
    for (let y = 16; y < h; y += 40) {
      for (let x = (y / 40) % 2 ? 16 : 36; x < w; x += 40) {
        ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2); ctx.fill();
      }
    }
  } else if (pattern === "grid") {
    ctx.strokeStyle = pc;
    ctx.lineWidth = 2;
    for (let x = 0; x <= w; x += 56) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y <= h; y += 56) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  } else if (pattern === "stripes") {
    ctx.fillStyle = pc;
    for (let x = -h; x < w + h; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 0); ctx.lineTo(x + 24, 0); ctx.lineTo(x + 24 - h, h); ctx.lineTo(x - h, h);
      ctx.closePath(); ctx.fill();
    }
  } else if (pattern === "rays") {
    ctx.translate(w * 0.85, h * 0.1);
    ctx.fillStyle = pc;
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, Math.hypot(w, h), a, a + (Math.PI * 2) / 40);
      ctx.closePath(); ctx.fill();
    }
  }
  ctx.restore();
}

function OgGeneratorTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("og-image-generator", isPro);
  const seo = toolSeo;

  const [presetId, setPresetId] = useState("og");
  const [headline, setHeadline] = useState("Ship faster with IconVault");
  const [subheadline, setSubheadline] = useState("421,020 icons · one search away");
  const [badge, setBadge] = useState("");
  const [fontId, setFontId] = useState("inter");
  const [bgType, setBgType] = useState<"gradient" | "solid" | "image">("gradient");
  const [gradientIdx, setGradientIdx] = useState(0);
  const [solid, setSolid] = useState("#111827");
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [pattern, setPattern] = useState<PatternId>("none");
  const [textColor, setTextColor] = useState("#ffffff");
  const [accent, setAccent] = useState("#a855f7");
  const [icon, setIcon] = useState<PickedIcon | null>(null);
  const [iconSize, setIconSize] = useState(120);
  const [logo, setLogo] = useState<HTMLImageElement | null>(null);
  const [layout, setLayout] = useState<"left" | "top" | "center">("left");
  const [exportFormat, setExportFormat] = useState<"png" | "jpg">("png");
  const [exportScale, setExportScale] = useState<1 | 2>(1);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const preset = PRESETS.find((p) => p.id === presetId)!;
  const font = FONTS.find((f) => f.id === fontId)!;

  // Load Google Fonts once.
  useEffect(() => {
    const href = `https://fonts.googleapis.com/css2?${FONTS.map((f) => `family=${f.google}`).join("&")}&display=swap`;
    if (!document.querySelector(`link[href="${href}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    }
  }, []);

  const render = useCallback(
    async (canvas: HTMLCanvasElement, scale: number) => {
      const { w, h } = preset;
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext("2d")!;
      ctx.scale(scale, scale);

      try {
        await Promise.all([
          document.fonts.load(`800 40px ${font.family}`),
          document.fonts.load(`500 40px ${font.family}`),
        ]);
      } catch {
        /* fall back to system fonts */
      }

      // Background
      if (bgType === "image" && bgImage) {
        const s = Math.max(w / bgImage.naturalWidth, h / bgImage.naturalHeight);
        const dw = bgImage.naturalWidth * s, dh = bgImage.naturalHeight * s;
        ctx.drawImage(bgImage, (w - dw) / 2, (h - dh) / 2, dw, dh);
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fillRect(0, 0, w, h);
      } else if (bgType === "solid") {
        ctx.fillStyle = solid;
        ctx.fillRect(0, 0, w, h);
      } else {
        const [c1, c2] = (GRADIENTS[gradientIdx] ?? GRADIENTS[0]) as [string, string];
        const g = ctx.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, c1);
        g.addColorStop(1, c2);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }
      paintPattern(ctx, w, h, pattern);

      const pad = Math.round(w * 0.07);
      const centered = layout === "center";

      // Accent bar (left layouts only)
      if (!centered) {
        ctx.fillStyle = accent;
        ctx.fillRect(pad, pad, 8, h - pad * 2);
      }

      // Logo (top-right)
      if (logo) {
        const lh = Math.min(72, h * 0.09);
        const lw = (lh * logo.naturalWidth) / logo.naturalHeight;
        ctx.drawImage(logo, w - pad - Math.min(lw, w * 0.28), pad, Math.min(lw, w * 0.28), lh);
      }

      const textX = centered ? w / 2 : pad + 40;
      const maxW = centered ? w - pad * 2 : w - textX - pad;
      ctx.textAlign = centered ? "center" : "left";

      let cx = textX;
      let cy = h / 2 - 40;

      // Badge pill
      const badgeText = badge.trim().toUpperCase();
      if (badgeText) {
        ctx.font = `800 ${Math.round(w * 0.022)}px ${font.family}`;
        const bw = ctx.measureText(badgeText).width + 44;
        const bx = centered ? w / 2 - bw / 2 : textX;
        const by = pad + 6;
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.roundRect(bx, by, bw, 52, 26);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.textBaseline = "middle";
        ctx.fillText(badgeText, centered ? w / 2 : bx + 22, by + 27);
        ctx.textBaseline = "alphabetic";
        cy += 66;
      }

      // Icon sticker
      if (icon && layout === "left") {
        await drawSvgToCanvas(ctx, icon.svg, textX, h / 2 - iconSize / 2, iconSize, iconSize);
        cx = textX + iconSize + 36;
      } else if (icon && layout === "top") {
        await drawSvgToCanvas(ctx, icon.svg, textX, cy - 10, iconSize, iconSize);
        cy = cy - 10 + iconSize + 34;
      } else if (icon && centered) {
        await drawSvgToCanvas(ctx, icon.svg, w / 2 - iconSize / 2, cy - iconSize - 24, iconSize, iconSize);
      }

      ctx.fillStyle = textColor;
      // Headline - auto-shrink + wrap to 3 lines
      let size = Math.round(w * 0.062);
      const setHeadFont = () => {
        ctx.font = `800 ${size}px ${font.family}`;
      };
      setHeadFont();
      while (ctx.measureText(headline).width > maxW - (centered ? 0 : cx - textX) && size > 20) {
        size -= 4;
        setHeadFont();
      }
      const words = headline.split(" ");
      const lines: string[] = [];
      let line = "";
      const avail = maxW - (centered ? 0 : cx - textX);
      for (const wd of words) {
        const t = line ? line + " " + wd : wd;
        if (ctx.measureText(t).width > avail && line) {
          lines.push(line);
          line = wd;
        } else line = t;
        if (lines.length === 3) break;
      }
      if (line) lines.push(line);
      const finalLines = lines.slice(0, 3);
      finalLines.forEach((ln, i) => ctx.fillText(ln, cx, cy + i * size * 1.15));

      // Subheadline
      if (subheadline.trim()) {
        const subSize = Math.round(size * 0.42);
        ctx.font = `500 ${subSize}px ${font.family}`;
        ctx.globalAlpha = 0.85;
        const sx = centered ? w / 2 : cx;
        ctx.fillText(subheadline.slice(0, 90), sx, cy + finalLines.length * size * 1.15 + subSize * 0.7);
        ctx.globalAlpha = 1;
      }
    },
    [preset, bgType, bgImage, solid, gradientIdx, pattern, headline, subheadline, badge, font, textColor, accent, icon, iconSize, logo, layout],
  );

  const draw = useCallback(async () => {
    const canvas = canvasRef.current;
    if (canvas) await render(canvas, 1);
  }, [render]);

  useEffect(() => {
    void draw();
  }, [draw]);

  const onBgUpload = (f: File | undefined) => {
    if (!f) return;
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      setBgImage(img);
      setBgType("image");
    };
    img.src = url;
  };

  const onLogoUpload = (f: File | undefined) => {
    if (!f) return;
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      setLogo(img);
    };
    img.src = url;
  };

  const exportBlob = async (): Promise<Blob | null> => {
    const canvas = document.createElement("canvas");
    await render(canvas, exportScale);
    const mime = exportFormat === "jpg" ? "image/jpeg" : "image/png";
    return new Promise<Blob | null>((res) =>
      canvas.toBlob(res, mime, exportFormat === "jpg" ? 0.92 : undefined),
    );
  };

  const download = async () => {
    if (!trial.canUse || busy) return;
    setBusy(true);
    try {
      const blob = await exportBlob();
      if (blob) {
        downloadBlob(blob, `og-${presetId}@${exportScale}x.${exportFormat}`);
        trial.recordUse();
      }
    } finally {
      setBusy(false);
    }
  };

  const copyToClipboard = async () => {
    if (busy) return;
    try {
      const blob = await exportBlob();
      if (!blob) return;
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked - user can download instead */
    }
  };

  return (
    <ToolPageShell toolId="og-image-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="OG Image Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <Field label="Canvas size">
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.id} type="button"
                  onClick={() => setPresetId(p.id)}
                  className={cn(
                    "rounded-xl border px-2 py-2 text-xs font-bold transition",
                    presetId === p.id ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40",
                  )}
                >
                  {p.name}
                  <span className="block font-normal text-muted-foreground">{p.w}×{p.h}</span>
                </button>
              ))}
            </div>
          </Field>

          <Field label="Headline">
            <input value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={80} className={textInput} />
          </Field>
          <Field label="Subheadline">
            <input value={subheadline} onChange={(e) => setSubheadline(e.target.value)} maxLength={90} className={textInput} />
          </Field>
          <Field label="Badge pill (optional)">
            <input value={badge} onChange={(e) => setBadge(e.target.value)} maxLength={24} placeholder="NEW" className={textInput} />
          </Field>

          <Field label="Font">
            <div className="grid grid-cols-4 gap-1.5">
              {FONTS.map((f) => (
                <button
                  key={f.id} type="button" title={f.name}
                  onClick={() => setFontId(f.id)}
                  className={cn(
                    "rounded-lg border px-1 py-2 text-sm transition",
                    fontId === f.id ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40",
                  )}
                  style={{ fontFamily: f.family, fontWeight: 800 }}
                >
                  Ag
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">{font.name}</p>
          </Field>

          <Field label="Background">
            <div className="mb-2 flex gap-2">
              {(["gradient", "solid", "image"] as const).map((t) => (
                <button
                  key={t} type="button" onClick={() => setBgType(t)}
                  className={cn(
                    "flex-1 rounded-lg border px-2 py-1.5 text-xs font-bold capitalize transition",
                    bgType === t ? "border-primary bg-primary/10 text-primary" : "border-border",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
            {bgType === "gradient" && (
              <div className="grid grid-cols-6 gap-1.5">
                {GRADIENTS.map(([a, b], i) => (
                  <button
                    key={i} type="button" title={`Gradient ${i + 1}`}
                    onClick={() => setGradientIdx(i)}
                    className={cn("aspect-square rounded-lg border-2 transition", gradientIdx === i ? "border-primary" : "border-transparent")}
                    style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}
                  />
                ))}
              </div>
            )}
            {bgType === "solid" && (
              <input type="color" value={solid} onChange={(e) => setSolid(e.target.value)} className="h-10 w-full cursor-pointer rounded-lg border border-border bg-background" />
            )}
            {bgType === "image" && (
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border px-3 py-3 text-xs font-bold hover:border-primary/50">
                <ImagePlus className="h-4 w-4" /> {bgImage ? "Change photo" : "Upload photo"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => onBgUpload(e.target.files?.[0])} />
              </label>
            )}
          </Field>

          <Field label="Pattern overlay">
            <div className="flex gap-1.5">
              {PATTERNS.map((p) => (
                <button
                  key={p.id} type="button" onClick={() => setPattern(p.id)}
                  className={cn(
                    "flex-1 rounded-lg border px-2 py-1.5 text-xs font-bold transition",
                    pattern === p.id ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40",
                  )}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Text color">
              <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="h-10 w-full cursor-pointer rounded-lg border border-border bg-background" />
            </Field>
            <Field label="Accent">
              <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="h-10 w-full cursor-pointer rounded-lg border border-border bg-background" />
            </Field>
          </div>

          <Field label="Logo (PNG, top-right)">
            <div className="flex items-center gap-2">
              <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border px-3 py-2.5 text-xs font-bold hover:border-primary/50">
                <ImagePlus className="h-4 w-4" /> {logo ? "Change logo" : "Upload logo"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => onLogoUpload(e.target.files?.[0])} />
              </label>
              {logo && (
                <button type="button" onClick={() => setLogo(null)} className="rounded-lg border border-border px-3 py-2.5 text-xs font-bold hover:border-red-400">
                  Remove
                </button>
              )}
            </div>
          </Field>

          <Field label="Icon sticker (from IconVault library)">
            <IconStickerPicker picked={icon} onPick={setIcon} onClear={() => setIcon(null)} />
          </Field>
          {icon && (
            <>
              <Field label="Icon layout">
                <div className="flex gap-2">
                  {(["left", "top", "center"] as const).map((l) => (
                    <button
                      key={l} type="button" onClick={() => setLayout(l)}
                      className={cn(
                        "flex-1 rounded-lg border px-2 py-1.5 text-xs font-bold capitalize",
                        layout === l ? "border-primary bg-primary/10 text-primary" : "border-border",
                      )}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </Field>
              <label className="block">
                <div className="mb-1.5 flex items-center justify-between text-[13px]">
                  <span className="font-medium text-foreground/80">Icon size</span>
                  <span className="tabular-nums text-muted-foreground">{iconSize}px</span>
                </div>
                <input type="range" min={48} max={240} value={iconSize} onChange={(e) => setIconSize(Number(e.target.value))} className="w-full accent-primary" />
              </label>
            </>
          )}

          <Field label="Export">
            <div className="mb-2 flex gap-2">
              {(["png", "jpg"] as const).map((f) => (
                <button
                  key={f} type="button" onClick={() => setExportFormat(f)}
                  className={cn(
                    "flex-1 rounded-lg border px-2 py-1.5 text-xs font-bold uppercase transition",
                    exportFormat === f ? "border-primary bg-primary/10 text-primary" : "border-border",
                  )}
                >
                  {f}
                </button>
              ))}
              {([1, 2] as const).map((s) => (
                <button
                  key={s} type="button" onClick={() => setExportScale(s)}
                  className={cn(
                    "flex-1 rounded-lg border px-2 py-1.5 text-xs font-bold transition",
                    exportScale === s ? "border-primary bg-primary/10 text-primary" : "border-border",
                  )}
                >
                  {s}x
                </button>
              ))}
            </div>
          </Field>

          <div className="flex gap-2">
            <div className="flex-1">
              <ActionButton busy={busy} disabled={!trial.canUse} onClick={download}>
                <Download className="h-4 w-4" /> {busy ? "Rendering…" : `Download ${exportFormat.toUpperCase()}`}
              </ActionButton>
            </div>
            <button
              type="button" onClick={copyToClipboard} title="Copy image to clipboard"
              className="rounded-xl border border-border px-3.5 hover:border-primary/50"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <ClipboardCopy className="h-4 w-4" />}
            </button>
          </div>
          {!isPro && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Type className="h-3.5 w-3.5" /> {trial.left} of {TOOL_TRIAL_LIMIT} free exports left.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Live preview - {preset.w}×{preset.h}
          </p>
          <div className="overflow-hidden rounded-xl border border-border bg-muted/40">
            <canvas ref={canvasRef} className="h-auto w-full" />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Tip: upload the {exportFormat.toUpperCase()} to your site and reference it with{" "}
            <code className="rounded bg-muted px-1">og:image</code> +{" "}
            <code className="rounded bg-muted px-1">twitter:card</code> meta tags.
          </p>
        </div>
      </div>
    </ToolPageShell>
  );
}
