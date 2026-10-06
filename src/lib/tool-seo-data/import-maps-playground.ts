import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "Import Maps Playground - Module Resolution Visualizer | IconVault",
    metaDescription: "Write an import map and module code, watch bare specifiers resolve with exact and prefix rules plus scoped imports. Free, in your browser.",
    about: [
      "**IconVault**'s **Import Maps Playground** shows you exactly how the browser turns a bare specifier like **\"lodash\"** into a URL. Write your **import map JSON**, write module code that imports from it, then press resolve to see which **exact key**, **prefix key** or **scope** matched each import, and the final resolved URL.",
      "It handles the tricky parts: **longest-prefix matching**, **scoped imports** that remap a package for part of your app, and the **unmapped specifier** error the browser would throw. Everything is **free** and runs fully in your browser, making it the fastest way to debug an import map before shipping it.",
    ],
    faqs: [
      {
        q: "What is an import map?",
        a: "An import map is a JSON block in a script type=importmap tag that tells the browser how to resolve bare module specifiers. It maps names like lodash to full URLs, so import { debounce } from 'lodash' works without a bundler.",
      },
      {
        q: "How does prefix matching work in import maps?",
        a: "A key ending in a slash, like app/, matches any specifier starting with that prefix, and the remainder is appended to the mapped URL. If several prefix keys match, the longest one wins. Exact keys always beat prefix keys.",
      },
      {
        q: "What are import map scopes?",
        a: "Scopes remap specifiers only for modules whose URL starts with the scope prefix. A classic use is giving a legacy section of your app an older version of a library while the rest uses the new one.",
      },
      {
        q: "What happens with an unmapped bare specifier?",
        a: "The browser throws a TypeError and the module fails to load. This playground flags unmapped specifiers before you deploy, showing exactly which import has no matching key.",
      },
      {
        q: "Is the Import Maps Playground free?",
        a: "Yes. Editing, resolving and copying are free in your browser, with 5 free resolutions per tool before Pro is suggested.",
      },
      {
        q: "Does this tool run my modules?",
        a: "No. It performs the resolution algorithm statically and shows the mapping results. It never fetches or executes the resolved URLs.",
      },
    ],
    tags: [
      "import maps", "import map", "importmap", "javascript import maps",
      "import maps tutorial", "import maps explained", "bare specifiers",
      "bare module specifiers", "import map scopes", "scoped imports",
      "import maps prefix", "import map trailing slash", "es modules import map",
      "javascript modules without bundler", "esm cdn", "esm.sh",
      "import maps browser support", "import maps chrome", "script type importmap",
      "import map example", "import maps json", "debug import map",
      "import map not working", "unmapped bare specifier", "import maps error",
      "import maps vs bundler", "native es modules", "module resolution",
      "javascript module resolution", "import maps polyfill", "es-module-shims",
      "import maps multiple", "import map dynamic", "import maps best practices",
      "learn import maps", "import maps visualizer", "import map tester",
      "import map generator", "import map builder", "import maps deno",
      "import maps node", "package imports", "subpath imports",
      "cdn es modules", "jsdelivr esm", "unpkg esm", "skypack",
      "import maps react", "import maps vue", "micro frontends import maps",
      "import maps versioning", "import map cache busting", "import maps integrity",
      "import maps subresource integrity", "jspm import maps", "jspm generator",
    ],
  };

export default seo;
