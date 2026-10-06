import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "Fluid Typography - Free Online Design Tool | IconVault",
    metaDescription: "Generate responsive clamp() font sizes with min/max ranges. Free fluid type scale generator, runs fully in your browser.",
    about: [
      "**IconVault**'s **Fluid Typography** generator creates **responsive font sizes** that scale smoothly between breakpoints using the modern CSS **clamp()** function. Set your minimum and maximum font size and viewport range, and it outputs a ready-to-paste clamp() declaration. It is free and runs fully in your browser.",
      "Fluid type replaces stacks of **media queries** with a single line that grows text proportionally as the screen widens, keeping headings readable on phones and impactful on desktops. The tool validates your ranges so the generated **clamp()** is always mathematically sound."
    ],
    faqs: [
      { q: "What is fluid typography?", a: "Fluid typography is text sizing that scales continuously with the viewport width instead of jumping between fixed sizes at media-query breakpoints, usually implemented with the CSS clamp() function." },
      { q: "How does CSS clamp() work?", a: "clamp(min, preferred, max) picks a middle preferred value that scales with the viewport but never goes below min or above max. A common pattern is clamp(1rem, 2vw + 1rem, 2.5rem)." },
      { q: "Why use clamp() instead of media queries?", a: "One clamp() line replaces several media queries, scales smoothly at every in-between screen size, and keeps type proportional on the growing number of device widths." },
      { q: "What ranges should I enter?", a: "Pick a minimum size that stays readable on a 360px phone, a maximum for large desktops, and the viewport widths between which the size should interpolate. The tool flags invalid ranges before generating." },
      { q: "Can I copy the generated CSS?", a: "Yes, the clamp() output is ready to copy and paste into your stylesheet." },
      { q: "Is this tool free?", a: "Yes, completely free with no signup and no limits." }
    ],
    tags: [
      "fluid typography", "fluid typography generator", "fluid type generator",
      "clamp generator", "css clamp generator", "clamp() calculator",
      "responsive font size generator", "fluid font size", "responsive typography tool",
      "viewport based font size", "scalable typography css",
      "generate clamp css", "clamp css online", "css clamp tool",
      "fluid type scale", "responsive type scale", "modular scale fluid",
      "typography calculator", "font size calculator responsive",
      "how to use css clamp", "clamp typography tutorial", "fluid type css tricks",
      "responsive headings css", "fluid h1 size", "responsive text without media queries",
      "free typography tool", "fluid typography free online", "typography generator no signup",
      "web typography tools", "css typography generator", "design tools online free",
      "clamp min max preferred", "clamp vw rem", "css clamp examples",
      "fluid font size formula", "linear interpolation font size css",
      "responsive design typography", "mobile typography best practices",
      "accessible font sizing", "readable font size mobile",
      "utopia fluid type", "fluid type scale calculator",
      "css locks generator", "viewport unit typography",
      "modern css typography", "css clamp browser support",
      "tailwind fluid typography", "fluid text tailwind",
      "responsive ui typography", "design system typography", "type scale generator"
    ],
  };

export default seo;
