// Sections that render full-width with NO left sidebar (Sameer 2026-11-01,
// IconVault v58). Listing pages AND their detail/sub-pages share the same
// sidebar layout, so matching is by route prefix with a segment boundary:
// "/templates" matches "/templates" and "/templates/<slug>" but never a
// hypothetical "/templates-foo". The global sidebar itself lives in
// src/components/GlobalSidebar.tsx and is rendered only from
// src/routes/__root.tsx, so this list is the single source of truth —
// no route file needs to change, and no route file is imported here
// (or from another route file).

export const NO_SIDEBAR_PREFIXES = [
  "/templates",
  "/animated-icons",
  "/customizer",
  "/showcase",
  "/original",
  "/mockups",
  "/animated-backgrounds",
] as const;

/** True when `pathname` is one of the no-sidebar sections or a sub-page of one. */
export function isNoSidebarRoute(pathname: string): boolean {
  return NO_SIDEBAR_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
