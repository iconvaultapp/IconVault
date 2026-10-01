// Thumbnail template engine - data-driven 1280×720 YouTube thumbnail renderer.
// Templates are pure data (see thumbnail-templates-catalog.ts); this file owns
// the types, the canvas renderer, and the category list.
//
// Coordinates for decorations are fractions of the canvas (0..1).

import type { PickedIcon } from "@/components/IconStickerPicker";
import { drawSvgToCanvas } from "@/components/IconStickerPicker";

export const TW = 1280;
export const TH = 720;

// The 100+ template catalog lives in thumbnail-templates-catalog.ts
// (authored separately); re-exported here so consumers import one module.
export { TEMPLATES } from "./thumbnail-templates-catalog";

export type BgSpec =
  | { type: "gradient"; c1: string; c2: string; angle?: number }
  | { type: "solid"; color: string }
  | { type: "duotone"; color: string; accent: string }
  | { type: "photo" };

export type PatternKind = "none" | "dots" | "rays" | "speedlines" | "grid" | "stripes" | "halftone";

export type BadgeKind = "none" | "pill" | "stamp" | "ribbon" | "corner" | "circle";

export type Decoration =
  | { kind: "arrow"; x: number; y: number; rotation?: number; scale?: number; color?: string }
  | { kind: "circle"; x: number; y: number; r: number; color?: string; width?: number }
  | { kind: "question"; x: number; y: number; scale?: number; color?: string }
  | { kind: "exclaim"; x: number; y: number; scale?: number; color?: string }
  | { kind: "starburst"; x: number; y: number; r: number; color?: string; textColor?: string }
  | { kind: "split"; color: string; ratio?: number; diagonal?: boolean }
  | { kind: "vs"; x: number; y: number; scale?: number }
  | { kind: "glow"; x: number; y: number; r: number; color?: string }
  | { kind: "progressbar"; progress: number; color?: string; trackColor?: string }
  | { kind: "underline"; color?: string; width?: number }
  | { kind: "check"; x: number; y: number; scale?: number; color?: string }
  | { kind: "cross"; x: number; y: number; scale?: number; color?: string }
  | { kind: "bignumber"; x: number; y: number; scale?: number; color?: string }
  | { kind: "frame"; color?: string; width?: number }
  | { kind: "wave"; color?: string; height?: number }
  | { kind: "chip"; x: number; y: number; color?: string };

export type TextPos = "left" | "center" | "right" | "bottom-left" | "bottom-center" | "top-left";

export interface ThumbnailTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  bg: BgSpec;
  pattern?: PatternKind;
  patternColor?: string;
  badge?: BadgeKind;
  badgeColor?: string;
  badgeTextColor?: string;
  textPos?: TextPos;
  /** multiplier on the auto headline size (1 = default) */
  headlineScale?: number;
  textColor: string;
  strokeColor: string;
  accent: string;
  iconSide?: "left" | "right" | "center" | "none";
  iconSize?: number;
  decorations?: Decoration[];
}

export interface TemplateRenderState {
  headline: string;
  badge: string;
  textColor: string;
  strokeColor: string;
  icon: PickedIcon | null;
  iconSide: "left" | "right";
  photo: HTMLImageElement | null;
  usePhoto: boolean;
}

export const TEMPLATE_CATEGORIES = [
  { id: "clickbait", name: "Shock & Clickbait" },
  { id: "gaming", name: "Gaming" },
  { id: "finance", name: "Finance & Money" },
  { id: "tech", name: "Tech & AI" },
  { id: "food", name: "Food & Cooking" },
  { id: "travel", name: "Travel" },
  { id: "fitness", name: "Fitness" },
  { id: "podcast", name: "Podcast & Vlog" },
  { id: "education", name: "Education" },
  { id: "challenge", name: "Challenge & 30-Day" },
  { id: "news", name: "News & Commentary" },
  { id: "minimal", name: "Minimal & Clean" },
  { id: "marketing", name: "Marketing & Business" },
  { id: "motivation", name: "Motivation" },
  { id: "sports", name: "Sports" },
  { id: "spiritual", name: "Spiritual & Devotional" },
] as const;

export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number]["id"];

// ---------------------------------------------------------------------------
// Background + pattern
// ---------------------------------------------------------------------------

function paintBackground(
  ctx: CanvasRenderingContext2D,
  t: ThumbnailTemplate,
  state: TemplateRenderState,
) {
  const W = TW, H = TH;
  const usePhotoBg = state.usePhoto && state.photo && t.bg.type === "photo";
  if (usePhotoBg && state.photo) {
    const img = state.photo;
    const s = Math.max(W / img.naturalWidth, H / img.naturalHeight);
    const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
    ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
    const g = ctx.createLinearGradient(0, H * 0.3, 0, H);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.66)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  } else if (t.bg.type === "gradient") {
    const angle = ((t.bg.angle ?? 135) * Math.PI) / 180;
    const cx = W / 2, cy = H / 2;
    const r = Math.hypot(W, H) / 2;
    const g = ctx.createLinearGradient(
      cx - Math.cos(angle) * r, cy - Math.sin(angle) * r,
      cx + Math.cos(angle) * r, cy + Math.sin(angle) * r,
    );
    g.addColorStop(0, t.bg.c1);
    g.addColorStop(1, t.bg.c2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  } else if (t.bg.type === "duotone") {
    ctx.fillStyle = t.bg.color;
    ctx.fillRect(0, 0, W, H);
  } else if (t.bg.type === "solid") {
    ctx.fillStyle = t.bg.color;
    ctx.fillRect(0, 0, W, H);
  } else {
    // "photo" template without a photo uploaded yet - fall back to a bold gradient
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#312e81");
    g.addColorStop(1, "#0f172a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  const pat = t.pattern ?? "none";
  const pc = t.patternColor ?? "rgba(255,255,255,0.14)";
  if (pat === "dots") {
    ctx.fillStyle = pc;
    for (let y = 20; y < H; y += 44) {
      for (let x = (y / 44) % 2 ? 20 : 42; x < W; x += 44) {
        ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
      }
    }
  } else if (pat === "grid") {
    ctx.strokeStyle = pc;
    ctx.lineWidth = 2;
    for (let x = 0; x <= W; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  } else if (pat === "stripes") {
    ctx.save();
    ctx.fillStyle = pc;
    for (let x = -H; x < W + H; x += 56) {
      ctx.beginPath();
      ctx.moveTo(x, 0); ctx.lineTo(x + 28, 0); ctx.lineTo(x + 28 - H, H); ctx.lineTo(x - H, H);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  } else if (pat === "rays") {
    ctx.save();
    ctx.translate(W * 0.5, H * 1.15);
    ctx.fillStyle = pc;
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, Math.hypot(W, H), a, a + (Math.PI * 2) / 48);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  } else if (pat === "halftone") {
    ctx.fillStyle = pc;
    for (let y = 0; y < H; y += 36) {
      for (let x = 0; x < W; x += 36) {
        const r = 2 + 7 * (x / W);
        ctx.beginPath(); ctx.arc(x + 18, y + 18, r, 0, Math.PI * 2); ctx.fill();
      }
    }
  } else if (pat === "speedlines") {
    ctx.save();
    ctx.translate(W * 0.82, H * 0.5);
    ctx.strokeStyle = pc;
    ctx.lineWidth = 7;
    for (let i = 0; i < 26; i++) {
      const a = -0.5 + (i / 26) * 1.0;
      const r0 = 240, r1 = 900;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
      ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Decorations
// ---------------------------------------------------------------------------

function drawArrow(ctx: CanvasRenderingContext2D, d: Extract<Decoration, { kind: "arrow" }>) {
  const x = d.x * TW, y = d.y * TH;
  const s = (d.scale ?? 1) * 130;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(((d.rotation ?? 0) * Math.PI) / 180);
  ctx.strokeStyle = d.color ?? "#facc15";
  ctx.fillStyle = d.color ?? "#facc15";
  ctx.lineWidth = s * 0.22;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-s * 0.7, -s * 0.35);
  ctx.quadraticCurveTo(s * 0.1, -s * 0.25, s * 0.55, s * 0.15);
  ctx.stroke();
  // arrowhead
  const hx = s * 0.55, hy = s * 0.15;
  ctx.beginPath();
  ctx.moveTo(hx + s * 0.28, hy - s * 0.1);
  ctx.lineTo(hx + s * 0.05, hy - s * 0.32);
  ctx.lineTo(hx - s * 0.02, hy + s * 0.3);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawCircleHighlight(ctx: CanvasRenderingContext2D, d: Extract<Decoration, { kind: "circle" }>) {
  const x = d.x * TW, y = d.y * TH, r = d.r * TW;
  ctx.save();
  ctx.strokeStyle = d.color ?? "#ef4444";
  ctx.lineWidth = d.width ?? 14;
  ctx.lineCap = "round";
  // hand-drawn feel: two overlapping arcs with slight wobble
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    const wob = pass === 0 ? 0 : 6;
    for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.08) {
      const rr = r + Math.sin(a * 3 + pass) * wob;
      const px = x + Math.cos(a) * rr * 1.25;
      const py = y + Math.sin(a) * rr * 0.8;
      if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawStarburst(ctx: CanvasRenderingContext2D, d: Extract<Decoration, { kind: "starburst" }>) {
  const x = d.x * TW, y = d.y * TH, r = d.r * TW;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = d.color ?? "#facc15";
  ctx.beginPath();
  const spikes = 16;
  for (let i = 0; i < spikes * 2; i++) {
    const rr = i % 2 === 0 ? r : r * 0.78;
    const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawBigMark(ctx: CanvasRenderingContext2D, ch: string, x: number, y: number, scale: number, color: string) {
  const size = scale * 340;
  ctx.save();
  ctx.font = `900 ${size}px Inter, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(0,0,0,0.85)";
  ctx.lineWidth = size * 0.09;
  ctx.strokeText(ch, x, y);
  ctx.fillStyle = color;
  ctx.fillText(ch, x, y);
  ctx.restore();
}

function drawSplit(ctx: CanvasRenderingContext2D, d: Extract<Decoration, { kind: "split" }>) {
  const ratio = d.ratio ?? 0.5;
  ctx.save();
  ctx.fillStyle = d.color;
  if (d.diagonal) {
    ctx.beginPath();
    ctx.moveTo(TW * ratio, 0);
    ctx.lineTo(TW, 0);
    ctx.lineTo(TW, TH);
    ctx.lineTo(TW * ratio - 140, TH);
    ctx.closePath(); ctx.fill();
  } else {
    ctx.fillRect(TW * ratio, 0, TW * (1 - ratio), TH);
  }
  ctx.restore();
}

function drawVs(ctx: CanvasRenderingContext2D, d: Extract<Decoration, { kind: "vs" }>) {
  const x = d.x * TW, y = d.y * TH;
  const s = d.scale ?? 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#ef4444";
  ctx.beginPath(); ctx.arc(0, 0, 74 * s, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 8 * s;
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.font = `900 ${64 * s}px Inter, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("VS", 0, 4 * s);
  ctx.restore();
}

function drawGlow(ctx: CanvasRenderingContext2D, d: Extract<Decoration, { kind: "glow" }>) {
  const x = d.x * TW, y = d.y * TH, r = d.r * TW;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  const c = d.color ?? "#facc15";
  g.addColorStop(0, c + "cc");
  g.addColorStop(1, c + "00");
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

function drawFrame(ctx: CanvasRenderingContext2D, d: Extract<Decoration, { kind: "frame" }>) {
  const w = d.width ?? 18;
  const L = 150;
  ctx.save();
  ctx.strokeStyle = d.color ?? "#ffffff";
  ctx.lineWidth = w;
  ctx.lineCap = "round";
  const corners: Array<[number, number, number, number]> = [
    [36, 36, 1, 1], [TW - 36, 36, -1, 1], [36, TH - 36, 1, -1], [TW - 36, TH - 36, -1, -1],
  ];
  for (const [cx, cy, sx, sy] of corners) {
    ctx.beginPath();
    ctx.moveTo(cx + sx * L, cy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx, cy + sy * L);
    ctx.stroke();
  }
  ctx.restore();
}

function drawWave(ctx: CanvasRenderingContext2D, d: Extract<Decoration, { kind: "wave" }>) {
  const h = (d.height ?? 0.22) * TH;
  ctx.save();
  ctx.fillStyle = d.color ?? "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.moveTo(0, TH);
  ctx.lineTo(0, TH - h * 0.6);
  ctx.bezierCurveTo(TW * 0.3, TH - h * 1.4, TW * 0.7, TH - h * 0.2, TW, TH - h);
  ctx.lineTo(TW, TH);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawChip(ctx: CanvasRenderingContext2D, d: Extract<Decoration, { kind: "chip" }>, label: string) {
  const x = d.x * TW, y = d.y * TH;
  ctx.save();
  ctx.font = "800 30px Inter, system-ui, sans-serif";
  const w = ctx.measureText(label).width + 44;
  ctx.fillStyle = d.color ?? "#22c55e";
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - 26, w, 52, 26);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x, y + 2);
  ctx.restore();
}

function drawCheck(ctx: CanvasRenderingContext2D, d: Extract<Decoration, { kind: "check" }>) {
  const x = d.x * TW, y = d.y * TH, s = (d.scale ?? 1) * 120;
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = d.color ?? "#22c55e";
  ctx.lineWidth = s * 0.24;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(-s * 0.55, 0);
  ctx.lineTo(-s * 0.1, s * 0.45);
  ctx.lineTo(s * 0.65, -s * 0.45);
  ctx.stroke();
  ctx.restore();
}

function drawCross(ctx: CanvasRenderingContext2D, d: Extract<Decoration, { kind: "cross" }>) {
  const x = d.x * TW, y = d.y * TH, s = (d.scale ?? 1) * 120;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI / 4);
  ctx.strokeStyle = d.color ?? "#ef4444";
  ctx.lineWidth = s * 0.24;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-s * 0.5, 0); ctx.lineTo(s * 0.5, 0);
  ctx.moveTo(0, -s * 0.5); ctx.lineTo(0, s * 0.5);
  ctx.stroke();
  ctx.restore();
}

function drawDecoration(ctx: CanvasRenderingContext2D, d: Decoration, badgeText: string) {
  switch (d.kind) {
    case "arrow": drawArrow(ctx, d); break;
    case "circle": drawCircleHighlight(ctx, d); break;
    case "question": drawBigMark(ctx, "?", d.x * TW, d.y * TH, d.scale ?? 1, d.color ?? "#facc15"); break;
    case "exclaim": drawBigMark(ctx, "!", d.x * TW, d.y * TH, d.scale ?? 1, d.color ?? "#ef4444"); break;
    case "starburst": drawStarburst(ctx, d); break;
    case "split": drawSplit(ctx, d); break;
    case "vs": drawVs(ctx, d); break;
    case "glow": drawGlow(ctx, d); break;
    case "progressbar": {
      const p = d.progress;
      const bw = TW * 0.7, bx = (TW - bw) / 2, by = TH - 84;
      ctx.save();
      ctx.fillStyle = d.trackColor ?? "rgba(255,255,255,0.25)";
      ctx.beginPath(); ctx.roundRect(bx, by, bw, 26, 13); ctx.fill();
      ctx.fillStyle = d.color ?? "#22c55e";
      ctx.beginPath(); ctx.roundRect(bx, by, bw * p, 26, 13); ctx.fill();
      ctx.restore();
      break;
    }
    case "underline": break; // drawn with the headline pass
    case "check": drawCheck(ctx, d); break;
    case "cross": drawCross(ctx, d); break;
    case "bignumber":
      drawBigMark(ctx, badgeText || "30", d.x * TW, d.y * TH, (d.scale ?? 1) * 1.4, d.color ?? "#facc15");
      break;
    case "frame": drawFrame(ctx, d); break;
    case "wave": drawWave(ctx, d); break;
    case "chip": drawChip(ctx, d, badgeText || "NEW"); break;
  }
}

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------

function drawBadge(ctx: CanvasRenderingContext2D, t: ThumbnailTemplate, badgeText: string) {
  const text = badgeText.trim().toUpperCase();
  if (!text || t.badge === "none") return;
  const color = t.badgeColor ?? t.accent;
  const tc = t.badgeTextColor ?? "#111111";
  ctx.save();
  ctx.textBaseline = "middle";

  if (t.badge === "pill" || !t.badge) {
    ctx.font = "800 34px Inter, system-ui, sans-serif";
    const bw = ctx.measureText(text).width + 56;
    const bx = 64, by = 64;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.roundRect(bx, by, bw, 64, 16); ctx.fill();
    ctx.fillStyle = tc;
    ctx.fillText(text, bx + 28, by + 34);
  } else if (t.badge === "stamp") {
    ctx.translate(TW - 190, 150);
    ctx.rotate(-0.22);
    ctx.font = "900 44px Inter, system-ui, sans-serif";
    const bw = ctx.measureText(text).width + 60;
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.92;
    ctx.fillRect(-bw / 2, -44, bw, 88);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = tc;
    ctx.lineWidth = 4;
    ctx.strokeRect(-bw / 2 + 8, -36, bw - 16, 72);
    ctx.fillStyle = tc;
    ctx.textAlign = "center";
    ctx.fillText(text, 0, 2);
  } else if (t.badge === "ribbon") {
    ctx.font = "800 32px Inter, system-ui, sans-serif";
    const bw = ctx.measureText(text).width + 72;
    const bh = 58;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, 108);
    ctx.lineTo(bw, 108);
    ctx.lineTo(bw - 26, 108 + bh);
    ctx.lineTo(0, 108 + bh);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = tc;
    ctx.fillText(text, 28, 108 + bh / 2 + 2);
  } else if (t.badge === "corner") {
    ctx.font = "900 30px Inter, system-ui, sans-serif";
    const bw = ctx.measureText(text).width + 56;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(TW, 0);
    ctx.lineTo(TW - bw - 60, 0);
    ctx.lineTo(TW, 96);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = tc;
    ctx.textAlign = "right";
    ctx.fillText(text, TW - 40, 52);
  } else if (t.badge === "circle") {
    ctx.font = "900 34px Inter, system-ui, sans-serif";
    const bw = ctx.measureText(text).width;
    const r = Math.max(78, bw / 2 + 42);
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(TW - r - 56, r + 56, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = tc;
    ctx.textAlign = "center";
    ctx.fillText(text, TW - r - 56, r + 58);
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Headline
// ---------------------------------------------------------------------------

function headlineBox(t: ThumbnailTemplate, iconW: number, iconSide: "left" | "right"): { x: number; w: number; align: CanvasTextAlign; baseY: number } {
  const pad = 64;
  const pos = t.textPos ?? "left";
  const hasIcon = iconW > 0;
  if (pos === "center" || pos === "bottom-center") {
    return { x: TW / 2, w: TW - pad * 2, align: "center", baseY: pos === "center" ? TH * 0.52 : TH - pad };
  }
  if (pos === "right") {
    const w = TW - pad * 2 - (hasIcon && iconSide === "left" ? iconW + 40 : 0);
    return { x: TW - pad, w, align: "right", baseY: TH - pad };
  }
  if (pos === "top-left") {
    const w = TW - pad * 2 - (hasIcon && iconSide === "right" ? iconW + 40 : 0);
    return { x: pad, w, align: "left", baseY: 200 };
  }
  // left / bottom-left
  const w = TW - pad * 2 - (hasIcon ? iconW + 40 : 0);
  const x = hasIcon && iconSide === "left" ? pad + iconW + 40 : pad;
  return { x, w, align: "left", baseY: TH - pad };
}

function drawHeadline(
  ctx: CanvasRenderingContext2D,
  t: ThumbnailTemplate,
  state: TemplateRenderState,
  iconW: number,
) {
  const headline = state.headline.trim();
  if (!headline) return;
  const { x, w: availW, align, baseY } = headlineBox(t, iconW, state.iconSide);
  const scale = t.headlineScale ?? 1;
  const words = headline.toUpperCase().split(/\s+/);
  const maxLines = 3;

  const linesFor = (sz: number): string[] => {
    ctx.font = `900 ${sz}px Inter, system-ui, sans-serif`;
    const lines: string[] = [];
    let line = "";
    for (const wd of words) {
      const cand = line ? line + " " + wd : wd;
      if (ctx.measureText(cand).width > availW && line) {
        lines.push(line);
        line = wd;
      } else {
        line = cand;
      }
      if (lines.length === maxLines) break;
    }
    if (line && lines.length < maxLines) lines.push(line);
    return lines;
  };

  let size = Math.round(118 * scale);
  let lines = linesFor(size);
  while ((lines.length > maxLines || lines.some((l) => ctx.measureText(l).width > availW)) && size > 44) {
    size -= 6;
    lines = linesFor(size);
  }
  lines = lines.slice(0, maxLines);

  ctx.font = `900 ${size}px Inter, system-ui, sans-serif`;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = align;
  ctx.lineJoin = "round";
  const lh = size * 1.08;
  const topY = baseY - (lines.length - 1) * lh;

  const hasUnderline = t.decorations?.some((d) => d.kind === "underline");
  const underlineDeco = t.decorations?.find((d) => d.kind === "underline") as
    | Extract<Decoration, { kind: "underline" }>
    | undefined;

  lines.forEach((ln, i) => {
    const y = topY + i * lh;
    const tx = align === "center" ? x : align === "right" ? x : x;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    ctx.strokeStyle = state.strokeColor;
    ctx.lineWidth = Math.max(6, size * 0.09);
    ctx.strokeText(ln, tx, y);
    ctx.fillStyle = state.textColor;
    ctx.fillText(ln, tx, y);
    ctx.restore();

    if (hasUnderline && i === lines.length - 1 && underlineDeco) {
      const lw = ctx.measureText(ln).width;
      const lx = align === "center" ? tx - lw / 2 : align === "right" ? tx - lw : tx;
      ctx.save();
      ctx.fillStyle = underlineDeco.color ?? t.accent;
      const uh = underlineDeco.width ?? 14;
      ctx.fillRect(lx - 6, y + 10, lw + 12, uh);
      ctx.restore();
    }
  });
}

// ---------------------------------------------------------------------------
// Icon sticker
// ---------------------------------------------------------------------------

async function drawIconSticker(
  ctx: CanvasRenderingContext2D,
  t: ThumbnailTemplate,
  state: TemplateRenderState,
): Promise<number> {
  const side = t.iconSide ?? "right";
  if (side === "none" || !state.icon) return 0;
  const iconW = t.iconSize ?? 300;
  const pad = 64;
  const effSide = side === "center" ? "right" : side;
  const ix = effSide === "right" ? TW - pad - iconW : pad;
  const iy = TH / 2 - iconW / 2 - 20;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 12;
  await drawSvgToCanvas(ctx, state.icon.svg, ix, iy, iconW, iconW);
  ctx.restore();
  return iconW;
}

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

export async function renderThumbnail(
  ctx: CanvasRenderingContext2D,
  t: ThumbnailTemplate,
  state: TemplateRenderState,
): Promise<void> {
  paintBackground(ctx, t, state);

  // decorations that sit behind text
  for (const d of t.decorations ?? []) {
    if (d.kind === "split" || d.kind === "glow" || d.kind === "wave" || d.kind === "frame") {
      drawDecoration(ctx, d, state.badge);
    }
  }

  const iconW = await drawIconSticker(ctx, t, state);

  drawHeadline(ctx, t, state, iconW);
  drawBadge(ctx, t, state.badge);

  // decorations that sit on top
  for (const d of t.decorations ?? []) {
    if (d.kind !== "split" && d.kind !== "glow" && d.kind !== "wave" && d.kind !== "frame" && d.kind !== "underline") {
      drawDecoration(ctx, d, state.badge);
    }
  }
}

/** Render a template preview offscreen and return a data URL (for the picker grid). */
export async function renderTemplatePreview(t: ThumbnailTemplate, w = 320): Promise<string> {
  const canvas = document.createElement("canvas");
  const h = Math.round((w * TH) / TW);
  canvas.width = TW;
  canvas.height = TH;
  const ctx = canvas.getContext("2d")!;
  await renderThumbnail(ctx, t, {
    headline: "YOUR TITLE HERE",
    badge: t.badge && t.badge !== "none" ? "NEW" : "",
    textColor: t.textColor,
    strokeColor: t.strokeColor,
    icon: null,
    iconSide: "right",
    photo: null,
    usePhoto: false,
  });
  const small = document.createElement("canvas");
  small.width = w;
  small.height = h;
  small.getContext("2d")!.drawImage(canvas, 0, 0, w, h);
  return small.toDataURL("image/png");
}
