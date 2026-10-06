// POST /api/billing/webhook - Dodo Payments webhook receiver.
//
// Register this URL in the Dodo dashboard: Developer -> Webhooks -> Add endpoint
//   https://<your-domain>/api/billing/webhook
// Subscribe at minimum to: payment.succeeded, payment.failed,
//   subscription.active, subscription.cancelled, subscription.expired.
//
// Security: the raw request body is verified against the Standard Webhooks
// signature (webhook-id / webhook-signature / webhook-timestamp headers + the
// webhook secret) BEFORE anything is trusted. Unsigned or badly-signed
// requests are rejected with 401 and no plan is granted.
//
// Plans:
//  - payment.succeeded  -> grants the plan from checkout metadata
//    ("yearly" | "lifetime"; "monthly" still honoured for grandfathered
//    subscribers from before the plan was removed) via an idempotent upsert.
//  - subscription.active -> grants the plan from metadata (renewals re-confirm).
//  - subscription.cancelled / subscription.expired -> downgrades monthly/yearly
//    to "free" (lifetime never lapses).
//
// Requires server env: DODO_PAYMENTS_WEBHOOK_SECRET (+ the other
// DODO_PAYMENTS_* vars), SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

/** Paid plans: yearly ($19/yr), lifetime ($39 one-time). "monthly" is only
 *  recognised for grandfathered subscribers from before the plan was removed. */
type PaidPlan = "monthly" | "yearly" | "lifetime";

function asPaidPlan(value: unknown): PaidPlan {
  return value === "monthly" || value === "lifetime" ? value : "yearly";
}

async function grantPlan(userId: string, plan: PaidPlan, ref?: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // Atomic grant via RPC: an out-of-order yearly/monthly event can never
  // overwrite a lifetime plan (the SQL only updates non-lifetime rows).
  const { error } = await (supabaseAdmin as any).rpc("grant_plan", {
    p_user_id: userId,
    p_plan: plan,
  });
  if (error) throw new Error(`supabase rpc failed: ${error.message}`);
  console.info("[billing] granted plan", { userId, plan, ref });
}

async function downgradeIfRecurring(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("user_plans").select("plan").eq("user_id", userId).maybeSingle();
  // Only recurring subscriptions (monthly/yearly) can lapse - lifetime never
  // downgrades. Downgrade lapsed recurring plans back to free.
  if (data?.plan === "monthly" || data?.plan === "yearly") {
    await supabaseAdmin
      .from("user_plans")
      .update({ plan: "free", updated_at: new Date().toISOString() })
      .eq("user_id", userId);
    console.info("[billing] downgraded expired/cancelled subscription to free", { userId, was: data.plan });
  }
}

function metadataOf(data: Record<string, unknown>): Record<string, string> {
  return (data?.["metadata"] as Record<string, string> | undefined) ?? {};
}

export const Route = createFileRoute("/api/billing/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Read the raw body first - signature verification needs the exact
        // bytes as received, before any JSON parsing.
        const rawBody = await request.text();
        const headers: Record<string, string> = {
          "webhook-id": request.headers.get("webhook-id") ?? "",
          "webhook-signature": request.headers.get("webhook-signature") ?? "",
          "webhook-timestamp": request.headers.get("webhook-timestamp") ?? "",
        };

        let event: { type: string; data: Record<string, unknown> };
        try {
          const { verifyDodoWebhook } = await import("@/lib/billing.server");
          event = verifyDodoWebhook(rawBody, headers);
        } catch (err) {
          console.warn("[billing] webhook signature verification failed:", err instanceof Error ? err.message : err);
          return new Response("Invalid signature.", { status: 401 });
        }

        try {
          if (event.type === "payment.succeeded") {
            const metadata = metadataOf(event.data);
            const userId = metadata["user_id"];
            // Grant the plan from checkout metadata (yearly/lifetime;
            // "monthly" still honoured for grandfathered subscribers).
            const plan: PaidPlan = asPaidPlan(metadata["plan"]);
            const paymentId =
              typeof event.data?.["payment_id"] === "string" ? (event.data["payment_id"] as string) : undefined;

            if (!userId) {
              // Acknowledge so Dodo doesn't retry a payload we can never
              // fulfil; log it for manual reconciliation instead.
              console.warn("[billing] payment.succeeded without user_id metadata", { paymentId });
            } else {
              try {
                await grantPlan(userId, plan, paymentId);
              } catch (err) {
                console.error("[billing] failed to grant plan:", err, { userId, plan, paymentId });
                // Return 500 so Dodo retries the delivery.
                return Response.json({ error: "Failed to fulfil order." }, { status: 500 });
              }
            }
          } else if (event.type === "payment.failed") {
            console.info("[billing] payment failed", {
              payment_id: event.data?.["payment_id"],
            });
          } else if (event.type === "subscription.active" || event.type === "subscription.renewed") {
            const metadata = metadataOf(event.data);
            // Dodo nests metadata under different keys depending on the event;
            // also try the subscription object itself.
            const userId =
              metadata["user_id"] ??
              ((event.data?.["subscription"] as Record<string, unknown> | undefined)?.["metadata"] as
                | Record<string, string>
                | undefined)?.["user_id"];
            if (userId) {
              try {
                await grantPlan(userId, asPaidPlan(
                  metadata["plan"] ??
                  ((event.data?.["subscription"] as Record<string, unknown> | undefined)?.["metadata"] as
                    | Record<string, string>
                    | undefined)?.["plan"]
                ), event.type);
              } catch (err) {
                console.error("[billing] failed to grant plan:", err, { userId });
                return Response.json({ error: "Failed to fulfil order." }, { status: 500 });
              }
            } else {
              console.warn("[billing] subscription.active without user_id metadata");
            }
          } else if (event.type === "subscription.cancelled" || event.type === "subscription.expired") {
            const metadata = metadataOf(event.data);
            const userId = metadata["user_id"];
            if (userId) {
              try {
                await downgradeIfRecurring(userId);
              } catch (err) {
                console.error("[billing] failed to downgrade plan:", err, { userId });
                return Response.json({ error: "Handler error." }, { status: 500 });
              }
            }
          }
          // All other event types are acknowledged and ignored.
        } catch (err) {
          console.error("[billing] webhook handler error:", err);
          return Response.json({ error: "Handler error." }, { status: 500 });
        }

        return Response.json({ ok: true });
      },
    },
  },
});
