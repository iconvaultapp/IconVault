// /tools/og-preview - OG IMAGE CREATOR: design a 1200x630 social image and preview it
// live on X/Twitter, Facebook, LinkedIn, Slack and Discord mockups. 100% in-browser.
// NOTE: this is NOT the "Open Graph Checker" tool (that one fetches an existing URL).
// This one creates the image from scratch.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileUp, Palette, Type } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/og-preview")({
  head: () => {
    const seo = getToolSeoMeta("og-preview");
    const canonical = "https://iconvault.site/tools/og-preview";
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
  component: OgPreviewTool,
});

const W = 1200;
const H = 630;

const GRADIENTS: { name: string; from: string; to: string }[] = [
  { name: "Midnight", from: "#0f172a", to: "#1e3a8a" },
  { name: "Sunset", from: "#7c2d12", to: "#db2777" },
  { name: "Teal", from: "#0f766e", to: "#134e4a" },
  { name: "Grape", from: "#4c1d95", to: "#a21caf" },
  { name: "Ember", from: "#991b1b", to: "#f59e0b" },
  { name: "Slate", from: "#334155", to: "#0f172a" },
];

type Layout = "left" | "center";

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
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
  return lines;
}

interface OgState {
  title: string;
  subtitle: string;
  domain: string;
  description: string;
  bgMode: "gradient" | "solid" | "image";
  gradientIdx: number;
  solid: string;
  bgImage: HTMLImageElement | null;
  textColor: string;
  accent: string;
  layout: Layout;
  showDomain: boolean;
}

function drawOg(canvas: HTMLCanvasElement, s: OgState) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  canvas.width = W;
  canvas.height = H;

  if (s.bgMode === "image" && s.bgImage) {
    const img = s.bgImage;
    const scale = Math.max(W / img.width, H / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, W, H);
  } else if (s.bgMode === "solid") {
    ctx.fillStyle = s.solid;
    ctx.fillRect(0, 0, W, H);
  } else {
    const g = GRADIENTS[s.gradientIdx] ?? GRADIENTS[0]!;
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, g.from);
    grad.addColorStop(1, g.to);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  // accent bar
  const padX = 96;
  const center = s.layout === "center";
  const align = center ? "center" : "left";
  const x0 = center ? W / 2 : padX;
  ctx.fillStyle = s.accent;
  if (center) ctx.fillRect(W / 2 - 60, 84, 120, 10);
  else ctx.fillRect(padX, 84, 120, 10);

  ctx.textAlign = align;
  ctx.fillStyle = s.textColor;

  const maxW = W - padX * 2;
  let y = 190;
  if (s.showDomain && s.domain.trim()) {
    ctx.font = "600 40px system-ui, sans-serif";
    ctx.fillStyle = s.accent;
    ctx.fillText(s.domain.trim().toUpperCase(), x0, y);
    y += 84;
    ctx.fillStyle = s.textColor;
  }

  ctx.font = "800 88px system-ui, sans-serif";
  const titleLines = wrapText(ctx, s.title.trim() || "Your headline here", maxW).slice(0, 3);
  for (const line of titleLines) {
    ctx.fillText(line, x0, y);
    y += 104;
  }

  if (s.subtitle.trim()) {
    ctx.font = "400 44px system-ui, sans-serif";
    ctx.globalAlpha = 0.85;
    const subLines = wrapText(ctx, s.subtitle.trim(), maxW).slice(0, 2);
    for (const line of subLines) {
      ctx.fillText(line, x0, y + 28);
      y += 58;
    }
    ctx.globalAlpha = 1;
  }
}

function MockFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <p className="border-b border-border px-4 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="p-4">{children}</div>
    </div>
  );
}

function OgPreviewTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("og-preview", isPro);
  const seo = getToolSeo("og-preview");

  const [title, setTitle] = useState("The 2026 Guide to Shipping Faster");
  const [subtitle, setSubtitle] = useState("Practical tactics for small teams with big deadlines.");
  const [domain, setDomain] = useState("iconvault.site");
  const [description, setDescription] = useState(
    "Design social share images and preview them on every major platform before you publish.",
  );
  const [bgMode, setBgMode] = useState<"gradient" | "solid" | "image">("gradient");
  const [gradientIdx, setGradientIdx] = useState(0);
  const [solid, setSolid] = useState("#0f766e");
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [bgName, setBgName] = useState("");
  const [textColor, setTextColor] = useState("#ffffff");
  const [accent, setAccent] = useState("#5eead4");
  const [layout, setLayout] = useState<Layout>("left");
  const [showDomain, setShowDomain] = useState(true);
  const [dataUrl, setDataUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  const state: OgState = useMemo(
    () => ({
      title, subtitle, domain, description, bgMode, gradientIdx, solid,
      bgImage, textColor, accent, layout, showDomain,
    }),
    [title, subtitle, domain, description, bgMode, gradientIdx, solid, bgImage, textColor, accent, layout, showDomain],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawOg(canvas, state);
    setDataUrl(canvas.toDataURL("image/png"));
  }, [state]);

  const onBgFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      setBgImage(img);
      setBgName(f.name);
      setBgMode("image");
    };
    img.onerror = () => toast.error("Could not read that image.");
    img.src = url;
  }, []);

  const download = useCallback(async () => {
    if (!trial.canUse) return;
    setBusy(true);
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
      if (!blob) throw new Error("Export failed.");
      downloadBlob(blob, "og-image-1200x630.png");
      trial.recordUse();
      toast.success("OG image downloaded (1200 x 630)");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  }, [trial]);

  const mockTitle = title.trim() || "Your headline here";
  const mockDesc = description.trim() || "Your description appears under the title in link previews.";
  const mockDomain = domain.trim() || "yoursite.com";

  return (
    <ToolPageShell toolId="og-preview" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="OG Preview" left={trial.left} />

      <p className="mb-5 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
        This is the <strong>image creator</strong>: design your own 1200 x 630 social image and preview it on platform
        mockups. To check the OG tags of an existing page, use our Open Graph Checker instead.
      </p>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Headline</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              placeholder="Your headline here"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Subtitle</label>
            <input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              maxLength={160}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              placeholder="One supporting line"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Domain</label>
              <input
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Text color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-border bg-background" />
                <span className="text-xs text-muted-foreground">{textColor}</span>
              </div>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Link description (used in previews)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={220}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>

          <div>
            <p className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-foreground/80">
              <Palette className="h-4 w-4" /> Background
            </p>
            <div className="mb-2 flex gap-2">
              {(["gradient", "solid", "image"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setBgMode(m)}
                  className={cn(
                    "rounded-xl border px-3 py-1.5 text-xs font-bold capitalize transition",
                    bgMode === m ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
            {bgMode === "gradient" && (
              <div className="grid grid-cols-3 gap-2">
                {GRADIENTS.map((g, i) => (
                  <button
                    key={g.name}
                    type="button"
                    title={g.name}
                    onClick={() => setGradientIdx(i)}
                    className={cn(
                      "h-12 rounded-xl border-2 transition",
                      gradientIdx === i ? "border-primary" : "border-transparent",
                    )}
                    style={{ background: `linear-gradient(135deg, ${g.from}, ${g.to})` }}
                  />
                ))}
              </div>
            )}
            {bgMode === "solid" && (
              <div className="flex items-center gap-2">
                <input type="color" value={solid} onChange={(e) => setSolid(e.target.value)} className="h-10 w-16 cursor-pointer rounded border border-border bg-background" />
                <span className="text-xs text-muted-foreground">{solid}</span>
              </div>
            )}
            {bgMode === "image" && (
              <button
                type="button"
                onClick={() => bgInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border px-3 py-3 text-sm text-muted-foreground hover:border-primary/40"
              >
                <FileUp className="h-4 w-4" /> {bgName || "Upload background image"}
              </button>
            )}
            <input
              ref={bgInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onBgFile(f); e.target.value = ""; }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Accent color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-border bg-background" />
                <span className="text-xs text-muted-foreground">{accent}</span>
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[13px] font-medium text-foreground/80">Layout</p>
              <div className="flex gap-2">
                {(["left", "center"] as Layout[]).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLayout(l)}
                    className={cn(
                      "rounded-xl border px-3 py-1.5 text-xs font-bold capitalize transition",
                      layout === l ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={showDomain} onChange={(e) => setShowDomain(e.target.checked)} className="h-4 w-4 accent-primary" />
            Show domain kicker on image
          </label>

          <ActionButton busy={busy} disabled={!trial.canUse} onClick={download}>
            <Download className="h-4 w-4" /> {busy ? "Rendering…" : "Download PNG (1200 x 630)"}
          </ActionButton>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
              <Type className="h-4 w-4" /> Your OG image
            </p>
            <canvas ref={canvasRef} width={W} height={H} className="w-full rounded-xl border border-border" />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <MockFrame label="X (Twitter) - Summary large image">
              <div className="overflow-hidden rounded-xl border border-border">
                {dataUrl && <img src={dataUrl} alt="OG preview" className="aspect-[1200/630] w-full object-cover" />}
                <div className="p-3">
                  <p className="line-clamp-2 text-sm font-bold">{mockTitle}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{mockDesc}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{mockDomain}</p>
                </div>
              </div>
            </MockFrame>

            <MockFrame label="Facebook - Link preview">
              <div className="overflow-hidden rounded-xl border border-border bg-muted/40">
                {dataUrl && <img src={dataUrl} alt="OG preview" className="aspect-[1200/630] w-full object-cover" />}
                <div className="p-3">
                  <p className="text-[11px] uppercase text-muted-foreground">{mockDomain}</p>
                  <p className="line-clamp-2 text-sm font-bold">{mockTitle}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{mockDesc}</p>
                </div>
              </div>
            </MockFrame>

            <MockFrame label="LinkedIn - Article card">
              <div className="overflow-hidden rounded-xl border border-border">
                {dataUrl && <img src={dataUrl} alt="OG preview" className="aspect-[1200/630] w-full object-cover" />}
                <div className="p-3">
                  <p className="line-clamp-2 text-sm font-semibold">{mockTitle}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{mockDomain}</p>
                </div>
              </div>
            </MockFrame>

            <MockFrame label="Slack + Discord - Unfurl">
              <div className="flex gap-3 rounded-xl border-l-4 border-primary/60 bg-muted/40 p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-primary">{mockDomain}</p>
                  <p className="line-clamp-1 text-sm font-bold">{mockTitle}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{mockDesc}</p>
                </div>
                {dataUrl && <img src={dataUrl} alt="OG preview" className="h-16 w-28 shrink-0 rounded object-cover" />}
              </div>
            </MockFrame>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
