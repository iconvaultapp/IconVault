// Mockup Studio frame catalog — original CSS/canvas frames covering the
// device families found across open mockup sources (bezelkit, da-frame-set,
// appshots, appscreen). Aspect ratios approximate each device family; frames
// are illustrative, not spec-exact renders. No third-party assets are used.

export type NotchKind = "none" | "dynamic-island" | "notch" | "punch-hole";
export type ChromeKind = "none" | "browser" | "laptop-base" | "stand" | "crown";
export type FrameCategory = "Phones" | "Tablets" | "Laptops" | "Desktops" | "Watches" | "Browsers";

export interface FrameColor {
  name: string;
  body: string;
  edge: string;
}

export interface MockupFrame {
  id: string;
  name: string;
  category: FrameCategory;
  /** Screen aspect ratio (width / height). */
  aspect: number;
  /** Bezel thickness as a fraction of screen width. */
  bezel: number;
  /** Outer corner radius as a fraction of screen width. */
  radius: number;
  notch: NotchKind;
  chrome: ChromeKind;
  colors: FrameColor[];
}

const PHONE_COLORS: FrameColor[] = [
  { name: "Black", body: "#1c1c1e", edge: "#000000" },
  { name: "Titanium", body: "#b8b0a4", edge: "#8a8378" },
  { name: "Blue", body: "#3a4a5a", edge: "#232f3d" },
  { name: "White", body: "#e8e8e8", edge: "#c9c9c9" },
];

const LAPTOP_COLORS: FrameColor[] = [
  { name: "Space gray", body: "#3a3a3c", edge: "#1c1c1e" },
  { name: "Silver", body: "#d8d8dc", edge: "#aeaeb2" },
];

const WATCH_COLORS: FrameColor[] = [
  { name: "Black", body: "#1c1c1e", edge: "#000000" },
  { name: "Silver", body: "#d8d8dc", edge: "#aeaeb2" },
];

const BROWSER_LIGHT: FrameColor[] = [{ name: "Light", body: "#f5f5f7", edge: "#d2d2d7" }];
const BROWSER_DARK: FrameColor[] = [{ name: "Dark", body: "#2c2c2e", edge: "#1c1c1e" }];

export const MOCKUP_FRAMES: MockupFrame[] = [
  // ---- Phones ----
  { id: "iphone-pro", name: "iPhone Pro", category: "Phones", aspect: 0.46, bezel: 0.045, radius: 0.13, notch: "dynamic-island", chrome: "none", colors: PHONE_COLORS },
  { id: "iphone-pro-max", name: "iPhone Pro Max", category: "Phones", aspect: 0.46, bezel: 0.045, radius: 0.13, notch: "dynamic-island", chrome: "none", colors: PHONE_COLORS },
  { id: "iphone-air", name: "iPhone Air", category: "Phones", aspect: 0.46, bezel: 0.035, radius: 0.13, notch: "dynamic-island", chrome: "none", colors: PHONE_COLORS },
  { id: "iphone-notch", name: "iPhone (notch)", category: "Phones", aspect: 0.462, bezel: 0.045, radius: 0.12, notch: "notch", chrome: "none", colors: PHONE_COLORS },
  { id: "pixel-pro", name: "Pixel Pro", category: "Phones", aspect: 0.448, bezel: 0.045, radius: 0.11, notch: "punch-hole", chrome: "none", colors: PHONE_COLORS },
  { id: "pixel", name: "Pixel", category: "Phones", aspect: 0.449, bezel: 0.045, radius: 0.11, notch: "punch-hole", chrome: "none", colors: PHONE_COLORS },
  { id: "galaxy-ultra", name: "Galaxy Ultra", category: "Phones", aspect: 0.462, bezel: 0.035, radius: 0.09, notch: "punch-hole", chrome: "none", colors: PHONE_COLORS },
  { id: "galaxy", name: "Galaxy", category: "Phones", aspect: 0.462, bezel: 0.04, radius: 0.11, notch: "punch-hole", chrome: "none", colors: PHONE_COLORS },
  { id: "galaxy-fold", name: "Galaxy Fold", category: "Phones", aspect: 0.43, bezel: 0.04, radius: 0.1, notch: "punch-hole", chrome: "none", colors: PHONE_COLORS },
  { id: "galaxy-flip", name: "Galaxy Flip", category: "Phones", aspect: 0.46, bezel: 0.045, radius: 0.12, notch: "punch-hole", chrome: "none", colors: PHONE_COLORS },
  // ---- Tablets ----
  { id: "ipad-pro-13", name: "iPad Pro 13″", category: "Tablets", aspect: 0.75, bezel: 0.04, radius: 0.06, notch: "none", chrome: "none", colors: PHONE_COLORS },
  { id: "ipad-pro-11", name: "iPad Pro 11″", category: "Tablets", aspect: 0.689, bezel: 0.04, radius: 0.06, notch: "none", chrome: "none", colors: PHONE_COLORS },
  { id: "ipad-air", name: "iPad Air", category: "Tablets", aspect: 0.695, bezel: 0.04, radius: 0.06, notch: "none", chrome: "none", colors: PHONE_COLORS },
  { id: "ipad-mini", name: "iPad mini", category: "Tablets", aspect: 0.657, bezel: 0.045, radius: 0.07, notch: "none", chrome: "none", colors: PHONE_COLORS },
  { id: "galaxy-tab-s11", name: "Galaxy Tab S11", category: "Tablets", aspect: 0.625, bezel: 0.04, radius: 0.06, notch: "punch-hole", chrome: "none", colors: PHONE_COLORS },
  { id: "galaxy-tab-s10", name: "Galaxy Tab S10+", category: "Tablets", aspect: 0.625, bezel: 0.04, radius: 0.06, notch: "punch-hole", chrome: "none", colors: PHONE_COLORS },
  // ---- Laptops ----
  { id: "macbook-pro-14", name: "MacBook Pro 14″", category: "Laptops", aspect: 1.54, bezel: 0.03, radius: 0.02, notch: "notch", chrome: "laptop-base", colors: LAPTOP_COLORS },
  { id: "macbook-pro-16", name: "MacBook Pro 16″", category: "Laptops", aspect: 1.54, bezel: 0.03, radius: 0.02, notch: "notch", chrome: "laptop-base", colors: LAPTOP_COLORS },
  { id: "macbook-air-13", name: "MacBook Air 13″", category: "Laptops", aspect: 1.54, bezel: 0.03, radius: 0.02, notch: "notch", chrome: "laptop-base", colors: LAPTOP_COLORS },
  { id: "macbook-air-15", name: "MacBook Air 15″", category: "Laptops", aspect: 1.54, bezel: 0.03, radius: 0.02, notch: "notch", chrome: "laptop-base", colors: LAPTOP_COLORS },
  { id: "laptop", name: "Laptop", category: "Laptops", aspect: 1.78, bezel: 0.03, radius: 0.015, notch: "none", chrome: "laptop-base", colors: LAPTOP_COLORS },
  // ---- Desktops ----
  { id: "imac", name: "iMac 24″", category: "Desktops", aspect: 1.78, bezel: 0.03, radius: 0.015, notch: "none", chrome: "stand", colors: LAPTOP_COLORS },
  { id: "studio-display", name: "Studio Display", category: "Desktops", aspect: 1.78, bezel: 0.025, radius: 0.012, notch: "none", chrome: "stand", colors: LAPTOP_COLORS },
  { id: "monitor", name: "Monitor", category: "Desktops", aspect: 1.78, bezel: 0.02, radius: 0.01, notch: "none", chrome: "stand", colors: LAPTOP_COLORS },
  // ---- Watches ----
  { id: "watch-ultra", name: "Watch Ultra", category: "Watches", aspect: 0.817, bezel: 0.09, radius: 0.22, notch: "none", chrome: "crown", colors: WATCH_COLORS },
  { id: "watch-series", name: "Watch Series", category: "Watches", aspect: 0.817, bezel: 0.08, radius: 0.24, notch: "none", chrome: "crown", colors: WATCH_COLORS },
  // ---- Browsers ----
  { id: "chrome", name: "Chrome", category: "Browsers", aspect: 1.6, bezel: 0.015, radius: 0.012, notch: "none", chrome: "browser", colors: [...BROWSER_LIGHT, ...BROWSER_DARK] },
  { id: "safari", name: "Safari", category: "Browsers", aspect: 1.6, bezel: 0.015, radius: 0.012, notch: "none", chrome: "browser", colors: [...BROWSER_LIGHT, ...BROWSER_DARK] },
];

export interface BgPreset {
  id: string;
  name: string;
  /** CSS background value; "transparent" means no fill. */
  css: string;
  /** Canvas fill: solid color, gradient stops, or null for transparent. */
  canvas: { type: "solid"; color: string } | { type: "gradient"; from: string; to: string; angle: number } | null;
}

export const BG_PRESETS: BgPreset[] = [
  { id: "transparent", name: "Transparent", css: "transparent", canvas: null },
  { id: "white", name: "White", css: "#ffffff", canvas: { type: "solid", color: "#ffffff" } },
  { id: "ink", name: "Ink", css: "#111827", canvas: { type: "solid", color: "#111827" } },
  { id: "teal", name: "Verdigris", css: "#0d7a68", canvas: { type: "solid", color: "#0d7a68" } },
  { id: "sunset", name: "Sunset", css: "linear-gradient(135deg,#f97316,#ec4899)", canvas: { type: "gradient", from: "#f97316", to: "#ec4899", angle: 135 } },
  { id: "ocean", name: "Ocean", css: "linear-gradient(135deg,#0ea5e9,#6366f1)", canvas: { type: "gradient", from: "#0ea5e9", to: "#6366f1", angle: 135 } },
  { id: "mint", name: "Mint", css: "linear-gradient(135deg,#34d399,#0d7a68)", canvas: { type: "gradient", from: "#34d399", to: "#0d7a68", angle: 135 } },
  { id: "berry", name: "Berry", css: "linear-gradient(135deg,#8b5cf6,#ec4899)", canvas: { type: "gradient", from: "#8b5cf6", to: "#ec4899", angle: 135 } },
  { id: "dusk", name: "Dusk", css: "linear-gradient(135deg,#1e293b,#0f766e)", canvas: { type: "gradient", from: "#1e293b", to: "#0f766e", angle: 135 } },
];

/** Layout geometry for one frame at a given screen width (px). Shared by the
 * CSS preview and the canvas export so what you see is what you download. */
export interface FrameLayout {
  /** Full device width incl. bezel. */
  totalW: number;
  /** Full device height incl. bezel + chrome below/above. */
  totalH: number;
  bezel: number;
  radius: number;
  screenX: number;
  screenY: number;
  screenW: number;
  screenH: number;
  /** Browser chrome bar height (0 unless chrome === "browser"). */
  chromeH: number;
  /** Laptop base height below the screen (0 unless laptop-base). */
  baseH: number;
  /** Stand height below the screen (0 unless stand). */
  standH: number;
}

export function layoutFor(frame: MockupFrame, screenW: number): FrameLayout {
  const bezel = Math.max(2, Math.round(screenW * frame.bezel));
  const radius = Math.round(screenW * frame.radius);
  const screenH = Math.round(screenW / frame.aspect);
  const chromeH = frame.chrome === "browser" ? Math.max(20, Math.round(screenW * 0.045)) : 0;
  const baseH = frame.chrome === "laptop-base" ? Math.max(10, Math.round(screenW * 0.02)) : 0;
  const standH = frame.chrome === "stand" ? Math.max(40, Math.round(screenW * 0.09)) : 0;
  return {
    totalW: screenW + bezel * 2,
    totalH: chromeH + screenH + bezel * 2 + baseH + standH,
    bezel,
    radius,
    screenX: bezel,
    screenY: chromeH + bezel,
    screenW,
    screenH,
    chromeH,
    baseH,
    standH,
  };
}

/** Cover/contain source rect for drawing an image into a screen rect. */
export function fitRect(
  imgW: number,
  imgH: number,
  dstW: number,
  dstH: number,
  fit: "cover" | "contain",
): { sx: number; sy: number; sw: number; sh: number; dx: number; dy: number; dw: number; dh: number } {
  const scale = fit === "cover" ? Math.max(dstW / imgW, dstH / imgH) : Math.min(dstW / imgW, dstH / imgH);
  const dw = imgW * scale;
  const dh = imgH * scale;
  if (fit === "cover") {
    const sx = (dw - dstW) / scale / 2;
    const sy = (dh - dstH) / scale / 2;
    return { sx, sy, sw: dstW / scale, sh: dstH / scale, dx: 0, dy: 0, dw: dstW, dh: dstH };
  }
  return { sx: 0, sy: 0, sw: imgW, sh: imgH, dx: (dstW - dw) / 2, dy: (dstH - dh) / 2, dw, dh };
}

export function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
