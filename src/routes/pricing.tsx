// /pricing is not a page of its own: pricing lives at /pro. This route only
// redirects, so shared/bookmarked /pricing links (and anyone typing the
// obvious URL) land on the real pricing page instead of a 404.

import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/pricing")({
  beforeLoad: () => {
    throw redirect({ to: "/pro" });
  },
  component: () => null,
});
