// /about - route definition (head/loader only).
// The page component lives in the sibling .lazy.tsx file and is
// code-split: it downloads only when this page is opened
// (speed pass batch 2, 2026-10-23).

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About IconVault - built by Dev Coder" },
      {
        name: "description",
        content:
          "IconVault is a free search index of 421,020 open-source SVG icons from 239 sets, plus 578 free tools, 386 illustrations and 3,359 UI components. Built by solo founder Dev Coder.",
      },
      { property: "og:title", content: "About IconVault - built by Dev Coder" },
      {
        property: "og:description",
        content:
          "A free search index of 421,020 open-source SVG icons, 578 tools, 386 illustrations and 3,359 UI components, built by solo founder Dev Coder.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/about" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/about" }],
  }),
});
