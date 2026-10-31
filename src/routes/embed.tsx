// Route definition (head/loader only) - v57 opt split.
// The page component lives in the sibling .lazy.tsx file and is
// code-split: it downloads only when this page is opened.

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/embed")({
  head: () => ({
    meta: [
      { title: "Embeddable icon picker widget | IconVault" },
      {
        name: "description",
        content:
          "Drop a working icon picker into any website with one script tag. Search 421,020 icons and copy SVG on click. No key, no build step.",
      },
      { property: "og:title", content: "Embeddable icon picker widget" },
      {
        property: "og:description",
        content: "A one-script-tag icon picker: search the library, click to copy SVG.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/embed" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/embed" }],
  }),
});
