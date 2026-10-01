import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import PageShell from "@/components/PageShell";
import { Reveal } from "@/components/Reveal";
import { Stack } from "@/components/kit";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy - IconVault" },
      {
        name: "description",
        content:
          "How IconVault collects, uses and protects your data: account email, first-party analytics, cookies, payments via Dodo Payments and your rights.",
      },
      { property: "og:title", content: "Privacy Policy - IconVault" },
      {
        property: "og:description",
        content:
          "How IconVault collects, uses and protects your data: account email, first-party analytics, cookies, payments via Dodo Payments and your rights.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/privacy" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/privacy" }],
  }),
  component: Page,
});

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="scroll-mt-24">
      <h2 id={id} className="font-display text-xl font-semibold tracking-tight">
        {title}
      </h2>
      <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

function Page() {
  return (
    <PageShell
      eyebrow="Legal"
      title="Privacy Policy"
      description="What data IconVault collects, why we collect it, and the rights you have over it. Short version: we collect as little as possible and never sell your data."
    >
      <div className="mx-auto max-w-3xl">
        <Reveal>
          <p className="mb-10 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Last updated: September 30, 2026
          </p>
        </Reveal>
        <Stack>
          <Section id="introduction" title="Introduction">
            <p>
              IconVault ("we", "us", "our") runs a free online icon library and free online
              tools at iconvault.site. This policy explains what information we collect when you
              use the site, how we use it, and the choices you have. By using IconVault you
              agree to this policy.
            </p>
          </Section>

          <Section id="information-we-collect" title="Information we collect">
            <p>
              <strong className="font-semibold text-foreground">Account information.</strong>{" "}
              If you create an account, we store the email address and display name you
              provide, plus the authentication session managed by our auth provider, Supabase.
              We use this to sign you in, sync your favourites and collections across
              devices, and manage your plan.
            </p>
            <p>
              <strong className="font-semibold text-foreground">Usage analytics.</strong>{" "}
              We store anonymised page-view analytics in our own Supabase database. This
              tells us which pages and tools are used so we can fix bugs and prioritise
              features. It is first-party: we do not share it with advertisers or data
              brokers.
            </p>
            <p>
              <strong className="font-semibold text-foreground">Tool usage counts.</strong>{" "}
              The 5 free uses per tool are counted in your browser's localStorage on your
              own device, not on our servers. Clearing your browser storage resets the
              count.
            </p>
            <p>
              <strong className="font-semibold text-foreground">Payment information.</strong>{" "}
              Payments are processed by Dodo Payments on their hosted checkout. We never
              see, store or process your card numbers: Dodo handles the payment details
              and tells us only that the payment succeeded and which plan you bought.
            </p>
            <p>
              <strong className="font-semibold text-foreground">What we do not collect.</strong>{" "}
              We do not run third-party ad trackers, we do not fingerprint your device,
              and we do not buy or sell personal data.
            </p>
          </Section>

          <Section id="cookies" title="Cookies and local storage">
            <p>IconVault uses a small number of first-party cookies and storage entries:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong className="font-semibold text-foreground">Auth session:</strong> keeps
                you signed in (required for accounts).
              </li>
              <li>
                <strong className="font-semibold text-foreground">Cookie-consent choice:</strong>{" "}
                remembers whether you accepted our cookie banner.
              </li>
              <li>
                <strong className="font-semibold text-foreground">Preferences:</strong> theme,
                recent searches and tool settings, stored locally in your browser.
              </li>
            </ul>
            <p>
              We do not set third-party advertising or tracking cookies. You can block or
              delete cookies in your browser settings, though signing in will stop working
              without the session cookie.
            </p>
          </Section>

          <Section id="how-we-use" title="How we use your information">
            <ul className="list-disc space-y-2 pl-6">
              <li>To provide the service: sign-in, favourites, collections and plan status.</li>
              <li>To process Pro payments through Dodo Payments and unlock your plan.</li>
              <li>To understand aggregate usage and improve the site.</li>
              <li>To reply when you contact us, for example about a refund or a bug.</li>
            </ul>
            <p>
              We do not use your data for advertising, and we do not share it with third
              parties except our infrastructure providers (Supabase for auth and data,
              Dodo Payments for billing), who process it only to run the service.
            </p>
          </Section>

          <Section id="data-retention" title="Data retention">
            <p>
              Account data is kept while your account exists and deleted when you delete
              your account. Aggregate analytics are kept for up to 24 months, then rolled
              up or removed. Payment records are kept by Dodo Payments under their own
              policy; we keep only a record of which plan is active on your account.
            </p>
          </Section>

          <Section id="your-rights" title="Your rights">
            <p>You can, at any time:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>View and edit your profile from your account page.</li>
              <li>Ask for a copy of the personal data we hold about you.</li>
              <li>Ask us to correct or delete your data by writing to us.</li>
              <li>Delete your account from the account page, which removes your stored data.</li>
              <li>Withdraw cookie consent by clearing cookies or changing your browser settings.</li>
            </ul>
            <p>
              To exercise any of these, write to{" "}
              <a
                href="mailto:info@iconvault.site"
                className="text-primary underline-offset-4 hover:underline"
              >
                info@iconvault.site
              </a>
              . We reply to privacy requests within 30 days.
            </p>
          </Section>

          <Section id="security" title="Security">
            <p>
              Data travels over HTTPS, passwords are handled by Supabase's authentication
              service (we never store them ourselves), and access to production data is
              limited. No system is perfectly secure, so if you suspect a problem with
              your account, contact us immediately.
            </p>
          </Section>

          <Section id="children" title="Children">
            <p>
              IconVault is not directed at children under 13, and we do not knowingly
              collect data from them. If you believe a child has created an account,
              contact us and we will delete it.
            </p>
          </Section>

          <Section id="changes" title="Changes to this policy">
            <p>
              We may update this policy as the service changes. The "Last updated" date at
              the top always shows the current version, and material changes will be
              announced on the site. Continued use after a change means you accept the
              new policy.
            </p>
          </Section>

          <Section id="contact" title="Contact">
            <p>
              Questions about this policy or your data:{" "}
              <a
                href="mailto:info@iconvault.site"
                className="text-primary underline-offset-4 hover:underline"
              >
                info@iconvault.site
              </a>
              .
            </p>
            <p>
              Related reading:{" "}
              <Link to="/terms" className="text-primary underline-offset-4 hover:underline">
                Terms &amp; Conditions
              </Link>
              .
            </p>
          </Section>
        </Stack>
      </div>
    </PageShell>
  );
}
