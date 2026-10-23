// /compare - route definition (head/loader only).
// The page component lives in the sibling .lazy.tsx file and is
// code-split: it downloads only when this page is opened
// (speed pass batch 2, 2026-10-23).

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/compare")({
  head: () => ({
    meta: [
      { title: "Compare icons side by side | IconVault" },
      {
        name: "description",
        content:
          "Put candidate icons next to each other at real sizes, on light and dark surfaces, before you commit one to your design system.",
      },
      { property: "og:title", content: "Compare icons side by side" },
      {
        property: "og:description",
        content: "Compare candidate icons at real sizes on light and dark surfaces.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/compare" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/compare" }],
  }),
});
