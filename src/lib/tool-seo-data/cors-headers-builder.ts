import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "CORS Headers Builder - Free Online Developer Tool | IconVault",
    metaDescription: "Build CORS configs visually: origins, methods, credentials. Get Express, Nginx, Apache and Cloudflare code. Free.",
    about: [
      "**IconVault**'s **CORS Headers Builder** turns cross-origin configuration into a visual form: pick **allowed origins**, toggle **HTTP methods**, set **allowed and exposed headers**, flip **credentials** on or off, and tune the **preflight cache**. Start from presets like **Public API**, **Single-page app** or **Locked down**.",
      "It generates copy-paste code for **Express** (cors middleware), raw **response headers**, **Nginx**, **Apache** and **Cloudflare Workers**, and warns you about real footguns like combining **wildcard origins with credentials**. Free and runs fully in your browser.",
    ],
    faqs: [
      { q: "Is the CORS builder free?", a: "Yes. Guests get free generations per day, Pro users get unlimited. Everything runs in your browser." },
      { q: "What server code does it generate?", a: "Express cors middleware config, raw HTTP response headers, an Nginx location block, an Apache .htaccess snippet and a Cloudflare Workers handler." },
      { q: "Why does it warn about wildcard plus credentials?", a: "Browsers reject Access-Control-Allow-Credentials: true when the origin is *. The builder flags this so your config actually works." },
      { q: "What are the presets for?", a: "Public API (open reads, no cookies), Single-page app (your frontend origin with credentials) and Locked down (read-only from one origin). Tune after applying." },
      { q: "What is Access-Control-Max-Age?", a: "How long browsers cache the preflight OPTIONS response, so repeat requests skip the extra round trip. The builder lets you set it from 0 to 24 hours." },
      { q: "Does it test my CORS setup?", a: "No, it generates configuration. Use the API Tester to send real requests, or check response headers in your browser devtools." },
    ],
    tags: ["cors headers builder", "cors config generator", "cors generator", "build cors headers", "cors setup tool", "cors configuration", "access control allow origin", "cors allow origin generator", "cors middleware config", "express cors config", "cors npm config generator", "nginx cors config", "cors nginx snippet", "apache cors htaccess", "cors htaccess generator", "cloudflare workers cors", "cors worker example", "cors preflight config", "access control allow methods", "access control allow headers", "cors credentials", "cors allow credentials", "cors wildcard", "cors wildcard credentials error", "cors explained", "cors tutorial", "fix cors error", "cors error solution", "enable cors", "how to enable cors", "cors for spa", "cors single page app", "cors public api", "cors best practices", "cors security", "cors max age", "access control max age", "cors exposed headers", "access control expose headers", "cors options request", "preflight request", "cors online tool", "free cors tool", "cors config visual", "cors cheat sheet", "http cors headers", "cross origin resource sharing", "cors policy builder", "generate cors policy", "cors header values"],
  };

export default seo;
