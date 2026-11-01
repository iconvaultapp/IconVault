// /wallpapers - REMOVED (founder decision, IconVault v61, 2026-11-01):
// the whole section redirects to the homepage, including old detail
// links. Route/component files are deliberately NOT deleted: an
// extract-over deploy would keep deploying them from the founder's repo
// anyway. Revert = remove the beforeLoad redirect below. UI lives in
// wallpapers.lazy.tsx (never renders while the redirect is in place).
// The static files were dropped from this tree (public/wallpapers/);
// on an extract-over deploy they stay in the founder's repo but are
// unreachable (no route, no link, not in the sitemap) — delete that
// folder from the repo to remove the files too.

import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/wallpapers")({
  // v61: wallpapers section removed — every visit lands on home.
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [
      { title: "30 Original Wallpapers - 3D, Gradient, Geometric and Nature | IconVault" },
      {
        name: "description",
        content:
          "30 original wallpapers made in code by IconVault: 10 in 3D look, 8 gradient, 6 geometric and 6 nature. Mobile 1080x1920 and desktop 1920x1080, in WebP and JPG. Preview free; downloads need a free account.",
      },
      { property: "og:title", content: "Original Wallpapers | IconVault" },
      {
        property: "og:description",
        content:
          "30 original code-generated wallpapers in the IconVault theme. Mobile and desktop sizes, WebP and JPG.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://iconvault.site/wallpapers" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/wallpapers" }],
  }),
});
