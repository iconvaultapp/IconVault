// /animated-icons/$slug - route definition (head only; no data import, so the
// gallery data file is not pulled into the entry chunk). UI: animated-icons.$slug.lazy.tsx

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/animated-icons/$slug")({
  head: ({ params }) => {
    const title = params.slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return {
      meta: [
        { title: `${title} - Free Animated Icon | IconVault` },
        {
          name: "description",
          content: `Preview and download the ${title} animated icon — free, MIT licensed, from IconVault's animated icons gallery.`,
        },
        { property: "og:title", content: `${title} | IconVault` },
        { property: "og:type", content: "website" },
        { property: "og:url", content: `https://iconvault.site/animated-icons/${params.slug}` },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: `https://iconvault.site/animated-icons/${params.slug}` }],
    };
  },
});
