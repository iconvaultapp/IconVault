import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "CSS Specificity - Free Online CSS Tool | IconVault",
    metaDescription: "Calculate CSS specificity scores: type any selector to see its (a, b, c) breakdown and compare selectors. Free, runs in your browser.",
    about: [
      "**IconVault**'s **CSS Specificity** calculator scores any **selector** instantly: type it in and see the **(a, b, c)** breakdown of **ID selectors, class/attribute/pseudo-class selectors and element/pseudo-element selectors**. Compare two selectors side by side to see exactly why one wins.",
      "**Specificity** decides which rule applies when selectors tie: IDs beat classes, classes beat elements, and **!important** beats everything. Understanding the score ends most CSS debugging mysteries. Free and runs fully in your browser.",
    ],
    faqs: [
      { q: "Is the CSS specificity calculator free?", a: "Yes, free with no signup. Type any selector and get its specificity score instantly." },
      { q: "How is CSS specificity calculated?", a: "Count ID selectors (a), class, attribute and pseudo-class selectors (b), and element and pseudo-element selectors (c). Compare a first, then b, then c." },
      { q: "What beats an ID selector?", a: "Only another ID in the same cascade layer, inline styles, or !important. That is why IDs are discouraged for styling: they are hard to override." },
      { q: "Does :not() add specificity?", a: ":not() itself adds nothing, but the selector inside it does. :where() always contributes zero specificity." },
      { q: "Why is !important bad?", a: "It breaks the cascade's normal rules and makes overrides painful, leading to !important arms races. Use lower specificity and cascade layers instead." },
      { q: "What is the specificity of * and inherited styles?", a: "The universal selector * and inherited styles contribute zero specificity, so any direct rule beats them." },
    ],
    tags: ["css specificity", "css specificity calculator", "specificity calculator css", "css specificity chart", "css specificity explained", "css specificity rules", "css specificity calculator online", "css selector specificity", "css specificity (a,b,c)", "css specificity points", "css specificity id class element", "css specificity example", "css specificity tutorial", "css specificity !important", "css specificity wars", "css specificity calculator free", "calculate css specificity", "css specificity score", "css specificity hierarchy", "css specificity visualizer", "css specificity graph", "css specificity cheat sheet", "css specificity for beginners", "css specificity best practices", "avoid !important css", "css specificity conflicts", "css specificity inline styles", "css specificity pseudo-class", "css specificity attribute selector", "css specificity :not()", "css specificity :where()", "css :is() specificity", "css specificity universal selector", "css specificity order", "css specificity tie breaker", "css specificity demo", "css specificity tool", "css specificity tester", "check css specificity", "css specificity examples list", "css specificity 0 1 0", "css specificity explained simply", "css specificity mdn", "learn css specificity", "css specificity quiz", "css specificity 1 0 0", "css specificity class vs id", "css specificity weight", "css why is my style not applying", "css specificity important vs id"],
  };

export default seo;
