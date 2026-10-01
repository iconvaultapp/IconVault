// /tools/ts-error-decoder - Paste or pick a TypeScript error code, get a
// plain-English explanation and a fix. Built-in database, searchable,
// 100% in-browser.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/ts-error-decoder")({
  head: () => {
    const seo = getToolSeoMeta("ts-error-decoder");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: TsErrorTool,
});

interface Entry {
  code: string;
  title: string;
  why: string;
  example: string;
  fix: string;
}

const DB: Entry[] = [
  {
    code: "TS1005",
    title: "';' expected",
    why: "The parser hit something it did not expect, usually a missing comma, bracket or semicolon on the line above. The real mistake is often one line earlier than the squiggle.",
    example: `const user = { name: "Ava" age: 30 };`,
    fix: `// Add the missing comma:\nconst user = { name: "Ava", age: 30 };`,
  },
  {
    code: "TS1128",
    title: "Declaration or statement expected",
    why: "There is a stray character or an unfinished block, often a leftover brace from a bad merge or an extra closing bracket.",
    example: `function save() {\n  doSave();\n}} // one brace too many`,
    fix: `// Delete the stray brace so blocks balance:\nfunction save() {\n  doSave();\n}`,
  },
  {
    code: "TS1184",
    title: "Modifiers cannot appear here",
    why: "You used public, private, readonly or static somewhere they are not allowed, like on a plain variable or a function parameter that is not a constructor parameter.",
    example: `function make(private name: string) {}`,
    fix: `// Parameter properties only work in constructors:\nclass User {\n  constructor(private name: string) {}\n}`,
  },
  {
    code: "TS1206",
    title: "Decorators are not valid here",
    why: "A decorator is sitting on something that cannot be decorated, or experimentalDecorators is off in tsconfig. Decorators only attach to classes and class members.",
    example: `@log\nconst x = 1;`,
    fix: `// Move the decorator onto a class or method, and enable it:\n// tsconfig: "experimentalDecorators": true\n@log\nclass Service {}`,
  },
  {
    code: "TS1323",
    title: "Dynamic import must have a string literal",
    why: "TypeScript needs to statically resolve import() for type checking, so the path cannot be a variable. Vite and webpack have the same restriction at build time.",
    example: `const mod = await import(path);`,
    fix: `// Use a static string, or a lookup table of static imports:\nconst mods = { a: () => import("./a"), b: () => import("./b") };\nconst mod = await mods[key]();`,
  },
  {
    code: "TS18046",
    title: "'X' is of type 'unknown'",
    why: "You are treating an unknown value as if it were known. unknown is the honest type for JSON, any-casts and catch variables, and you must narrow it first.",
    example: `function handle(data: unknown) {\n  console.log(data.name);\n}`,
    fix: `// Narrow before use:\nfunction handle(data: unknown) {\n  if (typeof data === "object" && data !== null && "name" in data) {\n    console.log(data.name);\n  }\n}`,
  },
  {
    code: "TS18048",
    title: "'X' is possibly 'undefined'",
    why: "strict mode noticed the value can be undefined: an optional chain result, an array index, or a Map.get. Add a guard instead of assuming it exists.",
    example: `const el = document.querySelector(".btn");\nel.classList.add("on");`,
    fix: `// Guard it, or use a non-null assertion only when you are sure:\nconst el = document.querySelector(".btn");\nif (el) el.classList.add("on");`,
  },
  {
    code: "TS2304",
    title: "Cannot find name 'X'",
    why: "The name is not declared, not imported, or declared after use in a scope where that matters. Also check for typos and missing @types packages.",
    example: `console.log(userName); // never declared`,
    fix: `// Declare or import it:\nconst userName = "Ava";\nconsole.log(userName);`,
  },
  {
    code: "TS2307",
    title: "Cannot find module 'X'",
    why: "The import path is wrong, the file does not exist, or the package has no types and no declaration file. Relative paths are the usual culprit.",
    example: `import { x } from "./utils/helpers"; // wrong folder`,
    fix: `// Fix the path, or declare a shim for untyped packages:\n// src/types.d.ts\ndeclare module "some-untyped-lib";`,
  },
  {
    code: "TS2322",
    title: "Type 'X' is not assignable to type 'Y'",
    why: "The most common TypeScript error. You handed a value to a spot that expects a different shape. Read the two types in the message: the first is what you gave, the second is what was wanted.",
    example: `const n: number = "42";`,
    fix: `// Convert or widen the target type:\nconst n: number = Number("42");\n// or: const n: number | string = "42";`,
  },
  {
    code: "TS2339",
    title: "Property 'X' does not exist on type 'Y'",
    why: "You accessed a property the type does not declare. Either the type is too narrow, the property is misspelled, or the value needs narrowing first.",
    example: `const u: { name: string } = getUser();\nconsole.log(u.email);`,
    fix: `// Extend the type or narrow:\nconst u: { name: string; email?: string } = getUser();\nconsole.log(u.email ?? "none");`,
  },
  {
    code: "TS2345",
    title: "Argument of type 'X' is not assignable to parameter of type 'Y'",
    why: "A function got the wrong argument type. This is TS2322 at a call site: compare what you passed with the parameter the signature declares.",
    example: `function greet(name: string) {}\ngreet(42);`,
    fix: `// Pass what the signature asks for:\ngreet(String(42));`,
  },
  {
    code: "TS2352",
    title: "Conversion of type 'X' to type 'Y' may be a mistake",
    why: "You cast between two types that do not overlap, so TypeScript suspects the cast is wrong. Casts must go through a shared supertype.",
    example: `const s = "hi";\nconst n = s as number;`,
    fix: `// Go through unknown when you truly know better:\nconst n = s as unknown as number;\n// better: fix the real type instead of casting.`,
  },
  {
    code: "TS2416",
    title: "Property 'X' in type 'A' is not assignable to the same property in base type 'B'",
    why: "A subclass or interface extension narrowed a property in a way that breaks the parent contract. Properties must stay compatible with the base.",
    example: `class Base { item: string | number = ""; }\nclass Sub extends Base { item: string = ""; } // actually fine; error when incompatible`,
    fix: `// Keep the override assignable to the base:\nclass Sub extends Base { item: string | number = ""; }`,
  },
  {
    code: "TS2420",
    title: "Class 'X' incorrectly implements interface 'Y'",
    why: "The class is missing a member the interface requires, or a member has the wrong type. Interfaces are contracts: every member must match.",
    example: `interface Store { get(id: string): string; }\nclass MemStore implements Store {}`,
    fix: `// Implement every member with matching types:\nclass MemStore implements Store {\n  get(id: string): string { return ""; }\n}`,
  },
  {
    code: "TS2430",
    title: "Interface 'X' incorrectly extends interface 'Y'",
    why: "An interface tried to extend another but redeclared a property with an incompatible type. Extension can only narrow in compatible ways.",
    example: `interface A { v: string | number; }\ninterface B extends A { v: boolean; }`,
    fix: `// Keep the extended property compatible:\ninterface B extends A { v: string; }`,
  },
  {
    code: "TS2448",
    title: "Block-scoped variable 'X' used before its declaration",
    why: "You used a let or const before the line that declares it. Unlike var, they live in the temporal dead zone until their declaration runs.",
    example: `console.log(count);\nconst count = 5;`,
    fix: `// Move the declaration above the use:\nconst count = 5;\nconsole.log(count);`,
  },
  {
    code: "TS2451",
    title: "Cannot redeclare block-scoped variable 'X'",
    why: "The name is declared twice in the same scope. Common with copy-pasted code or a variable colliding with an import.",
    example: `const token = "a";\nconst token = "b";`,
    fix: `// Rename one of them, or reuse the first:\nconst token = "a";\nconst refreshToken = "b";`,
  },
  {
    code: "TS2454",
    title: "Variable 'X' is used before being assigned",
    why: "TypeScript can see a code path where the variable is read before any assignment, often inside a conditional that might not run.",
    example: `let total: number;\nif (ok) total = 5;\nconsole.log(total);`,
    fix: `// Give it a default:\nlet total = 0;\nif (ok) total = 5;\nconsole.log(total);`,
  },
  {
    code: "TS2461",
    title: "Type 'X' is not an array type",
    why: "You spread or destructured something that is not an array or iterable, or called array methods on a non-array.",
    example: `const user = { name: "Ava" };\nconst [first] = user;`,
    fix: `// Destructure objects with braces:\nconst { name } = user;`,
  },
  {
    code: "TS2532",
    title: "Object is possibly 'undefined'",
    why: "You called a method or read a property on something that might be undefined, usually the result of optional chaining or find().",
    example: `const user = users.find((u) => u.id === id);\nuser.name;`,
    fix: `// Guard first:\nconst user = users.find((u) => u.id === id);\nif (!user) throw new Error("not found");\nuser.name;`,
  },
  {
    code: "TS2551",
    title: "Property 'X' does not exist. Did you mean 'Y'?",
    why: "A typo, but a helpful one: TypeScript suggests the closest real property. Accept the suggestion or check the API docs.",
    example: `arr.lenght;`,
    fix: `// Take the hint:\narr.length;`,
  },
  {
    code: "TS2554",
    title: "Expected N arguments, but got M",
    why: "You called a function with the wrong number of arguments. Either you forgot one or the signature changed.",
    example: `function add(a: number, b: number) { return a + b; }\nadd(1);`,
    fix: `// Pass all required args, or make one optional:\nadd(1, 2);\n// or: function add(a: number, b = 0) { return a + b; }`,
  },
  {
    code: "TS2564",
    title: "Property 'X' has no initializer and is not definitely assigned in the constructor",
    why: "strictPropertyInitialization caught a class field that the constructor never sets. Fields must be assigned, marked optional, or given a default.",
    example: `class User {\n  name: string;\n  constructor() {}\n}`,
    fix: `// Assign it, default it, or mark it optional:\nclass User {\n  name = "anonymous";\n}`,
  },
  {
    code: "TS2571",
    title: "Object is of type 'unknown'",
    why: "A catch clause variable is unknown under useUnknownInCatchVariables. You cannot read properties off it until you narrow it to Error.",
    example: `try { risky(); } catch (e) {\n  console.log(e.message);\n}`,
    fix: `// Narrow the caught value:\ntry { risky(); } catch (e) {\n  if (e instanceof Error) console.log(e.message);\n}`,
  },
  {
    code: "TS2688",
    title: "Cannot find type definition file for 'X'",
    why: "tsconfig references a @types package that is not installed. Install it or remove it from the types array.",
    example: `// tsconfig: "types": ["node"] but @types/node is missing`,
    fix: `// Install the missing types:\n// npm i -D @types/node`,
  },
  {
    code: "TS2724",
    title: "'X' has no exported member named 'Y'. Did you mean 'Z'?",
    why: "The import names something the module does not export, often after a rename. TypeScript guesses the intended export.",
    example: `import { useStae } from "react";`,
    fix: `// Fix the import name:\nimport { useState } from "react";`,
  },
  {
    code: "TS2731",
    title: "Implicit conversion of an 'any' value",
    why: "noImplicitAny flagged an expression whose type it cannot infer, like indexing an object with a dynamic key.",
    example: `function get(obj, key) {\n  return obj[key];\n}`,
    fix: `// Add explicit types:\nfunction get(obj: Record<string, unknown>, key: string) {\n  return obj[key];\n}`,
  },
  {
    code: "TS2740",
    title: "Type 'X' is missing the following properties from type 'Y'",
    why: "You built an object literal that leaves out required properties. The message lists exactly what is missing.",
    example: `interface P { x: number; y: number; }\nconst p: P = { x: 1 };`,
    fix: `// Add the missing properties:\nconst p: P = { x: 1, y: 2 };`,
  },
  {
    code: "TS2741",
    title: "Property 'X' is missing in type 'Y' but required in type 'Z'",
    why: "A JSX component (or object) is missing a required prop. Same family as TS2740, at the call site.",
    example: `<Button /> // Button requires a label prop`,
    fix: `// Pass the required prop:\n<Button label="Save" />`,
  },
  {
    code: "TS2769",
    title: "No overload matches this call",
    why: "The function has multiple signatures and your arguments fit none of them. Read each overload and find the closest one.",
    example: `// e.g. passing a string where every overload wants a number or an object`,
    fix: `// Match one overload exactly, or convert your argument:\n// check the .d.ts, then shape your call to a listed signature.`,
  },
  {
    code: "TS4023",
    title: "Exported variable 'X' has or is using name 'Y' from external module but cannot be named",
    why: "declaration emit cannot name a type because it comes from an untyped or private module. declaration: true makes this surface.",
    example: `export const theme = makeTheme(); // makeTheme's return type cannot be named`,
    fix: `// Annotate the export explicitly:\nexport const theme: Theme = makeTheme();`,
  },
  {
    code: "TS4113",
    title: "This member cannot have an 'override' modifier because it is not declared in the base class",
    why: "noImplicitOverride is on and you marked a member override, but the base class has no such member. Either the base changed or the modifier is stray.",
    example: `class Sub extends Base {\n  override missing() {}\n}`,
    fix: `// Remove override, or add the member to the base class:\nclass Sub extends Base {\n  missing() {}\n}`,
  },
  {
    code: "TS6133",
    title: "'X' is declared but its value is never read",
    why: "noUnusedLocals found a variable, import or parameter you never use. Delete it or prefix with underscore if it must stay for the signature.",
    example: `import { useEffect } from "react"; // never used`,
    fix: `// Remove it, or underscore-prefix intentionally unused params:\nfunction onChange(_e: Event) {}`,
  },
  {
    code: "TS6192",
    title: "All imports in import declaration are unused",
    why: "Every name in an import statement is unused. Delete the whole import.",
    example: `import { a, b } from "./mod"; // neither used`,
    fix: `// Delete the import line entirely.`,
  },
  {
    code: "TS7006",
    title: "Parameter 'X' implicitly has an 'any' type",
    why: "noImplicitAny again: a function parameter with no type and nothing to infer it from. Give it a type.",
    example: `items.map((item) => item.name); // item is implicitly any`,
    fix: `// Type the parameter:\nitems.map((item: Item) => item.name);`,
  },
  {
    code: "TS7015",
    title: "Element implicitly has an 'any' type because index expression is not of type 'number'",
    why: "You indexed with a key whose type the object does not declare, so the result would be implicit any.",
    example: `const theme = { light: "#fff" };\ntheme[mode]; // mode: string`,
    fix: `// Type the object as a record or narrow the key:\nconst theme: Record<string, string> = { light: "#fff" };`,
  },
  {
    code: "TS7030",
    title: "Not all code paths return a value",
    why: "noImplicitReturns noticed some paths return a value and others fall off the end. Make every path return, or none.",
    example: `function f(ok: boolean) {\n  if (ok) return 1;\n}`,
    fix: `// Return on every path:\nfunction f(ok: boolean) {\n  if (ok) return 1;\n  return 0;\n}`,
  },
  {
    code: "TS7031",
    title: "Binding element 'X' implicitly has an 'any' type",
    why: "Destructured a parameter or variable with no type to infer from. Annotate the destructured shape.",
    example: `function f({ name }) {}`,
    fix: `// Annotate the binding:\nfunction f({ name }: { name: string }) {}`,
  },
  {
    code: "TS7053",
    title: "Element implicitly has an 'any' type because expression of type 'string' can't be used to index type 'X'",
    why: "noImplicitAny on index signatures: you used a string key on a type with no index signature. Add one or use a key union.",
    example: `interface User { name: string; }\nconst u: User = get();\nu[key];`,
    fix: `// Add an index signature or type the key:\ninterface User { name: string; [k: string]: string; }`,
  },
];

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function TsErrorTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("ts-error-decoder", isPro);
  const seo = getToolSeo("ts-error-decoder");

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Entry>(DB[0]!);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^ts/, "");
    if (!q) return DB;
    return DB.filter(
      (e) =>
        e.code.toLowerCase().includes(q) ||
        e.title.toLowerCase().includes(q) ||
        e.why.toLowerCase().includes(q),
    );
  }, [query]);

  const copyFix = async () => {
    if (!trial.canUse) return;
    const ok = await copyText(`${selected.code} ${selected.title}\n\nFix:\n${selected.fix}`);
    if (ok) {
      trial.recordUse();
      toast.success("Fix copied");
    } else {
      toast.error("Copy failed");
    }
  };

  return (
    <ToolPageShell toolId="ts-error-decoder" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="TS Error Decoder" left={trial.left} />

      <div className="mb-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Paste an error code like TS2322, or describe it: not assignable"
            className="w-full rounded-2xl border border-border bg-card py-3.5 pl-11 pr-4 text-sm outline-none focus:border-primary"
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {DB.length} common error codes in the built-in database, no network needed. Showing {matches.length}.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="max-h-[560px] space-y-2 overflow-y-auto pr-1">
          {matches.map((e) => (
            <button
              key={e.code}
              type="button"
              onClick={() => setSelected(e)}
              className={cn(
                "w-full rounded-xl border p-3 text-left transition",
                selected.code === e.code
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:border-primary/40",
              )}
            >
              <p className="font-mono text-xs font-bold text-primary">{e.code}</p>
              <p className="mt-0.5 text-sm font-semibold">{e.title}</p>
            </button>
          ))}
          {matches.length === 0 && (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No match in the local database. Try just the number, like 2322.
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="font-mono text-sm font-bold text-primary">{selected.code}</p>
            <h2 className="mt-1 text-xl font-bold">{selected.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{selected.why}</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-500">Typical trigger</p>
            <pre className="overflow-auto rounded-xl bg-black/80 p-4 font-mono text-[13px] leading-relaxed text-red-300">
              {selected.example}
            </pre>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">The fix</p>
              <button
                type="button"
                onClick={copyFix}
                disabled={!trial.canUse}
                className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-sm font-semibold transition hover:border-primary/40 disabled:opacity-40"
              >
                <Copy className="h-4 w-4" /> Copy fix
              </button>
            </div>
            <pre className="overflow-auto rounded-xl bg-black/80 p-4 font-mono text-[13px] leading-relaxed text-emerald-300">
              {selected.fix}
            </pre>
            {!isPro && (
              <p className="mt-2 text-xs text-muted-foreground">
                {trial.left} of {TOOL_TRIAL_LIMIT} free copies left.
              </p>
            )}
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
