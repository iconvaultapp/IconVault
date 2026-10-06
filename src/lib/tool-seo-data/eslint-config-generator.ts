import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "ESLint Config Generator - Free Online Dev Tool | IconVault",
    metaDescription: "Build a modern ESLint flat config visually: pick rule severities, add ignore patterns, export ready code. Free, in your browser.",
    about: [
      "**IconVault**'s **ESLint Config Generator** builds a modern **ESLint flat config** (eslint.config.js) through a visual interface instead of docs archaeology. Browse the rule list, set each rule to **off, warn or error**, add **ignore patterns** one per line, and copy the generated config straight into your project. It is free and runs fully in your browser.",
      "**Flat config** replaced **.eslintrc** in ESLint 9, and writing it by hand means juggling arrays of config objects. This tool generates clean, commented, ready-to-run code you can paste into any **JavaScript or TypeScript** project."
    ],
    faqs: [
      { q: "What is ESLint flat config?", a: "It is the config format ESLint 9 uses by default: a single eslint.config.js file exporting an array of config objects, replacing the old .eslintrc JSON files. It is more flexible and easier to compose than the legacy format." },
      { q: "What do off, warn and error mean?", a: "They are rule severities. Off disables the rule, warn reports problems without failing the lint run, and error reports them and exits with a failure code, which is what you want in CI." },
      { q: "How do ignore patterns work?", a: "Patterns like node_modules, dist or *.min.js tell ESLint to skip matching files. The generator adds one per line into the ignores array of the exported config." },
      { q: "Can I use the output with TypeScript?", a: "Yes. The generated flat config is plain JavaScript that works with any project setup, and you can extend it with typescript-eslint or other plugin configs afterward." },
      { q: "Is my config stored anywhere?", a: "No. Everything is generated locally in your browser and nothing is uploaded." },
      { q: "Is this generator free?", a: "Yes, completely free with no signup." }
    ],
    tags: [
      "eslint config generator", "eslint flat config generator", "eslint.config.js generator",
      "generate eslint config", "create eslint config online", "eslint setup tool",
      "eslint rule configurator", "eslint rules picker", "eslint severity picker",
      "eslint ignore patterns", "eslint flat config example", "eslint 9 config generator",
      "eslint config builder", "visual eslint config", "eslint config maker",
      "javascript linting setup", "typescript eslint setup", "eslint beginner setup",
      "eslint recommended config", "eslint strict config", "eslint warn vs error",
      "how to configure eslint", "how to write eslint flat config", "eslint config tutorial",
      "free eslint tool", "eslint generator online free", "eslint tool no signup",
      "eslint config for react", "eslint config for node", "eslint config for nextjs",
      "eslint config for vue", "eslint config typescript project",
      "migrate eslintrc to flat config", "eslintrc to flat config converter",
      "eslint config best practices", "eslint recommended rules list",
      "lint javascript online", "js code quality tool", "javascript linter setup",
      "eslint ignores example", "exclude files from eslint", "eslint dist ignore",
      "eslint config comments", "readable eslint config", "eslint config template",
      "starter eslint config", "eslint boilerplate", "frontend tooling setup",
      "dev tools online free", "javascript developer tools"
    ],
  };

export default seo;
