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
    readingMinutes: 8,
    icon: "component",
    tint: "#111827",
    content: [
      {
        type: "p",
        text: "**shadcn/ui icons** come from Lucide by default, and for most projects that default is correct. This guide covers when to keep it, how to swap in a different set cleanly, and how to add your own custom SVG icons without fighting the framework.",
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
      { type: "h2", text: "Swapping in a different icon set" },
      {
        type: "p",
        text: "If your product already uses another family, replace the imports component by component rather than installing a second system globally. Heroicons and Tabler both match Lucide's outline weight closely; Phosphor works too if you standardise on its Regular weight. Preview candidates side by side in the [Lucide](/app?set=lucide), [Tabler](/app?set=tabler) and [Heroicons](/app?set=heroicons) sets before committing. The rule that keeps shadcn/ui icons coherent: one set per app, no exceptions for a single cute icon.",
      },
      { type: "h2", text: "Adding a custom SVG icon" },
      {
        type: "p",
        text: "For a logo or a glyph no library has, create a small component that accepts className, uses currentColor, and sets aria-hidden when decorative. Keep the original viewBox (usually 0 0 24 24) and remove hard-coded fills so the icon inherits your theme. IconVault's [SVG to JSX converter](/tools/svg-to-jsx) produces exactly this component shape from any SVG file.",
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
      {
        type: "p",
        text: "Done well, shadcn/ui icons disappear into the interface, which is the point. For the wider ecosystem view, read our comparison of the [best React icon libraries](/blog/react-svg-icons).",
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
    readingMinutes: 8,
    icon: "layers",
    tint: "#059669",
    content: [
      {
        type: "p",
        text: "There are four sane ways to use **SVG icons in Vue 3**, and the right one depends on how many icons you need and how much bundle discipline you want. This guide walks through each approach with the trade-offs stated plainly.",
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
      { type: "h2", text: "Option 2: @iconify/vue for every set at once" },
      {
        type: "p",
        text: "Iconify's Vue component can render any icon from any open-source set by name, including all 239 sets indexed on IconVault. It is the fastest way to prototype with mixed sets, but production apps should bundle icon data locally rather than depending on runtime API calls. Pick your finalists from the [set directory](/collections) and lock in one family.",
      },
      { type: "h2", text: "Option 3: unplugin-icons for compile-time imports" },
      {
        type: "p",
        text: "unplugin-icons turns icon names into components at build time (for example ~icons/lucide/search) and works with Vite and Nuxt. You get auto-import ergonomics with zero runtime cost, at the price of one more build plugin to maintain.",
      },
      { type: "h2", text: "Option 4: local SVG components" },
      {
        type: "p",
        text: "For a small, stable icon set, nothing beats copying the SVG into a local component with currentColor and a size prop. Generate the component from any icon using IconVault's copy-as-Vue output on the [browse page](/app), or convert files in bulk with the [SVG to JSX and component tools](/tools/svg-to-jsx). No dependency, no surprises, full control.",
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
      {
        type: "p",
        text: "Whichever route you take for SVG icons in Vue 3, consistency of the underlying set matters more than the integration method. Compare candidate sets in our [free SVG icon libraries roundup](/blog/best-free-svg-icon-libraries-2026) before you wire anything up.",
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
    readingMinutes: 7,
    icon: "rocket",
    tint: "#D97706",
    content: [
      {
        type: "p",
        text: "Astro's whole promise is zero JavaScript by default, and **SVG icons in Astro** should honour that: an icon is markup, not a runtime. Here are the patterns that keep icons fast, from hand-inlined SVG to component islands.",
      },
      { type: "h2", text: "Pattern 1: inline the SVG (the zero-JS default)" },
      {
        type: "p",
        text: "For content sites, the fastest icon is the one pasted directly into your .astro template. It costs no requests, no hydration and no dependency, and Astro will not add a byte of JS for it. Keep a components/icons folder, one file per icon, with currentColor so themes apply. Copy production-ready markup for any icon from [IconVault](/app) instead of hand-cleaning files.",
      },
      { type: "h2", text: "Pattern 2: astro-icon with local data packages" },
      {
        type: "p",
        text: "When a project needs hundreds of icons, astro-icon plus the @iconify-json data packages gives you name-based usage with build-time inlining: the icon becomes static SVG in the HTML, still zero client JS. This is the sweet spot for documentation sites and blogs that pull from several sets like [Lucide](/app?set=lucide) and [Simple Icons](/app?set=simple-icons).",
      },
      { type: "h2", text: "Pattern 3: icons inside framework islands" },
      {
        type: "p",
        text: "If part of the page is a React, Vue or Svelte island, use that framework's icon package inside the island (lucide-react, lucide-vue-next and friends) and static SVG everywhere else. Do not hydrate a whole island just to render a search icon in the header: that is the most common way Astro sites quietly lose their performance edge. Our guide to [optimizing SVG icons for faster sites](/blog/optimize-svg-icons-for-faster-sites) covers the measurement side.",
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
      {
        type: "p",
        text: "Handled this way, SVG icons in Astro are effectively free: a few hundred bytes of HTML, cached with the page, rendered before first paint. Browse the sets you can draw from in the [IconVault collections directory](/collections).",
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
    readingMinutes: 8,
    icon: "triangle",
    tint: "#111827",
    content: [
      {
        type: "p",
        text: "**SVG icons in Next.js** look simple until the App Router asks awkward questions: does this icon render in a Server Component, does it hydrate, and what does it cost the bundle? This guide gives the patterns that survive production.",
      },
      { type: "h2", text: "The default: lucide-react in Server and Client Components" },
      {
        type: "p",
        text: "lucide-react components are plain SVG wrappers with no client-side state, so they render happily inside Server Components and stream with the page. Import icons by name, size them with className, and let tree-shaking do the rest. This covers 90 percent of Next.js apps. Preview the full set in [Lucide on IconVault](/app?set=lucide).",
      },
      { type: "code", text: "import { ArrowRight, Search } from \"lucide-react\";\n\nexport default function Page() {\n  return <Search className=\"h-5 w-5\" aria-hidden />;\n}" },
      { type: "h2", text: "Custom SVGs: SVGR vs a components folder" },
      {
        type: "p",
        text: "For brand marks and one-off glyphs you have two clean options. SVGR converts .svg files into components at build time, which suits design-system repos. A hand-maintained components/icons folder suits app codebases: paste the SVG, swap fills for currentColor, export a typed component. IconVault's [SVG to JSX converter](/tools/svg-to-jsx) generates that component shape directly. Avoid next/image for icons: it is built for photographs, adds wrapper markup, and cannot inherit currentColor.",
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
      { type: "h2", text: "Performance and accessibility checks" },
      {
        type: "p",
        text: "Keep icons out of client bundles when they only appear in server-rendered chrome like headers and footers, set explicit sizes to avoid layout shift, and label icon-only buttons properly. The deeper checklist lives in our guides to [SVG icons and Core Web Vitals thinking](/blog/optimize-svg-icons-for-faster-sites) and [accessible SVG icons](/blog/accessible-svg-icons). For the React-wide picture, see the [best React icon libraries](/blog/react-svg-icons).",
      },
    ],
  },
];
