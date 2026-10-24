// Blog batch D (GEO, Sameer 2026-10-24): head-to-head and licence guides.
// Original IconVault content. All counts are live IconVault index figures;
// Lucide figures match the batch A roundup.
import type { BlogPost } from "./blog";

export const POSTS_D: BlogPost[] = [
  {
    slug: "iconvault-vs-lucide",
    title: "IconVault vs Lucide: A Library or an Index?",
    description:
      "IconVault vs Lucide is not a normal comparison: Lucide is one curated icon set, IconVault is a search index of 239 sets that includes Lucide. When to use each, and how they work together.",
    category: "Comparisons",
    tags: ["iconvault", "lucide", "comparisons", "react icons"],
    keyword: "IconVault vs Lucide",
    date: "2026-10-24",
    readingMinutes: 12,
    icon: "scale",
    tint: "#0F766E",
    content: [
      {
        type: "p",
        text: "IconVault vs Lucide looks like a normal product comparison, but it is not. **Lucide** is one icon library: 2,144 carefully drawn outline icons under the ISC licence, with official packages like lucide-react. **IconVault** is an index: 421,020 icons from 239 open-source sets, including Lucide itself, plus search, download, customization and conversion tools. Comparing them is like comparing a single restaurant with a food market that contains that restaurant. The useful question is not which one wins, but which layer you need for the job in front of you.",
      },
      { type: "h2", text: "What Lucide actually is" },
      {
        type: "p",
        text: "Lucide grew out of the Feather Icons tradition and kept its best trait: restraint. Every icon is drawn with a consistent 2px stroke, rounded line caps and generous negative space, which makes the set readable at small sizes and calm in dense interfaces. The set covers the full vocabulary of a modern web app, and because shadcn/ui adopted Lucide as its default, a large ecosystem of templates, dashboards and component kits now assumes it. For a React team, lucide-react is close to a default choice: every icon accepts the same props, the package tree-shakes cleanly, and new developers already know it. Lucide's weakness is also its discipline: it is intentionally neutral, so a brand that wants a distinctive, playful icon voice may find it too quiet, and at 2,144 icons it will eventually miss a niche glyph your product needs.",
      },
      { type: "h2", text: "What IconVault actually is" },
      {
        type: "p",
        text: "IconVault does not draw icons. It indexes them. One search box covers 239 sets, from Lucide and Tabler to Phosphor, Heroicons, Material Symbols and Bootstrap Icons, and every result can be downloaded as SVG or PNG, copied as a component, recoloured, or added to a sprite sheet. Around the index sit 579 free online tools, including an [SVG to JSX converter](/tools/svg-to-jsx), an [SVG optimizer](/tools/svg-optimizer) and a [sprite generator](/tools/svg-sprite-generator). The value is not a house style, because there is none. The value is that you stop opening six library sites to answer one question: does this icon exist, and in which set does it look best?",
      },
      { type: "h2", text: "Side by side" },
      {
        type: "ul",
        items: [
          "**Scope:** Lucide gives you one set of 2,144 icons. IconVault gives you 421,020 icons across 239 sets, including Lucide.",
          "**Consistency:** Lucide wins by design. One team, one grid, one stroke. IconVault's results mix sets, so consistency is your job: pick one primary set per surface.",
          "**Framework support:** lucide-react, lucide-vue and similar packages are first-class for Lucide. IconVault answers with copy-as-component for any icon, which covers frameworks without an official package.",
          "**Customization:** Lucide icons take size, colour and stroke width props. IconVault adds colour editing before download, PNG export, optimization and sprite generation.",
          "**Licences:** Lucide is ISC, free for commercial use without attribution. IconVault shows each set's own licence, so you always know whether a result needs a credit.",
          "**Cost:** both are free on the basics. Lucide is free, full stop. IconVault is free on the basics with a paid tier for heavier use.",
        ],
      },
      { type: "h2", text: "When to pick Lucide alone" },
      {
        type: "p",
        text: "Pick Lucide alone when your product already speaks it. If you build with shadcn/ui, if your design system documents one set, or if your team values one consistent voice over maximum choice, installing lucide-react and stopping there is the right call. A single set also ends debates: nobody spends a sprint choosing between five near-identical arrows. Lucide alone is the disciplined choice, and discipline is a feature.",
      },
      { type: "h2", text: "When to pick IconVault" },
      {
        type: "p",
        text: "Pick IconVault when the question is open. You are exploring which set fits a new product. You need one obscure icon Lucide does not have. You want to compare how five sets draw the same idea before committing. You need a brand glyph from a set like Simple Icons, or you need to convert, optimize or sprite icons rather than just download them. IconVault is also the right tool for one-off work: a landing page, a slide deck, a prototype where installing a package would be slower than downloading a file.",
      },
      { type: "h2", text: "How they work together" },
      {
        type: "p",
        text: "The honest workflow uses both. Search in IconVault when you are deciding, because it shows Lucide next to Tabler, Phosphor and Heroicons for the same keyword. Once the team standardizes on Lucide, install lucide-react and wrap it in one small internal component that fixes the default size, stroke and accessibility handling. That wrapper is where consistency lives: when the brand colour changes or the team moves an icon size from 16 to 18 pixels in dense tables, one file absorbs the change. Use IconVault again whenever you need an icon outside the standard set, a conversion, or a quick export. The library gives you the voice. The index gives you the rest of the world.",
      },
      { type: "h2", text: "The honest weaknesses on both sides" },
      {
        type: "p",
        text: "Lucide's weakness is coverage and personality: 2,144 icons, deliberately neutral, will miss niche glyphs and will never be the loudest voice in a brand. IconVault's weakness is the opposite: an index cannot guarantee that every set is equally well drawn, and mixing sets without rules makes an interface look assembled. The fix is a rule, not a tool: one primary set per surface, exceptions only for brand glyphs and illustrations, and a short approved list for the core icons your product uses every day.",
      },
      { type: "h2", text: "Frequently asked questions" },
      { type: "h3", text: "Is IconVault a replacement for Lucide?" },
      {
        type: "p",
        text: "No, and it does not try to be. IconVault indexes Lucide alongside 238 other sets. If your product standardizes on Lucide, keep using lucide-react and use IconVault for discovery, comparison and conversion around it.",
      },
      { type: "h3", text: "Can I download Lucide icons from IconVault?" },
      {
        type: "p",
        text: "Yes. Search Lucide in the IconVault app, open any icon, and download the SVG or copy it as a component. The ISC licence allows commercial use without attribution.",
      },
      { type: "h3", text: "Which is better for a React project?" },
      {
        type: "p",
        text: "For a full product, lucide-react is the better default because it is a package with one API and clean tree-shaking. For exploring sets, one-off icons and conversions, IconVault is faster because nothing needs installing.",
      },
      { type: "h3", text: "Does IconVault cost money?" },
      {
        type: "p",
        text: "The basics are free: search, download and the core tools need no account. Heavier use has a paid tier, while Lucide itself remains free under ISC either way.",
      },
      { type: "h3", text: "Can I mix Lucide with other sets in one product?" },
      {
        type: "p",
        text: "You can, but treat it as an exception with rules. Keep one primary set for all functional UI icons, and let a second set fill a clearly separate role, such as brand logos. Within a single toolbar or sidebar, never mix, because stroke and proportion differences are most visible side by side at small sizes.",
      },
    ],
  },
  {
    slug: "svg-icon-licences-explained",
    title: "SVG Icon Licences Explained: MIT, ISC, Apache and CC BY",
    description:
      "What free SVG icon licences actually allow: MIT, ISC, Apache-2.0 and CC BY explained in plain language, including attribution rules, brand icons, and a shipping checklist.",
    category: "Guides",
    tags: ["licences", "copyright", "attribution", "commercial use"],
    keyword: "SVG icon licences",
    date: "2026-10-24",
    readingMinutes: 11,
    icon: "scale",
    tint: "#0F766E",
    content: [
      {
        type: "p",
        text: "Every free icon set ships with a licence, and most developers never read it until something goes wrong: a client asks for proof, an app store review flags an asset, or a template sale raises the question of what was actually allowed. This guide explains the licences you will meet on IconVault in plain language. It is practical guidance, not legal advice, and for a high-stakes product you should still confirm the licence text in the set's own repository.",
      },
      { type: "h2", text: "The licences you will meet" },
      {
        type: "ul",
        items: [
          "**MIT:** the most common permissive licence. Use, modify and ship in paid products, keep the copyright notice in your records. No attribution screen required in the product itself.",
          "**ISC:** functionally the same as MIT, written more briefly. Lucide uses ISC. Free for commercial use without attribution.",
          "**Apache-2.0:** like MIT, plus an explicit patent grant. Material Symbols and Material Design Icons use it. Free for commercial use without attribution.",
          "**CC BY 4.0:** Creative Commons Attribution. Free to use, including commercially, but you must give visible credit to the creator. Solar uses CC BY 4.0.",
          "**CC0:** public domain dedication. Use however you like, no credit required. Some illustration and icon sets use it.",
        ],
      },
      { type: "h2", text: "What free usually allows, and what it does not" },
      {
        type: "p",
        text: "Permissive licences allow the things most products need: using icons in a paid app, modifying them, recolouring them, and shipping them inside a product you sell. They do not allow everything. You generally may not redistribute the icons as if they were your own library, remove copyright notices where the licence requires keeping them, or use the set's name or logo to imply endorsement. The sharpest edge is redistribution: shipping icons inside an app is normal use, but selling a template or a UI kit whose main value is the icon collection itself is a different act, and some licences treat it differently. Read the text before you do it.",
      },
      { type: "h2", text: "Attribution: when you must give credit, and how" },
      {
        type: "p",
        text: "Attribution is only mandatory for Creative Commons sets, but it is good practice everywhere. A credit can live on a credits page, in an about screen, in a LICENSE file shipped with the product, or in the documentation of an open-source project. It should name the set and link to its source. One line is enough: the set name, the licence, and a link. What does not count is a credit buried where no user or reviewer can find it, or a credit that names the wrong set after you switched libraries mid-project. When a set changes licence between versions, the version you downloaded is the one whose terms apply to your copy, so record the version too.",
      },
      { type: "h2", text: "Brand icons are special" },
      {
        type: "p",
        text: "Brand glyphs, the logos of companies and products, follow an extra rule that no icon licence can waive: trademark law. A set like Simple Icons distributes brand SVGs so developers can show the services their product connects to, but the licence on the drawing does not grant the trademark. Do not use a brand icon in a way that suggests endorsement, partnership or ownership, and do not recolour a brand logo into your own brand colours. If the brand publishes usage guidelines, those guidelines win over whatever the icon set allows.",
      },
      { type: "h2", text: "A practical checklist before you ship" },
      {
        type: "ul",
        items: [
          "Record every set you use, with its licence and version, in one file in the repository.",
          "Keep a copy of each licence text with your project records.",
          "Flag every CC BY set and confirm its credit is visible somewhere real.",
          "Check redistribution separately if you sell templates, themes or UI kits containing icons.",
          "Treat brand icons under trademark rules, not just the icon licence.",
          "Recheck licences when you upgrade a set to a new major version.",
        ],
      },
      { type: "h2", text: "How IconVault shows licences" },
      {
        type: "p",
        text: "Every library page on IconVault shows the set's licence next to its icon count, and the search results carry the same information, so you can filter out attribution-required sets before you fall in love with an icon. That does not replace reading the licence, but it stops the most common mistake: discovering the attribution requirement after the product has shipped. When in doubt, prefer a permissive set for functional UI icons and reserve attribution-required sets for places where the credit is natural, such as marketing pages and empty states.",
      },
      { type: "h2", text: "Frequently asked questions" },
      { type: "h3", text: "Can I use MIT icons in a paid app?" },
      {
        type: "p",
        text: "Yes. MIT allows commercial use, modification and distribution without royalties. Keep the copyright notice in your project records.",
      },
      { type: "h3", text: "Do I need attribution for Lucide icons?" },
      {
        type: "p",
        text: "No. Lucide is ISC, a permissive licence that does not require attribution. A credit is welcome but not required.",
      },
      { type: "h3", text: "What if I modify an icon?" },
      {
        type: "p",
        text: "Modification is allowed under MIT, ISC, Apache-2.0 and CC BY. Under CC BY you must still credit the original creator and note that you changed it.",
      },
      { type: "h3", text: "Can I sell a template that contains free icons?" },
      {
        type: "p",
        text: "Usually yes under permissive licences, but redistribution rules differ from normal app use. Read the licence text for every set in the template before selling it, and check the template marketplace's own rules too.",
      },
      { type: "h3", text: "Can I use brand logos from an icon set?" },
      {
        type: "p",
        text: "You can display them to represent the brand, for example a login button for a service. You cannot use them to imply endorsement, and you should not recolour them. Trademark rules apply on top of the icon licence.",
      },
    ],
  },
];
