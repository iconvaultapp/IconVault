# IconVault Originals - custom icon sets

First-party icon sets designed for IconVault. Each set ships 300 original
icons drawn on a 24×24 grid.

## Set #1 - `ivo` (IconVault Originals)

- 300 icons, 2px rounded line style, `currentColor`, no gradients or text.
- Canonical source: `collections/ivo.json` (Iconify collection format).
- License: ISC - free for personal and commercial use, no attribution required.
  See `LICENSE`.

## How a set reaches the site

1. `collections/<prefix>.json` holds every icon body (the source of truth).
2. `scripts/build-icon-data.mjs` injects it into the bundled dataset at build
   time: `public/iconify/names/<prefix>.json`,
   `public/iconify/icon-bodies/<prefix>.json`, `collections.json`,
   `search-index.json`, and the totals in `src/lib/iconify-data-meta.ts`.
3. `scripts/build-seo-data.mjs` picks up `seo/<prefix>.json` below for the
   pack page copy (About / FAQs / tags) instead of generating templated text.
4. Runtime: `src/lib/iconify.ts` serves `ivo` bodies from the bundled
   `icon-bodies` JSON (there is no `@iconify-icons/ivo` CDN package);
   `src/lib/custom-icons.server.ts` does the same for the edge API routes.

## Design rules for new sets

- 24×24 viewBox, keep strokes inside a 2px safe margin (coords ~3–21).
- One visual weight: 2px rounded strokes, round caps and joins.
- `currentColor` only. No fills except tiny solid dots
  (`fill="currentColor" stroke="none"`).
- Max ~4 elements per icon. No transforms, no text, no gradients.
- Every icon must render recognisably at 24px and stay unique within the set.
