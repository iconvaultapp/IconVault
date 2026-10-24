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
        <strong>Lucide</strong> is a fine default: 2,144 clean outline <strong>icons</strong> under ISC, and the default set in
        shadcn/ui. Teams usually look for an alternative for one of three reasons: they need more
        icons, they need a different style than neutral outlines, or they need weights Lucide does
        not ship, such as filled or duotone. This page compares the serious alternatives on the
        things that actually decide a switch, with live counts from the <strong>IconVault</strong> index.
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
          <strong className="text-foreground">You want the same feel, more icons:</strong> <strong>Tabler</strong>.
          Same calm outline discipline, 6,462 <strong>icons</strong> instead of 2,144.
        </li>
        <li>
          <strong className="text-foreground">You need states and emphasis:</strong> <strong>Phosphor</strong>. Thin,
          regular, bold, fill and duotone let an active tab differ from an inactive one without
          changing shape.
        </li>
        <li>
          <strong className="text-foreground">You build with Tailwind:</strong> <strong>Heroicons</strong>. Outline,
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
        <Link to="/app" className="font-medium text-primary underline-offset-4 hover:underline"><strong>IconVault</strong> app</Link>,
        where all sets sit behind one search box. The set with the fewest compromises on your real
        list is the right alternative, whatever the headline count says. And if <strong>Lucide</strong> still wins
        your list, that is also an answer: keep Lucide and let <strong>IconVault</strong> cover the gaps.
      </p>

      <h2 className="mt-12 font-display text-2xl font-semibold tracking-tight">
        Why teams look beyond Lucide
      </h2>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        <strong className="text-foreground">Teams leave Lucide for coverage, weights, or style, rarely for quality.</strong>{" "}
        Lucide is a fine default: 2,144 clean outline icons under ISC, and the default set in
        shadcn/ui. The first reason teams search for alternatives is coverage: a dashboard or admin
        product eventually needs a glyph Lucide does not ship, and the search for that glyph starts the
        comparison. Developers comparing the best Lucide alternatives for React usually arrive with a
        short list of missing icons, not with a complaint about Lucide itself. Lucide alternatives that
        cover those gaps without changing the visual language win the comparison.
      </p>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        The second reason is weights. <strong>Lucide</strong> is outline-only by design, so active states, emphasis, and
        selection must be shown through colour or size rather than through a bolder or filled variant.
        <strong>Phosphor</strong> answers this with six weights plus duotone, and Solar answers it with bold and
        duotone styles. The best Lucide alternatives for React for a product with rich states are the
        ones that give designers a filled variant for selected items. Lucide alternatives with weights
        let an interface show state through shape, which survives colour-blindness and grey printing.
      </p>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        The third reason is style. <strong>Lucide</strong> is deliberately neutral, which suits SaaS dashboards and
        developer tools, but a consumer product or a brand-heavy site may want a warmer or bolder voice.
        Material Symbols bring a system look, <strong>Heroicons</strong> bring a crafted minimalism, and Solar brings a
        current boldness. The best Lucide alternatives for React for a brand-led product are the ones
        whose voice matches the brand, since <strong>icons</strong> are part of the brand. Lucide alternatives chosen for
        style should still pass the coverage test, because a beautiful set with gaps creates the same
        problem it was hired to solve. That double test is what makes the best Lucide alternatives for
        <strong>React</strong> worth the search, and Lucide alternatives that pass both tests rarely disappoint.
      </p>

      <h2 className="mt-12 font-display text-2xl font-semibold tracking-tight">
        Tabler against Lucide in detail
      </h2>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        <strong className="text-foreground">Tabler is the closest switch, because it keeps the calm outline discipline and triples the coverage.</strong>{" "}
        Tabler ships 6,462 MIT icons against Lucide 2,144 ISC icons, and both draw on a 24px grid with
        a 2px stroke, so a mixed toolbar still looks coherent during migration. Teams that evaluate the
        best Lucide alternatives for React for a dashboard usually shortlist Tabler first, because
        dashboards punish gaps more than any other surface. Lucide alternatives do not get closer than
        Tabler in spirit, and that closeness is why migration feels safe.
      </p>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        The practical difference is the long tail. Niche actions, file types, chart variants, and device
        glyphs exist in <strong>Tabler</strong> where <strong>Lucide</strong> stays silent, and each missing glyph in Lucide is either a
        custom drawing or a borrowed style. The best Lucide alternatives for React for a data-heavy
        product are the ones that answer the long tail, since data products live in the long tail. Lucide
        alternatives with deep coverage reduce custom drawing, and custom drawing is the most expensive
        <strong>icon</strong> a team can own. That depth is the core argument for the best Lucide alternatives for React
        in data products, and Lucide alternatives with depth age better than sets chosen for one screen.
      </p>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        Migration from <strong>Lucide</strong> to <strong>Tabler</strong> is mostly a rename exercise, since the naming overlaps heavily
        and the visual language matches. Keep the wrapper component, swap the underlying imports, and
        review screens where a glyph changed meaning. The best Lucide alternatives for React for a
        low-risk migration are the ones that look like the set they replace, and Tabler looks like Lucide
        with more answers. Lucide alternatives chosen for migration safety should still be tested at 16
        pixels, because small-size legibility is where lookalike sets diverge.
      </p>

      <h2 className="mt-12 font-display text-2xl font-semibold tracking-tight">
        Phosphor against Lucide in detail
      </h2>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        <strong className="text-foreground">Phosphor wins when one icon must say several things through weight alone.</strong>{" "}
        Phosphor ships 9,198 MIT icons in thin, light, regular, bold, fill, and duotone weights, so an
        inactive tab can be thin, an active tab bold, and a selected item filled, all without changing
        shape. Products that compare the best Lucide alternatives for React for state-rich interfaces
        usually land on Phosphor, because states are the interface. Lucide alternatives with weights turn
        state into a design tool instead of a colour hack. That state story is why the best Lucide
        alternatives for React so often include Phosphor, and Lucide alternatives that handle states well
        keep interfaces honest.
      </p>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        Duotone deserves its own test. Two-tone <strong>icons</strong> carry a primary tone and a secondary tone, and
        <strong>Phosphor</strong> exposes both, so a brand can map them to its palette. Test duotone at small sizes
        before committing, since the secondary tone can vanish at 16 pixels on dense screens. The best
        Lucide alternatives for <strong>React</strong> for a polished product are the ones whose duotone survives small
        sizes, because polish fails first where pixels are fewest. Lucide alternatives with duotone
        should be judged at the smallest size they will ship, not at gallery size.
      </p>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        The cost of <strong>Phosphor</strong> is choice. Six weights per <strong>icon</strong> mean six decisions, and teams without a
        weight rule drift into mixing weights for decoration rather than meaning. Write the rule down:
        thin for inactive, regular for default, bold for active, fill for selected, and duotone for
        feature art. The best Lucide alternatives for React for a disciplined team are the ones whose
        options come with rules, and Phosphor rewards discipline more than any rival. Lucide alternatives
        with many weights need a rulebook, and the rulebook is one page.
      </p>

      <h2 className="mt-12 font-display text-2xl font-semibold tracking-tight">
        Heroicons, Bootstrap Icons, and Material Symbols
      </h2>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        <strong className="text-foreground">Smaller or system sets win when the stack, not the catalogue, decides.</strong>{" "}
        Heroicons ships 1,297 MIT icons from the Tailwind team in outline, solid, and mini variants, and
        it feels native in Tailwind projects. Bootstrap Icons ships 2,090 MIT icons for Bootstrap-based
        interfaces, where its general-purpose coverage matches the framework. Teams weighing the best
        Lucide alternatives for React for a framework-led product often pick the set made by the
        framework authors. Lucide alternatives tied to a framework need fewer overrides, because the set
        was drawn for the stack it serves.
      </p>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        Material Symbols is the system choice: 24,569 Apache-2.0 <strong>icons</strong> from Google in outline, rounded,
        and sharp styles, with variable weight and fill. Products that follow Material design, or that
        serve Android users alongside the web, gain a consistent voice across platforms. The best <strong>Lucide</strong>
        alternatives for <strong>React</strong> for a Material product are the ones that speak Material natively, since a
        system voice beats a translated one. Lucide alternatives at system scale also cover the long
        tail, so the choice is rarely a compromise.
      </p>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        The trade-off for all three is scope. <strong>Heroicons</strong> is small, so niche products outgrow it. Bootstrap
        <strong>Icons</strong> is general, so distinctive products find it plain. Material Symbols is vast, so picking a
        style and sticking to it takes discipline. The best Lucide alternatives for React for a long-lived
        product are the ones whose trade-off the team accepts consciously, not the ones with the biggest
        headline count. Lucide alternatives chosen with eyes open about their limits last longer than
        sets chosen for a single strength. That conscious choice is the final test for the best <strong>Lucide</strong>
        alternatives for <strong>React</strong>, and Lucide alternatives picked this way rarely need replacing.
      </p>

      <h2 className="mt-12 font-display text-2xl font-semibold tracking-tight">
        Solar and the attribution question
      </h2>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        <strong className="text-foreground">Solar is the bold choice, and boldness comes with a credit line.</strong>{" "}
        Solar ships 8,682 icons under CC BY 4.0 in bold and duotone styles that suit modern dashboards
        and consumer products. The style is current and confident, and it stands out where neutral
        outlines blend in. Teams that shortlist the best Lucide alternatives for React for a consumer
        product often include Solar, because consumer products reward distinctiveness. Lucide
        alternatives with a bold voice help a product look designed rather than assembled. That
        combination explains why the best Lucide alternatives for React lists always mention Solar, and
        Lucide alternatives that demand a credit deserve a licence check before any design check.
      </p>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        The licence is the whole conversation. CC BY 4.0 allows commercial use, but it requires a visible
        credit, placed where the licence text allows, such as an acknowledgements page or product
        documentation. Confirm the placement with the client before shipping, because adding a credit
        after launch is awkward, and removing Solar after launch is worse. The best Lucide alternatives
        for <strong>React</strong> for client work are the ones whose licence terms were agreed before the first screen
        shipped. Lucide alternatives under CC BY are a fine choice when the credit is planned, and a
        headache when it is discovered late.
      </p>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        Weigh style against process. If the credit is easy to place and the client agrees, Solar boldness
        is worth it. If the product cannot carry a credit, or the client refuses one, the MIT sets answer
        the same brief without the conversation. The best Lucide alternatives for React for a credit-free
        product are the MIT sets, and there is no shame in that choice, since the MIT sets are excellent.
        Lucide alternatives should be judged on the whole deal, style plus licence, not on style alone.
      </p>

      <h2 className="mt-12 font-display text-2xl font-semibold tracking-tight">
        How to test finalists against your real icon list
      </h2>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        <strong className="text-foreground">The thirty-icon test beats every gallery browse.</strong>{" "}
        List the icons your product uses most: home, search, settings, user, notifications, edit, delete,
        download, upload, share, filter, calendar, chevrons, check, close, warning, error, info, plus,
        minus, menu, heart, star, cart, wallet, and chart. Search each name in every finalist, and score
        coverage honestly. Teams running the best Lucide alternatives for React comparison this way get
        a decision in an afternoon, because the list is the product. Lucide alternatives that cover the
        list win, whatever their headline count says.
      </p>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        Then test the survivors where they will actually live. Preview at 16 pixels for toolbars, at 20
        for buttons, and at 24 for feature cards, and in both light and dark themes. A set that shines
        at gallery size and fails at 16 pixels fails the product, since toolbars are where users live.
        The best Lucide alternatives for React for dense interfaces are the ones that stay legible at 16
        pixels, and legibility at that size comes from simple shapes and even strokes. Lucide alternatives
        tested only at large sizes hide their weaknesses until launch.
      </p>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        Finally, test the licence and the workflow together. Confirm the licence allows your use, confirm
        the package exists for your stack, and confirm the <strong>icons</strong> convert cleanly to components. A set
        that passes coverage and size but lacks a <strong>React</strong> package still costs conversion effort on every
        <strong>icon</strong>. The best Lucide alternatives for React for a shipping team are the ones that pass all four
        tests: coverage, size, licence, and workflow. Lucide alternatives that pass all four are rare,
        and rarity is why the test matters. That four-test frame is the honest way to rank the best
        Lucide alternatives for React, and Lucide alternatives ranked this way defend themselves in
        review.
      </p>

      <h2 className="mt-12 font-display text-2xl font-semibold tracking-tight">
        Migrating from Lucide without breaking the interface
      </h2>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        <strong className="text-foreground">Migrate behind a wrapper, and the interface never notices.</strong>{" "}
        A wrapper component that renders the library icon means the product imports the wrapper, not the
        library, so swapping the library touches one file per icon at most, and often just the wrapper
        itself. Map each Lucide name to its replacement, keep names stable where the new set overlaps,
        and rename deliberately where it does not. Teams planning the best Lucide alternatives for React
        migration usually start with the wrapper, because the wrapper is what makes migration safe. Lucide
        alternatives adopted through a wrapper can be reversed, and reversibility is safety.
      </p>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        Roll out in stages, not in one release. Migrate one surface at a time, such as settings first,
        then navigation, then dashboards, and review each surface at small sizes before moving on. A
        staged rollout catches meaning changes, where a replacement glyph looks similar but means
        something different, while a big-bang rollout hides them. The best Lucide alternatives for React
        for a careful team are the ones that allow staging, and every set allows staging when a wrapper
        exists. Lucide alternatives migrated in stages keep users calm, because nothing changes
        everywhere at once. That staging discipline is the unglamorous secret of the best <strong>Lucide</strong>
        alternatives for <strong>React</strong> migrations, and Lucide alternatives rolled out this way rarely cause a
        rollback.
      </p>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        Keep <strong>Lucide</strong> for the screens that do not need the new set. A full replacement is only worth it
        when the new set covers the whole core list, and a partial migration is a legitimate end state,
        not a failure. Document which screens use which set, and why, so the next designer does not
        re-litigate the choice. The best Lucide alternatives for React for a pragmatic team are the ones
        that coexist with Lucide where coexistence serves the product. Lucide alternatives that coexist
        peacefully beat forced replacements that break screens.
      </p>

      <h2 className="mt-12 font-display text-2xl font-semibold tracking-tight">
        Mixing Lucide with one alternative
      </h2>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        <strong className="text-foreground">Mixing is fine when one set fills gaps and the other stays the voice.</strong>{" "}
        Keep Lucide for core UI, and let an alternative cover brand glyphs, a specific screen, or a state
        Lucide cannot express. The rule that keeps mixing honest is simple: the core set owns navigation,
        actions, and feedback, while the guest set owns its named exception. Teams that consider the best
        Lucide alternatives for React as gap-fillers rather than replacements often keep Lucide longer,
        and that is a good outcome. Lucide alternatives used as guests extend a product without
        rebranding it. That guest rule is the practical heart of the best Lucide alternatives for React
        story, and Lucide alternatives that stay guests keep Lucide products coherent.
      </p>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        The risk is drift. A guest set that starts with one screen grows to five, and suddenly two
        voices share the toolbar. Review guest usage quarterly, and promote the guest to core only through
        a deliberate decision, with the thirty-<strong>icon</strong> test rerun. The best Lucide alternatives for React
        for a growing product are the ones whose guest usage stays visible, because invisible guests
        become second voices. Lucide alternatives kept visible stay guests, and guests that stay guests
        never break consistency.
      </p>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        Document the exception. A one-line note naming the guest set, the screens it covers, and the
        reason it exists stops the next designer from extending it casually. Exceptions without notes
        become defaults, and defaults without decisions become redesigns. The best Lucide alternatives
        for <strong>React</strong> for a documented system are the ones whose exceptions are written down, since writing
        is what separates a system from a pile of choices. Lucide alternatives with documented exceptions
        are a system, not a compromise.
      </p>

      <h2 className="mt-12 font-display text-2xl font-semibold tracking-tight">
        The index way to choose
      </h2>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        <strong className="text-foreground">An index tests every finalist against one list in one search.</strong>{" "}
        Opening six library sites in six tabs to compare one icon wastes the afternoon, while one search
        across all sets shows the same idea in every style at once. When a team hunts for the best
        Lucide alternatives for React, an index turns the comparison into evidence, because coverage,
        style, and licence appear side by side. The decision that follows is defensible in review, since
        it rests on the list, not on taste.
      </p>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        The licence column matters as much as the gallery. MIT, ISC, and Apache-2.0 sets need no credit,
        while CC BY sets need a visible one, and seeing that beside the artwork keeps the legal check
        inside the design step. Teams that pick the best Lucide alternatives for React through an index
        check the licence during selection, not during an audit, and that timing saves weeks. An index
        also shows counts honestly, so a set with <strong>2,144 icons</strong> and a set with 24,569 <strong>icons</strong> are compared on
        coverage, not on marketing.
      </p>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        After the choice, the index keeps serving the product. New screens need new icons, and searching
        the chosen set first, then the whole index for gaps, keeps the voice consistent while filling
        real needs. The best Lucide alternatives for React are only useful when the path from search to
        shipped component is short, and that path is what an index should optimise. That is why the best
        Lucide alternatives for React are worth finding in an index first and installing second, starting
        from the{" "}
        <Link to="/app" className="font-medium text-primary underline-offset-4 hover:underline"><strong>IconVault</strong> app</Link>,
        where all sets sit behind one search box.
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
          <strong>IconVault</strong> vs <strong>Lucide</strong>
        </Link>
        , or compare every set in the{" "}
        <Link to="/app" className="font-medium text-primary underline-offset-4 hover:underline"><strong>IconVault</strong> app</Link>.
      </p>
    </PageShell>
  );
}

export default Page;
