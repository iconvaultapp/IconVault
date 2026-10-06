import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "Sanitizer API Playground - Interactive Lab | IconVault",
    metaDescription: "Sanitize HTML with the browser Sanitizer API and test real XSS payloads safely. Free, runs fully in your browser.",
    about: [
      "**IconVault**'s **Sanitizer API Playground** lets you **sanitize untrusted HTML safely**: paste markup or fire labeled XSS attack payloads, clean them with the browser's built-in Sanitizer API (setHTML) or a strict built-in allowlist fallback, and view the result in a sandboxed iframe with removal stats. It is free to use and runs fully in your browser with nothing uploaded.",
      "How to use: pick an attack payload like img onerror or javascript: links, press Sanitize, and compare the escaped input with the cleaned output. Perfect for **developers** learning XSS prevention, secure DOM insertion and content-security practices.",
    ],
    faqs: [
      { q: "Is Sanitizer API Playground free to use?", a: "Yes. Sanitizer API Playground is free to use with a generous free trial, no account needed. Pro unlocks unlimited use." },
      { q: "Are the XSS payloads dangerous?", a: "No. They are never executed: the input preview is escaped text, and the cleaned result renders inside a sandboxed iframe." },
      { q: "What does setHTML do?", a: "It is the browser's built-in Sanitizer API method that parses HTML and strips scripts, event handlers and dangerous URLs before inserting it." },
      { q: "What if my browser has no Sanitizer API?", a: "The tool detects this and runs a strict built-in allowlist sanitizer instead, with the same rules and no external dependency." },
      { q: "What gets removed?", a: "Script, iframe, form and similar elements, all on* event handlers, style attributes, and javascript: or other unsafe URLs." },
      { q: "Can I copy the clean HTML?", a: "Yes. The sanitized output is copyable, plus a pattern snippet showing the setHTML-with-fallback approach." },
    ],
    tags: [ "sanitizer api", "sethtml example", "javascript sanitize html", "xss prevention javascript", "sanitize user input js", "html sanitizer online", "test xss payload", "xss attack examples", "sanitizer api browser support", "element.sethtml", "sanitizer api sanitize", "dompurify vs sanitizer api", "sanitize innerhtml", "safe innerhtml javascript", "xss cheat sheet", "img onerror xss", "svg onload xss", "javascript url xss", "script tag xss", "xss payload list", "learn xss prevention", "web security xss", "sanitize html javascript", "allowlist html sanitizer", "strip script tags js", "remove event handlers html", "trusted types vs sanitizer", "content security policy xss", "xss tester online", "html injection test", "sanitizer api mdn", "sanitizer api tutorial", "xss prevention cheat sheet", "owasp xss prevention", "escape html javascript", "encode html entities js", "safe dom insertion", "textcontent vs innerhtml", "xss in javascript", "stored xss example", "reflected xss example", "dom based xss", "sanitize markdown html", "xss filter bypass", "html sanitizer library", "sanitize svg", "xss playground", "web security lab", "frontend security tools", "xss demo safe", "sanitizer api playground" ],
  };

export default seo;
