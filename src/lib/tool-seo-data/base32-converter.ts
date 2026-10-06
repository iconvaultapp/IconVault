import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "Base32 Converter - Free Online Encoding Tool | IconVault",
    metaDescription: "Encode and decode Base32 (RFC 4648) text online. Convert between plain text and Base32 instantly. Free, runs in your browser.",
    about: [
      "**IconVault**'s **Base32 Converter** encodes text to **Base32 (RFC 4648)** and decodes Base32 back to text, with validation that flags malformed input. It is the encoding behind **TOTP secrets**, **Google Authenticator keys**, and many **API tokens**.",
      "Everything happens **locally in your browser**, so **sensitive secrets and tokens** **never travel over the network**. Free and runs fully in your browser.",
    ],
    faqs: [
      { q: "Is the Base32 converter free?", a: "Yes. Encode and decode unlimited text with no account." },
      { q: "What is Base32 used for?", a: "Authenticator app secrets (TOTP), API tokens, and anywhere a case-insensitive, human-friendly encoding of binary data is needed." },
      { q: "Is my secret safe when I paste it here?", a: "Yes. Encoding and decoding run entirely in your browser, so your secrets never leave your device." },
      { q: "What is the difference between Base32 and Base64?", a: "Base32 uses a 32-character alphabet (A-Z, 2-7), making it case-insensitive and easier to read aloud. Base64 is more compact but case-sensitive." },
      { q: "Why does my decoded output look wrong?", a: "Base32 requires padding with = and a valid alphabet. The tool validates input and reports exactly what is malformed." },
      { q: "Can I decode a Google Authenticator secret here?", a: "Yes. Paste the Base32 secret to decode it, though keep in mind anyone with the secret can generate your codes, so never share it." },
    ],
    tags: ["base32 converter", "base32 encode", "base32 decode", "base32 encoder", "base32 decoder", "base32 to text", "text to base32", "rfc 4648 base32", "base32 encode online", "base32 decode online", "base32 converter online free", "decode base32 string", "encode text base32", "base32 secret decoder", "totp secret decoder", "google authenticator secret decode", "base32 alphabet", "base32 padding", "base32 vs base64", "what is base32", "base32 encoding explained", "base32 validator", "is valid base32", "base32 online tool", "base32 generator", "random base32 generator", "base32 key generator", "base32 checksum", "base32hex", "crockford base32", "z-base-32", "base32 file encoding", "base32 in javascript", "base32 in python", "atob base32", "base32 decode javascript", "base32 npm", "base32 command line", "base32 linux", "openssl base32", "base32 qr code", "2fa secret format", "authenticator key format", "base32 token", "api token base32", "base32 url safe", "base32 lowercase", "base32 uppercase", "base32 decode error", "invalid base32 padding", "base32 string length", "base32 character set"],
  };

export default seo;
