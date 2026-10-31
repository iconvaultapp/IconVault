import { createLazyFileRoute, Link } from "@tanstack/react-router";
import PageShell from "@/components/PageShell";
import { Reveal } from "@/components/Reveal";

export const Route = createLazyFileRoute("/about")({
  component: Page,
});

const FACTS = [
  { value: "421,020", label: "open-source SVG icons" },
  { value: "239", label: "icon sets indexed" },
  { value: "578", label: "free online tools" },
  { value: "386", label: "free SVG illustrations" },
  { value: "3,359", label: "UI components" },
];

function Page() {
  return (
    <PageShell
      eyebrow="About"
      title="About IconVault"
      description="A free search index of open-source SVG icons, plus free tools for developers and designers."
    >
      <div className="mx-auto max-w-3xl">
        <Reveal>
          <p className="text-lg leading-relaxed text-muted-foreground">
            <a
              href="https://iconvault.site"
              className="font-medium text-primary hover:underline"
            >
              IconVault
            </a>{" "}
            is a free search index of 421,020 open-source SVG icons from 239 sets. One search box
            covers every set, and every icon can be previewed, recoloured and downloaded as SVG or
            PNG, or copied as a React, Vue or HTML component. Browsing and copying need no account; downloads need a free account.
            Around the index sit 578 free online tools, 386 free SVG illustrations and 3,359 UI
            components.
          </p>
        </Reveal>

        <Reveal delay={80}>
          <h2 className="mt-12 font-display text-2xl font-semibold tracking-tight">
            Built by Dev Coder
          </h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            Dev Coder is a solo founder and full-stack developer. He worked as a Full-Stack
            Developer on Upwork from January 2023 to May 2025, and holds an MCA in Computer Science
            from AMU (2021-2023). IconVault is his independent project: one developer, building in
            public, shipping a little every week.
          </p>
        </Reveal>

        <Reveal delay={120}>
          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {FACTS.map((f) => (
              <div key={f.label} className="surface-card p-5 text-center">
                <p className="font-display text-2xl font-semibold tracking-tight">{f.value}</p>
                <p className="mt-1 text-xs leading-snug text-muted-foreground">{f.label}</p>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={160}>
          <div className="mt-12 flex flex-wrap gap-3">
            <Link
              to="/app"
              className="focus-ring inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-transform hover:-translate-y-0.5"
            >
              Browse the icons
            </Link>
            <Link
              to="/tools"
              className="focus-ring inline-flex items-center justify-center rounded-full border border-border bg-surface px-6 py-3 text-sm font-medium transition-transform hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary"
            >
              Explore the tools
            </Link>
          </div>
        </Reveal>
      </div>
    </PageShell>
  );
}
