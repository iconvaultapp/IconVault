import { createFileRoute } from "@tanstack/react-router";
import {
  ICONIFY_DATA_PKG_VERSIONS,
} from "../lib/iconify-data-meta";
import {
  iconDataToSvg,
  perIconDataUrls,
  parseIconJsData,
} from "../lib/icon-svg";
import { getCustomIconBody } from "../lib/custom-icons.server";

// Single-icon edge route: /api/icon/<prefix>/<name>.svg
//
// Every icon body loads from one tiny per-icon data file served by the
// pinned @iconify-icons/* packages on the jsDelivr/unpkg CDN - no giant
// downloads, ever (even the 99MB emoji sets resolve icon-by-icon).
// Responses are cached immutably at the edge and in the browser, so a
// popular icon hits the CDN exactly once per edge region.

const LEGACY_API = "https://api.iconify.design";
import { isRateLimited, rateLimitedResponse, API_LIMITS } from "../lib/rate-limit";

const isSafeSegment = (s: string) => /^[a-z0-9][a-z0-9._-]*$/i.test(s);

const edgeCache =
  typeof caches !== "undefined"
    ? (caches as unknown as { default?: Cache }).default
    : undefined;

const fetchText = async (url: string): Promise<string | null> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "text/javascript" },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

const iconDataFromCdn = async (prefix: string, name: string) => {
  for (const url of perIconDataUrls(prefix, name, ICONIFY_DATA_PKG_VERSIONS)) {
    const text = await fetchText(url);
    if (text === null) continue;
    try {
      return parseIconJsData(text, prefix, name);
    } catch {
      // Corrupt payload - try the next mirror.
    }
  }
  return null;
};

const svgResponse = (svg: string) =>
  new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Access-Control-Allow-Origin": "*",
    },
  });

// Build iconDataToSvg opts without explicit `undefined` values (the project
// uses exactOptionalPropertyTypes, so they must be omitted, not undefined).
const svgOpts = (color: string | undefined, width: number | undefined, height: number | undefined) => ({
  ...(color ? { color } : {}),
  ...(width !== undefined ? { width } : {}),
  ...(height !== undefined ? { height } : {}),
});

export const Route = createFileRoute("/api/icon/$prefix/$name")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        // API keys are verified server-side only; the helper is imported
        // dynamically so the service-role client never ships to browsers.
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
        // No key presented: today's keyless behavior (IP rate limits) is unchanged.
        // A valid key is governed by its monthly quota instead of the IP limit.
        if (keyVerdict?.ok !== true && isRateLimited(request, "api:icon", API_LIMITS.icon)) {
          return rateLimitedResponse();
        }
        const { prefix, name: rawName } = params;
        const name = rawName.endsWith(".svg") ? rawName.slice(0, -4) : rawName;
        if (!isSafeSegment(prefix) || !isSafeSegment(name)) {
          return new Response("Invalid icon id", { status: 400 });
        }

        const url = new URL(request.url);
        const color = url.searchParams.get("color") ?? undefined;
        const toSize = (v: string | null): number | undefined => {
          if (v === null || v === "") return undefined;
          const n = Number(v);
          return Number.isFinite(n) && n > 0 ? n : undefined;
        };
        const width = toSize(url.searchParams.get("width"));
        const height = toSize(url.searchParams.get("height"));
        const cacheKey = request.url;

        const cached = edgeCache ? await edgeCache.match(cacheKey) : undefined;
        if (cached) return cached;

        const build = async (): Promise<Response> => {
          // 0. First-party sets (e.g. "ivo") resolve from the bundled bodies -
          //    no CDN package exists for them.
          const customBody = getCustomIconBody(prefix, name);
          if (customBody) {
            return svgResponse(
              iconDataToSvg({ body: customBody, width: 24, height: 24 }, svgOpts(color, width, height)),
            );
          }

          // 1. Per-icon data file from the pinned @iconify-icons CDN packages.
          const parsed = await iconDataFromCdn(prefix, name);
          if (parsed) {
            return svgResponse(iconDataToSvg(parsed, svgOpts(color, width, height)));
          }

          // 2. Legacy api.iconify.design as an absolute last resort.
          const legacy = await fetchText(
            `${LEGACY_API}/${encodeURIComponent(prefix)}/${encodeURIComponent(name)}.svg${
              color ? `?color=${encodeURIComponent(color)}` : ""
            }`,
          );
          if (legacy && legacy.includes("<svg")) {
            return svgResponse(legacy);
          }

          return new Response("Icon not found", {
            status: 502,
            headers: { "Access-Control-Allow-Origin": "*" },
          });
        };

        const response = await build();
        if (response.ok && edgeCache) {
          void edgeCache.put(cacheKey, response.clone()).catch(() => undefined);
        }
        return response;
      },
    },
  },
});
