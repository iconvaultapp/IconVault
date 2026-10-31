// /showcase - route definition (head only). UI lives in showcase.lazy.tsx.

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/showcase")({
  head: () => ({
    meta: [
      { title: "Community Showcase - Projects Built with IconVault Icons" },
      {
        name: "description",
        content:
          "Real projects built with IconVault icons, shared by their creators. Submit your project — entries appear here only after approval. Free to browse.",
      },
      { property: "og:title", content: "Community Showcase | IconVault" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://iconvault.site/showcase" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/showcase" }],
  }),
});
