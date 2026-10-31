// Route definition (head/loader only) - v57 opt split.
// The page component lives in the sibling .lazy.tsx file and is
// code-split: it downloads only when this page is opened.

import { createFileRoute } from "@tanstack/react-router";

// FAQ mirrored from the .lazy.tsx file: the head JSON-LD below renders it.
// Keep in sync with the lazy file's FAQ (same questions, same answers).
const FAQ = [
  {
    q: "What is the easiest way to add icons to a React app?",
    a: "Install one icon package, such as lucide-react, and import only the icons you use: import { Home } from 'lucide-react'. For a single icon, or an icon from a set without a React package, copy it as a component from IconVault and paste it into your project.",
  },
  {
    q: "Should I use lucide-react, react-icons or inline SVG components?",
    a: "Use a package when your whole product shares one set: lucide-react for Lucide, @tabler/icons-react for Tabler, @phosphor-icons/react for Phosphor. Use react-icons when you need many sets behind one API. Use inline SVG components when you need full control over paths, animation or a custom icon no package ships.",
  },
  {
    q: "How do I change an icon's size and colour in React?",
    a: "Library components accept size and colour props, and most default to currentColor, so they inherit the surrounding text colour. In inline SVG components, set width and height attributes and use fill or stroke set to currentColor for the same behaviour.",
  },
  {
    q: "Do React icon packages hurt bundle size?",
    a: "Only if you import carelessly. Import named icons from the package, never the whole library, and your bundler tree-shakes the rest. Importing an entire set for a handful of icons is the one mistake that actually bloats a bundle.",
  },
  {
    q: "Are React icons free for commercial use?",
    a: "The sets behind the main React packages are free under permissive licences: Lucide is ISC, Tabler and Heroicons are MIT, Phosphor is MIT. Creative Commons sets need attribution, so check the licence of any set you ship.",
  },
];

export const Route = createFileRoute("/react-icons")({
  head: () => ({
    meta: [
      { title: "Free React Icons - Lucide, Tabler, Phosphor Components | IconVault" },
      {
        name: "description",
        content:
          "Free React icons from Lucide, Tabler, Phosphor and more. Copy any of 421,020 icons as a React component, convert SVG to JSX, and download with a free account.",
      },
      { name: "keywords", content: "React icons, lucide-react, tabler icons react, SVG to JSX, free icons for React" },
      { property: "og:title", content: "Free React Icons | IconVault" },
      {
        property: "og:description",
        content: "Copy any of 421,020 icons as a React component, or convert SVG to JSX in one click.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://iconvault.site/react-icons" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/react-icons" }],
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
            { "@type": "ListItem", position: 2, name: "React Icons", item: "https://iconvault.site/react-icons" },
          ],
        }),
      },
    ],
  }),
});
