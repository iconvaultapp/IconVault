// IconVault icon data layer - LOCAL-FIRST.
//
// The old implementation fetched everything live from api.iconify.design
// (directly from the browser and through our edge routes). That API rate
// limits aggressively, which is why sets and icons kept failing to load no
// matter how much retry/backoff/batching we layered on top.
//
// Now nothing depends on that API at runtime:
//   - Collection metadata, per-collection icon name lists and the search
//     index are BUNDLED with the site (generated at build time from the
//     official @iconify/json dataset - see scripts/build-icon-data.mjs)
//     and served same-origin. They load instantly, always.
//   - Every icon body comes from a single tiny per-icon data file served by
//     the pinned @iconify-icons/* packages on the jsDelivr / unpkg CDN
//     (CORS-enabled, cached at the edge worldwide, no rate limits).
//     No giant downloads, ever - even the 99MB emoji sets load icon by icon.
//
// Same model as iconbuddy.com (own CDN instead of the live API).

import {
  ICONIFY_DATA_VERSION,
  ICONIFY_DATA_PKG_VERSIONS,
} from "./iconify-data-meta";
import {
  iconDataToSvg,
  perIconDataUrls,
  parseIconJsData,
} from "./icon-svg";

export interface IconifyCollection {
  name: string;
  total: number;
  author?: { name: string };
  license?: { title: string };
  category?: string;
  palette?: boolean;
  samples?: string[];
}

export interface IconifySearchResult {
  icons: string[];
  total: number;
  limit: number;
  start: number;
  collections: Record<string, IconifyCollection>;
}

export interface IconifyIconData {
  body: string;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  rotate?: number;
  hFlip?: boolean;
  vFlip?: boolean;
}

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

const LOCAL_BASE = "/iconify";

const isSafeSegment = (s: string) => /^[a-z0-9][a-z0-9._-]*$/i.test(s);

/**
 * First-party collections whose icon bodies are bundled with the site
 * (public/iconify/icon-bodies/{prefix}.json) because no @iconify-icons/*
 * CDN package exists for them. Bodies never touch the CDN race below.
 */
const LOCAL_BODY_PREFIXES = new Set(["ivo"]);

// ---------------------------------------------------------------------------
// Tiny caches: memory always, localStorage for the small bundled metadata.
// ---------------------------------------------------------------------------

const mem = new Map<string, unknown>();
const svgMem = new Map<string, Promise<string>>();

const LS_PREFIX = "iconvault:data:v1:";
const LS_MAX_BYTES = 800 * 1024;

const lsGet = (key: string): unknown | null => {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const lsSet = (key: string, value: unknown) => {
  try {
    const raw = JSON.stringify(value);
    if (raw.length > LS_MAX_BYTES) return;
    localStorage.setItem(LS_PREFIX + key, raw);
  } catch {
    // Quota or privacy mode - memory + HTTP cache still work.
  }
};

const fetchLocalJson = async <T>(path: string, persist: boolean): Promise<T> => {
  const hit = mem.get(path);
  if (hit !== undefined) return hit as T;
  if (persist && typeof window !== "undefined") {
    const ls = lsGet(path);
    if (ls !== null) {
      mem.set(path, ls);
      return ls as T;
    }
  }
  const res = await fetch(`${LOCAL_BASE}${path}`, {
    headers: { Accept: "application/json" },
    cache: "force-cache",
  });
  if (!res.ok) throw new Error(`Bundled icon data missing: ${path} (${res.status})`);
  const json = (await res.json()) as T;
  mem.set(path, json);
  if (persist && typeof window !== "undefined") lsSet(path, json);
  return json;
};

/** Icon bodies for a first-party collection, bundled same-origin. */
const fetchLocalIconBodies = (prefix: string): Promise<Record<string, string>> =>
  fetchLocalJson<Record<string, string>>(
    `/icon-bodies/${encodeURIComponent(prefix)}.json`,
    true,
  );

// ---------------------------------------------------------------------------
// Bundled metadata: collections, names, search index
// ---------------------------------------------------------------------------

export const fetchCollections = async (): Promise<Record<string, IconifyCollection>> => {
  try {
    return await fetchLocalJson<Record<string, IconifyCollection>>("/collections.json", true);
  } catch {
    // Last-resort legacy path (server route, may itself be rate limited).
    const res = await fetch("/api/iconify/collections", { headers: { Accept: "application/json" } });
    if (!res.ok) return {};
    return (await res.json()) as Record<string, IconifyCollection>;
  }
};

export const fetchCollectionIcons = async (prefix: string, limit = 100): Promise<string[]> => {
  const names = await fetchAllCollectionIconNames(prefix);
  return names.slice(0, limit).map((name) => `${prefix}:${name}`);
};

/** All icon names for a collection (for paginated pack/category pages). */
export const fetchAllCollectionIconNames = async (prefix: string): Promise<string[]> => {
  try {
    const names = await fetchLocalJson<string[]>(`/names/${encodeURIComponent(prefix)}.json`, true);
    if (Array.isArray(names) && names.length > 0) return names;
  } catch {
    /* fall through to legacy route */
  }
  try {
    const res = await fetch(
      `/api/iconify/collection/${encodeURIComponent(prefix)}?limit=20000`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { icons?: string[] };
    return Array.isArray(data.icons) ? data.icons : [];
  } catch {
    return [];
  }
};

/** Per-icon-set SEO content (about, FAQs, tags), generated at build time. */
export interface PackSeo {
  prefix: string;
  name: string;
  total: number;
  designer: string | null;
  license: string | null;
  about: string;
  faqs: { q: string; a: string }[];
  tags: string[];
}

export const fetchPackSeo = async (prefix: string): Promise<PackSeo | null> => {
  try {
    return await fetchLocalJson<PackSeo>(`/seo/${encodeURIComponent(prefix)}.json`, true);
  } catch {
    return null;
  }
};

/** Category index: [{ slug, name, count }], generated at build time. */
export interface IconCategory {
  slug: string;
  name: string;
  count: number;
}

export const fetchCategories = async (): Promise<IconCategory[]> => {
  try {
    const cats = await fetchLocalJson<IconCategory[]>("/categories.json", true);
    return Array.isArray(cats) ? cats : [];
  } catch {
    return [];
  }
};

/** Icon ids ("prefix:name") for a category, generated at build time. */
export const fetchCategoryIcons = async (slug: string): Promise<string[]> => {
  try {
    const ids = await fetchLocalJson<string[]>(
      `/category-icons/${encodeURIComponent(slug)}.json`,
      true,
    );
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
};

type SearchIndex = Record<string, string[]>;

const getSearchIndex = (): Promise<SearchIndex> =>
  fetchLocalJson<SearchIndex>("/search-index.json", false);

/** Fire-and-forget: fetch the 8.2MB search index during idle so the user's
 *  first search is instant instead of paying the download then. */
export const preloadSearchIndex = (): void => {
  try {
    void getSearchIndex().catch(() => undefined);
  } catch {
    /* noop */
  }
};

const scoreName = (name: string, q: string, tokens: string[]): number => {
  const n = name.toLowerCase();
  if (n === q) return 1000;
  if (n.startsWith(q)) return 500;
  const qi = n.indexOf(q);
  if (qi > 0) {
    const before = n[qi - 1];
    return before === "-" || before === "_" || before === " " ? 400 : 200;
  }
  if (tokens.length === 0) return 0;
  let matched = 0;
  for (const t of tokens) if (n.includes(t)) matched++;
  if (matched === tokens.length) return 100 + matched * 5;
  return matched > 0 ? matched * 10 : 0;
};

export const searchIcons = async (
  query: string,
  limit = 100,
  start = 0,
  prefix?: string,
): Promise<IconifySearchResult> => {
  const q = query.trim().toLowerCase();
  if (!q) return { icons: [], total: 0, limit, start, collections: {} };

  try {
    const [index, collections] = await Promise.all([getSearchIndex(), fetchCollections()]);
    const tokens = q.split(/[\s\-_]+/).filter(Boolean);
    const prefixes = prefix ? [prefix] : Object.keys(index);
    const scored: Array<{ id: string; score: number }> = [];

    for (const p of prefixes) {
      const names = index[p];
      if (!names) continue;
      for (const name of names) {
        const score = scoreName(name, q, tokens);
        if (score > 0) scored.push({ id: `${p}:${name}`, score });
      }
    }

    scored.sort(
      (a, b) => b.score - a.score || a.id.length - b.id.length || (a.id < b.id ? -1 : 1),
    );

    const total = scored.length;
    const icons = scored.slice(start, start + limit).map((s) => s.id);
    const matched: Record<string, IconifyCollection> = {};
    for (const id of icons) {
      const p = id.split(":")[0] ?? "";
      if (collections[p] && !matched[p]) matched[p] = collections[p];
    }
    return { icons, total, limit, start, collections: matched };
  } catch {
    // Last-resort legacy path.
    const params = new URLSearchParams({ query, limit: String(limit), start: String(start) });
    if (prefix) params.set("prefix", prefix);
    const res = await fetch(`/api/iconify/search?${params.toString()}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return { icons: [], total: 0, limit, start, collections: {} };
    return (await res.json()) as IconifySearchResult;
  }
};

// ---------------------------------------------------------------------------
// Icon bodies: one tiny per-icon data file per icon, from the pinned
// @iconify-icons/* CDN packages. No giant downloads, ever.
// ---------------------------------------------------------------------------

/**
 * Fetch the first successful response across CDN mirrors.
 *
 * The first mirror (jsDelivr) starts immediately; each additional mirror
 * starts RACE_STAGGER_MS later *only if* the earlier ones haven't answered.
 * Whichever mirror answers first with an OK response wins; the losers are
 * aborted. This kills tail latency: a slow/cold edge on one CDN no longer
 * blocks the icon - the other CDN answers instead. An overall timeout
 * guards against every mirror hanging at once.
 */
const RACE_STAGGER_MS = 250;
const RACE_OVERALL_TIMEOUT_MS = 8000;

const fetchFirstOk = async (urls: string[]): Promise<string> => {
  const controllers = urls.map(() => new AbortController());
  const timers: ReturnType<typeof setTimeout>[] = [];
  try {
    const attempts = urls.map((url, i) => (async (): Promise<string> => {
      if (i > 0) {
        await new Promise<void>((resolve) => {
          timers.push(setTimeout(resolve, RACE_STAGGER_MS * i));
        });
      }
      const res = await fetch(url, {
        headers: { Accept: "text/javascript" },
        // Per-icon files are immutable (pinned package versions), so the
        // browser/CDN cache is always safe to reuse.
        cache: "force-cache",
        signal: controllers[i]!.signal,
      });
      if (!res.ok) throw new Error(`CDN icon data failed: ${res.status}`);
      return res.text();
    })());

    const overallTimeout = new Promise<never>((_, reject) => {
      timers.push(
        setTimeout(() => reject(new Error("Icon data timed out")), RACE_OVERALL_TIMEOUT_MS),
      );
    });
    return await Promise.race([Promise.any(attempts), overallTimeout]);
  } finally {
    timers.forEach(clearTimeout);
    for (const c of controllers) {
      try {
        c.abort();
      } catch {
        /* noop */
      }
    }
  }
};

/** Fetch one icon's data file from the pinned @iconify-icons CDN packages. */
const pendingIconFetches = new Map<string, Promise<IconifyIconData>>();
const fetchPerIconData = async (
  prefix: string,
  name: string,
): Promise<IconifyIconData> => {
  if (!isSafeSegment(prefix) || !isSafeSegment(name)) {
    throw new Error(`Invalid icon id: ${prefix}:${name}`);
  }
  const key = `icon:${prefix}:${name}`;
  const cached = mem.get(key);
  if (cached !== undefined) return cached as IconifyIconData;
  // In-flight dedup: concurrent renders of the same icon share one fetch.
  const inFlight = pendingIconFetches.get(key);
  if (inFlight) return inFlight;

  const promise = (async (): Promise<IconifyIconData> => {
    let lastError: unknown;
    try {
      // First-party sets (e.g. "ivo") ship their bodies with the site -
      // no CDN package exists, so resolve locally instead of racing CDNs.
      if (LOCAL_BODY_PREFIXES.has(prefix)) {
        const bodies = await fetchLocalIconBodies(prefix);
        const body = bodies[name];
        if (!body) throw new Error(`Unknown icon: ${prefix}:${name}`);
        const icon: IconifyIconData = { body, left: 0, top: 0, width: 24, height: 24 };
        mem.set(key, icon);
        return icon;
      }
      const js = await fetchFirstOk(perIconDataUrls(prefix, name, ICONIFY_DATA_PKG_VERSIONS));
      const parsed = parseIconJsData(js, prefix, name);
      const icon: IconifyIconData = {
        body: parsed.body,
        left: parsed.left ?? 0,
        top: parsed.top ?? 0,
        width: parsed.width ?? 24,
        height: parsed.height ?? 24,
      };
      mem.set(key, icon);
      return icon;
    } catch (error) {
      lastError = error;
    }
    throw lastError instanceof Error ? lastError : new Error("Icon data unavailable");
  })();

  pendingIconFetches.set(key, promise);
  try {
    return await promise;
  } finally {
    pendingIconFetches.delete(key);
  }
};

// ---------------------------------------------------------------------------
// Public icon API (same signatures as before - no component changes needed)
// ---------------------------------------------------------------------------

export const loadIconData = async (prefix: string, name: string): Promise<IconifyIconData> => {
  return fetchPerIconData(prefix, name);
};

export const getIconDataBatch = async (
  prefix: string,
  names: string[],
): Promise<Record<string, IconifyIconData>> => {
  const result: Record<string, IconifyIconData> = {};
  const unique = [...new Set(names)].filter(Boolean);
  await Promise.all(
    unique.map(async (name) => {
      try {
        result[name] = await loadIconData(prefix, name);
      } catch {
        // Leave missing; callers render what resolved.
      }
    }),
  );
  return result;
};

export const fetchIconSvg = (
  prefix: string,
  name: string,
  params?: { width?: number; height?: number; color?: string },
): Promise<string> => {
  const key = `svg:${prefix}:${name}:${params?.width ?? ""}x${params?.height ?? ""}:${params?.color ?? ""}`;
  const existing = svgMem.get(key);
  if (existing) return existing;

  const promise = (async (): Promise<string> => {
    const icon = await loadIconData(prefix, name);
    return iconDataToSvg(icon, params);
  })();

  svgMem.set(key, promise);
  void promise.then(
    () => svgMem.delete(key),
    () => svgMem.delete(key),
  );
  return promise;
};

/**
 * URL for <img> tags and embeds. Points at our own edge route, which serves
 * the SVG from the CDN-backed dataset (edge-cached, immutable) - never the
 * rate-limited public API.
 */
export const getIconSvgUrl = (
  prefix: string,
  name: string,
  params?: { width?: number; height?: number; color?: string },
) => {
  const query = new URLSearchParams();
  if (params?.width) query.set("width", String(params.width));
  if (params?.height) query.set("height", String(params.height));
  if (params?.color) query.set("color", params.color);
  const qs = query.toString();
  return `/api/icon/${encodeURIComponent(prefix)}/${encodeURIComponent(name)}${qs ? `?${qs}` : ""}`;
};

export const parseIconId = (id: string): { prefix: string; name: string } => {
  const [prefix, ...rest] = id.split(":");
  return { prefix: prefix ?? "", name: rest.join(":") };
};
