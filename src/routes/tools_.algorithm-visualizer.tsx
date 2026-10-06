// /tools/algorithm-visualizer - Animated sorting (bubble, insertion, quick,
// merge) and searching (linear, binary) with comparison/swap counters.

import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Play, Pause, StepForward, StepBack, RotateCcw, Copy, Shuffle, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/algorithm-visualizer";
import toolSeoMeta from "@/lib/tool-seo-meta-data/algorithm-visualizer";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/algorithm-visualizer")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/algorithm-visualizer";
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
  component: AlgoLab,
});

type SortAlgo = "bubble" | "insertion" | "quick" | "merge";
type SearchAlgo = "linear" | "binary";
type Mode = SortAlgo | SearchAlgo;

type Op =
  | { t: "cmp"; a: number; b: number; note: string }
  | { t: "swap"; a: number; b: number; note: string }
  | { t: "set"; i: number; v: number; note: string }
  | { t: "probe"; i: number; note: string; found: boolean };

const MODES: { id: Mode; label: string; kind: "sort" | "search" }[] = [
  { id: "bubble", label: "Bubble sort", kind: "sort" },
  { id: "insertion", label: "Insertion sort", kind: "sort" },
  { id: "quick", label: "Quick sort", kind: "sort" },
  { id: "merge", label: "Merge sort", kind: "sort" },
  { id: "linear", label: "Linear search", kind: "search" },
  { id: "binary", label: "Binary search", kind: "search" },
];

function shuffleArr(n: number): number[] {
  const a = Array.from({ length: n }, (_, i) => i + 1);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]!;
    a[i] = a[j]!;
    a[j] = t;
  }
  return a;
}

function genOps(mode: Mode, arr: number[], target: number): Op[] {
  const ops: Op[] = [];
  const a = [...arr];
  const n = a.length;
  if (mode === "bubble") {
    for (let pass = 0; pass < n - 1; pass++)
      for (let j = 0; j < n - 1 - pass; j++) {
        ops.push({ t: "cmp", a: j, b: j + 1, note: `compare ${a[j]} and ${a[j + 1]}` });
        if (a[j]! > a[j + 1]!) {
          const t = a[j]!;
          a[j] = a[j + 1]!;
          a[j + 1] = t;
          ops.push({ t: "swap", a: j, b: j + 1, note: `${a[j + 1]} > ${a[j]} - swap` });
        }
      }
  } else if (mode === "insertion") {
    for (let k = 1; k < n; k++) {
      let j = k;
      ops.push({ t: "probe", i: k, note: `pick up ${a[k]} as the key`, found: false });
      while (j > 0) {
        ops.push({ t: "cmp", a: j - 1, b: j, note: `compare key ${a[j]} with ${a[j - 1]}` });
        if (a[j - 1]! > a[j]!) {
          const t = a[j - 1]!;
          a[j - 1] = a[j]!;
          a[j] = t;
          ops.push({ t: "swap", a: j - 1, b: j, note: "shift left" });
          j--;
        } else break;
      }
    }
  } else if (mode === "quick") {
    const qs = (lo: number, hi: number) => {
      if (lo >= hi) return;
      const pivot = a[hi]!;
      ops.push({ t: "probe", i: hi, note: `pivot = ${pivot}`, found: false });
      let p = lo;
      for (let k = lo; k < hi; k++) {
        ops.push({ t: "cmp", a: k, b: hi, note: `compare ${a[k]} with pivot ${pivot}` });
        if (a[k]! < pivot) {
          if (k !== p) {
            const t = a[k]!;
            a[k] = a[p]!;
            a[p] = t;
            ops.push({ t: "swap", a: k, b: p, note: `${a[p]} < pivot - move left` });
          }
          p++;
        }
      }
      if (p !== hi) {
        const t = a[p]!;
        a[p] = a[hi]!;
        a[hi] = t;
        ops.push({ t: "swap", a: p, b: hi, note: `place pivot ${pivot} at ${p}` });
      }
      qs(lo, p - 1);
      qs(p + 1, hi);
    };
    qs(0, n - 1);
  } else if (mode === "merge") {
    const aux = [...a];
    const ms = (lo: number, hi: number) => {
      if (lo >= hi) return;
      const mid = Math.floor((lo + hi) / 2);
      ms(lo, mid);
      ms(mid + 1, hi);
      let l = lo;
      let r = mid + 1;
      const tmp: number[] = [];
      while (l <= mid && r <= hi) {
        ops.push({ t: "cmp", a: l, b: r, note: `merge: compare ${aux[l]} and ${aux[r]}` });
        if (aux[l]! <= aux[r]!) tmp.push(aux[l++]!);
        else tmp.push(aux[r++]!);
      }
      while (l <= mid) tmp.push(aux[l++]!);
      while (r <= hi) tmp.push(aux[r++]!);
      tmp.forEach((v, k) => {
        aux[lo + k] = v;
        a[lo + k] = v;
        ops.push({ t: "set", i: lo + k, v, note: `write ${v} at ${lo + k}` });
      });
    };
    ms(0, n - 1);
  } else if (mode === "linear") {
    for (let k = 0; k < n; k++) {
      const found = a[k] === target;
      ops.push({ t: "probe", i: k, note: found ? `check ${a[k]} - found` : `check ${a[k]} - not it`, found });
      if (found) return ops;
    }
    ops.push({ t: "probe", i: -1, note: `${target} is not in the array`, found: false });
  } else {
    // binary: requires sorted input
    const s = [...a].sort((x, y) => x - y);
    for (let k = 0; k < n; k++) a[k] = s[k]!;
    let lo = 0;
    let hi = n - 1;
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      const found = a[mid] === target;
      ops.push({ t: "probe", i: mid, note: found ? `mid ${a[mid]} - found` : `${a[mid]} vs ${target} - go ${target < a[mid]! ? "left" : "right"}`, found });
      if (found) return ops;
      if (target < a[mid]!) hi = mid - 1;
      else lo = mid + 1;
    }
    ops.push({ t: "probe", i: -1, note: `${target} is not in the array`, found: false });
  }
  return ops;
}

function applyOps(arr: number[], ops: Op[], upto: number): number[] {
  const a = [...arr];
  for (let k = 0; k < upto; k++) {
    const op = ops[k]!;
    if (op.t === "swap") {
      const t = a[op.a]!;
      a[op.a] = a[op.b]!;
      a[op.b] = t;
    } else if (op.t === "set") {
      a[op.i] = op.v;
    }
  }
  return a;
}

const PSEUDO: Record<Mode, string> = {
  bubble: `for pass in 0..n-1:\n  for j in 0..n-2-pass:\n    if a[j] > a[j+1]: swap(a[j], a[j+1])`,
  insertion: `for k in 1..n-1:\n  key = a[k]; j = k\n  while j > 0 and a[j-1] > key:\n    a[j] = a[j-1]; j--\n  a[j] = key`,
  quick: `quicksort(lo, hi):\n  pivot = a[hi]; p = lo\n  for k in lo..hi-1:\n    if a[k] < pivot: swap(a[k], a[p]); p++\n  swap(a[p], a[hi])\n  quicksort(lo, p-1); quicksort(p+1, hi)`,
  merge: `mergesort(lo, hi):\n  mid = (lo+hi)/2\n  mergesort(lo, mid); mergesort(mid+1, hi)\n  merge the two sorted halves`,
  linear: `for k in 0..n-1:\n  if a[k] == target: return k\nreturn not found`,
  binary: `lo = 0; hi = n-1\nwhile lo <= hi:\n  mid = (lo+hi)/2\n  if a[mid] == target: return mid\n  elif target < a[mid]: hi = mid-1\n  else: lo = mid+1`,
};

function AlgoLab() {
  const { isPro } = usePlan();
  const trial = useToolTrial("algorithm-visualizer", isPro);
  const seo = toolSeo;

  const [mode, setMode] = useState<Mode>("bubble");
  const [size, setSize] = useState(24);
  const [arr, setArr] = useState<number[]>(() => shuffleArr(24));
  const [target, setTarget] = useState(10);
  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(20);
  const [copied, setCopied] = useState(false);

  const kind = MODES.find((m) => m.id === mode)!.kind;

  const ops = useMemo(() => genOps(mode, arr, target), [mode, arr, target]);
  const total = ops.length;
  const cur: Op | undefined = ops[Math.min(stepIdx, Math.max(0, total - 1))];
  const view = useMemo(() => applyOps(arr, ops, Math.min(stepIdx + 1, total)), [arr, ops, stepIdx, total]);

  const comps = ops.slice(0, Math.min(stepIdx + 1, total)).filter((o) => o.t === "cmp").length;
  const swaps = ops.slice(0, Math.min(stepIdx + 1, total)).filter((o) => o.t === "swap" || o.t === "set").length;
  const finished = total > 0 && stepIdx >= total - 1;

  useEffect(() => {
    setStepIdx(0);
    setPlaying(false);
  }, [mode, arr, target]);

  useEffect(() => {
    if (!playing) return;
    if (stepIdx >= total - 1) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setStepIdx((s) => Math.min(s + 1, total - 1)), 1000 / speed);
    return () => clearTimeout(t);
  }, [playing, stepIdx, speed, total]);

  const reshuffle = useCallback(() => {
    setArr(shuffleArr(size));
  }, [size]);

  const copyPseudo = useCallback(() => {
    if (!trial.canUse) return;
    const text = `${mode} - pseudocode\n\n${PSEUDO[mode]}\n\nComparisons: ${ops.filter((o) => o.t === "cmp").length}, writes/swaps: ${ops.filter((o) => o.t === "swap" || o.t === "set").length} for n=${arr.length}.\nCopied from IconVault Algorithm Visualizer.`;
    void navigator.clipboard.writeText(text).then(() => {
      trial.recordUse();
      setCopied(true);
      toast.success("Pseudocode copied");
      setTimeout(() => setCopied(false), 1500);
    });
  }, [mode, ops, arr.length, trial]);

  const maxV = size;
  const barColor = (bi: number): string => {
    if (finished) return "bg-emerald-500/80";
    if (!cur) return "bg-primary/70";
    if (cur.t === "cmp" && (cur.a === bi || cur.b === bi)) return "bg-amber-400";
    if (cur.t === "swap" && (cur.a === bi || cur.b === bi)) return "bg-rose-500";
    if (cur.t === "set" && cur.i === bi) return "bg-rose-500";
    if (cur.t === "probe" && cur.i === bi) return cur.found ? "bg-emerald-400" : "bg-sky-400";
    return "bg-primary/70";
  };

  return (
    <ToolPageShell toolId="algorithm-visualizer" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Algorithm Visualizer" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Sorting</p>
            <div className="flex flex-wrap gap-2">
              {MODES.filter((m) => m.kind === "sort").map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  className={cn(
                    "rounded-xl border px-3.5 py-2 text-sm font-bold transition",
                    mode === m.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <p className="mb-2 mt-4 text-[13px] font-medium text-foreground/80">Searching</p>
            <div className="flex flex-wrap gap-2">
              {MODES.filter((m) => m.kind === "search").map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  className={cn(
                    "rounded-xl border px-3.5 py-2 text-sm font-bold transition",
                    mode === m.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {kind === "search" && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                {mode === "binary" ? "Binary search needs sorted input - the array is sorted for you." : "Linear search scans left to right."}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <ActionButton busy={false} disabled={false} onClick={reshuffle}>
              <Shuffle className="h-4 w-4" /> Shuffle
            </ActionButton>
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Bars</span>
                <span className="font-mono">{size}</span>
              </div>
              <input
                type="range"
                min={8}
                max={60}
                value={size}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  setSize(n);
                  setArr(shuffleArr(n));
                }}
                className="w-full accent-primary"
              />
            </div>
          </div>

          {kind === "search" && (
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Search target</label>
              <input
                type="number"
                min={1}
                max={size}
                value={target}
                onChange={(e) => setTarget(Math.max(1, Math.min(size, Number(e.target.value) || 1)))}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary/60"
              />
            </div>
          )}

          <div className="rounded-xl border border-border bg-background p-4">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setStepIdx(0)} className="rounded-lg border border-border p-2 text-muted-foreground transition hover:border-primary/50 hover:text-foreground" title="Reset">
                <RotateCcw className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setStepIdx((s) => Math.max(0, s - 1))} disabled={stepIdx === 0} className="rounded-lg border border-border p-2 text-muted-foreground transition hover:border-primary/50 hover:text-foreground disabled:opacity-40" title="Step back">
                <StepBack className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setPlaying((p) => !p)} disabled={total === 0} className="rounded-lg bg-primary p-2.5 text-primary-foreground transition hover:opacity-90 disabled:opacity-40" title={playing ? "Pause" : "Play"}>
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <button type="button" onClick={() => setStepIdx((s) => Math.min(total - 1, s + 1))} disabled={stepIdx >= total - 1} className="rounded-lg border border-border p-2 text-muted-foreground transition hover:border-primary/50 hover:text-foreground disabled:opacity-40" title="Step forward">
                <StepForward className="h-4 w-4" />
              </button>
              <span className="ml-auto font-mono text-xs text-muted-foreground">{total === 0 ? "0 / 0" : `${stepIdx + 1} / ${total}`}</span>
            </div>
            <input type="range" min={0} max={Math.max(0, total - 1)} value={stepIdx} onChange={(e) => { setStepIdx(Number(e.target.value)); setPlaying(false); }} className="mt-3 w-full accent-primary" />
            <div className="mt-2 flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Speed</span>
              <input type="range" min={2} max={120} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="w-full accent-primary" />
              <span className="font-mono text-xs text-muted-foreground">{speed}/s</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-border bg-background p-3">
              <p className="font-mono text-lg font-bold text-amber-400">{comps}</p>
              <p className="text-[11px] text-muted-foreground">comparisons</p>
            </div>
            <div className="rounded-xl border border-border bg-background p-3">
              <p className="font-mono text-lg font-bold text-rose-400">{swaps}</p>
              <p className="text-[11px] text-muted-foreground">swaps / writes</p>
            </div>
            <div className="rounded-xl border border-border bg-background p-3">
              <p className="font-mono text-lg font-bold text-primary">{total}</p>
              <p className="text-[11px] text-muted-foreground">total steps</p>
            </div>
          </div>

          <ActionButton disabled={!trial.canUse} onClick={copyPseudo}>
            {copied ? <BarChart3 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy pseudocode"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left - everything runs locally in your browser.
            </p>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex h-64 items-end gap-[3px]">
              {view.map((v, bi) => (
                <div
                  key={bi}
                  className={cn("flex-1 rounded-t transition-all duration-100", barColor(bi))}
                  style={{ height: `${Math.max(4, (v / maxV) * 100)}%` }}
                  title={`${v}`}
                />
              ))}
            </div>
            {cur && (
              <div className="mt-4 rounded-xl border border-primary/40 bg-primary/5 px-4 py-3">
                <p className="font-mono text-sm">
                  <span className="font-bold text-primary">Step {stepIdx + 1}.</span>{" "}
                  <span className="text-foreground/90">{cur.note}</span>
                </p>
              </div>
            )}
            {finished && (
              <p className="mt-3 inline-block rounded-lg bg-emerald-500/15 px-3 py-1.5 text-sm font-bold text-emerald-300">
                {kind === "sort" ? `Sorted in ${total} steps` : `Search finished in ${total} steps`}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 text-[13px] font-medium text-foreground/80">Pseudocode</p>
            <pre className="overflow-x-auto rounded-xl bg-background p-4 font-mono text-sm leading-relaxed text-foreground/90">
              {PSEUDO[mode]}
            </pre>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-amber-400" /> comparing</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-rose-500" /> swapping / writing</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-sky-400" /> probing</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-emerald-500" /> done / found</span>
            </div>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
