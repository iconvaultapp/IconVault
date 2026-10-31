// /customizer - route definition (head only). UI lives in customizer.lazy.tsx.
// Share links encode the full customization state in URL params (icon, color,
// size, stroke, bg); the canonical URL stays the base /customizer, and the
// params are read client-side so opening a shared link restores the icon.

import { createFileRoute } from "@tanstack/react-router";

const safeColor = (v: unknown): string | undefined => {
  if (typeof v !== "string") return undefined;
  return /^#[0-9a-fA-F]{3,8}$/.test(v) || /^[a-zA-Z]+$/.test(v) ? v : undefined;
};

const safeNum = (v: unknown, min: number, max: number): number | undefined => {
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? n : undefined;
};

export const Route = createFileRoute("/customizer")({
  validateSearch: (search: Record<string, unknown>) => ({
    icon: typeof search["icon"] === "string" && search["icon"].includes(":") ? search["icon"] : undefined,
    color: safeColor(search["color"]),
    size: safeNum(search["size"], 16, 512),
    stroke: safeNum(search["stroke"], 0.5, 4),
    bg: typeof search["bg"] === "string" && search["bg"] !== "none" ? safeColor(search["bg"]) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Icon Customizer - Recolor, Resize & Share Any Icon | IconVault" },
      {
        name: "description",
        content:
          "Pick any icon from the IconVault library, change its color, size and stroke width, preview it live, then download SVG/PNG or copy a share link that restores the exact same customized icon. Free — downloads need a free account.",
      },
      { property: "og:title", content: "Icon Customizer | IconVault" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://iconvault.site/customizer" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/customizer" }],
  }),
});
