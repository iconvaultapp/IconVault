// "/" IS the browse page now (2026-10-10). The old marketing homepage was
// removed; the hero section lives on top of the browse UI.
import { createFileRoute } from "@tanstack/react-router";
import BrowsePage from "@/components/BrowsePage";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): { q?: string; set?: string } => {
    const q = typeof search["q"] === "string" ? (search["q"] as string) : undefined;
    const set = typeof search["set"] === "string" ? (search["set"] as string) : undefined;
    return { ...(q ? { q } : {}), ...(set ? { set } : {}) };
  },
  head: () => ({
    meta: [
      { title: "IconVault - 421,020 open-source icons + 579 free online tools" },
      {
        name: "description",
        content:
          "Search every open-source icon set from one place. Filter by family, preview at real size and export SVG, PNG or framework snippets. Plus 579 free online tools.",
      },
      { property: "og:title", content: "IconVault - 421,020 icons and 579 free tools, one search box" },
      {
        property: "og:description",
        content:
          "One search box for every open-source icon set and hundreds of free online tools. Preview, recolour and export in the format your codebase already speaks.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://iconvault.site/" },
      { property: "og:image", content: "https://iconvault.site/og-image.png?v=2" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/" }],
  }),
  component: IndexPage,
});

function IndexPage() {
  const search = Route.useSearch();
  return <BrowsePage search={search} basePath="/" />;
}
