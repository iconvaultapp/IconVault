// /tools/mesh-gradient - Mesh gradient generator: draggable color pins
// over a base color, exported as layered radial-gradient CSS. 100% in-browser.

import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Minus, Shuffle, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/mesh-gradient")({
  head: () => {
    const seo = getToolSeoMeta("mesh-gradient");
    const canonical = "https://iconvault.site/tools/mesh-gradient";
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
  component: MeshGradientTool,
});

interface Pin {
  id: number;
  x: number; // percent
  y: number; // percent
  color: string;
}

let pinId = 0;
const mkPin = (x: number, y: number, color: string): Pin => ({ id: ++pinId, x, y, color });

const DEFAULT_PINS = () => [
  mkPin(20, 25, "#f472b6"),
  mkPin(80, 20, "#60a5fa"),
  mkPin(75, 80, "#a78bfa"),
  mkPin(20, 78, "#34d399"),
];

const RANDOM_COLORS = ["#f472b6", "#60a5fa", "#a78bfa", "#34d399", "#fbbf24", "#f87171", "#22d3ee", "#c084fc", "#4ade80", "#fb7185"];

function MeshGradientTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("mesh-gradient", isPro);
  const seo = getToolSeo("mesh-gradient");

  const [pins, setPins] = useState<Pin[]>(DEFAULT_PINS);
  const [base, setBase] = useState("#0f172a");
  const [spread, setSpread] = useState(55);
  const [selected, setSelected] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [dragId, setDragId] = useState<number | null>(null);
  const areaRef = useRef<HTMLDivElement>(null);

  const css = useMemo(
    () =>
      `.mesh-gradient {\n` +
      `  background-color: ${base};\n` +
      `  background-image:\n` +
      `    ${pins
        .map((p) => `radial-gradient(circle at ${Math.round(p.x)}% ${Math.round(p.y)}%, ${p.color}, transparent ${spread}%)`)
        .join(",\n    ")};\n}`,
    [pins, base, spread],
  );

  const movePin = (id: number, clientX: number, clientY: number) => {
    const el = areaRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100));
    const y = Math.min(100, Math.max(0, ((clientY - r.top) / r.height) * 100));
    setPins((p) => p.map((pin) => (pin.id === id ? { ...pin, x, y } : pin)));
  };

  const addPin = () => {
    if (pins.length >= 6) {
      toast.error("Maximum 6 pins.");
      return;
    }
    setPins((p) => [
      ...p,
      mkPin(15 + Math.random() * 70, 15 + Math.random() * 70, RANDOM_COLORS[Math.floor(Math.random() * RANDOM_COLORS.length)]!),
    ]);
  };

  const removePin = (id: number) => {
    if (pins.length <= 4) {
      toast.error("A mesh needs at least 4 pins.");
      return;
    }
    setPins((p) => p.filter((pin) => pin.id !== id));
    if (selected === id) setSelected(null);
  };

  const randomize = () => {
    setPins((p) =>
      p.map((pin) => ({
        ...pin,
        x: 10 + Math.random() * 80,
        y: 10 + Math.random() * 80,
        color: RANDOM_COLORS[Math.floor(Math.random() * RANDOM_COLORS.length)]!,
      })),
    );
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
    <ToolPageShell toolId="mesh-gradient" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Mesh Gradient" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-foreground/80">Color pins ({pins.length}/6)</p>
            <button
              type="button"
              onClick={addPin}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:border-primary/40"
            >
              <Plus className="h-3.5 w-3.5" /> Add pin
            </button>
          </div>

          <div className="space-y-2">
            {pins.map((pin, i) => (
              <div
                key={pin.id}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-2 py-1.5 transition",
                  selected === pin.id ? "border-primary" : "border-border",
                )}
              >
                <button
                  type="button"
                  onClick={() => setSelected(pin.id)}
                  className="flex flex-1 items-center gap-2"
                  title="Select pin"
                >
                  <span
                    className="h-7 w-7 shrink-0 rounded-full border border-border"
                    style={{ background: pin.color }}
                  />
                  <span className="text-xs font-mono text-muted-foreground">
                    Pin {i + 1} · {Math.round(pin.x)}%, {Math.round(pin.y)}%
                  </span>
                </button>
                <input
                  type="color"
                  value={pin.color}
                  onChange={(e) => setPins((p) => p.map((q) => (q.id === pin.id ? { ...q, color: e.target.value } : q)))}
                  className="h-8 w-10 cursor-pointer rounded-lg border border-border bg-background p-1"
                />
                <button
                  type="button"
                  onClick={() => removePin(pin.id)}
                  aria-label="Remove pin"
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Minus className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div>
            <label className="mb-2 block text-[13px] font-medium text-foreground/80">Base color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={base}
                onChange={(e) => setBase(e.target.value)}
                className="h-10 w-16 cursor-pointer rounded-lg border border-border bg-background p-1"
              />
              <span className="font-mono text-xs text-muted-foreground">{base}</span>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Glow spread</p>
              <span className="text-xs font-mono text-muted-foreground">{spread}%</span>
            </div>
            <input
              type="range"
              min={25}
              max={90}
              value={spread}
              onChange={(e) => setSpread(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          <button
            type="button"
            onClick={randomize}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-bold transition hover:border-primary/40"
          >
            <Shuffle className="h-4 w-4" /> Randomize
          </button>

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
          <div
            ref={areaRef}
            onPointerMove={(e) => {
              if (dragId !== null) movePin(dragId, e.clientX, e.clientY);
            }}
            onPointerUp={() => setDragId(null)}
            onPointerLeave={() => setDragId(null)}
            className="relative min-h-[380px] flex-1 touch-none select-none overflow-hidden rounded-2xl border border-border"
            style={{ backgroundColor: base, backgroundImage: pins.map((p) => `radial-gradient(circle at ${p.x}% ${p.y}%, ${p.color}, transparent ${spread}%)`).join(", ") }}
          >
            {pins.map((pin, i) => (
              <button
                key={pin.id}
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  setDragId(pin.id);
                  setSelected(pin.id);
                }}
                className={cn(
                  "absolute z-10 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-xs font-bold shadow-lg transition",
                  selected === pin.id ? "border-white scale-110" : "border-white/60",
                )}
                style={{ left: `${pin.x}%`, top: `${pin.y}%`, background: pin.color }}
                title={`Drag to move Pin ${i + 1}`}
              >
                <span className="text-white drop-shadow">{i + 1}</span>
              </button>
            ))}
            <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/40 px-3 py-1 text-xs text-white/80">
              Drag the pins to reshape the mesh
            </p>
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
