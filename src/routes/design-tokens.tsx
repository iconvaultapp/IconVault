// /design-tokens - route definition (head/loader only).
// The page component lives in the sibling .lazy.tsx file and is
// code-split: it downloads only when this page is opened
// (speed pass batch 2, 2026-10-23).

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/design-tokens")({
  head: () => ({
    meta: [
      { title: "Export design tokens - CSS, JSON, Tailwind | IconVault" },
      {
        name: "description",
        content:
          "Turn a saved icon set into tokens your codebase can consume: CSS custom properties, a JSON manifest, a Tailwind plugin or typed TypeScript constants.",
      },
      { property: "og:title", content: "Export design tokens - CSS, JSON, Tailwind" },
      {
        property: "og:description",
        content: "Turn saved icons into CSS variables, JSON, Tailwind config or typed constants.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/design-tokens" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/design-tokens" }],
  }),
});
