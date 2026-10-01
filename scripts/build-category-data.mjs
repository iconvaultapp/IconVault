// Builds the icon category index from icon-name keywords.
//
// Outputs:
//   public/iconify/categories.json - [{ slug, name, count }] sorted by count
//   public/iconify/category-icons/{slug}.json - up to 1500 "prefix:name" ids
//   public/iconify/category-icons/.build-meta.json - freshness marker
//
// Runs on `prebuild`, but SKIPS instantly when outputs are already fresh for
// the installed dataset version (the case on CI / Cloudflare builds).
// Set SKIP_CATEGORY_BUILD=1 (or SKIP_ICON_DATA_BUILD=1) to force-skip.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CATEGORY_KEYWORDS, slugify } from "./category-keywords.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..");
const outDir = path.join(projectRoot, "public", "iconify", "category-icons");
const metaPath = path.join(outDir, ".build-meta.json");
const datasetMetaPath = path.join(projectRoot, "public", "iconify", ".build-meta.json");
const indexPath = path.join(projectRoot, "public", "iconify", "search-index.json");

const readJson = (p) => {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
};

if (process.env.SKIP_CATEGORY_BUILD === "1" || process.env.SKIP_ICON_DATA_BUILD === "1") {
  console.log("[build-categories] skipped via env var - using committed category data.");
  process.exit(0);
}

const datasetVersion = readJson(datasetMetaPath)?.datasetVersion ?? "unknown";
const marker = readJson(metaPath);
const searchIndex = readJson(indexPath);
if (!searchIndex) {
  console.error("[build-categories] ERROR: public/iconify/search-index.json missing - run build-icon-data first.");
  process.exit(1);
}

const slugs = Object.keys(CATEGORY_KEYWORDS).map(slugify);
if (marker?.datasetVersion === datasetVersion) {
  const missing = slugs.filter((s) => !fs.existsSync(path.join(outDir, `${s}.json`)));
  if (missing.length === 0 && fs.existsSync(path.join(projectRoot, "public", "iconify", "categories.json"))) {
    console.log(`[build-categories] category data already fresh for dataset v${datasetVersion} - skipping.`);
    process.exit(0);
  }
}

// word -> Set<categoryName>
const wordToCats = new Map();
for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
  for (const kw of keywords) {
    const w = kw.toLowerCase();
    if (!wordToCats.has(w)) wordToCats.set(w, new Set());
    wordToCats.get(w).add(cat);
  }
}

const wordsOf = (name) =>
  name
    .toLowerCase()
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

const MAX_PER_CATEGORY = 1500;
const buckets = new Map(); // cat -> { count, ids: [] }

for (const [prefix, names] of Object.entries(searchIndex)) {
  for (const name of names) {
    const matched = new Set();
    for (const w of wordsOf(name)) {
      const cats = wordToCats.get(w);
      if (cats) for (const c of cats) matched.add(c);
    }
    if (matched.size === 0) continue;
    const id = `${prefix}:${name}`;
    for (const cat of matched) {
      let b = buckets.get(cat);
      if (!b) {
        b = { count: 0, ids: [] };
        buckets.set(cat, b);
      }
      b.count++;
      if (b.ids.length < MAX_PER_CATEGORY) b.ids.push(id);
    }
  }
}

fs.mkdirSync(outDir, { recursive: true });
const summary = [];
for (const [cat, b] of buckets) {
  const slug = slugify(cat);
  fs.writeFileSync(path.join(outDir, `${slug}.json`), JSON.stringify(b.ids));
  summary.push({ slug, name: cat, count: b.count });
}
// Keep categories that matched nothing out of the index (honest counts only).
summary.sort((a, b) => b.count - a.count);
fs.writeFileSync(
  path.join(projectRoot, "public", "iconify", "categories.json"),
  JSON.stringify(summary),
);
fs.writeFileSync(
  metaPath,
  JSON.stringify({ datasetVersion, generatedAt: new Date().toISOString(), count: summary.length }),
);
const totalAssigned = summary.reduce((n, c) => n + c.count, 0);
console.log(
  `[build-categories] done: ${summary.length} categories, ${totalAssigned.toLocaleString("en-US")} icon assignments (dataset v${datasetVersion})`,
);
