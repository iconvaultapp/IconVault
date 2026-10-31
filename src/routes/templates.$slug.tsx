// /templates/$slug - route definition (head only; no data import, so the
// gallery data file is not pulled into the entry chunk). UI: templates.$slug.lazy.tsx

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/templates/$slug")({
  head: ({ params }) => {
    const title = params.slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return {
      meta: [
        { title: `${title} - Free Website Template | IconVault` },
        {
          name: "description",
          content: `Preview and download the ${title} website template — free, MIT licensed, from IconVault's templates gallery.`,
        },
        { property: "og:title", content: `${title} | IconVault` },
        { property: "og:type", content: "website" },
        { property: "og:url", content: `https://iconvault.site/templates/${params.slug}` },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: `https://iconvault.site/templates/${params.slug}` }],
    };
  },
});
