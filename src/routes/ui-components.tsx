// Route definition (head/loader only) - v57 opt split.
// The page component lives in the sibling .lazy.tsx file and is
// code-split: it downloads only when this page is opened.

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/ui-components")({
  head: () => ({
    meta: [
      { title: "3359 Free UI Components - Buttons, Cards, Loaders, Navigation, Sections & More | IconVault" },
      {
        name: "description",
        content:
          "3359 free open-source UI components from Uiverse, HyperUI and Flowbite: buttons, cards, loaders, navigation, sections, toggles, inputs and more. Preview, copy the HTML, JSX or CSS, and paste into any project. MIT licensed.",
      },
      { property: "og:title", content: "Free UI Components | IconVault" },
      {
        property: "og:description",
        content:
          "3359 free MIT-licensed UI components with live previews. Copy the HTML, JSX or CSS and ship faster.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/ui-components" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/ui-components" }],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    open: typeof search["open"] === "string" ? search["open"] : undefined,
  }),
});
