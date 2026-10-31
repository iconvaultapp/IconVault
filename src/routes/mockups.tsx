// /mockups - route definition (head only). UI lives in mockups.lazy.tsx
// (lean-route pattern: this file must stay import-free apart from the router
// so the gallery data file is not pulled into the entry chunk).

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/mockups")({
  head: () => ({
    meta: [
      { title: "Mockup Tool and Free Mockup Templates - Device Frames, App Screenshots, Branding | IconVault" },
      {
        name: "description",
        content:
          "Turn a screenshot into a device mockup in your browser: upload an image, pick from 28 device frames, and export a PNG. Plus 12 original free HTML mockup templates for device frames, app screenshots and branding. Previews are free; downloads need a free account.",
      },
      { property: "og:title", content: "Mockup Tool and Free Mockup Templates | IconVault" },
      {
        property: "og:description",
        content:
          "Upload a screenshot, pick a device frame, export a PNG. Plus 12 original free HTML mockup templates.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://iconvault.site/mockups" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/mockups" }],
  }),
});
