// /tools/unit-circle - Interactive unit circle trigonometry explorer.
// Drag the angle, watch sin/cos/tan update live, toggle degrees/radians.

import { useCallback, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/unit-circle";
import toolSeoMeta from "@/lib/tool-seo-meta-data/unit-circle";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/unit-circle")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/unit-circle";
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
  component: UnitCircleTool,
});

const SIZE = 320;
const CENTER = SIZE / 2;
const RADIUS = 120;

function fmt(n: number): string {
  if (!Number.isFinite(n)) return "undefined";
  const r = Math.round(n * 10000) / 10000;
  return Object.is(r, -0) ? "0" : String(r);
}

function UnitCircleTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("unit-circle", isPro);
  const seo = toolSeo;

  const [angleDeg, setAngleDeg] = useState(30);
  const [radians, setRadians] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);

  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const tan = Math.abs(Math.cos(rad)) < 1e-9 ? NaN : Math.tan(rad);

  const px = CENTER + RADIUS * cos;
  const py = CENTER - RADIUS * sin;

  const angleFromEvent = useCallback((e: React.PointerEvent): number => {
    const svg = svgRef.current;
    if (!svg) return 0;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left - SIZE / 2;
    const y = -(e.clientY - rect.top - SIZE / 2);
    const scale = SIZE / rect.width;
    const a = (Math.atan2(y * scale, x * scale) * 180) / Math.PI;
    return ((a % 360) + 360) % 360;
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setAngleDeg(Math.round(angleFromEvent(e) * 10) / 10);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragging.current) setAngleDeg(Math.round(angleFromEvent(e) * 10) / 10);
  };
  const onPointerUp = () => { dragging.current = false; };

  const copyValues = useCallback(async () => {
    if (!trial.canUse) return;
    const lines = [
      `angle = ${fmt(angleDeg)} deg = ${fmt(rad)} rad`,
      `sin(${fmt(angleDeg)} deg) = ${fmt(sin)}`,
      `cos(${fmt(angleDeg)} deg) = ${fmt(cos)}`,
      `tan(${fmt(angleDeg)} deg) = ${fmt(tan)}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(lines);
      trial.recordUse();
      toast.success("Values copied to clipboard");
    } catch {
      toast.error("Clipboard blocked by the browser.");
    }
  }, [trial, angleDeg, rad, sin, cos, tan]);

  const rows = [
    { label: "sin", value: sin, color: "text-blue-500" },
    { label: "cos", value: cos, color: "text-emerald-500" },
    { label: "tan", value: tan, color: "text-amber-500" },
  ];

  return (
    <ToolPageShell toolId="unit-circle" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Unit Circle" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex items-center justify-center rounded-2xl border border-border bg-card p-5">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="w-full max-w-[400px] cursor-grab touch-none select-none active:cursor-grabbing"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            role="img"
            aria-label="Interactive unit circle. Drag the handle to change the angle."
          >
            {/* axes */}
            <line x1={CENTER - RADIUS - 24} y1={CENTER} x2={CENTER + RADIUS + 24} y2={CENTER} stroke="currentColor" strokeOpacity="0.25" />
            <line x1={CENTER} y1={CENTER - RADIUS - 24} x2={CENTER} y2={CENTER + RADIUS + 24} stroke="currentColor" strokeOpacity="0.25" />
            {/* circle */}
            <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke="currentColor" strokeOpacity="0.4" strokeWidth="2" />
            {/* cos projection line */}
            <line x1={CENTER} y1={py} x2={px} y2={py} stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
            {/* sin projection line */}
            <line x1={px} y1={py} x2={px} y2={CENTER} stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
            {/* tan line: tangent at x=1 scaled by tan, clamped for drawing */}
            {!Number.isNaN(tan) && Math.abs(tan) < 6 && (
              <line
                x1={CENTER + RADIUS}
                y1={CENTER}
                x2={CENTER + RADIUS}
                y2={CENTER - RADIUS * tan}
                stroke="#f59e0b"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="6 4"
              />
            )}
            {/* angle arc */}
            <path
              d={`M ${CENTER + 34} ${CENTER} A 34 34 0 ${angleDeg > 180 ? 1 : 0} 0 ${CENTER + 34 * cos} ${CENTER - 34 * sin}`}
              fill="none"
              stroke="#a855f7"
              strokeWidth="2.5"
            />
            {/* radius */}
            <line x1={CENTER} y1={CENTER} x2={px} y2={py} stroke="#a855f7" strokeWidth="3" strokeLinecap="round" />
            {/* handle */}
            <circle cx={px} cy={py} r={11} fill="#a855f7" stroke="#fff" strokeWidth="2.5" />
            {/* labels */}
            <text x={CENTER + RADIUS + 10} y={CENTER + 4} fontSize="12" fill="currentColor" fillOpacity="0.6">1</text>
            <text x={CENTER + 6} y={CENTER - RADIUS - 8} fontSize="12" fill="currentColor" fillOpacity="0.6">i</text>
            <text x={px + 8} y={py - 8} fontSize="12" fontWeight="bold" fill="#a855f7">
              {radians ? `${fmt(rad)} rad` : `${fmt(angleDeg)}°`}
            </text>
          </svg>
        </div>

        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Angle</p>
              <div className="flex rounded-lg border border-border p-0.5 text-xs font-bold">
                {(["°", "rad"] as const).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setRadians(u === "rad")}
                    className={cn(
                      "rounded-md px-3 py-1 transition",
                      (u === "rad") === radians ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {u === "°" ? "Degrees" : "Radians"}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={360}
              step={0.5}
              value={angleDeg}
              onChange={(e) => setAngleDeg(Number(e.target.value))}
              className="w-full accent-primary"
              aria-label="Angle in degrees"
            />
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>0°</span>
              <span className="text-sm font-bold text-foreground">
                {fmt(angleDeg)}° = {fmt(rad)} rad
              </span>
              <span>360°</span>
            </div>
          </div>

          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.label} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                <span className={cn("text-lg font-bold", r.color)}>
                  {r.label}({fmt(angleDeg)}°)
                </span>
                <span className="font-mono text-lg font-bold">{fmt(r.value)}</span>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              The green line is cos, the blue line is sin. Drag the purple handle on the circle to change the angle.
            </p>
          </div>

          <div className="flex gap-2">
            <ActionButton disabled={!trial.canUse} onClick={copyValues}>
              <Copy className="h-4 w-4" /> Copy values
            </ActionButton>
            <button
              type="button"
              onClick={() => setAngleDeg(0)}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-bold text-foreground transition hover:border-primary/40"
            >
              <RotateCcw className="h-4 w-4" /> Reset
            </button>
          </div>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left.
            </p>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
