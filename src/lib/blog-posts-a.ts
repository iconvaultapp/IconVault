// Blog batch A: library comparisons and roundups. Original IconVault content.
import type { BlogPost } from "./blog";

export const POSTS_A: BlogPost[] = [
  {
    slug: "best-free-svg-icon-libraries-2026",
    title: "Best Free SVG Icon Libraries in 2026: Lucide, Tabler, Phosphor and More Compared",
    description:
      "The best free SVG icon libraries in 2026 compared on icon count, style, licence and framework support: Lucide, Tabler, Phosphor, Material Symbols, Heroicons and more.",
    category: "Comparisons",
    tags: ["icon libraries", "lucide", "tabler", "phosphor", "heroicons"],
    keyword: "free SVG icon libraries",
    date: "2026-10-21",
    readingMinutes: 9,
    icon: "library",
    tint: "#0F766E",
    content: [
      {
        type: "p",
        text: "Choosing between the best **free SVG icon libraries** in 2026 is less about raw icon count and more about fit: stroke style, licence, and how the set drops into your stack. IconVault indexes 421,020 icons from 239 open-source sets, so this comparison is based on the same data you can [search in one place](/app) rather than on marketing pages.",
      },
      { type: "h2", text: "The shortlist: free SVG icon libraries worth your time" },
      {
        type: "ul",
        items: [
          "**Lucide** (2,144 icons, ISC): clean 2px outline icons and the default set in shadcn/ui. Best all-rounder for product UI. [Browse Lucide icons](/app?set=lucide).",
          "**Tabler Icons** (6,462 icons, MIT): a huge, consistent 24px outline set that covers almost every niche. [Browse Tabler icons](/app?set=tabler).",
          "**Phosphor** (9,198 icons, MIT): six weights plus duotone, so one family can carry a whole design system. [Browse Phosphor icons](/app?set=ph).",
          "**Material Symbols** (24,569 icons, Apache-2.0): Google's system icons in outline, rounded and sharp styles. [Browse Material Symbols](/app?set=material-symbols).",
          "**Material Design Icons** (14,001 icons, Apache-2.0): the community-extended Material set, strong on brand and app glyphs.",
          "**Heroicons** (1,297 icons, MIT): small but beautifully drawn, made by the Tailwind CSS team. [Browse Heroicons](/app?set=heroicons).",
          "**Solar** (8,682 icons, CC BY 4.0): bold and duotone styles that suit modern dashboards. Remember the attribution requirement.",
          "**Bootstrap Icons** (2,090 icons, MIT): a safe pick if your UI already speaks Bootstrap. [Browse Bootstrap Icons](/app?set=bi).",
        ],
      },
      { type: "h2", text: "How to choose a free SVG icon library" },
      {
        type: "p",
        text: "Start with **style consistency**. Mixing a 1.5px outline set with a filled set makes an interface look assembled, not designed. Pick one primary library and only reach for a second when the first genuinely lacks an icon. Next, check the **licence**: MIT, ISC and Apache-2.0 sets can be used commercially without attribution, while CC BY sets like Solar require a credit. Finally, look at **coverage of boring icons**: navigation, form states, arrows and status glyphs matter far more day to day than a cute mascot icon.",
      },
      { type: "h2", text: "Framework support: npm, components and copy-paste" },
      {
        type: "p",
        text: "Lucide, Phosphor and Heroicons all ship first-party React and Vue packages, and every set on this list is available as plain SVG, which means it works anywhere. If you do not want another dependency at all, you can copy production-ready SVG, JSX, Vue or PNG output for any icon from IconVault and commit it to your repo. Our guide to the [best React icon libraries](/blog/react-svg-icons) goes deeper on bundle size and tree-shaking.",
      },
      { type: "h2", text: "Verdict" },
      {
        type: "p",
        text: "For most product teams in 2026, **Lucide** is the safest default, **Tabler** is the pick when coverage matters, and **Phosphor** wins when you need multiple weights. Whichever free SVG icon library you choose, preview the icons at the size you will actually ship: a set that looks great at 24px can fall apart at 16px. You can compare the same icon across every library from the [IconVault browse page](/app), or explore sets by style in [icon categories](/categories).",
      },
    ],
  },
  {
    slug: "react-svg-icons",
    title: "Best React Icon Libraries in 2026: lucide-react vs Heroicons vs React Icons",
    description:
      "Comparing the best React icon libraries in 2026: lucide-react, Heroicons, React Icons, Phosphor and Tabler on bundle size, tree-shaking, icon count and licence.",
    category: "Frameworks",
    tags: ["react", "lucide-react", "heroicons", "bundle size"],
    keyword: "React icon libraries",
    date: "2026-10-18",
    readingMinutes: 8,
    icon: "atom",
    tint: "#0284C7",
    content: [
      {
        type: "p",
        text: "The best **React icon libraries** all solve the same problem (getting a crisp SVG into a component) but they differ sharply in bundle cost and coverage. Here is how the main options compare in 2026, with the numbers that actually matter.",
      },
      { type: "h2", text: "lucide-react: the default choice" },
      {
        type: "p",
        text: "lucide-react ships 2,144 outline icons as individual ES modules, so a bundler only includes the icons you import. It is the icon set behind shadcn/ui, the licence is ISC, and the drawing style (2px stroke, rounded caps) fits most modern product UI. If you are starting a new React app, start here. You can preview every icon first in the [Lucide set on IconVault](/app?set=lucide).",
      },
      { type: "code", text: "npm install lucide-react" },
      { type: "h2", text: "Heroicons and @heroicons/react" },
      {
        type: "p",
        text: "Heroicons (1,297 icons, MIT) is smaller but exceptionally consistent, and it is the natural partner for Tailwind CSS. Icons come in outline and solid mini variants, which makes state changes (inactive vs active nav items) easy. The trade-off is coverage: long-tail icons like brand marks and niche objects are often missing.",
      },
      { type: "h2", text: "React Icons: every set in one package" },
      {
        type: "p",
        text: "React Icons wraps dozens of libraries (Font Awesome, Material, Bootstrap and more) behind one API. It is convenient for prototypes, but the package is enormous and teams frequently end up mixing visual styles without noticing. If you use it, standardise on one sub-package. Alternatively, skip the dependency and copy only the icons you need from [IconVault's 239 sets](/collections) as local components.",
      },
      { type: "h2", text: "Phosphor and Tabler for React" },
      {
        type: "p",
        text: "@phosphor-icons/react gives you six weights and duotone in one family (9,198 icons, MIT), which no other React icon library matches. @tabler/icons-react offers 6,462 consistently drawn outline icons. Both tree-shake well. Our full roundup of [free SVG icon libraries](/blog/best-free-svg-icon-libraries-2026) compares them with the rest of the field.",
      },
      { type: "h2", text: "Bundle size rules that keep you honest" },
      {
        type: "ul",
        items: [
          "Import icons by name from the package root; never import from an index barrel in a way that defeats tree-shaking.",
          "One icon library per app. Two libraries means two style systems and double the bytes.",
          "For rarely used screens, copy the SVG into a local component instead of growing the dependency graph.",
          "Check the result with your bundler's analyser: a healthy icon footprint is a few KB, not hundreds.",
        ],
      },
      {
        type: "p",
        text: "Whichever React icon library you pick, the workflow is the same: search the icon, check it at production size, and keep the set consistent. IconVault's [React-ready copy formats](/app) give you the exact JSX for any icon without installing anything.",
      },
    ],
  },
  {
    slug: "font-awesome-alternatives",
    title: "8 Free Font Awesome Alternatives That Need No Pro Licence",
    description:
      "Eight free Font Awesome alternatives with open licences: Lucide, Tabler, Phosphor, Bootstrap Icons, Heroicons, Material Symbols, Remix Icon and Feather, compared honestly.",
    category: "Comparisons",
    tags: ["font awesome", "alternatives", "open source", "licence"],
    keyword: "Font Awesome alternatives",
    date: "2026-10-15",
    readingMinutes: 7,
    icon: "replace",
    tint: "#B45309",
    content: [
      {
        type: "p",
        text: "Font Awesome is a fine library, but its best icons sit behind a Pro subscription and the free set has not kept pace with modern UI styles. These **free Font Awesome alternatives** are fully open-source, safe for commercial work, and in most cases better drawn for product interfaces.",
      },
      { type: "h2", text: "The 8 alternatives, honestly assessed" },
      {
        type: "ul",
        items: [
          "**Lucide** (2,144, ISC): the closest modern replacement for FA's solid UI coverage, with a cleaner outline style. [Browse Lucide](/app?set=lucide).",
          "**Tabler Icons** (6,462, MIT): more free icons than FA Free, drawn on one strict 24px grid. [Browse Tabler](/app?set=tabler).",
          "**Phosphor** (9,198, MIT): six weights including duotone, which FA charges for. [Browse Phosphor](/app?set=ph).",
          "**Bootstrap Icons** (2,090, MIT): includes the brand and UI glyphs most FA users actually use. [Browse Bootstrap Icons](/app?set=bi).",
          "**Material Symbols** (24,569, Apache-2.0): the largest free set here, with rounded and sharp styles.",
          "**Heroicons** (1,297, MIT): fewer icons, higher polish; ideal for Tailwind projects. [Browse Heroicons](/app?set=heroicons).",
          "**Remix Icon** (3,244, Apache-2.0): strong on system and editor icons. [Browse Remix Icon](/app?set=ri).",
          "**Feather** (287, MIT): the minimal original that inspired Lucide; tiny but timeless.",
        ],
      },
      { type: "h2", text: "Migrating away from Font Awesome" },
      {
        type: "p",
        text: "Most FA class names map to an obvious equivalent (fa-home becomes a home icon in any set), but do not migrate mechanically. Icon fonts and SVG icons behave differently: SVGs inherit size and colour from CSS, align better with text, and do not flash unstyled glyphs while a font loads. Our comparison of [Bootstrap Icons vs Font Awesome thinking](/blog/best-free-svg-icon-libraries-2026) and the guide on [how to use SVG icons](/blog/how-to-use-svg-icons) cover the practical steps.",
      },
      { type: "h2", text: "Which alternative should you pick?" },
      {
        type: "p",
        text: "If you want a drop-in modern default, choose **Lucide**. If you need FA-level breadth for free, choose **Tabler** or **Material Symbols**. And if you are not sure, search for the specific icons your product uses in [IconVault](/app) and see which set covers all of them in one style: that coverage test is the only migration criterion that never lies.",
      },
    ],
  },
  {
    slug: "best-free-svg-icon-packs-for-product-ui",
    title: "Best Free SVG Icon Packs for Product UI: 10 Design Picks",
    description:
      "Ten free SVG icon packs for product UI compared on style, stroke weight, grid, variants and coverage of navigation, action and status icons, with a clear pick per product type.",
    category: "Design",
    tags: ["product ui", "icon packs", "design systems", "ux"],
    keyword: "SVG icon packs for product UI",
    date: "2026-10-12",
    readingMinutes: 8,
    icon: "palette",
    tint: "#7C3AED",
    content: [
      {
        type: "p",
        text: "Product UI icons live at 16 to 20px, sit next to text labels, and repeat on every screen. That makes the best **SVG icon packs for product UI** different from the best packs for marketing pages: consistency and small-size legibility beat artistic flair. Here are ten free packs, judged on the criteria that matter in a shipping product.",
      },
      { type: "h2", text: "The 10 picks" },
      {
        type: "ul",
        items: [
          "**Lucide**: the safest default. 2px stroke, rounded caps, excellent 16px legibility, and the set shadcn/ui standardised on.",
          "**Phosphor**: pick this when your design system needs weight contrast (bold for active states, regular for rest) without switching families.",
          "**Heroicons**: the Tailwind-native pick; outline and solid mini variants make tab bars and sidebars effortless.",
          "**Tabler Icons**: the coverage king for admin panels and data-heavy products where obscure glyphs appear weekly.",
          "**Material Symbols**: best for Android-adjacent products and Google-style interfaces; use the rounded style for friendlier consumer apps.",
          "**Iconoir**: a distinctive, slightly playful French set that gives consumer products personality without chaos.",
          "**Solar**: bold and duotone styles that suit fintech and modern dashboards; remember CC BY attribution.",
          "**Remix Icon**: neutral system icons that disappear into enterprise UI, in a good way.",
          "**Carbon**: IBM's set, drawn for enterprise data products; excellent charts and technical glyphs.",
          "**Bootstrap Icons**: the pragmatic pick for teams already on Bootstrap components.",
        ],
      },
      { type: "h2", text: "How we judged them" },
      {
        type: "p",
        text: "Four tests: **stroke consistency** inside the set, **small-size legibility** at 16px, **variant support** (a solid or bold version for active states), and **coverage** of the unglamorous core: arrows, form controls, status, files and navigation. Every pack above passes all four; the differences are taste and ecosystem. You can run the same test yourself by opening the same icon in each set on the [IconVault browse page](/app), which previews sets side by side.",
      },
      { type: "h2", text: "One pack, used with discipline" },
      {
        type: "p",
        text: "The most common product UI failure is not a bad pack, it is three packs at once. Choose one of these SVG icon packs for product UI, define your sizes (16/20/24) and stroke rules in the design system, and only break the rule for brand logos. For the wider landscape, see our comparison of the [best free SVG icon libraries in 2026](/blog/best-free-svg-icon-libraries-2026).",
      },
    ],
  },
];
