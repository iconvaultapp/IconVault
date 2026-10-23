// /upload - route definition (head/loader only).
// The page component lives in the sibling .lazy.tsx file and is
// code-split: it downloads only when this page is opened
// (speed pass batch 2, 2026-10-23).

import { createFileRoute } from "@tanstack/react-router";
import { Upload, Trash2, Download, FileWarning, Copy, CheckCheck } from "lucide-react";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Upload custom icons | IconVault" },
      {
        name: "description",
        content:
          "Bring your own SVGs into the same workspace as the open sets. Cleaned, previewed at real sizes and ready to export or share with your team.",
      },
      { property: "og:title", content: "Upload custom icons" },
      {
        property: "og:description",
        content: "Bring your own SVGs into the same workspace as the open icon sets.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/upload" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/upload" }],
  }),
});
