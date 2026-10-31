// Route definition (head/loader only) - v57 opt split.
// The page component lives in the sibling .lazy.tsx file and is
// code-split: it downloads only when this page is opened.

import { createFileRoute } from "@tanstack/react-router";

// FAQ mirrored from the .lazy.tsx file: the head JSON-LD below renders it.
// Keep in sync with the lazy file's FAQ (same questions, same answers).
const FAQ = [
  {
    q: "What is the closest alternative to Lucide?",
    a: "Tabler Icons is the closest in spirit: a consistent 24px outline set with the same calm, neutral drawing. The difference is coverage: Tabler has 6,462 icons against Lucide's 2,144, so it answers niche requests Lucide misses.",
  },
  {
    q: "Why would someone switch away from Lucide?",
    a: "Usually for coverage, style or weights. Lucide is deliberately neutral and outline-only. Teams switch when they need filled or duotone styles (Phosphor), a bolder dashboard look (Solar), Material's system style, or simply more icons than 2,144.",
  },
  {
    q: "Are Lucide alternatives free for commercial use?",
    a: "The main ones are. Tabler, Phosphor, Heroicons and Bootstrap Icons are MIT, and Material Symbols is Apache-2.0, all free for commercial use without attribution. Solar is CC BY 4.0 and requires a visible credit.",
  },
  {
    q: "Can I compare Lucide alternatives side by side?",
    a: "Yes. Search the same keyword in the IconVault app and filter by set: Lucide, Tabler, Phosphor and Heroicons appear next to each other, so you can judge the same idea in four styles before committing.",
  },
  {
    q: "Do I have to replace Lucide everywhere at once?",
    a: "No. Keep Lucide for your core UI and let an alternative fill the gaps, such as brand glyphs or a specific screen. A full replacement is only worth it when the new set covers your whole core list, which you can test by searching your thirty most used icons in it first.",
  },
];

export const Route = createFileRoute("/best-lucide-alternatives")({
  head: () => ({
    meta: [
      { title: "Best Lucide Alternatives - Tabler, Phosphor, Heroicons Compared | IconVault" },
      {
        name: "description",
        content:
          "The best Lucide alternatives compared on coverage, style, weights and licence: Tabler, Phosphor, Heroicons, Bootstrap Icons, Material Symbols and Solar, with live counts.",
      },
      { name: "keywords", content: "Lucide alternatives, Tabler vs Lucide, Phosphor vs Lucide, free icon libraries" },
      { property: "og:title", content: "Best Lucide Alternatives | IconVault" },
      {
        property: "og:description",
        content: "Tabler, Phosphor, Heroicons and more compared against Lucide on coverage, style and licence.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://iconvault.site/best-lucide-alternatives" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/best-lucide-alternatives" }],
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
            { "@type": "ListItem", position: 2, name: "Best Lucide Alternatives", item: "https://iconvault.site/best-lucide-alternatives" },
          ],
        }),
      },
    ],
  }),
});
