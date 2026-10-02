// /tools/gradient-text - Gradient text generator: multi-stop gradients,
// angle control, animated gradients, presets. 100% in-browser.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/gradient-text")({
  head: () => {
    const seo = getToolSeoMeta("gradient-text");
    const canonical = "https://iconvault.site/tools/gradient-text";
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
  component: GradientTextTool,
});

interface Stop {
  id: number;
  color: string;
  pos: number;
}

const PRESETS: { name: string; stops: [string, number][]; angle: number }[] = [
  { name: "Sunset", stops: [["#ff512f", 0], ["#dd2476", 100]], angle: 90 },
  { name: "Ocean", stops: [["#2193b0", 0], ["#6dd5ed", 100]], angle: 90 },
  { name: "Candy", stops: [["#ff6a00", 0], ["#ee0979", 50], ["#ff6a00", 100]], angle: 90 },
  { name: "Neon", stops: [["#00f5a0", 0], ["#00d9f5", 100]], angle: 135 },
];

let stopId = 0;
const mkStop = (color: string, pos: number): Stop => ({ id: ++stopId, color, pos });

function stopsCss(stops: Stop[]): string {
  return stops
    .slice()
    .sort((a, b) => a.pos - b.pos)
    .map((s) => `${s.color} ${s.pos}%`)
    .join(", ");
}

function GradientTextTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("gradient-text", isPro);
  const seo = getToolSeo("gradient-text");

  const [text, setText] = useState("Gradient Text");
  const [stops, setStops] = useState<Stop[]>([mkStop("#f43f5e", 0), mkStop("#8b5cf6", 50), mkStop("#3b82f6", 100)]);
  const [angle, setAngle] = useState(90);
  const [animated, setAnimated] = useState(false);
  const [fontSize, setFontSize] = useState(64);
  const [copied, setCopied] = useState(false);

  const gradient = useMemo(() => `linear-gradient(${angle}deg, ${stopsCss(stops)})`, [angle, stops]);

  const css = useMemo(() => {
    let out =
      `.gradient-text {\n` +
      `  background: ${gradient};\n` +
      `  -webkit-background-clip: text;\n` +
      `  background-clip: text;\n` +
      `  color: transparent;\n`;
    if (animated) {
      out += `  background-size: 200% 200%;\n  animation: gradientShift 4s ease infinite;\n}\n\n@keyframes gradientShift {\n  0% { background-position: 0% 50%; }\n  50% { background-position: 100% 50%; }\n  100% { background-position: 0% 50%; }\n}`;
    } else {
      out += `}`;
    }
    return out;
  }, [gradient, animated]);

  const addStop = () => {
    const sorted = stops.slice().sort((a, b) => a.pos - b.pos);
    let best = sorted[0]!;
    for (const s of sorted) {
      if (s.pos >= 50 && s.pos < best.pos) best = s;
    }
    setStops((p) => [...p, mkStop(best?.color ?? "#ffffff", Math.min(100, (best?.pos ?? 50) + 10))]);
  };

  const removeStop = (id: number) => {
    if (stops.length <= 2) {
      toast.error("A gradient needs at least 2 stops.");
      return;
    }
    setStops((p) => p.filter((s) => s.id !== id));
  };

  const updateStop = (id: number, patch: Partial<Stop>) =>
    setStops((p) => p.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    setStops(preset.stops.map(([c, pos]) => mkStop(c, pos)));
    setAngle(preset.angle);
  };

  const copyCss = async () => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(css);
      trial.recordUse();
      setCopied(true);
      toast.success("CSS copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  return (
    <ToolPageShell toolId="gradient-text" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Gradient Text" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <label className="mb-2 block text-[13px] font-medium text-foreground/80">Your text</label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type something…"
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Gradient stops</p>
              <button
                type="button"
                onClick={addStop}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:border-primary/40"
              >
                <Plus className="h-3.5 w-3.5" /> Add stop
              </button>
            </div>
            <div className="space-y-2">
              {stops
                .slice()
                .sort((a, b) => a.pos - b.pos)
                .map((s) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <input
                      type="color"
                      value={s.color}
                      onChange={(e) => updateStop(s.id, { color: e.target.value })}
                      className="h-9 w-11 cursor-pointer rounded-lg border border-border bg-background p-1"
                    />
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={s.pos}
                      onChange={(e) => updateStop(s.id, { pos: Number(e.target.value) })}
                      className="flex-1 accent-primary"
                    />
                    <span className="w-11 text-right text-xs font-mono text-muted-foreground">{s.pos}%</span>
                    <button
                      type="button"
                      onClick={() => removeStop(s.id)}
                      aria-label="Remove stop"
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Angle</p>
              <span className="text-xs font-mono text-muted-foreground">{angle}°</span>
            </div>
            <input
              type="range"
              min={0}
              max={360}
              value={angle}
              onChange={(e) => setAngle(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Preview size</p>
              <span className="text-xs font-mono text-muted-foreground">{fontSize}px</span>
            </div>
            <input
              type="range"
              min={24}
              max={120}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-border px-4 py-3">
            <span className="text-sm font-medium">Animated gradient</span>
            <input
              type="checkbox"
              checked={animated}
              onChange={(e) => setAnimated(e.target.checked)}
              className="h-5 w-5 accent-primary"
            />
          </label>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Presets</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => applyPreset(p)}
                  style={{ background: `linear-gradient(${p.angle}deg, ${stopsCss(p.stops.map(([c, pos], i) => ({ id: -i, color: c, pos })))})` }}
                  className="rounded-xl px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:opacity-90"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <ActionButton disabled={!trial.canUse} onClick={copyCss}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied!" : "Copy CSS"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left - everything runs in your browser.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex min-h-[300px] flex-1 items-center justify-center rounded-2xl border border-border bg-card p-8">
            <p
              className={cn("max-w-full break-words text-center font-extrabold", animated && "animate-gradient-shift")}
              style={{
                fontSize,
                background: gradient,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                backgroundSize: animated ? "200% 200%" : undefined,
              }}
            >
              {text || "Gradient Text"}
            </p>
            <style>{`.animate-gradient-shift { animation: gradientShift 4s ease infinite; } @keyframes gradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }`}</style>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Generated CSS</p>
            <pre className="max-h-56 overflow-auto rounded-xl bg-muted/60 p-4 font-mono text-xs leading-relaxed">{css}</pre>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
