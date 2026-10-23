// /cli - route definition (head/loader only).
// The page component lives in the sibling .lazy.tsx file and is
// code-split: it downloads only when this page is opened
// (speed pass batch 2, 2026-10-23).

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/cli")({
  head: () => ({
    meta: [
      { title: "IconVault CLI - pull icons from the terminal" },
      {
        name: "description",
        content:
          "Search the IconVault library and download icons as SVG without leaving your terminal. Zero dependencies, works on Node 18+.",
      },
      { property: "og:title", content: "IconVault CLI - pull icons from the terminal" },
      {
        property: "og:description",
        content: "Search and download icons from the terminal with @iconvault/cli.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/cli" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/cli" }],
  }),
});
