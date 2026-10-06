import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "Web Animations Builder - Interactive Lab | IconVault",
    metaDescription: "Build element.animate() keyframes visually with live preview, then copy or download the code. Free, in-browser.",
    about: [ "**IconVault**'s **Web Animations Builder** turns the Web Animations API into a visual editor. Add **keyframes** at any offset, dial in **translate, rotate, scale, opacity and color** per keyframe, tune **duration, easing, iterations, direction and fill**, then hit play and watch it run on a real element via `element.animate()`. The generated code is **copy or download** ready.", "Everything is **free** and runs **fully in your browser**. Unlike CSS animations, WAAPI gives you playback control: play, pause, reverse and finish from JavaScript, plus promise-based `finished` handling, all visible in the exact code this lab generates." ],
    faqs: [
      { q: "What is the Web Animations API?", a: "A JavaScript API for animations, centered on element.animate(keyframes, options). It offers the power of CSS animations with full playback control: pause, reverse, playbackRate and the finished promise." },
      { q: "WAAPI vs CSS animations, which should I use?", a: "Use CSS for simple declarative animations. Use WAAPI when keyframes are dynamic, when you need playback control, or when coordinating animations with promises and async code." },
      { q: "What easing functions are available?", a: "All CSS easings work: ease, linear, cubic-bezier curves, plus steps(). WAAPI also supports per-keyframe easing for fine control over each segment." },
      { q: "How do I pause or reverse a WAAPI animation?", a: "animate() returns an Animation object. Call .pause(), .play(), .reverse(), or set .playbackRate. The finished promise resolves when it completes." },
      { q: "Which browsers support WAAPI?", a: "All modern browsers support element.animate(). Newer features like scroll-driven animations need recent Chrome or Edge, with Firefox and Safari catching up." },
      { q: "Is this builder free?", a: "Yes, free, running entirely in your browser with no signup." },
    ],
    tags: ["web animations api", "waapi", "waapi tutorial", "element.animate", "element animate example", "web animations api example", "javascript animation", "js animation library alternative", "keyframe animation javascript", "css animation vs waapi", "animation builder", "keyframe editor", "visual animation builder", "animation code generator", "generate animation code", "easing functions", "cubic-bezier", "animation iterations", "animation direction alternate", "animation fill mode", "animation.finished promise", "pause animation javascript", "reverse animation javascript", "playbackrate", "animation playback control", "scroll driven animations", "view timeline animation", "web animations api browser support", "waapi firefox", "waapi safari", "composite animations", "animation composite", "transform animation", "opacity animation", "color animation javascript", "animate transform", "requestanimationframe vs waapi", "gsap alternative", "framer motion alternative", "free animation tool", "animation playground", "learn web animations", "web animation examples", "ui animation", "microinteractions", "button hover animation code", "loading animation code", "waapi keyframes format", "web animations api mdn", "animate on scroll waapi"],
  };

export default seo;
