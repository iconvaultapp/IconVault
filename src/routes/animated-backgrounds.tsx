// /animated-backgrounds - route definition (head only). UI lives in
// animated-backgrounds.lazy.tsx (lean-route pattern: this file must stay
// import-free apart from the router so three.js and the Vanta effect
// bundles are never pulled into the entry chunk).
//
// v56 demo page, and the ONLY page that loads Vanta or three.js. The
// effects here never run on the homepage, tool pages or icon pages.

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/animated-backgrounds")({
  head: () => ({
    meta: [
      { title: "Animated Backgrounds Demo - Waves, Birds & Fog | IconVault" },
      {
        name: "description",
        content:
          "A live demo of animated backgrounds: waves, birds and fog, rendered with Vanta and three.js. A demo only: these effects do not run anywhere else on IconVault, and a static gradient shows when WebGL is unavailable or motion is reduced.",
      },
      { property: "og:title", content: "Animated Backgrounds Demo | IconVault" },
      {
        property: "og:description",
        content:
          "Try live Vanta animated backgrounds: waves, birds and fog. Demo only, with a static gradient fallback.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://iconvault.site/animated-backgrounds" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/animated-backgrounds" }],
  }),
});
