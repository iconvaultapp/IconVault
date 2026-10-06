import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "Performance API Lab - Interactive Lab | IconVault",
    metaDescription: "Explore marks, measures, PerformanceObserver, navigation and resource timing in one place. Free, runs fully in your browser.",
    about: [
      "**IconVault**'s **Performance API Lab** puts the whole **Performance API** in one explorer: drop marks around real work, measure the gaps, watch PerformanceObserver entries stream in, read this page's own navigation and resource timing, and benchmark your own code with performance.now(). It is free to use and runs fully in your browser with nothing uploaded.",
      "How to use: add marks, run the built-in 120ms workload, start the observer to catch paint, LCP, layout-shift and longtask entries, then export the timeline as JSON. Perfect for **developers** learning web performance measurement or debugging slow pages.",
    ],
    faqs: [
      { q: "Is Performance API Lab free to use?", a: "Yes. Performance API Lab is free to use with a generous free trial, no account needed. Pro unlocks unlimited use." },
      { q: "What is the difference between a mark and a measure?", a: "A mark is a timestamp with a name; a measure is the duration between two marks (or a mark and now). Measures are what you read when profiling." },
      { q: "Why use performance.now() instead of Date.now()?", a: "performance.now() is high-resolution and monotonic, so it is not affected by system clock changes and is far more precise for benchmarking." },
      { q: "What does the observer catch?", a: "Paint entries, navigation timing, largest-contentful-paint, layout-shift and longtask entries, all buffered so past events appear too." },
      { q: "Is my benchmark code safe to run?", a: "It runs only in your browser tab, in a plain function scope. Keep it to pure computation and avoid infinite loops." },
      { q: "Can I export the timeline?", a: "Yes. Copy the timeline as JSON or download it, then share or analyze it elsewhere." },
    ],
    tags: [ "performance api", "performance.now example", "javascript performance mark", "performance.measure example", "performanceobserver tutorial", "web performance api", "navigation timing api", "resource timing api", "performance entry types", "user timing api", "performance.mark explained", "measure javascript execution time", "performance observer paint", "largest contentful paint api", "layout shift api", "longtask api", "performance timeline", "web vitals javascript", "frontend performance measurement", "js benchmark tool", "javascript timing functions", "performance.timeorigin", "high resolution time", "monotonic clock javascript", "performance.getentriesbytype", "clearmarks clearmeasures", "custom performance metrics", "real user monitoring basics", "performanceobserver buffered", "paint timing api", "first paint javascript", "domcontentloaded timing", "page load timing api", "resource load times", "performance api browser support", "learn performance api", "web performance lab", "javascript profiler browser", "measure function runtime js", "performance.now accuracy", "performance api examples", "performanceobserver entry list", "navigation timing explained", "transfer size performance api", "performance resource timing", "server timing api", "performance api mdn", "core web vitals code", "measure api response time js", "frontend perf tools", "performance lab online" ],
  };

export default seo;
