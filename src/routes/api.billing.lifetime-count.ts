// GET /api/billing/lifetime-count -> { claimed: number, limit: number }
//
// Public counter for the "first 100 lifetime members" urgency campaign.
// Returns the REAL number of lifetime plans from the database (service role,
// bypasses RLS). Cached for 60s so the pricing page stays fast.
//
// The frontend shows "X of 100 claimed" with a progress bar. If the count
// can't be determined, it omits the number rather than showing a fake one.
import { createFileRoute } from "@tanstack/react-router";
import { isRateLimited, rateLimitedResponse } from "../lib/rate-limit";

export const LIFETIME_FOUNDER_LIMIT = 100;

export const Route = createFileRoute("/api/billing/lifetime-count")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (isRateLimited(request, "api:lifetime-count", 30)) {
          return rateLimitedResponse();
        }
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { count, error } = await supabaseAdmin
            .from("user_plans")
            .select("user_id", { count: "exact", head: true })
            .eq("plan", "lifetime");
          if (error) throw error;
          return Response.json(
            { claimed: count ?? 0, limit: LIFETIME_FOUNDER_LIMIT },
            {
              headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
              },
            },
          );
        } catch (err) {
          console.error("[lifetime-count] failed:", err);
          return Response.json({ claimed: null, limit: LIFETIME_FOUNDER_LIMIT }, { status: 200 });
        }
      },
    },
  },
});
