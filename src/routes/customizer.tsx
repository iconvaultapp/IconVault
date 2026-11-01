// /customizer - HIDDEN (founder decision, IconVault v60, 2026-11-01):
// the whole page redirects to the homepage, including old ?icon= share
// links. Route/component files are deliberately NOT deleted: an
// extract-over deploy would keep deploying them from the founder's repo
// anyway, and deleting them here would only confuse. Revert = remove the
// beforeLoad redirect below. UI lives in customizer.lazy.tsx (never
// renders while the redirect is in place).

import { createFileRoute, redirect } from "@tanstack/react-router";

const safeColor = (v: unknown): string | undefined => {
  if (typeof v !== "string") return undefined;
  return /^#[0-9a-fA-F]{3,8}$/.test(v) || /^[a-zA-Z]+$/.test(v) ? v : undefined;
};

const safeNum = (v: unknown, min: number, max: number): number | undefined => {
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? n : undefined;
};

export const Route = createFileRoute("/customizer")({
  // v60: hide the whole customizer page — every visit lands on home.
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
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
