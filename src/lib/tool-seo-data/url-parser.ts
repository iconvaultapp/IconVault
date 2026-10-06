import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "URL Parser - Free Online URL Analyzer Tool | IconVault",
    metaDescription: "Break any URL into protocol, host, port, path segments and query parameters instantly. Free, no signup, runs in your browser.",
    about: [
      "**IconVault**'s **URL Parser** takes any URL apart into its pieces: **protocol**, **hostname**, **port**, **path segments**, **query parameters** and **fragment**. Paste a link and see every component listed clearly, with query params decoded and broken out one by one.",
      "It is built for developers debugging APIs, redirects and OAuth callbacks, and for anyone curious about what a URL actually contains. The parser is **free** and **runs fully in your browser**, so the URLs you inspect never leave your device."
    ],
    faqs: [
      { q: "What parts of a URL does it show?", a: "Protocol, credentials if present, hostname, port, path broken into segments, each query parameter with its decoded value, and the fragment (hash). It also flags when a protocol was assumed." },
      { q: "Does it decode query parameters?", a: "Yes. Percent-encoded characters are decoded, so %20 shows as a space, and each parameter is listed separately for easy reading." },
      { q: "What if I paste a URL without https?", a: "The parser assumes https and tells you it did so, so you always get a valid breakdown even for bare domains like example.com/path." },
      { q: "Are my URLs sent to a server?", a: "No. Parsing happens fully in your browser, so sensitive URLs with tokens or keys stay on your device." },
      { q: "Is the URL parser free?", a: "Yes, free with no signup. Parse as many URLs as you need." }
    ],
    tags: [
      "url parser", "online url parser", "parse url online", "url analyzer",
      "url decoder tool", "url structure analyzer", "url query parser",
      "query string parser", "url parameters extractor", "extract query params from url",
      "url path parser", "url hostname extractor", "get domain from url",
      "url protocol checker", "url breakdown tool", "analyze url components",
      "url parts extractor", "parse query string online", "url query string decoder",
      "url fragment parser", "url port extractor", "free url parser tool",
      "url parser no signup", "url inspection tool", "debug url online",
      "url validator parser", "url encoded parser", "punycode url parser",
      "url username password parser", "http url parser", "https url parser",
      "url path segments", "url search params", "url hash parser",
      "what is my url structure", "url component breakdown", "url query parameters list",
      "url parameter decoder", "online url inspector", "url dissect tool",
      "url splitter online", "website url analyzer", "link parser online",
      "parse link components", "url decode and parse", "developer url tool",
      "url parsing tool free", "url query parameter parser", "break down url online",
      "url component parser free", "parse url parameters tool", "url structure viewer"
    ],
  };

export default seo;
