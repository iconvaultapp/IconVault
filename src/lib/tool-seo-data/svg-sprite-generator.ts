import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "SVG Sprite Generator - Combine SVGs into One Sprite Free | IconVault",
    metaDescription:
      "Combine multiple SVGs into one sprite.svg with <symbol> entries. Download the sprite + copy the <use> snippet. Free, in-browser.",
    about: [
      "**IconVault**'s **SVG Sprite Generator** merges any number of **SVGs** into a single **sprite**.**svg** file, where each **icon** becomes a <**symbol**> with its own id and viewBox. Add as many **SVGs** as you like - name each **one**, and the tool extracts the inner artwork, preserves the viewBox, and assembles a clean, hidden **sprite** ready to reference anywhere with <**svg**><use href=\"**sprite**.**svg**#**icon**-name\"></use></**svg**>.",
      "Sprites are the classic performance pattern for **icon** systems: **one** cached HTTP request serves your whole **icon** set, and each **symbol** stays styleable with CSS (fill: currentColor works beautifully). You get the downloadable **sprite**.**svg** plus a copy-ready usage snippet for every **icon**, and a currentColor toggle that makes the whole **sprite** recolorable via CSS. Everything runs in your browser - nothing is uploaded. Every visitor gets 5 **free** sprites per tool; **IconVault** Pro ($12/year) unlocks unlimited runs, HD exports and every template.",
    ],
    faqs: [
      {
        q: "How do I create an SVG sprite?",
        a: "Add your SVGs one by one - give each a name and paste its markup - then click Generate sprite. Download sprite.svg and reference any icon with <svg><use href=\"sprite.svg#your-icon-name\"></use></svg>.",
      },
      {
        q: "Do my SVGs need a viewBox?",
        a: "Yes. The viewBox is what lets each symbol scale correctly when referenced. The generator validates every entry and skips any SVG missing a viewBox, telling you which ones were skipped.",
      },
      {
        q: "How do I style icons from a sprite?",
        a: "Style the outer <svg> or the <use> with CSS - fill: currentColor makes the icon inherit text color, which is the standard technique for themable icon systems. Keep fills out of the symbol markup for maximum flexibility.",
      },
      {
        q: "SVG sprite vs icon font - which is better?",
        a: "Sprites. Icon fonts are a legacy hack with accessibility and rendering quirks; SVG sprites are real vector graphics, support multi-color icons, and are styleable per-instance with CSS.",
      },
      {
        q: "Can I use an external sprite.svg file?",
        a: "Yes - <use href=\"sprite.svg#id\"> works with external files in all modern browsers, and the browser caches the sprite so your whole icon set loads in one request. For same-document use, you can also inline the sprite at the top of your HTML.",
      },
      {
        q: "How many free sprites do I get?",
        a: "Every visitor gets 5 free sprite generations, no account needed. IconVault Pro ($12/year) unlocks unlimited generations across all tools.",
      },
    ],
    tags: [
      "svg sprite generator", "svg sprite", "create svg sprite", "svg sprite generator online",
      "svg symbol generator", "svg use sprite", "svg sprite sheet", "svg icon sprite",
      "svg sprite from multiple svg", "combine svg into sprite", "merge svg files",
      "svg sprite maker", "svg sprite builder", "svg sprite free", "svg sprite online free",
      "svg sprite no signup", "svg sprite in browser", "svg sprite privacy",
      "svg symbol sprite", "svg defs symbol use", "how to use svg sprite",
      "svg use href", "svg sprite tutorial", "svg sprite vs icon font",
      "svg sprite performance", "svg sprite caching", "svg sprite best practice",
      "external svg sprite", "svg sprite wordpress", "svg sprite react",
      "svg sprite vue", "svg sprite html", "inline svg sprite",
      "svg sprite css styling", "style svg use currentColor", "svg symbol viewBox",
      "svg sprite accessibility", "svg sprite fallback", "svg sprite generator tool",
      "best svg sprite generator", "svg sprite batch", "svg sprite gulp alternative",
      "svg sprite webpack alternative", "svg sprite without build tools",
      "svg sprite figma export", "figma icons to sprite", "illustrator icons to sprite",
      "icon set to svg sprite", "favicon sprite svg", "logo sprite svg",
      "svg sprite snippet", "copy paste svg sprite", "svg sprite code generator",
      "svg sprite download", "download sprite.svg", "svg sprite id naming",
      "svg sprite generator free online", "create icon system svg", "svg icon system generator",
      "design system svg sprite",
    ],
  };

export default seo;
