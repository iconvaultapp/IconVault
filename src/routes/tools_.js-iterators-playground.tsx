// /tools/js-iterators-playground - Step through yields, async generators and the
// ES2025 Iterator helpers with live execution, per-step values and copyable code.

import { useCallback, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Play, RotateCcw, StepForward } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/js-iterators-playground")({
  head: () => {
    const seo = getToolSeoMeta("js-iterators-playground");
    const canonical = "https://iconvault.site/tools/js-iterators-playground";
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
  component: IteratorsTool,
});

type Tab = "step" | "async" | "helpers";

const GEN_LINES = [
  "function* countUp() {",
  "  yield 1;            // step 1",
  "  yield 2;            // step 2",
  "  const name = yield 3; // step 3 - send a value back in",
  "  return `done:${name ?? \"nobody\"}`;",
  "}",
];
const YIELD_LINE = [1, 2, 3, 4];

function* countUp(): Generator<number, string, string | undefined> {
  yield 1;
  yield 2;
  const name = yield 3;
  return `done:${name ?? "nobody"}`;
}

const GEN_CODE = `function* countUp() {
  yield 1;
  yield 2;
  const name = yield 3; // value sent via next(value)
  return \`done:\${name ?? "nobody"}\`;
}

const gen = countUp();
gen.next();        // { value: 1, done: false }
gen.next();        // { value: 2, done: false }
gen.next("sameer"); // { value: 3, done: false } - name is received
gen.next();        // { value: "done:sameer", done: true }`;

const ASYNC_CODE = `async function* fetchPages() {
  for (let page = 1; page <= 3; page++) {
    await new Promise((r) => setTimeout(r, 400)); // network wait
    yield \`page-\${page}\`;
  }
}

for await (const page of fetchPages()) {
  console.log(page); // page-1, page-2, page-3 (streamed in)
}`;

const HELPERS_CODE = `// ES2025 Iterator helpers - lazy, composable, no arrays built
const result = Iterator.from([1, 2, 3, 4, 5, 6, 7, 8])
  .map((n) => n * 10)
  .filter((n) => n % 20 === 0)
  .take(2)
  .toArray(); // [20, 40]

Iterator.from([1, 2, 3]).reduce((a, b) => a + b, 0); // 6
Iterator.from([1, 2, 3]).some((n) => n > 2);         // true`;

type StepLog = { n: number; value: string; done: boolean };

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

function StepTab({ trial }: { trial: ReturnType<typeof useToolTrial> }) {
  const genRef = useRef<Generator<number, string, string | undefined> | null>(null);
  const [steps, setSteps] = useState<StepLog[]>([]);
  const [active, setActive] = useState(false);
  const [sendValue, setSendValue] = useState("sameer");
  const [finished, setFinished] = useState(false);

  const start = useCallback(() => {
    genRef.current = countUp();
    setSteps([]);
    setActive(true);
    setFinished(false);
    trial.recordUse();
  }, [trial]);

  const step = useCallback(() => {
    const gen = genRef.current;
    if (!gen || finished) return;
    const isThird = steps.length === 2;
    const r = gen.next(isThird ? (sendValue === "" ? undefined : sendValue) : undefined);
    setSteps((p) => [...p, { n: p.length + 1, value: String(r.value), done: r.done ?? false }]);
    if (r.done) { setFinished(true); setActive(false); }
  }, [finished, steps.length, sendValue]);

  const reset = useCallback(() => {
    genRef.current = null;
    setSteps([]);
    setActive(false);
    setFinished(false);
  }, []);

  const highlightLine = finished ? 4 : active && steps.length < 4 ? YIELD_LINE[steps.length] : -1;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="overflow-hidden rounded-xl border border-border bg-[#0d1117]">
          <pre className="p-4 font-mono text-[13px] leading-relaxed">
            {GEN_LINES.map((line, i) => (
              <div
                key={i}
                className={cn(
                  "rounded px-2 py-0.5 transition",
                  i === highlightLine ? "bg-yellow-400/20 text-yellow-200" : "text-[#e6edf3]",
                )}
              >
                <span className="mr-3 inline-block w-4 select-none text-right text-white/25">{i + 1}</span>
                {line}
              </div>
            ))}
          </pre>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!active && steps.length === 0 ? (
            <ActionButton onClick={start} disabled={!trial.canUse}><Play className="h-4 w-4" /> Start generator</ActionButton>
          ) : (
            <>
              <ActionButton onClick={step} disabled={finished}>
                <StepForward className="h-4 w-4" /> {finished ? "Finished" : steps.length === 0 ? "Step: gen.next()" : `Step ${steps.length + 1}`}
              </ActionButton>
              <button
                type="button"
                onClick={reset}
                className="flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
              >
                <RotateCcw className="h-4 w-4" /> Reset
              </button>
            </>
          )}
          {active && steps.length === 2 && (
            <input
              value={sendValue}
              onChange={(e) => setSendValue(e.target.value)}
              placeholder="value to send in"
              className="w-44 rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Before step 3 runs, type a value and press Step: it is delivered into the generator as the result of <code className="font-mono">yield 3</code>.
          {!trial.canUse && " Free trial used up."}
        </p>
      </div>
      <div className="space-y-3">
        <p className="text-sm font-semibold">Execution log</p>
        {steps.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Press Start, then Step through each <code className="font-mono">yield</code>. Watch the highlighted line move and the returned objects appear here.
          </div>
        ) : (
          <div className="space-y-2">
            {steps.map((s) => (
              <div key={s.n} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5 font-mono text-[13px]">
                <span className="font-bold text-primary">#{s.n}</span>
                <span className="text-muted-foreground">next()</span>
                <span className="ml-auto">{"{ value: "}<span className="font-bold text-foreground">{s.value}</span>{", done: "}<span className={s.done ? "font-bold text-emerald-500" : "text-muted-foreground"}>{String(s.done)}</span>{" }"}</span>
              </div>
            ))}
            {finished && (
              <p className="rounded-xl bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                done: true - the generator is finished. Calling next() again keeps returning the final value.
              </p>
            )}
          </div>
        )}
        <CodeBlock code={GEN_CODE} onCopy={() => { void navigator.clipboard.writeText(GEN_CODE); toast.success("Generator code copied"); }} />
      </div>
    </div>
  );
}

function AsyncTab() {
  const [running, setRunning] = useState(false);
  const [lines, setLines] = useState<string[]>([]);
  const [elapsed, setElapsed] = useState<number | null>(null);

  const run = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setLines([]);
    setElapsed(null);
    const t0 = performance.now();
    async function* fetchPages(): AsyncGenerator<string> {
      for (let page = 1; page <= 3; page++) {
        await new Promise((r) => setTimeout(r, 400));
        yield `page-${page}`;
      }
    }
    for await (const page of fetchPages()) {
      setLines((p) => [...p, `${page} received at +${Math.round(performance.now() - t0)}ms`]);
    }
    setElapsed(Math.round(performance.now() - t0));
    setRunning(false);
  }, [running]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Async generators pause at <code className="font-mono">await</code> and at <code className="font-mono">yield</code>.
          Run the demo and watch values stream in one at a time instead of arriving all at once.
        </p>
        <ActionButton onClick={() => void run()} busy={running} disabled={running}>
          <Play className="h-4 w-4" /> {running ? "Streaming…" : "Run async generator"}
        </ActionButton>
        <div className="min-h-[180px] space-y-2 rounded-xl border border-border bg-card p-4">
          {lines.length === 0 && !running && <p className="text-sm text-muted-foreground">Output streams here…</p>}
          {lines.map((l, i) => (
            <div key={i} className="flex items-center gap-2 font-mono text-[13px]">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              {l}
            </div>
          ))}
          {elapsed !== null && <p className="pt-2 text-sm font-semibold text-primary">Total: {elapsed}ms for 3 streamed pages</p>}
        </div>
      </div>
      <CodeBlock code={ASYNC_CODE} onCopy={() => { void navigator.clipboard.writeText(ASYNC_CODE); toast.success("Async generator code copied"); }} />
    </div>
  );
}

type HelperOp = { kind: "map" | "filter" | "take" | "drop"; arg: string };

const HELPERS_SUPPORTED = typeof (Iterator as unknown as { from?: unknown }).from === "function";

function HelpersTab() {
  const [ops, setOps] = useState<HelperOp[]>([
    { kind: "map", arg: "n * 10" },
    { kind: "filter", arg: "n % 20 === 0" },
    { kind: "take", arg: "2" },
  ]);
  const [newKind, setNewKind] = useState<HelperOp["kind"]>("filter");
  const [newArg, setNewArg] = useState("n > 30");

  const source = useMemo(() => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], []);

  const pipeline = useMemo(() => {
    if (!HELPERS_SUPPORTED) return { out: [] as { label: string; values: number[] }[], finalValues: [] as number[], error: null as string | null };
    try {
      const steps: number[][] = [[...source]];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let it: any = (Iterator as any).from(source);
      const out: { label: string; values: number[] }[] = [{ label: "Iterator.from(source)", values: [...source] }];
      for (const op of ops) {
        const prev = steps[steps.length - 1] ?? [];
        if (op.kind === "map") {
          const fn = new Function("n", `return (${op.arg});`) as (n: number) => number;
          it = it.map(fn);
          out.push({ label: `.map(${op.arg})`, values: prev.map(fn) });
        } else if (op.kind === "filter") {
          const fn = new Function("n", `return (${op.arg});`) as (n: number) => boolean;
          it = it.filter(fn);
          out.push({ label: `.filter(${op.arg})`, values: prev.filter(fn) });
        } else if (op.kind === "take") {
          const n = Math.max(0, Math.floor(Number(op.arg) || 0));
          it = it.take(n);
          out.push({ label: `.take(${n})`, values: prev.slice(0, n) });
        } else {
          const n = Math.max(0, Math.floor(Number(op.arg) || 0));
          it = it.drop(n);
          out.push({ label: `.drop(${n})`, values: prev.slice(n) });
        }
        const last = out[out.length - 1];
        if (last) steps.push(last.values);
      }
      const finalValues: number[] = it.toArray();
      return { out, finalValues, error: null as string | null };
    } catch (e) {
      return { out: [] as { label: string; values: number[] }[], finalValues: [] as number[], error: e instanceof Error ? e.message : "Pipeline failed" };
    }
  }, [ops, source]);

  const code = useMemo(() => {
    const chain = ops.map((o) => `.${o.kind}(${o.kind === "map" || o.kind === "filter" ? `(n) => ${o.arg}` : o.arg})`).join("\n  ");
    return `const result = Iterator.from([${source.join(", ")}])\n  ${chain}\n  .toArray(); // [${pipeline.finalValues.join(", ")}]`;
  }, [ops, source, pipeline]);

  return (
    <div className="space-y-5">
      {!HELPERS_SUPPORTED && (
        <p className="rounded-xl bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-600 dark:text-amber-400">
          Your browser does not support Iterator.from yet (needs Chrome 117+, Safari 18+, Firefox 131+). The pipeline below is computed with a manual fallback so you can still explore the API.
        </p>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs font-semibold text-muted-foreground">
          Operation
          <select value={newKind} onChange={(e) => setNewKind(e.target.value as HelperOp["kind"])} className="mt-1 block rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary">
            <option value="map">map</option>
            <option value="filter">filter</option>
            <option value="take">take</option>
            <option value="drop">drop</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          Argument
          <input value={newArg} onChange={(e) => setNewArg(e.target.value)} className="mt-1 block w-44 rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary" />
        </label>
        <button
          type="button"
          onClick={() => { if (!newArg.trim()) return; setOps((p) => [...p, { kind: newKind, arg: newArg.trim() }]); }}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90"
        >
          Add step
        </button>
        <button
          type="button"
          onClick={() => setOps((p) => p.slice(0, -1))}
          disabled={ops.length === 0}
          className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-primary/40 disabled:opacity-40"
        >
          Remove last
        </button>
      </div>
      {pipeline.error && <p className="text-sm font-medium text-red-500">{pipeline.error}</p>}
      <div className="space-y-2">
        {pipeline.out.map((s, i) => (
          <div key={i} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5">
            <span className="font-mono text-[13px] font-bold text-primary">{s.label}</span>
            <span className="ml-auto font-mono text-[13px] text-muted-foreground">[{s.values.join(", ")}]</span>
          </div>
        ))}
      </div>
      <CodeBlock code={code} onCopy={() => { void navigator.clipboard.writeText(code); toast.success("Pipeline code copied"); }} />
      <p className="text-xs text-muted-foreground">
        Helpers are lazy: nothing runs until a terminal operation like toArray(), reduce() or for...of pulls values through the chain.
      </p>
    </div>
  );
}

function IteratorsTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("js-iterators-playground", isPro);
  const seo = getToolSeo("js-iterators-playground");
  const [tab, setTab] = useState<Tab>("step");

  const tabs: { id: Tab; label: string }[] = [
    { id: "step", label: "Step through yield" },
    { id: "async", label: "Async generators" },
    { id: "helpers", label: "ES2025 helpers" },
  ];

  return (
    <ToolPageShell toolId="js-iterators-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="JS Iterators Playground" left={trial.left} />
      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-xl border px-4 py-2.5 text-sm font-semibold transition",
              tab === t.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "step" && <StepTab trial={trial} />}
      {tab === "async" && <AsyncTab />}
      {tab === "helpers" && <HelpersTab />}
      {!isPro && (
        <p className="mt-6 text-xs text-muted-foreground">
          {trial.left} of {TOOL_TRIAL_LIMIT} free guided runs left. Everything runs in your browser, nothing is uploaded.
        </p>
      )}
    </ToolPageShell>
  );
}
