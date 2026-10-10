// Shared pixel operations for the background remover: classic solid-background
// cutout, rembg-style foreground decontamination (halo removal), and background
// replacement compositing. All pure canvas math - no ML, no network.

/** Weighted RGB distance (green counts most, like human vision). */
export function colorDist(
  r1: number, g1: number, b1: number,
  r2: number, g2: number, b2: number,
): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db);
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Flood-fill the background mask starting from the image edges. mask=1 => background. */
export function floodFill(
  mask: Uint8Array,
  w: number, h: number,
  data: Uint8ClampedArray,
  br: number, bg: number, bb: number,
  tol: number,
): void {
  const stack: number[] = [];
  const trySeed = (x: number, y: number) => {
    const i = y * w + x;
    if (mask[i]) return;
    const o = i * 4;
    if (colorDist(data[o]!, data[o + 1]!, data[o + 2]!, br, bg, bb) < tol) {
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
      if (colorDist(data[o]!, data[o + 1]!, data[o + 2]!, br, bg, bb) < tol) {
        mask[n] = 1;
        stack.push(n);
      }
    }
  }
}

/**
 * Classic solid-background removal, applied in place on RGBA pixels.
 * mode "edges": flood-fill from the image borders (product shots).
 * mode "color": key out every pixel close to the chosen color.
 * feather: softens the cut edge with a blur of the mask.
 * Returns the fraction of pixels removed (for the "almost everything gone"
 * sanity warning).
 */
export function classicCutout(
  data: Uint8ClampedArray, w: number, h: number,
  mode: "edges" | "color",
  br: number, bg: number, bb: number,
  tol: number,
  feather: number,
): number {
  const mask = new Uint8Array(w * h);
  if (mode === "edges") {
    floodFill(mask, w, h, data, br, bg, bb, tol);
  } else {
    for (let i = 0; i < w * h; i++) {
      const o = i * 4;
      if (colorDist(data[o]!, data[o + 1]!, data[o + 2]!, br, bg, bb) < tol) mask[i] = 1;
    }
  }

  let removed = 0;
  for (let i = 0; i < mask.length; i++) if (mask[i]) removed++;
  const removedFrac = removed / mask.length;

  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = w;
  maskCanvas.height = h;
  const mctx = maskCanvas.getContext("2d", { willReadFrequently: true });
  if (!mctx) return removedFrac;
  const mImg = mctx.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    mImg.data[i * 4 + 3] = mask[i] ? 0 : 255;
    mImg.data[i * 4] = mImg.data[i * 4 + 1] = mImg.data[i * 4 + 2] = 255;
  }
  mctx.putImageData(mImg, 0, 0);

  let alphaData: Uint8ClampedArray;
  if (feather > 0) {
    const blur = document.createElement("canvas");
    blur.width = w;
    blur.height = h;
    const bctx = blur.getContext("2d", { willReadFrequently: true });
    if (!bctx) return removedFrac;
    bctx.filter = `blur(${feather}px)`;
    bctx.drawImage(maskCanvas, 0, 0);
    alphaData = bctx.getImageData(0, 0, w, h).data;
  } else {
    alphaData = mctx.getImageData(0, 0, w, h).data;
  }

  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    const a = alphaData[o + 3]!;
    if (a < data[o + 3]!) data[o + 3] = a;
  }
  return removedFrac;
}

/**
 * Foreground color decontamination (the cheap, safe part of rembg's `-dc`
 * flag). Semi-transparent edge pixels often carry spill from the old
 * background (green/blue halo on hair). For each such pixel, copy the RGB
 * of the nearest fully-opaque pixel - the true foreground color - while
 * keeping its alpha. Only the soft edge band is touched, so solid areas
 * are never altered.
 */
export function decontaminate(data: Uint8ClampedArray, w: number, h: number, radius = 10): void {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const o = i * 4;
      const a = data[o + 3]!;
      if (a <= 8 || a >= 247) continue;
      let found = -1;
      outer: for (let r = 1; r <= radius; r++) {
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            const ni = ny * w + nx;
            if (data[ni * 4 + 3]! > 240) {
              found = ni;
              break outer;
            }
          }
        }
      }
      if (found >= 0) {
        const fo = found * 4;
        data[o] = data[fo]!;
        data[o + 1] = data[fo + 1]!;
        data[o + 2] = data[fo + 2]!;
      }
    }
  }
}

export type BgReplaceKind = "transparent" | "color" | "blur" | "image";

export interface CompositeOpts {
  kind: BgReplaceKind;
  color: string;
  blurPx: number;
  /** Optional replacement image (already loaded into a canvas). */
  image: HTMLCanvasElement | null;
  /** Original photo, used as the blur source for kind "blur". */
  original: HTMLCanvasElement | null;
}

/** Draw source-cover (like CSS background-size: cover). */
function drawCover(ctx: CanvasRenderingContext2D, src: HTMLCanvasElement, w: number, h: number): void {
  const s = Math.max(w / src.width, h / src.height);
  const dw = src.width * s;
  const dh = src.height * s;
  ctx.drawImage(src, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

/**
 * Composite a transparent cutout over a replacement background.
 * Returns a new canvas, or null when kind is "transparent" (nothing to do).
 */
export function compositeOver(
  cutout: HTMLCanvasElement,
  opts: CompositeOpts,
): HTMLCanvasElement | null {
  if (opts.kind === "transparent") return null;
  const w = cutout.width;
  const h = cutout.height;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  if (opts.kind === "color") {
    ctx.fillStyle = opts.color;
    ctx.fillRect(0, 0, w, h);
  } else if (opts.kind === "blur" && opts.original) {
    // Zoom the blurred backdrop slightly so subject-colored bleed at the
    // frame edge gets pushed outward instead of haloing the cutout.
    const bleed = Math.ceil(opts.blurPx * 2);
    ctx.filter = `blur(${opts.blurPx}px)`;
    ctx.drawImage(opts.original, -bleed, -bleed, w + bleed * 2, h + bleed * 2);
    ctx.filter = "none";
  } else if (opts.kind === "image" && opts.image) {
    drawCover(ctx, opts.image, w, h);
  } else {
    return null;
  }
  ctx.drawImage(cutout, 0, 0);
  return c;
}

/** Render the alpha channel as a grayscale mask image (white = kept). */
export function renderMask(cutout: HTMLCanvasElement): HTMLCanvasElement {
  const w = cutout.width;
  const h = cutout.height;
  const src = cutout.getContext("2d", { willReadFrequently: true });
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!src || !ctx) return cutout;
  const sd = src.getImageData(0, 0, w, h).data;
  const out = ctx.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    const a = sd[i * 4 + 3]!;
    out.data[i * 4] = out.data[i * 4 + 1] = out.data[i * 4 + 2] = a;
    out.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(out, 0, 0);
  return c;
}

/** Flatten a transparent image onto a solid color (for JPEG export). */
export function flattenOn(cutout: HTMLCanvasElement, hex: string): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = cutout.width;
  c.height = cutout.height;
  const ctx = c.getContext("2d");
  if (!ctx) return cutout;
  ctx.fillStyle = hex;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(cutout, 0, 0);
  return c;
}
