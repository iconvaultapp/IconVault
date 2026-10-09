import { createFileRoute } from "@tanstack/react-router";
import { AppBrowser } from "@/components/AppBrowser";

export const Route = createFileRoute("/app")({
  validateSearch: (search: Record<string, unknown>): { q?: string; set?: string } => {
    const q = typeof search['q'] === "string" ? (search['q'] as string) : undefined;
    const set = typeof search['set'] === "string" ? (search['set'] as string) : undefined;
    return { ...(q ? { q } : {}), ...(set ? { set } : {}) };
  },
  head: () => ({
    meta: [
      { title: "Browse 421,020 icons - IconVault" },
      {
        name: "description",
        content:
          "Search every open-source icon set from one place. Filter by family, preview at real size and export SVG, PNG or framework snippets.",
      },
      { property: "og:title", content: "Browse 421,020 icons - IconVault" },
      { property: "og:description", content: "Search, filter and export open-source icons instantly." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://iconvault.site/app" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/app" }],
  }),
  component: AppRoute,
});

function AppRoute() {
  const search = Route.useSearch();
  return <AppBrowser initialQ={search.q} initialSet={search.set} />;
}
