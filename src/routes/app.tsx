// "/app" is the icon browse workspace. The marketing homepage lives at "/"
// (restored 2026-10-22); its hero search lands here with ?q= / ?set=.
import { createFileRoute } from "@tanstack/react-router";
import BrowsePage from "@/components/BrowsePage";
import RouteError from "@/components/RouteError";

export const Route = createFileRoute("/app")({
  validateSearch: (search: Record<string, unknown>): { q?: string; set?: string } => {
    // ROB-M4: cap the query at 120 chars. An uncapped ?q= (multi-thousand
    // chars) froze the tab in scoring; the search API already caps at 120.
    const q =
      typeof search["q"] === "string" ? (search["q"] as string).slice(0, 120) : undefined;
    const set =
      typeof search["set"] === "string" ? (search["set"] as string).slice(0, 120) : undefined;
    return { ...(q ? { q } : {}), ...(set ? { set } : {}) };
  },
  head: () => ({
    meta: [
      { title: "Browse icons - 421,020 free SVG icons | IconVault" },
      {
        name: "description",
        content:
          "Search and browse 421,020 free open-source SVG icons from 239 libraries. Preview at real size, recolour, and export SVG, PNG or framework snippets.",
      },
      { property: "og:title", content: "Browse 421,020 free SVG icons | IconVault" },
      {
        property: "og:description",
        content: "Every open-source icon set in one search: preview, recolour and export in seconds.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://iconvault.site/app" },
      { property: "og:image", content: "https://iconvault.site/og-image.jpg?v=3" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/app" }],
  }),
  component: AppPage,
  errorComponent: RouteError,
});

function AppPage() {
  const search = Route.useSearch();
  return <BrowsePage search={search} basePath="/app" />;
}
