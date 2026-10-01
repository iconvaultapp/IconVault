// Imperative Fabric.js helpers for the Thumbnail Studio.
// History pattern (JSON snapshots) adapted from OpenDesign (MIT).

import { Canvas, StaticCanvas, Textbox, Rect, Circle, Triangle, Polygon, Path, Gradient, FabricImage, Shadow, Point, filters, util, type FabricObject } from "fabric";
import { TW, TH, STUDIO_FONTS, type FabricCanvasJSON } from "@/lib/thumbnail-fabric-library";

const FONT_CSS_URL =
  "https://fonts.googleapis.com/css2?family=Anton&family=Archivo+Black&family=Bebas+Neue&family=Montserrat:wght@400;500;600;700;800&family=Poppins:wght@400;600;700;800&family=Oswald:wght@500;600;700&family=Playfair+Display:wght@700;900&family=Inter:wght@400;600;800&display=swap";

let fontsPromise: Promise<void> | null = null;

export function loadStudioFonts(): Promise<void> {
  if (fontsPromise) return fontsPromise;
  fontsPromise = (async () => {
    if (!document.querySelector('link[data-studio-fonts]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = FONT_CSS_URL;
      link.setAttribute("data-studio-fonts", "1");
      document.head.appendChild(link);
    }
    try {
      await Promise.all(
        STUDIO_FONTS.map((f) => document.fonts.load(`40px "${f}"`).catch(() => [])),
      );
      await document.fonts.ready;
    } catch {
      /* fonts are decorative - never block the editor */
    }
  })();
  return fontsPromise;
}

export function createStudioCanvas(el: HTMLCanvasElement): Canvas {
  const canvas = new Canvas(el, {
    width: TW,
    height: TH,
    backgroundColor: "#101018",
    preserveObjectStacking: true,
    stopContextMenu: true,
  });
  // sensible defaults for new objects
  Canvas.prototype.defaultCursor = "default";
  return canvas;
}

export async function loadTemplateJSON(canvas: Canvas, json: FabricCanvasJSON): Promise<void> {
  await loadStudioFonts();
  await canvas.loadFromJSON(json as unknown as Record<string, unknown>);
  canvas.getObjects().forEach((o) => {
    if ((o as { name?: string }).name === "bg") {
      o.set({ selectable: false, evented: false });
    }
  });
  canvas.requestRenderAll();
}

// ---------- history (undo / redo) ----------

export interface CanvasHistory {
  entries: string[];
  index: number;
}

export function snapshot(canvas: Canvas): string {
  return JSON.stringify(canvas.toJSON());
}

export function pushHistory(h: CanvasHistory, canvas: Canvas): CanvasHistory {
  const snap = snapshot(canvas);
  if (h.entries[h.index] === snap) return h;
  const entries = h.entries.slice(0, h.index + 1);
  entries.push(snap);
  if (entries.length > 60) entries.shift();
  return { entries, index: entries.length - 1 };
}

export async function restoreHistory(canvas: Canvas, h: CanvasHistory, index: number): Promise<void> {
  const snap = h.entries[index];
  if (!snap) return;
  await canvas.loadFromJSON(JSON.parse(snap));
  canvas.getObjects().forEach((o) => {
    if ((o as { name?: string }).name === "bg") o.set({ selectable: false, evented: false });
  });
  canvas.discardActiveObject();
  canvas.requestRenderAll();
}

// ---------- export ----------

export type StudioExportFormat = "png" | "jpeg" | "webp" | "pdf";

export async function exportDesign(canvas: Canvas, format: StudioExportFormat, scale: 1 | 2): Promise<void> {
  const active = canvas.getActiveObject();
  canvas.discardActiveObject();
  canvas.requestRenderAll();
  try {
    if (format === "pdf") {
      // Render at 2x, embed as a full-page image sized to the current canvas.
      const { jsPDF } = await import("jspdf");
      const cw = canvas.getWidth();
      const ch = canvas.getHeight();
      const png = canvas.toDataURL({ format: "png", multiplier: 2 });
      const pdf = new jsPDF({ unit: "px", format: [cw, ch], hotfixes: ["px_scaling"] });
      pdf.addImage(png, "PNG", 0, 0, cw, ch);
      pdf.save("iconvault-thumbnail.pdf");
    } else {
      const dataURL = canvas.toDataURL({
        format,
        multiplier: scale,
        quality: format === "png" ? 1 : 0.92,
      });
      const ext = format === "jpeg" ? "jpg" : format;
      const link = document.createElement("a");
      link.download = `iconvault-thumbnail${scale === 2 ? "@2x" : ""}.${ext}`;
      link.href = dataURL;
      link.click();
    }
  } finally {
    if (active) {
      canvas.setActiveObject(active);
      canvas.requestRenderAll();
    }
  }
}

// ---------- gallery preview rendering (lazy, cached) ----------

const previewCache = new Map<string, string>();
let previewHost: HTMLDivElement | null = null;

export async function renderTemplatePreview(id: string, json: FabricCanvasJSON): Promise<string> {
  const hit = previewCache.get(id);
  if (hit) return hit;
  await loadStudioFonts();
  if (!previewHost) {
    previewHost = document.createElement("div");
    previewHost.style.cssText = "position:fixed;left:-9999px;top:0;pointer-events:none;";
    document.body.appendChild(previewHost);
  }
  const el = document.createElement("canvas");
  previewHost.appendChild(el);
  // Render at the design's native 1280x720 size (StaticCanvas is lighter than
  // the interactive Canvas) and downscale on export. Never use a viewport
  // transform here: Fabric v7 defaults object origins to center, and the
  // template JSON pins left/top origins explicitly, so a plain full-size
  // render always matches the editor pixel-for-pixel.
  const canvas = new StaticCanvas(el, { width: TW, height: TH, backgroundColor: "#101018" });
  try {
    await canvas.loadFromJSON(json as unknown as Record<string, unknown>);
    canvas.requestRenderAll();
    const url = canvas.toDataURL({ format: "jpeg", quality: 0.72, multiplier: 0.25 });
    previewCache.set(id, url);
    return url;
  } finally {
    canvas.dispose();
    el.remove();
  }
}

// ---------- object factories ----------

export function addStudioText(canvas: Canvas, kind: "heading" | "sub" | "body"): Textbox {
  const presets = {
    heading: { text: "YOUR TITLE", fontFamily: "Anton", fontSize: 110 },
    sub: { text: "your subtitle here", fontFamily: "Montserrat", fontSize: 40, fontWeight: "600" },
    body: { text: "Add some body text", fontFamily: "Inter", fontSize: 28 },
  } as const;
  const p = presets[kind];
  const cw = canvas.getWidth();
  const ch = canvas.getHeight();
  const t = new Textbox(p.text, {
    left: cw / 2 - 300, top: ch / 2 - 80, width: 600,
    originX: "left", originY: "top",
    fontFamily: p.fontFamily, fontSize: p.fontSize,
    fontWeight: (p as { fontWeight?: string }).fontWeight ?? "400",
    fill: "#ffffff", textAlign: "center",
  });
  t.set("shadow", new Shadow({ color: "rgba(0,0,0,0.45)", blur: 14, offsetX: 0, offsetY: 5 }));
  canvas.add(t);
  canvas.setActiveObject(t);
  canvas.requestRenderAll();
  return t;
}

export type StudioShapeKind =
  | "rect" | "circle" | "triangle" | "line" | "star"
  | "diamond" | "hexagon" | "pentagon" | "heart" | "arrow"
  | "starburst" | "ring" | "pill" | "plus" | "frame" | "circle-frame";

/** Regular polygon points centered at (cx, cy). */
function polyPoints(n: number, r: number, cx: number, cy: number, rot = -Math.PI / 2): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const a = rot + (i * 2 * Math.PI) / n;
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return pts;
}

export function addStudioShape(canvas: Canvas, kind: StudioShapeKind): FabricObject {
  const accent = "#f59e0b";
  // Pin left/top origins so new shapes line up with template objects
  // (Fabric v7 defaults to center origins).
  const org = { originX: "left", originY: "top" } as const;
  const cx = canvas.getWidth() / 2;
  const cy = canvas.getHeight() / 2;
  let obj: FabricObject;
  switch (kind) {
    case "rect":
      obj = new Rect({ left: cx - 150, top: cy - 100, width: 300, height: 200, fill: accent, rx: 18, ry: 18, ...org });
      break;
    case "circle":
      obj = new Circle({ left: cx - 130, top: cy - 130, radius: 130, fill: accent, ...org });
      break;
    case "triangle":
      obj = new Triangle({ left: cx - 130, top: cy - 110, width: 260, height: 220, fill: accent, ...org });
      break;
    case "line":
      obj = new Rect({ left: cx - 200, top: cy - 7, width: 400, height: 14, fill: accent, rx: 7, ry: 7, ...org });
      break;
    case "star": {
      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 130 : 55;
        const a = (Math.PI / 5) * i - Math.PI / 2;
        pts.push({ x: 130 + r * Math.cos(a), y: 130 + r * Math.sin(a) });
      }
      obj = new Polygon(pts, { left: cx - 130, top: cy - 130, fill: accent, ...org });
      break;
    }
    case "diamond":
      obj = new Polygon(
        [{ x: 150, y: 0 }, { x: 300, y: 150 }, { x: 150, y: 300 }, { x: 0, y: 150 }],
        { left: cx - 150, top: cy - 150, fill: accent, ...org },
      );
      break;
    case "hexagon":
      obj = new Polygon(polyPoints(6, 140, 150, 150), { left: cx - 150, top: cy - 150, fill: accent, ...org });
      break;
    case "pentagon":
      obj = new Polygon(polyPoints(5, 140, 150, 150), { left: cx - 150, top: cy - 150, fill: accent, ...org });
      break;
    case "heart":
      obj = new Path(
        "M150,268 C70,196 24,144 24,96 C24,52 58,28 96,28 C122,28 142,44 150,64 C158,44 178,28 204,28 C242,28 276,52 276,96 C276,144 230,196 150,268 Z",
        { left: cx - 150, top: cy - 140, fill: accent, ...org },
      );
      break;
    case "arrow":
      obj = new Polygon(
        [
          { x: 0, y: 45 }, { x: 170, y: 45 }, { x: 170, y: 0 },
          { x: 300, y: 75 }, { x: 170, y: 150 }, { x: 170, y: 105 }, { x: 0, y: 105 },
        ],
        { left: cx - 150, top: cy - 75, fill: accent, ...org },
      );
      break;
    case "starburst": {
      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i < 32; i++) {
        const r = i % 2 === 0 ? 140 : 108;
        const a = (Math.PI / 16) * i - Math.PI / 2;
        pts.push({ x: 150 + r * Math.cos(a), y: 150 + r * Math.sin(a) });
      }
      obj = new Polygon(pts, { left: cx - 150, top: cy - 150, fill: accent, ...org });
      break;
    }
    case "ring":
      obj = new Circle({
        left: cx - 115, top: cy - 115, radius: 100,
        fill: "transparent", stroke: accent, strokeWidth: 30, ...org,
      });
      break;
    case "pill":
      obj = new Rect({ left: cx - 170, top: cy - 60, width: 340, height: 120, fill: accent, rx: 60, ry: 60, ...org });
      break;
    case "plus":
      obj = new Polygon(
        [
          { x: 70, y: 0 }, { x: 130, y: 0 }, { x: 130, y: 70 }, { x: 200, y: 70 },
          { x: 200, y: 130 }, { x: 130, y: 130 }, { x: 130, y: 200 }, { x: 70, y: 200 },
          { x: 70, y: 130 }, { x: 0, y: 130 }, { x: 0, y: 70 }, { x: 70, y: 70 },
        ],
        { left: cx - 100, top: cy - 100, fill: accent, ...org },
      );
      break;
    case "frame":
      obj = new Rect({
        left: cx - 200, top: cy - 140, width: 400, height: 280,
        fill: "transparent", stroke: accent, strokeWidth: 20, rx: 12, ry: 12, ...org,
      });
      break;
    case "circle-frame":
      obj = new Circle({
        left: cx - 135, top: cy - 135, radius: 120,
        fill: "transparent", stroke: accent, strokeWidth: 20, ...org,
      });
      break;
  }
  canvas.add(obj);
  canvas.setActiveObject(obj);
  canvas.requestRenderAll();
  return obj;
}

export async function addStudioImage(canvas: Canvas, dataURL: string): Promise<void> {
  const img = await FabricImage.fromURL(dataURL);
  const maxW = 640;
  const scale = Math.min(1, maxW / (img.width || maxW));
  const cw = canvas.getWidth();
  const ch = canvas.getHeight();
  img.set({ left: cw / 2 - ((img.width || 0) * scale) / 2, top: ch / 2 - ((img.height || 0) * scale) / 2 });
  img.scale(scale);
  canvas.add(img);
  canvas.setActiveObject(img);
  canvas.requestRenderAll();
}

export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export function setStudioBackground(canvas: Canvas, kind: "solid" | "gradient", c1: string, c2?: string): void {
  if (kind === "solid") {
    const bg = canvas.getObjects().find((o) => (o as { name?: string }).name === "bg");
    if (bg) bg.set("fill", c1);
    else canvas.backgroundColor = c1;
  } else {
    const g = new Gradient({
      type: "linear",
      coords: { x1: 0, y1: 0, x2: 0, y2: TH },
      colorStops: [
        { offset: 0, color: c1 },
        { offset: 1, color: c2 ?? c1 },
      ],
    });
    const bg = canvas.getObjects().find((o) => (o as { name?: string }).name === "bg");
    if (bg) bg.set("fill", g);
    else canvas.backgroundColor = g as unknown as string;
  }
  canvas.requestRenderAll();
}
// ---------- Canva-style object ops: flip, filters, bg remover, eraser,
// replace, GFX elements, background image, design resize ----------

export function flipActiveObject(canvas: Canvas, axis: "x" | "y"): void {
  const a = canvas.getActiveObject();
  if (!a) return;
  if (axis === "x") a.set("flipX", !a.flipX);
  else a.set("flipY", !a.flipY);
  a.setCoords();
  canvas.requestRenderAll();
}

export type StudioImageFilter = "none" | "grayscale" | "sepia" | "bright";

export function applyImageFilter(img: FabricImage, kind: StudioImageFilter): void {
  if (kind === "none") img.filters = [];
  else if (kind === "grayscale") img.filters = [new filters.Grayscale()];
  else if (kind === "sepia") img.filters = [new filters.Sepia()];
  else img.filters = [new filters.Brightness({ brightness: 0.18 })];
  img.applyFilters();
  img.setCoords();
}

// ----- flood-fill background removal (same core as /tools/background-remover) -----

/** Weighted RGB distance (green counts most, like human vision). */
function bgColorDist(
  r1: number, g1: number, b1: number,
  r2: number, g2: number, b2: number,
): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db);
}

/** Flood-fill the background mask starting from the image edges. mask=1 => background. */
function bgFloodFill(
  mask: Uint8Array,
  w: number,
  h: number,
  data: Uint8ClampedArray,
  br: number, bg: number, bb: number,
  tol: number,
): void {
  const stack: number[] = [];
  const trySeed = (x: number, y: number) => {
    const i = y * w + x;
    if (mask[i]) return;
    const o = i * 4;
    if (bgColorDist(data[o]!, data[o + 1]!, data[o + 2]!, br, bg, bb) < tol) {
      mask[i] = 1;
      stack.push(i);
    }
  };
  for (let x = 0; x < w; x++) {
    trySeed(x, 0);
    trySeed(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    trySeed(0, y);
    trySeed(w - 1, y);
  }
  while (stack.length) {
    const i = stack.pop()!;
    const x = i % w;
    const y = Math.floor(i / w);
    const neighbors = [
      x > 0 ? i - 1 : -1,
      x < w - 1 ? i + 1 : -1,
      y > 0 ? i - w : -1,
      y < h - 1 ? i + w : -1,
    ];
    for (const n of neighbors) {
      if (n < 0 || mask[n]) continue;
      const o = n * 4;
      if (bgColorDist(data[o]!, data[o + 1]!, data[o + 2]!, br, bg, bb) < tol) {
        mask[n] = 1;
        stack.push(n);
      }
    }
  }
}

function imageWorkCanvas(img: FabricImage): HTMLCanvasElement | null {
  const el = img.getElement() as HTMLImageElement | HTMLCanvasElement | null;
  if (!el) return null;
  const w = (el as HTMLImageElement).naturalWidth || el.width;
  const h = (el as HTMLImageElement).naturalHeight || el.height;
  if (!w || !h) return null;
  const work = document.createElement("canvas");
  work.width = w;
  work.height = h;
  const ctx = work.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(el, 0, 0, w, h);
  return work;
}

/**
 * Heuristic fallback: remove a solid/near-solid background via edge flood-fill.
 * Returns the fraction of pixels removed, or -1 when the safety guard
 * (>96% would be erased) refuses to run.
 */
async function floodFillBackground(img: FabricImage): Promise<number> {
  const work = imageWorkCanvas(img);
  if (!work) return -1;
  const ctx = work.getContext("2d", { willReadFrequently: true });
  if (!ctx) return -1;
  const w = work.width;
  const h = work.height;
  const id = ctx.getImageData(0, 0, w, h);
  const data = id.data;
  // Sample the four corners to find the background color.
  let r = 0, g = 0, b = 0;
  const corners: [number, number][] = [[4, 4], [w - 5, 4], [4, h - 5], [w - 5, h - 5]];
  for (const [x, y] of corners) {
    const o = (y * w + x) * 4;
    r += data[o]!; g += data[o + 1]!; b += data[o + 2]!;
  }
  r = Math.round(r / 4); g = Math.round(g / 4); b = Math.round(b / 4);
  const mask = new Uint8Array(w * h);
  bgFloodFill(mask, w, h, data, r, g, b, 56);
  let removed = 0;
  for (let i = 0; i < mask.length; i++) {
    if (mask[i]) {
      data[i * 4 + 3] = 0;
      removed++;
    }
  }
  const frac = removed / mask.length;
  if (frac > 0.96 || frac < 0.005) return -1;
  ctx.putImageData(id, 0, 0);
  img.setElement(work);
  img.set("dirty", true);
  img.setCoords();
  return frac;
}

// ----- AI background removal (on-device BiRefNet, MIT-licensed) -----
// The flood-fill heuristic below only works on solid backgrounds, so photos
// with textured backgrounds came back "11% cleared". The AI segmenter finds
// the actual subject (person, product, ...) and clears everything else.
// The heavy lifting lives in @/lib/bg-ai so the tools page can share it.

export type { BgProgress } from "@/lib/bg-ai";
import { removeBackgroundAi, type BgProgress as BgProgressType } from "@/lib/bg-ai";

/**
 * Remove the background with the on-device AI segmenter. Falls back to the
 * flood-fill heuristic when the model cannot load (offline, low memory).
 * Returns the fraction of pixels cleared, or -1 when nothing could be removed.
 */
export async function removeImageBackground(
  img: FabricImage,
  onProgress?: BgProgressType,
): Promise<number> {
  const progress: BgProgressType = onProgress ?? (() => {});
  try {
    const work = imageWorkCanvas(img);
    if (!work) return -1;
    const ctx = work.getContext("2d", { willReadFrequently: true });
    if (!ctx) return -1;
    const id = ctx.getImageData(0, 0, work.width, work.height);
    const frac = await removeBackgroundAi(id, progress);
    ctx.putImageData(id, 0, 0);
    img.setElement(work);
    img.set("dirty", true);
    img.setCoords();
    return frac;
  } catch {
    // AI unavailable or degenerate mask - fall back to the heuristic.
  }
  return floodFillBackground(img);
}

// ----- eraser brush (destructive on the image pixels, undo via history) -----

export interface EraserSession {
  img: FabricImage;
  paint: (canvasX: number, canvasY: number, size: number) => void;
  end: () => void;
}

export function startEraser(img: FabricImage): EraserSession | null {
  const work = imageWorkCanvas(img);
  if (!work) return null;
  const ctx = work.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  img.setElement(work);
  let last: { x: number; y: number } | null = null;
  return {
    img,
    paint(canvasX: number, canvasY: number, size: number) {
      // Map canvas coords into the image's own pixel space. calcTransformMatrix
      // maps center-origin local coords to canvas coords, so the inverse plus
      // a half-size offset lands exactly on backing-canvas pixels (this also
      // handles rotation and flipX/flipY correctly).
      const inv = util.invertTransform(img.calcTransformMatrix());
      const local = new Point(canvasX, canvasY).transform(inv);
      const w = work.width;
      const h = work.height;
      const px = Math.max(0, Math.min(w, local.x + (img.width || 0) / 2));
      const py = Math.max(0, Math.min(h, local.y + (img.height || 0) / 2));
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      if (last) {
        ctx.strokeStyle = "rgba(0,0,0,1)";
        ctx.lineWidth = size;
        ctx.beginPath();
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(px, py);
        ctx.stroke();
      } else {
        ctx.fillStyle = "rgba(0,0,0,1)";
        ctx.beginPath();
        ctx.arc(px, py, size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      last = { x: px, y: py };
      img.set("dirty", true);
      img.setCoords();
    },
    end() {
      last = null;
    },
  };
}

// ----- replace image source, keeping position / scale / rotation -----

export async function replaceImageSource(img: FabricImage, dataURL: string): Promise<void> {
  const next = await FabricImage.fromURL(dataURL);
  const nw = next.width || 1;
  const nh = next.height || 1;
  const ow = (img.width || 1) * (img.scaleX || 1);
  const oh = (img.height || 1) * (img.scaleY || 1);
  const s = Math.min(ow / nw, oh / nh);
  img.setElement(next.getElement());
  img.set({
    width: nw,
    height: nh,
    scaleX: s,
    scaleY: s,
    filters: [],
  });
  img.set("dirty", true);
  img.setCoords();
}

// ----- GFX sticker elements (from the curated pack) -----

export async function addGfxElement(canvas: Canvas, src: string, targetW = 480): Promise<void> {
  const img = await FabricImage.fromURL(src);
  const w = img.width || targetW;
  const s = Math.min(1, targetW / w);
  const cw = canvas.getWidth();
  const ch = canvas.getHeight();
  img.set({
    left: cw / 2 - (w * s) / 2,
    top: ch / 2 - ((img.height || 0) * s) / 2,
    originX: "left",
    originY: "top",
    name: "gfx-element",
  });
  img.scale(s);
  canvas.add(img);
  canvas.setActiveObject(img);
  canvas.requestRenderAll();
}

// ----- set the design background to an image (cover) -----

export async function setBackgroundImage(canvas: Canvas, src: string): Promise<void> {
  const cw = canvas.getWidth();
  const ch = canvas.getHeight();
  const img = await FabricImage.fromURL(src);
  const w = img.width || cw;
  const h = img.height || ch;
  const s = Math.max(cw / w, ch / h);
  img.set({
    left: cw / 2 - (w * s) / 2,
    top: ch / 2 - (h * s) / 2,
    originX: "left",
    originY: "top",
    selectable: false,
    evented: false,
    name: "bg",
  });
  img.scale(s);
  const old = canvas.getObjects().find((o) => (o as { name?: string }).name === "bg");
  if (old) canvas.remove(old);
  canvas.add(img);
  // Keep the background pinned at the very bottom of the stack.
  const objs = canvas.getObjects();
  const idx = objs.indexOf(img);
  if (idx > 0) {
    objs.splice(idx, 1);
    objs.unshift(img);
  }
  canvas.requestRenderAll();
}

// ----- design resize (Canva "Resize" menu) -----

export interface DesignSize {
  label: string;
  w: number;
  h: number;
}

export const DESIGN_SIZES: DesignSize[] = [
  { label: "YouTube Thumbnail", w: 1280, h: 720 },
  { label: "YouTube Shorts", w: 1080, h: 1920 },
  { label: "Instagram Square", w: 1080, h: 1080 },
  { label: "Facebook / OG", w: 1200, h: 628 },
];

/** Resize the canvas and scale every object proportionally. */
export function resizeDesign(canvas: Canvas, w: number, h: number): void {
  const ow = canvas.getWidth();
  const oh = canvas.getHeight();
  if (!ow || !oh || (ow === w && oh === h)) return;
  const sx = w / ow;
  const sy = h / oh;
  for (const o of canvas.getObjects()) {
    o.set({
      left: (o.left ?? 0) * sx,
      top: (o.top ?? 0) * sy,
    });
    if (o.type === "textbox") {
      // textboxes: scale font + width only (scaling scaleX/scaleY too would double-scale text)
      const tb = o as Textbox;
      tb.set("fontSize", (tb.fontSize ?? 16) * sy);
      tb.set("width", (tb.width ?? 100) * sx);
    } else {
      o.set({
        scaleX: (o.scaleX ?? 1) * sx,
        scaleY: (o.scaleY ?? 1) * sy,
      });
    }
    o.setCoords();
  }
  canvas.setDimensions({ width: w, height: h });
  canvas.requestRenderAll();
}
