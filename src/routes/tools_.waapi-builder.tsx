// /tools/waapi-builder - Visual Web Animations API builder: keyframe
// editor, live preview on a real element, and element.animate() code
// export. 100% in-browser.

import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Download, Pause, Play, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/waapi-builder")({
  head: () => {
    const seo = getToolSeoMeta("waapi-builder");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: WaapiTool,
});

// DOM lib's Keyframe type for Element.animate(); the local Keyframe below
// is the editor's own row model and shadows the global name.
type DomAnimateKeyframes = Parameters<HTMLElement["animate"]>[0];

interface Keyframe {
  id: number;
  offset: number;
  tx: number;
  ty: number;
  rotate: number;
  scale: number;
  opacity: number;
  bg: string;
}

const EASINGS = ["ease", "ease-in", "ease-out", "ease-in-out", "linear", "cubic-bezier(0.34,1.56,0.64,1)"];
const DIRECTIONS = ["normal", "reverse", "alternate", "alternate-reverse"] as const;
const FILLS = ["none", "forwards", "backwards", "both"] as const;

let nextId = 1;
const blank = (offset: number): Keyframe => ({
  id: nextId++,
  offset,
  tx: 0,
  ty: 0,
  rotate: 0,
  scale: 1,
  opacity: 1,
  bg: "#6366f1",
});

function framesOf(kfs: Keyframe[]): Keyframe[] {
  return [...kfs].sort((a, b) => a.offset - b.offset);
}

function buildFrames(kfs: Keyframe[]): Record<string, string | number>[] {
  return framesOf(kfs).map((k) => ({
    offset: k.offset / 100,
    transform: `translate(${k.tx}px, ${k.ty}px) rotate(${k.rotate}deg) scale(${k.scale})`,
    opacity: k.opacity,
    background: k.bg,
  }));
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function WaapiTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("waapi-builder", isPro);
  const seo = getToolSeo("waapi-builder");

  const [keyframes, setKeyframes] = useState<Keyframe[]>([
    { ...blank(0), bg: "#6366f1" },
    { ...blank(100), tx: 160, rotate: 180, scale: 1.2, opacity: 0.85, bg: "#ec4899" },
  ]);
  const [duration, setDuration] = useState(1200);
  const [easing, setEasing] = useState("ease-in-out");
  const [iterations, setIterations] = useState("Infinity");
  const [direction, setDirection] = useState<(typeof DIRECTIONS)[number]>("alternate");
  const [fill, setFill] = useState<(typeof FILLS)[number]>("both");
  const [playing, setPlaying] = useState(false);

  const boxRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<Animation | null>(null);

  const update = (id: number, patch: Partial<Keyframe>) =>
    setKeyframes((p) => p.map((k) => (k.id === id ? { ...k, ...patch } : k)));

  const addKeyframe = () => {
    const offsets = keyframes.map((k) => k.offset);
    const mid = offsets.length ? Math.max(...offsets) : 0;
    const offset = mid >= 100 ? 50 : Math.min(100, mid + 25);
    setKeyframes((p) => [...p, blank(offset)]);
  };

  const removeKeyframe = (id: number) =>
    setKeyframes((p) => (p.length > 2 ? p.filter((k) => k.id !== id) : p));

  const code = `const el = document.querySelector("#box");

el.animate(
  ${JSON.stringify(buildFrames(keyframes), null, 2)},
  {
    duration: ${duration},
    easing: "${easing}",
    iterations: ${iterations},
    direction: "${direction}",
    fill: "${fill}",
  },
);`;

  const play = () => {
    if (!trial.canUse || !boxRef.current) return;
    trial.recordUse();
    animRef.current?.cancel();
    const iter = iterations === "Infinity" ? Infinity : Math.max(1, Number(iterations) || 1);
    const anim = boxRef.current.animate(buildFrames(keyframes) as unknown as DomAnimateKeyframes, {
      duration,
      easing,
      iterations: iter,
      direction,
      fill,
    });
    animRef.current = anim;
    setPlaying(true);
    anim.onfinish = () => setPlaying(false);
    toast.success("Animation playing");
  };

  const pauseToggle = () => {
    const a = animRef.current;
    if (!a) return;
    if (a.playState === "paused") {
      a.play();
      setPlaying(true);
    } else {
      a.pause();
      setPlaying(false);
    }
  };

  const stop = () => {
    animRef.current?.cancel();
    animRef.current = null;
    setPlaying(false);
  };

  const fieldCls =
    "w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary";
  const labelCls = "mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground";

  return (
    <ToolPageShell toolId="waapi-builder" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="WAAPI Builder" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[440px_1fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Keyframes</h2>
              <button
                type="button"
                onClick={addKeyframe}
                className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-sm font-semibold transition hover:border-primary/40"
              >
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
            <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
              {framesOf(keyframes).map((k) => (
                <div key={k.id} className="rounded-xl border border-border bg-background p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm font-bold">
                      <span className="text-primary">{k.offset}%</span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={k.offset}
                        onChange={(e) => update(k.id, { offset: Number(e.target.value) })}
                        className="w-28 accent-primary"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => removeKeyframe(k.id)}
                      disabled={keyframes.length <= 2}
                      className="rounded-lg p-1 text-muted-foreground transition hover:bg-red-500/10 hover:text-red-500 disabled:opacity-30"
                      aria-label="Remove keyframe"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className={labelCls}>Move X</span>
                      <input type="number" value={k.tx} onChange={(e) => update(k.id, { tx: Number(e.target.value) })} className={fieldCls} />
                    </div>
                    <div>
                      <span className={labelCls}>Move Y</span>
                      <input type="number" value={k.ty} onChange={(e) => update(k.id, { ty: Number(e.target.value) })} className={fieldCls} />
                    </div>
                    <div>
                      <span className={labelCls}>Rotate&deg;</span>
                      <input type="number" value={k.rotate} onChange={(e) => update(k.id, { rotate: Number(e.target.value) })} className={fieldCls} />
                    </div>
                    <div>
                      <span className={labelCls}>Scale</span>
                      <input type="number" step={0.1} value={k.scale} onChange={(e) => update(k.id, { scale: Number(e.target.value) })} className={fieldCls} />
                    </div>
                    <div>
                      <span className={labelCls}>Opacity</span>
                      <input type="number" step={0.05} min={0} max={1} value={k.opacity} onChange={(e) => update(k.id, { opacity: Number(e.target.value) })} className={fieldCls} />
                    </div>
                    <div>
                      <span className={labelCls}>Color</span>
                      <input type="color" value={k.bg} onChange={(e) => update(k.id, { bg: e.target.value })} className="h-9 w-full cursor-pointer rounded-lg border border-border bg-background" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 font-semibold">Timing</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className={labelCls}>Duration (ms)</span>
                <input type="number" min={100} step={100} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className={fieldCls} />
              </div>
              <div>
                <span className={labelCls}>Iterations</span>
                <select value={iterations} onChange={(e) => setIterations(e.target.value)} className={fieldCls}>
                  {["1", "2", "3", "Infinity"].map((n) => (
                    <option key={n} value={n}>
                      {n === "Infinity" ? "Infinite" : `${n}x`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <span className={labelCls}>Easing</span>
                <select value={easing} onChange={(e) => setEasing(e.target.value)} className={fieldCls}>
                  {EASINGS.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <span className={labelCls}>Direction</span>
                <select value={direction} onChange={(e) => setDirection(e.target.value as typeof direction)} className={fieldCls}>
                  {DIRECTIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <span className={labelCls}>Fill</span>
                <div className="flex gap-2">
                  {FILLS.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFill(f)}
                      className={cn(
                        "flex-1 rounded-lg border px-2 py-1.5 text-xs font-bold transition",
                        fill === f
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40",
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">Live preview</h2>
              <div className="flex gap-2">
                <ActionButton busy={false} disabled={!trial.canUse} onClick={play}>
                  <Play className="h-4 w-4" /> Play
                </ActionButton>
                <button
                  type="button"
                  onClick={pauseToggle}
                  disabled={!animRef.current}
                  className="flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition hover:border-primary/40 disabled:opacity-40"
                >
                  <Pause className="h-4 w-4" /> {playing ? "Pause" : "Resume"}
                </button>
                <button
                  type="button"
                  onClick={stop}
                  className="flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition hover:border-primary/40"
                >
                  <RotateCcw className="h-4 w-4" /> Stop
                </button>
              </div>
            </div>
            <div className="relative h-64 overflow-hidden rounded-xl border border-border bg-[repeating-conic-gradient(#80808022_0_25%,transparent_0_50%)] bg-[length:24px_24px]">
              <div
                ref={boxRef}
                className="absolute left-8 top-1/2 h-16 w-16 -translate-y-1/2 rounded-2xl shadow-lg"
                style={{ background: keyframes[0]?.bg ?? "#6366f1" }}
              />
            </div>
            {!isPro && (
              <p className="mt-2 text-xs text-muted-foreground">
                {trial.left} of {TOOL_TRIAL_LIMIT} free plays left. Runs on the real Web Animations API.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Generated element.animate() code</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await copyText(code);
                    if (ok) {
                      trial.recordUse();
                      toast.success("Animation code copied");
                    }
                  }}
                  disabled={!trial.canUse}
                  className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-sm font-semibold transition hover:border-primary/40 disabled:opacity-40"
                >
                  <Copy className="h-4 w-4" /> Copy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    downloadBlob(new Blob([code], { type: "text/javascript" }), "animation.js");
                    trial.recordUse();
                    toast.success("animation.js downloaded");
                  }}
                  disabled={!trial.canUse}
                  className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-sm font-semibold transition hover:border-primary/40 disabled:opacity-40"
                >
                  <Download className="h-4 w-4" /> .js
                </button>
              </div>
            </div>
            <pre className="max-h-72 overflow-auto rounded-xl bg-black/80 p-4 font-mono text-[13px] leading-relaxed text-sky-300">
              {code}
            </pre>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
