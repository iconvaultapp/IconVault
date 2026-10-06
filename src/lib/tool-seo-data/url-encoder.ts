import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "URL Encoder / Decoder - Encode URLs Online Free | IconVault",
    metaDescription:
      "Encode and decode URLs online. encodeURIComponent, encodeURI and smart decode modes - 100% in your browser, free, no signup.",
    about: [
      "**IconVault**'s **URL Encoder** / **Decoder** handles **percent**-**encoding** the way browsers do. Choose **encodeURIComponent** for a single query parameter or form value (encodes everything unsafe), **encodeURI** for a full **URL** (keeps : / ? & = # intact), or **Decode** to turn %XX sequences back into readable characters - with a smart fallback that handles full-**URL** encodings too.",
      "Everything runs in your browser: nothing is uploaded, logged or stored, so it's safe for **URLs** containing tokens or PII. Input/output character counts show exactly how much the string grew, and one click moves the output back into the input for round-trip checks. Every visitor gets 5 **free** encodes - **IconVault** Pro ($12/year) unlocks unlimited use of every developer tool.",
    ],
    faqs: [
      {
        q: "How do I URL-encode a string?",
        a: "Paste your text, choose a mode and hit Encode. The encoded output appears instantly with a copy button. Use the round-trip option to verify the decode works.",
      },
      {
        q: "Should I use encodeURI or encodeURIComponent?",
        a: "Use encodeURIComponent for a single value you're inserting into a query string (it encodes & = ? so they can't break your parameters). Use encodeURI only for a complete URL, where : / ? # must stay readable.",
      },
      {
        q: "How do I decode a URL?",
        a: "Pick the Decode mode and paste the percent-encoded string. It tries decodeURIComponent first and falls back to decodeURI, so it handles both query values and full encoded URLs.",
      },
      {
        q: "What characters get encoded?",
        a: "Spaces become %20, and characters like & = + ? # % and non-ASCII text (é, emoji, CJK) become %XX sequences. encodeURIComponent encodes more characters than encodeURI - that's the point of the two modes.",
      },
      {
        q: "Is it safe to paste URLs with tokens?",
        a: "Yes. Encoding happens entirely in your browser's JavaScript - the URL is never sent to a server, so query strings with tokens or personal data stay on your machine.",
      },
      {
        q: "How many free encodes do I get?",
        a: "Every visitor gets 5 free URL encodes/decodes with no account needed. IconVault Pro ($12/year) gives unlimited use plus unlimited use of all 10+ developer tools.",
      },
    ],
    tags: [
      "url encoder", "url decoder", "url encode online", "url decode online",
      "url encoder decoder", "encode url online free", "decode url online free",
      "percent encoder", "percent encoding", "uri encoder", "uri decoder",
      "encodeuricomponent", "encodeuri", "decodeuricomponent",
      "javascript url encode", "js encodeuri", "encode url parameter",
      "encode query string", "query param encoder", "url query encoder",
      "encode special characters url", "encode space in url", "url space encoding",
      "encode unicode url", "encode emoji url", "encode utf8 url",
      "url encoding tool", "url decoding tool", "online url encoder",
      "free url encoder", "url encoder no signup", "browser url encoder",
      "private url encoder", "url encoder for developers", "url encoder dev tool",
      "encode form data url", "url form encoding", "application x-www-form-urlencoded",
      "encode ampersand url", "encode hashtag url", "encode question mark url",
      "url safe base64", "base64 url encode", "encode url for api",
      "url encode api parameter", "decode api url", "url decode query string",
      "url encoder chrome", "url decoder tool", "percent decode online",
      "%20 decoder", "url hex decoder", "url ascii encoder",
      "encode non ascii url", "iri to uri", "punycode vs url encode",
      "url encoder validator", "round trip url encode",
      "encode url javascript online", "decode url javascript online",
    ],
  };

export default seo;
