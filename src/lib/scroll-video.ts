// Scroll-video helpers for /tools/website-screenshot.
//
// How it works: Microlink's `screenshot.animated` records a 5s screencast per
// call on the free tier (max 5s, MP4 only - verified live). To produce the
// ~13s full-page scroll users expect, we record THREE 5s segments - top,
// middle and bottom third of the page - at full HD, then stitch them
// client-side into one video via canvas.captureStream + MediaRecorder.
//
// Each segment is a fresh page load, so each injected module (1) jumps to its
// third, (2) does a quick out-and-back sweep inside that third to wake
// lazy-loaded images/sections, then (3) smooth-scrolls the third with timed
// setTimeout steps (requestAnimationFrame does NOT fire in the headless
// page). Verified timing: module timers run ~0.5s behind the recording
// timeline, so each module finishes in ~4s of the 5s recording.
//
// Output: MP4/WebM stitched in-browser (WebM via vp9/vp8, MP4 where the
// browser's MediaRecorder supports it - Chrome/Edge/Safari), GIF via
// frame extraction + gifenc. Segments are fetched as blobs through
// /api/video-proxy, so stitching is same-origin and never taints.

import { GIFEncoder, quantize, applyPalette } from "gifenc";

export type VideoFormat = "mp4" | "webm" | "gif";
export type VideoAspect = "vertical" | "square" | "horizontal";

export const VIDEO_ASPECTS: Record<
  VideoAspect,
  { label: string; dims: string; w: number; h: number; hint: string }
> = {
  vertical: { label: "Vertical", dims: "9:16", w: 1080, h: 1920, hint: "Reels · Stories · Shorts" },
  square: { label: "Square", dims: "1:1", w: 1080, h: 1080, hint: "Feed posts" },
  horizontal: { label: "Horizontal", dims: "16:9", w: 1920, h: 1080, hint: "YouTube · landscape" },
};

export const VIDEO_FORMATS: Record<VideoFormat, { label: string; hint: string }> = {
  mp4: { label: "MP4", hint: "Plays everywhere" },
  webm: { label: "WebM", hint: "Smallest file" },
  gif: { label: "GIF", hint: "Loops anywhere" },
};

export const SCROLL_SEGMENTS = 3;

/**
 * Injected into the target page for one segment: jump to the segment's third,
 * quick out-and-back sweep to wake lazy content, then a smooth linear scroll
 * across the third (~3.6s). Linear (not eased) so the pace matches at the
 * stitch boundaries.
 */
export function buildScrollModule(segment: number): string {
  return (
    ";(async()=>{" +
    "const sleep=ms=>new Promise(r=>setTimeout(r,ms));" +
    "const maxY=()=>Math.max(0,document.documentElement.scrollHeight-innerHeight);" +
    `const SEG=${segment},H=maxY(),a=H*SEG/3,b=H*(SEG+1)/3;` +
    "scrollTo(0,a);" +
    "scrollTo(0,b);await sleep(200);" + // wake lazy content in this third
    "scrollTo(0,a);await sleep(200);" +
    "const N=54;" +
    "for(let k=1;k<=N;k++){scrollTo(0,a+(b-a)*k/N);await sleep(66);}" +
    "})()"
  );
}

export interface ScrollVideoClip {
  segments: Blob[];
  width: number;
  height: number;
  /** Approximate stitched duration in seconds. */
  durationSec: number;
}

/** Same-origin URL with CORS headers, for downloading segments as blobs. */
export const proxiedVideoUrl = (videoUrl: string) =>
  `/api/video-proxy?url=${encodeURIComponent(videoUrl)}`;

async function recordSegment(
  target: string,
  aspect: VideoAspect,
  segment: number,
): Promise<Blob> {
  const a = VIDEO_ASPECTS[aspect];
  const params = new URLSearchParams({
    url: target,
    screenshot: "true",
    "screenshot.animated": "true",
    "screenshot.animated.duration": "5s",
    "screenshot.animated.fps": "30",
    waitForTimeout: "800",
    modules: buildScrollModule(segment),
    meta: "false",
    "viewport.width": String(a.w),
    "viewport.height": String(a.h),
  });
  const res = await fetch(`https://api.microlink.io?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Video service returned ${res.status} on part ${segment + 1}. Try again in a moment.`);
  }
  const json = (await res.json()) as {
    status?: string;
    data?: { screenshot?: { animated?: { url?: string } } };
  };
  const videoUrl = json.data?.screenshot?.animated?.url;
  if (json.status !== "success" || !videoUrl) {
    throw new Error(`Could not record part ${segment + 1}. Is the URL publicly reachable?`);
  }
  const dl = await fetch(proxiedVideoUrl(videoUrl));
  if (!dl.ok) throw new Error(`Could not download part ${segment + 1} of the recording.`);
  return dl.blob();
}

/** Records all 3 segments (top / middle / bottom third). */
export async function requestScrollVideo(
  target: string,
  aspect: VideoAspect,
  onStatus?: (msg: string) => void,
): Promise<ScrollVideoClip> {
  const a = VIDEO_ASPECTS[aspect];
  const segments: Blob[] = [];
  for (let i = 0; i < SCROLL_SEGMENTS; i++) {
    onStatus?.(
      `Recording part ${i + 1} of ${SCROLL_SEGMENTS} - scrolling the ${
        ["top", "middle", "bottom"][i]
      } of the page…`,
    );
    segments.push(await recordSegment(target, aspect, i));
  }
  // ~4.5s of usable scroll per 5s segment.
  return { segments, width: a.w, height: a.h, durationSec: SCROLL_SEGMENTS * 4.5 };
}

/** Draw one segment's frames onto the canvas until its playback ends. */
function drawSegmentToCanvas(
  url: string,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    v.src = url;
    let raf = 0;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      cancelAnimationFrame(raf);
      v.pause();
      resolve();
    };
    const fail = () => {
      if (settled) return;
      settled = true;
      cancelAnimationFrame(raf);
      reject(new Error("Could not stitch the video parts together."));
    };
    const loop = () => {
      if (v.readyState >= 2) ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      raf = requestAnimationFrame(loop);
    };
    v.onended = finish;
    v.onerror = fail;
    v.oncanplay = () => {
      loop();
      v.play().catch(fail);
      // Safety net: never hang on a stalled segment.
      window.setTimeout(finish, (v.duration || 5) * 1000 + 4000);
    };
    // If the video never becomes playable, fail fast instead of hanging.
    window.setTimeout(() => {
      if (!settled && v.readyState < 2) fail();
    }, 20000);
  });
}

/**
 * Stitches the 3 segments into ONE video via canvas.captureStream +
 * MediaRecorder. MP4 needs a browser whose MediaRecorder supports it
 * (Chrome/Edge/Safari) - otherwise throws "mp4-unsupported".
 */
export async function stitchSegmentsToVideo(
  clip: ScrollVideoClip,
  format: "mp4" | "webm",
  onStatus?: (msg: string) => void,
): Promise<Blob> {
  if (typeof MediaRecorder === "undefined" || typeof document === "undefined") {
    throw new Error(`${format}-unsupported`);
  }
  const candidates =
    format === "mp4"
      ? ["video/mp4", "video/mp4;codecs=avc1"]
      : ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  const mime = candidates.find((c) => {
    try {
      return MediaRecorder.isTypeSupported(c);
    } catch {
      return false;
    }
  });
  if (!mime) throw new Error(`${format}-unsupported`);

  const canvas = document.createElement("canvas");
  canvas.width = clip.width;
  canvas.height = clip.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser.");
  const capture = (
    canvas as HTMLCanvasElement & { captureStream?: (fps: number) => MediaStream }
  ).captureStream;
  const stream = typeof capture === "function" ? capture.call(canvas, 30) : undefined;
  if (!stream || stream.getVideoTracks().length === 0) {
    throw new Error(`${format}-unsupported`);
  }

  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => {
    if (e.data && e.data.size) chunks.push(e.data);
  };
  const stopped = new Promise<void>((resolve) => {
    rec.onstop = () => resolve();
  });
  onStatus?.("Stitching the 3 parts into one smooth video…");
  rec.start(250);
  try {
    for (const blob of clip.segments) {
      const url = URL.createObjectURL(blob);
      try {
        await drawSegmentToCanvas(url, canvas, ctx);
      } finally {
        URL.revokeObjectURL(url);
      }
    }
  } finally {
    if (rec.state !== "inactive") rec.stop();
    await stopped;
  }
  if (!chunks.length) {
    throw new Error("The stitched video came out empty - try MP4 instead.");
  }
  return new Blob(chunks, { type: mime.split(";")[0] ?? "video/webm" });
}

function loadSegmentEl(blob: Blob): Promise<HTMLVideoElement> {
  const v = document.createElement("video");
  v.muted = true;
  v.playsInline = true;
  v.preload = "auto";
  v.src = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    v.onloadedmetadata = () => resolve(v);
    v.onerror = () => reject(new Error("Could not read the recorded video."));
  });
}

const unload = (v: HTMLVideoElement) => {
  URL.revokeObjectURL(v.src);
  v.pause();
  v.removeAttribute("src");
  v.load();
};

const seekTo = (v: HTMLVideoElement, t: number) =>
  new Promise<void>((resolve, reject) => {
    const clean = () => {
      v.removeEventListener("seeked", onSeek);
      v.removeEventListener("error", onErr);
    };
    const onSeek = () => {
      clean();
      resolve();
    };
    const onErr = () => {
      clean();
      reject(new Error("Could not read video frames."));
    };
    v.addEventListener("seeked", onSeek);
    v.addEventListener("error", onErr);
    try {
      v.currentTime = Math.min(t, Math.max(0, (v.duration || t + 0.1) - 0.05));
    } catch {
      clean();
      reject(new Error("Could not read video frames."));
    }
  });

/** Segments -> GIF: 8fps, 320px wide, 256 colors. */
export async function segmentsToGif(
  clip: ScrollVideoClip,
  onStatus?: (msg: string) => void,
): Promise<Blob> {
  const W = 320;
  const H = Math.max(2, Math.round((W * clip.height) / Math.max(1, clip.width)));
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas is not available in this browser.");
  const fps = 8;
  const gif = GIFEncoder();
  let frameNo = 0;
  for (let s = 0; s < clip.segments.length; s++) {
    onStatus?.(`Turning part ${s + 1} of ${clip.segments.length} into GIF frames…`);
    const v = await loadSegmentEl(clip.segments[s]!);
    try {
      const frames = Math.max(1, Math.floor((v.duration || 5) * fps));
      for (let i = 0; i < frames; i++) {
        await seekTo(v, i / fps);
        ctx.drawImage(v, 0, 0, W, H);
        const data = ctx.getImageData(0, 0, W, H).data;
        const palette = quantize(data as unknown as number[], 256);
        const index = applyPalette(data as unknown as number[], palette);
        gif.writeFrame(index, W, H, { palette, delay: Math.round(1000 / fps) });
        frameNo++;
        // Bound runaway GIFs on very long segments.
        if (frameNo >= 140) break;
      }
    } finally {
      unload(v);
    }
    if (frameNo >= 140) break;
  }
  gif.finish();
  return new Blob([gif.bytes() as unknown as BlobPart], { type: "image/gif" });
}
