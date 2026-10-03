// POST /api/billing/checkout -> { checkout_url }
//
// The logged-in user clicks a Pro plan on /pro. The client sends its Supabase
// access token plus the chosen plan ("monthly" | "yearly" | "lifetime"); the
// server validates the token, creates a Dodo checkout session for that plan
// (with the Supabase user id in metadata), and returns the hosted checkout
// URL to redirect to.
//
// Requires server env: DODO_PAYMENTS_API_KEY, DODO_PAYMENTS_PRODUCT_ID_MONTHLY,
// DODO_PAYMENTS_PRODUCT_ID_YEARLY, DODO_PAYMENTS_PRODUCT_ID_LIFETIME,
// DODO_PAYMENTS_ENVIRONMENT (test_mode|live_mode), DODO_PAYMENTS_WEBHOOK_SECRET,
// SUPABASE_URL (+ anon key via VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY).

import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

/**
 * Tiny per-IP rate limiter for the checkout endpoint (abuse protection).
 * In-memory per isolate - good enough to blunt casual flooding; Dodo and
 * Supabase provide the real backstops.
 */
const hits = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_HITS = 12;
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

export const Route = createFileRoute("/api/billing/checkout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ip =
          request.headers.get("cf-connecting-ip") ??
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          "unknown";
        if (isRateLimited(ip)) {
          return Response.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
        }

        let body: { access_token?: string; plan?: string };
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON body." }, { status: 400 });
        }
        const accessToken = body.access_token;
        if (!accessToken) {
          return Response.json({ error: "Sign in first." }, { status: 401 });
        }
        // The requested plan (monthly/yearly/lifetime) is validated below;
// anything else falls back to yearly.

        // Validate the token and resolve the user server-side. Never trust a
        // user id sent by the client - the webhook grants the plan to the id
        // stored in Dodo metadata, so it must come from a verified session.
        const { data, error } = await supabase.auth.getUser(accessToken);
        const user = data?.user;
        if (error || !user?.email) {
          return Response.json({ error: "Session expired. Please sign in again." }, { status: 401 });
        }

        const origin = new URL(request.url).origin;

        try {
          const { createPlanCheckout } = await import("@/lib/billing.server");
          type PaidPlan = import("@/lib/billing.server").PaidPlan;
          const plan: PaidPlan =
            body.plan === "monthly" || body.plan === "lifetime" ? body.plan : "yearly";
          const fullName = user.user_metadata?.["full_name"] as string | undefined;
          const { checkoutUrl } = await createPlanCheckout(
            {
              email: user.email,
              ...(fullName ? { name: fullName } : {}),
              userId: user.id,
              origin,
            },
            plan,
          );
          return Response.json({ checkout_url: checkoutUrl });
        } catch (err) {
          console.error("[billing] checkout session failed:", err);
          const message = err instanceof Error ? err.message : "Checkout failed.";
          // Don't leak raw provider errors to the client, but keep config
          // errors readable so misconfiguration is obvious during setup.
          const clientMessage = /not configured|DODO_PAYMENTS/i.test(message)
            ? message
            : "Could not start checkout. Please try again in a moment.";
          return Response.json({ error: clientMessage }, { status: 500 });
        }
      },
    },
  },
});
