import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "JS Memory Leaks - Interactive Lab | IconVault",
    metaDescription: "Create real closure, detached DOM and timer leaks, watch the live heap graph climb, then fix them. Free, in-browser.",
    about: [
      "**IconVault**'s **JS Memory Leaks** lab lets you cause real memory leaks on purpose and watch what happens. Create leaking **closures** that retain megabytes through forgotten event handlers, **detach DOM nodes** that stay alive in a JS array after leaving the page, or start a **runaway timer** that grows its closure forever. A live **heap graph** sampled from **performance.memory** shows the line climbing as you leak and settling as you fix each one. It is free and runs fully in your browser.",
      "Each leak ships with its real-world code pattern and the matching fix, all copyable. **WeakRef** and **FinalizationRegistry** tracking shows objects actually being reclaimed by the garbage collector after you release them, which makes the abstract idea of **GC reachability** concrete. Use it to build intuition before you open Chrome DevTools on your own app's growing heap."
    ],
    faqs: [
      { q: "What is a JavaScript closure memory leak?", a: "When a function closes over data and that function is kept alive (by an event listener, timer, or array you never clear), everything it captured stays in memory too. Removing the listener or dropping the reference lets the garbage collector reclaim the whole closure." },
      { q: "What are detached DOM nodes?", a: "Elements you removed from the document (or never inserted) but still reference from JavaScript. The browser cannot free their memory, including their subtrees and listeners. Chrome DevTools lists them under Detached Elements in a heap snapshot." },
      { q: "Why do timers cause memory leaks?", a: "setInterval and setTimeout keep their callback alive until they fire or are cleared. If the callback closes over large data structures and appends to them, memory grows without bound. Always clearInterval and null the handle when the work is done." },
      { q: "How does JavaScript garbage collection work?", a: "Engines use mark-and-sweep: starting from roots like global variables and the current call stack, the collector marks every reachable object and frees the rest. An object is only collected when nothing reachable references it anymore." },
      { q: "What are WeakRef and FinalizationRegistry for?", a: "WeakRef holds an object without keeping it alive, so you can check later whether it was collected. FinalizationRegistry runs a callback after an object is garbage collected, which is useful for diagnostics like the collection counter in this lab. Neither should drive application logic." },
      { q: "Why does the heap graph need Chrome?", a: "The live graph reads performance.memory.usedJSHeapSize, which Chromium exposes but Firefox and Safari do not. The leak and fix demos themselves run in every browser; only the live sampling line needs Chrome or Edge." }
    ],
    tags: [
      "javascript memory leak", "js memory leak detection", "how to find memory leaks javascript",
      "detached dom nodes", "javascript closure memory leak", "event listener memory leak",
      "setinterval memory leak", "chrome devtools memory leak", "javascript heap snapshot",
      "performance.memory javascript", "weakref javascript", "finalizationregistry example",
      "javascript garbage collection explained", "how js garbage collector works", "mark and sweep javascript",
      "memory leak browser javascript", "remove event listener memory", "javascript retained size",
      "detached dom tree memory leak", "timer leak javascript", "closure retains memory javascript",
      "how to fix memory leaks js", "chrome memory tab tutorial", "javascript memory profiling",
      "heap allocation timeline chrome", "global variables memory leak javascript", "console.log memory leak",
      "forgotten timers javascript", "cache memory leak javascript", "spa memory leak fix",
      "javascript memory leak examples", "find detached dom elements", "js heap keeps growing",
      "javascript memory usage increasing", "garbage collector javascript tutorial", "what is reachability js",
      "javascript memory management", "weakmap vs map memory", "event listener not removed leak",
      "javascript closure retains dom", "how to take heap snapshot chrome", "analyze heap snapshot javascript",
      "javascript memory leak interview", "frontend memory leak", "single page app memory leak",
      "javascript free memory", "does javascript have garbage collection", "memory leak settimeout",
      "javascript object retained in memory", "chrome devtools detached elements", "js performance memory api",
      "javascript memory leak tools", "prevent memory leaks javascript"
    ],
  };

export default seo;
