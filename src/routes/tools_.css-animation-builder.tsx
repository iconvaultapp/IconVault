// /tools/css-animation-builder - Build CSS keyframe animations visually.
// 100% client-side; trial use is recorded when the CSS is copied.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/css-animation-builder")({
  head: () => {
    const seo = getToolSeoMeta("css-animation-builder");
    const canonical = "https://iconvault.site/tools/css-animation-builder";
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
  component: AnimationTool,
});

interface Stop {
  id: number;
  pct: number;
  props: string;
}

const TIMINGS = ["ease", "linear", "ease-in", "ease-out", "ease-in-out", "step-start", "step-end", "cubic-bezier(0.34, 1.56, 0.64, 1)", "cubic-bezier(0.68, -0.55, 0.27, 1.55)"];
const DIRECTIONS = ["normal", "reverse", "alternate", "alternate-reverse"];
const FILL_MODES = ["none", "forwards", "backwards", "both"];

const PRESETS: { name: string; stops: [number, string][] }[] = [
  { name: "Fade", stops: [[0, "opacity: 0;"], [100, "opacity: 1;"]] },
  { name: "Slide up", stops: [[0, "opacity: 0;\ntransform: translateY(40px);"], [100, "opacity: 1;\ntransform: translateY(0);"]] },
  { name: "Bounce", stops: [[0, "transform: translateY(0);"], [25, "transform: translateY(-30px);"], [50, "transform: translateY(0);"], [75, "transform: translateY(-15px);"], [100, "transform: translateY(0);"]] },
  { name: "Spin", stops: [[0, "transform: rotate(0deg);"], [100, "transform: rotate(360deg);"]] },
  { name: "Pulse", stops: [[0, "transform: scale(1);"], [50, "transform: scale(1.15);"], [100, "transform: scale(1);"]] },
  { name: "Shake", stops: [[0, "transform: translateX(0);"], [20, "transform: translateX(-10px);"], [40, "transform: translateX(10px);"], [60, "transform: translateX(-8px);"], [80, "transform: translateX(8px);"], [100, "transform: translateX(0);"]] },
];

function AnimationTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("css-animation-builder", isPro);
  const seo = getToolSeo("css-animation-builder");

  const [name, setName] = useState("iv-anim");
  const [stops, setStops] = useState<Stop[]>([
    { id: 1, pct: 0, props: "opacity: 0;\ntransform: translateY(40px);" },
    { id: 2, pct: 100, props: "opacity: 1;\ntransform: translateY(0);" },
  ]);
  const [nextId, setNextId] = useState(3);
  const [duration, setDuration] = useState(1);
  const [timing, setTiming] = useState("ease");
  const [infinite, setInfinite] = useState(true);
  const [count, setCount] = useState(2);
  const [direction, setDirection] = useState("normal");
  const [fillMode, setFillMode] = useState("both");
  const [delay, setDelay] = useState(0);
  const [copied, setCopied] = useState(false);
  const [replay, setReplay] = useState(0);

  const animName = name.trim().replace(/[^a-zA-Z0-9-_]/g, "") || "iv-anim";

  const applyPreset = (p: (typeof PRESETS)[number]) => {
    setStops(p.stops.map(([pct, props], i) => ({ id: i + 1, pct, props })));
    setNextId(p.stops.length + 1);
    setReplay((r) => r + 1);
  };

  const addStop = () => {
    const mid = Math.round(stops.reduce((a, s) => a + s.pct, 0) / Math.max(1, stops.length)) || 50;
    setStops((s) => [...s, { id: nextId, pct: Math.min(100, Math.max(0, mid)), props: "" }]);
    setNextId((n) => n + 1);
  };

  const removeStop = (id: number) => setStops((s) => (s.length <= 2 ? s : s.filter((x) => x.id !== id)));
  const updateStop = (id: number, patch: Partial<Stop>) =>
    setStops((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const sorted = useMemo(() => [...stops].sort((a, b) => a.pct - b.pct), [stops]);

  const keyframes = useMemo(
    () =>
      `@keyframes ${animName} {\n${sorted
        .map(
          (s) =>
            `  ${s.pct}% {\n${s.props
              .split("\n")
              .map((l) => l.trim())
              .filter(Boolean)
              .map((l) => `    ${l.endsWith(";") ? l : `${l};`}`)
              .join("\n")}\n  }`,
        )
        .join("\n")}\n}`,
    [sorted, animName],
  );

  const shorthand = `${animName} ${duration}s ${timing} ${delay}s ${infinite ? "infinite" : count} ${direction} ${fillMode}`;

  const fullCss = useMemo(
    () =>
      `${keyframes}\n\n.animated {\n  animation: ${shorthand};\n  /* or longhand:\n  animation-name: ${animName};\n  animation-duration: ${duration}s;\n  animation-timing-function: ${timing};\n  animation-delay: ${delay}s;\n  animation-iteration-count: ${infinite ? "infinite" : count};\n  animation-direction: ${direction};\n  animation-fill-mode: ${fillMode}; */\n}`,
    [keyframes, shorthand, animName, duration, timing, delay, infinite, count, direction, fillMode],
  );

  const copy = async () => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(fullCss);
      setCopied(true);
      trial.recordUse();
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  const slider = (label: string, value: number, min: number, max: number, step: number, onChange: (n: number) => void, unit = "s") => (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between text-[13px]">
        <span className="font-medium text-foreground/80">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </label>
  );

  const select = (label: string, value: string, options: string[], onChange: (v: string) => void) => (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-foreground/80">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <ToolPageShell toolId="css-animation-builder" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="CSS Animation Builder" left={trial.left} />
      <style>{keyframes}</style>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-6">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Presets</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:border-primary/60 hover:text-foreground"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-foreground/80">Animation name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary"
            />
          </label>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Keyframes</p>
              <button
                type="button"
                onClick={addStop}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold hover:border-primary/60"
              >
                <Plus className="h-3.5 w-3.5" /> Add stop
              </button>
            </div>
            <div className="space-y-3">
              {sorted.map((s) => (
                <div key={s.id} className="rounded-xl bg-muted/50 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={s.pct}
                      onChange={(e) => updateStop(s.id, { pct: Math.min(100, Math.max(0, Number(e.target.value))) })}
                      className="w-20 rounded-lg border border-border bg-background px-2 py-1.5 text-sm font-bold tabular-nums outline-none focus:border-primary"
                    />
                    <span className="text-sm font-bold text-muted-foreground">%</span>
                    {stops.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeStop(s.id)}
                        className="ml-auto rounded-lg p-1.5 text-muted-foreground hover:bg-background hover:text-red-500"
                        aria-label="Remove stop"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <textarea
                    value={s.props}
                    onChange={(e) => updateStop(s.id, { props: e.target.value })}
                    rows={3}
                    placeholder="opacity: 0;&#10;transform: translateY(20px);"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs outline-none focus:border-primary"
                  />
                </div>
              ))}
            </div>
          </div>

          {slider("Duration", duration, 0.1, 5, 0.1, setDuration)}
          {select("Timing function", timing, TIMINGS, setTiming)}
          {slider("Delay", delay, 0, 3, 0.1, setDelay)}
          <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium">
            <input
              type="checkbox"
              checked={infinite}
              onChange={(e) => setInfinite(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            Loop infinitely
          </label>
          {!infinite && slider("Iteration count", count, 1, 10, 1, setCount, "")}
          {select("Direction", direction, DIRECTIONS, setDirection)}
          {select("Fill mode", fillMode, FILL_MODES, setFillMode)}

          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left.
            </p>
          )}
        </div>

        <div className="space-y-5">
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-card p-10">
            <div
              key={replay}
              className="flex h-28 w-28 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground"
              style={{ animation: shorthand }}
            >
              A
            </div>
            <button
              type="button"
              onClick={() => setReplay((r) => r + 1)}
              className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-muted-foreground transition hover:border-primary/60 hover:text-foreground"
            >
              Replay animation
            </button>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">CSS output</p>
            <pre className="max-h-[420px] overflow-auto rounded-xl bg-muted/60 p-4 font-mono text-sm">{fullCss}</pre>
            <button
              type="button"
              onClick={copy}
              disabled={!trial.canUse}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied!" : "Copy CSS"}
            </button>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
