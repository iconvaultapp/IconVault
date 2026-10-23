// /pro - route definition (head/loader only).
// The page component lives in the sibling .lazy.tsx file and is
// code-split: it downloads only when this page is opened
// (speed pass batch 2, 2026-10-23).

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/pro")({
  head: () => ({
    meta: [
      { title: "Pricing - IconVault Free & Lifetime plans" },
      {
        name: "description",
        content:
          "Free forever for solo work. Pro from $19/year for unlimited tools, exports and API access - yearly or lifetime.",
      },
      { property: "og:title", content: "Pricing - IconVault Free & Lifetime plans" },
      {
        property: "og:description",
        content: "Free forever, or Pro from $19/year for unlimited everything.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/pro" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/pro" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          name: "IconVault Pro",
          description:
            "Unlocks unlimited tool runs, unlimited exports, bulk downloads, design tokens and API access on IconVault.",
          brand: { "@type": "Brand", name: "IconVault" },
          offers: [
            {
              "@type": "Offer",
              name: "Free",
              price: "0",
              priceCurrency: "USD",
              description: "Free forever for solo work.",
            },
            {
              "@type": "Offer",
              name: "Pro Yearly",
              price: "19",
              priceCurrency: "USD",
              description: "Per year, cancel anytime.",
            },
            {
              "@type": "Offer",
              name: "Lifetime",
              price: "39",
              priceCurrency: "USD",
              description: "One-time payment, yours forever.",
            },
          ],
        }),
      },
    ],
  }),
});
