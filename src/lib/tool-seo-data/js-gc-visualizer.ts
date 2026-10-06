import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "GC Visualizer - Free Online JavaScript Memory Tool | IconVault",
    metaDescription: "Watch garbage collection animate: young-generation scavenge, old-generation mark-sweep, plus common leak patterns. Free in your browser.",
    about: [
      "**IconVault**'s **GC Visualizer** animates how a **generational garbage collector** works: watch the **young generation** get cleaned by **scavenge** passes, survivors get promoted to the **old generation**, and long-lived objects get swept by **mark-sweep**. Roots stay pinned while unreachable objects fade away.",
      "It also demonstrates classic **memory leak patterns** (detached listeners, growing caches, accidental globals) with tips for fixing each. Built for students and developers who want to understand V8's memory model. Free and runs fully in your browser.",
    ],
    faqs: [
      { q: "Is the GC visualizer free?", a: "Yes. Explore collections and leak patterns with no account." },
      { q: "What is garbage collection?", a: "Automatic memory management: the runtime finds objects your program can no longer reach and reclaims their memory, so you do not have to free it manually." },
      { q: "What is a generational garbage collector?", a: "It splits the heap into a young generation (short-lived objects, collected often and cheaply with scavenge) and an old generation (long-lived survivors, collected rarely with mark-sweep). Most objects die young, so this design is fast." },
      { q: "What is mark and sweep?", a: "A two-phase algorithm: mark walks from the roots and marks every reachable object, then sweep reclaims everything unmarked. It handles object graphs with cycles, which simple reference counting cannot." },
      { q: "What causes memory leaks in JavaScript?", a: "Common culprits: forgotten event listeners, timers that never get cleared, caches that grow forever, detached DOM nodes held by closures, and accidental globals. The tool demonstrates each pattern." },
      { q: "Is this the real V8 garbage collector?", a: "No. It is a simplified educational model of V8's generational design, so the concepts are accurate but the internals are illustrative." },
    ],
    tags: ["gc visualizer", "garbage collection visualizer", "javascript garbage collection", "js memory visualizer", "generational garbage collector", "mark and sweep", "scavenge gc", "young generation old generation", "v8 garbage collector", "memory leak javascript", "javascript memory leaks", "find memory leaks js", "gc explained", "garbage collection tutorial", "mark sweep algorithm", "copying collector", "tri-color marking", "gc roots", "weakmap vs map memory", "event listener memory leak", "detached dom memory leak", "closure memory leak", "setinterval memory leak", "global variable leak", "chrome memory profiler", "heap snapshot", "javascript memory management", "learn garbage collection", "gc visualizer online", "free gc tool", "memory management visualizer", "v8 heap", "new space old space", "minor gc vs major gc", "stop the world gc", "incremental marking", "concurrent marking", "write barriers gc", "orinoco v8", "memory leak patterns", "prevent memory leaks js", "weakref finalizationregistry", "javascript memory model", "gc pressure", "allocation timeline", "garbage collector phases", "gc visualizer free online", "javascript gc interview questions", "eden space survivor space", "gc pause time"],
  };

export default seo;
