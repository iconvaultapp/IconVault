import { createFileRoute } from "@tanstack/react-router";
import { isRateLimited, rateLimitedResponse, API_LIMITS } from "../lib/rate-limit";

const ICONIFY_APIS = [
  "https://api.iconify.design",
  "https://api.simplesvg.com",
  "https://api.unisvg.com",
] as const;

const safePrefix = (value: string) => /^[a-z0-9][a-z0-9._-]*$/i.test(value);
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
type CacheNamespace = { caches?: { default?: Cache } };

const responseHeaders = () => ({
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "public, max-age=30, s-maxage=3600, stale-while-revalidate=86400",
  "Access-Control-Allow-Origin": "*",
});

const fetchSearch = async (url: URL) => {
  let lastError: unknown;
  for (const base of ICONIFY_APIS) {
    try {
      const upstream = new URL(`${base}/search`);
      upstream.searchParams.set("query", url.searchParams.get("query") ?? "");
      upstream.searchParams.set("limit", String(clamp(Number(url.searchParams.get("limit") ?? "120"), 1, 999)));
      upstream.searchParams.set("start", String(clamp(Number(url.searchParams.get("start") ?? "0"), 0, 1000000)));
      const prefix = url.searchParams.get("prefix");
      if (prefix && safePrefix(prefix)) upstream.searchParams.set("prefix", prefix);
      const res = await fetch(upstream.toString(), { headers: { Accept: "application/json" } });
      if (res.ok) return res;
      lastError = new Error(`Iconify search failed: ${res.status}`);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Iconify search unavailable");
};

export const Route = createFileRoute("/api/iconify/search")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (isRateLimited(request, "api:search", API_LIMITS.search)) return rateLimitedResponse();
        const url = new URL(request.url);
        const query = (url.searchParams.get("query") ?? "").trim().slice(0, 120);
        if (!query) {
          return new Response(JSON.stringify({ icons: [], total: 0, limit: 0, start: 0, collections: {} }), {
            status: 200,
            headers: responseHeaders(),
          });
        }

        const key = new Request(url.toString(), { method: "GET" });
        const edgeCache = (globalThis as CacheNamespace).caches?.default;
        if (edgeCache) {
          const hit = await edgeCache.match(key);
          if (hit) return hit;
        }

        try {
          const upstream = await fetchSearch(url);
          const body = await upstream.text();
          const response = new Response(body, { status: 200, headers: responseHeaders() });
          if (edgeCache) void edgeCache.put(key, response.clone());
          return response;
        } catch {
          return new Response(JSON.stringify({ icons: [], total: 0, limit: 0, start: 0, collections: {} }), {
            status: 502,
            headers: responseHeaders(),
          });
        }
      },
    },
  },
});
