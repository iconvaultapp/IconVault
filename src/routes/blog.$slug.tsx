// /blog/$slug - route definition (head/loader only).
// The page component lives in the sibling .lazy.tsx file and is
// code-split: it downloads only when this page is opened
// (speed pass batch 2, 2026-10-23).

import { createFileRoute, notFound } from "@tanstack/react-router";
import { BLOG_AUTHOR, formatBlogDate, getBlogPost, relatedBlogPosts } from "@/lib/blog";

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    const post = getBlogPost(params.slug);
    if (!post) throw notFound();
    return { post };
  },
  head: ({ loaderData, params }) => {
    const post = loaderData?.post ?? getBlogPost(params.slug);
    if (!post) return { meta: [{ title: "Blog | IconVault" }] };
    const url = `https://iconvault.site/blog/${post.slug}`;
    return {
      meta: [
        { title: `${post.title} | IconVault Blog` },
        { name: "description", content: post.description },
        { name: "keywords", content: [post.keyword, ...post.tags].join(", ") },
        { property: "og:title", content: post.title },
        { property: "og:description", content: post.description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:image", content: "https://iconvault.site/og-image.png?v=2" },
        { property: "article:published_time", content: post.date },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: post.title,
            description: post.description,
            datePublished: post.date,
            dateModified: post.updated ?? post.date,
            author: { "@type": "Organization", name: BLOG_AUTHOR, url: "https://iconvault.site" },
            publisher: { "@type": "Organization", name: "IconVault", url: "https://iconvault.site" },
            mainEntityOfPage: url,
            keywords: [post.keyword, ...post.tags].join(", "),
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://iconvault.site/" },
              { "@type": "ListItem", position: 2, name: "Blog", item: "https://iconvault.site/blog" },
              { "@type": "ListItem", position: 3, name: post.title, item: url },
            ],
          }),
        },
      ],
    };
  },
});
