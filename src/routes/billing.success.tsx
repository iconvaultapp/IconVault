// /billing/success - where Dodo sends the customer after payment.
//
// The plan itself is granted by the /api/billing/webhook handler (server to
// server), which can take a few seconds. This page refreshes the user's plan
// a few times and then points them at the app.

import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import PageShell from "@/components/PageShell";
import { Stack } from "@/components/kit";
import { useAuth } from "@/hooks/useAuth";
import { usePlan } from "@/hooks/usePlan";

export const Route = createFileRoute("/billing/success")({
  head: () => ({
    meta: [
      { title: "Payment successful - IconVault" },
      {
        name: "description",
        content:
          "Your IconVault payment was successful. Your plan is being activated and usually takes just a few seconds.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Page,
});

function Page() {
  const { user } = useAuth();
  const { plan, refresh } = usePlan();
  const [attempts, setAttempts] = useState(0);

  const isPaid = plan === "lifetime" || plan === "yearly";

  // The webhook usually lands within seconds. Poll the plan a few times so
  // the user sees confirmation without a manual refresh.
  useEffect(() => {
    if (isPaid || attempts >= 6) return;
    const t = setTimeout(() => {
      void refresh().finally(() => setAttempts((n) => n + 1));
    }, 4000);
    return () => clearTimeout(t);
  }, [isPaid, attempts, refresh]);

  return (
    <PageShell
      eyebrow="Payment successful"
      title={isPaid ? "Welcome to Lifetime" : "Payment received"}
      description={
        isPaid
          ? "Your lifetime plan is active. Unlimited tool runs, bulk downloads, design tokens and API access are all yours, forever."
          : "We're confirming your payment with Dodo Payments - this usually takes a few seconds."
      }
    >
      <Stack>
        <div className="surface-card mx-auto flex max-w-md flex-col items-center p-8 text-center">
          {isPaid ? (
            <CheckCircle2 className="h-12 w-12 text-primary" />
          ) : (
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          )}
          <p className="mt-4 text-sm text-muted-foreground">
            {isPaid
              ? user?.email
                ? `Receipt sent to ${user.email}.`
                : "Your receipt is on its way."
              : "Please don't close this tab. Your plan will activate automatically."}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/app"
              className="focus-ring inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-ring transition-transform hover:-translate-y-0.5"
            >
              <Sparkles className="h-4 w-4" />
              Open IconVault
            </Link>
            {!isPaid && (
              <button
                type="button"
                onClick={() => void refresh().finally(() => setAttempts((n) => n + 1))}
                className="focus-ring inline-flex items-center rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium hover:border-primary/40 hover:text-primary"
              >
                Check again
              </button>
            )}
          </div>
          {!isPaid && attempts >= 6 && (
            <p className="mt-4 text-xs text-muted-foreground">
              Still not active? The confirmation can take a minute - try signing out and back in, or write to us
              from your profile page.
            </p>
          )}
        </div>
      </Stack>
    </PageShell>
  );
}
