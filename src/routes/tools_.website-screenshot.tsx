// /tools/website-screenshot - ScreenshotOne-style UX: paste URL, pick a
// viewport, capture. Rendering goes through Microlink's free screenshot API
// (no key needed); Pro unlocks unlimited full-page + retina captures.
// Non-Pro visitors get 2 free full-page captures.
//
// Full-page captures wait for network idle + an extra settle delay and scroll
// the page top-to-bottom first, so lazy-loaded images are loaded before the
// shot. Downloads offer PNG, JPG and PDF (PDF is generated client-side from
// the captured image) on every viewport.
//
// The "Scroll Video" tab records a real full-page scrolling screencast via
// Microlink's screenshot.animated (free tier: 5s max per recording, MP4
// only). Three 5s segments (top/middle/bottom third, Full HD) are recorded
// and stitched client-side into one ~14s video. Each segment sweeps its
// third first so lazy content loads, then smooth-scrolls it with timed
// setTimeout steps (rAF does not fire headless). Output: MP4/WebM stitched
// in-browser, GIF via frame extraction + gifenc.

import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Camera,
  Captions,
  Clapperboard,
  Download,
  Film,
  Link2,
  Loader2,
  MonitorSmartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/website-screenshot";
import toolSeoMeta from "@/lib/tool-seo-meta-data/website-screenshot";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import {
  VIDEO_ASPECTS,
  VIDEO_FORMATS,
  requestScrollVideo,
  segmentsToGif,
  stitchSegmentsToVideo,
  type VideoAspect,
  type VideoFormat,
} from "@/lib/scroll-video";

export const Route = createFileRoute("/tools_/website-screenshot")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/website-screenshot";
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
  component: ScreenshotTool,
});

const VIEWPORTS = [
  { id: "desktop", name: "Desktop", w: 1280, h: 800 },
  { id: "laptop", name: "Laptop", w: 1440, h: 900 },
  { id: "tablet", name: "Tablet", w: 768, h: 1024 },
  { id: "mobile", name: "Mobile", w: 390, h: 844 },
];

const FULLPAGE_FREE_LIMIT = 2;

type Tab = "screenshot" | "video";
type CaptionPos = "top" | "bottom";
type CaptionStyle = "bar" | "gradient" | "pill";

interface VideoResult {
  url: string;
  blob: Blob | null;
  format: VideoFormat;
  width: number;
  height: number;
  durationSec: number;
  sizePretty: string | null;
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = t;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 4);
}

function normalizeUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const withProto = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  try {
    const u = new URL(withProto);
    if (!/^https?:$/.test(u.protocol)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

function ScreenshotTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("website-screenshot", isPro);
  // Full-page captures have their own free allowance: 2 for visitors,
  // unlimited for Pro.
  const fullPageTrial = useToolTrial("website-screenshot-fullpage", isPro, FULLPAGE_FREE_LIMIT);
  // Scroll videos are heavier - their own 5-free allowance.
  const videoTrial = useToolTrial("website-scroll-video", isPro);
  const seo = toolSeo;

  const [tab, setTab] = useState<Tab>("screenshot");
  const [url, setUrl] = useState("");

  // ---- screenshot tab ----
  const [viewportId, setViewportId] = useState("desktop");
  const [fullPage, setFullPage] = useState(false);
  const [busy, setBusy] = useState(false);
  const [shotUrl, setShotUrl] = useState<string | null>(null);
  const [shotFullPage, setShotFullPage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Caption overlay - makes any capture reel/story-ready.
  const [caption, setCaption] = useState("");
  const [captionPos, setCaptionPos] = useState<CaptionPos>("bottom");
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>("gradient");
  const [captionBg, setCaptionBg] = useState("#000000");
  const [captionColor, setCaptionColor] = useState("#ffffff");
  const [exporting, setExporting] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<"png" | "jpeg" | "pdf">("png");

  // ---- scroll-video tab ----
  const [format, setFormat] = useState<VideoFormat>("mp4");
  const [aspect, setAspect] = useState<VideoAspect>("vertical");
  const [videoBusy, setVideoBusy] = useState(false);
  const [videoStatus, setVideoStatus] = useState<string | null>(null);
  const [videoResult, setVideoResult] = useState<VideoResult | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoNotice, setVideoNotice] = useState<string | null>(null);

  // Revoke object URLs when the result is replaced / unmounted.
  useEffect(() => {
    return () => {
      if (videoResult?.blob) URL.revokeObjectURL(videoResult.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const viewport = VIEWPORTS.find((v) => v.id === viewportId)!;
  const canFullPage = isPro || fullPageTrial.left > 0;

  const capture = async () => {
    if (busy || !trial.canUse) return;
    const target = normalizeUrl(url);
    if (!target) {
      setError("Enter a valid website URL, e.g. example.com");
      return;
    }
    const wantFullPage = fullPage && canFullPage;
    setBusy(true);
    setError(null);
    setShotUrl(null);
    try {
      const params = new URLSearchParams({
        url: target,
        screenshot: "true",
        meta: "false",
        "viewport.width": String(viewport.w),
        "viewport.height": String(viewport.h),
        ...(wantFullPage
          ? {
              "screenshot.fullPage": "true",
              // Wait for the network to go idle so images, fonts and lazy
              // chunks finish loading before the capture.
              waitUntil: "networkidle2",
              // Extra settle time for lazy-loaded images and animations.
              waitForTimeout: "4000",
              // Scroll top-to-bottom first: triggers IntersectionObserver
              // lazy-loading so below-the-fold images are loaded, then back
              // to top for the capture.
              scripts: [
                "new Promise((resolve) => { let y = 0; const step = 600; const t = setInterval(() => { y += step; window.scrollTo(0, y); if (y >= document.documentElement.scrollHeight) { clearInterval(t); window.scrollTo(0, 0); setTimeout(resolve, 900); } }, 140); })",
              ].join(","),
            }
          : {}),
      });
      const res = await fetch(`https://api.microlink.io?${params.toString()}`);
      if (!res.ok) throw new Error(`Screenshot service returned ${res.status}. Try again in a moment.`);
      const json = (await res.json()) as { status?: string; data?: { screenshot?: { url?: string } } };
      const shot = json.data?.screenshot?.url;
      if (json.status !== "success" || !shot) throw new Error("Could not capture that page. Is the URL publicly reachable?");
      setShotUrl(shot);
      setShotFullPage(wantFullPage);
      trial.recordUse();
      if (wantFullPage) fullPageTrial.recordUse();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Capture failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  /**
   * Minimal single-image PDF builder: embeds a JPEG as one full-bleed page.
   * No dependency needed - writes the PDF structure by hand.
   */
  const jpegToPdfBlob = async (jpegBytes: Uint8Array, w: number, h: number): Promise<Blob> => {
    const enc = new TextEncoder();
    const parts: (Uint8Array | string)[] = [];
    const offsets: number[] = [];
    let pos = 0;
    const push = (s: string | Uint8Array) => {
      const b = typeof s === "string" ? enc.encode(s) : s;
      parts.push(b);
      pos += b.length;
    };
    const obj = (n: number, body: string | Uint8Array) => {
      offsets[n] = pos;
      push(`${n} 0 obj\n`);
      push(body);
      push(`\nendobj\n`);
    };

    push("%PDF-1.4\n");
    obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
    obj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
    obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Contents 4 0 R /Resources << /XObject << /Im0 5 0 R >> >> >>`);
    const content = `q\n${w} 0 0 ${h} 0 0 cm\n/Im0 Do\nQ`;
    obj(4, `<< /Length ${enc.encode(content).length} >>\nstream\n${content}\nendstream`);
    offsets[5] = pos;
    push(`5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`);
    push(jpegBytes);
    push(`\nendstream\nendobj\n`);

    const xrefPos = pos;
    push(`xref\n0 6\n0000000000 65535 f \n`);
    for (let i = 1; i <= 5; i++) {
      push(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
    }
    push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`);
    return new Blob(parts as BlobPart[], { type: "application/pdf" });
  };

  /** Load the captured screenshot into an <img> (reused by all export paths). */
  const loadShotImage = async (): Promise<HTMLImageElement> => {
    const res = await fetch(shotUrl!);
    const blob = await res.blob();
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      const obj = URL.createObjectURL(blob);
      el.onload = () => {
        URL.revokeObjectURL(obj);
        resolve(el);
      };
      el.onerror = reject;
      el.src = obj;
    });
  };

  /** Draw the screenshot (+ optional caption overlay) onto a canvas. */
  const renderToCanvas = (img: HTMLImageElement): HTMLCanvasElement => {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    // White base so JPEG/PDF never get a black background.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    const text = caption.trim();
    if (text) {
      const W = canvas.width, H = canvas.height;
      const fontSize = Math.max(30, Math.round(W * 0.048));
      ctx.font = `800 ${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      const padX = Math.round(W * 0.06);
      const lines = wrapLines(ctx, text, W - padX * 2);
      const lineH = Math.round(fontSize * 1.25);
      const textBlockH = lines.length * lineH;
      const padY = Math.round(fontSize * 0.7);
      const barH = textBlockH + padY * 2;
      const y0 = captionPos === "top" ? 0 : H - barH;

      if (captionStyle === "bar") {
        ctx.fillStyle = captionBg;
        ctx.fillRect(0, y0, W, barH);
      } else if (captionStyle === "gradient") {
        const g = captionPos === "top"
          ? ctx.createLinearGradient(0, 0, 0, barH * 1.6)
          : ctx.createLinearGradient(0, H, 0, H - barH * 1.6);
        g.addColorStop(0, captionBg);
        g.addColorStop(1, `${captionBg}00`);
        ctx.fillStyle = g;
        ctx.fillRect(0, captionPos === "top" ? 0 : H - barH * 1.6, W, barH * 1.6);
      } else {
        const widest = Math.max(...lines.map((l) => ctx.measureText(l).width), 10);
        const pw = widest + padX;
        const ph = textBlockH + padY * 1.4;
        const px = (W - pw) / 2;
        const py = y0 + (barH - ph) / 2;
        ctx.fillStyle = captionBg;
        ctx.beginPath();
        ctx.roundRect(px, py, pw, ph, ph / 2);
        ctx.fill();
      }

      ctx.fillStyle = captionColor;
      const startY = captionStyle === "pill"
        ? y0 + (barH - textBlockH) / 2 + fontSize
        : y0 + padY + fontSize;
      lines.forEach((ln, i) => ctx.fillText(ln, W / 2, startY + i * lineH));
    }
    return canvas;
  };

  const download = async () => {
    if (!shotUrl || exporting) return;
    setExporting(true);
    try {
      const img = await loadShotImage();
      const canvas = renderToCanvas(img);
      const base = `screenshot-${viewportId}${shotFullPage ? "-fullpage" : ""}${caption.trim() ? "-caption" : ""}`;

      if (downloadFormat === "pdf") {
        const jpegBlob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.92));
        if (!jpegBlob) throw new Error("PDF export failed.");
        const bytes = new Uint8Array(await jpegBlob.arrayBuffer());
        const pdf = await jpegToPdfBlob(bytes, canvas.width, canvas.height);
        downloadBlob(pdf, `${base}.pdf`);
      } else if (downloadFormat === "jpeg") {
        const out = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.92));
        if (out) downloadBlob(out, `${base}.jpg`);
        else window.open(shotUrl, "_blank", "noopener");
      } else {
        const out = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
        if (out) downloadBlob(out, `${base}.png`);
        else window.open(shotUrl, "_blank", "noopener");
      }
    } catch {
      window.open(shotUrl!, "_blank", "noopener");
    } finally {
      setExporting(false);
    }
  };
  const createVideo = async () => {
    if (videoBusy || !videoTrial.canUse) return;
    const target = normalizeUrl(url);
    if (!target) {
      setVideoError("Enter a valid website URL, e.g. example.com");
      return;
    }
    if (videoResult?.blob) URL.revokeObjectURL(videoResult.url);
    setVideoBusy(true);
    setVideoError(null);
    setVideoNotice(null);
    setVideoResult(null);
    try {
      const clip = await requestScrollVideo(target, aspect, setVideoStatus);
      let blob: Blob;
      let outFormat: VideoFormat = format;
      let notice: string | null = null;
      if (format === "gif") {
        blob = await segmentsToGif(clip, setVideoStatus);
      } else {
        try {
          blob = await stitchSegmentsToVideo(clip, format, setVideoStatus);
        } catch (e) {
          if (e instanceof Error && (e.message === "mp4-unsupported" || e.message === "webm-unsupported")) {
            // Fall back to the other container so the user still gets a video.
            const fallback = format === "mp4" ? "webm" : "mp4";
            try {
              blob = await stitchSegmentsToVideo(clip, fallback, setVideoStatus);
              outFormat = fallback;
              notice =
                format === "mp4"
                  ? "MP4 recording isn't supported in this browser - here's a WebM instead (plays in Chrome/Edge)."
                  : "WebM recording isn't supported in this browser - here's an MP4 instead.";
            } catch {
              throw e;
            }
          } else {
            throw e;
          }
        }
      }
      const outUrl = URL.createObjectURL(blob);
      setVideoResult({
        url: outUrl,
        blob,
        format: outFormat,
        width: clip.width,
        height: clip.height,
        durationSec: Math.round(clip.durationSec),
        sizePretty: null,
      });
      setVideoNotice(notice);
      videoTrial.recordUse();
    } catch (e) {
      setVideoError(e instanceof Error ? e.message : "Video failed. Please try again.");
    } finally {
      setVideoBusy(false);
      setVideoStatus(null);
    }
  };

  const downloadVideo = () => {
    if (!videoResult?.blob) return;
    downloadBlob(videoResult.blob, `scroll-video-${aspect}.${videoResult.format}`);
  };

  return (
    <ToolPageShell toolId="website-screenshot" seo={seo} trial={trial} isPro={isPro}>
      {/* Tabs */}
      <div className="mb-5 inline-flex rounded-xl border border-border bg-card p-1">
        {(
          [
            { id: "screenshot", label: "Screenshot", icon: Camera },
            { id: "video", label: "Scroll Video", icon: Clapperboard },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold transition",
              tab === t.id ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
            {t.id === "video" && (
              <span className={cn(
                "rounded-full px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide",
                tab === "video" ? "bg-white/25 text-white" : "bg-primary/15 text-primary",
              )}>
                New
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "screenshot" ? (
        <>
          <TrialUpsell toolName="Website Screenshot" left={trial.left} />
          <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
            <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-medium text-foreground/80">Website URL</span>
                <div className="relative">
                  <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && capture()}
                    placeholder="example.com"
                    className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary"
                  />
                </div>
              </label>

              <div>
                <span className="mb-1.5 block text-[13px] font-medium text-foreground/80">Viewport</span>
                <div className="grid grid-cols-2 gap-2">
                  {VIEWPORTS.map((v) => (
                    <button
                      key={v.id} type="button"
                      onClick={() => setViewportId(v.id)}
                      className={cn(
                        "rounded-xl border px-2 py-2 text-xs font-bold transition",
                        viewportId === v.id ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40",
                      )}
                    >
                      <MonitorSmartphone className="mx-auto mb-1 h-4 w-4" />
                      {v.name}
                      <span className="block font-normal text-muted-foreground">{v.w}×{v.h}</span>
                    </button>
                  ))}
                </div>
              </div>

              <label className={cn("flex cursor-pointer items-center justify-between text-sm font-medium", !canFullPage && "opacity-60")}>
                <span>
                  Full-page capture
                  {!isPro && (
                    <span className="ml-1.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                      {fullPageTrial.left} of {FULLPAGE_FREE_LIMIT} free
                    </span>
                  )}
                </span>
                <input
                  type="checkbox"
                  checked={fullPage && canFullPage}
                  disabled={!canFullPage}
                  onChange={(e) => setFullPage(e.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
              </label>

              <ActionButton busy={busy} disabled={!trial.canUse} onClick={capture}>
                <Camera className="h-4 w-4" /> {busy ? "Capturing…" : "Capture screenshot"}
              </ActionButton>
              {!isPro && (
                <p className="text-xs text-muted-foreground">
                  {trial.left} of {TOOL_TRIAL_LIMIT} free captures left - no account needed.
                </p>
              )}
              {error && <p className="text-sm font-medium text-red-500">{error}</p>}
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              {!shotUrl ? (
                <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
                  <Camera className="mb-3 h-10 w-10 text-muted-foreground/50" />
                  <p className="font-semibold">Your screenshot appears here</p>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                    Paste any public URL and hit Capture - pixel-perfect PNG in seconds. Add a caption overlay to make it reel-ready.
                  </p>
                </div>
              ) : (
                <div>
                  <div className="relative overflow-hidden rounded-xl border border-border">
                    <img src={shotUrl} alt={`Screenshot of ${url}`} className="h-auto w-full" />
                    {caption.trim() && (
                      <div
                        className={cn(
                          "pointer-events-none absolute inset-x-0 flex px-[6%]",
                          captionPos === "top" ? "top-0 items-start pt-[4%]" : "bottom-0 items-end pb-[4%]",
                          captionStyle === "pill" && "justify-center",
                        )}
                      >
                        <div
                          className={cn(
                            "w-full px-4 py-3 text-center text-lg font-extrabold leading-snug sm:text-xl",
                            captionStyle === "bar" && "-mx-[6%] px-[6%]",
                            captionStyle === "pill" && "w-auto max-w-full rounded-full px-6",
                          )}
                          style={{
                            color: captionColor,
                            background:
                              captionStyle === "gradient"
                                ? `linear-gradient(to ${captionPos === "top" ? "bottom" : "top"}, ${captionBg}, ${captionBg}00)`
                                : captionBg,
                          }}
                        >
                          {caption.trim()}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Caption overlay controls */}
                  <div className="mt-4 rounded-xl border border-border bg-muted/40 p-4">
                    <p className="mb-2 flex items-center gap-1.5 text-sm font-bold">
                      <Captions className="h-4 w-4 text-primary" /> Caption overlay - make it reel-ready
                    </p>
                    <input
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      maxLength={90}
                      placeholder="Add a caption, e.g. Our new pricing page is live"
                      className="mb-3 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      {(["top", "bottom"] as CaptionPos[]).map((p) => (
                        <button
                          key={p} type="button" onClick={() => setCaptionPos(p)}
                          className={cn(
                            "rounded-lg border px-3 py-1.5 text-xs font-bold capitalize transition",
                            captionPos === p ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40",
                          )}
                        >
                          {p}
                        </button>
                      ))}
                      <span className="mx-1 h-5 w-px bg-border" />
                      {(["bar", "gradient", "pill"] as CaptionStyle[]).map((s) => (
                        <button
                          key={s} type="button" onClick={() => setCaptionStyle(s)}
                          className={cn(
                            "rounded-lg border px-3 py-1.5 text-xs font-bold capitalize transition",
                            captionStyle === s ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40",
                          )}
                        >
                          {s}
                        </button>
                      ))}
                      <span className="mx-1 h-5 w-px bg-border" />
                      <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                        Bar
                        <input type="color" value={captionBg} onChange={(e) => setCaptionBg(e.target.value)} className="h-7 w-9 cursor-pointer rounded border border-border bg-background" />
                      </label>
                      <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                        Text
                        <input type="color" value={captionColor} onChange={(e) => setCaptionColor(e.target.value)} className="h-7 w-9 cursor-pointer rounded border border-border bg-background" />
                      </label>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <div className="inline-flex items-center rounded-xl border border-border bg-surface p-1">
                      {(["png", "jpeg", "pdf"] as const).map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setDownloadFormat(f)}
                          className={cn(
                            "rounded-lg px-3 py-1.5 font-mono text-xs font-bold uppercase transition-colors",
                            downloadFormat === f
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {f === "jpeg" ? "JPG" : f.toUpperCase()}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button" onClick={download} disabled={exporting}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-60"
                    >
                      <Download className="h-4 w-4" /> {exporting ? "Composing…" : `Download ${downloadFormat === "jpeg" ? "JPG" : downloadFormat.toUpperCase()}`}
                    </button>
                    <span className="text-xs text-muted-foreground">
                      {viewport.w}×{viewport.h}{shotFullPage ? " · full page" : ""} · captured just now
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          <TrialUpsell toolName="Scroll Video" left={videoTrial.left} />
          <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
            <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-medium text-foreground/80">Website URL</span>
                <div className="relative">
                  <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && createVideo()}
                    placeholder="example.com"
                    className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary"
                  />
                </div>
              </label>

              <div>
                <span className="mb-1.5 block text-[13px] font-medium text-foreground/80">Format</span>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(VIDEO_FORMATS) as VideoFormat[]).map((f) => (
                    <button
                      key={f} type="button"
                      onClick={() => setFormat(f)}
                      className={cn(
                        "rounded-xl border px-2 py-2 text-xs font-bold transition",
                        format === f ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40",
                      )}
                    >
                      <Film className="mx-auto mb-1 h-4 w-4" />
                      {VIDEO_FORMATS[f].label}
                      <span className="block font-normal text-muted-foreground">{VIDEO_FORMATS[f].hint}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="mb-1.5 block text-[13px] font-medium text-foreground/80">Aspect ratio</span>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(VIDEO_ASPECTS) as VideoAspect[]).map((a) => (
                    <button
                      key={a} type="button"
                      onClick={() => setAspect(a)}
                      className={cn(
                        "rounded-xl border px-2 py-2 text-xs font-bold transition",
                        aspect === a ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40",
                      )}
                    >
                      {VIDEO_ASPECTS[a].label}
                      <span className="block font-normal text-muted-foreground">{VIDEO_ASPECTS[a].dims}</span>
                      <span className="block font-normal text-muted-foreground">{VIDEO_ASPECTS[a].hint}</span>
                    </button>
                  ))}
                </div>
              </div>

              <ActionButton busy={videoBusy} disabled={!videoTrial.canUse} onClick={createVideo}>
                <Clapperboard className="h-4 w-4" /> {videoBusy ? "Recording…" : "Create scroll video"}
              </ActionButton>
              {!isPro && (
                <p className="text-xs text-muted-foreground">
                  {videoTrial.left} of {TOOL_TRIAL_LIMIT} free videos left - no account needed.
                </p>
              )}
              <p className="text-xs leading-relaxed text-muted-foreground">
                ~14-second full-page scroll in Full HD · recorded as 3 parts (top, middle,
                bottom) and stitched into one smooth video. Each part sweeps its section
                first so lazy-loaded images appear fully loaded.
              </p>
              {videoError && <p className="text-sm font-medium text-red-500">{videoError}</p>}
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              {!videoResult ? (
                <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
                  {videoBusy ? (
                    <>
                      <Loader2 className="mb-3 h-10 w-10 animate-spin text-primary" />
                      <p className="font-semibold">Recording your scroll…</p>
                      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                        {videoStatus ?? "This takes about a minute - recording 3 parts, then stitching them into one video."}
                      </p>
                    </>
                  ) : (
                    <>
                      <Clapperboard className="mb-3 h-10 w-10 text-muted-foreground/50" />
                      <p className="font-semibold">Your scroll video appears here</p>
                      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                        Paste any public URL, pick a format and aspect ratio - get a smooth
                        scrolling video ready for Reels, Stories, or YouTube.
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div>
                  <div className="flex justify-center overflow-hidden rounded-xl border border-border bg-black">
                    <video
                      src={videoResult.url}
                      controls
                      playsInline
                      loop
                      muted
                      className="h-auto max-h-[520px] w-auto max-w-full"
                    />
                  </div>
                  {videoNotice && (
                    <p className="mt-3 rounded-xl bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-600 dark:text-amber-400">
                      {videoNotice}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button" onClick={downloadVideo}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90"
                    >
                      <Download className="h-4 w-4" /> Download {videoResult.format.toUpperCase()}
                    </button>
                    <span className="text-xs text-muted-foreground">
                      {videoResult.width}×{videoResult.height} · {videoResult.durationSec}s
                      {videoResult.sizePretty ? ` · ${videoResult.sizePretty}` : ""} · scroll recorded just now
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </ToolPageShell>
  );
}
