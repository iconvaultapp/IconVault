import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "CSP Builder - Free Online Content Security Policy Tool | IconVault",
    metaDescription: "Build a Content-Security-Policy header visually: toggle directives, add sources with one click, start from strict, balanced or legacy presets. Free.",
    about: [
      "**IconVault**'s **CSP Builder** turns writing a **Content-Security-Policy** header into clicking instead of memorizing. Toggle any of **12 directives**, from default-src and script-src to frame-ancestors and form-action, and add sources with one-click chips like **'self', 'none', https:, data:** and **blob:**. You can also type custom hosts and hashes.",
      "Start from a **Strict, Balanced or Legacy preset** instead of a blank page, watch the finished header assemble live, and **copy** it when it looks right. The strict preset flags the tradeoff honestly: maximum protection means inline scripts and styles are blocked, so you will need nonces or hashes. **Free** and runs **fully in your browser**.",
    ],
    faqs: [
      { q: "Is the CSP builder free?", a: "Yes. All directives, presets and the copy function are free, and the whole tool runs in your browser with nothing uploaded." },
      { q: "What is a Content-Security-Policy?", a: "An HTTP header that tells the browser exactly where your page may load scripts, styles, images, fonts and other resources from. It is one of the strongest defenses against cross-site scripting (XSS)." },
      { q: "Which directives are supported?", a: "Twelve: default-src, script-src, style-src, img-src, connect-src, font-src, frame-src, media-src, object-src, base-uri, form-action and frame-ancestors." },
      { q: "What do the presets do?", a: "Strict gives maximum protection with no inline code allowed, Balanced allows common needs like data URIs and inline styles, and Legacy keeps unsafe-inline and unsafe-eval for older apps you cannot rewrite yet." },
      { q: "Why is unsafe-inline flagged?", a: "Because allowing inline scripts largely defeats the XSS protection CSP provides. The tool lets you add it for legacy apps but the presets steer you toward nonces or hashes instead." },
      { q: "Where do I put the generated header?", a: "Send it as the Content-Security-Policy HTTP header from your server or CDN. Test in staging first, since a too-strict policy can block legitimate resources." },
    ],
    tags: ["csp builder", "content security policy builder", "csp header builder", "csp generator", "csp policy generator", "content security policy generator", "build csp header", "csp header generator", "generate content security policy", "csp directive builder", "script src builder", "default src csp", "csp strict policy", "csp balanced preset", "csp legacy preset", "csp nonce alternative", "csp without unsafe inline", "remove unsafe inline csp", "csp policy example", "csp header example", "content security policy example", "csp for website", "csp for react app", "csp wordpress", "csp nginx header", "csp apache header", "csp express helmet", "helmet csp builder", "csp frame ancestors", "csp form action", "csp base uri", "csp object src none", "csp img src", "csp connect src", "csp font src", "csp style src", "csp script src self", "csp policy tester", "csp syntax checker", "online csp builder", "free csp generator", "web security headers", "security header builder", "xss protection header", "prevent xss csp", "csp cheat sheet", "csp quick reference", "csp source list", "csp header copy paste", "content security policy quickstart", "csp sandbox directive", "csp upgrade insecure requests"],
  };

export default seo;
