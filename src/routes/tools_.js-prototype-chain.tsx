// /tools/js-prototype-chain - Interactive prototype chain explorer: define objects,
// walk property lookups hop by hop, click nodes to inspect own properties.

import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Check, Copy, Pause, Play, RotateCcw, StepBack, StepForward } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/js-prototype-chain")({
  head: () => {
    const seo = getToolSeoMeta("js-prototype-chain");
    const canonical = "https://iconvault.site/tools/js-prototype-chain";
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
  component: ProtoChainTool,
});

/* ---------------- model ---------------- */

interface ProtoObj {
  name: string;
  proto: string | null; // name of prototype object, null = end of chain
  props: { key: string; value: string }[];
  kind: string; // "yours" | "builtin" | "instance"
}

const BUILTINS: ProtoObj[] = [
  {
    name: "Object.prototype", proto: null, kind: "builtin",
    props: [
      { key: "hasOwnProperty", value: "function" },
      { key: "toString", value: "function" },
      { key: "valueOf", value: "function" },
      { key: "constructor", value: "function" },
    ],
  },
  {
    name: "Array.prototype", proto: "Object.prototype", kind: "builtin",
    props: [
      { key: "map", value: "function" },
      { key: "filter", value: "function" },
      { key: "push", value: "function" },
      { key: "slice", value: "function" },
      { key: "length", value: "0 (on instances)" },
    ],
  },
  {
    name: "String.prototype", proto: "Object.prototype", kind: "builtin",
    props: [
      { key: "slice", value: "function" },
      { key: "toUpperCase", value: "function" },
      { key: "split", value: "function" },
    ],
  },
  {
    name: "Number.prototype", proto: "Object.prototype", kind: "builtin",
    props: [
      { key: "toFixed", value: "function" },
      { key: "toString", value: "function" },
    ],
  },
  {
    name: "Function.prototype", proto: "Object.prototype", kind: "builtin",
    props: [
      { key: "call", value: "function" },
      { key: "apply", value: "function" },
      { key: "bind", value: "function" },
    ],
  },
];

function parseDefs(src: string): { objects: ProtoObj[]; errors: string[] } {
  const errors: string[] = [];
  const objects: ProtoObj[] = [];
  const byName = new Map<string, ProtoObj>();
  const get = (n: string) => byName.get(n) ?? BUILTINS.find((b) => b.name === n);

  const lines = src.split("\n");
  lines.forEach((raw, li) => {
    const line = raw.trim().replace(/;$/, "").trim();
    if (!line || line.startsWith("//")) return;
    const ln = li + 1;

    let m = line.match(/^(?:const|let|var)\s+(\w+)\s*=\s*\{\s*([^}]*)\}$/);
    if (m) {
      const name = m[1]!;
      const props: { key: string; value: string }[] = [];
      const inner = m[2]!.trim();
      if (inner) {
        for (const part of inner.split(",")) {
          const pm = part.trim().match(/^(\w+)\s*:\s*(.+)$/);
          if (!pm) { errors.push(`Line ${ln}: could not read property "${part.trim().slice(0, 30)}".`); continue; }
          props.push({ key: pm[1]!, value: pm[2]!.trim() });
        }
      }
      const o: ProtoObj = { name, proto: "Object.prototype", kind: "yours", props };
      objects.push(o); byName.set(name, o);
      return;
    }
    m = line.match(/^(?:const|let|var)\s+(\w+)\s*=\s*Object\.create\(\s*(\w[\w.]*)\s*\)$/);
    if (m) {
      const o: ProtoObj = { name: m[1]!, proto: m[2]!, kind: "yours", props: [] };
      objects.push(o); byName.set(m[1]!, o);
      return;
    }
    m = line.match(/^(?:const|let|var)\s+(\w+)\s*=\s*\[\s*([^\]]*)\]$/);
    if (m) {
      const items = m[2]!.trim();
      const o: ProtoObj = {
        name: m[1]!, proto: "Array.prototype", kind: "instance",
        props: items ? [{ key: "length", value: String(items.split(",").length) }] : [{ key: "length", value: "0" }],
      };
      objects.push(o); byName.set(m[1]!, o);
      return;
    }
    m = line.match(/^(?:const|let|var)\s+(\w+)\s*=\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\d+(?:\.\d+)?)$/);
    if (m) {
      const lit = m[2]!;
      const proto = lit.startsWith('"') || lit.startsWith("'") ? "String.prototype" : "Number.prototype";
      const o: ProtoObj = { name: m[1]!, proto, kind: "instance", props: [{ key: "[[primitive]]", value: lit }] };
      objects.push(o); byName.set(m[1]!, o);
      return;
    }
    m = line.match(/^(\w+)\.(\w+)\s*=\s*(.+)$/);
    if (m && !line.startsWith("const") && !line.startsWith("let") && !line.startsWith("var")) {
      const target = get(m[1]!);
      if (!target) { errors.push(`Line ${ln}: "${m[1]}" is not defined yet.`); return; }
      const ex = target.props.find((p) => p.key === m[2]);
      if (ex) ex.value = m[3]!.trim();
      else target.props.push({ key: m[2]!, value: m[3]!.trim() });
      return;
    }
    errors.push(`Line ${ln}: unsupported. Use { a: 1 }, Object.create(x), [...], "..." or obj.prop = value.`);
  });

  for (const o of objects) {
    if (o.proto && !get(o.proto)) errors.push(`"${o.name}" links to unknown prototype "${o.proto}".`);
  }
  return { objects, errors };
}

interface WalkStep {
  node: string;
  found: string | null;
  note: string;
  done: boolean;
}

function walkLookup(objects: ProtoObj[], start: string, prop: string): { steps: WalkStep[]; chain: string[]; foundOn: string | null } {
  const byName = new Map<string, ProtoObj>();
  for (const o of objects) byName.set(o.name, o);
  for (const b of BUILTINS) byName.set(b.name, b);
  const steps: WalkStep[] = [];
  const chain: string[] = [];
  let cur: string | null = start;
  let guard = 0;
  let foundOn: string | null = null;
  while (cur && guard++ < 20) {
    chain.push(cur);
    const obj = byName.get(cur);
    if (!obj) {
      steps.push({ node: cur, found: null, note: `"${cur}" is not a known object.`, done: true });
      break;
    }
    const own = obj.props.find((p) => p.key === prop);
    if (own) {
      foundOn = cur;
      steps.push({
        node: cur, found: own.value, done: true,
        note: `Found: "${prop}" is an OWN property of ${cur} = ${own.value}. Lookup stops here.`,
      });
      break;
    }
    if (!obj.proto) {
      steps.push({ node: cur, found: null, done: true, note: `${cur} has no "${prop}", and its prototype is null. Result: undefined.` });
      break;
    }
    steps.push({
      node: cur, found: null, done: false,
      note: `${cur} does not have "${prop}" as an own property. Follow [[Prototype]] to ${obj.proto}.`,
    });
    cur = obj.proto;
  }
  return { steps, chain, foundOn };
}

/* ---------------- presets ---------------- */

const PRESETS = [
  {
    name: "Shadowing",
    defs: `const animal = { legs: 4, eats: true };\nconst dog = Object.create(animal);\ndog.barks = true;\ndog.legs = 3;`,
    expr: "dog.legs",
  },
  {
    name: "Array methods",
    defs: `const scores = [10, 20];`,
    expr: "scores.map",
  },
  {
    name: "Deep chain",
    defs: `const a = { fromA: 1 };\nconst b = Object.create(a);\nb.fromB = 2;\nconst c = Object.create(b);`,
    expr: "c.fromA",
  },
];

function ProtoChainTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("js-prototype-chain", isPro);
  const seo = getToolSeo("js-prototype-chain");

  const [defs, setDefs] = useState(PRESETS[0]!.defs);
  const [appliedDefs, setAppliedDefs] = useState(PRESETS[0]!.defs);
  const [expr, setExpr] = useState(PRESETS[0]!.expr);
  const [appliedExpr, setAppliedExpr] = useState(PRESETS[0]!.expr);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const parsed = useMemo(() => parseDefs(appliedDefs), [appliedDefs]);
  const all = useMemo(() => [...parsed.objects, ...BUILTINS], [parsed]);
  const lookup = useMemo(() => {
    const m = appliedExpr.trim().match(/^(\w+)\.(\w+)$/);
    if (!m) return null;
    return { start: m[1]!, prop: m[2]!, ...walkLookup(parsed.objects, m[1]!, m[2]!) };
  }, [appliedExpr, parsed]);

  useEffect(() => {
    setStep(0);
    setPlaying(false);
    setSelected(null);
  }, [parsed, lookup]);

  const timerRef = useRef<number | null>(null);
  useEffect(() => {
    if (!playing || !lookup) return;
    timerRef.current = window.setInterval(() => {
      setStep((s) => {
        if (s >= lookup.steps.length - 1) {
          if (timerRef.current !== null) window.clearInterval(timerRef.current);
          setPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, 1100);
    return () => { if (timerRef.current !== null) window.clearInterval(timerRef.current); };
  }, [playing, lookup]);

  const activeStep = lookup && lookup.steps.length ? lookup.steps[Math.min(step, lookup.steps.length - 1)]! : null;
  const selectedObj = selected ? all.find((o) => o.name === selected) : null;

  const copyChain = async () => {
    if (!trial.canUse || !lookup) return;
    const text = lookup.chain.join("  ->  ") + "  ->  null" +
      (lookup.foundOn ? `\n"${appliedExpr.trim()}" found on ${lookup.foundOn}` : `\n"${appliedExpr.trim()}" not found (undefined)`);
    try {
      await navigator.clipboard.writeText(text);
      trial.recordUse();
      setCopied(true);
      toast.success("Chain copied");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed in this browser");
    }
  };

  const applyPreset = (p: (typeof PRESETS)[number]) => {
    setDefs(p.defs); setAppliedDefs(p.defs);
    setExpr(p.expr); setAppliedExpr(p.expr);
  };

  return (
    <ToolPageShell toolId="js-prototype-chain" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Prototype Visualizer" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Presets</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs font-bold transition",
                    appliedDefs === p.defs
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  )}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Define objects</p>
            <textarea
              value={defs}
              onChange={(e) => setDefs(e.target.value)}
              spellCheck={false}
              rows={8}
              className="w-full rounded-xl border border-border bg-background p-3 font-mono text-xs leading-relaxed outline-none focus:border-primary/60"
            />
          </div>
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Look up a property</p>
            <div className="flex gap-2">
              <input
                value={expr}
                onChange={(e) => setExpr(e.target.value)}
                spellCheck={false}
                placeholder="dog.legs"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary/60"
              />
              <ActionButton onClick={() => { setAppliedDefs(defs); setAppliedExpr(expr); }}>
                Walk
              </ActionButton>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">Format: object.property, e.g. dog.legs or scores.map</p>
          </div>
          {parsed.errors.length > 0 && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3">
              {parsed.errors.map((e, i) => (
                <p key={i} className="text-xs font-medium text-red-500">{e}</p>
              ))}
            </div>
          )}
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left. Exploring the chain is always free.
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              disabled={!lookup || lookup.steps.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {playing ? "Pause" : "Play"}
            </button>
            <button
              type="button"
              onClick={() => { setPlaying(false); setStep((s) => Math.max(0, s - 1)); }}
              disabled={!lookup || step === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-bold transition hover:border-primary/40 disabled:opacity-50"
            >
              <StepBack className="h-4 w-4" /> Back
            </button>
            <button
              type="button"
              onClick={() => { setPlaying(false); lookup && setStep((s) => Math.min(lookup.steps.length - 1, s + 1)); }}
              disabled={!lookup || step >= lookup.steps.length - 1}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-bold transition hover:border-primary/40 disabled:opacity-50"
            >
              <StepForward className="h-4 w-4" /> Step
            </button>
            <button
              type="button"
              onClick={() => { setPlaying(false); setStep(0); }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-bold transition hover:border-primary/40"
            >
              <RotateCcw className="h-4 w-4" /> Reset
            </button>
            <button
              type="button"
              onClick={copyChain}
              disabled={!trial.canUse || !lookup}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-bold transition hover:border-primary/40 disabled:opacity-50"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy chain"}
            </button>
          </div>

          {!lookup ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <p className="font-semibold">Enter a lookup like dog.legs and press Walk</p>
              <p className="mt-1 text-sm text-muted-foreground">The lookup hops from object to prototype until it finds the property or reaches null.</p>
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Lookup: <span className="font-mono normal-case text-foreground">{appliedExpr.trim()}</span>
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {lookup.chain.map((n, i) => {
                    const isActive = activeStep?.node === n;
                    const isFound = lookup.foundOn === n;
                    return (
                      <span key={`${n}-${i}`} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelected(n)}
                          className={cn(
                            "rounded-xl border-2 px-4 py-2.5 font-mono text-sm font-bold transition",
                            isFound
                              ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : isActive
                                ? "border-primary bg-primary/10 text-primary"
                                : selected === n
                                  ? "border-primary/60 bg-card"
                                  : "border-border bg-card hover:border-primary/40"
                          )}
                        >
                          {n}
                        </button>
                        {i < lookup.chain.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
                      </span>
                    );
                  })}
                  <span className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <span className="rounded-xl border-2 border-dashed border-border px-4 py-2.5 font-mono text-sm font-bold text-muted-foreground">null</span>
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Click any node to inspect its own properties.</p>
              </div>

              {activeStep && (
                <div className={cn(
                  "rounded-2xl border p-4",
                  activeStep.done
                    ? activeStep.found !== null
                      ? "border-emerald-500/40 bg-emerald-500/5"
                      : "border-red-500/40 bg-red-500/5"
                    : "border-border bg-card"
                )}>
                  <p className="text-sm leading-relaxed">
                    <span className="font-mono font-bold">{activeStep.node}</span>: {activeStep.note}
                  </p>
                  <p className="mt-2 text-xs font-bold text-muted-foreground">
                    Hop {step + 1} of {lookup.steps.length}
                  </p>
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {selectedObj ? `Own properties of ${selectedObj.name}` : "Own properties"}
                  </p>
                  {!selectedObj ? (
                    <p className="text-xs text-muted-foreground">Select a node above to see what it owns (not inherits).</p>
                  ) : selectedObj.props.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No own properties: everything comes from its prototype.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {selectedObj.props.map((p) => (
                        <div key={p.key} className="flex items-baseline justify-between gap-2 rounded-lg bg-muted/40 px-3 py-1.5 font-mono text-xs">
                          <span className="font-bold text-primary">{p.key}</span>
                          <span className="truncate text-muted-foreground">{p.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Your objects</p>
                  {parsed.objects.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Define objects on the left, or pick a preset.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {parsed.objects.map((o) => (
                        <button
                          key={o.name}
                          type="button"
                          onClick={() => setSelected(o.name)}
                          className={cn(
                            "rounded-lg border px-2.5 py-1.5 font-mono text-xs font-bold transition",
                            selected === o.name ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40"
                          )}
                        >
                          {o.name}
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="mt-3 text-xs text-muted-foreground">
                    Built-ins included: Object.prototype, Array.prototype, String.prototype, Number.prototype, Function.prototype.
                  </p>
                </div>
              </div>
            </>
          )}

          <p className="text-xs text-muted-foreground">
            Simplified model: real engines store the link in an internal [[Prototype]] slot and primitives are temporarily boxed. The lookup order shown matches the language spec.
          </p>
        </div>
      </div>
    </ToolPageShell>
  );
}
