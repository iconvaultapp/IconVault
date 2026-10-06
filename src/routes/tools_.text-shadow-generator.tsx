// /tools/text-shadow-generator - Build layered text shadows visually.
// 100% client-side; trial use is recorded when the CSS is copied.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Check, Copy, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/text-shadow-generator";
import toolSeoMeta from "@/lib/tool-seo-meta-data/text-shadow-generator";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/text-shadow-generator")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/text-shadow-generator";
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
  component: TextShadowTool,
});

interface Layer {
  id: number;
  x: number;
  y: number;
  blur: number;
  color: string;
  opacity: number;
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace(/^#/, "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
}

function TextShadowTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("text-shadow-generator", isPro);
  const seo = toolSeo;

  const [layers, setLayers] = useState<Layer[]>([
    { id: 1, x: 2, y: 2, blur: 0, color: "#000000", opacity: 100 },
    { id: 2, x: 4, y: 4, blur: 0, color: "#000000", opacity: 100 },
    { id: 3, x: 6, y: 6, blur: 0, color: "#000000", opacity: 100 },
  ]);
  const [nextId, setNextId] = useState(4);
  const [text, setText] = useState("Hello world");
  const [fontSize, setFontSize] = useState(72);
  const [textColor, setTextColor] = useState("#ffffff");
  const [bg, setBg] = useState("#0d9488");
  const [copied, setCopied] = useState(false);

  const addLayer = () => {
    setLayers((l) => [...l, { id: nextId, x: 0, y: 4, blur: 12, color: "#000000", opacity: 40 }]);
    setNextId((n) => n + 1);
  };

  const removeLayer = (id: number) => setLayers((l) => (l.length <= 1 ? l : l.filter((x) => x.id !== id)));

  const update = (id: number, patch: Partial<Layer>) =>
    setLayers((l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const move = (id: number, dir: -1 | 1) =>
    setLayers((l) => {
      const i = l.findIndex((x) => x.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= l.length) return l;
      const copy = [...l];
      const a = copy[i];
      const b = copy[j];
      if (a === undefined || b === undefined) return l;
      copy[i] = b;
      copy[j] = a;
      return copy;
    });

  const shadow = useMemo(
    () => layers.map((l) => `${l.x}px ${l.y}px ${l.blur}px ${hexToRgba(l.color, l.opacity / 100)}`).join(", "),
    [layers],
  );

  const css = useMemo(
    () => `color: ${textColor};\nfont-size: ${fontSize}px;\ntext-shadow: ${shadow};`,
    [textColor, fontSize, shadow],
  );

  const copy = async () => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(css);
      setCopied(true);
      trial.recordUse();
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  const slider = (
    label: string,
    value: number,
    min: number,
    max: number,
    onChange: (n: number) => void,
    unit = "px",
  ) => (
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
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </label>
  );

  const colorRow = (label: string, value: string, onChange: (v: string) => void) => (
    <div>
      <div className="mb-1.5 text-[13px] font-medium text-foreground/80">{label}</div>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className="h-10 w-12 cursor-pointer rounded-lg border border-border bg-background p-1"
        />
        <span className="font-mono text-sm uppercase">{value}</span>
      </div>
    </div>
  );

  return (
    <ToolPageShell toolId="text-shadow-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Text Shadow Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-6">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-foreground/80">Text</span>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-medium outline-none focus:border-primary"
            />
          </label>
          {slider("Font size", fontSize, 16, 160, setFontSize)}
          {colorRow("Text color", textColor, setTextColor)}
          {colorRow("Background", bg, setBg)}

          <div className="border-t border-border pt-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Shadow layers</p>
              <button
                type="button"
                onClick={addLayer}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold hover:border-primary/60"
              >
                <Plus className="h-3.5 w-3.5" /> Add layer
              </button>
            </div>
            <div className="space-y-3">
              {layers.map((l, idx) => (
                <div key={l.id} className="rounded-xl bg-muted/50 p-3">
                  <div className="mb-2 flex items-center gap-1">
                    <span className="text-[13px] font-bold">Layer {idx + 1}</span>
                    <span className="ml-auto flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => move(l.id, -1)}
                        disabled={idx === 0}
                        className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        aria-label="Move layer up"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(l.id, 1)}
                        disabled={idx === layers.length - 1}
                        className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        aria-label="Move layer down"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeLayer(l.id)}
                        disabled={layers.length <= 1}
                        className="rounded p-1 text-muted-foreground hover:text-red-500 disabled:opacity-30"
                        aria-label="Remove layer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  </div>
                  {slider("X offset", l.x, -100, 100, (n) => update(l.id, { x: n }))}
                  {slider("Y offset", l.y, -100, 100, (n) => update(l.id, { y: n }))}
                  {slider("Blur", l.blur, 0, 100, (n) => update(l.id, { blur: n }))}
                  {colorRow("Color", l.color, (v) => update(l.id, { color: v }))}
                  {slider("Opacity", l.opacity, 0, 100, (n) => update(l.id, { opacity: n }), "%")}
                </div>
              ))}
            </div>
          </div>

          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left.
            </p>
          )}
        </div>

        <div className="space-y-5">
          <div
            className="flex min-h-[320px] items-center justify-center overflow-hidden rounded-2xl border border-border p-10"
            style={{ backgroundColor: bg }}
          >
            <p
              className="text-center font-extrabold leading-tight break-words"
              style={{ color: textColor, fontSize: `${fontSize}px`, textShadow: shadow }}
            >
              {text || "Hello world"}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">CSS output</p>
            <pre className="overflow-x-auto rounded-xl bg-muted/60 p-4 font-mono text-sm">{css}</pre>
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
