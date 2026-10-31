// Route definition (head/loader only) - v57 opt split.
// The page component lives in the sibling .lazy.tsx file and is
// code-split: it downloads only when this page is opened.

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/illustrations")({
  head: () => ({
    meta: [
      { title: "Free SVG Illustrations - Recolor, Resize & Download | IconVault" },
      {
        name: "description",
        content:
          "386 free open-source SVG illustrations from 5 packs for websites and apps. Recolor them to your brand, resize, and download as SVG or PNG. MIT and CC0 licensed.",
      },
      { property: "og:title", content: "Free SVG Illustrations | IconVault" },
      {
        property: "og:description",
        content: "Recolor, resize and download 386 free SVG illustrations from 5 open-source packs.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/illustrations" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/illustrations" }],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    open: typeof search["open"] === "string" ? search["open"] : undefined,
  }),
});
