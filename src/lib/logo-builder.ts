/**
 * Logo Builder - compose app icons / logos / favicons from any of the
 * 421,020 library icons, then export PNGs, SVG and a full favicon kit.
 *
 * Single source of truth: buildLogoSvg() renders the exact SVG used for the
 * live preview AND every export, so what you see is what you download.
 */

export type BgType = "solid" | "gradient" | "transparent";

export interface LogoIcon {
  prefix: string;
  name: string;
  body: string;
  width: number;
  height: number;
}

export interface LogoConfig {
  bgType: BgType;
  bgColor: string;
  bgColor2: string;
  gradientAngle: number;
  recolorIcon: boolean;
  iconColor: string;
  /** Icon size as % of canvas (10–90). */
  iconScale: number;
  /** Rotation in degrees. */
  rotation: number;
  /** Corner radius as % (0–50). */
  radiusPct: number;
  /** Icon opacity 0–100. */
  opacity: number;
  shadow: boolean;
  border: boolean;
  borderWidth: number;
  borderColor: string;
  showText: boolean;
  text: string;
  textSize: number;
  textColor: string;
  textWeight: number;
}

export const DEFAULT_LOGO_CONFIG: LogoConfig = {
  bgType: "gradient",
  bgColor: "#7c3aed",
  bgColor2: "#ec4899",
  gradientAngle: 135,
  recolorIcon: true,
  iconColor: "#ffffff",
  iconScale: 52,
  rotation: 0,
  radiusPct: 28,
  opacity: 100,
  shadow: true,
  border: false,
  borderWidth: 8,
  borderColor: "#ffffff",
  showText: false,
  text: "Acme",
  textSize: 9,
  textColor: "#1a1a1a",
  textWeight: 700,
};

export interface GradientPreset {
  name: string;
  from: string;
  to: string;
  angle: number;
}

export const GRADIENT_PRESETS: GradientPreset[] = [
  { name: "Violet pop", from: "#7c3aed", to: "#ec4899", angle: 135 },
  { name: "Crimson", from: "#e11d48", to: "#f43f5e", angle: 135 },
  { name: "Ocean", from: "#0ea5e9", to: "#22d3ee", angle: 135 },
  { name: "Forest", from: "#059669", to: "#34d399", angle: 135 },
  { name: "Sunset", from: "#f59e0b", to: "#ef4444", angle: 135 },
  { name: "Midnight", from: "#1e293b", to: "#475569", angle: 135 },
  { name: "Candy", from: "#8b5cf6", to: "#3b82f6", angle: 135 },
  { name: "Lime", from: "#65a30d", to: "#a3e635", angle: 135 },
];

export const SOLID_PRESETS = [
  "#e11d48", "#f59e0b", "#10b981", "#0ea5e9",
  "#7c3aed", "#ec4899", "#1e293b", "#ffffff",
];

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Build the full logo SVG at a given pixel size. Used for preview (any size)
 * and for every export, so preview === download, always.
 */
export function buildLogoSvg(cfg: LogoConfig, icon: LogoIcon | null, size: number): string {
  const rx = Math.round((cfg.radiusPct / 100) * size);
  const gid = `lbg${size}`;
  const fid = `lsh${size}`;

  let bg = "";
  if (cfg.bgType === "gradient") {
    bg = `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1" gradientTransform="rotate(${cfg.gradientAngle} 0.5 0.5)"><stop offset="0" stop-color="${cfg.bgColor}"/><stop offset="1" stop-color="${cfg.bgColor2}"/></linearGradient></defs><rect width="${size}" height="${size}" rx="${rx}" fill="url(#${gid})"/>`;
  } else if (cfg.bgType === "solid") {
    bg = `<rect width="${size}" height="${size}" rx="${rx}" fill="${cfg.bgColor}"/>`;
  }
  // transparent: no background rect at all

  const defs: string[] = [];
  if (cfg.shadow) {
    defs.push(
      `<filter id="${fid}" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="${Math.round(size * 0.03)}" stdDeviation="${Math.round(size * 0.04)}" flood-color="#000" flood-opacity="0.28"/></filter>`,
    );
  }
  const defsBlock = defs.length ? `<defs>${defs.join("")}</defs>` : "";
  const filterAttr = cfg.shadow ? ` filter="url(#${fid})"` : "";

  // Reserve bottom space for the wordmark when enabled.
  const textH = cfg.showText && cfg.text.trim() ? Math.round(size * (cfg.textSize / 100)) * 2.2 : 0;
  const artH = size - textH;
  const iconPx = Math.round(size * (cfg.iconScale / 100));
  const cx = size / 2;
  const cy = artH / 2;

  let iconSvg = "";
  if (icon) {
    let body = icon.body;
    if (cfg.recolorIcon) body = body.split("currentColor").join(cfg.iconColor);
    const iw = icon.width || 24;
    const ih = icon.height || 24;
    // Fit the icon's own aspect ratio inside the icon box.
    const fit = Math.min(iconPx / iw, iconPx / ih);
    const w = Math.round(iw * fit);
    const h = Math.round(ih * fit);
    iconSvg =
      `<g transform="translate(${cx} ${cy}) rotate(${cfg.rotation})" opacity="${(cfg.opacity / 100).toFixed(2)}">` +
      `<svg x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" viewBox="0 0 ${iw} ${ih}">${body}</svg></g>`;
  }

  let border = "";
  if (cfg.border && cfg.bgType !== "transparent") {
    const bw = Math.max(1, Math.round(size * (cfg.borderWidth / 512)));
    border = `<rect x="${bw / 2}" y="${bw / 2}" width="${size - bw}" height="${size - bw}" rx="${Math.max(0, rx - bw / 2)}" fill="none" stroke="${cfg.borderColor}" stroke-width="${bw}"/>`;
  }

  let wordmark = "";
  if (cfg.showText && cfg.text.trim()) {
    const fs = Math.round(size * (cfg.textSize / 100));
    wordmark =
      `<text x="${cx}" y="${artH + fs * 1.4}" text-anchor="middle" ` +
      `font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="${fs}" ` +
      `font-weight="${cfg.textWeight}" fill="${cfg.textColor}">${esc(cfg.text.trim())}</text>`;
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
    `<g${filterAttr}>${bg}</g>${iconSvg}${border}${defsBlock}${wordmark}</svg>`
  );
}

/** Rasterize an SVG string to a PNG blob at the given pixel size. */
export function svgToPngBlob(svg: string, size: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("no 2d context");
        ctx.drawImage(img, 0, 0, size, size);
        URL.revokeObjectURL(url);
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("PNG encode failed"))),
          "image/png",
        );
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("SVG raster failed"));
    };
    img.src = url;
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Full favicon / app-icon kit as a ZIP (Pro feature). */
export async function downloadLogoKit(cfg: LogoConfig, icon: LogoIcon, slug: string) {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const name = (slug || "logo").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "logo";

  const files: [string, number][] = [
    ["favicon-16x16.png", 16],
    ["favicon-32x32.png", 32],
    ["apple-touch-icon.png", 180],
    ["icon-192x192.png", 192],
    ["icon-512x512.png", 512],
  ];
  for (const [filename, size] of files) {
    const blob = await svgToPngBlob(buildLogoSvg(cfg, icon, size), size);
    zip.file(filename, blob);
  }
  zip.file(`${name}.svg`, buildLogoSvg(cfg, icon, 512));

  const manifest = {
    name,
    short_name: name,
    icons: [
      { src: "icon-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    theme_color: cfg.bgType === "transparent" ? "#ffffff" : cfg.bgColor,
    background_color: cfg.bgType === "transparent" ? "#ffffff" : cfg.bgColor,
    display: "standalone",
  };
  zip.file("site.webmanifest", JSON.stringify(manifest, null, 2));
  zip.file(
    "snippet.html",
    [
      '<!-- IconVault logo kit: drop these in your <head> -->',
      '<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">',
      '<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">',
      '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">',
      '<link rel="manifest" href="/site.webmanifest">',
      "",
    ].join("\n"),
  );

  const blob = await zip.generateAsync({ type: "blob" });
  downloadBlob(blob, `${name}-logo-kit.zip`);
}
