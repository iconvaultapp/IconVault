// /original/$collection - route definition (head only; no data import, so the
// metadata file is not pulled into the entry chunk). UI: original.$collection.lazy.tsx

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/original/$collection")({
  head: ({ params }) => {
    const title = params.collection.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return {
      meta: [
        { title: `${title} Icons - Original Collection | IconVault` },
        {
          name: "description",
          content: `Browse and download the original ${title} icon collection — hand-drawn by IconVault, free with a free account.`,
        },
        { property: "og:title", content: `${title} Icons | IconVault` },
        { property: "og:type", content: "website" },
        { property: "og:url", content: `https://iconvault.site/original/${params.collection}` },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: `https://iconvault.site/original/${params.collection}` }],
    };
  },
});
