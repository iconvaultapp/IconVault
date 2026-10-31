// Route definition (head/loader only) - v57 opt split.
// The page component lives in the sibling .lazy.tsx file and is
// code-split: it downloads only when this page is opened.

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/billing/success")({
  head: () => ({
    meta: [
      { title: "Payment successful - IconVault" },
      {
        name: "description",
        content:
          "Your IconVault payment was successful. Your plan is being activated and usually takes just a few seconds.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
});
