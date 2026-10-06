import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "Env Generator - Free Online Dev Tool | IconVault",
    metaDescription: "Generate clean .env files with validated keys, smart quoting and a matching .env.example. Free, runs fully in your browser.",
    about: [
      "**IconVault**'s **Env Generator** builds clean, valid **.env files** without the fiddly manual editing. Add key-value rows with **key validation** (keys must start with a letter or underscore), duplicate detection, and automatic **smart quoting** for values that contain spaces or hashes. It is free and runs fully in your browser.",
      "It also generates a matching **.env.example** with empty values, so your team gets a documented template without your secrets. Copy the result or download it directly, keeping real credentials out of your repo and in your local environment where they belong."
    ],
    faqs: [
      { q: "What is a .env file?", a: "A .env file stores configuration as KEY=VALUE pairs that your app loads at runtime. It keeps secrets like API keys and database passwords out of source code so they are not committed to version control." },
      { q: "What makes a valid environment variable key?", a: "Keys must start with a letter or underscore, followed by letters, digits or underscores. The generator validates this as you type and flags duplicates so you do not ship a broken file." },
      { q: "When do values get quoted?", a: "Values containing spaces or # characters are automatically quoted, because unquoted spaces and # start comments in the dotenv format, which would silently truncate your value." },
      { q: "What is .env.example for?", a: "It is a template with the same keys but empty or placeholder values, committed to the repo so new developers know which variables to set without seeing real secrets." },
      { q: "Is my data sent to a server?", a: "No. Everything is generated locally in your browser, which is exactly what you want for a tool that handles secrets and API keys." },
      { q: "Is this tool free?", a: "Yes, completely free with no signup and no limits on how many files you generate." }
    ],
    tags: [
      "env generator", "env file generator", "dotenv generator", ".env generator",
      "generate env file", "create .env file online", "env file maker",
      "environment variables generator", "env example generator", ".env.example generator",
      "dotenv file creator", "make dotenv file", "env config generator",
      "nodejs env generator", "react env file generator", "nextjs env file",
      "python dotenv generator", "laravel env generator", "docker env file generator",
      "vite env variables", "env variable formatter", "env key validator",
      "free env generator", "env generator online free", "env generator no signup",
      "how to create a .env file", "how to write env variables", "env file syntax",
      "dotenv format rules", "quoting env values", "env file best practices",
      "keep secrets out of git", "env file template", "env template generator",
      "api key config generator", "database url env", "env variable naming",
      "generate env example file", "env.example template", "document env variables",
      "12 factor app config", "environment config tool", "devops env tool",
      "local development env", "secrets management basics", "env file checker",
      "validate env file", "env variable linter", "dotenv validator online",
      "create env file for project", "starter env file", "env boilerplate generator"
    ],
  };

export default seo;
