import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import PageShell from "@/components/PageShell";
import { BlogCard } from "@/components/home/BlogTeaser";
import type { BlogPost } from "@/lib/blog";
import { cn } from "@/lib/utils";

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
      { property: "og:image", content: "https://iconvault.site/og-image.png?v=2" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/blog" }],
  }),
  // Dynamic import + meta-only payload: the articles' full text stays out
  // of the entry chunk and out of this page's serialized loader data.
  loader: async () => {
    const { BLOG_POSTS, BLOG_CATEGORIES } = await import("@/lib/blog");
    const posts = BLOG_POSTS.map(({ content: _content, ...meta }) => meta);
    return { posts, categories: BLOG_CATEGORIES };
  },
  component: BlogIndex,
});

function BlogIndex() {
  const { posts: allPosts, categories } = Route.useLoaderData();
  const [category, setCategory] = useState<string>("All");
  const posts = category === "All" ? allPosts : allPosts.filter((p) => p.category === category);

  return (
    <PageShell
      eyebrow={`${allPosts.length} articles`}
      title="The IconVault blog"
      description="Guides, comparisons and best practices for SVG icons: choosing a library, shipping icons in React, Vue, Astro and Next.js, and keeping them fast and accessible."
      wide
    >
      <div className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10 sm:px-6">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter blog posts by category">
          {["All", ...categories].map((c) => (
            <button
              key={c}
              role="tab"
              aria-selected={category === c}
              onClick={() => setCategory(c)}
              className={cn(
                "focus-ring rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                category === c
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface text-muted-foreground hover:border-primary/40 hover:text-primary",
              )}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, i) => (
            <BlogCard key={post.slug} post={post} index={i} />
          ))}
        </div>

        {posts.length === 0 && (
          <p className="mt-10 text-center text-muted-foreground">No articles in this category yet.</p>
        )}
      </div>
    </PageShell>
  );
}
