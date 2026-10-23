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
    readingMinutes: 16,
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
    readingMinutes: 16,
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
    readingMinutes: 16,
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
    readingMinutes: 16,
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
