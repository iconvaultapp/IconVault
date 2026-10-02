// /tools/offscreen-canvas-playground - Race an OffscreenCanvas Web Worker
// against main-thread canvas rendering with identical particle workloads.
// Real FPS is measured for both; trial use is recorded when code is copied.

import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Play, Square as StopIcon, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/offscreen-canvas-playground")({
  head: () => {
    const seo = getToolSeoMeta("offscreen-canvas-playground");
    const canonical = "https://iconvault.site/tools/offscreen-canvas-playground";
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
  component: OffscreenCanvasTool,
});

// The worker script runs the exact same particle simulation as the main
// thread, so the FPS race is apples to apples.
const WORKER_SRC = `let canvas, ctx, parts = [], w = 0, h = 0, last = 0, frames = 0;

onmessage = (e) => {
  const d = e.data;
  if (d.type === "init") {
    canvas = d.canvas; w = d.w; h = d.h;
    canvas.width = w; canvas.height = h;
    ctx = canvas.getContext("2d");
    spawn(d.count);
    last = performance.now();
    requestAnimationFrame(tick);
  }
  if (d.type === "count") spawn(d.count);
  if (d.type === "resize") { w = d.w; h = d.h; canvas.width = w; canvas.height = h; }
};

function spawn(n) {
  parts = [];
  for (let i = 0; i < n; i++) {
    parts.push({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4,
      r: 1 + Math.random() * 2.5,
      hue: 150 + Math.random() * 40,
    });
  }
}

function tick(now) {
  ctx.fillStyle = "#0b1220";
  ctx.fillRect(0, 0, w, h);
  for (const p of parts) {
    p.x += p.vx; p.y += p.vy;
    if (p.x < 0 || p.x > w) p.vx *= -1;
    if (p.y < 0 || p.y > h) p.vy *= -1;
    ctx.fillStyle = "hsl(" + p.hue + " 80% 60%)";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, 6.2832);
    ctx.fill();
  }
  frames++;
  const t = performance.now();
  if (t - last >= 500) {
    postMessage({ type: "fps", fps: Math.round((frames * 1000) / (t - last)) });
    frames = 0; last = t;
  }
  requestAnimationFrame(tick);
}
`;

interface Particle { x: number; y: number; vx: number; vy: number; r: number; hue: number }

function OffscreenCanvasTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("offscreen-canvas-playground", isPro);
  const seo = getToolSeo("offscreen-canvas-playground");

  const [count, setCount] = useState(4000);
  const [running, setRunning] = useState(false);
  const [fpsMain, setFpsMain] = useState(0);
  const [fpsWorker, setFpsWorker] = useState(0);
  const [copied, setCopied] = useState(false);
  const [canvasKey, setCanvasKey] = useState(0); // remount worker canvas so it can be transferred again

  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const workerCanvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const mainRaf = useRef(0);
  const particles = useRef<Particle[]>([]);

  const supported = useMemo(
    () =>
      typeof window !== "undefined" &&
      "OffscreenCanvas" in window &&
      typeof Worker !== "undefined" &&
      typeof HTMLCanvasElement !== "undefined" &&
      typeof (HTMLCanvasElement.prototype as unknown as { transferControlToOffscreen?: unknown }).transferControlToOffscreen === "function",
    [],
  );

  const spawn = (n: number, w: number, h: number) => {
    const arr: Particle[] = [];
    for (let i = 0; i < n; i++) {
      arr.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        r: 1 + Math.random() * 2.5,
        hue: 150 + Math.random() * 40,
      });
    }
    particles.current = arr;
  };

  const stop = () => {
    cancelAnimationFrame(mainRaf.current);
    workerRef.current?.terminate();
    workerRef.current = null;
    setRunning(false);
    setFpsMain(0);
    setFpsWorker(0);
    setCanvasKey((k) => k + 1); // a transferred canvas cannot transfer again
  };

  const start = () => {
    if (!supported || running) return;
    const main = mainCanvasRef.current;
    const workerEl = workerCanvasRef.current;
    if (!main || !workerEl) return;
    const rect = main.getBoundingClientRect();
    const w = Math.max(200, Math.floor(rect.width));
    const h = 240;
    main.width = w;
    main.height = h;

    // Main-thread loop (identical workload to the worker).
    const ctx = main.getContext("2d");
    if (!ctx) return;
    spawn(count, w, h);
    let frames = 0;
    let last = performance.now();
    const tick = () => {
      ctx.fillStyle = "#0b1220";
      ctx.fillRect(0, 0, w, h);
      for (const p of particles.current) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        ctx.fillStyle = `hsl(${p.hue} 80% 60%)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 6.2832);
        ctx.fill();
      }
      frames++;
      const t = performance.now();
      if (t - last >= 500) {
        setFpsMain(Math.round((frames * 1000) / (t - last)));
        frames = 0;
        last = t;
      }
      mainRaf.current = requestAnimationFrame(tick);
    };
    tick();

    // Worker loop on an OffscreenCanvas.
    try {
      const offscreen = (workerEl as HTMLCanvasElement).transferControlToOffscreen();
      const blob = new Blob([WORKER_SRC], { type: "text/javascript" });
      const url = URL.createObjectURL(blob);
      const worker = new Worker(url);
      worker.onmessage = (e: MessageEvent) => {
        if (e.data?.type === "fps") setFpsWorker(e.data.fps as number);
      };
      worker.postMessage({ type: "init", canvas: offscreen, count, w, h }, [offscreen]);
      workerRef.current = worker;
      setRunning(true);
    } catch {
      cancelAnimationFrame(mainRaf.current);
      toast.error("Could not start the worker in this browser.");
    }
  };

  useEffect(() => () => {
    cancelAnimationFrame(mainRaf.current);
    workerRef.current?.terminate();
  }, []);

  useEffect(() => {
    workerRef.current?.postMessage({ type: "count", count });
    if (running) {
      const rect = mainCanvasRef.current?.getBoundingClientRect();
      if (rect) spawn(count, Math.max(200, Math.floor(rect.width)), 240);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  const copy = async () => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(WORKER_SRC);
      setCopied(true);
      trial.recordUse();
      toast.success("Worker code copied");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  const winner =
    fpsMain === 0 && fpsWorker === 0 ? null : fpsWorker > fpsMain ? "worker" : fpsMain > fpsWorker ? "main" : "tie";

  return (
    <ToolPageShell toolId="offscreen-canvas-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="OffscreenCanvas Playground" left={trial.left} />

      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4">
        <Zap className="h-5 w-5 text-primary" />
        <span className="text-sm font-bold">Support:</span>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-bold",
            supported ? "bg-green-500/15 text-green-600" : "bg-red-500/15 text-red-600",
          )}
        >
          {supported ? "OffscreenCanvas + Workers available" : "Not supported in this browser"}
        </span>
        {!running ? (
          <button
            type="button"
            onClick={start}
            disabled={!supported}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <Play className="h-4 w-4" /> Start race
          </button>
        ) : (
          <button
            type="button"
            onClick={stop}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-bold hover:border-red-400"
          >
            <StopIcon className="h-4 w-4" /> Stop
          </button>
        )}
        <label className="ml-auto flex items-center gap-2 text-sm font-bold">
          Particles
          <input
            type="range"
            min={500}
            max={20000}
            step={500}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-40 accent-teal-600"
          />
          <span className="font-mono text-xs text-muted-foreground">{count.toLocaleString()}</span>
        </label>
      </div>

      {winner && (
        <div className="mb-5 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm">
          {winner === "tie" ? (
            <>Dead heat so far, both renderers are holding the same frame rate.</>
          ) : (
            <>
              The <strong>{winner === "worker" ? "Web Worker (OffscreenCanvas)" : "main thread"}</strong> is
              currently faster. Raise the particle count to widen the gap: the worker keeps the page
              responsive because painting never blocks the main thread.
            </>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {[
          { title: "Main thread", sub: "classic 2D context, blocks the UI thread", fps: fpsMain, ref: mainCanvasRef, worker: false },
          { title: "Web Worker", sub: "OffscreenCanvas painted off the main thread", fps: fpsWorker, ref: workerCanvasRef, worker: true },
        ].map((p) => (
          <div key={p.title} className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold">{p.title}</h2>
                <p className="text-xs text-muted-foreground">{p.sub}</p>
              </div>
              <span
                className={cn(
                  "rounded-full px-3 py-1 font-mono text-sm font-extrabold",
                  p.fps >= 50
                    ? "bg-green-500/15 text-green-600"
                    : p.fps >= 25
                      ? "bg-amber-500/15 text-amber-600"
                      : p.fps > 0
                        ? "bg-red-500/15 text-red-600"
                        : "bg-muted text-muted-foreground",
                )}
              >
                {p.fps > 0 ? `${p.fps} FPS` : "-- FPS"}
              </span>
            </div>
            <canvas
              key={p.worker ? canvasKey : "main"}
              ref={p.ref}
              className="h-[240px] w-full rounded-xl bg-[#0b1220]"
            />
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold">Worker source code (the real thing)</h2>
          <button
            type="button"
            onClick={copy}
            disabled={!trial.canUse}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-xs font-bold transition hover:border-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy worker code"}
          </button>
        </div>
        <pre className="max-h-72 overflow-auto rounded-xl bg-muted/40 p-4 font-mono text-xs leading-relaxed">{WORKER_SRC}</pre>
        {!isPro && (
          <p className="mt-3 text-xs text-muted-foreground">
            {trial.left} of {TOOL_TRIAL_LIMIT} free copies left.
          </p>
        )}
      </div>
    </ToolPageShell>
  );
}
