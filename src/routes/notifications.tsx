// /notifications - route definition (head/loader only).
// The page component lives in the sibling .lazy.tsx file and is
// code-split: it downloads only when this page is opened
// (speed pass batch 2, 2026-10-23).

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications & release alerts | IconVault" },
      {
        name: "description",
        content:
          "Track new icon sets, upstream releases and collection activity. Choose exactly which updates reach you and where.",
      },
      { property: "og:title", content: "Notifications & release alerts" },
      {
        property: "og:description",
        content: "Track new icon sets, upstream releases and collection activity.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/notifications" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/notifications" }],
  }),
});
