// /blog/$slug - route definition (head/loader only).
// The page component lives in the sibling .lazy.tsx file and is
// code-split: it downloads only when this page is opened
// (speed pass batch 2, 2026-10-23).

import { createFileRoute, notFound } from "@tanstack/react-router";
import type { BlogPost } from "@/lib/blog";

/** Pulls Q&A pairs out of a post's "Frequently asked questions" section
    (h3 = question, following paragraph = answer) for FAQPage schema. */
function extractFaq(post: BlogPost): { q: string; a: string }[] {
  const blocks = post.content;
  const start = blocks.findIndex(
    (b) => b.type === "h2" && /frequently asked questions/i.test(b.text),
  );
  if (start === -1) return [];
  const out: { q: string; a: string }[] = [];
  let q: string | null = null;
  for (let i = start + 1; i < blocks.length; i++) {
    const b = blocks[i];
    if (!b) continue;
    if (b.type === "h2") break;
    if (b.type === "h3") {
      q = b.text;
    } else if (b.type === "p" && q) {
      out.push({
        q,
        a: b.text.replace(/\*\*/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1"),
      });
      q = null;
    }
  }
  return out;
}

export const Route = createFileRoute("/blog/$slug")({
  // Dynamic import on purpose: the full blog data (12 long articles) must
  // NOT sit in the entry chunk that every page downloads. It loads as its
  // own chunk only when a blog post is opened (speed fix, 2026-10-23).
  loader: async ({ params }) => {
    const { getBlogPost } = await import("@/lib/blog");
    const post = getBlogPost(params.slug);
    if (!post) throw notFound();
    return { post };
  },
  head: ({ loaderData }) => {
    const post = loaderData?.post;
    if (!post) return { meta: [{ title: "Blog | IconVault" }] };
    const url = `https://iconvault.site/blog/${post.slug}`;
    const faq = extractFaq(post);
    return {
      meta: [
        { title: `${post.title} | IconVault Blog` },
        { name: "description", content: post.description },
        { name: "keywords", content: [post.keyword, ...post.tags].join(", ") },
        { property: "og:title", content: post.title },
        { property: "og:description", content: post.description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:image", content: "https://iconvault.site/og-image.jpg?v=3" },
        { property: "article:published_time", content: post.date },
        { property: "article:modified_time", content: post.updated ?? post.date },
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
            author: { "@type": "Organization", name: "IconVault Team", url: "https://iconvault.site" },
            publisher: { "@type": "Organization", name: "IconVault", url: "https://iconvault.site" },
            mainEntityOfPage: url,
            keywords: [post.keyword, ...post.tags].join(", "),
          }),
        },
        ...(faq.length >= 2
          ? [
              {
                type: "application/ld+json",
                children: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "FAQPage",
                  mainEntity: faq.map((f) => ({
                    "@type": "Question",
                    name: f.q,
                    acceptedAnswer: { "@type": "Answer", text: f.a },
                  })),
                }),
              },
            ]
          : []),
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
