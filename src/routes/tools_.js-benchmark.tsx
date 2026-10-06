// /tools/js-benchmark - Compare JavaScript snippets by operations per second.
// Snippets run in a Web Worker-free sandbox via new Function. Runs fully in
// your browser, nothing is uploaded.

import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Play, Trash2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/js-benchmark";
import toolSeoMeta from "@/lib/tool-seo-meta-data/js-benchmark";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/js-benchmark")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/js-benchmark";
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
  component: JsBenchmarkTool,
});

interface Snippet {
  id: number;
  name: string;
  code: string;
}

interface BenchResult {
  id: number;
  name: string;
  opsPerSec: number;
  totalMs: number;
  error?: string;
}

const DEFAULT_SNIPPETS: Snippet[] = [
  {
    id: 1,
    name: "for loop",
    code: "let s = 0;\nfor (let i = 0; i < 1000; i++) s += i;\nreturn s;",
  },
  {
    id: 2,
    name: "forEach",
    code: "let s = 0;\nconst arr = Array.from({length: 1000}, (_, i) => i);\narr.forEach((n) => { s += n; });\nreturn s;",
  },
];

function runSnippet(code: string, iterations: number): { opsPerSec: number; totalMs: number } {
  const fn = new Function(code);
  // warm up
  for (let i = 0; i < Math.min(10, iterations); i++) fn();
  const start = performance.now();
  for (let i = 0; i < iterations; i++) fn();
  const totalMs = performance.now() - start;
  const opsPerSec = totalMs > 0 ? (iterations / totalMs) * 1000 : 0;
  return { opsPerSec, totalMs };
}

function fmtOps(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(2) + "K";
  return n.toFixed(1);
}

function JsBenchmarkTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("js-benchmark", isPro);
  const seo = toolSeo;
  const [snippets, setSnippets] = useState<Snippet[]>(DEFAULT_SNIPPETS);
  const [iterations, setIterations] = useState(10000);
  const [results, setResults] = useState<BenchResult[]>([]);
  const [running, setRunning] = useState(false);
  const idRef = useRef(3);

  const updateSnippet = (id: number, patch: Partial<Snippet>) =>
    setSnippets((s) => s.map((sn) => (sn.id === id ? { ...sn, ...patch } : sn)));

  const addSnippet = () => {
    setSnippets((s) => [
      ...s,
      { id: idRef.current++, name: `Snippet ${s.length + 1}`, code: "// write code here\nreturn 1;" },
    ]);
  };

  const removeSnippet = (id: number) => {
    if (snippets.length <= 2) {
      toast.error("You need at least 2 snippets to compare");
      return;
    }
    setSnippets((s) => s.filter((sn) => sn.id !== id));
  };

  const run = async () => {
    if (running || !trial.canUse) return;
    if (snippets.some((s) => !s.code.trim())) {
      toast.error("Every snippet needs some code");
      return;
    }
    const iters = Math.max(1, Math.min(1_000_000, Math.floor(iterations) || 10000));
    setIterations(iters);
    setRunning(true);
    setResults([]);
    // let the UI paint the running state before the blocking loop
    await new Promise((r) => setTimeout(r, 50));
    try {
      const out: BenchResult[] = [];
      for (const sn of snippets) {
        try {
          const { opsPerSec, totalMs } = runSnippet(sn.code, iters);
          out.push({ id: sn.id, name: sn.name, opsPerSec, totalMs });
        } catch (e) {
          out.push({
            id: sn.id,
            name: sn.name,
            opsPerSec: 0,
            totalMs: 0,
            error: e instanceof Error ? e.message : "Failed to run",
          });
        }
        // keep UI responsive between snippets
        await new Promise((r) => setTimeout(r, 0));
      }
      out.sort((a, b) => b.opsPerSec - a.opsPerSec);
      setResults(out);
      trial.recordUse();
      toast.success("Benchmark complete");
    } finally {
      setRunning(false);
    }
  };

  const winner = results.find((r) => !r.error);

  return (
    <ToolPageShell toolId="js-benchmark" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="JS Benchmark" left={trial.left} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="font-medium text-foreground/80">Iterations</span>
          <input
            type="number"
            min={1}
            max={1000000}
            value={iterations}
            onChange={(e) => setIterations(Number(e.target.value))}
            className="w-32 rounded-xl border border-border bg-card px-3 py-2 font-mono text-sm outline-none focus:border-primary/50"
          />
        </label>
        <ActionButton busy={running} disabled={!trial.canUse} onClick={run}>
          <Play className="h-4 w-4" /> {running ? "Running…" : "Run benchmark"}
        </ActionButton>
        <button
          type="button"
          onClick={addSnippet}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
        >
          <Plus className="h-4 w-4" /> Add snippet
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {snippets.map((sn, i) => (
          <div key={sn.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-lg bg-primary/10 px-2 py-0.5 font-mono text-xs font-bold text-primary">
                #{i + 1}
              </span>
              <input
                value={sn.name}
                onChange={(e) => updateSnippet(sn.id, { name: e.target.value })}
                placeholder="Snippet name"
                className="flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-bold outline-none focus:border-border"
              />
              <button
                type="button"
                onClick={() => removeSnippet(sn.id)}
                aria-label="Remove snippet"
                className="text-muted-foreground transition hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <textarea
              value={sn.code}
              onChange={(e) => updateSnippet(sn.id, { code: e.target.value })}
              rows={8}
              spellCheck={false}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-xs leading-relaxed outline-none focus:border-primary/50"
            />
          </div>
        ))}
      </div>

      {results.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Snippet</th>
                <th className="px-4 py-3">Ops / sec</th>
                <th className="px-4 py-3">Total time</th>
                <th className="px-4 py-3">Relative</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => {
                const isWinner = winner && r.id === winner.id;
                const rel = winner && winner.opsPerSec > 0 && !r.error
                  ? (r.opsPerSec / winner.opsPerSec) * 100
                  : 0;
                return (
                  <tr
                    key={r.id}
                    className={cn(
                      "border-b border-border/50 last:border-0",
                      isWinner && "bg-green-500/5",
                    )}
                  >
                    <td className="px-4 py-3">
                      {isWinner ? (
                        <span className="inline-flex items-center gap-1 font-bold text-green-600 dark:text-green-400">
                          <Trophy className="h-4 w-4" /> 1st
                        </span>
                      ) : (
                        <span className="font-mono font-bold text-muted-foreground">#{i + 1}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-bold">{r.name}</td>
                    <td className="px-4 py-3 font-mono">
                      {r.error ? <span className="text-red-500">error</span> : fmtOps(r.opsPerSec)}
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {r.error ? "-" : `${r.totalMs.toFixed(1)} ms`}
                    </td>
                    <td className="px-4 py-3">
                      {r.error ? (
                        <span className="text-xs text-red-500">{r.error}</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn("h-full rounded-full", isWinner ? "bg-green-500" : "bg-primary")}
                              style={{ width: `${Math.max(2, rel)}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs text-muted-foreground">{rel.toFixed(1)}%</span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
        Results vary by device and browser - use them to compare snippets against each other, not as
        absolute numbers. Snippets run in a Web Worker-free sandbox via new Function. Runs fully in
        your browser, nothing is uploaded.
      </p>

      {!isPro && (
        <p className="mt-3 text-xs text-muted-foreground">
          {trial.left} of {TOOL_TRIAL_LIMIT} free benchmarks left.
        </p>
      )}
    </ToolPageShell>
  );
}
