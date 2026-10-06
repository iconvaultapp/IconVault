import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "Async Visualizer - Free Online JavaScript Async Tool | IconVault",
    metaDescription: "Watch async/await functions suspend and resume on animated lanes. Paste JavaScript and step through it. Free, runs in your browser.",
    about: [
      "**IconVault**'s **Async Visualizer** shows you how **async/await** really works: paste JavaScript, then watch each function **suspend** at an await and **resume** later on animated execution lanes. A tiny real interpreter runs your code step by step, so you see the exact order everything happens in.",
      "It supports async functions, **console.log**, **await sleep(ms)** timers, function calls, and top-level calls, with play, pause, step forward, and step back controls. Built for students and interview prep. Free and runs fully in your browser.",
    ],
    faqs: [
      { q: "Is the async visualizer free?", a: "Yes. Run as many async programs as you like with no account." },
      { q: "What JavaScript syntax does it support?", a: "Function declarations (async or sync), console.log, await sleep(ms), await on functions and variables, return statements, and top-level calls like main(). Anything else gets a friendly line-by-line error." },
      { q: "Does it run my real JavaScript?", a: "It runs a simplified but real interpreter over the supported syntax, so the suspend and resume order you see matches how the language actually behaves." },
      { q: "What does await sleep() do?", a: "It simulates a timer, like setTimeout, so you can watch a function pause while other code keeps running and then resume when the timer fires." },
      { q: "Does my code leave my browser?", a: "No. Parsing and execution happen locally, so your code stays private." },
      { q: "Who is this tool for?", a: "Anyone learning async JavaScript: beginners meeting await for the first time, developers preparing for interviews, and teachers demonstrating concurrency." },
    ],
    tags: ["async visualizer", "javascript async visualizer", "async await visualizer", "javascript async await explained", "async function visualizer", "await visualizer", "async await javascript tutorial", "how async await works", "javascript concurrency visualizer", "async execution visualizer", "javascript async lanes", "visualize async javascript", "async await step by step", "javascript async debugger", "async await playground", "javascript async example", "async function javascript", "await keyword javascript", "async await vs promises", "javascript event loop async await", "microtask visualizer", "promise vs async await", "async await tutorial", "learn async await", "async javascript for beginners", "async await explained simply", "javascript async patterns", "async iife", "await sleep javascript", "settimeout vs await", "javascript concurrency model", "single threaded async", "async await interview questions", "async await best practices", "async function returns promise", "await in loop javascript", "top level await", "async await error handling", "try catch async await", "javascript async visualizer online", "free async visualizer", "async code animator", "watch async await run", "async call stack", "javascript runtime visualizer", "async await diagram", "async await flowchart", "promise chaining vs async", "async await es2017", "sequential vs parallel async", "promise.all with async await", "async generator", "async await cheat sheet"],
  };

export default seo;
