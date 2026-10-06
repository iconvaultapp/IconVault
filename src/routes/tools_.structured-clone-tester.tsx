// /tools/structured-clone-tester - Test what survives structuredClone()
// across 28 value types. Runs live in the browser.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Blocks, Copy, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/structured-clone-tester";
import toolSeoMeta from "@/lib/tool-seo-meta-data/structured-clone-tester";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/structured-clone-tester")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/structured-clone-tester";
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
  component: StructuredCloneTester,
});

type Status = "survives" | "changed" | "throws";

interface CloneTest {
  label: string;
  make: () => unknown;
  verify?: (orig: any, clone: any) => boolean;
  note: string;
}

function same(a: any, b: any): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b || a === null || b === null) return false;
  if (typeof a !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (a instanceof Date) return b instanceof Date && a.getTime() === b.getTime();
  if (a instanceof RegExp)
    return b instanceof RegExp && a.source === b.source && a.flags === b.flags && a.lastIndex === b.lastIndex;
  if (a instanceof Map) {
    if (!(b instanceof Map) || a.size !== b.size) return false;
    for (const [k, v] of a) {
      if (!b.has(k) || !same(v, b.get(k))) return false;
    }
    return true;
  }
  if (a instanceof Set) {
    if (!(b instanceof Set) || a.size !== b.size) return false;
    for (const v of a) if (!b.has(v)) return false;
    return true;
  }
  if (ArrayBuffer.isView(a)) {
    if (!ArrayBuffer.isView(b) || a.byteLength !== b.byteLength) return false;
    const x = new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
    const y = new Uint8Array((b as any).buffer, (b as any).byteOffset, (b as any).byteLength);
    return x.every((v, i) => v === y[i]);
  }
  if (a instanceof ArrayBuffer) {
    if (!(b instanceof ArrayBuffer) || a.byteLength !== b.byteLength) return false;
    const x = new Uint8Array(a);
    const y = new Uint8Array(b);
    return x.every((v, i) => v === y[i]);
  }
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => same(a[k], b[k]));
}

class Point {
  constructor(public x: number, public y: number) {}
  dist() {
    return Math.hypot(this.x, this.y);
  }
}

const TESTS: CloneTest[] = [
  { label: "String", make: () => "hello world", verify: (o, c) => same(o, c), note: "Strings clone exactly." },
  { label: "Number", make: () => 42.5, verify: (o, c) => same(o, c), note: "Numbers clone exactly." },
  { label: "NaN", make: () => NaN, verify: (o, c) => same(o, c), note: "NaN survives (JSON would turn it into null)." },
  { label: "Infinity", make: () => Infinity, verify: (o, c) => same(o, c), note: "Infinity survives (JSON would turn it into null)." },
  { label: "-0", make: () => -0, verify: (o, c) => same(o, c), note: "Negative zero is preserved." },
  { label: "BigInt", make: () => 12345678901234567890n, verify: (o, c) => same(o, c), note: "BigInts clone (JSON throws on them)." },
  { label: "Boolean", make: () => true, verify: (o, c) => same(o, c), note: "Booleans clone exactly." },
  { label: "null", make: () => null, verify: (o, c) => same(o, c), note: "null clones exactly." },
  { label: "undefined", make: () => undefined, verify: (o, c) => same(o, c), note: "undefined clones exactly." },
  { label: "Date", make: () => new Date("2026-01-15T10:30:00Z"), verify: (o, c) => same(o, c), note: "Dates clone as real Date objects, not strings." },
  { label: "RegExp", make: () => /icon-[a-z]+/gi, verify: (o, c) => same(o, c), note: "Source, flags and lastIndex are preserved." },
  { label: "Map", make: () => new Map<string, unknown>([["a", 1], ["b", { nested: true }]]), verify: (o, c) => same(o, c), note: "Maps clone with entries intact (JSON gives {})." },
  { label: "Set", make: () => new Set([1, 2, 3]), verify: (o, c) => same(o, c), note: "Sets clone with values intact (JSON gives {})." },
  { label: "Array", make: () => [1, "two", [3]], verify: (o, c) => same(o, c), note: "Arrays deep-clone." },
  { label: "Plain object", make: () => ({ a: 1, b: { c: [2, 3] } }), verify: (o, c) => same(o, c), note: "Plain objects deep-clone." },
  {
    label: "Nested mixed",
    make: () => ({ d: new Date(0), m: new Map([["k", new Set([1])]]), u: new Uint8Array([9]) }),
    verify: (o, c) => same(o, c),
    note: "Nested special types all survive together.",
  },
  { label: "Uint8Array", make: () => new Uint8Array([1, 2, 250]), verify: (o, c) => same(o, c), note: "Typed arrays keep their type and bytes." },
  { label: "Float64Array", make: () => new Float64Array([0.1, 0.2]), verify: (o, c) => same(o, c), note: "Typed arrays keep their type and values." },
  {
    label: "ArrayBuffer",
    make: () => { const b = new ArrayBuffer(4); new Uint8Array(b).set([1, 2, 3, 4]); return b; },
    verify: (o, c) => same(o, c),
    note: "Raw buffers clone byte for byte.",
  },
  {
    label: "DataView",
    make: () => { const b = new ArrayBuffer(8); const v = new DataView(b); v.setFloat64(0, 1.5); return v; },
    verify: (o, c) => same(o, c),
    note: "DataViews clone with their bytes.",
  },
  {
    label: "Blob",
    make: () => new Blob(["hello"], { type: "text/plain" }),
    verify: (o, c) => c instanceof Blob && c.size === o.size && c.type === o.type,
    note: "Blobs clone (bytes included), useful for file pipelines.",
  },
  {
    label: "File",
    make: () => new File(["data"], "note.txt", { type: "text/plain" }),
    verify: (o, c) => c instanceof File && c.name === o.name && c.size === o.size,
    note: "Files keep name, type and size.",
  },
  {
    label: "Error",
    make: () => Object.assign(new Error("boom"), { code: 500 }),
    verify: (o, c) => c instanceof Error && c.message === o.message,
    note: "Message and extra props survive, but the stack is regenerated and the subclass is lost.",
  },
  {
    label: "DOMException",
    make: () => new DOMException("not here", "NotFoundError"),
    verify: (o, c) => c instanceof DOMException && c.name === o.name && c.message === o.message,
    note: "DOMExceptions clone with name and message intact.",
  },
  {
    label: "Function",
    make: () => () => 42,
    note: "Functions are not serializable and throw DataCloneError.",
  },
  {
    label: "Symbol",
    make: () => Symbol("id"),
    note: "Symbols are not serializable and throw DataCloneError.",
  },
  {
    label: "Class instance",
    make: () => new Point(3, 4),
    verify: (o, c) => same(o, c) && Object.getPrototypeOf(c) === Object.prototype,
    note: "Own properties survive, but the prototype is dropped, so methods like dist() are lost.",
  },
  {
    label: "Circular reference",
    make: () => { const o: any = { name: "loop" }; o.self = o; return o; },
    verify: (o, c) => c.self === c && c.name === o.name,
    note: "Circular graphs clone correctly (JSON throws on them).",
  },
];

interface Result {
  label: string;
  status: Status;
  note: string;
  detail: string;
}

function describe(v: unknown): string {
  if (v === null) return "null";
  if (v === undefined) return "undefined";
  if (typeof v === "bigint") return `${v}n`;
  if (typeof v === "number" && Number.isNaN(v)) return "NaN";
  if (v instanceof Blob) return `Blob(${(v as Blob).size} bytes, "${(v as Blob).type}")`;
  if (v instanceof File) return `File("${(v as File).name}", ${(v as File).size} bytes)`;
  if (v instanceof Map) return `Map(${v.size})`;
  if (v instanceof Set) return `Set(${v.size})`;
  if (v instanceof RegExp) return String(v);
  if (v instanceof Date) return `Date(${v.toISOString()})`;
  if (v instanceof Error) return `${v.name}: ${v.message}`;
  if (ArrayBuffer.isView(v)) return `${v.constructor.name}(${v.byteLength} bytes)`;
  if (v instanceof ArrayBuffer) return `ArrayBuffer(${v.byteLength})`;
  if (typeof v === "function") return "function () {...}";
  if (typeof v === "symbol") return String(v);
  try {
    const s = JSON.stringify(v);
    return s === undefined ? String(v) : s.length > 60 ? s.slice(0, 60) + "..." : s;
  } catch {
    return "[circular]";
  }
}

function runTests(): Result[] {
  return TESTS.map((t) => {
    let orig: unknown;
    try {
      orig = t.make();
    } catch {
      return { label: t.label, status: "throws" as Status, note: "Could not even construct the value.", detail: "" };
    }
    try {
      const clone = structuredClone(orig);
      const ok = t.verify ? t.verify(orig, clone) : true;
      return {
        label: t.label,
        status: ok ? "survives" : "changed",
        note: t.note,
        detail: `${describe(orig)}  ->  ${describe(clone)}`,
      };
    } catch {
      return { label: t.label, status: "throws", note: t.note, detail: describe(orig) };
    }
  });
}

const STATUS_STYLE: Record<Status, string> = {
  survives: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  changed: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  throws: "bg-red-500/15 text-red-600 dark:text-red-400",
};

const STATUS_LABEL: Record<Status, string> = {
  survives: "Survives",
  changed: "Changed",
  throws: "Throws",
};

function StructuredCloneTester() {
  const { isPro } = usePlan();
  const trial = useToolTrial("structured-clone-tester", isPro);
  const seo = toolSeo;

  const [results, setResults] = useState<Result[]>(() => runTests());
  const [filter, setFilter] = useState<"all" | Status>("all");

  const counts = useMemo(() => {
    const c: Record<Status, number> = { survives: 0, changed: 0, throws: 0 };
    for (const r of results) c[r.status] += 1;
    return c;
  }, [results]);

  const rerun = () => {
    setResults(runTests());
    toast.success("Ran all 28 clone tests");
  };

  const copyReport = async () => {
    if (!trial.canUse) return;
    const lines = [
      "structuredClone() test report (IconVault)",
      `Survives: ${counts.survives}, Changed: ${counts.changed}, Throws: ${counts.throws}`,
      "",
      ...results.map((r) => `${r.label}: ${STATUS_LABEL[r.status]} - ${r.note}`),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(lines);
      trial.recordUse();
      toast.success("Report copied");
    } catch {
      toast.error("Could not access the clipboard.");
    }
  };

  const visible = filter === "all" ? results : results.filter((r) => r.status === filter);

  return (
    <ToolPageShell toolId="structured-clone-tester" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Structured Clone Tester" left={trial.left} />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          {(["all", "survives", "changed", "throws"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition",
                filter === f
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40",
              )}
            >
              {f === "all" ? `All (${results.length})` : `${STATUS_LABEL[f]} (${counts[f]})`}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={rerun}
            className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
          >
            <RotateCcw className="h-4 w-4" /> Run again
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((r) => (
          <div key={r.label} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold">{r.label}</p>
              <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", STATUS_STYLE[r.status])}>
                {STATUS_LABEL[r.status]}
              </span>
            </div>
            <p className="mt-2 font-mono text-xs text-muted-foreground break-all">{r.detail}</p>
            <p className="mt-2 text-xs leading-relaxed text-foreground/70">{r.note}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 max-w-xs">
        <ActionButton disabled={!trial.canUse} onClick={copyReport}>
          <Copy className="h-4 w-4" /> Copy full report
        </ActionButton>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Blocks className="h-3.5 w-3.5" /> Tested live with your browser's own structuredClone().
        </p>
      </div>
    </ToolPageShell>
  );
}
