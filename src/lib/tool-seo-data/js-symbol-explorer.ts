import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "JS Symbol Explorer - Interactive Lab | IconVault",
    metaDescription: "Explore every well-known JavaScript symbol with runnable examples, flow diagrams and copyable code. Free, in-browser.",
    about: [
      "**IconVault**'s **JS Symbol Explorer** covers the twelve **well-known symbols** that wire JavaScript's protocols together, each with a runnable example and a step-by-step **flow diagram**. Run **Symbol.iterator** to make a custom object work with **for...of** and spread, watch **Symbol.toPrimitive** decide how your object converts to strings versus numbers, override **instanceof** with **Symbol.hasInstance**, or hook **String.prototype.replace** through **Symbol.replace**. It is free and runs fully in your browser, and every example is copyable.",
      "The explorer also covers the symbols people meet less often but hit in real code: **Symbol.species** controlling what **map** returns on subclasses, **Symbol.isConcatSpreadable** changing **concat** behavior, **Symbol.unscopables** hiding Array methods from **with** blocks, **Symbol.dispose** for explicit resource cleanup, **Symbol.metadata** for decorators, and the global registry pair **Symbol.for**/**Symbol.keyFor**."
    ],
    faqs: [
      { q: "What is a JavaScript Symbol?", a: "A primitive type whose values are guaranteed unique: Symbol() === Symbol() is always false. Symbols are used as property keys that cannot collide with string keys, which makes them ideal for protocol hooks the language itself defines." },
      { q: "What are well-known symbols?", a: "Built-in symbols like Symbol.iterator, Symbol.toPrimitive and Symbol.hasInstance that the JavaScript engine looks up to customize built-in behavior. Defining them on your objects plugs you into language protocols such as iteration, type conversion and instanceof." },
      { q: "How does Symbol.iterator work?", a: "for...of, spread syntax and destructuring all call obj[Symbol.iterator]() to get an iterator, then repeatedly call its next() until done is true. Any object implementing that method becomes iterable." },
      { q: "What is the difference between Symbol() and Symbol.for()?", a: "Symbol() creates a brand new unique symbol every time. Symbol.for(key) looks up a global registry shared across the whole realm (including iframes), returning the same symbol for the same key, and Symbol.keyFor reverses the lookup." },
      { q: "What is Symbol.dispose used for?", a: "It powers explicit resource management: a using declaration calls obj[Symbol.dispose]() automatically when the block scope exits, even if an exception is thrown. It is the deterministic cleanup for files, locks and subscriptions that garbage collection cannot provide." },
      { q: "When would I define Symbol.toPrimitive?", a: "When your object has a natural primitive representation that differs by context, like money formatting as $42.00 in strings but 42 in arithmetic. The engine calls it with a hint of string, number or default before falling back to valueOf and toString." }
    ],
    tags: [
      "javascript symbols", "symbol.iterator example", "well known symbols javascript",
      "symbol.tostringtag", "symbol.hasinstance", "symbol.toprimitive",
      "symbol.species", "symbol.replace", "symbol.asynciterator",
      "symbol.dispose", "javascript symbol.for", "symbol.keyfor",
      "symbol.isconcatspreadable", "symbol.unscopables", "symbol.metadata decorators",
      "javascript unique symbols", "global symbol registry", "js symbol tutorial",
      "what are symbols in javascript", "symbol match javascript", "symbol.split example",
      "custom instanceof javascript", "javascript iterator protocol symbol", "for of custom object",
      "javascript spread custom object", "symbol.tostringtag example", "object.prototype.tostring symbol",
      "symbol.species map subclass", "array subclass map returns", "concat spreadable false",
      "javascript with statement unscopables", "explicit resource management javascript",
      "using declaration javascript", "decorator metadata symbol", "javascript symbol registry",
      "symbol description javascript", "are symbols enumerable", "object.getownpropertysymbols",
      "reflect.ownkeys symbols", "javascript private properties symbol", "symbol vs string key",
      "well-known symbols list", "symbol.asynciterator for await", "async iterable javascript",
      "symbol.toprimitive hint", "valueof vs toprimitive", "custom type conversion javascript",
      "symbol.hasinstance example", "override instanceof", "javascript protocols explained",
      "iterable protocol javascript", "javascript meta programming symbols", "symbol.matchall",
      "symbol.replace regex", "string replace custom object", "javascript symbol interview questions"
    ],
  };

export default seo;
