// Route definition (head/loader only) - v57 opt split.
// The page component lives in the sibling .lazy.tsx file and is
// code-split: it downloads only when this page is opened.

import { createFileRoute } from "@tanstack/react-router";

// FAQ mirrored from the .lazy.tsx file: the head JSON-LD below renders it.
// Keep in sync with the lazy file's FAQ (same questions, same answers).
const FAQ = [
  {
    q: "Are free SVG icons really free for commercial use?",
    a: "Most of them are. Sets under MIT, ISC and Apache-2.0 licences can be used in paid products without royalties. Sets under Creative Commons licences such as CC BY 4.0 require visible attribution. Always read the licence in the set's repository and keep a copy with your project records.",
  },
  {
    q: "What is an SVG icon?",
    a: "An SVG icon is a small vector drawing described in code rather than pixels. It scales to any size without blurring, inherits colour from CSS, and usually weighs under a kilobyte. That is why SVG replaced icon fonts as the default for modern websites and apps.",
  },
  {
    q: "How do I download a free SVG icon from IconVault?",
    a: "Search the icon in the IconVault app, open it, and download the SVG in one click. Browsing and copying need no account; downloads need a free account. You can also copy it as a React component, export it as PNG, or add it to a sprite sheet.",
  },
  {
    q: "Can I recolour an SVG icon to my brand colour?",
    a: "Yes. Icons drawn with currentColor or a single stroke colour take their colour from CSS, so one class change recolours the whole set. IconVault's icon page lets you set a colour before downloading, and multi-colour icons keep their artwork intact.",
  },
  {
    q: "SVG icons or icon fonts, which should I use?",
    a: "SVG icons are the better default. They align precisely with text, support multiple tones, inherit CSS colour, and behave better for accessibility. Icon fonts still work in legacy projects, but they offer less styling control and fail less gracefully when a font file does not load.",
  },
];

export const Route = createFileRoute("/free-svg-icons")({
  head: () => ({
    meta: [
      { title: "Free SVG Icons - Download 421,020 Open-Source Icons | IconVault" },
      {
        name: "description",
        content:
          "Download free SVG icons for websites, apps and UI design. 421,020 open-source icons from 239 sets, one-click SVG and PNG downloads, downloads need a free account.",
      },
      { name: "keywords", content: "free SVG icons, SVG icons download, open-source icons, Lucide, Tabler, Phosphor" },
      { property: "og:title", content: "Free SVG Icons | IconVault" },
      {
        property: "og:description",
        content: "421,020 free open-source SVG icons from 239 sets. Search, customize and download in one click.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://iconvault.site/free-svg-icons" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/free-svg-icons" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://iconvault.site/" },
            { "@type": "ListItem", position: 2, name: "Free SVG Icons", item: "https://iconvault.site/free-svg-icons" },
          ],
        }),
      },
    ],
  }),
});
