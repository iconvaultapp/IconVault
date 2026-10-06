import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "JS Execution Context - Hoisting, Closures, this | IconVault",
    metaDescription: "Animated walkthroughs of hoisting, closures and this-binding. Watch the context stack, creation vs execution phases and variable environments. Free.",
    about: [
      "**IconVault**'s **JS Execution Context** visualizer turns JavaScript's invisible machinery into a step-by-step animation. Three lessons cover **hoisting** and the temporal dead zone, **closures** that keep outer scopes alive, and **this-binding** across method calls, detached functions and arrow callbacks.",
      "Each step highlights the running code line, shows the **execution context stack** with **creation** and **execution** phases, and renders every **variable environment** so you can see bindings change. Everything is **free** and runs fully in your browser: perfect for interviews, teaching or finally understanding closures.",
    ],
    faqs: [
      {
        q: "What is an execution context in JavaScript?",
        a: "It is the environment a piece of code runs in, holding its variable bindings, scope chain and this value. Every function call pushes a new context onto the stack; when it returns, the context is popped.",
      },
      {
        q: "What happens in the creation phase vs the execution phase?",
        a: "In the creation phase the engine allocates memory for declarations: var gets undefined, function declarations get the whole function, and let/const enter the temporal dead zone. In the execution phase code runs line by line and assignments happen.",
      },
      {
        q: "Why can I use a function before its declaration?",
        a: "Function declarations are fully hoisted during the creation phase, so the binding already holds the complete function before any code runs. Only declarations hoist this way, not function expressions assigned to variables.",
      },
      {
        q: "What is the temporal dead zone?",
        a: "The period between a let's or const's scope starting and its declaration line executing. Reading the variable there throws a ReferenceError, unlike var, which simply yields undefined.",
      },
      {
        q: "How do closures keep variables alive?",
        a: "When an inner function is returned, it carries a reference to its outer variable environment. The environment cannot be garbage collected while the function exists, so the variables persist between calls.",
      },
      {
        q: "Is the execution context visualizer free?",
        a: "Yes. All three lessons and the step animations are free in your browser, with 5 free walkthroughs per tool before Pro is suggested.",
      },
    ],
    tags: [
      "javascript execution context", "execution context", "js hoisting",
      "hoisting javascript", "temporal dead zone", "tdz javascript",
      "javascript closures", "closure explained", "how closures work",
      "javascript this", "this keyword javascript", "this binding",
      "arrow function this", "javascript scope", "scope chain",
      "variable environment", "lexical environment", "global execution context",
      "function execution context", "call stack", "creation phase",
      "execution phase", "var vs let vs const", "let const hoisting",
      "function declaration vs expression", "javascript interview questions",
      "closures interview", "this interview questions", "hoisting interview",
      "learn javascript deeply", "javascript internals", "how javascript works",
      "javascript engine", "javascript runtime", "scope javascript",
      "block scope", "function scope", "global scope",
      "closure examples", "closure use cases", "private variables closure",
      "this in methods", "this lost javascript", "bind call apply",
      "detached method this", "settimeout this", "event handler this",
      "arrow vs regular function", "lexical this", "javascript visualizer",
      "execution context diagram", "hoisting diagram", "closure diagram",
      "javascript step by step", "javascript for beginners advanced",
    ],
  };

export default seo;
