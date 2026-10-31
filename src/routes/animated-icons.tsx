// /animated-icons - route definition (head only). UI lives in animated-icons.lazy.tsx
// (lean-route pattern: this file must stay import-free apart from the router
// so the gallery data file is not pulled into the entry chunk).

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/animated-icons")({
  head: () => ({
    meta: [
      { title: "625 Free Animated Icons - Weather, Loaders & Spinners | IconVault" },
      {
        name: "description",
        content:
          "625 free MIT-licensed animated icons: 475 Meteocons weather icons (animated SVG + Lottie), 12 SVG-Loaders, 106 Whirl CSS loaders, 12 SpinKit spinners and 20 Epic Spinners. Preview and copy the code free; downloads need a free account.",
      },
      { property: "og:title", content: "Free Animated Icons | IconVault" },
      {
        property: "og:description",
        content:
          "625 free animated icons: Meteocons weather, SVG-Loaders, Whirl, SpinKit and Epic Spinners. Preview and download.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://iconvault.site/animated-icons" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/animated-icons" }],
  }),
});
