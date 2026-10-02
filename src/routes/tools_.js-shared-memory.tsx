// /tools/js-shared-memory - Visualize race conditions, Atomics fixes,
// wait/notify and spinlocks. Honest about COOP/COEP requirements.

import { useCallback, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Check, Copy, Play, RotateCcw, Share2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/js-shared-memory")({
  head: () => {
    const seo = getToolSeoMeta("js-shared-memory");
    const canonical = "https://iconvault.site/tools/js-shared-memory";
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
  component: SharedMemoryTool,
});

const SAB_AVAILABLE = typeof SharedArrayBuffer !== "undefined";
const ISOLATED = typeof self !== "undefined" && (self as unknown as { crossOriginIsolated?: boolean }).crossOriginIsolated === true;

const INCREMENTS = 2000;
const tick = () => new Promise<void>((r) => setTimeout(r, 0));

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

const RACE_CODE = `// Two threads share one counter. counter++ is NOT atomic:
// it is read -> add 1 -> write, and threads interleave mid-step.
const shared = new Int32Array(new SharedArrayBuffer(4));

async function worker() {
  for (let i = 0; i < 2000; i++) {
    shared[0]++; // race: increments get lost
  }
}
await Promise.all([worker(), worker()]);
// Expected 4000, but shared[0] is usually much lower.`;

const ATOMIC_CODE = `// Atomics.add executes as one indivisible step: no lost updates.
const shared = new Int32Array(new SharedArrayBuffer(4));

async function worker() {
  for (let i = 0; i < 2000; i++) {
    Atomics.add(shared, 0, 1); // atomic: always exactly 4000
  }
}
await Promise.all([worker(), worker()]);
// shared[0] === 4000, every single run.`;

const SPINLOCK_CODE = `// Spinlock built on Atomics.compareExchange + Atomics.wait
const LOCK = 0, UNLOCKED = 0, LOCKED = 1;
const lock = new Int32Array(new SharedArrayBuffer(4));

function acquire() {
  while (true) {
    // try to swap UNLOCKED -> LOCKED; returns the previous value
    if (Atomics.compareExchange(lock, LOCK, UNLOCKED, LOCKED) === UNLOCKED) return;
    // sleep until someone notifies, instead of burning CPU
    Atomics.wait(lock, LOCK, LOCKED);
  }
}
function release() {
  Atomics.store(lock, LOCK, UNLOCKED);
  Atomics.notify(lock, LOCK, 1); // wake one waiter
}
// NOTE: Atomics.wait only works inside Workers, never on the main thread.`;

function SharedMemoryTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("js-shared-memory", isPro);
  const seo = getToolSeo("js-shared-memory");

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<[number, number]>([0, 0]);
  const [result, setResult] = useState<{ mode: "race" | "atomic"; value: number } | null>(null);
  const runId = useRef(0);

  const runRace = useCallback(async (atomic: boolean) => {
    if (running || !trial.canUse) return;
    const id = ++runId.current;
    setRunning(true);
    setResult(null);
    setProgress([0, 0]);
    const view = new Int32Array(atomic && SAB_AVAILABLE ? new SharedArrayBuffer(4) : new ArrayBuffer(4));

    const worker = async (slot: 0 | 1) => {
      for (let i = 0; i < INCREMENTS; i++) {
        if (atomic) {
          Atomics.add(view, 0, 1);
        } else {
          // split the increment into read / yield / write so the two
          // interleaved tasks genuinely step on each other
          const v = view[0] ?? 0;
          if (Math.random() < 0.3) await tick();
          view[0] = v + 1;
        }
        if (i % 50 === 0) {
          setProgress((p) => { const n: [number, number] = [...p] as [number, number]; n[slot] = i / INCREMENTS; return n; });
          if (Math.random() < 0.5) await tick();
        }
      }
      setProgress((p) => { const n: [number, number] = [...p] as [number, number]; n[slot] = 1; return n; });
    };

    await Promise.all([worker(0), worker(1)]);
    if (id !== runId.current) return;
    setResult({ mode: atomic ? "atomic" : "race", value: view[0] ?? 0 });
    setRunning(false);
    trial.recordUse();
  }, [running, trial]);

  const reset = useCallback(() => { runId.current++; setRunning(false); setResult(null); setProgress([0, 0]); }, []);
  const copy = (code: string, label: string) => {
    void navigator.clipboard.writeText(code).then(() => toast.success(label)).catch(() => toast.error("Copy failed"));
  };

  const expected = INCREMENTS * 2;

  return (
    <ToolPageShell toolId="js-shared-memory" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Shared Memory Lab" left={trial.left} />

      <div className={cn(
        "mb-6 flex items-start gap-3 rounded-2xl border p-5",
        ISOLATED ? "border-emerald-500/40 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/5",
      )}>
        <AlertTriangle className={cn("mt-0.5 h-5 w-5 shrink-0", ISOLATED ? "text-emerald-500" : "text-amber-500")} />
        <div className="text-sm">
          <p className="font-bold">SharedArrayBuffer status: {SAB_AVAILABLE ? (ISOLATED ? "available" : "present but not usable") : "unavailable"}</p>
          <p className="mt-1 text-muted-foreground">
            {ISOLATED
              ? "This page is cross-origin isolated, so real SharedArrayBuffer works here."
              : "Real SharedArrayBuffer needs COOP and COEP headers on the page, which this sandbox preview does not send. The race demo below therefore uses cooperative tasks on a regular buffer to show the exact same interleaving behavior, honestly labeled. The Atomics code snippets are production-ready for your own isolated page."}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <p className="flex items-center gap-2 text-sm font-bold"><Share2 className="h-4 w-4 text-primary" /> Race condition vs Atomics.add</p>
          <p className="text-sm text-muted-foreground">
            Two tasks each increment a shared counter {INCREMENTS.toLocaleString()} times. Without atomicity the
            read-add-write steps interleave and increments are lost. Run both and compare.
          </p>
          <div className="space-y-3">
            {(["task A", "task B"] as const).map((label, i) => (
              <div key={label}>
                <div className="mb-1 flex justify-between text-xs font-semibold text-muted-foreground">
                  <span>{label}</span>
                  <span>{Math.round((progress[i] ?? 0) * 100)}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${(progress[i] ?? 0) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton onClick={() => void runRace(false)} busy={running} disabled={running || !trial.canUse}>
              <Play className="h-4 w-4" /> Run racy version
            </ActionButton>
            <ActionButton onClick={() => void runRace(true)} busy={running} disabled={running || !trial.canUse}>
              <Play className="h-4 w-4" /> Run with Atomics.add
            </ActionButton>
            <button
              type="button"
              onClick={reset}
              className="flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              <RotateCcw className="h-4 w-4" /> Reset
            </button>
          </div>
          {result && (
            <div className={cn(
              "rounded-xl border p-4",
              result.mode === "atomic" ? "border-emerald-500/40 bg-emerald-500/5" : "border-red-500/40 bg-red-500/5",
            )}>
              <p className="font-mono text-lg font-bold">
                {result.mode === "atomic" ? "Atomics.add" : "Racy"}: {result.value.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">/ expected {expected.toLocaleString()}</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {result.mode === "atomic"
                  ? "Exactly 4000, every run. Each add is indivisible."
                  : `${(expected - result.value).toLocaleString()} increments lost to interleaved read-modify-write steps.`}
              </p>
            </div>
          )}
          <CodeBlock code={RACE_CODE} onCopy={() => copy(RACE_CODE, "Race example copied")} />
          <CodeBlock code={ATOMIC_CODE} onCopy={() => copy(ATOMIC_CODE, "Atomics example copied")} />
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-2 text-sm font-bold">wait / notify: sleeping instead of spinning</p>
            <p className="mb-3 text-sm text-muted-foreground">
              A spinlock that just loops on compareExchange burns CPU. <code className="font-mono">Atomics.wait</code> parks
              the worker until <code className="font-mono">Atomics.notify</code> wakes it. This is how high-performance
              worker pools and wasm threading runtimes coordinate.
            </p>
            <CodeBlock code={SPINLOCK_CODE} onCopy={() => copy(SPINLOCK_CODE, "Spinlock code copied")} />
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
            <p className="mb-2 font-bold text-foreground">Why Atomics.wait throws on the main thread</p>
            <p>
              Blocking the main thread would freeze the page, so the spec forbids it: Atomics.wait is worker-only.
              The pattern is: main thread posts work and notifies, workers wait, compute, then notify back.
              Atomics.load, store, add, sub, and, or, xor, exchange and compareExchange work on any thread, including the main one.
            </p>
          </div>
        </div>
      </div>
      {!isPro && (
        <p className="mt-6 text-xs text-muted-foreground">{trial.left} of {TOOL_TRIAL_LIMIT} free runs left. Everything runs locally in your browser.</p>
      )}
    </ToolPageShell>
  );
}
