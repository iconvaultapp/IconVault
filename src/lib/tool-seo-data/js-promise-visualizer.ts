import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "Promise Visualizer - Free Online JavaScript Promise Tool | IconVault",
    metaDescription: "Watch Promise.all, race, any and allSettled settle in real time on animated lanes. Set delays and outcomes. Free, runs in your browser.",
    about: [
      "**IconVault**'s **Promise Visualizer** shows promise combinators in action: pick **Promise.all**, **Promise.race**, **Promise.any**, or **Promise.allSettled**, configure each promise's **delay** and **outcome** (resolve or reject), then watch them **settle in real time** on animated lanes. A timeline shows exactly which promise decided the result and when.",
      "It is the fastest way to internalize the difference between **all, race, any, and allSettled**, including **what happens when one promise rejects**. Built for students and interview prep. Free and runs fully in your browser.",
    ],
    faqs: [
      { q: "Is the promise visualizer free?", a: "Yes. Run unlimited promise experiments with no account." },
      { q: "What is the difference between Promise.all, race, any, and allSettled?", a: "Promise.all waits for every promise and rejects on the first rejection. Promise.race settles with the first promise to settle, win or lose. Promise.any resolves with the first success and only rejects if all reject. Promise.allSettled waits for all and reports each outcome." },
      { q: "What happens when a promise rejects in Promise.all?", a: "Promise.all rejects immediately with that error, even if other promises are still pending. allSettled is the combinator to use when you need every result regardless of failures." },
      { q: "Does it run real promises?", a: "The lanes simulate timed promises so you can control delays and outcomes precisely. The settlement rules shown match the real language semantics exactly." },
      { q: "Can I see the settlement order?", a: "Yes. The animated timeline marks each promise as pending, fulfilled, or rejected in real time, with the winning or losing promise highlighted." },
      { q: "Does my input leave my browser?", a: "No. Everything is configured and simulated locally." },
    ],
    tags: ["promise visualizer", "javascript promise visualizer", "promise.all visualizer", "promise.race explained", "promise.any vs allsettled", "javascript promises tutorial", "promise combinators", "promise.all vs promise.race", "promise.allsettled explained", "promise.any explained", "learn javascript promises", "promises for beginners", "promise chaining", "promise states pending fulfilled rejected", "async promise javascript", "promise.then catch finally", "promise executor", "resolve reject promise", "promise tutorial step by step", "javascript promise example", "promise.all parallel", "promise race timeout", "promise.any fallback", "allsettled vs all", "promise visualization", "promise lanes", "promise timeline", "promise execution order", "promise interview questions", "promise quiz", "promise vs callback", "callback hell vs promises", "promise error handling", "unhandled promise rejection", "promise.finally", "promise.resolve", "promise.reject", "new promise javascript", "promise visualizer online", "free promise tool", "promises animated", "promise diagram", "es6 promises", "promise.all map pattern", "concurrent promises javascript", "throttle promises", "promise pool", "promise combinator cheat sheet", "promise.all error handling", "when to use promise.any"],
  };

export default seo;
