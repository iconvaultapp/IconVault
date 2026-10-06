import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "Text Fragment Builder - Interactive Lab | IconVault",
    metaDescription: "Build #:~:text= deep links with prefix and suffix context, preview and copy. Free, runs fully in your browser.",
    about: [ "**IconVault**'s **Text Fragment Builder** creates deep links that scroll to and highlight exact text on any page. Enter the **page URL** and the **exact phrase**, optionally add **prefix** and **suffix** context to disambiguate repeats, and get a properly encoded `#:~~:text=` link with a one-click **test link** that opens in a new tab.", "Everything is **free** and runs **fully in your browser**: encoding, preview and copy all happen on your device. Prefix and suffix are the pro move most generators skip, they tell the browser which occurrence to pick when a phrase appears more than once." ],
    faqs: [
      { q: "What is a text fragment URL?", a: "A URL ending in #:~:text=phrase that makes the browser scroll to the first matching text on the page and highlight it in yellow. It works without any code on the target page." },
      { q: "Which browsers support text fragments?", a: "Chrome, Edge, Safari and Firefox 131 and newer. Older browsers simply ignore the fragment and load the page normally." },
      { q: "What are prefix and suffix for?", a: "They add context around your phrase, like #:~:text=prefix,phrase,suffix. The browser only matches occurrences wrapped by that context, which disambiguates repeated phrases." },
      { q: "Can I link to a range of text?", a: "Yes. Use #:~:text=start,end to highlight everything from the start phrase to the end phrase. Separate multiple directives with &text=." },
      { q: "Do text fragments work on any website?", a: "They work on pages that allow fragment directives and are not blocked by the site's policies. Some sites opt out with the Document-Policy header." },
      { q: "Is this tool free?", a: "Yes, free, and everything runs in your browser with nothing uploaded." },
    ],
    tags: ["text fragment", "text fragment builder", "text fragment generator", "text fragment url", "how to create text fragment link", "text fragment link generator", "text fragment chrome", "highlight text in url", "link to specific text on page", "url highlight text", "text= url parameter", "text fragment syntax", "text fragment example", "text fragment prefix suffix", "text fragment prefix", "text fragment suffix", "disambiguate text fragment", "text fragment range", "text fragment multiple", "scroll to text url", "deep link to text", "link to paragraph", "share link to specific text", "text fragment firefox", "text fragment safari", "text fragment support", "text fragment not working", "why text fragment not working", "document policy text fragments", "force load text fragment", "text fragment directive", "fragment directive", "text directive", "url fragment text", "hash text url", "text snippet link", "google text fragment", "featured snippet link", "link to answer on page", "cite specific text link", "text fragment seo", "text fragment tutorial", "text fragment explained", "build text fragment url", "text fragment tool", "free text fragment generator", "text fragment encoder", "encode text fragment", "text fragment spaces", "text fragment special characters"],
  };

export default seo;
