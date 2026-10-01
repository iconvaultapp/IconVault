// Safety net for TanStack file-based routing.
//
// If both `src/routes/<a>.<b>.tsx` and `src/routes/<a>_<b>.tsx` exist, they
// resolve to the SAME route path (e.g. "/tools/logo-builder") and Vite fails
// the whole build with "Conflicting configuration paths". This happens when a
// stale file is left behind (overlay-extracting a zip instead of replacing,
// or a reverted rename). Such a pair can never build, so the dot-version is
// always the stale one: the project standard is the `<a>_<b>.tsx` form.
// This script deletes those stale files before Vite runs, so one leftover
// file can never take the entire site down again.

import { readdirSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const routesDir = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "routes");

if (!existsSync(routesDir)) {
  console.log("[dedupe-routes] no src/routes directory, skipping.");
  process.exit(0);
}

const files = new Set(readdirSync(routesDir));
let removed = 0;

for (const f of [...files]) {
  // Match "<a>.<b>.tsx" (but not "<a>_.<b>.tsx", and not plain "<a>.tsx").
  const m = /^([^_.][^_]*)\.([^.]+)\.tsx$/.exec(f);
  if (!m) continue;
  const [, a, b] = m;
  const twin = `${a}_.${b}.tsx`;
  if (files.has(twin)) {
    rmSync(join(routesDir, f));
    files.delete(f);
    removed++;
    console.log(`[dedupe-routes] removed stale duplicate route "${f}" (kept "${twin}")`);
  }
}

console.log(`[dedupe-routes] done, removed ${removed} stale file(s).`);
