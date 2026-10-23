// /tools/docker-run-to-compose - route definition (SEO head only).
// The tool UI lives in the sibling .lazy.tsx file and is code-split:
// it downloads only when this tool is opened (speed pass, 2026-10-23).
import { createFileRoute } from "@tanstack/react-router";
import toolSeoMeta from "@/lib/tool-seo-meta-data/docker-run-to-compose";

export const Route = createFileRoute("/tools_/docker-run-to-compose")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/docker-run-to-compose";
    return {
      meta: [
        { title: seo.title },
        { name: "description", content: seo.metaDescription },
        { property: "og:title", content: seo.title },
        { property: "og:description", content: seo.metaDescription },
        { property: "og:type", content: "website" },
        { property: "og:url", content: canonical },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: seo.title },
        { name: "twitter:description", content: seo.metaDescription },
      ],
      links: [{ rel: "canonical", href: canonical }],
    };
  },
});
