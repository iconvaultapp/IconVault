// Blog batch C: fundamentals, performance and accessibility. Original content.
import type { BlogPost } from "./blog";

export const POSTS_C: BlogPost[] = [
  {
    slug: "how-to-use-svg-icons",
    title: "How to Use SVG Icons: A Practical Guide for Modern Web Apps",
    description:
      "How to use SVG icons in modern web apps: inline SVG, SVG sprites, icon fonts and components compared, plus sizing, colouring with currentColor and accessibility basics.",
    category: "Guides",
    tags: ["svg basics", "inline svg", "sprites", "currentcolor"],
    keyword: "how to use SVG icons",
    date: "2026-10-19",
    readingMinutes: 8,
    icon: "mouse-pointer-click",
    tint: "#0F766E",
    content: [
      {
        type: "p",
        text: "Learning **how to use SVG icons** properly is a one-time investment that pays off on every project: crisp rendering at any size, full CSS control, and no extra image requests. This guide covers the four delivery methods, when each one wins, and the details teams usually get wrong.",
      },
      { type: "h2", text: "Method 1: inline SVG (the default for apps)" },
      {
        type: "p",
        text: "Paste the SVG markup where the icon belongs. It inherits colour from CSS, can be styled per-instance, and needs no network request. In component frameworks this is what icon packages do under the hood. Keep the viewBox, drop fixed width and height attributes, and control size with CSS or utility classes.",
      },
      {
        type: "code",
        text: "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\"\n     stroke-width=\"2\" class=\"h-5 w-5\" aria-hidden=\"true\">\n  <path d=\"M21 21l-4.3-4.3\" />\n  <circle cx=\"11\" cy=\"11\" r=\"7\" />\n</svg>",
      },
      { type: "h2", text: "Method 2: SVG sprites for static sites" },
      {
        type: "p",
        text: "A sprite defines each icon once as a symbol and references it with use elements across the page. It suits multi-page sites without a build step: one cached file, tiny HTML references, and CSS colouring still works when the symbol uses currentColor. The trade-off is weaker per-icon styling and awkward external-file behaviour in some older browsers.",
      },
      { type: "h2", text: "Method 3: icon components and packages" },
      {
        type: "p",
        text: "In React, Vue and other frameworks, install a package (or copy components) so icons behave like the rest of your UI code: typed props, tree-shaking and theme-aware colour. Our framework guides for [React](/blog/react-svg-icons), [Vue 3](/blog/vue-svg-icons-guide), [Astro](/blog/astro-svg-icons-guide) and [Next.js](/blog/nextjs-svg-icons) cover the specifics.",
      },
      { type: "h2", text: "Method 4: icon fonts (mostly legacy)" },
      {
        type: "p",
        text: "Icon fonts render icons as text glyphs. They were practical in 2013; today they blur on some displays, flash while loading, break when the font fails, and fight screen readers. Migrate away when you can: the [Font Awesome alternatives](/blog/font-awesome-alternatives) roundup lists modern SVG sets that cover the same ground for free.",
      },
      { type: "h2", text: "Sizing, colour and alignment rules" },
      {
        type: "ul",
        items: [
          "Size icons on the same scale as your type: 16px beside body text, 20px in toolbars, 24px for standalone actions.",
          "Colour with currentColor so icons follow text colour, hover states and dark mode automatically.",
          "Align to the text baseline using inline-flex or vertical-align, and give icon buttons a minimum 40px touch target on mobile.",
          "Mark decorative icons aria-hidden, and give meaningful icon-only buttons an accessible name.",
        ],
      },
      {
        type: "p",
        text: "That is the whole craft: pick one consistent set from the [239 libraries on IconVault](/collections), deliver it as components or inline SVG, and let CSS do the theming. Everything else is refinement.",
      },
    ],
  },
  {
    slug: "svg-vs-png-icons",
    title: "SVG vs PNG Icons: What to Use and When",
    description:
      "SVG vs PNG icons compared on sharpness, file size, colour control, animation and browser support, with a simple decision rule for web and app projects.",
    category: "Guides",
    tags: ["svg", "png", "formats", "performance"],
    keyword: "SVG vs PNG icons",
    date: "2026-10-13",
    readingMinutes: 6,
    icon: "scale",
    tint: "#0891B2",
    content: [
      {
        type: "p",
        text: "**SVG vs PNG icons** is a settled debate with a few real exceptions. SVG wins for interface icons almost every time; PNG still has jobs it is genuinely better at. Here is the honest breakdown.",
      },
      { type: "h2", text: "Where SVG wins" },
      {
        type: "ul",
        items: [
          "**Sharpness**: vectors scale to any display density without a 2x or 3x export dance.",
          "**File size**: a typical UI icon is 300 bytes to 2 KB as SVG, versus several KB per PNG size variant.",
          "**Colour control**: one SVG recolours via CSS for hover, active and dark-mode states; PNG needs a new file per colour.",
          "**Animation and interaction**: SVG paths can transition and morph; PNG frames cannot.",
          "**One file, every size**: no srcset bookkeeping for icons.",
        ],
      },
      { type: "h2", text: "Where PNG still wins" },
      {
        type: "ul",
        items: [
          "**Favicons and app icons** in some legacy contexts still expect PNG or ICO at fixed sizes.",
          "**Email clients** with poor SVG support (notably older Outlook) need raster fallbacks for icon-like images.",
          "**Highly detailed artwork**: complex illustrations with gradients and textures can be smaller and safer as WebP or PNG.",
          "**Open Graph and social images** are raster by specification.",
        ],
      },
      { type: "h2", text: "The decision rule" },
      {
        type: "p",
        text: "If it is an interface glyph (navigation, actions, status, form controls), ship SVG. If it is a picture, a platform-mandated asset, or destined for email, ship a raster format at the exact size needed. When a design hands you PNG icons for a web UI, convert the workflow rather than the files: find the same glyph as SVG in [IconVault's icon sets](/collections), or turn an SVG into an exact-size PNG with the [SVG to PNG converter](/tools/svg-to-png) when a platform demands it.",
      },
      {
        type: "p",
        text: "For most teams the practical answer to SVG vs PNG icons is: design and build in SVG, export PNG only at the boundaries (favicons, app stores, email, social). That keeps one source of truth and zero blurry icons.",
      },
    ],
  },
  {
    slug: "optimize-svg-icons-for-faster-sites",
    title: "How to Optimize SVG Icons for Faster Sites",
    description:
      "Optimize SVG icons for speed: SVGO settings that matter, removing editor junk, sprite vs inline trade-offs, and how icon choices affect LCP, CLS and total page weight.",
    category: "Performance",
    tags: ["svgo", "core web vitals", "performance", "svg"],
    keyword: "optimize SVG icons",
    date: "2026-10-11",
    readingMinutes: 7,
    icon: "gauge",
    tint: "#DC2626",
    content: [
      {
        type: "p",
        text: "Icons are small, but a page can carry sixty of them. Learning to **optimize SVG icons** properly (clean markup, the right delivery method, no layout shift) is one of the cheapest performance wins on a content or product site.",
      },
      { type: "h2", text: "Strip the editor junk" },
      {
        type: "p",
        text: "Design tools export SVGs full of titles, comments, metadata, unused defs and over-precise path numbers. Running SVGO (or IconVault's [SVG optimizer](/tools/svg-optimizer)) typically cuts 30 to 60 percent of the bytes: it removes metadata, rounds coordinates sensibly, merges paths and minifies IDs. Keep the viewBox, and never let an optimizer strip it: without a viewBox the icon cannot scale.",
      },
      { type: "h2", text: "Choose the right delivery method" },
      {
        type: "ul",
        items: [
          "**Inline** icons in the header and hero render instantly with the HTML: best for above-the-fold glyphs.",
          "**Components** from an icon package tree-shake to only what you use: best for app UIs.",
          "**Sprites** cache once and repeat cheaply: best for long static pages with many repeated icons.",
          "**External .svg files** via img tags are cacheable but cannot inherit currentColor: use them for logos and static artwork, not themed UI icons.",
        ],
      },
      { type: "h2", text: "Icons and Core Web Vitals" },
      {
        type: "p",
        text: "Icons rarely hurt LCP directly, but missing width and height cause **CLS** when late-loading glyphs push content around, and a bloated icon font can delay first paint. Set explicit dimensions on every icon, prefer font-display-safe delivery (SVG has none of these problems), and lazy-load below-the-fold icon systems the same way you would images. Our [how to use SVG icons](/blog/how-to-use-svg-icons) guide covers the implementation patterns behind these rules.",
      },
      { type: "h2", text: "A pre-ship checklist" },
      {
        type: "ul",
        items: [
          "Every SVG optimized: no editor metadata, no embedded raster images, no unused defs.",
          "One icon set across the page: no duplicate libraries shipping the same glyphs twice.",
          "Explicit width and height (or aspect-ratio) on every icon to hold layout space.",
          "currentColor theming, so dark mode does not require a second set of files.",
          "Total icon weight per page under roughly 30 KB compressed.",
        ],
      },
      {
        type: "p",
        text: "Do those five things and your icons stop being a performance topic at all. Start from clean source data: every set in the [IconVault directory](/collections) ships optimized, production-ready SVG output.",
      },
    ],
  },
  {
    slug: "accessible-svg-icons",
    title: "Accessible SVG Icons: aria-label, role and the Rules That Matter",
    description:
      "Make SVG icons accessible: when to hide decorative icons with aria-hidden, how to label icon-only buttons, title elements, focus states and WCAG 2.2 contrast rules.",
    category: "Accessibility",
    tags: ["accessibility", "wcag", "aria", "screen readers"],
    keyword: "accessible SVG icons",
    date: "2026-10-09",
    readingMinutes: 7,
    icon: "accessibility",
    tint: "#7C3AED",
    content: [
      {
        type: "p",
        text: "**Accessible SVG icons** come down to one question: does this icon carry meaning, or is it decoration? Answer that honestly for every icon and the ARIA rules become simple. Get it wrong and screen-reader users hear either silence where information lives, or a stream of meaningless file names.",
      },
      { type: "h2", text: "Decorative icons: hide them properly" },
      {
        type: "p",
        text: "An icon beside a visible text label (a magnifier next to the word Search) adds nothing for a screen reader: the label already says it. Mark those icons aria-hidden=\"true\" and focusable=\"false\". This is most icons on most pages, including nearly every icon inside a labelled button.",
      },
      {
        type: "code",
        text: "<button>\n  <svg aria-hidden=\"true\" focusable=\"false\">...</svg>\n  Search\n</button>",
      },
      { type: "h2", text: "Icon-only buttons: the button needs the name" },
      {
        type: "p",
        text: "When a button is only an icon (close, delete, settings), the accessible name belongs on the **button**, not the SVG: give the button an aria-label or visually hidden text. Labelling the SVG itself with role=\"img\" and a title element is the right pattern only for standalone meaningful icons, like a status glyph in a table cell.",
      },
      {
        type: "code",
        text: "<button aria-label=\"Close dialog\">\n  <svg aria-hidden=\"true\">...</svg>\n</button>",
      },
      { type: "h2", text: "Contrast and target size (WCAG 2.2)" },
      {
        type: "ul",
        items: [
          "Meaningful icons need 3:1 contrast against their background (WCAG non-text contrast).",
          "Interactive icons need a target of at least 24 by 24 CSS pixels, and 40+ is kinder on touch devices.",
          "Never use colour alone: pair status icons with a shape or label difference (check vs cross, not just green vs red).",
          "Focus indicators must remain visible on icon buttons; do not remove outlines without a replacement.",
        ],
      },
      {
        type: "p",
        text: "None of this requires special tooling: it is a review habit. When you pick icons from a set like [Lucide](/app?set=lucide) or [Phosphor](/app?set=ph) on IconVault, decide decorative versus meaningful as you place each one. Our [SVG icons in buttons and navigation patterns](/blog/how-to-use-svg-icons) in the main usage guide show the labelled patterns in context.",
      },
    ],
  },
];
