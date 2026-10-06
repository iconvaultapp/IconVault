import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "SharedArrayBuffer & Atomics - Interactive Lab | IconVault",
    metaDescription: "Watch race conditions lose increments live, fix them with Atomics.add, and learn wait/notify spinlocks. Free, in-browser.",
    about: [
      "**IconVault**'s **SharedArrayBuffer & Atomics** lab shows why **counter++ is not atomic**. Two tasks increment one shared counter two thousand times each: the racy version interleaves its read-add-write steps and loses increments, while the **Atomics.add** version lands on exactly 4000 every single run. Animated progress bars and lost-update counts make the data race concrete instead of theoretical. It is free and runs fully in your browser.",
      "Beyond the demo, the lab teaches the coordination primitives real multithreaded JavaScript uses: **Atomics.wait** and **Atomics.notify** for parking workers instead of burning CPU, and a complete **spinlock** built on **compareExchange**, all as copyable production-ready code. An honest status panel explains the **COOP/COEP** headers real SharedArrayBuffer needs and why **Atomics.wait** is worker-only."
    ],
    faqs: [
      { q: "What is a race condition in JavaScript?", a: "When two threads (usually Web Workers) read-modify-write the same shared memory location and their steps interleave, updates get lost. counter++ compiles to read, add, write as separate steps, so two workers can read the same value and both write back value+1, losing one increment." },
      { q: "What does Atomics.add do?", a: "It performs read-add-write as one indivisible hardware operation, so no other thread can slip in between. Atomics also provides load, store, exchange, compareExchange, and bitwise operations, all guaranteed atomic on shared typed arrays." },
      { q: "Why does SharedArrayBuffer need COOP and COEP headers?", a: "Shared memory enables high-resolution timers usable in Spectre-style attacks, so browsers gate SharedArrayBuffer behind cross-origin isolation: the page must send Cross-Origin-Opener-Policy: same-origin and Cross-Origin-Embedder-Policy: require-corp. Without them, new SharedArrayBuffer() throws." },
      { q: "What are Atomics.wait and Atomics.notify?", a: "wait parks a worker thread until notify wakes it, optionally with a timeout. This lets workers sleep while waiting for work instead of spin-looping and burning CPU. wait is intentionally forbidden on the main thread, where blocking would freeze the page." },
      { q: "What is a spinlock?", a: "A lock where the waiter loops on Atomics.compareExchange until it flips the lock from unlocked to locked. Combined with Atomics.wait, the loop sleeps instead of spinning: try the exchange, and if it fails, wait to be notified when the holder releases." },
      { q: "Can the main thread share memory with workers?", a: "Yes. Create a SharedArrayBuffer on the main thread, post it to workers, and all sides read and write the same bytes through typed array views. Coordinate with Atomics so nobody reads a half-written value." }
    ],
    tags: [
      "sharedarraybuffer javascript", "atomics javascript", "javascript race condition",
      "atomics.add example", "atomics.wait notify", "javascript spinlock",
      "cross origin isolation", "coop coep headers", "shared memory web workers",
      "javascript multithreading", "atomics.compareexchange", "javascript threads shared memory",
      "wasm threads sharedarraybuffer", "javascript concurrency explained", "data race javascript",
      "atomics.store load", "web workers shared memory", "javascript parallel programming",
      "atomics.exchange example", "sharedarraybuffer not defined", "crossoriginisolated",
      "cross-origin-opener-policy", "cross-origin-embedder-policy require-corp",
      "javascript worker threads", "atomics.notify example", "atomics.wait main thread error",
      "javascript memory model", "sequential consistency javascript", "counter++ not atomic",
      "lost updates concurrency", "javascript critical section", "mutex javascript workers",
      "lock free programming js", "atomics.or and xor", "shared typed array",
      "transfer sharedarraybuffer worker", "postmessage sharedarraybuffer", "javascript threading tutorial",
      "web worker communication", "atomics wait timeout", "wake worker atomics",
      "javascript race condition example", "how to avoid race conditions js", "atomic operations javascript",
      "shared memory browser", "spectre sharedarraybuffer", "site isolation sharedarraybuffer",
      "javascript worker pool", "parallel js computation", "atomics tutorial"
    ],
  };

export default seo;
