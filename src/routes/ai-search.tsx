// /ai-search - route definition (head/loader only).
// The page component lives in the sibling .lazy.tsx file and is
// code-split: it downloads only when this page is opened
// (speed pass batch 2, 2026-10-23).

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/ai-search")({
  head: () => ({
    meta: [
      { title: "AI icon search - describe it, we find it | IconVault" },
      {
        name: "description",
        content:
          "Describe the idea in plain language and get matching icons across 421,020 open-source glyphs. No keyword guessing, no set-by-set hunting.",
      },
      { property: "og:title", content: "AI icon search - describe it, we find it" },
      {
        property: "og:description",
        content: "Describe an idea in plain language and get matching icons instantly.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/ai-search" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/ai-search" }],
  }),
});
