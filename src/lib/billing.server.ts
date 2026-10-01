// Server-only Dodo Payments helpers.
//
// SECURITY: This module reads secret keys from the server environment.
// Never import it from client code. Route files must dynamically import it
// INSIDE their server handlers:
//   const { createYearlyCheckout } = await import("@/lib/billing.server");

import { getServerEnv } from "@/lib/server-env.server";
import DodoPayments from "dodopayments";

export type DodoEnvironment = "test_mode" | "live_mode";

export interface DodoConfig {
  apiKey: string;
  environment: DodoEnvironment;
  webhookSecret: string;
}

/** Read Dodo config from the server environment. Throws listing what's missing. */
export function getDodoConfig(): DodoConfig {
  const apiKey = getServerEnv("DODO_PAYMENTS_API_KEY");
  const webhookSecret = getServerEnv("DODO_PAYMENTS_WEBHOOK_SECRET");
  const environment = (getServerEnv("DODO_PAYMENTS_ENVIRONMENT") || "test_mode") as DodoEnvironment;

  const missing = [
    !apiKey && "DODO_PAYMENTS_API_KEY",
    !webhookSecret && "DODO_PAYMENTS_WEBHOOK_SECRET",
  ].filter(Boolean) as string[];

  if (missing.length > 0) {
    throw new Error(
      `Dodo Payments is not configured. Missing environment variable(s): ${missing.join(", ")}. ` +
        `Add them in the Dodo dashboard (Developer -> API / Webhooks) and your Cloudflare Worker environment.`,
    );
  }
  if (environment !== "test_mode" && environment !== "live_mode") {
    throw new Error(`DODO_PAYMENTS_ENVIRONMENT must be "test_mode" or "live_mode".`);
  }
  return { apiKey: apiKey!, environment, webhookSecret: webhookSecret! };
}

/** Authenticated Dodo API client for the configured environment. */
export function getDodoClient(): DodoPayments {
  const cfg = getDodoConfig();
  return new DodoPayments({ bearerToken: cfg.apiKey, environment: cfg.environment });
}

export interface CheckoutInput {
  email: string;
  name?: string;
  userId: string;
  /** Absolute URL of this site, e.g. https://iconvault.app - used for return_url. */
  origin: string;
}

/** The single paid plan: Pro Yearly ($9.9/year). */
export type PaidPlan = "yearly";

/**
 * Pro Yearly ($9.9/year) subscription product id. Optional - Sameer creates the
 * subscription product in the Dodo dashboard and sets
 * DODO_PAYMENTS_PRODUCT_ID_YEARLY in the Worker environment.
 */
export function getYearlyProductId(): string {
  const id = getServerEnv("DODO_PAYMENTS_PRODUCT_ID_YEARLY");
  if (!id) {
    throw new Error(
      "Dodo Payments yearly plan is not configured. Create a $9.9/year subscription product in the Dodo dashboard and set DODO_PAYMENTS_PRODUCT_ID_YEARLY in your Cloudflare Worker environment.",
    );
  }
  return id;
}

async function createCheckout(
  input: CheckoutInput,
  productId: string,
  plan: PaidPlan,
): Promise<{ checkoutUrl: string }> {
  const client = getDodoClient();
  const session = await client.checkoutSessions.create({
    product_cart: [{ product_id: productId, quantity: 1 }],
    customer: { email: input.email, name: input.name ?? null },
    return_url: `${input.origin}/billing/success`,
    metadata: { user_id: input.userId, plan },
  });

  if (!session.checkout_url) {
    throw new Error("Dodo did not return a checkout URL.");
  }
  return { checkoutUrl: session.checkout_url };
}

/**
 * Create a Dodo checkout session for the $9.9/year Pro subscription and
 * return the hosted checkout URL to redirect the customer to.
 * Dodo handles the recurring billing; webhooks (subscription.active /
 * subscription.cancelled / subscription.expired) keep the Supabase plan
 * in sync. The Supabase user id travels in `metadata` so the webhook can
 * grant the plan to the right user.
 */
export async function createYearlyCheckout(input: CheckoutInput): Promise<{ checkoutUrl: string }> {
  return createCheckout(input, getYearlyProductId(), "yearly");
}

export interface VerifiedWebhookEvent {
  type: string;
  data: Record<string, unknown>;
}

/**
 * Verify a Dodo webhook request using the Standard Webhooks signature.
 * Pass the RAW request body (before any JSON parsing) plus the three
 * webhook-* headers. Throws when the signature is invalid.
 */
export function verifyDodoWebhook(rawBody: string, headers: Record<string, string>): VerifiedWebhookEvent {
  const cfg = getDodoConfig();
  const client = getDodoClient();
  // unwrap() verifies the HMAC-SHA256 signature with the webhook secret,
  // checks the timestamp (5 min tolerance) and parses the payload.
  // It throws on any verification failure.
  const event = client.webhooks.unwrap(rawBody, { headers, key: cfg.webhookSecret });
  return event as unknown as VerifiedWebhookEvent;
}
