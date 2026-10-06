import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "CORS Tester - Free Online CORS Testing Tool | IconVault",
    metaDescription: "Test a URL's CORS policy from your browser: status, timing, response headers, plus a preflight explainer and Express, Nginx and Apache config snippets. Free.",
    about: [
      "**IconVault**'s **CORS Tester** fires a real **fetch** from your browser to any URL you enter, using **GET or POST**, and reports what the browser allows: the **HTTP status**, **round-trip time** and the **response headers** the server exposes. If the request is blocked by the browser's **same-origin policy**, the tool says so plainly instead of failing silently.",
      "A **preflight explainer** walks through when browsers send an OPTIONS preflight and why, and ready-to-copy **server config snippets** for **Express, Nginx and Apache** show how to allow your origin properly. It is **honest about the limits**: CORS is browser-enforced, so this tool can only observe what a browser permits. Free and runs fully in your browser.",
    ],
    faqs: [
      { q: "Is the CORS tester free?", a: "Yes. Testing URLs and copying the server config snippets are free, and everything happens in your browser." },
      { q: "What does the test actually do?", a: "It performs a real fetch() with mode cors from your browser to the URL you enter, then shows the status code, timing and response headers, or reports that the browser blocked the request." },
      { q: "Why does my request show as blocked?", a: "The browser blocked it because the server did not send an Access-Control-Allow-Origin header that permits your origin. The server itself may respond fine to curl or server-side code." },
      { q: "How do I fix a CORS error?", a: "Configure the server to send the right headers. The tool provides copy-ready snippets for Express (cors middleware), Nginx (add_header) and Apache (mod_headers) using your origin." },
      { q: "What is a preflight request?", a: "For non-simple requests, browsers first send an OPTIONS request to ask permission. The tool's explainer covers which requests trigger one and which headers the server must answer with." },
      { q: "What does a timeout mean?", a: "The request took longer than 15 seconds, so it was aborted. The server may be down, very slow, or dropping cross-origin connections." },
    ],
    tags: ["cors tester", "test cors online", "cors policy checker", "cors check url", "check cors headers", "cors error checker", "cors blocked test", "preflight request test", "options preflight check", "access control allow origin check", "test cross origin request", "fetch cors test", "browser cors test", "cors api tester", "cors debug tool", "cors configuration tester", "express cors snippet", "nginx cors config", "apache cors headers", "cors setup express", "enable cors nginx", "cors headers generator", "fix cors error", "cors error fix", "no access control allow origin", "cors policy blocked", "cors header missing", "allow cross origin requests", "cors credentials test", "cors allowed methods check", "cors allowed headers", "preflight response check", "test api cors policy", "cors checker free", "online cors checker", "free cors test tool", "website cors test", "domain cors check", "cors test post request", "cors get request test", "cors request blocked browser", "cors is browser enforced", "understand cors preflight", "cors tutorial test", "cors snippet generator", "cors express middleware", "cors nginx add header", "cors apache config", "allow origin wildcard test", "cors test online free", "check cors policy headers", "cors response headers list", "debug preflight failure"],
  };

export default seo;
