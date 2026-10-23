// /admin - route definition (head/loader only).
// The page component lives in the sibling .lazy.tsx file and is
// code-split: it downloads only when this page is opened
// (speed pass batch 2, 2026-10-23).

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin panel | IconVault" },
      {
        name: "description",
        content:
          "Internal IconVault admin panel: review icon requests, monitor account activity and manage administrator access.",
      },
      { property: "og:title", content: "Admin panel | IconVault" },
      { property: "og:description", content: "Internal IconVault administration dashboard." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
