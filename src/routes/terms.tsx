// /terms - route definition (head/loader only).
// The page component lives in the sibling .lazy.tsx file and is
// code-split: it downloads only when this page is opened
// (speed pass batch 2, 2026-10-23).

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions - IconVault" },
      {
        name: "description",
        content:
          "The terms of using IconVault: free icon library and tools, free-use limits, Pro plans, acceptable use, licences, warranties and liability.",
      },
      { property: "og:title", content: "Terms & Conditions - IconVault" },
      {
        property: "og:description",
        content:
          "The terms of using IconVault: free icon library and tools, free-use limits, Pro plans, acceptable use, licences, warranties and liability.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/terms" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/terms" }],
  }),
});
