// /changelog - route definition (head/loader only).
// The page component lives in the sibling .lazy.tsx file and is
// code-split: it downloads only when this page is opened
// (speed pass batch 2, 2026-10-23).

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/changelog")({
  head: () => ({
    meta: [
      { title: "Changelog - what's new in IconVault" },
      {
        name: "description",
        content:
          "Every IconVault release: new icon sets, faster search, export formats, API changes and fixes. Updated continuously.",
      },
      { property: "og:title", content: "Changelog - what's new in IconVault" },
      {
        property: "og:description",
        content: "New icon sets, faster search, export formats, API changes and fixes.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/changelog" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/changelog" }],
  }),
});
