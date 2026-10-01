// /tools/gradient-generator - Design CSS gradients visually: angle,
// dynamic color stops, linear/radial toggle, live preview and copy-ready
// CSS. 100% in-browser.

import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Link2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/gradient-generator")({
  head: () => {
    const seo = getToolSeoMeta("gradient-generator");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: GradientTool,
});

interface Stop {
  id: number;
  color: string;
  pos: number; // 0-100
}

type GradientType = "linear" | "radial";

let stopId = 3;

/** Closest Tailwind gradient direction for a CSS angle (0deg = up). */
const TAILWIND_DIRS = [
  { id: "t", angle: 0 },
  { id: "tr", angle: 45 },
  { id: "r", angle: 90 },
  { id: "br", angle: 135 },
  { id: "b", angle: 180 },
  { id: "bl", angle: 225 },
  { id: "l", angle: 270 },
  { id: "tl", angle: 315 },
] as const;

/** Curated one-click presets (name, colors as [color, pos] pairs, angle). */
const PRESETS: { name: string; colors: [string, number][]; angle: number }[] = [
  { name: "Sunset", colors: [["#ff9966", 0], ["#ff5e62", 100]], angle: 135 },
  { name: "Ocean", colors: [["#2bc0e4", 0], ["#eaecc6", 100]], angle: 135 },
  { name: "Purple Haze", colors: [["#7c3aed", 0], ["#ec4899", 100]], angle: 135 },
  { name: "Mojito", colors: [["#1d976c", 0], ["#93f9b9", 100]], angle: 135 },
  { name: "Lush", colors: [["#56ab2f", 0], ["#a8e063", 100]], angle: 135 },
  { name: "Fire", colors: [["#f12711", 0], ["#f5af19", 100]], angle: 135 },
  { name: "Sublime", colors: [["#fc5c7d", 0], ["#6a82fb", 100]], angle: 135 },
  { name: "Deep Space", colors: [["#000000", 0], ["#434343", 100]], angle: 135 },
  { name: "Cherry", colors: [["#eb3349", 0], ["#f45c43", 100]], angle: 135 },
  { name: "Royal", colors: [["#141e30", 0], ["#243b55", 100]], angle: 135 },
  { name: "Neon", colors: [["#00f5a0", 0], ["#00d9f5", 100]], angle: 135 },
  { name: "Peach", colors: [["#ffecd2", 0], ["#fcb69f", 100]], angle: 135 },
];

function GradientTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("gradient-generator", isPro);
  const seo = getToolSeo("gradient-generator");

  const [type, setType] = useState<GradientType>("linear");
  const [angle, setAngle] = useState(135);
  const [stops, setStops] = useState<Stop[]>([
    { id: 1, color: "#7c3aed", pos: 0 },
    { id: 2, color: "#ec4899", pos: 100 },
  ]);
  const [copied, setCopied] = useState(false);

  const css = useMemo(() => {
    const sorted = [...stops].sort((a, b) => a.pos - b.pos);
    const list = sorted.map((s) => `${s.color} ${s.pos}%`).join(", ");
    return type === "linear"
      ? `background: linear-gradient(${angle}deg, ${list});`
      : `background: radial-gradient(circle, ${list});`;
  }, [stops, angle, type]);

  const bgValue = useMemo(() => css.replace(/^background:\s*/, "").replace(/;\s*$/, ""), [css]);

  /** Approximate Tailwind conversion of the current gradient. */
  const tailwind = useMemo(() => {
    if (type === "radial") return "/* Tailwind has no radial utility - use arbitrary CSS */";
    const norm = ((angle % 360) + 360) % 360;
    let best: (typeof TAILWIND_DIRS)[number] = TAILWIND_DIRS[0]!;
    let bestDist = Infinity;
    for (const d of TAILWIND_DIRS) {
      const dist = Math.abs(norm - d.angle);
      const circ = Math.min(dist, 360 - dist);
      if (circ < bestDist) {
        bestDist = circ;
        best = d;
      }
    }
    const sorted = [...stops].sort((a, b) => a.pos - b.pos);
    const from = sorted[0]!.color;
    const to = sorted[sorted.length - 1]!.color;
    const vias = sorted.slice(1, -1).map((s) => `via-[${s.color}]`).join(" ");
    return `bg-gradient-to-${best.id} from-[${from}]${vias ? ` ${vias}` : ""} to-[${to}]`;
  }, [stops, angle, type]);

  // Restore state from a share link (#g=<base64url JSON>).
  useEffect(() => {
    const h = location.hash;
    if (!h.startsWith("#g=")) return;
    try {
      const b64 = h.slice(3).replace(/-/g, "+").replace(/_/g, "/");
      const data = JSON.parse(atob(b64)) as { type?: unknown; angle?: unknown; stops?: unknown };
      if (data.type !== "linear" && data.type !== "radial") return;
      if (typeof data.angle !== "number" || !Array.isArray(data.stops)) return;
      const clean = (data.stops as unknown[])
        .filter(
          (s): s is { color: string; pos: number } =>
            !!s &&
            typeof s === "object" &&
            typeof (s as { color?: unknown }).color === "string" &&
            typeof (s as { pos?: unknown }).pos === "number",
        )
        .map((s) => ({ id: stopId++, color: s.color, pos: Math.max(0, Math.min(100, s.pos)) }));
      if (clean.length < 2) return;
      setType(data.type);
      setAngle(Math.max(0, Math.min(360, data.angle)));
      setStops(clean);
      toast.success("Gradient loaded from share link");
    } catch {
      toast.error("That share link is invalid.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addStop = () => {
    setStops((p) => [...p, { id: stopId++, color: "#3b82f6", pos: 50 }]);
  };

  const removeStop = (id: number) => {
    setStops((p) => (p.length <= 2 ? p : p.filter((s) => s.id !== id)));
  };

  const updateStop = (id: number, patch: Partial<Stop>) =>
    setStops((p) => p.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const applyPreset = (p: (typeof PRESETS)[number]) => {
    setType("linear");
    setAngle(p.angle);
    setStops(p.colors.map(([color, pos]) => ({ id: stopId++, color, pos })));
  };

  const copyCss = async () => {
    try {
      await navigator.clipboard.writeText(css);
    } catch {
      // clipboard unavailable - still count the copy
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast.success("CSS copied to clipboard");
    if (trial.canUse) trial.recordUse();
  };

  const copyTailwind = async () => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(tailwind);
      toast.success("Tailwind classes copied to clipboard");
    } catch {
      toast.error("Could not copy to clipboard.");
    }
    trial.recordUse();
  };

  const copyShareLink = async () => {
    const payload = {
      type,
      angle,
      stops: stops.map((s) => ({ color: s.color, pos: s.pos })),
    };
    const hash = btoa(JSON.stringify(payload))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    const url = `${location.origin}${location.pathname}#g=${hash}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Share link copied - anyone opening it sees this gradient");
    } catch {
      toast.error("Could not copy the link.");
    }
    location.hash = `g=${hash}`;
    if (trial.canUse) trial.recordUse();
  };

  return (
    <ToolPageShell toolId="gradient-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Gradient Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Type</p>
            <div className="grid grid-cols-2 gap-2">
              {(["linear", "radial"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-sm font-bold capitalize transition",
                    type === t
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {type === "linear" && (
            <label className="block">
              <div className="mb-1.5 flex items-center justify-between text-[13px]">
                <span className="font-medium text-foreground/80">Angle</span>
                <span className="tabular-nums text-muted-foreground">{angle}°</span>
              </div>
              <input
                type="range" min={0} max={360} value={angle}
                onChange={(e) => setAngle(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </label>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Color stops</p>
              <button
                type="button" onClick={addStop}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold hover:border-primary/50"
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            </div>
            <div className="space-y-2">
              {stops.map((s) => (
                <div key={s.id} className="flex items-center gap-2 rounded-xl border border-border p-2">
                  <input
                    type="color" value={s.color}
                    onChange={(e) => updateStop(s.id, { color: e.target.value })}
                    className="h-9 w-11 shrink-0 cursor-pointer rounded-lg border border-border bg-transparent"
                    aria-label="Stop color"
                  />
                  <input
                    type="range" min={0} max={100} value={s.pos}
                    onChange={(e) => updateStop(s.id, { pos: Number(e.target.value) })}
                    className="min-w-0 flex-1 accent-primary"
                    aria-label="Stop position"
                  />
                  <span className="w-11 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{s.pos}%</span>
                  <button
                    type="button" onClick={() => removeStop(s.id)}
                    disabled={stops.length <= 2}
                    className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:text-red-500 disabled:opacity-30"
                    aria-label="Remove stop"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <ActionButton busy={false} disabled={!trial.canUse} onClick={copyCss}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied!" : "Copy CSS"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left - no account needed.
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 text-[13px] font-medium text-foreground/80">Presets</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => applyPreset(p)}
                  title={p.name}
                  className="group overflow-hidden rounded-xl border border-border transition hover:border-primary/60"
                >
                  <div
                    className="h-12 w-full"
                    style={{ background: `linear-gradient(${p.angle}deg, ${p.colors.map(([c, pos]) => `${c} ${pos}%`).join(", ")})` }}
                  />
                  <p className="truncate bg-card px-1 py-1.5 text-[11px] font-semibold text-muted-foreground group-hover:text-foreground">
                    {p.name}
                  </p>
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 text-[13px] font-medium text-foreground/80">Live preview</p>
            <div
              className="h-72 rounded-2xl border border-border"
              style={{ background: bgValue }}
              role="img"
              aria-label="Gradient preview"
            />
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 text-[13px] font-medium text-foreground/80">CSS output</p>
            <div className="flex items-start justify-between gap-3 rounded-xl bg-muted/60 p-4">
              <code className="break-all font-mono text-sm">{css}</code>
              <button
                type="button" onClick={copyCss}
                className="shrink-0 rounded-lg border border-border p-2 hover:border-primary/50"
                aria-label="Copy CSS"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 text-[13px] font-medium text-foreground/80">Tailwind output</p>
            <div className="flex items-start justify-between gap-3 rounded-xl bg-muted/60 p-4">
              <code className="break-all font-mono text-sm">{tailwind}</code>
              <button
                type="button" onClick={copyTailwind} disabled={!trial.canUse}
                className="shrink-0 rounded-lg border border-border p-2 hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Copy Tailwind classes"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button" onClick={copyShareLink} disabled={!trial.canUse}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-muted-foreground transition hover:border-primary/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Link2 className="h-4 w-4" /> Copy share link
            </button>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
