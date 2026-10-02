// /tools/js-memory-leaks - Create real leaks (closures, detached DOM, timers),
// watch the heap grow on a live graph, then fix them and watch it settle.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Activity, Copy, Check, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/js-memory-leaks")({
  head: () => {
    const seo = getToolSeoMeta("js-memory-leaks");
    const canonical = "https://iconvault.site/tools/js-memory-leaks";
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
  component: MemoryLeaksTool,
});

const HAS_HEAP = typeof performance !== "undefined" && typeof (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory !== "undefined";

function heapMB(): number | null {
  if (!HAS_HEAP) return null;
  return (performance as unknown as { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize / 1048576;
}

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

function HeapGraph({ running }: { running: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const samplesRef = useRef<number[]>([]);
  const [current, setCurrent] = useState<number | null>(null);
  const [peak, setPeak] = useState(0);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const mb = heapMB();
      if (mb === null) return;
      samplesRef.current.push(mb);
      if (samplesRef.current.length > 120) samplesRef.current.shift();
      setCurrent(mb);
      setPeak((p) => Math.max(p, mb));
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const w = canvas.width, h = canvas.height;
      const s = samplesRef.current;
      ctx.clearRect(0, 0, w, h);
      if (s.length < 2) return;
      const min = Math.min(...s), max = Math.max(...s);
      const span = Math.max(1, max - min);
      ctx.beginPath();
      s.forEach((v, i) => {
        const x = (i / (s.length - 1)) * w;
        const y = h - 8 - ((v - min) / span) * (h - 24);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = "#0F766E";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fillStyle = "rgba(15,118,110,0.12)";
      ctx.fill();
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-semibold"><Activity className="h-4 w-4 text-primary" /> Live JS heap</p>
        <p className="font-mono text-sm text-muted-foreground">
          {current !== null ? `${current.toFixed(1)} MB` : "n/a"} <span className="text-xs">(peak {peak.toFixed(1)} MB)</span>
        </p>
      </div>
      {HAS_HEAP ? (
        <canvas ref={canvasRef} width={560} height={140} className="h-[140px] w-full rounded-xl bg-background" />
      ) : (
        <p className="rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
          performance.memory is only exposed in Chromium. The leak demos still work everywhere, but the live heap graph needs Chrome or Edge.
        </p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">Sampled once per second. Create leaks below and watch the line climb, then fix them and watch it settle.</p>
    </div>
  );
}

const CLOSURE_CODE = `// LEAK: every handler closes over bigData and is never removed
const cache = [];
function leakyListener() {
  const bigData = new Array(250000).fill("x").join(""); // ~250KB
  const handler = () => console.log(bigData.length);   // closure keeps bigData alive
  window.addEventListener("resize", handler);
  cache.push(handler); // even without this, the listener itself retains it
}
// FIX: keep a reference and remove it
// window.removeEventListener("resize", handler);`;

const DOM_CODE = `// LEAK: removed from the page but still referenced = detached DOM
const detached = [];
function leakNodes() {
  for (let i = 0; i < 200; i++) {
    const el = document.createElement("div");
    el.textContent = "row " + i + " " + "x".repeat(500);
    document.body.appendChild(el);
    el.remove();          // gone from the DOM...
    detached.push(el);    // ...but still retained here
  }
}
// FIX: detached.length = 0 lets the garbage collector reclaim them`;

const TIMER_CODE = `// LEAK: the interval keeps the whole closure (and its data) alive
let timerId = null;
function startLeak() {
  const history = [];
  timerId = setInterval(() => {
    history.push(new Array(10000).fill(Date.now())); // grows forever
  }, 500);
}
// FIX: clearInterval(timerId); timerId = null;`;

function MemoryLeaksTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("js-memory-leaks", isPro);
  const seo = getToolSeo("js-memory-leaks");

  const [closures, setClosures] = useState(0);
  const [collected, setCollected] = useState(0);
  const [detachedCount, setDetachedCount] = useState(0);
  const [timerOn, setTimerOn] = useState(false);
  const [timerTicks, setTimerTicks] = useState(0);

  const closureStore = useRef<(() => void)[]>([]);
  const detachedStore = useRef<HTMLDivElement[]>([]);
  const timerRef = useRef<number | null>(null);
  const timerData = useRef<number[][]>([]);
  const registryRef = useRef<FinalizationRegistry<string> | null>(null);

  const getRegistry = () => {
    if (!registryRef.current && typeof FinalizationRegistry !== "undefined") {
      registryRef.current = new FinalizationRegistry(() => setCollected((c) => c + 1));
    }
    return registryRef.current;
  };

  useEffect(() => () => {
    if (timerRef.current !== null) clearInterval(timerRef.current);
  }, []);

  const leakClosures = useCallback(() => {
    if (!trial.canUse) return;
    const registry = getRegistry();
    for (let i = 0; i < 10; i++) {
      const bigData = new Array(250000).fill("x").join("");
      const handler = () => bigData.length;
      closureStore.current.push(handler);
      if (typeof WeakRef !== "undefined") {
        registry?.register(handler, "closure");
      }
    }
    setClosures((c) => c + 10);
    trial.recordUse();
    toast.success("10 leaking closures created (about 2.5MB retained)");
  }, [trial]);

  const fixClosures = useCallback(() => {
    closureStore.current = [];
    setClosures(0);
    toast.success("References dropped. Watch the heap settle as GC runs.");
  }, []);

  const leakDom = useCallback(() => {
    if (!trial.canUse) return;
    const host = document.createElement("div");
    document.body.appendChild(host);
    for (let i = 0; i < 200; i++) {
      const el = document.createElement("div");
      el.textContent = `row ${i} ${"x".repeat(500)}`;
      host.appendChild(el);
    }
    const nodes = Array.from(host.children) as HTMLDivElement[];
    host.remove();
    detachedStore.current.push(...nodes);
    setDetachedCount((c) => c + nodes.length);
    trial.recordUse();
    toast.success("200 detached DOM nodes retained");
  }, [trial]);

  const fixDom = useCallback(() => {
    detachedStore.current = [];
    setDetachedCount(0);
    toast.success("Detached references released.");
  }, []);

  const toggleTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      timerData.current = [];
      setTimerOn(false);
      toast.success("Timer cleared and its retained data released.");
      return;
    }
    if (!trial.canUse) return;
    timerRef.current = window.setInterval(() => {
      timerData.current.push(new Array(10000).fill(Date.now()));
      setTimerTicks((t) => t + 1);
    }, 500);
    setTimerOn(true);
    trial.recordUse();
    toast.success("Leaking timer started: it appends ~80KB every 500ms, forever.");
  }, [trial]);

  const copy = (code: string, label: string) => {
    void navigator.clipboard.writeText(code).then(() => toast.success(label)).catch(() => toast.error("Copy failed"));
  };

  const demos = [
    {
      icon: <Zap className="h-5 w-5 text-amber-500" />,
      title: "Closure leak",
      desc: "Event handlers that close over big data and are never removed. Each batch retains about 2.5MB.",
      status: `${closures} retained · ${collected} collected by GC so far`,
      code: CLOSURE_CODE,
      onLeak: leakClosures, onFix: fixClosures, leakLabel: "Leak 10 closures", fixed: closures === 0,
    },
    {
      icon: <Trash2 className="h-5 w-5 text-red-500" />,
      title: "Detached DOM",
      desc: "Nodes removed from the page but kept in a JS array. DevTools would flag these under Detached Elements.",
      status: `${detachedCount} detached nodes retained`,
      code: DOM_CODE,
      onLeak: leakDom, onFix: fixDom, leakLabel: "Detach 200 nodes", fixed: detachedCount === 0,
    },
  ];

  return (
    <ToolPageShell toolId="js-memory-leaks" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="JS Memory Leaks" left={trial.left} />
      <HeapGraph running />
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {demos.map((d) => (
          <div key={d.title} className="space-y-4 rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              {d.icon}
              <h3 className="font-bold">{d.title}</h3>
            </div>
            <p className="text-sm text-muted-foreground">{d.desc}</p>
            <p className="font-mono text-[13px] font-semibold text-primary">{d.status}</p>
            <div className="flex flex-wrap gap-2">
              <ActionButton onClick={d.onLeak} disabled={!trial.canUse}>{d.leakLabel}</ActionButton>
              <button
                type="button"
                onClick={d.onFix}
                disabled={d.fixed}
                className={cn(
                  "rounded-xl border px-4 py-2.5 text-sm font-semibold transition",
                  d.fixed ? "border-border text-muted-foreground/50" : "border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400",
                )}
              >
                Fix it
              </button>
            </div>
            <CodeBlock code={d.code} onCopy={() => copy(d.code, "Leak pattern copied")} />
          </div>
        ))}
      </div>
      <div className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h3 className="font-bold">Runaway timer</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          An interval that appends to an array in its closure. The timer handle alone keeps the whole closure alive, even on a background tab.
        </p>
        <p className="font-mono text-[13px] font-semibold text-primary">
          {timerOn ? `running · ${timerTicks} ticks retained` : "stopped"}
        </p>
        <div>
          <ActionButton onClick={toggleTimer} disabled={!timerOn && !trial.canUse}>
            {timerOn ? "Stop and fix" : "Start leaking timer"}
          </ActionButton>
        </div>
        <CodeBlock code={TIMER_CODE} onCopy={() => copy(TIMER_CODE, "Timer pattern copied")} />
      </div>
      {!isPro && (
        <p className="mt-6 text-xs text-muted-foreground">
          {trial.left} of {TOOL_TRIAL_LIMIT} free leak experiments left. Everything runs locally in your browser.
        </p>
      )}
    </ToolPageShell>
  );
}
