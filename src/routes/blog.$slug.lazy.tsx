import { createLazyFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, CalendarDays, Clock } from "lucide-react";
import PageShell from "@/components/PageShell";
import BlogBody from "@/components/BlogBody";
import ReliableIcon from "@/components/ReliableIcon";
import { BlogCard } from "@/components/home/BlogTeaser";
import { BLOG_AUTHOR, formatBlogDate, getBlogPost, relatedBlogPosts } from "@/lib/blog";

export const Route = createLazyFileRoute("/blog/$slug")({
  component: BlogPostPage,
});

function BlogPostPage() {
  const { post } = Route.useLoaderData();
  const related = relatedBlogPosts(post, 3);

  return (
    <PageShell>
      <article className="mx-auto w-full max-w-3xl px-4 pb-16 pt-10 sm:px-6">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link to="/" className="transition-colors hover:text-primary">
                Home
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link to="/blog" className="transition-colors hover:text-primary">
                Blog
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li className="max-w-full truncate font-medium text-foreground" aria-current="page">
              {post.title}
            </li>
          </ol>
        </nav>

        <p className="mt-8 text-[11px] font-bold uppercase tracking-[0.12em] text-primary">{post.category}</p>
        <h1 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight text-balance sm:text-[2.6rem] sm:leading-[1.15]">
          {post.title}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{post.description}</p>

        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-border py-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <span
              className="grid h-7 w-7 place-items-center rounded-full"
              style={{ backgroundColor: `${post.tint}14`, color: post.tint }}
              aria-hidden
            >
              <ReliableIcon prefix="lucide" name={post.icon} alt="" width={15} height={15} />
            </span>
            <span className="font-medium text-foreground">{BLOG_AUTHOR}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" /> {formatBlogDate(post.date)}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" /> {post.readingMinutes} min read
          </span>
        </div>

        <div className="mt-8">
          <BlogBody blocks={post.content} />
        </div>

        <div className="mt-10 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-border bg-surface-2 p-6">
          <div>
            <p className="font-display text-lg font-semibold">Find the icons from this guide</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Search 421,020 free SVG icons from 239 libraries in one place.
            </p>
          </div>
          <Link
            to="/app"
            className="focus-ring group inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-medium text-background transition-transform hover:scale-[1.03]"
          >
            Browse icons
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </article>

      {related.length > 0 && (
        <section className="border-t border-border bg-surface-2/50">
          <div className="mx-auto max-w-6xl px-5 py-14 lg:px-8">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Related posts</h2>
              <Link
                to="/blog"
                className="focus-ring group inline-flex items-center gap-1.5 text-sm font-medium text-primary"
              >
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                All posts
              </Link>
            </div>
            <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p, i) => (
                <BlogCard key={p.slug} post={p} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}
    </PageShell>
  );
}
