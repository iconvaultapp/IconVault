import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "Reading Time - Interactive Tool | IconVault",
    metaDescription: "Reading and speaking time calculator with per-section analysis, Flesch readability scores, and a Medium-style min-read badge. Free.",
    about: [ "**IconVault**'s **Reading Time** calculator goes beyond a single number. Paste your article to get **reading time** at your own words-per-minute, **speaking time** for narration or video scripts, and a **per-section breakdown** that shows which headings run long. It is free and runs fully in your browser.", "The tool also scores readability with **Flesch Reading Ease** and grade level, gives you a plain-English verdict on density, and generates a Medium-style **\"min read\" badge** as a downloadable SVG for your article header. Tune the speed sliders to match your audience, from skimmers to careful readers." ],
    faqs: [
      { q: "How is reading time calculated?", a: "Word count divided by your reading speed in words per minute, adjustable from 100 to 400. The default of 225 wpm matches average adult on-screen reading speed." },
      { q: "What is the speaking time for?", a: "It estimates how long the text takes to read aloud at a speaking pace (default 140 wpm), useful for video scripts, podcasts, and presentations." },
      { q: "How does per-section analysis work?", a: "The text is split on markdown headings (# Title). Each section gets its own word count and time with a bar showing its share of the article, so long sections stand out instantly." },
      { q: "What is the Flesch Reading Ease score?", a: "A 0 to 100 scale where higher means easier to read. Scores of 60 to 70 are plain English. It is computed from average sentence length and syllables per word, so treat it as a guide, not gospel." },
      { q: "What is the min-read badge?", a: "A small SVG badge like the ones on Medium article headers, showing your computed reading time. Download it or copy the SVG markup and drop it into your article template." },
      { q: "Is my text uploaded?", a: "No. All counting, scoring, and badge generation happen locally in your browser." },
    ],
    tags: [ "reading time calculator", "reading time", "article reading time", "blog reading time calculator", "words per minute reading", "reading speed calculator", "speaking time calculator", "how long to read", "read time estimator", "medium reading time", "min read badge", "reading time badge", "reading time widget", "flesch reading ease", "flesch kincaid calculator", "readability score calculator", "readability checker", "reading level checker", "grade level calculator text", "flesch score online", "content readability", "blog post length", "ideal blog post length", "article word count", "word count to minutes", "words to minutes read", "speech time calculator", "narration time estimator", "video script timing", "podcast script length", "words per minute speaking", "average reading speed", "reading speed wpm", "per section word count", "heading word count", "analyze article structure", "content analysis tool", "writing analytics", "editorial tools", "content editor tools", "blogging tools free", "writer tools online", "medium style badge", "svg badge generator", "read time svg", "seo content length", "readability for seo", "plain english checker", "text difficulty score", "syllable counter" ],
  };

export default seo;
