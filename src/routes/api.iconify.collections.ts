import { createFileRoute } from "@tanstack/react-router";
import { isRateLimited, rateLimitedResponse } from "../lib/rate-limit";

const ICONIFY_APIS = [
  "https://api.iconify.design",
  "https://api.simplesvg.com",
  "https://api.unisvg.com",
] as const;

// Refuse to buffer absurdly large upstream payloads into the Worker.
const MAX_UPSTREAM_BYTES = 8 * 1024 * 1024;

type CacheNamespace = { caches?: { default?: Cache } };

const jsonHeaders = () => ({
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
  "Access-Control-Allow-Origin": "*",
});

const cacheKey = (request: Request) => new Request(new URL(request.url).toString(), { method: "GET" });

const fetchUpstream = async (): Promise<Response> => {
  let lastError: unknown;
  for (const base of ICONIFY_APIS) {
    try {
      const res = await fetch(`${base}/collections`, { headers: { Accept: "application/json" } });
      if (res.ok) return res;
      lastError = new Error(`Iconify collections failed: ${res.status}`);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Iconify collections unavailable");
};

export const Route = createFileRoute("/api/iconify/collections")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Abuse protection: this proxies third-party CDNs, so every miss
        // costs us an upstream fetch. Same budget as /api/iconify/search.
        if (isRateLimited(request, "api:iconify-collections", 120)) return rateLimitedResponse();
        const edgeCache = (globalThis as CacheNamespace).caches?.default;
        const key = cacheKey(request);
        if (edgeCache) {
          const hit = await edgeCache.match(key);
          if (hit) return hit;
        }

        try {
          const upstream = await fetchUpstream();
          const declared = Number(upstream.headers.get("content-length") ?? 0);
          if (declared > MAX_UPSTREAM_BYTES) {
            return new Response(JSON.stringify({}), { status: 502, headers: jsonHeaders() });
          }
          const body = await upstream.text();
          if (body.length > MAX_UPSTREAM_BYTES) {
            return new Response(JSON.stringify({}), { status: 502, headers: jsonHeaders() });
          }
          const response = new Response(body, { status: 200, headers: jsonHeaders() });
          if (edgeCache) void edgeCache.put(key, response.clone());
          return response;
        } catch {
          return new Response(JSON.stringify({}), { status: 502, headers: jsonHeaders() });
        }
      },
    },
  },
});
