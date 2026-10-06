import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "TS Error Decoder - Interactive Lab | IconVault",
    metaDescription: "Paste any TypeScript error code and get a plain-English explanation with a copyable fix. Free, in-browser.",
    about: [ "**IconVault**'s **TS Error Decoder** translates cryptic compiler messages into plain English. Search **40 common error codes** like TS2322, TS2345 or TS18048, read why TypeScript is complaining in human terms, see a **typical trigger**, and copy the **fix**. The whole database lives in the page, so it works offline and instantly.", "Everything is **free** and runs **fully in your browser**: no signup, no pasted code ever leaves your device. Type just the number (2322), a code (TS2322), or describe the problem (not assignable) and the decoder finds it." ],
    faqs: [
      { q: "What does TS2322 mean?", a: "Type X is not assignable to type Y: you handed a value to a spot expecting a different shape. Read the two types in the message, the first is what you gave, the second is what was wanted, then convert or widen the target type." },
      { q: "What does TS18048 mean?", a: "The value is possibly undefined. Strict mode noticed an optional chain, array index or Map.get that can be undefined. Add a guard instead of assuming it exists." },
      { q: "How do I fix 'Object is possibly undefined'?", a: "Guard it with an if check, use optional chaining, or throw early after find(). Only use the non-null assertion (!) when you can prove it is defined." },
      { q: "What does TS2307 cannot find module mean?", a: "The import path is wrong, the file does not exist, or the package has no types. Fix the relative path, or add a declare module shim for untyped packages." },
      { q: "Why do I get TS errors only in strict mode?", a: "Strict mode turns on checks like strictNullChecks and noImplicitAny that catch real bugs. The fixes here assume strict is on, which is the recommended setup." },
      { q: "Is this decoder free?", a: "Yes, completely free, and it runs entirely in your browser with nothing uploaded." },
    ],
    tags: ["typescript error", "typescript errors", "ts error", "typescript error codes", "ts2322", "ts2345", "ts18048", "ts2532", "ts2339", "ts2307", "ts2304", "ts2554", "ts7053", "ts7006", "ts6133", "ts2769", "ts2740", "ts2571", "typescript error decoder", "typescript error explained", "typescript error fix", "what does ts2322 mean", "type x is not assignable to type y", "object is possibly undefined", "cannot find module typescript", "cannot find name typescript", "property does not exist on type", "argument of type x is not assignable", "expected arguments but got", "no overload matches this call", "implicitly has an any type", "parameter implicitly has any type", "block scoped variable used before declaration", "cannot redeclare block scoped variable", "variable used before being assigned", "declared but never read", "all imports are unused", "not all code paths return a value", "has no initializer typescript", "incorrectly implements interface", "dynamic import must have string literal", "unknown type typescript", "typescript unknown vs any", "typescript strict mode errors", "fix typescript errors", "typescript troubleshooting", "typescript cheat sheet", "typescript for beginners", "learn typescript", "free typescript tool"],
  };

export default seo;
