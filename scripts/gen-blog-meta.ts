// Regenerates src/lib/blog-meta.ts (meta-only post list, no content) from
// src/lib/blog-posts-*.ts. Re-run after editing any post: `bun scripts/gen-blog-meta.ts`
import { BLOG_POSTS, BLOG_CATEGORIES } from "../src/lib/blog.ts";
const meta = BLOG_POSTS.map(({ content: _c, ...m }) => m);
const out = `// GENERATED from src/lib/blog-posts-*.ts (v26) - do not edit by hand.
// Meta-only copy of every post (no content): the homepage teaser and the
// blog index import THIS file so the articles' full text never enters
// their chunks (PERF-H1). Re-run scripts/gen-blog-meta.ts after editing posts.
import type { BlogPost } from "./blog";

export type BlogMeta = Omit<BlogPost, "content">;

export const BLOG_META: BlogMeta[] = ${JSON.stringify(meta, null, 2)};

export const BLOG_CATEGORIES: string[] = ${JSON.stringify(BLOG_CATEGORIES)};

export function formatBlogDate(iso: string): string {
  const d = new Date(\`\${iso}T00:00:00Z\`);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
`;
await Bun.write("src/lib/blog-meta.ts", out);
console.log("posts:", meta.length, "bytes:", out.length);
