import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "SVG to JSX Converter - React, TSX, Vue & Svelte Free | IconVault",
    metaDescription:
      "Convert SVG to JSX, TSX, Vue or Svelte components instantly. Auto-maps attributes, self-closes tags. Free, runs entirely in your browser.",
    about: [
      "**IconVault**'s **SVG to JSX converter** turns raw **SVG** markup into framework-ready components in one click. Paste any **SVG** and get clean **JSX** with kebab-case attributes mapped to camelCase (stroke-width → strokeWidth, fill-rule → fillRule, class → className) and every tag properly self-closed New: **TypeScript** toggle with typed props, Icon mode (1em sizing for icon components), an editable **component** name, and optional {...props} spread. - the two things that break SVGs pasted straight into **React**. Switch tabs to get a typed **TSX** **component**, a **Vue** single-file **component**, or a **Svelte** **component** instead.",
      "The **TSX** output includes a proper SVGProps type signature and spreads props onto the root element, so your icon accepts className, onClick and every standard **SVG** prop. Everything runs in your browser - nothing is uploaded. Every visitor gets 5 **free** conversions per tool with no account needed. **IconVault** Pro ($12/year) unlocks unlimited conversions, HD exports and every template.",
    ],
    faqs: [
      {
        q: "How do I convert an SVG to a React component?",
        a: "Paste your SVG markup into the converter and click Convert. You get JSX with all attributes mapped to camelCase and tags self-closed - paste it straight into a React component file and it works.",
      },
      {
        q: "Why does my SVG break when pasted into React?",
        a: "React's JSX doesn't accept kebab-case attributes like stroke-width or class, and it requires void elements to be self-closed. The converter fixes both automatically, which is the most common source of 'Invalid DOM property' warnings.",
      },
      {
        q: "Does it generate TypeScript components?",
        a: "Yes - the TSX tab outputs a typed component using React's SVGProps, with props spread onto the root <svg> so you can pass className, style, onClick and any standard SVG attribute.",
      },
      {
        q: "Can I convert SVG to Vue or Svelte too?",
        a: "Yes. The Vue tab wraps your SVG in a <template> block keeping kebab-case attributes (which Vue expects), and the Svelte tab outputs the cleaned SVG ready to drop into a .svelte file.",
      },
      {
        q: "Is this a replacement for SVGR?",
        a: "For quick one-off conversions, yes. SVGR is a build tool for converting whole folders at build time; this converter handles the common case - paste one SVG, get one component - instantly in your browser with no setup.",
      },
      {
        q: "How many free conversions do I get?",
        a: "Every visitor gets 5 free conversions per tool, no account needed. IconVault Pro ($12/year) unlocks unlimited conversions across all tools.",
      },
    ],
    tags: [
      "svg to jsx", "convert svg to jsx", "svg to jsx converter", "svg to react",
      "convert svg to react component", "svg to jsx online", "svg to react online free",
      "svg to tsx", "svg to tsx converter", "svg to typescript react",
      "svg react component generator", "svg to react component online", "jsx svg converter",
      "transform svg to jsx", "svg attributes to jsx", "stroke-width to strokeWidth",
      "svg to jsx free", "svg to jsx no signup", "svg to vue", "svg to vue component",
      "convert svg to vue", "svg to svelte", "svg to svelte component",
      "convert svg to svelte", "svg to jsx typescript", "react svg props",
      "svgprops react", "reusable svg react component", "svg icon component react",
      "svg to jsx in browser", "paste svg get jsx", "svg to jsx copy paste",
      "svg to jsx with props", "svg component with className", "react inline svg",
      "inline svg react best practice", "svg as react component vs img",
      "convert svg for nextjs", "nextjs svg component", "svg to jsx next.js",
      "svg to react native", "svg to jsx camelcase attributes", "svg attribute converter",
      "kebab case to camelcase svg", "svg self closing tags jsx", "fix svg for jsx",
      "svg jsx error fix", "invalid dom property svg react", "svg to jsx tool",
      "best svg to jsx converter", "svg to vue template", "svelte svg component",
      "vue inline svg component", "svg to jsx without svgr", "svgr online alternative",
      "svgr playground alternative free", "svg to jsx typed props", "react svg icon library",
    ],
  };

export default seo;
