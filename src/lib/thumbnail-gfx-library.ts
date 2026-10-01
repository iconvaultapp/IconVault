// IconVault Thumbnail Studio - GFX template library.
//
// 500 trending templates built from the curated GFX asset pack
// (public/thumbs/gfx/). 12 layout archetypes x 15 niches, every template
// is a real Fabric v7 canvas JSON: text, colors and images stay editable.
// Skipped from the source pack: real-person photos, game characters,
// brand logos and weapons. No em dashes in any template copy.

import type { FabricCanvasJSON, FabricTemplateMeta } from "./thumbnail-fabric-library";

const TW = 1280;
const TH = 720;

type Obj = Record<string, unknown>;

const ORG: Obj = { originX: "left", originY: "top" };

// asset dimensions (from gfx-manifest.json, generated)
const ASSETS: Record<string, { w: number; h: number }> = {
  "/thumbs/gfx/gfx_arrow_01.webp": { w: 800, h: 450 },
  "/thumbs/gfx/gfx_arrow_02.webp": { w: 800, h: 450 },
  "/thumbs/gfx/gfx_arrow_03.webp": { w: 800, h: 450 },
  "/thumbs/gfx/gfx_arrow_04.webp": { w: 800, h: 450 },
  "/thumbs/gfx/gfx_arrow_05.webp": { w: 800, h: 450 },
  "/thumbs/gfx/gfx_arrow_06.webp": { w: 800, h: 450 },
  "/thumbs/gfx/gfx_arrow_07.webp": { w: 800, h: 450 },
  "/thumbs/gfx/gfx_arrow_08.webp": { w: 800, h: 450 },
  "/thumbs/gfx/gfx_arrow_09.webp": { w: 800, h: 450 },
  "/thumbs/gfx/gfx_arrow_10.webp": { w: 800, h: 450 },
  "/thumbs/gfx/gfx_arrow_11.webp": { w: 800, h: 450 },
  "/thumbs/gfx/gfx_arrow_12.webp": { w: 800, h: 450 },
  "/thumbs/gfx/gfx_hand_01.webp": { w: 800, h: 533 },
  "/thumbs/gfx/gfx_hand_02.webp": { w: 800, h: 450 },
  "/thumbs/gfx/gfx_hand_03.webp": { w: 800, h: 450 },
  "/thumbs/gfx/gfx_hand_04.webp": { w: 800, h: 450 },
  "/thumbs/gfx/gfx_hand_05.webp": { w: 800, h: 472 },
  "/thumbs/gfx/gfx_hand_06.webp": { w: 800, h: 533 },
  "/thumbs/gfx/gfx_hand_07.webp": { w: 800, h: 532 },
  "/thumbs/gfx/gfx_hand_08.webp": { w: 800, h: 450 },
  "/thumbs/gfx/gfx_money_01.webp": { w: 417, h: 417 },
  "/thumbs/gfx/gfx_money_02.webp": { w: 800, h: 753 },
  "/thumbs/gfx/gfx_money_03.webp": { w: 800, h: 450 },
  "/thumbs/gfx/gfx_money_04.webp": { w: 417, h: 417 },
  "/thumbs/gfx/gfx_money_05.webp": { w: 594, h: 800 },
  "/thumbs/gfx/gfx_money_06.webp": { w: 416, h: 416 },
  "/thumbs/gfx/gfx_money_07.webp": { w: 800, h: 457 },
  "/thumbs/gfx/gfx_money_08.webp": { w: 800, h: 693 },
  "/thumbs/gfx/gfx_money_09.webp": { w: 800, h: 682 },
  "/thumbs/gfx/gfx_fire_01.webp": { w: 800, h: 450 },
  "/thumbs/gfx/gfx_fire_02.webp": { w: 661, h: 661 },
  "/thumbs/gfx/gfx_fire_03.webp": { w: 687, h: 800 },
  "/thumbs/gfx/gfx_fire_04.webp": { w: 800, h: 343 },
  "/thumbs/gfx/gfx_fire_05.webp": { w: 800, h: 613 },
  "/thumbs/gfx/gfx_fire_06.webp": { w: 787, h: 800 },
  "/thumbs/gfx/gfx_fire_07.webp": { w: 800, h: 533 },
  "/thumbs/gfx/gfx_device_01.webp": { w: 800, h: 450 },
  "/thumbs/gfx/gfx_device_02.webp": { w: 800, h: 513 },
  "/thumbs/gfx/gfx_device_03.webp": { w: 528, h: 800 },
  "/thumbs/gfx/gfx_device_04.webp": { w: 709, h: 800 },
  "/thumbs/gfx/gfx_device_05.webp": { w: 800, h: 448 },
  "/thumbs/gfx/gfx_device_06.webp": { w: 800, h: 527 },
  "/thumbs/gfx/gfx_device_07.webp": { w: 285, h: 549 },
  "/thumbs/gfx/gfx_device_08.webp": { w: 768, h: 435 },
  "/thumbs/gfx/gfx_device_09.webp": { w: 418, h: 673 },
  "/thumbs/gfx/gfx_device_10.webp": { w: 800, h: 800 },
  "/thumbs/gfx/gfx_mic_01.webp": { w: 800, h: 559 },
  "/thumbs/gfx/gfx_char_01.webp": { w: 239, h: 800 },
  "/thumbs/gfx/gfx_border_01.webp": { w: 800, h: 450 },
  "/thumbs/gfx/gfx_border_02.webp": { w: 800, h: 450 },
  "/thumbs/gfx/gfx_border_03.webp": { w: 800, h: 450 },
  "/thumbs/gfx/gfx_border_04.webp": { w: 800, h: 450 },
  "/thumbs/gfx/gfx_border_05.webp": { w: 800, h: 450 },
  "/thumbs/gfx/gfx_border_06.webp": { w: 800, h: 450 },
  "/thumbs/gfx/gfx_border_07.webp": { w: 800, h: 450 },
  "/thumbs/gfx/gfx_bg_01.webp": { w: 1280, h: 944 },
  "/thumbs/gfx/gfx_bg_02.webp": { w: 1280, h: 720 },
  "/thumbs/gfx/gfx_bg_03.webp": { w: 1280, h: 720 },
  "/thumbs/gfx/gfx_bg_04.webp": { w: 1280, h: 720 },
  "/thumbs/gfx/gfx_bg_05.webp": { w: 1280, h: 721 },
  "/thumbs/gfx/gfx_bg_06.webp": { w: 1280, h: 717 },
  "/thumbs/gfx/gfx_bg_07.webp": { w: 1280, h: 720 },
  "/thumbs/gfx/gfx_bg_08.webp": { w: 1280, h: 720 },
  "/thumbs/gfx/gfx_bg_09.webp": { w: 1280, h: 720 },
  "/thumbs/gfx/gfx_bg_10.webp": { w: 1280, h: 720 },
  "/thumbs/gfx/gfx_bg_11.webp": { w: 1280, h: 720 },
  "/thumbs/gfx/gfx_bg_12.webp": { w: 1280, h: 853 },
  "/thumbs/gfx/gfx_bg_13.webp": { w: 1280, h: 719 },
  "/thumbs/gfx/gfx_bg_14.webp": { w: 1280, h: 742 },
  "/thumbs/gfx/gfx_bg_15.webp": { w: 1280, h: 720 },
  "/thumbs/gfx/gfx_bg_16.webp": { w: 1280, h: 853 },
  "/thumbs/gfx/gfx_bg_17.webp": { w: 1280, h: 720 },
  "/thumbs/gfx/gfx_bg_18.webp": { w: 1280, h: 720 },
  "/thumbs/gfx/gfx_bg_19.webp": { w: 1280, h: 720 },
  "/thumbs/gfx/gfx_bg_20.webp": { w: 1280, h: 720 },
  "/thumbs/gfx/gfx_bg_21.webp": { w: 1280, h: 720 },
  "/thumbs/gfx/gfx_bg_22.webp": { w: 1280, h: 720 },
  "/thumbs/gfx/gfx_bg_23.webp": { w: 1280, h: 720 },
  "/thumbs/gfx/gfx_bg_24.webp": { w: 1280, h: 720 },
  "/thumbs/gfx/gfx_bg_25.webp": { w: 1280, h: 720 },
  "/thumbs/gfx/gfx_bg_26.webp": { w: 1280, h: 720 },
  "/thumbs/gfx/gfx_bg_27.webp": { w: 1280, h: 720 },
  "/thumbs/gfx/gfx_bg_28.webp": { w: 1280, h: 720 },
  "/thumbs/gfx/gfx_bg_29.webp": { w: 1280, h: 720 },
  "/thumbs/gfx/gfx_bg_30.webp": { w: 1280, h: 720 },
  "/thumbs/gfx/gfx_bg_31.webp": { w: 1280, h: 720 },
  "/thumbs/gfx/gfx_bg_32.webp": { w: 1280, h: 720 },
  "/thumbs/gfx/gfx_bg_33.webp": { w: 1280, h: 720 },
  "/thumbs/gfx/gfx_bg_34.webp": { w: 1280, h: 720 },
  "/thumbs/gfx/gfx_bg_35.webp": { w: 1280, h: 720 },
  "/thumbs/gfx/gfx_bg_36.webp": { w: 1280, h: 720 },
  "/thumbs/gfx/gfx_bg_37.webp": { w: 1280, h: 850 },
  "/thumbs/gfx/gfx_bg_38.webp": { w: 1280, h: 844 },
  "/thumbs/gfx/gfx_bg_39.webp": { w: 1280, h: 810 },
  "/thumbs/gfx/gfx_bg_40.webp": { w: 1280, h: 810 },
  "/thumbs/gfx/gfx_bg_41.webp": { w: 1280, h: 853 },
  "/thumbs/gfx/gfx_bg_42.webp": { w: 1280, h: 719 },
  "/thumbs/gfx/gfx_bg_43.webp": { w: 1280, h: 720 },
  "/thumbs/gfx/gfx_bg_44.webp": { w: 1280, h: 720 },
  "/thumbs/gfx/gfx_bg_45.webp": { w: 1280, h: 731 },
  "/thumbs/gfx/gfx_bg_46.webp": { w: 1280, h: 720 },
  "/thumbs/gfx/gfx_bg_47.webp": { w: 1280, h: 695 },
  "/thumbs/gfx/gfx_bg_48.webp": { w: 1280, h: 717 },
  "/thumbs/gfx/gfx_bg_49.webp": { w: 1280, h: 724 },
  "/thumbs/gfx/gfx_bg_50.webp": { w: 1280, h: 720 },
  "/thumbs/gfx/gfx_bg_51.webp": { w: 1280, h: 849 },
  "/thumbs/gfx/gfx_bg_52.webp": { w: 1280, h: 853 },
  "/thumbs/gfx/gfx_bg_53.webp": { w: 1280, h: 853 },
  "/thumbs/gfx/gfx_animal_01.webp": { w: 800, h: 594 },
  "/thumbs/gfx/gfx_animal_02.webp": { w: 626, h: 800 },
  "/thumbs/gfx/gfx_animal_03.webp": { w: 800, h: 734 },
  "/thumbs/gfx/gfx_animal_04.webp": { w: 800, h: 407 },
  "/thumbs/gfx/gfx_animal_05.webp": { w: 800, h: 324 },
  "/thumbs/gfx/gfx_animal_06.webp": { w: 800, h: 800 },
  "/thumbs/gfx/gfx_animal_07.webp": { w: 800, h: 531 },
  "/thumbs/gfx/gfx_animal_08.webp": { w: 800, h: 800 },
  "/thumbs/gfx/gfx_face_01.webp": { w: 800, h: 444 },
  "/thumbs/gfx/gfx_face_02.webp": { w: 630, h: 800 },
  "/thumbs/gfx/gfx_face_03.webp": { w: 800, h: 639 },
  "/thumbs/gfx/gfx_face_04.webp": { w: 800, h: 450 },
  "/thumbs/gfx/gfx_face_05.webp": { w: 800, h: 800 },
  "/thumbs/gfx/gfx_face_06.webp": { w: 612, h: 800 },
  "/thumbs/gfx/gfx_abstract_01.webp": { w: 800, h: 450 },
  "/thumbs/gfx/gfx_abstract_02.webp": { w: 800, h: 450 },
  "/thumbs/gfx/gfx_abstract_03.webp": { w: 800, h: 450 },
  "/thumbs/gfx/gfx_abstract_04.webp": { w: 800, h: 450 },
  "/thumbs/gfx/gfx_abstract_05.webp": { w: 800, h: 450 },
  "/thumbs/gfx/gfx_abstract_06.webp": { w: 800, h: 450 },
  "/thumbs/gfx/gfx_blood_01.webp": { w: 317, h: 800 },
  "/thumbs/gfx/gfx_blood_02.webp": { w: 362, h: 800 },
  "/thumbs/gfx/gfx_blood_03.webp": { w: 800, h: 625 },
  "/thumbs/gfx/gfx_tex_01.webp": { w: 533, h: 800 },
  "/thumbs/gfx/gfx_tex_02.webp": { w: 800, h: 533 },
  "/thumbs/gfx/gfx_tex_03.webp": { w: 701, h: 438 },
  "/thumbs/gfx/gfx_tex_04.webp": { w: 800, h: 600 },
};

const GFX = (f: string) => `/thumbs/gfx/${f}`;

const bgRect = (fill: unknown): Obj => ({
  type: "rect", name: "bg", left: 0, top: 0, width: TW, height: TH,
  fill, ...ORG, selectable: false, evented: false, hoverCursor: "default",
});

const coverBg = (file: string, opacity = 1): Obj => {
  const a = ASSETS[`/thumbs/gfx/${file}`] ?? { w: 1280, h: 720 };
  const s = Math.max(TW / a.w, TH / a.h);
  const dw = a.w * s, dh = a.h * s;
  return {
    type: "image", name: "bg", src: GFX(file), crossOrigin: "anonymous",
    left: (TW - dw) / 2, top: (TH - dh) / 2, width: a.w, height: a.h,
    scaleX: s, scaleY: s, opacity, ...ORG,
    selectable: false, evented: false, hoverCursor: "default",
  };
};

const cutout = (file: string, cx: number, cy: number, targetW: number, o: Obj = {}): Obj => {
  const a = ASSETS[`/thumbs/gfx/${file}`] ?? { w: 400, h: 400 };
  const s = targetW / a.w;
  const dw = targetW, dh = a.h * s;
  return {
    type: "image", name: "cutout", src: GFX(file), crossOrigin: "anonymous",
    left: cx - dw / 2, top: cy - dh / 2, width: a.w, height: a.h,
    scaleX: s, scaleY: s, ...ORG, ...o,
  };
};

const txt = (text: string, o: Obj): Obj => ({ type: "textbox", text, ...ORG, ...o });

const head = (text: string, left: number, top: number, width: number, size: number, fill = "#ffffff", strokeW = 0, align = "left"): Obj =>
  txt(text, {
    left, top, width, fontFamily: "Anton", fontSize: size, fontWeight: "400", fill,
    lineHeight: 0.95, textAlign: align,
    ...(strokeW ? { stroke: "#0a0a0a", strokeWidth: strokeW, paintFirst: "stroke" } : {}),
  });

const sub = (text: string, left: number, top: number, width: number, size = 34, fill = "#f1f5f9"): Obj =>
  txt(text, { left, top, width, fontFamily: "Montserrat", fontSize: size, fontWeight: "700", fill });

const pill = (label: string, left: number, top: number, bgc: string, fgc = "#ffffff", size = 30): Obj[] => {
  const w = Math.round(label.length * size * 0.68 + 60);
  const h = size + 30;
  return [
    { type: "rect", left, top, width: w, height: h, rx: h / 2, ry: h / 2, fill: bgc, ...ORG },
    txt(label, {
      left: left + 30, top: top + 15, width: w - 60, fontFamily: "Montserrat",
      fontSize: size, fontWeight: "800", fill: fgc, textAlign: "center",
    }),
  ];
};

const ring = (cx: number, cy: number, r: number, color: string, w = 12): Obj => ({
  type: "circle", left: cx - r, top: cy - r, radius: r, width: r * 2, height: r * 2,
  fill: "rgba(0,0,0,0)", stroke: color, strokeWidth: w, ...ORG,
});

const starburst = (cx: number, cy: number, r: number, fill: string, label: string): Obj[] => {
  const pts: { x: number; y: number }[] = [];
  const spikes = 14;
  for (let i = 0; i < spikes * 2; i++) {
    const rr = i % 2 === 0 ? r : r * 0.8;
    const a = (Math.PI / spikes) * i - Math.PI / 2;
    pts.push({ x: rr * Math.cos(a), y: rr * Math.sin(a) });
  }
  return [
    { type: "polygon", left: cx - r, top: cy - r, points: pts, fill, stroke: "#0a0a0a", strokeWidth: 6, ...ORG },
    txt(label, {
      left: cx - r, top: cy - 32, width: r * 2, fontFamily: "Anton",
      fontSize: 46, fill: "#0a0a0a", textAlign: "center",
    }),
  ];
};

const gradOverlay = (): Obj => ({
  type: "rect", left: 0, top: 0, width: TW, height: TH, ...ORG,
  selectable: false, evented: false,
  fill: {
    type: "linear",
    coords: { x1: 0, y1: 0, x2: 0, y2: TH },
    colorStops: [
      { offset: 0, color: "rgba(0,0,0,0)" },
      { offset: 0.55, color: "rgba(0,0,0,0.25)" },
      { offset: 1, color: "rgba(0,0,0,0.85)" },
    ],
  },
});

const circleCutout = (file: string, cx: number, cy: number, r: number): Obj => {
  const a = ASSETS[`/thumbs/gfx/${file}`] ?? { w: 400, h: 400 };
  const s = (r * 2.1) / Math.min(a.w, a.h);
  const dw = a.w * s, dh = a.h * s;
  return {
    type: "image", name: "cutout", src: GFX(file), crossOrigin: "anonymous",
    left: cx - dw / 2, top: cy - dh / 2, width: a.w, height: a.h,
    scaleX: s, scaleY: s, ...ORG,
    clipPath: {
      type: "circle", radius: r, originX: "center", originY: "center",
      left: 0, top: 0, fill: "#000000",
    },
  };
};

interface GfxDef {
  niche: string; arch: string; accent: string;
  bg: string; cuts: string[]; screen: boolean[];
  headline: string; kicker: string; subline: string;
  flip: boolean; seed: number;
}

function archSplit(d: GfxDef): Obj[] {
  return [
    bgRect("#0f0f14"),
    coverBg(d.bg),
    { type: "rect", left: 700, top: 0, width: 580, height: TH, fill: d.accent, ...ORG },
    ...pill(d.kicker, 744, 64, "#facc15", "#111111"),
    head(d.headline, 744, 170, 492, 112),
    sub(d.subline, 744, 566, 492, 34, "#ffffff"),
  ];
}

function archCinematic(d: GfxDef): Obj[] {
  return [
    bgRect("#0f0f14"),
    coverBg(d.bg),
    gradOverlay(),
    ...pill(d.kicker, 64, 56, d.accent),
    { type: "rect", left: 68, top: 400, width: 120, height: 14, fill: "#facc15", ...ORG },
    head(d.headline, 64, 430, 1152, 160),
    sub(d.subline, 68, 636, 1152, 32, "#e2e8f0"),
  ];
}

function archArrow(d: GfxDef): Obj[] {
  const objs: Obj[] = [bgRect("#0f0f14"), coverBg(d.bg, 0.85), gradOverlay()];
  if (d.cuts[0]) objs.push(cutout(d.cuts[0], 1010, 250, 430, { angle: d.flip ? -18 : 14, opacity: 0.95 }));
  objs.push(head(d.headline, 64, 200, 760, 132, "#ffffff", 8));
  objs.push(sub(d.subline, 68, 560, 760, 36, "#facc15"));
  objs.push(...pill(d.kicker, 64, 100, d.accent));
  return objs;
}

function archCircle(d: GfxDef): Obj[] {
  const objs: Obj[] = [
    bgRect({ type: "linear", coords: { x1: 0, y1: 0, x2: 0, y2: TH },
      colorStops: [{ offset: 0, color: "#1d1d30" }, { offset: 1, color: "#0b0b13" }] }),
  ];
  if (d.cuts[0]) {
    objs.push(ring(992, 360, 240, d.accent, 14));
    objs.push(circleCutout(d.cuts[0], 992, 360, 226));
  }
  objs.push(...pill(d.kicker, 64, 120, d.accent));
  objs.push(head(d.headline, 64, 220, 620, 118));
  objs.push(sub(d.subline, 64, 540, 620, 36, "#e2e8f0"));
  return objs;
}

function archMoney(d: GfxDef): Obj[] {
  const objs: Obj[] = [bgRect("#0a0a0a"), coverBg(d.bg, 0.3)];
  const spots: [number, number, number][] = [[280, 500, 420], [1000, 430, 300], [1050, 620, 280]];
  d.cuts.slice(0, 3).forEach((f, i) => {
    const [x, y, w] = spots[i] ?? [640, 360, 300];
    objs.push(cutout(f, x, y, w, { angle: (d.seed % 2 === 0 ? 1 : -1) * (8 + i * 7) }));
  });
  objs.push(head(d.headline, 64, 120, 1152, 150, "#4ade80", 6, "center"));
  objs.push(sub(d.subline, 64, 600, 1152, 36, "#facc15"));
  return objs;
}

function archFire(d: GfxDef): Obj[] {
  const objs: Obj[] = [bgRect("#140806"), coverBg(d.bg, 0.45)];
  d.cuts.slice(0, 2).forEach((f, i) => {
    objs.push(cutout(f, i === 0 ? 320 : 980, i === 0 ? 520 : 260, i === 0 ? 480 : 560,
      { globalCompositeOperation: "screen", opacity: 0.95 }));
  });
  objs.push(head(d.headline, 64, 180, 1152, 150, "#ffffff", 10, "center"));
  objs.push(sub(d.subline, 64, 590, 1152, 36, "#fdba74"));
  return objs;
}

function archGraph(d: GfxDef): Obj[] {
  const pts: { x: number; y: number }[] = [];
  const n = 9;
  for (let i = 0; i < n; i++) {
    const x = 120 + (i * 1040) / (n - 1);
    const base = 560 - i * 42;
    const dip = (d.seed >> i) % 3 === 0 ? 60 : 0;
    pts.push({ x, y: base + dip });
  }
  const last = pts[pts.length - 1]!;
  return [
    bgRect("#0b1020"),
    coverBg(d.bg, 0.35),
    { type: "polyline", points: pts, fill: "rgba(0,0,0,0)", stroke: d.accent, strokeWidth: 16,
      strokeLineJoin: "round", strokeLineCap: "round", ...ORG },
    { type: "triangle", left: last.x - 55, top: last.y - 110, width: 110, height: 110,
      fill: d.accent, angle: 45, ...ORG },
    ...pill(d.kicker, 64, 64, d.accent),
    head(d.headline, 64, 150, 900, 120),
    sub(d.subline, 68, 600, 900, 34, "#e2e8f0"),
  ];
}

function archDevice(d: GfxDef): Obj[] {
  const objs: Obj[] = [
    bgRect({ type: "linear", coords: { x1: 0, y1: 0, x2: TW, y2: TH },
      colorStops: [{ offset: 0, color: "#101528" }, { offset: 1, color: "#0a0a12" }] }),
  ];
  if (d.cuts[0]) objs.push(cutout(d.cuts[0], 950, 380, 560));
  objs.push(...pill(d.kicker, 64, 120, d.accent));
  objs.push(head(d.headline, 64, 220, 560, 116));
  objs.push(sub(d.subline, 64, 560, 560, 34, "#e2e8f0"));
  return objs;
}

function archHand(d: GfxDef): Obj[] {
  const objs: Obj[] = [bgRect("#0f0f14"), coverBg(d.bg), gradOverlay()];
  if (d.cuts[0]) objs.push(cutout(d.cuts[0], 1020, 470, 480, { flipX: d.flip }));
  objs.push({ type: "rect", left: 56, top: 120, width: 640, height: 420, rx: 28, ry: 28,
    fill: "rgba(10,10,14,0.82)", stroke: d.accent, strokeWidth: 6, ...ORG });
  objs.push(head(d.headline, 96, 180, 560, 104));
  objs.push(sub(d.subline, 100, 470, 560, 32, "#facc15"));
  return objs;
}

function archBanner(d: GfxDef): Obj[] {
  const objs: Obj[] = [bgRect("#0f0f14"), coverBg(d.bg)];
  objs.push({ type: "rect", left: 0, top: 0, width: TW, height: 210, fill: d.accent, ...ORG });
  objs.push(head(d.headline, 48, 40, 1184, 104, "#ffffff", 0, "center"));
  if (d.cuts[0]) objs.push(cutout(d.cuts[0], 1050, 520, 400));
  objs.push(sub(d.subline, 64, 600, 700, 36, "#ffffff"));
  objs.push(...pill(d.kicker, 64, 250, "#111111", "#ffffff"));
  return objs;
}

function archMinimal(d: GfxDef): Obj[] {
  const objs: Obj[] = [bgRect(d.accent)];
  objs.push({ type: "circle", left: 390, top: 130, radius: 250, width: 500, height: 500,
    fill: "rgba(255,255,255,0.12)", ...ORG });
  if (d.cuts[0]) objs.push(cutout(d.cuts[0], 640, 400, 620));
  objs.push(...pill(d.kicker, 590, 36, "#ffffff", d.accent, 26));
  objs.push(head(d.headline, 64, 600, 1152, 92, "#ffffff", 0, "center"));
  return objs;
}

function archVs(d: GfxDef): Obj[] {
  const half = (file: string, left: number): Obj => {
    const a = ASSETS[`/thumbs/gfx/${file}`] ?? { w: 1280, h: 720 };
    const s = Math.max(640 / a.w, TH / a.h);
    const dw = a.w * s, dh = a.h * s;
    const cropX = (dw - 640) / 2 / s; // center-crop the covered image to the 640px half
    return {
      type: "image", name: "bg", src: GFX(file), crossOrigin: "anonymous",
      left, top: (TH - dh) / 2, width: 640 / s, height: a.h,
      cropX, scaleX: s, scaleY: s, ...ORG, selectable: false, evented: false,
    };
  };
  const objs: Obj[] = [bgRect("#0f0f14")];
  if (d.bg) objs.push(half(d.bg, 0));
  if (d.cuts[0]) objs.push(half(d.cuts[0], 640));
  objs.push({ type: "rect", left: 628, top: 0, width: 24, height: TH, fill: "#ffffff", ...ORG });
  objs.push(...starburst(640, 360, 120, "#facc15", "VS"));
  objs.push(head(d.headline, 64, 36, 1152, 108, "#ffffff", 8, "center"));
  objs.push(sub(d.subline, 64, 620, 1152, 32, "#facc15"));
  return objs;
}

const ARCH_BUILDERS: Record<string, (d: GfxDef) => Obj[]> = {
  split: archSplit, cinematic: archCinematic, arrow: archArrow, circle: archCircle,
  money: archMoney, fire: archFire, graph: archGraph, device: archDevice,
  hand: archHand, banner: archBanner, minimal: archMinimal, vs: archVs,
};


// ---------- 500 template definitions (generated) ----------
const DEFS: (GfxDef & { id: string })[] = [
  { id: "gx-001", niche: "entertainment", arch: "split", accent: "#dc2626", bg: "gfx_bg_01.webp", cuts: [], screen: [], headline: "INSANE MOMENT", kicker: "VIRAL", subline: "you have to see this", flip: true, seed: 0 },
  { id: "gx-002", niche: "entertainment", arch: "cinematic", accent: "#dc2626", bg: "gfx_bg_04.webp", cuts: [], screen: [], headline: "EXPOSED", kicker: "TRUTH", subline: "what really happened", flip: false, seed: 31 },
  { id: "gx-003", niche: "entertainment", arch: "arrow", accent: "#dc2626", bg: "gfx_bg_07.webp", cuts: ["gfx_arrow_03.webp"], screen: [false], headline: "TOP 10", kicker: "RANKED", subline: "craziest moments ever", flip: true, seed: 62 },
  { id: "gx-004", niche: "entertainment", arch: "circle", accent: "#dc2626", bg: "gfx_bg_10.webp", cuts: ["gfx_face_01.webp"], screen: [false], headline: "HE CRIED", kicker: "EMOTIONAL", subline: "nobody expected this", flip: false, seed: 93 },
  { id: "gx-005", niche: "entertainment", arch: "money", accent: "#dc2626", bg: "gfx_bg_13.webp", cuts: ["gfx_money_05.webp", "gfx_money_01.webp", "gfx_money_07.webp"], screen: [false, false, false], headline: "GONE WRONG", kicker: "FAIL", subline: "watch till the end", flip: true, seed: 124 },
  { id: "gx-006", niche: "entertainment", arch: "fire", accent: "#dc2626", bg: "gfx_bg_16.webp", cuts: ["gfx_fire_06.webp", "gfx_fire_03.webp"], screen: [true, true], headline: "SECRET REVEALED", kicker: "LEAKED", subline: "the truth is out", flip: false, seed: 155 },
  { id: "gx-007", niche: "entertainment", arch: "graph", accent: "#dc2626", bg: "gfx_bg_19.webp", cuts: [], screen: [], headline: "INSANE MOMENT", kicker: "VIRAL", subline: "you have to see this", flip: true, seed: 186 },
  { id: "gx-008", niche: "entertainment", arch: "device", accent: "#dc2626", bg: "gfx_bg_22.webp", cuts: ["gfx_device_08.webp"], screen: [false], headline: "EXPOSED", kicker: "TRUTH", subline: "what really happened", flip: false, seed: 217 },
  { id: "gx-009", niche: "entertainment", arch: "hand", accent: "#dc2626", bg: "gfx_bg_25.webp", cuts: ["gfx_hand_01.webp"], screen: [false], headline: "TOP 10", kicker: "RANKED", subline: "craziest moments ever", flip: true, seed: 248 },
  { id: "gx-010", niche: "entertainment", arch: "banner", accent: "#dc2626", bg: "gfx_bg_28.webp", cuts: ["gfx_face_01.webp"], screen: [false], headline: "HE CRIED", kicker: "EMOTIONAL", subline: "nobody expected this", flip: false, seed: 279 },
  { id: "gx-011", niche: "entertainment", arch: "minimal", accent: "#dc2626", bg: "gfx_bg_31.webp", cuts: ["gfx_face_03.webp"], screen: [false], headline: "GONE WRONG", kicker: "FAIL", subline: "watch till the end", flip: true, seed: 310 },
  { id: "gx-012", niche: "entertainment", arch: "vs", accent: "#dc2626", bg: "gfx_bg_34.webp", cuts: ["gfx_bg_21.webp"], screen: [false], headline: "SECRET REVEALED", kicker: "LEAKED", subline: "the truth is out", flip: false, seed: 341 },
  { id: "gx-013", niche: "entertainment", arch: "split", accent: "#dc2626", bg: "gfx_bg_37.webp", cuts: [], screen: [], headline: "INSANE MOMENT", kicker: "VIRAL", subline: "you have to see this", flip: true, seed: 372 },
  { id: "gx-014", niche: "entertainment", arch: "cinematic", accent: "#dc2626", bg: "gfx_bg_40.webp", cuts: [], screen: [], headline: "EXPOSED", kicker: "TRUTH", subline: "what really happened", flip: false, seed: 403 },
  { id: "gx-015", niche: "entertainment", arch: "arrow", accent: "#dc2626", bg: "gfx_bg_43.webp", cuts: ["gfx_arrow_03.webp"], screen: [false], headline: "TOP 10", kicker: "RANKED", subline: "craziest moments ever", flip: true, seed: 434 },
  { id: "gx-016", niche: "entertainment", arch: "circle", accent: "#dc2626", bg: "gfx_bg_46.webp", cuts: ["gfx_face_01.webp"], screen: [false], headline: "HE CRIED", kicker: "EMOTIONAL", subline: "nobody expected this", flip: false, seed: 465 },
  { id: "gx-017", niche: "entertainment", arch: "money", accent: "#dc2626", bg: "gfx_bg_49.webp", cuts: ["gfx_money_08.webp", "gfx_money_04.webp", "gfx_money_01.webp"], screen: [false, false, false], headline: "GONE WRONG", kicker: "FAIL", subline: "watch till the end", flip: true, seed: 496 },
  { id: "gx-018", niche: "entertainment", arch: "fire", accent: "#dc2626", bg: "gfx_bg_52.webp", cuts: ["gfx_fire_04.webp", "gfx_fire_01.webp"], screen: [true, true], headline: "SECRET REVEALED", kicker: "LEAKED", subline: "the truth is out", flip: false, seed: 527 },
  { id: "gx-019", niche: "entertainment", arch: "graph", accent: "#dc2626", bg: "gfx_bg_02.webp", cuts: [], screen: [], headline: "INSANE MOMENT", kicker: "VIRAL", subline: "you have to see this", flip: true, seed: 558 },
  { id: "gx-020", niche: "entertainment", arch: "device", accent: "#dc2626", bg: "gfx_bg_05.webp", cuts: ["gfx_device_10.webp"], screen: [false], headline: "EXPOSED", kicker: "TRUTH", subline: "what really happened", flip: false, seed: 589 },
  { id: "gx-021", niche: "entertainment", arch: "hand", accent: "#dc2626", bg: "gfx_bg_08.webp", cuts: ["gfx_hand_05.webp"], screen: [false], headline: "TOP 10", kicker: "RANKED", subline: "craziest moments ever", flip: true, seed: 620 },
  { id: "gx-022", niche: "entertainment", arch: "banner", accent: "#dc2626", bg: "gfx_bg_11.webp", cuts: ["gfx_face_01.webp"], screen: [false], headline: "HE CRIED", kicker: "EMOTIONAL", subline: "nobody expected this", flip: false, seed: 651 },
  { id: "gx-023", niche: "entertainment", arch: "minimal", accent: "#dc2626", bg: "gfx_bg_14.webp", cuts: ["gfx_face_03.webp"], screen: [false], headline: "GONE WRONG", kicker: "FAIL", subline: "watch till the end", flip: true, seed: 682 },
  { id: "gx-024", niche: "entertainment", arch: "vs", accent: "#dc2626", bg: "gfx_bg_17.webp", cuts: ["gfx_bg_04.webp"], screen: [false], headline: "SECRET REVEALED", kicker: "LEAKED", subline: "the truth is out", flip: false, seed: 713 },
  { id: "gx-025", niche: "entertainment", arch: "split", accent: "#dc2626", bg: "gfx_bg_20.webp", cuts: [], screen: [], headline: "INSANE MOMENT", kicker: "VIRAL", subline: "you have to see this", flip: true, seed: 744 },
  { id: "gx-026", niche: "entertainment", arch: "cinematic", accent: "#dc2626", bg: "gfx_bg_23.webp", cuts: [], screen: [], headline: "EXPOSED", kicker: "TRUTH", subline: "what really happened", flip: false, seed: 775 },
  { id: "gx-027", niche: "entertainment", arch: "arrow", accent: "#dc2626", bg: "gfx_bg_26.webp", cuts: ["gfx_arrow_03.webp"], screen: [false], headline: "TOP 10", kicker: "RANKED", subline: "craziest moments ever", flip: true, seed: 806 },
  { id: "gx-028", niche: "entertainment", arch: "circle", accent: "#dc2626", bg: "gfx_bg_29.webp", cuts: ["gfx_face_01.webp"], screen: [false], headline: "HE CRIED", kicker: "EMOTIONAL", subline: "nobody expected this", flip: false, seed: 837 },
  { id: "gx-029", niche: "entertainment", arch: "money", accent: "#dc2626", bg: "gfx_bg_32.webp", cuts: ["gfx_money_02.webp", "gfx_money_07.webp", "gfx_money_04.webp"], screen: [false, false, false], headline: "GONE WRONG", kicker: "FAIL", subline: "watch till the end", flip: true, seed: 868 },
  { id: "gx-030", niche: "entertainment", arch: "fire", accent: "#dc2626", bg: "gfx_bg_35.webp", cuts: ["gfx_fire_02.webp", "gfx_fire_06.webp"], screen: [true, true], headline: "SECRET REVEALED", kicker: "LEAKED", subline: "the truth is out", flip: false, seed: 899 },
  { id: "gx-031", niche: "entertainment", arch: "graph", accent: "#dc2626", bg: "gfx_bg_38.webp", cuts: [], screen: [], headline: "INSANE MOMENT", kicker: "VIRAL", subline: "you have to see this", flip: true, seed: 930 },
  { id: "gx-032", niche: "entertainment", arch: "device", accent: "#dc2626", bg: "gfx_bg_41.webp", cuts: ["gfx_device_02.webp"], screen: [false], headline: "EXPOSED", kicker: "TRUTH", subline: "what really happened", flip: false, seed: 961 },
  { id: "gx-033", niche: "entertainment", arch: "hand", accent: "#dc2626", bg: "gfx_bg_44.webp", cuts: ["gfx_hand_01.webp"], screen: [false], headline: "TOP 10", kicker: "RANKED", subline: "craziest moments ever", flip: true, seed: 992 },
  { id: "gx-034", niche: "entertainment", arch: "banner", accent: "#dc2626", bg: "gfx_bg_47.webp", cuts: ["gfx_face_01.webp"], screen: [false], headline: "HE CRIED", kicker: "EMOTIONAL", subline: "nobody expected this", flip: false, seed: 1023 },
  { id: "gx-035", niche: "gaming", arch: "split", accent: "#7c3aed", bg: "gfx_bg_08.webp", cuts: [], screen: [], headline: "INSANE CLUTCH", kicker: "LIVE", subline: "1v5 comeback", flip: true, seed: 1 },
  { id: "gx-036", niche: "gaming", arch: "cinematic", accent: "#7c3aed", bg: "gfx_bg_11.webp", cuts: [], screen: [], headline: "WORLD RECORD", kicker: "SPEEDRUN", subline: "new record broken", flip: false, seed: 32 },
  { id: "gx-037", niche: "gaming", arch: "arrow", accent: "#7c3aed", bg: "gfx_bg_14.webp", cuts: ["gfx_arrow_06.webp"], screen: [false], headline: "PRO vs NOOB", kicker: "RANKED", subline: "who wins", flip: true, seed: 63 },
  { id: "gx-038", niche: "gaming", arch: "circle", accent: "#7c3aed", bg: "gfx_bg_17.webp", cuts: ["gfx_face_06.webp"], screen: [false], headline: "SECRET TRICK", kicker: "TIPS", subline: "99 percent dont know this", flip: false, seed: 94 },
  { id: "gx-039", niche: "gaming", arch: "money", accent: "#7c3aed", bg: "gfx_bg_20.webp", cuts: ["gfx_money_05.webp", "gfx_money_01.webp", "gfx_money_07.webp"], screen: [false, false, false], headline: "RAGE QUIT", kicker: "FUNNY", subline: "he lost it", flip: true, seed: 125 },
  { id: "gx-040", niche: "gaming", arch: "fire", accent: "#7c3aed", bg: "gfx_bg_23.webp", cuts: ["gfx_fire_06.webp", "gfx_fire_03.webp"], screen: [true, true], headline: "NEW UPDATE", kicker: "PATCH", subline: "everything changed", flip: false, seed: 156 },
  { id: "gx-041", niche: "gaming", arch: "graph", accent: "#7c3aed", bg: "gfx_bg_26.webp", cuts: [], screen: [], headline: "INSANE CLUTCH", kicker: "LIVE", subline: "1v5 comeback", flip: true, seed: 187 },
  { id: "gx-042", niche: "gaming", arch: "device", accent: "#7c3aed", bg: "gfx_bg_29.webp", cuts: ["gfx_device_09.webp"], screen: [false], headline: "WORLD RECORD", kicker: "SPEEDRUN", subline: "new record broken", flip: false, seed: 218 },
  { id: "gx-043", niche: "gaming", arch: "hand", accent: "#7c3aed", bg: "gfx_bg_32.webp", cuts: ["gfx_hand_02.webp"], screen: [false], headline: "PRO vs NOOB", kicker: "RANKED", subline: "who wins", flip: true, seed: 249 },
  { id: "gx-044", niche: "gaming", arch: "banner", accent: "#7c3aed", bg: "gfx_bg_35.webp", cuts: ["gfx_face_06.webp"], screen: [false], headline: "SECRET TRICK", kicker: "TIPS", subline: "99 percent dont know this", flip: false, seed: 280 },
  { id: "gx-045", niche: "gaming", arch: "minimal", accent: "#7c3aed", bg: "gfx_bg_38.webp", cuts: ["gfx_face_02.webp"], screen: [false], headline: "RAGE QUIT", kicker: "FUNNY", subline: "he lost it", flip: true, seed: 311 },
  { id: "gx-046", niche: "gaming", arch: "vs", accent: "#7c3aed", bg: "gfx_bg_41.webp", cuts: ["gfx_bg_28.webp"], screen: [false], headline: "NEW UPDATE", kicker: "PATCH", subline: "everything changed", flip: false, seed: 342 },
  { id: "gx-047", niche: "gaming", arch: "split", accent: "#7c3aed", bg: "gfx_bg_44.webp", cuts: [], screen: [], headline: "INSANE CLUTCH", kicker: "LIVE", subline: "1v5 comeback", flip: true, seed: 373 },
  { id: "gx-048", niche: "gaming", arch: "cinematic", accent: "#7c3aed", bg: "gfx_bg_47.webp", cuts: [], screen: [], headline: "WORLD RECORD", kicker: "SPEEDRUN", subline: "new record broken", flip: false, seed: 404 },
  { id: "gx-049", niche: "gaming", arch: "arrow", accent: "#7c3aed", bg: "gfx_bg_50.webp", cuts: ["gfx_arrow_06.webp"], screen: [false], headline: "PRO vs NOOB", kicker: "RANKED", subline: "who wins", flip: true, seed: 435 },
  { id: "gx-050", niche: "gaming", arch: "circle", accent: "#7c3aed", bg: "gfx_bg_53.webp", cuts: ["gfx_face_06.webp"], screen: [false], headline: "SECRET TRICK", kicker: "TIPS", subline: "99 percent dont know this", flip: false, seed: 466 },
  { id: "gx-051", niche: "gaming", arch: "money", accent: "#7c3aed", bg: "gfx_bg_03.webp", cuts: ["gfx_money_08.webp", "gfx_money_04.webp", "gfx_money_01.webp"], screen: [false, false, false], headline: "RAGE QUIT", kicker: "FUNNY", subline: "he lost it", flip: true, seed: 497 },
  { id: "gx-052", niche: "gaming", arch: "fire", accent: "#7c3aed", bg: "gfx_bg_06.webp", cuts: ["gfx_fire_04.webp", "gfx_fire_01.webp"], screen: [true, true], headline: "NEW UPDATE", kicker: "PATCH", subline: "everything changed", flip: false, seed: 528 },
  { id: "gx-053", niche: "gaming", arch: "graph", accent: "#7c3aed", bg: "gfx_bg_09.webp", cuts: [], screen: [], headline: "INSANE CLUTCH", kicker: "LIVE", subline: "1v5 comeback", flip: true, seed: 559 },
  { id: "gx-054", niche: "gaming", arch: "device", accent: "#7c3aed", bg: "gfx_bg_12.webp", cuts: ["gfx_device_01.webp"], screen: [false], headline: "WORLD RECORD", kicker: "SPEEDRUN", subline: "new record broken", flip: false, seed: 590 },
  { id: "gx-055", niche: "gaming", arch: "hand", accent: "#7c3aed", bg: "gfx_bg_15.webp", cuts: ["gfx_hand_06.webp"], screen: [false], headline: "PRO vs NOOB", kicker: "RANKED", subline: "who wins", flip: true, seed: 621 },
  { id: "gx-056", niche: "gaming", arch: "banner", accent: "#7c3aed", bg: "gfx_bg_18.webp", cuts: ["gfx_face_06.webp"], screen: [false], headline: "SECRET TRICK", kicker: "TIPS", subline: "99 percent dont know this", flip: false, seed: 652 },
  { id: "gx-057", niche: "gaming", arch: "minimal", accent: "#7c3aed", bg: "gfx_bg_21.webp", cuts: ["gfx_face_02.webp"], screen: [false], headline: "RAGE QUIT", kicker: "FUNNY", subline: "he lost it", flip: true, seed: 683 },
  { id: "gx-058", niche: "gaming", arch: "vs", accent: "#7c3aed", bg: "gfx_bg_24.webp", cuts: ["gfx_bg_11.webp"], screen: [false], headline: "NEW UPDATE", kicker: "PATCH", subline: "everything changed", flip: false, seed: 714 },
  { id: "gx-059", niche: "gaming", arch: "split", accent: "#7c3aed", bg: "gfx_bg_27.webp", cuts: [], screen: [], headline: "INSANE CLUTCH", kicker: "LIVE", subline: "1v5 comeback", flip: true, seed: 745 },
  { id: "gx-060", niche: "gaming", arch: "cinematic", accent: "#7c3aed", bg: "gfx_bg_30.webp", cuts: [], screen: [], headline: "WORLD RECORD", kicker: "SPEEDRUN", subline: "new record broken", flip: false, seed: 776 },
  { id: "gx-061", niche: "gaming", arch: "arrow", accent: "#7c3aed", bg: "gfx_bg_33.webp", cuts: ["gfx_arrow_06.webp"], screen: [false], headline: "PRO vs NOOB", kicker: "RANKED", subline: "who wins", flip: true, seed: 807 },
  { id: "gx-062", niche: "gaming", arch: "circle", accent: "#7c3aed", bg: "gfx_bg_36.webp", cuts: ["gfx_face_06.webp"], screen: [false], headline: "SECRET TRICK", kicker: "TIPS", subline: "99 percent dont know this", flip: false, seed: 838 },
  { id: "gx-063", niche: "gaming", arch: "money", accent: "#7c3aed", bg: "gfx_bg_39.webp", cuts: ["gfx_money_02.webp", "gfx_money_07.webp", "gfx_money_04.webp"], screen: [false, false, false], headline: "RAGE QUIT", kicker: "FUNNY", subline: "he lost it", flip: true, seed: 869 },
  { id: "gx-064", niche: "gaming", arch: "fire", accent: "#7c3aed", bg: "gfx_bg_42.webp", cuts: ["gfx_fire_02.webp", "gfx_fire_06.webp"], screen: [true, true], headline: "NEW UPDATE", kicker: "PATCH", subline: "everything changed", flip: false, seed: 900 },
  { id: "gx-065", niche: "gaming", arch: "graph", accent: "#7c3aed", bg: "gfx_bg_45.webp", cuts: [], screen: [], headline: "INSANE CLUTCH", kicker: "LIVE", subline: "1v5 comeback", flip: true, seed: 931 },
  { id: "gx-066", niche: "gaming", arch: "device", accent: "#7c3aed", bg: "gfx_bg_48.webp", cuts: ["gfx_device_03.webp"], screen: [false], headline: "WORLD RECORD", kicker: "SPEEDRUN", subline: "new record broken", flip: false, seed: 962 },
  { id: "gx-067", niche: "gaming", arch: "hand", accent: "#7c3aed", bg: "gfx_bg_51.webp", cuts: ["gfx_hand_02.webp"], screen: [false], headline: "PRO vs NOOB", kicker: "RANKED", subline: "who wins", flip: true, seed: 993 },
  { id: "gx-068", niche: "gaming", arch: "banner", accent: "#7c3aed", bg: "gfx_bg_01.webp", cuts: ["gfx_face_06.webp"], screen: [false], headline: "SECRET TRICK", kicker: "TIPS", subline: "99 percent dont know this", flip: false, seed: 1024 },
  { id: "gx-069", niche: "travel", arch: "split", accent: "#0284c7", bg: "gfx_bg_15.webp", cuts: [], screen: [], headline: "HIDDEN PARADISE", kicker: "VLOG", subline: "nobody knows this place", flip: true, seed: 2 },
  { id: "gx-070", niche: "travel", arch: "cinematic", accent: "#0284c7", bg: "gfx_bg_18.webp", cuts: [], screen: [], headline: "$100 CHALLENGE", kicker: "TRAVEL", subline: "24 hours here", flip: false, seed: 33 },
  { id: "gx-071", niche: "travel", arch: "arrow", accent: "#0284c7", bg: "gfx_bg_21.webp", cuts: ["gfx_arrow_09.webp"], screen: [false], headline: "I MOVED HERE", kicker: "VLOG", subline: "best decision ever", flip: true, seed: 64 },
  { id: "gx-072", niche: "travel", arch: "circle", accent: "#0284c7", bg: "gfx_bg_24.webp", cuts: ["gfx_animal_01.webp"], screen: [false], headline: "TOP 5 PLACES", kicker: "GUIDE", subline: "visit before 2027", flip: false, seed: 95 },
  { id: "gx-073", niche: "travel", arch: "money", accent: "#0284c7", bg: "gfx_bg_27.webp", cuts: ["gfx_money_05.webp", "gfx_money_01.webp", "gfx_money_07.webp"], screen: [false, false, false], headline: "SCAM ALERT", kicker: "WARNING", subline: "tourists watch out", flip: true, seed: 126 },
  { id: "gx-074", niche: "travel", arch: "fire", accent: "#0284c7", bg: "gfx_bg_30.webp", cuts: ["gfx_fire_06.webp", "gfx_fire_03.webp"], screen: [true, true], headline: "DREAM TRIP", kicker: "ITINERARY", subline: "7 days full plan", flip: false, seed: 157 },
  { id: "gx-075", niche: "travel", arch: "graph", accent: "#0284c7", bg: "gfx_bg_33.webp", cuts: [], screen: [], headline: "HIDDEN PARADISE", kicker: "VLOG", subline: "nobody knows this place", flip: true, seed: 188 },
  { id: "gx-076", niche: "travel", arch: "device", accent: "#0284c7", bg: "gfx_bg_36.webp", cuts: ["gfx_device_10.webp"], screen: [false], headline: "$100 CHALLENGE", kicker: "TRAVEL", subline: "24 hours here", flip: false, seed: 219 },
  { id: "gx-077", niche: "travel", arch: "hand", accent: "#0284c7", bg: "gfx_bg_39.webp", cuts: ["gfx_hand_03.webp"], screen: [false], headline: "I MOVED HERE", kicker: "VLOG", subline: "best decision ever", flip: true, seed: 250 },
  { id: "gx-078", niche: "travel", arch: "banner", accent: "#0284c7", bg: "gfx_bg_42.webp", cuts: ["gfx_animal_05.webp"], screen: [false], headline: "TOP 5 PLACES", kicker: "GUIDE", subline: "visit before 2027", flip: false, seed: 281 },
  { id: "gx-079", niche: "travel", arch: "minimal", accent: "#0284c7", bg: "gfx_bg_45.webp", cuts: ["gfx_animal_07.webp"], screen: [false], headline: "SCAM ALERT", kicker: "WARNING", subline: "tourists watch out", flip: true, seed: 312 },
  { id: "gx-080", niche: "travel", arch: "vs", accent: "#0284c7", bg: "gfx_bg_48.webp", cuts: ["gfx_bg_35.webp"], screen: [false], headline: "DREAM TRIP", kicker: "ITINERARY", subline: "7 days full plan", flip: false, seed: 343 },
  { id: "gx-081", niche: "travel", arch: "split", accent: "#0284c7", bg: "gfx_bg_51.webp", cuts: [], screen: [], headline: "HIDDEN PARADISE", kicker: "VLOG", subline: "nobody knows this place", flip: true, seed: 374 },
  { id: "gx-082", niche: "travel", arch: "cinematic", accent: "#0284c7", bg: "gfx_bg_01.webp", cuts: [], screen: [], headline: "$100 CHALLENGE", kicker: "TRAVEL", subline: "24 hours here", flip: false, seed: 405 },
  { id: "gx-083", niche: "travel", arch: "arrow", accent: "#0284c7", bg: "gfx_bg_04.webp", cuts: ["gfx_arrow_09.webp"], screen: [false], headline: "I MOVED HERE", kicker: "VLOG", subline: "best decision ever", flip: true, seed: 436 },
  { id: "gx-084", niche: "travel", arch: "circle", accent: "#0284c7", bg: "gfx_bg_07.webp", cuts: ["gfx_animal_01.webp"], screen: [false], headline: "TOP 5 PLACES", kicker: "GUIDE", subline: "visit before 2027", flip: false, seed: 467 },
  { id: "gx-085", niche: "travel", arch: "money", accent: "#0284c7", bg: "gfx_bg_10.webp", cuts: ["gfx_money_08.webp", "gfx_money_04.webp", "gfx_money_01.webp"], screen: [false, false, false], headline: "SCAM ALERT", kicker: "WARNING", subline: "tourists watch out", flip: true, seed: 498 },
  { id: "gx-086", niche: "travel", arch: "fire", accent: "#0284c7", bg: "gfx_bg_13.webp", cuts: ["gfx_fire_04.webp", "gfx_fire_01.webp"], screen: [true, true], headline: "DREAM TRIP", kicker: "ITINERARY", subline: "7 days full plan", flip: false, seed: 529 },
  { id: "gx-087", niche: "travel", arch: "graph", accent: "#0284c7", bg: "gfx_bg_16.webp", cuts: [], screen: [], headline: "HIDDEN PARADISE", kicker: "VLOG", subline: "nobody knows this place", flip: true, seed: 560 },
  { id: "gx-088", niche: "travel", arch: "device", accent: "#0284c7", bg: "gfx_bg_19.webp", cuts: ["gfx_device_02.webp"], screen: [false], headline: "$100 CHALLENGE", kicker: "TRAVEL", subline: "24 hours here", flip: false, seed: 591 },
  { id: "gx-089", niche: "travel", arch: "hand", accent: "#0284c7", bg: "gfx_bg_22.webp", cuts: ["gfx_hand_07.webp"], screen: [false], headline: "I MOVED HERE", kicker: "VLOG", subline: "best decision ever", flip: true, seed: 622 },
  { id: "gx-090", niche: "travel", arch: "banner", accent: "#0284c7", bg: "gfx_bg_25.webp", cuts: ["gfx_animal_05.webp"], screen: [false], headline: "TOP 5 PLACES", kicker: "GUIDE", subline: "visit before 2027", flip: false, seed: 653 },
  { id: "gx-091", niche: "travel", arch: "minimal", accent: "#0284c7", bg: "gfx_bg_28.webp", cuts: ["gfx_animal_07.webp"], screen: [false], headline: "SCAM ALERT", kicker: "WARNING", subline: "tourists watch out", flip: true, seed: 684 },
  { id: "gx-092", niche: "travel", arch: "vs", accent: "#0284c7", bg: "gfx_bg_31.webp", cuts: ["gfx_bg_18.webp"], screen: [false], headline: "DREAM TRIP", kicker: "ITINERARY", subline: "7 days full plan", flip: false, seed: 715 },
  { id: "gx-093", niche: "travel", arch: "split", accent: "#0284c7", bg: "gfx_bg_34.webp", cuts: [], screen: [], headline: "HIDDEN PARADISE", kicker: "VLOG", subline: "nobody knows this place", flip: true, seed: 746 },
  { id: "gx-094", niche: "travel", arch: "cinematic", accent: "#0284c7", bg: "gfx_bg_37.webp", cuts: [], screen: [], headline: "$100 CHALLENGE", kicker: "TRAVEL", subline: "24 hours here", flip: false, seed: 777 },
  { id: "gx-095", niche: "travel", arch: "arrow", accent: "#0284c7", bg: "gfx_bg_40.webp", cuts: ["gfx_arrow_09.webp"], screen: [false], headline: "I MOVED HERE", kicker: "VLOG", subline: "best decision ever", flip: true, seed: 808 },
  { id: "gx-096", niche: "travel", arch: "circle", accent: "#0284c7", bg: "gfx_bg_43.webp", cuts: ["gfx_animal_01.webp"], screen: [false], headline: "TOP 5 PLACES", kicker: "GUIDE", subline: "visit before 2027", flip: false, seed: 839 },
  { id: "gx-097", niche: "travel", arch: "money", accent: "#0284c7", bg: "gfx_bg_46.webp", cuts: ["gfx_money_02.webp", "gfx_money_07.webp", "gfx_money_04.webp"], screen: [false, false, false], headline: "SCAM ALERT", kicker: "WARNING", subline: "tourists watch out", flip: true, seed: 870 },
  { id: "gx-098", niche: "travel", arch: "fire", accent: "#0284c7", bg: "gfx_bg_49.webp", cuts: ["gfx_fire_02.webp", "gfx_fire_06.webp"], screen: [true, true], headline: "DREAM TRIP", kicker: "ITINERARY", subline: "7 days full plan", flip: false, seed: 901 },
  { id: "gx-099", niche: "travel", arch: "graph", accent: "#0284c7", bg: "gfx_bg_52.webp", cuts: [], screen: [], headline: "HIDDEN PARADISE", kicker: "VLOG", subline: "nobody knows this place", flip: true, seed: 932 },
  { id: "gx-100", niche: "travel", arch: "device", accent: "#0284c7", bg: "gfx_bg_02.webp", cuts: ["gfx_device_04.webp"], screen: [false], headline: "$100 CHALLENGE", kicker: "TRAVEL", subline: "24 hours here", flip: false, seed: 963 },
  { id: "gx-101", niche: "travel", arch: "hand", accent: "#0284c7", bg: "gfx_bg_05.webp", cuts: ["gfx_hand_03.webp"], screen: [false], headline: "I MOVED HERE", kicker: "VLOG", subline: "best decision ever", flip: true, seed: 994 },
  { id: "gx-102", niche: "travel", arch: "banner", accent: "#0284c7", bg: "gfx_bg_08.webp", cuts: ["gfx_animal_05.webp"], screen: [false], headline: "TOP 5 PLACES", kicker: "GUIDE", subline: "visit before 2027", flip: false, seed: 1025 },
  { id: "gx-103", niche: "finance", arch: "split", accent: "#15803d", bg: "gfx_bg_22.webp", cuts: [], screen: [], headline: "$10K MONTH", kicker: "PROOF", subline: "my exact steps", flip: true, seed: 3 },
  { id: "gx-104", niche: "finance", arch: "cinematic", accent: "#15803d", bg: "gfx_bg_25.webp", cuts: [], screen: [], headline: "STOP DOING THIS", kicker: "MONEY", subline: "you are losing cash", flip: false, seed: 34 },
  { id: "gx-105", niche: "finance", arch: "arrow", accent: "#15803d", bg: "gfx_bg_28.webp", cuts: ["gfx_arrow_12.webp"], screen: [false], headline: "5 PASSIVE IDEAS", kicker: "2026", subline: "earn while you sleep", flip: true, seed: 65 },
  { id: "gx-106", niche: "finance", arch: "circle", accent: "#15803d", bg: "gfx_bg_31.webp", cuts: ["gfx_money_04.webp"], screen: [false], headline: "I LOST $5K", kicker: "LESSON", subline: "avoid my mistake", flip: false, seed: 96 },
  { id: "gx-107", niche: "finance", arch: "money", accent: "#15803d", bg: "gfx_bg_34.webp", cuts: ["gfx_money_05.webp", "gfx_money_01.webp", "gfx_money_07.webp"], screen: [false, false, false], headline: "RICH vs BROKE", kicker: "MINDSET", subline: "one habit difference", flip: true, seed: 127 },
  { id: "gx-108", niche: "finance", arch: "fire", accent: "#15803d", bg: "gfx_bg_37.webp", cuts: ["gfx_fire_06.webp", "gfx_fire_03.webp"], screen: [true, true], headline: "CRYPTO PUMP", kicker: "ALERT", subline: "what happens next", flip: false, seed: 158 },
  { id: "gx-109", niche: "finance", arch: "graph", accent: "#15803d", bg: "gfx_bg_40.webp", cuts: [], screen: [], headline: "$10K MONTH", kicker: "PROOF", subline: "my exact steps", flip: true, seed: 189 },
  { id: "gx-110", niche: "finance", arch: "device", accent: "#15803d", bg: "gfx_bg_43.webp", cuts: ["gfx_device_01.webp"], screen: [false], headline: "STOP DOING THIS", kicker: "MONEY", subline: "you are losing cash", flip: false, seed: 220 },
  { id: "gx-111", niche: "finance", arch: "hand", accent: "#15803d", bg: "gfx_bg_46.webp", cuts: ["gfx_hand_04.webp"], screen: [false], headline: "5 PASSIVE IDEAS", kicker: "2026", subline: "earn while you sleep", flip: true, seed: 251 },
  { id: "gx-112", niche: "finance", arch: "banner", accent: "#15803d", bg: "gfx_bg_49.webp", cuts: ["gfx_money_07.webp"], screen: [false], headline: "I LOST $5K", kicker: "LESSON", subline: "avoid my mistake", flip: false, seed: 282 },
  { id: "gx-113", niche: "finance", arch: "minimal", accent: "#15803d", bg: "gfx_bg_52.webp", cuts: ["gfx_money_09.webp"], screen: [false], headline: "RICH vs BROKE", kicker: "MINDSET", subline: "one habit difference", flip: true, seed: 313 },
  { id: "gx-114", niche: "finance", arch: "vs", accent: "#15803d", bg: "gfx_bg_02.webp", cuts: ["gfx_bg_42.webp"], screen: [false], headline: "CRYPTO PUMP", kicker: "ALERT", subline: "what happens next", flip: false, seed: 344 },
  { id: "gx-115", niche: "finance", arch: "split", accent: "#15803d", bg: "gfx_bg_05.webp", cuts: [], screen: [], headline: "$10K MONTH", kicker: "PROOF", subline: "my exact steps", flip: true, seed: 375 },
  { id: "gx-116", niche: "finance", arch: "cinematic", accent: "#15803d", bg: "gfx_bg_08.webp", cuts: [], screen: [], headline: "STOP DOING THIS", kicker: "MONEY", subline: "you are losing cash", flip: false, seed: 406 },
  { id: "gx-117", niche: "finance", arch: "arrow", accent: "#15803d", bg: "gfx_bg_11.webp", cuts: ["gfx_arrow_12.webp"], screen: [false], headline: "5 PASSIVE IDEAS", kicker: "2026", subline: "earn while you sleep", flip: true, seed: 437 },
  { id: "gx-118", niche: "finance", arch: "circle", accent: "#15803d", bg: "gfx_bg_14.webp", cuts: ["gfx_money_01.webp"], screen: [false], headline: "I LOST $5K", kicker: "LESSON", subline: "avoid my mistake", flip: false, seed: 468 },
  { id: "gx-119", niche: "finance", arch: "money", accent: "#15803d", bg: "gfx_bg_17.webp", cuts: ["gfx_money_08.webp", "gfx_money_04.webp", "gfx_money_01.webp"], screen: [false, false, false], headline: "RICH vs BROKE", kicker: "MINDSET", subline: "one habit difference", flip: true, seed: 499 },
  { id: "gx-120", niche: "finance", arch: "fire", accent: "#15803d", bg: "gfx_bg_20.webp", cuts: ["gfx_fire_04.webp", "gfx_fire_01.webp"], screen: [true, true], headline: "CRYPTO PUMP", kicker: "ALERT", subline: "what happens next", flip: false, seed: 530 },
  { id: "gx-121", niche: "finance", arch: "graph", accent: "#15803d", bg: "gfx_bg_23.webp", cuts: [], screen: [], headline: "$10K MONTH", kicker: "PROOF", subline: "my exact steps", flip: true, seed: 561 },
  { id: "gx-122", niche: "finance", arch: "device", accent: "#15803d", bg: "gfx_bg_26.webp", cuts: ["gfx_device_03.webp"], screen: [false], headline: "STOP DOING THIS", kicker: "MONEY", subline: "you are losing cash", flip: false, seed: 592 },
  { id: "gx-123", niche: "finance", arch: "hand", accent: "#15803d", bg: "gfx_bg_29.webp", cuts: ["gfx_hand_08.webp"], screen: [false], headline: "5 PASSIVE IDEAS", kicker: "2026", subline: "earn while you sleep", flip: true, seed: 623 },
  { id: "gx-124", niche: "finance", arch: "banner", accent: "#15803d", bg: "gfx_bg_32.webp", cuts: ["gfx_money_04.webp"], screen: [false], headline: "I LOST $5K", kicker: "LESSON", subline: "avoid my mistake", flip: false, seed: 654 },
  { id: "gx-125", niche: "finance", arch: "minimal", accent: "#15803d", bg: "gfx_bg_35.webp", cuts: ["gfx_money_06.webp"], screen: [false], headline: "RICH vs BROKE", kicker: "MINDSET", subline: "one habit difference", flip: true, seed: 685 },
  { id: "gx-126", niche: "finance", arch: "vs", accent: "#15803d", bg: "gfx_bg_38.webp", cuts: ["gfx_bg_25.webp"], screen: [false], headline: "CRYPTO PUMP", kicker: "ALERT", subline: "what happens next", flip: false, seed: 716 },
  { id: "gx-127", niche: "finance", arch: "split", accent: "#15803d", bg: "gfx_bg_41.webp", cuts: [], screen: [], headline: "$10K MONTH", kicker: "PROOF", subline: "my exact steps", flip: true, seed: 747 },
  { id: "gx-128", niche: "finance", arch: "cinematic", accent: "#15803d", bg: "gfx_bg_44.webp", cuts: [], screen: [], headline: "STOP DOING THIS", kicker: "MONEY", subline: "you are losing cash", flip: false, seed: 778 },
  { id: "gx-129", niche: "finance", arch: "arrow", accent: "#15803d", bg: "gfx_bg_47.webp", cuts: ["gfx_arrow_12.webp"], screen: [false], headline: "5 PASSIVE IDEAS", kicker: "2026", subline: "earn while you sleep", flip: true, seed: 809 },
  { id: "gx-130", niche: "finance", arch: "circle", accent: "#15803d", bg: "gfx_bg_50.webp", cuts: ["gfx_money_07.webp"], screen: [false], headline: "I LOST $5K", kicker: "LESSON", subline: "avoid my mistake", flip: false, seed: 840 },
  { id: "gx-131", niche: "finance", arch: "money", accent: "#15803d", bg: "gfx_bg_53.webp", cuts: ["gfx_money_02.webp", "gfx_money_07.webp", "gfx_money_04.webp"], screen: [false, false, false], headline: "RICH vs BROKE", kicker: "MINDSET", subline: "one habit difference", flip: true, seed: 871 },
  { id: "gx-132", niche: "finance", arch: "fire", accent: "#15803d", bg: "gfx_bg_03.webp", cuts: ["gfx_fire_02.webp", "gfx_fire_06.webp"], screen: [true, true], headline: "CRYPTO PUMP", kicker: "ALERT", subline: "what happens next", flip: false, seed: 902 },
  { id: "gx-133", niche: "finance", arch: "graph", accent: "#15803d", bg: "gfx_bg_06.webp", cuts: [], screen: [], headline: "$10K MONTH", kicker: "PROOF", subline: "my exact steps", flip: true, seed: 933 },
  { id: "gx-134", niche: "finance", arch: "device", accent: "#15803d", bg: "gfx_bg_09.webp", cuts: ["gfx_device_05.webp"], screen: [false], headline: "STOP DOING THIS", kicker: "MONEY", subline: "you are losing cash", flip: false, seed: 964 },
  { id: "gx-135", niche: "finance", arch: "hand", accent: "#15803d", bg: "gfx_bg_12.webp", cuts: ["gfx_hand_04.webp"], screen: [false], headline: "5 PASSIVE IDEAS", kicker: "2026", subline: "earn while you sleep", flip: true, seed: 995 },
  { id: "gx-136", niche: "finance", arch: "banner", accent: "#15803d", bg: "gfx_bg_15.webp", cuts: ["gfx_money_01.webp"], screen: [false], headline: "I LOST $5K", kicker: "LESSON", subline: "avoid my mistake", flip: false, seed: 1026 },
  { id: "gx-137", niche: "business", arch: "split", accent: "#1e3a8b", bg: "gfx_bg_29.webp", cuts: [], screen: [], headline: "ZERO TO CEO", kicker: "CASE STUDY", subline: "my playbook", flip: true, seed: 4 },
  { id: "gx-138", niche: "business", arch: "cinematic", accent: "#1e3a8b", bg: "gfx_bg_32.webp", cuts: [], screen: [], headline: "I GOT FIRED", kicker: "STORY", subline: "then this happened", flip: false, seed: 35 },
  { id: "gx-139", niche: "business", arch: "arrow", accent: "#1e3a8b", bg: "gfx_bg_35.webp", cuts: ["gfx_arrow_03.webp"], screen: [false], headline: "$1M IDEA", kicker: "STARTUP", subline: "how we did it", flip: true, seed: 66 },
  { id: "gx-140", niche: "business", arch: "circle", accent: "#1e3a8b", bg: "gfx_bg_38.webp", cuts: ["gfx_device_07.webp"], screen: [false], headline: "5 AM CEO", kicker: "ROUTINE", subline: "my full day", flip: false, seed: 97 },
  { id: "gx-141", niche: "business", arch: "money", accent: "#1e3a8b", bg: "gfx_bg_41.webp", cuts: ["gfx_money_05.webp", "gfx_money_01.webp", "gfx_money_07.webp"], screen: [false, false, false], headline: "CLIENTS EXPOSED", kicker: "TRUTH", subline: "agency secrets", flip: true, seed: 128 },
  { id: "gx-142", niche: "business", arch: "fire", accent: "#1e3a8b", bg: "gfx_bg_44.webp", cuts: ["gfx_fire_06.webp", "gfx_fire_03.webp"], screen: [true, true], headline: "AI REPLACED US", kicker: "2026", subline: "what we did", flip: false, seed: 159 },
  { id: "gx-143", niche: "business", arch: "graph", accent: "#1e3a8b", bg: "gfx_bg_47.webp", cuts: [], screen: [], headline: "ZERO TO CEO", kicker: "CASE STUDY", subline: "my playbook", flip: true, seed: 190 },
  { id: "gx-144", niche: "business", arch: "device", accent: "#1e3a8b", bg: "gfx_bg_50.webp", cuts: ["gfx_device_02.webp"], screen: [false], headline: "I GOT FIRED", kicker: "STORY", subline: "then this happened", flip: false, seed: 221 },
  { id: "gx-145", niche: "business", arch: "hand", accent: "#1e3a8b", bg: "gfx_bg_53.webp", cuts: ["gfx_hand_05.webp"], screen: [false], headline: "$1M IDEA", kicker: "STARTUP", subline: "how we did it", flip: true, seed: 252 },
  { id: "gx-146", niche: "business", arch: "banner", accent: "#1e3a8b", bg: "gfx_bg_03.webp", cuts: ["gfx_device_09.webp"], screen: [false], headline: "5 AM CEO", kicker: "ROUTINE", subline: "my full day", flip: false, seed: 283 },
  { id: "gx-147", niche: "business", arch: "minimal", accent: "#1e3a8b", bg: "gfx_bg_06.webp", cuts: ["gfx_device_01.webp"], screen: [false], headline: "CLIENTS EXPOSED", kicker: "TRUTH", subline: "agency secrets", flip: true, seed: 314 },
  { id: "gx-148", niche: "business", arch: "vs", accent: "#1e3a8b", bg: "gfx_bg_09.webp", cuts: ["gfx_bg_49.webp"], screen: [false], headline: "AI REPLACED US", kicker: "2026", subline: "what we did", flip: false, seed: 345 },
  { id: "gx-149", niche: "business", arch: "split", accent: "#1e3a8b", bg: "gfx_bg_12.webp", cuts: [], screen: [], headline: "ZERO TO CEO", kicker: "CASE STUDY", subline: "my playbook", flip: true, seed: 376 },
  { id: "gx-150", niche: "business", arch: "cinematic", accent: "#1e3a8b", bg: "gfx_bg_15.webp", cuts: [], screen: [], headline: "I GOT FIRED", kicker: "STORY", subline: "then this happened", flip: false, seed: 407 },
  { id: "gx-151", niche: "business", arch: "arrow", accent: "#1e3a8b", bg: "gfx_bg_18.webp", cuts: ["gfx_arrow_03.webp"], screen: [false], headline: "$1M IDEA", kicker: "STARTUP", subline: "how we did it", flip: true, seed: 438 },
  { id: "gx-152", niche: "business", arch: "circle", accent: "#1e3a8b", bg: "gfx_bg_21.webp", cuts: ["gfx_device_01.webp"], screen: [false], headline: "5 AM CEO", kicker: "ROUTINE", subline: "my full day", flip: false, seed: 469 },
  { id: "gx-153", niche: "business", arch: "money", accent: "#1e3a8b", bg: "gfx_bg_24.webp", cuts: ["gfx_money_08.webp", "gfx_money_04.webp", "gfx_money_01.webp"], screen: [false, false, false], headline: "CLIENTS EXPOSED", kicker: "TRUTH", subline: "agency secrets", flip: true, seed: 500 },
  { id: "gx-154", niche: "business", arch: "fire", accent: "#1e3a8b", bg: "gfx_bg_27.webp", cuts: ["gfx_fire_04.webp", "gfx_fire_01.webp"], screen: [true, true], headline: "AI REPLACED US", kicker: "2026", subline: "what we did", flip: false, seed: 531 },
  { id: "gx-155", niche: "business", arch: "graph", accent: "#1e3a8b", bg: "gfx_bg_30.webp", cuts: [], screen: [], headline: "ZERO TO CEO", kicker: "CASE STUDY", subline: "my playbook", flip: true, seed: 562 },
  { id: "gx-156", niche: "business", arch: "device", accent: "#1e3a8b", bg: "gfx_bg_33.webp", cuts: ["gfx_device_04.webp"], screen: [false], headline: "I GOT FIRED", kicker: "STORY", subline: "then this happened", flip: false, seed: 593 },
  { id: "gx-157", niche: "business", arch: "hand", accent: "#1e3a8b", bg: "gfx_bg_36.webp", cuts: ["gfx_hand_01.webp"], screen: [false], headline: "$1M IDEA", kicker: "STARTUP", subline: "how we did it", flip: true, seed: 624 },
  { id: "gx-158", niche: "business", arch: "banner", accent: "#1e3a8b", bg: "gfx_bg_39.webp", cuts: ["gfx_device_03.webp"], screen: [false], headline: "5 AM CEO", kicker: "ROUTINE", subline: "my full day", flip: false, seed: 655 },
  { id: "gx-159", niche: "business", arch: "minimal", accent: "#1e3a8b", bg: "gfx_bg_42.webp", cuts: ["gfx_device_05.webp"], screen: [false], headline: "CLIENTS EXPOSED", kicker: "TRUTH", subline: "agency secrets", flip: true, seed: 686 },
  { id: "gx-160", niche: "business", arch: "vs", accent: "#1e3a8b", bg: "gfx_bg_45.webp", cuts: ["gfx_bg_32.webp"], screen: [false], headline: "AI REPLACED US", kicker: "2026", subline: "what we did", flip: false, seed: 717 },
  { id: "gx-161", niche: "business", arch: "split", accent: "#1e3a8b", bg: "gfx_bg_48.webp", cuts: [], screen: [], headline: "ZERO TO CEO", kicker: "CASE STUDY", subline: "my playbook", flip: true, seed: 748 },
  { id: "gx-162", niche: "business", arch: "cinematic", accent: "#1e3a8b", bg: "gfx_bg_51.webp", cuts: [], screen: [], headline: "I GOT FIRED", kicker: "STORY", subline: "then this happened", flip: false, seed: 779 },
  { id: "gx-163", niche: "business", arch: "arrow", accent: "#1e3a8b", bg: "gfx_bg_01.webp", cuts: ["gfx_arrow_03.webp"], screen: [false], headline: "$1M IDEA", kicker: "STARTUP", subline: "how we did it", flip: true, seed: 810 },
  { id: "gx-164", niche: "business", arch: "circle", accent: "#1e3a8b", bg: "gfx_bg_04.webp", cuts: ["gfx_device_05.webp"], screen: [false], headline: "5 AM CEO", kicker: "ROUTINE", subline: "my full day", flip: false, seed: 841 },
  { id: "gx-165", niche: "business", arch: "money", accent: "#1e3a8b", bg: "gfx_bg_07.webp", cuts: ["gfx_money_02.webp", "gfx_money_07.webp", "gfx_money_04.webp"], screen: [false, false, false], headline: "CLIENTS EXPOSED", kicker: "TRUTH", subline: "agency secrets", flip: true, seed: 872 },
  { id: "gx-166", niche: "business", arch: "fire", accent: "#1e3a8b", bg: "gfx_bg_10.webp", cuts: ["gfx_fire_02.webp", "gfx_fire_06.webp"], screen: [true, true], headline: "AI REPLACED US", kicker: "2026", subline: "what we did", flip: false, seed: 903 },
  { id: "gx-167", niche: "business", arch: "graph", accent: "#1e3a8b", bg: "gfx_bg_13.webp", cuts: [], screen: [], headline: "ZERO TO CEO", kicker: "CASE STUDY", subline: "my playbook", flip: true, seed: 934 },
  { id: "gx-168", niche: "business", arch: "device", accent: "#1e3a8b", bg: "gfx_bg_16.webp", cuts: ["gfx_device_06.webp"], screen: [false], headline: "I GOT FIRED", kicker: "STORY", subline: "then this happened", flip: false, seed: 965 },
  { id: "gx-169", niche: "business", arch: "hand", accent: "#1e3a8b", bg: "gfx_bg_19.webp", cuts: ["gfx_hand_05.webp"], screen: [false], headline: "$1M IDEA", kicker: "STARTUP", subline: "how we did it", flip: true, seed: 996 },
  { id: "gx-170", niche: "business", arch: "banner", accent: "#1e3a8b", bg: "gfx_bg_22.webp", cuts: ["gfx_device_07.webp"], screen: [false], headline: "5 AM CEO", kicker: "ROUTINE", subline: "my full day", flip: false, seed: 1027 },
  { id: "gx-171", niche: "podcast", arch: "split", accent: "#9333ea", bg: "gfx_bg_36.webp", cuts: [], screen: [], headline: "HE SAID WHAT", kicker: "EP 42", subline: "unfiltered talk", flip: true, seed: 5 },
  { id: "gx-172", niche: "podcast", arch: "cinematic", accent: "#9333ea", bg: "gfx_bg_39.webp", cuts: [], screen: [], headline: "DARK TRUTH", kicker: "EXPOSED", subline: "guest reveals all", flip: false, seed: 36 },
  { id: "gx-173", niche: "podcast", arch: "arrow", accent: "#9333ea", bg: "gfx_bg_42.webp", cuts: ["gfx_arrow_06.webp"], screen: [false], headline: "MILLIONAIRE HABITS", kicker: "CLIPS", subline: "5 rules", flip: true, seed: 67 },
  { id: "gx-174", niche: "podcast", arch: "circle", accent: "#9333ea", bg: "gfx_bg_45.webp", cuts: ["gfx_mic_01.webp"], screen: [false], headline: "SHE CRIED", kicker: "EMOTIONAL", subline: "powerful moment", flip: false, seed: 98 },
  { id: "gx-175", niche: "podcast", arch: "money", accent: "#9333ea", bg: "gfx_bg_48.webp", cuts: ["gfx_money_05.webp", "gfx_money_01.webp", "gfx_money_07.webp"], screen: [false, false, false], headline: "BANNED EPISODE", kicker: "LEAKED", subline: "too real", flip: true, seed: 129 },
  { id: "gx-176", niche: "podcast", arch: "fire", accent: "#9333ea", bg: "gfx_bg_51.webp", cuts: ["gfx_fire_06.webp", "gfx_fire_03.webp"], screen: [true, true], headline: "ASK ME ANYTHING", kicker: "QNA", subline: "brutally honest", flip: false, seed: 160 },
  { id: "gx-177", niche: "podcast", arch: "graph", accent: "#9333ea", bg: "gfx_bg_01.webp", cuts: [], screen: [], headline: "HE SAID WHAT", kicker: "EP 42", subline: "unfiltered talk", flip: true, seed: 191 },
  { id: "gx-178", niche: "podcast", arch: "device", accent: "#9333ea", bg: "gfx_bg_04.webp", cuts: ["gfx_device_03.webp"], screen: [false], headline: "DARK TRUTH", kicker: "EXPOSED", subline: "guest reveals all", flip: false, seed: 222 },
  { id: "gx-179", niche: "podcast", arch: "hand", accent: "#9333ea", bg: "gfx_bg_07.webp", cuts: ["gfx_hand_06.webp"], screen: [false], headline: "MILLIONAIRE HABITS", kicker: "CLIPS", subline: "5 rules", flip: true, seed: 253 },
  { id: "gx-180", niche: "podcast", arch: "banner", accent: "#9333ea", bg: "gfx_bg_10.webp", cuts: ["gfx_mic_01.webp"], screen: [false], headline: "SHE CRIED", kicker: "EMOTIONAL", subline: "powerful moment", flip: false, seed: 284 },
  { id: "gx-181", niche: "podcast", arch: "minimal", accent: "#9333ea", bg: "gfx_bg_13.webp", cuts: ["gfx_mic_01.webp"], screen: [false], headline: "BANNED EPISODE", kicker: "LEAKED", subline: "too real", flip: true, seed: 315 },
  { id: "gx-182", niche: "podcast", arch: "vs", accent: "#9333ea", bg: "gfx_bg_16.webp", cuts: ["gfx_bg_03.webp"], screen: [false], headline: "ASK ME ANYTHING", kicker: "QNA", subline: "brutally honest", flip: false, seed: 346 },
  { id: "gx-183", niche: "podcast", arch: "split", accent: "#9333ea", bg: "gfx_bg_19.webp", cuts: [], screen: [], headline: "HE SAID WHAT", kicker: "EP 42", subline: "unfiltered talk", flip: true, seed: 377 },
  { id: "gx-184", niche: "podcast", arch: "cinematic", accent: "#9333ea", bg: "gfx_bg_22.webp", cuts: [], screen: [], headline: "DARK TRUTH", kicker: "EXPOSED", subline: "guest reveals all", flip: false, seed: 408 },
  { id: "gx-185", niche: "podcast", arch: "arrow", accent: "#9333ea", bg: "gfx_bg_25.webp", cuts: ["gfx_arrow_06.webp"], screen: [false], headline: "MILLIONAIRE HABITS", kicker: "CLIPS", subline: "5 rules", flip: true, seed: 439 },
  { id: "gx-186", niche: "podcast", arch: "circle", accent: "#9333ea", bg: "gfx_bg_28.webp", cuts: ["gfx_mic_01.webp"], screen: [false], headline: "SHE CRIED", kicker: "EMOTIONAL", subline: "powerful moment", flip: false, seed: 470 },
  { id: "gx-187", niche: "podcast", arch: "money", accent: "#9333ea", bg: "gfx_bg_31.webp", cuts: ["gfx_money_08.webp", "gfx_money_04.webp", "gfx_money_01.webp"], screen: [false, false, false], headline: "BANNED EPISODE", kicker: "LEAKED", subline: "too real", flip: true, seed: 501 },
  { id: "gx-188", niche: "podcast", arch: "fire", accent: "#9333ea", bg: "gfx_bg_34.webp", cuts: ["gfx_fire_04.webp", "gfx_fire_01.webp"], screen: [true, true], headline: "ASK ME ANYTHING", kicker: "QNA", subline: "brutally honest", flip: false, seed: 532 },
  { id: "gx-189", niche: "podcast", arch: "graph", accent: "#9333ea", bg: "gfx_bg_37.webp", cuts: [], screen: [], headline: "HE SAID WHAT", kicker: "EP 42", subline: "unfiltered talk", flip: true, seed: 563 },
  { id: "gx-190", niche: "podcast", arch: "device", accent: "#9333ea", bg: "gfx_bg_40.webp", cuts: ["gfx_device_05.webp"], screen: [false], headline: "DARK TRUTH", kicker: "EXPOSED", subline: "guest reveals all", flip: false, seed: 594 },
  { id: "gx-191", niche: "podcast", arch: "hand", accent: "#9333ea", bg: "gfx_bg_43.webp", cuts: ["gfx_hand_02.webp"], screen: [false], headline: "MILLIONAIRE HABITS", kicker: "CLIPS", subline: "5 rules", flip: true, seed: 625 },
  { id: "gx-192", niche: "podcast", arch: "banner", accent: "#9333ea", bg: "gfx_bg_46.webp", cuts: ["gfx_mic_01.webp"], screen: [false], headline: "SHE CRIED", kicker: "EMOTIONAL", subline: "powerful moment", flip: false, seed: 656 },
  { id: "gx-193", niche: "podcast", arch: "minimal", accent: "#9333ea", bg: "gfx_bg_49.webp", cuts: ["gfx_mic_01.webp"], screen: [false], headline: "BANNED EPISODE", kicker: "LEAKED", subline: "too real", flip: true, seed: 687 },
  { id: "gx-194", niche: "podcast", arch: "vs", accent: "#9333ea", bg: "gfx_bg_52.webp", cuts: ["gfx_bg_39.webp"], screen: [false], headline: "ASK ME ANYTHING", kicker: "QNA", subline: "brutally honest", flip: false, seed: 718 },
  { id: "gx-195", niche: "podcast", arch: "split", accent: "#9333ea", bg: "gfx_bg_02.webp", cuts: [], screen: [], headline: "HE SAID WHAT", kicker: "EP 42", subline: "unfiltered talk", flip: true, seed: 749 },
  { id: "gx-196", niche: "podcast", arch: "cinematic", accent: "#9333ea", bg: "gfx_bg_05.webp", cuts: [], screen: [], headline: "DARK TRUTH", kicker: "EXPOSED", subline: "guest reveals all", flip: false, seed: 780 },
  { id: "gx-197", niche: "podcast", arch: "arrow", accent: "#9333ea", bg: "gfx_bg_08.webp", cuts: ["gfx_arrow_06.webp"], screen: [false], headline: "MILLIONAIRE HABITS", kicker: "CLIPS", subline: "5 rules", flip: true, seed: 811 },
  { id: "gx-198", niche: "podcast", arch: "circle", accent: "#9333ea", bg: "gfx_bg_11.webp", cuts: ["gfx_mic_01.webp"], screen: [false], headline: "SHE CRIED", kicker: "EMOTIONAL", subline: "powerful moment", flip: false, seed: 842 },
  { id: "gx-199", niche: "podcast", arch: "money", accent: "#9333ea", bg: "gfx_bg_14.webp", cuts: ["gfx_money_02.webp", "gfx_money_07.webp", "gfx_money_04.webp"], screen: [false, false, false], headline: "BANNED EPISODE", kicker: "LEAKED", subline: "too real", flip: true, seed: 873 },
  { id: "gx-200", niche: "podcast", arch: "fire", accent: "#9333ea", bg: "gfx_bg_17.webp", cuts: ["gfx_fire_02.webp", "gfx_fire_06.webp"], screen: [true, true], headline: "ASK ME ANYTHING", kicker: "QNA", subline: "brutally honest", flip: false, seed: 904 },
  { id: "gx-201", niche: "podcast", arch: "graph", accent: "#9333ea", bg: "gfx_bg_20.webp", cuts: [], screen: [], headline: "HE SAID WHAT", kicker: "EP 42", subline: "unfiltered talk", flip: true, seed: 935 },
  { id: "gx-202", niche: "podcast", arch: "device", accent: "#9333ea", bg: "gfx_bg_23.webp", cuts: ["gfx_device_07.webp"], screen: [false], headline: "DARK TRUTH", kicker: "EXPOSED", subline: "guest reveals all", flip: false, seed: 966 },
  { id: "gx-203", niche: "podcast", arch: "hand", accent: "#9333ea", bg: "gfx_bg_26.webp", cuts: ["gfx_hand_06.webp"], screen: [false], headline: "MILLIONAIRE HABITS", kicker: "CLIPS", subline: "5 rules", flip: true, seed: 997 },
  { id: "gx-204", niche: "food", arch: "split", accent: "#ea580c", bg: "gfx_bg_43.webp", cuts: [], screen: [], headline: "INSANE RECIPE", kicker: "5 MIN", subline: "tastes unreal", flip: true, seed: 6 },
  { id: "gx-205", niche: "food", arch: "cinematic", accent: "#ea580c", bg: "gfx_bg_46.webp", cuts: [], screen: [], headline: "STREET FOOD", kicker: "TASTE TEST", subline: "worth the hype", flip: false, seed: 37 },
  { id: "gx-206", niche: "food", arch: "arrow", accent: "#ea580c", bg: "gfx_bg_49.webp", cuts: ["gfx_arrow_09.webp"], screen: [false], headline: "$1 vs $100", kicker: "CHALLENGE", subline: "food battle", flip: true, seed: 68 },
  { id: "gx-207", niche: "food", arch: "circle", accent: "#ea580c", bg: "gfx_bg_52.webp", cuts: ["gfx_abstract_01.webp"], screen: [false], headline: "SECRET INGREDIENT", kicker: "RECIPE", subline: "changes everything", flip: false, seed: 99 },
  { id: "gx-208", niche: "food", arch: "money", accent: "#ea580c", bg: "gfx_bg_02.webp", cuts: ["gfx_money_05.webp", "gfx_money_01.webp", "gfx_money_07.webp"], screen: [false, false, false], headline: "I ATE ONLY THIS", kicker: "24 HOURS", subline: "full day eating", flip: true, seed: 130 },
  { id: "gx-209", niche: "food", arch: "fire", accent: "#ea580c", bg: "gfx_bg_05.webp", cuts: ["gfx_fire_06.webp", "gfx_fire_03.webp"], screen: [true, true], headline: "RANKING EVERY", kicker: "TASTE TEST", subline: "best to worst", flip: false, seed: 161 },
  { id: "gx-210", niche: "food", arch: "graph", accent: "#ea580c", bg: "gfx_bg_08.webp", cuts: [], screen: [], headline: "INSANE RECIPE", kicker: "5 MIN", subline: "tastes unreal", flip: true, seed: 192 },
  { id: "gx-211", niche: "food", arch: "device", accent: "#ea580c", bg: "gfx_bg_11.webp", cuts: ["gfx_device_04.webp"], screen: [false], headline: "STREET FOOD", kicker: "TASTE TEST", subline: "worth the hype", flip: false, seed: 223 },
  { id: "gx-212", niche: "food", arch: "hand", accent: "#ea580c", bg: "gfx_bg_14.webp", cuts: ["gfx_hand_07.webp"], screen: [false], headline: "$1 vs $100", kicker: "CHALLENGE", subline: "food battle", flip: true, seed: 254 },
  { id: "gx-213", niche: "food", arch: "banner", accent: "#ea580c", bg: "gfx_bg_17.webp", cuts: ["gfx_abstract_01.webp"], screen: [false], headline: "SECRET INGREDIENT", kicker: "RECIPE", subline: "changes everything", flip: false, seed: 285 },
  { id: "gx-214", niche: "food", arch: "minimal", accent: "#ea580c", bg: "gfx_bg_20.webp", cuts: ["gfx_abstract_03.webp"], screen: [false], headline: "I ATE ONLY THIS", kicker: "24 HOURS", subline: "full day eating", flip: true, seed: 316 },
  { id: "gx-215", niche: "food", arch: "vs", accent: "#ea580c", bg: "gfx_bg_23.webp", cuts: ["gfx_bg_10.webp"], screen: [false], headline: "RANKING EVERY", kicker: "TASTE TEST", subline: "best to worst", flip: false, seed: 347 },
  { id: "gx-216", niche: "food", arch: "split", accent: "#ea580c", bg: "gfx_bg_26.webp", cuts: [], screen: [], headline: "INSANE RECIPE", kicker: "5 MIN", subline: "tastes unreal", flip: true, seed: 378 },
  { id: "gx-217", niche: "food", arch: "cinematic", accent: "#ea580c", bg: "gfx_bg_29.webp", cuts: [], screen: [], headline: "STREET FOOD", kicker: "TASTE TEST", subline: "worth the hype", flip: false, seed: 409 },
  { id: "gx-218", niche: "food", arch: "arrow", accent: "#ea580c", bg: "gfx_bg_32.webp", cuts: ["gfx_arrow_09.webp"], screen: [false], headline: "$1 vs $100", kicker: "CHALLENGE", subline: "food battle", flip: true, seed: 440 },
  { id: "gx-219", niche: "food", arch: "circle", accent: "#ea580c", bg: "gfx_bg_35.webp", cuts: ["gfx_abstract_01.webp"], screen: [false], headline: "SECRET INGREDIENT", kicker: "RECIPE", subline: "changes everything", flip: false, seed: 471 },
  { id: "gx-220", niche: "food", arch: "money", accent: "#ea580c", bg: "gfx_bg_38.webp", cuts: ["gfx_money_08.webp", "gfx_money_04.webp", "gfx_money_01.webp"], screen: [false, false, false], headline: "I ATE ONLY THIS", kicker: "24 HOURS", subline: "full day eating", flip: true, seed: 502 },
  { id: "gx-221", niche: "food", arch: "fire", accent: "#ea580c", bg: "gfx_bg_41.webp", cuts: ["gfx_fire_04.webp", "gfx_fire_01.webp"], screen: [true, true], headline: "RANKING EVERY", kicker: "TASTE TEST", subline: "best to worst", flip: false, seed: 533 },
  { id: "gx-222", niche: "food", arch: "graph", accent: "#ea580c", bg: "gfx_bg_44.webp", cuts: [], screen: [], headline: "INSANE RECIPE", kicker: "5 MIN", subline: "tastes unreal", flip: true, seed: 564 },
  { id: "gx-223", niche: "food", arch: "device", accent: "#ea580c", bg: "gfx_bg_47.webp", cuts: ["gfx_device_06.webp"], screen: [false], headline: "STREET FOOD", kicker: "TASTE TEST", subline: "worth the hype", flip: false, seed: 595 },
  { id: "gx-224", niche: "food", arch: "hand", accent: "#ea580c", bg: "gfx_bg_50.webp", cuts: ["gfx_hand_03.webp"], screen: [false], headline: "$1 vs $100", kicker: "CHALLENGE", subline: "food battle", flip: true, seed: 626 },
  { id: "gx-225", niche: "food", arch: "banner", accent: "#ea580c", bg: "gfx_bg_53.webp", cuts: ["gfx_abstract_01.webp"], screen: [false], headline: "SECRET INGREDIENT", kicker: "RECIPE", subline: "changes everything", flip: false, seed: 657 },
  { id: "gx-226", niche: "food", arch: "minimal", accent: "#ea580c", bg: "gfx_bg_03.webp", cuts: ["gfx_abstract_03.webp"], screen: [false], headline: "I ATE ONLY THIS", kicker: "24 HOURS", subline: "full day eating", flip: true, seed: 688 },
  { id: "gx-227", niche: "food", arch: "vs", accent: "#ea580c", bg: "gfx_bg_06.webp", cuts: ["gfx_bg_46.webp"], screen: [false], headline: "RANKING EVERY", kicker: "TASTE TEST", subline: "best to worst", flip: false, seed: 719 },
  { id: "gx-228", niche: "food", arch: "split", accent: "#ea580c", bg: "gfx_bg_09.webp", cuts: [], screen: [], headline: "INSANE RECIPE", kicker: "5 MIN", subline: "tastes unreal", flip: true, seed: 750 },
  { id: "gx-229", niche: "food", arch: "cinematic", accent: "#ea580c", bg: "gfx_bg_12.webp", cuts: [], screen: [], headline: "STREET FOOD", kicker: "TASTE TEST", subline: "worth the hype", flip: false, seed: 781 },
  { id: "gx-230", niche: "food", arch: "arrow", accent: "#ea580c", bg: "gfx_bg_15.webp", cuts: ["gfx_arrow_09.webp"], screen: [false], headline: "$1 vs $100", kicker: "CHALLENGE", subline: "food battle", flip: true, seed: 812 },
  { id: "gx-231", niche: "food", arch: "circle", accent: "#ea580c", bg: "gfx_bg_18.webp", cuts: ["gfx_abstract_01.webp"], screen: [false], headline: "SECRET INGREDIENT", kicker: "RECIPE", subline: "changes everything", flip: false, seed: 843 },
  { id: "gx-232", niche: "food", arch: "money", accent: "#ea580c", bg: "gfx_bg_21.webp", cuts: ["gfx_money_02.webp", "gfx_money_07.webp", "gfx_money_04.webp"], screen: [false, false, false], headline: "I ATE ONLY THIS", kicker: "24 HOURS", subline: "full day eating", flip: true, seed: 874 },
  { id: "gx-233", niche: "food", arch: "fire", accent: "#ea580c", bg: "gfx_bg_24.webp", cuts: ["gfx_fire_02.webp", "gfx_fire_06.webp"], screen: [true, true], headline: "RANKING EVERY", kicker: "TASTE TEST", subline: "best to worst", flip: false, seed: 905 },
  { id: "gx-234", niche: "food", arch: "graph", accent: "#ea580c", bg: "gfx_bg_27.webp", cuts: [], screen: [], headline: "INSANE RECIPE", kicker: "5 MIN", subline: "tastes unreal", flip: true, seed: 936 },
  { id: "gx-235", niche: "food", arch: "device", accent: "#ea580c", bg: "gfx_bg_30.webp", cuts: ["gfx_device_08.webp"], screen: [false], headline: "STREET FOOD", kicker: "TASTE TEST", subline: "worth the hype", flip: false, seed: 967 },
  { id: "gx-236", niche: "food", arch: "hand", accent: "#ea580c", bg: "gfx_bg_33.webp", cuts: ["gfx_hand_07.webp"], screen: [false], headline: "$1 vs $100", kicker: "CHALLENGE", subline: "food battle", flip: true, seed: 998 },
  { id: "gx-237", niche: "fitness", arch: "split", accent: "#e11d48", bg: "gfx_bg_50.webp", cuts: [], screen: [], headline: "30 DAY CHANGE", kicker: "RESULTS", subline: "real transformation", flip: true, seed: 7 },
  { id: "gx-238", niche: "fitness", arch: "cinematic", accent: "#e11d48", bg: "gfx_bg_53.webp", cuts: [], screen: [], headline: "STOP DOING THIS", kicker: "MISTAKE", subline: "killing your gains", flip: false, seed: 38 },
  { id: "gx-239", niche: "fitness", arch: "arrow", accent: "#e11d48", bg: "gfx_bg_03.webp", cuts: ["gfx_arrow_12.webp"], screen: [false], headline: "5 MIN ABS", kicker: "HOME", subline: "no equipment", flip: true, seed: 69 },
  { id: "gx-240", niche: "fitness", arch: "circle", accent: "#e11d48", bg: "gfx_bg_06.webp", cuts: ["gfx_fire_07.webp"], screen: [true], headline: "I TRAINED LIKE HIM", kicker: "CHALLENGE", subline: "7 days", flip: false, seed: 100 },
  { id: "gx-241", niche: "fitness", arch: "money", accent: "#e11d48", bg: "gfx_bg_09.webp", cuts: ["gfx_money_05.webp", "gfx_money_01.webp", "gfx_money_07.webp"], screen: [false, false, false], headline: "EAT THIS DAILY", kicker: "DIET", subline: "muscle food", flip: true, seed: 131 },
  { id: "gx-242", niche: "fitness", arch: "fire", accent: "#e11d48", bg: "gfx_bg_12.webp", cuts: ["gfx_fire_06.webp", "gfx_fire_03.webp"], screen: [true, true], headline: "NO GYM NEEDED", kicker: "HOME", subline: "full body plan", flip: false, seed: 162 },
  { id: "gx-243", niche: "fitness", arch: "graph", accent: "#e11d48", bg: "gfx_bg_15.webp", cuts: [], screen: [], headline: "30 DAY CHANGE", kicker: "RESULTS", subline: "real transformation", flip: true, seed: 193 },
  { id: "gx-244", niche: "fitness", arch: "device", accent: "#e11d48", bg: "gfx_bg_18.webp", cuts: ["gfx_device_05.webp"], screen: [false], headline: "STOP DOING THIS", kicker: "MISTAKE", subline: "killing your gains", flip: false, seed: 224 },
  { id: "gx-245", niche: "fitness", arch: "hand", accent: "#e11d48", bg: "gfx_bg_21.webp", cuts: ["gfx_hand_08.webp"], screen: [false], headline: "5 MIN ABS", kicker: "HOME", subline: "no equipment", flip: true, seed: 255 },
  { id: "gx-246", niche: "fitness", arch: "banner", accent: "#e11d48", bg: "gfx_bg_24.webp", cuts: ["gfx_fire_05.webp"], screen: [true], headline: "I TRAINED LIKE HIM", kicker: "CHALLENGE", subline: "7 days", flip: false, seed: 286 },
  { id: "gx-247", niche: "fitness", arch: "minimal", accent: "#e11d48", bg: "gfx_bg_27.webp", cuts: ["gfx_fire_07.webp"], screen: [true], headline: "EAT THIS DAILY", kicker: "DIET", subline: "muscle food", flip: true, seed: 317 },
  { id: "gx-248", niche: "fitness", arch: "vs", accent: "#e11d48", bg: "gfx_bg_30.webp", cuts: ["gfx_bg_17.webp"], screen: [false], headline: "NO GYM NEEDED", kicker: "HOME", subline: "full body plan", flip: false, seed: 348 },
  { id: "gx-249", niche: "fitness", arch: "split", accent: "#e11d48", bg: "gfx_bg_33.webp", cuts: [], screen: [], headline: "30 DAY CHANGE", kicker: "RESULTS", subline: "real transformation", flip: true, seed: 379 },
  { id: "gx-250", niche: "fitness", arch: "cinematic", accent: "#e11d48", bg: "gfx_bg_36.webp", cuts: [], screen: [], headline: "STOP DOING THIS", kicker: "MISTAKE", subline: "killing your gains", flip: false, seed: 410 },
  { id: "gx-251", niche: "fitness", arch: "arrow", accent: "#e11d48", bg: "gfx_bg_39.webp", cuts: ["gfx_arrow_12.webp"], screen: [false], headline: "5 MIN ABS", kicker: "HOME", subline: "no equipment", flip: true, seed: 441 },
  { id: "gx-252", niche: "fitness", arch: "circle", accent: "#e11d48", bg: "gfx_bg_42.webp", cuts: ["gfx_fire_03.webp"], screen: [true], headline: "I TRAINED LIKE HIM", kicker: "CHALLENGE", subline: "7 days", flip: false, seed: 472 },
  { id: "gx-253", niche: "fitness", arch: "money", accent: "#e11d48", bg: "gfx_bg_45.webp", cuts: ["gfx_money_08.webp", "gfx_money_04.webp", "gfx_money_01.webp"], screen: [false, false, false], headline: "EAT THIS DAILY", kicker: "DIET", subline: "muscle food", flip: true, seed: 503 },
  { id: "gx-254", niche: "fitness", arch: "fire", accent: "#e11d48", bg: "gfx_bg_48.webp", cuts: ["gfx_fire_04.webp", "gfx_fire_01.webp"], screen: [true, true], headline: "NO GYM NEEDED", kicker: "HOME", subline: "full body plan", flip: false, seed: 534 },
  { id: "gx-255", niche: "fitness", arch: "graph", accent: "#e11d48", bg: "gfx_bg_51.webp", cuts: [], screen: [], headline: "30 DAY CHANGE", kicker: "RESULTS", subline: "real transformation", flip: true, seed: 565 },
  { id: "gx-256", niche: "fitness", arch: "device", accent: "#e11d48", bg: "gfx_bg_01.webp", cuts: ["gfx_device_07.webp"], screen: [false], headline: "STOP DOING THIS", kicker: "MISTAKE", subline: "killing your gains", flip: false, seed: 596 },
  { id: "gx-257", niche: "fitness", arch: "hand", accent: "#e11d48", bg: "gfx_bg_04.webp", cuts: ["gfx_hand_04.webp"], screen: [false], headline: "5 MIN ABS", kicker: "HOME", subline: "no equipment", flip: true, seed: 627 },
  { id: "gx-258", niche: "fitness", arch: "banner", accent: "#e11d48", bg: "gfx_bg_07.webp", cuts: ["gfx_fire_01.webp"], screen: [true], headline: "I TRAINED LIKE HIM", kicker: "CHALLENGE", subline: "7 days", flip: false, seed: 658 },
  { id: "gx-259", niche: "fitness", arch: "minimal", accent: "#e11d48", bg: "gfx_bg_10.webp", cuts: ["gfx_fire_03.webp"], screen: [true], headline: "EAT THIS DAILY", kicker: "DIET", subline: "muscle food", flip: true, seed: 689 },
  { id: "gx-260", niche: "fitness", arch: "vs", accent: "#e11d48", bg: "gfx_bg_13.webp", cuts: ["gfx_bg_53.webp"], screen: [false], headline: "NO GYM NEEDED", kicker: "HOME", subline: "full body plan", flip: false, seed: 720 },
  { id: "gx-261", niche: "fitness", arch: "split", accent: "#e11d48", bg: "gfx_bg_16.webp", cuts: [], screen: [], headline: "30 DAY CHANGE", kicker: "RESULTS", subline: "real transformation", flip: true, seed: 751 },
  { id: "gx-262", niche: "fitness", arch: "cinematic", accent: "#e11d48", bg: "gfx_bg_19.webp", cuts: [], screen: [], headline: "STOP DOING THIS", kicker: "MISTAKE", subline: "killing your gains", flip: false, seed: 782 },
  { id: "gx-263", niche: "fitness", arch: "arrow", accent: "#e11d48", bg: "gfx_bg_22.webp", cuts: ["gfx_arrow_12.webp"], screen: [false], headline: "5 MIN ABS", kicker: "HOME", subline: "no equipment", flip: true, seed: 813 },
  { id: "gx-264", niche: "fitness", arch: "circle", accent: "#e11d48", bg: "gfx_bg_25.webp", cuts: ["gfx_fire_06.webp"], screen: [true], headline: "I TRAINED LIKE HIM", kicker: "CHALLENGE", subline: "7 days", flip: false, seed: 844 },
  { id: "gx-265", niche: "fitness", arch: "money", accent: "#e11d48", bg: "gfx_bg_28.webp", cuts: ["gfx_money_02.webp", "gfx_money_07.webp", "gfx_money_04.webp"], screen: [false, false, false], headline: "EAT THIS DAILY", kicker: "DIET", subline: "muscle food", flip: true, seed: 875 },
  { id: "gx-266", niche: "fitness", arch: "fire", accent: "#e11d48", bg: "gfx_bg_31.webp", cuts: ["gfx_fire_02.webp", "gfx_fire_06.webp"], screen: [true, true], headline: "NO GYM NEEDED", kicker: "HOME", subline: "full body plan", flip: false, seed: 906 },
  { id: "gx-267", niche: "fitness", arch: "graph", accent: "#e11d48", bg: "gfx_bg_34.webp", cuts: [], screen: [], headline: "30 DAY CHANGE", kicker: "RESULTS", subline: "real transformation", flip: true, seed: 937 },
  { id: "gx-268", niche: "fitness", arch: "device", accent: "#e11d48", bg: "gfx_bg_37.webp", cuts: ["gfx_device_09.webp"], screen: [false], headline: "STOP DOING THIS", kicker: "MISTAKE", subline: "killing your gains", flip: false, seed: 968 },
  { id: "gx-269", niche: "fitness", arch: "hand", accent: "#e11d48", bg: "gfx_bg_40.webp", cuts: ["gfx_hand_08.webp"], screen: [false], headline: "5 MIN ABS", kicker: "HOME", subline: "no equipment", flip: true, seed: 999 },
  { id: "gx-270", niche: "tech", arch: "split", accent: "#1d4ed8", bg: "gfx_bg_04.webp", cuts: [], screen: [], headline: "NEW PHONE", kicker: "REVIEW", subline: "should you buy", flip: true, seed: 8 },
  { id: "gx-271", niche: "tech", arch: "cinematic", accent: "#1d4ed8", bg: "gfx_bg_07.webp", cuts: [], screen: [], headline: "AI IS SCARY", kicker: "2026", subline: "what it can do", flip: false, seed: 39 },
  { id: "gx-272", niche: "tech", arch: "arrow", accent: "#1d4ed8", bg: "gfx_bg_10.webp", cuts: ["gfx_arrow_03.webp"], screen: [false], headline: "STOP BUYING THIS", kicker: "WARNING", subline: "waste of money", flip: true, seed: 70 },
  { id: "gx-273", niche: "tech", arch: "circle", accent: "#1d4ed8", bg: "gfx_bg_13.webp", cuts: ["gfx_device_07.webp"], screen: [false], headline: "5 HIDDEN FEATURES", kicker: "TIPS", subline: "you missed these", flip: false, seed: 101 },
  { id: "gx-274", niche: "tech", arch: "money", accent: "#1d4ed8", bg: "gfx_bg_16.webp", cuts: ["gfx_money_05.webp", "gfx_money_01.webp", "gfx_money_07.webp"], screen: [false, false, false], headline: "CHEAP vs COSTLY", kicker: "TESTED", subline: "real difference", flip: true, seed: 132 },
  { id: "gx-275", niche: "tech", arch: "fire", accent: "#1d4ed8", bg: "gfx_bg_19.webp", cuts: ["gfx_fire_06.webp", "gfx_fire_03.webp"], screen: [true, true], headline: "FUTURE IS HERE", kicker: "TECH", subline: "mind blowing", flip: false, seed: 163 },
  { id: "gx-276", niche: "tech", arch: "graph", accent: "#1d4ed8", bg: "gfx_bg_22.webp", cuts: [], screen: [], headline: "NEW PHONE", kicker: "REVIEW", subline: "should you buy", flip: true, seed: 194 },
  { id: "gx-277", niche: "tech", arch: "device", accent: "#1d4ed8", bg: "gfx_bg_25.webp", cuts: ["gfx_device_06.webp"], screen: [false], headline: "AI IS SCARY", kicker: "2026", subline: "what it can do", flip: false, seed: 225 },
  { id: "gx-278", niche: "tech", arch: "hand", accent: "#1d4ed8", bg: "gfx_bg_28.webp", cuts: ["gfx_hand_01.webp"], screen: [false], headline: "STOP BUYING THIS", kicker: "WARNING", subline: "waste of money", flip: true, seed: 256 },
  { id: "gx-279", niche: "tech", arch: "banner", accent: "#1d4ed8", bg: "gfx_bg_31.webp", cuts: ["gfx_device_09.webp"], screen: [false], headline: "5 HIDDEN FEATURES", kicker: "TIPS", subline: "you missed these", flip: false, seed: 287 },
  { id: "gx-280", niche: "tech", arch: "minimal", accent: "#1d4ed8", bg: "gfx_bg_34.webp", cuts: ["gfx_device_01.webp"], screen: [false], headline: "CHEAP vs COSTLY", kicker: "TESTED", subline: "real difference", flip: true, seed: 318 },
  { id: "gx-281", niche: "tech", arch: "vs", accent: "#1d4ed8", bg: "gfx_bg_37.webp", cuts: ["gfx_bg_24.webp"], screen: [false], headline: "FUTURE IS HERE", kicker: "TECH", subline: "mind blowing", flip: false, seed: 349 },
  { id: "gx-282", niche: "tech", arch: "split", accent: "#1d4ed8", bg: "gfx_bg_40.webp", cuts: [], screen: [], headline: "NEW PHONE", kicker: "REVIEW", subline: "should you buy", flip: true, seed: 380 },
  { id: "gx-283", niche: "tech", arch: "cinematic", accent: "#1d4ed8", bg: "gfx_bg_43.webp", cuts: [], screen: [], headline: "AI IS SCARY", kicker: "2026", subline: "what it can do", flip: false, seed: 411 },
  { id: "gx-284", niche: "tech", arch: "arrow", accent: "#1d4ed8", bg: "gfx_bg_46.webp", cuts: ["gfx_arrow_03.webp"], screen: [false], headline: "STOP BUYING THIS", kicker: "WARNING", subline: "waste of money", flip: true, seed: 442 },
  { id: "gx-285", niche: "tech", arch: "circle", accent: "#1d4ed8", bg: "gfx_bg_49.webp", cuts: ["gfx_device_01.webp"], screen: [false], headline: "5 HIDDEN FEATURES", kicker: "TIPS", subline: "you missed these", flip: false, seed: 473 },
  { id: "gx-286", niche: "tech", arch: "money", accent: "#1d4ed8", bg: "gfx_bg_52.webp", cuts: ["gfx_money_08.webp", "gfx_money_04.webp", "gfx_money_01.webp"], screen: [false, false, false], headline: "CHEAP vs COSTLY", kicker: "TESTED", subline: "real difference", flip: true, seed: 504 },
  { id: "gx-287", niche: "tech", arch: "fire", accent: "#1d4ed8", bg: "gfx_bg_02.webp", cuts: ["gfx_fire_04.webp", "gfx_fire_01.webp"], screen: [true, true], headline: "FUTURE IS HERE", kicker: "TECH", subline: "mind blowing", flip: false, seed: 535 },
  { id: "gx-288", niche: "tech", arch: "graph", accent: "#1d4ed8", bg: "gfx_bg_05.webp", cuts: [], screen: [], headline: "NEW PHONE", kicker: "REVIEW", subline: "should you buy", flip: true, seed: 566 },
  { id: "gx-289", niche: "tech", arch: "device", accent: "#1d4ed8", bg: "gfx_bg_08.webp", cuts: ["gfx_device_08.webp"], screen: [false], headline: "AI IS SCARY", kicker: "2026", subline: "what it can do", flip: false, seed: 597 },
  { id: "gx-290", niche: "tech", arch: "hand", accent: "#1d4ed8", bg: "gfx_bg_11.webp", cuts: ["gfx_hand_05.webp"], screen: [false], headline: "STOP BUYING THIS", kicker: "WARNING", subline: "waste of money", flip: true, seed: 628 },
  { id: "gx-291", niche: "tech", arch: "banner", accent: "#1d4ed8", bg: "gfx_bg_14.webp", cuts: ["gfx_device_03.webp"], screen: [false], headline: "5 HIDDEN FEATURES", kicker: "TIPS", subline: "you missed these", flip: false, seed: 659 },
  { id: "gx-292", niche: "tech", arch: "minimal", accent: "#1d4ed8", bg: "gfx_bg_17.webp", cuts: ["gfx_device_05.webp"], screen: [false], headline: "CHEAP vs COSTLY", kicker: "TESTED", subline: "real difference", flip: true, seed: 690 },
  { id: "gx-293", niche: "tech", arch: "vs", accent: "#1d4ed8", bg: "gfx_bg_20.webp", cuts: ["gfx_bg_07.webp"], screen: [false], headline: "FUTURE IS HERE", kicker: "TECH", subline: "mind blowing", flip: false, seed: 721 },
  { id: "gx-294", niche: "tech", arch: "split", accent: "#1d4ed8", bg: "gfx_bg_23.webp", cuts: [], screen: [], headline: "NEW PHONE", kicker: "REVIEW", subline: "should you buy", flip: true, seed: 752 },
  { id: "gx-295", niche: "tech", arch: "cinematic", accent: "#1d4ed8", bg: "gfx_bg_26.webp", cuts: [], screen: [], headline: "AI IS SCARY", kicker: "2026", subline: "what it can do", flip: false, seed: 783 },
  { id: "gx-296", niche: "tech", arch: "arrow", accent: "#1d4ed8", bg: "gfx_bg_29.webp", cuts: ["gfx_arrow_03.webp"], screen: [false], headline: "STOP BUYING THIS", kicker: "WARNING", subline: "waste of money", flip: true, seed: 814 },
  { id: "gx-297", niche: "tech", arch: "circle", accent: "#1d4ed8", bg: "gfx_bg_32.webp", cuts: ["gfx_device_05.webp"], screen: [false], headline: "5 HIDDEN FEATURES", kicker: "TIPS", subline: "you missed these", flip: false, seed: 845 },
  { id: "gx-298", niche: "tech", arch: "money", accent: "#1d4ed8", bg: "gfx_bg_35.webp", cuts: ["gfx_money_02.webp", "gfx_money_07.webp", "gfx_money_04.webp"], screen: [false, false, false], headline: "CHEAP vs COSTLY", kicker: "TESTED", subline: "real difference", flip: true, seed: 876 },
  { id: "gx-299", niche: "tech", arch: "fire", accent: "#1d4ed8", bg: "gfx_bg_38.webp", cuts: ["gfx_fire_02.webp", "gfx_fire_06.webp"], screen: [true, true], headline: "FUTURE IS HERE", kicker: "TECH", subline: "mind blowing", flip: false, seed: 907 },
  { id: "gx-300", niche: "tech", arch: "graph", accent: "#1d4ed8", bg: "gfx_bg_41.webp", cuts: [], screen: [], headline: "NEW PHONE", kicker: "REVIEW", subline: "should you buy", flip: true, seed: 938 },
  { id: "gx-301", niche: "tech", arch: "device", accent: "#1d4ed8", bg: "gfx_bg_44.webp", cuts: ["gfx_device_10.webp"], screen: [false], headline: "AI IS SCARY", kicker: "2026", subline: "what it can do", flip: false, seed: 969 },
  { id: "gx-302", niche: "tech", arch: "hand", accent: "#1d4ed8", bg: "gfx_bg_47.webp", cuts: ["gfx_hand_01.webp"], screen: [false], headline: "STOP BUYING THIS", kicker: "WARNING", subline: "waste of money", flip: true, seed: 1000 },
  { id: "gx-303", niche: "education", arch: "split", accent: "#0f766e", bg: "gfx_bg_11.webp", cuts: [], screen: [], headline: "STUDY SMART", kicker: "TOPPER", subline: "secrets revealed", flip: true, seed: 9 },
  { id: "gx-304", niche: "education", arch: "cinematic", accent: "#0f766e", bg: "gfx_bg_14.webp", cuts: [], screen: [], headline: "EXAM IN 7 DAYS", kicker: "PLAN", subline: "full strategy", flip: false, seed: 40 },
  { id: "gx-305", niche: "education", arch: "arrow", accent: "#0f766e", bg: "gfx_bg_17.webp", cuts: ["gfx_arrow_06.webp"], screen: [false], headline: "STOP MEMORIZING", kicker: "MISTAKE", subline: "do this instead", flip: true, seed: 71 },
  { id: "gx-306", niche: "education", arch: "circle", accent: "#0f766e", bg: "gfx_bg_20.webp", cuts: ["gfx_hand_04.webp"], screen: [false], headline: "95 PERCENT IN BOARDS", kicker: "GUIDE", subline: "my method", flip: false, seed: 102 },
  { id: "gx-307", niche: "education", arch: "money", accent: "#0f766e", bg: "gfx_bg_23.webp", cuts: ["gfx_money_05.webp", "gfx_money_01.webp", "gfx_money_07.webp"], screen: [false, false, false], headline: "FREE COURSES", kicker: "2026", subline: "learn anything", flip: true, seed: 133 },
  { id: "gx-308", niche: "education", arch: "fire", accent: "#0f766e", bg: "gfx_bg_26.webp", cuts: ["gfx_fire_06.webp", "gfx_fire_03.webp"], screen: [true, true], headline: "NOTES THAT WORK", kicker: "TIPS", subline: "topper system", flip: false, seed: 164 },
  { id: "gx-309", niche: "education", arch: "graph", accent: "#0f766e", bg: "gfx_bg_29.webp", cuts: [], screen: [], headline: "STUDY SMART", kicker: "TOPPER", subline: "secrets revealed", flip: true, seed: 195 },
  { id: "gx-310", niche: "education", arch: "device", accent: "#0f766e", bg: "gfx_bg_32.webp", cuts: ["gfx_device_07.webp"], screen: [false], headline: "EXAM IN 7 DAYS", kicker: "PLAN", subline: "full strategy", flip: false, seed: 226 },
  { id: "gx-311", niche: "education", arch: "hand", accent: "#0f766e", bg: "gfx_bg_35.webp", cuts: ["gfx_hand_02.webp"], screen: [false], headline: "STOP MEMORIZING", kicker: "MISTAKE", subline: "do this instead", flip: true, seed: 257 },
  { id: "gx-312", niche: "education", arch: "banner", accent: "#0f766e", bg: "gfx_bg_38.webp", cuts: ["gfx_hand_08.webp"], screen: [false], headline: "95 PERCENT IN BOARDS", kicker: "GUIDE", subline: "my method", flip: false, seed: 288 },
  { id: "gx-313", niche: "education", arch: "minimal", accent: "#0f766e", bg: "gfx_bg_41.webp", cuts: ["gfx_hand_02.webp"], screen: [false], headline: "FREE COURSES", kicker: "2026", subline: "learn anything", flip: true, seed: 319 },
  { id: "gx-314", niche: "education", arch: "vs", accent: "#0f766e", bg: "gfx_bg_44.webp", cuts: ["gfx_bg_31.webp"], screen: [false], headline: "NOTES THAT WORK", kicker: "TIPS", subline: "topper system", flip: false, seed: 350 },
  { id: "gx-315", niche: "education", arch: "split", accent: "#0f766e", bg: "gfx_bg_47.webp", cuts: [], screen: [], headline: "STUDY SMART", kicker: "TOPPER", subline: "secrets revealed", flip: true, seed: 381 },
  { id: "gx-316", niche: "education", arch: "cinematic", accent: "#0f766e", bg: "gfx_bg_50.webp", cuts: [], screen: [], headline: "EXAM IN 7 DAYS", kicker: "PLAN", subline: "full strategy", flip: false, seed: 412 },
  { id: "gx-317", niche: "education", arch: "arrow", accent: "#0f766e", bg: "gfx_bg_53.webp", cuts: ["gfx_arrow_06.webp"], screen: [false], headline: "STOP MEMORIZING", kicker: "MISTAKE", subline: "do this instead", flip: true, seed: 443 },
  { id: "gx-318", niche: "education", arch: "circle", accent: "#0f766e", bg: "gfx_bg_03.webp", cuts: ["gfx_hand_04.webp"], screen: [false], headline: "95 PERCENT IN BOARDS", kicker: "GUIDE", subline: "my method", flip: false, seed: 474 },
  { id: "gx-319", niche: "education", arch: "money", accent: "#0f766e", bg: "gfx_bg_06.webp", cuts: ["gfx_money_08.webp", "gfx_money_04.webp", "gfx_money_01.webp"], screen: [false, false, false], headline: "FREE COURSES", kicker: "2026", subline: "learn anything", flip: true, seed: 505 },
  { id: "gx-320", niche: "education", arch: "fire", accent: "#0f766e", bg: "gfx_bg_09.webp", cuts: ["gfx_fire_04.webp", "gfx_fire_01.webp"], screen: [true, true], headline: "NOTES THAT WORK", kicker: "TIPS", subline: "topper system", flip: false, seed: 536 },
  { id: "gx-321", niche: "education", arch: "graph", accent: "#0f766e", bg: "gfx_bg_12.webp", cuts: [], screen: [], headline: "STUDY SMART", kicker: "TOPPER", subline: "secrets revealed", flip: true, seed: 567 },
  { id: "gx-322", niche: "education", arch: "device", accent: "#0f766e", bg: "gfx_bg_15.webp", cuts: ["gfx_device_09.webp"], screen: [false], headline: "EXAM IN 7 DAYS", kicker: "PLAN", subline: "full strategy", flip: false, seed: 598 },
  { id: "gx-323", niche: "education", arch: "hand", accent: "#0f766e", bg: "gfx_bg_18.webp", cuts: ["gfx_hand_06.webp"], screen: [false], headline: "STOP MEMORIZING", kicker: "MISTAKE", subline: "do this instead", flip: true, seed: 629 },
  { id: "gx-324", niche: "education", arch: "banner", accent: "#0f766e", bg: "gfx_bg_21.webp", cuts: ["gfx_hand_08.webp"], screen: [false], headline: "95 PERCENT IN BOARDS", kicker: "GUIDE", subline: "my method", flip: false, seed: 660 },
  { id: "gx-325", niche: "education", arch: "minimal", accent: "#0f766e", bg: "gfx_bg_24.webp", cuts: ["gfx_hand_02.webp"], screen: [false], headline: "FREE COURSES", kicker: "2026", subline: "learn anything", flip: true, seed: 691 },
  { id: "gx-326", niche: "education", arch: "vs", accent: "#0f766e", bg: "gfx_bg_27.webp", cuts: ["gfx_bg_14.webp"], screen: [false], headline: "NOTES THAT WORK", kicker: "TIPS", subline: "topper system", flip: false, seed: 722 },
  { id: "gx-327", niche: "education", arch: "split", accent: "#0f766e", bg: "gfx_bg_30.webp", cuts: [], screen: [], headline: "STUDY SMART", kicker: "TOPPER", subline: "secrets revealed", flip: true, seed: 753 },
  { id: "gx-328", niche: "education", arch: "cinematic", accent: "#0f766e", bg: "gfx_bg_33.webp", cuts: [], screen: [], headline: "EXAM IN 7 DAYS", kicker: "PLAN", subline: "full strategy", flip: false, seed: 784 },
  { id: "gx-329", niche: "education", arch: "arrow", accent: "#0f766e", bg: "gfx_bg_36.webp", cuts: ["gfx_arrow_06.webp"], screen: [false], headline: "STOP MEMORIZING", kicker: "MISTAKE", subline: "do this instead", flip: true, seed: 815 },
  { id: "gx-330", niche: "education", arch: "circle", accent: "#0f766e", bg: "gfx_bg_39.webp", cuts: ["gfx_hand_04.webp"], screen: [false], headline: "95 PERCENT IN BOARDS", kicker: "GUIDE", subline: "my method", flip: false, seed: 846 },
  { id: "gx-331", niche: "education", arch: "money", accent: "#0f766e", bg: "gfx_bg_42.webp", cuts: ["gfx_money_02.webp", "gfx_money_07.webp", "gfx_money_04.webp"], screen: [false, false, false], headline: "FREE COURSES", kicker: "2026", subline: "learn anything", flip: true, seed: 877 },
  { id: "gx-332", niche: "education", arch: "fire", accent: "#0f766e", bg: "gfx_bg_45.webp", cuts: ["gfx_fire_02.webp", "gfx_fire_06.webp"], screen: [true, true], headline: "NOTES THAT WORK", kicker: "TIPS", subline: "topper system", flip: false, seed: 908 },
  { id: "gx-333", niche: "education", arch: "graph", accent: "#0f766e", bg: "gfx_bg_48.webp", cuts: [], screen: [], headline: "STUDY SMART", kicker: "TOPPER", subline: "secrets revealed", flip: true, seed: 939 },
  { id: "gx-334", niche: "education", arch: "device", accent: "#0f766e", bg: "gfx_bg_51.webp", cuts: ["gfx_device_01.webp"], screen: [false], headline: "EXAM IN 7 DAYS", kicker: "PLAN", subline: "full strategy", flip: false, seed: 970 },
  { id: "gx-335", niche: "education", arch: "hand", accent: "#0f766e", bg: "gfx_bg_01.webp", cuts: ["gfx_hand_02.webp"], screen: [false], headline: "STOP MEMORIZING", kicker: "MISTAKE", subline: "do this instead", flip: true, seed: 1001 },
  { id: "gx-336", niche: "music", arch: "split", accent: "#a21caf", bg: "gfx_bg_18.webp", cuts: [], screen: [], headline: "LIVE PERFORMANCE", kicker: "CONCERT", subline: "unreal crowd", flip: true, seed: 10 },
  { id: "gx-337", niche: "music", arch: "cinematic", accent: "#a21caf", bg: "gfx_bg_21.webp", cuts: [], screen: [], headline: "I MADE A BEAT", kicker: "STUDIO", subline: "in 10 minutes", flip: false, seed: 41 },
  { id: "gx-338", niche: "music", arch: "arrow", accent: "#a21caf", bg: "gfx_bg_24.webp", cuts: ["gfx_arrow_09.webp"], screen: [false], headline: "SINGER EXPOSED", kicker: "TRUTH", subline: "what happened", flip: true, seed: 72 },
  { id: "gx-339", niche: "music", arch: "circle", accent: "#a21caf", bg: "gfx_bg_27.webp", cuts: ["gfx_abstract_03.webp"], screen: [false], headline: "TOP 10 SONGS", kicker: "2026", subline: "on repeat", flip: false, seed: 103 },
  { id: "gx-340", niche: "music", arch: "money", accent: "#a21caf", bg: "gfx_bg_30.webp", cuts: ["gfx_money_05.webp", "gfx_money_01.webp", "gfx_money_07.webp"], screen: [false, false, false], headline: "ACOUSTIC COVER", kicker: "LIVE", subline: "chills", flip: true, seed: 134 },
  { id: "gx-341", niche: "music", arch: "fire", accent: "#a21caf", bg: "gfx_bg_33.webp", cuts: ["gfx_fire_06.webp", "gfx_fire_03.webp"], screen: [true, true], headline: "BEHIND THE SONG", kicker: "STORY", subline: "how it was made", flip: false, seed: 165 },
  { id: "gx-342", niche: "music", arch: "graph", accent: "#a21caf", bg: "gfx_bg_36.webp", cuts: [], screen: [], headline: "LIVE PERFORMANCE", kicker: "CONCERT", subline: "unreal crowd", flip: true, seed: 196 },
  { id: "gx-343", niche: "music", arch: "device", accent: "#a21caf", bg: "gfx_bg_39.webp", cuts: ["gfx_device_08.webp"], screen: [false], headline: "I MADE A BEAT", kicker: "STUDIO", subline: "in 10 minutes", flip: false, seed: 227 },
  { id: "gx-344", niche: "music", arch: "hand", accent: "#a21caf", bg: "gfx_bg_42.webp", cuts: ["gfx_hand_03.webp"], screen: [false], headline: "SINGER EXPOSED", kicker: "TRUTH", subline: "what happened", flip: true, seed: 258 },
  { id: "gx-345", niche: "music", arch: "banner", accent: "#a21caf", bg: "gfx_bg_45.webp", cuts: ["gfx_abstract_03.webp"], screen: [false], headline: "TOP 10 SONGS", kicker: "2026", subline: "on repeat", flip: false, seed: 289 },
  { id: "gx-346", niche: "music", arch: "minimal", accent: "#a21caf", bg: "gfx_bg_48.webp", cuts: ["gfx_abstract_05.webp"], screen: [false], headline: "ACOUSTIC COVER", kicker: "LIVE", subline: "chills", flip: true, seed: 320 },
  { id: "gx-347", niche: "music", arch: "vs", accent: "#a21caf", bg: "gfx_bg_51.webp", cuts: ["gfx_bg_38.webp"], screen: [false], headline: "BEHIND THE SONG", kicker: "STORY", subline: "how it was made", flip: false, seed: 351 },
  { id: "gx-348", niche: "music", arch: "split", accent: "#a21caf", bg: "gfx_bg_01.webp", cuts: [], screen: [], headline: "LIVE PERFORMANCE", kicker: "CONCERT", subline: "unreal crowd", flip: true, seed: 382 },
  { id: "gx-349", niche: "music", arch: "cinematic", accent: "#a21caf", bg: "gfx_bg_04.webp", cuts: [], screen: [], headline: "I MADE A BEAT", kicker: "STUDIO", subline: "in 10 minutes", flip: false, seed: 413 },
  { id: "gx-350", niche: "music", arch: "arrow", accent: "#a21caf", bg: "gfx_bg_07.webp", cuts: ["gfx_arrow_09.webp"], screen: [false], headline: "SINGER EXPOSED", kicker: "TRUTH", subline: "what happened", flip: true, seed: 444 },
  { id: "gx-351", niche: "music", arch: "circle", accent: "#a21caf", bg: "gfx_bg_10.webp", cuts: ["gfx_abstract_03.webp"], screen: [false], headline: "TOP 10 SONGS", kicker: "2026", subline: "on repeat", flip: false, seed: 475 },
  { id: "gx-352", niche: "music", arch: "money", accent: "#a21caf", bg: "gfx_bg_13.webp", cuts: ["gfx_money_08.webp", "gfx_money_04.webp", "gfx_money_01.webp"], screen: [false, false, false], headline: "ACOUSTIC COVER", kicker: "LIVE", subline: "chills", flip: true, seed: 506 },
  { id: "gx-353", niche: "music", arch: "fire", accent: "#a21caf", bg: "gfx_bg_16.webp", cuts: ["gfx_fire_04.webp", "gfx_fire_01.webp"], screen: [true, true], headline: "BEHIND THE SONG", kicker: "STORY", subline: "how it was made", flip: false, seed: 537 },
  { id: "gx-354", niche: "music", arch: "graph", accent: "#a21caf", bg: "gfx_bg_19.webp", cuts: [], screen: [], headline: "LIVE PERFORMANCE", kicker: "CONCERT", subline: "unreal crowd", flip: true, seed: 568 },
  { id: "gx-355", niche: "music", arch: "device", accent: "#a21caf", bg: "gfx_bg_22.webp", cuts: ["gfx_device_10.webp"], screen: [false], headline: "I MADE A BEAT", kicker: "STUDIO", subline: "in 10 minutes", flip: false, seed: 599 },
  { id: "gx-356", niche: "music", arch: "hand", accent: "#a21caf", bg: "gfx_bg_25.webp", cuts: ["gfx_hand_07.webp"], screen: [false], headline: "SINGER EXPOSED", kicker: "TRUTH", subline: "what happened", flip: true, seed: 630 },
  { id: "gx-357", niche: "music", arch: "banner", accent: "#a21caf", bg: "gfx_bg_28.webp", cuts: ["gfx_abstract_03.webp"], screen: [false], headline: "TOP 10 SONGS", kicker: "2026", subline: "on repeat", flip: false, seed: 661 },
  { id: "gx-358", niche: "music", arch: "minimal", accent: "#a21caf", bg: "gfx_bg_31.webp", cuts: ["gfx_abstract_05.webp"], screen: [false], headline: "ACOUSTIC COVER", kicker: "LIVE", subline: "chills", flip: true, seed: 692 },
  { id: "gx-359", niche: "music", arch: "vs", accent: "#a21caf", bg: "gfx_bg_34.webp", cuts: ["gfx_bg_21.webp"], screen: [false], headline: "BEHIND THE SONG", kicker: "STORY", subline: "how it was made", flip: false, seed: 723 },
  { id: "gx-360", niche: "music", arch: "split", accent: "#a21caf", bg: "gfx_bg_37.webp", cuts: [], screen: [], headline: "LIVE PERFORMANCE", kicker: "CONCERT", subline: "unreal crowd", flip: true, seed: 754 },
  { id: "gx-361", niche: "music", arch: "cinematic", accent: "#a21caf", bg: "gfx_bg_40.webp", cuts: [], screen: [], headline: "I MADE A BEAT", kicker: "STUDIO", subline: "in 10 minutes", flip: false, seed: 785 },
  { id: "gx-362", niche: "music", arch: "arrow", accent: "#a21caf", bg: "gfx_bg_43.webp", cuts: ["gfx_arrow_09.webp"], screen: [false], headline: "SINGER EXPOSED", kicker: "TRUTH", subline: "what happened", flip: true, seed: 816 },
  { id: "gx-363", niche: "music", arch: "circle", accent: "#a21caf", bg: "gfx_bg_46.webp", cuts: ["gfx_abstract_03.webp"], screen: [false], headline: "TOP 10 SONGS", kicker: "2026", subline: "on repeat", flip: false, seed: 847 },
  { id: "gx-364", niche: "music", arch: "money", accent: "#a21caf", bg: "gfx_bg_49.webp", cuts: ["gfx_money_02.webp", "gfx_money_07.webp", "gfx_money_04.webp"], screen: [false, false, false], headline: "ACOUSTIC COVER", kicker: "LIVE", subline: "chills", flip: true, seed: 878 },
  { id: "gx-365", niche: "music", arch: "fire", accent: "#a21caf", bg: "gfx_bg_52.webp", cuts: ["gfx_fire_02.webp", "gfx_fire_06.webp"], screen: [true, true], headline: "BEHIND THE SONG", kicker: "STORY", subline: "how it was made", flip: false, seed: 909 },
  { id: "gx-366", niche: "music", arch: "graph", accent: "#a21caf", bg: "gfx_bg_02.webp", cuts: [], screen: [], headline: "LIVE PERFORMANCE", kicker: "CONCERT", subline: "unreal crowd", flip: true, seed: 940 },
  { id: "gx-367", niche: "music", arch: "device", accent: "#a21caf", bg: "gfx_bg_05.webp", cuts: ["gfx_device_02.webp"], screen: [false], headline: "I MADE A BEAT", kicker: "STUDIO", subline: "in 10 minutes", flip: false, seed: 971 },
  { id: "gx-368", niche: "music", arch: "hand", accent: "#a21caf", bg: "gfx_bg_08.webp", cuts: ["gfx_hand_03.webp"], screen: [false], headline: "SINGER EXPOSED", kicker: "TRUTH", subline: "what happened", flip: true, seed: 1002 },
  { id: "gx-369", niche: "fashion", arch: "split", accent: "#be185d", bg: "gfx_bg_25.webp", cuts: [], screen: [], headline: "2026 LOOKBOOK", kicker: "STYLE", subline: "new trends", flip: true, seed: 11 },
  { id: "gx-370", niche: "fashion", arch: "cinematic", accent: "#be185d", bg: "gfx_bg_28.webp", cuts: [], screen: [], headline: "$50 OUTFIT", kicker: "HAUL", subline: "looks expensive", flip: false, seed: 42 },
  { id: "gx-371", niche: "fashion", arch: "arrow", accent: "#be185d", bg: "gfx_bg_31.webp", cuts: ["gfx_arrow_12.webp"], screen: [false], headline: "STOP WEARING THIS", kicker: "MISTAKES", subline: "fashion fails", flip: true, seed: 73 },
  { id: "gx-372", niche: "fashion", arch: "circle", accent: "#be185d", bg: "gfx_bg_34.webp", cuts: ["gfx_abstract_02.webp"], screen: [false], headline: "THRIFT FLIP", kicker: "DIY", subline: "before and after", flip: false, seed: 104 },
  { id: "gx-373", niche: "fashion", arch: "money", accent: "#be185d", bg: "gfx_bg_37.webp", cuts: ["gfx_money_05.webp", "gfx_money_01.webp", "gfx_money_07.webp"], screen: [false, false, false], headline: "CAPSULE WARDROBE", kicker: "GUIDE", subline: "15 pieces only", flip: true, seed: 135 },
  { id: "gx-374", niche: "fashion", arch: "fire", accent: "#be185d", bg: "gfx_bg_40.webp", cuts: ["gfx_fire_06.webp", "gfx_fire_03.webp"], screen: [true, true], headline: "DESI vs WESTERN", kicker: "STYLE", subline: "which wins", flip: false, seed: 166 },
  { id: "gx-375", niche: "fashion", arch: "graph", accent: "#be185d", bg: "gfx_bg_43.webp", cuts: [], screen: [], headline: "2026 LOOKBOOK", kicker: "STYLE", subline: "new trends", flip: true, seed: 197 },
  { id: "gx-376", niche: "fashion", arch: "device", accent: "#be185d", bg: "gfx_bg_46.webp", cuts: ["gfx_device_09.webp"], screen: [false], headline: "$50 OUTFIT", kicker: "HAUL", subline: "looks expensive", flip: false, seed: 228 },
  { id: "gx-377", niche: "fashion", arch: "hand", accent: "#be185d", bg: "gfx_bg_49.webp", cuts: ["gfx_hand_04.webp"], screen: [false], headline: "STOP WEARING THIS", kicker: "MISTAKES", subline: "fashion fails", flip: true, seed: 259 },
  { id: "gx-378", niche: "fashion", arch: "banner", accent: "#be185d", bg: "gfx_bg_52.webp", cuts: ["gfx_abstract_02.webp"], screen: [false], headline: "THRIFT FLIP", kicker: "DIY", subline: "before and after", flip: false, seed: 290 },
  { id: "gx-379", niche: "fashion", arch: "minimal", accent: "#be185d", bg: "gfx_bg_02.webp", cuts: ["gfx_abstract_04.webp"], screen: [false], headline: "CAPSULE WARDROBE", kicker: "GUIDE", subline: "15 pieces only", flip: true, seed: 321 },
  { id: "gx-380", niche: "fashion", arch: "vs", accent: "#be185d", bg: "gfx_bg_05.webp", cuts: ["gfx_bg_45.webp"], screen: [false], headline: "DESI vs WESTERN", kicker: "STYLE", subline: "which wins", flip: false, seed: 352 },
  { id: "gx-381", niche: "fashion", arch: "split", accent: "#be185d", bg: "gfx_bg_08.webp", cuts: [], screen: [], headline: "2026 LOOKBOOK", kicker: "STYLE", subline: "new trends", flip: true, seed: 383 },
  { id: "gx-382", niche: "fashion", arch: "cinematic", accent: "#be185d", bg: "gfx_bg_11.webp", cuts: [], screen: [], headline: "$50 OUTFIT", kicker: "HAUL", subline: "looks expensive", flip: false, seed: 414 },
  { id: "gx-383", niche: "fashion", arch: "arrow", accent: "#be185d", bg: "gfx_bg_14.webp", cuts: ["gfx_arrow_12.webp"], screen: [false], headline: "STOP WEARING THIS", kicker: "MISTAKES", subline: "fashion fails", flip: true, seed: 445 },
  { id: "gx-384", niche: "fashion", arch: "circle", accent: "#be185d", bg: "gfx_bg_17.webp", cuts: ["gfx_abstract_02.webp"], screen: [false], headline: "THRIFT FLIP", kicker: "DIY", subline: "before and after", flip: false, seed: 476 },
  { id: "gx-385", niche: "fashion", arch: "money", accent: "#be185d", bg: "gfx_bg_20.webp", cuts: ["gfx_money_08.webp", "gfx_money_04.webp", "gfx_money_01.webp"], screen: [false, false, false], headline: "CAPSULE WARDROBE", kicker: "GUIDE", subline: "15 pieces only", flip: true, seed: 507 },
  { id: "gx-386", niche: "fashion", arch: "fire", accent: "#be185d", bg: "gfx_bg_23.webp", cuts: ["gfx_fire_04.webp", "gfx_fire_01.webp"], screen: [true, true], headline: "DESI vs WESTERN", kicker: "STYLE", subline: "which wins", flip: false, seed: 538 },
  { id: "gx-387", niche: "fashion", arch: "graph", accent: "#be185d", bg: "gfx_bg_26.webp", cuts: [], screen: [], headline: "2026 LOOKBOOK", kicker: "STYLE", subline: "new trends", flip: true, seed: 569 },
  { id: "gx-388", niche: "fashion", arch: "device", accent: "#be185d", bg: "gfx_bg_29.webp", cuts: ["gfx_device_01.webp"], screen: [false], headline: "$50 OUTFIT", kicker: "HAUL", subline: "looks expensive", flip: false, seed: 600 },
  { id: "gx-389", niche: "fashion", arch: "hand", accent: "#be185d", bg: "gfx_bg_32.webp", cuts: ["gfx_hand_08.webp"], screen: [false], headline: "STOP WEARING THIS", kicker: "MISTAKES", subline: "fashion fails", flip: true, seed: 631 },
  { id: "gx-390", niche: "fashion", arch: "banner", accent: "#be185d", bg: "gfx_bg_35.webp", cuts: ["gfx_abstract_02.webp"], screen: [false], headline: "THRIFT FLIP", kicker: "DIY", subline: "before and after", flip: false, seed: 662 },
  { id: "gx-391", niche: "fashion", arch: "minimal", accent: "#be185d", bg: "gfx_bg_38.webp", cuts: ["gfx_abstract_04.webp"], screen: [false], headline: "CAPSULE WARDROBE", kicker: "GUIDE", subline: "15 pieces only", flip: true, seed: 693 },
  { id: "gx-392", niche: "fashion", arch: "vs", accent: "#be185d", bg: "gfx_bg_41.webp", cuts: ["gfx_bg_28.webp"], screen: [false], headline: "DESI vs WESTERN", kicker: "STYLE", subline: "which wins", flip: false, seed: 724 },
  { id: "gx-393", niche: "fashion", arch: "split", accent: "#be185d", bg: "gfx_bg_44.webp", cuts: [], screen: [], headline: "2026 LOOKBOOK", kicker: "STYLE", subline: "new trends", flip: true, seed: 755 },
  { id: "gx-394", niche: "fashion", arch: "cinematic", accent: "#be185d", bg: "gfx_bg_47.webp", cuts: [], screen: [], headline: "$50 OUTFIT", kicker: "HAUL", subline: "looks expensive", flip: false, seed: 786 },
  { id: "gx-395", niche: "fashion", arch: "arrow", accent: "#be185d", bg: "gfx_bg_50.webp", cuts: ["gfx_arrow_12.webp"], screen: [false], headline: "STOP WEARING THIS", kicker: "MISTAKES", subline: "fashion fails", flip: true, seed: 817 },
  { id: "gx-396", niche: "fashion", arch: "circle", accent: "#be185d", bg: "gfx_bg_53.webp", cuts: ["gfx_abstract_02.webp"], screen: [false], headline: "THRIFT FLIP", kicker: "DIY", subline: "before and after", flip: false, seed: 848 },
  { id: "gx-397", niche: "fashion", arch: "money", accent: "#be185d", bg: "gfx_bg_03.webp", cuts: ["gfx_money_02.webp", "gfx_money_07.webp", "gfx_money_04.webp"], screen: [false, false, false], headline: "CAPSULE WARDROBE", kicker: "GUIDE", subline: "15 pieces only", flip: true, seed: 879 },
  { id: "gx-398", niche: "fashion", arch: "fire", accent: "#be185d", bg: "gfx_bg_06.webp", cuts: ["gfx_fire_02.webp", "gfx_fire_06.webp"], screen: [true, true], headline: "DESI vs WESTERN", kicker: "STYLE", subline: "which wins", flip: false, seed: 910 },
  { id: "gx-399", niche: "fashion", arch: "graph", accent: "#be185d", bg: "gfx_bg_09.webp", cuts: [], screen: [], headline: "2026 LOOKBOOK", kicker: "STYLE", subline: "new trends", flip: true, seed: 941 },
  { id: "gx-400", niche: "fashion", arch: "device", accent: "#be185d", bg: "gfx_bg_12.webp", cuts: ["gfx_device_03.webp"], screen: [false], headline: "$50 OUTFIT", kicker: "HAUL", subline: "looks expensive", flip: false, seed: 972 },
  { id: "gx-401", niche: "fashion", arch: "hand", accent: "#be185d", bg: "gfx_bg_15.webp", cuts: ["gfx_hand_04.webp"], screen: [false], headline: "STOP WEARING THIS", kicker: "MISTAKES", subline: "fashion fails", flip: true, seed: 1003 },
  { id: "gx-402", niche: "realestate", arch: "split", accent: "#047857", bg: "gfx_bg_32.webp", cuts: [], screen: [], headline: "DREAM HOME", kicker: "TOUR", subline: "inside look", flip: true, seed: 12 },
  { id: "gx-403", niche: "realestate", arch: "cinematic", accent: "#047857", bg: "gfx_bg_35.webp", cuts: [], screen: [], headline: "BUY vs RENT", kicker: "2026", subline: "real numbers", flip: false, seed: 43 },
  { id: "gx-404", niche: "realestate", arch: "arrow", accent: "#047857", bg: "gfx_bg_38.webp", cuts: ["gfx_arrow_03.webp"], screen: [false], headline: "I BOUGHT LAND", kicker: "STORY", subline: "full process", flip: true, seed: 74 },
  { id: "gx-405", niche: "realestate", arch: "circle", accent: "#047857", bg: "gfx_bg_41.webp", cuts: ["gfx_animal_03.webp"], screen: [false], headline: "5 RED FLAGS", kicker: "WARNING", subline: "before you buy", flip: false, seed: 105 },
  { id: "gx-406", niche: "realestate", arch: "money", accent: "#047857", bg: "gfx_bg_44.webp", cuts: ["gfx_money_05.webp", "gfx_money_01.webp", "gfx_money_07.webp"], screen: [false, false, false], headline: "CHEAP PLOTS", kicker: "GUIDE", subline: "where to look", flip: true, seed: 136 },
  { id: "gx-407", niche: "realestate", arch: "fire", accent: "#047857", bg: "gfx_bg_47.webp", cuts: ["gfx_fire_06.webp", "gfx_fire_03.webp"], screen: [true, true], headline: "HOME MAKEOVER", kicker: "BEFORE AFTER", subline: "unbelievable", flip: false, seed: 167 },
  { id: "gx-408", niche: "realestate", arch: "graph", accent: "#047857", bg: "gfx_bg_50.webp", cuts: [], screen: [], headline: "DREAM HOME", kicker: "TOUR", subline: "inside look", flip: true, seed: 198 },
  { id: "gx-409", niche: "realestate", arch: "device", accent: "#047857", bg: "gfx_bg_53.webp", cuts: ["gfx_device_10.webp"], screen: [false], headline: "BUY vs RENT", kicker: "2026", subline: "real numbers", flip: false, seed: 229 },
  { id: "gx-410", niche: "realestate", arch: "hand", accent: "#047857", bg: "gfx_bg_03.webp", cuts: ["gfx_hand_05.webp"], screen: [false], headline: "I BOUGHT LAND", kicker: "STORY", subline: "full process", flip: true, seed: 260 },
  { id: "gx-411", niche: "realestate", arch: "banner", accent: "#047857", bg: "gfx_bg_06.webp", cuts: ["gfx_animal_07.webp"], screen: [false], headline: "5 RED FLAGS", kicker: "WARNING", subline: "before you buy", flip: false, seed: 291 },
  { id: "gx-412", niche: "realestate", arch: "minimal", accent: "#047857", bg: "gfx_bg_09.webp", cuts: ["gfx_animal_01.webp"], screen: [false], headline: "CHEAP PLOTS", kicker: "GUIDE", subline: "where to look", flip: true, seed: 322 },
  { id: "gx-413", niche: "realestate", arch: "vs", accent: "#047857", bg: "gfx_bg_12.webp", cuts: ["gfx_bg_52.webp"], screen: [false], headline: "HOME MAKEOVER", kicker: "BEFORE AFTER", subline: "unbelievable", flip: false, seed: 353 },
  { id: "gx-414", niche: "realestate", arch: "split", accent: "#047857", bg: "gfx_bg_15.webp", cuts: [], screen: [], headline: "DREAM HOME", kicker: "TOUR", subline: "inside look", flip: true, seed: 384 },
  { id: "gx-415", niche: "realestate", arch: "cinematic", accent: "#047857", bg: "gfx_bg_18.webp", cuts: [], screen: [], headline: "BUY vs RENT", kicker: "2026", subline: "real numbers", flip: false, seed: 415 },
  { id: "gx-416", niche: "realestate", arch: "arrow", accent: "#047857", bg: "gfx_bg_21.webp", cuts: ["gfx_arrow_03.webp"], screen: [false], headline: "I BOUGHT LAND", kicker: "STORY", subline: "full process", flip: true, seed: 446 },
  { id: "gx-417", niche: "realestate", arch: "circle", accent: "#047857", bg: "gfx_bg_24.webp", cuts: ["gfx_animal_03.webp"], screen: [false], headline: "5 RED FLAGS", kicker: "WARNING", subline: "before you buy", flip: false, seed: 477 },
  { id: "gx-418", niche: "realestate", arch: "money", accent: "#047857", bg: "gfx_bg_27.webp", cuts: ["gfx_money_08.webp", "gfx_money_04.webp", "gfx_money_01.webp"], screen: [false, false, false], headline: "CHEAP PLOTS", kicker: "GUIDE", subline: "where to look", flip: true, seed: 508 },
  { id: "gx-419", niche: "realestate", arch: "fire", accent: "#047857", bg: "gfx_bg_30.webp", cuts: ["gfx_fire_04.webp", "gfx_fire_01.webp"], screen: [true, true], headline: "HOME MAKEOVER", kicker: "BEFORE AFTER", subline: "unbelievable", flip: false, seed: 539 },
  { id: "gx-420", niche: "realestate", arch: "graph", accent: "#047857", bg: "gfx_bg_33.webp", cuts: [], screen: [], headline: "DREAM HOME", kicker: "TOUR", subline: "inside look", flip: true, seed: 570 },
  { id: "gx-421", niche: "realestate", arch: "device", accent: "#047857", bg: "gfx_bg_36.webp", cuts: ["gfx_device_02.webp"], screen: [false], headline: "BUY vs RENT", kicker: "2026", subline: "real numbers", flip: false, seed: 601 },
  { id: "gx-422", niche: "realestate", arch: "hand", accent: "#047857", bg: "gfx_bg_39.webp", cuts: ["gfx_hand_01.webp"], screen: [false], headline: "I BOUGHT LAND", kicker: "STORY", subline: "full process", flip: true, seed: 632 },
  { id: "gx-423", niche: "realestate", arch: "banner", accent: "#047857", bg: "gfx_bg_42.webp", cuts: ["gfx_animal_07.webp"], screen: [false], headline: "5 RED FLAGS", kicker: "WARNING", subline: "before you buy", flip: false, seed: 663 },
  { id: "gx-424", niche: "realestate", arch: "minimal", accent: "#047857", bg: "gfx_bg_45.webp", cuts: ["gfx_animal_01.webp"], screen: [false], headline: "CHEAP PLOTS", kicker: "GUIDE", subline: "where to look", flip: true, seed: 694 },
  { id: "gx-425", niche: "realestate", arch: "vs", accent: "#047857", bg: "gfx_bg_48.webp", cuts: ["gfx_bg_35.webp"], screen: [false], headline: "HOME MAKEOVER", kicker: "BEFORE AFTER", subline: "unbelievable", flip: false, seed: 725 },
  { id: "gx-426", niche: "realestate", arch: "split", accent: "#047857", bg: "gfx_bg_51.webp", cuts: [], screen: [], headline: "DREAM HOME", kicker: "TOUR", subline: "inside look", flip: true, seed: 756 },
  { id: "gx-427", niche: "realestate", arch: "cinematic", accent: "#047857", bg: "gfx_bg_01.webp", cuts: [], screen: [], headline: "BUY vs RENT", kicker: "2026", subline: "real numbers", flip: false, seed: 787 },
  { id: "gx-428", niche: "realestate", arch: "arrow", accent: "#047857", bg: "gfx_bg_04.webp", cuts: ["gfx_arrow_03.webp"], screen: [false], headline: "I BOUGHT LAND", kicker: "STORY", subline: "full process", flip: true, seed: 818 },
  { id: "gx-429", niche: "realestate", arch: "circle", accent: "#047857", bg: "gfx_bg_07.webp", cuts: ["gfx_animal_03.webp"], screen: [false], headline: "5 RED FLAGS", kicker: "WARNING", subline: "before you buy", flip: false, seed: 849 },
  { id: "gx-430", niche: "realestate", arch: "money", accent: "#047857", bg: "gfx_bg_10.webp", cuts: ["gfx_money_02.webp", "gfx_money_07.webp", "gfx_money_04.webp"], screen: [false, false, false], headline: "CHEAP PLOTS", kicker: "GUIDE", subline: "where to look", flip: true, seed: 880 },
  { id: "gx-431", niche: "realestate", arch: "fire", accent: "#047857", bg: "gfx_bg_13.webp", cuts: ["gfx_fire_02.webp", "gfx_fire_06.webp"], screen: [true, true], headline: "HOME MAKEOVER", kicker: "BEFORE AFTER", subline: "unbelievable", flip: false, seed: 911 },
  { id: "gx-432", niche: "realestate", arch: "graph", accent: "#047857", bg: "gfx_bg_16.webp", cuts: [], screen: [], headline: "DREAM HOME", kicker: "TOUR", subline: "inside look", flip: true, seed: 942 },
  { id: "gx-433", niche: "realestate", arch: "device", accent: "#047857", bg: "gfx_bg_19.webp", cuts: ["gfx_device_04.webp"], screen: [false], headline: "BUY vs RENT", kicker: "2026", subline: "real numbers", flip: false, seed: 973 },
  { id: "gx-434", niche: "realestate", arch: "hand", accent: "#047857", bg: "gfx_bg_22.webp", cuts: ["gfx_hand_05.webp"], screen: [false], headline: "I BOUGHT LAND", kicker: "STORY", subline: "full process", flip: true, seed: 1004 },
  { id: "gx-435", niche: "health", arch: "split", accent: "#059669", bg: "gfx_bg_39.webp", cuts: [], screen: [], headline: "DOCTOR EXPLAINS", kicker: "HEALTH", subline: "watch this", flip: true, seed: 13 },
  { id: "gx-436", niche: "health", arch: "cinematic", accent: "#059669", bg: "gfx_bg_42.webp", cuts: [], screen: [], headline: "STOP EATING THIS", kicker: "WARNING", subline: "harming you daily", flip: false, seed: 44 },
  { id: "gx-437", niche: "health", arch: "arrow", accent: "#059669", bg: "gfx_bg_45.webp", cuts: ["gfx_arrow_06.webp"], screen: [false], headline: "5 MIN ROUTINE", kicker: "WELLNESS", subline: "feel new", flip: true, seed: 75 },
  { id: "gx-438", niche: "health", arch: "circle", accent: "#059669", bg: "gfx_bg_48.webp", cuts: ["gfx_hand_08.webp"], screen: [false], headline: "SLEEP BETTER", kicker: "TIPS", subline: "tonight itself", flip: false, seed: 106 },
  { id: "gx-439", niche: "health", arch: "money", accent: "#059669", bg: "gfx_bg_51.webp", cuts: ["gfx_money_05.webp", "gfx_money_01.webp", "gfx_money_07.webp"], screen: [false, false, false], headline: "IMMUNITY BOOST", kicker: "GUIDE", subline: "natural ways", flip: true, seed: 137 },
  { id: "gx-440", niche: "health", arch: "fire", accent: "#059669", bg: "gfx_bg_01.webp", cuts: ["gfx_fire_06.webp", "gfx_fire_03.webp"], screen: [true, true], headline: "MYTH vs FACT", kicker: "TRUTH", subline: "doctor reacts", flip: false, seed: 168 },
  { id: "gx-441", niche: "health", arch: "graph", accent: "#059669", bg: "gfx_bg_04.webp", cuts: [], screen: [], headline: "DOCTOR EXPLAINS", kicker: "HEALTH", subline: "watch this", flip: true, seed: 199 },
  { id: "gx-442", niche: "health", arch: "device", accent: "#059669", bg: "gfx_bg_07.webp", cuts: ["gfx_device_01.webp"], screen: [false], headline: "STOP EATING THIS", kicker: "WARNING", subline: "harming you daily", flip: false, seed: 230 },
  { id: "gx-443", niche: "health", arch: "hand", accent: "#059669", bg: "gfx_bg_10.webp", cuts: ["gfx_hand_06.webp"], screen: [false], headline: "5 MIN ROUTINE", kicker: "WELLNESS", subline: "feel new", flip: true, seed: 261 },
  { id: "gx-444", niche: "health", arch: "banner", accent: "#059669", bg: "gfx_bg_13.webp", cuts: ["gfx_hand_04.webp"], screen: [false], headline: "SLEEP BETTER", kicker: "TIPS", subline: "tonight itself", flip: false, seed: 292 },
  { id: "gx-445", niche: "health", arch: "minimal", accent: "#059669", bg: "gfx_bg_16.webp", cuts: ["gfx_hand_06.webp"], screen: [false], headline: "IMMUNITY BOOST", kicker: "GUIDE", subline: "natural ways", flip: true, seed: 323 },
  { id: "gx-446", niche: "health", arch: "vs", accent: "#059669", bg: "gfx_bg_19.webp", cuts: ["gfx_bg_06.webp"], screen: [false], headline: "MYTH vs FACT", kicker: "TRUTH", subline: "doctor reacts", flip: false, seed: 354 },
  { id: "gx-447", niche: "health", arch: "split", accent: "#059669", bg: "gfx_bg_22.webp", cuts: [], screen: [], headline: "DOCTOR EXPLAINS", kicker: "HEALTH", subline: "watch this", flip: true, seed: 385 },
  { id: "gx-448", niche: "health", arch: "cinematic", accent: "#059669", bg: "gfx_bg_25.webp", cuts: [], screen: [], headline: "STOP EATING THIS", kicker: "WARNING", subline: "harming you daily", flip: false, seed: 416 },
  { id: "gx-449", niche: "health", arch: "arrow", accent: "#059669", bg: "gfx_bg_28.webp", cuts: ["gfx_arrow_06.webp"], screen: [false], headline: "5 MIN ROUTINE", kicker: "WELLNESS", subline: "feel new", flip: true, seed: 447 },
  { id: "gx-450", niche: "health", arch: "circle", accent: "#059669", bg: "gfx_bg_31.webp", cuts: ["gfx_hand_08.webp"], screen: [false], headline: "SLEEP BETTER", kicker: "TIPS", subline: "tonight itself", flip: false, seed: 478 },
  { id: "gx-451", niche: "health", arch: "money", accent: "#059669", bg: "gfx_bg_34.webp", cuts: ["gfx_money_08.webp", "gfx_money_04.webp", "gfx_money_01.webp"], screen: [false, false, false], headline: "IMMUNITY BOOST", kicker: "GUIDE", subline: "natural ways", flip: true, seed: 509 },
  { id: "gx-452", niche: "health", arch: "fire", accent: "#059669", bg: "gfx_bg_37.webp", cuts: ["gfx_fire_04.webp", "gfx_fire_01.webp"], screen: [true, true], headline: "MYTH vs FACT", kicker: "TRUTH", subline: "doctor reacts", flip: false, seed: 540 },
  { id: "gx-453", niche: "health", arch: "graph", accent: "#059669", bg: "gfx_bg_40.webp", cuts: [], screen: [], headline: "DOCTOR EXPLAINS", kicker: "HEALTH", subline: "watch this", flip: true, seed: 571 },
  { id: "gx-454", niche: "health", arch: "device", accent: "#059669", bg: "gfx_bg_43.webp", cuts: ["gfx_device_03.webp"], screen: [false], headline: "STOP EATING THIS", kicker: "WARNING", subline: "harming you daily", flip: false, seed: 602 },
  { id: "gx-455", niche: "health", arch: "hand", accent: "#059669", bg: "gfx_bg_46.webp", cuts: ["gfx_hand_02.webp"], screen: [false], headline: "5 MIN ROUTINE", kicker: "WELLNESS", subline: "feel new", flip: true, seed: 633 },
  { id: "gx-456", niche: "health", arch: "banner", accent: "#059669", bg: "gfx_bg_49.webp", cuts: ["gfx_hand_04.webp"], screen: [false], headline: "SLEEP BETTER", kicker: "TIPS", subline: "tonight itself", flip: false, seed: 664 },
  { id: "gx-457", niche: "health", arch: "minimal", accent: "#059669", bg: "gfx_bg_52.webp", cuts: ["gfx_hand_06.webp"], screen: [false], headline: "IMMUNITY BOOST", kicker: "GUIDE", subline: "natural ways", flip: true, seed: 695 },
  { id: "gx-458", niche: "health", arch: "vs", accent: "#059669", bg: "gfx_bg_02.webp", cuts: ["gfx_bg_42.webp"], screen: [false], headline: "MYTH vs FACT", kicker: "TRUTH", subline: "doctor reacts", flip: false, seed: 726 },
  { id: "gx-459", niche: "health", arch: "split", accent: "#059669", bg: "gfx_bg_05.webp", cuts: [], screen: [], headline: "DOCTOR EXPLAINS", kicker: "HEALTH", subline: "watch this", flip: true, seed: 757 },
  { id: "gx-460", niche: "health", arch: "cinematic", accent: "#059669", bg: "gfx_bg_08.webp", cuts: [], screen: [], headline: "STOP EATING THIS", kicker: "WARNING", subline: "harming you daily", flip: false, seed: 788 },
  { id: "gx-461", niche: "health", arch: "arrow", accent: "#059669", bg: "gfx_bg_11.webp", cuts: ["gfx_arrow_06.webp"], screen: [false], headline: "5 MIN ROUTINE", kicker: "WELLNESS", subline: "feel new", flip: true, seed: 819 },
  { id: "gx-462", niche: "health", arch: "circle", accent: "#059669", bg: "gfx_bg_14.webp", cuts: ["gfx_hand_08.webp"], screen: [false], headline: "SLEEP BETTER", kicker: "TIPS", subline: "tonight itself", flip: false, seed: 850 },
  { id: "gx-463", niche: "health", arch: "money", accent: "#059669", bg: "gfx_bg_17.webp", cuts: ["gfx_money_02.webp", "gfx_money_07.webp", "gfx_money_04.webp"], screen: [false, false, false], headline: "IMMUNITY BOOST", kicker: "GUIDE", subline: "natural ways", flip: true, seed: 881 },
  { id: "gx-464", niche: "health", arch: "fire", accent: "#059669", bg: "gfx_bg_20.webp", cuts: ["gfx_fire_02.webp", "gfx_fire_06.webp"], screen: [true, true], headline: "MYTH vs FACT", kicker: "TRUTH", subline: "doctor reacts", flip: false, seed: 912 },
  { id: "gx-465", niche: "health", arch: "graph", accent: "#059669", bg: "gfx_bg_23.webp", cuts: [], screen: [], headline: "DOCTOR EXPLAINS", kicker: "HEALTH", subline: "watch this", flip: true, seed: 943 },
  { id: "gx-466", niche: "health", arch: "device", accent: "#059669", bg: "gfx_bg_26.webp", cuts: ["gfx_device_05.webp"], screen: [false], headline: "STOP EATING THIS", kicker: "WARNING", subline: "harming you daily", flip: false, seed: 974 },
  { id: "gx-467", niche: "health", arch: "hand", accent: "#059669", bg: "gfx_bg_29.webp", cuts: ["gfx_hand_06.webp"], screen: [false], headline: "5 MIN ROUTINE", kicker: "WELLNESS", subline: "feel new", flip: true, seed: 1005 },
  { id: "gx-468", niche: "sports", arch: "split", accent: "#ca8a04", bg: "gfx_bg_46.webp", cuts: [], screen: [], headline: "LAST MINUTE GOAL", kicker: "HIGHLIGHTS", subline: "unbelievable", flip: true, seed: 14 },
  { id: "gx-469", niche: "sports", arch: "cinematic", accent: "#ca8a04", bg: "gfx_bg_49.webp", cuts: [], screen: [], headline: "WORLD RECORD", kicker: "BROKEN", subline: "history made", flip: false, seed: 45 },
  { id: "gx-470", niche: "sports", arch: "arrow", accent: "#ca8a04", bg: "gfx_bg_52.webp", cuts: ["gfx_arrow_09.webp"], screen: [false], headline: "TOP 5 PLAYS", kicker: "WEEK", subline: "insane moments", flip: true, seed: 76 },
  { id: "gx-471", niche: "sports", arch: "circle", accent: "#ca8a04", bg: "gfx_bg_02.webp", cuts: ["gfx_fire_07.webp"], screen: [true], headline: "HE DID WHAT", kicker: "VIRAL", subline: "crowd went crazy", flip: false, seed: 107 },
  { id: "gx-472", niche: "sports", arch: "money", accent: "#ca8a04", bg: "gfx_bg_05.webp", cuts: ["gfx_money_05.webp", "gfx_money_01.webp", "gfx_money_07.webp"], screen: [false, false, false], headline: "FINAL PREDICTION", kicker: "2026", subline: "who wins", flip: true, seed: 138 },
  { id: "gx-473", niche: "sports", arch: "fire", accent: "#ca8a04", bg: "gfx_bg_08.webp", cuts: ["gfx_fire_06.webp", "gfx_fire_03.webp"], screen: [true, true], headline: "TRAIN LIKE PROS", kicker: "WORKOUT", subline: "athlete routine", flip: false, seed: 169 },
  { id: "gx-474", niche: "sports", arch: "graph", accent: "#ca8a04", bg: "gfx_bg_11.webp", cuts: [], screen: [], headline: "LAST MINUTE GOAL", kicker: "HIGHLIGHTS", subline: "unbelievable", flip: true, seed: 200 },
  { id: "gx-475", niche: "sports", arch: "device", accent: "#ca8a04", bg: "gfx_bg_14.webp", cuts: ["gfx_device_02.webp"], screen: [false], headline: "WORLD RECORD", kicker: "BROKEN", subline: "history made", flip: false, seed: 231 },
  { id: "gx-476", niche: "sports", arch: "hand", accent: "#ca8a04", bg: "gfx_bg_17.webp", cuts: ["gfx_hand_07.webp"], screen: [false], headline: "TOP 5 PLAYS", kicker: "WEEK", subline: "insane moments", flip: true, seed: 262 },
  { id: "gx-477", niche: "sports", arch: "banner", accent: "#ca8a04", bg: "gfx_bg_20.webp", cuts: ["gfx_fire_05.webp"], screen: [true], headline: "HE DID WHAT", kicker: "VIRAL", subline: "crowd went crazy", flip: false, seed: 293 },
  { id: "gx-478", niche: "sports", arch: "minimal", accent: "#ca8a04", bg: "gfx_bg_23.webp", cuts: ["gfx_fire_07.webp"], screen: [true], headline: "FINAL PREDICTION", kicker: "2026", subline: "who wins", flip: true, seed: 324 },
  { id: "gx-479", niche: "sports", arch: "vs", accent: "#ca8a04", bg: "gfx_bg_26.webp", cuts: ["gfx_bg_13.webp"], screen: [false], headline: "TRAIN LIKE PROS", kicker: "WORKOUT", subline: "athlete routine", flip: false, seed: 355 },
  { id: "gx-480", niche: "sports", arch: "split", accent: "#ca8a04", bg: "gfx_bg_29.webp", cuts: [], screen: [], headline: "LAST MINUTE GOAL", kicker: "HIGHLIGHTS", subline: "unbelievable", flip: true, seed: 386 },
  { id: "gx-481", niche: "sports", arch: "cinematic", accent: "#ca8a04", bg: "gfx_bg_32.webp", cuts: [], screen: [], headline: "WORLD RECORD", kicker: "BROKEN", subline: "history made", flip: false, seed: 417 },
  { id: "gx-482", niche: "sports", arch: "arrow", accent: "#ca8a04", bg: "gfx_bg_35.webp", cuts: ["gfx_arrow_09.webp"], screen: [false], headline: "TOP 5 PLAYS", kicker: "WEEK", subline: "insane moments", flip: true, seed: 448 },
  { id: "gx-483", niche: "sports", arch: "circle", accent: "#ca8a04", bg: "gfx_bg_38.webp", cuts: ["gfx_fire_03.webp"], screen: [true], headline: "HE DID WHAT", kicker: "VIRAL", subline: "crowd went crazy", flip: false, seed: 479 },
  { id: "gx-484", niche: "sports", arch: "money", accent: "#ca8a04", bg: "gfx_bg_41.webp", cuts: ["gfx_money_08.webp", "gfx_money_04.webp", "gfx_money_01.webp"], screen: [false, false, false], headline: "FINAL PREDICTION", kicker: "2026", subline: "who wins", flip: true, seed: 510 },
  { id: "gx-485", niche: "sports", arch: "fire", accent: "#ca8a04", bg: "gfx_bg_44.webp", cuts: ["gfx_fire_04.webp", "gfx_fire_01.webp"], screen: [true, true], headline: "TRAIN LIKE PROS", kicker: "WORKOUT", subline: "athlete routine", flip: false, seed: 541 },
  { id: "gx-486", niche: "sports", arch: "graph", accent: "#ca8a04", bg: "gfx_bg_47.webp", cuts: [], screen: [], headline: "LAST MINUTE GOAL", kicker: "HIGHLIGHTS", subline: "unbelievable", flip: true, seed: 572 },
  { id: "gx-487", niche: "sports", arch: "device", accent: "#ca8a04", bg: "gfx_bg_50.webp", cuts: ["gfx_device_04.webp"], screen: [false], headline: "WORLD RECORD", kicker: "BROKEN", subline: "history made", flip: false, seed: 603 },
  { id: "gx-488", niche: "sports", arch: "hand", accent: "#ca8a04", bg: "gfx_bg_53.webp", cuts: ["gfx_hand_03.webp"], screen: [false], headline: "TOP 5 PLAYS", kicker: "WEEK", subline: "insane moments", flip: true, seed: 634 },
  { id: "gx-489", niche: "sports", arch: "banner", accent: "#ca8a04", bg: "gfx_bg_03.webp", cuts: ["gfx_fire_01.webp"], screen: [true], headline: "HE DID WHAT", kicker: "VIRAL", subline: "crowd went crazy", flip: false, seed: 665 },
  { id: "gx-490", niche: "sports", arch: "minimal", accent: "#ca8a04", bg: "gfx_bg_06.webp", cuts: ["gfx_fire_03.webp"], screen: [true], headline: "FINAL PREDICTION", kicker: "2026", subline: "who wins", flip: true, seed: 696 },
  { id: "gx-491", niche: "sports", arch: "vs", accent: "#ca8a04", bg: "gfx_bg_09.webp", cuts: ["gfx_bg_49.webp"], screen: [false], headline: "TRAIN LIKE PROS", kicker: "WORKOUT", subline: "athlete routine", flip: false, seed: 727 },
  { id: "gx-492", niche: "sports", arch: "split", accent: "#ca8a04", bg: "gfx_bg_12.webp", cuts: [], screen: [], headline: "LAST MINUTE GOAL", kicker: "HIGHLIGHTS", subline: "unbelievable", flip: true, seed: 758 },
  { id: "gx-493", niche: "sports", arch: "cinematic", accent: "#ca8a04", bg: "gfx_bg_15.webp", cuts: [], screen: [], headline: "WORLD RECORD", kicker: "BROKEN", subline: "history made", flip: false, seed: 789 },
  { id: "gx-494", niche: "sports", arch: "arrow", accent: "#ca8a04", bg: "gfx_bg_18.webp", cuts: ["gfx_arrow_09.webp"], screen: [false], headline: "TOP 5 PLAYS", kicker: "WEEK", subline: "insane moments", flip: true, seed: 820 },
  { id: "gx-495", niche: "sports", arch: "circle", accent: "#ca8a04", bg: "gfx_bg_21.webp", cuts: ["gfx_fire_06.webp"], screen: [true], headline: "HE DID WHAT", kicker: "VIRAL", subline: "crowd went crazy", flip: false, seed: 851 },
  { id: "gx-496", niche: "sports", arch: "money", accent: "#ca8a04", bg: "gfx_bg_24.webp", cuts: ["gfx_money_02.webp", "gfx_money_07.webp", "gfx_money_04.webp"], screen: [false, false, false], headline: "FINAL PREDICTION", kicker: "2026", subline: "who wins", flip: true, seed: 882 },
  { id: "gx-497", niche: "sports", arch: "fire", accent: "#ca8a04", bg: "gfx_bg_27.webp", cuts: ["gfx_fire_02.webp", "gfx_fire_06.webp"], screen: [true, true], headline: "TRAIN LIKE PROS", kicker: "WORKOUT", subline: "athlete routine", flip: false, seed: 913 },
  { id: "gx-498", niche: "sports", arch: "graph", accent: "#ca8a04", bg: "gfx_bg_30.webp", cuts: [], screen: [], headline: "LAST MINUTE GOAL", kicker: "HIGHLIGHTS", subline: "unbelievable", flip: true, seed: 944 },
  { id: "gx-499", niche: "sports", arch: "device", accent: "#ca8a04", bg: "gfx_bg_33.webp", cuts: ["gfx_device_06.webp"], screen: [false], headline: "WORLD RECORD", kicker: "BROKEN", subline: "history made", flip: false, seed: 975 },
  { id: "gx-500", niche: "sports", arch: "hand", accent: "#ca8a04", bg: "gfx_bg_36.webp", cuts: ["gfx_hand_07.webp"], screen: [false], headline: "TOP 5 PLAYS", kicker: "WEEK", subline: "insane moments", flip: true, seed: 1006 },
];

export function buildGfxTemplateJSON(def: GfxDef): FabricCanvasJSON {
  const b = ARCH_BUILDERS[def.arch] ?? archSplit;
  return { version: "7.4.0", objects: b(def) };
}

const ARCH: [string, string][] = [["split", "Bold Split"], ["cinematic", "Cinematic"], ["arrow", "Arrow Point"], ["circle", "Circle Pop"], ["money", "Money Flex"], ["fire", "Fire Urgent"], ["graph", "Growth Chart"], ["device", "Device Pop"], ["hand", "Hand Point"], ["banner", "Top Banner"], ["minimal", "Minimal Pop"], ["vs", "VS Battle"]];
const archLabelOf = (id: string) => ARCH.find((a) => a[0] === id)?.[1] ?? id;
const nicheLabelOf = (id: string) => {
  const labels: Record<string, string> = {

    "entertainment": "Entertainment",
    "gaming": "Gaming",
    "travel": "Travel",
    "finance": "Finance",
    "business": "Business",
    "podcast": "Podcast",
    "food": "Food",
    "fitness": "Fitness",
    "tech": "Tech",
    "education": "Education",
    "music": "Music",
    "fashion": "Fashion",
    "realestate": "Real Estate",
    "health": "Health",
    "sports": "Sports",
  };
  return labels[id] ?? id;
};

function buildGfxMetaList(): FabricTemplateMeta[] {
  return DEFS.map((d, i) => {
    const isPro = !["split", "cinematic", "arrow", "circle"].includes(d.arch);
    const archLabel = archLabelOf(d.arch);
    return {
      id: d.id,
      name: `${d.headline} - ${archLabel}`,
      niche: d.niche,
      nicheLabel: nicheLabelOf(d.niche),
      layout: d.arch,
      layoutLabel: archLabel,
      variant: i,
      isPro,
      tags: ["gfx", "trending", d.niche, archLabel.toLowerCase(), "youtube", "thumbnail",
        d.headline.toLowerCase(), isPro ? "pro" : "free"],
    };
  });
}

export const GFX_TEMPLATES: FabricTemplateMeta[] = buildGfxMetaList();

const gfxMetaIndex = new Map(GFX_TEMPLATES.map((m) => [m.id, m]));
const gfxDefIndex = new Map(DEFS.map((d) => [d.id, d]));

export function getGfxTemplate(id: string): { meta: FabricTemplateMeta; json: FabricCanvasJSON } | null {
  const meta = gfxMetaIndex.get(id);
  const def = gfxDefIndex.get(id);
  if (!meta || !def) return null;
  return { meta, json: buildGfxTemplateJSON(def) };
}

export function getGfxStyleVariants(_templateId: string): FabricTemplateMeta[] {
  return [];
}
