import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "Event Loop Visualizer - Free Online JavaScript Tool | IconVault",
    metaDescription: "Watch the JavaScript event loop animate: call stack, Web APIs, microtask and macrotask queues. Play, step, reset. Free in your browser.",
    about: [
      "**IconVault**'s **Event Loop Visualizer** makes JavaScript's concurrency model click: paste code and watch it execute across the **call stack**, **Web APIs**, **timers**, the **microtask queue** (promises), and the **macrotask queue**. Animated dots carry each task through the loop while the console shows the real output order.",
      "Use the **play, step, and reset** controls to slow everything down and answer the **classic interview question**: why does this log before that? Built for students and interview prep. Free and runs fully in your browser.",
    ],
    faqs: [
      { q: "Is the event loop visualizer free?", a: "Yes. Run unlimited visualizations with no account." },
      { q: "What is the JavaScript event loop?", a: "It is the mechanism that lets single-threaded JavaScript handle async work: the call stack runs one thing at a time, while Web APIs, the microtask queue, and the macrotask queue feed it new work to process." },
      { q: "What is the difference between microtasks and macrotasks?", a: "Microtasks (promise callbacks, queueMicrotask) run before the next render and drain completely between macrotasks. Macrotasks (setTimeout, setInterval, I/O) run one per loop iteration. That is why promise.then always beats setTimeout(fn, 0)." },
      { q: "Does it run my real code?", a: "It runs a simplified model of the runtime that faithfully reproduces scheduling order for the supported syntax, which is what makes it useful for learning." },
      { q: "Why is setTimeout(fn, 0) not instant?", a: "Because the callback goes to the macrotask queue and must wait for the current call stack and all pending microtasks to finish first." },
      { q: "Does my code leave my browser?", a: "No. Everything is parsed and simulated locally." },
    ],
    tags: ["event loop visualizer", "javascript event loop", "js event loop explained", "event loop javascript tutorial", "call stack visualizer", "javascript call stack", "microtask vs macrotask", "microtask queue", "macrotask queue", "task queue javascript", "web apis javascript", "settimeout event loop", "promise event loop", "javascript runtime", "how event loop works", "event loop step by step", "javascript concurrency", "single threaded javascript", "async javascript explained", "event loop animation", "event loop simulator", "javascript event loop demo", "event loop playground", "settimeout 0 explained", "promise.then order", "console log order javascript", "async order of execution", "event loop interview questions", "javascript event loop quiz", "libuv event loop", "node.js event loop", "browser event loop", "event loop phases", "timer queue javascript", "rendering and event loop", "requestanimationframe event loop", "queueMicrotask", "mutationobserver microtask", "event loop mdn", "javascript visualizer", "loupe alternative", "free event loop tool", "learn event loop", "event loop diagram", "event loop for beginners", "javascript execution model", "stack heap queue", "run to completion javascript", "event loop visualizer online", "javascript async queue", "event loop tick", "nexttick vs setimmediate"],
  };

export default seo;
