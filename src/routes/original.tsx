// /original - route definition (head only). UI lives in original.lazy.tsx.

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/original")({
  head: () => ({
    meta: [
      { title: "Original Icon Collections - AI Tools, Diwali & Desi UI | IconVault" },
      {
        name: "description",
        content:
          "60 original icons drawn by IconVault: 20 AI Tools icons, 20 Diwali icons and 20 Desi UI icons. Clean geometric stroke style, free to browse and download with a free account.",
      },
      { property: "og:title", content: "Original Icon Collections | IconVault" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://iconvault.site/original" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/original" }],
  }),
});
