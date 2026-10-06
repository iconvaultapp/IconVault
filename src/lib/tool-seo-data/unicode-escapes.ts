import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "Unicode Escapes - Free Online Escape Code Tool | IconVault",
    metaDescription: "Convert text to Unicode escapes: U+XXXX, backslash-u XXXX, backslash-U XXXXXXXX and HTML entities. Free, instant, runs in your browser.",
    about: [
      "**IconVault**'s **Unicode Escapes** converts any text into **Unicode escape sequences** instantly. Paste a string and get it as **U+XXXX** notation, **backslash-u XXXX** (JavaScript, Java, JSON), **backslash-U XXXXXXXX** (Python) and **HTML hex entities**, ready to paste into your code or markup.",
      "It handles emoji and astral-plane characters correctly, and the tool is **free** and **runs fully in your browser**, so your text never leaves your device."
    ],
    faqs: [
      { q: "What is a Unicode escape?", a: "It is a way to write a character as its code point in plain ASCII, like \\u0041 for the letter A. It is used when a file encoding cannot represent the character directly." },
      { q: "When do I need Unicode escapes?", a: "Common cases: embedding special characters in JSON, writing non-ASCII strings in source files with ASCII-only encodings, escaping characters in regexes, and representing invisible characters in code." },
      { q: "What is the difference between \\u and \\U?", a: "\\uXXXX encodes a 4-digit code point and is used in JavaScript, Java and JSON. \\UXXXXXXXX encodes an 8-digit code point and is used in Python. The tool supports both." },
      { q: "Does it handle emoji correctly?", a: "Yes. Emoji live outside the basic multilingual plane, and the converter handles surrogate pairs and full code points properly instead of producing broken output." },
      { q: "Is my text uploaded anywhere?", a: "No. Conversion runs fully in your browser, so your text stays on your device." },
      { q: "Is the Unicode escape tool free?", a: "Yes, completely free with no signup. Convert as much text as you need." }
    ],
    tags: [
      "unicode escapes", "unicode escape converter", "text to unicode escape",
      "unicode to escape online", "convert to unicode escape", "unicode escape tool",
      "u+xxxx converter", "backslash u converter", "backslash u xxxx generator",
      "backslash u xxxxxxxx converter", "html entity converter", "unicode to html entity",
      "text to html entities online", "unicode code point converter", "string to unicode escapes",
      "js unicode escape", "python unicode escape", "java unicode escape",
      "escape unicode characters online", "unicode encoder online", "text to backslash u escapes",
      "emoji to unicode escape", "unicode escape decoder", "decode unicode escapes",
      "unicode escape sequences list", "free unicode tool", "online unicode converter",
      "convert special characters to escapes", "unicode escape generator", "text encoding converter",
      "unicode notation converter", "u plus notation converter", "html hex entity encoder",
      "decimal html entity converter", "unicode escape for url", "unicode in json escapes",
      "json unicode escape", "programming unicode escapes", "unicode escape table",
      "convert accented characters unicode", "non ascii to unicode escape",
      "ascii to unicode converter", "unicode escape online free", "string escape tool",
      "code point to escape",
      "unicode escape online converter", "convert string to unicode",
      "backslash u escape codes", "unicode escape python online",
      "unicode escape javascript tool", "u code converter"
    ],
  };

export default seo;
