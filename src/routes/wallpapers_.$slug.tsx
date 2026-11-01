// /wallpapers/$slug - REMOVED (founder decision, IconVault v61, 2026-11-01):
// detail pages redirect to the homepage, same as the gallery route.
// UI: wallpapers_.$slug.lazy.tsx (never renders while the redirect is in
// place).

import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/wallpapers_/$slug")({
  // v61: wallpapers section removed — every visit lands on home.
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
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
