// /templates - route definition (head only). UI lives in templates.lazy.tsx
// (lean-route pattern: this file must stay import-free apart from the router
// so the gallery data file is not pulled into the entry chunk).

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/templates")({
  head: () => ({
    meta: [
      { title: "34 Free Website Templates - Agency, Portfolio, Dashboards & More | IconVault" },
      {
        name: "description",
        content:
          "34 free MIT-licensed website templates: StartBootstrap agency, creative and freelancer themes, a curated AdminLTE dashboard, 29 single-file JAKS.dev templates, and the PaperMod Hugo theme. Preview free; downloads need a free account.",
      },
      { property: "og:title", content: "Free Website Templates | IconVault" },
      {
        property: "og:description",
        content:
          "34 free MIT-licensed website templates: agency, portfolio, SaaS, ecommerce, dashboard and more. Preview and download.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://iconvault.site/templates" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/templates" }],
  }),
});
