// /profile - route definition (head/loader only).
// The page component lives in the sibling .lazy.tsx file and is
// code-split: it downloads only when this page is opened
// (speed pass batch 2, 2026-10-23).

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your profile & account settings | IconVault" },
      {
        name: "description",
        content:
          "Manage your display name, review saved icons and collections, check your plan and copy your API key.",
      },
      { property: "og:title", content: "Your profile & account settings" },
      {
        property: "og:description",
        content: "Manage your account, saved icons, plan and API key.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/profile" }],
  }),
});
