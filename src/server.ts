import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
// NOTE: this MUST stay a static import. A dynamic
// import("@tanstack/react-start/server-entry") makes rolldown emit the
// server entry behind a facade chunk that shares the __exportStar runtime
// helper with the entry chunk, creating a circular chunk import. The entry
// chunk then calls the helper (still undefined, `var`-hoisted) during its
// own evaluation -> "TypeError: __exportAll is not a function" -> every
// request 500s with the static error page (seen 2026-10-03).
import serverEntryModule from "@tanstack/react-start/server-entry";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    // The virtual module's type declaration doesn't expose `.default`, but
    // the built module namespace carries it (same shape the old dynamic
    // import consumed via `m.default ?? m`).
    const mod = serverEntryModule as unknown as { default?: unknown };
    serverEntryPromise = Promise.resolve((mod.default ?? serverEntryModule) as ServerEntry);
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
  // HSTS: the site is HTTPS-only (Cloudflare). Preload-ready value; the
  // domain itself must be added to the HSTS preload list separately if wanted.
  if (!headers.has("strict-transport-security"))
    headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  // Cross-Origin-Opener-Policy: isolates our browsing context from cross-
  // origin popups while still allowing the OAuth popups/redirects we use.
  if (!headers.has("cross-origin-opener-policy"))
    headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  // Content-Security-Policy, audited against what the app actually loads
  // (2026-10-23): self-hosted fonts and bundles; scripts and styles can
  // only come from this origin ('unsafe-inline' is required by the
  // framework's SSR hydration and inline style attributes) - that is the
  // core XSS barrier, and no external script origin is allowed at all.
  // connect-src stays open (https:/http:/ws:/wss:) on purpose: several
  // tools exist to call arbitrary user-entered APIs (API tester, header
  // analyzer, WebSocket sandbox, npm/GitHub/PyPI lookups), and CORS still
  // governs what those calls can read. Tool playgrounds iframe user
  // content (frame-src https:). Routes that set their own stricter CSP
  // (e.g. /api/icon serves SVGs with script-src 'none') keep theirs -
  // this only fills the gap.
  if (!headers.has("content-security-policy")) {
    headers.set(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        // googletagmanager.com: GA4's gtag.js, injected only after cookie
        // consent (see src/lib/ga.ts). Without this the script is blocked
        // and GA silently records nothing.
        "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https:",
        "font-src 'self' data:",
        "connect-src 'self' https: http: wss: ws:",
        "media-src 'self' data: blob: https:",
        "worker-src 'self' blob:",
        "frame-src 'self' https: data: blob:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'self'",
      ].join("; "),
    );
  }

  const { pathname } = new URL(request.url);
  const isStaticData =
    pathname.startsWith("/iconify/") ||
    pathname === "/search-index.json" ||
    pathname === "/robots.txt" ||
    /\.(js|css|woff2?|ttf|eot|png|jpg|jpeg|gif|webp|svg|ico|avif|json|xml|txt)$/i.test(pathname);
  const isApiOrHtml =
    pathname.startsWith("/api/") || pathname.startsWith("/_serverFn/");
  if (isStaticData && !isApiOrHtml && !headers.has("cache-control")) {
    // Vite emits content-hashed filenames under /assets, so they are
    // immutable within a deployment: cache for a year at edge + browser.
    // Unversioned data (iconify JSON, search index) keeps the old 1-day SWR.
    const immutable = pathname.startsWith("/assets/");
    headers.set(
      "Cache-Control",
      immutable
        ? "public, max-age=31536000, immutable"
        : "public, max-age=86400, stale-while-revalidate=86400",
    );
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
