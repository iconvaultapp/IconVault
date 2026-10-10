// On-device AI background removal via Hugging Face transformers.js.
// Models load from CDN at runtime and are cached by the browser - nothing
// AI-related is bundled, because the onnxruntime WASM blob (~25MB) exceeds
// Cloudflare's 25MB per-asset limit and would break deployment.
//
// Model licenses (all commercial-use safe for iconvault.site):
// - BiRefNet_lite (general): MIT
// - MODNet (portrait): Apache-2.0
// - ormbg (fast): Apache-2.0
// Explicitly avoided: @imgly/background-removal (AGPL-3.0 copyleft - would
// force open-sourcing the site), bria-rmbg weights (paid commercial license).

export type BgProgress = (stage: string, frac: number) => void;

export interface BgModelDef {
  id: string;
  label: string;
  short: string;
  hfId: string;
  blurb: string;
}

export const BG_MODELS: BgModelDef[] = [
  {
    id: "general",
    label: "General",
    short: "Best overall quality",
    hfId: "onnx-community/BiRefNet_lite-ONNX",
    blurb: "BiRefNet: sharp edges on any subject - people, products, pets. ~114MB first download, cached after.",
  },
  {
    id: "portrait",
    label: "Portrait",
    short: "Best for people",
    hfId: "Xenova/modnet",
    blurb: "MODNet: trimap-free portrait matting with hair-level edges. Smaller download, tuned for faces.",
  },
  {
    id: "fast",
    label: "Fast",
    short: "Smaller download",
    hfId: "onnx-community/ormbg-ONNX",
    blurb: "Lightweight model: quicker download and inference, slightly softer edges.",
  },
];

export type BgDevice = "auto" | "webgpu";

// jsDelivr +esm serves the pinned transformers.js build as a browser ESM
// module (its onnxruntime dependency loads its own WASM from CDN).
const TRANSFORMERS_CDN: string = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0/+esm";

let transformersMod: any = null;

async function getTransformers(): Promise<any> {
  if (!transformersMod) {
    transformersMod = await import(/* @vite-ignore */ TRANSFORMERS_CDN);
  }
  return transformersMod;
}

export interface BgAi {
  model: any;
  processor: any;
  RawImage: any;
}

const aiCache = new Map<string, Promise<BgAi | null>>();

export interface BgLoadOpts {
  device?: BgDevice;
  onProgress?: BgProgress;
}

/** Load (and cache) a segmentation model. Resolves null when unavailable. */
export function loadBgAi(modelId: string = "general", opts: BgLoadOpts = {}): Promise<BgAi | null> {
  const device = opts.device ?? "auto";
  const key = `${modelId}:${device}`;
  if (!aiCache.has(key)) {
    aiCache.set(
      key,
      (async (): Promise<BgAi | null> => {
        const def = BG_MODELS.find((m) => m.id === modelId) ?? BG_MODELS[0]!;
        const { AutoModel, AutoProcessor, RawImage } = await getTransformers();
        const onProgress = opts.onProgress ?? (() => {});
        // Attempt order: WebGPU fp16 -> WebGPU fp32 -> WASM fp16 -> WASM fp32.
        // Each step falls through to the next on failure.
        const attempts: { device?: string; dtype: "fp16" | "fp32" }[] = [];
        if (device === "webgpu") {
          attempts.push({ device: "webgpu", dtype: "fp16" }, { device: "webgpu", dtype: "fp32" });
        }
        attempts.push({ dtype: "fp16" }, { dtype: "fp32" });
        let lastErr: unknown = null;
        for (const a of attempts) {
          try {
            const label = `Downloading AI model (${def.label})`;
            const [model, processor] = await Promise.all([
              AutoModel.from_pretrained(def.hfId, {
                dtype: a.dtype,
                ...(a.device ? { device: a.device } : {}),
                progress_callback: (p: any) => {
                  if (typeof p?.progress === "number") onProgress(label, p.progress / 100);
                },
              }),
              AutoProcessor.from_pretrained(def.hfId),
            ]);
            return { model, processor, RawImage };
          } catch (err) {
            lastErr = err;
          }
        }
        throw lastErr;
      })().catch(() => null),
    );
  }
  return aiCache.get(key)!;
}

/** Convert one float16 bit pattern to float32. */
function halfToFloat(h: number): number {
  const buf = new ArrayBuffer(4);
  const u32 = new Uint32Array(buf);
  const f32 = new Float32Array(buf);
  const s = (h & 0x8000) << 16;
  const e = (h >> 10) & 0x1f;
  const m = h & 0x3ff;
  let bits: number;
  if (e === 0) {
    if (m === 0) {
      bits = s;
    } else {
      let ee = 1;
      let mm = m;
      while ((mm & 0x400) === 0) {
        mm <<= 1;
        ee -= 1;
      }
      mm &= 0x3ff;
      bits = s | ((ee + 112) << 23) | (mm << 13);
    }
  } else if (e === 31) {
    bits = s | 0x7f800000 | (m << 13);
  } else {
    bits = s | ((e + 112) << 23) | (m << 13);
  }
  u32[0] = bits >>> 0;
  return f32[0]!;
}

/** Sigmoid over a raw float32 array. */
function sigmoidInto(data: Float32Array, count: number, out: Float32Array): void {
  for (let i = 0; i < count; i++) out[i] = 1 / (1 + Math.exp(-data[i]!));
}

/**
 * Normalize a raw model-output tensor to foreground probabilities.
 * Logit-style outputs (values outside [0,1], e.g. BiRefNet) go through a
 * sigmoid; already-normalized mattes (e.g. MODNet, all values in [0,1]) are
 * used directly. This keeps the multi-model path robust without
 * model-specific branches.
 */
function normalizeMask(data: unknown, count: number): Float32Array | null {
  let get: ((i: number) => number) | null = null;
  if (data instanceof Float32Array) {
    get = (i) => data[i]!;
  } else if (data instanceof Uint16Array) {
    get = (i) => halfToFloat(data[i]!);
  } else {
    return null;
  }
  let mn = Infinity;
  let mx = -Infinity;
  const sampleStep = Math.max(1, Math.floor(count / 4096));
  for (let i = 0; i < count; i += sampleStep) {
    const v = get(i);
    if (v < mn) mn = v;
    if (v > mx) mx = v;
  }
  const out = new Float32Array(count);
  if (mn >= -0.02 && mx <= 1.02) {
    // Already a probability/matte map - clamp and use directly.
    for (let i = 0; i < count; i++) {
      const v = get(i);
      out[i] = v < 0 ? 0 : v > 1 ? 1 : v;
    }
    return out;
  }
  if (data instanceof Float32Array) {
    sigmoidInto(data, count, out);
    return out;
  }
  for (let i = 0; i < count; i++) out[i] = 1 / (1 + Math.exp(-get(i)));
  return out;
}

/**
 * Pick the segmentation mask out of the model's raw outputs. Instead of
 * assuming an output key name ("output_image", "logits", ...), scan every
 * returned tensor and take the one with the largest spatial area - that is
 * the foreground probability map. Handles leading batch dims and extra
 * channel dims (channel-first or channel-last); only the first channel of
 * the spatial map is read.
 */
function pickMaskTensor(out: Record<string, unknown>): { prob: Float32Array; mw: number; mh: number } | null {
  let best: { dims: number[]; data: unknown } | null = null;
  let bestArea = 0;
  for (const v of Object.values(out)) {
    if (!v || typeof v !== "object" || !Array.isArray((v as { dims?: unknown }).dims)) continue;
    const t = v as { dims: number[]; data: unknown };
    const dims = [...t.dims];
    while (dims.length > 2 && dims[0] === 1) dims.shift();
    if (dims.length < 2) continue;
    const mh = dims[dims.length - 2]!;
    const mw = dims[dims.length - 1]!;
    if (!Number.isFinite(mh) || !Number.isFinite(mw) || mh <= 0 || mw <= 0) continue;
    const area = mh * mw;
    const total = dims.reduce((a, b) => a * b, 1);
    // The tensor must hold at least one value per spatial pixel.
    if (total >= area && area > bestArea) {
      best = t;
      bestArea = area;
    }
  }
  if (!best) return null;
  const dims = [...best.dims];
  while (dims.length > 2 && dims[0] === 1) dims.shift();
  const mh = dims[dims.length - 2]!;
  const mw = dims[dims.length - 1]!;
  const prob = normalizeMask(best.data, mh * mw);
  if (!prob) return null;
  return { prob, mw, mh };
}

/** Bilinear-upscale the foreground probability map into the alpha channel. */
function applyAiAlpha(
  data: Uint8ClampedArray, w: number, h: number,
  prob: Float32Array, mw: number, mh: number,
): number {
  let cleared = 0;
  for (let y = 0; y < h; y++) {
    const gy = (y + 0.5) * mh / h - 0.5;
    const yf = Math.max(0, Math.min(1, gy - Math.floor(gy)));
    const y0 = Math.max(0, Math.min(mh - 1, Math.floor(gy)));
    const y1 = Math.min(mh - 1, y0 + 1);
    for (let x = 0; x < w; x++) {
      const gx = (x + 0.5) * mw / w - 0.5;
      const xf = Math.max(0, Math.min(1, gx - Math.floor(gx)));
      const x0 = Math.max(0, Math.min(mw - 1, Math.floor(gx)));
      const x1 = Math.min(mw - 1, x0 + 1);
      const p00 = prob[y0 * mw + x0]!;
      const p01 = prob[y0 * mw + x1]!;
      const p10 = prob[y1 * mw + x0]!;
      const p11 = prob[y1 * mw + x1]!;
      const v = (p00 * (1 - xf) + p01 * xf) * (1 - yf) + (p10 * (1 - xf) + p11 * xf) * yf;
      const o = (y * w + x) * 4;
      let a: number;
      if (v < 0.35) { a = 0; cleared++; }
      else if (v > 0.65) a = 255;
      else a = Math.round(255 * ((v - 0.35) / 0.3));
      const prev = data[o + 3]!;
      data[o + 3] = prev < a ? prev : a;
    }
  }
  return cleared / (w * h);
}

/**
 * Run AI segmentation on the given pixels and clear the background in place.
 * Returns the fraction of pixels cleared. Throws when the model cannot load,
 * inference fails, or the mask is degenerate (almost nothing / almost
 * everything removed) - callers should fall back to the classic heuristic.
 */
export async function removeBackgroundAi(
  imageData: ImageData,
  onProgress: BgProgress = () => {},
  modelId: string = "general",
  device: BgDevice = "auto",
): Promise<number> {
  const ai = await loadBgAi(modelId, { device, onProgress });
  if (!ai) throw new Error("ai-unavailable");
  const blob = await new Promise<Blob | null>((resolve) => {
    const c = document.createElement("canvas");
    c.width = imageData.width;
    c.height = imageData.height;
    const ctx = c.getContext("2d");
    if (!ctx) {
      resolve(null);
      return;
    }
    ctx.putImageData(imageData, 0, 0);
    try {
      c.toBlob((b) => resolve(b), "image/png");
    } catch {
      resolve(null);
    }
  });
  if (!blob) throw new Error("encode");
  const image = await ai.RawImage.fromBlob(blob);
  onProgress("Preparing image", 0);
  const { pixel_values } = await ai.processor(image);
  onProgress("Removing background", 0);
  const out = await ai.model({ pixel_values });
  const mask = pickMaskTensor(out as Record<string, unknown>);
  if (!mask) throw new Error("output");
  const { prob, mw, mh } = mask;
  const frac = applyAiAlpha(imageData.data, imageData.width, imageData.height, prob, mw, mh);
  if (frac < 0.005 || frac > 0.995) throw new Error("degenerate");
  return frac;
}
