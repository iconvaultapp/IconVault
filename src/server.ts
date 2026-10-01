import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} - try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

/**
 * Hardening applied to every response leaving the Worker:
 * - Security headers (XSS clickjacking / MIME-sniffing / referrer / permissions).
 * - Long edge+browser caching for versioned/static data that never changes
 *   within a deployment (icon JSON, hashed assets). HTML and API responses
 *   keep their own cache behavior.
 */
function hardenResponse(response: Response, request: Request): Response {
  const headers = new Headers(response.headers);
  if (!headers.has("x-content-type-options")) headers.set("X-Content-Type-Options", "nosniff");
  if (!headers.has("x-frame-options")) headers.set("X-Frame-Options", "SAMEORIGIN");
  if (!headers.has("referrer-policy")) headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  if (!headers.has("permissions-policy"))
    headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");

  const { pathname } = new URL(request.url);
  const isStaticData =
    pathname.startsWith("/iconify/") ||
    pathname === "/search-index.json" ||
    pathname === "/robots.txt" ||
    /\.(js|css|woff2?|ttf|eot|png|jpg|jpeg|gif|webp|svg|ico|avif|json|xml|txt)$/i.test(pathname);
  const isApiOrHtml =
    pathname.startsWith("/api/") || pathname.startsWith("/_serverFn/");
  if (isStaticData && !isApiOrHtml && !headers.has("cache-control")) {
    headers.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=86400");
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      const normalized = await normalizeCatastrophicSsrResponse(response);
      return hardenResponse(normalized, request);
    } catch (error) {
      console.error(error);
      return hardenResponse(
        new Response(renderErrorPage(), {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
        request,
      );
    }
  },
};
