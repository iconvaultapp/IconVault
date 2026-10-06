import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "CSS Mixins Playground - Interactive CSS Lab | IconVault",
    metaDescription: "Write native CSS @mixin blocks with parameters and apply them with @apply. Live preview, JS fallback, copyable CSS. Free, in your browser.",
    about: [ "**IconVault**'s **CSS Mixins Playground** is a hands-on lab for native CSS **@mixin** and **@apply**. Name your mixin, add **parameters** with defaults, write the body with **var()** references, then apply it to two cards with different arguments and watch both restyle live. The page generates the real **@mixin/@apply** code as you type, ready to copy into any project. It is free and runs fully in your browser.",
    "Native mixins bring Sass-style reuse to the browser with superpowers preprocessors never had: because they run at render time, mixin bodies can read **custom properties**, respond to **container queries**, and participate in the **cascade**. The playground feature-detects support and runs the genuine **@mixin** engine on Chrome 133+ and Edge 133+, while older browsers get a pixel-faithful JavaScript expansion so the learning never stops. Parameters with defaults make one mixin serve many variants without repetition." ],
    faqs: [
      { q: "What is CSS @mixin?", a: "@mixin defines a reusable block of declarations with optional parameters, like @mixin card(--bg: white) { background: var(--bg); }. You apply it with @apply --card(red). It is native CSS, so it runs in the browser at render time." },
      { q: "How is @apply different from Sass @include?", a: "Sass mixins expand at build time, while native @mixin expands in the browser. That means native mixins can use var(), container queries and cascade-dependent values that a preprocessor can never know." },
      { q: "Which browsers support CSS @mixin?", a: "Chrome 133+ and Edge 133+ support @mixin and @apply. Firefox and Safari do not support them yet. This playground detects support and expands mixins with JavaScript on unsupported browsers." },
      { q: "Can mixin parameters have defaults?", a: "Yes. Declare them like (--radius: 12px) and callers may omit arguments to get the defaults. Clearing an argument in this playground falls back to the default automatically." },
      { q: "Do mixins work with CSS nesting?", a: "Yes. @mixin bodies can contain nested rules, and @apply can appear inside nested rule sets, so mixins compose naturally with modern nested stylesheets." },
      { q: "Should I replace Sass mixins with @mixin?", a: "For new projects targeting Chromium, native mixins remove a build step and gain runtime awareness. Keep Sass if you need broad browser support or its functions and loops, which CSS does not have." },
    ],
    tags: [ "css @mixin", "css mixins", "@apply css", "css @apply", "native css mixins", "@mixin parameters", "css mixin example", "css @mixin tutorial", "learn css mixins", "css mixins playground", "interactive mixin demo", "css @mixin generator", "@mixin with arguments", "css reusable styles", "css mixin vs sass", "sass @mixin vs css", "css @mixin browser support", "css @mixin chrome", "@mixin firefox", "css @mixin 2026", "how to use css @mixin", "@mixin syntax", "@apply syntax css", "css @mixin mdn", "css mixin defaults", "css mixin parameters", "css style reuse", "dry css", "css functions vs mixins", "css @mixin copy paste", "css @mixin not working", "css mixin fallback", "css mixin polyfill", "postcss mixins", "css nesting mixins", "css custom properties mixins", "css mixin card example", "css button mixin", "css mixin library", "modern css features", "css 2026 features", "css mixin cheat sheet", "css @mixin reference", "frontend css tools", "css playground", "css lab", "learn modern css", "css mixin arguments", "css @apply example",
      "css @mixin apply", "native css mixin example" ],
  };

export default seo;
