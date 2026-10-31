// Route definition (head/loader only) - v57 opt split.
// The page component lives in the sibling .lazy.tsx file and is
// code-split: it downloads only when this page is opened.

import { createFileRoute, notFound } from "@tanstack/react-router";
import type { IconCategory } from "@/lib/iconify";

export const Route = createFileRoute("/categories/$slug")({
  loader: async ({ params }): Promise<{ category: IconCategory }> => {
    // Dynamic import (v57 opt): keeps categories.json out of the entry chunk.
    // The lazy UI file keeps its own static import for the related list.
    const { default: categoriesData } = await import("../../public/iconify/categories.json");
    const category = (categoriesData as IconCategory[]).find((c) => c.slug === params.slug);
    if (!category) throw notFound();
    return { category };
  },
  head: ({ loaderData }) => {
    const name = loaderData?.category.name ?? "Category";
    const count = loaderData?.category.count ?? 0;
    const title = `${name} icons - ${count.toLocaleString("en-US")} free SVG icons | IconVault`;
    const description = `Browse ${count.toLocaleString("en-US")} free ${name.toLowerCase()} icons. Download as SVG, PNG, WebP or copy-paste React components - free; downloads need a free account.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: `/categories/${loaderData?.category.slug}` },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: `https://iconvault.site/categories/${loaderData?.category.slug}` }],
    };
  },
});
