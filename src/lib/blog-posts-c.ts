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
    updated: "2026-10-23",
    readingMinutes: 16,
    icon: "mouse-pointer-click",
    tint: "#0F766E",
    content: [
      {
        type: "p",
        text: "Learning **how to use SVG icons** properly is a one-time investment that pays off on every project: crisp rendering at any size, full CSS control, and no extra image requests. This guide covers the four delivery methods, when each one wins, and the details teams usually get wrong.",
      },
      { type: "h2", text: "Start with the icon set, not the delivery method" },
      {
        type: "p",
        text: "Most icon problems are set problems, not technique problems. Teams grab glyphs from three different libraries, discover the stroke widths clash, patch sizes icon by icon, and end up with a toolbar that looks subtly wrong everywhere. Before you write a line of markup, pick **one primary set** whose drawing style matches your product: consistent stroke weight, consistent corner radius, and a consistent grid, usually 24 by 24. Every method in this guide works better when the underlying artwork is coherent.",
      },
      {
        type: "p",
        text: "Evaluate a candidate set on coverage, licence and maintenance, in that order. Coverage means the set actually contains the glyphs your roadmap needs, including unglamorous ones like sort, filter, export and empty-state illustrations. Licence means the terms allow commercial use and modification without per-icon attribution gymnastics. Maintenance means the set is still releasing; an abandoned set freezes your product in the year it stopped. You can compare all of these side by side in the [library directory](/libraries) before committing.",
      },
      {
        type: "ul",
        items: [
          "**Stroke or fill, not both**: mixing an outlined set with a filled set in one interface reads as two products. Pick one visual language per surface.",
          "**Grid discipline**: sets drawn on a 24 grid with 2px padding scale predictably. Sets with mixed viewBoxes need per-icon size hacks.",
          "**Name coverage**: search the set for your ten most-needed actions. If three are missing, the set will fight you for years.",
          "**Licence clarity**: MIT and Apache sets are the safest defaults for commercial work. Keep the licence file with your vendored copy.",
        ],
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
      { type: "h3", text: "What to strip before you paste inline SVG" },
      {
        type: "p",
        text: "Raw exports from design tools carry baggage that inline SVG does not need: XML declarations, editor metadata, title elements stuffed with layer names, and width and height attributes that fight your CSS. Before pasting, remove the fixed dimensions, keep the viewBox exactly as drawn, and delete comments and unused defs. If the source uses hard-coded fill colours on every path, replace them with currentColor on the paths you want themed, or the icon will ignore your colour system entirely.",
      },
      {
        type: "ul",
        items: [
          "Remove width and height attributes; size with a class or the width and height props of your icon component instead.",
          "Keep viewBox untouched. Cropping or rounding it shifts the drawing and breaks alignment with sibling icons.",
          "Delete ids inside pasted icons, or namespace them. Duplicate ids across inline SVGs are invalid HTML and gradients or masks will reference the first copy only.",
          "Collapse groups that exist only because of the editor's layer panel; they add bytes and confuse nobody but you, later.",
        ],
      },
      { type: "h3", text: "Inline SVG, step by step" },
      {
        type: "p",
        text: "The reliable routine is always the same. First, copy the icon markup from your set or export it from your design tool. Second, clean it as described above. Third, decide whether it is decorative or meaningful, and add aria-hidden or an accessible name accordingly, a decision our accessibility guide covers in depth. Fourth, drop it into a wrapper with a fixed size class so layout never depends on the icon loading. Fifth, test it at 16, 20 and 24 pixels, in light and dark mode, and at 200 percent zoom. Icons that survive that pass rarely cause trouble again.",
      },
      { type: "h2", text: "Method 2: SVG sprites for static sites" },
      {
        type: "p",
        text: "A sprite defines each icon once as a symbol and references it with use elements across the page. It suits multi-page sites without a build step: one cached file, tiny HTML references, and CSS colouring still works when the symbol uses currentColor. The trade-off is weaker per-icon styling and awkward external-file behaviour in some older browsers.",
      },
      { type: "h3", text: "Building a sprite, step by step" },
      {
        type: "p",
        text: "A sprite file is an SVG document whose children are symbol elements, each with its own viewBox and a unique id. You build it by taking every icon you use, wrapping its inner paths in a symbol, and concatenating the results, a job the [SVG sprite generator](/tools/svg-sprite-generator) does from a folder of files in seconds. Reference an icon anywhere with an svg element whose use child points at the symbol id, and style the svg element itself for size and colour.",
      },
      {
        type: "p",
        text: "Two sprite decisions matter. The first is inline versus external: inlining the sprite at the top of the body makes references bulletproof and costs one copy per page, while an external sprite file caches across pages but historically had quirks when referenced cross-file in some browsers. The second is theming: symbols that use currentColor internally theme beautifully; symbols with baked-in multi-colour artwork do not, so keep brand logos and colourful spot illustrations out of the sprite and inline them where they live.",
      },
      {
        type: "ul",
        items: [
          "Give every symbol a stable, semantic id such as icon-search or icon-arrow-right; renaming ids later breaks every reference silently.",
          "Put the sprite include as early in the body as your stack allows, so use references never render before their definitions arrive.",
          "Version the external sprite file name when icons change, or long-lived caches will serve last month's glyphs.",
          "Do not sprite icons used exactly once on one page; inline those and keep the sprite for genuinely shared glyphs.",
        ],
      },
      { type: "h2", text: "Method 3: icon components and packages" },
      {
        type: "p",
        text: "In React, Vue and other frameworks, install a package (or copy components) so icons behave like the rest of your UI code: typed props, tree-shaking and theme-aware colour. Our framework guides for [React](/blog/react-svg-icons), [Vue 3](/blog/vue-svg-icons-guide), [Astro](/blog/astro-svg-icons-guide) and [Next.js](/blog/nextjs-svg-icons) cover the specifics.",
      },
      { type: "h3", text: "Design your icon component API once" },
      {
        type: "p",
        text: "If you wrap icons in your own component, its props decide whether the system stays clean or decays into per-call-site overrides. A good wrapper exposes size as a small set of tokens rather than raw numbers, accepts a className or style for colour through currentColor, and forwards accessibility props without inventing its own. Resist the temptation to accept a colour prop that injects inline styles everywhere; colour belongs to CSS context, and a component that hard-codes it will fight every theme you ship later.",
      },
      {
        type: "ul",
        items: [
          "**size**: accept token values like sm, md and lg mapped to 16, 20 and 24 pixels, so a future density change is one edit.",
          "**strokeWidth**: expose it only if your set supports it; a global default keeps buttons and menus visually consistent.",
          "**title and decorative flags**: let the wrapper accept either a title for meaningful icons or a decorative flag that applies aria-hidden and focusable false together, so call sites cannot set one and forget the other.",
          "**No default colour**: inherit. The moment a wrapper paints icons a brand colour by default, disabled and error states start lying.",
        ],
      },
      {
        type: "p",
        text: "When you copy icons as JSX from a library or a tool such as the [SVG to JSX converter](/tools/svg-to-jsx), run the output through that wrapper rather than pasting raw svg elements across the codebase. Raw pastes work on day one and become unrefactorable by month three, because nothing central owns size, stroke or accessibility behaviour. Teams that centralise early can restyle every icon in the product by editing one file.",
      },
      { type: "h2", text: "Method 4: icon fonts (mostly legacy)" },
      {
        type: "p",
        text: "Icon fonts render icons as text glyphs. They were practical in 2013; today they blur on some displays, flash while loading, break when the font fails, and fight screen readers. Migrate away when you can: the [Font Awesome alternatives](/blog/font-awesome-alternatives) roundup lists modern SVG sets that cover the same ground for free.",
      },
      { type: "h3", text: "Migrating off an icon font without a big-bang rewrite" },
      {
        type: "p",
        text: "Legacy projects rarely get a freeze for icon work, so migrate incrementally. Start by inventorying the font classes actually rendered, not the ones defined; most fonts ship hundreds of glyphs a product never uses. Map each used class to its SVG equivalent in your chosen set, and note the handful with no match, because those drive custom drawing work. Then swap component by component, keeping the font loaded until the last reference is gone. The visual diff per swap should be near zero; if a replacement glyph looks noticeably different in weight, your set choice, not the migration, is the problem.",
      },
      {
        type: "ul",
        items: [
          "Screenshot key screens before and after each batch; icon regressions are subtle and screenshots catch what memory misses.",
          "Watch text metrics: font glyphs carried line-height behaviour that SVG does not, so expect small alignment fixes in dense toolbars.",
          "Delete the font files and the fallback CSS only after a full crawl shows zero remaining class references.",
          "Keep a short mapping note in the repo; the next migration, or a new hire, will thank you for it.",
        ],
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
      { type: "h2", text: "Troubleshooting: the six mistakes everyone makes once" },
      {
        type: "ul",
        items: [
          "**The icon renders as a giant blob.** The viewBox was stripped or the CSS size class never applied. Restore the viewBox and give the svg element explicit dimensions; an unsized inline SVG defaults to the full width of its container.",
          "**The icon ignores your colour.** Somewhere a fill or stroke attribute hard-codes a hex value and beats inheritance. Remove it, or set it to currentColor, at the path level and the svg level.",
          "**Icons sit too high or too low next to text.** The svg is an inline element aligning to the baseline with descender space below. Wrap icon and label in an inline-flex container with centred alignment instead of nudging with margins.",
          "**One icon looks heavier than its neighbours.** It came from a different set, or its stroke width differs. Match stroke width first; if the set differs, replace the icon, not the CSS.",
          "**Gradients and masks render on the wrong icon.** Duplicate internal ids across inline SVGs collide. Namespace ids per icon, or avoid id-based fills in shared glyphs entirely.",
          "**The icon is blurry at small sizes.** The artwork was drawn for 24 pixels and is being shown at 12, where its details collapse. Choose icons designed with a small-size variant, or accept a simpler glyph at tiny sizes.",
        ],
      },
      { type: "h2", text: "Worked example: one icon, three production contexts" },
      {
        type: "p",
        text: "Take a single search icon through a real page. In the header search button it is decorative, because the button also carries a visible label, so it gets aria-hidden and a 20 pixel size. In the mobile toolbar the same glyph stands alone, so the button gets an accessible name and a 44 pixel touch target while the glyph stays 20 pixels; size and target are separate decisions. In an empty-state illustration the glyph appears at 48 pixels inside a tinted circle, purely decorative, with the heading below carrying the meaning. Same file, three contexts, three different treatments: that judgement, applied consistently, is most of what using SVG icons well means.",
      },
      {
        type: "p",
        text: "Notice what did not change across those contexts: the artwork, the stroke, the viewBox and the colour mechanism. Consistency lives in the source; flexibility lives in the wrapper and the CSS. When a design asks for a one-off icon that breaks the set's rules, the cheapest correct answer is usually a different glyph from the same set, not a custom drawing. Custom icons earn their cost only for brand marks and genuinely novel concepts.",
      },
      {
        type: "p",
        text: "That is the whole craft: pick one consistent set from the [239 libraries on IconVault](/collections), deliver it as components or inline SVG, and let CSS do the theming. Everything else is refinement.",
      },
      { type: "h2", text: "Organising icons inside a design system" },
      {
        type: "p",
        text: "Past a few hundred icons, the delivery method stops being the hard part; governance is. Name icons by concept, not by appearance, so search becomes predictable: a glyph called arrow-right survives a redesign, while one called chevron-thin-blue does not. Keep a single source folder or package that design and engineering both pull from, and treat icon additions like dependency additions, with a quick review for duplicates, near-duplicates and licence fit. Products routinely discover they ship four different close icons; a named registry with a search-first culture prevents the fifth.",
      },
      {
        type: "ul",
        items: [
          "**Aliases for synonyms**: register that bin, trash and delete point at one glyph, so people stop drawing variants of the same idea.",
          "**Deprecation over deletion**: mark replaced icons deprecated for a release or two; hard deletions break screens nobody has opened in months.",
          "**One review question**: does an existing icon already mean this? If yes, the new drawing needs a justification, not just a designer.",
          "**Document state pairs**: for every action icon, define its disabled, hover and destructive appearances once, centrally, instead of per screen.",
        ],
      },
      { type: "h2", text: "Icons beyond the browser: native apps and documents" },
      {
        type: "p",
        text: "The same SVG source usually feeds your native apps and documents, but each target reinterprets it. iOS and Android design systems accept SVG-derived assets through their own pipelines (asset catalogs and vector drawables), and both impose opinions about fills, strokes and unsupported features like masks, so test the conversion rather than trusting it. PDF and print pipelines handle vector icons beautifully as long as fonts inside artwork are converted to outlines. The discipline that makes all of this painless is the same one from the start of this guide: one clean, optimised, viewBox-intact source per icon, owned in one place. Teams that keep that source tidy can publish to any new platform in an afternoon; teams that let exports scatter across design files start every platform launch with an archaeology project.",
      },
      { type: "h2", text: "How each method behaves for performance" },
      {
        type: "p",
        text: "Delivery choice is also a loading choice. Inline SVG adds bytes to the HTML document, which is already on the critical path, so the icons paint with the first render and never shift layout; the cost is paid again on every page that repeats them. Sprites and external files pay one cached download and then cost almost nothing per reference, which wins on long sessions and loses slightly on a single cold page view. Icon fonts concentrate everything into one request but block icon rendering on font loading and produce the familiar flash of letters or boxes when the font is slow. Components behave like inline SVG for rendering, with the advantage that bundlers deduplicate and tree-shake them, so a shared icon used forty times is paid for once per bundle.",
      },
      {
        type: "p",
        text: "The practical rule: optimise for your dominant traffic shape. Content sites with many one-page visits should inline or sprite a small, consistent icon set and keep total icon weight low. Applications with long sessions should componentise, because caching and code splitting reward them on every subsequent screen. Either way, measure the icons you actually ship; our performance guide on [optimizing SVG icons](/blog/optimize-svg-icons-for-faster-sites) shows how to audit the bytes and the rendering cost method by method.",
      },
      { type: "h2", text: "Responsive behaviour and display density" },
      {
        type: "p",
        text: "Vectors free you from the density bookkeeping raster icons demand, but they do not free you from responsive judgement. On narrow screens the right move is usually fewer icons, not smaller ones: collapse secondary actions into a menu rather than shrinking a toolbar until targets fail touch guidelines. Where an icon's meaning is density-dependent, such as a data table that switches from full actions to a compact overflow menu, swap the arrangement at breakpoints while keeping the same glyphs, so users relearn layout, not vocabulary. And remember zoom: browsers scale vector icons perfectly at 200 and 400 percent, which is precisely why accessibility guidance prefers them over raster images that pixelate exactly when low-vision users enlarge the page.",
      },
      { type: "h2", text: "Licence hygiene before you ship" },
      {
        type: "p",
        text: "Technique is only half of using icons properly; the other half is paperwork nobody sees until it matters. Keep the licence text of every set you ship in your repository, record where each set came from and which version you vendored, and recheck terms when you upgrade a set, because licences occasionally change between major versions. Attribution-required sets are fine to use, but only if the attribution actually ships somewhere users and auditors can find, such as a credits page or an about screen. Five minutes of record keeping per set is the difference between a non-event and a legal scramble during due diligence.",
      },
      { type: "h2", text: "Frequently asked questions" },
      {
        type: "h3",
        text: "Should I inline every SVG icon or use a sprite?",
      },
      {
        type: "p",
        text: "Inline the icons that appear above the fold or only once, and sprite the ones repeated across many pages of a static site. In component frameworks, skip both dilemmas and use icon components, which tree-shake and theme like the rest of your code. The deciding factors are repetition, caching and how much per-icon styling you need, not fashion.",
      },
      {
        type: "h3",
        text: "Why does my SVG icon show up black no matter what CSS I write?",
      },
      {
        type: "p",
        text: "A hard-coded fill or stroke attribute in the markup is overriding inheritance. Attributes beat inherited CSS colour because the paths never ask for currentColor. Remove the colour attributes or set them to currentColor, then control the icon through the CSS color property on a parent element, which also makes hover and dark-mode states work for free.",
      },
      {
        type: "h3",
        text: "What size should SVG icons be in a user interface?",
      },
      {
        type: "p",
        text: "Match the icon to the text it sits beside: 16 pixels next to body copy, 20 pixels in toolbars and buttons, 24 pixels for standalone actions and navigation. Keep the clickable target larger than the glyph, at least 40 pixels on touch devices, and test at 200 percent zoom, where cramped icon rows are the first thing to break.",
      },
      {
        type: "h3",
        text: "Can I use SVG icons in email and social images?",
      },
      {
        type: "p",
        text: "Generally no. Several email clients, including older Outlook versions, ignore or mangle SVG, and social platforms require raster images by specification. Export those specific assets as PNG at the exact size needed and keep SVG as the source of truth in your design system, so the raster exports can be regenerated whenever the artwork changes.",
      },
      {
        type: "h3",
        text: "How many icon sets should a product use?",
      },
      {
        type: "p",
        text: "One for the interface, full stop. A second set is acceptable only for a clearly separate surface, such as marketing illustrations, and even then the two should never share a toolbar or a button row. Every additional set adds mismatched strokes, extra bytes and licensing surface, and users read the inconsistency as sloppiness even when they cannot name it.",
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
    updated: "2026-10-23",
    readingMinutes: 16,
    icon: "scale",
    tint: "#0891B2",
    content: [
      {
        type: "p",
        text: "**SVG vs PNG icons** is a settled debate with a few real exceptions. SVG wins for interface icons almost every time; PNG still has jobs it is genuinely better at. Here is the honest breakdown.",
      },
      { type: "h2", text: "The two formats in plain terms" },
      {
        type: "p",
        text: "An SVG icon is a set of drawing instructions: lines, curves and shapes described mathematically in an XML file. The browser replays those instructions at whatever size the layout asks for, which is why one file looks identical at 16 pixels and at 160. A PNG icon is a grid of coloured pixels exported at a fixed size. Show it larger than its export size and the browser stretches the grid, producing the soft, fuzzy edges everyone recognises from retired retina upgrades.",
      },
      {
        type: "p",
        text: "That single difference, instructions versus pixels, explains almost every practical consequence in this comparison. Instructions can be restyled after the fact, recoloured by CSS, animated along their paths and compressed as text. Pixels can be photographed, textured and shaded with arbitrary detail, but they are frozen at export time. Interface icons are almost always simple instruction-shaped artwork, which is why the industry converged on SVG for them, while photographs and rich illustrations remain pixel territory.",
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
      { type: "h2", text: "File size and scaling, worked through honestly" },
      {
        type: "p",
        text: "The size argument is often quoted loosely, so walk through a concrete case. A settings gear drawn in a modern set is a few paths; optimised, it lands well under a kilobyte and serves every size and every density from that one file. The same gear as PNG needs at least three exports for standard, retina and high-density displays, each several kilobytes, and the browser downloads only the variant it uses while the repository, the CDN cache and the design tool carry all three forever. Multiply by a real icon set of one or two hundred glyphs and the vector library is routinely smaller than a single density of its raster equivalent.",
      },
      {
        type: "p",
        text: "The exception cuts the other way and matters: complexity. Add gradients, filters, textures and dozens of overlapping shapes, and SVG file size grows with every instruction, while a raster export flattens all of it into pixels at a predictable cost. That crossover is why detailed spot illustrations and app-store artwork are often raster even in SVG-first design systems, and why converting a photographic image to SVG produces a huge file that looks worse. Format follows artwork, not ideology.",
      },
      { type: "h2", text: "Colour, states and interaction" },
      {
        type: "p",
        text: "Interface icons live in states: default, hover, pressed, selected, disabled, error. With SVG wired to currentColor, states are CSS rules; the icon inherits the button's text colour and changes when the button does, including in dark mode, with zero additional files. With PNG, every state in every colour is another exported asset, so teams quietly stop shipping proper disabled or dark-mode variants and the interface lies a little. Animation widens the gap: SVG paths can transition, dash and morph in response to interaction, while a PNG can only be swapped for another PNG, frame by frame, at asset-pipeline prices. If an icon needs to respond to the user, it wants to be a vector.",
      },
      { type: "h2", text: "Accessibility and semantics compared" },
      {
        type: "p",
        text: "Format choice leaks into accessibility. An inline SVG lives in the document, so it can be hidden from assistive technology when decorative, or given a proper name when meaningful, with the same ARIA toolkit as any other element. A PNG in an img element depends entirely on its alt text: correct when the icon is content, empty when decorative, and too often forgotten in both directions. Screen-reader users feel the difference immediately, because a page of PNG icons with file-name alt text reads like a directory listing, while a well-run SVG system is silent where it should be and labelled where it matters. Our guide to [accessible SVG icons](/blog/accessible-svg-icons) covers the patterns in full.",
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
      { type: "h2", text: "The PNG exceptions, in detail" },
      { type: "h3", text: "Favicons and app icons" },
      {
        type: "p",
        text: "Browsers increasingly accept SVG favicons, and for a simple mark it is the best option, but platform requirements around it remain a patchwork: Apple touch icons are PNG by specification, many legacy and embedded browsers still ask for ICO, and app stores on both mobile platforms demand large PNG artwork at exact sizes. The professional setup is a pipeline, not a choice: keep the master mark as SVG, generate the full raster set from it automatically, and let the build, not a designer with an export dialog, own the size list. A [favicon generator](/tools/favicon-generator) that takes one upload and emits the whole set exists precisely because humans forget sizes.",
      },
      { type: "h3", text: "Email" },
      {
        type: "p",
        text: "Email is the harshest rendering environment your icons will ever meet. Desktop Outlook renders mail with a word-processing engine that ignores SVG entirely, several mobile clients strip or block it inconsistently, and many corporate gateways rewrite image references. Any icon-like element in a production email, social buttons, feature bullets, logos, should be a hosted PNG at the displayed size, with alt text doing the honest work when images are blocked, which for many recipients is the default. Treat email as a raster-only medium and it stops surprising you.",
      },
      { type: "h3", text: "Social and Open Graph images" },
      {
        type: "p",
        text: "Link previews are rendered by platforms, not browsers, and every major platform specifies raster images for them. Your Open Graph image, complete with any iconography it contains, ships as PNG or JPG at the platform's dimensions. The same applies to app-store screenshots, presentation embeds and chat unfurls. None of this argues against SVG; it argues for keeping the vector master, so these raster derivatives are always one export away and never a redraw.",
      },
      { type: "h2", text: "A five-question decision framework" },
      {
        type: "ul",
        items: [
          "**Is it an interface glyph?** Navigation, actions, status and form controls are SVG, unless a later question overrides. Pictures and scenes are not glyphs.",
          "**Does it need more than one colour state?** Hover, dark mode or brand theming each demand CSS control, which means SVG delivered inline or as components.",
          "**Will it render outside a modern browser?** Email clients, social platforms and some native shells force raster; identify the destination before choosing the format.",
          "**How detailed is the artwork?** Flat shapes and lines favour SVG; gradients, textures and photographic detail favour raster, and the crossover arrives sooner than designers expect.",
          "**How many sizes and densities must it serve?** One fixed size in a controlled environment can be PNG without pain. Every additional variant multiplies raster cost and tips the decision to SVG.",
        ],
      },
      { type: "h2", text: "The decision rule" },
      {
        type: "p",
        text: "If it is an interface glyph (navigation, actions, status, form controls), ship SVG. If it is a picture, a platform-mandated asset, or destined for email, ship a raster format at the exact size needed. When a design hands you PNG icons for a web UI, convert the workflow rather than the files: find the same glyph as SVG in [IconVault's icon sets](/collections), or turn an SVG into an exact-size PNG with the [SVG to PNG converter](/tools/svg-to-png) when a platform demands it.",
      },
      { type: "h2", text: "The hybrid workflow most teams actually run" },
      {
        type: "p",
        text: "In mature design systems the question stops being SVG or PNG and becomes which is the master. The answer is SVG, stored once in a versioned library, with raster exports treated as build artefacts. A designer updates the vector; the pipeline regenerates favicons, app icons, email assets and any legacy PNG sizes; nobody hand-exports anything. This is exactly how teams browse a set once in the [icon library](/libraries) and then reuse it everywhere, instead of maintaining parallel icon folders per platform that drift apart with every redesign.",
      },
      {
        type: "ul",
        items: [
          "Keep one master library of SVG sources, named by concept, with the licence recorded beside it.",
          "Automate raster exports at the sizes your platforms demand; never store hand-exported PNGs as sources.",
          "Serve interface icons from the vector pipeline only, so a rebrand is a source change, not a scavenger hunt.",
          "Regenerate boundary assets (favicons, store art, email) in the same commit as the source change that caused them.",
        ],
      },
      { type: "h2", text: "Converting between formats without losing quality" },
      {
        type: "p",
        text: "SVG to PNG is a solved problem: render the vector at the exact pixel size you need and the result is as sharp as the platform allows, which the [SVG to PNG converter](/tools/svg-to-png) does in the browser. PNG to SVG is not the reverse operation. A raster file has no paths to recover, so conversion means tracing, redrawing the artwork as shapes that approximate the pixels. Tracing is respectable for logos and simple marks, and the [image to SVG converter](/tools/image-to-svg) handles those well, but a traced photograph is a heavy file with none of the original's fidelity. When a client hands you PNG icons, the quality move is finding the same glyph natively as SVG rather than tracing their exports.",
      },
      { type: "h2", text: "Myths that keep teams on the wrong format" },
      {
        type: "ul",
        items: [
          "**SVG is not supported everywhere.** Every browser your analytics has shown you in years renders SVG. The genuine gaps are email and platform assets, which are boundaries, not the web.",
          "**PNG is faster because it is just an image.** An unoptimised icon font or a sprite of PNGs can outweigh an entire inline SVG system, and raster variants multiply requests or sprite complexity. Measure the page, not the assumption.",
          "**Design tools export production-ready SVG.** They export editable SVG, full of metadata and precision you then have to strip. Optimisation is part of the format's workflow, not an optional extra.",
          "**Converting our PNG set to SVG is a quick win.** Tracing a library produces inconsistent, bloated artwork. Re-sourcing the glyphs as native vectors is faster and looks better.",
        ],
      },
      {
        type: "p",
        text: "For most teams the practical answer to SVG vs PNG icons is: design and build in SVG, export PNG only at the boundaries (favicons, app stores, email, social). That keeps one source of truth and zero blurry icons.",
      },
      { type: "h2", text: "Performance on real networks and real devices" },
      {
        type: "p",
        text: "On a fast desktop connection both formats feel instant, which is why this debate is really about constrained conditions. Inline SVG travels inside the HTML and paints with the page, so a slow network delays everything equally instead of popping icons in late. PNG icons arrive as separate requests or sprite regions, and on high-latency connections the interface can render as labelled gaps that fill in unevenly, shifting layout when dimensions were not reserved. On low-end devices the cost flips slightly: replaying complex vector paths is CPU work, and an extremely detailed SVG can paint slower than a decoded bitmap. Keep interface glyphs simple, as icon sets are designed to be, and that cost never materialises.",
      },
      { type: "h2", text: "Native apps and cross-platform frameworks" },
      {
        type: "p",
        text: "Outside the browser the comparison replays with platform accents. iOS renders PDF and SVG-derived assets through asset catalogs and prefers vector sources for glyphs; Android's vector drawable format is a close relative of SVG with a subset of its features, so SVG sources convert cleanly for simple icons and stumble on masks and filters. Cross-platform frameworks inherit the web's answer: React Native and Flutter both have mature SVG rendering libraries, and their communities ship icon sets as vector components for the same reasons the web does, theming, density independence and small bundles. Design in SVG and each platform becomes a conversion step; design in PNG and each platform becomes a re-export project at every density it supports.",
      },
      { type: "h2", text: "Quick reference" },
      {
        type: "ul",
        items: [
          "**Choose SVG** for navigation, actions, status, form controls, logos in product UI, and anything that changes colour, size or state.",
          "**Choose PNG** for email assets, Open Graph images, app-store artwork, platform-mandated icon sizes, and photographic or heavily textured artwork.",
          "**Choose the pipeline** when both appear: one vector master, automated raster exports, no hand-maintained parallel libraries.",
          "**Choose again per surface, not per company**: the same product correctly ships SVG in its app and PNG in its emails on the same day.",
        ],
      },
      { type: "h2", text: "The maintenance bill nobody itemises" },
      {
        type: "p",
        text: "Format decisions compound quietly. A rebrand that changes one brand colour is a one-line change across an SVG system themed with currentColor, and a full re-export of every size, state and density in a PNG system, assuming the original design files still exist, which after two years and one designer change they often do not. Adding a dark mode is the same story told louder: vectors inherit it, rasters fork into a second complete library that must be maintained in parallel forever. Even small chores differ: renaming a concept, fixing one glyph's alignment, or removing a deprecated icon are text edits in a vector library and asset archaeology in a raster one. When teams say SVG is cheaper, this ongoing bill, not the file-size comparison, is usually what they mean.",
      },
      { type: "h2", text: "Rendering quirks worth knowing" },
      {
        type: "p",
        text: "Neither format is entirely without surprises. SVG rendering depends on the artwork's construction: strokes scale with the icon unless vector-effect is set, hairline paths can shimmer at small sizes, and two browsers may round the same curve a pixel apart, which matters only if your design review zooms to 800 percent. PNG's quirks are about context: colour profiles embedded in exports can shift hues between browsers, transparency edges can halo against unexpected backgrounds, and an image scaled by CSS to a non-integer size will soften even if the density math looked right. Knowing the quirks argues for boring, well-tested sets and against clever per-project artwork, whichever format carries it.",
      },
      { type: "h2", text: "Security: the one asymmetry to respect" },
      {
        type: "p",
        text: "SVG is a document format, and documents can carry active content. An SVG uploaded by a user can contain script, external references and event handlers, which is why platforms that accept SVG uploads must sanitise them or serve them in ways that cannot execute, exactly as they would an HTML upload. PNG carries no equivalent risk; its worst behaviour is a malformed file a decoder rejects. This does not argue against SVG in your own codebase, where artwork is first-party and reviewed. It argues for treating third-party SVG with the suspicion its power deserves, and for sourcing icons from maintained libraries rather than random uploads.",
      },
      { type: "h2", text: "Where WebP, AVIF and fonts fit in 2026" },
      {
        type: "p",
        text: "Newer raster formats compress photographs better than PNG and are the right choice for photographic content, but they do not change the icon answer, because their advantage is photographic compression, not shape rendering; a glyph is still a frozen grid inside a WebP file. Icon fonts, the third historical option, have settled into legacy status for the reasons covered earlier: text-rendering quirks, load flashes and accessibility friction. The modern stack is therefore simple to state: SVG for drawn interface artwork, the best raster format for photographic artwork, and automated conversion between the two at platform boundaries.",
      },
      { type: "h2", text: "Behaviour at extreme sizes" },
      {
        type: "p",
        text: "The ends of the size range stress the formats differently. At 12 to 14 pixels, where dense data interfaces live, a vector icon's fine details collapse into mush unless the set was drawn or hinted for small sizes, and a purpose-exported PNG, pixel-fitted by hand at that exact size, can genuinely look crisper; this is the one rendering case where craft raster work wins, and it is why some mature sets ship small-size variants with simplified geometry. At the other extreme, hero-sized artwork, error-page illustrations and keynote slides are effortless for SVG and a re-export negotiation for PNG. Most products live between the extremes, where SVG simply never has a bad day, but knowing the edges keeps you from absolutism in either direction.",
      },
      { type: "h2", text: "The bottom line" },
      {
        type: "p",
        text: "If you remember one sentence, make it this: interfaces are drawn, so ship the drawing format, and photographs are captured, so ship the capture format, with a pipeline translating between them wherever a platform insists. Teams that internalise that sentence stop relitigating format choices in design reviews, stop shipping blurry toolbars, and stop hand-exporting the same gear icon at four sizes every release. The formats were never really rivals; they were always two tools waiting for a sensible division of labour.",
      },
      {
        type: "p",
        text: "One last practical note: document the division of labour where your team will find it, in the design system's format page, with the master library location, the export pipeline and the boundary list (email, social, stores) written down. Format debates recur when knowledge lives in one person's memory; they end when the rule, and the reasoning behind it, is a link anyone can paste into a review.",
      },
      { type: "h2", text: "Frequently asked questions" },
      {
        type: "h3",
        text: "Are SVG icons always smaller than PNG icons?",
      },
      {
        type: "p",
        text: "For typical interface glyphs, yes, usually by a wide margin once the SVG is optimised and the PNG is counted in every density a real product ships. For complex, gradient-heavy artwork the answer flips, because the vector file grows with every shape while a raster export stays roughly constant. Compare your actual artwork, not the formats in the abstract.",
      },
      {
        type: "h3",
        text: "Can I use SVG icons in an email newsletter?",
      },
      {
        type: "p",
        text: "You should not rely on it. Influential clients such as desktop Outlook do not render SVG at all, and others handle it inconsistently, so production emails use hosted PNG icons at the exact display size with meaningful alt text. Keep the email asset pipeline separate and raster-only, even if everything else you ship is vector.",
      },
      {
        type: "h3",
        text: "Do I still need 1x, 2x and 3x exports if I switch to SVG?",
      },
      {
        type: "p",
        text: "No. That bookkeeping exists because raster images are fixed grids. One SVG renders at every density the device reports, which removes the export variants, the srcset logic for icons and the class of bug where a new phone density ships before your 4x assets do. Raster exports remain only at platform boundaries like app stores.",
      },
      {
        type: "h3",
        text: "Why do my exported PNG icons look blurry?",
      },
      {
        type: "p",
        text: "They are being displayed larger than their export size, or at a density the export did not anticipate, so the browser stretches the pixel grid. Export at the exact rendered size multiplied by the target density, or remove the problem by shipping the icon as SVG, which is drawn fresh at whatever size and density the screen requests.",
      },
      {
        type: "h3",
        text: "Is an icon font better than both SVG and PNG?",
      },
      {
        type: "p",
        text: "It was a reasonable compromise a decade ago and is a liability now: glyphs render as text, so they blur on some displays, flash or vanish when the font stalls, expose meaningless characters to screen readers and resist per-icon styling. Inline SVG and components beat fonts on every axis that matters. Migrate when you can.",
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
    updated: "2026-10-23",
    readingMinutes: 16,
    icon: "gauge",
    tint: "#DC2626",
    content: [
      {
        type: "p",
        text: "Icons are small, but a page can carry sixty of them. Learning to **optimize SVG icons** properly (clean markup, the right delivery method, no layout shift) is one of the cheapest performance wins on a content or product site.",
      },
      { type: "h2", text: "Measure first: audit the icons you actually ship" },
      {
        type: "p",
        text: "Optimisation without a baseline is superstition. Start by finding out what your pages really carry: open the network panel, filter to images and inline payload, and look for the patterns that waste bytes. A handful of icons usually account for most of the weight, the logo exported with an embedded raster, the illustration that was really a photograph, the icon font shipping four hundred glyphs for twelve buttons. Fix the outliers first and the average takes care of itself.",
      },
      {
        type: "ul",
        items: [
          "**Count requests and bytes per template**, not per site. A lean homepage can hide a checkout page carrying three icon systems at once.",
          "**Find duplicate glyphs**: two libraries, or a library plus a font, shipping the same search icon in different bytes. Duplication is pure waste with a maintenance bill attached.",
          "**Check the uncompressed size of inline SVG** in your HTML. Compression hides it in transfer reports, but the browser still parses every byte, and parse time on low-end phones is real time.",
          "**Record the before numbers**: total icon bytes, request count and your lab LCP and CLS on a mid-tier mobile profile. Without them, every later claim about improvement is theatre.",
        ],
      },
      { type: "h2", text: "Strip the editor junk" },
      {
        type: "p",
        text: "Design tools export SVGs full of titles, comments, metadata, unused defs and over-precise path numbers. Running SVGO (or IconVault's [SVG optimizer](/tools/svg-optimizer)) typically cuts 30 to 60 percent of the bytes: it removes metadata, rounds coordinates sensibly, merges paths and minifies IDs. Keep the viewBox, and never let an optimizer strip it: without a viewBox the icon cannot scale.",
      },
      { type: "h3", text: "The SVGO settings that do the work" },
      {
        type: "ul",
        items: [
          "**removeDoctype, removeXMLProcInst, removeComments, removeMetadata**: pure deletion of things browsers never render. Always on, never regretted.",
          "**removeEditorsNSData**: strips the private namespaces Illustrator, Sketch and Figma leave behind, often the single biggest win on design-tool exports.",
          "**convertPathData and floatPrecision around 2 to 3**: path coordinates rarely need five decimal places. At icon sizes, two decimals are visually identical and noticeably smaller; going to zero can visibly deform curves, so check output at small sizes.",
          "**mergePaths and convertShapeToPath**: fewer elements means fewer DOM nodes when inlined and better gzip ratios, because repeated path syntax compresses well.",
          "**removeUnusedNS and cleanupIds (with care)**: unused namespaces and long editor ids are dead weight, but id cleanup must be coordinated with any sprite references that point at those ids.",
          "**removeEmptyAttrs, removeEmptyContainers, removeHiddenElems**: catches the invisible groups and zero-opacity leftovers design tools generate constantly.",
        ],
      },
      { type: "h3", text: "Optimisations that break icons" },
      {
        type: "p",
        text: "Three settings cause most optimisation horror stories. Removing the viewBox, which some aggressive presets do when width and height exist, destroys scalability and turns a responsive icon into a fixed bitmap with extra steps. Collapsing groups or removing unknown elements can delete the very structure a CSS animation or a currentColor rule depends on, so visual-regression check animated and themed icons specifically. And converting strokes to fills, or the reverse, changes rendering at small sizes and can balloon file size on detailed artwork. Run the optimiser, then diff the rendering, not just the bytes: a screenshot comparison at 16, 24 and 48 pixels catches what a size report celebrates wrongly.",
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
      { type: "h3", text: "The legacy trio: img tags, background images and data URIs" },
      {
        type: "p",
        text: "Three older delivery patterns still circulate and each has a narrow legitimate use. An img tag pointing at an SVG file is cacheable and simple, and fine for a logo in a context you do not control, like a partner page, but the document inside the image is sealed: no currentColor, no CSS variables, no interaction short of swapping the file. CSS background images share the sealing problem and add a sizing one, since the icon's box and the background's box drift apart under responsive changes. Data URIs inline the icon into CSS or HTML with base64 overhead and no caching, acceptable for a single critical glyph in an email-safe fallback or a print stylesheet, corrosive as a system. When you inherit these patterns, migrate the themed, repeated icons first; leave the one-off logos until last, because they were never the problem.",
      },
      { type: "h2", text: "Compression, caching and delivery details" },
      {
        type: "p",
        text: "SVG is text, and text compresses beautifully, but only if your stack actually compresses it. Confirm your server or CDN applies gzip or Brotli to the image/svg+xml content type; a surprising number of configurations compress HTML and JavaScript and leave SVG travelling naked. Brotli at a moderate quality level is the best default for static icon files and sprites, since they are compressed once and served many times. Inline SVG inherits the HTML document's compression automatically, one more reason the raw byte count of inline icons matters less than their parsed cost.",
      },
      {
        type: "ul",
        items: [
          "**Cache external SVG and sprites aggressively**: versioned file names with a one-year immutable cache header turn repeat visits into zero icon requests. Never rely on revalidation for files whose name contains a hash.",
          "**Serve icons from the same origin or a cookieless CDN edge** close to your users; a sprite fetched cross-origin without proper CORS and caching headers can cost more than it saves.",
          "**Avoid data-URI icons for anything repeated**: base64 inflates bytes by roughly a third and defeats caching entirely, since the URI is re-downloaded with every document that contains it. Data URIs suit one-off, tiny, critical glyphs only; the [SVG to data URI converter](/tools/svg-to-data-uri) shows the size cost before you commit.",
          "**Preload almost nothing**: preloading a sprite can help a heavy app shell, but preloading individual icons is nearly always waste. Let the audit, not anxiety, choose.",
        ],
      },
      { type: "h2", text: "Icons and Core Web Vitals" },
      {
        type: "p",
        text: "Icons rarely hurt LCP directly, but missing width and height cause **CLS** when late-loading glyphs push content around, and a bloated icon font can delay first paint. Set explicit dimensions on every icon, prefer font-display-safe delivery (SVG has none of these problems), and lazy-load below-the-fold icon systems the same way you would images. Our [how to use SVG icons](/blog/how-to-use-svg-icons) guide covers the implementation patterns behind these rules.",
      },
      { type: "h2", text: "LCP, CLS and INP: how icons touch each metric" },
      {
        type: "p",
        text: "Largest Contentful Paint is usually a hero image or headline, so icons matter to LCP mainly by competition: every kilobyte of render-blocking CSS, font and inline markup in the head delays the moment the browser can paint the hero. An icon font is the classic offender, because text cannot render its glyphs until the font arrives, and teams respond by preloading the font, spending bandwidth to defend a format they should replace. CLS is where icons bite directly: an img-based icon or logo without dimensions reserves no space, and when it lands, toolbars and headlines jump. Inline SVG with a sized wrapper cannot shift anything, which is a quiet, permanent advantage. INP, the responsiveness metric, cares about main-thread work; thousands of inline SVG nodes in a mega-menu or a virtualised list that re-renders constantly can contribute to handler cost. Keep repeated decorative glyphs in components that memoise well, and avoid re-creating large inline trees on every keystroke or filter change.",
      },
      { type: "h2", text: "Advanced techniques for heavy icon systems" },
      {
        type: "ul",
        items: [
          "**Split sprites by surface**: one small sprite for global chrome (header, navigation, footer) loaded everywhere, and per-section sprites or lazy chunks for areas like settings or billing that most sessions never open.",
          "**Let the bundler tree-shake components**: import icons individually from packages that support it, and audit the bundle when a barrel import sneaks the whole set back in. One careless import statement is the most common cause of a 900 KB icon bundle.",
          "**Use CSS variables for multi-colour icons**: duotone sets can expose their secondary colour as a variable, giving you theme control without duplicating files per theme.",
          "**Systematise dark mode with currentColor**: icons that inherit colour never need dark variants, which halves the icon payload of themed products at a stroke.",
          "**Defer below-the-fold icon systems**: footer icon rows, share widgets and help widgets can hydrate or load on intersection, the same treatment you give below-fold images.",
          "**Generate, do not hand-maintain, sprites**: a build step that assembles symbols from your source folder cannot forget an icon, and its output can be hashed, cached and diffed like any other artefact. The [SVG sprite generator](/tools/svg-sprite-generator) covers the manual case; pipelines should automate the same idea.",
        ],
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
      { type: "h2", text: "The mistakes that undo good optimisation" },
      {
        type: "ul",
        items: [
          "**Optimising files nobody ships**: hours spent shrinking an icon set while the page also loads an unoptimised hero photograph fifty times larger. Rank by bytes on real pages, always.",
          "**Inlining the entire set on every page**: a sprite exists precisely so repeated icons are not re-parsed per document. Past a few dozen shared glyphs, inline-everything becomes the problem it was meant to solve.",
          "**Trusting the optimiser's default preset on brand artwork**: logos and multi-colour marks deserve a conservative preset and an eyeball review; the cost of a subtly wrong logo dwarfs any byte saving.",
          "**Forgetting the second visit**: teams benchmark cold loads, then ship unversioned sprite URLs that browsers revalidate forever. Cache headers are an optimisation feature, not server trivia.",
          "**Measuring only file size**: a technically tiny icon system that blocks rendering behind a font, or shifts layout on load, is slower by every metric users feel. Optimise the experience, then the bytes.",
        ],
      },
      {
        type: "p",
        text: "Do those five things and your icons stop being a performance topic at all. Start from clean source data: every set in the [IconVault directory](/collections) ships optimized, production-ready SVG output.",
      },
      { type: "h2", text: "Working with sets you did not draw" },
      {
        type: "p",
        text: "Most teams consume icons from libraries, which changes the optimisation target from files to selection. A set's headline icon count is a vanity metric; what reaches your bundle is the subset you import and how the package is structured. Prefer packages with per-icon modules or a tree-shakeable entry, and verify with your bundler's analyser rather than the README. When you vendor files directly from a directory like the [icon libraries](/libraries) listing, vendor a pinned version, record it, and re-run your SVGO configuration on the way in: sets differ in how production-ready their exports are, and your pipeline, not their export defaults, should define your output. Finally, resist mixing a second set for three missing glyphs; drawing or adapting those three inside your set's stroke and grid rules is cheaper than importing a second library's full weight and visual accent.",
      },
      { type: "h2", text: "Budgets and guardrails that keep icons fast" },
      {
        type: "p",
        text: "Optimisation decays without guardrails, because every sprint adds an icon and nobody removes two. Put the guardrails where the work happens. A bundle budget in CI that fails the build when the icon chunk grows past an agreed size forces the deduplication conversation at the right moment. A pull-request checklist item, new icons optimised and sized, sized wrappers present, no new icon library without discussion, catches regressions a budget cannot see. And a quarterly audit, thirty minutes with the network panel on your five heaviest templates, keeps the slow creep of duplicate sets and forgotten fonts visible. Performance work on icons is rarely heroic; it is this kind of housekeeping, done on schedule, that keeps a fast site fast.",
      },
      { type: "h2", text: "Loading strategy by page type" },
      {
        type: "p",
        text: "The right strategy follows the page's job. Marketing pages live or die on first impression and search traffic, so inline the handful of icons in the hero and navigation, keep the set small enough that total icon weight is a rounding error, and let everything below the fold arrive with its section or not at all. Application screens live on repeat visits and dense interfaces, so components plus aggressive caching dominate: the first login pays for the icon system, every screen after that pays nearly nothing, and code splitting keeps rarely visited areas out of the initial bundle. Documentation and content sites sit between the two: a shared chrome sprite cached across hundreds of pages is usually the sweet spot, with article-specific illustrations inlined sparingly. Choosing per page type, and writing the choice down, stops the endless inline-versus-sprite argument, because the answer is documented as plural.",
      },
      { type: "h2", text: "Logos and multi-colour marks: optimise differently" },
      {
        type: "p",
        text: "Brand artwork breaks the rules that govern interface glyphs. A logo's paths are the brand; coordinate precision, letterforms and spacing must survive optimisation untouched in appearance, so use a conservative SVGO preset, skip path merging that could alter joins, and review the result at billboard and favicon sizes alike. Multi-colour marks also resist the currentColor playbook: define their colours as CSS variables if the mark must theme, or accept fixed colours and ship exactly one file. And keep logos out of sprites and icon components entirely; they change on a brand calendar, not a product one, and coupling their releases to the icon system creates pointless coordination cost.",
      },
      { type: "h2", text: "Anatomy of a typical audit" },
      {
        type: "p",
        text: "Audits of established sites tend to rhyme. The first finding is duplication: a legacy icon font in the global CSS, a component library's bundled set, and a newer hand-picked set all shipping overlapping glyphs, because three generations of developers each solved icons their own way. The second is the heavy tail: two or three files, an unoptimised logo with an embedded raster, a decorative illustration exported at illustration precision, accounting for more bytes than the other two hundred icons combined. The third is delivery debt: unversioned sprite URLs revalidating on every page, SVG files served without compression, sized wrappers missing on the icons that arrive latest. The fixes rhyme too, and they are boring: consolidate to one set, optimise the tail, version and cache the delivery, reserve the space. Teams expect a clever technique at the end of an audit; the honest deliverable is housekeeping, and it reliably outperforms cleverness.",
      },
      { type: "h2", text: "Server rendering and hydration notes" },
      {
        type: "p",
        text: "Server-rendered and statically generated pages have one icon advantage worth protecting: the markup arrives complete, so icons paint with the first byte of content and never wait for client JavaScript. Protect it by resisting client-only icon loading for anything above the fold, and by keeping icon components free of browser-only APIs so the server and client render identical trees; a mismatch does not just warn in the console, it can make hydration discard and repaint the very content you optimised. Where icons depend on client state, such as a theme toggle, render the structural wrapper on the server and let colour, the cheap part, resolve on the client through CSS variables rather than through a second render.",
      },
      { type: "h2", text: "Animated icons without the jank" },
      {
        type: "p",
        text: "Animation is where icon performance stops being about bytes. A spinning loader or a morphing menu icon repaints continuously, and the cost depends on what you animate: transforms and opacity are composited cheaply by the browser, while animating path data, filters or large blurred regions forces repaint work every frame and shows up as jank on mid-tier phones. Keep animated icons small in node count, animate the wrapper's transform rather than the paths where the design allows, and pause off-screen animations with the same intersection techniques you use for lazy content. Respect prefers-reduced-motion by shipping a static end state; it is an accessibility requirement that also happens to be a performance feature. A loading spinner, of all icons, should never be the thing making the page feel slow.",
      },
      { type: "h2", text: "Knowing when to stop" },
      {
        type: "p",
        text: "There is a point of diminishing returns, and reaching it is a success, not a surrender. When your icons are a small single-digit share of page weight, paint with the content, hold their layout space and come from one maintained set, further squeezing produces numbers nobody can feel. Spend the next performance hour where the audit points instead, usually images, fonts or JavaScript. Icons reward exactly one pass of proper optimisation and a lifetime of light guardrails; they punish perfectionism with complexity. Do the pass, install the guardrails, and move on.",
      },
      {
        type: "p",
        text: "If you do only three things from this guide, make them these: run every icon through an optimiser with a locked, reviewed configuration; deliver each icon by the method its repetition and page type justify; and reserve layout space for every glyph so nothing on the page moves when it arrives. Those three habits capture the overwhelming majority of the available win, and everything else in this article is refinement you can adopt sprint by sprint.",
      },
      { type: "h2", text: "Frequently asked questions" },
      {
        type: "h3",
        text: "Does SVGO change how my icons look?",
      },
      {
        type: "p",
        text: "With sensible settings, no. SVGO removes non-rendering data and rewrites paths more compactly; the picture stays the same. Aggressive settings, very low coordinate precision, removing the viewBox, collapsing groups your CSS depends on, can change rendering, which is why you diff screenshots at production sizes after your first run and lock the configuration into the build.",
      },
      {
        type: "h3",
        text: "Is inline SVG or a sprite faster?",
      },
      {
        type: "p",
        text: "Inline SVG paints immediately with the HTML and wins for a handful of above-the-fold icons on content pages. Sprites win when many icons repeat across pages, because one cached file replaces per-page duplication. Component-based apps get inline behaviour with bundler deduplication. The crossover is about repetition and session length, not a universal winner.",
      },
      {
        type: "h3",
        text: "How much page weight should icons use?",
      },
      {
        type: "p",
        text: "Treat roughly 30 KB compressed per page as a healthy ceiling for interface icons on a typical product or content page, and investigate anything beyond it rather than treating the number as law. A data-dense dashboard may justify more; a marketing landing page almost never does. The audit matters more than the threshold.",
      },
      {
        type: "h3",
        text: "Should I convert SVG icons to PNG or WebP for speed?",
      },
      {
        type: "p",
        text: "Almost never for interface icons. Raster conversion multiplies files by size and density, loses CSS theming, and usually increases total bytes for simple glyphs. The exception is extremely detailed artwork whose vector paths are genuinely heavy; there, a right-sized raster export from the [image compressor](/tools/image-compressor) pipeline can be smaller, and the vector remains your source.",
      },
      {
        type: "h3",
        text: "Do icon fonts hurt performance?",
      },
      {
        type: "p",
        text: "Yes, in the specific ways that matter: the font is render-blocking for the glyphs, it usually ships hundreds of unused icons, it can flash fallback characters while loading, and it adds a font-loading dependency to pages that otherwise need none. Replacing a font with inline SVG or components removes a request, a flash and a failure mode in one move.",
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
    updated: "2026-10-23",
    readingMinutes: 16,
    icon: "accessibility",
    tint: "#7C3AED",
    content: [
      {
        type: "p",
        text: "**Accessible SVG icons** come down to one question: does this icon carry meaning, or is it decoration? Answer that honestly for every icon and the ARIA rules become simple. Get it wrong and screen-reader users hear either silence where information lives, or a stream of meaningless file names.",
      },
      { type: "h2", text: "The decision framework: meaning, function or decoration" },
      {
        type: "p",
        text: "Sort every icon into one of three buckets before you write any ARIA. **Decorative** icons illustrate a label that already exists in text; they should be invisible to assistive technology. **Functional** icons are controls, or live inside controls; the control gets the name, and the icon itself is decorative inside it. **Informative** icons carry content nothing else carries, a status, a category, a warning; these need a text equivalent of their own. Most production bugs come from bucket confusion: a functional icon labelled as if it were informative, so the button ends up named twice, or an informative icon hidden as decoration, so its meaning vanishes for exactly the users who needed it.",
      },
      {
        type: "ul",
        items: [
          "Ask what a user loses if the icon disappears. Nothing: decorative. The action: functional. Information: informative. Answer per icon, in context, not per icon file.",
          "The same glyph changes buckets by context. A warning triangle in a labelled alert banner is decorative; the same triangle alone in a table cell, signalling the row's status, is informative.",
          "When torn between decorative and informative, read the surrounding text aloud. If the sentence still makes sense without mentioning the icon, it was decorative.",
          "Record the decision in the component, not in a wiki. The next developer should inherit the bucket with the icon, not rediscover it.",
        ],
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
      { type: "h3", text: "Why both attributes, and what breaks with only one" },
      {
        type: "p",
        text: "aria-hidden removes the element from the accessibility tree, which is what screen readers traverse. focusable=\"false\" handles a different layer: older browsers and some assistive setups could place keyboard or virtual focus on the SVG itself, stranding users on an element that announces nothing. Belt and braces costs nothing and prevents a class of bug that appears only in the exact browser and reader combination your automated tests do not run. Icon component libraries that set both by default when an icon is marked decorative are doing you a favour; verify yours does, because several popular ones historically set neither.",
      },
      { type: "h3", text: "Edge cases: logos, linked images and icon-plus-text links" },
      {
        type: "p",
        text: "A logo inside a home link is functional: the link's name should be the destination or the brand, so the svg is hidden and the link carries an aria-label like the company name plus home, or visually hidden text saying the same. Social icons in a footer are the classic trap; a row of brand glyphs, each a link, each meaningless without a name. Give every link its network name (the platform, not follow us, which tells a screen-reader user nothing per item). Icon-plus-text links where the text is visible need no extra work at all: hide the icon, let the text name the link, and resist duplicating the name in an aria-label that will drift out of sync at the next copy edit.",
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
      { type: "h2", text: "Standalone meaningful icons: role img and the title element" },
      {
        type: "p",
        text: "When an icon stands alone as content, a status glyph in a table, a category marker in a list, it needs its own name, and the pattern is role=\"img\" on the svg with a title element as its first child. The title inside an SVG with role img is what assistive technology announces; a title attribute on the svg element is a tooltip behaviour, inconsistently exposed, and is not a substitute. Give the title an id and reference it with aria-labelledby when you need the robust version of the pattern, which some screen reader and browser combinations handle more reliably than the bare title element.",
      },
      {
        type: "code",
        text: "<svg role=\"img\" aria-labelledby=\"status-title\">\n  <title id=\"status-title\">Payment overdue</title>\n  <path d=\"...\" />\n</svg>",
      },
      {
        type: "p",
        text: "Name the meaning, not the picture. The announcement should be payment overdue, not red triangle, because the user needs the information the sighted user extracts from the glyph, and colour plus shape were only ever the encoding. This rule, name the message, resolves most labelling debates: a star icon meaning favourite gets the name favourites or add to favourites depending on whether it informs or acts, and a checkmark confirming success is named completed, never green check.",
      },
      { type: "h2", text: "How accessible names are actually computed" },
      {
        type: "p",
        text: "Browsers compute a control's name from a priority list: aria-labelledby beats aria-label, which beats the element's own text content, which beats title attributes and placeholders. Knowing the order explains the classic bugs. Visible text inside a button names it automatically, so an aria-label added for insurance overrides the visible text with something that may contradict it, a failure for voice-control users who say what they see and get no match. An icon labelled with role img inside a button contributes its title to the button's name computation in some engines, producing doubled names like close close dialog. The hygiene rules follow directly: one naming source per control, prefer visible text, use aria-label only when no visible text exists, and keep the icon itself silent inside controls.",
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
      { type: "h2", text: "WCAG 2.2 criteria, mapped to icon work" },
      {
        type: "ul",
        items: [
          "**1.1.1 Non-text Content (A)**: every informative icon has a text alternative serving the same purpose; decorative icons are hidden so they need none. This is the criterion the bucket framework exists to satisfy.",
          "**1.4.1 Use of Color (A)**: colour is never the only channel. A status system that differs only in hue fails; add shape, position or a label so the information survives colour-blindness and greyscale printing.",
          "**1.4.11 Non-text Contrast (AA)**: meaningful icons and the boundaries of interactive icon controls need 3:1 against adjacent colours. Check icon against its button background, not against the page, and check the unfocused default state, not just hover. The [contrast checker](/tools/contrast-checker) settles arguments in seconds.",
          "**2.4.7 Focus Visible (AA)**: keyboard focus on an icon button must show. Custom icon controls that remove outlines for aesthetics are a per-se failure unless a replacement indicator meets contrast rules too.",
          "**2.5.8 Target Size Minimum (AA, new in 2.2)**: pointer targets are at least 24 by 24 CSS pixels, with spacing exceptions; icons in dense data tables are the common casualty, and the fix is padding, not a bigger glyph.",
          "**4.1.2 Name, Role, Value (A)**: custom icon controls built on divs and spans must expose button role, a name and state (expanded, pressed, selected) programmatically, or be rebuilt as real buttons, which is usually less work.",
          "**1.4.4 and 1.4.10 Resize and Reflow (AA)**: icons must survive 200 percent zoom and 320 pixel wide viewports without loss; vector icons pass the rendering half of this trivially, and layouts fail the other half when icon rows refuse to wrap.",
        ],
      },
      { type: "h2", text: "Testing: what to actually run" },
      {
        type: "p",
        text: "Automated checkers catch the mechanical failures, missing names, missing alt equivalents, contrast below threshold, and they should run in CI like any other test. They cannot judge whether a name is good, only whether one exists, so pair them with three manual passes. The keyboard pass: unplug the mouse metaphorically and tab through the page, confirming every icon control is reachable, visibly focused and operable with Enter, Space and arrows where the pattern promises them. The screen-reader pass: with a reader running, navigate by buttons and by graphics and listen for silence where decoration lives and clear names where meaning lives; doubling and file names are obvious the moment you hear them. The zoom pass: at 200 and 400 percent, confirm icon rows wrap or scroll intentionally and that no meaning depends on an icon that has been pushed off-screen.",
      },
      {
        type: "ul",
        items: [
          "Test with at least one real screen reader pairing (for example NVDA with Chrome or VoiceOver with Safari); emulated accessibility trees miss announcement behaviour.",
          "Navigate by graphic and by button in the reader and diff the lists against what a sighted user sees; every mismatch is a bug report.",
          "Voice-control check: speak the visible label of ten icon controls. Any that fail to activate have a name-versus-label mismatch, usually an aria-label overriding better visible text.",
          "Test in forced-colors mode (Windows High Contrast) at least once per design-system release; it is where icon assumptions go to die.",
        ],
      },
      { type: "h2", text: "Forced colours, dark mode and motion" },
      {
        type: "p",
        text: "Windows forced-colors mode replaces your palette with the user's, and icons drawn with hard-coded fills can vanish entirely against forced backgrounds, while currentColor icons adapt automatically because they were never really coloured by you. This is a strong engineering argument for the theming discipline the rest of this site recommends: inherit colour, and platform accessibility features work for free. Dark mode has its own version of the trap: a dark icon on a transparent background that was designed against a light card disappears when the card inverts; currentColor prevents it, baked-in fills guarantee it eventually. Motion completes the picture: animated icons, spinners excepted, must respect prefers-reduced-motion with a static end state, and no information may be conveyed by animation alone, because the users who disable motion are telling you the movement itself is the barrier.",
      },
      { type: "h2", text: "A pull-request checklist for icon changes" },
      {
        type: "ul",
        items: [
          "Every new icon sorted into decorative, functional or informative, with the treatment matching the bucket.",
          "Decorative icons carry aria-hidden and focusable false, set by the component, not remembered by the author.",
          "Icon-only controls named on the control, with the name matching or including the visible label if one exists.",
          "Informative icons named for their meaning, never for their shape or colour.",
          "Contrast verified for the icon against its actual background at 3:1, including disabled states that still convey information.",
          "Targets at least 24 by 24 CSS pixels and comfortably larger on touch layouts; focus indicator visible and not colour-only.",
          "No icon conveys status by colour alone; shape or text differs too.",
        ],
      },
      {
        type: "p",
        text: "None of this requires special tooling: it is a review habit. When you pick icons from a set like [Lucide](/app?set=lucide) or [Phosphor](/app?set=ph) on IconVault, decide decorative versus meaningful as you place each one. Our [SVG icons in buttons and navigation patterns](/blog/how-to-use-svg-icons) in the main usage guide show the labelled patterns in context.",
      },
      { type: "h2", text: "Do icon libraries handle accessibility for you?" },
      {
        type: "p",
        text: "Partly, and the boundary matters. Good component libraries render icons as decorative by default, applying aria-hidden, because most icons in most interfaces are decorative, and that default quietly fixes the majority case. What no library can know is your context: whether this particular glyph is the only carrier of a status, whether the button it sits in already has visible text, whether the link it decorates has a name anywhere. Libraries also differ in their defaults and have changed them across versions, so an upgrade can silently alter the accessibility tree of every screen. Treat the library default as a starting hypothesis, verify it in your own rendered output, and own the bucket decision in your components. When you copy individual icons from a set through the [app](/app) rather than installing a package, you own the defaults entirely, which is more work and more certainty in equal measure.",
      },
      { type: "h2", text: "Failure patterns that show up in real audits" },
      {
        type: "ul",
        items: [
          "**The narrated toolbar**: a header where every icon is exposed as an unnamed graphic, so a screen reader announces image, image, image across the primary navigation. Cause: icons rendered as content images with no hiding and no names. Fix: the bucket pass, top to bottom.",
          "**The lying label**: an aria-label copied from a design file says share, while the visible tooltip and the actual behaviour say copy link. Voice users say share and nothing happens. Cause: naming sources drifting. Fix: one source, matching the visible label.",
          "**The invisible focus**: icon buttons in a custom toolbar show focus by removing the outline and changing nothing else. Keyboard users are navigating blind. Fix: a designed focus state meeting contrast requirements, tested by actually tabbing.",
          "**The colour-only status column**: a table where paid, pending and failed differ only in icon colour, all three the same checkmark shape. Screen readers get silence and low-vision users get a guessing game. Fix: distinct shapes plus a text status, which also helps every sighted user scanning quickly.",
          "**The 24-pixel glyph in a 24-pixel world**: dense grids where the clickable area is the glyph itself, failing target-size minimums and frustrating motor-impaired users. Fix: padding on the control; the artwork does not change at all.",
        ],
      },
      { type: "h2", text: "Writing names users can act on" },
      {
        type: "p",
        text: "Accessible names are microcopy, and they reward the same discipline. Use the verb the interface uses elsewhere: if the menu item says Download report, the icon button is Download report, not Save, not Export, and not the designer's nickname for the feature. Keep names as short as the visible system allows, because screen-reader users hear them in lists and in search-style navigation where long names blur together. Never include the word icon, image or graphic in a name; the role already announces the element type, and icon is the written equivalent of saying the word picture aloud after every noun. Finally, keep names stable across releases unless the function itself changes; users build muscle memory around names in voice control and reader navigation, and a whimsical rename is a breaking change wearing a copy edit as a disguise.",
      },
      { type: "h2", text: "Icons in forms and error states" },
      {
        type: "p",
        text: "Forms concentrate every icon mistake into one screen. The error icon beside a field is decorative if the error text is properly associated with the input, and harmful noise if it is exposed as an unnamed image between the label and the message the user actually needs. Required-field asterisks rendered as icons must be hidden, with required communicated by the input's own attributes, because a screen reader announcing star is a riddle, not a requirement. Success checkmarks after validated fields follow the same rule: the state belongs in the field's programmatic status or in a live message, not in a glyph. Get forms right and you have usually fixed the highest-stakes icons on the site, since forms are where users transact, err and recover.",
      },
      { type: "h2", text: "Before and after: one toolbar, fixed" },
      {
        type: "p",
        text: "Consider a document toolbar as typically shipped: a save icon exposed as an unnamed image, a trash icon whose button is labelled delete-icon by its file name, a settings gear announced as graphic, and a share button labelled export because the designer renamed the feature in the label but not the code. A screen-reader user hears a parts list. After the bucket pass, the glyphs are hidden, the buttons are named Save, Delete, Settings and Share to match the tooltips a sighted user sees, the one informative glyph, a sync status, carries its state as text, and the toolbar announces as five clear actions and one clear status. No icon changed. No visual pixel moved. The entire improvement is semantic, which is why accessibility work on icons is the highest-leverage hour most frontend teams can spend.",
      },
      {
        type: "p",
        text: "If the scale of this feels daunting, start where users feel it most: the primary navigation, the main toolbar of your core workflow, and your forms. Those three surfaces carry the overwhelming majority of icon interactions, and an afternoon spent sorting their icons into buckets, naming their controls and checking their contrast fixes the experience most users, assistive technology or not, will judge the whole product by. The long tail of settings screens and footers can follow the same checklist sprint by sprint, and each pass gets faster because the patterns, and the component defaults that encode them, are already decided. Accessibility debt on icons rarely comes from ignorance of the rules; it comes from the rules never being written into the components. Write them in once, and the accessible choice becomes the path of least resistance for every icon anyone adds afterwards.",
      },
      { type: "h2", text: "Frequently asked questions" },
      {
        type: "h3",
        text: "Should every SVG icon have an aria-label?",
      },
      {
        type: "p",
        text: "No, and adding one to every icon creates the noise problem this guide exists to prevent. Decorative icons get no label and are hidden with aria-hidden. Icons inside controls get no label either; the control carries the name. Only standalone informative icons get their own naming, through role img and a title element describing the meaning.",
      },
      {
        type: "h3",
        text: "What is the difference between aria-hidden and an empty alt for icons?",
      },
      {
        type: "p",
        text: "They are the same idea in different syntaxes. An img element uses an empty alt attribute to declare itself decorative; an inline SVG has no alt attribute, so aria-hidden true plus focusable false achieves the identical result, removing it from the accessibility tree. Using the img pattern on inline SVG, or hunting for an alt attribute that does not exist there, is a common beginner confusion.",
      },
      {
        type: "h3",
        text: "My icon button reads out twice. What went wrong?",
      },
      {
        type: "p",
        text: "Almost always a doubled naming source: the button has an aria-label and the SVG inside it also exposes a title, or the button wraps visible text that already names it while an aria-label overrides with near-identical words. Keep exactly one source. Hide the icon, name the button once, and the announcement becomes the single clean label you intended.",
      },
      {
        type: "h3",
        text: "How much contrast does an icon need under WCAG 2.2?",
      },
      {
        type: "p",
        text: "A meaningful icon needs at least 3:1 against adjacent colours under criterion 1.4.11, measured in its default state against its actual background. Purely decorative icons are exempt. If an icon functions as a control's only visible boundary, that boundary needs the same 3:1, which is why ghost buttons with faint icon-only affordances so often fail audits.",
      },
      {
        type: "h3",
        text: "Are tooltips an accessible name for icon buttons?",
      },
      {
        type: "p",
        text: "No. A tooltip is a visual supplement that appears on hover or focus; it is not reliably exposed as the control's accessible name, it does nothing for touch users, and it vanishes for voice-control targeting. Name the button properly with aria-label or hidden text, and keep the tooltip, if you like it, as decoration that agrees with the name.",
      },
    ],
  },
];
