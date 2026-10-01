// IconVault Thumbnail Studio - photo-based template library.
//
// 150 templates = 30 original AI-generated photos x 5 creator styles.
// Photos live in public/thumbs/photos/ (original AI generations, no
// third-party assets). Every template is a real Fabric v7 canvas JSON, so
// text, colors and the photo itself stay editable in the editor: the photo
// is a normal image object the user can replace with their own upload.
//
// Photo crops are pre-generated (full 1280x720, portrait 700x720, circle
// 480x480 with transparency) so the JSON needs no crop math at all.

import type { FabricCanvasJSON, FabricTemplateMeta } from "./thumbnail-fabric-library";

// Local canvas size (mirrors thumbnail-fabric-library, avoids an import cycle).
const TW = 1280;
const TH = 720;

type Obj = Record<string, unknown>;

/** Fabric v7 defaults origins to center; all coords here are top-left. */
const ORG: Obj = { originX: "left", originY: "top" };

interface PhotoDef {
  id: string;
  label: string;
  niche: string;
  accent: string;
  headline: string;
  kicker: string;
  sub: string;
}

export const PHOTO_NICHES: { id: string; label: string; blurb: string }[] = [
  { id: "entertainment", label: "Entertainment", blurb: "Reactions, viral moments and pop culture." },
  { id: "gaming", label: "Gaming", blurb: "Epic wins, live streams and esports." },
  { id: "travel", label: "Travel", blurb: "Vlogs, destinations and adventures." },
  { id: "finance", label: "Finance", blurb: "Money, trading and investing." },
  { id: "business", label: "Business", blurb: "Startups, careers and case studies." },
  { id: "podcast", label: "Podcast", blurb: "Episodes, interviews and real talk." },
  { id: "food", label: "Food", blurb: "Recipes, reviews and street food." },
  { id: "fitness", label: "Fitness", blurb: "Workouts, training and transformation." },
  { id: "tech", label: "Tech", blurb: "Gadgets, AI and tech news." },
  { id: "education", label: "Education", blurb: "Study tips, exams and learning." },
  { id: "music", label: "Music", blurb: "Concerts, vlogs and performances." },
  { id: "fashion", label: "Fashion", blurb: "Style, lookbooks and trends." },
  { id: "realestate", label: "Real Estate", blurb: "Homes, tours and buying guides." },
  { id: "health", label: "Health", blurb: "Wellness and doctor advice." },
  { id: "sports", label: "Sports", blurb: "Match highlights and game day." },
];

const PHOTOS: PhotoDef[] = [
  { id: "shock-man", label: "Shocking Reaction", niche: "entertainment", accent: "#dc2626", headline: "SHOCKING", kicker: "TOP 10", sub: "you won't believe this" },
  { id: "gaming-neon", label: "Neon Gaming", niche: "gaming", accent: "#7c3aed", headline: "EPIC WIN", kicker: "LIVE", sub: "insane comeback" },
  { id: "gaming-controller", label: "Pro Controller", niche: "gaming", accent: "#7c3aed", headline: "PRO PLAYER", kicker: "RANKED", sub: "grind to the top" },
  { id: "travel-mountain", label: "Mountain Escape", niche: "travel", accent: "#0284c7", headline: "MANALI", kicker: "TRAVEL VLOG", sub: "hidden gem found" },
  { id: "travel-monument", label: "Monument Sunrise", niche: "travel", accent: "#ea580c", headline: "INDIA", kicker: "MUST VISIT", sub: "unbelievable beauty" },
  { id: "travel-beach", label: "Beach Paradise", niche: "travel", accent: "#0ea5e9", headline: "PARADISE", kicker: "VLOG", sub: "come with me" },
  { id: "travel-city", label: "City Nights", niche: "travel", accent: "#f59e0b", headline: "CITY LIGHTS", kicker: "NIGHT TOUR", sub: "never sleeps" },
  { id: "travel-desert", label: "Desert Dunes", niche: "travel", accent: "#d97706", headline: "DESERT", kicker: "ADVENTURE", sub: "sahara diaries" },
  { id: "finance-charts", label: "Trading Charts", niche: "finance", accent: "#15803d", headline: "$10K MONTH", kicker: "PROOF", sub: "step by step" },
  { id: "finance-money", label: "Money Stack", niche: "finance", accent: "#15803d", headline: "MONEY TALKS", kicker: "FINANCE", sub: "save more earn more" },
  { id: "finance-crypto", label: "Crypto Wave", niche: "finance", accent: "#f59e0b", headline: "CRYPTO", kicker: "INVESTING", sub: "bull run 2026" },
  { id: "business-man", label: "Business Portrait", niche: "business", accent: "#1e3a8b", headline: "ZERO TO CEO", kicker: "CASE STUDY", sub: "my exact playbook" },
  { id: "business-meeting", label: "Big Deal", niche: "business", accent: "#1e3a8b", headline: "BIG DEAL", kicker: "STARTUP", sub: "how we closed it" },
  { id: "podcast-mic", label: "Podcast Studio", niche: "podcast", accent: "#9333ea", headline: "REAL TALK", kicker: "EP 42", sub: "unfiltered" },
  { id: "food-curry", label: "Curry Bowl", niche: "food", accent: "#ea580c", headline: "TASTY RECIPE", kicker: "RECIPE", sub: "5 minute meal" },
  { id: "food-noodles", label: "Noodle Bowl", niche: "food", accent: "#dc2626", headline: "SO TASTY", kicker: "STREET FOOD", sub: "you need this" },
  { id: "food-pizza", label: "Cheesy Pizza", niche: "food", accent: "#dc2626", headline: "CHEESY PIZZA", kicker: "RECIPE", sub: "30 minute magic" },
  { id: "food-burger", label: "Big Burger", niche: "food", accent: "#ea580c", headline: "BIG BURGER", kicker: "FOOD REVIEW", sub: "taste test" },
  { id: "food-dessert", label: "Choco Cake", niche: "food", accent: "#be185d", headline: "SWEET TREAT", kicker: "DESSERT", sub: "no bake cake" },
  { id: "fitness-gym", label: "Gym Dumbbells", niche: "fitness", accent: "#dc2626", headline: "BEAST MODE", kicker: "DAY 1", sub: "no excuses" },
  { id: "fitness-woman", label: "Strong Her", niche: "fitness", accent: "#db2777", headline: "STRONG HER", kicker: "FITNESS", sub: "home workout" },
  { id: "fitness-running", label: "Morning Run", niche: "fitness", accent: "#059669", headline: "RUN FASTER", kicker: "TRAINING", sub: "5k in 30 days" },
  { id: "tech-desk", label: "Tech Desk", niche: "tech", accent: "#1d4ed8", headline: "GADGET WARS", kicker: "NEW", sub: "you need to see this" },
  { id: "tech-robot", label: "AI Robot", niche: "tech", accent: "#0284c7", headline: "AI ROBOT", kicker: "TECH NEWS", sub: "future is here" },
  { id: "education-books", label: "Study Desk", niche: "education", accent: "#1d4ed8", headline: "STUDY SMART", kicker: "STUDY TIPS", sub: "exam topper secrets" },
  { id: "music-concert", label: "Concert Night", niche: "music", accent: "#9333ea", headline: "LIVE LOUD", kicker: "MUSIC", sub: "concert vlog" },
  { id: "fashion-model", label: "Street Style", niche: "fashion", accent: "#be185d", headline: "STYLE ICON", kicker: "FASHION", sub: "2026 lookbook" },
  { id: "realestate-house", label: "Dream Home", niche: "realestate", accent: "#0f766e", headline: "DREAM HOME", kicker: "REAL ESTATE", sub: "buying guide" },
  { id: "health-doctor", label: "Doctor Advice", niche: "health", accent: "#0284c7", headline: "STAY HEALTHY", kicker: "HEALTH", sub: "doctor approved tips" },
  { id: "sports-stadium", label: "Stadium Night", niche: "sports", accent: "#15803d", headline: "GAME DAY", kicker: "SPORTS", sub: "match highlights" },
];

const STYLES = [
  { id: "shock", label: "Shock Split" },
  { id: "cinematic", label: "Cinematic" },
  { id: "split", label: "Creator Split" },
  { id: "circle", label: "Circle Spotlight" },
  { id: "sticker", label: "Sticker Pop" },
];

const PHOTO_URL = (id: string, crop: "" | "-portrait" | "-circle") =>
  `/thumbs/photos/${id}${crop}.webp`;

// ---------- object builders ----------

const bgRect = (fill: unknown): Obj => ({
  type: "rect", name: "bg", left: 0, top: 0, width: TW, height: TH,
  fill, ...ORG, selectable: false, evented: false, hoverCursor: "default",
});

const photoImg = (src: string, left: number, top: number, w: number, h: number, scale = 1): Obj => ({
  type: "image", name: "photo", src, crossOrigin: "anonymous",
  left, top, width: w, height: h, scaleX: scale, scaleY: scale, ...ORG,
});

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

// ---------- 5 creator styles ----------

/** Style 1 (free): portrait photo left, bold text on accent panel right. */
function styleShock(p: PhotoDef): Obj[] {
  return [
    bgRect("#0f0f14"),
    photoImg(PHOTO_URL(p.id, "-portrait"), 0, 0, 700, 720),
    { type: "rect", left: 700, top: 0, width: 580, height: TH, fill: p.accent, ...ORG },
    ring(560, 150, 80, "#facc15", 12),
    ...pill(p.kicker, 744, 64, "#facc15", "#111111"),
    head(p.headline, 744, 170, 492, 116),
    sub(p.sub, 744, 560, 492, 36, "#ffffff"),
  ];
}

/** Style 2 (free): full-bleed photo, cinematic gradient, giant headline. */
function styleCinematic(p: PhotoDef): Obj[] {
  return [
    bgRect("#0f0f14"),
    photoImg(PHOTO_URL(p.id, ""), 0, 0, TW, TH),
    gradOverlay(),
    ...pill(p.kicker, 64, 56, p.accent),
    { type: "rect", left: 68, top: 400, width: 120, height: 14, fill: "#facc15", ...ORG },
    head(p.headline, 64, 430, 1152, 168),
    sub(p.sub, 68, 640, 1152, 32, "#e2e8f0"),
  ];
}

/** Style 3 (pro): text on accent panel left, framed photo right. */
function styleSplit(p: PhotoDef): Obj[] {
  return [
    bgRect("#101016"),
    { type: "rect", left: 0, top: 0, width: 600, height: TH, fill: p.accent, ...ORG },
    ...pill(p.kicker, 56, 72, "#ffffff", p.accent),
    head(p.headline, 56, 180, 488, 108),
    sub(p.sub, 56, 590, 488, 34, "#ffffff"),
    { type: "rect", left: 638, top: 42, width: 619, height: 636, fill: "#ffffff", ...ORG },
    photoImg(PHOTO_URL(p.id, "-portrait"), 650, 54, 700, 720, 0.85),
  ];
}

/** Style 4 (pro): dark studio, circular photo spotlight, text left. */
function styleCircle(p: PhotoDef): Obj[] {
  return [
    bgRect({
      type: "linear",
      coords: { x1: 0, y1: 0, x2: 0, y2: TH },
      colorStops: [
        { offset: 0, color: "#1d1d30" },
        { offset: 1, color: "#0b0b13" },
      ],
    }),
    ring(992, 360, 254, p.accent, 14),
    photoImg(PHOTO_URL(p.id, "-circle"), 752, 120, 480, 480),
    ...pill(p.kicker, 64, 120, p.accent),
    head(p.headline, 64, 220, 640, 122),
    sub(p.sub, 64, 540, 640, 36, "#e2e8f0"),
  ];
}

/** Style 5 (pro): full-bleed photo, stroked headline, starburst sticker. */
function styleSticker(p: PhotoDef): Obj[] {
  return [
    bgRect("#0f0f14"),
    photoImg(PHOTO_URL(p.id, ""), 0, 0, TW, TH),
    head(p.headline, 64, 36, 1152, 122, "#ffffff", 10, "center"),
    ...starburst(1100, 560, 110, "#facc15", "NEW!"),
  ];
}

const STYLE_BUILDERS = [styleShock, styleCinematic, styleSplit, styleCircle, styleSticker];

// ---------- materialization ----------

export function buildPhotoTemplateJSON(photoIdx: number, styleIdx: number): FabricCanvasJSON {
  const p = PHOTOS[photoIdx]!;
  const objects = (STYLE_BUILDERS[styleIdx] ?? styleShock)(p);
  return { version: "7.4.0", objects };
}

const nicheLabelOf = (id: string) =>
  PHOTO_NICHES.find((n) => n.id === id)?.label ?? id;

function buildPhotoMetaList(): FabricTemplateMeta[] {
  const list: FabricTemplateMeta[] = [];
  for (let pi = 0; pi < PHOTOS.length; pi++) {
    for (let si = 0; si < STYLES.length; si++) {
      const p = PHOTOS[pi]!;
      const s = STYLES[si]!;
      const isPro = si >= 2;
      list.push({
        id: `ph-${p.id}-${s.id}`,
        name: `${p.label} - ${s.label}`,
        niche: p.niche,
        nicheLabel: nicheLabelOf(p.niche),
        layout: s.id,
        layoutLabel: s.label,
        variant: si,
        isPro,
        tags: ["photo", p.label.toLowerCase(), p.niche, s.label.toLowerCase(), "youtube", "thumbnail", isPro ? "pro" : "free"],
      });
    }
  }
  return list;
}

export const PHOTO_TEMPLATES: FabricTemplateMeta[] = buildPhotoMetaList();

const photoMetaIndex = new Map(PHOTO_TEMPLATES.map((m) => [m.id, m]));

export function getPhotoTemplate(id: string): { meta: FabricTemplateMeta; json: FabricCanvasJSON } | null {
  const meta = photoMetaIndex.get(id);
  if (!meta) return null;
  const pi = PHOTOS.findIndex((p) => id === `ph-${p.id}-${meta.layout}`);
  const si = STYLES.findIndex((s) => s.id === meta.layout);
  if (pi < 0 || si < 0) return null;
  return { meta, json: buildPhotoTemplateJSON(pi, si) };
}

/** All 5 style variants of the same photo (for the editor "styles" tab). */
export function getPhotoStyleVariants(templateId: string): FabricTemplateMeta[] {
  const meta = photoMetaIndex.get(templateId);
  if (!meta) return [];
  const photoId = templateId.slice(3, templateId.length - meta.layout.length - 1);
  return PHOTO_TEMPLATES.filter((m) => m.id.startsWith(`ph-${photoId}-`));
}
