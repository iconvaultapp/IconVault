// POST /api/log-error -> { ok: true }
//
// Public client-error sink: the frontend posts caught exceptions here so they
// land in the error_logs table for the admin panel. Per-IP rate limited
// (60/min, in-memory per isolate). Always answers { ok: true } so error
// reporting can never leak server internals or break the reporting page.

import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const hits = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_HITS = 60;
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) {
    const oldest = [...hits.keys()][0];
    if (oldest) hits.delete(oldest);
  }
  return arr.length > MAX_HITS;
}

export const Route = createFileRoute("/api/log-error")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ip =
          request.headers.get("cf-connecting-ip") ??
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          "unknown";
        if (isRateLimited(ip)) {
          return Response.json({ ok: true }, { status: 429 });
        }

        let body: { message?: unknown; stack?: unknown; url?: unknown; user_id?: unknown };
        try {
          body = await request.json();
        } catch {
          return Response.json({ ok: true });
        }
        const message = typeof body.message === "string" ? body.message.slice(0, 2000).trim() : "";
        if (!message) return Response.json({ ok: true });

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await (supabaseAdmin as any).from("error_logs").insert({
            message,
            stack: typeof body.stack === "string" ? body.stack.slice(0, 8000) : null,
            url: typeof body.url === "string" ? body.url.slice(0, 2000) : null,
            user_id: typeof body.user_id === "string" && body.user_id.length > 0 ? body.user_id : null,
          });
        } catch {
          // Never leak: the client always sees { ok: true }.
        }
        return Response.json({ ok: true });
      },
    },
  },
});
