// Server-only: icon bodies for first-party collections (e.g. "ivo").
//
// These sets have no @iconify-icons/* CDN package, so the edge routes resolve
// them from the same bundled JSON the client uses
// (public/iconify/icon-bodies/{prefix}.json, generated at build time by
// scripts/build-icon-data.mjs from custom-icons/collections/*.json).
// Imported statically so it works on the edge with no filesystem access.

import ivoBodies from "../../public/iconify/icon-bodies/ivo.json";

const CUSTOM_BODIES: Record<string, Record<string, string>> = {
  ivo: ivoBodies as Record<string, string>,
};

export const isCustomIconPrefix = (prefix: string): boolean =>
  Object.prototype.hasOwnProperty.call(CUSTOM_BODIES, prefix);

/** Raw (already styled) icon body, or null when the prefix/name is unknown. */
export const getCustomIconBody = (prefix: string, name: string): string | null =>
  CUSTOM_BODIES[prefix]?.[name] ?? null;
