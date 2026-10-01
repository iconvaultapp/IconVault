// /tools/css-individual-transforms - translate, rotate and scale as independent
// CSS properties: animate one without clobbering the others, see the fixed
// application order, and combine them with the transform property.
// Free, client-side only. Supported in all modern browsers.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Info, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/css-individual-transforms")({
  head: () => {
    const seo = getToolSeoMeta("css-individual-transforms");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: IndividualTransformsTool,
});

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
    return true;
  } catch {
    toast.error("Copy failed. Select the code manually.");
    return false;
  }
}

const ORIGINS = ["center", "top left", "top right", "bottom left", "bottom right", "top center", "bottom center", "left center", "right center"] as const;

function Slider({ label, value, min, max, step, unit, onChange }: { label: string; value: number; min: number; max: number; step: number; unit: string; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-[13px] font-medium text-foreground/80">
        <span className="font-mono">{label}</span>
        <span className="font-mono text-muted-foreground">{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-primary" />
    </div>
  );
}

function IndividualTransformsTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("css-individual-transforms", isPro);
  const seo = getToolSeo("css-individual-transforms");

  const [tx, setTx] = useState(60);
  const [ty, setTy] = useState(-30);
  const [rot, setRot] = useState(18);
  const [sx, setSx] = useState(1.15);
  const [sy, setSy] = useState(0.9);
  const [origin, setOrigin] = useState<string>("center");
  const [withSkew, setWithSkew] = useState(false);

  const css = useMemo(() => {
    const lines = [
      ".box {",
      `  translate: ${tx}px ${ty}px;`,
      `  rotate: ${rot}deg;`,
      `  scale: ${sx} ${sy};`,
      `  transform-origin: ${origin};`,
    ];
    if (withSkew) lines.push("  transform: skewX(-8deg);  /* applied AFTER the three above */");
    lines.push("}");
    return lines.join("\n");
  }, [tx, ty, rot, sx, sy, origin, withSkew]);

  const copy = async () => {
    if (!trial.canUse) return;
    if (await copyText(css)) trial.recordUse();
  };

  const boxStyle = {
    translate: `${tx}px ${ty}px`,
    rotate: `${rot}deg`,
    scale: `${sx} ${sy}`,
    transformOrigin: origin,
    ...(withSkew ? { transform: "skewX(-8deg)" } : {}),
  } as React.CSSProperties;

  return (
    <ToolPageShell toolId="css-individual-transforms" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="CSS Individual Transforms" left={trial.left} />

      <div className="mb-6 flex gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        <p className="text-muted-foreground">
          <span className="font-semibold text-foreground">Supported in your browser.</span> Individual transform
          properties work in all modern browsers, so this demo is live everywhere. The killer feature: you can animate{" "}
          <span className="font-mono">rotate</span> in a transition without wiping out an existing{" "}
          <span className="font-mono">translate</span>.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div className="space-y-4">
            <Slider label="translate X" value={tx} min={-200} max={200} step={1} unit="px" onChange={setTx} />
            <Slider label="translate Y" value={ty} min={-200} max={200} step={1} unit="px" onChange={setTy} />
            <Slider label="rotate" value={rot} min={-180} max={180} step={1} unit="deg" onChange={setRot} />
            <Slider label="scale X" value={sx} min={0.1} max={3} step={0.05} unit="" onChange={setSx} />
            <Slider label="scale Y" value={sy} min={0.1} max={3} step={0.05} unit="" onChange={setSy} />
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">transform-origin</p>
            <div className="flex flex-wrap gap-1.5">
              {ORIGINS.map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setOrigin(o)}
                  className={
                    origin === o
                      ? "rounded-lg border border-primary bg-primary/10 px-2.5 py-1.5 font-mono text-xs text-primary"
                      : "rounded-lg border border-border px-2.5 py-1.5 font-mono text-xs text-muted-foreground hover:border-primary/40"
                  }
                >
                  {o}
                </button>
              ))}
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 text-sm">
            <input type="checkbox" checked={withSkew} onChange={(e) => setWithSkew(e.target.checked)} className="h-4 w-4 accent-primary" />
            <span className="font-medium">Also apply <span className="font-mono">transform: skewX(-8deg)</span></span>
          </label>

          <button
            type="button"
            onClick={() => { setTx(0); setTy(0); setRot(0); setSx(1); setSy(1); setWithSkew(false); }}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground hover:border-primary/40"
          >
            <RotateCw className="h-3.5 w-3.5" /> Reset
          </button>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-3 text-sm font-semibold">Live preview</p>
          <div className="relative flex h-[380px] items-center justify-center overflow-hidden rounded-xl border border-border bg-[radial-gradient(circle_at_1px_1px,#8882_1px,transparent_1px)] bg-[size:24px_24px]">
            <div className="absolute h-px w-full bg-red-400/40" />
            <div className="absolute h-full w-px bg-red-400/40" />
            <div className="flex h-36 w-36 items-center justify-center rounded-2xl border-2 border-dashed border-muted-foreground/30 text-xs font-bold text-muted-foreground/50">
              start
            </div>
            <div
              className="absolute flex h-36 w-36 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 text-sm font-extrabold text-white shadow-xl"
              style={boxStyle}
            >
              box
            </div>
          </div>
          <div className="mt-4 rounded-xl bg-muted/60 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Application order (fixed)</p>
            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
              {["translate", "rotate", "scale", "transform"].map((s, i) => (
                <span key={s} className="flex items-center gap-2">
                  <span className={i === 3 && !withSkew ? "rounded-lg bg-muted px-3 py-1.5 font-mono text-muted-foreground line-through" : "rounded-lg bg-primary/10 px-3 py-1.5 font-mono text-primary"}>{s}</span>
                  {i < 3 && <span className="text-muted-foreground">→</span>}
                </span>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              The three individual properties always apply in this order, then the <span className="font-mono">transform</span> list
              runs on top. That is why a <span className="font-mono">rotate</span> transition never disturbs your{" "}
              <span className="font-mono">translate</span>.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-extrabold">Copy the CSS</h2>
          <ActionButton disabled={!trial.canUse} onClick={copy}>
            <Copy className="h-4 w-4" /> Copy CSS
          </ActionButton>
        </div>
        <pre className="overflow-x-auto whitespace-pre rounded-xl bg-muted/60 p-4 font-mono text-xs leading-relaxed">{css}</pre>
        {!isPro && <p className="mt-2 text-xs text-muted-foreground">{trial.left} of 5 free copies left.</p>}
      </div>
    </ToolPageShell>
  );
}
