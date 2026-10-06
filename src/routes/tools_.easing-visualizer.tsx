// /tools/easing-visualizer - Cubic-bezier curve editor with draggable handles,
// preset easings, an animated dot race vs linear, and copyable CSS output.
// 100% client-side; trial use is recorded when the value is copied.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Activity, Check, Copy, Play } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/easing-visualizer";
import toolSeoMeta from "@/lib/tool-seo-meta-data/easing-visualizer";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/easing-visualizer")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/easing-visualizer";
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
  component: EasingTool,
});

const PRESETS: { name: string; v: [number, number, number, number] }[] = [
  { name: "Ease", v: [0.25, 0.1, 0.25, 1] },
  { name: "Ease in", v: [0.42, 0, 1, 1] },
  { name: "Ease out", v: [0, 0, 0.58, 1] },
  { name: "Ease in out", v: [0.42, 0, 0.58, 1] },
  { name: "Linear", v: [0, 0, 1, 1] },
  { name: "Spring", v: [0.34, 1.56, 0.64, 1] },
  { name: "Bouncy", v: [0.68, -0.55, 0.265, 1.55] },
];

/** Standard cubic-bezier easing solver (Newton + bisection fallback). */
function makeEasing(x1: number, y1: number, x2: number, y2: number): (x: number) => number {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  const solve = (x: number) => {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const err = sx(t) - x;
      if (Math.abs(err) < 1e-6) return t;
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    let lo = 0;
    let hi = 1;
    t = x;
    while (hi - lo > 1e-6) {
      if (sx(t) < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return t;
  };
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    return sy(solve(x));
  };
}

const W = 340;
const H = 300;
const PAD = 28;
const px = (x: number) => PAD + x * (W - 2 * PAD);
const py = (y: number) => H - PAD - y * (H - 2 * PAD);

function EasingTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("easing-visualizer", isPro);
  const seo = toolSeo;

  const [p, setP] = useState<[number, number, number, number]>([0.25, 0.1, 0.25, 1]);
  const [duration, setDuration] = useState(1200);
  const [copied, setCopied] = useState(false);
  const [race, setRace] = useState(0); // 0..1 animation progress
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<0 | 1 | null>(null);
  const rafRef = useRef<number>(0);

  const [x1, y1, x2, y2] = p;
  const easing = useMemo(() => makeEasing(x1, y1, x2, y2), [x1, y1, x2, y2]);
  const bezierValue = `cubic-bezier(${x1.toFixed(3)}, ${y1.toFixed(3)}, ${x2.toFixed(3)}, ${y2.toFixed(3)})`;

  const curvePath = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i <= 60; i++) {
      const t = i / 60;
      const bx = 3 * Math.pow(1 - t, 2) * t * x1 + 3 * (1 - t) * t * t * x2 + t * t * t;
      const by = 3 * Math.pow(1 - t, 2) * t * y1 + 3 * (1 - t) * t * t * y2 + t * t * t;
      pts.push(`${i === 0 ? "M" : "L"}${px(bx).toFixed(1)},${py(by).toFixed(1)}`);
    }
    return pts.join(" ");
  }, [x1, y1, x2, y2]);

  const pointFromEvent = useCallback((e: React.PointerEvent) => {
    const el = svgRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const sx = ((e.clientX - r.left) / r.width) * W;
    const sy = ((e.clientY - r.top) / r.height) * H;
    const x = Math.min(1, Math.max(0, (sx - PAD) / (W - 2 * PAD)));
    const y = Math.min(2, Math.max(-1, (H - PAD - sy) / (H - 2 * PAD)));
    return { x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000 };
  }, []);

  const onPointerDown = (idx: 0 | 1) => (e: React.PointerEvent) => {
    dragRef.current = idx;
    svgRef.current?.setPointerCapture(e.pointerId);
    e.preventDefault();
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragRef.current === null) return;
    const pt = pointFromEvent(e);
    if (!pt) return;
    setP((prev) => {
      const next = [...prev] as [number, number, number, number];
      next[dragRef.current! * 2] = pt.x;
      next[dragRef.current! * 2 + 1] = pt.y;
      return next;
    });
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  const playRace = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setRace(t);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [duration]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const copy = async () => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(bezierValue);
      setCopied(true);
      trial.recordUse();
      toast.success("Easing copied to clipboard");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  const setNum = (i: number, v: number) => {
    setP((prev) => {
      const next = [...prev] as [number, number, number, number];
      next[i] = v;
      return next;
    });
  };

  const customPos = easing(Math.min(1, Math.max(0, race))) * 100;
  const linearPos = race * 100;

  const numInput = (label: string, i: number, min: number, max: number) => (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={0.01}
        value={p[i]}
        onChange={(e) => setNum(i, Number(e.target.value))}
        className="w-full rounded-lg border border-border bg-background px-2 py-1.5 font-mono text-xs focus:border-primary focus:outline-none"
      />
    </label>
  );

  return (
    <ToolPageShell toolId="easing-visualizer" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Easing Visualizer" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Presets</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((pr) => (
                <button
                  key={pr.name}
                  type="button"
                  onClick={() => setP(pr.v)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs font-bold transition",
                    p.every((v, i) => v === pr.v[i])
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/60 hover:text-foreground",
                  )}
                >
                  {pr.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {numInput("x1", 0, 0, 1)}
            {numInput("y1", 1, -1, 2)}
            {numInput("x2", 2, 0, 1)}
            {numInput("y2", 3, -1, 2)}
          </div>
          <p className="text-xs text-muted-foreground">
            x stays between 0 and 1 (time only moves forward); y can overshoot for springy motion.
          </p>

          <div>
            <div className="mb-1.5 flex items-center justify-between text-[13px]">
              <span className="font-medium text-foreground/80">Race duration</span>
              <span className="tabular-nums text-muted-foreground">{(duration / 1000).toFixed(1)}s</span>
            </div>
            <input
              type="range"
              min={300}
              max={3000}
              step={100}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          <div className="rounded-xl bg-muted/60 p-3">
            <p className="mb-2 font-mono text-xs break-all">{bezierValue}</p>
            <button
              type="button"
              onClick={copy}
              disabled={!trial.canUse}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy value"}
            </button>
          </div>

          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left.
            </p>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-2 flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold">Curve editor</h2>
              <span className="ml-auto text-xs text-muted-foreground">Drag the two handles</span>
            </div>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${W} ${H}`}
              className="w-full touch-none select-none rounded-xl bg-muted/40"
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              {[0, 0.25, 0.5, 0.75, 1].map((g) => (
                <g key={g} stroke="currentColor" className="text-border" strokeWidth={1}>
                  <line x1={px(g)} y1={py(-1)} x2={px(g)} y2={py(1)} />
                  <line x1={px(0)} y1={py(g)} x2={px(1)} y2={py(g)} />
                </g>
              ))}
              <line x1={px(0)} y1={py(1)} x2={px(1)} y2={py(1)} stroke="currentColor" className="text-muted-foreground/40" strokeDasharray="4 4" />
              <line x1={px(0)} y1={py(0)} x2={px(1)} y2={py(0)} stroke="currentColor" className="text-muted-foreground/40" strokeDasharray="4 4" />
              <line x1={px(0)} y1={py(0)} x2={px(x1)} y2={py(y1)} stroke="#0f766e" strokeWidth={1.5} opacity={0.6} />
              <line x1={px(1)} y1={py(1)} x2={px(x2)} y2={py(y2)} stroke="#0f766e" strokeWidth={1.5} opacity={0.6} />
              <path d={curvePath} fill="none" stroke="#0f766e" strokeWidth={3} strokeLinecap="round" />
              <circle cx={px(0)} cy={py(0)} r={5} className="fill-primary" />
              <circle cx={px(1)} cy={py(1)} r={5} className="fill-primary" />
              {[
                { x: x1, y: y1, idx: 0 as const },
                { x: x2, y: y2, idx: 1 as const },
              ].map((h) => (
                <g key={h.idx} onPointerDown={onPointerDown(h.idx)} className="cursor-grab active:cursor-grabbing">
                  <circle cx={px(h.x)} cy={py(h.y)} r={14} fill="transparent" />
                  <circle cx={px(h.x)} cy={py(h.y)} r={8} fill="#fff" stroke="#0f766e" strokeWidth={3} />
                </g>
              ))}
            </svg>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold">Dot race: your curve vs linear</h2>
              <button
                type="button"
                onClick={playRace}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-xs font-bold transition hover:border-primary/60"
              >
                <Play className="h-3.5 w-3.5" /> Race
              </button>
            </div>
            <div className="space-y-5">
              {[
                { label: "Your easing", pos: customPos, color: "#0f766e" },
                { label: "Linear", pos: linearPos, color: "#94a3b8" },
              ].map((row) => (
                <div key={row.label}>
                  <p className="mb-1.5 text-xs font-bold text-muted-foreground">{row.label}</p>
                  <div className="relative h-10 rounded-xl bg-muted/60">
                    <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded bg-border/60" />
                    <div
                      className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full shadow"
                      style={{ left: `${Math.min(108, Math.max(-8, row.pos))}%`, background: row.color }}
                    />
                    <div className="absolute right-1 top-1/2 h-6 w-1 -translate-y-1/2 rounded bg-foreground/30" />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Both dots run the same distance in the same time; the easing curve decides who leads at
              each moment. Springy curves can overshoot the finish line.
            </p>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
