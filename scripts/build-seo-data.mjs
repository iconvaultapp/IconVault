// Generates per-icon-set SEO content (About text, FAQs, Google-searchable tags).
//
// Outputs:
//   public/iconify/seo/{prefix}.json - { prefix, name, about, faqs, tags }
//   public/iconify/seo/.build-meta.json - freshness marker
//
// Runs on `prebuild`, but SKIPS instantly when outputs are already fresh for
// the installed dataset version (the case on CI / Cloudflare builds).
// Set SKIP_SEO_BUILD=1 (or SKIP_ICON_DATA_BUILD=1) to force-skip.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..");
const outDir = path.join(projectRoot, "public", "iconify", "seo");
const metaPath = path.join(outDir, ".build-meta.json");
const datasetMetaPath = path.join(projectRoot, "public", "iconify", ".build-meta.json");
const collectionsPath = path.join(projectRoot, "public", "iconify", "collections.json");

const readJson = (p) => {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
};

if (process.env.SKIP_SEO_BUILD === "1" || process.env.SKIP_ICON_DATA_BUILD === "1") {
  console.log("[build-seo] skipped via env var - using committed SEO data.");
  process.exit(0);
}

const datasetMeta = readJson(datasetMetaPath);
const datasetVersion = datasetMeta?.datasetVersion ?? "unknown";
const marker = readJson(metaPath);
const collections = readJson(collectionsPath);
if (!collections) {
  console.error("[build-seo] ERROR: public/iconify/collections.json missing - run build-icon-data first.");
  process.exit(1);
}
const prefixes = Object.keys(collections);
if (marker?.datasetVersion === datasetVersion && marker?.count === prefixes.length) {
  const missing = prefixes.filter((p) => !fs.existsSync(path.join(outDir, `${p}.json`)));
  if (missing.length === 0) {
    console.log(`[build-seo] SEO data already fresh for dataset v${datasetVersion} - skipping.`);
    process.exit(0);
  }
}

// --- helpers ---------------------------------------------------------------

const licenseTitle = (c) => c?.license?.title ?? c?.license ?? null;
const authorName = (c) => c?.author?.name ?? null;

const coreKeyword = (displayName) =>
  displayName
    .toLowerCase()
    .replace(/\s+icons?$/i, "")
    .trim() || displayName.toLowerCase();

const styleTags = (displayName, key, palette) => {
  const n = displayName.toLowerCase();
  const tags = [];
  if (/solid/.test(n)) tags.push(`${key} solid icons`);
  if (/outline/.test(n)) tags.push(`${key} outline icons`);
  if (/duotone|two[\s-]?tone/.test(n)) tags.push(`${key} duotone icons`);
  if (/color|multicolor|multi-color/.test(n) || palette) tags.push(`${key} color icons`);
  if (/brand|logo/.test(n)) tags.push(`${key} brand icons`, `${key} logo icons`);
  if (/emoji/.test(n)) tags.push(`${key} emoji`);
  if (/flag/.test(n)) tags.push(`${key} flag icons`);
  if (/weather/.test(n)) tags.push(`${key} weather icons`);
  if (/currency|crypto|bitcoin/.test(n)) tags.push(`${key} crypto icons`);
  if (/medical|health/.test(n)) tags.push(`${key} medical icons`);
  if (tags.length === 0) tags.push(`${key} line icons`, `${key} outline icons`);
  return tags;
};

const buildTags = (displayName, total, author) => {
  const key = coreKeyword(displayName);
  // 50+ Google search-intent phrases per pack: formats, frameworks, tools,
  // use-cases and style variants. Each pack gets its own set via `key`.
  const tags = [
    `${key} icons`,
    `${key} icon`,
    `${key} icons svg`,
    `${key} svg icons`,
    `free ${key} icons`,
    `${key} icons free download`,
    `${key} icons download`,
    `download ${key} icons`,
    `${key} icons png`,
    `${key} icons webp`,
    `${key} vector icons`,
    `${key} icons vector`,
    `${key} icons react`,
    `${key} react icons`,
    `${key} icons vue`,
    `${key} icons angular`,
    `${key} icons svelte`,
    `${key} icons flutter`,
    `${key} icons react native`,
    `${key} icons nextjs`,
    `${key} icons tailwind`,
    `${key} icons figma`,
    `${key} icons sketch`,
    `${key} icons cdn`,
    `${key} cdn link`,
    `${key} icon pack`,
    `${key} icon set`,
    `${key} icon library`,
    `${key} icon collection`,
    `${key} all icons`,
    `${key} icons list`,
    `${key} icons online`,
    `${key} icons copy paste`,
    `${key} ui icons`,
    `${key} ux icons`,
    `${key} icons for website`,
    `${key} icons for web design`,
    `${key} icons for app`,
    `${key} icons for mobile app`,
    `${key} icons for dashboard`,
    `${key} icons for landing page`,
    `best ${key} icons`,
    `${key} ${total.toLocaleString("en-US")} icons`,
    `${key} icons 2026`,
    `${key} line icons`,
    `${key} outline icons`,
    `${key} solid icons`,
    `${key} filled icons`,
    `${key} glyph icons`,
    `${key} minimal icons`,
    `${key} icon font`,
    `${key} svg sprite`,
  ];
  if (author) tags.push(`${author.toLowerCase()} ${key} icons`);
  const seen = new Set();
  const out = [];
  for (const t of tags) {
    const v = t.replace(/\s+/g, " ").trim();
    if (v.length > 2 && !seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out.slice(0, 60);
};

// Classify a pack so every set gets its OWN flavored About + FAQs,
// not the same five questions with only the name swapped.
const detectPackType = (displayName) => {
  const n = displayName.toLowerCase();
  if (/emoji/.test(n)) return "emoji";
  if (/flag/.test(n)) return "flags";
  if (/logo/.test(n) || /brand/.test(n) || n === "simple icons" || n === "logos") return "brands";
  if (/weather/.test(n)) return "weather";
  if (/medical|health|pharmacy/.test(n)) return "medical";
  if (/crypto|bitcoin|currency/.test(n)) return "crypto";
  return "ui";
};

const typeFlavor = {
  emoji:
    "From smileys and gestures to animals, food, activities and symbols, every emoji stays crisp at any size.",
  brands:
    "Ideal for login buttons, partner walls, tech-stack badges and social links - every logo is a clean vector.",
  flags: "Search any country or territory name to find its flag in seconds.",
  weather:
    "Covers sun, clouds, rain, snow, storms, fog, wind and more - made for weather apps and dashboards.",
  medical:
    "Covers common healthcare, pharmacy and medical symbols for health apps and websites.",
  crypto:
    "Covers popular cryptocurrencies and payment symbols for fintech apps and dashboards.",
  ui: "From navigation and actions to files, media and communication, it covers everyday UI needs.",
};

const buildAbout = (displayName, total, author, license, type) => {
  const parts = [
    `${displayName} is a free, open-source icon set with ${total.toLocaleString("en-US")} icons${author ? ` designed by ${author}` : ""}.`,
    typeFlavor[type] ?? typeFlavor.ui,
    `Every icon is available as SVG, PNG and WebP, or as a copy-paste React / TypeScript component or CDN link.`,
    `Recolor and resize each one in the browser before you export – free, no account needed.`,
  ];
  if (license) parts.push(`Licensed under ${license}.`);
  return parts.join(" ");
};

const fmtCount = (total) => total.toLocaleString("en-US");

const sharedFaqs = {
  free: (displayName, total, lic) => ({
    q: `Are ${displayName} free to use?`,
    a: `Yes. All ${fmtCount(total)} ${displayName} are open source under the ${lic} license – free to download, customize and use. Always check the ${lic} terms for attribution or commercial-use requirements.`,
  }),
  react: (displayName) => ({
    q: `How do I use ${displayName} in React or my website?`,
    a: `Copy any icon as a React / TypeScript component straight into your project, or paste the CDN link into your HTML. Every icon also downloads as SVG, PNG or WebP, and you can recolor and resize it in the browser before you export.`,
  }),
  count: (displayName, total, author) => ({
    q: `How many ${displayName} are there?`,
    a: `There are ${fmtCount(total)} icons in the ${displayName} set${author ? `, designed by ${author}` : ""}. Use the search above to find any icon by name.`,
  }),
  recolor: (displayName) => ({
    q: `Can I change the color and size of ${displayName}?`,
    a: `Yes. Open any icon, pick a size and color, and the preview updates instantly. SVG, PNG and WebP exports follow your choices, and React snippets recolor through props.`,
  }),
  formats: (displayName) => ({
    q: `What formats are ${displayName} available in?`,
    a: `SVG, PNG and WebP downloads, copy-paste React / TypeScript components, plus a CDN link for every single icon – free, no account needed.`,
  }),
};

const buildFaqs = (displayName, total, author, license, type) => {
  const lic = license ?? "open-source";
  const s = sharedFaqs;
  switch (type) {
    case "emoji":
      return [
        s.free(displayName, total, lic),
        {
          q: `How can I use ${displayName} emoji on my website or app?`,
          a: `Copy any emoji as an SVG, PNG or WebP image, paste it as a React component, or drop the CDN link into your HTML. Because they are vectors, they stay sharp at any size – from tiny reactions to large illustrations.`,
        },
        {
          q: `Do ${displayName} include skin-tone or gender variants?`,
          a: `Some emoji sets ship skin-tone and gender variants as separate icons. Search this set (try a specific emoji name) to see which variants are included here.`,
        },
        s.count(displayName, total, author),
        s.formats(displayName),
      ];
    case "brands":
      return [
        {
          q: `Are ${displayName} free to use?`,
          a: `The icon files themselves are open source under the ${lic} license – free to download and use. But company logos are trademarks of their owners, so always check each brand's usage guidelines before commercial use.`,
        },
        {
          q: `Can I use ${displayName} logos in commercial projects?`,
          a: `You can freely download and embed the vector files under the ${lic} license, but trademark law still applies: don't imply endorsement by a brand, and follow each company's brand guidelines for clear-space, colors and minimum sizes.`,
        },
        s.react(displayName),
        s.count(displayName, total, author),
        s.formats(displayName),
      ];
    case "flags":
      return [
        s.free(displayName, total, lic),
        {
          q: `Which flags are included in ${displayName}?`,
          a: `The set holds ${fmtCount(total)} flag icons. Search any country or territory name above to find its flag instantly.`,
        },
        {
          q: `Are the flags in ${displayName} up to date?`,
          a: `Flag designs follow the official national flags as of the set's latest release. If a flag recently changed, check the set's source repository for the newest version.`,
        },
        s.react(displayName),
        s.formats(displayName),
      ];
    case "weather":
      return [
        s.free(displayName, total, lic),
        {
          q: `What weather conditions do ${displayName} cover?`,
          a: `Sun, clouds, rain, snow, storms, fog, wind and more. Search the set for the condition you need – each icon is a clean vector you can recolor to match your app.`,
        },
        s.react(displayName),
        s.count(displayName, total, author),
        s.formats(displayName),
      ];
    case "medical":
      return [
        s.free(displayName, total, lic),
        {
          q: `What symbols do ${displayName} include?`,
          a: `Common healthcare, pharmacy and medical symbols for health apps and websites. Search the set for the symbol you need – every icon downloads as SVG, PNG or WebP.`,
        },
        s.react(displayName),
        s.count(displayName, total, author),
        s.formats(displayName),
      ];
    case "crypto":
      return [
        s.free(displayName, total, lic),
        {
          q: `Which coins do ${displayName} cover?`,
          a: `Popular cryptocurrencies and payment symbols for fintech apps and dashboards. Search a coin or token name above to check that it's included.`,
        },
        s.react(displayName),
        s.count(displayName, total, author),
        s.formats(displayName),
      ];
    default:
      return [
        s.free(displayName, total, lic),
        s.react(displayName),
        s.count(displayName, total, author),
        s.recolor(displayName),
        s.formats(displayName),
      ];
  }
};

// --- main -------------------------------------------------------------------

fs.mkdirSync(outDir, { recursive: true });
let done = 0;
const customSeoDir = path.join(projectRoot, "custom-icons", "seo");
for (const prefix of prefixes) {
  // First-party sets ship hand-written SEO copy (About / FAQs / tags) instead
  // of the templated generator output.
  const customSeo = readJson(path.join(customSeoDir, `${prefix}.json`));
  if (customSeo && customSeo.prefix === prefix) {
    fs.writeFileSync(path.join(outDir, `${prefix}.json`), JSON.stringify(customSeo));
    done++;
    continue;
  }
  const c = collections[prefix];
  const displayName = c.name ?? prefix;
  const total = c.total ?? 0;
  const author = authorName(c);
  const license = licenseTitle(c);
  const key = coreKeyword(displayName);

  const tags = buildTags(displayName, total, author);
  for (const t of styleTags(displayName, key, c.palette)) {
    if (tags.length >= 60) break;
    if (!tags.includes(t)) tags.push(t);
  }

  const data = {
    prefix,
    name: displayName,
    total,
    designer: author,
    license,
    packType: detectPackType(displayName),
    about: buildAbout(displayName, total, author, license, detectPackType(displayName)),
    faqs: buildFaqs(displayName, total, author, license, detectPackType(displayName)),
    tags,
  };
  fs.writeFileSync(path.join(outDir, `${prefix}.json`), JSON.stringify(data));
  done++;
}

fs.writeFileSync(
  metaPath,
  JSON.stringify({ datasetVersion, generatedAt: new Date().toISOString(), count: done }),
);
console.log(`[build-seo] done: SEO content for ${done} icon sets (dataset v${datasetVersion})`);
