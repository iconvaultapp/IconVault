// /tools - route definition (head/loader only).
// The page component lives in the sibling .lazy.tsx file and is
// code-split: it downloads only when this page is opened
// (speed pass batch 2, 2026-10-23).

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/tools")({
  head: () => ({
    meta: [
      { title: "Free Design & Developer Tools - IconVault" },
      {
        name: "description",
        content:
          "578 free online tools: dev utilities, image converters, SEO checkers, calculators, security tools, interactive web API playgrounds, text tools and more.",
      },
      { property: "og:title", content: "Free Design & Developer Tools - IconVault" },
      {
        property: "og:description",
        content:
          "578 free online tools: dev utilities, image converters, SEO checkers, calculators, security tools and more. Downloads need a free account.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://iconvault.site/tools" },
      { property: "og:image", content: "https://iconvault.site/og-image.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Free Design & Developer Tools - IconVault" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/tools" }],
  }),
});
