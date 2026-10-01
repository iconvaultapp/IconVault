// /tools/device-sensors-playground - Real DeviceOrientationEvent / DeviceMotionEvent
// lab with a live 3D cube, iOS permission flow, calibration and smoothing.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Compass, Crosshair, Gauge } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/device-sensors-playground")({
  head: () => {
    const seo = getToolSeoMeta("device-sensors-playground");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: SensorTool,
});

type Orientation = { alpha: number | null; beta: number | null; gamma: number | null; absolute: boolean };
type Motion = {
  acc: (number | null)[];
  accG: (number | null)[];
  rot: (number | null)[];
  interval: number;
};

const ZERO_ORIENTATION: Orientation = { alpha: null, beta: null, gamma: null, absolute: false };
const ZERO_MOTION: Motion = { acc: [null, null, null], accG: [null, null, null], rot: [null, null, null], interval: 0 };

function SensorTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("device-sensors-playground", isPro);
  const seo = getToolSeo("device-sensors-playground");

  const [orientation, setOrientation] = useState<Orientation>(ZERO_ORIENTATION);
  const [motion, setMotion] = useState<Motion>(ZERO_MOTION);
  const [listening, setListening] = useState(false);
  const [needsPermission, setNeedsPermission] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [smoothing, setSmoothing] = useState(0.25);
  const [zero, setZero] = useState({ alpha: 0, beta: 0, gamma: 0 });

  const smoothRef = useRef({ alpha: 0, beta: 0, gamma: 0 });
  const smoothingRef = useRef(smoothing);
  smoothingRef.current = smoothing;

  useEffect(() => {
    const DOE = window.DeviceOrientationEvent as unknown as
      | { requestPermission?: () => Promise<string> }
      | undefined;
    setNeedsPermission(typeof DOE?.requestPermission === "function");
  }, []);

  const onOrientation = useCallback((e: DeviceOrientationEvent) => {
    setHasData(true);
    const s = smoothingRef.current;
    const sm = smoothRef.current;
    const blend = (prev: number, next: number | null) =>
      next === null ? prev : prev + (next - prev) * s;
    sm.alpha = blend(sm.alpha, e.alpha);
    sm.beta = blend(sm.beta, e.beta);
    sm.gamma = blend(sm.gamma, e.gamma);
    setOrientation({ alpha: sm.alpha, beta: sm.beta, gamma: sm.gamma, absolute: e.absolute });
  }, []);

  const onMotion = useCallback((e: DeviceMotionEvent) => {
    setHasData(true);
    setMotion({
      acc: [e.acceleration?.x ?? null, e.acceleration?.y ?? null, e.acceleration?.z ?? null],
      accG: [
        e.accelerationIncludingGravity?.x ?? null,
        e.accelerationIncludingGravity?.y ?? null,
        e.accelerationIncludingGravity?.z ?? null,
      ],
      rot: [e.rotationRate?.alpha ?? null, e.rotationRate?.beta ?? null, e.rotationRate?.gamma ?? null],
      interval: e.interval,
    });
  }, []);

  const start = useCallback(async () => {
    if (!trial.canUse) return;
    const DOE = window.DeviceOrientationEvent as unknown as
      | { requestPermission?: () => Promise<string> }
      | undefined;
    try {
      if (typeof DOE?.requestPermission === "function") {
        const res = await DOE.requestPermission();
        if (res !== "granted") {
          toast.error("Motion permission was not granted.");
          return;
        }
      }
      window.addEventListener("deviceorientation", onOrientation);
      window.addEventListener("devicemotion", onMotion);
      setListening(true);
      trial.recordUse();
      toast.success("Listening for sensor events");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not enable sensors.");
    }
  }, [trial, onOrientation, onMotion]);

  const stop = useCallback(() => {
    window.removeEventListener("deviceorientation", onOrientation);
    window.removeEventListener("devicemotion", onMotion);
    setListening(false);
  }, [onOrientation, onMotion]);

  useEffect(() => stop, [stop]);

  const calibrate = useCallback(() => {
    setZero({ alpha: smoothRef.current.alpha, beta: smoothRef.current.beta, gamma: smoothRef.current.gamma });
    toast.success("Current pose set as zero");
  }, []);

  const fmt = (n: number | null, digits = 1) => (n === null ? "-" : n.toFixed(digits));

  const a = (orientation.alpha ?? 0) - zero.alpha;
  const b = (orientation.beta ?? 0) - zero.beta;
  const g = (orientation.gamma ?? 0) - zero.gamma;

  const readouts: { label: string; value: string }[] = [
    { label: "alpha (z, compass)", value: `${fmt(orientation.alpha)} deg` },
    { label: "beta (x, front-back)", value: `${fmt(orientation.beta)} deg` },
    { label: "gamma (y, left-right)", value: `${fmt(orientation.gamma)} deg` },
    { label: "absolute", value: orientation.absolute ? "yes" : "no" },
    { label: "accel x / y / z", value: motion.acc.map((n) => fmt(n, 2)).join(" / ") },
    { label: "accel+gravity x / y / z", value: motion.accG.map((n) => fmt(n, 2)).join(" / ") },
    { label: "rotation deg/s", value: motion.rot.map((n) => fmt(n, 1)).join(" / ") },
    { label: "interval", value: `${motion.interval} ms` },
  ];

  return (
    <ToolPageShell toolId="device-sensors-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Device Sensors" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5">
          <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <Compass className="h-5 w-5 text-primary" />
              <h3 className="font-bold">Sensor session</h3>
            </div>
            {!listening ? (
              <ActionButton disabled={!trial.canUse} onClick={() => void start()}>
                <Gauge className="h-4 w-4" /> {needsPermission ? "Allow sensors and start" : "Start listening"}
              </ActionButton>
            ) : (
              <button
                type="button"
                onClick={stop}
                className="inline-flex items-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-bold transition hover:border-primary/40"
              >
                Stop listening
              </button>
            )}
            {needsPermission && (
              <p className="text-xs text-muted-foreground">
                iOS 13 and later requires an explicit permission tap before motion events fire.
              </p>
            )}
            <div>
              <div className="mb-1.5 flex items-center justify-between text-[13px]">
                <span className="font-medium text-foreground/80">Smoothing</span>
                <span className="font-mono text-muted-foreground">{smoothing.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0.05}
                max={1}
                step={0.05}
                value={smoothing}
                onChange={(e) => setSmoothing(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">Low-pass filter on the cube rotation. Lower is smoother, higher is snappier.</p>
            </div>
            <button
              type="button"
              onClick={calibrate}
              disabled={!hasData}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-bold transition hover:border-primary/40 disabled:opacity-50"
            >
              <Crosshair className="h-4 w-4" /> Zero current pose
            </button>
            {!isPro && (
              <p className="text-xs text-muted-foreground">{trial.left} of 5 free sessions left.</p>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-3 font-bold">Live readouts</h3>
            <div className="space-y-1.5 font-mono text-xs">
              {readouts.map((r) => (
                <div key={r.label} className="flex items-center justify-between gap-2 rounded-lg bg-background px-3 py-2">
                  <span className="text-muted-foreground">{r.label}</span>
                  <span className="font-bold text-foreground">{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-border bg-card p-8">
          {!hasData ? (
            <div className="max-w-sm text-center">
              <Compass className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">No sensor data yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Press Start listening, then tilt and rotate your device. On a desktop without motion sensors this stays empty, which is the honest result.
              </p>
            </div>
          ) : (
            <>
              <div style={{ perspective: "800px" }} className="mb-6">
                <div
                  style={{
                    width: 160,
                    height: 160,
                    position: "relative",
                    transformStyle: "preserve-3d",
                    transform: `rotateZ(${-a}deg) rotateX(${-b}deg) rotateY(${g}deg)`,
                    transition: "transform 60ms linear",
                  }}
                >
                  {[
                    { t: "translateZ(80px)", bg: "bg-primary/80", label: "front" },
                    { t: "rotateY(180deg) translateZ(80px)", bg: "bg-primary/40", label: "back" },
                    { t: "rotateY(90deg) translateZ(80px)", bg: "bg-teal-500/70", label: "right" },
                    { t: "rotateY(-90deg) translateZ(80px)", bg: "bg-teal-500/40", label: "left" },
                    { t: "rotateX(90deg) translateZ(80px)", bg: "bg-amber-500/70", label: "top" },
                    { t: "rotateX(-90deg) translateZ(80px)", bg: "bg-amber-500/40", label: "bottom" },
                  ].map((f) => (
                    <div
                      key={f.label}
                      style={{ transform: f.t }}
                      className={cn(
                        "absolute inset-0 flex items-center justify-center rounded-lg border border-white/30 text-xs font-bold text-white",
                        f.bg,
                      )}
                    >
                      {f.label}
                    </div>
                  ))}
                </div>
              </div>
              <p className="font-mono text-sm text-muted-foreground">
                rotateZ({fmt(a)} deg) rotateX({fmt(b)} deg) rotateY({fmt(g)} deg)
              </p>
              <p className="mt-2 max-w-md text-center text-xs text-muted-foreground">
                The cube fuses deviceorientation angles in real time. Note how gamma wraps near plus or minus 90 degrees of beta: that is the gimbal-lock region of Euler angles, which is why production 3D apps prefer quaternions.
              </p>
            </>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
