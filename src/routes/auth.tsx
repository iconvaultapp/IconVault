// /auth - route definition (head/loader only).
// The page component lives in the sibling .lazy.tsx file and is
// code-split: it downloads only when this page is opened
// (speed pass batch 2, 2026-10-23).

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { mode?: "signin" | "signup"; redirect?: string } => {
    const mode = search['mode'] === "signup" || search['mode'] === "signin" ? search['mode'] : undefined;
    // v55 download gate: only same-origin paths are accepted as a post-login
    // destination (must start with a single "/").
    const raw = typeof search['redirect'] === "string" ? search['redirect'] : undefined;
    const redirect = raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : undefined;
    return { ...(mode ? { mode } : {}), ...(redirect ? { redirect } : {}) };
  },
  head: () => ({
    meta: [
      { title: "Sign in or create an account | IconVault" },
      {
        name: "description",
        content:
          "Sync favourites, collections and API keys across every device. Free forever, no card, and your data stays yours.",
      },
      { property: "og:title", content: "Sign in or create an account - IconVault" },
      {
        property: "og:description",
        content: "Sync favourites, collections and API keys across every device.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/auth" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/auth" }],
  }),
});
