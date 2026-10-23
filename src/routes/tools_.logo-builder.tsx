// /tools/logo-builder - route definition (SEO head only).
// The tool UI lives in the sibling .lazy.tsx file and is code-split:
// it downloads only when this tool is opened (speed pass, 2026-10-23).
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/tools_/logo-builder")({
  head: () => ({
    meta: [
      { title: "Logo Builder - Free Favicon & App Icon Maker | IconVault" },
      {
        name: "description",
        content:
          "Turn any of 421,020 icons into a logo: style the tile, add a wordmark, export PNG, SVG and a full favicon + app-icon kit.",
      },
      { property: "og:title", content: "Logo Builder - Free Favicon & App Icon Maker | IconVault" },
      {
        property: "og:description",
        content:
          "Turn any of 421,020 icons into a logo: style the tile, add a wordmark, export PNG, SVG and a full favicon + app-icon kit.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://iconvault.site/tools/logo-builder" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Logo Builder - Free Favicon & App Icon Maker | IconVault" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/tools/logo-builder" }],
  }),
});
