import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "Trusted Types - Interactive Lab | IconVault",
    metaDescription: "Learn Trusted Types: create policies, fire XSS payloads at DOM sinks, watch them get neutralized. Free, in-browser.",
    about: [ "**IconVault**'s **Trusted Types** playground teaches XSS prevention by doing. Pick real **attack payloads** like `img onerror` and `svg onload`, run them through a **policy**, and watch the before/after: the dangerous markup goes in, safe markup comes out, and the rendered preview proves it. The lab also shows the **policy code** you would ship.", "It is **free** and runs **fully in your browser**. The lab is honest about the mechanics: this page simulates a policy, real enforcement needs the CSP header `require-trusted-types-for 'script'`, and the demo sanitizer is regex-based while production should use DOMPurify." ],
    faqs: [
      { q: "What are Trusted Types?", a: "A browser API that stops DOM XSS by making dangerous sinks like innerHTML reject plain strings. Code must pass strings through a policy that returns a TrustedHTML object, so unsanitized input can never reach the DOM." },
      { q: "Do I need a CSP header for Trusted Types?", a: "Yes for real enforcement. The header require-trusted-types-for 'script' turns on the type checking. Without it, policies are just a convention your code follows voluntarily." },
      { q: "What is a Trusted Types policy?", a: "A named object with creator functions like createHTML, created via trustedTypes.createPolicy. It is the single choke point where all dynamic HTML gets sanitized before reaching a sink." },
      { q: "Which browsers support Trusted Types?", a: "Chrome and Edge support it fully. Firefox and Safari do not yet, so treat it as defense in depth alongside sanitization, not your only layer." },
      { q: "Should I still sanitize if I use Trusted Types?", a: "Yes. Trusted Types enforce that input goes through a policy, but the policy itself must sanitize. Use a real sanitizer like DOMPurify inside createHTML, not regexes." },
      { q: "Is this playground free?", a: "Yes, free, running entirely in your browser." },
    ],
    tags: ["trusted types", "trusted types tutorial", "trusted types example", "what are trusted types", "trusted types xss", "prevent xss javascript", "dom xss prevention", "innerhtml xss", "innerhtml security", "sanitize html javascript", "xss payload", "xss payloads list", "img onerror xss", "svg onload xss", "javascript alert xss", "xss attack examples", "learn xss", "xss playground", "xss demo", "xss sandbox", "content security policy", "csp header", "require-trusted-types-for", "csp require trusted types", "trustedtypes.createpolicy", "createpolicy", "trustedhtml", "dompurify", "dompurify vs trusted types", "sanitize user input", "escape html javascript", "web security", "frontend security", "xss cheat sheet", "xss prevention cheat sheet", "owasp xss prevention", "trusted types browser support", "trusted types firefox", "trusted types safari", "trusted types chrome", "trusted types policy example", "trusted types code", "sink xss", "dom sinks", "dangerous sinks javascript", "secure innerhtml alternative", "textcontent vs innerhtml", "free security tool", "web security lab", "trusted types mdn", "xss filter bypass", "csp nonce vs trusted types"],
  };

export default seo;
