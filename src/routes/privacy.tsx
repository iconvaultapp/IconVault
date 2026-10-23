// /privacy - route definition (head/loader only).
// The page component lives in the sibling .lazy.tsx file and is
// code-split: it downloads only when this page is opened
// (speed pass batch 2, 2026-10-23).

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy - IconVault" },
      {
        name: "description",
        content:
          "How IconVault collects, uses and protects your data: account email, first-party analytics, cookies, payments via Dodo Payments and your rights.",
      },
      { property: "og:title", content: "Privacy Policy - IconVault" },
      {
        property: "og:description",
        content:
          "How IconVault collects, uses and protects your data: account email, first-party analytics, cookies, payments via Dodo Payments and your rights.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/privacy" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/privacy" }],
  }),
});
