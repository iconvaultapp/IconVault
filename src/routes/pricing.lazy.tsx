// /pricing is not a page of its own: pricing lives at /pro. This route only
// redirects, so shared/bookmarked /pricing links (and anyone typing the
// obvious URL) land on the real pricing page instead of a 404.

import { createLazyFileRoute } from "@tanstack/react-router";

export const Route = createLazyFileRoute("/pricing")({
  component: () => null,
});
