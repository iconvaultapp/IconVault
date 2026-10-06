import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "Env Validator - Free Online Developer Tool | IconVault",
    metaDescription: "Validate .env files online: syntax errors, duplicates, empty values, secret detection. Generates .env.example. Free, private.",
    about: [
      "**IconVault**'s **Env Validator** lints your **.env** file before it causes a production incident: **syntax errors** (missing `=`, invalid key names), **duplicate keys**, **empty values**, unquoted values with spaces, and lowercase keys that break convention. Anything that looks like a **secret** (API keys, tokens, passwords) is flagged with a reminder to keep it out of git.",
      "One click generates a clean **.env.example** with placeholders for secret values, safe to commit and share with your team. **Copy** or **download** it instantly. Free and runs fully in your browser, so your real secrets never leave your device.",
    ],
    faqs: [
      { q: "Is the env validator free?", a: "Yes. Guests get free runs per day, Pro users get unlimited. Validation runs entirely in your browser." },
      { q: "Is it safe to paste real secrets?", a: "Yes. Nothing is uploaded or stored; everything is parsed locally in your browser tab." },
      { q: "What does it check?", a: "Missing equals signs, invalid key names, duplicate keys, empty values, values with unquoted spaces, non-uppercase keys, and keys that look like secrets." },
      { q: "What is the .env.example generator?", a: "It produces a commit-safe template with every key and placeholder values for secrets, so teammates know what to configure without seeing real credentials." },
      { q: "How are secrets detected?", a: "Keys containing words like SECRET, PASSWORD, TOKEN, PRIVATE or API_KEY with a non-empty value are flagged as likely secrets." },
      { q: "Does it check .gitignore?", a: "It cannot read your filesystem, but every secret warning reminds you to confirm the file is gitignored." },
    ],
    tags: ["env validator", ".env validator", "dotenv validator", "validate env file", "env file checker", "dotenv linter", ".env linter", "env syntax checker", "check .env file", "env file validator online", "dotenv checker", "validate dotenv", "env example generator", ".env.example generator", "generate env example", "dotenv example creator", "detect secrets in env", "secret scanner env", "find secrets in dotenv", "env secret detection", "duplicate env keys", "find duplicate env variables", "env file best practices", "dotenv best practices", "env variable naming", "screaming snake case env", "empty env value check", "env file parser", "parse .env online", "dotenv parser", "env config checker", "environment variables validator", "validate environment variables", "env file tool", "dotenv tool", "env helper", "node env validator", "docker env file check", "env file lint", "lint dotenv", "env quality check", "dotenv quality", "env file analyzer", "env security check", "prevent committing secrets", "gitignore env reminder", "safe env example", "share env template", "team env template", "onboarding env file", "env documentation generator"],
  };

export default seo;
