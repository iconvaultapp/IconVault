// /tools/clip-path-generator - Build clip-path shapes visually, with a
// draggable polygon editor. 100% client-side; trial use is recorded
// when the CSS is copied.

import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/clip-path-generator";
import toolSeoMeta from "@/lib/tool-seo-meta-data/clip-path-generator";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/clip-path-generator")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/clip-path-generator";
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
  component: ClipTool,
});

const SAMPLE_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0d9488"/><stop offset="1" stop-color="#7c3aed"/>
    </linearGradient>
  </defs>
  <rect width="640" height="400" fill="url(#g)"/>
  <circle cx="520" cy="90" r="55" fill="#fef3c7" opacity="0.9"/>
  <circle cx="120" cy="300" r="80" fill="#ffffff" opacity="0.15"/>
  <rect x="180" y="120" width="120" height="120" rx="24" fill="#ffffff" opacity="0.2" transform="rotate(15 240 180)"/>
  <circle cx="400" cy="280" r="40" fill="#ffffff" opacity="0.25"/>
</svg>`,
)}`;

const POLY_PRESETS: { name: string; pts: [number, number][] }[] = [
  { name: "Triangle", pts: [[50, 5], [95, 95], [5, 95]] },
  { name: "Diamond", pts: [[50, 0], [100, 50], [50, 100], [0, 50]] },
  { name: "Pentagon", pts: [[50, 2], [98, 36], [79, 91], [21, 91], [2, 36]] },
  { name: "Hexagon", pts: [[25, 5], [75, 5], [100, 50], [75, 95], [25, 95], [0, 50]] },
  { name: "Arrow", pts: [[0, 30], [55, 30], [55, 5], [100, 50], [55, 95], [55, 70], [0, 70]] },
  { name: "Star", pts: [[50, 0], [61, 35], [98, 35], [68, 57], [79, 91], [50, 70], [21, 91], [32, 57], [2, 35], [39, 35]] },
  { name: "Chevron", pts: [[15, 0], [60, 50], [15, 100], [40, 100], [85, 50], [40, 0]] },
  { name: "Trapezoid", pts: [[25, 0], [75, 0], [100, 100], [0, 100]] },
];

function ClipTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("clip-path-generator", isPro);
  const seo = toolSeo;

  const [shape, setShape] = useState<"polygon" | "circle" | "ellipse" | "inset">("polygon");
  const [pts, setPts] = useState<[number, number][]>(POLY_PRESETS[0]?.pts.map((p) => [...p] as [number, number]) ?? []);
  const [circleR, setCircleR] = useState(40);
  const [circleCX, setCircleCX] = useState(50);
  const [circleCY, setCircleCY] = useState(50);
  const [ellRX, setEllRX] = useState(40);
  const [ellRY, setEllRY] = useState(25);
  const [ellCX, setEllCX] = useState(50);
  const [ellCY, setEllCY] = useState(50);
  const [inT, setInT] = useState(15);
  const [inR, setInR] = useState(15);
  const [inB, setInB] = useState(15);
  const [inL, setInL] = useState(15);
  const [inRound, setInRound] = useState(0);
  const [copied, setCopied] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const css = useMemo(() => {
    switch (shape) {
      case "polygon":
        return `clip-path: polygon(${pts.map((p) => `${Math.round(p[0])}% ${Math.round(p[1])}%`).join(", ")});`;
      case "circle":
        return `clip-path: circle(${circleR}% at ${circleCX}% ${circleCY}%);`;
      case "ellipse":
        return `clip-path: ellipse(${ellRX}% ${ellRY}% at ${ellCX}% ${ellCY}%);`;
      case "inset":
        return `clip-path: inset(${inT}% ${inR}% ${inB}% ${inL}%${inRound > 0 ? ` round ${inRound}px` : ""});`;
    }
  }, [shape, pts, circleR, circleCX, circleCY, ellRX, ellRY, ellCX, ellCY, inT, inR, inB, inL, inRound]);

  const svgPoint = (e: React.MouseEvent): [number, number] => {
    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    return [
      Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100)),
      Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100)),
    ];
  };

  const onCanvasClick = (e: React.MouseEvent) => {
    if (dragIdx !== null) return;
    const [x, y] = svgPoint(e);
    setPts((p) => [...p, [x, y]]);
  };

  const onCanvasMove = (e: React.MouseEvent) => {
    if (dragIdx === null) return;
    const [x, y] = svgPoint(e);
    setPts((p) => {
      const c = [...p];
      c[dragIdx] = [x, y];
      return c;
    });
  };

  const onPointContext = (e: React.MouseEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    setPts((p) => (p.length <= 3 ? p : p.filter((_, i) => i !== idx)));
    setDragIdx(null);
  };

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

  const slider = (label: string, value: number, min: number, max: number, onChange: (n: number) => void, unit = "%") => (
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

  return (
    <ToolPageShell toolId="clip-path-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Clip Path Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-6">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Shape</p>
            <div className="grid grid-cols-2 gap-2">
              {(["polygon", "circle", "ellipse", "inset"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setShape(s)}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-sm font-bold capitalize transition",
                    shape === s ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {shape === "polygon" && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Polygon presets
              </p>
              <div className="flex flex-wrap gap-2">
                {POLY_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => setPts(p.pts.map((q) => [...q] as [number, number]))}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:border-primary/60 hover:text-foreground"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                On the canvas: click empty space to add a point, drag points to move them,
                right-click a point to delete it (minimum 3 points).
              </p>
            </div>
          )}

          {shape === "circle" && (
            <>
              {slider("Radius", circleR, 0, 75, setCircleR)}
              {slider("Center X", circleCX, 0, 100, setCircleCX)}
              {slider("Center Y", circleCY, 0, 100, setCircleCY)}
            </>
          )}

          {shape === "ellipse" && (
            <>
              {slider("Radius X", ellRX, 0, 75, setEllRX)}
              {slider("Radius Y", ellRY, 0, 75, setEllRY)}
              {slider("Center X", ellCX, 0, 100, setEllCX)}
              {slider("Center Y", ellCY, 0, 100, setEllCY)}
            </>
          )}

          {shape === "inset" && (
            <>
              {slider("Top", inT, 0, 45, setInT)}
              {slider("Right", inR, 0, 45, setInR)}
              {slider("Bottom", inB, 0, 45, setInB)}
              {slider("Left", inL, 0, 45, setInL)}
              {slider("Round corners", inRound, 0, 100, setInRound, "px")}
            </>
          )}

          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left.
            </p>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-6">
            {shape === "polygon" ? (
              <div className="relative mx-auto max-w-[560px] select-none">
                <svg
                  ref={svgRef}
                  viewBox="0 0 100 62.5"
                  preserveAspectRatio="none"
                  className="aspect-[8/5] w-full cursor-crosshair rounded-xl border border-border"
                  onClick={onCanvasClick}
                  onMouseMove={onCanvasMove}
                  onMouseUp={() => setDragIdx(null)}
                  onMouseLeave={() => setDragIdx(null)}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <image href={SAMPLE_SVG} x="0" y="0" width="100" height="62.5" preserveAspectRatio="none" />
                  <rect x="0" y="0" width="100" height="62.5" fill="black" opacity="0.45" />
                  <polygon
                    points={pts.map((p) => `${p[0]},${p[1] * 0.625}`).join(" ")}
                    fill="#0d9488"
                    fillOpacity="0.85"
                  />
                  <polygon
                    points={pts.map((p) => `${p[0]},${p[1] * 0.625}`).join(" ")}
                    fill="none"
                    stroke="white"
                    strokeWidth="0.6"
                    vectorEffect="non-scaling-stroke"
                  />
                  {pts.map((p, i) => (
                    <circle
                      key={i}
                      cx={p[0]}
                      cy={p[1] * 0.625}
                      r="1.6"
                      fill="white"
                      stroke="#0d9488"
                      strokeWidth="0.7"
                      vectorEffect="non-scaling-stroke"
                      className="cursor-grab"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setDragIdx(i);
                      }}
                      onContextMenu={(e) => onPointContext(e, i)}
                    />
                  ))}
                </svg>
              </div>
            ) : (
              <div className="mx-auto flex max-w-[560px] items-center justify-center">
                <img
                  src={SAMPLE_SVG}
                  alt="Clip preview"
                  className="aspect-[8/5] w-full rounded-xl border border-border object-cover"
                  style={{ clipPath: css.replace(/^clip-path:\s*/, "").replace(/;$/, "") }}
                />
              </div>
            )}

            {shape === "polygon" && (
              <div className="mx-auto mt-4 flex max-w-[560px] items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPts(POLY_PRESETS[0]?.pts.map((p) => [...p] as [number, number]) ?? [])}
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-xs font-bold hover:border-primary/60"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reset points
                </button>
                <span className="text-xs text-muted-foreground">{pts.length} points</span>
              </div>
            )}
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
