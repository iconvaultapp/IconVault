// IconVault home ("/") — the site opens directly on the icon browser,
// with the hero section on top. The old marketing landing page was removed;
// its key messaging lives in the hero below.
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppBrowser } from "@/components/AppBrowser";
import BrowseHero from "@/components/BrowseHero";

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
          "Search, recolour and export icons from 150+ open-source sets, plus 579 free online tools for devs and designers. Copy React, Vue, HTML or SVG in one click, build collections and ship faster.",
      },
      { property: "og:title", content: "IconVault - 421,020 icons and 579 free tools, one search box" },
      {
        property: "og:description",
        content:
          "One search box for every open-source icon set and hundreds of free online tools. Preview, recolour and export in the format your codebase already speaks.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://iconvault.site/" },
      { property: "og:image", content: "https://iconvault.site/og-image.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "IconVault - 421,020 icons and 579 free tools, one search box" },
      {
        name: "twitter:description",
        content:
          "One search box for every open-source icon set and hundreds of free online tools. Preview, recolour and export in the format your codebase already speaks.",
      },
      { name: "twitter:image", content: "https://iconvault.site/og-image.png" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/" }],
  }),
  component: Home,
});

function Home() {
  const search = Route.useSearch();
  const [query, setQuery] = useState(search.q ?? "");

  const handleHeroSearch = (v: string) => {
    setQuery(v);
    requestAnimationFrame(() => {
      document.getElementById("browse-results")?.scrollIntoView({ behavior: "smooth" });
    });
  };

  return (
    <AppBrowser
      hero={<BrowseHero variant="icons" onSearch={handleHeroSearch} />}
      initialSet={search.set}
      query={query}
      setQuery={setQuery}
    />
  );
}
