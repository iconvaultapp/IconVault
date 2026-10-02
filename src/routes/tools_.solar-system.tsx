// /tools/solar-system - Interactive solar system lab: real-time animated
// orbits with real planet data, speed control, click a planet for facts.
// Orbital sizes compressed for visibility. Client-side only.

import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Orbit, Pause, Play } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/solar-system")({
  head: () => {
    const seo = getToolSeoMeta("solar-system");
    const canonical = "https://iconvault.site/tools/solar-system";
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
  component: SolarSystemTool,
});

interface Planet {
  name: string;
  color: string;
  distAU: number;
  periodDays: number;
  diameterKm: number;
  moons: number;
  dayHours: number;
  fact: string;
}

const PLANETS: Planet[] = [
  { name: "Mercury", color: "#9c8e84", distAU: 0.39, periodDays: 88, diameterKm: 4879, moons: 0, dayHours: 4222.6, fact: "The smallest planet and closest to the Sun. Its surface swings from -180 C at night to 430 C by day." },
  { name: "Venus", color: "#e8c47a", distAU: 0.72, periodDays: 225, diameterKm: 12104, moons: 0, dayHours: 2802, fact: "Spins backwards, and a single day on Venus is longer than its year. Crushing CO2 air makes it the hottest planet." },
  { name: "Earth", color: "#4d9de0", distAU: 1.0, periodDays: 365.25, diameterKm: 12742, moons: 1, dayHours: 24, fact: "The only known world with liquid-water oceans, an oxygen atmosphere and confirmed life." },
  { name: "Mars", color: "#e07a5f", distAU: 1.52, periodDays: 687, diameterKm: 6779, moons: 2, dayHours: 24.7, fact: "Home to Olympus Mons, a volcano nearly three times the height of Everest, and the largest canyon in the solar system." },
  { name: "Jupiter", color: "#d8a06a", distAU: 5.2, periodDays: 4333, diameterKm: 139820, moons: 95, dayHours: 9.9, fact: "The giant: more than twice the mass of all other planets combined. Its Great Red Spot is a storm wider than Earth." },
  { name: "Saturn", color: "#e3d0a3", distAU: 9.58, periodDays: 10759, diameterKm: 116460, moons: 146, dayHours: 10.7, fact: "Its rings span about 280,000 km yet are only around 10 meters thick in places. Saturn would float in water." },
  { name: "Uranus", color: "#8fd1d4", distAU: 19.2, periodDays: 30687, diameterKm: 50724, moons: 28, dayHours: 17.2, fact: "Tipped on its side at 98 degrees, so it rolls around the Sun. The coldest planetary atmosphere at -224 C." },
  { name: "Neptune", color: "#5b7fe0", distAU: 30.1, periodDays: 60190, diameterKm: 49244, moons: 16, dayHours: 16.1, fact: "The windiest world: supersonic storms reach 2,100 km/h. Found by mathematics before any telescope saw it." },
];

// compressed display radius: r = base + k * log10(distAU + 1)
function orbitRadius(au: number, maxR: number): number {
  const inner = 0.18;
  const outer = 1;
  const t = Math.log10(au + 1) / Math.log10(30.1 + 1);
  return maxR * (inner + (outer - inner) * t);
}

function SolarSystemTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("solar-system", isPro);
  const seo = getToolSeo("solar-system");

  const [speed, setSpeed] = useState(8); // days per second
  const [playing, setPlaying] = useState(true);
  const [selected, setSelected] = useState<Planet>(PLANETS[2]!);
  const elapsedRef = useRef(0); // simulated days, ref to avoid stale closures in the rAF loop
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const anim = useRef<number>(0);
  const lastTs = useRef<number>(0);

  const angles = useMemo(
    () => PLANETS.map((p, i) => (i / PLANETS.length) * Math.PI * 2),
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const draw = (ts: number) => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = canvas.clientWidth;
      const h = 460;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const maxR = Math.min(w, h) / 2 - 24;

      const dt = lastTs.current === 0 ? 0 : (ts - lastTs.current) / 1000;
      lastTs.current = ts;
      if (playing && dt > 0 && dt < 1) elapsedRef.current += dt * speed;

      // orbit rings
      ctx.strokeStyle = "rgba(128,128,128,0.25)";
      ctx.lineWidth = 1;
      for (const p of PLANETS) {
        ctx.beginPath();
        ctx.arc(cx, cy, orbitRadius(p.distAU, maxR), 0, Math.PI * 2);
        ctx.stroke();
      }

      // sun
      const sunGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 26);
      sunGrad.addColorStop(0, "#fff7c2");
      sunGrad.addColorStop(0.5, "#ffd93b");
      sunGrad.addColorStop(1, "rgba(255,180,0,0.15)");
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(128,128,128,0.9)";
      ctx.font = "11px system-ui";
      ctx.fillText("Sun", cx - 10, cy + 42);

      // planets
      PLANETS.forEach((p, i) => {
        const r = orbitRadius(p.distAU, maxR);
        const a = angles[i]! + (elapsedRef.current * 2 * Math.PI) / p.periodDays;
        const x = cx + r * Math.cos(a);
        const y = cy + r * Math.sin(a);
        const size = Math.max(4, 5 + Math.log10(p.diameterKm / 4879) * 7);
        const isSel = selected.name === p.name;

        if (isSel) {
          ctx.strokeStyle = "#0ea5e9";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, size + 6, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(128,128,128,0.85)";
        ctx.font = "10px system-ui";
        ctx.fillText(p.name, x - ctx.measureText(p.name).width / 2, y + size + 12);

        (p as Planet & { _x?: number; _y?: number; _s?: number })._x = x;
        (p as Planet & { _x?: number; _y?: number; _s?: number })._y = y;
        (p as Planet & { _x?: number; _y?: number; _s?: number })._s = size + 8;
      });

      anim.current = requestAnimationFrame(draw);
    };

    anim.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(anim.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, speed, selected.name, angles]);

  const onCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    for (const p of PLANETS) {
      const q = p as Planet & { _x?: number; _y?: number; _s?: number };
      if (q._x !== undefined && Math.hypot(mx - q._x, my - q._y!) <= (q._s ?? 12)) {
        setSelected(p);
        return;
      }
    }
  };

  const copyFacts = async () => {
    if (!trial.canUse) return;
    const text = [
      `${selected.name}`,
      `Distance from Sun: ${selected.distAU} AU`,
      `Orbital period: ${selected.periodDays.toLocaleString()} days`,
      `Diameter: ${selected.diameterKm.toLocaleString()} km`,
      `Moons: ${selected.moons}`,
      `Day length: ${selected.dayHours} hours`,
      selected.fact,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      trial.recordUse();
      toast.success(`Copied ${selected.name} facts`);
    } catch {
      toast.error("Copy failed - clipboard not available.");
    }
  };

  return (
    <ToolPageShell toolId="solar-system" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Solar System" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-border bg-card p-4">
          <canvas
            ref={canvasRef}
            onClick={onCanvasClick}
            className="w-full cursor-pointer rounded-xl bg-background"
            style={{ height: 460 }}
          />
          <div className="mt-3 flex flex-wrap items-center gap-4 px-1">
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-bold transition hover:border-primary/40"
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {playing ? "Pause" : "Play"}
            </button>
            <div className="flex min-w-[220px] flex-1 items-center gap-3">
              <label className="text-sm font-medium">Speed</label>
              <input type="range" min={0.5} max={60} step={0.5} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="flex-1 accent-primary" />
              <span className="w-28 text-right text-sm font-bold tabular-nums">{speed} days/s</span>
            </div>
          </div>
          <p className="mt-2 px-1 text-xs text-muted-foreground">
            Orbits are true to period but distances are log-compressed so the outer planets stay visible. Click any planet for its facts.
          </p>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <span className="h-4 w-4 rounded-full" style={{ background: selected.color }} />
              {selected.name}
            </h2>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Distance from Sun</dt><dd className="font-semibold tabular-nums">{selected.distAU} AU</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Orbital period</dt><dd className="font-semibold tabular-nums">{selected.periodDays.toLocaleString()} days</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Diameter</dt><dd className="font-semibold tabular-nums">{selected.diameterKm.toLocaleString()} km</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Moons</dt><dd className="font-semibold tabular-nums">{selected.moons}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Day length</dt><dd className="font-semibold tabular-nums">{selected.dayHours} h</dd></div>
            </dl>
            <p className="mt-4 rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground">{selected.fact}</p>
            <div className="mt-4 flex items-center gap-3">
              <ActionButton disabled={!trial.canUse} onClick={copyFacts}>
                <Copy className="h-4 w-4" /> Copy facts
              </ActionButton>
            </div>
            {!isPro && <p className="mt-2 text-xs text-muted-foreground">{trial.left} of {TOOL_TRIAL_LIMIT} free copies left.</p>}
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-bold"><Orbit className="h-4 w-4 text-primary" /> Planets</p>
            <div className="grid grid-cols-2 gap-1.5">
              {PLANETS.map((p) => (
                <button
                  key={p.name} type="button" onClick={() => setSelected(p)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-sm font-medium transition",
                    selected.name === p.name ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40",
                  )}
                >
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: p.color }} />
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
