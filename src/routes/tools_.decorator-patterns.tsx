// /tools/decorator-patterns - JS Decorators lab: class, method and field
// decorator patterns with live runnable demos. 100% client-side.

import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Play, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/decorator-patterns";
import toolSeoMeta from "@/lib/tool-seo-meta-data/decorator-patterns";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/decorator-patterns")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/decorator-patterns";
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
  component: DecoratorPatterns,
});

type LogFn = (msg: string) => void;

function applyMethodDecorator(
  cls: { prototype: object },
  key: string,
  deco: (target: unknown, k: string, d: PropertyDescriptor) => PropertyDescriptor | void,
) {
  const desc = Object.getOwnPropertyDescriptor(cls.prototype, key)!;
  const out = deco(cls.prototype, key, desc);
  Object.defineProperty(cls.prototype, key, out ?? desc);
}

interface Pattern {
  id: string;
  name: string;
  blurb: string;
  code: string;
  run: (log: LogFn) => void | Promise<void>;
}

const PATTERNS: Pattern[] = [
  {
    id: "log",
    name: "@log calls",
    blurb: "Wrap any method to record its arguments and return value.",
    code: `function log(target, key, descriptor) {\n  const original = descriptor.value;\n  descriptor.value = function (...args) {\n    console.log("call", key, "with", args);\n    const result = original.apply(this, args);\n    console.log(key, "returned", result);\n    return result;\n  };\n}\n\nclass Cart {\n  @log\n  add(item, qty) {\n    return qty + "x " + item;\n  }\n}\nnew Cart().add("book", 2);`,
    run: (log) => {
      const deco = (_t: unknown, key: string, d: PropertyDescriptor): PropertyDescriptor => {
        const orig = d.value as (...a: unknown[]) => unknown;
        d.value = function (...args: unknown[]) {
          log(`call ${key}(${args.map((a) => JSON.stringify(a)).join(", ")})`);
          const r = orig.apply(this, args);
          log(`${key} returned ${JSON.stringify(r)}`);
          return r;
        };
        return d;
      };
      class Cart {
        add(item: string, qty: number) {
          return `${qty}x ${item}`;
        }
      }
      applyMethodDecorator(Cart, "add", deco);
      log(`result: ${new Cart().add("book", 2)}`);
    },
  },
  {
    id: "time",
    name: "@measure time",
    blurb: "Time any method with performance.now() without touching its body.",
    code: `function measure(target, key, descriptor) {\n  const original = descriptor.value;\n  descriptor.value = function (...args) {\n    const start = performance.now();\n    const result = original.apply(this, args);\n    console.log(key, "took", (performance.now() - start).toFixed(2), "ms");\n    return result;\n  };\n}\n\nclass Search {\n  @measure\n  query(q) {\n    let s = 0;\n    for (let i = 0; i < 1e6; i++) s += i;\n    return s;\n  }\n}`,
    run: (log) => {
      const deco = (_t: unknown, key: string, d: PropertyDescriptor): PropertyDescriptor => {
        const orig = d.value as (...a: unknown[]) => unknown;
        d.value = function (...args: unknown[]) {
          const start = performance.now();
          const r = orig.apply(this, args);
          log(`${key} took ${(performance.now() - start).toFixed(2)} ms`);
          return r;
        };
        return d;
      };
      class Search {
        query(_q: string) {
          let s = 0;
          for (let i = 0; i < 1e6; i++) s += i;
          return s;
        }
      }
      applyMethodDecorator(Search, "query", deco);
      new Search().query("decorators");
      log("done");
    },
  },
  {
    id: "memoize",
    name: "@memoize",
    blurb: "Cache results by arguments so expensive calls run once.",
    code: `function memoize(target, key, descriptor) {\n  const original = descriptor.value;\n  const cache = new Map();\n  descriptor.value = function (...args) {\n    const k = JSON.stringify(args);\n    if (!cache.has(k)) cache.set(k, original.apply(this, args));\n    return cache.get(k);\n  };\n}\n\nclass Fib {\n  @memoize\n  calc(n) {\n    return n < 2 ? n : this.calc(n - 1) + this.calc(n - 2);\n  }\n}`,
    run: (log) => {
      let calls = 0;
      const deco = (_t: unknown, key: string, d: PropertyDescriptor): PropertyDescriptor => {
        const orig = d.value as (...a: unknown[]) => unknown;
        const cache = new Map<string, unknown>();
        d.value = function (...args: unknown[]) {
          const k = JSON.stringify(args);
          if (!cache.has(k)) {
            calls++;
            cache.set(k, orig.apply(this, args));
          }
          return cache.get(k);
        };
        return d;
      };
      class Fib {
        calc(n: number): number {
          return n < 2 ? n : this.calc(n - 1) + this.calc(n - 2);
        }
      }
      applyMethodDecorator(Fib, "calc", deco);
      const fib = new Fib();
      log(`fib(20) = ${fib.calc(20)}`);
      log(`fib(20) again = ${fib.calc(20)} (cache hit)`);
      log(`underlying calls: ${calls} (vs 21,891 without memoize)`);
    },
  },
  {
    id: "debounce",
    name: "@debounce",
    blurb: "Collapse rapid calls into one, perfect for search inputs.",
    code: `function debounce(ms) {\n  return (target, key, descriptor) => {\n    const original = descriptor.value;\n    let timer;\n    descriptor.value = function (...args) {\n      clearTimeout(timer);\n      timer = setTimeout(() => original.apply(this, args), ms);\n    };\n  };\n}\n\nclass SearchBox {\n  @debounce(300)\n  onType(q) { /* fetch(q) */ }\n}`,
    run: async (log) => {
      const deco =
        (ms: number) =>
        (_t: unknown, key: string, d: PropertyDescriptor): PropertyDescriptor => {
          const orig = d.value as (...a: unknown[]) => unknown;
          let timer: ReturnType<typeof setTimeout>;
          d.value = function (...args: unknown[]) {
            clearTimeout(timer);
            timer = setTimeout(() => orig.apply(this, args), ms);
          };
          return d;
        };
      class SearchBox {
        onType(q: string) {
          log(`fired request for "${q}"`);
        }
      }
      applyMethodDecorator(SearchBox, "onType", deco(400));
      const box = new SearchBox();
      log("typing: h, he, hel, hell, hello (fast)");
      for (const q of ["h", "he", "hel", "hell", "hello"]) box.onType(q);
      await new Promise((r) => setTimeout(r, 700));
      log("only the last call survived the 400ms window");
    },
  },
  {
    id: "validate",
    name: "@validate",
    blurb: "Guard argument types at the boundary of a method.",
    code: `function validate(types) {\n  return (target, key, descriptor) => {\n    const original = descriptor.value;\n    descriptor.value = function (...args) {\n      args.forEach((a, i) => {\n        if (typeof a !== types[i])\n          throw new TypeError(key + ": arg " + i + " must be " + types[i]);\n      });\n      return original.apply(this, args);\n    };\n  };\n}\n\nclass Bank {\n  @validate(["number"])\n  deposit(amount) { /* ... */ }\n}`,
    run: (log) => {
      const deco =
        (types: string[]) =>
        (_t: unknown, key: string, d: PropertyDescriptor): PropertyDescriptor => {
          const orig = d.value as (...a: unknown[]) => unknown;
          d.value = function (...args: unknown[]) {
            args.forEach((a, i) => {
              if (typeof a !== types[i])
                throw new TypeError(`${key}: arg ${i} must be ${types[i]}, got ${typeof a}`);
            });
            return orig.apply(this, args);
          };
          return d;
        };
      class Bank {
        deposit(amount: number) {
          return `deposited $${amount}`;
        }
      }
      applyMethodDecorator(Bank, "deposit", deco(["number"]));
      const bank = new Bank();
      log(bank.deposit(100));
      try {
        (bank as unknown as { deposit: (a: unknown) => string }).deposit("100");
      } catch (e) {
        log(`threw: ${(e as Error).message}`);
      }
    },
  },
  {
    id: "deprecated",
    name: "@deprecated",
    blurb: "Warn once when legacy methods are still called.",
    code: `function deprecated(msg) {\n  return (target, key, descriptor) => {\n    const original = descriptor.value;\n    let warned = false;\n    descriptor.value = function (...args) {\n      if (!warned) { console.warn(key + " is deprecated: " + msg); warned = true; }\n      return original.apply(this, args);\n    };\n  };\n}\n\nclass Api {\n  @deprecated("use fetchUsers() instead")\n  getUsers() { /* ... */ }\n}`,
    run: (log) => {
      const deco =
        (msg: string) =>
        (_t: unknown, key: string, d: PropertyDescriptor): PropertyDescriptor => {
          const orig = d.value as (...a: unknown[]) => unknown;
          let warned = false;
          d.value = function (...args: unknown[]) {
            if (!warned) {
              log(`WARNING: ${key} is deprecated: ${msg}`);
              warned = true;
            }
            return orig.apply(this, args);
          };
          return d;
        };
      class Api {
        getUsers() {
          return ["ana", "ben"];
        }
      }
      applyMethodDecorator(Api, "getUsers", deco("use fetchUsers() instead"));
      const api = new Api();
      api.getUsers();
      api.getUsers();
      log("warning printed once, method still works");
    },
  },
  {
    id: "register",
    name: "@register (class)",
    blurb: "Class decorators receive the constructor: build registries and metadata.",
    code: `const registry = [];\n\nfunction register(target) {\n  registry.push(target.name);\n  target.version = "1.0.0";\n  return target;\n}\n\n@register\nclass UserService {}\n\n@register\nclass OrderService {}\n\nconsole.log(registry); // ["UserService", "OrderService"]`,
    run: (log) => {
      const registry: string[] = [];
      const register = <T extends new (...a: never[]) => object>(target: T): T => {
        registry.push(target.name);
        (target as Record<string, unknown>)["version"] = "1.0.0";
        return target;
      };
      const UserService = register(class UserService {});
      const OrderService = register(class OrderService {});
      log(`registry: [${registry.join(", ")}]`);
      log(`UserService.version = ${(UserService as unknown as Record<string, unknown>)["version"]}`);
      log(`OrderService.version = ${(OrderService as unknown as Record<string, unknown>)["version"]}`);
    },
  },
];

function DecoratorPatterns() {
  const { isPro } = usePlan();
  const trial = useToolTrial("decorator-patterns", isPro);
  const seo = toolSeo;

  const [active, setActive] = useState(PATTERNS[0]?.id ?? "log");
  const [lines, setLines] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const pattern = PATTERNS.find((p) => p.id === active)!;
  const endRef = useRef<HTMLDivElement | null>(null);

  const log: LogFn = (msg) => {
    setLines((p) => [...p, msg]);
  };

  const runDemo = async () => {
    if (!trial.canUse || running) return;
    setRunning(true);
    setLines([]);
    try {
      await pattern.run(log);
      trial.recordUse();
    } catch (e) {
      log(`threw: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setRunning(false);
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ block: "nearest" }));
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(pattern.code);
      toast.success("Pattern code copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <ToolPageShell toolId="decorator-patterns" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="JS Decorators" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
          <p className="px-1 pb-1 text-[13px] font-medium text-foreground/80">Patterns</p>
          {PATTERNS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => { setActive(p.id); setLines([]); }}
              className={cn(
                "w-full rounded-xl border px-3 py-2.5 text-left transition",
                active === p.id
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/40",
              )}
            >
              <p className="font-mono text-sm font-bold">{p.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{p.blurb}</p>
            </button>
          ))}
          <div className="rounded-xl bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
            Demos apply decorators by hand (the same functions the <code className="font-mono">@syntax</code> calls),
            so they run here with zero build config. In TypeScript, enable <code className="font-mono">experimentalDecorators</code> to
            use the <code className="font-mono">@</code> form directly.
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-mono text-lg font-bold">{pattern.name}</h2>
              <p className="text-sm text-muted-foreground">{pattern.blurb}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={copyCode}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:border-primary/50"
              >
                <Copy className="h-4 w-4" /> Copy code
              </button>
              <ActionButton busy={running} disabled={!trial.canUse} onClick={runDemo}>
                <Play className="h-4 w-4" /> {running ? "Running" : "Run demo"}
              </ActionButton>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-muted/40">
            <div className="border-b border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground">pattern.js</div>
            <pre className="overflow-x-auto p-3 text-xs leading-relaxed"><code>{pattern.code}</code></pre>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold">Live output</p>
            <div className="min-h-[140px] rounded-xl border border-border bg-black p-4 font-mono text-xs leading-relaxed text-green-400">
              {lines.length === 0 ? (
                <p className="text-muted-foreground">// press "Run demo" to execute this pattern in your browser</p>
              ) : (
                lines.map((l, i) => <p key={i}>{l}</p>)
              )}
              <div ref={endRef} />
            </div>
          </div>

          {!isPro && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Wand2 className="h-3.5 w-3.5" /> {trial.left} of 5 free demo runs left.
            </p>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
