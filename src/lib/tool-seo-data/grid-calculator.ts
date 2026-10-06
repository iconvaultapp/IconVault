import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "Grid Calculator - Free Online Design Tool | IconVault",
    metaDescription: "Calculate CSS grid columns visually: container width, gaps, responsive breakpoints and copy-paste CSS. Free.",
    about: [
      "**IconVault**'s **Grid Calculator** answers the oldest layout question: how wide is each column? Enter your **container width**, **column count** and **gap**, and get the exact **column width in pixels** with a live visual preview. Add **responsive breakpoints** and the tool generates the **media queries** for you. Completely **free** and runs fully in your browser.",
      "**Presets** for desktop, laptop, tablet, mobile and Bootstrap containers get you started in one click, and the generated CSS uses `repeat()` and `1fr` so it stays clean and maintainable.",
    ],
    faqs: [
      { q: "Is the Grid Calculator free?", a: "Yes. Free in your browser with a daily quota for guests and unlimited use for Pro users." },
      { q: "How is column width calculated?", a: "Column width equals (container width minus gap times (columns minus 1)) divided by columns. The tool shows the formula with your numbers." },
      { q: "What presets are included?", a: "Desktop 1440, laptop 1280, tablet 768, mobile 375 and a Bootstrap container preset, each with sensible column and gap defaults." },
      { q: "How do breakpoints work?", a: "Add rows with a max-width and column count. The exporter sorts them and writes a media query per breakpoint that redefines grid-template-columns." },
      { q: "Does the CSS use fr units?", a: "Yes. The base rule uses repeat(n, 1fr) with your gap and max-width, so columns stay fluid while the computed pixel width guides your design." },
      { q: "Can I copy the output?", a: "Yes, one click copies the full CSS including all breakpoints." },
    ],
    tags: ["grid calculator", "css grid calculator", "column width calculator", "grid column calculator", "css grid layout calculator", "calculate grid columns", "grid gap calculator", "responsive grid calculator", "bootstrap grid calculator", "12 column grid calculator", "grid system calculator", "web grid calculator", "layout grid calculator", "css grid generator", "grid-template-columns calculator", "repeat fr calculator", "container width columns", "how wide is a grid column", "grid math", "column gutter calculator", "design grid calculator", "1200px 12 column grid", "1440 grid columns", "tablet grid 8 columns", "mobile grid 4 columns", "grid breakpoints generator", "media query grid generator", "responsive columns css", "css grid media queries", "grid visualizer", "see grid columns", "grid preview tool", "frontend layout math", "web design grid system", "grid spacing tool", "gutter width calculator", "grid framework calculator", "css grid repeat", "1fr column width", "grid-template-columns repeat", "layout calculator online", "design system grid", "grid tokens calculator", "free grid tool", "grid cheat sheet", "css grid tutorial", "learn css grid", "grid layout examples", "page grid calculator", "grid column width calculator"],
  };

export default seo;
