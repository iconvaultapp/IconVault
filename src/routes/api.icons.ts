// Batch icon-data endpoint: POST { icons: ["mdi:home", ...] } ->
// { icons: { "mdi:home": { body, width, height, ... } } }
//
// Capped at 50 icons per request: each icon costs a Worker subrequest, and
// the batch path deliberately skips the CDN mirror fan-out (each icon is
// fetched exactly once) so one request can never burn the subrequest budget.
// Icons that fail to resolve are simply absent from the response (partial
// result); split larger sets across multiple requests.
//
// Every icon resolves from a single tiny per-icon data file served by the
// pinned @iconify-icons/* packages on the CDN - no giant downloads, no
// rate-limited public API. Used by external embeds and legacy clients; the
// app itself renders through src/lib/iconify.ts.

import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { ICONIFY_DATA_PKG_VERSIONS } from "../lib/iconify-data-meta";
import { perIconDataUrls, parseIconJsData } from "../lib/icon-svg";
import { getCustomIconBody } from "../lib/custom-icons.server";
import { isRateLimited, rateLimitedResponse, API_LIMITS } from "../lib/rate-limit";

const isSafeSegment = (s: string) =>
  s.length > 0 && s.length <= 220 && /^[a-z0-9][a-z0-9._-]*$/i.test(s);

type EdgeCacheNS = { caches?: { default?: Cache } };
const edgeCache = (): Cache | undefined =>
  (globalThis as EdgeCacheNS).caches?.default;

const fetchText = async (url: string, timeoutMs = 12000): Promise<string | null> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

/** Resolve one icon via its per-icon data file on the pinned CDN packages.
 *  Fetches exactly ONE URL per icon (no mirror fan-out inside the batch
 *  path): misses are returned as null and simply omitted from the batch. */
const resolvePerIcon = async (
  prefix: string,
  name: string,
): Promise<Record<string, unknown> | null> => {
  // First-party sets (e.g. "ivo") resolve from the bundled bodies.
  const customBody = getCustomIconBody(prefix, name);
  if (customBody) {
    return { body: customBody, width: 24, height: 24, left: 0, top: 0 };
  }
  const urls = perIconDataUrls(prefix, name, ICONIFY_DATA_PKG_VERSIONS);
  const first = urls[0];
  if (!first) return null;
  const js = await fetchText(first);
  if (!js) return null;
  try {
    const parsed = parseIconJsData(js, prefix, name);
    return {
      body: parsed.body,
      width: parsed.width ?? 24,
      height: parsed.height ?? 24,
      left: parsed.left ?? 0,
      top: parsed.top ?? 0,
    };
  } catch {
    return null;
  }
};

export const Route = createFileRoute("/api/icons")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { verifyApiKeyRequest } = await import("../lib/api-keys.server");
        const keyVerdict = await verifyApiKeyRequest(request);
        if (keyVerdict && !keyVerdict.ok) {
          return Response.json(
            { error: keyVerdict.message ?? "API key rejected." },
            {
              status: keyVerdict.status ?? 401,
              headers: { "Access-Control-Allow-Origin": "*" },
            },
          );
        }
        if (keyVerdict?.ok !== true && isRateLimited(request, "api:batch", API_LIMITS.batch)) {
          return rateLimitedResponse();
        }
        let body: { icons?: string[] };
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }
        const requested = Array.isArray(body.icons) ? body.icons : [];
        if (requested.length > 50) {
          return Response.json(
            { error: "Too many icons: 50 per request maximum. Split larger sets across multiple requests." },
            {
              status: 400,
              headers: { "Access-Control-Allow-Origin": "*" },
            },
          );
        }
        const ids = requested;
        const byPrefix = new Map<string, string[]>();
        for (const id of ids) {
          if (typeof id !== "string") continue;
          const i = id.indexOf(":");
          if (i <= 0) continue;
          const prefix = id.slice(0, i);
          const name = id.slice(i + 1);
          if (!isSafeSegment(prefix) || !isSafeSegment(name)) continue;
          if (!byPrefix.has(prefix)) byPrefix.set(prefix, []);
          byPrefix.get(prefix)!.push(name);
        }

        const out: Record<string, unknown> = {};
        await Promise.all(
          [...byPrefix.entries()].map(async ([prefix, names]) => {
            await Promise.all(
              names.map(async (name) => {
                const icon = await resolvePerIcon(prefix, name);
                if (icon) out[`${prefix}:${name}`] = icon;
              }),
            );
          }),
        );

        const cache = edgeCache();
        const cacheKey = new Request(
          `https://iconvault-edge.internal/api/icons?ids=${encodeURIComponent(ids.join(","))}`,
          { method: "GET" },
        );
        const response = Response.json(
          { icons: out },
          {
            headers: {
              "Cache-Control": "public, max-age=86400, s-maxage=86400",
              "Access-Control-Allow-Origin": "*",
            },
          },
        );
        if (cache) void cache.put(cacheKey, response.clone());
        return response;
      },
    },
  },
});
