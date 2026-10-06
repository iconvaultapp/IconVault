import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "Web Vitals Budget - Free Online Tool | IconVault",
    metaDescription: "Plan your LCP, INP and CLS budgets: allocate page weight, pick a connection speed and get instant estimates. Free.",
    about: [
      "**IconVault**'s **Web Vitals Budget** helps you plan page performance before you ship. Set your **total page weight**, pick a **connection speed** from Slow 4G to fiber, then split the bytes across **JavaScript, images, CSS, fonts, HTML and other** with allocation sliders. The tool is completely **free** and runs fully in your browser.",
      "You get instant **LCP, INP and CLS estimates** with Google's Good / Needs improvement / Poor verdicts, a visual **budget breakdown**, and a one-click **report** you can paste into a PR or performance doc. Use it to decide how much JavaScript you can afford or whether that hero image fits the budget.",
    ],
    faqs: [
      { q: "Is the Web Vitals Budget tool free?", a: "Yes. It is free to use in your browser with a daily quota for guests and unlimited use for Pro users." },
      { q: "What are good Core Web Vitals scores?", a: "Google's targets are LCP under 2.5 seconds, INP under 200 milliseconds and CLS under 0.1. The tool badges each estimate against these thresholds." },
      { q: "Are these estimates the same as PageSpeed Insights?", a: "No. These are planning estimates from your weight budget and connection speed, useful before a page exists. Always confirm with real lab or field data from PageSpeed Insights." },
      { q: "How is LCP estimated?", a: "The tool estimates the transfer time of the critical path (HTML, CSS, fonts, part of the JS and the hero image share) on your chosen connection, plus a base render cost." },
      { q: "What hurts INP the most?", a: "JavaScript. More JS means more parse, compile and execution time on the main thread, which delays how fast the page responds to input." },
      { q: "How do I lower my CLS estimate?", a: "Give every image explicit width and height, reserve space for ads and embeds, and avoid layout-shifting font swaps. The tool lets you toggle these risks." },
    ],
    tags: ["web vitals budget", "core web vitals calculator", "lcp budget calculator", "inp budget", "cls calculator", "page weight budget", "performance budget tool", "web performance budget calculator", "lcp inp cls explained", "how to budget web vitals", "largest contentful paint budget", "interaction to next paint budget", "cumulative layout shift calculator", "website speed budget planner", "page speed budget tool", "core web vitals thresholds", "what is a good lcp score", "how to improve inp score", "reduce cls score", "web vitals checker", "performance budget example", "page weight vs speed", "how many kb should a webpage be", "javascript budget performance", "image weight budget web", "slow 4g page load time calculator", "lcp estimate calculator", "inp estimate", "cls score calculator", "web vitals report generator", "frontend performance planning", "site speed optimization tool", "google page experience metrics", "pagespeed budget", "web vitals for developers", "performance budget template", "lcp under 2.5 seconds how", "inp under 200ms", "cls under 0.1", "core web vitals 2026", "website performance metrics tool", "page load time estimator", "bandwidth page weight calculator", "4g page load calculator", "web performance audit tool", "frontend speed budget", "optimize lcp inp cls", "web vitals dashboard", "site performance planner free", "page experience signals"],
  };

export default seo;
