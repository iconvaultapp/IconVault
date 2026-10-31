// Route definition (head/loader only) - v57 opt split.
// The page component lives in the sibling .lazy.tsx file and is
// code-split: it downloads only when this page is opened.

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api-access")({
  head: () => ({
    meta: [
      { title: "Icon API - REST endpoints and keys | IconVault" },
      {
        name: "description",
        content:
          "A JSON REST API for 421,020 icons: search, fetch SVG and batch icon bodies. Free API keys with 1,000 calls a month, or keyless access under per-minute IP limits.",
      },
      { property: "og:title", content: "Icon API - REST endpoints and keys" },
      {
        property: "og:description",
        content: "Search icons, fetch SVG and batch icon bodies over a plain JSON REST API.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/api-access" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/api-access" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "TechArticle",
          headline: "IconVault REST API",
          description: "REST API reference for searching icons, fetching SVG and batching icon bodies.",
        }),
      },
    ],
  }),
});
