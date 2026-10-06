import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "Hash Generator - MD5, SHA-256, SHA-512 Online | IconVault",
    metaDescription:
      "Generate MD5, SHA-1, SHA-256, SHA-384 and SHA-512 hashes instantly. Free online hash generator - private, runs entirely in your browser.",
    about: [
      "The **Hash Generator** turns any **text** into its cryptographic fingerprint - a fixed-length digest that changes completely if even one character changes. It computes **MD5**, **SHA**-1, **SHA**-**256**, **SHA**-384 and **SHA**-**512** all at once: the **SHA** family via your browser's built-in WebCrypto, **MD5** via a compact standards-compliant implementation, since browsers no longer ship **MD5**. New: HMAC mode signs **text** with your secret key (HMAC-**SHA**-**256**/**512**, e.g. for webhook signature debugging), and an expected-**hash** field gives a green Match / red Mismatch verdict.",
      "Hashes are perfect for checksums, cache keys, Gravatar URLs and verifying file integrity. Everything is computed on your device - your input is never uploaded or stored. You get 5 **free** generations with no account - **IconVault** Pro ($12/year) unlocks unlimited hashing and every other tool on the platform.",
    ],
    faqs: [
      {
        q: "What is a hash?",
        a: "A hash is a fixed-length fingerprint of some input. The same text always produces the same hash, but you can't reverse a hash back into the text - which is why hashes are used for checksums and integrity verification.",
      },
      {
        q: "Which algorithm should I use?",
        a: "SHA-256 is the safe default for checksums and integrity checks. MD5 and SHA-1 are broken for security purposes - use MD5 only for legacy checksums and non-security fingerprints like Gravatar.",
      },
      {
        q: "Is my text sent to a server?",
        a: "No. All five hashes are computed in your browser - the SHA family with WebCrypto and MD5 with an inline implementation. Your input never leaves your device.",
      },
      {
        q: "Can I use these hashes to store passwords?",
        a: "No - fast hashes like MD5 and SHA-256 are designed for speed, which makes them terrible for passwords. Use a slow password-hashing function like bcrypt, scrypt or Argon2 on your server instead.",
      },
      {
        q: "Why include MD5 if it's broken?",
        a: "MD5 is still widely used for non-security checksums, legacy systems and Gravatar avatar URLs. It's included for those practical cases, clearly labeled as not for security.",
      },
      {
        q: "How many free hashes can I generate?",
        a: "Every visitor gets 5 free generations, no account needed. IconVault Pro ($12/year) unlocks unlimited hashing plus unlimited use of all 10+ tools.",
      },
    ],
    tags: [
      "hash generator", "md5 generator", "sha256 generator", "sha1 generator",
      "sha512 generator", "online hash generator", "free hash generator", "text to hash",
      "string to hash", "generate md5 hash", "generate sha256 hash", "md5 hash online",
      "sha256 online", "hash calculator online", "checksum generator",
      "message digest generator", "md5 checksum online", "sha256 checksum",
      "hash text online free", "password hash generator", "hash my password",
      "create hash from text", "sha-1 hash generator", "sha-384 generator",
      "sha-512 hash online", "md5 vs sha256", "what is a hash function",
      "hash generator no signup", "browser hash generator", "client side hash generator",
      "secure hash generator", "crypto hash online", "hash encoder", "string hash calculator",
      "online digest calculator", "generate checksum for file", "verify file integrity hash",
      "hash generator for developers", "api key hash generator", "token hash generator",
      "gravatar hash generator", "md5 for gravatar", "hash generator tool", "free md5 tool",
      "sha256 hash of string", "compute sha512", "hash converter", "text to md5 converter",
      "text to sha256 converter", "online sha generator", "hash value generator",
      "fingerprint generator text", "digital fingerprint tool", "hash generator without upload",
      "private hash calculator", "javascript hash generator", "web crypto hash tool",
    ],
  };

export default seo;
