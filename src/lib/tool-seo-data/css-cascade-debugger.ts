import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "Cascade Debugger - Free Online CSS Specificity Tool | IconVault",
    metaDescription: "Paste CSS and a target selector to see which declaration wins each property. Hand-written specificity calculator shows the math. Free.",
    about: [
      "**IconVault**'s **Cascade Debugger** answers the eternal question: why is this style not applying? Paste your **CSS rules**, type the **target selector** you are debugging, and the tool lists every matching selector with its **specificity score** in (ID, class, element) form. For each **CSS property** it shows all competing declarations and highlights the **winner**, with the reason: higher specificity or later in **source order**.",
      "**!important declarations** are ranked above normal ones, exactly like the browser does. The specificity engine is **hand-written** and handles IDs, classes, attributes, pseudo-classes, pseudo-elements and :not() correctly. The honest caveat: matching is a **static approximation** of the selector's last compound, not a live DOM inspector, so treat it as a logic check. **Free** and runs **fully in your browser**.",
    ],
    faqs: [
      { q: "Is the cascade debugger free?", a: "Yes. Debugging CSS, specificity scores and winner explanations are free with no signup." },
      { q: "What is CSS specificity?", a: "The scoring system browsers use to decide which rule wins when several match one element. It is counted as three numbers: ID selectors, then class, attribute and pseudo-class selectors, then element and pseudo-element selectors." },
      { q: "Does !important always win?", a: "An !important declaration beats any normal declaration, and among !important declarations the usual specificity and source-order rules apply again. The tool ranks them exactly this way." },
      { q: "What does later in source order wins mean?", a: "When two matching selectors have identical specificity, the declaration that appears later in the stylesheet wins. The tool shows this reason explicitly." },
      { q: "How does :not() affect specificity?", a: "Correctly per spec: :not() itself adds nothing, but its argument's specificity counts. The hand-written calculator handles this case." },
      { q: "Is this a replacement for browser devtools?", a: "No. DevTools inspect the live DOM; this tool statically reasons about pasted CSS, which makes it ideal for understanding specificity logic and teaching the cascade." },
    ],
    tags: ["css cascade debugger", "css specificity calculator", "specificity calculator", "css specificity checker", "css winner declaration", "which css wins", "css conflict resolver", "debug css specificity", "css cascade visualizer", "css specificity explained", "css specificity score", "calculate specificity css", "css id class element score", "specificity 0 1 0", "css important vs specificity", "important declaration wins", "css source order wins", "css cascade order", "css inheritance debugger", "why css not applying", "css style overridden", "css rule conflict", "css selector priority", "css priority calculator", "css weight calculator", "css not working debug", "css troubleshooting tool", "css logic checker", "pseudo class specificity", "pseudo element specificity", "attribute selector specificity", "not selector specificity", "css specificity points", "css specificity hierarchy", "css cascade layers", "css specificity wars", "learn css specificity", "css specificity tutorial", "css specificity examples", "css specificity practice", "online css debugger", "free css debugger", "css debug tool online", "paste css debug", "css rule analyzer", "css declaration winner", "css property conflict", "css matching selectors", "css selector tester", "css specificity tool free"],
  };

export default seo;
