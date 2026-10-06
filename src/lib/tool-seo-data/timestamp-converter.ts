import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "Timestamp Converter - Epoch to Date & Back Free | IconVault",
    metaDescription:
      "Convert Unix timestamps to readable dates and back. Seconds or milliseconds, UTC, local time and relative time - free, in your browser.",
    about: [
      "**IconVault**'s **Timestamp Converter** translates **Unix** **epoch** timestamps into human-readable dates - and **back** again. Paste an **epoch** value - the tool auto-detects seconds, milliseconds, microseconds or nanoseconds by digit length - and instantly see the UTC ISO string, your local **time** and a relative phrase like “3 hours ago”, or pick any **date** and **time** to get its **epoch** seconds and milliseconds for APIs and databases. A two-way duration calculator converts seconds to and from 1d 2h 3m 4s notation.",
      "Everything is computed locally in your browser - no API calls, no rounding errors from a server, and it works with the full JavaScript **date** range. A Now button fills the current **time** in one click, and every result is click-to-copy. Every visitor gets 5 **free** conversions - **IconVault** Pro ($12/year) unlocks unlimited use of every developer tool.",
    ],
    faqs: [
      {
        q: "How do I convert a timestamp to a date?",
        a: "Paste the epoch number, choose seconds or milliseconds, and hit Convert. You get the UTC ISO string, the time in your local timezone, and a relative phrase like “2 days ago”.",
      },
      {
        q: "How do I convert a date to a timestamp?",
        a: "Use the Date → epoch panel: pick a date and time with the datetime picker and hit Convert to epoch. You get both epoch seconds (for most APIs) and milliseconds (for JavaScript).",
      },
      {
        q: "What's the difference between seconds and milliseconds?",
        a: "Most Unix systems and APIs use seconds since 1970-01-01 (e.g. 1758872345), while JavaScript's Date uses milliseconds (e.g. 1758872345123). The unit toggle converts your input correctly either way.",
      },
      {
        q: "Why does my timestamp look wrong?",
        a: "The classic bug: you have seconds but treated them as milliseconds (or the reverse). A 10-digit number is seconds; a 13-digit number is milliseconds. Switch the unit toggle and convert again.",
      },
      {
        q: "Does it use my timezone?",
        a: "Yes - the Local row shows the timestamp in your browser's timezone, while UTC ISO is always timezone-neutral. Use ISO when comparing times across teams.",
      },
      {
        q: "How many free conversions do I get?",
        a: "Every visitor gets 5 free timestamp conversions with no account needed. IconVault Pro ($12/year) gives unlimited conversions plus unlimited use of all 10+ developer tools.",
      },
    ],
    tags: [
      "timestamp converter", "epoch converter", "unix timestamp converter",
      "epoch to date", "date to epoch", "timestamp to date", "convert epoch to date",
      "unix timestamp to date", "epoch time converter", "timestamp decoder",
      "epoch decoder", "epoch to datetime", "datetime to epoch",
      "unix time converter", "epoch milliseconds to date", "epoch seconds to date",
      "timestamp to datetime", "timestamp to iso", "epoch to iso",
      "convert timestamp online", "timestamp converter online free",
      "epoch converter online", "unix epoch converter", "timestamp translator",
      "read epoch timestamp", "human readable timestamp", "timestamp reader",
      "epoch time now", "current epoch time", "current unix timestamp",
      "epoch now seconds", "epoch now milliseconds", "timestamp relative time",
      "epoch to relative time", "timestamp to utc", "epoch to utc",
      "timestamp timezone converter", "epoch timezone", "local time to epoch",
      "javascript timestamp converter", "js date to epoch", "date.now converter",
      "10 digit timestamp", "13 digit timestamp", "seconds vs milliseconds timestamp",
      "epoch milliseconds converter", "timestamp converter dev tool",
      "epoch converter no signup", "browser timestamp converter",
      "private timestamp converter", "timestamp converter for developers",
      "api timestamp converter", "database timestamp converter",
      "mysql timestamp converter", "postgres epoch converter",
      "timestamp to gmt", "epoch to gmt", "timestamp checker",
    ],
  };

export default seo;
