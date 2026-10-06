import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "NPM Dep Graph - Free Online Developer Tool | IconVault",
    metaDescription: "Visualize npm dependency trees as force-directed graphs. Crawl depth control, hover versions, SVG export. Free.",
    about: [
      "**IconVault**'s **NPM Dep Graph** turns any package into a visual **dependency tree**: it crawls **registry.npmjs.org** live, then lays the packages out as a **force-directed graph** with color-coded **depth levels**. Hover any node to see its exact installed version.",
      "Control the **crawl depth** (1 to 3 levels), capped at 160 packages so even big trees stay fast, then **export the graph as SVG** for docs or slides. Free and runs fully in your browser.",
    ],
    faqs: [
      { q: "Is the dep graph free?", a: "Yes. Guests get free graphs per day, Pro users get unlimited. Data comes live from the npm registry." },
      { q: "What does the crawl depth mean?", a: "Depth 1 shows direct dependencies, depth 2 adds their dependencies, depth 3 goes one level deeper. Higher depth means more nodes and slower loads." },
      { q: "How do I see a package version?", a: "Hover any node in the graph to see its name and exact resolved version." },
      { q: "Why is the graph capped at 160 packages?", a: "Force-directed layout is O(n^2). The cap keeps the graph fast and readable; huge trees become hairballs anyway." },
      { q: "Are dev or peer dependencies included?", a: "No, only runtime dependencies are crawled, which is what ships to production." },
      { q: "Can I export the graph?", a: "Yes, as a standalone SVG file with a white background, ready for documentation." },
    ],
    tags: ["npm dep graph", "npm dependency graph", "dependency tree visualizer", "npm dependency tree", "visualize npm dependencies", "package dependency graph", "npm deps graph", "dependency graph generator", "npm tree visualizer", "node dependency visualizer", "npm dependency map", "package tree online", "npm graph", "dependency visualizer", "javascript dependency graph", "node modules visualizer", "understand npm dependencies", "npm dependency explorer", "package dependency explorer", "npm dep tree online", "view npm dependencies", "npm package dependencies", "what does this package depend on", "npm transitive dependencies", "transitive deps visualizer", "dependency hell visualizer", "npm bloat checker", "why is node_modules huge", "package size tree", "npm install size", "force directed graph", "svg dependency graph", "export dependency graph", "dependency graph svg", "npm docs diagram", "architecture diagram npm", "npm dependency chart", "dependency chart generator", "module dependency graph", "js dependency map", "npm audit visual", "dependency risk visualizer", "supply chain visualizer", "npm supply chain", "package graph online", "free dependency visualizer", "npm tools online", "developer dependency tool", "npm dep graph free", "online npm graph"],
  };

export default seo;
