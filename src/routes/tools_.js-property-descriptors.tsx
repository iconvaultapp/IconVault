// /tools/js-property-descriptors - Define properties with writable /
// enumerable / configurable toggles, run live mutation attempts, and explore
// freeze / seal / preventExtensions gotchas with real executed code.

import { useCallback, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, KeyRound, Play } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/js-property-descriptors";
import toolSeoMeta from "@/lib/tool-seo-meta-data/js-property-descriptors";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/js-property-descriptors")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/js-property-descriptors";
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
  component: PropertyDescriptorsTool,
});

type PropDef = { name: string; raw: string; writable: boolean; enumerable: boolean; configurable: boolean };

function parseValue(raw: string): { ok: boolean; value: unknown } {
  const t = raw.trim();
  if (t === "undefined") return { ok: true, value: undefined };
  try {
    return { ok: true, value: JSON.parse(t) };
  } catch {
    return { ok: false, value: undefined };
  }
}

function fmt(v: unknown): string {
  if (typeof v === "string") return `"${v}"`;
  if (v === undefined) return "undefined";
  try { return JSON.stringify(v); } catch { return String(v); }
}

function CodeBlock({ code, onCopy }: { code: string; onCopy: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-[#0d1117]">
      <button
        type="button"
        onClick={() => { onCopy(); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        className="absolute right-2 top-2 flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/20"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied" : "Copy"}
      </button>
      <pre className="overflow-x-auto p-4 pr-20 font-mono text-[13px] leading-relaxed text-[#e6edf3]">{code}</pre>
    </div>
  );
}

const GOTCHAS: { title: string; code: string; run: () => string[] }[] = [
  {
    title: "Frozen array push throws",
    code: `const arr = Object.freeze([1, 2, 3]);
arr.push(4); // TypeError in strict mode`,
    run: () => {
      const out: string[] = [];
      try {
        const arr = Object.freeze([1, 2, 3]);
        (arr as number[]).push(4);
        out.push("push silently ignored (sloppy mode)");
      } catch (e) {
        out.push(`TypeError: ${(e as Error).message}`);
      }
      return out;
    },
  },
  {
    title: "Freeze is shallow",
    code: `const obj = Object.freeze({ nested: { a: 1 } });
obj.nested.a = 99; // works! freeze is shallow`,
    run: () => {
      const obj = Object.freeze({ nested: { a: 1 } });
      obj.nested.a = 99;
      return [`obj.nested.a is now ${obj.nested.a} - nested objects are NOT frozen`];
    },
  },
  {
    title: "Seal allows writes, blocks add/delete",
    code: `const obj = Object.seal({ a: 1 });
obj.a = 2;      // ok
obj.b = 3;      // TypeError in strict mode
delete obj.a;   // TypeError in strict mode`,
    run: () => {
      const out: string[] = [];
      const obj = Object.seal({ a: 1 });
      obj.a = 2;
      out.push(`write ok: a = ${obj.a}`);
      try { (obj as Record<string, number>)["b"] = 3; out.push("add silently ignored"); }
      catch (e) { out.push(`add -> TypeError: ${(e as Error).message}`); }
      try { delete (obj as Record<string, number>)["a"]; out.push("delete silently ignored"); }
      catch (e) { out.push(`delete -> TypeError: ${(e as Error).message}`); }
      return out;
    },
  },
  {
    title: "Non-configurable cannot be redefined",
    code: `const obj = {};
Object.defineProperty(obj, "id", { value: 1, configurable: false });
Object.defineProperty(obj, "id", { writable: true }); // TypeError`,
    run: () => {
      try {
        const obj: Record<string, number> = {};
        Object.defineProperty(obj, "id", { value: 1, configurable: false });
        Object.defineProperty(obj, "id", { writable: true });
        return ["redefined (unexpected)"];
      } catch (e) {
        return [`TypeError: ${(e as Error).message}`];
      }
    },
  },
];

function PropertyDescriptorsTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("js-property-descriptors", isPro);
  const seo = toolSeo;

  const [props, setProps] = useState<PropDef[]>([
    { name: "id", raw: "1", writable: false, enumerable: true, configurable: false },
    { name: "secret", raw: '"shh"', writable: true, enumerable: false, configurable: true },
  ]);
  const [name, setName] = useState("role");
  const [raw, setRaw] = useState('"admin"');
  const [w, setW] = useState(true);
  const [e, setE] = useState(true);
  const [c, setC] = useState(true);
  const [log, setLog] = useState<string[]>([]);
  const [gotchaOut, setGotchaOut] = useState<Record<string, string[]>>({});

  const target = useMemo(() => {
    const obj: Record<string, unknown> = {};
    for (const p of props) {
      const parsed = parseValue(p.raw);
      if (!parsed.ok || !p.name) continue;
      Object.defineProperty(obj, p.name, {
        value: parsed.value,
        writable: p.writable,
        enumerable: p.enumerable,
        configurable: p.configurable,
      });
    }
    return obj;
  }, [props]);

  const descriptors = useMemo(() => {
    const out: Record<string, PropertyDescriptor | undefined> = {};
    for (const k of Object.getOwnPropertyNames(target)) out[k] = Object.getOwnPropertyDescriptor(target, k);
    return out;
  }, [target]);

  const addLog = useCallback((line: string) => setLog((p) => [...p.slice(-19), line]), []);

  const addProp = useCallback(() => {
    if (!name.trim()) { toast.error("Give the property a name"); return; }
    if (!parseValue(raw).ok) { toast.error("Value must be valid JSON (or undefined)"); return; }
    setProps((p) => [...p.filter((x) => x.name !== name.trim()), { name: name.trim(), raw, writable: w, enumerable: e, configurable: c }]);
    addLog(`defineProperty(obj, "${name.trim()}", { writable: ${w}, enumerable: ${e}, configurable: ${c} })`);
  }, [name, raw, w, e, c, addLog]);

  const tryAssign = useCallback((p: PropDef) => {
    try {
      (target as Record<string, unknown>)[p.name] = "CHANGED";
      const after = (target as Record<string, unknown>)[p.name];
      addLog(after === "CHANGED"
        ? `obj.${p.name} = "CHANGED"  ->  wrote ok (writable: true)`
        : `obj.${p.name} = "CHANGED"  ->  silently ignored (writable: false, sloppy mode)`);
    } catch (err) {
      addLog(`obj.${p.name} = "CHANGED"  ->  TypeError: ${(err as Error).message}`);
    }
  }, [target, addLog]);

  const tryDelete = useCallback((p: PropDef) => {
    try {
      const ok = delete (target as Record<string, unknown>)[p.name];
      addLog(ok ? `delete obj.${p.name}  ->  removed (configurable: true)` : `delete obj.${p.name}  ->  returned false (configurable: false)`);
      if (ok) setProps((prev) => prev.filter((x) => x.name !== p.name));
    } catch (err) {
      addLog(`delete obj.${p.name}  ->  TypeError: ${(err as Error).message}`);
    }
  }, [target, addLog]);

  const runAll = useCallback(() => {
    if (!trial.canUse) return;
    setLog([]);
    addLog(`Object.keys(obj) -> [${Object.keys(target).map((k) => `"${k}"`).join(", ")}]${props.some((p) => !p.enumerable) ? "  (non-enumerable props hidden)" : ""}`);
    addLog(`JSON.stringify(obj) -> ${JSON.stringify(target)}`);
    addLog(`spread { ...obj } keeps ${Object.keys(target).length} enumerable props`);
    trial.recordUse();
  }, [target, props, trial, addLog]);

  const sessionCode = useMemo(() => {
    const defs = props.map((p) =>
      `Object.defineProperty(obj, "${p.name}", {\n  value: ${p.raw},\n  writable: ${p.writable},\n  enumerable: ${p.enumerable},\n  configurable: ${p.configurable},\n});`,
    ).join("\n");
    return `const obj = {};\n${defs}\n\nObject.getOwnPropertyDescriptor(obj, "${props[0]?.name ?? "id"}");\n// ${JSON.stringify(descriptors[props[0]?.name ?? "id"])}`;
  }, [props, descriptors]);

  const toggle = (setter: (v: boolean) => void, v: boolean, label: string) => (
    <button
      type="button"
      onClick={() => setter(!v)}
      className={cn(
        "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition",
        v ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground",
      )}
    >
      <span className={cn("flex h-4 w-7 items-center rounded-full p-0.5 transition", v ? "justify-end bg-primary" : "justify-start bg-muted")}>
        <span className="h-3 w-3 rounded-full bg-white" />
      </span>
      {label}
    </button>
  );

  return (
    <ToolPageShell toolId="js-property-descriptors" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="JS Property Descriptors" left={trial.left} />
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <p className="flex items-center gap-2 text-sm font-bold"><KeyRound className="h-4 w-4 text-primary" /> Define a property</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-muted-foreground">
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} spellCheck={false}
                className="mt-1 block w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary" />
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              Value (JSON)
              <input value={raw} onChange={(e) => setRaw(e.target.value)} spellCheck={false}
                className="mt-1 block w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary" />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {toggle(setW, w, "writable")}
            {toggle(setE, e, "enumerable")}
            {toggle(setC, c, "configurable")}
          </div>
          <ActionButton onClick={addProp}>Define property</ActionButton>
          <div>
            <p className="mb-2 text-xs font-semibold text-muted-foreground">Live object</p>
            <div className="space-y-2">
              {props.map((p) => (
                <div key={p.name} className="rounded-xl border border-border bg-background p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold">{p.name}: <span className="font-normal text-muted-foreground">{fmt(parseValue(p.raw).value)}</span></span>
                    <div className="flex gap-1.5">
                      <button type="button" onClick={() => tryAssign(p)} className="rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground">Try assign</button>
                      <button type="button" onClick={() => tryDelete(p)} className="rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground transition hover:border-red-400 hover:text-red-500">Try delete</button>
                    </div>
                  </div>
                  <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">
                    {"{ "}writable: <span className={p.writable ? "text-emerald-500" : "text-red-500"}>{String(p.writable)}</span>
                    {", "}enumerable: <span className={p.enumerable ? "text-emerald-500" : "text-red-500"}>{String(p.enumerable)}</span>
                    {", "}configurable: <span className={p.configurable ? "text-emerald-500" : "text-red-500"}>{String(p.configurable)}</span>{" }"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold">Experiment log</p>
              <ActionButton onClick={runAll} disabled={!trial.canUse}><Play className="h-4 w-4" /> Inspect keys + JSON</ActionButton>
            </div>
            <div className="min-h-[160px] space-y-1.5 rounded-xl bg-[#0d1117] p-4 font-mono text-[12.5px] leading-relaxed text-[#e6edf3]">
              {log.length === 0 && <p className="text-white/40">Try assign / Try delete on a property, or run the inspector…</p>}
              {log.map((l, i) => <p key={i} className="break-all">{l}</p>)}
            </div>
          </div>
          <CodeBlock code={sessionCode} onCopy={() => { void navigator.clipboard.writeText(sessionCode).then(() => toast.success("Session code copied")).catch(() => toast.error("Copy failed")); }} />
        </div>
      </div>
      <div className="mt-6">
        <p className="mb-3 text-sm font-bold">Freeze / seal gotchas, executed live</p>
        <div className="grid gap-4 md:grid-cols-2">
          {GOTCHAS.map((g) => (
            <div key={g.title} className="space-y-2 rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold">{g.title}</p>
                <button
                  type="button"
                  onClick={() => setGotchaOut((p) => ({ ...p, [g.title]: g.run() }))}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition hover:opacity-90"
                >
                  Run
                </button>
              </div>
              <pre className="overflow-x-auto rounded-xl bg-[#0d1117] p-3 font-mono text-[12px] leading-relaxed text-[#e6edf3]">{g.code}</pre>
              {gotchaOut[g.title] && (
                <div className="space-y-1 rounded-xl border border-border bg-background p-3 font-mono text-[12px]">
                  {gotchaOut[g.title]?.map((l, i) => <p key={i}>{l}</p>)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      {!isPro && (
        <p className="mt-6 text-xs text-muted-foreground">{trial.left} of {TOOL_TRIAL_LIMIT} free inspections left. Runs fully in your browser.</p>
      )}
    </ToolPageShell>
  );
}
