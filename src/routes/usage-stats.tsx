// /usage-stats - route definition (head/loader only).
// The page component lives in the sibling .lazy.tsx file and is
// code-split: it downloads only when this page is opened
// (speed pass batch 2, 2026-10-23).

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/usage-stats")({
  head: () => ({
    meta: [
      { title: "Your usage stats | IconVault" },
      {
        name: "description",
        content:
          "See which icon sets you actually rely on, how many icons you've saved, and where your searches are going - a quick read on your icon habits.",
      },
      { property: "og:title", content: "Your usage stats" },
      {
        property: "og:description",
        content: "See which icon sets you rely on and how your searches trend.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/usage-stats" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/usage-stats" }],
  }),
});
