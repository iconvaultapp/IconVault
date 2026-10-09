import { Fragment, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, Minus, Crown, Zap, ShieldCheck, BadgeCheck, Loader2 } from "lucide-react";
import PageShell from "@/components/PageShell";
import { Reveal } from "@/components/Reveal";
import { SectionHeading, FaqList, CTABand, Stack, FeatureGrid } from "@/components/kit";
import { useAuth } from "@/hooks/useAuth";
import { usePlan, LIFETIME_PRICE } from "@/hooks/usePlan";

export const Route = createFileRoute("/pro")({
  head: () => ({
    meta: [
      { title: "Pricing - IconVault Free & Lifetime plans" },
      {
        name: "description",
        content:
          "Free forever for solo work. Lifetime $24 one-time for unlimited tools, exports and API access.",
      },
      { property: "og:title", content: "Pricing - IconVault Free & Lifetime plans" },
      {
        property: "og:description",
        content: "Free forever, or $24 once for lifetime unlimited everything.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/pro" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/pro" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          name: "IconVault Pro",
          description:
            "Unlocks unlimited tool runs, unlimited exports, bulk downloads, design tokens and API access on IconVault.",
          brand: { "@type": "Brand", name: "IconVault" },
          offers: [
            {
              "@type": "Offer",
              name: "Free",
              price: "0",
              priceCurrency: "USD",
              description: "Free forever for solo work.",
            },
            {
              "@type": "Offer",
              name: "Lifetime",
              price: "24",
              priceCurrency: "USD",
              description: "One-time payment, yours forever.",
            },
          ],
        }),
      },
    ],
  }),
  component: Page,
});

const proFeatures = [
  "Unlimited tool runs (all 579 tools)",
  "Unlimited SVG and PNG downloads",
  "Unlimited bulk downloads",
  "Full-page & HD website screenshots",
  "Batch vectorize + ZIP exports",
];

const freePlan = {
  name: "Free",
  tagline: "Everything you need to ship a side project.",
  cta: "Start free",
  to: "/auth",
  features: [
    "Search 421,020 open-source icons",
    "SVG, PNG and JSX copy-out",
    "7 bulk downloads in total",
    "5 free runs per tool per day, no account needed",
    "20+ tools free unlimited, forever",
    "Recolour and resize in the browser",
    "Favourites and collections sync across devices",
  ],
};

const lifetimePlan = {
  name: "Lifetime",
  tagline: "Pay once, own it forever.",
  cta: `Get lifetime - $${LIFETIME_PRICE}`,
  features: [
    ...proFeatures,
    "Never pay again",
    "All future Pro features included",
  ],
};

/** Plan names for the comparison table header. */
const planNames = ["Free", "Lifetime"];

type Cell = boolean | string;
// Columns: Free | Lifetime.
const matrix: { group: string; rows: { label: string; values: [Cell, Cell] }[] }[] = [
  {
    group: "Discovery",
    rows: [
      { label: "Icon sets indexed", values: ["All 239", "All 239"] },
      { label: "AI natural-language search", values: [false, true] },
      { label: "Search history sync", values: ["7 days", "Unlimited"] },
      { label: "Side-by-side comparison", values: [true, true] },
    ],
  },
  {
    group: "Tools",
    rows: [
      { label: "Free tool runs", values: ["5 per tool / day", "Unlimited"] },
      { label: "Image to SVG vectorizer", values: ["5 runs", "Unlimited + batch"] },
      { label: "OG image generator", values: ["5 exports", "Unlimited"] },
      { label: "Website screenshots", values: ["5 captures", "Unlimited + full-page HD"] },
      { label: "Image compressor", values: ["5 runs", "Unlimited batch"] },
      { label: "Thumbnail maker", values: ["5 exports", "Unlimited"] },
      { label: "Logo builder kit export", values: [false, true] },
    ],
  },
  {
    group: "Export",
    rows: [
      { label: "SVG / PNG / JSX", values: [true, true] },
      { label: "Bulk downloads", values: ["7 total", "Unlimited"] },
      { label: "Icon font generation", values: [false, true] },
      { label: "Design tokens", values: [false, true] },
    ],
  },
  {
    group: "Platform",
    rows: [
      { label: "REST API calls", values: ["1,000 / mo", "50,000 / mo"] },
      { label: "CLI, Figma, VS Code", values: ["Read only", true] },
      { label: "Custom icon uploads", values: [false, "500"] },
      { label: "Cross-device sync", values: [true, true] },
    ],
  },
];

const faqs = [
  {
    q: "Do I need to pay to use the icons?",
    a: "No. Every icon indexed on IconVault is open source and stays under its original licence. The paid plan pays for the workflow around them - unlimited tools, bulk export, tokens and API access.",
  },
  {
    q: "How does Lifetime billing work?",
    a: "Lifetime is a $24 one-time payment through Dodo Payments on a secure hosted page. You pay once and keep unlimited access forever - no subscription, nothing to cancel.",
  },
  {
    q: "What happens when I hit the free limits?",
    a: "Nothing breaks. Search and single-icon copy stay unlimited. Free accounts get 7 bulk downloads in total and 5 free runs per tool per day (20+ tools are free unlimited) - after that, upgrade to Lifetime for unlimited use.",
  },
  {
    q: "Is there really no subscription?",
    a: "Correct. Lifetime means lifetime - one $24 payment, no recurring billing, no renewal reminders. Your access never lapses.",
  },
  {
    q: "Can I get a refund?",
    a: "Yes. If the paid plan doesn't save you time in the first 30 days, write to us from your profile page and we'll refund it - no questions asked.",
  },
  {
    q: "Is there a discount for students or open source?",
    a: "Lifetime is free for maintainers of public repositories with more than 500 stars, and 50% off with a valid student address. Request it from your profile page after signing up.",
  },
];

/**
 * Paid plan CTA. Signed-out visitors go to /auth first (unchanged
 * behaviour); signed-in users get a Dodo checkout session created
 * server-side for the Lifetime ($24 one-time) plan and are
 * redirected to Dodo's hosted checkout. Active lifetime members see a
 * confirmation instead of the button.
 */
const TermsNote = () => (
  <p className="mt-2 text-center text-[11px] leading-relaxed text-muted-foreground">
    By continuing you agree to our{" "}
    <Link to="/terms" className="underline underline-offset-4 hover:text-primary">
      Terms
    </Link>{" "}
    and{" "}
    <Link to="/privacy" className="underline underline-offset-4 hover:text-primary">
      Privacy Policy
    </Link>
    .
  </p>
);

function CheckoutButton({ label, planType }: { label: string; planType: "yearly" | "lifetime" }) {
  const { user, session } = useAuth();
  const { plan } = usePlan();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (plan !== "free") {
    const planLabel = plan === "lifetime" ? "Lifetime" : plan === "monthly" ? "Pro Monthly" : "Pro Yearly";
    return (
      <span className="focus-ring mt-7 inline-flex items-center justify-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-5 py-2.5 text-sm font-medium text-primary">
        <Check className="h-4 w-4" />
        {planLabel} active
      </span>
    );
  }

  if (!user) {
    return (
      <div className="mt-7">
        <Link
          to="/auth"
          className="focus-ring inline-flex w-full items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-ring transition-transform hover:-translate-y-0.5"
        >
          {label}
        </Link>
        <TermsNote />
      </div>
    );
  }

  const startCheckout = async () => {
    const token = session?.access_token;
    if (!token) {
      navigate({ to: "/auth" });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: token, plan: planType }),
      });
      const data = (await res.json()) as { checkout_url?: string; error?: string };
      if (!res.ok || !data.checkout_url) {
        throw new Error(data.error || "Could not start checkout.");
      }
      window.location.href = data.checkout_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout.");
      setBusy(false);
    }
  };

  return (
    <div className="mt-7">
      <button
        type="button"
        onClick={startCheckout}
        disabled={busy}
        className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-ring transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {busy ? "Opening secure checkout…" : label}
      </button>
      {error && <p className="mt-2 text-center text-xs text-destructive">{error}</p>}
      <p className="mt-2 text-center font-mono text-[10px] text-muted-foreground">
        Secure checkout by Dodo Payments
      </p>
      <TermsNote />
    </div>
  );
}

function Page() {
  return (
    <PageShell
      wide
      eyebrow="Pricing"
      title="Free forever, or lifetime"
      description="Start free and stay free for solo projects. Or pay once for lifetime — unlimited tools, exports and API access, yours forever."
    >
      <Stack>
        <div>
          <div className="grid gap-5 sm:grid-cols-2 lg:px-4">
            {/* Free */}
            <Reveal delay={0}>
              <div className="surface-card relative flex h-full flex-col p-6">
                <h3 className="font-display text-lg font-semibold">Free</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{freePlan.tagline}</p>
                <p className="mt-6 flex items-baseline gap-1.5">
                  <span className="font-display text-4xl font-semibold tracking-tight">$0</span>
                  <span className="text-sm text-muted-foreground">forever</span>
                </p>
                <ul className="mt-6 grid gap-2.5">
                  {freePlan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to={freePlan.to}
                  className="focus-ring mt-7 inline-flex items-center justify-center rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium transition-transform hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary"
                >
                  {freePlan.cta}
                </Link>
              </div>
            </Reveal>
            {/* Lifetime */}
            <Reveal delay={60}>
              <div className="surface-card relative flex h-full flex-col border-primary/40 p-6 shadow-ring">
                <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-primary-foreground">
                  Most popular
                </span>
                <h3 className="font-display text-lg font-semibold">Lifetime</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">Pay once, own it forever.</p>
                <p className="mt-6 flex items-baseline gap-1.5">
                  <span className="font-display text-4xl font-semibold tracking-tight">${LIFETIME_PRICE}</span>
                  <span className="text-sm text-muted-foreground">one-time</span>
                </p>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                  Single payment - yours forever
                </p>
                <ul className="mt-6 grid gap-2.5">
                  {lifetimePlan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <CheckoutButton label={lifetimePlan.cta} planType="lifetime" />
              </div>
            </Reveal>
          </div>
          <p className="mt-5 text-center text-xs leading-relaxed text-muted-foreground">
            By continuing you agree to our{" "}
            <Link to="/terms" className="text-primary underline-offset-4 hover:underline">
              Terms
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="text-primary underline-offset-4 hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>

        <div>
          <SectionHeading
            eyebrow="Why upgrade"
            title="The workflow around the icons"
            description="The icons are free. Lifetime $24 once is never having to hand-clean an SVG, rename an export or rebuild a sprite by hand again."
          />
          <div className="mt-8">
            <FeatureGrid
              items={[
                { icon: Zap, title: "Bulk everything", body: "Export a whole collection as an optimised sprite, ZIP or icon font in one click." },
                { icon: Crown, title: "Tokens that fit", body: "Emit CSS variables, Tailwind theme entries or JSON tokens shaped like your design system." },
                { icon: BadgeCheck, title: "Pay once, own it forever", body: "$24 one-time for lifetime - no subscription, every pro feature we ship lands in your account." },
                { icon: ShieldCheck, title: "Licence clarity", body: "Every icon carries its licence through to export, so audits stop being a scavenger hunt." },
              ]}
              columns={2}
            />
          </div>
        </div>

        <div>
          <SectionHeading eyebrow="Compare" title="All plans, line by line" />
          <Reveal>
            <div className="mt-8 overflow-x-auto rounded-2xl border border-border bg-surface">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-2">
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground">Feature</th>
                    {planNames.map((p) => (
                      <th key={p} className="px-5 py-3 text-left font-display font-semibold">
                        {p}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrix.map((group) => (
                    <Fragment key={group.group}>
                      <tr className="border-b border-border bg-surface-2/60">
                        <td colSpan={3} className="px-5 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                          {group.group}
                        </td>
                      </tr>
                      {group.rows.map((row) => (
                        <tr key={row.label} className="border-b border-border last:border-0">
                          <td className="px-5 py-3 text-muted-foreground">{row.label}</td>
                          {row.values.map((v, idx) => (
                            <td key={idx} className="px-5 py-3">
                              {v === true ? (
                                <Check className="h-4 w-4 text-primary" />
                              ) : v === false ? (
                                <Minus className="h-4 w-4 text-muted-foreground/60" />
                              ) : (
                                <span className="font-mono text-xs">{v}</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>

        <div>
          <SectionHeading eyebrow="Questions" title="Pricing FAQ" />
          <div className="mt-8">
            <FaqList items={faqs} />
          </div>
        </div>

        <CTABand
          title="Unlock everything for $24, once"
          body="Unlimited tool runs, exports and screenshots - one payment, yours forever."
          primary={{ label: "Get lifetime", to: "/auth" }}
          secondary={{ label: "Browse the vault", to: "/app" }}
        />
      </Stack>
    </PageShell>
  );
}
