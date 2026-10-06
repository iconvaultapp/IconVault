import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "CSS Color Lab - Free Online Design Tool | IconVault",
    metaDescription: "Experiment with color-mix(), oklch, relative colors, gamut mapping and palettes. Free, in your browser.",
    about: [
      "**IconVault**'s **CSS Color Lab** is a hands-on playground for **modern CSS color**. Mix colors with **color-mix()**, convert any hex to **oklch** and build oklch colors from sliders, derive variants with **relative color syntax**, map out-of-gamut colors between **display-p3 and sRGB**, and generate **perceptually even palettes**. Every tab shows the exact **CSS to copy**. Completely **free** and runs fully in your browser.",
      "**All the math** (**sRGB, linear light, Oklab, display-p3**) is computed live in JavaScript, so the previews match what browsers render. It is the **fastest way** to learn the new color specs by playing with them.",
    ],
    faqs: [
      { q: "Is the CSS Color Lab free?", a: "Yes. Free in your browser with a daily quota for guests and unlimited experiments for Pro users." },
      { q: "What is color-mix()?", a: "A CSS function that blends two colors in a chosen color space, e.g. color-mix(in srgb, red 50%, blue). No more precomputing tints by hand." },
      { q: "What is oklch and why use it?", a: "oklch is a perceptual color space: lightness, chroma and hue map to how humans see color. Equal lightness steps look equally bright, which makes ramps and palettes far more even than HSL." },
      { q: "What are relative colors?", a: "Syntax like oklch(from red calc(l + 0.1) c h) that derives a new color from an existing one. Perfect for hover states and design tokens without hardcoding variants." },
      { q: "What does gamut mapping mean?", a: "Vivid oklch colors can fall outside what sRGB screens show. The lab shows the wide-gamut display-p3 rendering next to the clipped sRGB fallback browsers use." },
      { q: "Which browsers support these features?", a: "color-mix(), oklch and relative colors work in all modern browsers from 2023 onward (Chrome 111+, Safari 16.2+, Firefox 113+). display-p3 needs a wide-gamut screen to be visible." },
    ],
    tags: ["css color lab", "color-mix()", "color-mix css", "oklch", "oklch color picker", "oklch converter", "hex to oklch", "oklch to hex", "relative colors css", "css relative color syntax", "oklch from", "display-p3", "color display-p3", "gamut mapping", "srgb gamut", "wide gamut css", "p3 color css", "out of gamut color", "perceptual color palette", "oklch palette generator", "color palette generator", "modern css colors", "css color functions", "css color-mix example", "color-mix tutorial", "oklch tutorial", "oklch vs hsl", "why oklch", "lab vs oklch", "color spaces web", "srgb vs display-p3", "css color 4", "css color 5", "oklch lightness", "oklch chroma", "oklch hue", "color-mix in oklch", "mix colors css", "tint shade css", "design tokens colors", "color scale generator", "tailwind oklch", "oklch browser support", "color-mix browser support", "learn modern css color", "css color playground", "color science web", "wide gamut design", "p3 colors web design", "color contrast oklch", "accessible color palette", "free color tool"],
  };

export default seo;
