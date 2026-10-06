import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "Cookie Inspector - Free Online Cookie Tool | IconVault",
    metaDescription: "View, add, edit and delete cookies for the current site in your browser. See names, values and session flags. Free, nothing leaves your device.",
    about: [
      "**IconVault**'s **Cookie Inspector** lists every cookie your browser stores for the **current site**: the **name**, the **decoded value** and a **likely-session flag** that highlights probable auth or session tokens. You can **add new cookies** with an expiry, path, Secure and SameSite settings, **edit** existing values in a dialog and **delete** cookies one by one with a confirmation.",
      "The tool states its **honest limits** up front: **HttpOnly cookies are invisible to JavaScript** and cannot be listed, and the Secure and SameSite flags are not exposed to JS either. Everything runs **fully in your browser** using document.cookie, so your cookies never leave the page. Free for everyone, no signup.",
    ],
    faqs: [
      { q: "Is the cookie inspector free?", a: "Yes. Viewing, adding, editing and deleting cookies are all free, and the tool runs entirely in your browser." },
      { q: "Which cookies can it see?", a: "Only cookies for the site you are currently visiting. Browsers isolate cookies per origin, and JavaScript cannot read HttpOnly cookies, so those never appear in the list." },
      { q: "Why can't I see HttpOnly or Secure flags?", a: "JavaScript's document.cookie API does not expose HttpOnly cookies at all, and it does not report the Secure or SameSite flags of the cookies it can see. That is a browser limitation, not a tool bug." },
      { q: "Can I add my own test cookies?", a: "Yes. Set a name, value, expiry in days, path, and the Secure and SameSite attributes, then save. The Secure flag is skipped with a notice when the page is not served over HTTPS." },
      { q: "How do I delete a cookie?", a: "Click the delete icon next to any cookie and confirm. The tool expires it on the root path and the default path to make sure it is really gone, then refreshes the list." },
      { q: "Is my cookie data sent anywhere?", a: "No. The tool only reads document.cookie and writes cookies through the same API. Nothing is uploaded, logged or shared." },
    ],
    tags: ["cookie inspector", "view cookies online", "cookie manager browser", "view browser cookies", "check cookies website", "see my cookies", "cookie viewer online", "browser cookie inspector", "document cookie viewer", "list website cookies", "cookie editor online", "edit cookies browser", "add cookie browser", "delete cookies tool", "clear site cookies", "cookie value decoder", "decode cookie value", "session cookie checker", "find session cookie", "auth token cookie", "jwt cookie check", "check if cookie exists", "website cookie list", "view current site cookies", "cookie debug tool", "debug cookies online", "http cookie viewer", "browser storage cookies", "manage cookies online", "cookie tester", "test cookie settings", "samesite cookie check", "secure cookie test", "cookie expiry checker", "cookie max age check", "add test cookie", "create cookie online", "remove cookie online", "cookie inspector free", "free cookie manager", "online cookie inspector", "browser cookie manager", "inspect cookies tool", "cookie name value viewer", "view encoded cookie", "url decode cookie value", "cookie troubleshooting", "cookies not saving debug", "check login cookie", "remember me cookie check"],
  };

export default seo;
