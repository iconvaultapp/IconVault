import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "HTTP Methods Reference - Interactive Guide | IconVault",
    metaDescription: "GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS explained: safety, idempotency, caching. Live request builder with fetch and curl output. Free.",
    about: [
      "**IconVault**'s **HTTP Methods Reference** turns the HTTP spec into something you can play with. Every method, from **GET** to **OPTIONS**, gets a plain-English explanation plus its **safe**, **idempotent** and **cacheable** flags, a real example request and response, and guidance on when to reach for it.",
      "The built-in **request builder** lets you pick a method, type a URL, add a JSON body and instantly get a working **fetch()** snippet or **curl** command. Everything is **free** and runs fully in your browser, making it a handy desk reference for API design, debugging and interview prep.",
    ],
    faqs: [
      {
        q: "What is the difference between PUT and PATCH?",
        a: "PUT replaces the entire resource at a URI with the representation you send, while PATCH applies a partial change, only touching the fields you include. PUT is idempotent by definition; PATCH may or may not be, depending on the patch format.",
      },
      {
        q: "Which HTTP methods are idempotent?",
        a: "GET, HEAD, OPTIONS, PUT and DELETE are idempotent: repeating the request has the same effect as doing it once. POST and PATCH are generally not idempotent, which is why retries of POST need care to avoid duplicates.",
      },
      {
        q: "What does safe mean for an HTTP method?",
        a: "A safe method never changes server state: it is read-only. GET, HEAD and OPTIONS are safe. Safe methods can also be prefetched or retried by browsers and proxies without risk.",
      },
      {
        q: "When should I use POST vs PUT for creating resources?",
        a: "Use POST when the server assigns the new resource's URI, and PUT when the client knows the full URI and the complete new state. A common rule: POST to a collection to create, PUT to an item URI to replace.",
      },
      {
        q: "Is this HTTP methods tool free?",
        a: "Yes. The reference, examples and request builder are free in your browser, with 5 free snippet copies per tool before Pro is suggested.",
      },
      {
        q: "Does the request builder actually send requests?",
        a: "No. It generates fetch() and curl code for you to run yourself. Nothing leaves your browser, so there are no CORS surprises or accidental writes to a live API.",
      },
    ],
    tags: [
      "http methods", "http methods explained", "rest http methods",
      "get post put patch delete", "http verbs", "rest api methods",
      "http method reference", "put vs patch", "post vs put",
      "http idempotent", "idempotent methods", "safe http methods",
      "http methods cheat sheet", "rest api cheat sheet", "http request methods list",
      "http head method", "http options method", "http trace method",
      "when to use patch", "when to use put", "rest api design guide",
      "http semantics", "http caching methods", "cacheable http methods",
      "http status codes", "rest api best practices", "http request builder",
      "fetch api example", "curl post json", "curl put example",
      "javascript fetch post", "http methods interview questions",
      "restful api tutorial", "http get vs post", "http delete idempotent",
      "http patch idempotent", "http methods table", "http verb safety",
      "api design http methods", "rest api methods explained simply",
      "http methods w3c", "mdn http methods", "http request structure",
      "http response example", "learn http methods", "http methods quiz",
      "http method properties", "idempotency key", "http put full update",
      "http patch partial update", "http options cors preflight",
      "http head vs get", "rest api http verb guide", "http methods pdf",
    ],
  };

export default seo;
