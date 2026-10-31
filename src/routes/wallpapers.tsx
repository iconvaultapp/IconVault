// /wallpapers - route definition (head only). UI lives in wallpapers.lazy.tsx
// (lean-route pattern: this file must stay import-free apart from the router
// so the gallery data file is not pulled into the entry chunk).

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/wallpapers")({
  head: () => ({
    meta: [
      { title: "30 Original Wallpapers - 3D, Gradient, Geometric and Nature | IconVault" },
      {
        name: "description",
        content:
          "30 original wallpapers made in code by IconVault: 10 in 3D look, 8 gradient, 6 geometric and 6 nature. Mobile 1080x1920 and desktop 1920x1080, in WebP and JPG. Preview free; downloads need a free account.",
      },
      { property: "og:title", content: "Original Wallpapers | IconVault" },
      {
        property: "og:description",
        content:
          "30 original code-generated wallpapers in the IconVault theme. Mobile and desktop sizes, WebP and JPG.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://iconvault.site/wallpapers" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/wallpapers" }],
  }),
});
