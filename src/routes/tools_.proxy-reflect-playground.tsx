// /tools/proxy-reflect-playground - Pick a Proxy scenario (logging,
// validation, read-only, private fields, function interception), run real
// get/set/delete/has/keys/calls against it, and watch every trap fire in
// the live log with copyable source code.

import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Radar, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/proxy-reflect-playground";
import toolSeoMeta from "@/lib/tool-seo-meta-data/proxy-reflect-playground";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/proxy-reflect-playground")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/proxy-reflect-playground";
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
  component: ProxyReflectTool,
});

type Scenario = "logging" | "validation" | "readonly" | "private" | "function";

const SCENARIOS: { id: Scenario; label: string; hint: string }[] = [
  { id: "logging", label: "Logging proxy", hint: "every trap prints" },
  { id: "validation", label: "Validation proxy", hint: "type-check writes" },
  { id: "readonly", label: "Read-only proxy", hint: "blocks mutation" },
  { id: "private", label: "Private fields", hint: "_prefixed are hidden" },
  { id: "function", label: "Function proxy", hint: "apply + construct traps" },
];

interface TrapEntry { id: number; text: string; kind: "trap" | "result" | "error" }

function buildScenario(scenario: Scenario, log: (text: string, kind: TrapEntry["kind"]) => void) {
  const trap = (name: string, detail = "") => log(`${name}(${detail})`, "trap");
  switch (scenario) {
    case "logging": {
      const target = { name: "ada", role: "admin" };
      return {
        obj: new Proxy(target, {
          get(t, p, r) { trap("get", String(p)); return Reflect.get(t, p, r); },
          set(t, p, v, r) { trap("set", `${String(p)}, ${JSON.stringify(v)}`); return Reflect.set(t, p, v, r); },
          deleteProperty(t, p) { trap("deleteProperty", String(p)); return Reflect.deleteProperty(t, p); },
          has(t, p) { trap("has", String(p)); return Reflect.has(t, p); },
          ownKeys(t) { trap("ownKeys"); return Reflect.ownKeys(t); },
        }),
        base: target,
      };
    }
    case "validation": {
      const target: Record<string, unknown> = { name: "bob", age: 30 };
      return {
        obj: new Proxy(target, {
          set(t, p, v, r) {
            trap("set", `${String(p)}, ${JSON.stringify(v)}`);
            if (p === "age" && (typeof v !== "number" || v < 0)) {
              log("rejected: age must be a non-negative number", "error");
              return false;
            }
            if (p === "name" && typeof v !== "string") {
              log("rejected: name must be a string", "error");
              return false;
            }
            return Reflect.set(t, p, v, r);
          },
          get(t, p, r) { trap("get", String(p)); return Reflect.get(t, p, r); },
          deleteProperty(t, p) { trap("deleteProperty", String(p)); log("rejected: deletes are blocked", "error"); return false; },
        }),
        base: target,
      };
    }
    case "readonly": {
      const target = { title: "frozen doc", version: 1 };
      return {
        obj: new Proxy(target, {
          get(t, p, r) { trap("get", String(p)); return Reflect.get(t, p, r); },
          set(t, p, v) { trap("set", `${String(p)}, ${JSON.stringify(v)}`); log("rejected: object is read-only", "error"); return false; },
          deleteProperty(t, p) { trap("deleteProperty", String(p)); log("rejected: object is read-only", "error"); return false; },
        }),
        base: target,
      };
    }
    case "private": {
      const target = { name: "carol", _token: "secret-123" };
      return {
        obj: new Proxy(target, {
          get(t, p, r) {
            trap("get", String(p));
            if (String(p).startsWith("_")) { log("blocked: private field", "error"); return undefined; }
            return Reflect.get(t, p, r);
          },
          set(t, p, v, r) { trap("set", String(p)); return Reflect.set(t, p, v, r); },
          has(t, p) { trap("has", String(p)); return !String(p).startsWith("_") && Reflect.has(t, p); },
          ownKeys(t) { trap("ownKeys"); return Reflect.ownKeys(t).filter((k) => !String(k).startsWith("_")); },
        }),
        base: target,
      };
    }
    default: {
      const greet = function (this: unknown, who: string) { return `hello ${who}`; };
      return {
        obj: new Proxy(greet, {
          apply(t, thisArg, args) {
            trap("apply", args.map((a) => JSON.stringify(a)).join(", "));
            log("intercepted call, delegating with Reflect.apply", "result");
            return Reflect.apply(t, thisArg, args);
          },
          get(t, p, r) { trap("get", String(p)); return Reflect.get(t, p, r); },
          set(t, p, v, r) { trap("set", String(p)); return Reflect.set(t, p, v, r); },
        }) as unknown as Record<string, unknown>,
        base: greet as unknown as Record<string, unknown>,
      };
    }
  }
}

const CODE_SNIPPETS: Record<Scenario, string> = {
  logging: `const target = { name: "ada", role: "admin" };

const logged = new Proxy(target, {
  get(t, prop, receiver) {
    console.log("get", prop);
    return Reflect.get(t, prop, receiver); // forward, keeps invariants
  },
  set(t, prop, value, receiver) {
    console.log("set", prop, value);
    return Reflect.set(t, prop, value, receiver);
  },
  deleteProperty(t, prop) {
    console.log("delete", prop);
    return Reflect.deleteProperty(t, prop);
  },
});`,
  validation: `const user = new Proxy({ name: "bob", age: 30 }, {
  set(t, prop, value, receiver) {
    if (prop === "age" && (typeof value !== "number" || value < 0))
      return false; // rejected: strict mode throws TypeError
    if (prop === "name" && typeof value !== "string") return false;
    return Reflect.set(t, prop, value, receiver);
  },
});`,
  readonly: `const readonly = new Proxy({ title: "frozen doc" }, {
  set() { return false; },          // writes silently fail (throw in strict mode)
  deleteProperty() { return false; },
});`,
  private: `const guarded = new Proxy({ name: "carol", _token: "secret" }, {
  get(t, prop, receiver) {
    if (String(prop).startsWith("_")) return undefined;
    return Reflect.get(t, prop, receiver);
  },
  has(t, prop) {
    return !String(prop).startsWith("_") && Reflect.has(t, prop);
  },
  ownKeys(t) {
    return Reflect.ownKeys(t).filter((k) => !String(k).startsWith("_"));
  },
});`,
  function: `function greet(who) { return \`hello \${who}\`; }

const wrapped = new Proxy(greet, {
  apply(target, thisArg, args) {
    console.log("called with", args);
    return Reflect.apply(target, thisArg, args); // run the original
  },
});`,
};

function ProxyReflectTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("proxy-reflect-playground", isPro);
  const seo = toolSeo;

  const [scenario, setScenario] = useState<Scenario>("logging");
  const [logEntries, setLogEntries] = useState<TrapEntry[]>([]);
  const [propName, setPropName] = useState("name");
  const [propValue, setPropValue] = useState("ada");
  const [copied, setCopied] = useState(false);
  const idRef = useRef(0);
  interface TaggedProxy { obj: Record<string, unknown>; base: Record<string, unknown>; scenario: Scenario }
  const proxyRef = useRef<TaggedProxy | null>(null);

  const log = (text: string, kind: TrapEntry["kind"]) => {
    idRef.current += 1;
    const id = idRef.current;
    setLogEntries((prev) => [{ id, text, kind }, ...prev].slice(0, 120));
  };

  const ensureProxy = (): TaggedProxy => {
    if (!proxyRef.current || proxyRef.current.scenario !== scenario) {
      const built = buildScenario(scenario, log);
      proxyRef.current = { obj: built.obj, base: built.base, scenario };
    }
    return proxyRef.current;
  };

  const switchScenario = (s: Scenario) => {
    setScenario(s);
    proxyRef.current = null;
    setLogEntries([]);
  };

  const runGet = () => {
    const p = ensureProxy().obj;
    const v = (p as Record<string, unknown>)[propName];
    log(`=> ${JSON.stringify(v)}`, "result");
  };
  const runSet = () => {
    const p = ensureProxy().obj;
    let v: unknown = propValue;
    try { v = JSON.parse(propValue); } catch { /* keep as string */ }
    try {
      (p as Record<string, unknown>)[propName] = v;
      log(`=> set completed`, "result");
    } catch (e) {
      log(`threw: ${e instanceof Error ? e.message : String(e)}`, "error");
    }
  };
  const runDelete = () => {
    const p = ensureProxy().obj;
    try {
      const ok = delete (p as Record<string, unknown>)[propName];
      log(`=> delete returned ${ok}`, "result");
    } catch (e) {
      log(`threw: ${e instanceof Error ? e.message : String(e)}`, "error");
    }
  };
  const runHas = () => {
    const p = ensureProxy().obj;
    const ok = propName in p;
    log(`=> "${propName}" in proxy is ${ok}`, "result");
  };
  const runKeys = () => {
    const p = ensureProxy().obj;
    const keys = Object.keys(p);
    log(`=> Object.keys = [${keys.map((k) => `"${k}"`).join(", ")}]`, "result");
  };
  const runCall = () => {
    const p = ensureProxy().obj as unknown as (who: string) => string;
    try {
      const out = p(propValue);
      log(`=> returned "${out}"`, "result");
    } catch (e) {
      log(`threw: ${e instanceof Error ? e.message : String(e)}`, "error");
    }
  };

  const code = useMemo(() => CODE_SNIPPETS[scenario], [scenario]);

  const copy = async () => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      trial.recordUse();
      toast.success("Proxy code copied");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  return (
    <ToolPageShell toolId="proxy-reflect-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Proxy and Reflect Playground" left={trial.left} />

      <div className="mb-5 rounded-2xl border border-border bg-card p-4 text-sm">
        <p className="flex items-center gap-2 font-bold"><Radar className="h-4 w-4 text-primary" /> Pick a scenario, then run operations against its proxy.</p>
        <p className="mt-1 text-xs text-muted-foreground">
          <code className="font-mono">Proxy</code> intercepts operations with traps;{" "}
          <code className="font-mono">Reflect</code> performs the default behavior inside the trap so
          language invariants stay intact.
        </p>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => switchScenario(s.id)}
            className={cn(
              "rounded-xl border px-4 py-2.5 text-left transition",
              scenario === s.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/40",
            )}
          >
            <span className={cn("block text-sm font-bold", scenario === s.id && "text-primary")}>{s.label}</span>
            <span className="block text-xs text-muted-foreground">{s.hint}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-bold">Operations</h2>
            <div className="mb-3 grid grid-cols-2 gap-2">
              <label className="text-xs font-bold">
                property
                <input
                  value={propName}
                  onChange={(e) => setPropName(e.target.value)}
                  spellCheck={false}
                  className="mt-1 w-full rounded-lg border border-border bg-muted/40 px-2 py-1.5 font-mono text-xs"
                />
              </label>
              <label className="text-xs font-bold">
                value / argument
                <input
                  value={propValue}
                  onChange={(e) => setPropValue(e.target.value)}
                  spellCheck={false}
                  className="mt-1 w-full rounded-lg border border-border bg-muted/40 px-2 py-1.5 font-mono text-xs"
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {scenario === "function" ? (
                <>
                  <button type="button" onClick={runCall} className="col-span-2 rounded-xl bg-primary px-3 py-2.5 text-xs font-bold text-primary-foreground hover:opacity-90">
                    Call proxy(value)
                  </button>
                  <button type="button" onClick={runGet} className="rounded-xl border border-border px-3 py-2 text-xs font-bold hover:border-primary/60">Get prop</button>
                  <button type="button" onClick={runSet} className="rounded-xl border border-border px-3 py-2 text-xs font-bold hover:border-primary/60">Set prop</button>
                </>
              ) : (
                <>
                  <button type="button" onClick={runGet} className="rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:opacity-90">Get</button>
                  <button type="button" onClick={runSet} className="rounded-xl border border-border px-3 py-2 text-xs font-bold hover:border-primary/60">Set</button>
                  <button type="button" onClick={runDelete} className="rounded-xl border border-border px-3 py-2 text-xs font-bold hover:border-primary/60">Delete</button>
                  <button type="button" onClick={runHas} className="rounded-xl border border-border px-3 py-2 text-xs font-bold hover:border-primary/60">Has (in)</button>
                  <button type="button" onClick={runKeys} className="col-span-2 rounded-xl border border-border px-3 py-2 text-xs font-bold hover:border-primary/60">Object.keys</button>
                </>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold">Trap log</h2>
              <button type="button" onClick={() => setLogEntries([])} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/60">
                <Trash2 className="h-3.5 w-3.5" /> Clear
              </button>
            </div>
            <div className="max-h-72 space-y-1.5 overflow-y-auto">
              {logEntries.length === 0 ? (
                <p className="rounded-xl bg-muted/40 p-3 text-center text-xs text-muted-foreground">
                  Run an operation. Each fired trap appears here in order.
                </p>
              ) : (
                logEntries.map((e) => (
                  <p
                    key={e.id}
                    className={cn(
                      "rounded-lg px-3 py-1.5 font-mono text-xs",
                      e.kind === "trap" && "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                      e.kind === "result" && "bg-green-500/10 text-green-700 dark:text-green-400",
                      e.kind === "error" && "bg-red-500/10 text-red-600",
                    )}
                  >
                    {e.text}
                  </p>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold">Scenario source</h2>
            <button
              type="button"
              onClick={copy}
              disabled={!trial.canUse}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-xs font-bold transition hover:border-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy code"}
            </button>
          </div>
          <pre className="overflow-x-auto rounded-xl bg-muted/40 p-4 font-mono text-xs leading-relaxed">{code}</pre>
          <div className="mt-4 rounded-xl bg-muted/30 p-4 text-xs leading-relaxed text-muted-foreground">
            <p className="font-bold text-foreground">Why Reflect matters</p>
            <p className="mt-1">
              Traps must honor language invariants: for example, a get trap on a non-configurable,
              non-writable data property must return the target's actual value. Calling{" "}
              <code className="font-mono">Reflect.get(target, prop, receiver)</code> performs the
              default operation correctly, including keeping the right <code className="font-mono">this</code>.
            </p>
          </div>
          {!isPro && (
            <p className="mt-3 text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left.
            </p>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
