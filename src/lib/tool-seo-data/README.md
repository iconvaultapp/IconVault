# Per-tool SEO data (perf split, 2026-10-06)

`src/lib/tool-seo.ts` used to be one 2.2MB module with the SEO content
(about/faqs/tags) of all 579 tools. Because every tool route imported it,
the bundler put the whole 2.2MB into the shared client entry chunk, so even
the homepage downloaded it. Same for `tool-seo-meta.ts` (142KB, head meta).

Now the data lives here, one tiny file per tool:

- `src/lib/tool-seo-data/<tool-id>.ts` — full `ToolSeo` (title,
  metaDescription, about[], faqs[], tags[]), default-exported.
- `src/lib/tool-seo-meta-data/<tool-id>.ts` — slim `ToolSeoMeta`
  (title + metaDescription) for the route `head()`, default-exported.

Each tool route statically imports only its own two files:

```tsx
import toolSeo from "@/lib/tool-seo-data/qr-generator";
import toolSeoMeta from "@/lib/tool-seo-meta-data/qr-generator";
```

## Adding SEO for a new tool

1. Create `src/lib/tool-seo-data/<new-id>.ts`:
   ```ts
   import type { ToolSeo } from "../tool-seo";

   const seo: ToolSeo = {
     title: "...",
     metaDescription: "...",
     about: ["..."],
     faqs: [{ q: "...", a: "..." }],
     tags: ["..."],
   };

   export default seo;
   ```
2. Create `src/lib/tool-seo-meta-data/<new-id>.ts`:
   ```ts
   import type { ToolSeoMeta } from "../tool-seo-meta";

   const meta: ToolSeoMeta = {
     title: "...",
     metaDescription: "...",
   };

   export default meta;
   ```
3. In the new route file import both as `toolSeo` / `toolSeoMeta`
   (see any existing `src/routes/tools_*.tsx`).

Do NOT reintroduce a shared module that imports all tools' data —
that puts megabytes back into every page's bundle.
