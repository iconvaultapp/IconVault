// Client-side bitmap tracer: quantizes an image to N colors, then traces
// each color layer with marching squares + Douglas-Peucker simplification,
// emitting true vector SVG paths (not embedded bitmaps).
//
// Pure functions (quantizePixels, traceLayerPaths, simplifyPath) are
// DOM-free so they can be unit-tested; imageToSvg wires up canvas.

export interface TraceOptions {
  colors: number; // 2..16
  detail: number; // 0..1 - simplification tolerance (0 = max detail)
  removeBackground: boolean;
}

type RGB = [number, number, number];

/** K-means quantization of an RGB triple array. Returns centers + per-pixel label. */
export function quantizePixels(pixels: Uint8ClampedArray, k: number): { centers: RGB[]; labels: Uint8Array } {
  const n = pixels.length / 3;
  // Deterministic spread init: sort a sample by luminance, pick spread centers.
  const sampleIdx: number[] = [];
  const stride = Math.max(1, Math.floor(n / 4000));
  for (let i = 0; i < n; i += stride) sampleIdx.push(i);
  const byLum = sampleIdx
    .map((i) => ({ i, l: 0.299 * pixels[i * 3]! + 0.587 * pixels[i * 3 + 1]! + 0.114 * pixels[i * 3 + 2]! }))
    .sort((a, b) => a.l - b.l);
  const centers: RGB[] = [];
  for (let c = 0; c < k; c++) {
    const s = byLum[Math.floor(((c + 0.5) / k) * (byLum.length - 1))]!;
    const i = s.i * 3;
    centers.push([pixels[i]!, pixels[i + 1]!, pixels[i + 2]!]);
  }

  const labels = new Uint8Array(n);
  const counts = new Float64Array(k);
  for (let iter = 0; iter < 8; iter++) {
    const sums = new Float64Array(k * 3);
    counts.fill(0);
    for (let i = 0; i < n; i++) {
      const r = pixels[i * 3]!, g = pixels[i * 3 + 1]!, b = pixels[i * 3 + 2]!;
      let best = 0, bestD = Infinity;
      for (let c = 0; c < k; c++) {
        const dr = r - centers[c]![0]!, dg = g - centers[c]![1]!, db = b - centers[c]![2]!;
        const d = dr * dr + dg * dg + db * db;
        if (d < bestD) { bestD = d; best = c; }
      }
      labels[i]! = best;
      counts[best]!++;
      sums[best * 3]! += r; sums[best * 3 + 1]! += g; sums[best * 3 + 2]! += b;
    }
    for (let c = 0; c < k; c++) {
      if (counts[c]! > 0) {
        centers[c] = [sums[c * 3]! / counts[c]!, sums[c * 3 + 1]! / counts[c]!, sums[c * 3 + 2]! / counts[c]!];
      }
    }
  }
  return { centers, labels };
}

interface Seg { ax: number; ay: number; bx: number; by: number; used: boolean }

// Marching-squares edges for a cell, coordinates doubled to stay integral.
function cellSegments(mask: Uint8Array, w: number, h: number, x: number, y: number, out: Seg[]) {
  const tl = mask[y * w + x] ? 8 : 0;
  const tr = mask[y * w + x + 1] ? 4 : 0;
  const br = mask[(y + 1) * w + x + 1] ? 2 : 0;
  const bl = mask[(y + 1) * w + x] ? 1 : 0;
  const idx = tl | tr | br | bl;
  if (idx === 0 || idx === 15) return;
  const T: [number, number] = [2 * x + 1, 2 * y];
  const R: [number, number] = [2 * x + 2, 2 * y + 1];
  const B: [number, number] = [2 * x + 1, 2 * y + 2];
  const L: [number, number] = [2 * x, 2 * y + 1];
  const seg = (p: [number, number], q: [number, number]) =>
    out.push({ ax: p[0], ay: p[1], bx: q[0], by: q[1], used: false });
  // Segment orientation is consistent: the filled region is always on the
  // LEFT of the direction of travel (y-down screen coords). This is what
  // lets stitchSegments chain every cell's edges into closed loops - a
  // single flipped case fragments the whole contour into slivers.
  // Bits: tl=8, tr=4, br=2, bl=1.
  switch (idx) {
    case 1: seg(B, L); break; // bl
    case 2: seg(R, B); break; // br
    case 3: seg(R, L); break; // bl+br
    case 4: seg(T, R); break; // tr
    case 5: seg(T, R); seg(B, L); break; // tr+bl (saddle)
    case 6: seg(T, B); break; // tr+br
    case 7: seg(T, L); break; // all but tl
    case 8: seg(L, T); break; // tl
    case 9: seg(B, T); break; // tl+bl
    case 10: seg(L, T); seg(R, B); break; // tl+br (saddle)
    case 11: seg(R, T); break; // all but tr
    case 12: seg(L, R); break; // tl+tr
    case 13: seg(B, R); break; // all but br
    case 14: seg(L, B); break; // all but bl
  }
}

/** Stitch segments into closed loops; returns loops as point arrays (doubled coords). */
export function stitchSegments(segs: Seg[]): [number, number][][] {
  const startMap = new Map<string, number[]>();
  segs.forEach((s, i) => {
    const k = `${s.ax},${s.ay}`;
    const arr = startMap.get(k);
    if (arr) arr.push(i); else startMap.set(k, [i]);
  });
  const loops: [number, number][][] = [];
  for (const s of segs) {
    if (s.used) continue;
    s.used = true;
    const loop: [number, number][] = [[s.ax, s.ay]];
    let cx = s.bx, cy = s.by;
    loop.push([cx, cy]);
    for (let guard = 0; guard < segs.length + 4; guard++) {
      const nexts = startMap.get(`${cx},${cy}`)?.filter((i) => !segs[i]!.used);
      if (!nexts || nexts.length === 0) break;
      const ns = segs[nexts[0]!]!;
      ns.used = true;
      cx = ns.bx; cy = ns.by;
      if (cx === loop[0]![0] && cy === loop[0]![1]) break; // closed
      loop.push([cx, cy]);
    }
    if (loop.length >= 3) loops.push(loop);
  }
  return loops;
}

/** Douglas-Peucker simplification. */
export function simplifyPath(pts: [number, number][], epsilon: number): [number, number][] {
  if (pts.length < 4 || epsilon <= 0) return pts;
  const keep = new Array<boolean>(pts.length).fill(false);
  keep[0] = keep[pts.length - 1] = true;
  const stack: [number, number][] = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    let maxD = 0, idx = -1;
    const [ax, ay] = pts[a]!, [bx, by] = pts[b]!;
    const dx = bx - ax, dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * pts[i]![0]! - dx * pts[i]![1]! + bx * ay - by * ax) / len;
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (maxD > epsilon && idx > 0) {
      keep[idx] = true;
      stack.push([a, idx], [idx, b]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

/** Trace one binary layer into SVG path data (coords in original pixels). */
export function traceLayerPaths(mask: Uint8Array, w: number, h: number, epsilon: number): string {
  const segs: Seg[] = [];
  for (let y = 0; y < h - 1; y++) {
    for (let x = 0; x < w - 1; x++) cellSegments(mask, w, h, x, y, segs);
  }
  if (segs.length === 0) return "";
  const loops = stitchSegments(segs);
  const minLen = Math.max(8, Math.floor((w * h) / 4000)); // drop speckle
  let d = "";
  for (const loop of loops) {
    if (loop.length < minLen) continue;
    const simp = simplifyPath(loop, epsilon);
    if (simp.length < 3) continue;
    d += "M" + simp.map(([x, y]) => `${(x / 2).toFixed(1)},${(y / 2).toFixed(1)}`).join("L") + "Z";
  }
  return d;
}

const css = (c: RGB) => `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;

/**
 * Full pipeline: HTMLImageElement -> SVG string. Downscales to <=512px for
 * speed, quantizes, traces each layer largest-first.
 */
export async function imageToSvg(img: HTMLImageElement, opts: TraceOptions): Promise<{ svg: string; width: number; height: number }> {
  const scale = Math.min(1, 512 / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(2, Math.round(img.naturalWidth * scale));
  const h = Math.max(2, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;

  const n = w * h;
  const rgb = new Uint8ClampedArray(n * 3);
  const alpha = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    rgb[i * 3]! = data[i * 4]!; rgb[i * 3 + 1]! = data[i * 4 + 1]!; rgb[i * 3 + 2]! = data[i * 4 + 2]!;
    alpha[i]! = data[i * 4]!;
  }

  // Optionally drop near-white background so logos trace cleanly.
  const keep = new Uint8Array(n);
  let kept = 0;
  for (let i = 0; i < n; i++) {
    const isBg = opts.removeBackground && alpha[i]! < 128;
    const isWhite = opts.removeBackground && rgb[i * 3]! > 245 && rgb[i * 3 + 1]! > 245 && rgb[i * 3 + 2]! > 245;
    keep[i]! = !isBg && !isWhite ? 1 : 0;
    kept += keep[i]!;
  }
  if (kept < n * 0.02) keep.fill(1); // degenerate - trace everything

  const k = Math.max(2, Math.min(16, Math.round(opts.colors)));
  const { centers, labels } = quantizePixels(rgb, k);

  // Order layers by pixel count, largest first (background-ish last visually
  // doesn't matter - SVG paints in document order, so emit smallest last).
  const counts = new Array<number>(k).fill(0);
  for (let i = 0; i < n; i++) if (keep[i]!) counts[labels[i]!]!++;
  const order = counts.map((c, i) => ({ c, i })).sort((a, b) => b.c - a.c);

  const epsilon = 0.6 + (1 - opts.detail) * 3.2; // doubled-coord units
  let body = "";
  for (const { c, i } of order) {
    if (c < n * 0.002) continue;
    const mask = new Uint8Array(n);
    for (let p = 0; p < n; p++) mask[p]! = keep[p]! && labels[p]! === i ? 1 : 0;
    const d = traceLayerPaths(mask, w, h, epsilon);
    if (d) body += `<path fill="${css(centers[i]!)}" fill-rule="evenodd" d="${d}"/>`;
  }

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${img.naturalWidth}" height="${img.naturalHeight}">${body}</svg>`;
  return { svg, width: img.naturalWidth, height: img.naturalHeight };
}

/** File -> HTMLImageElement via object URL. */
export function loadImageFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read that image file.")); };
    img.src = url;
  });
}
