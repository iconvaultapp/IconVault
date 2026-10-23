// /collections - route definition (head/loader only).
// The page component lives in the sibling .lazy.tsx file and is
// code-split: it downloads only when this page is opened
// (speed pass batch 2, 2026-10-23).

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/collections")({
  head: () => ({
    meta: [
      { title: "My collections - group and export icon packs | IconVault" },
      {
        name: "description",
        content:
          "Group icons into named packs per project, keep them synced across devices, and export the whole set as SVG in one download.",
      },
      { property: "og:title", content: "My collections - group and export icon packs" },
      {
        property: "og:description",
        content: "Group icons into named packs per project and export the whole set at once.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/collections" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/collections" }],
  }),
});
