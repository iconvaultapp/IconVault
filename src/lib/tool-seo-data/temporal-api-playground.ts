import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "Temporal API - Interactive Lab | IconVault",
    metaDescription: "Explore Temporal PlainDate, PlainTime, ZonedDateTime and Duration with live demos and Date fallbacks. Free, in-browser.",
    about: [ "**IconVault**'s **Temporal API** playground finally makes dates sane. Run live demos of **PlainDate** (calendar math without timezones), **PlainTime** (wall-clock times without dates), **ZonedDateTime** (DST-safe timezone arithmetic), and **Duration** (human time spans like `P45D` instead of magic millisecond numbers). Every demo shows the exact code next to its output.", "If your browser does not support Temporal yet, the lab is honest about it and runs each demo on a classic **Date fallback** so you can compare the old pain with the new API. **Free**, runs **fully in your browser**, no signup, no network." ],
    faqs: [
      { q: "What is the Temporal API?", a: "Temporal is the modern JavaScript date and time API, designed to replace the error-prone Date object. It separates concepts Date muddles together: plain dates, plain times, zoned date-times, instants and durations." },
      { q: "Which browsers support Temporal?", a: "Chrome 129+, Edge 129+ and Safari 18.4+ ship it. Firefox is still working on it. This playground detects support and falls back to Date-based demos where it is missing." },
      { q: "What is the difference between PlainDate and Date?", a: "Date always carries a time and a timezone, which causes off-by-one bugs. PlainDate is just a calendar date like 2026-09-29, with no time and no timezone to get wrong." },
      { q: "How does Temporal handle daylight saving time?", a: "ZonedDateTime arithmetic respects DST transitions automatically. Adding one day across a spring-forward keeps the same wall-clock time, which manual millisecond math gets wrong." },
      { q: "Should I replace Date with Temporal today?", a: "For new code in supported browsers, yes. For broad compatibility, use a polyfill or keep Date behind a helper. Libraries like date-fns remain fine for formatting." },
      { q: "Is this playground free?", a: "Yes, completely free, running entirely in your browser." },
    ],
    tags: ["temporal api", "temporal api tutorial", "temporal javascript", "what is temporal api", "temporal plaindate", "temporal plaintime", "temporal zoneddatetime", "temporal duration", "temporal instant", "temporal now", "plaindate example", "plaintime example", "zoneddatetime example", "temporal duration example", "temporal vs date", "replace javascript date", "javascript date problems", "date timezone bugs", "dst safe date math", "daylight saving time javascript", "add days javascript", "date arithmetic javascript", "temporal add days", "temporal until", "temporal since", "temporal browser support", "temporal chrome", "temporal safari", "temporal firefox", "temporal polyfill", "learn temporal api", "temporal api playground", "temporal api demo", "temporal cookbook", "p45d duration", "iso 8601 duration", "duration to milliseconds", "epoch milliseconds temporal", "temporal epochmilliseconds", "wall clock time javascript", "timezone conversion javascript", "intl datetimeformat vs temporal", "date fns vs temporal", "moment vs temporal", "temporal plainmonthday", "temporal plainyearmonth", "javascript date done right", "modern javascript dates", "free temporal tutorial", "temporal api mdn", "temporal now instant", "temporal plaindate plaintime"],
  };

export default seo;
