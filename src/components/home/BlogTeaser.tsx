// Homepage "From the blog" section: latest IconVault guides and comparisons.
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import ReliableIcon from "@/components/ReliableIcon";
import { Reveal } from "@/components/Reveal";
// Meta-only import (PERF-H1): importing from @/lib/blog pulled every
// post's full text into the homepage chunk. BlogMeta has no content field.
import { BLOG_META, formatBlogDate, type BlogMeta } from "@/lib/blog-meta";

export function BlogCard({ post, index = 0 }: { post: BlogMeta; index?: number }) {
  return (
    <Reveal delay={index * 60} className="h-full">
      <Link
        to="/blog/$slug"
        params={{ slug: post.slug }}
        className="surface-card lift-hover focus-ring group flex h-full flex-col overflow-hidden"
      >
        <span
          className="grid h-28 place-items-center"
          style={{ backgroundColor: `${post.tint}14` }}
          aria-hidden
        >
          <span style={{ color: post.tint }}>
            <ReliableIcon prefix="lucide" name={post.icon} alt="" width={38} height={38} />
          </span>
        </span>
        <span className="flex flex-1 flex-col p-5">
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary">{post.category}</span>
          <span className="mt-2 font-display text-[17px] font-semibold leading-snug transition-colors group-hover:text-primary">
            {post.title}
          </span>
          <span className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{post.description}</span>
          <span className="mt-4 text-xs text-muted-foreground">
            {formatBlogDate(post.date)} · {post.readingMinutes} min read
          </span>
        </span>
      </Link>
    </Reveal>
  );
}

export default function BlogTeaser() {
  const posts = BLOG_META.slice(0, 6);
  if (posts.length === 0) return null;
  return (
    <section className="mx-auto max-w-[1440px] px-5 py-16 lg:px-8">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">From the blog</h2>
            <p className="mt-2 text-muted-foreground">Guides, tips, and best practices for SVG icons.</p>
          </div>
          <Link to="/blog" className="focus-ring group inline-flex items-center gap-1.5 text-sm font-medium text-primary">
            All posts
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </Reveal>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post, i) => (
          <BlogCard key={post.slug} post={post} index={i} />
        ))}
      </div>
    </section>
  );
}
