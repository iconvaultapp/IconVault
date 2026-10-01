// /tools/js-set-map-lab - ES2025 Set operations (union, intersection, difference,
// symmetricDifference, isSubsetOf...) with live Venn diagrams, plus a Map playground.

import { useCallback, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Circle, Copy, Play } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/js-set-map-lab")({
  head: () => {
    const seo = getToolSeoMeta("js-set-map-lab");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: SetMapLabTool,
});

type Tab = "sets" | "maps";
type Op = "union" | "intersection" | "differenceAB" | "differenceBA" | "symmetricDifference" | "isSubsetOf" | "isSupersetOf" | "isDisjointFrom";

const OPS: { id: Op; label: string; method: string; desc: string }[] = [
  { id: "union", label: "Union", method: "a.union(b)", desc: "Everything in A or B" },
  { id: "intersection", label: "Intersection", method: "a.intersection(b)", desc: "Only in both A and B" },
  { id: "differenceAB", label: "A minus B", method: "a.difference(b)", desc: "In A but not in B" },
  { id: "differenceBA", label: "B minus A", method: "b.difference(a)", desc: "In B but not in A" },
  { id: "symmetricDifference", label: "Symmetric difference", method: "a.symmetricDifference(b)", desc: "In exactly one of A, B" },
  { id: "isSubsetOf", label: "A subset of B?", method: "a.isSubsetOf(b)", desc: "Every element of A is in B" },
  { id: "isSupersetOf", label: "A superset of B?", method: "a.isSupersetOf(b)", desc: "Every element of B is in A" },
  { id: "isDisjointFrom", label: "Disjoint?", method: "a.isDisjointFrom(b)", desc: "A and B share nothing" },
];

const NATIVE = typeof (Set.prototype as unknown as { union?: unknown }).union === "function";

function parseSet(text: string): (string | number)[] {
  const seen = new Set<string>();
  const out: (string | number)[] = [];
  for (const part of text.split(/[\n,]+/)) {
    const t = part.trim();
    if (!t) continue;
    const n = Number(t);
    const v: string | number = t !== "" && !Number.isNaN(n) ? n : t;
    const key = `${typeof v}:${v}`;
    if (!seen.has(key)) { seen.add(key); out.push(v); }
  }
  return out;
}

function fmtVal(v: string | number): string {
  return typeof v === "string" ? `"${v}"` : String(v);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function nativeOp(a: Set<any>, b: Set<any>, op: Op): Set<any> | boolean {
  const s = a as unknown as Record<string, (o: Set<unknown>) => unknown>;
  switch (op) {
    case "union": return s["union"]!(b) as Set<unknown>;
    case "intersection": return s["intersection"]!(b) as Set<unknown>;
    case "differenceAB": return s["difference"]!(b) as Set<unknown>;
    case "differenceBA": return (b as unknown as Record<string, (o: Set<unknown>) => Set<unknown>>)["difference"]!(a);
    case "symmetricDifference": return s["symmetricDifference"]!(b) as Set<unknown>;
    case "isSubsetOf": return s["isSubsetOf"]!(b) as boolean;
    case "isSupersetOf": return s["isSupersetOf"]!(b) as boolean;
    case "isDisjointFrom": return s["isDisjointFrom"]!(b) as boolean;
  }
}

function manualOp(a: Set<string | number>, b: Set<string | number>, op: Op): Set<string | number> | boolean {
  const arr = [...a], brr = [...b];
  switch (op) {
    case "union": return new Set([...arr, ...brr]);
    case "intersection": return new Set(arr.filter((x) => b.has(x)));
    case "differenceAB": return new Set(arr.filter((x) => !b.has(x)));
    case "differenceBA": return new Set(brr.filter((x) => !a.has(x)));
    case "symmetricDifference": return new Set([...arr.filter((x) => !b.has(x)), ...brr.filter((x) => !a.has(x))]);
    case "isSubsetOf": return arr.every((x) => b.has(x));
    case "isSupersetOf": return brr.every((x) => a.has(x));
    case "isDisjointFrom": return arr.every((x) => !b.has(x));
  }
}

function Venn({ op }: { op: Op }) {
  const hl = "#0F766E";
  const dim = "rgba(148,163,184,0.18)";
  const region = (id: string) => {
    switch (op) {
      case "union": return id !== "none" ? hl : dim;
      case "intersection": return id === "both" ? hl : dim;
      case "differenceAB": return id === "a" ? hl : dim;
      case "differenceBA": return id === "b" ? hl : dim;
      case "symmetricDifference": return id === "a" || id === "b" ? hl : dim;
      default: return id === "both" ? hl : dim;
    }
  };
  return (
    <svg viewBox="0 0 300 190" className="w-full max-w-[340px]">
      <defs>
        <clipPath id="venn-clipB"><circle cx="185" cy="95" r="62" /></clipPath>
        <mask id="venn-notB">
          <rect x="0" y="0" width="300" height="190" fill="white" />
          <circle cx="185" cy="95" r="62" fill="black" />
        </mask>
        <mask id="venn-notA">
          <rect x="0" y="0" width="300" height="190" fill="white" />
          <circle cx="115" cy="95" r="62" fill="black" />
        </mask>
      </defs>
      <circle cx="115" cy="95" r="62" fill={region("a")} mask="url(#venn-notB)" opacity="0.85" />
      <circle cx="185" cy="95" r="62" fill={region("b")} mask="url(#venn-notA)" opacity="0.85" />
      <g clipPath="url(#venn-clipB)">
        <circle cx="115" cy="95" r="62" fill={region("both")} opacity="0.85" />
      </g>
      <circle cx="115" cy="95" r="62" fill="none" stroke={hl} strokeWidth="2.5" />
      <circle cx="185" cy="95" r="62" fill="none" stroke={hl} strokeWidth="2.5" />
      <text x="80" y="99" textAnchor="middle" fontSize="22" fontWeight="800" fill="#0F766E">A</text>
      <text x="220" y="99" textAnchor="middle" fontSize="22" fontWeight="800" fill="#0F766E">B</text>
    </svg>
  );
}

function SetsTab({ trial }: { trial: ReturnType<typeof useToolTrial> }) {
  const [aText, setAText] = useState("1, 2, 3, 4");
  const [bText, setBText] = useState("3, 4, 5, 6");
  const [op, setOp] = useState<Op>("intersection");

  const a = useMemo(() => parseSet(aText), [aText]);
  const b = useMemo(() => parseSet(bText), [bText]);

  const result = useMemo(() => {
    const sa = new Set(a), sb = new Set(b);
    const r = NATIVE ? nativeOp(sa, sb, op) : manualOp(sa, sb, op);
    return r;
  }, [a, b, op]);

  const isBool = typeof result === "boolean";
  const resultArr = isBool ? [] : [...(result as Set<string | number>)];
  const opMeta = OPS.find((o) => o.id === op)!;

  const onlyA = a.filter((x) => !b.includes(x));
  const onlyB = b.filter((x) => !a.includes(x));
  const both = a.filter((x) => b.includes(x));

  const runCode = `const a = new Set([${a.map(fmtVal).join(", ")}]);\nconst b = new Set([${b.map(fmtVal).join(", ")}]);\nconst result = ${opMeta.method};\n// ${isBool ? String(result) : `[${resultArr.map(fmtVal).join(", ")}]`}`;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <label className="text-xs font-semibold text-muted-foreground">
            Set A
            <textarea value={aText} onChange={(e) => setAText(e.target.value)} rows={3} spellCheck={false}
              className="mt-1 block w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary" />
          </label>
          <label className="text-xs font-semibold text-muted-foreground">
            Set B
            <textarea value={bText} onChange={(e) => setBText(e.target.value)} rows={3} spellCheck={false}
              className="mt-1 block w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary" />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          {OPS.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => { setOp(o.id); trial.recordUse(); }}
              className={cn(
                "rounded-xl border px-3.5 py-2 text-[13px] font-semibold transition",
                op === o.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-mono text-sm font-bold text-primary">{opMeta.method}</p>
          <p className="mt-1 text-sm text-muted-foreground">{opMeta.desc}</p>
          <p className="mt-3 font-mono text-[15px] font-bold">
            {"=> "}{isBool
              ? <span className={result ? "text-emerald-500" : "text-red-500"}>{String(result)}</span>
              : <span>[{resultArr.map(fmtVal).join(", ")}]</span>}
          </p>
          {!NATIVE && (
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">Your browser lacks the native ES2025 methods, so this result was computed with a manual fallback.</p>
          )}
        </div>
      </div>
      <div className="space-y-4">
        <div className="flex flex-col items-center rounded-2xl border border-border bg-card p-5">
          <Venn op={op} />
          <div className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-1 font-mono text-xs text-muted-foreground">
            <span>A only: [{onlyA.map(fmtVal).join(", ")}]</span>
            <span>Both: [{both.map(fmtVal).join(", ")}]</span>
            <span>B only: [{onlyB.map(fmtVal).join(", ")}]</span>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-xl border border-border bg-[#0d1117]">
          <button
            type="button"
            onClick={() => { void navigator.clipboard.writeText(runCode).then(() => toast.success("Code copied")).catch(() => toast.error("Copy failed")); }}
            className="absolute right-2 top-2 flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/20"
          >
            <Copy className="h-3.5 w-3.5" /> Copy
          </button>
          <pre className="overflow-x-auto p-4 pr-20 font-mono text-[13px] leading-relaxed text-[#e6edf3]">{runCode}</pre>
        </div>
      </div>
    </div>
  );
}

function MapsTab() {
  const [entries, setEntries] = useState<[string, string][]>([["name", "sameer"], ["plan", "pro"]]);
  const [k, setK] = useState("");
  const [v, setV] = useState("");
  const [lookup, setLookup] = useState("");
  const [lookupOut, setLookupOut] = useState<string | null>(null);

  const map = useMemo(() => new Map(entries), [entries]);

  const doLookup = useCallback(() => {
    if (!lookup) return;
    setLookupOut(map.has(lookup) ? `map.get("${lookup}") -> "${map.get(lookup)}"` : `map.has("${lookup}") -> false`);
  }, [lookup, map]);

  const mapCode = `const map = new Map();
${entries.map(([ek, ev]) => `map.set("${ek}", "${ev}");`).join("\n")}
map.size; // ${map.size}
for (const [key, value] of map) console.log(key, value);`;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <p className="text-sm font-bold">Live Map ({map.size} entries)</p>
        <div className="flex gap-2">
          <input value={k} onChange={(e) => setK(e.target.value)} placeholder="key" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" />
          <input value={v} onChange={(e) => setV(e.target.value)} placeholder="value" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" />
          <button
            type="button"
            onClick={() => { if (!k) { toast.error("Enter a key"); return; } setEntries((p) => [...p.filter(([ek]) => ek !== k), [k, v]]); setK(""); setV(""); }}
            className="shrink-0 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90"
          >
            Set
          </button>
        </div>
        <div className="space-y-1.5">
          {entries.map(([ek, ev]) => (
            <div key={ek} className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 font-mono text-[13px]">
              <span className="font-bold text-primary">"{ek}"</span>
              <span className="text-muted-foreground">→</span>
              <span>"{ev}"</span>
              <button
                type="button"
                onClick={() => setEntries((p) => p.filter(([x]) => x !== ek))}
                className="ml-auto rounded-lg border border-border px-2 py-0.5 text-xs font-semibold text-muted-foreground transition hover:border-red-400 hover:text-red-500"
              >
                delete
              </button>
            </div>
          ))}
          {entries.length === 0 && <p className="text-sm text-muted-foreground">Empty map. Add an entry above.</p>}
        </div>
        <div className="flex gap-2">
          <input value={lookup} onChange={(e) => setLookup(e.target.value)} placeholder="key to look up" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" />
          <button type="button" onClick={doLookup} className="shrink-0 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground">
            Get
          </button>
        </div>
        {lookupOut && <p className="rounded-xl bg-[#0d1117] p-3 font-mono text-[13px] text-[#e6edf3]">{lookupOut}</p>}
      </div>
      <div className="space-y-4">
        <div className="relative overflow-hidden rounded-xl border border-border bg-[#0d1117]">
          <button
            type="button"
            onClick={() => { void navigator.clipboard.writeText(mapCode).then(() => toast.success("Code copied")).catch(() => toast.error("Copy failed")); }}
            className="absolute right-2 top-2 flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/20"
          >
            <Copy className="h-3.5 w-3.5" /> Copy
          </button>
          <pre className="overflow-x-auto p-4 pr-20 font-mono text-[13px] leading-relaxed text-[#e6edf3]">{mapCode}</pre>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
          <p className="mb-2 flex items-center gap-2 font-bold text-foreground"><Circle className="h-4 w-4 text-primary" /> Map vs WeakMap</p>
          <p>A Map holds its keys strongly, so entries never get garbage collected while the map lives. A WeakMap holds keys weakly: when nothing else references a key object, the entry vanishes on its own. That makes WeakMap the right tool for caches and private metadata, never for counting entries (it has no size).</p>
        </div>
      </div>
    </div>
  );
}

function SetMapLabTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("js-set-map-lab", isPro);
  const seo = getToolSeo("js-set-map-lab");
  const [tab, setTab] = useState<Tab>("sets");

  return (
    <ToolPageShell toolId="js-set-map-lab" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="JS Set and Map Lab" left={trial.left} />
      <div className="mb-6 flex gap-2">
        {(["sets", "maps"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-semibold transition",
              tab === t ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
            )}
          >
            {t === "sets" ? <><Check className="h-4 w-4" /> Set operations</> : <><Play className="h-4 w-4" /> Map playground</>}
          </button>
        ))}
      </div>
      {tab === "sets" ? <SetsTab trial={trial} /> : <MapsTab />}
      {!isPro && (
        <p className="mt-6 text-xs text-muted-foreground">{trial.left} of {TOOL_TRIAL_LIMIT} free experiments left. Runs fully in your browser.</p>
      )}
    </ToolPageShell>
  );
}
