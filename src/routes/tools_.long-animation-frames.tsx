// /tools/long-animation-frames - Observe real long-animation-frame entries,
// see per-script attribution, and understand the link to INP.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Film, Play, Square } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/long-animation-frames";
import toolSeoMeta from "@/lib/tool-seo-meta-data/long-animation-frames";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/long-animation-frames")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/long-animation-frames";
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
  component: LoafTool,
});

type LoafScript = {
  name: string;
  invoker: string;
  invokerType: string;
  duration: number;
  sourceURL: string;
  sourceLine: number;
};

type LoafEntry = {
  startTime: number;
  duration: number;
  renderStart: number;
  styleAndLayoutStart: number;
  scripts: LoafScript[];
};

const SUPPORTED = typeof PerformanceObserver !== "undefined" &&
  ((PerformanceObserver as unknown as { supportedEntryTypes?: string[] }).supportedEntryTypes ?? []).includes("long-animation-frame");

const DETECT_CODE = `// Detect Long Animation Frames with script attribution
if ("PerformanceObserver" in window) {
  const supported = PerformanceObserver.supportedEntryTypes || [];
  if (supported.includes("long-animation-frame")) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const loaf = entry; // PerformanceEventTiming-like
        console.log("LoAF:", Math.round(loaf.duration), "ms");
        for (const script of loaf.scripts) {
          console.log("  script:", script.name || "(inline)",
            "| invoker:", script.invoker,
            "| blocked:", Math.round(script.duration), "ms");
        }
      }
    });
    observer.observe({ type: "long-animation-frame", buffered: true });
  }
}`;

function LoafTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("long-animation-frames", isPro);
  const seo = toolSeo;
  const [observing, setObserving] = useState(false);
  const [entries, setEntries] = useState<LoafEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const observerRef = useRef<PerformanceObserver | null>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!observing || !SUPPORTED) return;
    const obs = new PerformanceObserver((list) => {
      const fresh: LoafEntry[] = [];
      for (const e of list.getEntries()) {
        const entry = e as unknown as {
          startTime: number; duration: number; renderStart: number; styleAndLayoutStart: number;
          scripts: { name: string; invoker: string; invokerType: string; duration: number; sourceURL: string; sourceFunctionName: string; sourceCharPosition: number }[];
        };
        fresh.push({
          startTime: entry.startTime,
          duration: entry.duration,
          renderStart: entry.renderStart,
          styleAndLayoutStart: entry.styleAndLayoutStart,
          scripts: entry.scripts.map((s) => ({
            name: s.name || "(inline script)",
            invoker: s.invoker || "(unknown)",
            invokerType: s.invokerType || "",
            duration: s.duration,
            sourceURL: s.sourceURL || "",
            sourceLine: s.sourceCharPosition ?? 0,
          })),
        });
      }
      if (fresh.length) setEntries((p) => [...fresh, ...p].slice(0, 20));
    });
    obs.observe({ type: "long-animation-frame", buffered: true });
    observerRef.current = obs;
    return () => { obs.disconnect(); observerRef.current = null; };
  }, [observing]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const startObserving = useCallback(() => {
    if (!SUPPORTED || !trial.canUse) return;
    setEntries([]);
    setObserving(true);
    trial.recordUse();
    toast.success("Observing long animation frames");
  }, [trial]);

  const stopObserving = useCallback(() => setObserving(false), []);

  const smoothWork = useCallback(() => {
    // light rAF work: should NOT produce a LoAF
    let frames = 0;
    const step = () => {
      const arr = new Array(200).fill(0).map((_, i) => i * 2);
      void arr.reduce((a, b) => a + b, 0);
      if (++frames < 90) rafRef.current = requestAnimationFrame(step);
      else toast.success("Smooth work done: no LoAF expected");
    };
    rafRef.current = requestAnimationFrame(step);
  }, []);

  const blockingWork = useCallback(() => {
    // one long synchronous task inside an event handler: classic LoAF source
    setBusy(true);
    setTimeout(() => {
      const end = performance.now() + 220;
      let x = 0;
      while (performance.now() < end) x += Math.sqrt(x + 1);
      void x;
      setBusy(false);
      toast.success("Blocking work done: check the entries above");
    }, 30);
  }, []);

  const layoutThrash = useCallback(() => {
    setBusy(true);
    setTimeout(() => {
      const box = document.createElement("div");
      box.style.cssText = "position:absolute;visibility:hidden;width:100px;height:100px;";
      document.body.appendChild(box);
      const end = performance.now() + 150;
      while (performance.now() < end) {
        box.style.width = `${100 + Math.random() * 200}px`;
        void box.offsetWidth; // forced synchronous layout
      }
      box.remove();
      setBusy(false);
      toast.success("Layout thrash done: renderStart to styleAndLayoutStart shows the cost");
    }, 30);
  }, []);

  const copyCode = useCallback(() => {
    void navigator.clipboard.writeText(DETECT_CODE)
      .then(() => { toast.success("Detection snippet copied"); setCopied(true); setTimeout(() => setCopied(false), 1500); })
      .catch(() => toast.error("Copy failed"));
  }, []);

  const totalBlocking = entries.reduce((a, e) => a + Math.max(0, e.duration - 50), 0);

  return (
    <ToolPageShell toolId="long-animation-frames" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Long Animation Frames" left={trial.left} />

      {!SUPPORTED && (
        <div className="mb-6 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-5 text-sm">
          <p className="font-bold">Long Animation Frames are not supported in this browser</p>
          <p className="mt-1 text-muted-foreground">
            The LoAF API needs Chrome 123+, Edge 123+ or Opera 109+. The detection snippet below still works as a
            drop-in for your own site, and the explanation of the INP link applies everywhere.
          </p>
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {!observing ? (
          <ActionButton onClick={startObserving} disabled={!SUPPORTED || !trial.canUse}>
            <Play className="h-4 w-4" /> Start observing
          </ActionButton>
        ) : (
          <button
            type="button"
            onClick={stopObserving}
            className="flex items-center gap-1.5 rounded-xl border border-red-500/50 px-4 py-2.5 text-sm font-bold text-red-500 transition hover:bg-red-500/10"
          >
            <Square className="h-4 w-4" /> Stop observing
          </button>
        )}
        <button
          type="button"
          onClick={smoothWork}
          disabled={!observing}
          className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:opacity-40"
        >
          Run smooth work
        </button>
        <button
          type="button"
          onClick={blockingWork}
          disabled={!observing || busy}
          className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:opacity-40"
        >
          Run 220ms blocking task
        </button>
        <button
          type="button"
          onClick={layoutThrash}
          disabled={!observing || busy}
          className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:opacity-40"
        >
          Force layout thrash
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-bold"><Film className="h-4 w-4 text-primary" /> Captured frames ({entries.length})</p>
            {entries.length > 0 && (
              <p className="font-mono text-sm text-muted-foreground">total blocking: <span className="font-bold text-red-500">{Math.round(totalBlocking)}ms</span></p>
            )}
          </div>
          {entries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              {observing
                ? "Observing… press one of the workload buttons. A LoAF fires when a frame takes longer than 50ms."
                : "Start observing, then trigger a blocking task to capture a real long animation frame."}
            </div>
          ) : (
            entries.map((e, i) => (
              <div key={`${e.startTime}-${i}`} className="rounded-2xl border border-border bg-card p-4">
                <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className={cn("rounded-lg px-2.5 py-1 font-mono text-sm font-bold", e.duration > 200 ? "bg-red-500/15 text-red-500" : "bg-amber-500/15 text-amber-600 dark:text-amber-400")}>
                    {Math.round(e.duration)}ms
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">start {Math.round(e.startTime)}ms</span>
                  <span className="font-mono text-xs text-muted-foreground">render at +{Math.round(e.renderStart - e.startTime)}ms</span>
                  <span className="font-mono text-xs text-muted-foreground">style+layout at +{Math.round(e.styleAndLayoutStart - e.startTime)}ms</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-red-500" style={{ width: `${Math.min(100, e.duration / 4)}%` }} />
                </div>
                {e.scripts.length > 0 ? (
                  <div className="mt-3 space-y-1.5">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Script attribution</p>
                    {e.scripts.map((s, j) => (
                      <div key={j} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 rounded-lg bg-background px-3 py-2 font-mono text-[12px]">
                        <span className="font-bold text-foreground">{s.name}</span>
                        <span className="text-muted-foreground">invoker: {s.invoker}{s.invokerType ? ` (${s.invokerType})` : ""}</span>
                        <span className="ml-auto font-bold text-red-500">{Math.round(s.duration)}ms</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">No script attribution for this frame (browser did not attribute any script).</p>
                )}
              </div>
            ))
          )}
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
            <p className="mb-2 font-bold text-foreground">Why LoAF matters for INP</p>
            <p>
              INP measures how long the page takes to respond to an interaction. A LoAF tells you exactly which
              script blocked the frame and who invoked it (a click handler, a timer, a rAF callback). Fix the
              attributed script, usually by splitting the work with scheduler.yield() or moving it off the main
              thread, and INP drops with it.
            </p>
          </div>
          <div className="relative overflow-hidden rounded-xl border border-border bg-[#0d1117]">
            <button
              type="button"
              onClick={copyCode}
              className="absolute right-2 top-2 flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/20"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
            <pre className="overflow-x-auto p-4 pr-20 font-mono text-[12px] leading-relaxed text-[#e6edf3]">{DETECT_CODE}</pre>
          </div>
        </div>
      </div>
      {!isPro && (
        <p className="mt-6 text-xs text-muted-foreground">{trial.left} of {TOOL_TRIAL_LIMIT} free observation runs left. Runs fully in your browser.</p>
      )}
    </ToolPageShell>
  );
}
