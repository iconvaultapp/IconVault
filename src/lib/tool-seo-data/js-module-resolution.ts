import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "JS Module Resolution - Interactive Lab | IconVault",
    metaDescription: "Step through CJS vs ESM resolution against a live project tree: node_modules traversal, main vs exports, extensions.",
    about: [
      "**IconVault**'s **JS Module Resolution** lab visualizes the algorithm that turns an **import specifier** into a file. Type any specifier and importing file, pick **CommonJS** or **ESM**, then step through the resolution one lookup at a time while the fake project tree highlights every path being probed. Watch **bare specifiers** walk **node_modules** upward, **relative imports** probe extensions, and **package.json exports** maps win over **main**. It is free and runs fully in your browser, with a copyable step-by-step trace.",
      "Preset scenarios cover the classic gotchas: **./lib** resolving in CJS but failing in ESM without an extension, **lodash/fp** subpath resolution, **@scope/pkg** exports maps, and **nested node_modules** winning for deep dependencies but losing from the project root. Comparing the two modes side by side is the fastest way to understand why **ERR_MODULE_NOT_FOUND** happens and how to fix it."
    ],
    faqs: [
      { q: "How does Node.js resolve a bare import like lodash?", a: "It walks up from the importing file's directory, checking node_modules in each parent folder. In the first node_modules containing the package, it reads package.json: the exports field wins if present, otherwise main (defaulting to index.js). If no node_modules up to the filesystem root has it, you get Cannot find module." },
      { q: "Why does ESM require file extensions in imports?", a: "The ESM specification does no extension probing: ./lib must be written ./lib/index.js or ./lib.js. CJS require() tries .js, .json and .node automatically. Bundlers often add ESM extension probing as a convenience, but Node.js follows the spec strictly." },
      { q: "What is the difference between main and exports in package.json?", a: "main is the legacy entry point used by require(). exports is a newer map that controls exactly which subpaths are importable and can give different files to require vs import. When exports exists, it takes precedence and anything not listed is unreachable." },
      { q: "What are nested node_modules for?", a: "npm nests a dependency inside node_modules/dep/node_modules when the version conflicts with the top-level one. Because resolution walks upward from the importing file, dep's own code finds its nested copy first while the rest of the project keeps using the hoisted version." },
      { q: "What does Cannot find module mean?", a: "The resolver exhausted every lookup: relative paths with all extensions, and every node_modules folder up to the root. Common causes are a missing file extension in ESM, a typo in the package name, the package not being installed, or an exports map that does not expose the subpath." },
      { q: "How do scoped packages like @scope/pkg resolve?", a: "The scope and name are treated as one path segment: node_modules/@scope/pkg. Everything else, exports maps, main fallback, and upward traversal, works exactly like an unscoped package." }
    ],
    tags: [
      "node module resolution", "how require resolves modules", "commonjs vs esm",
      "node_modules lookup algorithm", "javascript import resolution", "esm import specifier",
      "package.json main vs exports", "node exports field", "bare specifier javascript",
      "relative import javascript", "javascript module not found", "cannot find module node",
      "esm needs file extension", "typescript module resolution", "node16 nodenext resolution",
      "require.resolve explained", "node_modules traversal", "nested node_modules",
      "how npm resolves dependencies", "import maps vs node resolution", "mjs vs cjs",
      "package.json type module", "dual package hazard", "javascript module systems explained",
      "commonjs require algorithm", "esm resolution algorithm", "node resolution order",
      "err_module_not_found fix", "cannot find module javascript", "node js import error",
      "how does node find modules", "node_modules how it works", "npm hoisting explained",
      "package.json exports examples", "subpath imports node", "exports field node js",
      "main field package.json", "index.js fallback node", "extension probing esm",
      "import without extension node", "node esm vs commonjs differences", "require vs import node",
      "javascript bare imports", "scoped package resolution", "node resolution algorithm steps",
      "how import maps work", "node_modules folder structure", "npm nested dependencies",
      "fix module not found node", "javascript module resolution order", "node js path resolution",
      "esm named exports resolution", "cjs interop esm", "node conditional exports"
    ],
  };

export default seo;
