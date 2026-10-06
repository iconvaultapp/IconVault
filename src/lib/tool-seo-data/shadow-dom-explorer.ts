import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "Shadow DOM Explorer - Interactive Lab | IconVault",
    metaDescription: "Explore open vs closed shadow roots, slots, ::part() and encapsulation with live demos. Free, runs fully in your browser.",
    about: [
      "**IconVault**'s **Shadow DOM Explorer** makes web components' hidden machinery visible: attach open and closed shadow roots and see the access difference, project light-DOM content through named and default slots, style through the wall with ::part(), and prove encapsulation by watching page CSS fail to reach inside. It is free to use and runs fully in your browser with nothing uploaded.",
      "How to use: work through the four tabs, run each demo, and read the what-happened log for real DOM results. Perfect for **developers** learning web components, custom elements and style scoping.",
    ],
    faqs: [
      { q: "Is Shadow DOM Explorer free to use?", a: "Yes. Shadow DOM Explorer is free to use with a generous free trial, no account needed. Pro unlocks unlimited use." },
      { q: "What is the difference between open and closed shadow roots?", a: "An open root is reachable via host.shadowRoot; a closed root returns null, sealing the tree even from the page's own script. The demo proves both live." },
      { q: "What do slots do?", a: "Slots project light-DOM children into the shadow tree at marked points. The nodes never move; assignedNodes() shows the projection." },
      { q: "How does ::part() work?", a: "Elements inside the shadow tree marked with part=\"name\" can be styled from the page with ::part(name), a controlled hole in encapsulation." },
      { q: "Can page CSS style inside shadow DOM?", a: "No, except through ::part(), ::slotted(), CSS custom properties and inherited styles. The encapsulation demo shows a page rule failing to reach in." },
      { q: "Can I copy the code?", a: "Yes. Each tab has a copy-ready snippet covering attachShadow, slots, ::part() and the encapsulation pattern." },
    ],
    tags: [ "shadow dom", "shadow dom tutorial", "attachshadow example", "open vs closed shadow dom", "shadowroot mode", "closed shadowroot null", "slots explained", "html slot element", "slot name attribute", "assignednodes", "assignedelements", "default slot", "slot fallback content", "css part", "part css example", "exportparts", "style shadow dom", "shadow dom encapsulation", "shadow dom css", "host selector css", "host-context", "slotted css", "web components tutorial", "custom elements", "shadow dom vs iframe", "learn shadow dom", "shadow dom mdn", "declarative shadow dom", "template shadowrootmode", "shadow dom browser support", "shadow dom polyfill", "event retargeting", "composed events", "event.composedpath", "shadow dom events", "form associated custom elements", "elementinternals", "adoptedstylesheets", "constructable stylesheets", "shadow dom performance", "web components examples", "slotchange event", "light dom vs shadow dom", "shadow dom interview", "shadow dom playground", "web components lab", "custom element slots", "shadow dom guide", "shadow dom demo", "shadow dom encapsulation explained "],
  };

export default seo;
