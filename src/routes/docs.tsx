// Route definition (head/loader only) - v57 opt split.
// The page component lives in the sibling .lazy.tsx file and is
// code-split: it downloads only when this page is opened.

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Documentation - IconVault" },
      {
        name: "description",
        content:
          "Guides for every corner of IconVault: search, exports, Logo Builder, REST API, Pro billing and more.",
      },
      { property: "og:title", content: "Documentation - IconVault" },
      {
        property: "og:description",
        content:
          "Guides for every corner of IconVault: search, exports, Logo Builder, REST API, Pro billing and more.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://iconvault.site/docs" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/docs" }],
  }),
});
