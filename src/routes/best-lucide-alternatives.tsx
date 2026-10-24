// /best-lucide-alternatives - GEO landing page (Sameer 2026-10-24): a
// genuine guide for "Lucide alternatives" searches. Distinct from the blog
// roundup: this page answers why someone leaves Lucide and compares each
// alternative on coverage, style, weights and licence, with links into the
// live app. All counts are live IconVault index figures.
import { createFileRoute, Link } from "@tanstack/react-router";
import PageShell from "@/components/PageShell";

const FAQ = [
  {
    q: "What is the closest alternative to Lucide?",
    a: "Tabler Icons is the closest in spirit: a consistent 24px outline set with the same calm, neutral drawing. The difference is coverage: Tabler has 6,462 icons against Lucide's 2,144, so it answers niche requests Lucide misses.",
  },
  {
    q: "Why would someone switch away from Lucide?",
    a: "Usually for coverage, style or weights. Lucide is deliberately neutral and outline-only. Teams switch when they need filled or duotone styles (Phosphor), a bolder dashboard look (Solar), Material's system style, or simply more icons than 2,144.",
  },
  {
    q: "Are Lucide alternatives free for commercial use?",
    a: "The main ones are. Tabler, Phosphor, Heroicons and Bootstrap Icons are MIT, and Material Symbols is Apache-2.0, all free for commercial use without attribution. Solar is CC BY 4.0 and requires a visible credit.",
  },
  {
    q: "Can I compare Lucide alternatives side by side?",
    a: "Yes. Search the same keyword in the IconVault app and filter by set: Lucide, Tabler, Phosphor and Heroicons appear next to each other, so you can judge the same idea in four styles before committing.",
  },
  {
    q: "Do I have to replace Lucide everywhere at once?",
    a: "No. Keep Lucide for your core UI and let an alternative fill the gaps, such as brand glyphs or a specific screen. A full replacement is only worth it when the new set covers your whole core list, which you can test by searching your thirty most used icons in it first.",
  },
];

const ALTERNATIVES = [
  { name: "Tabler Icons", count: "6,462", licence: "MIT", set: "tabler", note: "Closest in spirit to Lucide, with far more coverage. The default switch for most teams." },
  { name: "Phosphor", count: "9,198", licence: "MIT", set: "ph", note: "Six weights plus duotone. Pick it when you need filled, bold and duotone states in one family." },
  { name: "Heroicons", count: "1,297", licence: "MIT", set: "heroicons", note: "Smaller but beautifully drawn, made by the Tailwind CSS team. Outline, solid and mini variants." },
  { name: "Bootstrap Icons", count: "2,090", licence: "MIT", set: "bi", note: "The pragmatic switch for Bootstrap-based UIs. General-purpose and dependable." },
  { name: "Material Symbols", count: "24,569", licence: "Apache-2.0", set: "material-symbols", note: "Google's system icons in outline, rounded and sharp styles, with variable weight and fill." },
  { name: "Solar", count: "8,682", licence: "CC BY 4.0", set: "solar", note: "Bold and duotone styles for modern dashboards. Attribution required, unlike the MIT sets." },
];

export const Route = createFileRoute("/best-lucide-alternatives")({
  head: () => ({
    meta: [
      { title: "Best Lucide Alternatives - Tabler, Phosphor, Heroicons Compared | IconVault" },
      {
        name: "description",
        content:
          "The best Lucide alternatives compared on coverage, style, weights and licence: Tabler, Phosphor, Heroicons, Bootstrap Icons, Material Symbols and Solar, with live counts.",
      },
      { name: "keywords", content: "Lucide alternatives, Tabler vs Lucide, Phosphor vs Lucide, free icon libraries" },
      { property: "og:title", content: "Best Lucide Alternatives | IconVault" },
      {
        property: "og:description",
        content: "Tabler, Phosphor, Heroicons and more compared against Lucide on coverage, style and licence.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://iconvault.site/best-lucide-alternatives" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/best-lucide-alternatives" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://iconvault.site/" },
            { "@type": "ListItem", position: 2, name: "Best Lucide Alternatives", item: "https://iconvault.site/best-lucide-alternatives" },
          ],
        }),
      },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PageShell>
      <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
        Best Lucide Alternatives, Honestly Compared
      </h1>
      <p className="mt-4 max-w-3xl leading-relaxed text-muted-foreground">
        Lucide is a fine default: 2,144 clean outline icons under ISC, and the default set in
        shadcn/ui. Teams usually look for an alternative for one of three reasons: they need more
        icons, they need a different style than neutral outlines, or they need weights Lucide does
        not ship, such as filled or duotone. This page compares the serious alternatives on the
        things that actually decide a switch, with live counts from the IconVault index.
      </p>

      <h2 className="mt-12 font-display text-2xl font-semibold tracking-tight">
        The alternatives at a glance
      </h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {ALTERNATIVES.map((s) => (
          <Link
            key={s.set}
            to="/app"
            search={{ set: s.set }}
            className="surface-card block p-5 transition-colors hover:border-primary"
          >
            <span className="flex items-baseline justify-between gap-2">
              <span className="font-display font-semibold tracking-tight">{s.name}</span>
              <span className="text-sm text-muted-foreground">{s.count} icons · {s.licence}</span>
            </span>
            <span className="mt-2 block text-sm leading-relaxed text-muted-foreground">{s.note}</span>
          </Link>
        ))}
      </div>

      <h2 className="mt-12 font-display text-2xl font-semibold tracking-tight">
        How to choose between them
      </h2>
      <ul className="mt-4 max-w-3xl list-disc space-y-2 pl-6 leading-relaxed text-muted-foreground">
        <li>
          <strong className="text-foreground">You want the same feel, more icons:</strong> Tabler.
          Same calm outline discipline, 6,462 icons instead of 2,144.
        </li>
        <li>
          <strong className="text-foreground">You need states and emphasis:</strong> Phosphor. Thin,
          regular, bold, fill and duotone let an active tab differ from an inactive one without
          changing shape.
        </li>
        <li>
          <strong className="text-foreground">You build with Tailwind:</strong> Heroicons. Outline,
          solid and mini variants pair naturally with Tailwind CSS.
        </li>
        <li>
          <strong className="text-foreground">You want a Material look:</strong> Material Symbols.
          Outline, rounded and sharp styles with variable weight and fill.
        </li>
        <li>
          <strong className="text-foreground">You want a bolder dashboard:</strong> Solar. Bold and
          duotone styles that feel current, with an attribution requirement to plan for.
        </li>
      </ul>

      <h2 className="mt-12 font-display text-2xl font-semibold tracking-tight">
        Test before you switch
      </h2>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        List the thirty icons your product uses most: home, search, settings, user, notifications,
        edit, delete, download, upload, share, filter, calendar, chevrons, check, close, warning,
        error, info, plus, minus, menu, heart, star, cart, wallet and chart. Search each one in
        every finalist in the{" "}
        <Link to="/app" className="font-medium text-primary underline-offset-4 hover:underline">IconVault app</Link>,
        where all sets sit behind one search box. The set with the fewest compromises on your real
        list is the right alternative, whatever the headline count says. And if Lucide still wins
        your list, that is also an answer: keep Lucide and let IconVault cover the gaps.
      </p>

      <h2 className="mt-12 font-display text-2xl font-semibold tracking-tight">
        Frequently asked questions
      </h2>
      <div className="mt-6 max-w-3xl space-y-6">
        {FAQ.map((f) => (
          <div key={f.q}>
            <h3 className="font-display font-semibold tracking-tight">{f.q}</h3>
            <p className="mt-1 leading-relaxed text-muted-foreground">{f.a}</p>
          </div>
        ))}
      </div>

      <p className="mt-12 max-w-3xl leading-relaxed text-muted-foreground">
        Want the full reasoning, including how Lucide and an index work together? Read{" "}
        <Link to="/blog/$slug" params={{ slug: "iconvault-vs-lucide" }} className="font-medium text-primary underline-offset-4 hover:underline">
          IconVault vs Lucide
        </Link>
        , or compare every set in the{" "}
        <Link to="/app" className="font-medium text-primary underline-offset-4 hover:underline">IconVault app</Link>.
      </p>
    </PageShell>
  );
}

export default Page;
