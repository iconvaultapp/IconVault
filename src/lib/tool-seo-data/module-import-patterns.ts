import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "ES Module Patterns - Interactive Lab | IconVault",
    metaDescription: "Dynamic import() and top-level await executed for real, plus a circular dependency simulator showing real ESM evaluation order and TDZ errors.",
    about: [
      "**IconVault**'s **ES Module Patterns** lab teaches the three module patterns every JavaScript developer trips over. **Dynamic import()** builds a real module from a Blob URL and imports it live so you can inspect the module namespace. **Top-level await** runs a real module that pauses its own evaluation for 1.2 seconds while a progress bar shows the importer waiting. It is free and runs fully in your browser, with copyable code throughout.",
      "The **circular dependencies** tab is the centerpiece: draw an import graph between three editable modules, pick an entry point, and evaluate. A faithful simulator runs the real **ESM linking and evaluation phases**, depth-first post-order traversal, **hoisted function declarations**, **live bindings**, and genuine **temporal dead zone** errors when a module reads an imported const too early. Edit the bodies to fix the cycle and watch the trace go green."
    ],
    faqs: [
      { q: "What is the difference between static import and dynamic import()?", a: "Static import is hoisted, must be at the top level, and always loads. Dynamic import() is a function call returning a promise for the module namespace, so it can be conditional, lazy, and computed at runtime. Bundlers split each import() into a separate chunk automatically." },
      { q: "How does top-level await work?", a: "A module can await promises directly in its body. Its evaluation pauses until they settle, and any module importing it waits too, while unrelated branches of the import graph keep evaluating. It is ideal for config and auth bootstrapping but dangerous deep in hot dependency chains." },
      { q: "Are circular imports allowed in ES modules?", a: "Yes, they are legal. ESM handles cycles with live bindings: the import refers to the binding, not the value. Problems only arise when a module reads an imported let or const during its own evaluation, before the exporting module has initialized it, which throws a temporal dead zone ReferenceError." },
      { q: "Why do function declarations survive circular imports but const does not?", a: "Function declarations are hoisted and initialized during the linking phase, before any module body evaluates. const and let stay in the temporal dead zone until their declaration line executes, so reading them early throws." },
      { q: "How do I fix a circular dependency TDZ error?", a: "Only read the imported binding inside functions that run after evaluation completes, never at module top level. For deeper fixes, extract the shared code into a third module both sides import, which removes the cycle entirely." },
      { q: "In what order do ES modules evaluate?", a: "Depth-first post-order from the entry module: the engine visits each module's imports before evaluating the module itself, skipping modules already visited. That is why, in a cycle, one module always evaluates before the other." }
    ],
    tags: [
      "es modules javascript", "dynamic import javascript", "top level await",
      "circular dependencies javascript", "import vs require", "javascript module patterns",
      "static import dynamic import", "tdz temporal dead zone", "esm evaluation order",
      "javascript import graph", "code splitting dynamic import", "blob url import",
      "javascript modules tutorial", "how es modules work", "esm vs commonjs",
      "import() javascript example", "lazy load module javascript", "conditional import javascript",
      "module namespace object", "top level await browser support", "await import javascript",
      "circular import javascript fix", "esm circular dependency", "cannot access before initialization",
      "referenceerror tdz", "javascript hoisting functions vs const", "live bindings esm",
      "module linking phase", "depth first module evaluation", "post order evaluation esm",
      "javascript import cycle", "detect circular dependencies", "madge circular dependencies",
      "how to avoid circular imports", "shared module pattern javascript", "barrel file circular import",
      "index.js circular dependency", "esbuild circular import", "webpack circular dependency warning",
      "javascript module systems", "import attributes javascript", "import assertions",
      "dynamic import vite", "code splitting react lazy", "javascript chunk loading",
      "esm in browser", "type module script", "javascript modules explained",
      "import map tutorial", "esm import specifier", "re-export javascript modules"
    ],
  };

export default seo;
