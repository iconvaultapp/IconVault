// /tools/projectile-lab - Interactive projectile motion lab: velocity and
// angle inputs, canvas trajectory, optional quadratic air drag, range /
// height / time stats. Client-side only.

import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Rocket } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/projectile-lab")({
  head: () => {
    const seo = getToolSeoMeta("projectile-lab");
    const canonical = "https://iconvault.site/tools/projectile-lab";
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
  component: ProjectileLabTool,
});

const GRAVITY: Record<string, number> = { Earth: 9.81, Moon: 1.62, Mars: 3.71, Jupiter: 24.79 };

interface SimResult {
  points: { x: number; y: number }[];
  range: number;
  maxHeight: number;
  time: number;
  apexX: number;
}

/** Numeric integration; optional quadratic drag F = 0.5 * rho * Cd * A * v^2. */
function simulate(v0: number, angleDeg: number, g: number, drag: boolean, cd: number): SimResult {
  const angle = (angleDeg * Math.PI) / 180;
  let x = 0, y = 0;
  let vx = v0 * Math.cos(angle);
  let vy = v0 * Math.sin(angle);
  const dt = 0.005;
  const points = [{ x, y }];
  let maxHeight = 0;
  let apexX = 0;
  let t = 0;
  // fixed demo projectile: 10 cm ball, 1 kg
  const rho = 1.225, A = Math.PI * 0.05 * 0.05, m = 1;
  const k = drag ? (0.5 * rho * cd * A) / m : 0;

  for (let i = 0; i < 200000; i++) {
    const speed = Math.hypot(vx, vy);
    const ax = -k * speed * vx;
    const ay = -g - k * speed * vy;
    vx += ax * dt;
    vy += ay * dt;
    x += vx * dt;
    y += vy * dt;
    t += dt;
    if (y > maxHeight) { maxHeight = y; apexX = x; }
    if (i % 4 === 0) points.push({ x, y });
    if (y < 0 && t > 0.01) break;
  }
  points.push({ x, y: 0 });
  return { points, range: x, maxHeight, time: t, apexX };
}

function drawTrajectory(canvas: HTMLCanvasElement, sim: SimResult) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = canvas.clientWidth;
  const h = 380;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  const pad = { l: 46, r: 16, t: 16, b: 34 };
  const maxX = Math.max(sim.range * 1.08, 1);
  const maxY = Math.max(sim.maxHeight * 1.2, 1);
  const sx = (x: number) => pad.l + (x / maxX) * (w - pad.l - pad.r);
  const sy = (y: number) => h - pad.b - (y / maxY) * (h - pad.t - pad.b);

  // grid
  ctx.strokeStyle = "rgba(128,128,128,0.18)";
  ctx.fillStyle = "rgba(128,128,128,0.85)";
  ctx.font = "11px system-ui";
  ctx.lineWidth = 1;
  const stepX = niceStep(maxX);
  for (let gx = 0; gx <= maxX; gx += stepX) {
    ctx.beginPath(); ctx.moveTo(sx(gx), pad.t); ctx.lineTo(sx(gx), h - pad.b); ctx.stroke();
    ctx.fillText(`${gx}`, sx(gx) - 6, h - pad.b + 16);
  }
  const stepY = niceStep(maxY);
  for (let gy = 0; gy <= maxY; gy += stepY) {
    ctx.beginPath(); ctx.moveTo(pad.l, sy(gy)); ctx.lineTo(w - pad.r, sy(gy)); ctx.stroke();
    ctx.fillText(`${gy} m`, 4, sy(gy) + 4);
  }
  ctx.fillText("distance (m)", w / 2 - 36, h - 8);

  // ground
  ctx.strokeStyle = "rgba(128,128,128,0.5)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(pad.l, sy(0)); ctx.lineTo(w - pad.r, sy(0)); ctx.stroke();

  // trajectory
  const grad = ctx.createLinearGradient(pad.l, 0, w - pad.r, 0);
  grad.addColorStop(0, "#0ea5e9");
  grad.addColorStop(1, "#8b5cf6");
  ctx.strokeStyle = grad;
  ctx.lineWidth = 3;
  ctx.beginPath();
  sim.points.forEach((p, i) => {
    if (i === 0) ctx.moveTo(sx(p.x), sy(Math.max(0, p.y)));
    else ctx.lineTo(sx(p.x), sy(Math.max(0, p.y)));
  });
  ctx.stroke();

  // launch + apex + landing markers
  ctx.fillStyle = "#0ea5e9";
  ctx.beginPath(); ctx.arc(sx(0), sy(0), 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#8b5cf6";
  ctx.beginPath(); ctx.arc(sx(sim.apexX), sy(sim.maxHeight), 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#10b981";
  ctx.beginPath(); ctx.arc(sx(sim.range), sy(0), 6, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = "rgba(128,128,128,0.9)";
  ctx.fillText(`apex ${sim.maxHeight.toFixed(1)} m`, Math.min(sx(sim.apexX) + 10, w - 110), sy(sim.maxHeight) - 8);
  ctx.fillText(`range ${sim.range.toFixed(1)} m`, Math.max(sx(sim.range) - 110, pad.l), sy(0) - 10);
}

function niceStep(max: number): number {
  const raw = max / 8;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const m of [1, 2, 5, 10]) if (m * mag >= raw) return m * mag;
  return 10 * mag;
}

function ProjectileLabTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("projectile-lab", isPro);
  const seo = getToolSeo("projectile-lab");

  const [v0, setV0] = useState(25);
  const [angle, setAngle] = useState(45);
  const [body, setBody] = useState<keyof typeof GRAVITY>("Earth");
  const [drag, setDrag] = useState(false);
  const [cd, setCd] = useState(0.47);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const sim = useMemo(() => simulate(v0, angle, GRAVITY[body]!, drag, cd), [v0, angle, body, drag, cd]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) drawTrajectory(canvas, sim);
    const onResize = () => { if (canvas) drawTrajectory(canvas, sim); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [sim]);

  const copy = async () => {
    if (!trial.canUse) return;
    const text = [
      `Projectile: v0 = ${v0} m/s, angle = ${angle} deg, gravity = ${body} (${GRAVITY[body]} m/s2)`,
      `Air resistance: ${drag ? `on (Cd = ${cd})` : "off"}`,
      `Range: ${sim.range.toFixed(2)} m`,
      `Max height: ${sim.maxHeight.toFixed(2)} m`,
      `Flight time: ${sim.time.toFixed(2)} s`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      trial.recordUse();
      toast.success("Stats copied");
    } catch {
      toast.error("Copy failed - clipboard not available.");
    }
  };

  return (
    <ToolPageShell toolId="projectile-lab" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Projectile Lab" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <div className="flex items-center justify-between text-sm">
              <label className="font-medium">Launch velocity</label>
              <span className="font-bold tabular-nums">{v0} m/s</span>
            </div>
            <input type="range" min={1} max={100} value={v0} onChange={(e) => setV0(Number(e.target.value))} className="mt-2 w-full accent-primary" />
          </div>
          <div>
            <div className="flex items-center justify-between text-sm">
              <label className="font-medium">Launch angle</label>
              <span className="font-bold tabular-nums">{angle} deg</span>
            </div>
            <input type="range" min={5} max={85} value={angle} onChange={(e) => setAngle(Number(e.target.value))} className="mt-2 w-full accent-primary" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Gravity</label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(GRAVITY) as (keyof typeof GRAVITY)[]).map((b) => (
                <button
                  key={b} type="button" onClick={() => setBody(b)}
                  className={cn("rounded-full border px-3 py-1.5 text-xs font-bold transition", body === b ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}
                >
                  {b} {GRAVITY[b]} m/s2
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-xl bg-muted/60 p-4">
            <label className="flex cursor-pointer items-center justify-between text-sm font-medium">
              <span>Air resistance</span>
              <button
                type="button" role="switch" aria-checked={drag} onClick={() => setDrag((d) => !d)}
                className={cn("relative h-6 w-11 rounded-full transition", drag ? "bg-primary" : "bg-muted-foreground/30")}
              >
                <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition", drag ? "left-[22px]" : "left-0.5")} />
              </button>
            </label>
            {drag && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Drag coefficient</span>
                  <span className="font-bold tabular-nums">{cd.toFixed(2)}</span>
                </div>
                <input type="range" min={0.05} max={1.2} step={0.01} value={cd} onChange={(e) => setCd(Number(e.target.value))} className="mt-2 w-full accent-primary" />
                <p className="mt-1 text-xs text-muted-foreground">0.47 is a smooth sphere; a flat plate is about 1.2.</p>
              </div>
            )}
            <p className="mt-2 text-xs text-muted-foreground">Model: 1 kg ball, 10 cm diameter, quadratic drag.</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-4">
            <h2 className="flex items-center gap-2 px-1 pb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
              <Rocket className="h-4 w-4" /> Trajectory
            </h2>
            <canvas ref={canvasRef} className="w-full" style={{ height: 380 }} />
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-muted/60 p-4 text-center">
                <p className="text-xs text-muted-foreground">Range</p>
                <p className="mt-1 text-2xl font-bold tabular-nums">{sim.range.toFixed(1)} <span className="text-sm font-medium">m</span></p>
              </div>
              <div className="rounded-xl bg-muted/60 p-4 text-center">
                <p className="text-xs text-muted-foreground">Max height</p>
                <p className="mt-1 text-2xl font-bold tabular-nums">{sim.maxHeight.toFixed(1)} <span className="text-sm font-medium">m</span></p>
              </div>
              <div className="rounded-xl bg-muted/60 p-4 text-center">
                <p className="text-xs text-muted-foreground">Flight time</p>
                <p className="mt-1 text-2xl font-bold tabular-nums">{sim.time.toFixed(2)} <span className="text-sm font-medium">s</span></p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <ActionButton disabled={!trial.canUse} onClick={copy}>
                <Copy className="h-4 w-4" /> Copy stats
              </ActionButton>
              {!isPro && <p className="text-xs text-muted-foreground">{trial.left} of {TOOL_TRIAL_LIMIT} free copies left.</p>}
            </div>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
