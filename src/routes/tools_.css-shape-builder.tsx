// /tools/css-shape-builder - Visual clip-path builder: drag polygon points on a
// grid, tune circle/ellipse/inset, or hand-write path(). Live preview + CSS export.

import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Download, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/css-shape-builder")({
  head: () => {
    const seo = getToolSeoMeta("css-shape-builder");
    const canonical = "https://iconvault.site/tools/css-shape-builder";
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
  component: ShapeBuilder,
});

type ShapeMode = "polygon" | "circle" | "ellipse" | "inset" | "path";
type Pt = { x: number; y: number }; // percentages 0-100

const PRESETS: { name: string; pts: Pt[] }[] = [
  { name: "Triangle", pts: [{ x: 50, y: 5 }, { x: 95, y: 95 }, { x: 5, y: 95 }] },
  { name: "Hexagon", pts: [{ x: 25, y: 5 }, { x: 75, y: 5 }, { x: 98, y: 50 }, { x: 75, y: 95 }, { x: 25, y: 95 }, { x: 2, y: 50 }] },
  { name: "Star", pts: [{ x: 50, y: 2 }, { x: 61, y: 35 }, { x: 95, y: 35 }, { x: 68, y: 56 }, { x: 79, y: 90 }, { x: 50, y: 69 }, { x: 21, y: 90 }, { x: 32, y: 56 }, { x: 5, y: 35 }, { x: 39, y: 35 }] },
  { name: "Arrow", pts: [{ x: 5, y: 35 }, { x: 60, y: 35 }, { x: 60, y: 10 }, { x: 95, y: 50 }, { x: 60, y: 90 }, { x: 60, y: 65 }, { x: 5, y: 65 }] },
  { name: "Diamond", pts: [{ x: 50, y: 2 }, { x: 98, y: 50 }, { x: 50, y: 98 }, { x: 2, y: 50 }] },
];

function Slider({ label, value, onChange, min = 0, max = 100, suffix = "%" }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; suffix?: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-[13px] font-medium text-foreground/80"><span>{label}</span><span className="font-mono">{value}{suffix}</span></div>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-primary" />
    </div>
  );
}

function ShapeBuilder() {
  const { isPro } = usePlan();
  const trial = useToolTrial("css-shape-builder", isPro);
  const seo = getToolSeo("css-shape-builder");

  const [mode, setMode] = useState<ShapeMode>("polygon");
  const [pts, setPts] = useState<Pt[]>(PRESETS[1]!.pts.map((p) => ({ ...p })));
  const [drag, setDrag] = useState<number | null>(null);
  const [cx, setCx] = useState(50);
  const [cy, setCy] = useState(50);
  const [r, setR] = useState(45);
  const [rx, setRx] = useState(45);
  const [ry, setRy] = useState(30);
  const [inT, setInT] = useState(10);
  const [inR, setInR] = useState(10);
  const [inB, setInB] = useState(10);
  const [inL, setInL] = useState(10);
  const [round, setRound] = useState(16);
  const [path, setPath] = useState("M 10 80 C 40 10, 65 10, 95 80 L 95 95 L 10 95 Z");
  const svgRef = useRef<SVGSVGElement>(null);

  const clip = useMemo(() => {
    switch (mode) {
      case "polygon": return `polygon(${pts.map((p) => `${p.x.toFixed(1)}% ${p.y.toFixed(1)}%`).join(", ")})`;
      case "circle": return `circle(${r}% at ${cx}% ${cy}%)`;
      case "ellipse": return `ellipse(${rx}% ${ry}% at ${cx}% ${cy}%)`;
      case "inset": return `inset(${inT}% ${inR}% ${inB}% ${inL}% round ${round}px)`;
      case "path": return `path("${path}")`;
    }
  }, [mode, pts, cx, cy, r, rx, ry, inT, inR, inB, inL, round, path]);

  const css = `.shape {\n  clip-path: ${clip};\n}`;

  const onPointer = (e: React.PointerEvent, commit: boolean) => {
    if (drag === null || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
    setPts((p) => p.map((pt, i) => (i === drag ? { x: +x.toFixed(1), y: +y.toFixed(1) } : pt)));
    if (commit) setDrag(null);
  };

  const addPoint = () => {
    if (pts.length >= 24) { toast.error("24 points is plenty for a polygon"); return; }
    const last = pts[pts.length - 1]!;
    setPts((p) => [...p, { x: Math.min(95, last.x + 8), y: Math.min(95, last.y + 8) }]);
  };

  const copy = () => {
    if (!trial.canUse) return;
    void navigator.clipboard.writeText(css);
    trial.recordUse();
    toast.success("clip-path CSS copied");
  };

  const download = () => {
    if (!trial.canUse) return;
    downloadBlob(new Blob([`/* CSS Shape Builder */\n${css}\n`], { type: "text/css" }), `clip-path-${mode}.css`);
    trial.recordUse();
    toast.success("CSS file downloaded");
  };

  const polyPoints = pts.map((p) => `${p.x * 3.2},${p.y * 3.2}`).join(" ");

  return (
    <ToolPageShell toolId="css-shape-builder" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="CSS Shape Builder" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Shape type</p>
            <div className="flex flex-wrap gap-2">
              {(["polygon", "circle", "ellipse", "inset", "path"] as ShapeMode[]).map((m) => (
                <button key={m} type="button" onClick={() => setMode(m)}
                  className={cn("rounded-xl border px-3 py-2 font-mono text-sm font-bold transition",
                    mode === m ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40")}>{m}()</button>
              ))}
            </div>
          </div>

          {mode === "polygon" && (
            <div className="space-y-3">
              <p className="mb-1 text-[13px] font-medium text-foreground/80">Presets</p>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <button key={p.name} type="button" onClick={() => setPts(p.pts.map((q) => ({ ...q })))}
                    className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-primary/50 hover:text-foreground">{p.name}</button>
                ))}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={addPoint} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50"><Plus className="h-3.5 w-3.5" /> Add point</button>
                <button type="button" onClick={() => setPts((p) => (p.length > 3 ? p.slice(0, -1) : p))} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50"><Trash2 className="h-3.5 w-3.5" /> Remove last</button>
              </div>
              <p className="text-xs text-muted-foreground">Drag the teal dots on the canvas to reshape the polygon.</p>
            </div>
          )}

          {mode === "circle" && (<div className="space-y-3"><Slider label="Center X" value={cx} onChange={setCx} /><Slider label="Center Y" value={cy} onChange={setCy} /><Slider label="Radius" value={r} onChange={setR} max={71} /></div>)}
          {mode === "ellipse" && (<div className="space-y-3"><Slider label="Center X" value={cx} onChange={setCx} /><Slider label="Center Y" value={cy} onChange={setCy} /><Slider label="Radius X" value={rx} onChange={setRx} /><Slider label="Radius Y" value={ry} onChange={setRy} /></div>)}
          {mode === "inset" && (<div className="space-y-3"><Slider label="Top" value={inT} onChange={setInT} /><Slider label="Right" value={inR} onChange={setInR} /><Slider label="Bottom" value={inB} onChange={setInB} /><Slider label="Left" value={inL} onChange={setInL} /><Slider label="Corner round" value={round} onChange={setRound} max={100} suffix="px" /></div>)}
          {mode === "path" && (
            <div>
              <label className="mb-2 block text-[13px] font-medium text-foreground/80" htmlFor="path-d">Path data (d)</label>
              <textarea id="path-d" value={path} onChange={(e) => setPath(e.target.value)} rows={4} spellCheck={false}
                className="w-full rounded-xl border border-border bg-background p-3 font-mono text-xs" />
              <p className="mt-1 text-xs text-muted-foreground">Coordinates are in a 100 x 100 box scaled to the element. Invalid paths simply will not render.</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <ActionButton onClick={copy} disabled={!trial.canUse}><Copy className="h-4 w-4" /> Copy CSS</ActionButton>
            <button type="button" onClick={download} disabled={!trial.canUse} className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-bold transition hover:border-primary/50 disabled:opacity-50"><Download className="h-4 w-4" /> .css</button>
          </div>
          {!isPro && <p className="text-xs text-muted-foreground">{trial.left} of {TOOL_TRIAL_LIMIT} free copies left.</p>}
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Editor */}
            <div className="rounded-xl border border-border bg-[repeating-conic-gradient(#80808018_0_25%,transparent_0_50%)] bg-[length:24px_24px] p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{mode === "polygon" ? "Drag points" : "Preview grid"}</p>
              <div className="relative mx-auto aspect-square w-full max-w-[320px]">
                <svg ref={svgRef} viewBox="0 0 320 320" className="absolute inset-0 h-full w-full touch-none select-none"
                  onPointerMove={(e) => onPointer(e, false)} onPointerUp={(e) => onPointer(e, true)} onPointerLeave={() => setDrag(null)}>
                  {Array.from({ length: 9 }).map((_, i) => (
                    <g key={i}>
                      <line x1={(i + 1) * 32} y1={0} x2={(i + 1) * 32} y2={320} stroke="currentColor" strokeOpacity={0.08} />
                      <line x1={0} y1={(i + 1) * 32} x2={320} y2={(i + 1) * 32} stroke="currentColor" strokeOpacity={0.08} />
                    </g>
                  ))}
                  {mode === "polygon" && (
                    <>
                      <polygon points={polyPoints} fill="#0d948833" stroke="#0d9488" strokeWidth={2} />
                      {pts.map((p, i) => (
                        <circle key={i} cx={p.x * 3.2} cy={p.y * 3.2} r={9} fill="#0d9488" stroke="#fff" strokeWidth={2.5}
                          className="cursor-grab active:cursor-grabbing"
                          onPointerDown={(e) => { e.preventDefault(); setDrag(i); (e.target as Element).setPointerCapture(e.pointerId); }} />
                      ))}
                    </>
                  )}
                  {mode !== "polygon" && mode !== "path" && (
                    <rect x={4} y={4} width={312} height={312} fill="none" stroke="#0d9488" strokeWidth={2} strokeDasharray="8 6" opacity={0.6} />
                  )}
                  {mode === "path" && (
                    <path d={path} transform="scale(3.2)" fill="#0d948833" stroke="#0d9488" strokeWidth={1.5} />
                  )}
                </svg>
              </div>
            </div>
            {/* Live clipped preview */}
            <div className="rounded-xl border border-border bg-[repeating-conic-gradient(#80808018_0_25%,transparent_0_50%)] bg-[length:24px_24px] p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Live clip-path result</p>
              <div className="mx-auto aspect-square w-full max-w-[320px]">
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-teal-500 via-emerald-500 to-cyan-600 text-white"
                  style={{ clipPath: clip }}>
                  <span className="font-mono text-xs font-bold">clip me</span>
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-muted/50 p-4">
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">Generated CSS</p>
            <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-sm">{css}</pre>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
