import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "JS Error Trace - Watch Errors Unwind the Stack | IconVault",
    metaDescription: "Run JavaScript in a sandbox, catch the real error, and watch it propagate through the call stack frame by frame. Free interactive tracer.",
    about: [
      "**IconVault**'s **JS Error Trace** makes exception propagation visible. Write or pick a scenario, run it in a **sandboxed iframe**, and the tool catches the **real error**, parses its **stack trace**, and animates each frame being pushed, the **throw**, and the **unwind** until a catch handles it or it escapes uncaught.",
      "Scenarios cover the classics: **nested throws**, **uncaught errors**, **catch and rethrow**, the **async boundary** where setTimeout loses the stack, and **unhandled promise rejections**. Everything is **free** and runs fully in your browser, with your code isolated from the page.",
    ],
    faqs: [
      {
        q: "How does the error tracer work?",
        a: "Your code runs in a sandboxed iframe with a window error listener. When it throws, the real stack trace is posted back, parsed into frames, and animated: calls push frames on, the throw highlights the origin, then frames pop off until a handler is found.",
      },
      {
        q: "Why does try/catch around setTimeout not catch the error?",
        a: "Because the callback runs later, after the surrounding function has already returned. The try block only guards the synchronous setTimeout call itself. Run the async boundary scenario to watch the original stack vanish.",
      },
      {
        q: "What is the difference between throw and return in unwinding?",
        a: "A throw skips normal returns: every frame on the stack is abandoned without running its remaining code, until a catch is found. finally blocks still run during unwinding, which is why they are the safe place for cleanup.",
      },
      {
        q: "How are promise rejections different from throws?",
        a: "An async function's throw becomes a rejected promise instead of unwinding a live stack. With no .catch or try/catch around the await, the rejection is reported as unhandled rather than thrown to a caller.",
      },
      {
        q: "Is my code safe to run here?",
        a: "Yes. Execution happens in an iframe with sandbox='allow-scripts', isolated from this page, your cookies and storage. Malicious or buggy code cannot touch the tool itself.",
      },
      {
        q: "Is the JS Error Trace tool free?",
        a: "Yes. All scenarios, editing and traces are free in your browser, with 5 free traces per tool before Pro is suggested.",
      },
    ],
    tags: [
      "javascript error", "js error handling", "javascript try catch",
      "javascript throw", "error stack trace", "javascript stack trace",
      "call stack javascript", "how errors propagate javascript",
      "uncaught error javascript", "unhandled rejection", "promise rejection",
      "catch and rethrow", "javascript rethrow error", "error cause javascript",
      "async error handling", "settimeout error", "try catch async",
      "javascript error types", "TypeError", "RangeError", "ReferenceError",
      "learn javascript errors", "javascript debugging", "debug stack trace",
      "read stack trace", "stack trace explained", "error.stack",
      "javascript finally", "throw vs return", "error propagation",
      "exception handling javascript", "javascript error tutorial",
      "js error interview questions", "error handling best practices js",
      "window.onerror", "unhandledrejection event", "global error handler",
      "javascript error sandbox", "run js safely", "js error visualizer",
      "error trace tool", "javascript exception flow", "call stack unwind",
      "nested try catch", "error boundaries javascript", "fail fast javascript",
      "defensive programming js", "javascript error messages",
      "custom error classes", "extends Error javascript", "AggregateError",
      "error cause chain", "javascript error logging", "source maps stack trace",
      "minified stack trace", "async stack traces", "long stack traces",
    ],
  };

export default seo;
