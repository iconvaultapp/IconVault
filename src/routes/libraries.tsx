// /libraries - route definition (head/loader only).
// The page component lives in the sibling .lazy.tsx file and is
// code-split: it downloads only when this page is opened
// (speed pass batch 2, 2026-10-23).

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/libraries")({
  head: () => ({
    meta: [
      { title: "All icon libraries - every icon set in one place | IconVault" },
      {
        name: "description",
        content:
          "Browse every icon library on IconVault: Lucide, Tabler, Material, Phosphor and 200+ more open-source SVG icon sets, side by side with live samples.",
      },
      { property: "og:title", content: "All icon libraries | IconVault" },
      {
        property: "og:description",
        content: "Every open-source icon set on IconVault, side by side with live samples.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/libraries" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/libraries" }],
  }),
});
