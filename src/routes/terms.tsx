import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import PageShell from "@/components/PageShell";
import { Reveal } from "@/components/Reveal";
import { Stack } from "@/components/kit";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions - IconVault" },
      {
        name: "description",
        content:
          "The terms of using IconVault: free icon library and tools, free-use limits, Pro plans, acceptable use, licences, warranties and liability.",
      },
      { property: "og:title", content: "Terms & Conditions - IconVault" },
      {
        property: "og:description",
        content:
          "The terms of using IconVault: free icon library and tools, free-use limits, Pro plans, acceptable use, licences, warranties and liability.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/terms" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/terms" }],
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
      title="Terms & Conditions"
      description="The rules of the road for using IconVault. By using the site you agree to these terms."
    >
      <div className="mx-auto max-w-3xl">
        <Reveal>
          <p className="mb-10 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Last updated: September 30, 2026
          </p>
        </Reveal>
        <Stack>
          <Section id="service" title="1. The service">
            <p>
              IconVault is a free online icon library and a collection of free online
              tools at iconvault.site. You can search hundreds of thousands of open-source
              icons, preview and export them, and use the tools directly in your browser
              with no account required for basic use.
            </p>
          </Section>

          <Section id="accounts" title="2. Accounts">
            <p>
              Some features (favourites, collections, cross-device sync, Pro plans)
              require an account. You must provide a valid email address, keep your
              password confidential, and you are responsible for activity under your
              account. You may delete your account at any time from your profile page.
            </p>
          </Section>

          <Section id="free-use" title="3. Free use and trial limits">
            <p>
              Search and single-icon copy are unlimited for everyone. Each tool includes
              5 free runs: after that, the tool asks you to upgrade to Pro. Free accounts
              also get a limited number of bulk downloads in total. Current limits are
              shown on the site and may change as we add capacity.
            </p>
          </Section>

          <Section id="pro" title="4. Pro plans, billing and refunds">
            <p>
              Pro plans unlock unlimited tool runs, unlimited exports and other paid
              features. Current plans and prices are listed on the{" "}
              <Link to="/pro" className="text-primary underline-offset-4 hover:underline">
                Pro page
              </Link>
              : Pro Monthly ($2/month) and Pro Yearly ($14/year) are recurring subscriptions you can cancel
              anytime. Lifetime ($39) is a one-time payment with no expiry.
            </p>
            <p>
              Checkout is handled by Dodo Payments on a secure hosted page. We never see
              or store your card details. Subscriptions renew automatically until
              cancelled; cancelling stops future charges and you keep Pro access until
              the end of the billing period. If a paid plan does not save you time in
              the first 30 days, contact us from your profile page for a refund.
            </p>
          </Section>

          <Section id="acceptable-use" title="5. Acceptable use">
            <p>You agree not to:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Use the service for anything unlawful or to infringe others' rights.</li>
              <li>Abuse rate limits, scrape at scale, or try to bypass trial limits.</li>
              <li>Upload content you do not have the right to use, or content that is malicious.</li>
              <li>Attempt to disrupt the service, probe other accounts, or resell Pro access.</li>
            </ul>
            <p>
              We may suspend or terminate accounts that violate these terms, with or
              without notice for serious abuse.
            </p>
          </Section>

          <Section id="intellectual-property" title="6. Intellectual property">
            <p>
              <strong className="font-semibold text-foreground">IconVault Originals</strong>{" "}
              (icons with the <span className="font-mono text-sm">ivo</span> prefix) are our
              own work, licensed under the ISC licence: you may use them commercially,
              modify them and redistribute them, with the licence notice included.
            </p>
            <p>
              <strong className="font-semibold text-foreground">Third-party icon sets</strong>{" "}
              indexed on the site keep their own licences. Each icon carries its licence
              through to export: it is your responsibility to follow it. The site itself,
              its design and its code remain our property.
            </p>
            <p>
              <strong className="font-semibold text-foreground">Your uploads</strong>{" "}
              (custom icons, images you process in tools) remain yours. Files you open in
              browser tools are processed on your device and never uploaded, unless a
              feature explicitly says so.
            </p>
          </Section>

          <Section id="third-party" title="7. Third-party services">
            <p>
              The service relies on third-party providers, including Supabase
              (authentication and data) and Dodo Payments (billing). Your use of those
              services is also subject to their terms and privacy policies. We are not
              responsible for outages or failures on their side, though we will work to
              resolve them.
            </p>
          </Section>

          <Section id="no-warranty" title="8. No warranty">
            <p>
              The service is provided "as is" and "as available", without warranties of
              any kind, express or implied, including merchantability, fitness for a
              particular purpose and non-infringement. We do not guarantee the service
              will be uninterrupted, error-free or suitable for your project. Always
              verify icon licences and tool output before shipping to production.
            </p>
          </Section>

          <Section id="liability" title="9. Limitation of liability">
            <p>
              To the maximum extent permitted by law, IconVault and its operators are not
              liable for indirect, incidental, special, consequential or punitive
              damages, or for loss of profits, data or goodwill, arising from your use of
              the service. Our total liability for any claim is limited to the amount you
              paid us in the 12 months before the claim, or $10 if you paid nothing.
            </p>
          </Section>

          <Section id="governing-law" title="10. Governing law and disputes">
            <p>
              These terms are governed by the laws of the jurisdiction in which IconVault
              operates, without regard to conflict-of-law principles. If a dispute
              arises, we will first try to resolve it informally: contact us at{" "}
              <a
                href="mailto:info@iconvault.site"
                className="text-primary underline-offset-4 hover:underline"
              >
                info@iconvault.site
              </a>{" "}
              and give us 30 days to respond before pursuing other remedies.
            </p>
          </Section>

          <Section id="changes" title="11. Changes to these terms">
            <p>
              We may update these terms as the service evolves. The "Last updated" date
              at the top shows the current version, and material changes will be
              announced on the site. Continued use after a change means you accept the
              new terms. If you disagree, stop using the service and delete your account.
            </p>
          </Section>

          <Section id="contact" title="12. Contact">
            <p>
              Questions about these terms:{" "}
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
              <Link to="/privacy" className="text-primary underline-offset-4 hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </Section>
        </Stack>
      </div>
    </PageShell>
  );
}
