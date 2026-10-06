// /tools/intersection-observer-playground - A real IntersectionObserver with
// adjustable threshold and rootMargin, a live ratio meter and a callback log.

import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, RotateCcw, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/intersection-observer-playground";
import toolSeoMeta from "@/lib/tool-seo-meta-data/intersection-observer-playground";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/intersection-observer-playground")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/intersection-observer-playground";
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
  component: IoTool,
});

interface LogEntry {
  n: number;
  t: string;
  intersecting: boolean;
  ratio: number;
  note: string;
}

async function copyText(s: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(s);
    return true;
  } catch {
    return false;
  }
}

const PRESETS = [
  { label: "Lazy image (any pixel)", threshold: 0.01, margin: "0px" },
  { label: "Half visible", threshold: 0.5, margin: "0px" },
  { label: "Fully visible", threshold: 1, margin: "0px" },
  { label: "Preload 200px early", threshold: 0, margin: "200px" },
];

function IoTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("intersection-observer-playground", isPro);
  const seo = toolSeo;

  const [threshold, setThreshold] = useState(0.5);
  const [margin, setMargin] = useState("0px");
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [ratio, setRatio] = useState(0);
  const [intersecting, setIntersecting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);
  const seqRef = useRef(0);
  const optsRef = useRef({ threshold, margin });
  optsRef.current = { threshold, margin };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !rootRef.current || !targetRef.current) return;
    const root = rootRef.current;
    const target = targetRef.current;

    const thresholds = threshold === 0 ? [0] : Array.from({ length: 21 }, (_, i) => i / 20);
    const obs = new IntersectionObserver(
      (list) => {
        for (const e of list) {
          seqRef.current += 1;
          const n = seqRef.current;
          const r = e.intersectionRatio;
          setRatio(r);
          setIntersecting(e.isIntersecting);
          const crossed = optsRef.current.threshold;
          const note =
            r >= crossed && crossed > 0
              ? `ratio ${r.toFixed(2)} crossed threshold ${crossed.toFixed(2)}`
              : crossed === 0
                ? "threshold 0: fires on any visibility change"
                : `ratio ${r.toFixed(2)} below threshold ${crossed.toFixed(2)}`;
          setEntries((prev) => [
            { n, t: new Date().toLocaleTimeString(), intersecting: e.isIntersecting, ratio: r, note },
            ...prev,
          ].slice(0, 60));
        }
      },
      { root, threshold: thresholds, rootMargin: margin },
    );
    obs.observe(target);
    return () => obs.disconnect();
  }, [mounted, threshold, margin]);

  const scrollToTarget = (pos: "top" | "center" | "bottom") => {
    const root = rootRef.current;
    const target = targetRef.current;
    if (!root || !target) return;
    const top = target.offsetTop - root.clientHeight / 2 + target.clientHeight / 2;
    root.scrollTo({
      top: pos === "top" ? 0 : pos === "bottom" ? root.scrollHeight : top,
      behavior: "smooth",
    });
  };

  const code = `const target = document.querySelector("#reveal");

const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        target.classList.add("visible");
        observer.unobserve(target); // fire once
      }
    }
  },
  {
    root: null,            // null = viewport
    rootMargin: "${margin}",
    threshold: ${threshold},
  }
);

observer.observe(target);`;

  const copyCode = async () => {
    if (!trial.canUse) return;
    if (await copyText(code)) {
      trial.recordUse();
      setCopied(true);
      toast.success("Observer code copied");
      setTimeout(() => setCopied(false), 1500);
    } else {
      toast.error("Copy failed - select the code manually.");
    }
  };

  const clearLog = () => {
    setEntries([]);
    seqRef.current = 0;
  };

  return (
    <ToolPageShell toolId="intersection-observer-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="IntersectionObserver Playground" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-sm font-bold">threshold</label>
              <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs font-bold">{threshold.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Fraction of the target that must be visible before the callback fires.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold">rootMargin</label>
            <input
              value={margin}
              onChange={(e) => setMargin(e.target.value)}
              spellCheck={false}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm"
              placeholder="0px"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Grows or shrinks the root's box. Try <code className="rounded bg-muted px-1">200px</code> to preload early,
              or <code className="rounded bg-muted px-1">-50px</code> to demand a deeper entry.
            </p>
          </div>

          <div>
            <p className="mb-2 text-sm font-bold">Presets</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    setThreshold(p.threshold);
                    setMargin(p.margin);
                  }}
                  className="rounded-full border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/40"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-muted/40 p-4">
            <div className="mb-1 flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5">
                <ScanLine className="h-3.5 w-3.5 text-primary" /> live intersectionRatio
              </span>
              <span className={cn("font-mono", intersecting ? "text-emerald-600" : "text-muted-foreground")}>
                {ratio.toFixed(2)} {intersecting ? "- visible" : "- hidden"}
              </span>
            </div>
            <div className="relative h-3 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full transition-all duration-150", intersecting ? "bg-emerald-500" : "bg-zinc-400")}
                style={{ width: `${ratio * 100}%` }}
              />
              <div className="absolute inset-y-0 w-0.5 bg-red-500" style={{ left: `${threshold * 100}%` }} title="threshold" />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Red line = your threshold. Green bar = current ratio.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => scrollToTarget("top")} className="rounded-xl border border-border px-3 py-2 text-xs font-bold hover:border-primary/40">Scroll away</button>
            <button type="button" onClick={() => scrollToTarget("center")} className="rounded-xl border border-border px-3 py-2 text-xs font-bold hover:border-primary/40">Scroll to target</button>
            <button type="button" onClick={() => scrollToTarget("bottom")} className="rounded-xl border border-border px-3 py-2 text-xs font-bold hover:border-primary/40">Scroll past</button>
          </div>

          <ActionButton busy={false} disabled={!trial.canUse} onClick={copyCode}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy observer code"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left.
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 font-extrabold">Live demo - scroll the box</h2>
            <div ref={rootRef} className="h-80 overflow-y-auto rounded-xl border border-dashed border-border bg-muted/20">
              <div className="flex h-[500px] items-start justify-center pt-6 text-xs font-bold text-muted-foreground">
                scroll down
              </div>
              <div className="flex justify-center py-4">
                <div
                  ref={targetRef}
                  className={cn(
                    "flex h-32 w-48 items-center justify-center rounded-2xl border-2 text-sm font-extrabold transition-colors",
                    intersecting ? "border-emerald-500 bg-emerald-500/15 text-emerald-600" : "border-border bg-card text-muted-foreground",
                  )}
                >
                  target
                </div>
              </div>
              <div className="flex h-[500px] items-end justify-center pb-6 text-xs font-bold text-muted-foreground">
                keep scrolling
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-extrabold">Callback log ({entries.length})</h2>
              <button
                type="button"
                onClick={clearLog}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/40"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Clear
              </button>
            </div>
            {entries.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Scroll the demo box. Every time the ratio crosses a sampled step, the real observer callback logs here.
              </p>
            ) : (
              <div className="max-h-72 space-y-1.5 overflow-y-auto">
                {entries.map((e) => (
                  <div key={e.n} className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2 text-xs">
                    <span className="font-mono font-bold text-muted-foreground">#{e.n}</span>
                    <span className="font-mono text-muted-foreground">{e.t}</span>
                    <span className={cn("rounded-full px-2 py-0.5 font-bold", e.intersecting ? "bg-emerald-500/15 text-emerald-600" : "bg-zinc-500/15 text-zinc-500")}>
                      {e.intersecting ? "intersecting" : "not intersecting"}
                    </span>
                    <span className="font-mono font-bold">ratio {e.ratio.toFixed(2)}</span>
                    <span className="truncate text-muted-foreground">{e.note}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
