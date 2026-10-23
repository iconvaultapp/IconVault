// /request - route definition (head/loader only).
// The page component lives in the sibling .lazy.tsx file and is
// code-split: it downloads only when this page is opened
// (speed pass batch 2, 2026-10-23).

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/request")({
  head: () => ({
    meta: [
      { title: "Request an icon | IconVault" },
      {
        name: "description",
        content:
          "Searched everything and it doesn't exist? Tell us what you need. We track requests, point you at near matches and push popular ones upstream.",
      },
      { property: "og:title", content: "Request an icon" },
      {
        property: "og:description",
        content: "Tell us the icon you couldn't find and we'll track it down or push it upstream.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/request" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/request" }],
  }),
});
