// /tools/geolocation-playground - Interactive Geolocation API lab: live position,
// accuracy circles, movement trail and geofence enter/exit detection.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Crosshair, Fence, Play, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/geolocation-playground";
import toolSeoMeta from "@/lib/tool-seo-meta-data/geolocation-playground";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/geolocation-playground")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/geolocation-playground";
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
  component: GeolocationPlayground,
});

interface Fix {
  t: number;
  lat: number;
  lon: number;
  acc: number;
}

interface GeoEvent {
  t: number;
  msg: string;
  kind: "info" | "ok" | "warn";
}

function fmtClock(t: number) {
  return new Date(t).toLocaleTimeString();
}

function GeolocationPlayground() {
  const { isPro } = usePlan();
  const trial = useToolTrial("geolocation-playground", isPro);
  const seo = toolSeo;

  const [supported] = useState(() => typeof navigator !== "undefined" && "geolocation" in navigator);
  const [watching, setWatching] = useState(false);
  const [fixes, setFixes] = useState<Fix[]>([]);
  const [events, setEvents] = useState<GeoEvent[]>([]);
  const [perm, setPerm] = useState<string>("unknown");
  const [geofenceOn, setGeofenceOn] = useState(false);
  const [geofenceRadius, setGeofenceRadius] = useState(50);
  const [geofenceLat, setGeofenceLat] = useState<number | null>(null);
  const [geofenceLon, setGeofenceLon] = useState<number | null>(null);
  const [inside, setInside] = useState<boolean | null>(null);
  const watchId = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const log = useCallback((msg: string, kind: GeoEvent["kind"] = "info") => {
    setEvents((p) => [{ t: Date.now(), msg, kind }, ...p].slice(0, 60));
  }, []);

  const checkPermission = useCallback(async () => {
    try {
      if (!navigator.permissions?.query) { setPerm("unknown"); return; }
      const r = await navigator.permissions.query({ name: "geolocation" as PermissionName });
      setPerm(r.state);
      r.onchange = () => setPerm(r.state);
    } catch { setPerm("unknown"); }
  }, []);

  useEffect(() => { void checkPermission(); }, [checkPermission]);

  const onError = useCallback((err: GeolocationPositionError) => {
    const why =
      err.code === err.PERMISSION_DENIED
        ? "Permission denied. Allow location access in your browser site settings, then try again."
        : err.code === err.POSITION_UNAVAILABLE
          ? "Position unavailable. Turn on device location services."
          : "Timed out waiting for a fix. Try again.";
    log(why, "warn");
    toast.error("Geolocation error", { description: why });
  }, [log]);

  const startWatch = useCallback(() => {
    if (!supported || watching) return;
    if (!trial.canUse) { toast.error("Free trial exhausted - go Pro for unlimited runs"); return; }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const f: Fix = {
          t: Date.now(),
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          acc: pos.coords.accuracy ?? 100,
        };
        setFixes((p) => [...p, f].slice(-200));
        setPerm("granted");
        if (geofenceOn && geofenceLat !== null && geofenceLon !== null) {
          const d = haversine(f.lat, f.lon, geofenceLat, geofenceLon);
          const nowInside = d <= geofenceRadius;
          setInside((prev) => {
            if (prev !== null && prev !== nowInside) {
              log(nowInside ? `Entered geofence (${Math.round(d)}m from center)` : `Exited geofence (${Math.round(d)}m from center)`, nowInside ? "ok" : "warn");
            }
            return nowInside;
          });
        }
      },
      onError,
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    );
    watchId.current = id;
    setWatching(true);
    trial.recordUse();
    log("watchPosition() started - move around to see fixes arrive", "info");
  }, [supported, watching, trial, onError, log, geofenceOn, geofenceLat, geofenceLon, geofenceRadius]);

  const stopWatch = useCallback(() => {
    if (watchId.current !== null && watchId.current >= 0) {
      navigator.geolocation.clearWatch(watchId.current);
    }
    watchId.current = null;
    setWatching(false);
    log("watchPosition() stopped", "info");
  }, [log]);

  const singleFix = useCallback(() => {
    if (!supported) return;
    if (!trial.canUse) { toast.error("Free trial exhausted - go Pro for unlimited runs"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFixes((p) => [...p, { t: Date.now(), lat: pos.coords.latitude, lon: pos.coords.longitude, acc: pos.coords.accuracy ?? 100 }].slice(-200));
        setPerm("granted");
        log(`Single fix: ${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)} (accuracy ${Math.round(pos.coords.accuracy ?? 0)}m)`, "ok");
        trial.recordUse();
      },
      onError,
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }, [supported, trial, onError, log]);

  const setGeofenceHere = useCallback(() => {
    const last = fixes[fixes.length - 1];
    if (!last) { toast.error("Get a position first, then set the geofence center"); return; }
    setGeofenceLat(last.lat);
    setGeofenceLon(last.lon);
    setGeofenceOn(true);
    setInside(null);
    log(`Geofence armed: ${geofenceRadius}m radius around your current position`, "ok");
  }, [fixes, geofenceRadius, log]);

  // Draw the mini map: last fix at center, accuracy circle + trail
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#0b1220";
    ctx.fillRect(0, 0, W, H);
    // grid
    ctx.strokeStyle = "rgba(148,163,184,0.12)";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    if (fixes.length === 0) {
      ctx.fillStyle = "rgba(148,163,184,0.7)";
      ctx.font = "13px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Start tracking to see your position here", W / 2, H / 2);
      return;
    }
    const ref = fixes[fixes.length - 1]!;
    // scale: fit the largest accuracy circle plus trail spread into view
    let maxD = 100;
    for (const f of fixes) {
      const d = Math.hypot((f.lon - ref.lon) * 111320 * Math.cos((ref.lat * Math.PI) / 180), (f.lat - ref.lat) * 111320);
      maxD = Math.max(maxD, d, f.acc);
    }
    const pxPerM = (Math.min(W, H) / 2 - 30) / maxD;
    const toXY = (lat: number, lon: number): [number, number] => [
      W / 2 + (lon - ref.lon) * 111320 * Math.cos((ref.lat * Math.PI) / 180) * pxPerM,
      H / 2 - (lat - ref.lat) * 111320 * pxPerM,
    ];

    // geofence
    if (geofenceOn && geofenceLat !== null && geofenceLon !== null) {
      const [gx, gy] = toXY(geofenceLat, geofenceLon);
      ctx.beginPath();
      ctx.arc(gx, gy, geofenceRadius * pxPerM, 0, Math.PI * 2);
      ctx.fillStyle = inside ? "rgba(34,197,94,0.12)" : "rgba(234,179,8,0.12)";
      ctx.fill();
      ctx.strokeStyle = inside ? "#22c55e" : "#eab308";
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // trail
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2;
    ctx.beginPath();
    fixes.forEach((f, i) => {
      const [x, y] = toXY(f.lat, f.lon);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // accuracy circle of latest
    const [cx, cy] = toXY(ref.lat, ref.lon);
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(4, ref.acc * pxPerM), 0, Math.PI * 2);
    ctx.fillStyle = "rgba(56,189,248,0.15)";
    ctx.fill();
    ctx.strokeStyle = "#38bdf8";
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#0ea5e9";
    ctx.fill();
  }, [fixes, geofenceOn, geofenceLat, geofenceLon, geofenceRadius, inside]);

  const latest = fixes[fixes.length - 1];

  return (
    <ToolPageShell toolId="geolocation-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Geolocation" left={trial.left} />

      {!supported && (
        <div className="mb-4 rounded-xl border border-amber-400/40 bg-amber-50 p-4 text-sm dark:bg-amber-950/30">
          Your browser does not expose <code>navigator.geolocation</code>. Use a modern browser with location support.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">Controls</h3>
            <span className={cn(
              "rounded-full px-2.5 py-1 text-xs font-bold",
              perm === "granted" ? "bg-green-500/15 text-green-600" : perm === "denied" ? "bg-red-500/15 text-red-500" : "bg-muted text-muted-foreground",
            )}>
              {perm === "granted" ? "Location granted" : perm === "denied" ? "Location blocked" : "Permission " + perm}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {!watching ? (
              <ActionButton disabled={!supported || !trial.canUse} onClick={startWatch}>
                <Play className="h-4 w-4" /> Start tracking
              </ActionButton>
            ) : (
              <ActionButton onClick={stopWatch}>
                <Square className="h-4 w-4" /> Stop tracking
              </ActionButton>
            )}
            <button
              type="button"
              onClick={singleFix}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-bold hover:border-primary/50"
            >
              <Crosshair className="h-4 w-4" /> Single fix
            </button>
            <button
              type="button"
              onClick={() => { setFixes([]); setEvents([]); }}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-bold hover:border-primary/50"
            >
              <Trash2 className="h-4 w-4" /> Clear
            </button>
          </div>

          <div className="rounded-xl border border-border p-4">
            <div className="mb-2 flex items-center gap-2 font-semibold">
              <Fence className="h-4 w-4 text-primary" /> Geofence
            </div>
            <label className="text-xs text-muted-foreground">Radius: {geofenceRadius}m</label>
            <input
              type="range" min={10} max={500} step={10} value={geofenceRadius}
              onChange={(e) => setGeofenceRadius(Number(e.target.value))}
              className="w-full"
            />
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={setGeofenceHere}
                className="rounded-lg bg-primary/10 px-3 py-2 text-xs font-bold text-primary hover:bg-primary/20"
              >
                {geofenceLat ? "Re-center on me" : "Arm at my position"}
              </button>
              {geofenceOn && (
                <button type="button" onClick={() => { setGeofenceOn(false); setInside(null); }} className="text-xs font-bold text-muted-foreground hover:text-foreground">
                  Disarm
                </button>
              )}
            </div>
            {geofenceOn && (
              <p className="mt-2 text-xs text-muted-foreground">
                Status: {inside === null ? "waiting for next fix" : inside ? "inside the fence" : "outside the fence"}
              </p>
            )}
            <p className="mt-2 text-[11px] text-muted-foreground">
              The browser has no geofence API, so this is computed manually from each fix: enter/exit events fire when your distance to the center crosses the radius.
            </p>
          </div>

          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free runs left - fixes never leave your device.
            </p>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <canvas ref={canvasRef} width={640} height={360} className="h-auto w-full rounded-xl" />
            {latest && (
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                <div className="rounded-lg bg-muted p-2.5"><p className="text-muted-foreground">Latitude</p><p className="font-mono font-bold">{latest.lat.toFixed(6)}</p></div>
                <div className="rounded-lg bg-muted p-2.5"><p className="text-muted-foreground">Longitude</p><p className="font-mono font-bold">{latest.lon.toFixed(6)}</p></div>
                <div className="rounded-lg bg-muted p-2.5"><p className="text-muted-foreground">Accuracy</p><p className="font-mono font-bold">{Math.round(latest.acc)}m</p></div>
                <div className="rounded-lg bg-muted p-2.5"><p className="text-muted-foreground">Fixes</p><p className="font-mono font-bold">{fixes.length}</p></div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-3 font-bold">API event log</h3>
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground">watchPosition and geofence events will appear here with timestamps.</p>
            ) : (
              <ul className="max-h-56 space-y-1.5 overflow-auto text-sm">
                {events.map((e, i) => (
                  <li key={i} className="flex gap-2 rounded-lg bg-muted/60 px-3 py-1.5">
                    <span className="font-mono text-xs text-muted-foreground">{fmtClock(e.t)}</span>
                    <span className={cn("text-xs", e.kind === "warn" && "text-amber-600", e.kind === "ok" && "text-green-600")}>{e.msg}</span>
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

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export default GeolocationPlayground;
