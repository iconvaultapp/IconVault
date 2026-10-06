// POST /api/log-error -> { ok: true }
//
// Public client-error sink: the frontend posts caught exceptions here so they
// land in the error_logs table for the admin panel. Per-IP rate limited
// (60/min) via the shared limiter in src/lib/rate-limit.ts. Always answers
// { ok: true } so error reporting can never leak server internals or break
// the reporting page. A user_id is attached only when the caller presents a
// valid session token (access_token); it is never taken from the body.

import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { isRateLimited } from "../lib/rate-limit";

export const Route = createFileRoute("/api/log-error")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Shared per-IP limiter (60/min); the endpoint always answers
        // { ok: true } so reporting can never leak internals.
        if (isRateLimited(request, "api:log-error", 60)) {
          return Response.json({ ok: true }, { status: 429 });
        }

        let body: { message?: unknown; stack?: unknown; url?: unknown; access_token?: unknown };
        try {
          body = await request.json();
        } catch {
          return Response.json({ ok: true });
        }
        const message = typeof body.message === "string" ? body.message.slice(0, 2000).trim() : "";
        if (!message) return Response.json({ ok: true });

        // Never trust a user_id from the request body: attribute the error
        // to a user only when a valid session token is presented, otherwise
        // store NULL. Anonymous error logging keeps working.
        let userId: string | null = null;
        const accessToken = typeof body.access_token === "string" ? body.access_token : null;
        if (accessToken) {
          try {
            const { supabase } = await import("@/integrations/supabase/client");
            const { data } = await supabase.auth.getUser(accessToken);
            userId = data?.user?.id ?? null;
          } catch {
            userId = null;
          }
        }

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await (supabaseAdmin as any).from("error_logs").insert({
            message,
            stack: typeof body.stack === "string" ? body.stack.slice(0, 8000) : null,
            url: typeof body.url === "string" ? body.url.slice(0, 2000) : null,
            user_id: userId,
          });
        } catch {
          // Never leak: the client always sees { ok: true }.
        }
        return Response.json({ ok: true });
      },
    },
  },
});
