// "/app" is kept as a thin redirect to "/" (2026-10-10). The browse page
// now lives at the homepage. Old links and bookmarks keep working.
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/app")({
  validateSearch: (search: Record<string, unknown>): { q?: string; set?: string } => {
    const q = typeof search["q"] === "string" ? (search["q"] as string) : undefined;
    const set = typeof search["set"] === "string" ? (search["set"] as string) : undefined;
    return { ...(q ? { q } : {}), ...(set ? { set } : {}) };
  },
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/", search });
  },
});
