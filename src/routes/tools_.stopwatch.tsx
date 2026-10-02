// /tools/stopwatch - Precision stopwatch with 10ms display, laps with deltas,
// a lap table and CSV export. 100% in-browser.

import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, Flag, Pause, Play, RotateCcw, Timer } from "lucide-react";
import { toast } from "sonner";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/stopwatch")({
  head: () => {
    const seo = getToolSeoMeta("stopwatch");
    const canonical = "https://iconvault.site/tools/stopwatch";
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
  component: StopwatchTool,
});

interface Lap {
  n: number;
  lapMs: number;
  totalMs: number;
}

function fmt(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 10)); // centiseconds
  const cs = total % 100;
  const s = Math.floor(total / 100) % 60;
  const m = Math.floor(total / 6000) % 60;
  const h = Math.floor(total / 360000);
  const body = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
  return h > 0 ? `${h}:${body}` : body;
}

function fmtCsv(ms: number): string {
  return (ms / 1000).toFixed(2);
}

function StopwatchTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("stopwatch", isPro);
  const seo = getToolSeo("stopwatch");

  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [laps, setLaps] = useState<Lap[]>([]);

  const accRef = useRef(0);
  const startRef = useRef(0);

  const now = () => accRef.current + (running ? Date.now() - startRef.current : 0);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setElapsed(accRef.current + (Date.now() - startRef.current));
    }, 31);
    return () => window.clearInterval(id);
  }, [running]);

  const start = () => {
    startRef.current = Date.now();
    setRunning(true);
  };

  const stop = () => {
    accRef.current += Date.now() - startRef.current;
    setElapsed(accRef.current);
    setRunning(false);
  };

  const lap = () => {
    const total = now();
    setElapsed(total);
    setLaps((ls) => {
      const prev = ls.length > 0 ? ls![ls.length - 1]!.totalMs! : 0;
      return [...ls, { n: ls.length + 1, lapMs: total - prev, totalMs: total }];
    });
  };

  const reset = () => {
    setRunning(false);
    accRef.current = 0;
    setElapsed(0);
    setLaps([]);
  };

  const exportCsv = () => {
    if (laps.length === 0 || !trial.canUse) {
      if (!trial.canUse) toast.error(`Free trial used up - ${TOOL_TRIAL_LIMIT} exports per tool. Go Pro for unlimited.`);
      else toast.error("Record at least one lap first.");
      return;
    }
    const csv = [
      "lap,lap_seconds,total_seconds",
      ...laps.map((l) => `${l.n},${fmtCsv(l.lapMs)},${fmtCsv(l.totalMs)}`),
    ].join("\n");
    downloadBlob(new Blob([csv], { type: "text/csv" }), "stopwatch-laps.csv");
    trial.recordUse();
    toast.success("Laps exported");
  };

  const best = laps.length > 0 ? laps.reduce((a, b) => (a.lapMs <= b.lapMs ? a : b)) : null;
  const worst = laps.length > 0 ? laps.reduce((a, b) => (a.lapMs >= b.lapMs ? a : b)) : null;

  return (
    <ToolPageShell toolId="stopwatch" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Stopwatch" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <Timer className="h-8 w-8 text-muted-foreground/50" />
            <p className="font-mono text-5xl font-bold tabular-nums text-primary">{fmt(elapsed)}</p>
            <p className="text-xs text-muted-foreground">10ms precision - hours:min:sec.cs</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {!running ? (
              <ActionButton onClick={start}>
                <Play className="h-4 w-4" /> Start
              </ActionButton>
            ) : (
              <ActionButton onClick={stop}>
                <Pause className="h-4 w-4" /> Stop
              </ActionButton>
            )}
            <ActionButton onClick={lap} disabled={!running}>
              <Flag className="h-4 w-4" /> Lap
            </ActionButton>
          </div>
          <button
            type="button"
            onClick={reset}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-bold transition hover:border-primary/40"
          >
            <RotateCcw className="h-4 w-4" /> Reset
          </button>

          <ActionButton disabled={laps.length === 0 || !trial.canUse} onClick={exportCsv}>
            <Download className="h-4 w-4" /> Export laps CSV
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free exports left - the stopwatch itself is unlimited.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[13px] font-medium text-foreground/80">Laps</p>
            {laps.length > 0 && best && worst && (
              <p className="font-mono text-xs text-muted-foreground">
                Best <span className="font-bold text-green-600">{fmt(best.lapMs)}</span> - Worst{" "}
                <span className="font-bold text-amber-600">{fmt(worst.lapMs)}</span>
              </p>
            )}
          </div>
          {laps.length === 0 ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center text-center">
              <Flag className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">No laps yet</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Start the stopwatch and press Lap to record split times with deltas.
              </p>
            </div>
          ) : (
            <div className="max-h-[420px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="px-3 py-2 font-medium">#</th>
                    <th className="px-3 py-2 font-medium">Lap time</th>
                    <th className="px-3 py-2 font-medium">Delta vs previous</th>
                    <th className="px-3 py-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {[...laps].reverse().map((l) => {
                    const prev = laps[l.n - 2];
                    const delta = prev ? l.lapMs - prev.lapMs : 0;
                    return (
                      <tr key={l.n} className="border-b border-border/60 last:border-0">
                        <td className="px-3 py-2 font-mono font-bold">{l.n}</td>
                        <td className="px-3 py-2 font-mono font-bold text-primary">{fmt(l.lapMs)}</td>
                        <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                          {l.n === 1 ? "-" : `${delta >= 0 ? "+" : "-"}${fmt(Math.abs(delta))}`}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-muted-foreground">{fmt(l.totalMs)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
