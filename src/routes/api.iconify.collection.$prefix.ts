import { createFileRoute } from "@tanstack/react-router";

const ICONIFY_APIS = [
  "https://api.iconify.design",
  "https://api.simplesvg.com",
  "https://api.unisvg.com",
] as const;

const isSafePrefix = (value: string) => /^[a-z0-9][a-z0-9._-]*$/i.test(value);
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
type CacheNamespace = { caches?: { default?: Cache } };

const fetchCollection = async (prefix: string) => {
  let lastError: unknown;
  for (const base of ICONIFY_APIS) {
    try {
      const upstream = new URL(`${base}/collection`);
      upstream.searchParams.set("prefix", prefix);
      const res = await fetch(upstream.toString(), { headers: { Accept: "application/json" } });
      if (res.ok) return res;
      lastError = new Error(`Iconify collection failed: ${res.status}`);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Iconify collection unavailable");
};

const responseHeaders = () => ({
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "public, max-age=600, s-maxage=86400, stale-while-revalidate=604800",
  "Access-Control-Allow-Origin": "*",
});

export const Route = createFileRoute("/api/iconify/collection/$prefix")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const prefix = params.prefix;
        if (!prefix || !isSafePrefix(prefix)) {
          return new Response(JSON.stringify({ icons: [] }), { status: 400, headers: responseHeaders() });
        }

        const url = new URL(request.url);
        const limit = clamp(Number(url.searchParams.get("limit") ?? "120"), 1, 5000);
        const key = new Request(url.toString(), { method: "GET" });
        const edgeCache = (globalThis as CacheNamespace).caches?.default;
        if (edgeCache) {
          const hit = await edgeCache.match(key);
          if (hit) return hit;
        }

        try {
          const upstream = await fetchCollection(prefix);
          const data = (await upstream.json()) as {
            uncategorized?: string[];
            categories?: Record<string, string[]>;
          };
          const names: string[] = [];
          const seen = new Set<string>();
          const push = (items: unknown) => {
            if (!Array.isArray(items)) return;
            for (const item of items) {
              if (typeof item !== "string" || seen.has(item)) continue;
              seen.add(item);
              names.push(item);
              if (names.length >= limit) return;
            }
          };
          push(data.uncategorized);
          if (names.length < limit && data.categories) {
            for (const group of Object.values(data.categories)) {
              push(group);
              if (names.length >= limit) break;
            }
          }

          const body = JSON.stringify({ prefix, icons: names.map((name) => `${prefix}:${name}`), total: names.length });
          const response = new Response(body, { status: 200, headers: responseHeaders() });
          if (edgeCache) void edgeCache.put(key, response.clone());
          return response;
        } catch {
          return new Response(JSON.stringify({ prefix, icons: [], total: 0 }), { status: 502, headers: responseHeaders() });
        }
      },
    },
  },
});
