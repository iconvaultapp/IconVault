import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "Invoker Commands - HTML command Demos | IconVault",
    metaDescription: "Live demos of the HTML command and commandfor attributes: dialogs, popovers and media controls with zero JavaScript. Copy the HTML. Free.",
    about: [
      "**IconVault**'s **Invoker Commands** playground demonstrates the declarative **command** and **commandfor** attributes: buttons that open **dialogs**, toggle **popovers**, control **media** and flip **details** elements with **zero JavaScript**. Every demo on the page is wired the way the sample code shows, so what you click is literally what you copy.",
      "Each of the four demos includes **copyable HTML** and a rundown of the built-in commands, from **show-modal** and **toggle-popover** to **play**, **pause** and **mute**. Everything is **free** and runs fully in your browser, with an honest note about which browsers support invokers today.",
    ],
    faqs: [
      {
        q: "What are the command and commandfor attributes?",
        a: "They are HTML attributes that let a button invoke built-in behaviors on another element without JavaScript. command names the action, like show-modal, and commandfor points at the target element's id. The browser handles the rest.",
      },
      {
        q: "Which elements support invoker commands?",
        a: "Dialogs (show-modal, close), popovers (show-popover, hide-popover, toggle-popover), media elements (play, pause, mute, unmute), details (toggle) and forms. Custom elements can also respond to command events with their own handlers.",
      },
      {
        q: "Which browsers support the command attribute?",
        a: "Chrome and Edge 135 and newer support invoker commands. Other browsers are implementing them. Until support is universal, keep a small JavaScript fallback for critical controls.",
      },
      {
        q: "How do I make a custom command?",
        a: "Listen for the command event on your element and check event.command for the custom command name. Any button with command='my-action' and a matching commandfor will dispatch it, so you define the behavior once in one listener.",
      },
      {
        q: "Is the Invoker Commands tool free?",
        a: "Yes. All four live demos and the HTML samples are free in your browser, with 5 free copies per tool before Pro is suggested.",
      },
      {
        q: "Do the demos use any JavaScript?",
        a: "The invoker behaviors themselves use none: the buttons drive the dialog, popover, audio and details purely through command attributes. Only the page chrome, like tabs and copy buttons, uses JavaScript.",
      },
    ],
    tags: [
      "invoker commands", "html command attribute", "commandfor",
      "html invokers", "declarative html", "html without javascript",
      "dialog show-modal", "html dialog element", "dialog command",
      "popover api", "html popover", "toggle popover",
      "popover without javascript", "html media commands", "command play pause",
      "details toggle", "html details element", "html command event",
      "commandevent", "custom commands html", "chrome 135 features",
      "new html features", "modern html", "declarative ui",
      "html dialog tutorial", "html dialog example", "modal without javascript",
      "popover tutorial", "popover example html", "tooltip without javascript",
      "dropdown without javascript", "html only components",
      "learn html dialog", "dialog closedby", "dialog backdrop",
      "popover positioning", "anchor positioning popover", "html popover css",
      "invoker api", "whatwg invokers", "openui invokers",
      "html buttons no js", "progressive enhancement html", "accessible modal html",
      "native dialog vs div modal", "html dialog accessibility",
      "javascript free web", "vanilla html components", "html command reference",
      "command attribute browser support", "can i use command attribute",
      "html invoker commands list", "show popover command", "hide popover command",
    ],
  };

export default seo;
