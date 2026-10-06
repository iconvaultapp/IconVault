import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "CSP Evaluator - Free Online CSP Security Checker | IconVault",
    metaDescription: "Paste a Content-Security-Policy header and get a 0-100 security score with per-check pass, warn and fail explanations. Free, runs in your browser.",
    about: [
      "**IconVault**'s **CSP Evaluator** grades any **Content-Security-Policy** header you paste in. It parses every **directive** and runs a battery of **security checks**, scoring the policy from **0 to 100**. Each check shows a **pass, warn or fail** verdict with a plain-English **explanation** and how many points it costs, so you know exactly what to fix.",
      "It flags the usual weaknesses: **unsafe-inline** and **unsafe-eval**, **wildcard** sources, missing **object-src**, absent **base-uri** and **form-action** protection, and more. The honest caveat: this is **static analysis**, not a live browser test, so it grades the policy text rather than how your site behaves. **Free** and runs **fully in your browser**; your policy never leaves the page.",
    ],
    faqs: [
      { q: "Is the CSP evaluator free?", a: "Yes. Evaluating policies and reading every check explanation is free, and the analysis happens entirely in your browser." },
      { q: "How is the 0-100 score calculated?", a: "The policy starts at 100 and each failed or risky check subtracts points based on severity. Every deduction is listed with its reason, so the score is fully explainable." },
      { q: "What lowers my score the most?", a: "Typically unsafe-inline in script-src, wildcards in script or style sources, a missing object-src 'none', and absent base-uri or form-action directives." },
      { q: "Can a policy score 100?", a: "Yes. A strict policy built on nonces or hashes with no wildcards, no unsafe values and full directive coverage can reach a perfect score." },
      { q: "Does it test my site in a browser?", a: "No. It analyzes the policy text you paste. For live enforcement testing, deploy the header and watch the browser console for CSP violation reports." },
      { q: "Is my policy sent to a server?", a: "No. Parsing and scoring run client-side only, so proprietary policy details stay on your device." },
    ],
    tags: ["csp evaluator", "content security policy checker", "csp checker", "csp analyzer", "csp security score", "csp header checker", "check my csp", "test content security policy", "evaluate csp policy", "csp audit tool", "csp vulnerability checker", "csp misconfiguration check", "csp unsafe inline check", "csp wildcard check", "csp score", "csp rating", "how secure is my csp", "csp best practices", "csp strict check", "csp report only", "csp header validator", "validate csp syntax", "csp syntax checker", "csp lint", "online csp checker", "free csp checker", "website security header check", "security headers checker", "csp test tool", "csp analysis online", "csp policy review", "csp penetration test", "csp bypass check", "clickjacking csp check", "frame ancestors check", "csp form action check", "csp base uri check", "csp object src check", "improve csp score", "fix weak csp", "csp recommendations", "csp explained", "csp directive reference", "csp quick check", "csp grade", "grade my csp", "csp scanner online", "csp policy strength", "csp header audit", "csp security review", "evaluate my csp"],
  };

export default seo;
