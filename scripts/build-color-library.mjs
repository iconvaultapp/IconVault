// Builds the Color Converter's browsable color library (coolors.co style).
//
// Sources (build-time devDependencies, never bundled):
//   - xkcd-colors (949 survey colors, real human names)
//   - color-name   (148 CSS named colors)
// Crude xkcd names (shit/puke/poop/vomit/barf…) are filtered out.
//
// Output:
//   public/data/color-library.json - [{ n: name, h: "#hex", f: family }] sorted
//     by hue, family-tagged for the 12 filter pills (red, orange, brown,
//     yellow, green, turquoise, blue, violet, pink, white, gray, black).
//
// Skips when fresh (committed output + marker). Force rebuild:
//   rm public/data/.color-library-meta.json && node scripts/build-color-library.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..");
const outPath = path.join(projectRoot, "public", "data", "color-library.json");
const metaPath = path.join(projectRoot, "public", "data", ".color-library-meta.json");

const require = createRequire(import.meta.url);

const readJson = (p) => {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
};

const marker = readJson(metaPath);
const existing = readJson(outPath);
if (marker?.version === 1 && existing?.length > 500) {
  console.log(`[build-color-library] fresh - ${existing.length} colors, skipping.`);
  process.exit(0);
}

const CRUDE = /\b(shit|puke|poop|vomit|barf)s?\b/i;
const titleCase = (s) =>
  s.toLowerCase().replace(/(^|[\s\-'])([a-z])/g, (_, p, c) => p + c.toUpperCase());

const toHex = (r, g, b) =>
  "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

function hslOf(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return { h, s, l };
}

function familyOf(hex) {
  const { h, s, l } = hslOf(hex);
  if (l >= 0.94) return "white";
  if (l <= 0.12) return "black";
  if (s < 0.14) return "gray";
  if (h >= 8 && h < 42 && l < 0.62) return "brown";
  if (h < 14 || h >= 345) return "red";
  if (h < 42) return "orange";
  if (h < 72) return "yellow";
  if (h < 168) return "green";
  if (h < 196) return "turquoise";
  if (h < 258) return "blue";
  if (h < 290) return "violet";
  if (h < 345) return "pink";
  return "red";
}

const byName = new Map(); // lower-name -> { n, h }
const add = (name, hex) => {
  const clean = name.trim().replace(/\s+/g, " ");
  if (!clean || CRUDE.test(clean)) return;
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return;
  const key = clean.toLowerCase();
  if (!byName.has(key)) byName.set(key, { n: titleCase(clean), h: hex.toLowerCase() });
};

// 1) CSS named colors first (canonical hex wins on name conflicts)
try {
  const cssMod = require("color-name"); // { red: [255,0,0], ... }
  const cssNames = cssMod.default ?? cssMod;
  for (const [name, rgb] of Object.entries(cssNames)) {
    add(name, toHex(rgb[0], rgb[1], rgb[2]));
  }
  console.log(`[build-color-library] css colors: ${Object.keys(cssNames).length}`);
} catch (e) {
  console.warn("[build-color-library] color-name package missing, skipping CSS set.");
}

// 2) xkcd survey colors
try {
  const xkcdPath = require.resolve("xkcd-colors/assets/colors.json");
  const xkcd = JSON.parse(fs.readFileSync(xkcdPath, "utf8"));
  let kept = 0;
  for (const c of xkcd) {
    const before = byName.size;
    add(c.name, c.hex);
    if (byName.size > before) kept++;
  }
  console.log(`[build-color-library] xkcd colors kept: ${kept} of ${xkcd.length}`);
} catch (e) {
  console.warn("[build-color-library] xkcd-colors package missing, skipping survey set.");
}

const colors = [...byName.values()].map((c) => {
  const { h, l } = hslOf(c.h);
  return { ...c, f: familyOf(c.h), hue: Math.round(h), l: Math.round(l * 100) / 100 };
});
// Rainbow order for the default "All" view, darks after lights within a hue.
colors.sort((a, b) => a.hue - b.hue || b.l - a.l);

const out = colors.map(({ n, h, f }) => ({ n, h, f }));
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(out));
fs.writeFileSync(metaPath, JSON.stringify({ version: 1, count: out.length, builtAt: new Date().toISOString() }));

const famCounts = {};
for (const c of out) famCounts[c.f] = (famCounts[c.f] || 0) + 1;
console.log(`[build-color-library] wrote ${out.length} colors -> public/data/color-library.json`);
console.log("[build-color-library] families:", JSON.stringify(famCounts));
