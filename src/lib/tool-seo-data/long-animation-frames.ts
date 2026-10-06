import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "Long Animation Frames - Interactive Lab | IconVault",
    metaDescription: "Capture real long-animation-frame entries with per-script attribution, see what blocks frames, and learn the INP connection.",
    about: [
      "**IconVault**'s **Long Animation Frames** lab puts Chrome's **LoAF API** in your hands. Start observing, trigger a smooth workload, a 220ms blocking task, or a forced **layout thrash**, and watch real **long-animation-frame entries** appear with their duration, render timing, and per-script attribution showing exactly which script blocked the frame and what invoked it. It is free and runs fully in your browser.",
      "Each entry breaks down **renderStart** and **styleAndLayoutStart** so you can tell script work apart from rendering cost, and a running **total blocking time** connects the frames to what users feel. The explainer links LoAF directly to **INP**: fix the attributed script by splitting work with **scheduler.yield()** or moving it off the main thread, and your Interaction to Next Paint drops with it. A copyable detection snippet is included for your own site."
    ],
    faqs: [
      { q: "What is a long animation frame (LoAF)?", a: "A frame that took longer than 50ms from the start of event handling to the end of rendering. The Long Animation Frames API exposes these through PerformanceObserver with details no older API had: render timing phases and per-script attribution." },
      { q: "How is LoAF different from longtask?", a: "longtask reports any task over 50ms but cannot tell you which script inside a busy frame was responsible or how much time went to rendering. LoAF covers the whole frame including style, layout and paint, and attributes blocking time to individual scripts with their invokers." },
      { q: "What is script attribution in LoAF?", a: "Each entry lists the scripts that ran during the frame with their name, source location, duration, and invoker (what caused them to run: a click handler, a timer, a rAF callback). This tells you exactly which code to optimize instead of guessing." },
      { q: "How does LoAF relate to INP?", a: "INP measures the worst interaction latency on a page, and long frames are usually what make interactions feel slow. LoAF entries overlapping an interaction show precisely which scripts delayed the response, making them the best diagnostic tool for INP work." },
      { q: "Which browsers support the LoAF API?", a: "Chrome 123+, Edge 123+ and Opera 109+. Firefox and Safari do not support it yet. The lab detects support and shows an honest message on unsupported browsers while the detection snippet remains usable as a drop-in." },
      { q: "What counts as blocking time in a frame?", a: "Roughly the frame duration minus 50ms, attributed across the scripts that ran. The lab sums this as total blocking time so you can compare workloads and verify that an optimization actually reduced the blockage." }
    ],
    tags: [
      "long animation frames api", "loaf web performance", "inp optimization",
      "interaction to next paint", "script attribution loaf", "performanceobserver longtask",
      "how to reduce inp", "long tasks javascript", "total blocking time",
      "web vitals inp", "chrome devtools performance", "javascript blocking main thread",
      "inp score improve", "long animation frame entries", "loaf api tutorial",
      "performanceobserver long-animation-frame", "web performance api", "core web vitals 2025",
      "how to measure inp", "inp field data", "javascript main thread blocked",
      "optimize interaction latency", "scheduler.yield inp", "break up long tasks",
      "forced synchronous layout", "layout thrash javascript", "style and layout cost",
      "renderstart styleandlayoutstart", "frame budget 50ms", "why is my site janky",
      "diagnose slow interactions", "web vitals javascript api", "measure web vitals in js",
      "longtask vs long animation frame", "chrome 123 loaf", "performance entry scripts",
      "invoker type event listener", "which script blocked frame", "javascript performance profiling",
      "inp poor score fix", "improve inp wordpress", "inp optimization techniques",
      "reduce javascript execution time", "code splitting inp", "defer non critical javascript",
      "web worker heavy computation", "offscreen canvas performance", "virtualize long lists",
      "interaction delay javascript", "event handler slow", "click delay website"
    ],
  };

export default seo;
