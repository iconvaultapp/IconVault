// Pure Iconify SVG helpers - no DOM, no network. Safe to import from both
// client components and server (edge) routes.

export interface RawIconEntry {
  body?: string;
  parent?: string;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  rotate?: number;
  hFlip?: boolean;
  vFlip?: boolean;
}

export interface CollectionJson {
  prefix?: string;
  width?: number;
  height?: number;
  left?: number;
  top?: number;
  icons?: Record<string, RawIconEntry>;
  aliases?: Record<string, RawIconEntry>;
}

export interface ResolvedIcon {
  body: string;
  width: number;
  height: number;
  left: number;
  top: number;
  rotate: number;
  hFlip: boolean;
  vFlip: boolean;
}

/** Resolve an icon name through Iconify aliases to its final body + geometry. */
export const resolveIcon = (data: CollectionJson, name: string): ResolvedIcon | null => {
  const get = (n: string): RawIconEntry | undefined => data.icons?.[n] ?? data.aliases?.[n];
  const first = get(name);
  if (!first) return null;

  // Walk the alias chain (leaf -> root), then apply root -> leaf so the
  // requested alias's own overrides win. Transforms accumulate.
  const chain: RawIconEntry[] = [];
  const seen = new Set<string>();
  let cur: RawIconEntry | undefined = first;
  let curName: string | undefined = name;
  while (cur && curName && !seen.has(curName) && chain.length < 16) {
    seen.add(curName);
    chain.unshift(cur);
    curName = cur.parent;
    cur = curName ? get(curName) : undefined;
  }

  let body: string | undefined;
  let width = data.width ?? 24;
  let height = data.height ?? 24;
  let left = data.left ?? 0;
  let top = data.top ?? 0;
  let rotate = 0;
  let hFlip = false;
  let vFlip = false;

  for (const entry of chain) {
    if (entry.body) body = entry.body;
    if (entry.width !== undefined) width = entry.width;
    if (entry.height !== undefined) height = entry.height;
    if (entry.left !== undefined) left = entry.left;
    if (entry.top !== undefined) top = entry.top;
    rotate = (rotate + (entry.rotate ?? 0)) % 4;
    if (entry.hFlip) hFlip = !hFlip;
    if (entry.vFlip) vFlip = !vFlip;
  }

  if (!body) return null;
  return { body, width, height, left, top, rotate, hFlip, vFlip };
};

/**
 * Only these color values may be interpolated into SVG markup. Anything else
 * (e.g. `"><script>...` or `x"onload="...`) is rejected: the `color` option
 * comes from user-controlled query params, and SVG served as image/svg+xml
 * executes scripts in the site origin.
 */
export const SAFE_COLOR = /^(?:#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|[a-zA-Z]+)$/;

/** Build a standalone SVG string from resolved icon data. */
export const iconDataToSvg = (
  icon: {
    body: string;
    width?: number;
    height?: number;
    left?: number;
    top?: number;
    rotate?: number;
    hFlip?: boolean;
    vFlip?: boolean;
  },
  opts?: { width?: number; height?: number; color?: string },
): string => {
  const w = icon.width ?? 24;
  const h = icon.height ?? 24;
  const l = icon.left ?? 0;
  const t = icon.top ?? 0;
  const dw = opts?.width ?? w;
  const dh = opts?.height ?? h;
  let body = icon.body;
  // Only validated colors are interpolated; anything else is ignored.
  const color = opts?.color && SAFE_COLOR.test(opts.color) ? opts.color : undefined;
  if (color) body = body.split("currentColor").join(color);

  const transforms: string[] = [];
  if (icon.hFlip) transforms.push(`translate(${l * 2 + w} 0) scale(-1 1)`);
  if (icon.vFlip) transforms.push(`translate(0 ${t * 2 + h}) scale(1 -1)`);
  const rot = (((icon.rotate ?? 0) % 4) + 4) % 4;
  if (rot) transforms.push(`rotate(${rot * 90} ${l + w / 2} ${t + h / 2})`);

  const inner = transforms.length ? `<g transform="${transforms.join(" ")}">${body}</g>` : body;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${dw}" height="${dh}" viewBox="${l} ${t} ${w} ${h}">${inner}</svg>`;
};

/**
 * Re-style an existing SVG string: override width/height attributes and
 * recolor currentColor. Used for CDN-fetched per-icon SVGs.
 */
export const restyleSvg = (
  svg: string,
  opts?: { width?: number; height?: number; color?: string },
): string => {
  // Same validation as iconDataToSvg: never interpolate untrusted colors.
  const color = opts?.color && SAFE_COLOR.test(opts.color) ? opts.color : undefined;
  let out = color ? svg.split("currentColor").join(color) : svg;
  if (opts?.width || opts?.height) {
    out = out.replace(/<svg([^>]*)>/i, (_m, attrs: string) => {
      let a = String(attrs).replace(/\s(width|height)="[^"]*"/gi, "");
      if (opts?.width) a += ` width="${opts.width}"`;
      if (opts?.height) a += ` height="${opts.height}"`;
      return `<svg${a}>`;
    });
  }
  return out;
};

/** Extract viewBox + body from a raw SVG string into icon data. */
export const svgToIconData = (
  svg: string,
  prefix: string,
  name: string,
): { body: string; left: number; top: number; width: number; height: number } => {
  const m = svg.match(/<svg[^>]*viewBox="([^"]+)"[^>]*>([\s\S]*)<\/svg>/i);
  if (!m) throw new Error(`Could not parse SVG for ${prefix}:${name}`);
  const viewBox = m[1];
  const inner = m[2];
  if (viewBox === undefined || inner === undefined) throw new Error(`Could not parse SVG for ${prefix}:${name}`);
  const parts = viewBox.trim().split(/[\s,]+/).map(Number);
  const body = inner.trim();
  if (parts.length < 4 || parts.some((n) => !Number.isFinite(n)) || !body) {
    throw new Error(`Could not parse SVG for ${prefix}:${name}`);
  }
  const [left, top, width, height] = parts as [number, number, number, number];
  return { body, left, top, width, height };
};

const PER_ICON_PKG_CDN = [
  "https://cdn.jsdelivr.net/npm/@iconify-icons",
  "https://unpkg.com/@iconify-icons",
] as const;

/**
 * CDN URLs for a single icon's data file from the @iconify-icons/<prefix>
 * packages (used for giant collections whose full JSON is too heavy).
 * Files are sharded as data/<first-char>/<name>.js, e.g.
 * data/g/grinning-face.js. Versions are pinned at build time; when the
 * version is unknown the CDN resolves "latest".
 */
export const perIconDataUrls = (
  prefix: string,
  name: string,
  pkgVersions: Record<string, string>,
): string[] => {
  const ver = pkgVersions[prefix];
  const shard = encodeURIComponent(name.charAt(0).toLowerCase());
  const file = `data/${shard}/${encodeURIComponent(name)}.js`;
  return PER_ICON_PKG_CDN.map((base) =>
    ver && ver !== "latest" ? `${base}/${prefix}@${ver}/${file}` : `${base}/${prefix}/${file}`,
  );
};

/**
 * Parse an @iconify-icons data file (`const data = {...}; export default data;`)
 * into icon data without executing it.
 */
export const parseIconJsData = (
  js: string,
  prefix: string,
  name: string,
): { body: string; width?: number; height?: number; left?: number; top?: number } => {
  const start = js.indexOf("{");
  const end = js.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error(`Could not parse icon data for ${prefix}:${name}`);
  let data: unknown;
  try {
    data = JSON.parse(js.slice(start, end + 1));
  } catch {
    throw new Error(`Could not parse icon data for ${prefix}:${name}`);
  }
  const d = data as { body?: unknown; width?: unknown; height?: unknown; left?: unknown; top?: unknown };
  if (!d || typeof d.body !== "string" || !d.body) {
    throw new Error(`Could not parse icon data for ${prefix}:${name}`);
  }
  const out: { body: string; width?: number; height?: number; left?: number; top?: number } = {
    body: d.body,
  };
  if (typeof d.width === "number") out.width = d.width;
  if (typeof d.height === "number") out.height = d.height;
  if (typeof d.left === "number") out.left = d.left;
  if (typeof d.top === "number") out.top = d.top;
  return out;
};
