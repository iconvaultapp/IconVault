// /tools/font-finder - upload an image, select the text, get closest font matches.
// 100% client-side: canvas pixel analysis (serifs, contrast, weight, slant,
// spacing) scored against a curated typeface database. Best-guess matching.

import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, ImagePlus, ScanSearch, RotateCcw, ExternalLink, Check } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tools_/font-finder")({
  head: () => {
    const seo = getToolSeoMeta("font-finder");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: FontFinderTool,
});

interface FontEntry {
  name: string;
  serif: number; // 0 = sans, 1 = full serif
  contrast: number; // 0 = monolinear, 1 = extreme Didone contrast
  weight: number; // typical regular stroke/band ratio
  mono: number;
  condensed: number;
  script: number;
  rounded: number;
  geometric: number;
  tags: string[];
}

const FONT_DB: FontEntry[] = [
  { name: "Playfair Display", serif: 1, contrast: 0.9, weight: 0.14, mono: 0, condensed: 0, script: 0, rounded: 0, geometric: 0, tags: ["serif", "display", "high contrast"] },
  { name: "Bodoni Moda", serif: 1, contrast: 1, weight: 0.12, mono: 0, condensed: 0, script: 0, rounded: 0, geometric: 0, tags: ["serif", "didone", "fashion"] },
  { name: "Merriweather", serif: 1, contrast: 0.25, weight: 0.16, mono: 0, condensed: 0, script: 0, rounded: 0, geometric: 0, tags: ["serif", "readable", "text"] },
  { name: "Georgia", serif: 1, contrast: 0.3, weight: 0.16, mono: 0, condensed: 0, script: 0, rounded: 0, geometric: 0, tags: ["serif", "system", "web"] },
  { name: "Times New Roman", serif: 1, contrast: 0.45, weight: 0.14, mono: 0, condensed: 0, script: 0, rounded: 0, geometric: 0, tags: ["serif", "system", "classic"] },
  { name: "Lora", serif: 1, contrast: 0.35, weight: 0.15, mono: 0, condensed: 0, script: 0, rounded: 0, geometric: 0, tags: ["serif", "elegant", "text"] },
  { name: "PT Serif", serif: 1, contrast: 0.3, weight: 0.16, mono: 0, condensed: 0, script: 0, rounded: 0, geometric: 0, tags: ["serif", "workhorse"] },
  { name: "Roboto Slab", serif: 1, contrast: 0.15, weight: 0.17, mono: 0, condensed: 0, script: 0, rounded: 0, geometric: 0, tags: ["slab", "sturdy"] },
  { name: "Zilla Slab", serif: 1, contrast: 0.2, weight: 0.16, mono: 0, condensed: 0, script: 0, rounded: 0, geometric: 0, tags: ["slab", "tech"] },
  { name: "Inter", serif: 0, contrast: 0.15, weight: 0.15, mono: 0, condensed: 0, script: 0, rounded: 0, geometric: 0, tags: ["sans", "ui", "neutral"] },
  { name: "Roboto", serif: 0, contrast: 0.2, weight: 0.15, mono: 0, condensed: 0, script: 0, rounded: 0, geometric: 0, tags: ["sans", "android", "ui"] },
  { name: "Helvetica", serif: 0, contrast: 0.15, weight: 0.15, mono: 0, condensed: 0, script: 0, rounded: 0, geometric: 0, tags: ["sans", "swiss", "classic"] },
  { name: "Arial", serif: 0, contrast: 0.15, weight: 0.15, mono: 0, condensed: 0, script: 0, rounded: 0, geometric: 0, tags: ["sans", "system"] },
  { name: "Open Sans", serif: 0, contrast: 0.15, weight: 0.15, mono: 0, condensed: 0, script: 0, rounded: 0, geometric: 0, tags: ["sans", "humanist", "friendly"] },
  { name: "Lato", serif: 0, contrast: 0.2, weight: 0.15, mono: 0, condensed: 0, script: 0, rounded: 0, geometric: 0, tags: ["sans", "humanist", "warm"] },
  { name: "Work Sans", serif: 0, contrast: 0.15, weight: 0.14, mono: 0, condensed: 0, script: 0, rounded: 0, geometric: 0, tags: ["sans", "grotesque"] },
  { name: "Montserrat", serif: 0, contrast: 0.15, weight: 0.15, mono: 0, condensed: 0, script: 0, rounded: 0, geometric: 0.9, tags: ["sans", "geometric", "modern"] },
  { name: "Poppins", serif: 0, contrast: 0.1, weight: 0.15, mono: 0, condensed: 0, script: 0, rounded: 0.4, geometric: 0.9, tags: ["sans", "geometric", "rounded"] },
  { name: "Futura", serif: 0, contrast: 0.2, weight: 0.14, mono: 0, condensed: 0, script: 0, rounded: 0, geometric: 1, tags: ["sans", "geometric", "classic"] },
  { name: "Nunito", serif: 0, contrast: 0.1, weight: 0.15, mono: 0, condensed: 0, script: 0, rounded: 0.9, geometric: 0.3, tags: ["sans", "rounded", "friendly"] },
  { name: "Raleway", serif: 0, contrast: 0.25, weight: 0.13, mono: 0, condensed: 0, script: 0, rounded: 0, geometric: 0.6, tags: ["sans", "elegant", "thin"] },
  { name: "Oswald", serif: 0, contrast: 0.2, weight: 0.17, mono: 0, condensed: 0.8, script: 0, rounded: 0, geometric: 0, tags: ["sans", "condensed", "headlines"] },
  { name: "Bebas Neue", serif: 0, contrast: 0.1, weight: 0.18, mono: 0, condensed: 1, script: 0, rounded: 0, geometric: 0, tags: ["sans", "condensed", "posters"] },
  { name: "Anton", serif: 0, contrast: 0.1, weight: 0.22, mono: 0, condensed: 0.6, script: 0, rounded: 0, geometric: 0, tags: ["sans", "bold", "display"] },
  { name: "JetBrains Mono", serif: 0, contrast: 0.1, weight: 0.15, mono: 1, condensed: 0, script: 0, rounded: 0, geometric: 0, tags: ["monospace", "code"] },
  { name: "Roboto Mono", serif: 0, contrast: 0.1, weight: 0.15, mono: 1, condensed: 0, script: 0, rounded: 0, geometric: 0, tags: ["monospace", "code"] },
  { name: "Courier New", serif: 0.3, contrast: 0.1, weight: 0.14, mono: 1, condensed: 0, script: 0, rounded: 0, geometric: 0, tags: ["monospace", "typewriter"] },
  { name: "Space Mono", serif: 0, contrast: 0.15, weight: 0.15, mono: 1, condensed: 0, script: 0, rounded: 0, geometric: 0, tags: ["monospace", "quirky"] },
  { name: "Pacifico", serif: 0, contrast: 0.3, weight: 0.16, mono: 0, condensed: 0, script: 1, rounded: 0.5, geometric: 0, tags: ["script", "casual"] },
  { name: "Dancing Script", serif: 0, contrast: 0.4, weight: 0.13, mono: 0, condensed: 0, script: 1, rounded: 0.3, geometric: 0, tags: ["script", "handwriting"] },
  { name: "Lobster", serif: 0, contrast: 0.5, weight: 0.18, mono: 0, condensed: 0, script: 0.7, rounded: 0.4, geometric: 0, tags: ["script", "bold", "retro"] },
];

interface Features {
  serif: number;
  contrast: number;
  weight: number;
  mono: number;
  condensed: number;
  script: number;
  rounded: number;
  geometric: number;
  slantDeg: number;
}

interface Match {
  name: string;
  score: number;
  tags: string[];
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function median(vals: number[]): number {
  if (vals.length === 0) return 0;
  const s = [...vals].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1]! + s[m]!) / 2 : s[m]!;
}

/** Otsu threshold on a grayscale buffer. */
function otsu(gray: Float32Array): number {
  const hist = new Array(256).fill(0) as number[];
  for (let i = 0; i < gray.length; i++) hist[Math.round(gray[i]!)]!++;
  const total = gray.length;
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t]!;
  let sumB = 0;
  let wB = 0;
  let best = 0;
  let bestT = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t]!;
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t]!;
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > best) {
      best = between;
      bestT = t;
    }
  }
  return bestT;
}

/** Extract typographic features from an image region. Returns null when no text-like content. */
function extractFeatures(
  img: HTMLImageElement,
  rect: { x: number; y: number; w: number; h: number } | null,
): Features | null {
  const fullW = img.naturalWidth;
  const fullH = img.naturalHeight;
  const rx = rect ? Math.max(0, Math.floor(rect.x)) : 0;
  const ry = rect ? Math.max(0, Math.floor(rect.y)) : 0;
  const rw = rect ? Math.min(fullW - rx, Math.floor(rect.w)) : fullW;
  const rh = rect ? Math.min(fullH - ry, Math.floor(rect.h)) : fullH;
  if (rw < 20 || rh < 12) return null;

  const scale = Math.min(1, 640 / rw);
  const w = Math.max(20, Math.round(rw * scale));
  const h = Math.max(12, Math.round(rh * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, rx, ry, rw, rh, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;

  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    gray[i] = 0.299 * data[i * 4]! + 0.587 * data[i * 4 + 1]! + 0.114 * data[i * 4 + 2]!;
  }
  const t = otsu(gray);
  const ink = new Uint8Array(w * h);
  let inkCount = 0;
  for (let i = 0; i < w * h; i++) {
    const v = gray[i]! < t ? 1 : 0;
    ink[i] = v;
    inkCount += v;
  }
  const inkRatio = inkCount / (w * h);
  if (inkRatio < 0.015 || inkRatio > 0.92) return null;

  // Row profile -> text band
  const rowInk = new Array(h).fill(0) as number[];
  for (let y = 0; y < h; y++) {
    let c = 0;
    for (let x = 0; x < w; x++) c += ink[y * w + x]!;
    rowInk[y] = c;
  }
  const rowThresh = w * 0.02;
  let top = -1;
  let bottom = -1;
  for (let y = 0; y < h; y++) {
    if (rowInk[y]! > rowThresh) {
      if (top === -1) top = y;
      bottom = y;
    }
  }
  if (top === -1 || bottom - top < 8) return null;
  const bandH = bottom - top + 1;

  // Horizontal ink runs per row
  const runsByRow: number[][] = [];
  for (let y = top; y <= bottom; y++) {
    const runs: number[] = [];
    let run = 0;
    for (let x = 0; x < w; x++) {
      if (ink[y * w + x]!) run++;
      else {
        if (run > 0) runs.push(run);
        run = 0;
      }
    }
    if (run > 0) runs.push(run);
    runsByRow.push(runs);
  }
  const mean = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);

  const edgeRows = Math.max(1, Math.floor(runsByRow.length * 0.12));
  const edgeRuns = [...runsByRow.slice(0, edgeRows), ...runsByRow.slice(-edgeRows)].flat();
  const midStart = Math.floor(runsByRow.length * 0.25);
  const midRuns = runsByRow.slice(midStart, midStart + Math.floor(runsByRow.length * 0.5)).flat();
  const midMean = mean(midRuns);
  const edgeMean = mean(edgeRuns);
  const serif = midMean > 0 ? clamp01(((edgeMean - midMean) / midMean) * 1.6) : 0;

  const midStd = Math.sqrt(mean(midRuns.map((r) => (r - midMean) * (r - midMean))));
  const contrast = midMean > 0 ? clamp01(midStd / midMean / 1.4) : 0;

  const weight = clamp01(median(midRuns) / bandH / 0.32);

  // Slant: horizontal shift of ink centroid between top and bottom thirds
  const centroidX = (y0: number, y1: number) => {
    let sx = 0;
    let c = 0;
    for (let y = y0; y < y1; y++) {
      for (let x = 0; x < w; x++) {
        if (ink[y * w + x]!) {
          sx += x;
          c++;
        }
      }
    }
    return c ? sx / c : w / 2;
  };
  const third = Math.max(1, Math.floor(bandH / 3));
  const dx = centroidX(bottom - third, bottom + 1) - centroidX(top, top + third);
  const slantDeg = (Math.atan2(dx, third * 2) * 180) / Math.PI;

  // Monospace: regularity of vertical ink-column clusters
  const colInk = new Array(w).fill(0) as number[];
  for (let x = 0; x < w; x++) {
    let c = 0;
    for (let y = top; y <= bottom; y++) c += ink[y * w + x]!;
    colInk[x] = c;
  }
  const colThresh = bandH * 0.08;
  const segments: { start: number; end: number }[] = [];
  let sStart = -1;
  for (let x = 0; x < w; x++) {
    if (colInk[x]! > colThresh) {
      if (sStart === -1) sStart = x;
    } else if (sStart !== -1) {
      segments.push({ start: sStart, end: x });
      sStart = -1;
    }
  }
  if (sStart !== -1) segments.push({ start: sStart, end: w });
  const pitches: number[] = [];
  for (let i = 1; i < segments.length; i++) pitches.push(segments[i]!.start - segments[i - 1]!.start);
  const pitchMean = mean(pitches);
  const pitchStd = Math.sqrt(mean(pitches.map((p) => (p - pitchMean) * (p - pitchMean))));
  const pitchCv = pitchMean > 0 ? pitchStd / pitchMean : 1;
  const mono = segments.length >= 4 && pitchCv < 0.28 ? 1 : 0;
  const condensed = !mono && segments.length >= 3 && pitchMean / bandH < 0.52 ? 1 : 0;

  // Script heuristic: high slant + connected columns (few segments relative to width)
  const script = Math.abs(slantDeg) > 3 && segments.length > 0 && w / segments.length / bandH > 1.1 ? 0.7 : 0;

  return {
    serif,
    contrast,
    weight,
    mono,
    condensed,
    script,
    rounded: 0,
    geometric: 0,
    slantDeg,
  };
}

function matchFonts(f: Features): Match[] {
  const scored = FONT_DB.map((font) => {
    let d = 0;
    d += 0.32 * (font.serif - f.serif) ** 2;
    d += 0.2 * (font.contrast - f.contrast) ** 2;
    d += 0.14 * (font.weight - f.weight) ** 2;
    d += 0.16 * (font.mono - f.mono) ** 2;
    d += 0.08 * (font.condensed - f.condensed) ** 2;
    d += 0.1 * (font.script - f.script) ** 2;
    const dist = Math.sqrt(d);
    return { name: font.name, score: Math.round(clamp01(1 - dist * 1.9) * 100), tags: font.tags };
  });
  return scored.sort((a, b) => b.score - a.score).slice(0, 6);
}

interface Selection {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Crop a region of the image to a displayable data URL (natural coords). */
function cropDataURL(
  img: HTMLImageElement,
  r: Selection,
  maxW = 360,
): string {
  const s = Math.min(1, maxW / Math.max(1, r.w));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(r.w * s));
  c.height = Math.max(1, Math.round(r.h * s));
  const ctx = c.getContext("2d");
  if (!ctx) return "";
  ctx.drawImage(img, r.x, r.y, r.w, r.h, 0, 0, c.width, c.height);
  return c.toDataURL("image/png");
}

/**
 * Split the full image into horizontal text bands using the ink row profile,
 * so "Analyze full image" can report a font match per text region instead of
 * one blended guess. Returns bands in natural image coords (max 6).
 */
function detectTextBands(img: HTMLImageElement): Selection[] {
  const scale = Math.min(1, 480 / img.naturalWidth);
  const w = Math.max(40, Math.round(img.naturalWidth * scale));
  const h = Math.max(24, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    gray[i] = 0.299 * data[i * 4]! + 0.587 * data[i * 4 + 1]! + 0.114 * data[i * 4 + 2]!;
  }
  const t = otsu(gray);
  const rowInk = new Array(h).fill(0) as number[];
  for (let y = 0; y < h; y++) {
    let c = 0;
    for (let x = 0; x < w; x++) if (gray[y * w + x]! < t) c++;
    rowInk[y] = c;
  }
  const thresh = w * 0.015;
  const raw: { top: number; bottom: number }[] = [];
  let top = -1;
  for (let y = 0; y < h; y++) {
    if (rowInk[y]! > thresh) {
      if (top === -1) top = y;
    } else if (top !== -1) {
      raw.push({ top, bottom: y - 1 });
      top = -1;
    }
  }
  if (top !== -1) raw.push({ top, bottom: h - 1 });
  // Merge bands split by small gaps (line spacing inside one block)
  const merged: { top: number; bottom: number }[] = [];
  for (const b of raw) {
    const last = merged[merged.length - 1];
    if (last && b.top - last.bottom <= 6) last.bottom = b.bottom;
    else merged.push({ ...b });
  }
  const k = 1 / scale;
  const out: Selection[] = [];
  for (const b of merged) {
    const bh = b.bottom - b.top + 1;
    if (bh < 8) continue;
    let left = w;
    let right = -1;
    for (let x = 0; x < w; x++) {
      for (let y = b.top; y <= b.bottom; y++) {
        if (gray[y * w + x]! < t) {
          if (x < left) left = x;
          if (x > right) right = x;
          break;
        }
      }
    }
    if (right <= left) continue;
    const pad = 6;
    out.push({
      x: Math.max(0, Math.round((left - pad) * k)),
      y: Math.max(0, Math.round((b.top - pad) * k)),
      w: Math.min(img.naturalWidth, Math.round((right - left + 1 + pad * 2) * k)),
      h: Math.min(img.naturalHeight, Math.round((bh + pad * 2) * k)),
    });
    if (out.length >= 6) break;
  }
  return out;
}

interface BandResult {
  rect: Selection;
  crop: string;
  matches: Match[];
}

function FontFinderTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("font-finder", isPro);
  const seo = getToolSeo("font-finder");

  const imgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ sx: number; sy: number } | null>(null);
  const [hasImage, setHasImage] = useState(false);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [sel, setSel] = useState<Selection | null>(null);
  const [drawing, setDrawing] = useState<Selection | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [features, setFeatures] = useState<Features | null>(null);
  const [matches, setMatches] = useState<Match[] | null>(null);
  /** Cropped preview of the analyzed selection (selection mode). */
  const [regionCrop, setRegionCrop] = useState<string | null>(null);
  /** Per text-region results (full-image mode). */
  const [bandResults, setBandResults] = useState<BandResult[] | null>(null);

  const loadFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
      setHasImage(true);
      setSel(null);
      setMatches(null);
      setFeatures(null);
      setRegionCrop(null);
      setBandResults(null);
      // NOTE: do NOT draw here - the preview canvas mounts only after
      // hasImage flips true, so drawing now hits a null ref. The effect
      // below draws on the next commit.
      URL.revokeObjectURL(url);
    };
    img.onerror = () => toast.error("Could not read that image.");
    img.src = url;
  };

  const drawImage = (img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const maxW = 880;
    const s = Math.min(1, maxW / img.naturalWidth);
    canvas.width = Math.round(img.naturalWidth * s);
    canvas.height = Math.round(img.naturalHeight * s);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  };

  // The canvas only exists once hasImage is true - draw after it mounts.
  useEffect(() => {
    if (hasImage && imgRef.current) drawImage(imgRef.current);
  }, [hasImage]);

  const canvasPos = (e: React.PointerEvent) => {
    const canvas = canvasRef.current!;
    const r = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * canvas.width,
      y: ((e.clientY - r.top) / r.height) * canvas.height,
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!hasImage) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const p = canvasPos(e);
    dragRef.current = { sx: p.x, sy: p.y };
    setDrawing({ x: p.x, y: p.y, w: 0, h: 0 });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const p = canvasPos(e);
    setDrawing({
      x: Math.min(d.sx, p.x),
      y: Math.min(d.sy, p.y),
      w: Math.abs(p.x - d.sx),
      h: Math.abs(p.y - d.sy),
    });
  };

  const onPointerUp = () => {
    const d = drawing;
    dragRef.current = null;
    setDrawing(null);
    if (d && d.w > 12 && d.h > 12) {
      // Convert display-canvas coords back to natural image coords
      const canvas = canvasRef.current!;
      const s = imgRef.current!.naturalWidth / canvas.width;
      setSel({ x: d.x * s, y: d.y * s, w: d.w * s, h: d.h * s });
    }
  };

  const analyze = (useSelection: boolean) => {
    const img = imgRef.current;
    if (!img) return;
    if (!trial.canUse) return;
    if (useSelection && !sel) {
      toast.warning("Draw a box around the text first, then hit Analyze selection.");
      return;
    }
    setAnalyzing(true);
    // Let the UI paint the spinner before the heavy pixel work
    setTimeout(() => {
      try {
        if (useSelection && sel) {
          // Single region: show exactly what was analyzed + its font matches.
          const f = extractFeatures(img, sel);
          if (!f) {
            toast.error("No clear text found - try a tighter selection around the words.");
            setAnalyzing(false);
            return;
          }
          setFeatures(f);
          setMatches(matchFonts(f));
          setRegionCrop(cropDataURL(img, sel));
          setBandResults(null);
          trial.recordUse();
        } else {
          // Full image: split into text bands, match a font per band.
          const bands = detectTextBands(img);
          if (bands.length === 0) {
            toast.error("No clear text found in this image.");
            setAnalyzing(false);
            return;
          }
          const results: BandResult[] = [];
          for (const b of bands) {
            const f = extractFeatures(img, b);
            if (!f) continue;
            results.push({ rect: b, crop: cropDataURL(img, b), matches: matchFonts(f).slice(0, 3) });
          }
          if (results.length === 0) {
            toast.error("No clear text found - try boxing one text block instead.");
            setAnalyzing(false);
            return;
          }
          setBandResults(results);
          setMatches(null);
          setFeatures(null);
          setRegionCrop(null);
          trial.recordUse();
          if (results.length > 1) {
            toast.success(`Found ${results.length} text regions - each matched separately.`);
          }
        }
      } catch {
        toast.error("Analysis failed on this image.");
      }
      setAnalyzing(false);
    }, 60);
  };

  const reset = () => {
    imgRef.current = null;
    setHasImage(false);
    setSel(null);
    setMatches(null);
    setFeatures(null);
    setRegionCrop(null);
    setBandResults(null);
  };

  const selPct = (s: Selection) => {
    const canvas = canvasRef.current;
    const dw = canvas?.width ?? 1;
    const dh = canvas?.height ?? 1;
    const img = imgRef.current;
    const k = img ? dw / img.naturalWidth : 1;
    return {
      left: `${(s.x * k * 100) / dw}%`,
      top: `${(s.y * k * 100) / dh}%`,
      width: `${(s.w * k * 100) / dw}%`,
      height: `${(s.h * k * 100) / dh}%`,
    };
  };

  const drawPct = drawing
    ? {
        left: `${(drawing.x * 100) / (canvasRef.current?.width ?? 1)}%`,
        top: `${(drawing.y * 100) / (canvasRef.current?.height ?? 1)}%`,
        width: `${(drawing.w * 100) / (canvasRef.current?.width ?? 1)}%`,
        height: `${(drawing.h * 100) / (canvasRef.current?.height ?? 1)}%`,
      }
    : null;

  const copyMatches = () => {
    if (!matches) return;
    navigator.clipboard
      .writeText(matches.map((m) => `${m.name} (${m.score}%)`).join("\n"))
      .then(() => toast.success("Matches copied"))
      .catch(() => toast.error("Copy failed"));
  };

  const weightLabel = (w: number) =>
    w < 0.1 ? "Light" : w < 0.18 ? "Regular" : w < 0.26 ? "Bold" : "Extra bold";
  const contrastLabel = (c: number) => (c < 0.25 ? "Low" : c < 0.55 ? "Medium" : "High");

  return (
    <ToolPageShell toolId="font-finder" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Font Finder" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="rounded-2xl border border-border bg-card p-5">
          {!hasImage ? (
            <label
              className="flex min-h-[320px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border text-center transition-colors hover:border-primary/50"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) loadFile(f);
              }}
            >
              <ImagePlus className="mb-3 h-10 w-10 text-muted-foreground/60" />
              <p className="font-semibold">Drop an image here, or click to upload</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                A screenshot, logo or poster containing text. Analysis runs in your browser - nothing is uploaded.
              </p>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) loadFile(f);
                }}
              />
            </label>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">
                  Drag a box around the text
                  <span className="ml-2 font-normal text-muted-foreground">
                    {imgSize.w}x{imgSize.h}px
                  </span>
                </p>
                <button
                  type="button"
                  onClick={reset}
                  className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> New image
                </button>
              </div>
              <div ref={wrapRef} className="relative mx-auto w-full max-w-[520px] overflow-hidden rounded-xl border border-border">
                <canvas
                  ref={canvasRef}
                  className="block w-full cursor-crosshair touch-none select-none"
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                />
                {sel && !drawing && (
                  <div
                    className="pointer-events-none absolute border-2 border-primary bg-primary/15"
                    style={selPct(sel)}
                  />
                )}
                {drawPct && (
                  <div
                    className="pointer-events-none absolute border-2 border-dashed border-primary bg-primary/10"
                    style={drawPct}
                  />
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <ActionButton disabled={!trial.canUse || analyzing} onClick={() => analyze(true)}>
                  <ScanSearch className="h-4 w-4" />
                  {analyzing ? "Analyzing..." : sel ? "Analyze selection" : "Analyze (draw a box first)"}
                </ActionButton>
                <button
                  type="button"
                  disabled={!trial.canUse || analyzing}
                  onClick={() => analyze(false)}
                  className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
                >
                  Analyze full image
                </button>
              </div>
              {!isPro && (
                <p className="mt-3 text-xs text-muted-foreground">
                  {trial.left} of {TOOL_TRIAL_LIMIT} free analyses left - your image never leaves this browser.
                </p>
              )}
            </>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {!matches && !bandResults ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
              <ScanSearch className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Closest matches appear here</p>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                Box one text block and hit Analyze selection to see that text with its font match -
                or Analyze full image to detect every text region and match each one.
              </p>
            </div>
          ) : bandResults ? (
            <>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-bold">Text regions found ({bandResults.length})</p>
                <button
                  type="button"
                  onClick={() =>
                    navigator.clipboard
                      .writeText(
                        bandResults
                          .map(
                            (b, i) =>
                              `Region ${i + 1}: ${b.matches[0]?.name ?? "-"} (${b.matches[0]?.score ?? 0}%)`,
                          )
                          .join("\n"),
                      )
                      .then(() => toast.success("Matches copied"))
                      .catch(() => toast.error("Copy failed"))
                  }
                  className="flex items-center gap-1.5 rounded-xl bg-muted px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground"
                >
                  <Copy className="h-3.5 w-3.5" /> Copy
                </button>
              </div>
              <div className="space-y-3">
                {bandResults.map((b, i) => {
                  const top = b.matches[0];
                  if (!top) return null;
                  return (
                    <div key={i} className="rounded-xl border border-border p-3.5">
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Region {i + 1} - detected text
                      </p>
                      {b.crop && (
                        <img
                          src={b.crop}
                          alt={`Detected text region ${i + 1}`}
                          className="mb-2.5 max-h-20 w-auto rounded-md border border-border bg-white"
                        />
                      )}
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold">
                          <span className="mr-2 text-xs font-black text-muted-foreground">#{1}</span>
                          {top.name}
                        </p>
                        <a
                          href={`https://fonts.google.com/?query=${encodeURIComponent(top.name)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex shrink-0 items-center gap-1 text-xs font-bold text-primary hover:underline"
                        >
                          Get font <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${top.score}%` }} />
                      </div>
                      <div className="mt-1.5 flex items-center justify-between">
                        <p className="text-[11px] text-muted-foreground">{top.tags.join(" - ")}</p>
                        <p className="font-mono text-xs font-bold">{top.score}%</p>
                      </div>
                      {b.matches.length > 1 && (
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          Also close:{" "}
                          {b.matches
                            .slice(1)
                            .map((m) => `${m.name} (${m.score}%)`)
                            .join(", ")}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                Best-guess matching from visual features - each region is scored separately, so a
                headline and body text get their own font suggestions.
              </p>
            </>
          ) : matches ? (
            <>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-bold">Closest matches</p>
                <button
                  type="button"
                  onClick={copyMatches}
                  className="flex items-center gap-1.5 rounded-xl bg-muted px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground"
                >
                  {<Copy className="h-3.5 w-3.5" />} Copy
                </button>
              </div>
              {regionCrop && (
                <div className="mb-4">
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Analyzed text
                  </p>
                  <img
                    src={regionCrop}
                    alt="Selected text that was analyzed"
                    className="max-h-28 w-auto rounded-lg border border-border bg-white"
                  />
                </div>
              )}
              {features && (
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {[
                    features.mono ? "Monospace" : features.serif > 0.45 ? "Serif" : "Sans-serif",
                    `${contrastLabel(features.contrast)} contrast`,
                    weightLabel(features.weight),
                    Math.abs(features.slantDeg) > 4 ? "Italic / oblique" : "Upright",
                    features.condensed ? "Condensed" : null,
                  ]
                    .filter(Boolean)
                    .map((chip) => (
                      <span
                        key={chip as string}
                        className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary"
                      >
                        <Check className="h-3 w-3" /> {chip}
                      </span>
                    ))}
                </div>
              )}
              <div className="space-y-3">
                {matches.map((m, i) => (
                  <div key={m.name} className="rounded-xl border border-border p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold" style={{ fontFamily: "inherit" }}>
                        <span className="mr-2 text-xs font-black text-muted-foreground">#{i + 1}</span>
                        {m.name}
                      </p>
                      <a
                        href={`https://fonts.google.com/?query=${encodeURIComponent(m.name)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex shrink-0 items-center gap-1 text-xs font-bold text-primary hover:underline"
                      >
                        Get font <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full", i === 0 ? "bg-primary" : "bg-primary/50")}
                        style={{ width: `${m.score}%` }}
                      />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <p className="text-[11px] text-muted-foreground">{m.tags.join(" - ")}</p>
                      <p className="font-mono text-xs font-bold">{m.score}%</p>
                    </div>
                    <p className="mt-2 text-2xl leading-none text-foreground/90" style={{ fontFamily: "inherit" }}>
                      Ag
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                Best-guess matching from visual features - always compare the suggested fonts against your image before using them.
              </p>
            </>
          ) : null}
        </div>
      </div>
    </ToolPageShell>
  );
}
