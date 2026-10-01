// Fancy QR-code designs: 22 curated styles rendered straight from the QR
// module matrix, so every design stays fully scannable. Free designs work
// for everyone; pro designs are visible to all but locked behind Pro.

import QRCode from "qrcode";

export type QrModuleStyle =
  | "classic"
  | "rounded"
  | "dots"
  | "diamond"
  | "hbar"
  | "vbar"
  | "star"
  | "sparkle";

export type QrEyeStyle = "square" | "rounded" | "circle" | "leaf";

export interface QrDesign {
  id: string;
  name: string;
  /** true = visible to everyone, usable only by Pro members. */
  pro: boolean;
  module: QrModuleStyle;
  eye: QrEyeStyle;
  fg: string;
  bg: string;
  /** Optional diagonal gradient painted over the dark modules + eyes. */
  gradient?: [string, string];
}

export const QR_DESIGNS: QrDesign[] = [
  // --- Free ---
  { id: "classic", name: "Classic", pro: false, module: "classic", eye: "square", fg: "#111111", bg: "#ffffff" },
  { id: "soft", name: "Soft Rounds", pro: false, module: "rounded", eye: "rounded", fg: "#1a1a1a", bg: "#ffffff" },
  { id: "dots", name: "Dot Matrix", pro: false, module: "dots", eye: "circle", fg: "#0f172a", bg: "#ffffff" },
  { id: "ocean", name: "Ocean Fade", pro: false, module: "rounded", eye: "rounded", fg: "#0ea5e9", bg: "#ffffff", gradient: ["#0ea5e9", "#6366f1"] },
  { id: "sunset", name: "Sunset Pop", pro: false, module: "dots", eye: "circle", fg: "#f59e0b", bg: "#ffffff", gradient: ["#f59e0b", "#ef4444"] },
  { id: "midnight", name: "Midnight", pro: false, module: "classic", eye: "square", fg: "#ffffff", bg: "#111827" },
  { id: "forest", name: "Forest", pro: false, module: "rounded", eye: "leaf", fg: "#166534", bg: "#f0fdf4" },
  { id: "candy", name: "Candy", pro: false, module: "dots", eye: "rounded", fg: "#ec4899", bg: "#ffffff", gradient: ["#ec4899", "#8b5cf6"] },
  // --- Pro (visible, locked) ---
  { id: "diamond", name: "Diamond Cut", pro: true, module: "diamond", eye: "square", fg: "#0f172a", bg: "#ffffff" },
  { id: "neon", name: "Neon Nights", pro: true, module: "dots", eye: "circle", fg: "#22d3ee", bg: "#020617" },
  { id: "gold", name: "Royal Gold", pro: true, module: "rounded", eye: "rounded", fg: "#b45309", bg: "#1c1917", gradient: ["#fbbf24", "#b45309"] },
  { id: "royal", name: "Royal Purple", pro: true, module: "diamond", eye: "leaf", fg: "#7c3aed", bg: "#faf5ff" },
  { id: "bars", name: "Signal Bars", pro: true, module: "hbar", eye: "square", fg: "#111827", bg: "#ffffff" },
  { id: "pillars", name: "Pillars", pro: true, module: "vbar", eye: "rounded", fg: "#0e7490", bg: "#ecfeff" },
  { id: "stars", name: "Starry Night", pro: true, module: "star", eye: "circle", fg: "#312e81", bg: "#eef2ff" },
  { id: "sparkle", name: "Sparkle Pop", pro: true, module: "sparkle", eye: "rounded", fg: "#a21caf", bg: "#ffffff", gradient: ["#d946ef", "#6366f1"] },
  { id: "crimson", name: "Crimson", pro: true, module: "rounded", eye: "leaf", fg: "#b91c1c", bg: "#fef2f2" },
  { id: "mint", name: "Mint Fresh", pro: true, module: "dots", eye: "circle", fg: "#059669", bg: "#ecfdf5" },
  { id: "tangerine", name: "Tangerine", pro: true, module: "diamond", eye: "rounded", fg: "#ea580c", bg: "#ffffff", gradient: ["#f97316", "#ef4444"] },
  { id: "slate", name: "Slate Pro", pro: true, module: "classic", eye: "rounded", fg: "#334155", bg: "#f8fafc" },
  { id: "berry", name: "Berry", pro: true, module: "rounded", eye: "circle", fg: "#9d174d", bg: "#fdf2f8" },
  { id: "lime", name: "Lime Punch", pro: true, module: "hbar", eye: "leaf", fg: "#4d7c0f", bg: "#f7fee7" },
];

export const getDesign = (id: string): QrDesign =>
  QR_DESIGNS.find((d) => d.id === id) ?? QR_DESIGNS[0]!;

export interface QrRenderOpts {
  size: number;
  margin: number;
  ec: "L" | "M" | "Q" | "H";
  logo: HTMLImageElement | null;
  /** Overrides from the color pickers (clears gradient when set). */
  fg?: string | undefined;
  bg?: string | undefined;
}

/** Rounded-rect path helper (works everywhere, no ctx.roundRect dependency). */
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

/** 5-point star inscribed in the box (x, y, s). */
function star(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  const cx = x + s / 2;
  const cy = y + s / 2;
  const rO = s * 0.48;
  const rI = s * 0.2;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? rO : rI;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = cx + r * Math.cos(a);
    const py = cy + r * Math.sin(a);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/** 4-point sparkle (✦) inscribed in the box. */
function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  const cx = x + s / 2;
  const cy = y + s / 2;
  const r = s * 0.48;
  const w = s * 0.12;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.quadraticCurveTo(cx + w, cy - w, cx + r, cy);
  ctx.quadraticCurveTo(cx + w, cy + w, cx, cy + r);
  ctx.quadraticCurveTo(cx - w, cy + w, cx - r, cy);
  ctx.quadraticCurveTo(cx - w, cy - w, cx, cy - r);
  ctx.closePath();
}

/** True when the module cell sits inside a finder-pattern zone (7×7 + separator). */
function inFinderZone(n: number, row: number, col: number): boolean {
  const z = (r: number, c: number) => r < 8 && c < 8;
  return z(row, col) || z(row, n - 1 - col) || z(n - 1 - row, col);
}

function paintModule(
  ctx: CanvasRenderingContext2D,
  style: QrModuleStyle,
  x: number,
  y: number,
  m: number,
) {
  switch (style) {
    case "classic":
      ctx.fillRect(x, y, m + 0.5, m + 0.5);
      break;
    case "rounded":
      rr(ctx, x + m * 0.07, y + m * 0.07, m * 0.86, m * 0.86, m * 0.32);
      ctx.fill();
      break;
    case "dots":
      ctx.beginPath();
      ctx.arc(x + m / 2, y + m / 2, m * 0.44, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "diamond":
      ctx.beginPath();
      ctx.moveTo(x + m / 2, y + m * 0.04);
      ctx.lineTo(x + m * 0.96, y + m / 2);
      ctx.lineTo(x + m / 2, y + m * 0.96);
      ctx.lineTo(x + m * 0.04, y + m / 2);
      ctx.closePath();
      ctx.fill();
      break;
    case "hbar":
      rr(ctx, x + m * 0.02, y + m * 0.2, m * 0.96, m * 0.6, m * 0.3);
      ctx.fill();
      break;
    case "vbar":
      rr(ctx, x + m * 0.2, y + m * 0.02, m * 0.6, m * 0.96, m * 0.3);
      ctx.fill();
      break;
    case "star":
      star(ctx, x + m * 0.03, y + m * 0.03, m * 0.94);
      ctx.fill();
      break;
    case "sparkle":
      sparkle(ctx, x + m * 0.03, y + m * 0.03, m * 0.94);
      ctx.fill();
      break;
  }
}

/** Paint one 7×7 finder eye at module coords (col, row) - top-left of the 8×8 zone. */
function paintEye(
  ctx: CanvasRenderingContext2D,
  style: QrEyeStyle,
  col: number,
  row: number,
  m: number,
  fg: string | CanvasGradient,
  bg: string,
) {
  const x = col * m;
  const y = row * m;
  // Clear the whole 8×8 zone (pattern + separator) first.
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, m * 8, m * 8);
  ctx.fillStyle = fg;

  if (style === "circle") {
    const cx = x + m * 3.5;
    const cy = y + m * 3.5;
    ctx.beginPath(); ctx.arc(cx, cy, m * 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.arc(cx, cy, m * 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = fg;
    ctx.beginPath(); ctx.arc(cx, cy, m * 1.5, 0, Math.PI * 2); ctx.fill();
    return;
  }

  if (style === "leaf") {
    // Leaf: big radius on top-left + bottom-right corners.
    const leaf = (inset: number, rad: number) => {
      const lx = x + inset * m, ly = y + inset * m, s = (7 - inset * 2) * m;
      ctx.beginPath();
      ctx.moveTo(lx + rad, ly);
      ctx.lineTo(lx + s - m * 0.4, ly);
      ctx.arcTo(lx + s, ly, lx + s, ly + m * 0.4, m * 0.4);
      ctx.lineTo(lx + s, ly + s - rad);
      ctx.arcTo(lx + s, ly + s, lx + s - rad, ly + s, rad);
      ctx.lineTo(lx + rad, ly + s);
      ctx.arcTo(lx, ly + s, lx, ly + s - rad, rad);
      ctx.lineTo(lx, ly + m * 0.4);
      ctx.arcTo(lx, ly, lx + m * 0.4, ly, m * 0.4);
      ctx.closePath();
    };
    leaf(0, m * 2.6); ctx.fill();
    ctx.fillStyle = bg; leaf(1, m * 1.8); ctx.fill();
    ctx.fillStyle = fg; leaf(2, m * 1.1); ctx.fill();
    return;
  }

  // square / rounded
  const r = style === "rounded" ? m * 1.6 : 0;
  const draw = (inset: number, rad: number) => {
    if (rad > 0) rr(ctx, x + inset * m, y + inset * m, (7 - inset * 2) * m, (7 - inset * 2) * m, rad);
    else {
      const s = (7 - inset * 2) * m;
      ctx.beginPath();
      ctx.rect(x + inset * m, y + inset * m, s, s);
    }
    ctx.fill();
  };
  draw(0, r);
  ctx.fillStyle = bg; draw(1, Math.max(0, r - m * 0.7));
  ctx.fillStyle = fg; draw(2, Math.max(0, r - m * 1.1));
}

/** Paint a centered logo with a white rounded backdrop (≤24% of QR size). */
export function paintLogoOnQr(ctx: CanvasRenderingContext2D, logo: HTMLImageElement, size: number) {
  const box = size * 0.24;
  const pad = size * 0.028;
  rr(ctx, (size - box) / 2 - pad, (size - box) / 2 - pad, box + pad * 2, box + pad * 2, pad * 2.4);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  const ar = logo.naturalWidth / logo.naturalHeight;
  let dw = box, dh = box;
  if (ar > 1) dh = box / ar;
  else dw = box * ar;
  ctx.drawImage(logo, (size - dw) / 2, (size - dh) / 2, dw, dh);
}

/**
 * Render a QR code with a fancy design onto a canvas (canvas is resized to
 * opts.size). Throws when the payload is too long to encode.
 */
export function renderQrToCanvas(
  canvas: HTMLCanvasElement,
  value: string,
  design: QrDesign,
  opts: QrRenderOpts,
): void {
  const fg = opts.fg ?? design.fg;
  const bg = opts.bg ?? design.bg;
  const qr = QRCode.create(value, { errorCorrectionLevel: opts.ec });
  const n = qr.modules.size;
  const data = qr.modules.data as unknown as boolean[];
  const { size, margin } = opts;

  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D is not available.");

  const total = n + margin * 2;
  const m = size / total;
  const ox = margin * m;
  const oy = margin * m;

  // Background.
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  // Module fill: solid or diagonal gradient.
  let fill: string | CanvasGradient = fg;
  if (design.gradient && !opts.fg) {
    const g = ctx.createLinearGradient(ox, oy, ox + n * m, oy + n * m);
    g.addColorStop(0, design.gradient[0]);
    g.addColorStop(1, design.gradient[1]);
    fill = g;
  }
  ctx.fillStyle = fill;

  // Body modules (finder zones are painted separately).
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      if (!data[row * n + col]) continue;
      if (inFinderZone(n, row, col)) continue;
      paintModule(ctx, design.module, ox + col * m, oy + row * m, m);
    }
  }

  // Finder eyes.
  paintEye(ctx, design.eye, margin, margin, m, fill, bg);
  paintEye(ctx, design.eye, margin + n - 7, margin, m, fill, bg);
  paintEye(ctx, design.eye, margin, margin + n - 7, m, fill, bg);

  if (opts.logo) paintLogoOnQr(ctx, opts.logo, size);
}

/** Tiny preview used for the design-picker thumbnails. */
export function renderQrPreview(canvas: HTMLCanvasElement, design: QrDesign): void {
  try {
    renderQrToCanvas(canvas, "https://iconvault.site", design, {
      size: 96,
      margin: 1,
      ec: "M",
      logo: null,
    });
  } catch {
    // Sample payload always fits; ignore.
  }
}
