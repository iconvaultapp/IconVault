import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "JWT Decoder - Decode JWT Tokens Online Free | IconVault",
    metaDescription:
      "Decode any JWT token instantly in your browser - now with optional HMAC (HS256/384/512) signature verification. View header, payload, expiry and claims as readable JSON - 100% private, no signup.",
    about: [
      "**IconVault**'s **JWT Decoder** turns a compact **token** string into readable JSON in one click. Paste the **token** and the header (algorithm, **token** type), the **payload** (claims like sub, name, iat and exp) and the raw signature appear in separate panels, so you can inspect exactly what an auth **token** carries - essential when debugging login flows, expired sessions or role-based access bugs.",
      "Everything happens in your browser: the **token** is decoded locally and never uploaded to any server, so it's safe to paste staging or production **tokens**. Expiry is calculated automatically and shown as a green “expires in…” or red “expired…” badge. A built-in security panel warns about unsigned **tokens** (alg:none), missing or expired exp claims, and sensitive data like passwords or secrets hiding in the **payload**. Every visitor gets 5 **free** decodes - **IconVault** Pro ($12/year) unlocks unlimited use of every developer tool.",
    ],
    faqs: [
      {
        q: "How do I decode a JWT token?",
        a: "Paste the full token (the three parts separated by dots) into the decoder and hit Decode. The header and payload appear as formatted JSON, the expiry is calculated automatically, and the signature is shown as a raw string.",
      },
      {
        q: "Is it safe to paste a real JWT here?",
        a: "Yes - decoding happens entirely in your browser's JavaScript. The token is never uploaded to a server, logged or stored anywhere. For production tokens, close the tab when you're done.",
      },
      {
        q: "Does the decoder verify the signature?",
        a: "No. This tool only decodes the token's contents; it cannot verify the signature without the secret key. Never trust a token based on decoded output alone - verification must happen on your server.",
      },
      {
        q: "How can I tell if my token is expired?",
        a: "If the payload contains an exp claim, the tool computes it automatically and shows a green “expires in X” badge or a red “expired X ago” badge - no manual timestamp math needed.",
      },
      {
        q: "What are the three parts of a JWT?",
        a: "Header (algorithm and token type), payload (claims like subject, issuer and expiry) and signature. Each part is base64url-encoded; the signature lets your server verify the token wasn't tampered with.",
      },
      {
        q: "How many free decodes do I get?",
        a: "Every visitor gets 5 free JWT decodes with no account needed. IconVault Pro ($12/year) gives unlimited decodes plus unlimited use of all 10+ developer tools.",
      },
    ],
    tags: [
      "jwt decoder", "decode jwt", "jwt decoder online", "decode jwt token online",
      "jwt token decoder", "jwt payload decoder", "jwt viewer", "jwt debugger",
      "jwt decoder free", "decode jwt token free", "online jwt decoder",
      "jwt token viewer", "read jwt token", "jwt inspector", "jwt token inspector",
      "decode jwt header", "jwt claims viewer", "jwt expiry checker",
      "check jwt expiry", "jwt token expired", "decode access token",
      "decode id token", "jwt debug tool", "jwt playground",
      "jwt.io alternative", "private jwt decoder", "jwt decoder no signup",
      "jwt decode offline", "browser jwt decoder", "jwt token parser",
      "parse jwt token", "jwt payload reader", "jwt claims decoder",
      "decode bearer token", "bearer token decoder", "auth token decoder",
      "decode oauth token", "jwt exp checker", "jwt iat decoder",
      "jwt signature explained", "verify vs decode jwt", "jwt token format",
      "jwt header payload signature", "base64url decode jwt",
      "decode jwt without secret", "inspect jwt token", "jwt token analyzer",
      "jwt debugger online free", "decode json web token", "json web token decoder",
      "jwt decoder dev tool", "jwt decoder for developers",
      "decode refresh token", "jwt token checker", "jwt payload formatter",
      "pretty print jwt", "jwt json viewer", "decode jwt claims online",
    ],
  };

export default seo;
