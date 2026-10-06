import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "JS Property Descriptors - Interactive Lab | IconVault",
    metaDescription: "Toggle writable, enumerable and configurable on live properties, run real assign and delete attempts, and explore freeze and seal gotchas.",
    about: [
      "**IconVault**'s **JS Property Descriptors** lab makes the hidden flags behind every JavaScript property visible and touchable. Define properties with **writable**, **enumerable** and **configurable** toggles, then run real **assignment** and **delete** attempts to see what silently fails in sloppy mode and what throws a **TypeError** in strict mode. The live object shows **Object.keys**, **JSON.stringify** and spread behavior updating as you flip flags. It is free and runs fully in your browser, and your whole session exports as copyable code.",
      "A second section executes the classic **freeze and seal gotchas** live: pushing to a frozen array, mutating through a **shallow freeze**, sealing while still allowing writes, and the TypeError from redefining a **non-configurable** property. These are the exact behaviors that surprise developers in interviews and production bugs, demonstrated with running code instead of documentation quotes."
    ],
    faqs: [
      { q: "What are the writable, enumerable and configurable flags?", a: "Every JavaScript property has three boolean attributes. writable controls assignment, enumerable controls visibility in for...in, Object.keys and JSON.stringify, and configurable controls whether the property can be deleted or have its descriptor changed. Object.defineProperty sets them explicitly; plain assignment defaults them all to true." },
      { q: "Why does assignment to a frozen object fail silently sometimes?", a: "In sloppy mode, assigning to a non-writable property or adding a property to a non-extensible object is silently ignored. In strict mode (including all modules and classes) the same code throws a TypeError. This is one of the most common sources of confusion around Object.freeze." },
      { q: "What is the difference between Object.freeze and Object.seal?", a: "freeze makes every property non-writable and non-configurable and prevents new properties. seal only makes properties non-configurable and prevents new ones, so existing values can still be written. preventExtensions is the weakest: it only blocks adding new properties." },
      { q: "Is Object.freeze deep or shallow?", a: "Shallow. Freezing an object does not freeze the objects it references, so obj.nested.value can still be reassigned. Deep freezing requires a recursive walk, which you should only do deliberately because frozen objects cannot be unfrozen." },
      { q: "What does enumerable false actually hide?", a: "Non-enumerable properties are skipped by for...in, Object.keys, JSON.stringify and object spread, but they still exist: direct access, Object.getOwnPropertyNames and Object.getOwnPropertyDescriptor all see them. Built-in methods like Array.prototype.map use this to stay out of your loops." },
      { q: "When would I use Object.defineProperty directly?", a: "For computed accessor properties (get/set), for library APIs where you want read-only or hidden internals, for framework reactivity systems that intercept sets, and for precisely controlling property semantics that plain assignment cannot express." }
    ],
    tags: [
      "javascript property descriptors", "object.defineproperty tutorial", "writable enumerable configurable",
      "javascript object.freeze vs seal", "object.preventextensions", "configurable false javascript",
      "non enumerable property javascript", "object.getownpropertydescriptor", "defineproperty getter setter",
      "javascript accessor properties", "frozen object javascript", "seal vs freeze javascript",
      "object descriptors explained", "javascript property attributes", "why assignment fails frozen object",
      "strict mode typeerror assignment", "object.keys vs getownpropertynames", "javascript data descriptor vs accessor descriptor",
      "defineproperty example", "object.freeze array push", "cannot assign to read only property",
      "javascript property flags", "object.defineproperties", "how to make object immutable javascript",
      "javascript readonly property", "hidden properties javascript object", "enumerable true false",
      "object.seal example", "javascript const object still mutable", "deep freeze javascript",
      "shallow freeze javascript", "non configurable property", "cannot redefine property",
      "javascript descriptor object", "get set javascript object", "accessor descriptor example",
      "object.create property descriptors", "javascript property definition", "why use object.freeze",
      "immutable objects javascript", "javascript interview property descriptors", "defineproperty writable false",
      "object.keys missing properties", "json.stringify skips properties", "spread operator non enumerable",
      "for in skips properties", "javascript internal slots properties", "property descriptor defaults",
      "assignment vs defineproperty", "javascript strict mode assignment error", "typeerror cannot assign",
      "object extensible javascript", "reflect.defineproperty", "javascript meta programming properties"
    ],
  };

export default seo;
