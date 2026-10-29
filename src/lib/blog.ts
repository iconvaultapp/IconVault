// IconVault blog: original guides and comparisons about SVG icons.
// Posts are structured blocks (no raw HTML) so pages render fast, stay
// SSR-friendly and can never inject markup. Inline **bold** and
// [label](/path) links are supported inside paragraph/list text.
import { POSTS_A } from "./blog-posts-a";
import { POSTS_B } from "./blog-posts-b";
import { POSTS_C } from "./blog-posts-c";
import { POSTS_D } from "./blog-posts-d";

export type BlogBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "code"; text: string };

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  /** Primary search keyword the article is written around. */
  keyword: string;
  date: string; // ISO yyyy-mm-dd
  updated?: string;
  readingMinutes: number;
  /** Lucide icon name + tint used for the card thumbnail. */
  icon: string;
  tint: string;
  content: BlogBlock[];
}

export const BLOG_AUTHOR = "Dev Coder";

export const BLOG_POSTS: BlogPost[] = [...POSTS_A, ...POSTS_B, ...POSTS_C, ...POSTS_D].sort((a, b) =>
  b.date.localeCompare(a.date),
);

export const BLOG_CATEGORIES: string[] = Array.from(new Set(BLOG_POSTS.map((p) => p.category)));

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

export function relatedBlogPosts(post: BlogPost, count = 3): BlogPost[] {
  const sameCategory = BLOG_POSTS.filter((p) => p.slug !== post.slug && p.category === post.category);
  const rest = BLOG_POSTS.filter((p) => p.slug !== post.slug && p.category !== post.category);
  return [...sameCategory, ...rest].slice(0, count);
}

export function formatBlogDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
