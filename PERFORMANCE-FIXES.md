# Icon loading fix

The icon grid no longer depends on the Cloudflare `/api/icon/...` image route. Visible icons are fetched as compact Iconify JSON in batches and rendered as inline SVG. This avoids broken `<img>` placeholders when a deployed server route returns a transient 404/HTML response.

The loader:

- batches icons by prefix (up to 48 names per request)
- uses the public Iconify API plus its documented backup hosts
- falls back to the same-origin API route if the public API is unavailable
- retries individual missing icons only when a batch omits them
- lazy-loads icons near the viewport with a 480px prefetch margin
- keeps in-memory icon data and browser HTTP caching
- keeps the existing IconVault UI unchanged

Iconify documents demand-loaded icon data, SVG generation, the public API, and backup hosts at https://iconify.design/docs/api/.
