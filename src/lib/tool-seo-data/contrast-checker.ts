import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "Contrast Checker - WCAG AA & AAA Ratio Tool | IconVault",
    metaDescription:
      "Check text-to-background contrast ratios against WCAG 2.1. Live preview, AA/AAA pass-fail badges, one-click color swap and an auto-suggest fix for failing pairs - free in your browser.",
    about: [
      "**IconVault**'s **Contrast Checker** computes the **WCAG** 2.1 **contrast** **ratio** between any **text** and background **color** - the number that decides whether your **text** is readable for everyone, including the 1 in 12 men with **color**-vision deficiency. It renders a live preview of your exact pairing and scores it against all four bars: AA normal, AA large, **AAA** normal and **AAA** large. Ratios recalculate live as you type, a swap button flips foreground/background, and “Suggest AA fix” auto-nudges your **text** **color** to the nearest passing shade.",
      "Everything runs in your browser with zero uploads. Every visitor gets 5 free checks - Pro members ($12/year) get unlimited checks plus unlimited use of the **Color** Converter, Box Shadow Generator and every other **IconVault** **tool**.",
    ],
    faqs: [
      {
        q: "What is a good contrast ratio?",
        a: "WCAG AA requires at least 4.5:1 for normal text and 3:1 for large text (18pt+ or 14pt+ bold). AAA - the strictest level - requires 7:1 for normal text and 4.5:1 for large text. The checker shows all four as pass/fail badges.",
      },
      {
        q: "How do I check contrast between two colors?",
        a: "Enter or pick your text color and background color, then press Check contrast. The tool computes the WCAG relative luminance of both colors, derives the ratio, and scores it - all in under a second.",
      },
      {
        q: "Why does my light gray text fail?",
        a: "Light grays on white backgrounds almost always fall under 4.5:1 - for example #9ca3af on white is about 3.5:1. Darken the text or the background until the checker shows a passing badge.",
      },
      {
        q: "Does this follow the WCAG formula?",
        a: "Yes. It implements the exact WCAG 2.1 relative-luminance formula - linearized sRGB channels weighted 0.2126 / 0.7152 / 0.0722 - and the (L1 + 0.05) / (L2 + 0.05) ratio, the same math auditors and linters like axe use.",
      },
      {
        q: "How many free checks do I get?",
        a: "Every visitor gets 5 free contrast checks, no account needed. IconVault Pro ($12/year) unlocks unlimited checks and every other tool.",
      },
      {
        q: "Is the preview accurate?",
        a: "The preview renders your exact hex colors as text on background, so what you see is what the ratio measures. It runs entirely client-side, so nothing you test is uploaded anywhere.",
      },
    ],
    tags: [
      "contrast checker", "color contrast checker", "wcag contrast checker", "contrast ratio checker",
      "accessibility contrast checker", "text contrast checker", "check color contrast",
      "wcag aa checker", "wcag aaa checker", "contrast ratio calculator",
      "color contrast ratio", "web accessibility checker", "aa contrast checker",
      "4.5:1 contrast checker", "7:1 contrast checker", "color contrast tester",
      "contrast checker online free", "website contrast checker", "ui contrast checker",
      "text background contrast", "readability checker colors", "color blindness contrast checker",
      "accessible color combinations", "wcag 2.1 contrast", "contrast checker for designers",
      "contrast checker for developers", "figma contrast checker alternative", "tailwind contrast checker",
      "check contrast of hex colors", "hex contrast ratio", "rgb contrast ratio calculator",
      "large text contrast requirement", "normal text contrast requirement", "aa large text contrast",
      "color contrast guidelines", "minimum contrast ratio wcag", "contrast checker no signup",
      "dark mode contrast checker", "light mode contrast checker", "button contrast checker",
      "link color contrast", "placeholder text contrast", "gray text contrast ratio",
      "white text on color background contrast", "black text contrast", "contrast checker tool",
      "online accessibility checker color", "ada color contrast", "section 508 contrast checker",
      "design system contrast", "token contrast checker", "brand color accessibility",
      "contrast checker api alternative", "free axe contrast alternative", "color contrast pass fail",
      "improve text readability colors", "fix low contrast text", "contrast ratio explained",
    ],
  };

export default seo;
