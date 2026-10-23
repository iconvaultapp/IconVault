// /categories/ - route definition (head/loader only).
// The page component lives in the sibling .lazy.tsx file and is
// code-split: it downloads only when this page is opened
// (speed pass batch 2, 2026-10-23).

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/categories/")({
  head: () => ({
    meta: [
      { title: "Browse icons by category - 200+ categories | IconVault" },
      {
        name: "description",
        content:
          "Explore free SVG icons by category: arrows, animals, food, weather, social media, maps and 200+ more curated categories.",
      },
      { property: "og:title", content: "Browse icons by category | IconVault" },
      {
        property: "og:description",
        content: "200+ curated icon categories - arrows, food, weather, social media and more.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/categories" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/categories" }],
  }),
});
