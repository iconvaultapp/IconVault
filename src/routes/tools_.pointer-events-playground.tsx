// /tools/pointer-events-playground - Pressure, tilt and multi-touch trails from
// real PointerEvents. Every pointerId gets its own trail; live readouts show the
// raw values your browser reports. Session report exports as JSON. Client-side.

import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { MousePointer2, Play, RotateCcw, Info, Download } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/pointer-events-playground";
import toolSeoMeta from "@/lib/tool-seo-meta-data/pointer-events-playground";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/pointer-events-playground")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/pointer-events-playground";
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
  component: PointerEventsPlayground,
});

interface Trace {
  id: number;
  type: string;
  pressure: number;
  tiltX: number;
  tiltY: number;
  twist: number;
  width: number;
  coalesced: number;
  color: string;
}

const COLORS = ["#0ea5e9", "#f43f5e", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

interface SessionStat {
  types: Set<string>;
  maxPressure: number;
  maxTilt: number;
  events: number;
  coalescedTotal: number;
}

function PointerEventsPlayground() {
  const { isPro } = usePlan();
  const trial = useToolTrial("pointer-events-playground", isPro);
  const seo = toolSeo;

  const padRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<Map<number, { x: number; y: number; color: string }>>(new Map());
  const sessionRef = useRef<SessionStat>({ types: new Set(), maxPressure: 0, maxTilt: 0, events: 0, coalescedTotal: 0 });
  const capturingRef = useRef(false);

  const [traces, setTraces] = useState<Trace[]>([]);
  const [capturing, setCapturing] = useState(false);
  const [summary, setSummary] = useState<SessionStat | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const paint = (w: number, h: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#0b1220";
    ctx.fillRect(0, 0, w, h);
  };

  useEffect(() => {
    const pad = padRef.current;
    const canvas = canvasRef.current;
    if (!pad || !canvas) return;
    const resize = () => paint(pad.clientWidth, pad.clientHeight);
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(pad);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canvasPos = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onPointer = (e: React.PointerEvent, kind: "down" | "move" | "up") => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const { x, y } = canvasPos(e);
    const existing = pointsRef.current.get(e.pointerId);
    const color = existing?.color ?? COLORS[e.pointerId % COLORS.length] ?? "#0ea5e9";
    if (existing) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1 + e.pressure * 6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(existing.x, existing.y);
      ctx.lineTo(x, y);
      ctx.stroke();
      if (kind === "up") pointsRef.current.delete(e.pointerId);
      else pointsRef.current.set(e.pointerId, { x, y, color });
    } else if (kind === "down") {
      pointsRef.current.set(e.pointerId, { x, y, color });
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 2 + e.pressure * 5, 0, Math.PI * 2);
      ctx.fill();
    }
    if (e.pressure === 0.5 && e.pointerType === "mouse") {
      // mouse does not report real pressure; leave values as the browser gives them
    }
    setTraces((prev) => {
      const t: Trace = {
        id: e.pointerId, type: e.pointerType, pressure: e.pressure, tiltX: e.tiltX, tiltY: e.tiltY,
        twist: e.twist, width: Math.max(e.width, e.height), coalesced: e.nativeEvent.getCoalescedEvents().length, color,
      };
      const rest = prev.filter((p) => p.id !== e.pointerId);
      return [...rest, t].slice(-8);
    });
    if (capturingRef.current) {
      const s = sessionRef.current;
      s.events += 1;
      s.types.add(e.pointerType);
      s.maxPressure = Math.max(s.maxPressure, e.pressure);
      s.maxTilt = Math.max(s.maxTilt, Math.hypot(e.tiltX, e.tiltY));
      s.coalescedTotal += e.nativeEvent.getCoalescedEvents().length;
    }
  };

  const startSession = () => {
    if (!trial.canUse) return;
    if (timerRef.current) clearInterval(timerRef.current);
    sessionRef.current = { types: new Set(), maxPressure: 0, maxTilt: 0, events: 0, coalescedTotal: 0 };
    capturingRef.current = true;
    setCapturing(true);
    setSummary(null);
    setTimeLeft(10);
    let left = 10;
    timerRef.current = setInterval(() => {
      left -= 1;
      setTimeLeft(left);
      if (left <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        capturingRef.current = false;
        setCapturing(false);
        const s = sessionRef.current;
        setSummary({ ...s, types: new Set(s.types) });
      }
    }, 1000);
    trial.recordUse();
    toast.success("Recording for 10s - draw with fingers, pen and mouse");
  };

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const clear = () => {
    pointsRef.current.clear();
    const pad = padRef.current;
    if (pad) paint(pad.clientWidth, pad.clientHeight);
    setTraces([]);
  };

  const exportJson = () => {
    if (!summary) return;
    const data = {
      tool: "pointer-events-playground",
      at: new Date().toISOString(),
      pointerTypes: [...summary.types],
      maxPressure: Number(summary.maxPressure.toFixed(3)),
      maxTilt: Number(summary.maxTilt.toFixed(1)),
      events: summary.events,
      coalescedEvents: summary.coalescedTotal,
    };
    downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), "pointer-session.json");
    toast.success("Session report downloaded");
  };

  return (
    <ToolPageShell toolId="pointer-events-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Pointer Events" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-sm font-bold">
                <MousePointer2 className="h-4 w-4" /> Input pad - draw with anything
                {capturing && <span className="rounded-full bg-red-500/15 px-2.5 py-1 text-[11px] font-bold text-red-500">REC {timeLeft}s</span>}
              </p>
              <div className="flex gap-2">
                <ActionButton busy={false} disabled={!trial.canUse || capturing} onClick={startSession}>
                  <Play className="h-4 w-4" /> {capturing ? "Recording…" : "Record 10s session"}
                </ActionButton>
                <button type="button" onClick={clear} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-bold hover:border-primary/40">
                  <RotateCcw className="h-4 w-4" /> Clear
                </button>
              </div>
            </div>
            <div
              ref={padRef}
              className="relative h-[420px] touch-none overflow-hidden rounded-xl"
              onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); onPointer(e, "down"); }}
              onPointerMove={(e) => onPointer(e, "move")}
              onPointerUp={(e) => onPointer(e, "up")}
              onPointerCancel={(e) => onPointer(e, "up")}
            >
              <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
              <p className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none text-center text-sm font-semibold text-white/30">
                Multi-touch works here: each finger gets its own trail
              </p>
            </div>
          </div>

          {summary && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-bold">Session report (last 10s)</p>
                <button type="button" onClick={exportJson} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:border-primary/40">
                  <Download className="h-3.5 w-3.5" /> JSON
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[13px] sm:grid-cols-4">
                <div className="rounded-lg bg-muted/50 p-3"><p className="text-lg font-black">{summary.events}</p><p className="text-xs text-muted-foreground">raw events</p></div>
                <div className="rounded-lg bg-muted/50 p-3"><p className="text-lg font-black">{summary.coalescedTotal}</p><p className="text-xs text-muted-foreground">coalesced</p></div>
                <div className="rounded-lg bg-muted/50 p-3"><p className="text-lg font-black">{summary.maxPressure.toFixed(2)}</p><p className="text-xs text-muted-foreground">max pressure</p></div>
                <div className="rounded-lg bg-muted/50 p-3"><p className="text-lg font-black">{[...summary.types].join(", ") || "-"}</p><p className="text-xs text-muted-foreground">input types</p></div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 text-sm font-bold">Live pointer readouts</p>
            <div className="space-y-2">
              {traces.length === 0 && <p className="text-sm text-muted-foreground">Touch the pad - each pointerId shows its live values.</p>}
              {traces.map((t) => (
                <div key={t.id} className="rounded-xl border border-border p-3 text-xs">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-2 font-bold">
                      <span className="h-3 w-3 rounded-full" style={{ background: t.color }} />
                      pointerId {t.id}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 font-bold">{t.type}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-muted-foreground">
                    <span>pressure <b className="text-foreground">{t.pressure.toFixed(2)}</b></span>
                    <span>twist <b className="text-foreground">{t.twist}°</b></span>
                    <span>tiltX <b className="text-foreground">{t.tiltX}°</b></span>
                    <span>tiltY <b className="text-foreground">{t.tiltY}°</b></span>
                    <span>contact <b className="text-foreground">{t.width}px</b></span>
                    <span>coalesced <b className="text-foreground">{t.coalesced}</b></span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className={cn("h-full rounded-full")} style={{ width: `${Math.min(100, t.pressure * 100)}%`, background: t.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 text-xs text-muted-foreground">
            <p className="mb-2 flex items-start gap-1.5"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Mouse pressure is always 0.5 (no sensor), touch pressure is a 0-1 approximation, and pen devices with
              a stylus report real pressure, tilt and twist. Coalesced events show how many movements were batched per frame.
            </p>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
