// Route definition (head/loader only) - v57 opt split.
// The page component lives in the sibling .lazy.tsx file and is
// code-split: it downloads only when this page is opened.

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "Blog - SVG icon guides, comparisons and best practices | IconVault" },
      {
        name: "description",
        content:
          "IconVault blog: practical guides and honest comparisons about free SVG icons, icon libraries like Lucide, Tabler and Phosphor, frameworks, performance and accessibility.",
      },
      { property: "og:title", content: "IconVault Blog - SVG icon guides and comparisons" },
      {
        property: "og:description",
        content: "Guides, tips and best practices for SVG icons, icon libraries and the frameworks you ship them in.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://iconvault.site/blog" },
      { property: "og:image", content: "https://iconvault.site/og-image.jpg?v=3" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/blog" }],
  }),
  // Meta-only payload (PERF-H1): the blog-meta module carries no article
  // text, so even a client-side navigation to /blog never downloads it.
  loader: async () => {
    const { BLOG_META, BLOG_CATEGORIES } = await import("@/lib/blog-meta");
    return { posts: BLOG_META, categories: BLOG_CATEGORIES };
  },
});
