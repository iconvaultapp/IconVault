// /free-svg-icons - GEO landing page (Sameer 2026-10-24): a genuine,
// content-first entry page for "free SVG icons" searches. Not a copy of
// /categories or /libraries: this page explains what SVG icons are, how
// licences work, which sets to pick, and how to download and customize
// them on IconVault, with links into the live app.
import { createFileRoute, Link } from "@tanstack/react-router";
import PageShell from "@/components/PageShell";

const FAQ = [
  {
    q: "Are free SVG icons really free for commercial use?",
    a: "Most of them are. Sets under MIT, ISC and Apache-2.0 licences can be used in paid products without royalties. Sets under Creative Commons licences such as CC BY 4.0 require visible attribution. Always read the licence in the set's repository and keep a copy with your project records.",
  },
  {
    q: "What is an SVG icon?",
    a: "An SVG icon is a small vector drawing described in code rather than pixels. It scales to any size without blurring, inherits colour from CSS, and usually weighs under a kilobyte. That is why SVG replaced icon fonts as the default for modern websites and apps.",
  },
  {
    q: "How do I download a free SVG icon from IconVault?",
    a: "Search the icon in the IconVault app, open it, and download the SVG in one click. No account is needed for the basics. You can also copy it as a React component, export it as PNG, or add it to a sprite sheet.",
  },
  {
    q: "Can I recolour an SVG icon to my brand colour?",
    a: "Yes. Icons drawn with currentColor or a single stroke colour take their colour from CSS, so one class change recolours the whole set. IconVault's icon page lets you set a colour before downloading, and multi-colour icons keep their artwork intact.",
  },
  {
    q: "SVG icons or icon fonts, which should I use?",
    a: "SVG icons are the better default. They align precisely with text, support multiple tones, inherit CSS colour, and behave better for accessibility. Icon fonts still work in legacy projects, but they offer less styling control and fail less gracefully when a font file does not load.",
  },
];

const SETS = [
  { name: "Lucide", count: "2,144", licence: "ISC", set: "lucide", note: "The balanced default, and the default set in shadcn/ui." },
  { name: "Tabler Icons", count: "6,462", licence: "MIT", set: "tabler", note: "Huge, consistent 24px outline coverage for admin and data products." },
  { name: "Phosphor", count: "9,198", licence: "MIT", set: "ph", note: "Six weights plus duotone in one family, for state and emphasis." },
  { name: "Heroicons", count: "1,297", licence: "MIT", set: "heroicons", note: "Small but beautifully drawn, made by the Tailwind CSS team." },
  { name: "Material Symbols", count: "24,569", licence: "Apache-2.0", set: "material-symbols", note: "Google's system icons in outline, rounded and sharp styles." },
  { name: "Bootstrap Icons", count: "2,090", licence: "MIT", set: "bi", note: "The safe pick if your UI already speaks Bootstrap." },
  { name: "Solar", count: "8,682", licence: "CC BY 4.0", set: "solar", note: "Bold and duotone styles for modern dashboards. Attribution required." },
];

export const Route = createFileRoute("/free-svg-icons")({
  head: () => ({
    meta: [
      { title: "Free SVG Icons - Download 421,020 Open-Source Icons | IconVault" },
      {
        name: "description",
        content:
          "Download free SVG icons for websites, apps and UI design. 421,020 open-source icons from 239 sets, one-click SVG and PNG downloads, no signup needed.",
      },
      { name: "keywords", content: "free SVG icons, SVG icons download, open-source icons, Lucide, Tabler, Phosphor" },
      { property: "og:title", content: "Free SVG Icons | IconVault" },
      {
        property: "og:description",
        content: "421,020 free open-source SVG icons from 239 sets. Search, customize and download in one click.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://iconvault.site/free-svg-icons" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/free-svg-icons" }],
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
            { "@type": "ListItem", position: 2, name: "Free SVG Icons", item: "https://iconvault.site/free-svg-icons" },
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
        Free SVG Icons for Websites, Apps and UI Design
      </h1>
      <p className="mt-4 max-w-3xl leading-relaxed text-muted-foreground">
        IconVault indexes <strong className="text-foreground">421,020 free SVG icons</strong> from{" "}
        <strong className="text-foreground">239 open-source sets</strong>. Search them all from one
        box, customize colour and size, and download the SVG in one click. No account is needed for
        the basics, and the icons are free for personal and commercial use under their own licences.
      </p>

      <h2 className="mt-12 font-display text-2xl font-semibold tracking-tight">
        How to download a free SVG icon
      </h2>
      <ol className="mt-4 max-w-3xl list-decimal space-y-2 pl-6 leading-relaxed text-muted-foreground">
        <li>
          Open the <Link to="/app" className="font-medium text-primary underline-offset-4 hover:underline">IconVault app</Link> and
          search by name, for example home, settings, download or cart.
        </li>
        <li>Pick a set from the results, or filter by one library if your design system already uses it.</li>
        <li>Set a colour on the icon page, then download the SVG, copy it as a component, or export it as PNG.</li>
        <li>
          For bulk work, save favourites and use bulk export, or build a sprite sheet with the{" "}
          <Link to="/tools/svg-sprite-generator" className="font-medium text-primary underline-offset-4 hover:underline">SVG sprite generator</Link>.
        </li>
      </ol>

      <h2 className="mt-12 font-display text-2xl font-semibold tracking-tight">
        Popular free icon sets, with real counts and licences
      </h2>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        Counts are the live IconVault index figures. Licence is what decides whether you must add a
        credit: MIT, ISC and Apache-2.0 sets need none, CC BY sets do.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {SETS.map((s) => (
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
        Free does not mean licence-free
      </h2>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        Every set on IconVault keeps its own licence, shown on its library page. Permissive licences
        (MIT, ISC, Apache-2.0) let you ship icons in paid products without royalties or attribution.
        Creative Commons sets, such as Solar under CC BY 4.0, require a visible credit. If you plan to
        redistribute the icons themselves, for example inside a template you sell, read the licence
        text first rather than assuming the download button settles it.
      </p>

      <h2 className="mt-12 font-display text-2xl font-semibold tracking-tight">
        Customize before you download
      </h2>
      <ul className="mt-4 max-w-3xl list-disc space-y-2 pl-6 leading-relaxed text-muted-foreground">
        <li>Recolour any icon to your brand colour on its page before downloading.</li>
        <li>
          Export as PNG at the size you need with the{" "}
          <Link to="/tools/svg-to-png" className="font-medium text-primary underline-offset-4 hover:underline">SVG to PNG tool</Link>,
          or shrink files first with the{" "}
          <Link to="/tools/svg-optimizer" className="font-medium text-primary underline-offset-4 hover:underline">SVG optimizer</Link>.
        </li>
        <li>
          Browse by topic instead of by library in the{" "}
          <Link to="/categories" className="font-medium text-primary underline-offset-4 hover:underline">215 categories</Link>,
          from arrows and files to weather and commerce.
        </li>
        <li>
          Need pictures, not icons? The{" "}
          <Link to="/illustrations" search={{ open: undefined }} className="font-medium text-primary underline-offset-4 hover:underline">386 free illustrations</Link>{" "}
          recolour the same way.
        </li>
      </ul>

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
        Still deciding between sets? Read the full comparison in{" "}
        <Link to="/blog/$slug" params={{ slug: "best-free-svg-icon-libraries-2026" }} className="font-medium text-primary underline-offset-4 hover:underline">
          Best Free SVG Icon Libraries in 2026
        </Link>
        , or start searching now in the{" "}
        <Link to="/app" className="font-medium text-primary underline-offset-4 hover:underline">IconVault app</Link>.
      </p>
    </PageShell>
  );
}

export default Page;
