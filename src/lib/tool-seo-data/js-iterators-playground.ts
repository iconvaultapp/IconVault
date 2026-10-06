import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "JS Iterators & Generators - Interactive Lab | IconVault",
    metaDescription: "Step through yield line by line, stream async generators, and build ES2025 Iterator helper pipelines live in your browser.",
    about: [
      "**IconVault**'s **JS Iterators & Generators** lab turns one of JavaScript's most misunderstood features into something you can watch happen. Start a generator and step through each **yield** one at a time: the current line highlights, the returned **{ value, done }** object appears in the execution log, and you can even send a value back into the paused generator with **next(value)** to see two-way communication in action. It is free and runs fully in your browser, with copyable code for everything you try.",
      "Two more playgrounds cover the rest of the story. The **async generator** demo streams values with real timed delays so you can see how **for await...of** pulls results instead of waiting for all of them. The **ES2025 Iterator helpers** builder lets you chain **map**, **filter**, **take** and **drop** on **Iterator.from()**, previewing the array after every step and generating the exact pipeline code to paste into your project. Native support is feature-detected, with an honest fallback note on older browsers."
    ],
    faqs: [
      { q: "What is the difference between an iterator and a generator?", a: "An iterator is any object with a next() method that returns { value, done }. A generator is a special function (declared with function*) that automatically creates an iterator when called. Each yield pauses the function and produces the next value, and the function resumes exactly where it left off." },
      { q: "What does generator.next(value) do with the argument?", a: "The argument becomes the result of the currently paused yield expression inside the generator. This two-way channel lets the consumer send data back in, which is how generators implement coroutines, state machines, and cooperative multitasking." },
      { q: "What are the ES2025 Iterator helpers?", a: "New methods on the Iterator prototype such as map, filter, take, drop, flatMap, reduce, toArray, some, every and find. They are lazy, meaning nothing executes until a terminal operation like toArray() pulls values through the chain, unlike Array methods which build intermediate arrays." },
      { q: "How do async generators work?", a: "An async generator (async function*) can await promises between yields and is consumed with for await...of. Each iteration waits for the next promise to settle, which makes them ideal for streaming paginated APIs, lines of a file, or live data feeds." },
      { q: "Which browsers support Iterator.from and the helper methods?", a: "Chrome 117+, Edge 117+, Safari 18+, Firefox 131+ and Node 22+. The lab detects support at runtime and falls back to manual computation so you can still explore the API on older browsers." },
      { q: "When should I use a generator instead of an array?", a: "Use generators for lazy or infinite sequences, step-by-step algorithms you want to pause and resume, and pipelines where building the full array would waste memory. If you need random access or the length up front, a plain array is simpler." }
    ],
    tags: [
      "javascript iterators", "js generators tutorial", "javascript generator yield explained",
      "how to use yield in javascript", "async generators javascript", "javascript iterator protocol",
      "es2025 iterator helpers", "iterator.from javascript", "javascript map filter take",
      "generator next value done", "javascript for of custom object", "symbol.iterator example",
      "javascript lazy evaluation", "generator vs iterator javascript", "async iterator javascript example",
      "javascript yield keyword tutorial", "how generators work javascript", "iterator helpers browser support",
      "javascript infinite generator", "generator function explained", "js iterator map filter",
      "take drop javascript iterator", "javascript generator send value next", "coroutine javascript generator",
      "async generator for await of", "javascript iterable vs iterator", "custom iterable javascript",
      "javascript generator return value", "yield star javascript", "delegation yield*",
      "javascript iterator helpers mdn", "es2025 features javascript", "javascript lazy sequences",
      "generator based state machine js", "javascript pagination generator", "how to iterate custom object js",
      "javascript iterator protocol explained", "symbol.asynciterator example", "javascript generator memory",
      "infinite sequence javascript generator", "js generator tutorial beginners", "javascript yield expression",
      "next() parameter javascript generator", "javascript async generator tutorial", "iterator helper methods list",
      "javascript from iterable to iterator", "generator throw method javascript", "javascript generator done true",
      "lazy map filter javascript", "javascript range generator", "js interview iterators generators",
      "javascript generator two way communication", "iterator take limit javascript", "javascript dropwhile takewhile"
    ],
  };

export default seo;
