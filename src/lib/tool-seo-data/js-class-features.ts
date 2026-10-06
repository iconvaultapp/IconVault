import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "JS Class Features - Interactive Sandbox | IconVault",
    metaDescription: "Private fields, private methods, static blocks, getters and setters, inheritance, brand checks. Edit and run each in a sandboxed iframe. Free.",
    about: [
      "**IconVault**'s **JS Class Features** is a hands-on lab for modern JavaScript classes. Six lessons cover **private fields** and **private methods**, **static initialization blocks**, **getters and setters** with validation, **inheritance** with super, and the ergonomic **brand check** pattern, each with editable code and a plain-English explainer.",
      "Press run and your code executes in a **sandboxed iframe**, completely isolated from the page, with **console output** shown instantly. Experiment freely: break things, fix them, and build real intuition. Everything is **free** and runs fully in your browser.",
    ],
    faqs: [
      {
        q: "How do private fields work in JavaScript classes?",
        a: "Fields declared with a # prefix, like #balance, are truly private: they can only be accessed inside the class body. They are invisible to subclasses, Object.keys, destructuring and JSON.stringify, and accessing them from outside is a syntax error.",
      },
      {
        q: "What is a static block in a class?",
        a: "A static { } block runs once when the class is defined, letting you perform multi-step setup for static fields: computing values, validating config or populating collections. It runs in order with other static initializers.",
      },
      {
        q: "What is the #field in obj brand check?",
        a: "The in operator works with private names: #radius in obj returns true only if obj is an instance of the class that declares #radius. It is the safe way to verify an object's brand without exposing internals.",
      },
      {
        q: "Is my code safe to run here?",
        a: "Yes. Code runs inside an iframe with sandbox='allow-scripts': it has no access to this page, your cookies, localStorage or the network, and no Function constructor is used. Edit and run freely.",
      },
      {
        q: "Is the JS Class Features tool free?",
        a: "Yes. All six lessons, editing and sandboxed runs are free in your browser, with 5 free runs per tool before Pro is suggested.",
      },
      {
        q: "Can I use private fields in all browsers?",
        a: "Private fields and methods are supported in all modern browsers since 2021, and static blocks since 2022. For older targets, TypeScript and Babel can compile them down.",
      },
    ],
    tags: [
      "javascript classes", "js class", "javascript class tutorial",
      "private fields javascript", "js private methods", "hash private javascript",
      "static blocks javascript", "static initialization block",
      "javascript getters setters", "js getter setter example",
      "javascript inheritance", "extends super javascript", "class inheritance js",
      "javascript class features", "modern javascript classes",
      "es2022 classes", "private static javascript", "brand check javascript",
      "# in operator", "ergonomic brand checks", "javascript encapsulation",
      "oop javascript", "javascript class constructor", "js class fields",
      "public class fields", "class static fields", "javascript mixins",
      "learn javascript classes", "javascript class examples",
      "javascript class cheat sheet", "js class interview questions",
      "private vs typescript private", "typescript private keyword",
      "javascript class sandbox", "run javascript online", "js playground",
      "javascript class extends", "super keyword javascript", "method overriding js",
      "javascript prototype vs class", "are js classes syntactic sugar",
      "javascript class best practices", "when to use classes javascript",
      "javascript factory vs class", "class expression javascript",
      "anonymous class javascript", "javascript class naming",
      "static methods javascript", "when to use static methods",
      "javascript class initialization", "class fields browser support",
      "private fields browser support", "static blocks browser support",
    ],
  };

export default seo;
