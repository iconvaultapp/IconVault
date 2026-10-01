import { createFileRoute } from "@tanstack/react-router";
import { Sparkles, Wrench, Bug, Rocket } from "lucide-react";
import PageShell from "@/components/PageShell";
import { Reveal } from "@/components/Reveal";
import { CTABand, Stack, SectionHeading } from "@/components/kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/changelog")({
  head: () => ({
    meta: [
      { title: "Changelog - what's new in IconVault" },
      {
        name: "description",
        content:
          "Every IconVault release: new icon sets, faster search, export formats, API changes and fixes. Updated continuously.",
      },
      { property: "og:title", content: "Changelog - what's new in IconVault" },
      {
        property: "og:description",
        content: "New icon sets, faster search, export formats, API changes and fixes.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/changelog" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/changelog" }],
  }),
  component: Page,
});

type Kind = "feature" | "improvement" | "fix";

const kindMeta: Record<Kind, { label: string; icon: typeof Sparkles; className: string }> = {
  feature: { label: "New", icon: Sparkles, className: "bg-primary-soft text-primary" },
  improvement: { label: "Improved", icon: Wrench, className: "bg-accent-soft text-accent" },
  fix: { label: "Fixed", icon: Bug, className: "bg-muted text-muted-foreground" },
};

const releases: {
  version: string;
  date: string;
  title: string;
  summary: string;
  entries: { kind: Kind; text: string }[];
}[] = [
  {
    version: "2.6",
    date: "August 2026",
    title: "Instant search and a calmer library grid",
    summary:
      "Search now resolves as you type with a 180ms debounce, and the library grid renders four dense columns with hover actions instead of a caption line nobody read.",
    entries: [
      { kind: "feature", text: "Hover actions on every icon set card - favourite and open without a click detour." },
      { kind: "improvement", text: "Search-as-you-type with request cancellation; typed queries no longer race." },
      { kind: "improvement", text: "Stat counters animate in under a second with an ease-out curve." },
      { kind: "fix", text: "Author attribution removed from cards; licence and category shown instead." },
    ],
  },
  {
    version: "2.5",
    date: "July 2026",
    title: "Design tokens, properly",
    summary:
      "Token export now emits CSS custom properties, a Tailwind theme fragment or plain JSON, with naming rules you control.",
    entries: [
      { kind: "feature", text: "Design token export with prefix, casing and grouping controls." },
      { kind: "feature", text: "SVG sprite export with automatic viewBox normalisation." },
      { kind: "improvement", text: "Collections can be reordered by drag, and shared read-only by link." },
    ],
  },
  {
    version: "2.4",
    date: "June 2026",
    title: "AI icon search out of beta",
    summary:
      "Describe the idea instead of guessing the keyword. Semantic matching now runs across all indexed sets with per-set filtering.",
    entries: [
      { kind: "feature", text: "Natural-language icon search across 421,020 icons." },
      { kind: "feature", text: "Icon requests: ask for a missing glyph and track its status." },
      { kind: "improvement", text: "Search index refreshed nightly from upstream icon sets." },
      { kind: "fix", text: "Duplicate results when a query matched both set name and icon name." },
    ],
  },
  {
    version: "2.3",
    date: "May 2026",
    title: "Developer surface area",
    summary:
      "The REST API, CLI and editor integrations landed together so icons can be pulled wherever the work actually happens.",
    entries: [
      { kind: "feature", text: "REST API with scoped keys and per-key usage metering." },
      { kind: "feature", text: "iconvault CLI: search, add and sync icons from the terminal." },
      { kind: "feature", text: "VS Code extension and Figma plugin, both public." },
      { kind: "improvement", text: "Rate limit headers on every API response." },
    ],
  },
  {
    version: "2.2",
    date: "April 2026",
    title: "Teams and shared libraries",
    summary: "Workspaces, roles and shared collections so an org stops shipping four versions of the same arrow.",
    entries: [
      { kind: "feature", text: "Team workspaces with owner, editor and viewer roles." },
      { kind: "feature", text: "Custom icon uploads with an approval queue." },
      { kind: "improvement", text: "Usage analytics per workspace and per member." },
    ],
  },
];

function Page() {
  return (
    <PageShell
      eyebrow="Changelog"
      title="What's new in IconVault"
      description="We ship small and often. Every release that changes something you can see or call is listed here, newest first."
    >
      <Stack>
        <div className="relative">
          <span className="pointer-events-none absolute left-[7px] top-2 hidden h-[calc(100%-2rem)] w-px bg-border sm:block" />
          <div className="grid gap-10">
            {releases.map((release, i) => (
              <Reveal key={release.version} delay={i * 40}>
                <article className="relative sm:pl-10">
                  <span className="absolute left-0 top-2 hidden h-3.5 w-3.5 rounded-full border-2 border-primary bg-background sm:block" />
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-primary px-2.5 py-1 font-mono text-[11px] text-primary-foreground">
                      v{release.version}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">{release.date}</span>
                  </div>
                  <h2 className="mt-3 font-display text-xl font-semibold sm:text-2xl">{release.title}</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{release.summary}</p>
                  <ul className="mt-5 grid gap-2.5">
                    {release.entries.map((entry) => {
                      const meta = kindMeta[entry.kind];
                      return (
                        <li key={entry.text} className="surface-card flex items-start gap-3 p-3.5">
                          <span
                            className={cn(
                              "mt-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
                              meta.className,
                            )}
                          >
                            <meta.icon className="h-3 w-3" />
                            {meta.label}
                          </span>
                          <span className="text-sm leading-relaxed text-muted-foreground">{entry.text}</span>
                        </li>
                      );
                    })}
                  </ul>
                </article>
              </Reveal>
            ))}
          </div>
        </div>

        <div>
          <SectionHeading
            eyebrow="Roadmap"
            title="What we're building next"
            description="Rough order, not a promise. Icon requests and votes move things up the list."
          />
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {[
              "Icon font export with ligature naming",
              "Per-collection webhooks for CI pipelines",
              "Animated icon set support (Lottie + SVG SMIL)",
              "Self-hosted mirror for air-gapped teams",
            ].map((item, i) => (
              <Reveal key={item} as="li" delay={i * 40} className="surface-card flex items-center gap-3 p-4">
                <Rocket className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-sm text-muted-foreground">{item}</span>
              </Reveal>
            ))}
          </ul>
        </div>

        <CTABand
          title="Never miss a release"
          body="Turn on release notifications and we'll tell you when a set you use ships new icons."
          primary={{ label: "Manage notifications", to: "/notifications" }}
          secondary={{ label: "Browse the vault", to: "/app" }}
        />
      </Stack>
    </PageShell>
  );
}
