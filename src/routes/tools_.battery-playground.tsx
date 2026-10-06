// /tools/battery-playground - Real Battery Status API playground:
// navigator.getBattery() with charging state, level chart, time estimates
// and a live event log. Honest unsupported-browser note where it is gone.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BatteryCharging, BatteryFull, PlugZap, Unplug, Info, Activity } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/battery-playground";
import toolSeoMeta from "@/lib/tool-seo-meta-data/battery-playground";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/battery-playground")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/battery-playground";
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
  component: BatteryTool,
});

interface BatteryManagerLike extends EventTarget {
  readonly charging: boolean;
  readonly chargingTime: number;
  readonly dischargingTime: number;
  readonly level: number;
}

declare global {
  interface Navigator {
    getBattery?: () => Promise<BatteryManagerLike>;
  }
}

interface LogEntry {
  t: string;
  msg: string;
}

function fmtSeconds(s: number): string {
  if (!Number.isFinite(s)) return "n/a";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function BatteryTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("battery-playground", isPro);
  const seo = toolSeo;

  const [supported] = useState<boolean>(
    () => typeof navigator !== "undefined" && typeof navigator.getBattery === "function",
  );
  const [connected, setConnected] = useState(false);
  const [level, setLevel] = useState<number | null>(null);
  const [charging, setCharging] = useState<boolean | null>(null);
  const [chargingTime, setChargingTime] = useState<number | null>(null);
  const [dischargingTime, setDischargingTime] = useState<number | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [samples, setSamples] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);

  const batteryRef = useRef<BatteryManagerLike | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const addLog = useCallback((msg: string) => {
    setLog((p) => [{ t: new Date().toLocaleTimeString(), msg }, ...p].slice(0, 80));
  }, []);

  const syncFrom = useCallback((b: BatteryManagerLike) => {
    setLevel(b.level);
    setCharging(b.charging);
    setChargingTime(b.chargingTime);
    setDischargingTime(b.dischargingTime);
  }, []);

  const connect = useCallback(async () => {
    if (busy || !trial.canUse) return;
    if (!supported || !navigator.getBattery) {
      toast.error("Battery Status API is not available in this browser.");
      return;
    }
    setBusy(true);
    try {
      const b = await navigator.getBattery();
      batteryRef.current = b;
      syncFrom(b);
      const onChange = (ev: Event) => {
        const target = ev.target as BatteryManagerLike | null;
        const src = target ?? batteryRef.current;
        if (!src) return;
        syncFrom(src);
        const label =
          ev.type === "chargingchange"
            ? `charging -> ${src.charging ? "yes" : "no"}`
            : ev.type === "levelchange"
              ? `level -> ${Math.round(src.level * 100)}%`
              : `${ev.type} -> ${fmtSeconds(ev.type === "chargingtimechange" ? src.chargingTime : src.dischargingTime)}`;
        addLog(`Event: ${label}`);
      };
      for (const type of ["chargingchange", "levelchange", "chargingtimechange", "dischargingtimechange"]) {
        b.addEventListener(type, onChange);
      }
      (b as unknown as { __cleanup?: () => void }).__cleanup = () => {
        for (const type of ["chargingchange", "levelchange", "chargingtimechange", "dischargingtimechange"]) {
          b.removeEventListener(type, onChange);
        }
      };
      setConnected(true);
      setSamples([b.level]);
      addLog(`Connected: level ${Math.round(b.level * 100)}%, charging ${b.charging ? "yes" : "no"}.`);
      trial.recordUse();
      toast.success("Battery monitor connected.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read battery status.");
    } finally {
      setBusy(false);
    }
  }, [busy, trial, supported, syncFrom, addLog]);

  const disconnect = useCallback(() => {
    const b = batteryRef.current as unknown as { __cleanup?: () => void } | null;
    b?.__cleanup?.();
    batteryRef.current = null;
    setConnected(false);
    addLog("Disconnected. Listeners removed.");
  }, [addLog]);

  // Sample the level every 2 seconds while connected.
  useEffect(() => {
    if (!connected) return;
    const id = window.setInterval(() => {
      const b = batteryRef.current;
      if (!b) return;
      setSamples((p) => [...p, b.level].slice(-180));
    }, 2000);
    return () => window.clearInterval(id);
  }, [connected]);

  useEffect(() => () => disconnect(), [disconnect]);

  // Draw the level chart.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);
    // Grid lines at 25/50/75%
    ctx.strokeStyle = "rgba(128,128,128,0.25)";
    ctx.lineWidth = 1;
    for (const f of [0.25, 0.5, 0.75]) {
      const y = h - f * (h - 16) - 8;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    if (samples.length < 2) {
      ctx.fillStyle = "rgba(128,128,128,0.9)";
      ctx.font = "12px system-ui";
      ctx.fillText("Collecting samples (one every 2s)...", 12, h / 2);
      return;
    }
    const x = (i: number) => (i / (samples.length - 1)) * w;
    const y = (v: number) => h - 8 - v * (h - 16);
    ctx.beginPath();
    samples.forEach((v, i) => {
      const px = x(i);
      const py = y(v);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = "rgba(16,185,129,0.15)";
    ctx.fill();
  }, [samples]);

  const pct = level === null ? null : Math.round(level * 100);

  return (
    <ToolPageShell toolId="battery-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Battery Status" left={trial.left} />

      {!supported && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <p className="text-sm">
            <strong>navigator.getBattery() is not available in this browser.</strong> The Battery
            Status API was removed from Firefox and Safari over fingerprinting concerns and today
            only works in Chromium browsers. The layout below shows what the tool reports when the
            API exists; nothing here is simulated.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Monitor</h2>
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-bold",
                supported ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600",
                connected && "bg-primary/15 text-primary",
              )}
            >
              {connected ? "monitoring" : supported ? "API present" : "API missing"}
            </span>
          </div>

          {!connected ? (
            <ActionButton busy={busy} disabled={!supported || !trial.canUse} onClick={() => void connect()}>
              <PlugZap className="h-4 w-4" /> {busy ? "Connecting…" : "Connect to battery"}
            </ActionButton>
          ) : (
            <button
              type="button"
              onClick={disconnect}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-primary/40"
            >
              <Unplug className="h-4 w-4" /> Disconnect
            </button>
          )}

          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free connections left. Nothing leaves your device.
            </p>
          )}

          <div className="rounded-xl bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
            <p className="mb-1 font-semibold text-foreground/80">Try this</p>
            <ol className="list-decimal space-y-1 pl-4">
              <li>Connect, then plug and unplug your charger.</li>
              <li>Watch the charging event arrive in the log instantly.</li>
              <li>Leave it running: the chart records one sample every 2 seconds.</li>
            </ol>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex flex-wrap items-center gap-6">
              <span
                className={cn(
                  "flex h-16 w-16 items-center justify-center rounded-2xl",
                  charging ? "bg-amber-500/15 text-amber-500" : "bg-muted text-muted-foreground",
                )}
              >
                {charging ? <BatteryCharging className="h-9 w-9" /> : <BatteryFull className="h-9 w-9" />}
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Battery level
                </p>
                <p className="text-4xl font-extrabold">{pct === null ? "--" : `${pct}%`}</p>
                <p className="text-sm text-muted-foreground">
                  {charging === null
                    ? "Not connected."
                    : charging
                      ? `Charging - full in about ${fmtSeconds(chargingTime ?? NaN)}.`
                      : `Discharging - empty in about ${fmtSeconds(dischargingTime ?? NaN)}.`}
                </p>
              </div>
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full transition-all", charging ? "bg-amber-500" : "bg-emerald-500")}
                style={{ width: `${pct ?? 0}%` }}
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
              {[
                { k: "Charging", v: charging === null ? "--" : charging ? "yes" : "no" },
                { k: "Level", v: pct === null ? "--" : `${(pct / 100).toFixed(2)}` },
                { k: "Time to full", v: fmtSeconds(chargingTime ?? NaN) },
                { k: "Time to empty", v: fmtSeconds(dischargingTime ?? NaN) },
              ].map((s) => (
                <div key={s.k} className="rounded-xl bg-muted/60 px-3 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{s.k}</p>
                  <p className="font-mono text-sm font-bold">{s.v}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Activity className="h-4 w-4 text-muted-foreground" /> Level history (live)
            </h2>
            <canvas ref={canvasRef} className="h-32 w-full rounded-xl bg-muted/40" />
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold">Event log</h2>
            {log.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                chargingchange, levelchange and time events appear here in real time.
              </p>
            ) : (
              <ul className="max-h-56 space-y-1.5 overflow-y-auto font-mono text-xs">
                {log.map((e, i) => (
                  <li key={i} className="flex gap-3 rounded-lg bg-muted/60 px-3 py-1.5">
                    <span className="shrink-0 text-muted-foreground">{e.t}</span>
                    <span>{e.msg}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
