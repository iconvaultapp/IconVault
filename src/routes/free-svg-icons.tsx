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
        <strong>IconVault</strong> indexes <strong className="text-foreground">421,020 free SVG icons</strong> from{" "}
        <strong className="text-foreground">239 open-source sets</strong>. Search them all from one
        box, customize colour and size, and <strong>download</strong> the SVG in one click. No account is needed for
        the basics, and the <strong>icons</strong> are free for personal and commercial use under their own licences.
      </p>

      <h2 className="mt-12 font-display text-2xl font-semibold tracking-tight">
        How to download a free SVG icon
      </h2>
      <ol className="mt-4 max-w-3xl list-decimal space-y-2 pl-6 leading-relaxed text-muted-foreground">
        <li>
          Open the <Link to="/app" className="font-medium text-primary underline-offset-4 hover:underline"><strong>IconVault</strong> app</Link> and
          search by name, for example home, settings, <strong>download</strong> or cart.
        </li>
        <li>Pick a set from the results, or filter by one library if your design system already uses it.</li>
        <li>Set a colour on the <strong>icon</strong> page, then <strong>download</strong> the SVG, copy it as a component, or export it as PNG.</li>
        <li>
          For bulk work, save favourites and use bulk export, or build a sprite sheet with the{" "}
          <Link to="/tools/svg-sprite-generator" className="font-medium text-primary underline-offset-4 hover:underline">SVG sprite generator</Link>.
        </li>
      </ol>

      <h2 className="mt-12 font-display text-2xl font-semibold tracking-tight">
        Popular free icon sets, with real counts and licences
      </h2>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        Counts are the live <strong>IconVault</strong> index figures. <strong>Licence</strong> is what decides whether you must add a
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
        Every set on <strong>IconVault</strong> keeps its own <strong>licence</strong>, shown on its library page. Permissive licences
        (MIT, ISC, Apache-2.0) let you ship <strong>icons</strong> in paid products without royalties or attribution.
        Creative Commons sets, such as Solar under CC BY 4.0, require a visible credit. If you plan to
        redistribute the icons themselves, for example inside a template you sell, read the licence
        text first rather than assuming the <strong>download</strong> button settles it.
      </p>

      <h2 className="mt-12 font-display text-2xl font-semibold tracking-tight">
        Customize before you download
      </h2>
      <ul className="mt-4 max-w-3xl list-disc space-y-2 pl-6 leading-relaxed text-muted-foreground">
        <li>Recolour any <strong>icon</strong> to your brand colour on its page before downloading.</li>
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
        What makes an icon set good for a website
      </h2>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        <strong className="text-foreground">A good set is judged by consistency, coverage, and licence, not by its prettiest icon.</strong>{" "}
        When people look for the best free SVG icons for websites, they usually start with
        appearance, but appearance is the easiest part to judge and the least likely to cause trouble
        later. A set earns its place when every icon shares the same grid, the same stroke width, and
        the same corner style, so a toolbar built from ten different icons still looks like one
        design decision. The best free SVG icons for websites also cover the unglamorous corners of a
        product: settings, filters, sorting, empty states, errors, and file actions, because those are
        the icons a real interface needs every day. Free SVG icons that only cover heroes and
        marketing pages leave product teams hunting for the rest elsewhere, and that hunt is where
        mixed styles creep in.
      </p>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        Coverage matters more than most beginners expect. A set with 2,144 <strong>icons</strong> sounds large until a
        dashboard needs a specific glyph for a niche action, and a set with 6,462 or 9,198 icons
        answers far more of those requests. That is why comparing the best free SVG icons for
        <strong>websites</strong> means searching your own list of needed icons in each finalist, not counting
        headlines. Free SVG icons from a large set reduce the chance that a designer must draw a
        custom glyph or borrow from a second set, and both of those workarounds cost more time than
        the original search. Keep a list of the icons your product actually uses, and let that list
        vote.
      </p>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        <strong>Licence</strong> is the third test, and it is the one people skip. The best free SVG icons for
        <strong>websites</strong> for a commercial project are usually the ones under MIT, ISC, or Apache-2.0, because
        those licences allow paid products without royalties or attribution. Sets under CC BY 4.0 are
        also free, but they require a visible credit, which is a design and legal decision, not a
        footnote. Free SVG icons are only truly free for your purpose when the licence matches that
        purpose, so check the licence before the style, because free SVG icons chosen for looks alone
        can carry a credit requirement you did not plan for.
      </p>

      <h2 className="mt-12 font-display text-2xl font-semibold tracking-tight">
        How to pick one set and stay consistent
      </h2>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        <strong className="text-foreground">Pick one set for the whole interface, and let exceptions prove they are necessary.</strong>{" "}
        A product that mixes three outline styles looks assembled rather than designed, even when
        every individual icon is good. When teams compare the best free SVG icons for websites, the
        winning set is often the one that already covers their navigation, their settings screens, and
        their empty states without borrowing. Free SVG icons from a single family share stroke, grid,
        and corner radius, so the interface reads as one voice. Start with the set that covers the
        most of your real list, and treat every additional set as a cost, not a bonus.
      </p>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        Test the set at the sizes you actually ship. <strong>Icons</strong> drawn on a strict grid stay legible at 16
        pixels, while detailed drawings turn to grey mush when shrunk, so preview finalists at small
        sizes before committing. The best free SVG icons for websites survive at 16 and 20 pixels
        because their shapes are simple and their strokes are even. Free SVG icons that look great at
        48 pixels in a gallery can fail in a dense table toolbar, and the toolbar is where users live.
        If a set fails the small-size test, it fails the product, whatever its gallery looks like.
        Free SVG icons chosen this way age well, because the set was picked for the product rather
        than for a single screen.
      </p>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        Write the choice down. A one-line rule in the design notes, naming the set and its <strong>licence</strong>,
        stops the next designer from adding a second set for one screen. The best free SVG icons for
        <strong>websites</strong> are the ones a whole team can keep using without drifting, and drift is what breaks
        <strong>icon</strong> consistency over months. Free SVG icons are easy to <strong>download</strong> and easy to misuse, so the
        rule matters more than the download button. That discipline is what separates teams that find
        the best free SVG icons for websites once from teams that keep re-deciding, and it costs
        nothing to adopt.
      </p>

      <h2 className="mt-12 font-display text-2xl font-semibold tracking-tight">
        SVG icons for the parts of a website people actually build
      </h2>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        <strong className="text-foreground">Most websites need the same twenty icons, so judge a set on those first.</strong>{" "}
        Navigation needs home, search, menu, user, and cart. Product pages need star, heart, share,
        filter, and chevrons. Forms need check, close, warning, error, and info. When shoppers hunt
        for the best free SVG icons for websites, they often browse beautiful hero art, but the icons
        above decide whether a set works. Free SVG icons that cover navigation, commerce, forms, and
        feedback in one style save more time than any single striking glyph.
      </p>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        Dashboards add a second list: chart, table, <strong>download</strong>, upload, calendar, settings,
        notifications, and edit. Admin screens add a third: users, roles, logs, search filters, and
        bulk actions. The best free SVG icons for websites for a dashboard are the ones that cover all
        three lists without gaps, because a gap forces a custom drawing or a borrowed style. Free SVG
        <strong>icons</strong> from a deep set answer those lists, and depth is why larger sets win product work even
        when smaller sets look prettier. Free SVG icons that pass all three lists are the ones worth
        standardising on.
      </p>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        Marketing pages are the easiest case, and the most misleading one. A landing page needs a
        handful of feature <strong>icons</strong>, and almost any set supplies them, so a set that shines on a landing
        page may still fail a full product. The best free SVG icons for websites prove themselves
        across navigation, product, forms, and dashboards together, not on one page. Free SVG icons
        picked for a whole product keep working as the product grows, while icons picked for one page
        often need replacing. That is the real test behind the best free SVG icons for websites, and
        it is worth running before any set becomes the default.
      </p>

      <h2 className="mt-12 font-display text-2xl font-semibold tracking-tight">
        Licences in plain language
      </h2>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        <strong className="text-foreground">Read the licence before you fall in love with the style.</strong>{" "}
        MIT, ISC, and Apache-2.0 are permissive licences: they let you use the icons in paid products,
        modify them, and ship them without royalties or a credit line. That is why most teams hunting
        for the best free SVG icons for websites start with MIT and ISC sets, since the licence never
        becomes a meeting topic. Free SVG icons under these licences still carry a copyright notice in
        their source, but using them in a product does not require displaying it.
      </p>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        CC BY 4.0 is different, and the difference is simple: the <strong>icons</strong> are free, but credit is
        required. A visible credit can sit on an acknowledgements page, in a footer note, or in the
        product documentation, depending on what the <strong>licence</strong> text allows. Teams that choose the best
        free SVG icons for <strong>websites</strong> for a client project should confirm the credit placement with the
        client before shipping, because adding a credit after launch is awkward. Free SVG icons under
        CC BY are a fine choice when the credit is planned, and a headache when it is discovered late.
      </p>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        Redistribution is a separate question from use. Shipping <strong>icons</strong> inside your own product is use.
        Selling a template that contains the icons, or offering the icons themselves for <strong>download</strong>, can
        be redistribution, and some licences treat it differently. The best free SVG icons for websites
        for template sellers are the ones whose <strong>licence</strong> text explicitly allows redistribution, so read
        that text rather than trusting a download button. Free SVG icons are a gift from their authors,
        and honouring the licence is how the gift keeps coming. When in doubt, the safest of the best
        free SVG icons for <strong>websites</strong> are the permissive ones, and free SVG icons under MIT or ISC rarely
        create a second conversation.
      </p>

      <h2 className="mt-12 font-display text-2xl font-semibold tracking-tight">
        File size, sprites, and performance
      </h2>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        <strong className="text-foreground">Icons are small, but a careless icon pipeline still slows a page.</strong>{" "}
        A single SVG icon often weighs under a kilobyte, yet a page that loads dozens of separate icon
        files pays a request cost for each one. That is why sprites exist: one file, many symbols,
        referenced by id wherever needed. Teams comparing the best free SVG icons for websites should
        compare the workflow, not just the artwork, because the workflow decides the page weight. Free
        SVG icons downloaded one by one and pasted inline can bloat a page faster than a sprite built
        from the same set.
      </p>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        Optimisation comes before shipping. An SVG exported from a drawing tool often carries editor
        metadata, comments, and unnecessary precision, and an optimiser strips those without changing
        the picture. Run every icon through the{" "}
        <Link to="/tools/svg-optimizer" className="font-medium text-primary underline-offset-4 hover:underline">SVG optimizer</Link>{" "}
        before it enters the codebase, and keep the original only in the design files. The best free
        SVG icons for websites are the ones that survive optimisation unchanged, which is true of most
        hand-drawn sets and less true of auto-traced artwork. Free SVG icons that arrive clean save a
        step, but optimising anyway is cheap insurance. That habit is part of what makes the best free
        SVG icons for websites fast in practice, and free SVG icons handled this way rarely cause a
        performance review.
      </p>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        PNG still has a place. Favicons, social previews, email templates, and documents often need
        raster images, and exporting at exactly the needed size beats letting a browser scale a large
        file down. The best free SVG icons for websites are still SVG first, with PNG as an export
        format for the places that cannot take vectors. Free SVG icons exported as PNG at two or three
        sizes cover most raster needs without keeping a second <strong>icon</strong> library around.
      </p>

      <h2 className="mt-12 font-display text-2xl font-semibold tracking-tight">
        Recolouring, theming, and dark mode
      </h2>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        <strong className="text-foreground">An icon that cannot change colour is a liability in a themed product.</strong>{" "}
        Most modern sets draw with currentColor or a single stroke colour, so one CSS class recolours
        the whole set, and dark mode follows automatically. When designers evaluate the best free SVG
        icons for websites, they should test recolouring first, because a set that resists theming
        forces per-icon overrides. Free SVG icons built on currentColor behave like text, which is
        exactly what a design system wants. This single property explains why the best free SVG icons
        for websites are usually outline sets, and why free SVG icons drawn with strokes outlast filled
        sets in design systems.
      </p>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        Multi-colour <strong>icons</strong> need a different check. Duotone and filled styles carry their own fills, so
        recolouring means setting two tones, not one, and some sets expose both tones as variables
        while others hard-code them. The best free SVG icons for websites for a brand-heavy product are
        the ones whose duotone tones can be mapped to brand colours without editing paths. Free SVG
        icons with hard-coded colours still work, but they belong in marketing art more than in themed
        interfaces.
      </p>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        Set the colour before <strong>download</strong> when the tool allows it, so the file that enters the codebase
        already matches the palette. Recolouring after download works too, but it adds a step for every
        <strong>icon</strong> and every future update. The best free SVG icons for websites are the ones a team can
        theme once and forget, and that property comes from the drawing method, not from the gallery.
        Free SVG icons chosen with theming in mind keep a product looking intentional as themes
        multiply.
      </p>

      <h2 className="mt-12 font-display text-2xl font-semibold tracking-tight">
        Common mistakes when using free icons
      </h2>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        <strong className="text-foreground">The most common mistake is mixing sets, and it is also the easiest to avoid.</strong>{" "}
        A toolbar with one outline home icon, one filled search icon, and one duotone settings icon
        looks unfinished, even when each icon is excellent on its own. People searching for the best
        free SVG icons for websites sometimes collect favourites across sets, and the collection feels
        like a mood board rather than a product. Free SVG icons from one set prevent this entirely,
        because the family resemblance is built into the drawings.
      </p>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        The second mistake is importing a whole set for a handful of <strong>icons</strong>. Bundlers can remove unused
        exports when imports are named, but importing everything defeats that, and the bundle grows for
        no benefit. The best free SVG icons for websites are used through named imports, one <strong>icon</strong> at a
        time, so the shipped code contains only what the interface shows. Free SVG icons are small
        individually, but a whole set is not small, and the difference shows in load time. That
        discipline is what keeps the best free SVG icons for websites fast, and free SVG icons imported
        by name are the habit that makes it automatic.
      </p>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        The third mistake is skipping labels. Decorative <strong>icons</strong> need no text, but an <strong>icon</strong> that carries
        meaning, such as a warning or a delete action, needs an accessible label for screen readers and
        for users who do not recognise the glyph. The best free SVG icons for websites are accessible
        by default only when the team adds the label, since no icon file can know its own meaning. Free
        <strong>SVG icons</strong> used without labels exclude people, and that failure is on the implementation, not on
        the artwork.
      </p>

      <h2 className="mt-12 font-display text-2xl font-semibold tracking-tight">
        A practical workflow from search to shipped page
      </h2>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        <strong className="text-foreground">A repeatable workflow beats a brilliant one-off search.</strong>{" "}
        Start by listing the icons the page needs, then search each name in one index and shortlist the
        set that covers the most names. Designers who hunt for the best free SVG icons for websites
        often skip the list and browse instead, and browsing produces a prettier shortlist that fails on
        the tenth icon. Free SVG icons chosen against a list survive contact with the real interface,
        because the list is the interface. That list is also how the best free SVG icons for websites
        reveal themselves, since free SVG icons that cover a real list beat icons that merely look good
        in isolation.
      </p>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        Next, <strong>download</strong> the shortlist in one style, recolour to the brand palette, and optimise every
        file before it enters the codebase. Keep the downloaded files in one folder with the <strong>licence</strong>
        noted beside them, so a future audit takes minutes instead of days. The best free SVG icons for
        <strong>websites</strong> are the ones whose licence note is already written when the audit arrives, and that note
        costs seconds at download time. Free SVG icons handled this way stay legal, consistent, and fast
        without extra meetings.
      </p>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        Finally, build a sprite for the icons a page uses repeatedly with the{" "}
        <Link to="/tools/svg-sprite-generator" className="font-medium text-primary underline-offset-4 hover:underline">SVG sprite generator</Link>,
        and test the page at small sizes, in dark mode, and with a screen reader. A sprite removes
        repeated requests, dark mode proves the theming, and the screen reader proves the labels. The
        best free SVG icons for websites pass all three tests without special pleading, because they
        were drawn for interfaces rather than for galleries. Free SVG icons that pass become part of the
        design system, and the next page starts from the system instead of from a fresh search.
      </p>

      <h2 className="mt-12 font-display text-2xl font-semibold tracking-tight">
        Where an index fits in a web project
      </h2>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        <strong className="text-foreground">An index answers a different question from a library, and most projects need both answers.</strong>{" "}
        A library gives one style done well. An index lets a team compare styles, check coverage, and
        find the set that fits before committing. When a team looks for the best free SVG icons for
        websites, an index is the fastest way to test five finalists against one list, because the same
        search runs across every set at once. The result is a decision based on evidence, not on
        whichever set was tried first.
      </p>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        The same index keeps paying off after the choice. New screens need new <strong>icons</strong>, and searching the
        chosen set first, then the whole index when the set has a gap, keeps the product consistent
        while filling real gaps. Teams that treat the best free SVG icons for websites as a one-time
        search miss this second use, which is where most <strong>icon</strong> decisions actually happen. An index also
        shows the <strong>licence</strong> beside every set, so the legal check happens during the search instead of
        after the launch.
      </p>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
        Tools around the index matter as much as the search. Optimising, converting to components,
        building sprites, and exporting PNGs are the steps between finding an icon and shipping it, and
        doing them in one place removes the friction that pushes teams back to screenshots and
        guesswork. The best free SVG icons for websites are only useful when the path from search to
        shipped page is short, and that path is the product an index should optimise. That end-to-end
        path is why the best free SVG icons for websites are worth finding in an index rather than by
        opening six library sites in six tabs. Start the search in the{" "}
        <Link to="/app" className="font-medium text-primary underline-offset-4 hover:underline"><strong>IconVault</strong> app</Link>,
        where all 239 sets sit behind one search box.
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
        Still deciding between sets? Read the full comparison in{" "}
        <Link to="/blog/$slug" params={{ slug: "best-free-svg-icon-libraries-2026" }} className="font-medium text-primary underline-offset-4 hover:underline">
          Best Free SVG <strong>Icon</strong> Libraries in 2026
        </Link>
        , or start searching now in the{" "}
        <Link to="/app" className="font-medium text-primary underline-offset-4 hover:underline"><strong>IconVault</strong> app</Link>.
      </p>
    </PageShell>
  );
}

export default Page;
