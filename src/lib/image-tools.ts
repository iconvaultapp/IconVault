// Shared helpers for the image tools (convert / compress / resize / gif / exam / privacy).
// Every tool runs 100% client-side: files never leave the user's device.

export function loadImageFile(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image. Try a JPG, PNG or WebP file."));
    };
    img.src = url;
  });
}

export function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Could not read that file."));
    r.readAsDataURL(file);
  });
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not encode the image."))),
      type,
      quality,
    );
  });
}

/** Draw img to cover the rect (center-cropped). */
export function drawCover(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  iw: number,
  ih: number,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const s = Math.max(w / iw, h / ih);
  const dw = iw * s;
  const dh = ih * s;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

/** Draw img to fit inside the rect (letterboxed, centered). */
export function drawContain(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  iw: number,
  ih: number,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const s = Math.min(w / iw, h / ih);
  const dw = iw * s;
  const dh = ih * s;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "0 B";
  if (n < 1024) return `${Math.round(n)} B`;
  const kb = n / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

export function extForMime(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
    "image/gif": "gif",
    "image/bmp": "bmp",
    "image/tiff": "tif",
    "image/svg+xml": "svg",
  };
  return map[mime] ?? "png";
}

export function baseName(name: string): string {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(0, i) : name || "image";
}

export function rgbToHex(r: number, g: number, b: number): string {
  const p = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${p(r)}${p(g)}${p(b)}`;
}

/**
 * Reduce an ImageData to at most `colors` colors with median-cut quantization.
 * Used by the PNG compressor (palette PNGs) and the color palette extractor.
 * Returns { data, palette } where palette is an array of [r, g, b].
 */
export function medianCut(
  src: ImageData,
  colors: number,
): { data: ImageData; palette: [number, number, number][] } {
  const px = src.data;
  const n = src.width * src.height;
  // Collect opaque-ish pixels as [r, g, b].
  const pixels: number[][] = [];
  for (let i = 0; i < n; i++) {
    const a = px[i * 4 + 3] ?? 0;
    if (a < 128) continue;
    pixels.push([px[i * 4] ?? 0, px[i * 4 + 1] ?? 0, px[i * 4 + 2] ?? 0, a]);
  }
  if (pixels.length === 0) {
    return { data: new ImageData(src.width, src.height), palette: [] };
  }

  type Box = number[][];
  let boxes: Box[] = [pixels];
  while (boxes.length < colors) {
    // Split the box with the largest channel range.
    let bi = -1;
    let bestRange = -1;
    let bestCh = 0;
    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i]!;
      if (box.length < 2) continue;
      for (let ch = 0; ch < 3; ch++) {
        let mn = 255;
        let mx = 0;
        for (const p of box) {
          const v = p[ch] ?? 0;
          if (v < mn) mn = v;
          if (v > mx) mx = v;
        }
        if (mx - mn > bestRange) {
          bestRange = mx - mn;
          bi = i;
          bestCh = ch;
        }
      }
    }
    if (bi < 0) break;
    const box = boxes[bi]!.slice().sort((a, b) => (a[bestCh] ?? 0) - (b[bestCh] ?? 0));
    const mid = Math.ceil(box.length / 2);
    boxes = [...boxes.slice(0, bi), box.slice(0, mid), box.slice(mid), ...boxes.slice(bi + 1)];
  }

  const palette: [number, number, number][] = boxes.map((box) => {
    let r = 0;
    let g = 0;
    let b = 0;
    for (const p of box) {
      r += p[0] ?? 0;
      g += p[1] ?? 0;
      b += p[2] ?? 0;
    }
    const c = Math.max(1, box.length);
    return [Math.round(r / c), Math.round(g / c), Math.round(b / c)];
  });

  const out = new ImageData(src.width, src.height);
  const od = out.data;
  for (let i = 0; i < n; i++) {
    const a = px[i * 4 + 3] ?? 0;
    if (a < 128) {
      od[i * 4 + 3] = 0;
      continue;
    }
    const r = px[i * 4] ?? 0;
    const g = px[i * 4 + 1] ?? 0;
    const b = px[i * 4 + 2] ?? 0;
    let best = 0;
    let bestD = Infinity;
    for (let j = 0; j < palette.length; j++) {
      const p = palette[j]!;
      const d = (p[0]! - r) ** 2 + (p[1]! - g) ** 2 + (p[2]! - b) ** 2;
      if (d < bestD) {
        bestD = d;
        best = j;
      }
    }
    const p = palette[best]!;
    od[i * 4] = p[0]!;
    od[i * 4 + 1] = p[1]!;
    od[i * 4 + 2] = p[2]!;
    od[i * 4 + 3] = 255;
  }
  return { data: out, palette };
}

/** Fill transparent pixels of a canvas with a solid color (for JPG export). */
export function fillBackground(canvas: HTMLCanvasElement, color: string) {
  const ctx = canvas.getContext("2d")!;
  ctx.save();
  ctx.globalCompositeOperation = "destination-over";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

/** CRC32 for PNG chunks. */
function crc32(bytes: Uint8Array): number {
  let c = ~0;
  const table = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let v = n;
      for (let k = 0; k < 8; k++) v = v & 1 ? 0xedb88320 ^ (v >>> 1) : v >>> 1;
      t[n] = v;
    }
    return t;
  })();
  for (const b of bytes) c = table[(c ^ b) & 0xff]! ^ (c >>> 8);
  return ~c >>> 0;
}

/** Embed DPI into a PNG blob (pHYs chunk). Returns a new Blob. */
export async function pngWithDpi(blob: Blob, dpi: number): Promise<Blob> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  const ppm = Math.round(dpi / 0.0254);
  const data = new Uint8Array(9);
  const v = new DataView(data.buffer);
  v.setUint32(0, ppm);
  v.setUint32(4, ppm);
  data[8] = 1; // unit: meter
  const type = new TextEncoder().encode("pHYs");
  const chunk = new Uint8Array(12 + 9);
  new DataView(chunk.buffer).setUint32(0, 9);
  chunk.set(type, 4);
  chunk.set(data, 8);
  new DataView(chunk.buffer).setUint32(8 + 9, crc32(new Uint8Array([...type, ...data])));
  // Insert before IDAT.
  let idat = 8;
  while (idat < buf.length) {
    const len = new DataView(buf.buffer, idat).getUint32(0);
    const t = String.fromCharCode(buf[idat + 4] ?? 0, buf[idat + 5] ?? 0, buf[idat + 6] ?? 0, buf[idat + 7] ?? 0);
    if (t === "IDAT") break;
    idat += 12 + len;
  }
  const out = new Uint8Array(buf.length + chunk.length);
  out.set(buf.slice(0, idat), 0);
  out.set(chunk, idat);
  out.set(buf.slice(idat), idat + chunk.length);
  return new Blob([out], { type: "image/png" });
}

/** Embed DPI into a JPEG blob (JFIF APP0 density). Returns a new Blob. */
export async function jpegWithDpi(blob: Blob, dpi: number): Promise<Blob> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return blob;
  // Skip past SOI and any existing APP0 (FFE0) segments.
  let pos = 2;
  while (pos + 4 < buf.length && buf[pos] === 0xff && buf[pos + 1] === 0xe0) {
    const len = ((buf[pos + 2] ?? 0) << 8) | (buf[pos + 3] ?? 0);
    pos += 2 + len;
  }
  const app0 = new Uint8Array([
    0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x02, 0x01,
    (dpi >> 8) & 0xff, dpi & 0xff, (dpi >> 8) & 0xff, dpi & 0xff, 0x00, 0x00,
  ]);
  const out = new Uint8Array(buf.length + app0.length);
  out.set(buf.slice(0, pos), 0);
  out.set(app0, pos);
  out.set(buf.slice(pos), pos + app0.length);
  return new Blob([out], { type: "image/jpeg" });
}

/**
 * Encode a canvas, shrinking quality (and then dimensions) until the blob
 * fits inside maxBytes. Returns the blob and the quality/dimensions used.
 * Used by "compress to exact KB" and the exam-form tools.
 */
export async function encodeToSize(
  draw: (canvas: HTMLCanvasElement, scale: number) => void,
  mime: "image/jpeg" | "image/webp",
  maxBytes: number,
  startW: number,
  startH: number,
): Promise<{ blob: Blob; quality: number; width: number; height: number }> {
  let scale = 1;
  for (let round = 0; round < 4; round++) {
    let lo = 5;
    let hi = 95;
    let best: Blob | null = null;
    let bestQ = 95;
    while (lo <= hi) {
      const q = Math.floor((lo + hi) / 2);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(startW * scale));
      canvas.height = Math.max(1, Math.round(startH * scale));
      draw(canvas, scale);
      const blob = await canvasToBlob(canvas, mime, q / 100);
      if (blob.size <= maxBytes) {
        best = blob;
        bestQ = q;
        lo = q + 1;
      } else {
        hi = q - 1;
      }
    }
    if (best) {
      return {
        blob: best,
        quality: bestQ,
        width: Math.round(startW * scale),
        height: Math.round(startH * scale),
      };
    }
    scale *= 0.85;
  }
  // Last resort: lowest quality at smallest scale.
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(startW * scale));
  canvas.height = Math.max(1, Math.round(startH * scale));
  draw(canvas, scale);
  const blob = await canvasToBlob(canvas, mime, 0.05);
  return { blob, quality: 5, width: canvas.width, height: canvas.height };
}
