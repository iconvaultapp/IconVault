// Route definition (head/loader only) - v57 opt split.
// The page component lives in the sibling .lazy.tsx file and is
// code-split: it downloads only when this page is opened.

import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/pricing")({
  beforeLoad: () => {
    throw redirect({ to: "/pro" });
  },
});
