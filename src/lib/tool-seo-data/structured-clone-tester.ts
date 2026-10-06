import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "Structured Clone Tester - Free Online Tool | IconVault",
    metaDescription: "See what survives structuredClone() across 28 types: Map, Set, Date, Blob, Error, functions and more. Free.",
    about: [
      "**IconVault**'s **Structured Clone Tester** runs your browser's real **structuredClone()** against **28 value types** and shows exactly what survives: **Map, Set, Date, RegExp, typed arrays, ArrayBuffer, Blob, File, Error, DOMException**, circular references and more. It is completely **free** and runs fully in your browser.",
      "Each test is badged **Survives**, **Changed** or **Throws**, with a plain-English note about what happened. Copy the full report for documentation or debugging. If you have ever wondered why JSON.parse(JSON.stringify(x)) mangles your data, this shows you the better way.",
    ],
    faqs: [
      { q: "Is the Structured Clone Tester free?", a: "Yes. It runs entirely in your browser with a daily quota for guests and unlimited tests for Pro users." },
      { q: "What does structuredClone() do?", a: "It deep-clones a value using the browser's structured serialization algorithm, the same one used by postMessage and IndexedDB. It handles types JSON cannot, like Map, Set, Date and circular references." },
      { q: "Does structuredClone work on functions?", a: "No. Functions and symbols are not serializable and throw a DataCloneError. The tester demonstrates this live." },
      { q: "What happens to class instances?", a: "Own properties are cloned, but the prototype is dropped, so methods are lost. The tester flags this as Changed." },
      { q: "Can it clone circular objects?", a: "Yes. Unlike JSON.stringify, structuredClone handles circular references correctly, preserving the graph shape." },
      { q: "Is structuredClone supported in all browsers?", a: "It is supported in all modern browsers: Chrome 98+, Firefox 94+, Safari 15.4+ and Edge 98+. The tests run against your own browser, so results reflect your environment." },
    ],
    tags: ["structuredclone tester", "structuredclone", "structured clone javascript", "what survives structuredclone", "structuredclone vs json", "deep clone javascript", "javascript deep copy", "structuredclone map set", "structuredclone date", "structuredclone blob", "structuredclone file", "structuredclone error", "structuredclone circular", "structuredclone function throws", "datacloneerror", "js clone object deeply", "structuredclone browser support", "structured serialization", "postmessage clone algorithm", "indexeddb structured clone", "deep copy map javascript", "deep copy set javascript", "clone date object js", "clone regexp javascript", "typed array clone", "arraybuffer clone", "clone class instance js", "structuredclone symbol", "structuredclone undefined", "structuredclone bigint", "structuredclone nan", "does structuredclone copy functions", "structuredclone domexception", "structuredclone nested objects", "javascript clone utility", "deep clone without lodash", "structuredclone performance", "clone blob javascript", "clone file object js", "structuredclone test page", "js value types clone", "structuredclone explained", "deep copy vs shallow copy js", "structuredclone limitations", "what can structuredclone clone", "structuredclone docs", "mdn structuredclone", "javascript serialization types", "clone formdata structuredclone", "worker postmessage clone"],
  };

export default seo;
