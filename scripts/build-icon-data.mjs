// Builds the bundled, local-first icon dataset from the official
// `@iconify/json` npm package (every Iconify collection as JSON).
//
// Runs on `prebuild`, but SKIPS instantly when the committed outputs are
// already fresh for the installed dataset version (the case on CI /
// Cloudflare builds) - the heavy 500MB parse only runs locally when the
// dataset actually changes. Set SKIP_ICON_DATA_BUILD=1 to force-skip.
//
// Note: step 3 resolves @iconify-icons/* versions from the npm registry
// (with hard-coded fallbacks), so a full regeneration needs network.
//
// Outputs:
//   public/iconify/collections.json   - metadata for every collection
//   public/iconify/names/{prefix}.json - sorted icon names per collection
//   public/iconify/search-index.json  - compact global name index for search
//   src/lib/iconify-data-meta.ts       - pinned dataset version + totals
//
// Icon *bodies* are intentionally NOT bundled (the full dataset is ~500MB,
// far too heavy for the deploy). At runtime every icon body loads from a
// single tiny per-icon data file served by the pinned @iconify-icons/*
// packages on the jsDelivr/unpkg CDN - no giant downloads, no rate limits,
// aggressively cached. This mirrors how iconbuddy.com serves icons.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..");
const pkgDir = path.join(projectRoot, "node_modules", "@iconify", "json");
const outDir = path.join(projectRoot, "public", "iconify");
const namesDir = path.join(outDir, "names");

const fail = (msg) => {
  console.error(`[build-icon-data] ERROR: ${msg}`);
  process.exit(1);
};

// --- Skip logic ------------------------------------------------------------
// The generated outputs are committed to the repo, so CI/build machines
// (e.g. Cloudflare) can skip this heavy step entirely:
//   1. SKIP_ICON_DATA_BUILD=1 env var  -> skip immediately (escape hatch).
//   2. Outputs already fresh for the installed @iconify/json version -> skip.
//   3. @iconify/json not installed but outputs exist -> warn and skip
//      instead of failing the build (regeneration only needs the package
//      locally when the dataset actually changes).
const BUILD_META_PATH = path.join(outDir, ".build-meta.json");
const readBuildMeta = () => {
  try {
    return JSON.parse(fs.readFileSync(BUILD_META_PATH, "utf8"));
  } catch {
    return null;
  }
};
const outputsExist = () => {
  const meta = readBuildMeta();
  return (
    !!meta &&
    fs.existsSync(path.join(outDir, "collections.json")) &&
    fs.existsSync(path.join(outDir, "search-index.json")) &&
    fs.existsSync(path.join(projectRoot, "src", "lib", "iconify-data-meta.ts"))
  );
};

if (process.env.SKIP_ICON_DATA_BUILD === "1") {
  console.log("[build-icon-data] SKIP_ICON_DATA_BUILD=1 - using committed icon data.");
  process.exit(0);
}

const pkgJsonPath = path.join(pkgDir, "package.json");
if (!fs.existsSync(pkgJsonPath)) {
  if (outputsExist()) {
    console.warn(
      "[build-icon-data] WARN: @iconify/json not installed, but committed icon data exists - skipping regeneration.",
    );
    process.exit(0);
  }
  fail(
    "@iconify/json is not installed and no committed icon data exists. " +
      "Run `npm install -D @iconify/json` first.",
  );
}

const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
const version = pkg.version;

if (readBuildMeta()?.datasetVersion === version && outputsExist()) {
  console.log(`[build-icon-data] icon data already fresh for dataset v${version} - skipping.`);
  process.exit(0);
}
const collectionsPath = path.join(pkgDir, "collections.json");
if (!fs.existsSync(collectionsPath)) fail("collections.json missing in @iconify/json.");

const rawCollections = JSON.parse(fs.readFileSync(collectionsPath, "utf8"));

fs.mkdirSync(namesDir, { recursive: true });

// Last-known versions of the @iconify-icons/* per-icon packages. Used as a
// fallback if the npm registry is unreachable during the build; the build
// prefers the live registry version.
const FALLBACK_PKG_VERSIONS = {
  "arcticons": "2.0.1",
  "emojione-v1": "2.0.0",
  "fluent": "2.0.3",
  "fluent-emoji": "2.0.0",
  "fluent-emoji-flat": "2.0.0",
  "game-icons": "2.0.0",
  "iconmind": "2.0.2",
  "logos": "2.0.1",
  "material-symbols": "2.0.4",
  "material-symbols-light": "2.0.5",
  "noto": "2.0.1",
  "noto-v1": "2.0.0",
  "openmoji": "2.0.0",
  "selfhst": "2.0.6",
  "solar": "2.0.3",
  "thesvg-color": "2.0.11",
  "token-branded": "2.0.1",
  "twemoji": "2.0.0",
};

/** Resolve the pinned @iconify-icons/<prefix> version for every collection. */
const resolvePkgVersions = async (prefixes) => {
  const versions = {};
  let checked = 0;
  await Promise.all(
    prefixes.map(async (prefix) => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);
        const res = await fetch(
          `https://registry.npmjs.org/@iconify-icons%2F${prefix}/latest`,
          { signal: controller.signal },
        );
        clearTimeout(timer);
        if (res.ok) {
          const json = await res.json();
          if (json.version) {
            versions[prefix] = json.version;
            checked++;
            return;
          }
        }
        throw new Error(`registry returned ${res.status}`);
      } catch (err) {
        versions[prefix] = FALLBACK_PKG_VERSIONS[prefix] ?? "latest";
        console.warn(`[build-icon-data] WARN: no @iconify-icons/${prefix} on registry, using "${versions[prefix]}" (runtime falls back to legacy API if a file 404s)`);
      }
    }),
  );
  console.log(`[build-icon-data] resolved @iconify-icons versions for ${checked}/${prefixes.length} collections from registry`);
  return versions;
};

// --- 1. Normalised collections metadata ------------------------------------
// Note: `total` is filled in accurately in step 2 from the actual data files
// (upstream `total` values are stale and exclude aliases).
const collections = {};
for (const [prefix, meta] of Object.entries(rawCollections)) {
  collections[prefix] = {
    name: meta.name ?? prefix,
    total: meta.total ?? 0,
    author: meta.author ?? undefined,
    license: meta.license ?? undefined,
    category: meta.category ?? undefined,
    palette: meta.palette ?? false,
    samples: Array.isArray(meta.samples) ? meta.samples.slice(0, 12) : [],
  };
}

// --- 2. Per-collection icon name lists (+ search index) ----------------------
const searchIndex = {};
let totalIcons = 0;
let done = 0;
const prefixes = Object.keys(collections).sort();

for (const prefix of prefixes) {
  const jsonPath = path.join(pkgDir, "json", `${prefix}.json`);
  if (!fs.existsSync(jsonPath)) {
    console.warn(`[build-icon-data] WARN: no data file for "${prefix}", skipped.`);
    continue;
  }
  let data;
  try {
    data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  } catch {
    console.warn(`[build-icon-data] WARN: could not parse "${prefix}.json", skipped.`);
    continue;
  }
  const names = new Set([
    ...Object.keys(data.icons ?? {}),
    ...Object.keys(data.aliases ?? {}),
  ]);
  const sorted = [...names].sort();
  fs.writeFileSync(path.join(namesDir, `${prefix}.json`), JSON.stringify(sorted));
  searchIndex[prefix] = sorted;
  totalIcons += sorted.length;
  done++;
  if (done % 40 === 0) console.log(`[build-icon-data] ${done}/${prefixes.length} collections...`);
}

fs.writeFileSync(path.join(outDir, "search-index.json"), JSON.stringify(searchIndex));

// --- 2b. First-party custom collections --------------------------------------
// Icon sets designed in-house for IconVault (custom-icons/collections/*.json,
// Iconify collection format). They have no @iconify/json dataset entry and no
// @iconify-icons/* CDN package, so they are injected here: names + search
// index entries like any other collection, plus a bundled icon-bodies file
// that the runtime serves locally (see src/lib/iconify.ts,
// src/lib/custom-icons.server.ts).
const customCollectionsDir = path.join(projectRoot, "custom-icons", "collections");
if (fs.existsSync(customCollectionsDir)) {
  const bodiesDir = path.join(outDir, "icon-bodies");
  fs.mkdirSync(bodiesDir, { recursive: true });
  for (const file of fs.readdirSync(customCollectionsDir).filter((f) => f.endsWith(".json")).sort()) {
    let data;
    try {
      data = JSON.parse(fs.readFileSync(path.join(customCollectionsDir, file), "utf8"));
    } catch {
      console.warn(`[build-icon-data] WARN: could not parse custom collection "${file}", skipped.`);
      continue;
    }
    const prefix = data.prefix;
    const rawIcons = data.icons ?? {};
    if (typeof prefix !== "string" || !/^[a-z0-9]+$/.test(prefix) || typeof rawIcons !== "object") {
      console.warn(`[build-icon-data] WARN: invalid custom collection "${file}", skipped.`);
      continue;
    }
    if (collections[prefix]) {
      console.warn(`[build-icon-data] WARN: custom collection "${prefix}" collides with an upstream prefix, skipped.`);
      continue;
    }
    const names = Object.keys(rawIcons).sort();
    const bodies = {};
    let valid = true;
    for (const n of names) {
      const b = rawIcons[n]?.body;
      if (typeof b !== "string" || !b) { valid = false; break; }
      bodies[n] = b;
    }
    if (!valid || names.length === 0) {
      console.warn(`[build-icon-data] WARN: custom collection "${prefix}" has invalid/empty icons, skipped.`);
      continue;
    }
    const info = data.info ?? {};
    fs.writeFileSync(path.join(namesDir, `${prefix}.json`), JSON.stringify(names));
    fs.writeFileSync(path.join(bodiesDir, `${prefix}.json`), JSON.stringify(bodies));
    searchIndex[prefix] = names;
    collections[prefix] = {
      name: info.name ?? prefix,
      total: names.length, // refreshed accurately below
      author: info.author ?? { name: "IconVault" },
      license: info.license ?? undefined,
      category: "IconVault",
      palette: false,
      samples: Array.isArray(info.samples) ? info.samples.slice(0, 12) : names.slice(0, 6),
    };
    totalIcons += names.length;
    done++;
    console.log(`[build-icon-data] custom collection "${prefix}": ${names.length} icons`);
  }
  // search-index.json on disk must include the custom collections too.
  fs.writeFileSync(path.join(outDir, "search-index.json"), JSON.stringify(searchIndex));
}

// Accurate per-collection totals (icons + aliases, as actually browsable),
// written after the names are computed.
for (const prefix of Object.keys(collections)) {
  if (searchIndex[prefix]) collections[prefix].total = searchIndex[prefix].length;
}
fs.writeFileSync(
  path.join(outDir, "collections.json"),
  JSON.stringify(collections),
);

// --- 3. Generated TS meta ----------------------------------------------------
// Pinned @iconify-icons/* package versions, one per collection (resolved live
// from the npm registry). At runtime every icon body loads from a single
// tiny per-icon data file on the CDN - no giant downloads, no rate limits.
const pkgVersions = await resolvePkgVersions(prefixes);

const metaTs = `// AUTO-GENERATED by scripts/build-icon-data.mjs - do not edit by hand.
// Re-generated on every build (prebuild). Pinned dataset version keeps the
// runtime CDN URLs in sync with the bundled metadata.
export const ICONIFY_DATA_VERSION = ${JSON.stringify(version)};
export const ICONIFY_DATA_GENERATED_AT = ${JSON.stringify(new Date().toISOString())};
export const ICONIFY_DATA_TOTAL_COLLECTIONS = ${done};
export const ICONIFY_DATA_TOTAL_ICONS = ${totalIcons};
// Pinned @iconify-icons/<prefix> versions used for per-icon data files.
export const ICONIFY_DATA_PKG_VERSIONS: Record<string, string> = ${JSON.stringify(pkgVersions)};
`;
fs.writeFileSync(path.join(projectRoot, "src", "lib", "iconify-data-meta.ts"), metaTs);

// Freshness marker - lets future runs (e.g. on CI) skip regeneration.
fs.writeFileSync(
  BUILD_META_PATH,
  JSON.stringify({ datasetVersion: version, generatedAt: new Date().toISOString() }),
);

const sizeMb = (p) => (fs.statSync(p).size / 1048576).toFixed(2);
console.log(`[build-icon-data] done: ${done} collections, ${totalIcons.toLocaleString()} icons (dataset v${version})`);
console.log(`[build-icon-data]   collections.json: ${sizeMb(path.join(outDir, "collections.json"))} MB`);
console.log(`[build-icon-data]   search-index.json: ${sizeMb(path.join(outDir, "search-index.json"))} MB`);
