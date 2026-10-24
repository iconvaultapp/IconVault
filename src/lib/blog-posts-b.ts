// Blog batch B: framework guides. Original IconVault content.
import type { BlogPost } from "./blog";

export const POSTS_B: BlogPost[] = [
  {
    slug: "shadcn-icons",
    title: "How to Add SVG Icons to shadcn/ui: The Complete Guide",
    description:
      "Add SVG icons to a shadcn/ui project the right way: lucide-react defaults, swapping in Heroicons, Tabler or Phosphor, custom icons, sizing and accessibility rules.",
    category: "Frameworks",
    tags: ["shadcn/ui", "lucide", "react", "tailwind"],
    keyword: "shadcn/ui icons",
    date: "2026-10-20",
    updated: "2026-10-23",
    readingMinutes: 33,
    icon: "component",
    tint: "#111827",
    content: [
      {
        type: "p",
        text: "**shadcn/ui icons** come from Lucide by default, and for most projects that default is correct. This guide covers when to keep it, how to swap in a different set cleanly, and how to add your own custom SVG icons without fighting the framework.",
      },
      { type: "h2", text: "Why shadcn/ui treats icons as code, not assets" },
      {
        type: "p",
        text: "shadcn/ui is not a component library you install and forget. The CLI copies component source into your repository, usually under components/ui, and from that moment the code is yours to edit. Icons follow the same philosophy. A copied component such as the Select or the Dialog arrives with its icon imports written directly into the file, pointing at lucide-react. There is no theme object that resolves icon names at runtime and no font file to load. The icon you see in the rendered page is exactly the component imported at the top of the file, which means every question about shadcn/ui icons is really a question about imports, props and class names.",
      },
      {
        type: "p",
        text: "This design has two practical consequences. First, icon choices are per component and fully visible in code review, so drift is easy to spot. Second, there is no central switch that re-skins every icon at once. If you want a different family, you change imports file by file, or you build a thin wrapper layer and point components at it. Both approaches are covered below, and both are cheap if you do them before the component count grows.",
      },
      { type: "h2", text: "The default: lucide-react" },
      {
        type: "p",
        text: "Every shadcn/ui component that needs an icon imports it from lucide-react: the ChevronDown in a Select, the X in a Dialog, the Check in a Checkbox. The set is consistent (2px stroke, 24px grid) and the licence (ISC) is safe for commercial work. Install it once and import per icon so tree-shaking keeps the bundle small.",
      },
      { type: "code", text: "npm install lucide-react" },
      {
        type: "code",
        text: "import { Search, Settings, User } from \"lucide-react\";\n\n<Button>\n  <Search className=\"mr-2 h-4 w-4\" /> Search\n</Button>",
      },
      { type: "h3", text: "What you get out of the box" },
      {
        type: "p",
        text: "A standard shadcn/ui install uses a surprisingly small slice of Lucide. The Accordion and Collapsible use ChevronDown, the Select adds Check and ChevronUp, the Dialog and Sheet use X, the Checkbox and Radio Group rely on Check and a filled Circle, the Calendar leans on ChevronLeft and ChevronRight, and the Toast variants pull in status glyphs. Because each copied file names its own icons, you can grep the project for lucide-react and see the complete inventory in seconds. That inventory is the real design system: a few dozen glyphs, one stroke weight, one sizing scale. Protecting that coherence matters more than any single icon choice.",
      },
      { type: "h3", text: "Setting project-wide defaults with a wrapper" },
      {
        type: "p",
        text: "Lucide icons accept size, strokeWidth and className props, and repeating the same values across hundreds of call sites invites drift. The fix the community converged on is a small wrapper that fixes your defaults and forwards everything else. Create components/icon.tsx, wrap lucide-react there, and import from the wrapper in your own feature code. Copied shadcn/ui components can keep importing lucide-react directly, since their defaults already match the house style of 16px icons inside controls.",
      },
      {
        type: "code",
        text: "import type { LucideProps } from \"lucide-react\";\nimport { Search as LucideSearch } from \"lucide-react\";\n\nexport function SearchIcon(props: LucideProps) {\n  return <LucideSearch size={18} strokeWidth={2} aria-hidden {...props} />;\n}",
      },
      {
        type: "p",
        text: "The wrapper is also the right home for accessibility defaults. Baking aria-hidden into decorative wrappers means feature code cannot forget it, and the one place an icon is meaningful on its own can pass an explicit override together with a proper label on its button.",
      },
      { type: "h2", text: "Swapping in a different icon set" },
      {
        type: "p",
        text: "If your product already uses another family, replace the imports component by component rather than installing a second system globally. Heroicons and Tabler both match Lucide's outline weight closely; Phosphor works too if you standardise on its Regular weight. Preview candidates side by side in the [Lucide](/app?set=lucide), [Tabler](/app?set=tabler) and [Heroicons](/app?set=heroicons) sets before committing. The rule that keeps shadcn/ui icons coherent: one set per app, no exceptions for a single cute icon.",
      },
      { type: "h3", text: "A safe swap workflow" },
      {
        type: "p",
        text: "Swapping families touches many files, so treat it like a migration, not a find-and-replace party. Work in this order and the change stays reviewable:",
      },
      {
        type: "ul",
        items: [
          "Inventory first: search the codebase for lucide-react and list every icon name in use. Most projects use fewer than sixty.",
          "Build a mapping table from old names to new names. A few will not have equivalents, and those decide feasibility, so find them early.",
          "Install the new package, then migrate one component group at a time: primitives first, then feature screens, checking visuals after each group.",
          "Normalise sizes as you go. Heroicons outline icons are drawn for 24px with a 1.5 stroke, so a control tuned for Lucide at 16px usually wants h-5 w-5 in Heroicons to read at the same weight.",
          "Delete lucide-react only after the final grep returns nothing, and keep the mapping table in the pull request description for reviewers.",
        ],
      },
      {
        type: "p",
        text: "The three realistic target packages each have a personality. @heroicons/react ships outline and solid variants plus a 20px mini set, which maps neatly onto default and hover states. @tabler/icons-react offers the broadest catalogue of the three and matches Lucide's 2px stroke, making it the least visually disruptive swap. @phosphor-icons/react gives six weights per glyph, which is powerful for marketing pages but risky in dense product UI, where a stray Bold weight reads as a different icon system. Whichever you pick, the [libraries directory](/libraries) lists every set with licence and counts so you can sanity-check coverage before committing.",
      },
      {
        type: "code",
        text: "// Before\nimport { ChevronDown } from \"lucide-react\";\n\n// After (Heroicons)\nimport { ChevronDownIcon } from \"@heroicons/react/24/outline\";",
      },
      { type: "h2", text: "Adding a custom SVG icon" },
      {
        type: "p",
        text: "For a logo or a glyph no library has, create a small component that accepts className, uses currentColor, and sets aria-hidden when decorative. Keep the original viewBox (usually 0 0 24 24) and remove hard-coded fills so the icon inherits your theme. IconVault's [SVG to JSX converter](/tools/svg-to-jsx) produces exactly this component shape from any SVG file.",
      },
      {
        type: "p",
        text: "A production-ready custom icon component looks like this. Note the spread of props at the end, which lets callers override size and class, and the stroke settings that match Lucide so the custom glyph can sit next to library icons without looking foreign.",
      },
      {
        type: "code",
        text: "import type { SVGProps } from \"react\";\n\nexport function RocketIcon(props: SVGProps<SVGSVGElement>) {\n  return (\n    <svg\n      viewBox=\"0 0 24 24\"\n      fill=\"none\"\n      stroke=\"currentColor\"\n      strokeWidth={2}\n      strokeLinecap=\"round\"\n      strokeLinejoin=\"round\"\n      aria-hidden=\"true\"\n      {...props}\n    >\n      <path d=\"M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z\" />\n      <path d=\"M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z\" />\n    </svg>\n  );\n}",
      },
      {
        type: "p",
        text: "Before pasting any found SVG into a component, run it through the [SVG optimizer](/tools/svg-optimizer). Designer exports arrive with editor metadata, unused groups, decimal-heavy paths and sometimes fixed width and height attributes that fight your className sizing. Optimising first, then converting, keeps the component diff small and the rendered result predictable. Store finished customs in components/icons, one file per icon, exported from a single index so imports read like library imports.",
      },
      { type: "h3", text: "Brand marks are the one exception" },
      {
        type: "p",
        text: "The one-set rule governs interface glyphs, not logos. Payment marks, social logos and your own product mark live outside the icon system and should use their official artwork, usually from Simple Icons, with original colours intact. Keep them in the same components/icons folder but name them clearly, LogoGitHub rather than GithubIcon, so nobody restyles them into the theme by accident.",
      },
      { type: "h2", text: "Sizing and accessibility rules" },
      {
        type: "ul",
        items: [
          "16px (h-4 w-4) inside buttons and menu items; 20px for standalone toolbar actions.",
          "Icons that carry meaning alone need an accessible label: a visible text label, sr-only text, or aria-label on the button.",
          "Decorative icons get aria-hidden=\"true\" so screen readers skip them.",
          "Never recolor a status icon away from its semantic color: green check, red error, amber warning.",
        ],
      },
      { type: "h3", text: "Stroke width is part of the system" },
      {
        type: "p",
        text: "Two icons at the same pixel size can look mismatched purely because of stroke. Lucide draws at a 2px stroke on a 24px grid, and at 16px that stroke scales down proportionally, which is why small Lucide icons stay legible. If you mix in a set drawn at 1.5px, its icons look lighter and slightly larger optically. Compensate deliberately: either render the lighter set one step smaller, or raise its strokeWidth prop where the component allows it. Optical alignment beats mathematical alignment every time, and your eyes are the test tool. Preview mixed candidates at production size in the [browse grid](/app) before merging anything.",
      },
      { type: "h3", text: "Icons in dark mode and themes" },
      {
        type: "p",
        text: "shadcn/ui themes with CSS variables, and icons inherit the current text colour through currentColor, so dark mode normally needs no icon-specific work at all. Problems appear when a copied component or a custom SVG hard-codes a fill such as fill=\"#000\". Hunt for those during the swap audit. Semantic colours are the exception that proves the rule: a destructive button's trash icon should follow the destructive token, not the foreground token, so it reads as part of the action. With Tailwind, prefer text-destructive on the icon or inherit it from the button variant rather than bolting on arbitrary hex values.",
      },
      { type: "h2", text: "Icons in menus, dialogs, toasts and forms" },
      {
        type: "p",
        text: "Most shadcn/ui icon work happens inside composite components, and each has conventions worth copying. Dropdown menus and context menus place a 16px icon before the label with a consistent mr-2, and destructive items colour icon and text together. Command palette items in cmdk follow the same pattern, which is why the Command component looks native the moment you match its spacing. Dialogs and sheets keep their close X icon-only, so the button needs an sr-only Close label, a detail many templates skip and every accessibility audit flags.",
      },
      {
        type: "p",
        text: "Forms are subtler. An icon inside an Input, such as a Search glyph in a filter field, is decorative even though it hints at purpose, because the input itself carries the label. Status icons in form messages are the opposite: the Check or CircleAlert beside an error or success message reinforces meaning that colour alone should never carry. Toasts from Sonner accept icon overrides per toast type; use them sparingly and keep the default status glyphs, since users learn toast iconography fast and custom glyphs slow recognition. When in doubt, mirror what the copied shadcn/ui component already does, because that consistency is what makes the system feel like one product.",
      },
      { type: "h2", text: "Tree-shaking and bundle discipline" },
      {
        type: "p",
        text: "Icon packages are the classic silent bundle leak. The rules for shadcn/ui icons are simple and absolute:",
      },
      {
        type: "ul",
        items: [
          "Import icons by name from the package root, as in import { Search } from \"lucide-react\". The package is built for per-icon tree-shaking, so this is both the documented and the cheapest pattern.",
          "Never import a namespace or a full icon font package to grab two glyphs. One careless barrel import can pull hundreds of unwanted components into the client bundle.",
          "Do not build runtime icon pickers from the full library unless the page genuinely is an icon browser. If you need dynamic names, map a small allow-list of components yourself.",
          "Check the result with your bundler's analyser after any icon package change. Icon regressions are invisible in code review and obvious in a bundle report.",
        ],
      },
      {
        type: "p",
        text: "Server components deserve one extra note. lucide-react and its peers are plain presentational components with no hooks or browser APIs, so they render inside React Server Components without a client boundary. The bundle cost lands only where a client component imports them. Keeping chrome such as headers and sidebars as server components, with icons imported there, is free; the same icons inside a client-heavy dashboard are not. Our [Next.js icon guide](/blog/nextjs-svg-icons) walks through that boundary in detail.",
      },
      { type: "h2", text: "Common errors and fixes" },
      { type: "h3", text: "Module not found: lucide-react after copying a component" },
      {
        type: "p",
        text: "The add command copies component source that assumes lucide-react exists. On older templates or minimal starters it may not be installed yet. The fix is the install command from the top of this guide, not editing the copied file. If several copied components fail at once, it is always the missing package, never the components.",
      },
      { type: "h3", text: "The custom icon renders solid black" },
      {
        type: "p",
        text: "Almost always a fill problem. The pasted SVG carries fill attributes on its paths, or the root svg sets fill without currentColor, so theme colour never applies. Remove per-path fills, set fill=\"currentColor\" for filled glyphs or fill=\"none\" with stroke=\"currentColor\" for outline glyphs, and confirm no presentation attribute is overriding your CSS. Converting through the [SVG to JSX tool](/tools/svg-to-jsx) and then cleaning fills takes under a minute.",
      },
      { type: "h3", text: "className has no effect on a custom icon" },
      {
        type: "p",
        text: "If width and height attributes survived on the root svg element, they win over some sizing expectations and make the component look unresponsive to h-4 w-4. Delete the fixed attributes, keep the viewBox, and make sure the component spreads props onto the svg element. A custom icon that does not spread props cannot receive className at all, which is the other half of this bug.",
      },
      { type: "h3", text: "Icons look heavier or lighter than the rest of the UI" },
      {
        type: "p",
        text: "That is a stroke or grid mismatch, usually a custom glyph drawn on a 32px grid sitting among 24px-grid icons. Rescale the artwork into a 24 viewBox, match the 2px stroke convention, and compare at 16px, the size where mismatches shout. If the glyph came from a filled set, no adjustment will make it blend; choose an outline equivalent instead of shipping a visual accent you did not intend.",
      },
      { type: "h2", text: "Migrating from react-icons or Font Awesome" },
      {
        type: "p",
        text: "Many shadcn/ui adopters arrive with react-icons or Font Awesome already in the tree. Migrating is worth it for coherence: react-icons aggregates dozens of sets with different grids and stroke logic, so screens assembled from it rarely look like one system. Migrate screen by screen using the same mapping-table workflow as a family swap, and resist keeping react-icons 'just for brand logos'; Simple Icons as components covers that need without the grab-bag. Font Awesome migrations carry one extra decision, since its free solid style has no outline equivalent for many glyphs. Map to the closest Lucide outline icon and accept small visual changes, or keep Font Awesome only on legacy pages behind a clear boundary. Either way, finish the migration; two half-used systems is the worst steady state.",
      },
      {
        type: "p",
        text: "Done well, shadcn/ui icons disappear into the interface, which is the point. For the wider ecosystem view, read our comparison of the [best React icon libraries](/blog/react-svg-icons).",
      },
      { type: "h2", text: "Icons inside Radix primitives and overlays" },
      {
        type: "p",
        text: "shadcn/ui is built on Radix primitives, and overlays introduce two icon situations worth knowing. First, content rendered in portals, such as dropdowns, popovers and tooltips, mounts outside your component tree in the DOM, so global CSS you scoped to a page section will not reach it; icon styling must travel with the component classes, which is another reason the copied components style icons inline rather than through page stylesheets. Second, Radix manages focus inside dialogs and menus, and decorative icons inside focusable items should stay aria-hidden so the item's label remains the single accessible name. If you customise the close button of a Dialog or the indicator of a Checkbox, keep the primitive's structure and swap only the glyph; re-implementing the anatomy to fit an icon is how keyboard behaviour quietly breaks.",
      },
      { type: "h2", text: "Dynamic icon names and icon pickers" },
      {
        type: "p",
        text: "Settings screens and admin tools sometimes need an icon chosen at runtime: a sidebar link editor, a category manager, a workspace switcher. The wrong pattern is importing the entire Lucide namespace and indexing it by string, which defeats tree-shaking and ships the full set for one feature. The right pattern is an explicit allow-list that maps the names you support to their components. The list stays small because it is curated by you, it type-checks, and the picker UI can render options straight from the same map. When a user-facing name differs from the component name, store the user's key and translate in one place rather than scattering component imports across the feature.",
      },
      {
        type: "code",
        text: "import { Home, Search, Settings, User } from \"lucide-react\";\n\nexport const PICKABLE_ICONS = {\n  home: Home,\n  search: Search,\n  settings: Settings,\n  user: User,\n} as const;\n\nexport type IconName = keyof typeof PICKABLE_ICONS;",
      },
      { type: "h2", text: "Keeping icons current when components update" },
      {
        type: "p",
        text: "Because shadcn/ui components are copied source, re-adding a component with the CLI can overwrite your icon swaps inside it. Treat icon customisation as a layer you can reapply: keep your mapping table in version control, note in the project readme which primitives were re-iconed, and after any component update, diff the file and reapply the import changes deliberately. Pin lucide-react and any replacement package to tested versions and upgrade them in dedicated pull requests, since icon sets occasionally rename glyphs between releases. A rename is a five-minute fix when it arrives alone and a confusing scavenger hunt when it rides along with a feature release, which is why icon upgrades deserve their own boring, reviewable commits.",
      },
      { type: "h2", text: "The shadcn/ui icon checklist" },
      {
        type: "ul",
        items: [
          "One icon family for interface glyphs, documented in the readme, with brand logos as the only exception.",
          "Icons imported by name, never through a namespace or a full-set registry, outside an explicit picker allow-list.",
          "Default size and stroke fixed in a wrapper or matched to the copied components' built-in conventions.",
          "Decorative icons aria-hidden by default; icon-only buttons carry sr-only text or an aria-label.",
          "Custom glyphs optimised, converted to components with currentColor, and stored in components/icons.",
          "Bundle checked after any icon package change, and component re-adds followed by a re-application of known icon swaps.",
        ],
      },
      { type: "h2", text: "Choosing a set before the first component lands" },
      {
        type: "p",
        text: "**Decide the family before you copy components.** The cheapest moment to choose shadcn icons is before the first Button lands in the codebase, because every copied primitive after that point hard-codes the decision in its imports. When teams evaluate the best shadcn ui icons for Next.js, they often start from screenshots, but the durable test is a coverage check: list the fifty glyphs your product will actually use and confirm the set draws all of them well. A set that covers navigation, forms, feedback and commerce without gaps will serve shadcn icons in production far better than a prettier set that forces one-off substitutions. The best shadcn ui icons for Next.js are therefore the ones that survive your real list, not the ones that win a beauty contest on a landing page.",
      },
      {
        type: "p",
        text: "**Judge stroke, grid and licence together.** A coherent system for shadcn icons shares one stroke weight and one grid, so compare candidates at 16px, the size where most interface shadcn icons actually render, rather than at poster size. Lucide draws at a 2px stroke on a 24px grid, Tabler matches that weight with wider coverage, and Heroicons draws lighter at 1.5px, which changes how dense toolbars feel. Licence matters just as much: the best shadcn ui icons for Next.js carry permissive terms such as ISC or MIT, so commercial shipping needs no legal review, while a CC BY set adds an attribution chore to every deployment. Pick the family that passes all three tests at once, and shadcn icons stop being a recurring debate and become a settled default.",
      },
      { type: "h2", text: "Icon tokens with Tailwind and CSS variables" },
      {
        type: "p",
        text: "**Turn sizes into tokens, not scattered classes.** As shadcn icons spread across an app, ad-hoc h-4 w-4 and h-5 w-5 classes drift until the same action looks different on two screens. A token layer fixes this: define icon sizes such as sm, md and lg once, map them to Tailwind utilities in your wrapper, and let every feature import the token instead of a raw class. Teams choosing the best shadcn ui icons for Next.js benefit most from this discipline, because Next.js apps tend to grow both a marketing site and a dashboard in one repository, and tokens are what keep shadcn icons consistent across both surfaces. The best shadcn ui icons for Next.js feel invisible precisely when a token system removes the need to think about each instance.",
      },
      {
        type: "p",
        text: "**Let colour tokens do the theming work.** Because shadcn icons inherit currentColor, a token such as text-muted-foreground or text-destructive colours every glyph without icon-specific CSS, and dark mode follows automatically when the theme variables flip. The failure mode to avoid is a hard-coded hex inside a custom SVG, which ignores tokens and glows wrong in dark mode; the audit for this is a simple grep for fill and stroke hex values across components/icons. When shadcn icons are token-driven, a rebrand becomes a variable change rather than a file-by-file hunt, and that is the real payoff of treating shadcn icons as a system instead of a pile of imports.",
      },
      { type: "h2", text: "Dense interfaces: tables, sidebars and toolbars" },
      {
        type: "p",
        text: "**Alignment is the whole job in dense UI.** In a data table or a sidebar, shadcn icons sit next to small text at 13 or 14px, and a single misaligned glyph makes the row feel broken. The reliable pattern is a fixed 16px box for every row icon, vertical centring through flex alignment, and identical left padding across rows, so the eye reads a straight column of glyphs rather than a jitter. When developers compare the best shadcn ui icons for Next.js dashboards, they should preview candidates inside a real table row, not on a showcase page, because optical weight at small sizes decides whether shadcn icons read as calm or noisy. The best shadcn ui icons for Next.js dashboards are the ones that stay quiet at 16px and never compete with the data beside them.",
      },
      {
        type: "p",
        text: "**Reserve space for icons that appear conditionally.** Sorting indicators, row actions and status glyphs that pop in on hover cause layout shift when their slot has no reserved width, and users perceive that shift as instability even when the data is correct. Give sortable headers a permanent icon slot, render action buttons with opacity transitions instead of mounting and unmounting them, and keep status icons in a fixed-width cell. These habits cost nothing at build time and protect the polish that shadcn icons are supposed to deliver. In toolbars, the same rule applies to icon-only buttons: a consistent 32 or 36px hit area, identical across the bar, makes shadcn icons feel like a designed control set rather than a loose collection of glyphs.",
      },
      { type: "h2", text: "Marketing pages inside the same app" },
      {
        type: "p",
        text: "**Display icons play by different rules.** A Next.js repository often serves a marketing site and an application from the same codebase, and shadcn icons on a landing page are display graphics at 32 or 48px, not controls at 16px. At display size, a 2px stroke looks thin, so marketing sections usually want a heavier stroke or a filled variant for the same glyph, and that is acceptable as long as the change is deliberate and documented. Teams picking the best shadcn ui icons for Next.js should therefore test their shortlist at both sizes: the set that wins at 16px may look anemic at 48px, and shadcn icons need a documented display treatment rather than an accidental one. The best shadcn ui icons for Next.js handle both scales when the team defines a display style up front instead of improvising per section.",
      },
      {
        type: "p",
        text: "**Keep marketing and product icons recognisably related.** The safest bridge between a landing page and an app is to keep the same family and vary only weight or size, so a visitor who signs up meets glyphs they already recognise from the homepage. If marketing demands a second, more expressive family for illustrations and feature graphics, confine it to hero and feature sections and never let it leak into the application chrome. Document the boundary in the same place you document shadcn icons for product UI, because the next designer will otherwise blend the two systems gradually. Consistency across the funnel is a conversion asset: users trust a product whose shadcn icons look like the marketing that sold it to them.",
      },
      { type: "h2", text: "Motion: spinners, transitions and micro-interactions" },
      {
        type: "p",
        text: "**Animate state, not decoration.** The most useful motion for shadcn icons is state feedback: a spinner that replaces a button label while a form submits, a check that draws in when an action succeeds, a chevron that rotates when an accordion opens. These animations are small, fast and meaningful, and they work because the icon itself communicates the state change rather than decorating it. Developers evaluating the best shadcn ui icons for Next.js should check that their set's spinner glyph is a clean circular arc, since a decorative loader built from a generic icon looks cheap; shadcn icons in loading states deserve a purpose-drawn glyph. The best shadcn ui icons for Next.js pair with Tailwind's animate-spin and transition-transform utilities without custom CSS, which keeps motion consistent with the rest of the system.",
      },
      {
        type: "p",
        text: "**Respect reduced motion everywhere icons move.** Some users experience motion as discomfort, and the correct response is to honour prefers-reduced-motion for every icon animation, not just the large ones. Tailwind's motion-safe and motion-reduce variants make this a one-line habit: animate-spin becomes motion-safe:animate-spin, and a rotating chevron gets motion-reduce:rotate-0 so it simply appears in its final state. Audit shadcn icons in loading, accordion and drawer components for this treatment, because those are the places motion concentrates. A system that moves thoughtfully and stops when asked is what separates polished shadcn icons from merely animated ones.",
      },
      { type: "h2", text: "Auditing icons every quarter" },
      {
        type: "p",
        text: "**Schedule an icon audit like a dependency audit.** Icon sets drift silently: a new screen imports a second family for one glyph, a designer exports a custom mark that duplicates a library icon, a deprecated glyph lingers after a refactor. A quarterly audit catches all three before they compound, and it takes under an hour: grep the codebase for icon imports, list every family in use, and compare the list against the documented system. When teams maintain the best shadcn ui icons for Next.js over a year, this audit is the habit that preserves the original decision, because shadcn icons only stay coherent while someone checks. The best shadcn ui icons for Next.js are rarely the newest set; they are the set a team actually kept consistent through four quarters of feature work.",
      },
      {
        type: "p",
        text: "**Measure the audit in bundle bytes, not opinions.** After listing imports, run the bundle analyser and record the icon packages' contribution, then remove unused glyphs, delete the second family if one crept in, and replace custom duplicates with library equivalents where the meaning matches. Report the before-and-after numbers in the pull request, because a 40KB saving is a more persuasive argument for discipline than any style debate. Keep the audit output in the repository, next to the mapping table from the original migration, so the next audit starts from evidence instead of memory. Over time, this ritual turns shadcn icons from a one-time setup into a maintained asset, which is exactly how mature design systems treat every other shared dependency.",
      },
      { type: "h2", text: "Designer handoff and Figma parity" },
      {
        type: "p",
        text: "**Name parity between Figma and code prevents silent drift.** The most common designer-developer icon bug is not a missing glyph but a renamed one: Figma calls it arrow-right while the code imports ArrowRight, and a search for either name misses the other half of the system. Agree on one naming convention, usually the library's component name, and use it in Figma layer names, in the icon inventory document, and in code. When the team reviews the best shadcn ui icons for Next.js, they should confirm the set's Figma library exists and matches the package version, because shadcn icons drawn from a stale Figma file arrive in code already wrong. The best shadcn ui icons for Next.js are the ones whose design file and package stay in lockstep through upgrades.",
      },
      {
        type: "p",
        text: "**Treat exports as a pipeline, not a handoff event.** Designer-exported SVGs arrive with editor metadata, artboard-sized viewBoxes and hard-coded fills, all of which fight the component conventions this guide sets out, so every export should pass through the optimiser and the JSX converter before it reaches components/icons. Record the source file and the export settings alongside the component, so a future redraw can be re-exported identically instead of re-cleaned by hand. Review custom glyphs at 16px in the actual product UI, not at 200% in Figma, because stroke and spacing decisions that look generous on a canvas look cramped in a toolbar. A disciplined export pipeline is what lets shadcn icons from designers sit invisibly next to library glyphs.",
      },
      { type: "h2", text: "Multi-brand and white-label theming" },
      {
        type: "p",
        text: "**Tokens make white-label icons possible.** When one codebase serves several brands, shadcn icons must adapt per tenant without per-tenant code branches, and the token layer is what makes that feasible. Brand colour arrives as CSS variables per tenant, icons inherit currentColor, and the only per-brand assets are logos, which live outside the icon system by design. Teams building the best shadcn ui icons for Next.js white-label products should verify early that no icon hard-codes a brand colour, because a single hex value in a shared component breaks every tenant theme at once. With shadcn icons fully token-driven, onboarding a new brand becomes a theme file, not a code change, and that is the difference between a white-label product and a fork.",
      },
      {
        type: "p",
        text: "**Guard the exceptions explicitly.** White-label apps still need a few brand-specific glyphs, such as a tenant's product mark or a partner logo, and those belong in a clearly separated folder with a naming rule that marks them as tenant assets, never in the shared icon directory. A component that renders a tenant mark should accept the tenant as a prop and fall back to a neutral glyph when no mark exists, so a missing asset degrades to a clean default instead of an empty box. Document which shadcn icons are shared and which are tenant-scoped, because the next engineer will otherwise copy a tenant glyph into shared UI and ship one customer's brand to everyone. Boundaries written down are boundaries kept.",
      },
      { type: "h2", text: "Documenting the system for the next developer" },
      {
        type: "p",
        text: "**Write the icon readme before you need it.** Every icon system eventually meets a developer who was not present at its creation, and that developer's first question is always which set, which sizes and where custom glyphs live. A short readme answering those three questions, with the mapping table and the wrapper location, saves a week of archaeology over the life of a project. Teams that maintain the best shadcn ui icons for Next.js treat this document as part of the system, updated in the same pull request as any icon change, so shadcn icons never become tribal knowledge. The best shadcn ui icons for Next.js are documented ones, because an undocumented system is one resignation away from becoming two systems.",
      },
      {
        type: "p",
        text: "**Show, do not just tell, in Storybook.** A Storybook page that renders every approved icon at its approved sizes, with its name and import path beside it, turns the readme into a tool developers actually open. Add a story for the wrapper defaults, one for icon-only buttons with their accessible labels, and one for the dark theme, so visual regressions surface in the same review loop as component changes. When a new glyph is proposed, its story entry forces the conversation this guide wants: does it belong to the family, does it duplicate an existing glyph, and does it pass the 16px test. That review habit is how shadcn icons stay a system as the team grows beyond its founders.",
      },
      { type: "h2", text: "Icon states: hover, active, disabled and loading" },
      {
        type: "p",
        text: "**Give every interactive icon four visible states.** For shadcn icons, consistency across hover, active, disabled and loading states matters more than any single glyph choice, and shadcn icons that share one treatment for these states feel like a designed system rather than a loose collection. Teams choosing the best shadcn ui icons for Next.js should verify that their set draws a clean spinner, because shadcn icons in loading states are the ones users stare at longest. The best shadcn ui icons for Next.js also keep disabled glyphs legible at reduced opacity, so shadcn icons never disappear entirely when an action is unavailable.",
      },
      {
        type: "p",
        text: "**Disabled icons must stay recognisable, not vanish.** For shadcn icons, the standard treatment is the same glyph at reduced opacity with the pointer events removed, and shadcn icons handled this way still communicate what the action would be. Teams evaluating the best shadcn ui icons for Next.js should test disabled states in both themes, because shadcn icons that pass in light mode often fail contrast in dark mode. The best shadcn ui icons for Next.js pair this with a consistent hover treatment, so shadcn icons always signal interactivity the same way across the whole application.",
      },
      { type: "h2", text: "Responsive behaviour for icons on small screens" },
      {
        type: "p",
        text: "**Shrink the chrome, not the meaning.** For shadcn icons, small screens force a choice between keeping every toolbar glyph and keeping the layout usable, and shadcn icons in a collapsing toolbar should hide low-priority actions behind a menu rather than shrinking below 16px. Teams building the best shadcn ui icons for Next.js mobile layouts should define which icons survive at each breakpoint, because shadcn icons that crowd a 360px viewport make the product feel broken. The best shadcn ui icons for Next.js handle this through a documented responsive plan, so shadcn icons degrade gracefully instead of overflowing.",
      },
      {
        type: "p",
        text: "**Touch targets matter more than pixel sizes.** For shadcn icons, a 16px glyph inside a 44px touch target is correct on mobile, and shadcn icons that sit in smaller targets cause mis-taps that users blame on the product. Teams designing the best shadcn ui icons for Next.js responsive screens should audit every icon-only button's hit area at the smallest breakpoint, because shadcn icons in cramped headers are the usual offenders. The best shadcn ui icons for Next.js keep the same glyph across breakpoints and change only the surrounding chrome, so shadcn icons stay familiar while the layout adapts around them.",
      },
      { type: "h2", text: "Directional icons and right-to-left layouts" },
      {
        type: "p",
        text: "**Arrows must flip when the layout flips.** For shadcn icons, directional glyphs such as back, forward and chevrons need mirroring in right-to-left layouts, and shadcn icons that ignore direction make navigation feel wrong for a large audience. Teams shipping the best shadcn ui icons for Next.js internationally should use logical utilities that flip automatically, because shadcn icons handled with explicit per-language overrides rot quickly. The best shadcn ui icons for Next.js document which glyphs are directional and which are not, so shadcn icons like search or settings stay put while arrows mirror correctly.",
      },
      {
        type: "p",
        text: "**Test direction with real content, not screenshots.** For shadcn icons, the reliable check is running the application in an RTL locale and tabbing through navigation, dialogs and pagination, and shadcn icons that fail this test usually fail because a transform was applied to the wrong element. Teams maintaining the best shadcn ui icons for Next.js across locales should add one RTL screenshot to their visual regression set, because shadcn icons in mirrored layouts are easy to verify and embarrassing to miss. The best shadcn ui icons for Next.js treat direction as a first-class requirement, so shadcn icons never become an afterthought for international users.",
      },
      { type: "h2", text: "A process for requesting new icons" },
      {
        type: "p",
        text: "**New glyphs should arrive through a request, not a shortcut.** For shadcn icons, the healthiest process is a short request template asking for the meaning, the screen and the closest existing glyph, and shadcn icons added through this process rarely duplicate something the set already covers. Teams running the best shadcn ui icons for Next.js at scale should review requests weekly, because shadcn icons requested ad hoc during feature work are how second families sneak into a codebase. The best shadcn ui icons for Next.js stay coherent when every addition is judged against the existing inventory, so shadcn icons grow deliberately instead of accidentally.",
      },
      {
        type: "p",
        text: "**Reject requests that the set already answers.** For shadcn icons, most requests turn out to be a naming problem rather than a coverage gap, and shadcn icons already in the set can usually serve once the requester sees them at production size. Teams stewarding the best shadcn ui icons for Next.js should answer requests with a screenshot of the closest existing glyph first, because shadcn icons multiply fastest when nobody checks. The best shadcn ui icons for Next.js grow slowly by design, so shadcn icons added this year still belong to the same visual family next year.",
      },
      { type: "h2", text: "Onboarding new developers onto the icon system" },
      {
        type: "p",
        text: "**A thirty-minute onboarding saves weeks of drift.** For shadcn icons, new developers should be shown the wrapper, the inventory document and the mapping table on their first day, and shadcn icons explained this way become a system they respect rather than a folder they improvise in. Teams hiring around the best shadcn ui icons for Next.js should include the icon conventions in their onboarding checklist, because shadcn icons are usually the first thing a newcomer touches and the easiest place to introduce inconsistency. The best shadcn ui icons for Next.js are taught, not assumed, so shadcn icons stay consistent even as the team turns over.",
      },
      {
        type: "p",
        text: "**Pair the first icon task with a review.** For shadcn icons, the most effective onboarding step is a small first task that adds or swaps a glyph, reviewed against the checklist in this guide, and shadcn icons handled in a reviewed first task teach the conventions better than any document alone. Teams scaling the best shadcn ui icons for Next.js should treat that review as a teaching moment, because shadcn icons reviewed early prevent the habits that audits later punish. The best shadcn ui icons for Next.js survive team growth when every developer's first icon change is reviewed, so shadcn icons remain a shared standard rather than personal preference.",
      },
      { type: "h2", text: "Frequently asked questions" },
      { type: "h3", text: "Can I use icons other than Lucide in shadcn/ui?" },
      {
        type: "p",
        text: "Yes. shadcn/ui components are your own copied source, so any React icon component works anywhere a Lucide icon does. Swap imports component by component, normalise sizes for the new set's stroke and grid, and keep one family across the app. Heroicons, Tabler and Phosphor are the popular alternatives, and each has a dedicated React package.",
      },
      { type: "h3", text: "Why does my custom SVG icon ignore Tailwind size classes?" },
      {
        type: "p",
        text: "Two causes cover nearly every case. The svg element still has fixed width and height attributes from the original export, or the component never spreads props onto the svg, so className is silently dropped. Remove the fixed attributes, keep the viewBox, spread props last, and the icon will obey h-4 w-4 like any library icon.",
      },
      { type: "h3", text: "Do lucide-react icons work in React Server Components?" },
      {
        type: "p",
        text: "Yes. Lucide icons are stateless SVG components with no hooks, effects or browser APIs, so they render inside Server Components and stream with the page. The same applies to most component icon packages. You only cross a client boundary when the component that imports the icon is itself a client component.",
      },
      { type: "h3", text: "How do I change the default icon size across a whole project?" },
      {
        type: "p",
        text: "Create a wrapper component that fixes size and strokeWidth and forwards all other props, then import icons through it in your feature code. Copied shadcn/ui primitives can keep their built-in sizing, which already matches control heights. A wrapper also centralises accessibility defaults such as aria-hidden for decorative use.",
      },
      { type: "h3", text: "Is it a problem to use two icon sets in one shadcn/ui app?" },
      {
        type: "p",
        text: "For interface icons, yes. Mixed grids and stroke weights are visible at small sizes and make the UI feel assembled rather than designed. The accepted exception is brand artwork: official logos in their original colours are not part of the icon system and should stay accurate rather than being redrawn to match.",
      },
    ],
  },
  {
    slug: "vue-svg-icons-guide",
    title: "SVG Icons in Vue 3: The Complete Guide (lucide-vue-next, Iconify and unplugin-icons)",
    description:
      "How to use SVG icons in Vue 3 and Nuxt: lucide-vue-next, @iconify/vue, unplugin-icons and hand-rolled components compared, with sizing, colour and accessibility patterns.",
    category: "Frameworks",
    tags: ["vue", "nuxt", "lucide-vue-next", "iconify"],
    keyword: "SVG icons in Vue 3",
    date: "2026-10-16",
    updated: "2026-10-23",
    readingMinutes: 34,
    icon: "layers",
    tint: "#059669",
    content: [
      {
        type: "p",
        text: "There are four sane ways to use **SVG icons in Vue 3**, and the right one depends on how many icons you need and how much bundle discipline you want. This guide walks through each approach with the trade-offs stated plainly.",
      },
      { type: "h2", text: "Choosing an approach in one paragraph each" },
      {
        type: "p",
        text: "Pick lucide-vue-next when your design language is Lucide and you want zero surprises: official components, predictable props, clean tree-shaking. Pick @iconify/vue when you genuinely need several sets or are prototyping and want every glyph reachable by name today. Pick unplugin-icons when you want that name-based ergonomics with compile-time guarantees and no runtime. Pick local components when the set is small and stable and you would rather own twenty files than one dependency. The sections below give each option a fair hearing, then cover the Nuxt-specific module, shared patterns for sizing and colour, performance behaviour, the errors everyone hits, and migration advice for teams leaving icon fonts behind.",
      },
      { type: "h2", text: "Option 1: lucide-vue-next" },
      {
        type: "p",
        text: "If your design system is Lucide, lucide-vue-next is the official Vue package: one component per icon, props for size and stroke-width, and clean tree-shaking. It mirrors the React experience almost exactly, which helps teams running both frameworks.",
      },
      { type: "code", text: "npm install lucide-vue-next" },
      {
        type: "code",
        text: "<script setup>\nimport { Search, Settings } from \"lucide-vue-next\";\n</script>\n\n<template>\n  <Search :size=\"20\" />\n</template>",
      },
      {
        type: "p",
        text: "Three details make lucide-vue-next pleasant in real projects. The size prop takes a number or string and defaults to 24, the stroke-width prop lets you soften icons in large display contexts, and every component forwards class and attributes to the rendered svg, so class=\"text-primary\" or a Tailwind size utility behaves the way Vue developers expect. Because each icon is an individual ES module export, Vite tree-shakes unused glyphs automatically in production builds. One caution: the package is the Vue 3 line of the project formerly known as vue-lucide and similar names; install lucide-vue-next exactly, since lookalike packages are stale.",
      },
      { type: "h2", text: "Option 2: @iconify/vue for every set at once" },
      {
        type: "p",
        text: "Iconify's Vue component can render any icon from any open-source set by name, including all 239 sets indexed on IconVault. It is the fastest way to prototype with mixed sets, but production apps should bundle icon data locally rather than depending on runtime API calls. Pick your finalists from the [set directory](/collections) and lock in one family.",
      },
      {
        type: "code",
        text: "npm install @iconify/vue\n\n<script setup>\nimport { Icon } from \"@iconify/vue\";\n</script>\n\n<template>\n  <Icon icon=\"lucide:search\" width=\"20\" />\n</template>",
      },
      { type: "h3", text: "Making Iconify offline-safe" },
      {
        type: "p",
        text: "Out of the box, @iconify/vue fetches icon data from the Iconify API the first time an icon renders. That is fine for a prototype and wrong for production: it adds a network dependency, can flash empty space during server-side rendering, and breaks behind strict content security policies or in offline-first apps. The fix is to ship the data yourself. Install the @iconify-json package for your set, register it once at startup with addCollection, and the component resolves names locally with no requests at all.",
      },
      {
        type: "code",
        text: "import { addCollection } from \"@iconify/vue\";\nimport lucide from \"@iconify-json/lucide/icons.json\";\n\naddCollection(lucide);",
      },
      {
        type: "p",
        text: "Registering a whole set still beats fetching, but the data file for a large family can be sizeable. If you use only a few dozen glyphs, register individual icons with addIcon and import their data objects from the set's JSON, or switch those slots to local components. The [library browser](/libraries) shows per-set icon counts, which helps you predict data weight before you commit to a family.",
      },
      { type: "h2", text: "Option 3: unplugin-icons for compile-time imports" },
      {
        type: "p",
        text: "unplugin-icons turns icon names into components at build time (for example ~icons/lucide/search) and works with Vite and Nuxt. You get auto-import ergonomics with zero runtime cost, at the price of one more build plugin to maintain.",
      },
      {
        type: "code",
        text: "// vite.config.ts\nimport Icons from \"unplugin-icons/vite\";\n\nexport default defineConfig({\n  plugins: [vue(), Icons({ autoInstall: false })],\n});\n\n// Usage anywhere, no import statement needed with a resolver\n// or import it explicitly:\nimport IconSearch from \"~icons/lucide/search\";",
      },
      {
        type: "p",
        text: "Two features make unplugin-icons more than a convenience. First, the Components resolver from unplugin-vue-components can auto-import icons by component name, so templates stay free of icon import lists entirely. Second, custom collections let you register a folder of your own SVG files and use them with the same syntax as library icons, which unifies brand glyphs and library glyphs behind one pattern. Remember to generate or commit the TypeScript declarations for the virtual ~icons modules; without them the build works but the editor complains, and teams tend to 'fix' that by disabling type checks, which is the real cost.",
      },
      { type: "h2", text: "Option 4: local SVG components" },
      {
        type: "p",
        text: "For a small, stable icon set, nothing beats copying the SVG into a local component with currentColor and a size prop. Generate the component from any icon using IconVault's copy-as-Vue output on the [browse page](/app), or convert files in bulk with the [SVG to JSX and component tools](/tools/svg-to-jsx). No dependency, no surprises, full control.",
      },
      {
        type: "code",
        text: "<script setup>\ndefineProps({ size: { type: [Number, String], default: 20 } });\n</script>\n\n<template>\n  <svg :width=\"size\" :height=\"size\" viewBox=\"0 0 24 24\" fill=\"none\"\n       stroke=\"currentColor\" stroke-width=\"2\" aria-hidden=\"true\">\n    <circle cx=\"11\" cy=\"11\" r=\"7\" />\n    <path d=\"M21 21l-4.3-4.3\" />\n  </svg>\n</template>",
      },
      {
        type: "p",
        text: "Local components reward a little standardisation. Give every one the same prop contract, size plus class passthrough, put them in components/icons, and re-export them from an index file. Call sites then read identically whether the glyph is local or from a package, and a future migration to lucide-vue-next or unplugin-icons becomes a mechanical exercise instead of an archaeological dig.",
      },
      { type: "h2", text: "The Nuxt route: @nuxt/icon" },
      {
        type: "p",
        text: "Nuxt applications have a fifth path worth knowing. The @nuxt/icon module wraps Iconify with server-side rendering as a first-class concern: icons render on the server into the HTML, can be configured with local collections through @iconify-json packages, and fall back to a server endpoint for long-tail glyphs. For content-heavy Nuxt sites that pull from two or three sets, it removes most of the SSR friction described later in this guide. For a Nuxt app already standardised on Lucide, lucide-vue-next remains simpler and lighter. Modules are conveniences, not obligations, and the deciding factor should be how many sets you truly need.",
      },
      { type: "h2", text: "Colour, size and accessibility in Vue" },
      {
        type: "ul",
        items: [
          "Drive colour with CSS color and currentColor, never a hard-coded fill, so dark mode just works.",
          "Standardise on 16/20/24px sizes through a wrapper component instead of ad-hoc classes.",
          "Add aria-hidden to decorative icons and real labels to icon-only buttons.",
          "In Nuxt, keep icon components client-agnostic: plain SVG renders identically in SSR and hydration.",
        ],
      },
      { type: "h3", text: "A wrapper component pays for itself" },
      {
        type: "p",
        text: "Whatever source you choose, route rendering through one AppIcon-style wrapper that owns the size scale, the default aria-hidden, and the set-specific quirks. The wrapper translates your design tokens, say name plus size token, into the right component or Iconify identifier. Templates then never mention package APIs, and the day you change libraries, only the wrapper changes. This pattern is doubly valuable in Vue because templates are compiled from strings in single-file components; a wrapper keeps icon policy in script land where TypeScript can check it.",
      },
      {
        type: "code",
        text: "<script setup>\nimport { Icon } from \"@iconify/vue\";\nconst props = defineProps({ name: String, size: { type: Number, default: 20 } });\n</script>\n\n<template>\n  <Icon :icon=\"'lucide:' + props.name\" :width=\"props.size\" :height=\"props.size\" aria-hidden=\"true\" />\n</template>",
      },
      { type: "h3", text: "Theming with CSS variables" },
      {
        type: "p",
        text: "Because every approach above ultimately renders SVG with currentColor, Vue theming is CSS theming. Set color on the element or an ancestor and icons follow, including through Tailwind's text colour utilities and dark: variants. Status colours deserve the same semantic discipline as any framework: success, warning and error hues should come from tokens, not from a developer's memory of a hex value. Where an icon needs two tones, reach for a duotone weight from a set like Phosphor rather than hand-colouring paths, and keep the practice rare. Our guide to [using SVG icons well](/blog/how-to-use-svg-icons) covers the visual rules in framework-neutral terms.",
      },
      { type: "h2", text: "Performance: what each approach actually costs" },
      {
        type: "p",
        text: "All four approaches can be fast, and all four can be sabotaged. lucide-vue-next and local components cost exactly the icons you import, tree-shaken. unplugin-icons compiles imports to the same place, with the added benefit that nothing icon-shaped exists at runtime beyond the components themselves. @iconify/vue has two cost profiles: API mode costs requests and layout stability, while bundled-data mode costs the size of the data you register, which is why registering per icon matters for big sets. The metric to watch is not the icon system in the abstract; it is the production bundle report for your app. Weigh it after any change, the same advice as the [site speed and SVG guide](/blog/optimize-svg-icons-for-faster-sites) gives for static sites.",
      },
      { type: "h2", text: "Common errors and fixes" },
      { type: "h3", text: "The icon renders as an empty box or nothing at all" },
      {
        type: "p",
        text: "With @iconify/vue this is usually a name problem: the prefix or glyph name is misspelled, or the data for that set was never registered and the API fetch failed silently. Check the name against the set's listing on the [browse page](/app), confirm addCollection ran before first render, and look for a failed request in the network tab. With package components, an empty box almost always means the import resolved to a component that rendered an svg with no paths, which happens when a stale lookalike package is installed instead of the official one.",
      },
      { type: "h3", text: "Failed to resolve component" },
      {
        type: "p",
        text: "Vue raises this when a template references a component that was neither imported nor globally registered. With unplugin-icons plus the Components resolver, the cause is a missing resolver entry in the Vite config rather than a missing icon. With manual imports in script setup, check that the name in the template matches the imported binding exactly, including casing, since compiled templates are case-sensitive about component resolution.",
      },
      { type: "h3", text: "Icons flash or swap after hydration in Nuxt" },
      {
        type: "p",
        text: "A flash means the server and the client disagreed. API-mode Iconify renders nothing on the server and the icon after the fetch, so SSR HTML and the hydrated DOM differ. Bundling the collection data, or using @nuxt/icon with local collections, removes the fetch and the disagreement together. Local components and lucide-vue-next never have this problem because their SVG exists at build time.",
      },
      { type: "h3", text: "TypeScript complains about ~icons modules" },
      {
        type: "p",
        text: "Virtual modules need declarations. unplugin-icons generates a d.ts when configured, and unplugin-vue-components writes components.d.ts for auto-imported components. Commit those generated files or regenerate them in your prepare script; do not silence the errors globally, because the same configuration gap will hide real component typos elsewhere.",
      },
      { type: "h2", text: "Migrating from icon fonts and vue-fontawesome" },
      {
        type: "p",
        text: "Teams often arrive at SVG icons in Vue 3 carrying an icon font or the Font Awesome Vue component from a Vue 2 era codebase. Migrate in place, screen by screen: replace each font class or fa-icon usage with the component equivalent at the same visual size, then remove the font pipeline entirely, because a leftover webfont that loads 'just in case' taxes every page. Expect small optical differences; Font Awesome's solid style has no exact outline counterpart, so choose replacements by meaning and preview candidates in the [icon set libraries](/libraries) rather than trusting name matches. Once the font is gone, you also delete a class of problems: no more FOUT swaps, no more private-use-area codepoints, and screen readers stop announcing font glyphs as punctuation.",
      },
      {
        type: "p",
        text: "Whichever route you take for SVG icons in Vue 3, consistency of the underlying set matters more than the integration method. Compare candidate sets in our [free SVG icon libraries roundup](/blog/best-free-svg-icon-libraries-2026) before you wire anything up.",
      },
      { type: "h2", text: "Server rendering in depth: what Nuxt actually sends" },
      {
        type: "p",
        text: "It is worth understanding what leaves the server in each approach, because icon bugs in Nuxt are usually payload misunderstandings. With lucide-vue-next, unplugin-icons or local components, the server renders finished svg markup into the HTML and hydration finds identical DOM waiting for it. With @iconify/vue in API mode, the server renders a placeholder or nothing, the client fetches data after mount, and the icon pops in; that pop is both a visual defect and a potential layout shift if the slot had no reserved size. With bundled Iconify data, rendering is again fully server-side, at the cost of the registered data travelling in your JavaScript payload for hydration. Reserve explicit width and height on every icon slot regardless of approach, and the remaining differences between these modes become a question of bytes rather than of visible glitches. This is also why icon-heavy Nuxt layouts deserve a view-source check during development: ten seconds reading the server HTML tells you which mode you are really in.",
      },
      { type: "h2", text: "Sprites and symbol definitions in Vue" },
      {
        type: "p",
        text: "Vue can use the same SVG sprite technique as any stack: define symbols once in a component mounted at the app root, then reference them with use elements anywhere. This suits very large applications where the same twenty glyphs repeat across hundreds of component instances, because the artwork is defined once per document instead of inlined per usage. A SpriteDefs component holding the symbol set, plus a tiny Icon component that takes a name and size, gives a clean call site:",
      },
      {
        type: "code",
        text: "<script setup>\ndefineProps({ name: String, size: { type: Number, default: 20 } });\n</script>\n\n<template>\n  <svg :width=\"size\" :height=\"size\" fill=\"currentColor\" aria-hidden=\"true\">\n    <use :href=\"'#' + name\" />\n  </svg>\n</template>",
      },
      {
        type: "p",
        text: "The trade-offs mirror sprites everywhere: per-instance styling is limited to inherited properties, multi-colour glyphs do not belong in the set, and a missing symbol fails silently as an empty box. Component-based approaches fail louder and style better, which is why sprites are a scaling optimisation to adopt when repetition is measured, not a default. If you adopt one, generate the symbol file from your source icons rather than maintaining it by hand, and keep the list of defined symbols in the same review as the components that reference them.",
      },
      { type: "h2", text: "Using several sets without visual chaos" },
      {
        type: "p",
        text: "Iconify makes it technically trivial to pull a glyph from any of 239 sets in the same template, and that freedom is the most common way Vue apps end up visually incoherent. The sets differ in grid, corner radius, stroke logic and optical size, and mixing them at 20px reads as carelessness even when each icon is individually good. If your product genuinely needs two families, assign them territories with different jobs: one for interface glyphs, one for brand and social marks, for example, and never two interface families side by side in the same toolbar. Document the territories where the wrapper component lives, and treat a cross-territory import in review the way you would treat a random colour. The discipline matters more than the specific sets chosen, and IconVault's [category browsing](/categories) can help you find a single family with the breadth to make the second one unnecessary.",
      },
      { type: "h2", text: "Publishing Vue component libraries with icons" },
      {
        type: "p",
        text: "If you ship a Vue component library, icons become an API design problem. Bundling a specific icon package into your library forces it on consumers and can duplicate the set in their bundles when they use the same package at a different version. The friendlier patterns are to accept icons as slots or component props, so consumers render your button chrome around their own icon system, or to depend on the icon package as a peer dependency with a declared range. Document which you chose, because icon duplication is the kind of bloat consumers notice in their bundle reports and attribute to your library even when their own setup caused it. For internal design systems the stakes are lower, but the slot pattern still wins: it keeps the icon decision at the application layer, where the one-set rule can actually be enforced.",
      },
      { type: "h2", text: "Testing that icons render" },
      {
        type: "p",
        text: "Icon failures are silent, so a little test coverage pays disproportionately. At minimum, snapshot or screenshot the handful of screens dense with iconography, navigation, toolbars and empty states, and let visual regression flag the empty boxes. In unit tests for shared components, assert that an icon-only button exposes its accessible name, which catches the common regression where a refactor drops the label but keeps the glyph. For apps using bundled Iconify data, one smoke test that renders a page server-side and checks for svg elements in the HTML catches the entire class of registration and hydration bugs before users do. None of this requires icon-specific tooling; it requires remembering that icons are UI, and UI that renders as nothing is a bug your type checker cannot see.",
      },
      { type: "h3", text: "Pinning versions across a Vue workspace" },
      {
        type: "p",
        text: "Icon packages rename glyphs occasionally, and in a monorepo with a Nuxt app, a Storybook and a component library, drifting versions produce the maddening bug where the same name renders in one workspace and not another. Pin icon dependencies at the workspace root where your package manager allows it, upgrade them in one dedicated change, and grep for renamed glyphs against the new release notes. The same discipline applies to @iconify-json data packages, whose identifiers must match what the runtime component expects. Boring version hygiene is what keeps an icon system boring, and boring is the goal.",
      },
      { type: "h3", text: "Scoped styles, deep selectors and icon colour" },
      {
        type: "p",
        text: "One Vue-specific papercut deserves a mention: scoped styles in single-file components do not automatically reach into child components, and icon components are children. A rule like .toolbar svg in a scoped block will not recolour an icon rendered by a child component, which surprises developers who expect global CSS behaviour. The clean solutions are to pass colour as a class or style on the icon component itself, since attribute fallthrough puts your class on the rendered svg, or to use a :deep() selector deliberately for the rare container-level override. Passing presentation at the call site is the better habit, because it keeps the wrapper pattern intact and survives refactors that swap the underlying icon source.",
      },
      { type: "h2", text: "Choosing an approach for your app size" },
      {
        type: "p",
        text: "**Match the approach to the app, not to the trend.** A landing page with twenty glyphs and a dashboard with two hundred have different needs, and Vue SVG icons should be chosen against the app in front of you rather than the approach that is fashionable this month. Small apps are best served by local components or lucide-vue-next, because both keep the dependency surface tiny and the behaviour obvious. When developers ask how to use SVG icons in Vue 3 for a large product, the answer shifts toward unplugin-icons or @nuxt/icon, where build-time resolution and server rendering justify the extra configuration. Vue SVG icons chosen this way stay cheap at every scale, because the approach grows with the app instead of fighting it.",
      },
      {
        type: "p",
        text: "**Count sets before you count icons.** The decision that matters most for Vue SVG icons is how many families the product genuinely needs, since one family with any integration beats three families with the best integration. If the answer is one, lucide-vue-next is almost always the right call, and the remaining work is wrapper discipline rather than tooling. If the answer is genuinely two or three, for example interface glyphs plus brand marks, then the question of how to use SVG icons in Vue 3 becomes a question of boundaries: which set owns which territory, documented where the wrapper lives. Vue SVG icons with documented territories survive redesigns, while undocumented mixes quietly become the visual debt the next team inherits.",
      },
      { type: "h2", text: "Naming conventions in Vue templates" },
      {
        type: "p",
        text: "**One naming rule prevents a hundred template bugs.** Vue templates resolve components by name, so Vue SVG icons need a naming convention that survives auto-import, manual import and code review alike. The reliable habit is to use the library's PascalCase component name in script setup and the same name in the template, and to give local glyphs the same treatment with an Icon suffix, so SearchIcon reads as a component everywhere it appears. When teams document how to use SVG icons in Vue 3, the naming rule deserves its own paragraph, because inconsistent names are the most common reason a template renders nothing while the build stays green. Vue SVG icons with consistent names are greppable, reviewable and refactorable, which is everything a growing codebase needs from them.",
      },
      {
        type: "p",
        text: "**Keep user-facing names separate from component names.** Settings screens and category managers often let users pick an icon, and the stored key should be a stable slug such as home or alerts, translated to a component in exactly one map, rather than a component name persisted in a database. This separation means Vue SVG icons can be renamed, swapped or restyled without migrating stored data, and it keeps user input out of the component resolution path entirely. The guide to how to use SVG icons in Vue 3 in admin tools should therefore start with the allow-list map pattern, since it is both the secure and the maintainable choice. Vue SVG icons behind a map also make testing trivial: render the map, assert every entry resolves, and no picker can ever reference a glyph that does not exist.",
      },
      { type: "h2", text: "Icons in navigation, layouts and routing" },
      {
        type: "p",
        text: "**Navigation icons carry the product's wayfinding.** In a Vue Router layout, Vue SVG icons in the sidebar and top bar are the first thing users learn and the last thing they forgive when it changes, so navigation glyphs should be chosen from the core of the set and frozen early. Active states deserve a deliberate treatment: a filled variant, a colour change, or a weight shift, applied consistently across every nav item, rather than a different trick per section. When teams plan how to use SVG icons in Vue 3 navigation, they should prototype the full sidebar with real labels and real active states, because Vue SVG icons that look fine in isolation often crowd each other at 20px beside 14px text. Navigation is where icon discipline pays off most visibly, since users see it on every single screen.",
      },
      {
        type: "p",
        text: "**Reserve slots for badges and indicators.** Notification dots, counts and status pips sit on top of navigation Vue SVG icons, and they need reserved space and a positioning contract, or they will shift layout when they appear. The robust pattern is a relatively positioned wrapper with an absolutely positioned badge, sized in the same token scale as the icon, so the badge never moves the glyph beneath it. Document the badge sizes alongside the icon sizes in the wrapper, because a badge drawn at an ad-hoc size is the classic detail that makes an otherwise careful layout feel unfinished. For teams learning how to use SVG icons in Vue 3 at product scale, the badge contract is a small rule with an outsized effect on perceived polish, and Vue SVG icons with stable badges read as a finished system.",
      },
      { type: "h2", text: "Dark mode and theming in Vue apps" },
      {
        type: "p",
        text: "**Theme through CSS, never through icon props.** Because every Vue SVG icons approach ultimately renders SVG with currentColor, theming is a CSS concern: set colour on the element or an ancestor and the glyph follows, including through Tailwind's dark variant. The failure to avoid is passing hard-coded colours as props to individual icons, which creates a second theming system that dark mode cannot reach. When documenting how to use SVG icons in Vue 3 with dark mode, the rule to state plainly is that no icon component accepts a colour prop at all; colour arrives from context, period. Vue SVG icons themed this way survive every future theme change, because there is exactly one place where colour is decided.",
      },
      {
        type: "p",
        text: "**Semantic colours need tokens, not hex values.** Success, warning and error glyphs should draw their colours from design tokens, so a rebrand or an accessibility-driven contrast fix propagates to every status icon at once. In Vue, the natural home for these tokens is the same CSS variable layer that drives the rest of the theme, consumed through Tailwind utilities or plain classes on the icon component. Teams that treat how to use SVG icons in Vue 3 as a token problem rather than a per-icon problem find that contrast audits become mechanical: change the token, screenshot the states, done. Vue SVG icons in status roles are also the ones most likely to be the sole carrier of meaning, so pair every status colour with a label or a shape difference, never colour alone.",
      },
      { type: "h2", text: "Icons in tables, forms and dashboards" },
      {
        type: "p",
        text: "**Dense Vue screens reward restraint.** Dashboards pack Vue SVG icons into tables, filters, cards and charts, and the discipline that keeps them readable is a strict size scale: 16px for row actions, 20px for toolbar actions, 24px only for section headers. Anything larger in a dense screen competes with the data, and anything smaller than 16px turns to mush on standard displays. When planning how to use SVG icons in Vue 3 dashboards, prototype with real data density, because Vue SVG icons that look balanced in an empty Figma frame often feel noisy beside ten columns of numbers. The dashboard test is simple: if removing an icon makes the row clearer, the icon was decoration, and decoration has no place in dense UI.",
      },
      {
        type: "p",
        text: "**Form icons should hint, never replace labels.** A search glyph inside a filter input or a calendar glyph beside a date field helps users scan, but Vue SVG icons in forms must never carry meaning that the label does not, since screen readers and autofill users may never encounter the glyph. The accessible pattern is a visible label plus a decorative icon marked aria-hidden, with status icons in validation messages treated as reinforcements of text that already exists. For teams writing guidance on how to use SVG icons in Vue 3 forms, this distinction is the whole accessibility story: decorative glyphs are hidden, meaningful glyphs are labelled, and no glyph is the only signal. Vue SVG icons used this way make forms faster to scan for everyone without excluding anyone.",
      },
      { type: "h2", text: "Animating Vue icons with transitions" },
      {
        type: "p",
        text: "**Vue transitions make icon motion trivial to add and easy to overdo.** The built-in Transition component can rotate a chevron, fade a spinner or morph a menu glyph with a few lines, and Vue SVG icons respond to these transitions naturally because they are ordinary components. The discipline is to animate state changes only: an accordion chevron rotating on open, a refresh glyph spinning during a fetch, a check drawing in on success. When teams explore how to use SVG icons in Vue 3 with motion, they should budget motion the way they budget colour, as a small set of approved transitions documented beside the icon wrapper. Vue SVG icons with approved motion feel alive; Vue SVG icons with improvised motion feel distracting, and the difference is entirely the documentation.",
      },
      {
        type: "p",
        text: "**Always provide a reduced-motion path.** Vue's transition system pairs naturally with the prefers-reduced-motion media query, and every icon animation should have a static equivalent that appears instantly when the user asks for less motion. The practical habit is to wrap motion classes in a media query or a Tailwind motion-safe variant, and to test the reduced-motion rendering of every animated icon, not just the page-level transitions. For developers documenting how to use SVG icons in Vue 3 accessibly, reduced motion belongs in the same checklist as aria labels, because motion sensitivity is as real as any other accessibility need. Vue SVG icons that respect the user's motion preference are a quiet signal that the product was built with care.",
      },
      { type: "h2", text: "Testing icons with Vitest and visual regression" },
      {
        type: "p",
        text: "**Icon failures are silent, so test for them explicitly.** A renamed glyph, a missing Iconify registration or a broken auto-import renders as an empty box with no console error, which means Vue SVG icons need tests that a type checker cannot provide. The highest-value test is a visual regression pass over the screens densest with iconography: navigation, toolbars, empty states and dashboards. When teams decide how to use SVG icons in Vue 3 in a tested codebase, they should add a smoke test that server-renders a representative page and asserts svg elements exist in the HTML, catching registration and hydration bugs before users do. Vue SVG icons covered this way fail loudly in CI instead of silently in production.",
      },
      {
        type: "p",
        text: "**Unit-test the wrapper, screenshot the rest.** The AppIcon wrapper deserves unit tests: every supported name resolves, every size token maps to a real dimension, and icon-only buttons expose an accessible name. Beyond the wrapper, screenshot tests carry the weight, because icon bugs are visual by nature and a pixel diff catches what assertions cannot. Keep the screenshot set small and stable, a dozen screens at most, so the suite stays fast enough to run on every pull request. For guidance on how to use SVG icons in Vue 3 at team scale, the testing paragraph matters more than it seems: it is what lets a team change icon libraries later with confidence, since the screenshots prove the new set renders everywhere the old one did.",
      },
      { type: "h2", text: "Sharing icons across a monorepo" },
      {
        type: "p",
        text: "**A shared icon package is a design system decision.** In a monorepo with a Nuxt app, a Storybook and a component library, Vue SVG icons should live in exactly one shared package, versioned and documented, rather than duplicated per app. The shared package exports the wrapper, the allow-list map and the local glyphs, and each app consumes it as a dependency, so an icon change ships everywhere at once. When architects plan how to use SVG icons in Vue 3 across workspaces, the versioning rule matters most: pin the icon package at the workspace root and upgrade it in one dedicated change, because drifting versions produce the maddening bug where a glyph renders in one app and not another. Vue SVG icons shared this way stay boring, and boring is the goal.",
      },
      {
        type: "p",
        text: "**Peer dependencies keep consumers free.** If the shared package bundles a specific icon library, consumers inherit that choice and can end up with two copies of the set when they use the same library at a different version. The friendlier pattern is to accept icons as slots or component props in shared components, so applications render library chrome around their own icon system, or to declare the icon package as a peer dependency with a stated range. Document the choice in the package readme, because bundle duplication is the kind of bloat consumers notice and blame on the library. For teams scaling how to use SVG icons in Vue 3 beyond one app, the slot pattern is what keeps the icon decision at the application layer, where the one-set rule can actually be enforced.",
      },
      { type: "h2", text: "Accessibility deep-dive for icon buttons" },
      {
        type: "p",
        text: "**An icon-only button is a button with a hidden label requirement.** Every Vue SVG icons button without visible text needs an accessible name, delivered through an aria-label, an sr-only span, or a title that assistive technology actually exposes, and the label should name the action, not the glyph: Search products rather than Magnifying glass. The wrapper is the right place to enforce this, by requiring a label prop whenever no visible text is passed, so the rule cannot be forgotten at individual call sites. When writing standards for how to use SVG icons in Vue 3 accessibly, this requirement should be stated as a hard rule with examples, because icon-only buttons are the single most common accessibility failure in Vue applications. Vue SVG icons without labels are decoration; with labels, they are controls.",
      },
      {
        type: "p",
        text: "**Focus visibility is part of the icon contract.** An icon button that shows no focus ring is unusable by keyboard, no matter how perfect its label, so the wrapper or the button component must guarantee a visible focus state that survives theming. Test focus order and visibility with a keyboard alone, tabbing through navigation, toolbars and dialogs, and confirm that every Vue SVG icons control announces itself and shows where focus sits. For teams finalising how to use SVG icons in Vue 3, a keyboard pass over icon-heavy screens is a fifteen-minute check that catches the failures automated tools miss. Vue SVG icons that are labellable, focusable and motion-respectful are not a nice-to-have; they are the baseline for shipping to real users.",
      },
      { type: "h2", text: "Icons in lists and transitions" },
      {
        type: "p",
        text: "**TransitionGroup reveals icon mistakes instantly.** For Vue SVG icons, list animations expose misaligned glyphs because moving rows draw the eye to every icon, and Vue SVG icons that share one size and stroke survive the motion while mixed sets look chaotic. Teams learning how to use SVG icons in Vue 3 lists should keep icon rendering inside the transitioning item component, because Vue SVG icons rendered outside it lag behind the animation. The guidance on how to use SVG icons in Vue 3 with transitions is simple: stable sizes, stable slots, and Vue SVG icons that never change identity mid-animation.",
      },
      {
        type: "p",
        text: "**Keep list icons out of the transition payload.** For Vue SVG icons, the animation should move the row while the icon rides along unchanged, and Vue SVG icons that re-render or swap during a transition cause flicker that users read as a bug. Teams practising how to use SVG icons in Vue 3 with TransitionGroup should key list items stably and avoid conditional icon swaps inside animated rows, because Vue SVG icons with unstable keys remount instead of moving. The rule for how to use SVG icons in Vue 3 in animated lists is that icons are passengers, never drivers, and Vue SVG icons treated as passengers animate flawlessly.",
      },
      { type: "h2", text: "Responsive sizing for Vue icons" },
      {
        type: "p",
        text: "**Breakpoints should change chrome, not glyphs.** For Vue SVG icons, the glyph itself should stay the same across breakpoints while the surrounding layout adapts, and Vue SVG icons that change size per breakpoint create a product that feels different on every device. Teams planning how to use SVG icons in Vue 3 responsively should define size tokens per role rather than per screen, because Vue SVG icons sized by role stay consistent from phone to desktop. The advice on how to use SVG icons in Vue 3 at responsive scale is to audit the smallest viewport first, since Vue SVG icons that work at 360px work everywhere.",
      },
      {
        type: "p",
        text: "**Hide actions behind menus instead of shrinking icons.** For Vue SVG icons, a toolbar that shrinks glyphs below 16px on small screens sacrifices legibility for completeness, and Vue SVG icons hidden behind an overflow menu preserve both. Teams designing how to use SVG icons in Vue 3 for mobile should decide per toolbar which actions survive at each breakpoint, because Vue SVG icons without a responsive plan overflow or crowd. The practice for how to use SVG icons in Vue 3 on small screens is a documented collapse order, so Vue SVG icons degrade predictably instead of breaking the layout.",
      },
      { type: "h2", text: "Directional icons and RTL in Vue" },
      {
        type: "p",
        text: "**Mirror arrows, never logos, in RTL layouts.** For Vue SVG icons, directional glyphs such as back and forward must flip when the document direction changes, and Vue SVG icons that ignore direction confuse users who read right to left. Teams implementing how to use SVG icons in Vue 3 for international products should rely on logical CSS properties that flip automatically, because Vue SVG icons handled with manual overrides rot with every redesign. The standard for how to use SVG icons in Vue 3 internationally is a documented list of directional glyphs, so Vue SVG icons mirror exactly where they should and nowhere else.",
      },
      {
        type: "p",
        text: "**Verify RTL with a real locale run.** For Vue SVG icons, screenshots in English cannot prove RTL correctness, and Vue SVG icons in a mirrored layout must be checked by running the app in an RTL locale and navigating through it. Teams testing how to use SVG icons in Vue 3 across locales should add one RTL screen to their visual regression suite, because Vue SVG icons that fail there are cheap to fix and costly to ship. The discipline for how to use SVG icons in Vue 3 at global scale is a locale pass before every release, so Vue SVG icons never become an afterthought for half the world's readers.",
      },
      { type: "h2", text: "A request process for new Vue icons" },
      {
        type: "p",
        text: "**Route new glyphs through a request template.** For Vue SVG icons, a short template asking for the meaning, the screen and the nearest existing glyph prevents most duplicates, and Vue SVG icons added through requests stay inside the documented family. Teams formalising how to use SVG icons in Vue 3 at scale should review requests in the same meeting as design-system changes, because Vue SVG icons requested during feature work are how second families enter a codebase. The habit for how to use SVG icons in Vue 3 in growing teams is weekly request review, so Vue SVG icons grow deliberately rather than accidentally.",
      },
      {
        type: "p",
        text: "**Answer requests with the existing set first.** For Vue SVG icons, the most common outcome of a request is discovering the set already covers it, and Vue SVG icons found this way cost nothing and keep the system intact. Teams stewarding how to use SVG icons in Vue 3 should reply to each request with a screenshot of the closest existing glyph at production size, because Vue SVG icons judged at poster size mislead requesters. The principle for how to use SVG icons in Vue 3 over years is slow, deliberate growth, so Vue SVG icons added today still belong to the same family tomorrow.",
      },
      { type: "h2", text: "Onboarding developers onto the Vue icon system" },
      {
        type: "p",
        text: "**Teach the wrapper on day one.** For Vue SVG icons, a new developer's first lesson should be the AppIcon wrapper, the size tokens and the allow-list map, and Vue SVG icons explained through the wrapper become a system rather than a pile of imports. Teams onboarding around how to use SVG icons in Vue 3 should put icon conventions in the onboarding checklist, because Vue SVG icons are often the first code a newcomer touches. The guidance for how to use SVG icons in Vue 3 in hiring teams is that conventions taught early are conventions kept, so Vue SVG icons stay consistent through turnover.",
      },
      {
        type: "p",
        text: "**Review the first icon change carefully.** For Vue SVG icons, a newcomer's first glyph addition or swap, reviewed against the checklist, teaches more than any document, and Vue SVG icons handled in a reviewed first task set the standard for everything after. Teams practising how to use SVG icons in Vue 3 with new hires should treat that review as teaching, because Vue SVG icons reviewed early prevent habits that audits later punish. The rule for how to use SVG icons in Vue 3 at team scale is that every developer's first icon change is reviewed, so Vue SVG icons remain a shared standard.",
      },
      { type: "h2", text: "Frequently asked questions" },
      { type: "h3", text: "Which Vue icon approach is best for Nuxt?" },
      {
        type: "p",
        text: "For a single Lucide-based system, lucide-vue-next renders perfectly in Nuxt SSR with no extra machinery. If you need several sets with server rendering, @nuxt/icon with local @iconify-json collections is the purpose-built option. Avoid API-mode Iconify in Nuxt, because icons that arrive after hydration cause layout shift and visible flashing.",
      },
      { type: "h3", text: "Does @iconify/vue work offline?" },
      {
        type: "p",
        text: "Only if you bundle the data. By default the component fetches missing icons from the Iconify API at runtime. Installing the matching @iconify-json package and registering it with addCollection, or registering individual icons with addIcon, makes rendering fully local and offline-safe, and it also fixes SSR output because the server can resolve names immediately.",
      },
      { type: "h3", text: "How do I change icon colour in Vue templates?" },
      {
        type: "p",
        text: "Set the CSS color on the icon or an ancestor and make sure the SVG uses currentColor, which every approach in this guide does by default. Tailwind users can use text colour utilities directly on the component. If an icon refuses to change colour, inspect it for hard-coded fill attributes and remove them.",
      },
      { type: "h3", text: "Are unplugin-icons components tree-shaken?" },
      {
        type: "p",
        text: "Yes. unplugin-icons resolves each ~icons import to a concrete component at build time, so unused icons never enter the bundle and there is no runtime registry. The costs are build configuration and generated type declarations, not bytes. It is the closest Vue gets to the ergonomics of an icon font with the economics of inline SVG.",
      },
      { type: "h3", text: "Can I mix lucide-vue-next and local custom icons?" },
      {
        type: "p",
        text: "Yes, and most production apps do. Keep custom glyphs in components/icons with the same prop contract (size plus inherited class), and they will sit invisibly next to package icons. The rule is about visual systems, not sources: one grid, one stroke logic, one sizing scale, regardless of which file a glyph lives in.",
      },
    ],
  },
  {
    slug: "astro-svg-icons-guide",
    title: "SVG Icons in Astro: The Complete Guide (Zero-JS, Iconify and Component Islands)",
    description:
      "Use SVG icons in Astro without shipping JavaScript: inline SVG, astro-icon, Iconify data packages and framework islands compared for performance and developer experience.",
    category: "Frameworks",
    tags: ["astro", "performance", "zero-js", "iconify"],
    keyword: "SVG icons in Astro",
    date: "2026-10-14",
    updated: "2026-10-23",
    readingMinutes: 32,
    icon: "rocket",
    tint: "#D97706",
    content: [
      {
        type: "p",
        text: "Astro's whole promise is zero JavaScript by default, and **SVG icons in Astro** should honour that: an icon is markup, not a runtime. Here are the patterns that keep icons fast, from hand-inlined SVG to component islands.",
      },
      { type: "h2", text: "Why icons are an architecture decision in Astro" },
      {
        type: "p",
        text: "In most frameworks the icon question is a bundle question. In Astro it is a rendering question. Every component ships as HTML unless you explicitly hydrate it, so an icon placed in an .astro file costs bytes in the document and nothing else, while the same icon inside a hydrated island drags a framework runtime behind it. That asymmetry is why experienced Astro teams are strict about icon placement: static SVG for everything static, framework icon packages only inside islands that were already interactive for other reasons. Internalise that split and the rest of this guide is detail. Ignore it, and you can lose Astro's entire performance advantage to a header search icon.",
      },
      { type: "h2", text: "Pattern 1: inline the SVG (the zero-JS default)" },
      {
        type: "p",
        text: "For content sites, the fastest icon is the one pasted directly into your .astro template. It costs no requests, no hydration and no dependency, and Astro will not add a byte of JS for it. Keep a components/icons folder, one file per icon, with currentColor so themes apply. Copy production-ready markup for any icon from [IconVault](/app) instead of hand-cleaning files.",
      },
      {
        type: "p",
        text: "A tidy Astro icon component takes props for size and class, spreads any extra attributes onto the svg, and defaults to decorative. Build five of these and you will reuse them for years:",
      },
      {
        type: "code",
        text: "---\n// src/components/icons/SearchIcon.astro\nconst { size = 20, class: className = \"\" } = Astro.props;\n---\n<svg width={size} height={size} viewBox=\"0 0 24 24\" fill=\"none\"\n     stroke=\"currentColor\" stroke-width=\"2\" class={className} aria-hidden=\"true\">\n  <circle cx=\"11\" cy=\"11\" r=\"7\" />\n  <path d=\"M21 21l-4.3-4.3\" />\n</svg>",
      },
      {
        type: "p",
        text: "Hand-inlining scales further than people expect. A blog or documentation site typically needs thirty to sixty distinct glyphs, each a few hundred bytes after compression, deduplicated by your component structure rather than repeated raw markup. The failure mode is not size; it is inconsistency, where icons pasted months apart arrive with different viewBoxes and stroke conventions. Source every glyph from one family, preview them together in that family's [set page](/libraries), and the folder stays coherent.",
      },
      { type: "h2", text: "Pattern 2: astro-icon with local data packages" },
      {
        type: "p",
        text: "When a project needs hundreds of icons, astro-icon plus the @iconify-json data packages gives you name-based usage with build-time inlining: the icon becomes static SVG in the HTML, still zero client JS. This is the sweet spot for documentation sites and blogs that pull from several sets like [Lucide](/app?set=lucide) and [Simple Icons](/app?set=simple-icons).",
      },
      {
        type: "code",
        text: "npm install astro-icon\nnpm install -D @iconify-json/lucide @iconify-json/simple-icons\n\n---\nimport { Icon } from \"astro-icon/components\";\n---\n<Icon name=\"lucide:search\" size={20} />\n<Icon name=\"simple-icons:github\" size={20} />",
      },
      {
        type: "p",
        text: "Under the hood, astro-icon resolves the name against locally installed data at build time and inlines the resulting SVG, so the runtime story stays exactly as strict as hand-inlining. You can also drop raw SVG files into src/icons and reference them by filename, which is the cleanest way to include a logo or a one-off illustration glyph in the same syntax. Two operational notes matter. First, a missing data package fails the build loudly rather than the page silently, which is the behaviour you want. Second, because resolution happens per usage, using an icon in fifty places inlines it fifty times unless it flows through a shared component; for a glyph repeated across every page, such as a logo or a chevron, weigh the sprite pattern below.",
      },
      { type: "h2", text: "Pattern 3: icons inside framework islands" },
      {
        type: "p",
        text: "If part of the page is a React, Vue or Svelte island, use that framework's icon package inside the island (lucide-react, lucide-vue-next and friends) and static SVG everywhere else. Do not hydrate a whole island just to render a search icon in the header: that is the most common way Astro sites quietly lose their performance edge. Our guide to [optimizing SVG icons for faster sites](/blog/optimize-svg-icons-for-faster-sites) covers the measurement side.",
      },
      {
        type: "p",
        text: "The subtle trap is the shared header. Marketing pages often put a framework-powered menu or search box in the header, and developers then reach for the framework's icons everywhere on the page for consistency. Resist the shortcut. The island can import its own icons internally, while the surrounding .astro layout uses the same family's static SVG, visually identical because it is the same artwork. The user sees one system; the network sees one small island instead of a page-wide runtime. If an island is deferred with client:visible or client:idle, its icons arrive with it, which is one more reason interactive chrome should be self-contained.",
      },
      { type: "h2", text: "Pattern 4: SVG sprites for repeated glyphs" },
      {
        type: "p",
        text: "When the same icons repeat many times per page, think of a feed with fifty like buttons or a docs sidebar with per-item glyphs, a sprite can beat inlining. Define each glyph once as a symbol in a hidden SVG, then instantiate it anywhere with a use element. The definitions can live in your base layout, and every instance inherits currentColor theming from its context.",
      },
      {
        type: "code",
        text: "<svg width=\"0\" height=\"0\" style=\"position:absolute\" aria-hidden=\"true\">\n  <symbol id=\"i-heart\" viewBox=\"0 0 24 24\">\n    <path d=\"M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z\" />\n  </symbol>\n</svg>\n\n<svg width=\"20\" height=\"20\" fill=\"currentColor\" aria-hidden=\"true\">\n  <use href=\"#i-heart\" />\n</svg>",
      },
      {
        type: "p",
        text: "Sprites have real costs: the symbol artwork cannot be styled per instance beyond inherited properties, multi-colour icons do not belong in them, and an external sprite file reintroduces a request and caching questions. For most Astro sites, component-based inlining plus gzip or brotli compression, which crushes repeated SVG markup efficiently, is simpler and nearly as light. Reach for the sprite when repetition is extreme or when you need icons inside user-generated content where components cannot go. The [sprite generator](/tools/svg-sprite-generator) assembles a clean sprite from individual files if you go this route.",
      },
      { type: "h2", text: "Pattern 5: CSS masks for single-colour glyphs" },
      {
        type: "p",
        text: "One more zero-JS technique deserves a place in the toolbox: CSS mask-image with an SVG data URI. The element gets background: currentColor and the mask supplies the shape, which makes hover and theme colour changes pure CSS with no extra markup. It suits small monochrome marks in navigation and footers. The trade-offs are real: the data URI must be URL-encoded correctly, the icon cannot be reached by assistive technology so it is decorative-only by construction, and multi-path colour icons are out. Generate encoded URIs with the [SVG to data URI tool](/tools/svg-to-data-uri) rather than hand-encoding, which is error-prone in exactly the characters SVG uses most.",
      },
      { type: "h2", text: "Icons in MDX and content collections" },
      {
        type: "p",
        text: "Astro blogs and docs usually meet icons inside MDX, where authors want a callout glyph or an inline mark inside prose. Because MDX compiles to components, both hand-made .astro icon components and astro-icon work inside content, passed through the components mapping when you render the entry. Keep the vocabulary tiny and documented for authors: a callout set (info, warning, danger, tip) and a handful of inline marks covers real usage. For icons generated from frontmatter, such as a per-post category glyph, resolve the name in the template with astro-icon rather than storing markup in content files, so the content stays portable and the artwork stays in the icon layer where it belongs.",
      },
      { type: "h2", text: "Astro icon rules" },
      {
        type: "ul",
        items: [
          "Static content gets static SVG. Islands get framework components. Never mix the two in one component.",
          "Set width and height (or an aspect-ratio) on every icon to prevent layout shift.",
          "Use currentColor and CSS variables for theming; avoid per-icon fill attributes.",
          "For icon fonts: do not. They break the zero-JS, zero-FOUT story Astro is built on.",
        ],
      },
      { type: "h3", text: "Theming and dark mode without JavaScript" },
      {
        type: "p",
        text: "Static SVG themes beautifully with plain CSS, which is the point of the exercise. Drive colour through color and currentColor, scope brand exceptions with utility classes, and let a class-based or media-query dark mode flip variables while icons follow untouched. Where a design needs a softer icon tone than body text, set an explicit colour token for icon contexts, such as navigation and metadata rows, instead of opacity tricks on the svg, because opacity also fades the glyph's edges against busy backgrounds. None of this needs a theme script, and avoiding one keeps the critical rendering path exactly as empty as Astro promises.",
      },
      { type: "h3", text: "Accessibility for inlined icons" },
      {
        type: "p",
        text: "Inlined SVG is markup, so it must behave like markup. Decorative glyphs get aria-hidden=\"true\", and because inline SVG can receive focus in some older browsers when interactive, keep focusable off links' inner svg by putting interactive semantics on the link itself. An icon that is the only content of a link or button gives that element its accessible name problem to solve: add an aria-label to the control or visually hidden text inside it. Where an icon conveys information in content, such as a warning mark in a callout, pair it with text that carries the same meaning. The full checklist is in our [accessible SVG icons guide](/blog/accessible-svg-icons).",
      },
      { type: "h2", text: "Performance: measuring what icons cost in Astro" },
      {
        type: "p",
        text: "Icon weight in Astro shows up as HTML weight, and HTML compresses extremely well when it is repetitive. Before optimising, measure the built page: check the transferred size of a representative page, count inline svg elements, and look for accidental duplicates, such as the same glyph inlined by two different components that should have shared one. The usual findings are mundane: an unoptimised designer export with editor metadata still in it, a logo pasted at full illustration complexity, or an island that quietly hydrated a whole page section. Run suspect artwork through the [SVG optimizer](/tools/svg-optimizer) and re-check. In a healthy Astro build, total icon markup is a rounding error next to fonts and images, which is the outcome the patterns above are designed to produce.",
      },
      { type: "h2", text: "Common errors and fixes" },
      { type: "h3", text: "Icon name not found at build time" },
      {
        type: "p",
        text: "astro-icon resolves names against installed @iconify-json packages and your local src/icons folder. A not-found error means the set's data package is missing, the prefix is wrong, or the glyph name uses the set's internal naming rather than the display name. Install the package, then verify the exact identifier in the set's listing on the [browse page](/app) before changing code.",
      },
      { type: "h3", text: "The icon renders at a huge size" },
      {
        type: "p",
        text: "An inlined SVG without width and height, or with only a viewBox, expands to fill its container in some contexts. Always pass an explicit size through props or CSS. If a whole page of icons ballooned after a refactor, a shared component lost its default size prop; fix it there once rather than patching call sites.",
      },
      { type: "h3", text: "A framework icon package bloated the island" },
      {
        type: "p",
        text: "Inside React or Vue islands, the rules from those ecosystems apply with full force: import icons by name, never through a barrel that pulls the set, and check whether the island imports an icon registry for a picker that most visitors never open. Lazy-load genuinely optional icon-heavy UI behind the interaction that needs it, using the framework's dynamic import support inside the island.",
      },
      { type: "h3", text: "The sprite instance shows nothing" },
      {
        type: "p",
        text: "When a use reference renders blank, suspect the symbol definition: the sprite block must be present in the same document, the id must match exactly, and the symbol needs its own viewBox. Also check that a global CSS rule is not hiding svg elements with zero dimensions in a way that catches your instances. Test by temporarily giving the instance a background colour; if the box appears, geometry is fine and the reference is the problem.",
      },
      { type: "h2", text: "Migrating an Astro site from icon fonts" },
      {
        type: "p",
        text: "Older Astro templates sometimes arrive with Font Awesome or a similar font loaded from a CDN, which quietly contradicts everything Astro is for: a render-blocking stylesheet, a font download, and glyph swap on load. Migration is mechanical. Inventory the icon classes in use, map each to the same-named glyph from your chosen family, replace the markup with components or astro-icon usages, and delete the font links. Expect the layout to get calmer, since font glyphs carry unpredictable line-box behaviour that SVG does not. Do the swap in one pass per layout region so no page ships half font and half SVG, and keep the mapping table with the change for the next maintainer.",
      },
      {
        type: "p",
        text: "Handled this way, SVG icons in Astro are effectively free: a few hundred bytes of HTML, cached with the page, rendered before first paint. Browse the sets you can draw from in the [IconVault collections directory](/collections).",
      },
      { type: "h3", text: "Organising a local icons folder that stays tidy" },
      {
        type: "p",
        text: "Local icon folders decay in predictable ways: inconsistent file names, three sizes of the same glyph, artwork from a second set sneaking in during a deadline. Prevent it with three conventions. Name files after the glyph, not the place it is used, so search stays meaningful. Keep a short readme in the folder stating the source set, the grid and the stroke rules every file must follow. And review new additions at the size they will ship, because a glyph that looks fine at 48px in a pull request screenshot can be mush at 18px in the sidebar. These habits cost minutes and save the folder from becoming the place icons go to be forgotten.",
      },
      { type: "h2", text: "Brand and social icons at scale" },
      {
        type: "p",
        text: "Content sites lean on brand icons more than product apps do: author socials, share rows, footer links, integration logos on a landing page. Simple Icons through astro-icon handles this cleanly with original brand colours, still inlined at build time. Two practices keep it professional. Use the official artwork untouched rather than forcing logos into your interface set's style, because brand guidelines and user recognition both depend on accuracy. And give icon-only social links real accessible names, since 'our community links' rendered as four anonymous glyphs is the most common accessibility failure on marketing pages. Where a share action needs a count or a label anyway, prefer visible text next to the glyph; it converts better and reads better, and the icon becomes the decoration it should be.",
      },
      { type: "h2", text: "Favicons and touch icons in Astro" },
      {
        type: "p",
        text: "Astro sites serve favicons as static files from the public directory, referenced in the base layout's head. An SVG favicon is the right default in 2026: one file, crisp at every size, and able to carry a dark-mode variant through a media query inside the SVG itself. Keep the design to a bold single shape, test it at 16px in a real browser tab, and provide the PNG and apple-touch-icon fallbacks from the same source artwork using the [favicon generator](/tools/favicon-generator). Because the layout is shared, this is a five-minute, whole-site improvement, and it is also the file most likely to be screenshotted when someone bookmarks you, which argues for doing it deliberately rather than inheriting a template placeholder.",
      },
      { type: "h2", text: "View transitions and persisted icon elements" },
      {
        type: "p",
        text: "Astro's view transitions animate between pages without full reloads, and static SVG rides along without any special handling: it is DOM, and the transition treats it like any other element. The icon-relevant detail is persistence. If a header containing icons uses transition:persist, for example around a media player or a persistent navigation, the persisted subtree keeps its original DOM, so an icon theme change driven by a page-level class may not re-apply the way a fresh render would. Keep theming on variables that live above the persisted element, and icons will follow the rest of the interface. None of this requires JavaScript from the icons themselves, which remains the architectural point of every pattern in this guide.",
      },
      { type: "h2", text: "Testing and visual checks for static icons" },
      {
        type: "p",
        text: "Static output is testable output. Your icon QA can be embarrassingly simple: build the site, then check the generated HTML for the pages that matter. Grep the dist output for svg counts on key templates to catch a component that silently stopped rendering, screenshot the icon-dense pages in your preview pipeline, and click through social and navigation links with a keyboard to feel whether focus states survive around inlined glyphs. Because nothing about the icons changes at runtime, a defect found in the build is the defect every visitor would have seen, and a clean build is genuinely reassuring. Teams coming from runtime icon systems often over-test here out of habit; redirect that energy to the islands, where hydration gives icons a second life that can actually diverge.",
      },
      { type: "h2", text: "The Astro icon checklist" },
      {
        type: "ul",
        items: [
          "Every static surface uses static SVG, through local components or astro-icon, with zero icon JavaScript.",
          "Framework icon packages appear only inside islands that are interactive for other reasons.",
          "Each icon carries an explicit size, and repeated glyphs flow through shared components rather than pasted markup.",
          "One source family per job: interface glyphs from one set, brand marks as official artwork.",
          "Decorative icons are aria-hidden, icon-only controls are labelled, and informational icons are paired with text.",
          "Designer exports are optimised before they enter the repo, and favicons ship as SVG with generated fallbacks.",
        ],
      },
      { type: "h2", text: "Choosing a pattern per page type" },
      {
        type: "p",
        text: "**Let the page type choose the pattern.** A marketing homepage, a documentation site and a blog have different icon needs, and Astro SVG icons should follow the page rather than a single house rule. Marketing pages want a handful of large, expressive glyphs that can be inlined once and reused; documentation sites want hundreds of small, consistent interface glyphs best served by a local data package; blogs usually need almost nothing beyond social and share marks. When teams plan how to use SVG icons in Astro, mapping patterns to page types first prevents the common mistake of installing a heavy icon system for a site that needed twelve glyphs. Astro SVG icons chosen per page stay proportional to the site they serve.",
      },
      {
        type: "p",
        text: "**Count glyphs before choosing machinery.** The most reliable scoping question for Astro SVG icons is simply how many distinct icons the finished site will contain, because that number decides everything downstream. Under thirty, inline components in a shared folder are unbeatable: zero dependencies, zero build plugins, full control. Between thirty and a few hundred, a local data package with an Icon component earns its place by removing duplication. Above that, or across many sets, a sprite or a build-time import system starts to pay off. Guidance on how to use SVG icons in Astro should therefore open with a count, not a package recommendation, since Astro SVG icons at the wrong scale cost either maintenance or bytes for no benefit.",
      },
      { type: "h2", text: "Icons in layouts and components" },
      {
        type: "p",
        text: "**Props make icons reusable without islands.** In Astro components, Astro SVG icons work best as props: a Card component accepts an icon name and renders it from the shared Icon component, so content authors never touch SVG markup. The prop contract should be small, name plus size plus an optional class, and the component should resolve the name against a curated map rather than accepting arbitrary identifiers, which keeps the rendered set predictable. When documenting how to use SVG icons in Astro layouts, the prop pattern deserves emphasis, because it is what lets a layout stay zero-JavaScript while still varying its iconography per page. Astro SVG icons passed as props are data, not code, and data is easier to audit.",
      },
      {
        type: "p",
        text: "**Slots handle the cases props cannot.** Sometimes an icon needs custom positioning, a wrapper element or a companion label that a name prop cannot express, and Astro slots solve this cleanly: the caller passes full markup into a named slot and the layout places it. The rule of thumb is props for standard glyphs and slots for exceptional compositions, with the exceptional cases kept rare enough to review individually. Teams standardising how to use SVG icons in Astro should write this rule down, because without it every caller invents a slightly different composition and the layout's visual rhythm erodes. Astro SVG icons through slots stay flexible without surrendering consistency, as long as the slot contract is documented beside the layout.",
      },
      { type: "h2", text: "Icons in content collections and MDX" },
      {
        type: "p",
        text: "**Frontmatter can carry icon names safely.** Content collections let authors declare an icon per entry, such as a feature or a team member, and Astro SVG icons render from that frontmatter through the same curated map used by layouts. The schema should validate the icon field against the allowed list at build time, so a typo fails the build with a clear message instead of rendering an empty box in production. When explaining how to use SVG icons in Astro content, the schema validation step is the part most guides skip and most sites need, because content authors are not developers and should never debug a silent icon failure. Astro SVG icons from validated frontmatter are content, and content with a schema is content that scales.",
      },
      {
        type: "p",
        text: "**MDX components beat raw SVG in prose.** Inside MDX articles, authors should invoke an Icon component by name rather than pasting SVG markup, because pasted markup drifts, bloats the article and breaks when the design system changes. Register the Icon component for MDX once, document the allowed names beside the authoring guide, and let writers focus on words while the component guarantees size, colour and accessibility defaults. For teams publishing how to use SVG icons in Astro for documentation sites, the MDX pattern is the difference between a docs site that stays consistent for years and one that accumulates a different icon style per article. Astro SVG icons in prose should be as boring and reliable as the headings around them.",
      },
      { type: "h2", text: "Dark mode and theming for static icons" },
      {
        type: "p",
        text: "**Static sites theme icons with CSS, not JavaScript.** Astro SVG icons inherit currentColor, so a site that toggles dark mode through a class on the document element needs no icon-specific JavaScript at all: the same CSS variables that recolour text recolour glyphs. The trap is a hard-coded fill inside an exported SVG, which ignores the theme and glows wrong in dark mode, so every icon source should be audited for fixed colours before it enters the shared folder. When writing about how to use SVG icons in Astro with theming, the audit step belongs in the guide, because static sites have no runtime to paper over a bad fill. Astro SVG icons themed through variables are free; themed through per-icon overrides, they are a maintenance burden.",
      },
      {
        type: "p",
        text: "**Semantic colours deserve tokens in static sites too.** Success, warning and error states on a static site still need consistent hues, and those hues should come from design tokens rather than from an author's memory of a hex value. Define the tokens once in the global stylesheet, consume them through utility classes on the icon component, and verify contrast in both themes with a screenshot pass. Teams that treat how to use SVG icons in Astro as a token problem find that a rebrand touches one file instead of every page, which is precisely the leverage static sites are supposed to provide. Astro SVG icons in semantic roles should also never rely on colour alone: pair the hue with a distinct shape or a text label, so the meaning survives monochrome printing and colour vision differences.",
      },
      { type: "h2", text: "Icons with Tailwind in Astro" },
      {
        type: "p",
        text: "**Tailwind utilities are the natural sizing language.** In an Astro plus Tailwind project, Astro SVG icons take their size from utility classes such as h-4 w-4 applied to the icon component, and the component must forward class to the rendered svg for this to work. The convention to document is a size scale mapped to roles: 16px for inline text icons, 20px for navigation, 24px for section headers, with larger display sizes reserved for feature graphics. When guides cover how to use SVG icons in Astro with Tailwind, they should stress class forwarding, because a component that swallows class is the most common reason utilities appear to fail. Astro SVG icons sized by utilities stay consistent with the spacing and typography scales around them, which is the whole point of a utility system.",
      },
      {
        type: "p",
        text: "**Dark variants compose without extra work.** Tailwind's dark variant recolours text and therefore recolours Astro SVG icons automatically when they use currentColor, so a dark-mode icon strategy in Astro is usually just the existing text colour strategy applied consistently. The exceptions to check are icons inside components with their own background, such as cards or callouts, where the icon should inherit the card's foreground token rather than the page's. For teams documenting how to use SVG icons in Astro with Tailwind, a short section on these nested contexts prevents the most common dark-mode icon bug, which is a glyph that is technically themed but practically invisible against its container. Astro SVG icons in Tailwind projects reward the same discipline as every other utility: consistent tokens, no one-off values.",
      },
      { type: "h2", text: "Optimising icon SVG at build time" },
      {
        type: "p",
        text: "**Optimise at build time, not by hand.** Designer exports and library SVGs arrive with metadata, decimal-heavy paths and redundant groups, and Astro SVG icons should be cleaned by a build step rather than by developers editing path data. An SVGO pass in the build, or a pre-commit optimisation of the shared icon folder, typically shrinks glyphs substantially and removes the fixed width and height attributes that fight utility sizing. When explaining how to use SVG icons in Astro efficiently, the optimisation step should be presented as infrastructure, configured once and forgotten, rather than as a chore repeated per icon. Astro SVG icons optimised at build time stay small without anyone remembering to optimise them.",
      },
      {
        type: "p",
        text: "**Measure the icon payload per page.** Astro's zero-JavaScript promise concerns scripts, but icon markup still travels in HTML, and a page that inlines the same large glyph twenty times pays for it in bytes. The check is simple: build the site, inspect the largest pages, and count icon markup repetition; where one glyph repeats heavily, a sprite or a shared symbol definition earns its place. Teams that take how to use SVG icons in Astro seriously should add this check to their performance routine, because icon bytes are invisible in a Lighthouse JavaScript audit and easy to miss. Astro SVG icons measured per page stay honest about their cost, and honest costs are what keep static sites fast.",
      },
      { type: "h2", text: "Icons inside framework islands" },
      {
        type: "p",
        text: "**Islands should reuse the static icon contract.** When an Astro page hydrates a React, Vue or Svelte island, Astro SVG icons inside that island come from the island's own icon package, and the risk is a second visual system appearing inside an otherwise consistent page. The fix is a shared decision: either the island renders icons from the same family and size scale as the static shell, or the island accepts icons as props from the Astro parent, which renders them statically and passes them in. When documenting how to use SVG icons in Astro with islands, the prop-passing pattern deserves a worked example, because it is the only approach that keeps the island's iconography identical to the shell's without duplicating the set. Astro SVG icons that cross the island boundary through props are the most reliable kind.",
      },
      {
        type: "p",
        text: "**Keep island icon JavaScript minimal.** An island that imports a full icon library for two glyphs defeats Astro's partial hydration story, so island components should import icons by name from a tree-shakeable package, exactly as a standalone app would. Audit island bundles with the same discipline as page scripts, and prefer passing static SVG from the Astro parent whenever the glyph never changes after hydration. For teams scaling how to use SVG icons in Astro with many islands, this audit is what prevents the slow creep of duplicated icon code into every hydrated component. Astro SVG icons in islands should cost the same as Astro SVG icons anywhere else: exactly the glyphs used, nothing more.",
      },
      { type: "h2", text: "Accessibility for static iconography" },
      {
        type: "p",
        text: "**Static does not mean automatically accessible.** Astro SVG icons that are purely decorative must carry aria-hidden, and icon-only links and buttons need accessible names, just as in any framework; the static nature of the site changes nothing about these requirements. The advantage Astro offers is that these attributes can be baked into the shared Icon component once, so every usage inherits correct behaviour without author intervention. When guides describe how to use SVG icons in Astro accessibly, the shared component is the hero of the story, because it turns accessibility from a per-usage reminder into a default. Astro SVG icons through a component with aria-hidden by default and a label prop for meaningful cases are accessible by construction.",
      },
      {
        type: "p",
        text: "**Test the rendered HTML, not the source.** Because Astro renders at build time, the accessibility check that matters is the built HTML: view source on a representative page and confirm decorative glyphs are hidden and icon-only controls are labelled. Add this check to the build review for icon-heavy templates, and consider an automated HTML audit that flags svg elements without aria-hidden or a title where a label is expected. For teams finalising how to use SVG icons in Astro, a built-HTML check catches the failures that source review misses, such as a component that renders correctly in isolation but loses its label when composed inside a link. Astro SVG icons verified in output HTML are verified where users actually meet them.",
      },
      { type: "h2", text: "Growing the icon system as the site grows" },
      {
        type: "p",
        text: "**Start small and let the system earn complexity.** The healthiest Astro SVG icons trajectory starts with inline components, graduates to a data package when the count justifies it, and adopts sprites or build-time imports only when repetition is measured. Each graduation should be a deliberate pull request with a reason, not a fashion-driven rewrite, because every layer of machinery is a layer someone must maintain. When advising how to use SVG icons in Astro for a growing site, the graduation ladder is more useful than any single recommendation, since it tells a team not just what to use now but when to change. Astro SVG icons that grow by measured steps never carry machinery the site has not yet earned.",
      },
      {
        type: "p",
        text: "**Document the current rung of the ladder.** Wherever the system sits today, a short document stating the approach, the allowed sets, the size scale and the migration path to the next rung saves every future contributor from guessing. Update that document in the same pull request as any icon change, and review it when the glyph count crosses a threshold, such as fifty or two hundred, since thresholds are the honest trigger for graduation. Teams that maintain how to use SVG icons in Astro as living documentation find that onboarding a new contributor takes minutes rather than days. Astro SVG icons with a written system outlast the people who built them, which is the truest test of any engineering choice.",
      },
      { type: "h2", text: "Responsive sizing for static icons" },
      {
        type: "p",
        text: "**Static pages still need a responsive icon plan.** For Astro SVG icons, the glyph should stay constant while the layout adapts around it, and Astro SVG icons that change size per breakpoint make a site feel different on every device. Teams planning how to use SVG icons in Astro responsively should size icons by role rather than by screen, because Astro SVG icons sized by role stay consistent from phone to desktop. The advice on how to use SVG icons in Astro at responsive scale is to check the smallest viewport first, since Astro SVG icons that work at 360px work everywhere else.",
      },
      {
        type: "p",
        text: "**Collapse toolbars instead of shrinking glyphs.** For Astro SVG icons, shrinking below 16px on small screens trades legibility for completeness, and Astro SVG icons hidden behind a menu preserve both. Teams designing how to use SVG icons in Astro for mobile should define a collapse order per toolbar, because Astro SVG icons without a plan overflow or crowd. The practice for how to use SVG icons in Astro on small screens is a documented order, so Astro SVG icons degrade predictably instead of breaking the layout.",
      },
      { type: "h2", text: "Directional icons and RTL for static sites" },
      {
        type: "p",
        text: "**Mirror arrows when the page direction flips.** For Astro SVG icons, directional glyphs such as back, forward and chevrons must mirror in right-to-left layouts, and Astro SVG icons that ignore direction confuse readers who scan right to left. Teams implementing how to use SVG icons in Astro internationally should use logical CSS properties that flip automatically, because Astro SVG icons handled with manual overrides rot with every redesign. The standard for how to use SVG icons in Astro across locales is a documented list of directional glyphs, so Astro SVG icons mirror exactly where they should.",
      },
      {
        type: "p",
        text: "**Check RTL in the built HTML.** For Astro SVG icons, the verification that matters is the built page in an RTL locale, navigated end to end, and Astro SVG icons that fail there are cheap to fix before release. Teams testing how to use SVG icons in Astro globally should add one RTL page to their visual checks, because Astro SVG icons in mirrored layouts are easy to verify and embarrassing to miss. The discipline for how to use SVG icons in Astro at global scale is a locale pass before launch, so Astro SVG icons never become an afterthought.",
      },
      { type: "h2", text: "Icons in Starlight and documentation themes" },
      {
        type: "p",
        text: "**Docs themes bring their own icon conventions.** For Astro SVG icons, a Starlight-based documentation site already ships its own iconography for callouts, navigation and search, and Astro SVG icons added by authors should match that existing language rather than introducing a second family. Teams learning how to use SVG icons in Astro for documentation should first inventory what the theme already provides, because Astro SVG icons that duplicate theme glyphs create visual noise. The guidance on how to use SVG icons in Astro docs is to extend the theme's set sparingly, so Astro SVG icons feel native to the docs rather than pasted on.",
      },
      {
        type: "p",
        text: "**Custom docs glyphs belong in one override file.** For Astro SVG icons, any glyph beyond the theme's set should live in a single documented override location, and Astro SVG icons added anywhere else scatter across the docs and drift. Teams managing how to use SVG icons in Astro documentation should review custom glyphs with the same care as content changes, because Astro SVG icons in docs are seen by every reader. The rule for how to use SVG icons in Astro docs sites is one override file and one reviewer, so Astro SVG icons stay as consistent as the prose around them.",
      },
      { type: "h2", text: "A request process for new static-site icons" },
      {
        type: "p",
        text: "**Route new glyphs through a short request.** For Astro SVG icons, a template asking for the meaning, the page and the nearest existing glyph prevents most duplicates, and Astro SVG icons added through requests stay inside the documented family. Teams formalising how to use SVG icons in Astro at scale should review requests alongside content changes, because Astro SVG icons requested during a campaign are how second families enter a site. The habit for how to use SVG icons in Astro in growing teams is periodic request review, so Astro SVG icons grow deliberately rather than accidentally.",
      },
      {
        type: "p",
        text: "**Answer requests with the existing set first.** For Astro SVG icons, the most common outcome is discovering the set already covers the need, and Astro SVG icons found this way cost nothing and keep the system intact. Teams stewarding how to use SVG icons in Astro should reply with a screenshot of the closest existing glyph at production size, because Astro SVG icons judged at poster size mislead requesters. The principle for how to use SVG icons in Astro over years is slow, deliberate growth, so Astro SVG icons added today still belong to the same family tomorrow.",
      },
      { type: "h2", text: "Onboarding contributors onto the icon system" },
      {
        type: "p",
        text: "**Teach the shared component before the first page.** For Astro SVG icons, a new contributor's first lesson should be the Icon component, the size scale and the curated name map, and Astro SVG icons explained through the component become a system rather than scattered markup. Teams onboarding around how to use SVG icons in Astro should put icon conventions in the contributor guide, because Astro SVG icons are often the first thing a new author touches. The guidance for how to use SVG icons in Astro in contributor teams is that conventions taught early are conventions kept, so Astro SVG icons stay consistent through turnover.",
      },
      {
        type: "p",
        text: "**Review the first icon change as teaching.** For Astro SVG icons, a contributor's first glyph addition, reviewed against the checklist, teaches more than any document, and Astro SVG icons handled in a reviewed first change set the standard for everything after. Teams practising how to use SVG icons in Astro with new contributors should treat that review as teaching, because Astro SVG icons reviewed early prevent habits that audits later punish. The rule for how to use SVG icons in Astro at community scale is that every contributor's first icon change is reviewed, so Astro SVG icons remain a shared standard.",
      },
      { type: "h2", text: "Frequently asked questions" },
      { type: "h3", text: "Does astro-icon add any JavaScript to the page?" },
      {
        type: "p",
        text: "No. astro-icon resolves icon names at build time against locally installed data packages and inlines the resulting SVG into the HTML. There is no client runtime, no fetch and no hydration involved. If a page using astro-icon ships JavaScript, it came from an island or another integration, not from the icons.",
      },
      { type: "h3", text: "Should I inline icons or use an SVG sprite in Astro?" },
      {
        type: "p",
        text: "Inline by default. Component-based inlining is simpler, themes with currentColor, and compresses well because HTML transfers with gzip or brotli. Use a sprite when the same glyph repeats dozens of times on one page or must appear inside content where components cannot be used. Avoid external sprite files, which reintroduce requests and caching complexity.",
      },
      { type: "h3", text: "Can I use lucide-react for icons in an Astro site?" },
      {
        type: "p",
        text: "Yes, but only inside React islands, where it behaves exactly as it does in a React app. For the static parts of the page, use the same Lucide artwork as inline SVG through astro-icon or local components. Mixing the two sources is safe because the artwork and grid are identical; what you must avoid is hydrating an island solely to render icons.",
      },
      { type: "h3", text: "Why does my icon change size between pages?" },
      {
        type: "p",
        text: "Inconsistent sizing comes from missing width and height on some instances or from a global CSS rule that scales svg elements in prose. Fix it at the component layer: give every icon component a default size prop, and scope any prose-specific svg rules so they cannot leak into components. Consistency at 16, 20 and 24px covers nearly all real layouts.",
      },
      { type: "h3", text: "Are icon fonts ever acceptable in Astro?" },
      {
        type: "p",
        text: "Practically, no. An icon font adds a stylesheet and a font file to the critical path, swaps glyphs in after load, and announces meaningless characters to assistive technology. Every icon font glyph exists as SVG in the same family, and the patterns in this guide render that SVG with zero JavaScript, so the font has no remaining advantage.",
      },
    ],
  },
  {
    slug: "nextjs-svg-icons",
    title: "SVG Icons in Next.js: Complete Guide and Best Packs",
    description:
      "How to use SVG icons in Next.js App Router projects: lucide-react, SVGR, next/image trade-offs, server components, and the best icon packs for Next.js in 2026.",
    category: "Frameworks",
    tags: ["next.js", "react", "app router", "svgr"],
    keyword: "SVG icons in Next.js",
    date: "2026-10-10",
    updated: "2026-10-23",
    readingMinutes: 33,
    icon: "triangle",
    tint: "#111827",
    content: [
      {
        type: "p",
        text: "**SVG icons in Next.js** look simple until the App Router asks awkward questions: does this icon render in a Server Component, does it hydrate, and what does it cost the bundle? This guide gives the patterns that survive production.",
      },
      { type: "h2", text: "The App Router mental model for icons" },
      {
        type: "p",
        text: "In the Pages Router era, an icon was just a component in the bundle. The App Router adds a boundary: every file is a Server Component until a 'use client' directive says otherwise, and code only ships to the browser when it sits inside, or is imported by, a client component. Icons matter in this model because they are everywhere: a header, a sidebar and a pricing table can reference forty glyphs. If those files are server components, the icons render to HTML on the server and cost the client almost nothing beyond the markup. If the same files become client components for one interactive widget, every glyph they import joins the JavaScript bundle. Managing SVG icons in Next.js is therefore mostly boundary management, and the tools below are chosen with that lens.",
      },
      { type: "h2", text: "The default: lucide-react in Server and Client Components" },
      {
        type: "p",
        text: "lucide-react components are plain SVG wrappers with no client-side state, so they render happily inside Server Components and stream with the page. Import icons by name, size them with className, and let tree-shaking do the rest. This covers 90 percent of Next.js apps. Preview the full set in [Lucide on IconVault](/app?set=lucide).",
      },
      { type: "code", text: "import { ArrowRight, Search } from \"lucide-react\";\n\nexport default function Page() {\n  return <Search className=\"h-5 w-5\" aria-hidden />;\n}" },
      {
        type: "p",
        text: "The same holds for the other major component packages: Heroicons, Tabler and Phosphor React builds are all stateless presentational components, so they are equally at home on the server. What disqualifies a package from server files is never the icon itself; it is a dependency on hooks, context or browser APIs somewhere in its import chain. If an icon-related import forces a client boundary you did not plan, that is a packaging smell worth investigating rather than accepting.",
      },
      { type: "h2", text: "Custom SVGs: SVGR vs a components folder" },
      {
        type: "p",
        text: "For brand marks and one-off glyphs you have two clean options. SVGR converts .svg files into components at build time, which suits design-system repos. A hand-maintained components/icons folder suits app codebases: paste the SVG, swap fills for currentColor, export a typed component. IconVault's [SVG to JSX converter](/tools/svg-to-jsx) generates that component shape directly. Avoid next/image for icons: it is built for photographs, adds wrapper markup, and cannot inherit currentColor.",
      },
      { type: "h3", text: "Setting up SVGR in Next.js" },
      {
        type: "p",
        text: "SVGR needs a webpack rule, added in next.config, that routes .svg imports to @svgr/webpack while keeping Next's file handling for other assets. On projects using Turbopack, the equivalent configuration lives under the turbopack rules key in recent Next.js versions. Whichever bundler you use, verify both directions after setup: an imported logo becomes a component, and an .svg referenced as a URL, for example in metadata or an img tag, still resolves as a file where you rely on that behaviour.",
      },
      {
        type: "code",
        text: "// next.config.mjs\nconst nextConfig = {\n  webpack(config) {\n    config.module.rules.push({\n      test: /\\.svg$/i,\n      issuer: /\\.[jt]sx?$/,\n      use: [\"@svgr/webpack\"],\n    });\n    return config;\n  },\n};\nexport default nextConfig;",
      },
      {
        type: "p",
        text: "TypeScript needs one declaration before SVGR imports type-check, because Next's generated types describe .svg modules as image data. Add a declarations file that tells the compiler the component type, and keep it next to your other ambient types:",
      },
      {
        "type": "code",
        "text": "// svg.d.ts\ndeclare module \"*.svg\" {\n  import type { SVGProps } from \"react\";\n  const Component: (props: SVGProps<SVGSVGElement>) => JSX.Element;\n  export default Component;\n}"
      },
      { type: "h3", text: "When the components folder beats SVGR" },
      {
        type: "p",
        text: "SVGR shines when designers drop finished artwork into a repo and engineers should not touch it. The components folder wins when icons are product code: you can add props for size and title, normalise stroke settings, write a test that every icon exposes aria-hidden by default, and refactor ten glyphs in one commit. Many mature codebases run both: SVGR for a brand and illustration directory that changes rarely, hand components for the interface set that evolves weekly. Run artwork through the [SVG optimizer](/tools/svg-optimizer) before either route, because neither SVGR nor good intentions remove editor cruft from source files.",
      },
      { type: "h2", text: "Best icon packs for Next.js projects" },
      {
        type: "ul",
        items: [
          "**Lucide**: the App Router default; server-component friendly and shadcn/ui's set. [Browse](/app?set=lucide).",
          "**Heroicons**: ideal with Tailwind; outline and solid variants for interactive states. [Browse](/app?set=heroicons).",
          "**Tabler Icons**: when a dashboard needs breadth without a second package. [Browse](/app?set=tabler).",
          "**Simple Icons**: brand logos for auth buttons and footer socials. [Browse](/app?set=simple-icons).",
          "**Phosphor**: multiple weights for design systems that outgrow one stroke weight. [Browse](/app?set=ph).",
        ],
      },
      {
        type: "p",
        text: "Choosing among them is mostly about the interface you are building. Content and marketing surfaces tolerate, and often prefer, the friendlier geometry of Phosphor or the editorial feel of Heroicons solid for emphasis states. Dense product UI rewards Lucide's discipline or Tabler's depth, where the four-hundredth glyph still matches the first. Let one constraint dominate: the set must cover your roadmap's needs without a second package, because the day a dashboard imports two families for coverage, visual consistency starts leaking. The [libraries directory](/libraries) lists all 239 sets on IconVault with counts and licences, which makes the coverage check a ten-minute task instead of a mid-project surprise.",
      },
      { type: "h2", text: "Dynamic icons without shipping the whole set" },
      {
        type: "p",
        text: "Some features genuinely need icons chosen at runtime: a link-in-bio builder where users pick a glyph, a category admin with an icon field, an icon picker in a CMS. The naive implementation imports a registry of the entire set and renders by name, which hands every visitor the full library for a feature a fraction of them open. In Next.js, structure it in layers. Keep a curated allow-list as a plain record mapping your names to lazy component imports. Render the picker itself with next/dynamic so its code splits into a chunk that loads when the picker opens. Store the user's choice as the icon name string, and resolve it through the same map at render time on both server and client, so there is no hydration mismatch.",
      },
      {
        type: "code",
        text: "import dynamic from \"next/dynamic\";\n\nconst IconPicker = dynamic(() => import(\"./IconPicker\"), {\n  loading: () => <p className=\"text-sm\">Loading icons...</p>,\n});",
      },
      {
        type: "p",
        text: "Note the boundary discipline: the dynamic import lives in the client component that owns the interaction, while the surrounding page stays a server component. If your picker truly needs thousands of glyphs searchable by name, fetch icon data on demand from an API route or render options as images from a CDN sprite workflow rather than bundling data; the [full icon browser](/app) on IconVault exists precisely so end users do not need that machinery in your product.",
      },
      { type: "h2", text: "Favicons and metadata icons in the App Router" },
      {
        type: "p",
        text: "Next.js treats site icons as file conventions: place icon.svg in the app directory for the favicon, apple-icon.png for Apple touch icons, and use the metadata API for Open Graph images. SVG favicons scale perfectly and support dark-mode media queries inside the file, and every modern browser accepts them, with a PNG fallback for legacy contexts. Keep the artwork brutally simple at 16px, since a detailed logo collapses into noise at tab size. Generate a complete, correctly sized set, including the ICO and touch variants, with the [favicon generator](/tools/favicon-generator), and remember that metadata images are brand assets, not interface icons, so they should not be forced into your icon system's stroke rules.",
      },
      { type: "h2", text: "Styling and sizing conventions that scale" },
      {
        type: "p",
        text: "Adopt a small size scale and refuse improvisation: 16px inside controls and dense lists, 20px for toolbar and navigation actions, 24px for standalone and empty-state usage, with display sizes reserved for marketing surfaces. In Tailwind terms that is h-4, h-5 and h-6 doing nearly all the work, always paired so aspect ratio survives. Colour stays inherited through currentColor, with semantic tokens for status and the occasional brand exception. If your team uses CSS modules or vanilla CSS instead, the same rules translate into three utility classes. What matters is that the scale exists in writing, because icon sizing debates are unresolvable by taste at review time and trivially resolvable by a documented scale. Stroke width follows the set's native convention; do not let one team's preference for lighter icons fork the system.",
      },
      { type: "h2", text: "Performance and accessibility checks" },
      {
        type: "p",
        text: "Keep icons out of client bundles when they only appear in server-rendered chrome like headers and footers, set explicit sizes to avoid layout shift, and label icon-only buttons properly. The deeper checklist lives in our guides to [SVG icons and Core Web Vitals thinking](/blog/optimize-svg-icons-for-faster-sites) and [accessible SVG icons](/blog/accessible-svg-icons). For the React-wide picture, see the [best React icon libraries](/blog/react-svg-icons).",
      },
      {
        type: "ul",
        items: [
          "Audit the client bundle after icon changes with the bundle analyser; icon regressions hide in shared chunks and layouts, not in the page you edited.",
          "Check that layout and template files importing icons are server components unless they truly need interactivity, because a layout going client ships its icons to every route.",
          "Confirm icon-only buttons expose names in the accessibility tree; Next.js gives you no free pass here, it is the same aria-label and sr-only discipline as any React app.",
          "Verify no layout shift from icons by loading key pages with throttling; explicit sizes on icon components and image-based brand marks both matter.",
          "Prefer keeping marketing chrome server-rendered and measure first-load JS per route in the build output table Next prints, watching the shared-by-all figure.",
        ],
      },
      { type: "h2", text: "Common errors and fixes" },
      { type: "h3", text: "You are importing a component that needs use client" },
      {
        type: "p",
        text: "This error appears when a server component imports something whose chain touches client-only APIs. Pure icon packages do not cause it, so look past the icon in the import list to siblings: an interactive wrapper, a tooltip, or a package barrel that re-exports client utilities. Isolate the real offender, move the interactive part behind a small client component, and let the icons stay on the server where they were innocent.",
      },
      { type: "h3", text: "The SVG import returns image data instead of a component" },
      {
        type: "p",
        text: "Without a working SVGR rule, importing an .svg gives you the static image object Next uses for img sources, and rendering it as a component fails or stringifies oddly. Confirm the webpack or Turbopack rule matches your file's issuer and extension, restart the dev server after config changes, since Next caches config at startup, and check that a conflicting rule for images is not claiming .svg first.",
      },
      { type: "h3", text: "Icons render at the wrong size only in production" },
      {
        type: "p",
        text: "A dev-versus-production size difference usually means class purging: a dynamically constructed class string, such as a template that joins 'h-' with a variable, is invisible to Tailwind's scanner and the utility never gets generated. Use complete class names from a lookup record for dynamic sizes. The other classic cause is a global svg rule in a CSS file that only loads in one environment's cascade order; explicit width and height utilities on the component end the argument.",
      },
      { type: "h3", text: "Bundle grew after adding an icon package" },
      {
        type: "p",
        text: "Inspect the analyser before blaming the package. The usual culprits are a barrel import inside a shared component, an icon registry built for a picker, or the package being imported by a client layout that every route inherits. Fix the import shape first: named imports from the package root, registries split behind dynamic imports, and shared chrome audited for accidental client directives. If the package itself lacks per-icon modules, wrap the glyphs you use as local components and drop the dependency, using artwork sourced from the [set pages](/libraries).",
      },
      { type: "h2", text: "Pages Router projects: what still applies" },
      {
        type: "p",
        text: "Plenty of production Next.js apps still run the Pages Router, and nothing about icons forces a migration. lucide-react and friends work identically, SVGR configuration is the same webpack rule, and the components folder pattern predates the App Router entirely. The differences are emphasis: there is no server-component boundary to exploit, so every icon in a page's import graph is client JavaScript by default, which makes tree-shaking and dynamic imports for pickers more important, not less. next/image guidance is unchanged: keep it for photographs, not glyphs. If you later adopt the App Router route by route, icons are the easy part, since stateless icon components move across the boundary without modification.",
      },
      { type: "h3", text: "Auth buttons and brand icons deserve extra care" },
      {
        type: "p",
        text: "Sign-in buttons are where Next.js apps most often break their own icon rules, because brand glyphs arrive from a different world than interface icons. Use the official marks from Simple Icons at their brand colours, resist tinting them to match your theme, and keep the provider name as visible text beside the glyph, which both major identity providers require in their branding guidance anyway. A button that reads 'Continue with Google' next to the accurate mark will outperform a row of anonymous glyphs on clarity and on audit day. These buttons usually live in server-rendered auth pages, so they cost no client JavaScript when built from components, one more reason to skip the image-based shortcut.",
      },
      { type: "h2", text: "Icons in places components cannot go: OG images, email and PDFs" },
      {
        type: "p",
        text: "Next.js apps routinely need icon artwork outside the React tree. Open Graph images generated with next/og render through Satori, which accepts inline SVG as JSX but not component packages or external files in the way pages do; plan on pasting the few paths you need into the image template, styled explicitly, at display sizes where a simplified glyph reads better than the detailed interface version. Transactional email is stricter: most clients ignore SVG entirely, so icons in email templates should be small hosted PNGs rendered from your SVG sources with a tool like the [SVG to PNG converter](/tools/svg-to-png), with alt text doing the communicative work. Generated PDFs sit between the two, usually accepting embedded SVG through the rendering library. The principle is consistent: the icon system is the single source of artwork, and each output channel gets the format it can actually render.",
      },
      {
        type: "code",
        text: "import { ImageResponse } from \"next/og\";\n\nexport function GET() {\n  return new ImageResponse(\n    (\n      <div style={{ display: \"flex\", alignItems: \"center\", gap: 24 }}>\n        <svg width=\"64\" height=\"64\" viewBox=\"0 0 24 24\" fill=\"none\"\n             stroke=\"#0F766E\" strokeWidth=\"2\">\n          <circle cx=\"11\" cy=\"11\" r=\"7\" />\n          <path d=\"M21 21l-4.3-4.3\" />\n        </svg>\n        <span style={{ fontSize: 48 }}>Your headline</span>\n      </div>\n    ),\n    { width: 1200, height: 630 }\n  );\n}",
      },
      { type: "h2", text: "RTL layouts and directional icons" },
      {
        type: "p",
        text: "If your Next.js app serves right-to-left locales, icons need a policy, because some glyphs are directional and some are not. Arrows, chevrons, back and forward affordances and progress indicators should mirror in RTL so the interface still points where the user's reading direction says forward is. Logos, clocks, magnifiers, settings gears and media symbols should never mirror; a flipped clock is simply wrong. Implement the distinction deliberately: a utility class or a dir-aware wrapper that applies a horizontal flip transform to the directional subset only, driven by the document direction Next already knows from your locale routing. Test with a real RTL locale during development rather than bolting it on later, because the bugs are the visual kind that automated tests rarely catch and users in those locales notice instantly.",
      },
      { type: "h2", text: "Testing icons in a Next.js codebase" },
      {
        type: "p",
        text: "Two inexpensive habits catch most icon regressions. First, include the accessibility tree in component tests for icon-bearing controls: assert the button's name, not the presence of an svg node, so a refactor that swaps a labelled button for a bare glyph fails loudly. Second, screenshot the icon-dense routes, navigation, dashboard chrome and empty states, in your visual regression setup, and review diffs at production sizes rather than zoomed. Server components make one more check worthwhile: view the page source of a server-rendered route and confirm the svg markup is present in the HTML, which proves the boundary discipline is working and no icon is waiting on hydration to exist. When a bundle analyser report is part of release hygiene, icon package deltas deserve the same glance as any dependency, since they change silently and often.",
      },
      { type: "h2", text: "The Next.js icon checklist" },
      {
        type: "ul",
        items: [
          "One interface family, imported by name, with brand marks as the documented exception.",
          "Layouts and chrome stay server components, so their icons render as HTML instead of bundle weight.",
          "Custom artwork lives in components/icons or flows through a verified SVGR setup, with the ambient type declaration committed.",
          "Runtime icon selection uses a curated allow-list, and pickers load behind dynamic imports.",
          "Favicons use the App Router file conventions as SVG first, with generated PNG fallbacks.",
          "Icon-only controls expose accessible names, sizes are explicit, and bundle impact is checked after package changes.",
        ],
      },
      { type: "h2", text: "Upgrading icon packages without breaking the build" },
      {
        type: "p",
        text: "Icon libraries evolve: glyphs get redrawn, renamed or occasionally removed, and a major version bump can turn a routine dependency update into a scavenger hunt of red imports. Keep upgrades boring by treating them as their own change. Read the release notes for renames, run a project-wide search for the affected names before bumping, and let the TypeScript compiler list every broken import after the bump rather than discovering them at runtime. Because named imports fail loudly at build time, icon packages are actually among the safest dependencies to upgrade aggressively, provided the upgrade is isolated. The dangerous pattern is the opposite: an icon package pinned forever because it is entangled with unrelated upgrades, quietly fossilising the visual language of the product.",
      },
      {
        type: "p",
        text: "A related habit is to record your icon decisions where future maintainers will find them. A short section in the project readme naming the chosen family, the size scale, the custom icons folder and the brand exception saves every new hire the same archaeology, and it turns design reviews from taste debates into consistency checks. The system documented in this guide is deliberately unremarkable: one family, named imports, server-first rendering, curated dynamics. Its value is not novelty; it is that every developer on the project can predict where an icon comes from and what it costs, on every route, without opening a bundle report in anger.",
      },
      { type: "h2", text: "Choosing a pack for App Router versus Pages Router" },
      {
        type: "p",
        text: "**The router changes less than you fear.** Whether a project uses the App Router or the Pages Router, Next.js SVG icons render the same way: as components imported by name and rendered as SVG. The real difference is where the boundary falls: App Router projects can render icons in Server Components for free, while Pages Router projects render everything on the client by default, so the bundle conversation differs even though the icons do not. When teams evaluate how to use SVG icons in Next.js for a new project, the router question should therefore be settled on data-fetching and routing grounds, not icon grounds, and Next.js SVG icons should be chosen on coverage, stroke and licence. A pack that is right for the App Router is right for the Pages Router too, because icons are presentation, not routing.",
      },
      {
        type: "p",
        text: "**Migration between routers keeps icons intact.** Projects moving from Pages to App Router often fear a rewrite of their icon layer, but Next.js SVG icons survive the migration untouched when they are plain components: the same imports render in Server Components, and only the components around them change. The work that does arise is organisational, such as moving shared chrome into Server Components so icons render without client JavaScript, which is a performance win rather than a cost. Guidance on how to use SVG icons in Next.js during a migration should say this plainly, because teams delay valuable router upgrades over an icon rewrite that never needed to happen. Next.js SVG icons are among the most portable assets in a Next.js codebase, and that portability is worth protecting with clean component boundaries.",
      },
      { type: "h2", text: "Design tokens for icons in Next.js and Tailwind" },
      {
        type: "p",
        text: "**Tokens turn icon choices into system choices.** In a Next.js plus Tailwind project, Next.js SVG icons should draw size and colour from tokens: a size scale for roles, a colour scale for states, and a stroke convention for the family. The token layer lives in the wrapper component or in CSS variables, and feature code consumes tokens rather than raw classes, so a redesign touches one file instead of every screen. When teams document how to use SVG icons in Next.js at scale, the token section is what separates a style guide from a wish list, because tokens are enforceable while advice is not. Next.js SVG icons behind tokens stay consistent through redesigns, rebrands and team growth, which is the entire purpose of a token system.",
      },
      {
        type: "p",
        text: "**Keep tokens framework-agnostic where possible.** A token defined as a CSS variable survives a move from Tailwind utilities to another styling approach, while a token baked into a Tailwind-only class does not, so the durable habit is variables for colour and a small component API for size. This matters for Next.js SVG icons because Next.js projects live for years and styling fashions change faster than icon needs do. For developers planning how to use SVG icons in Next.js for the long term, a variable-first token layer is cheap insurance: it costs nothing today and saves a migration tomorrow. Next.js SVG icons themed through variables also compose cleanly with dark mode, since the theme flip changes variables and every glyph follows without code changes.",
      },
      { type: "h2", text: "Icons in navigation, sidebars and breadcrumbs" },
      {
        type: "p",
        text: "**Navigation glyphs are the product's signature.** Users learn a product's navigation icons before they learn its features, so Next.js SVG icons in sidebars and top bars should be chosen from the core of the set, frozen early, and changed only with a migration plan. Active states deserve one consistent treatment across every nav item, whether that is a filled variant, a colour shift or a background change, because mixed active treatments read as bugs. When teams prototype how to use SVG icons in Next.js navigation, they should build the full sidebar with real labels and real data, since Next.js SVG icons that look balanced in isolation often crowd each other beside 14px text. Navigation is the most-seen surface in any app, and icon discipline there pays off on every screen.",
      },
      {
        type: "p",
        text: "**Breadcrumbs and wayfinding need restraint.** Breadcrumb separators, back chevrons and home glyphs are small but high-frequency Next.js SVG icons, and their job is to be forgettable: consistent, quiet and identical on every page. The pattern that works is a single separator component, a single back-button treatment, and a rule that breadcrumbs never introduce a second icon family for decoration. For teams writing standards on how to use SVG icons in Next.js, the breadcrumb rule sounds trivial until the first marketing page adds a decorative arrow that leaks into the app. Next.js SVG icons in wayfinding roles should be boring by design, because wayfinding that draws attention to itself has failed at its job.",
      },
      { type: "h2", text: "Icons in forms, tables and dashboards" },
      {
        type: "p",
        text: "**Dense screens punish decorative icons.** Dashboards pack Next.js SVG icons into tables, filters and cards, and the rule that keeps them readable is a strict size scale with decoration removed: 16px for row actions, 20px for toolbar actions, larger sizes only for section headers. A glyph that does not help the user act or understand should not be in a dense screen at all, because every decorative icon competes with data the user actually needs. When planning how to use SVG icons in Next.js dashboards, prototype with real data density, since Next.js SVG icons that look calm in an empty frame often feel noisy beside ten columns of numbers. The dashboard test is unforgiving and correct: remove the icon, and if the row gets clearer, the icon never belonged there.",
      },
      {
        type: "p",
        text: "**Form icons hint, labels decide.** A search glyph in a filter input or a calendar glyph beside a date field helps scanning, but Next.js SVG icons in forms must never carry meaning the label does not, since screen readers and keyboard users may never encounter the glyph. The accessible pattern is a visible label plus a decorative icon marked aria-hidden, with status icons in validation messages reinforcing text that already exists. For teams documenting how to use SVG icons in Next.js forms, this distinction is the whole accessibility story in one paragraph: decorative glyphs hidden, meaningful glyphs labelled, no glyph as the sole signal. Next.js SVG icons used this way make forms faster for everyone without excluding anyone.",
      },
      { type: "h2", text: "Server and Client Component icon patterns in depth" },
      {
        type: "p",
        text: "**Server Components are the free lunch for icons.** Because icon components are stateless SVG, Next.js SVG icons render inside React Server Components with no client boundary, no hydration cost and no JavaScript shipped for the glyph itself. The practical consequence is that shared chrome such as headers, sidebars and footers should stay Server Components wherever possible, importing icons directly and streaming them with the page. When developers learn how to use SVG icons in Next.js, the Server Component pattern should be taught first, because it reframes icons from a bundle cost into a markup cost, which is nearly always cheaper. Next.js SVG icons in Server Components are the closest thing to free iconography the framework offers.",
      },
      {
        type: "p",
        text: "**Client Components need the same discipline, not different icons.** When a component must be a client component, for interactivity or state, its Next.js SVG icons follow the same rules: import by name, never through a namespace, and keep the icon list explicit so tree-shaking can do its job. The mistake to avoid is a client-side icon picker that imports the whole set for one feature; the allow-list map pattern from this guide's dynamic section exists precisely for that case. For teams finalising how to use SVG icons in Next.js, the rule to write down is that the client boundary changes where code runs, not how icons are chosen. Next.js SVG icons chosen well render identically on both sides of the boundary, and users should never be able to tell which side rendered the glyph they see.",
      },
      { type: "h2", text: "Marketing pages and app UI in one repository" },
      {
        type: "p",
        text: "**One repository, two icon registers.** Most Next.js repositories serve a marketing site and an application from the same codebase, and Next.js SVG icons on a landing page are display graphics at 32 or 48px while app icons are controls at 16px. The healthy arrangement is one family with two documented treatments: a control treatment for the app and a display treatment for marketing, differing only in size and possibly stroke. When teams plan how to use SVG icons in Next.js across both surfaces, they should define the display treatment explicitly, because an undocumented display style drifts into the app within months. Next.js SVG icons with two documented registers stay coherent across the funnel, so a visitor who signs up meets glyphs they already recognise.",
      },
      {
        type: "p",
        text: "**Guard the boundary between registers.** If marketing demands a second, more expressive family for hero graphics, confine it to marketing sections and forbid it in application chrome, with the boundary written in the icon readme rather than enforced by hope. Review marketing pull requests for icon leakage the way app pull requests are reviewed for it, because the leak direction is almost always marketing into product. For developers maintaining how to use SVG icons in Next.js in a growing company, this boundary is what prevents the slow accumulation of a second system inside the product. Next.js SVG icons that respect the boundary keep the product feeling like one designed object, even as the marketing site experiments freely.",
      },
      { type: "h2", text: "Performance budgets for icons" },
      {
        type: "p",
        text: "**Give icons a budget line.** A performance budget that names an icon allowance, for example a maximum number of distinct glyphs per route or a byte ceiling for icon packages, turns icon discipline from advice into a number CI can check. The measurement is straightforward: run the bundle analyser per route, record the icon contribution, and fail the build when a route exceeds its allowance without justification. When teams adopt how to use SVG icons in Next.js with budgets, they discover that most violations come from a single careless import or a picker that slipped past review, both fixable in minutes. Next.js SVG icons with a budget stay small because the budget makes growth visible before it becomes a problem.",
      },
      {
        type: "p",
        text: "**Audit routes, not just the app total.** An app-level icon total hides the route that imports three families for one screen, so the audit should be per route, using Next.js build output and the analyser's per-page breakdown. The routes to watch are dashboards and settings screens, where feature teams add icons without coordinating, and the fix is usually a mapping exercise rather than a rewrite. For teams practising how to use SVG icons in Next.js responsibly, a quarterly per-route audit is a one-hour habit with a measurable payoff in load time. Next.js SVG icons audited per route are icons under control, and control is what lets a team keep adding features without the bundle quietly doubling.",
      },
      { type: "h2", text: "Accessibility: icon buttons, focus and reduced motion" },
      {
        type: "p",
        text: "**Icon-only buttons need names, not tooltips alone.** A tooltip that appears on hover helps mouse users and nobody else, so Next.js SVG icons in icon-only buttons need an accessible name through aria-label or sr-only text, naming the action rather than the glyph. The wrapper is the enforcement point: require a label prop whenever no visible text accompanies the icon, so the rule cannot be forgotten at individual call sites. When writing standards for how to use SVG icons in Next.js accessibly, this requirement should be a hard rule with examples, because icon-only buttons are the most common accessibility failure in Next.js applications. Next.js SVG icons without labels are decoration; with labels, they are controls, and the difference is the whole product for some users.",
      },
      {
        type: "p",
        text: "**Focus rings and reduced motion complete the contract.** A keyboard user must see where focus sits on every icon button, so the button component must guarantee a visible focus ring that survives theming, and a motion-sensitive user must be able to disable icon animations through prefers-reduced-motion. Test both with a keyboard and with reduced motion enabled, tabbing through navigation, toolbars and dialogs, since these are the surfaces where Next.js SVG icons concentrate. For teams finalising how to use SVG icons in Next.js, a fifteen-minute keyboard and motion pass catches the failures automated tools miss. Next.js SVG icons that are labelled, focusable and motion-respectful meet the baseline for shipping to real users, not an optional extra.",
      },
      { type: "h2", text: "Upgrading and documenting the icon system" },
      {
        type: "p",
        text: "**Upgrade icon packages in dedicated pull requests.** Icon sets occasionally rename glyphs between releases, and a rename that arrives bundled with a feature release becomes a confusing scavenger hunt, while the same rename in its own pull request is a five-minute fix. Pin Next.js SVG icons packages to tested versions, read the release notes for renames before upgrading, and grep the codebase for affected names as part of the upgrade. When teams plan how to use SVG icons in Next.js over years, this boring discipline is what keeps the system boring, and boring is the goal. Next.js SVG icons upgraded deliberately never surprise a release, because the surprise was already handled in its own reviewable change.",
      },
      {
        type: "p",
        text: "**The icon readme is part of the system.** A short document stating the chosen family, the size scale, the wrapper location, the mapping table and the upgrade procedure saves every future contributor from archaeology, and it should be updated in the same pull request as any icon change. Add a visual catalogue, whether in Storybook or a simple page, rendering every approved glyph at its approved sizes with its import path, so proposals for new glyphs can be judged against the existing set. For developers handing over how to use SVG icons in Next.js to a growing team, the readme and catalogue are what turn a personal preference into a team standard. Next.js SVG icons with documentation outlast the people who chose them, which is the truest test of any engineering decision.",
      },
      { type: "h2", text: "Responsive sizing in Next.js apps" },
      {
        type: "p",
        text: "**Breakpoints change chrome, not glyphs.** For Next.js SVG icons, the glyph should stay constant while the layout adapts, and Next.js SVG icons that change size per breakpoint make an app feel different on every device. Teams planning how to use SVG icons in Next.js responsively should size icons by role rather than by screen, because Next.js SVG icons sized by role stay consistent from phone to desktop. The advice on how to use SVG icons in Next.js at responsive scale is to audit the smallest viewport first, since Next.js SVG icons that work at 360px work everywhere else.",
      },
      {
        type: "p",
        text: "**Collapse toolbars instead of shrinking glyphs.** For Next.js SVG icons, shrinking below 16px on small screens trades legibility for completeness, and Next.js SVG icons hidden behind an overflow menu preserve both. Teams designing how to use SVG icons in Next.js for mobile should define a collapse order per toolbar, because Next.js SVG icons without a plan overflow or crowd. The practice for how to use SVG icons in Next.js on small screens is a documented order, so Next.js SVG icons degrade predictably instead of breaking the layout.",
      },
      { type: "h2", text: "Directional icons and RTL in Next.js" },
      {
        type: "p",
        text: "**Mirror arrows when direction flips.** For Next.js SVG icons, directional glyphs such as back, forward and chevrons must mirror in right-to-left layouts, and Next.js SVG icons that ignore direction confuse users who read right to left. Teams implementing how to use SVG icons in Next.js internationally should use logical utilities that flip automatically, because Next.js SVG icons handled with manual overrides rot with every redesign. The standard for how to use SVG icons in Next.js across locales is a documented list of directional glyphs, so Next.js SVG icons mirror exactly where they should.",
      },
      {
        type: "p",
        text: "**Verify RTL with a real locale run.** For Next.js SVG icons, English screenshots cannot prove RTL correctness, and Next.js SVG icons in a mirrored layout must be checked by running the app in an RTL locale and navigating through it. Teams testing how to use SVG icons in Next.js globally should add one RTL screen to their visual regression suite, because Next.js SVG icons that fail there are cheap to fix and costly to ship. The discipline for how to use SVG icons in Next.js at global scale is a locale pass before every release, so Next.js SVG icons never become an afterthought.",
      },
      { type: "h2", text: "Icons in loading and error states" },
      {
        type: "p",
        text: "**Loading states deserve purpose-drawn glyphs.** For Next.js SVG icons, a loading spinner built from a generic icon looks cheap, and Next.js SVG icons in loading.tsx deserve a clean circular arc that reads at small sizes. Teams designing how to use SVG icons in Next.js loading states should keep the spinner consistent across routes, because Next.js SVG icons that change per route make waiting feel longer. The guidance on how to use SVG icons in Next.js for loading is one spinner, one size scale, and Next.js SVG icons that never distract from the content that is coming.",
      },
      {
        type: "p",
        text: "**Error pages need calm, recognisable iconography.** For Next.js SVG icons, an error.tsx page should use a single restrained glyph plus clear text, and Next.js SVG icons that shout on an error page add stress to an already bad moment. Teams planning how to use SVG icons in Next.js error states should pair the glyph with a recovery action, because Next.js SVG icons beside a retry button guide users forward. The rule for how to use SVG icons in Next.js error handling is restraint: one glyph, one message, one action, so Next.js SVG icons help users recover instead of decorating their frustration.",
      },
      { type: "h2", text: "A request process for new Next.js icons" },
      {
        type: "p",
        text: "**Route new glyphs through a request template.** For Next.js SVG icons, a short template asking for the meaning, the screen and the nearest existing glyph prevents most duplicates, and Next.js SVG icons added through requests stay inside the documented family. Teams formalising how to use SVG icons in Next.js at scale should review requests weekly, because Next.js SVG icons requested during feature work are how second families enter a codebase. The habit for how to use SVG icons in Next.js in growing teams is weekly request review, so Next.js SVG icons grow deliberately rather than accidentally.",
      },
      {
        type: "p",
        text: "**Answer requests with the existing set first.** For Next.js SVG icons, the most common outcome is discovering the set already covers the need, and Next.js SVG icons found this way cost nothing and keep the system intact. Teams stewarding how to use SVG icons in Next.js should reply with a screenshot of the closest existing glyph at production size, because Next.js SVG icons judged at poster size mislead requesters. The principle for how to use SVG icons in Next.js over years is slow, deliberate growth, so Next.js SVG icons added today still belong to the same family tomorrow.",
      },
      { type: "h2", text: "Onboarding developers onto the Next.js icon system" },
      {
        type: "p",
        text: "**Teach the wrapper and the budget on day one.** For Next.js SVG icons, a new developer's first lesson should be the wrapper, the size tokens and the per-route budget, and Next.js SVG icons explained through those three things become a system rather than a folder of imports. Teams onboarding around how to use SVG icons in Next.js should put icon conventions in the onboarding checklist, because Next.js SVG icons are often the first code a newcomer touches. The guidance for how to use SVG icons in Next.js in hiring teams is that conventions taught early are conventions kept, so Next.js SVG icons stay consistent through turnover.",
      },
      {
        type: "p",
        text: "**Review the first icon change as teaching.** For Next.js SVG icons, a newcomer's first glyph addition or swap, reviewed against the checklist, teaches more than any document, and Next.js SVG icons handled in a reviewed first task set the standard for everything after. Teams practising how to use SVG icons in Next.js with new hires should treat that review as teaching, because Next.js SVG icons reviewed early prevent habits that audits later punish. The rule for how to use SVG icons in Next.js at team scale is that every developer's first icon change is reviewed, so Next.js SVG icons remain a shared standard.",
      },
      { type: "h2", text: "Frequently asked questions" },
      { type: "h3", text: "Do lucide-react icons work in Server Components?" },
      {
        type: "p",
        text: "Yes. Lucide icons are stateless components that render SVG markup, with no hooks or browser dependencies, so they work in Server Components and stream as HTML. The same is true of Heroicons, Tabler and Phosphor React packages. A client boundary is only required when the importing component itself needs interactivity or browser state.",
      },
      { type: "h3", text: "Should I use next/image for icons in Next.js?" },
      {
        type: "p",
        text: "No. next/image is engineered for raster photographs: it adds wrapper markup, serves resized image files, and cannot inherit currentColor or respond to CSS colour. Icons should be inline SVG components, which scale cleanly, theme with the page and cost no extra requests. Reserve next/image for photos, screenshots and generated Open Graph assets.",
      },
      { type: "h3", text: "What is the best icon library for Next.js in 2026?" },
      {
        type: "p",
        text: "For most App Router projects, Lucide is the safest default: server-friendly, tree-shaken by named imports, and the set shadcn/ui builds on. Choose Heroicons for a Tailwind-first marketing feel, Tabler when a dashboard needs unusual breadth, and Phosphor when your design system needs multiple weights. All four are browsable side by side on IconVault.",
      },
      { type: "h3", text: "How do I use my own SVG files as Next.js components?" },
      {
        type: "p",
        text: "Either configure SVGR to transform .svg imports into components, or maintain a components/icons folder of hand-written components. For app codebases the folder is usually better: you control props, defaults and accessibility, and artwork normalised through an SVG to JSX converter drops straight in. Add the ambient module declaration so TypeScript accepts the imports either way.",
      },
      { type: "h3", text: "Why did my First Load JS grow after adding icons to the layout?" },
      {
        type: "p",
        text: "Layouts ship to every route, so their imports are everyone's cost. If the layout or a component it imports carries a client directive, its icons join the shared client bundle; if it imports icons through a barrel or registry, the whole set can follow. Keep layouts as server components, import icons by name, and split any picker-style registries behind dynamic imports.",
      },
    ],
  },
];
