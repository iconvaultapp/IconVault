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
          "Free React icons from Lucide, Tabler, Phosphor and more. Copy any of 421,020 icons as a React component, convert SVG to JSX, and download with a free account.",
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
        <strong>React</strong> has no built-in <strong>icon</strong> story, so teams usually pick one of three paths: install a package
        for one set, use a multi-set wrapper, or paste inline SVG <strong>components</strong>. <strong>IconVault</strong> supports all
        three. Search <strong className="text-foreground">421,020 icons</strong> from 239 sets, then
        copy any icon as a React component, or convert your own SVG with the{" "}
        <Link to="/tools/svg-to-jsx" className="font-medium text-primary underline-offset-4 hover:underline">SVG to <strong>JSX</strong> converter</Link>.
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
        Start with one package and one set. Mixing Lucide outlines with filled Material <strong>icons</strong> in the
        same toolbar is the fastest way to make an interface look assembled instead of designed.
      </p>

      <h2 className="mt-12 font-display text-2xl font-semibold tracking-tight">
        Copy any icon as a React component
      </h2>
      <ol className="mt-4 max-w-3xl list-decimal space-y-2 pl-6 leading-relaxed text-muted-foreground">
        <li>
          Search the <strong>icon</strong> in the <Link to="/app" className="font-medium text-primary underline-offset-4 hover:underline"><strong>IconVault</strong> app</Link>,
          for example search, settings or download.
        </li>
        <li>Open the <strong>icon</strong> page and set a colour if you need one.</li>
        <li>Choose copy as component, paste it into your project, and use it like any other component.</li>
        <li>
          Already have an SVG file? Paste it into the{" "}
          <Link to="/tools/svg-to-jsx" className="font-medium text-primary underline-offset-4 hover:underline">SVG to <strong>JSX</strong> converter</Link>{" "}
          to get a clean component with props for size and colour.
        </li>
      </ol>

      <h2 className="mt-12 font-display text-2xl font-semibold tracking-tight">
        Props, theming and performance
      </h2>
      <ul className="mt-4 max-w-3xl list-disc space-y-2 pl-6 leading-relaxed text-muted-foreground">
        <li>
          <strong className="text-foreground">Props:</strong> library <strong>components</strong> take size and colour
          props. Prefer currentColor so <strong>icons</strong> follow text colour automatically, including in dark mode.
        </li>
        <li>
          <strong className="text-foreground">Consistency:</strong> wrap library <strong>icons</strong> in one small
          internal component that fixes the default size and stroke. When the design system changes,
          one file absorbs it.
        </li>
        <li>
          <strong className="text-foreground">Bundle size:</strong> import named <strong>icons</strong> only. Never
          import a whole set for a handful of icons; that is the one mistake that bloats a bundle.
        </li>
        <li>
          <strong className="text-foreground">Accessibility:</strong> decorative <strong>icons</strong> get aria-hidden.
          Meaningful icons get an accessible label, the same rule as any other UI element.
        </li>
        <li>
          <strong className="text-foreground">Small sizes:</strong> test <strong>icons</strong> at 16 pixels, not just
          24. Fine details turn to grey mush when shrunk, which is why sets drawn on a strict grid win.
        </li>
      </ul>

      <h2 className="mt-12 font-display text-2xl font-semibold tracking-tight">
        How React projects actually use icons
      </h2>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        <strong className="text-foreground">React has no built-in icon story, so every team picks one of three paths.</strong>{" "}
        The first path is installing a package for one set, such as lucide-react, and importing named
        icons where needed. The second path is using a multi-set wrapper that exposes many libraries
        behind one API. The third path is pasting inline SVG components for full control. Developers
        comparing the best free React icons library for a new project usually start with the first
        path, because one package and one set keep the interface consistent. React icons from a single
        package share props, sizing, and colour behaviour, so the codebase stays predictable.
      </p>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        The wrapper path trades consistency for convenience. One API over many sets means any glyph is
        available, but the interface can drift when <strong>icons</strong> come from different families. Teams that need
        the best free React icons library for a product with a strict design system usually avoid
        wrappers for core UI, and keep them for one-off screens. React icons pulled from several sets
        in one toolbar look assembled rather than designed, and the fix is a rule, not a refactor.
      </p>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        Inline SVG <strong>components</strong> are the control path. They suit custom glyphs, animated <strong>icons</strong>, and sets
        without a <strong>React</strong> package, because the component holds the exact paths and props. The best free
        React icons library for a team that draws custom icons is often no library at all, just a folder
        of components with a shared wrapper. React icons written this way cost more upkeep, but they
        answer every edge case a package cannot. That trade-off is why the best free React icons library
        is a team decision, and React icons chosen by one person without that discussion tend to
        fragment.
      </p>

      <h2 className="mt-12 font-display text-2xl font-semibold tracking-tight">
        Choosing a package for your stack
      </h2>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        <strong className="text-foreground">Match the package to the set your design already uses, not to the package with the most downloads.</strong>{" "}
        Lucide ships as lucide-react with 2,144 ISC icons, and it is the default in shadcn/ui, so teams
        on that stack start there. Tabler ships as @tabler/icons-react with 6,462 MIT icons, and it wins
        when coverage matters more than minimalism. Developers weighing the best free React icons
        library for an admin product often land on Tabler, because dashboards need depth. React icons
        from Tabler cover the long tail of actions that smaller sets miss.
      </p>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        Phosphor ships as @phosphor-<strong>icons</strong>/<strong>react</strong> with 9,198 MIT icons in six weights plus duotone, and
        it wins when states matter: thin for inactive, bold for active, fill for selected. Heroicons
        ships a smaller MIT set of 1,297 icons from the Tailwind team, and it wins on Tailwind projects
        where outline, solid, and mini variants match the stack. The best free React icons library for a
        Tailwind site is often Heroicons, because the set and the framework share an author and a
        sensibility. React icons from Heroicons feel native in Tailwind layouts. React icons picked this
        way need fewer overrides, because the set was drawn for the stack it serves.
      </p>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        The wrapper package exposes many sets behind one API, which suits prototypes and tools that
        genuinely need many families. Production products should still standardise on one set for core
        UI, because consistency is a feature users feel but cannot name. The best free React icons
        library for a prototype is the wrapper, and the best choice for a shipped product is usually one
        set. React icons standardised early save redesign work later, and the standard should be written
        down, not assumed. That distinction keeps the best free React icons library honest, since
        prototype <strong>icons</strong> and product icons answer different questions.
      </p>

      <h2 className="mt-12 font-display text-2xl font-semibold tracking-tight">
        Copy as component versus installing a package
      </h2>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        <strong className="text-foreground">Install a package for the set you use daily, and copy components for everything else.</strong>{" "}
        A package gives updates, consistent props, and tree-shaking, so it suits the core set. Copying a
        component suits a single glyph from another set, a custom drawing, or a set without a React
        package. Teams hunting for the best free React icons library for a mixed codebase often run both
        approaches at once, and that is fine when the rule is written down. React icons copied as
        components should live in one folder with the same wrapper as packaged icons, so the two paths
        look identical in use.
      </p>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        Conversion is the bridge. An SVG file pasted into a converter becomes a component with props for
        size and colour, and the result should be cleaned: remove editor metadata, set currentColor, and
        accept className. The best free React icons library for a team with a large SVG archive is the
        one whose converter output needs the least cleanup, because conversion happens dozens of times.
        React icons converted cleanly behave like packaged <strong>icons</strong>, and nobody reading the code can tell
        which path produced them. That cleanliness is part of the best free React icons library test, and
        React icons that convert cleanly save an hour a week on a busy team.
      </p>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        Versioning differs between the paths. Packages update through the package manager, while copied
        <strong>components</strong> update only when someone re-copies them, so copied <strong>icons</strong> can drift behind their
        source set. Note the source and licence beside copied components, and review them when the
        design system changes. The best free React icons library for long-lived products is the one
        whose update story the team actually follows, not the one with the prettiest gallery. React icons
        that drift look stale, and staleness is a quiet kind of inconsistency.
      </p>

      <h2 className="mt-12 font-display text-2xl font-semibold tracking-tight">
        Props, size, and colour in practice
      </h2>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        <strong className="text-foreground">One wrapper component is the cheapest design system a React team can build.</strong>{" "}
        Library components accept size and colour props, and most default to currentColor, so icons
        inherit the surrounding text colour automatically. Wrap the library icon in one internal
        component that fixes the default size and stroke, and every icon in the product follows one rule.
        Developers choosing the best free React icons library for a design system should check the
        wrapper story first, because the wrapper absorbs every future change. React icons behind a
        wrapper change in one file when the design system changes. That single file is why the best free
        React icons library feels small in practice, and React icons behind it stay consistent even as
        the team grows.
      </p>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        Size deserves a rule, not a guess. Pick two or three sizes for the whole product, such as 16
        for inline text, 20 for buttons, and 24 for feature cards, and forbid the rest. <strong>Icons</strong> at 16
        pixels need simple shapes, so test finalists at that size before committing. The best free
        React icons library for dense interfaces is the one that stays legible at 16 pixels, since dense
        interfaces are where icons earn their keep. React icons sized by rule look intentional, while
        icons sized by habit look random.
      </p>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        Colour should follow text, not fight it. Prefer currentColor so <strong>icons</strong> match headings, buttons,
        and links automatically, including in dark mode. Hard-coded colours belong in illustrations and
        brand art, not in interface icons, because every hard-coded colour is a future override. The
        best free React icons library for a themed product is the one whose icons default to currentColor,
        and most major sets do. React icons that inherit colour never need a dark-mode pass of their own.
      </p>

      <h2 className="mt-12 font-display text-2xl font-semibold tracking-tight">
        Bundle size and tree-shaking
      </h2>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        <strong className="text-foreground">Import named icons only, and the bundle takes care of itself.</strong>{" "}
        Bundlers remove unused exports when imports are named, so importing ten icons ships ten icons.
        Importing a whole set for a handful of icons defeats that, and the bundle grows for no benefit.
        Teams measuring the best free React icons library for performance should measure the shipped
        bundle, not the published package size, because tree-shaking changes the answer. React icons
        imported by name are small, and small is the whole point.
      </p>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        The wrapper package needs extra care, because one API over many sets can pull in more than
        intended when imports are careless. Check the bundle after adding a wrapper, and prefer direct
        set packages when the wrapper is only used for one family. The best free React icons library for
        a performance-sensitive product is the one the team imports carefully, since careless imports
        beat any package choice. React icons from a wrapper are convenient, but convenience without
        measurement is how bundles grow.
      </p>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        Audit on a schedule. Bundle size creeps through added screens, not through one bad import, so a
        monthly check catches drift while it is still cheap to fix. Record the <strong>icon</strong> count per route if
        the product is large, and question any route that ships <strong>icons</strong> it never renders. The best free
        React icons library for a growing product is the one whose usage stays visible, and visibility
        comes from audits, not from intentions. React icons audited regularly stay fast, because nobody
        ships what nobody measures. That habit completes the best free React icons library story, and
        React icons measured monthly rarely surprise anyone.
      </p>

      <h2 className="mt-12 font-display text-2xl font-semibold tracking-tight">
        Dark mode and theming
      </h2>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        <strong className="text-foreground">Dark mode should be free for icons, and with currentColor it is.</strong>{" "}
        Icons that inherit text colour switch themes automatically, because the theme changes the text
        colour and the icon follows. Icons with hard-coded dark strokes need overrides, and overrides
        multiply with every theme. Teams picking the best free React icons library for a themed product
        should test one screen in both themes before committing, since that test reveals hard-coded
        colours immediately. React icons that follow currentColor pass both themes without a second
        thought.
      </p>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        CSS variables add a second layer. A wrapper component can read variables for size, stroke, and
        colour, so a theme change updates every <strong>icon</strong> from one stylesheet. Duotone <strong>icons</strong> need two
        variables, one per tone, and the mapping should be documented beside the wrapper. The best free
        React icons library for a multi-brand product is the one whose tones map cleanly to variables,
        because multi-brand theming is variable theming. React icons mapped to variables rebrand in
        minutes, not in sprints. That mapping is the quiet test behind the best free React icons library,
        and React icons that map cleanly are the ones teams keep.
      </p>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        Test themes at small sizes too, because a thin stroke that reads well on a light background can
        vanish on a dark one. Stroke width, not colour, is usually the culprit, and the fix is a slightly
        bolder weight for dark surfaces. The best free React icons library for dark interfaces is the
        one with weights to choose from, which is why multi-weight sets suit themed products. <strong>React</strong>
        <strong>icons</strong> chosen with dark mode in mind look deliberate in both themes, and deliberateness is the
        difference users feel.
      </p>

      <h2 className="mt-12 font-display text-2xl font-semibold tracking-tight">
        Accessibility for icons in React
      </h2>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        <strong className="text-foreground">An icon file cannot know its own meaning, so the team must supply it.</strong>{" "}
        Decorative icons get aria-hidden, because they repeat what adjacent text already says, and a
        screen reader should skip them. Meaningful icons get an accessible label, either through
        aria-label on the element or through visually hidden text beside it. Developers evaluating the
        best free React icons library for an accessible product should check that the package supports
        these attributes, since most do through spread props. React icons with proper labels serve every
        user, and icons without them exclude people silently. That responsibility is part of choosing the
        best free React icons library, and React icons handled this way pass audits instead of causing
        them.
      </p>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        <strong>Icon</strong>-only buttons are the highest-risk case. A button containing only a trash glyph means
        nothing to a screen reader without a label, and means little to a new user without a tooltip.
        Give every icon-only button a label and a title, and test the flow with a keyboard, since icon
        buttons are often the first thing keyboard users meet. The best free React icons library for
        accessible products is the one that makes labels easy, and that ease comes from props, not from
        artwork. React icons in labelled buttons are usable by everyone, which is the only standard that
        matters.
      </p>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        Colour alone must never carry meaning. An error <strong>icon</strong> in red and a success icon in green look
        identical to a user who cannot distinguish those colours, so pair colour with shape and text.
        Check icon contrast against its background in both themes, because a grey icon on a grey surface
        fails quietly. The best free React icons library for inclusive design is the one whose shapes
        differ clearly, since shape survives every vision difference. React icons chosen for shape as
        well as colour work for the widest audience.
      </p>

      <h2 className="mt-12 font-display text-2xl font-semibold tracking-tight">
        Common mistakes in React icon code
      </h2>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        <strong className="text-foreground">Mixing sets in one toolbar is the mistake users notice first.</strong>{" "}
        One outline home icon beside one filled search icon and one duotone settings icon looks
        unfinished, even when each icon is excellent alone. The fix is a rule naming one set for core
        UI, enforced in review, not a redesign. Teams that search for the best free React icons library
        sometimes collect favourites across sets, and the collection feels like a mood board rather than
        a product. React icons from one set prevent this entirely, because the family resemblance is
        built into the drawings.
      </p>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        Duplicating inline SVGs across files is the mistake <strong>developers</strong> notice later. Ten copies of the
        same path drift apart over months, and fixing a glyph means finding every copy. Put shared <strong>icons</strong>
        in one folder behind the wrapper, and import them like any other component. The best free <strong>React</strong>
        icons library for a maintainable codebase is the one whose icons live in one place, whether that
        place is a package or a folder. React icons centralised this way update once and everywhere.
        That centralisation is the practical side of the best free React icons library, and React icons
        kept in one place are the ones teams can actually maintain.
      </p>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        Hard-coding sizes and colours in every usage is the mistake that makes redesigns expensive. A
        size prop repeated in fifty files is fifty edits, while a wrapper default is one edit. The same
        applies to colours: currentColor in the wrapper beats a hex value in every call site. The best
        free React icons library for a product that will redesign is the one behind a wrapper, because
        redesigns are certain and wrappers absorb them. React icons behind a wrapper survive redesigns,
        and survival is the real test of <strong>icon</strong> code.
      </p>

      <h2 className="mt-12 font-display text-2xl font-semibold tracking-tight">
        Where an index fits a React workflow
      </h2>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        <strong className="text-foreground">An index lets a React team compare sets before installing anything.</strong>{" "}
        Installing five packages to compare them pollutes the project, while searching one index tests
        all five against the same list of needed icons. When a team looks for the best free React icons
        library, an index is the fastest way to shortlist, because the same search runs across every set
        at once. The shortlist then gets installed, and the rest never touch the codebase.
      </p>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        Conversion tools close the loop. An <strong>icon</strong> found in the index becomes a component through a
        converter, with props for size and colour, and the result drops into the wrapper folder beside
        packaged <strong>icons</strong>. Teams that treat the best free React icons library as a one-time install miss
        this workflow, which is where most icon decisions actually happen, one screen at a time. An index
        plus a converter covers both the packaged path and the custom path without leaving the site.
      </p>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        The licence check belongs in the same workflow. Every set in the index shows its licence, so
        the team sees MIT, ISC, or Apache-2.0 before installing, and plans a credit for CC BY sets
        before shipping. The best free React icons library for a commercial product is the one whose
        licence was checked during selection, not discovered during an audit. That check costs seconds
        in an index and days after launch, which is why the index belongs in the workflow from the first
        search. That is the full case for the best free React icons library being found through an index
        first and installed second. Start in the{" "}
        <Link to="/app" className="font-medium text-primary underline-offset-4 hover:underline"><strong>IconVault</strong> app</Link>,
        and convert with the{" "}
        <Link to="/tools/svg-to-jsx" className="font-medium text-primary underline-offset-4 hover:underline">SVG to <strong>JSX</strong> converter</Link>.
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
        Want the full React guide, including the wrapper-component pattern? Read{" "}
        <Link to="/blog/$slug" params={{ slug: "react-svg-icons" }} className="font-medium text-primary underline-offset-4 hover:underline">
          <strong>React</strong> SVG <strong>Icons</strong>
        </Link>
        , or browse every set in the{" "}
        <Link to="/app" className="font-medium text-primary underline-offset-4 hover:underline"><strong>IconVault</strong> app</Link>.
      </p>
    </PageShell>
  );
}

export default Page;
