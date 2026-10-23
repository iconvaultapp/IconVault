// /admin-login - route definition (head/loader only).
// The page component lives in the sibling .lazy.tsx file and is
// code-split: it downloads only when this page is opened
// (speed pass batch 2, 2026-10-23).

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin-login")({
  head: () => ({
    meta: [
      { title: "Owner sign-in | IconVault admin" },
      {
        name: "description",
        content:
          "Private sign-in for the IconVault site owner and administrators. Separate from the public account login.",
      },
      { property: "og:title", content: "Owner sign-in | IconVault admin" },
      {
        property: "og:description",
        content: "Private sign-in for the IconVault site owner and administrators.",
      },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
