// /wallpapers/$slug - route definition (head only; no data import, so the
// gallery data file is not pulled into the entry chunk). UI: wallpapers.$slug.lazy.tsx

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/wallpapers/$slug")({
  head: ({ params }) => {
    const title = params.slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return {
      meta: [
        { title: `${title} - Original Wallpaper | IconVault` },
        {
          name: "description",
          content: `Preview and download the ${title} original wallpaper, made in code by IconVault. Mobile 1080x1920 and desktop 1920x1080, in WebP and JPG.`,
        },
        { property: "og:title", content: `${title} | IconVault` },
        { property: "og:type", content: "website" },
        { property: "og:url", content: `https://iconvault.site/wallpapers/${params.slug}` },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: `https://iconvault.site/wallpapers/${params.slug}` }],
    };
  },
});
