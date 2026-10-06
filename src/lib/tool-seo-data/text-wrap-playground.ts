import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "CSS text-wrap - Interactive Lab | IconVault",
    metaDescription: "Compare CSS text-wrap balance vs pretty vs stable side by side with live controls. Free, runs in your browser.",
    about: [ "**IconVault**'s **CSS text-wrap** playground puts **balance**, **pretty** and **stable** side by side so you can see the difference instead of reading about it. Type your own headline, drag the **width slider**, and watch each mode reflow live: balanced lines for headings, orphan-free paragraphs for body copy, and shift-free editing for inputs.", "It is **free** and runs **fully in your browser**. One click copies the three-line CSS you actually need, and the lab notes browser support honestly: `stable` needs a recent Chromium, the other modes degrade to normal wrapping where unsupported." ],
    faqs: [
      { q: "What does text-wrap: balance do?", a: "It distributes text across lines so every line is roughly equal length, instead of a full first line and a sad two-word last line. It is ideal for headings, cards and short blocks." },
      { q: "What does text-wrap: pretty do?", a: "It wraps like normal text but takes extra care with the last line, avoiding orphans (a single word stranded alone). Best for paragraphs of body copy." },
      { q: "What does text-wrap: stable do?", a: "It locks line breaks so editing text never reflows later lines. Useful for textareas and contenteditable regions where layout shift while typing is annoying." },
      { q: "Which browsers support text-wrap?", a: "balance and pretty work in all modern browsers. stable is newer and needs recent Chrome or Edge; unsupported browsers fall back to normal wrapping." },
      { q: "Is text-wrap better than <br> tags?", a: "Yes for responsive layouts. Manual line breaks look wrong at different widths, while text-wrap adapts automatically to any container size." },
      { q: "Is this tool free?", a: "Yes, free, running entirely in your browser with no signup." },
    ],
    tags: ["text-wrap", "css text-wrap", "text-wrap balance", "text-wrap pretty", "text-wrap stable", "text wrap css", "css text wrap", "balance text css", "how to balance text", "even lines css", "avoid orphans css", "orphan text css", "last line single word css", "headline wrapping css", "heading line breaks", "card title wrapping", "text-wrap browser support", "text-wrap stable support", "text wrap pretty support", "css text-wrap tutorial", "text-wrap example", "text-wrap demo", "compare text-wrap", "balance vs pretty", "text wrap playground", "css playground", "typography css", "better typography css", "css text balance", "text-wrap balance headings", "text-wrap pretty paragraphs", "contenteditable line breaks", "textarea layout shift", "prevent layout shift typing", "css one liners", "useful css properties", "modern css", "modern css features", "css text tricks", "responsive typography", "fluid typography css", "widow orphan css", "css widows orphans", "text wrapping explained", "css white space", "overflow wrap vs text-wrap", "word wrap css", "line break css", "free css tool", "css lab", "interactive css"],
  };

export default seo;
