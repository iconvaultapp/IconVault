import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "OffscreenCanvas Playground - Interactive Lab | IconVault",
    metaDescription: "Race OffscreenCanvas in a real Web Worker against main-thread rendering with live FPS. Free, runs fully in your browser.",
    about: [
      "**IconVault**'s **OffscreenCanvas Playground** races an **OffscreenCanvas rendered in a real Web Worker** against identical main-thread canvas rendering, with live FPS meters for both. Drag the particle count up and watch where each renderer starts to drop frames. It is free to use and runs fully in your browser with nothing uploaded.",
      "How to use: press Start race, then raise the particle slider to stress both renderers. Perfect for **developers** building games, data visualizations and creative tools who want to see exactly when moving paint work off the main thread pays off.",
    ],
    faqs: [
      { q: "Is OffscreenCanvas Playground free to use?", a: "Yes. OffscreenCanvas Playground is free to use with a generous free trial, no account needed. Pro unlocks unlimited use." },
      { q: "What is OffscreenCanvas?", a: "It is a canvas that can be rendered off the main thread, typically inside a Web Worker, so heavy painting no longer blocks user interaction." },
      { q: "Is the comparison fair?", a: "Yes. Both sides run the exact same particle simulation and draw calls; the only difference is the thread doing the work." },
      { q: "Why is the worker sometimes slower at low counts?", a: "Thread and message overhead dominates tiny workloads. The win appears under load, which is why the particle slider goes up to 20,000." },
      { q: "Which browsers support OffscreenCanvas?", a: "Chrome, Edge and Firefox support it well; Safari added support more recently. The page shows a support badge for your browser." },
      { q: "Can I copy the worker code?", a: "Yes. The exact worker source used in the race is shown and copyable for your own projects." },
    ],
    tags: [ "offscreen canvas", "offscreencanvas example", "canvas web worker", "offscreen canvas worker example", "canvas fps test", "web worker canvas rendering", "offscreencanvas tutorial", "main thread vs worker canvas", "canvas performance test", "offscreencanvas browser support", "transfercontroltooffscreen example", "canvas render performance", "offscreencanvas react", "web worker rendering", "canvas fps counter", "offscreencanvas particles", "canvas animation worker", "offscreen canvas mdn", "learn offscreencanvas", "canvas jank fix", "move canvas to worker", "offscreencanvas typescript", "webgl offscreen canvas", "canvas 2d worker", "offscreencanvas commit", "requestanimationframe worker", "canvas performance benchmark", "javascript canvas fps", "worker canvas demo", "offscreencanvas safari", "offscreencanvas firefox", "canvas off main thread", "frontend performance canvas", "game loop web worker", "particle system canvas", "canvas rendering optimization", "offscreencanvas vs canvas", "web worker graphics", "canvas thread blocking", "smooth canvas animation", "high performance canvas", "canvas benchmark tool", "offscreencanvas example code", "learn web workers", "canvas worker tutorial", "offscreen rendering web", "60fps canvas tips", "canvas fps drop fix", "web worker canvas transfer", "offscreencanvas playground", "canvas performance lab" ],
  };

export default seo;
