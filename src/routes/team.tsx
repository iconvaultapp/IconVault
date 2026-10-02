import { createFileRoute } from "@tanstack/react-router";
import { Users, ShieldCheck, GitBranch, Eye, Upload, BarChart2 } from "lucide-react";
import PageShell from "@/components/PageShell";
import { Reveal } from "@/components/Reveal";
import { SectionHeading, FeatureGrid, StepList, FaqList, CTABand, Stack, CheckList } from "@/components/kit";

export const Route = createFileRoute("/team")({
  head: () => ({
    meta: [
      { title: "Team workspace - shared icon libraries | IconVault" },
      {
        name: "description",
        content:
          "One approved icon library for the whole product team. Shared collections, roles, custom uploads with review, usage analytics and SSO.",
      },
      { property: "og:title", content: "Team workspace - shared icon libraries" },
      {
        property: "og:description",
        content: "Shared collections, roles, upload review, usage analytics and SSO for product teams.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/team" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/team" }],
  }),
  component: Page,
});

const roles = [
  {
    name: "Owner",
    body: "Billing, SSO, workspace settings and member management. Usually one or two people.",
    can: ["Everything an editor can do", "Manage seats and billing", "Configure SSO and audit export"],
  },
  {
    name: "Editor",
    body: "Designers and engineers doing the daily work - curating sets and shipping exports.",
    can: ["Create and edit shared collections", "Upload custom icons for review", "Generate API keys for their own use"],
  },
  {
    name: "Viewer",
    body: "Everyone else: PMs, marketing, support. Read and copy, never rearrange.",
    can: ["Browse shared collections", "Copy and download approved icons", "See which icon is the approved one"],
  },
];

function Page() {
  return (
    <PageShell
      wide
      eyebrow="Account"
      title="One icon library your whole team trusts"
      description="Stop shipping four versions of the same chevron. A team workspace gives designers, engineers and everyone downstream the same approved set - with review, roles and a paper trail."
    >
      <Stack>
        <div>
          <SectionHeading
            eyebrow="Why a workspace"
            title="The problems it actually solves"
            description="Every team hits the same three walls: drift between design and code, no record of what was approved, and no idea what anyone is using."
          />
          <div className="mt-8">
            <FeatureGrid
              items={[
                { icon: Users, title: "Shared collections", body: "Curate the approved set once. Everyone pulls from it, in the browser, the CLI or Figma." },
                { icon: GitBranch, title: "Design and code in sync", body: "The same collection exports to SVG for engineering and a Figma library for design, from one source." },
                { icon: Upload, title: "Custom icons with review", body: "Upload house-made glyphs. An editor approves before they appear for the rest of the team." },
                { icon: BarChart2, title: "Usage analytics", body: "See which icons and sets are actually being pulled, and which approved ones nobody touches." },
                { icon: ShieldCheck, title: "Licence and audit trail", body: "Every icon keeps its licence through export, and every approval is logged with who and when." },
                { icon: Eye, title: "SSO and access control", body: "SAML or OIDC sign-in, role-based permissions, and instant seat removal when someone leaves." },
              ]}
            />
          </div>
        </div>

        <div>
          <SectionHeading eyebrow="Roles" title="Three roles, no permission matrix to memorise" />
          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {roles.map((role, i) => (
              <Reveal key={role.name} delay={i * 60}>
                <div className="surface-card h-full p-6">
                  <h3 className="font-display text-lg font-semibold">{role.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{role.body}</p>
                  <div className="mt-5 border-t border-border pt-5">
                    <CheckList items={role.can} />
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <div>
          <SectionHeading eyebrow="Getting started" title="Set up in an afternoon" />
          <div className="mt-8">
            <StepList
              steps={[
                { title: "Create the workspace", body: "Name it, invite by email or domain, and pick who owns billing. Seats are prorated daily." },
                { title: "Curate the approved set", body: "Pull in the sets you already use, drop the icons you don't, and mark one variant as canonical." },
                { title: "Wire it into the work", body: "Connect the CLI in CI, install the Figma plugin, and hand engineers a scoped API key." },
              ]}
            />
          </div>
        </div>

        <div>
          <SectionHeading eyebrow="Questions" title="Team FAQ" />
          <div className="mt-8">
            <FaqList
              items={[
                {
                  q: "How is a team billed?",
                  a: "Per active seat, prorated by the day. Removing a member frees the seat immediately and credits the remainder to your next invoice.",
                },
                {
                  q: "Can we bring our own icons?",
                  a: "Yes. Upload SVGs individually or as a ZIP. They are optimised, normalised to a common viewBox, and queued for an editor to approve.",
                },
                {
                  q: "Does the workspace work with our CI?",
                  a: "The CLI takes a scoped key and can sync a collection into a repo folder on every build, failing the job if an icon was removed upstream.",
                },
                {
                  q: "What happens to shared collections if we downgrade?",
                  a: "Nothing is deleted. Shared collections become read-only until you add seats again, and personal exports keep working.",
                },
              ]}
            />
          </div>
        </div>

        <CTABand
          title="Start a 14-day team trial"
          body="Full workspace, unlimited seats during the trial, no card. Bring your real icon set and see how much drift it finds."
          primary={{ label: "Create a workspace", to: "/auth" }}
          secondary={{ label: "See pricing", to: "/pro" }}
        />
      </Stack>
    </PageShell>
  );
}
