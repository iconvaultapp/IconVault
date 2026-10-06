import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "URLPattern Playground - Free Online Tool | IconVault",
    metaDescription: "Test the URLPattern API live: named groups, wildcards and presets for routing patterns. Free, in your browser.",
    about: [
      "**IconVault**'s **URLPattern Playground** lets you test the browser-native **URLPattern API** without writing a line of code. Type a pattern with **named groups** like `:id`, wildcards and custom regexes, enter a test URL, and see instantly whether it matches plus every **captured group** broken down by URL part. Completely **free** and runs fully in your browser.",
      "Six **presets** cover real routing cases: user profiles, versioned APIs, locale slugs, CDN files, tenant subdomains and search queries. A built-in **syntax cheatsheet** teaches the pattern language as you experiment, and the tool uses your browser's own URLPattern implementation.",
    ],
    faqs: [
      { q: "Is the URLPattern Playground free?", a: "Yes. Free in your browser with a daily quota for guests and unlimited tests for Pro users." },
      { q: "What is the URLPattern API?", a: "It is a web standard for matching URLs against patterns with named groups, now built into modern browsers. It is designed for routing in service workers and web apps without regex wrangling." },
      { q: "Which browsers support URLPattern?", a: "Chrome 95+, Edge 95+ and Safari 18.4+ support it. Firefox has it behind a flag. The playground detects support and warns you if your browser lacks it." },
      { q: "How do named groups work?", a: "Write :name in the pattern, for example /users/:id. When a URL matches, the group value is available per URL part, such as pathname or hostname." },
      { q: "Can I match subdomains?", a: "Yes. Put a named group in the hostname, like https://:tenant.example.com/dashboard/*, and the tenant value is captured from the hostname part." },
      { q: "What is the difference from a regular expression?", a: "URLPattern understands URL structure: it matches protocol, hostname, port, pathname, search and hash separately, so you do not need to hand-roll URL parsing in regex." },
    ],
    tags: ["urlpattern", "urlpattern api", "url pattern playground", "urlpattern tester", "urlpattern javascript", "url pattern matching", "urlpattern named groups", "urlpattern example", "urlpattern exec", "urlpattern test", "urlpattern tutorial", "url routing pattern", "javascript url matching", "urlpattern vs regex", "urlpattern wildcard", "urlpattern mdn", "service worker routing", "urlpattern pathname", "urlpattern hostname", "urlpattern search params", "spa routing library", "client side routing patterns", "url pattern syntax", "named groups url", "urlpattern browser support", "urlpattern firefox", "urlpattern safari", "what is urlpattern", "learn urlpattern", "urlpattern cheatsheet", "urlpattern preset", "api versioning url pattern", "locale url routing", "tenant subdomain routing", "cdn url pattern", "urlpattern custom regex", "urlpattern optional group", "new urlpattern example", "urlpattern groups", "test url against pattern", "url matcher online", "route pattern tester", "express style routing browser", "urlpattern polyfill", "web standards urlpattern", "pattern matching urls", "url template matching", "frontend routing tool", "urlpattern playground online", "javascript routing without framework"],
  };

export default seo;
