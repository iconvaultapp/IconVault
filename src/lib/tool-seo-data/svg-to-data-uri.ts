import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "SVG to Data URI Generator - CSS & HTML Embed Free | IconVault",
    metaDescription:
      "Turn any SVG into a CSS-ready data URI or HTML embed snippet. URL-encoded, copy-paste ready. Free, private, runs in your browser.",
    about: [
      "**IconVault**'s **SVG to Data URI** **generator** encodes your **SVG** into a **data**:**image**/**svg**+xml **URI** you can paste straight into **CSS** as a **background**-**image** or into **HTML** as an <img> src. The output is URL-encoded with encodeURIComponent, so characters like # in fill colors are correctly escaped to %23 - the most common reason hand-made **SVG** **data** URIs fail in Firefox and other browsers.",
      "**Data** URIs are perfect for small decorative icons, patterns and textures: they eliminate an HTTP request and keep the graphic **inline** with your stylesheet. You get both the **CSS** **background**-**image** rule and the **HTML** **embed** snippet, each with a one-click copy button New: decode mode recovers the original **SVG** from any **data** **URI** (**base64** or URL-encoded), plus extra output formats - raw **URI**, **CSS** **background**, <img> tag and **CSS** mask., plus the exact byte length of the **URI**. Everything runs in your browser - nothing is uploaded. Every visitor gets 5 **free** generations per tool; **IconVault** Pro ($12/year) unlocks unlimited runs across all tools.",
    ],
    faqs: [
      {
        q: "How do I use an SVG as a CSS background image?",
        a: "Paste your SVG into the generator and copy the CSS snippet: background-image: url(\"data:image/svg+xml,...\"). The URI is already URL-encoded, so it works in all browsers including Firefox.",
      },
      {
        q: "Why isn't my SVG data URI working?",
        a: "Almost always because of unencoded characters - especially # in hex colors, which must be %23, and unescaped quotes. This generator encodes everything correctly, which fixes the most common failures.",
      },
      {
        q: "Should I use a data URI or an SVG file?",
        a: "Use data URIs for small, decorative graphics like icons and patterns - they save an HTTP request. For large or reused SVGs, a separate cached file (or an SVG sprite) is usually better.",
      },
      {
        q: "Is a data URI better than base64 for SVG?",
        a: "Yes, for SVG. URL-encoded (UTF-8) data URIs are about 30% smaller than base64 for typical SVG markup and remain human-readable, which makes debugging easier.",
      },
      {
        q: "Can I use the output in Tailwind or a framework?",
        a: "Yes - the snippet is framework-agnostic. Drop the encoded URI into a Tailwind arbitrary value like bg-[url('data:image/svg+xml,...')], a styled-component, or any stylesheet.",
      },
      {
        q: "How many free generations do I get?",
        a: "Every visitor gets 5 free generations per tool, no account needed. IconVault Pro ($12/year) unlocks unlimited generations and every other Pro feature.",
      },
    ],
    tags: [
      "svg to data uri", "svg data uri", "svg to data url", "convert svg to data uri",
      "svg to data uri converter", "svg data uri generator", "svg data uri online",
      "svg to base64 alternative", "svg background image css", "inline svg css background",
      "svg in css url", "css background svg data uri", "svg data uri css trick",
      "encode svg for css", "svg url encoder", "svg encoder online", "svg css encoder",
      "data:image/svg+xml", "svg img src data uri", "embed svg in html data uri",
      "svg data uri copy paste", "svg to data uri free", "svg data uri no signup",
      "svg data uri in browser", "svg data uri privacy", "svg data uri generator free",
      "optimize svg data uri", "small svg data uri", "svg data uri size",
      "svg data uri vs file", "when to use svg data uri", "svg data uri performance",
      "svg data uri caching", "svg sprite vs data uri", "icon font alternative data uri",
      "svg favicon data uri", "data uri favicon generator svg", "svg data uri react",
      "svg data uri tailwind", "tailwind svg background data uri", "svg data uri wordpress",
      "svg data uri email", "svg in email data uri", "encode # in svg data uri",
      "svg data uri utf8", "svg data uri charset", "svg data uri quotes",
      "single quote svg data uri", "svg data uri firefox fix", "svg data uri not working",
      "svg background not showing fix", "css url svg encoded", "encodeuricomponent svg",
      "best svg data uri generator", "svg data uri tool", "convert svg to css background free",
      "svg pattern data uri", "svg texture data uri css", "inline svg data uri snippet",
      "svg data uri snippet copy",
    ],
  };

export default seo;
