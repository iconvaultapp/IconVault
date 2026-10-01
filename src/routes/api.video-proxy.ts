import { createFileRoute } from "@tanstack/react-router";
import { isRateLimited, rateLimitedResponse } from "../lib/rate-limit";

// Same-origin proxy for Microlink's generated scroll-video files.
//
// Microlink's CDN does not send `Access-Control-Allow-Origin` on video
// assets, so drawing them to a canvas (GIF conversion) would taint it.
// This route streams the bytes through our own domain with CORS enabled.
// Only *.microlink.io URLs are allowed - nothing else can be proxied.

const MAX_BYTES = 25 * 1024 * 1024;

export const Route = createFileRoute("/api/video-proxy")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Rate limit: each proxied video can stream up to 25MB for 25s through
        // the Worker, so throttle per IP to prevent bandwidth/CPU burn.
        if (isRateLimited(request, "api:video-proxy", 30)) return rateLimitedResponse();
        const src = new URL(request.url).searchParams.get("url") ?? "";
        let target: URL;
        try {
          target = new URL(src);
        } catch {
          return new Response("Invalid url", { status: 400 });
        }
        if (target.protocol !== "https:" || !target.hostname.endsWith(".microlink.io")) {
          return new Response("Only Microlink CDN video URLs can be proxied", { status: 400 });
        }

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 25000);
        try {
          const upstream = await fetch(target.toString(), { signal: controller.signal });
          if (!upstream.ok || !upstream.body) {
            return new Response("Could not fetch video", { status: 502 });
          }
          const contentType = upstream.headers.get("content-type") ?? "";
          if (!contentType.startsWith("video/")) {
            return new Response("Not a video", { status: 502 });
          }
          const length = Number(upstream.headers.get("content-length") ?? 0);
          if (length > MAX_BYTES) {
            return new Response("Video too large", { status: 413 });
          }
          return new Response(upstream.body, {
            status: 200,
            headers: {
              "Content-Type": contentType,
              "Cache-Control": "public, max-age=3600",
              "Access-Control-Allow-Origin": "*",
            },
          });
        } catch {
          return new Response("Video fetch timed out", { status: 504 });
        } finally {
          clearTimeout(timer);
        }
      },
    },
  },
});
