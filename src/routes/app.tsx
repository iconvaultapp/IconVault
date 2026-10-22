// "/app" is the icon browse workspace. The marketing homepage lives at "/"
// (restored 2026-10-22); its hero search lands here with ?q= / ?set=.
import { createFileRoute } from "@tanstack/react-router";
import BrowsePage from "@/components/BrowsePage";

export const Route = createFileRoute("/app")({
  validateSearch: (search: Record<string, unknown>): { q?: string; set?: string } => {
    const q = typeof search["q"] === "string" ? (search["q"] as string) : undefined;
    const set = typeof search["set"] === "string" ? (search["set"] as string) : undefined;
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
      { property: "og:image", content: "https://iconvault.site/og-image.png?v=2" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/app" }],
  }),
  component: AppPage,
});

function AppPage() {
  const search = Route.useSearch();
  return <BrowsePage search={search} basePath="/app" />;
}
