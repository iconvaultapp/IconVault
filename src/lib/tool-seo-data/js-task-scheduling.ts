import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "JS Task Scheduling - Interactive Lab | IconVault",
    metaDescription: "Queue microtasks, setTimeout, rAF, scheduler.postTask and idle callbacks, then watch the real execution order on a timeline.",
    about: [
      "**IconVault**'s **JS Task Scheduling** lab answers the classic interview question by running it. Pick any combination of **queueMicrotask**, **Promise.then**, **setTimeout(0)**, **requestAnimationFrame**, **scheduler.postTask** with different priorities, and **requestIdleCallback**, then watch the real execution order render on a millisecond timeline with color-coded task queues. It is free and runs fully in your browser, with copyable demo code.",
      "The results make the **event loop** concrete: microtasks drain before the next macrotask, rAF waits for the next frame, **postTask priorities** order user-visible work above background work, and idle callbacks run last when the main thread has spare time. Browser support for each API is detected live, so unsupported options are disabled with an explanation instead of failing silently."
    ],
    faqs: [
      { q: "What is the difference between a microtask and a macrotask?", a: "Microtasks (promise callbacks, queueMicrotask, mutation observers) run immediately after the current task and drain completely, including microtasks they queue. Macrotasks (setTimeout, setInterval, I/O) each get their own turn, with rendering and other work happening between them." },
      { q: "Why does Promise.then run before setTimeout(0)?", a: "Promise callbacks are microtasks and setTimeout callbacks are macrotasks. After the current synchronous code finishes, the event loop drains the entire microtask queue before picking up the next macrotask, so even a 0ms timeout waits." },
      { q: "What is scheduler.postTask?", a: "A modern prioritized scheduling API (Chrome 94+) with priorities user-blocking, user-visible and background. Unlike setTimeout, the browser can order, delay or coalesce tasks by priority, and postTask returns a promise plus supports AbortSignal cancellation." },
      { q: "When should I use requestAnimationFrame?", a: "For anything visual: DOM reads and writes that must land before the next paint. rAF callbacks run right before the browser renders, so batching style changes there avoids layout thrash and dropped frames." },
      { q: "What is requestIdleCallback for?", a: "Low-priority work that can wait: analytics, prefetching, non-critical initialization. The browser runs your callback during idle periods with a time budget (deadline.timeRemaining()), and you should yield and reschedule if the budget runs out." },
      { q: "Can microtasks starve the event loop?", a: "Yes. Because the microtask queue drains fully before the next macrotask, a microtask that keeps queueing more microtasks never yields, blocking rendering and timers. Long chains should periodically yield with setTimeout or scheduler.yield()." }
    ],
    tags: [
      "javascript event loop", "microtask vs macrotask", "queuemicrotask vs settimeout",
      "scheduler.posttask", "requestanimationframe vs settimeout", "requestidlecallback",
      "javascript task priority", "event loop phases explained", "promise.then vs settimeout order",
      "javascript scheduling api", "scheduler.yield", "how js executes async code",
      "macrotask queue javascript", "render steps event loop", "javascript concurrency model",
      "js event loop tutorial", "what is a microtask", "what is a macrotask javascript",
      "settimeout 0 vs promise", "javascript task queue", "event loop javascript explained",
      "requestanimationframe tutorial", "when to use requestanimationframe", "scheduler api javascript",
      "posttask priority background", "user-visible vs background task", "javascript idle callback",
      "deadline.timeremaining", "javascript settimeout clamping", "nested timeout 4ms",
      "javascript rendering pipeline", "browser event loop", "js call stack task queue",
      "promise microtask queue", "mutationobserver microtask", "javascript async execution order",
      "interview event loop javascript", "event loop visualization", "javascript starvation microtask",
      "how to yield main thread", "scheduler.yield example", "break up long tasks javascript",
      "is input pending", "javascript performance scheduling", "prioritize tasks javascript",
      "requestidlecallback browser support", "scheduler.posttask browser support", "taskcontroller abort",
      "javascript cooperative scheduling", "main thread scheduling"
    ],
  };

export default seo;
