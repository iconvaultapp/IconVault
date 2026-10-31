// Route definition (head/loader only) - v57 opt split.
// The page component lives in the sibling .lazy.tsx file and is
// code-split: it downloads only when this page is opened.

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/team")({
  head: () => ({
    meta: [
      { title: "Team workspace - shared icon libraries | IconVault" },
      {
        name: "description",
        content:
          "One approved icon library for the whole product team. Shared collections, roles, custom uploads with review, usage analytics and SSO.",
      },
      { property: "og:title", content: "Team workspace - shared icon libraries" },
      {
        property: "og:description",
        content: "Shared collections, roles, upload review, usage analytics and SSO for product teams.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/team" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/team" }],
  }),
});
