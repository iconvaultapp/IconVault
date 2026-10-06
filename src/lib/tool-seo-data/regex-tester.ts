import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "Regex Tester - Test Regular Expressions Online Free | IconVault",
    metaDescription:
      "Test JavaScript regular expressions live in your browser. Live match highlighting, flag toggles, capture-group inspection and find-and-replace with $1 group references - free, no signup.",
    about: [
      "**IconVault**'s **Regex Tester** is a live workbench for **regular** **expressions**. Type your pattern, toggle flags like g, i, m, s, u and y, and paste a **test** string - matches are highlighted instantly, each match is listed with its index, and captured groups are shown one by one so you can see exactly what your pattern grabbed.",
      "It runs entirely in your browser using the real **JavaScript** RegExp engine, so what you **test** here behaves exactly like it will in your code. Invalid patterns get a clear red error message instead of silent failure, and you can copy the pattern as a ready-to-paste /pattern/flags literal. A built-in replace mode lets you **test** find-and-replace with $1-style backreferences before touching your code, a searchable cheat-sheet inserts common tokens with one click, and a share button encodes pattern, flags and **test** text into a linkable URL. Every visitor gets 5 **free** tests - **IconVault** Pro ($12/year) unlocks unlimited use of every developer tool.",
    ],
    faqs: [
      {
        q: "How do I test a regex pattern?",
        a: "Type your pattern in the pattern field, pick the flags you need, and paste or write a test string. Hit Test and every match is highlighted in your text with match indexes and captured groups listed below.",
      },
      {
        q: "What regex flavor does the tester use?",
        a: "JavaScript's RegExp engine - the same one your browser and Node.js use. Patterns you validate here behave identically when you drop them into JS or TypeScript code.",
      },
      {
        q: "Why is my pattern showing an error?",
        a: "The tester compiles your pattern with new RegExp() and shows the engine's exact error message in red - unbalanced brackets, stray backslashes and invalid flags are the usual suspects.",
      },
      {
        q: "How do captured groups work here?",
        a: "Each match's groups are listed under Match details as group 1, group 2 and so on, with their exact captured text. It's the fastest way to check that (.*?) is grabbing what you think it is.",
      },
      {
        q: "Do I need the global flag to see all matches?",
        a: "No - the tester always scans the whole test string and shows every match, whether or not you enabled the g flag. Enable it anyway if you're copying the pattern into real code.",
      },
      {
        q: "How many free tests do I get?",
        a: "Every visitor gets 5 free regex tests with no account needed. IconVault Pro ($12/year) gives unlimited tests plus unlimited use of all 10+ developer tools.",
      },
    ],
    tags: [
      "regex tester", "regex tester online", "test regex", "regex tester free",
      "javascript regex tester", "js regex tester", "regex checker", "regex validator",
      "regex matcher", "regex debugger", "regex playground", "regex online",
      "test regular expression", "regex test online free", "regex checker online",
      "regex match tester", "regex101 alternative", "regex visualizer",
      "regex highlight matches", "regex capture groups", "regex flags tester",
      "regex pattern tester", "validate regex pattern", "regex error checker",
      "regex syntax checker", "online regex debugger", "regex builder online",
      "regex practice tool", "learn regex online", "regex examples tester",
      "email regex tester", "phone regex tester", "url regex tester",
      "regex for javascript", "js regex test", "es regex tester",
      "regex multiline test", "regex global flag test", "regex unicode test",
      "regex sticky flag", "regex dotall test", "private regex tester",
      "regex tester no signup", "browser regex tester", "regex tester for developers",
      "regex test string", "regex match groups", "regex group viewer",
      "regex index viewer", "copy regex literal", "regex pattern validator online",
      "regex cheatsheet tester", "regex sandbox", "regex workbench",
      "javascript regexp tester", "new regexp test", "regex exec tester",
      "regex replace tester", "regex search tester", "regex online tool free",
    ],
  };

export default seo;
