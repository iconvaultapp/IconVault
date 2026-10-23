// /history - route definition (head/loader only).
// The page component lives in the sibling .lazy.tsx file and is
// code-split: it downloads only when this page is opened
// (speed pass batch 2, 2026-10-23).

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Your search & icon history | IconVault" },
      {
        name: "description",
        content:
          "Every icon you opened and every search you ran, kept on this device. Jump back to a result you almost used without retracing the search.",
      },
      { property: "og:title", content: "Your search & icon history" },
      {
        property: "og:description",
        content: "Revisit the icons you opened and the searches you ran, stored on your device.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/history" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/history" }],
  }),
});
