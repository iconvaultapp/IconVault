import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "JS Set & Map Lab - Interactive Lab | IconVault",
    metaDescription: "Run ES2025 Set operations with live Venn diagrams: union, intersection, difference, symmetric difference, subset checks. Plus a Map playground.",
    about: [
      "**IconVault**'s **JS Set & Map Lab** makes the **ES2025 Set methods** click visually. Type two sets and pick an operation: **union**, **intersection**, **difference**, **symmetricDifference**, **isSubsetOf**, **isSupersetOf** or **isDisjointFrom**. The matching region lights up on a live **Venn diagram** while the real computed result appears beside it, using the native methods when your browser supports them and an honest manual fallback otherwise. It is free and runs fully in your browser, with copyable code for every operation.",
      "A second tab is a hands-on **Map playground**: add, look up and delete entries live, watch **size** update, and see iteration order in action. Side notes explain when to reach for **WeakMap** and **WeakSet** instead, so you leave knowing not just the API but which collection fits each job."
    ],
    faqs: [
      { q: "What are the new ES2025 Set methods?", a: "union, intersection, difference, symmetricDifference, isSubsetOf, isSupersetOf and isDisjointFrom. They accept any set-like (anything with size, has and keys) and return new Sets for the set-producing operations, so the originals are never mutated." },
      { q: "What is the difference between union and symmetric difference?", a: "Union contains everything in either set. Symmetric difference contains only elements in exactly one of the two sets, which is the same as (A union B) minus (A intersection B). Think of it as the XOR of sets." },
      { q: "When should I use a Set instead of an array?", a: "Use a Set when you need uniqueness guarantees, fast membership checks with has(), or set algebra like unions and intersections. Arrays win when you need ordering, duplicates, index access, or map/filter chains." },
      { q: "What is the difference between Map and a plain object?", a: "Maps accept any value as a key (including objects), preserve insertion order, track size directly, and have no prototype pollution risks. Plain objects coerce keys to strings and are better for fixed-shape records and JSON." },
      { q: "When should I use WeakMap or WeakSet?", a: "When keys should not keep objects alive: caches keyed by DOM nodes, private metadata attached to instances, or memoization tables. Entries disappear automatically once the key is garbage collected, which also means WeakMaps have no size property and cannot be iterated." },
      { q: "Do the Set methods mutate the original sets?", a: "No. union, intersection, difference and symmetricDifference all return brand new Set instances. The predicate methods isSubsetOf, isSupersetOf and isDisjointFrom return booleans. Your input sets are never modified." }
    ],
    tags: [
      "javascript set operations", "set union intersection javascript", "es2025 set methods",
      "symmetric difference javascript", "issubsetof javascript", "javascript map tutorial",
      "set vs array javascript", "weakmap vs map", "venn diagram javascript",
      "javascript set methods list", "how to use set in js", "map get set delete javascript",
      "javascript set difference", "union of two sets js", "intersection of arrays as sets",
      "javascript set has", "iterate map javascript", "javascript set union method",
      "set intersection method js", "difference of two sets javascript", "javascript set symmetricdifference",
      "isdisjointfrom javascript", "issupersetof javascript", "new set methods javascript 2025",
      "javascript set example", "when to use set javascript", "javascript unique values set",
      "array to set javascript", "set to array javascript", "javascript set foreach",
      "map vs object javascript", "javascript map methods", "weakset javascript",
      "javascript collection types", "es6 set map tutorial", "javascript set add delete",
      "check subset javascript", "disjoint sets javascript", "set algebra javascript",
      "javascript set interview questions", "map iteration order javascript", "object keys as map",
      "javascript dictionary map", "hashmap javascript", "javascript set performance",
      "unique array javascript set", "remove duplicates js set", "javascript set size",
      "map has method javascript", "javascript weakmap example", "set of objects javascript",
      "javascript set equality", "compare two sets javascript"
    ],
  };

export default seo;
