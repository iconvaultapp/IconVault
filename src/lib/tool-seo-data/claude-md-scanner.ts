import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "CLAUDE.md Scanner - Free Online Tool | IconVault",
    metaDescription: "Free CLAUDE.md scanner: find leaked secrets, dangerous commands and risky agent rules with a 0-100 safety score. Runs in your browser.",
    about: [
      "**IconVault**'s **CLAUDE.md Scanner** audits your agent instruction files for **leaked secrets**, **dangerous commands** and **overly permissive rules**, all with hand-written heuristic pattern checks. Paste your CLAUDE.md or load a .md file, hit scan, and get a **0-100 safety score** with a grade, plus every finding listed by severity, line number and fix advice.",
      "It catches real mistakes fast: **AWS keys, GitHub tokens and API keys** left in configs, **curl piped to bash**, **rm -rf** instructions, blanket **sudo** or **never ask for confirmation** rules, and classic **prompt-injection** phrases. Everything is **free** and runs fully in your **browser**, so your config never leaves your device. Note this is a first pass, not a full security audit.",
    ],
    faqs: [
      { q: "What does the CLAUDE.md Scanner check for?", a: "Three groups: secret exposure (API keys, tokens, private keys, credentials in URLs), dangerous commands (rm -rf, curl piped to shell, sudo, chmod 777, force pushes), and overly permissive rules (never ask for confirmation, always use sudo, auto-push, disable security). It also flags possible prompt-injection phrases." },
      { q: "How is the 0-100 score calculated?", a: "Every file starts at 100. Critical findings subtract 20, high subtract 10, medium subtract 5 and low subtract 2. The grade runs A (90+) down to F (below 40)." },
      { q: "Is my config uploaded anywhere?", a: "No. The entire scan runs in your browser with local pattern matching. Nothing you paste is sent to any server." },
      { q: "Does a clean score mean my file is safe?", a: "No. The scanner uses heuristic patterns and catches common mistakes fast, but it cannot see everything. Manually review any secrets you are unsure about and treat a clean score as a first pass only." },
      { q: "Can it scan files other than CLAUDE.md?", a: "Yes. Any agent config or instruction file works: AGENTS.md, .cursorrules, system prompts, or plain text docs. Just paste the content or load the file." },
      { q: "Is the scanner free?", a: "Yes, completely free with no sign-up, and you can copy the scan report to share with your team." },
    ],
    tags: [ "claude md scanner", "CLAUDE.md security check", "scan CLAUDE.md", "agent config scanner", "ai agent security audit", "claude code security", "check claude md for secrets", "claude md best practices", "leaked api key checker", "secret scanner online", "find api keys in text", "github token leaked check", "aws key scanner", "private key detector", "dangerous command checker", "curl bash detector", "rm rf warning", "prompt injection detector", "ai agent config audit", "cursorrules security", "agents md scanner", "claude code config check", "llm agent safety", "ai coding assistant security", "check config for secrets", "api key exposure checker", "token leak scanner", "bearer token finder", "env secret checker", "claude md linter", "agent instructions audit", "ai agent permissions check", "sudo in agent config", "overly permissive agent rules", "claude code safety", "scan markdown for secrets", "config file security scan", "free secret scanner", "online secret detector", "api key leak prevention", "pre commit secret scan alternative", "claude md review tool", "ai agent hardening", "secure claude code setup", "claude md dangerous patterns", "agent config best practices", "check for hardcoded secrets", "hardcoded password finder", "security score calculator", "config safety score", "ai agent risk assessment", "claude code tips security" ],
  };

export default seo;
