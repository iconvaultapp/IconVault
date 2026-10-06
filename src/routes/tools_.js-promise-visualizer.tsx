// /tools/js-promise-visualizer - Watch Promise.all / race / any / allSettled
// settle in real time on animated lanes. Configure delays and outcomes, then run.

import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Pause, Play, Plus, RotateCcw, StepForward, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/js-promise-visualizer";
import toolSeoMeta from "@/lib/tool-seo-meta-data/js-promise-visualizer";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/js-promise-visualizer")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/js-promise-visualizer";
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
  component: PromiseVizTool,
});

type Combo = "all" | "race" | "any" | "allSettled";

interface PDef { id: number; name: string; delay: number; outcome: "resolve" | "reject"; value: string; }

const COMBOS: { id: Combo; name: string; blurb: string }[] = [
  { id: "all", name: "Promise.all", blurb: "Waits for every promise. One rejection rejects the whole thing immediately." },
  { id: "race", name: "Promise.race", blurb: "Settles with the very first promise to settle, resolve or reject." },
  { id: "any", name: "Promise.any", blurb: "Settles with the first fulfillment. Rejections are ignored unless all reject." },
  { id: "allSettled", name: "Promise.allSettled", blurb: "Always waits for everything and reports each outcome. Never rejects." },
];

function q(v: string): string {
  return /^-?\d+(\.\d+)?$/.test(v.trim()) ? v.trim() : `"${v.trim()}"`;
}

function computeCombo(kind: Combo, ps: PDef[]) {
  const sorted = [...ps].sort((a, b) => a.delay - b.delay || a.id - b.id);
  if (!sorted.length) return null;
  const last = sorted[sorted.length - 1]!;
  if (kind === "race") {
    const w = sorted[0]!;
    return { time: w.delay, ok: w.outcome === "resolve", value: q(w.value), decidedBy: w.name, note: `${w.name} settled first, so race takes its ${w.outcome === "resolve" ? "value" : "rejection"}.` };
  }
  if (kind === "any") {
    const w = sorted.find((p) => p.outcome === "resolve");
    if (w) return { time: w.delay, ok: true, value: q(w.value), decidedBy: w.name, note: `${w.name} fulfilled first. Earlier rejections are ignored.` };
    return { time: last.delay, ok: false, value: "AggregateError: All promises were rejected", decidedBy: "none fulfilled", note: "Every promise rejected, so any() rejects with an AggregateError." };
  }
  if (kind === "all") {
    const rej = sorted.find((p) => p.outcome === "reject");
    if (rej) return { time: rej.delay, ok: false, value: q(rej.value), decidedBy: rej.name, note: `${rej.name} rejected first: all() short-circuits and rejects right away.` };
    return { time: last.delay, ok: true, value: `[${sorted.map((p) => q(p.value)).join(", ")}]`, decidedBy: "all fulfilled", note: "Every promise fulfilled: all() resolves with the values in order." };
  }
  return {
    time: last.delay, ok: true,
    value: `[${sorted.map((p) => (p.outcome === "resolve" ? `{status: "fulfilled", value: ${q(p.value)}}` : `{status: "rejected", reason: ${q(p.value)}}`)).join(", ")}]`,
    decidedBy: "all settled",
    note: "allSettled() never rejects: it reports every outcome once the slowest promise settles.",
  };
}

function codeFor(kind: Combo, ps: PDef[]): string {
  const defs = ps.map((p) => {
    const fn = p.outcome === "resolve" ? "resolve" : "reject";
    return `const ${p.name} = new Promise((${fn}) => setTimeout(() => ${fn}(${q(p.value)}), ${p.delay}));`;
  });
  const names = ps.map((p) => p.name).join(", ");
  return `${defs.join("\n")}\n\ntry {\n  const result = await Promise.${kind}([${names}]);\n  console.log("fulfilled:", result);\n} catch (err) {\n  console.log("rejected:", err);\n}`;
}

const DEFAULTS: PDef[] = [
  { id: 1, name: "p1", delay: 600, outcome: "resolve", value: "A" },
  { id: 2, name: "p2", delay: 1200, outcome: "resolve", value: "B" },
  { id: 3, name: "p3", delay: 900, outcome: "reject", value: "boom" },
];

function PromiseVizTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("js-promise-visualizer", isPro);
  const seo = toolSeo;

  const [promises, setPromises] = useState<PDef[]>(DEFAULTS);
  const [combo, setCombo] = useState<Combo>("all");
  const [t, setT] = useState(0);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [copied, setCopied] = useState(false);
  const nextId = useRef(4);

  const maxTime = useMemo(() => Math.max(500, ...promises.map((p) => p.delay)), [promises]);
  const result = useMemo(() => computeCombo(combo, promises), [combo, promises]);
  const settled = useMemo(
    () => [...promises].sort((a, b) => a.delay - b.delay || a.id - b.id).filter((p) => p.delay <= t),
    [promises, t]
  );

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setT((v) => {
        const nv = v + 50 * speed;
        if (nv >= maxTime) {
          window.clearInterval(id);
          setRunning(false);
          return maxTime;
        }
        return nv;
      });
    }, 50);
    return () => window.clearInterval(id);
  }, [running, speed, maxTime]);

  const reset = () => { setRunning(false); setT(0); };

  const run = () => {
    if (!trial.canUse || promises.length === 0) return;
    trial.recordUse();
    reset();
    setRunning(true);
  };

  const stepToNext = () => {
    setRunning(false);
    const upcoming = promises.map((p) => p.delay).filter((d) => d > t).sort((a, b) => a - b);
    if (upcoming.length) setT(upcoming[0]!);
    else setT(maxTime);
  };

  const update = (id: number, patch: Partial<PDef>) => {
    reset();
    setPromises((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };
  const add = () => {
    if (promises.length >= 6) { toast.error("Six promises is plenty for a demo"); return; }
    reset();
    const id = nextId.current++;
    setPromises((ps) => [...ps, { id, name: `p${id}`, delay: 1000, outcome: "resolve", value: `V${id}` }]);
  };
  const remove = (id: number) => {
    reset();
    setPromises((ps) => ps.filter((p) => p.id !== id));
  };

  const copyCode = async () => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(codeFor(combo, promises));
      trial.recordUse();
      setCopied(true);
      toast.success("Code copied");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed in this browser");
    }
  };

  const comboInfo = COMBOS.find((c) => c.id === combo)!;
  const done = t >= maxTime;

  return (
    <ToolPageShell toolId="js-promise-visualizer" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Promise Visualizer" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Combinator</p>
            <div className="grid grid-cols-2 gap-2">
              {COMBOS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { reset(); setCombo(c.id); }}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-xs font-bold transition",
                    combo === c.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                  )}
                >
                  {c.name}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{comboInfo.blurb}</p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Promises</p>
              <button
                type="button"
                onClick={add}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            </div>
            <div className="space-y-3">
              {promises.map((p) => (
                <div key={p.id} className="rounded-xl border border-border p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-primary">{p.name}</span>
                    <div className="ml-auto flex overflow-hidden rounded-lg border border-border">
                      {(["resolve", "reject"] as const).map((o) => (
                        <button
                          key={o}
                          type="button"
                          onClick={() => update(p.id, { outcome: o })}
                          className={cn(
                            "px-2.5 py-1 text-[11px] font-bold transition",
                            p.outcome === o
                              ? o === "resolve" ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-red-500/20 text-red-500"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                    <button type="button" onClick={() => remove(p.id)} className="text-muted-foreground transition hover:text-red-500" aria-label={`Remove ${p.name}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range" min={100} max={3000} step={100} value={p.delay}
                      onChange={(e) => update(p.id, { delay: parseInt(e.target.value, 10) })}
                      className="w-full accent-primary"
                      aria-label={`${p.name} delay`}
                    />
                    <span className="w-16 shrink-0 text-right font-mono text-xs font-bold">{p.delay}ms</span>
                  </div>
                  <input
                    value={p.value}
                    onChange={(e) => update(p.id, { value: e.target.value })}
                    spellCheck={false}
                    placeholder="value or reason"
                    className="mt-2 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 font-mono text-xs outline-none focus:border-primary/60"
                    aria-label={`${p.name} value`}
                  />
                </div>
              ))}
              {promises.length === 0 && <p className="text-xs text-muted-foreground">Add at least one promise to run.</p>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <p className="text-[13px] font-medium text-foreground/80">Speed</p>
            {[1, 2, 4].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                className={cn(
                  "rounded-lg border px-3 py-1 text-xs font-bold transition",
                  speed === s ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                )}
              >
                {s}x
              </button>
            ))}
            <button
              type="button"
              onClick={copyCode}
              disabled={!trial.canUse}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:opacity-50"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy code"}
            </button>
          </div>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free runs left.
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => (running ? setRunning(false) : run())}
              disabled={promises.length === 0 || !trial.canUse}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {running ? "Pause" : "Run"}
            </button>
            <button
              type="button"
              onClick={stepToNext}
              disabled={promises.length === 0 || done}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-bold transition hover:border-primary/40 disabled:opacity-50"
            >
              <StepForward className="h-4 w-4" /> Next event
            </button>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-bold transition hover:border-primary/40"
            >
              <RotateCcw className="h-4 w-4" /> Reset
            </button>
            <span className="ml-auto font-mono text-xs font-bold text-muted-foreground">t = {Math.round(t)}ms</span>
          </div>

          <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">Lanes</p>
            {promises.map((p) => {
              const isSettled = t >= p.delay;
              const pct = Math.min(100, (t / p.delay) * 100);
              return (
                <div key={p.id} className="flex items-center gap-3">
                  <span className="w-10 shrink-0 font-mono text-sm font-bold">{p.name}</span>
                  <div className="relative h-8 flex-1 overflow-hidden rounded-lg bg-muted/60">
                    <div
                      className={cn(
                        "h-full rounded-lg transition-[width] duration-75",
                        isSettled
                          ? p.outcome === "resolve" ? "bg-emerald-500" : "bg-red-500"
                          : "bg-primary/70"
                      )}
                      style={{ width: `${pct}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-end px-2 font-mono text-[11px] font-bold text-foreground/70">
                      {isSettled ? (p.outcome === "resolve" ? `resolved ${q(p.value)}` : `rejected ${q(p.value)}`) : `${p.delay}ms`}
                    </span>
                  </div>
                  <span className={cn(
                    "w-24 shrink-0 rounded-full px-2 py-1 text-center text-[11px] font-bold",
                    !isSettled ? "bg-muted text-muted-foreground"
                      : p.outcome === "resolve" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "bg-red-500/15 text-red-500"
                  )}>
                    {!isSettled ? "pending" : p.outcome === "resolve" ? "fulfilled" : "rejected"}
                  </span>
                </div>
              );
            })}
          </div>

          <div className={cn(
            "rounded-2xl border-2 p-4",
            result && t >= result.time
              ? result.ok ? "border-emerald-500/50 bg-emerald-500/5" : "border-red-500/50 bg-red-500/5"
              : "border-border bg-card"
          )}>
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {comboInfo.name} result
            </p>
            {!result ? (
              <p className="text-sm text-muted-foreground">Add a promise to see the result.</p>
            ) : t >= result.time ? (
              <>
                <p className="font-mono text-sm font-bold">
                  {result.ok ? <span className="text-emerald-600 dark:text-emerald-400">fulfilled:</span> : <span className="text-red-500">rejected:</span>}{" "}
                  <span className="break-all">{result.value}</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">at {result.time}ms · {result.note}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">pending… (decides at {result.time}ms)</p>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Event log</p>
            <div className="min-h-[64px] space-y-1 font-mono text-xs">
              {settled.length === 0 && <span className="text-muted-foreground/60">Press Run to watch the settlement order.</span>}
              {settled.map((p) => (
                <div key={p.id} className={p.outcome === "resolve" ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}>
                  [{p.delay}ms] {p.name} {p.outcome === "resolve" ? "fulfilled" : "rejected"} with {q(p.value)}
                  {result && result.decidedBy === p.name && <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 font-bold text-primary">decides {comboInfo.name}</span>}
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Simplified model: real promises also hop through the microtask queue, but the settlement order and combinator rules shown are exactly what the language guarantees.
          </p>
        </div>
      </div>
    </ToolPageShell>
  );
}
