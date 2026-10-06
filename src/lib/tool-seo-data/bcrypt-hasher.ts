import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "Bcrypt Hasher - Free Online Password Hash Tool | IconVault",
    metaDescription: "Hash passwords with bcrypt using adjustable salt rounds, and verify passwords against bcrypt hashes. Free, runs in your browser.",
    about: [
      "**IconVault**'s **Bcrypt Hasher** creates secure **bcrypt password hashes** with an adjustable **cost factor (salt rounds)**, and verifies passwords against existing hashes. It uses a real **bcrypt** implementation, not a toy demo, so the output format matches what your backend produces.",
      "Use it to **generate hashes** for seed users, **test login flows**, or understand how **password storage** works. Free and runs fully in your browser.",
    ],
    faqs: [
      { q: "Is the bcrypt hasher free?", a: "Yes. Hash and verify unlimited passwords with no account." },
      { q: "What are salt rounds?", a: "The cost factor (2^rounds iterations). Higher rounds are slower and more resistant to brute force. 10-12 is the common default." },
      { q: "Is my password sent to a server?", a: "No. Hashing and verification run entirely in your browser, so plaintext passwords never leave your device." },
      { q: "Can I verify a hash from my database?", a: "Yes. Paste the hash and the candidate password; the tool tells you whether they match." },
      { q: "Why use bcrypt instead of SHA-256?", a: "SHA-256 is fast, which helps attackers. Bcrypt is deliberately slow and salted per password, making brute-force and rainbow-table attacks impractical." },
      { q: "What does a bcrypt hash look like?", a: "It starts with $2b$ (or $2a$/$2y$), then the cost, the salt, and the hash, for example $2b$10$..." },
    ],
    tags: ["bcrypt hasher", "bcrypt generator", "bcrypt hash online", "bcrypt password hash", "hash password bcrypt", "bcrypt online", "bcrypt salt rounds", "bcrypt cost factor", "verify bcrypt hash", "bcrypt compare", "bcrypt check password", "password hashing tool", "bcrypt vs sha256", "what is bcrypt", "bcrypt explained", "bcrypt hash example", "bcrypt $2b$", "bcrypt $2a$ vs $2b$", "bcrypt work factor", "bcrypt rounds 10 12", "how long bcrypt 12 rounds", "bcrypt javascript", "bcryptjs online", "bcrypt nodejs", "bcrypt python", "python bcrypt hash password", "php password_hash bcrypt", "bcrypt golang", "bcrypt java", "bcrypt ruby", "generate bcrypt hash online free", "bcrypt hash generator free", "password hash generator", "secure password storage", "salted password hash", "password hashing best practices", "owasp password storage", "bcrypt rainbow table", "bcrypt brute force time", "check bcrypt password match", "test bcrypt hash", "bcrypt decoder", "can bcrypt be decrypted", "bcrypt vs argon2", "bcrypt vs scrypt", "argon2 vs bcrypt", "password_hash php", "werkzeug generate_password_hash", "django password hasher", "laravel bcrypt", "devise bcrypt rails"],
  };

export default seo;
