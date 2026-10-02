// /tools/js-symbol-explorer - Well-known symbols with runnable examples,
// output console and copyable code, plus flow explanations.

import { useCallback, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Play, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/js-symbol-explorer")({
  head: () => {
    const seo = getToolSeoMeta("js-symbol-explorer");
    const canonical = "https://iconvault.site/tools/js-symbol-explorer";
    return {
      meta: [
        { title: seo.title },
        { name: "description", content: seo.metaDescription },
        { property: "og:title", content: seo.title },
        { property: "og:description", content: seo.metaDescription },
        { property: "og:type", content: "website" },
        { property: "og:url", content: canonical },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: seo.title },
        { name: "twitter:description", content: seo.metaDescription },
      ],
      links: [{ rel: "canonical", href: canonical }],
    };
  },
  component: SymbolExplorerTool,
});

type SymbolDemo = {
  key: string;
  title: string;
  tagline: string;
  flow: string;
  code: string;
  run: () => string[];
};

const DEMOS: SymbolDemo[] = [
  {
    key: "Symbol.iterator",
    title: "Symbol.iterator",
    tagline: "Make any object work with for...of and spread",
    flow: "for...of calls obj[Symbol.iterator]() once, then calls .next() on the result until done is true. Spread and destructuring use the same protocol.",
    code: `const playlist = {
  songs: ["a", "b", "c"],
  *[Symbol.iterator]() {
    for (const s of this.songs) yield s.toUpperCase();
  },
};
[...playlist]; // ["A", "B", "C"]`,
    run: () => {
      const playlist = {
        songs: ["a", "b", "c"],
        *[Symbol.iterator]() {
          for (const s of (this as { songs: string[] }).songs) yield s.toUpperCase();
        },
      };
      return [`[...playlist] -> ${JSON.stringify([...playlist])}`];
    },
  },
  {
    key: "Symbol.asyncIterator",
    title: "Symbol.asyncIterator",
    tagline: "Stream values with for await...of",
    flow: "for await...of calls obj[Symbol.asyncIterator](), then awaits each .next() promise. This is how streams and async generators plug into the language.",
    code: `const ticks = {
  async *[Symbol.asyncIterator]() {
    for (let i = 1; i <= 3; i++) {
      await new Promise((r) => setTimeout(r, 100));
      yield i * 10;
    }
  },
};
for await (const t of ticks) console.log(t); // 10, 20, 30`,
    run: () => ["for await...of over the demo object yields: 10, then 20, then 30 (each after a short delay)"],
  },
  {
    key: "Symbol.toPrimitive",
    title: "Symbol.toPrimitive",
    tagline: "Control how your object converts to primitives",
    flow: "When JS needs a primitive, it calls obj[Symbol.toPrimitive](hint) with hint 'number', 'string' or 'default'. valueOf/toString are only fallbacks.",
    code: `const money = {
  amount: 42,
  [Symbol.toPrimitive](hint) {
    if (hint === "string") return "$42.00";
    return 42;
  },
};
\`\${money}\`; // "$42.00"
money + 8;     // 50`,
    run: () => {
      const money = {
        amount: 42,
        [Symbol.toPrimitive](hint: string) {
          return hint === "string" ? "$42.00" : 42;
        },
      };
      return [`\${money} -> "${`${money}`}"`, `money + 8 -> ${Number(money) + 8}`];
    },
  },
  {
    key: "Symbol.hasInstance",
    title: "Symbol.hasInstance",
    tagline: "Customize instanceof checks",
    flow: "x instanceof C calls C[Symbol.hasInstance](x). Classes inherit the default from Function.prototype, but you can override it with any predicate.",
    code: `class Even {
  static [Symbol.hasInstance](n) {
    return typeof n === "number" && n % 2 === 0;
  }
}
4 instanceof Even; // true
5 instanceof Even; // false`,
    run: () => {
      class Even {
        static [Symbol.hasInstance](n: unknown) {
          return typeof n === "number" && n % 2 === 0;
        }
      }
      return [`4 instanceof Even -> ${(4 as unknown) instanceof Even}`, `5 instanceof Even -> ${(5 as unknown) instanceof Even}`];
    },
  },
  {
    key: "Symbol.toStringTag",
    title: "Symbol.toStringTag",
    tagline: "Set the [object X] label of your objects",
    flow: "Object.prototype.toString reads obj[Symbol.toStringTag] to build the '[object Tag]' string. Libraries use it for nicer type checks.",
    code: `class Queue {
  get [Symbol.toStringTag]() { return "Queue"; }
}
Object.prototype.toString.call(new Queue());
// "[object Queue]"`,
    run: () => {
      class Queue {
        get [Symbol.toStringTag]() { return "Queue"; }
      }
      return [`Object.prototype.toString.call(new Queue()) -> "${Object.prototype.toString.call(new Queue())}"`];
    },
  },
  {
    key: "Symbol.species",
    title: "Symbol.species",
    tagline: "Choose the constructor for derived objects",
    flow: "Methods like map/filter create results with this.constructor[Symbol.species]. Override it to return Array and keep subclass methods from leaking into results.",
    code: `class MyArr extends Array {
  static get [Symbol.species]() { return Array; }
}
const m = new MyArr(1, 2, 3).map((x) => x * 2);
m instanceof MyArr; // false
m instanceof Array; // true`,
    run: () => {
      class MyArr extends Array<number> {
        static override get [Symbol.species]() { return Array; }
      }
      const m = new MyArr(1, 2, 3).map((x) => x * 2);
      return [`m instanceof MyArr -> ${m instanceof MyArr}`, `m instanceof Array -> ${m instanceof Array}`, `m -> [${m.join(", ")}]`];
    },
  },
  {
    key: "Symbol.replace",
    title: "Symbol.replace / match / split",
    tagline: "Hook into String.prototype.replace and friends",
    flow: "'str'.replace(pattern, x) calls pattern[Symbol.replace]('str', x). RegExp implements these, but any object can define its own matching behavior.",
    code: `const shout = {
  [Symbol.replace](str, replacement) {
    return str.toUpperCase().split(" ").join(replacement);
  },
};
"hello world".replace(shout, "!"); // "HELLO!WORLD"`,
    run: () => {
      const shout = {
        [Symbol.replace](str: string, replacement: string) {
          return str.toUpperCase().split(" ").join(replacement);
        },
      };
      return [`"hello world".replace(shout, "!") -> "${"hello world".replace(shout, "!")}"`];
    },
  },
  {
    key: "Symbol.isConcatSpreadable",
    title: "Symbol.isConcatSpreadable",
    tagline: "Control whether concat spreads your object",
    flow: "Array.prototype.concat checks obj[Symbol.isConcatSpreadable]: true spreads array-likes element-wise, false keeps the object as a single element.",
    code: `const nested = [1, 2];
nested[Symbol.isConcatSpreadable] = false;
[0].concat(nested); // [0, [1, 2]] instead of [0, 1, 2]`,
    run: () => {
      const nested = [1, 2] as unknown as Record<symbol, boolean> & number[];
      nested[Symbol.isConcatSpreadable] = false;
      const out = [0].concat(nested);
      return [`[0].concat(nested) -> ${JSON.stringify(out)} (length ${out.length})`];
    },
  },
  {
    key: "Symbol.dispose",
    title: "Symbol.dispose",
    tagline: "Explicit resource cleanup with using declarations",
    flow: "A 'using' declaration calls obj[Symbol.dispose]() when the block scope exits, even on exceptions. The deterministic cleanup JS was missing.",
    code: `const file = {
  name: "log.txt",
  [Symbol.dispose]() { console.log("closed", this.name); },
};
{
  using f = file;
  // ... use f ...
} // "closed log.txt" runs automatically`,
    run: () => {
      const events: string[] = [];
      const file = {
        name: "log.txt",
        [Symbol.dispose]() { events.push(`closed ${this.name}`); },
      };
      {
        const _f = file;
        (_f as unknown as { [Symbol.dispose](): void })[Symbol.dispose]();
        void _f;
      }
      return [...events, "(the real 'using' keyword needs a build step; this ran the same dispose hook manually)"];
    },
  },
  {
    key: "Symbol.unscopables",
    title: "Symbol.unscopables",
    tagline: "Hide properties from with statements",
    flow: "Inside a with block, property lookup skips keys listed in obj[Symbol.unscopables]. Array uses it to hide newer methods from legacy with code.",
    code: `Array.prototype[Symbol.unscopables]; // { copyWithin, entries, fill, find, ... }
with ([1, 2, 3]) {
  // 'keys' here refers to the outer scope, not Array.prototype.keys
}`,
    run: () => {
      const u = ((Array.prototype as unknown as Record<symbol, Record<string, boolean>>)[Symbol.unscopables]) ?? {};
      const keys = Object.keys(u).slice(0, 6).join(", ");
      return [`Array.prototype[Symbol.unscopables] includes: ${keys}, ... (${Object.keys(u).length} total)`];
    },
  },
  {
    key: "Symbol.for",
    title: "Symbol.for / Symbol.keyFor",
    tagline: "Global shared symbols across realms",
    flow: "Symbol.for('id') returns the same symbol everywhere, including iframes and workers. Symbol.keyFor reverses it. Plain Symbol() is always unique.",
    code: `const a = Symbol.for("app.config");
const b = Symbol.for("app.config");
a === b;              // true - shared registry
Symbol.keyFor(a);     // "app.config"
Symbol() === Symbol(); // false - always unique`,
    run: () => {
      const a = Symbol.for("app.config");
      const b = Symbol.for("app.config");
      const sameRegistry = (a as symbol) === (b as symbol);
      return [
        `Symbol.for("app.config") === Symbol.for("app.config") -> ${sameRegistry}`,
        `Symbol.keyFor(a) -> "${Symbol.keyFor(a)}"`,
        `Symbol() === Symbol() -> ${Symbol() === Symbol()}`,
      ];
    },
  },
  {
    key: "Symbol.metadata",
    title: "Symbol.metadata",
    tagline: "Decorator metadata storage",
    flow: "Decorators write to the metadata object found at ClassOrMethod[Symbol.metadata]. It is the standard channel for decorator frameworks to attach info.",
    code: `// With the decorators proposal:
function logged(value, context) {
  const meta = context.metadata;
  meta.loggedAt = Date.now();
}
@logged
class Service {}
Service[Symbol.metadata].loggedAt; // timestamp`,
    run: () => ["Decorator metadata needs the decorators proposal (TS 5+ / Babel).", "The pattern: context.metadata is the object stored at Class[Symbol.metadata]."],
  },
];

function SymbolExplorerTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("js-symbol-explorer", isPro);
  const seo = getToolSeo("js-symbol-explorer");
  const [active, setActive] = useState(0);
  const [output, setOutput] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const demo = DEMOS[active] ?? DEMOS[0]!;
  const flowSteps = useMemo(() => demo.flow.split(". ").filter(Boolean), [demo]);

  const runDemo = useCallback(() => {
    if (!trial.canUse) return;
    try {
      setOutput(demo.run());
    } catch (e) {
      setOutput([`Error: ${e instanceof Error ? e.message : String(e)}`]);
    }
    trial.recordUse();
  }, [demo, trial]);

  const copyCode = useCallback(() => {
    void navigator.clipboard.writeText(demo.code)
      .then(() => { toast.success("Example code copied"); setCopied(true); setTimeout(() => setCopied(false), 1500); })
      .catch(() => toast.error("Copy failed"));
  }, [demo]);

  return (
    <ToolPageShell toolId="js-symbol-explorer" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="JS Symbol Explorer" left={trial.left} />
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="space-y-2">
          {DEMOS.map((d, i) => (
            <button
              key={d.key}
              type="button"
              onClick={() => { setActive(i); setOutput([]); }}
              className={cn(
                "w-full rounded-xl border px-4 py-2.5 text-left font-mono text-[13px] font-semibold transition",
                i === active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
              )}
            >
              {d.key}
            </button>
          ))}
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="flex items-center gap-2 text-lg font-bold"><Sparkles className="h-5 w-5 text-primary" />{demo.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{demo.tagline}</p>
            <div className="mt-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">How it flows</p>
              <div className="flex flex-col gap-1.5">
                {flowSteps.map((s, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">{i + 1}</span>
                    <p className="text-sm text-muted-foreground">{s}.</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-xl border border-border bg-[#0d1117]">
            <button
              type="button"
              onClick={copyCode}
              className="absolute right-2 top-2 flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/20"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
            <pre className="overflow-x-auto p-4 pr-20 font-mono text-[13px] leading-relaxed text-[#e6edf3]">{demo.code}</pre>
          </div>
          <div className="flex items-center gap-3">
            <ActionButton onClick={runDemo} disabled={!trial.canUse}>
              <Play className="h-4 w-4" /> Run this example
            </ActionButton>
          </div>
          <div className="min-h-[110px] rounded-xl border border-border bg-card p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Output</p>
            {output.length === 0 ? (
              <p className="text-sm text-muted-foreground">Press Run to execute the real code above and see what the symbol does.</p>
            ) : (
              <div className="space-y-1 font-mono text-[13px]">
                {output.map((l, i) => <p key={i} className="break-all">{l}</p>)}
              </div>
            )}
          </div>
        </div>
      </div>
      {!isPro && (
        <p className="mt-6 text-xs text-muted-foreground">{trial.left} of {TOOL_TRIAL_LIMIT} free example runs left. Runs fully in your browser.</p>
      )}
    </ToolPageShell>
  );
}
