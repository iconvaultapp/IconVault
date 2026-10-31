// Route definition (head/loader only) - v57 opt split.
// The page component lives in the sibling .lazy.tsx file and is
// code-split: it downloads only when this page is opened.

import { createFileRoute, notFound } from "@tanstack/react-router";
import type { IconifyCollection } from "@/lib/iconify";

export const Route = createFileRoute("/packs/$prefix")({
  loader: async ({ params }): Promise<{ prefix: string; collection: IconifyCollection }> => {
    // Dynamic import (v57 opt): a static import would pull collections.json
    // (~87 kB) into the entry chunk through the route tree. The lazy UI
    // file keeps its own static import for PackSeoSection props.
    const { default: collectionsData } = await import("../../public/iconify/collections.json");
    const collection = (collectionsData as Record<string, IconifyCollection>)[params.prefix];
    if (!collection) throw notFound();
    return { prefix: params.prefix, collection };
  },
  head: ({ loaderData }) => {
    const name = loaderData?.collection.name ?? loaderData?.prefix ?? "Icon pack";
    const total = loaderData?.collection.total ?? 0;
    const title = `${name} - ${total.toLocaleString("en-US")} free SVG icons | IconVault`;
    const description = `Download ${total.toLocaleString("en-US")} ${name} as SVG, PNG, WebP or copy-paste React components. Free; downloads need a free account.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: `https://iconvault.site/packs/${loaderData?.prefix}` },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: `https://iconvault.site/packs/${loaderData?.prefix}` }],
    };
  },
});
