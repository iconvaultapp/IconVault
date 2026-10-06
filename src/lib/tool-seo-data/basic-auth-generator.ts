import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "Basic Auth Generator - Free Online HTTP Auth Tool | IconVault",
    metaDescription: "Generate HTTP Basic Authentication headers. Enter a username and password, get the base64 Authorization header. Free, in your browser.",
    about: [
      "**IconVault**'s **Basic Auth Generator** builds a ready-to-paste **HTTP Basic Authentication header** from any **username and password**. It shows the **base64-encoded** credential and the full **Authorization: Basic ...** header, plus a matching **curl** snippet.",
      "Perfect for **testing protected APIs**, **staging sites**, and **webhook endpoints** without hand-encoding credentials. Free and runs fully in your browser.",
    ],
    faqs: [
      { q: "Is the basic auth generator free?", a: "Yes. Generate unlimited auth headers with no account." },
      { q: "How does HTTP Basic Auth work?", a: "The client sends username:password base64-encoded in an Authorization header. The server decodes it and checks the credentials." },
      { q: "Is my password sent anywhere?", a: "No. The base64 encoding happens entirely in your browser, so your password never leaves your device." },
      { q: "Is Basic Auth secure?", a: "Only over HTTPS. Base64 is encoding, not encryption, so credentials are trivially decodable if intercepted on plain HTTP." },
      { q: "How do I use the header with curl?", a: "Pass it as -H \"Authorization: Basic <value>\", or let curl build it for you with -u username:password." },
      { q: "What characters are allowed in the password?", a: "Any. The tool encodes the exact bytes you type, including special characters and unicode." },
    ],
    tags: ["basic auth generator", "http basic auth", "basic authentication header", "authorization basic header", "base64 username password", "basic auth header generator", "http auth generator", "basic auth curl", "curl basic auth", "basic auth example", "what is basic auth", "basic authentication explained", "base64 encode credentials", "username password base64", "basic auth vs bearer token", "basic auth security", "http authorization header", "rest api basic auth", "basic auth postman", "basic auth testing", "api authentication methods", "basic auth header format", "rfc 7617", "basic auth realm", "www-authenticate basic", "401 unauthorized basic auth", "basic auth javascript fetch", "fetch basic auth header", "axios basic auth", "python requests basic auth", "basic auth nginx", "basic auth apache htpasswd", "htpasswd generator", "staging site password protect", "basic auth online tool", "generate auth header online", "basic auth encoder", "basic auth decoder", "decode basic auth header", "base64 decode auth", "basic auth credentials", "basic auth token", "api key vs basic auth", "basic auth over https", "is basic auth safe", "basic auth best practices", "test protected api", "webhook basic auth", "basic auth swagger", "openapi basic auth"],
  };

export default seo;
