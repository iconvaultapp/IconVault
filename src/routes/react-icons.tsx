// /react-icons - GEO landing page (Sameer 2026-10-24): a genuine,
// content-first entry page for "React icons" searches. Distinct from the
// /blog/react-svg-icons article: this page is a practical guide to using
// icons in React (packages, copy-as-component, props, performance) with
// links into the live app and tools.
import { createFileRoute, Link } from "@tanstack/react-router";
import PageShell from "@/components/PageShell";

const FAQ = [
  {
    q: "What is the easiest way to add icons to a React app?",
    a: "Install one icon package, such as lucide-react, and import only the icons you use: import { Home } from 'lucide-react'. For a single icon, or an icon from a set without a React package, copy it as a component from IconVault and paste it into your project.",
  },
  {
    q: "Should I use lucide-react, react-icons or inline SVG components?",
    a: "Use a package when your whole product shares one set: lucide-react for Lucide, @tabler/icons-react for Tabler, @phosphor-icons/react for Phosphor. Use react-icons when you need many sets behind one API. Use inline SVG components when you need full control over paths, animation or a custom icon no package ships.",
  },
  {
    q: "How do I change an icon's size and colour in React?",
    a: "Library components accept size and colour props, and most default to currentColor, so they inherit the surrounding text colour. In inline SVG components, set width and height attributes and use fill or stroke set to currentColor for the same behaviour.",
  },
  {
    q: "Do React icon packages hurt bundle size?",
    a: "Only if you import carelessly. Import named icons from the package, never the whole library, and your bundler tree-shakes the rest. Importing an entire set for a handful of icons is the one mistake that actually bloats a bundle.",
  },
  {
    q: "Are React icons free for commercial use?",
    a: "The sets behind the main React packages are free under permissive licences: Lucide is ISC, Tabler and Heroicons are MIT, Phosphor is MIT. Creative Commons sets need attribution, so check the licence of any set you ship.",
  },
];

const PACKAGES = [
  { name: "lucide-react", set: "Lucide", count: "2,144", licence: "ISC", note: "The default in shadcn/ui. Clean 2px outlines, one consistent API." },
  { name: "@tabler/icons-react", set: "Tabler Icons", count: "6,462", licence: "MIT", note: "The coverage pick. Huge 24px outline set for admin and data products." },
  { name: "@phosphor-icons/react", set: "Phosphor", count: "9,198", licence: "MIT", note: "Six weights plus duotone, so active and inactive states stay in one family." },
  { name: "react-icons", set: "Many sets", count: "Many", licence: "Varies", note: "One API over many libraries. Convenient, but mind the bundle and the licences." },
];

export const Route = createFileRoute("/react-icons")({
  head: () => ({
    meta: [
      { title: "Free React Icons - Lucide, Tabler, Phosphor Components | IconVault" },
      {
        name: "description",
        content:
          "Free React icons from Lucide, Tabler, Phosphor and more. Copy any of 421,020 icons as a React component, convert SVG to JSX, and ship without signup.",
      },
      { name: "keywords", content: "React icons, lucide-react, tabler icons react, SVG to JSX, free icons for React" },
      { property: "og:title", content: "Free React Icons | IconVault" },
      {
        property: "og:description",
        content: "Copy any of 421,020 icons as a React component, or convert SVG to JSX in one click.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://iconvault.site/react-icons" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/react-icons" }],
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
            { "@type": "ListItem", position: 2, name: "React Icons", item: "https://iconvault.site/react-icons" },
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
        Free React Icons, Ready as Components
      </h1>
      <p className="mt-4 max-w-3xl leading-relaxed text-muted-foreground">
        React has no built-in icon story, so teams usually pick one of three paths: install a package
        for one set, use a multi-set wrapper, or paste inline SVG components. IconVault supports all
        three. Search <strong className="text-foreground">421,020 icons</strong> from 239 sets, then
        copy any icon as a React component, or convert your own SVG with the{" "}
        <Link to="/tools/svg-to-jsx" className="font-medium text-primary underline-offset-4 hover:underline">SVG to JSX converter</Link>.
      </p>

      <h2 className="mt-12 font-display text-2xl font-semibold tracking-tight">
        React packages for the major free sets
      </h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {PACKAGES.map((p) => (
          <div key={p.name} className="surface-card p-5">
            <span className="flex items-baseline justify-between gap-2">
              <span className="font-display font-semibold tracking-tight">{p.name}</span>
              <span className="text-sm text-muted-foreground">{p.count} · {p.licence}</span>
            </span>
            <span className="mt-2 block text-sm leading-relaxed text-muted-foreground">{p.note}</span>
          </div>
        ))}
      </div>
      <p className="mt-4 max-w-3xl leading-relaxed text-muted-foreground">
        Start with one package and one set. Mixing Lucide outlines with filled Material icons in the
        same toolbar is the fastest way to make an interface look assembled instead of designed.
      </p>

      <h2 className="mt-12 font-display text-2xl font-semibold tracking-tight">
        Copy any icon as a React component
      </h2>
      <ol className="mt-4 max-w-3xl list-decimal space-y-2 pl-6 leading-relaxed text-muted-foreground">
        <li>
          Search the icon in the <Link to="/app" className="font-medium text-primary underline-offset-4 hover:underline">IconVault app</Link>,
          for example search, settings or download.
        </li>
        <li>Open the icon page and set a colour if you need one.</li>
        <li>Choose copy as component, paste it into your project, and use it like any other component.</li>
        <li>
          Already have an SVG file? Paste it into the{" "}
          <Link to="/tools/svg-to-jsx" className="font-medium text-primary underline-offset-4 hover:underline">SVG to JSX converter</Link>{" "}
          to get a clean component with props for size and colour.
        </li>
      </ol>

      <h2 className="mt-12 font-display text-2xl font-semibold tracking-tight">
        Props, theming and performance
      </h2>
      <ul className="mt-4 max-w-3xl list-disc space-y-2 pl-6 leading-relaxed text-muted-foreground">
        <li>
          <strong className="text-foreground">Props:</strong> library components take size and colour
          props. Prefer currentColor so icons follow text colour automatically, including in dark mode.
        </li>
        <li>
          <strong className="text-foreground">Consistency:</strong> wrap library icons in one small
          internal component that fixes the default size and stroke. When the design system changes,
          one file absorbs it.
        </li>
        <li>
          <strong className="text-foreground">Bundle size:</strong> import named icons only. Never
          import a whole set for a handful of icons; that is the one mistake that bloats a bundle.
        </li>
        <li>
          <strong className="text-foreground">Accessibility:</strong> decorative icons get aria-hidden.
          Meaningful icons get an accessible label, the same rule as any other UI element.
        </li>
        <li>
          <strong className="text-foreground">Small sizes:</strong> test icons at 16 pixels, not just
          24. Fine details turn to grey mush when shrunk, which is why sets drawn on a strict grid win.
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
        Want the full React guide, including the wrapper-component pattern? Read{" "}
        <Link to="/blog/$slug" params={{ slug: "react-svg-icons" }} className="font-medium text-primary underline-offset-4 hover:underline">
          React SVG Icons
        </Link>
        , or browse every set in the{" "}
        <Link to="/app" className="font-medium text-primary underline-offset-4 hover:underline">IconVault app</Link>.
      </p>
    </PageShell>
  );
}

export default Page;
