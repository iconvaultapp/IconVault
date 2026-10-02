// /tools/periodic-sync-playground - Learn Periodic Background Sync: register tags,
// read real registered tags, and watch a sync-event timeline simulation. The real
// API needs an installed PWA + permission; this lab detects what is possible and
// simulates the rest honestly, fully in-browser.

import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { RefreshCcw, Timer, Play, RotateCcw, Info } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/periodic-sync-playground")({
  head: () => {
    const seo = getToolSeoMeta("periodic-sync-playground");
    const canonical = "https://iconvault.site/tools/periodic-sync-playground";
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
  component: PeriodicSyncPlayground,
});

interface Capability {
  label: string;
  value: string;
  ok: boolean;
}

interface SyncEvent {
  n: number;
  at: string;
  minIntervalMin: number;
}

const now = () => new Date().toLocaleTimeString();

function PeriodicSyncPlayground() {
  const { isPro } = usePlan();
  const trial = useToolTrial("periodic-sync-playground", isPro);
  const seo = getToolSeo("periodic-sync-playground");

  const [caps, setCaps] = useState<Capability[] | null>(null);
  const [realTags, setRealTags] = useState<string[] | null>(null);
  const [permState, setPermState] = useState<string | null>(null);
  const [tag, setTag] = useState("content-refresh");
  const [minIntervalMin, setMinIntervalMin] = useState(30);
  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState<SyncEvent[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const eventsRef = useRef(0);

  const stop = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setRunning(false);
  };

  const detect = async () => {
    const out: Capability[] = [];
    const hasSW = typeof navigator !== "undefined" && "serviceWorker" in navigator;
    out.push({ label: "Service worker API", value: hasSW ? "available" : "unavailable", ok: hasSW });
    let psync = false;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      psync = typeof (ServiceWorkerRegistration.prototype as any).periodicSync !== "undefined";
    } catch { psync = false; }
    out.push({ label: "PeriodicSync manager", value: psync ? "supported" : "not supported here", ok: psync });
    out.push({ label: "Secure context", value: window.isSecureContext ? "yes" : "no - required", ok: window.isSecureContext });
    out.push({ label: "Installed PWA", value: "required for real sync (check via Chrome DevTools > Application)", ok: false });
    setCaps(out);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await (navigator.permissions as any).query({ name: "periodic-background-sync" });
      setPermState(res.state as string);
    } catch {
      setPermState("unsupported");
    }

    if (hasSW) {
      try {
        const reg = await navigator.serviceWorker.ready;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tags = await (reg as any).periodicSync.getTags();
        setRealTags(tags as string[]);
      } catch {
        setRealTags(null);
      }
    } else {
      setRealTags(null);
    }
  };

  useEffect(() => {
    void detect();
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const registerTag = async () => {
    if (!trial.canUse || running) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mgr = (reg as any).periodicSync;
      if (!mgr) {
        toast.error("periodicSync is not supported in this browser");
        return;
      }
      await mgr.register(tag, { minInterval: minIntervalMin * 60 * 1000 });
      const tags = await mgr.getTags();
      setRealTags(tags as string[]);
      pushEvent(`Tag "${tag}" registered for real (minInterval ${minIntervalMin} min)`);
      trial.recordUse();
      toast.success(`Registered "${tag}"`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Registration failed";
      pushEvent(`Registration failed: ${msg}`);
      toast.error(msg.includes("Permission") ? "Permission denied - try installing this site as a PWA first" : msg);
    }
  };

  const pushEvent = (at: string) => {
    eventsRef.current += 1;
    const n = eventsRef.current;
    setEvents((p) => [...p.slice(-29), { n, at, minIntervalMin }]);
  };

  const startSimulation = () => {
    if (!trial.canUse || running) return;
    stop();
    eventsRef.current = 0;
    setEvents([]);
    setElapsed(0);
    setRunning(true);
    // Simulated clock: 1 real second = 1 sync-interval minute, so the timeline is watchable
    const tickMs = 1000;
    const firesEvery = Math.max(2, Math.round(minIntervalMin / 5));
    let ticks = 0;
    pushEvent(`Simulation started: interval ${minIntervalMin} min compressed to ${firesEvery}s of real time`);
    timerRef.current = setInterval(() => {
      ticks += 1;
      setElapsed(ticks);
      if (ticks % firesEvery === 0) {
        pushEvent(`periodicsync event fired for "${tag}" (${now()})`);
      }
    }, tickMs);
    trial.recordUse();
    toast.success("Timeline simulation running");
  };

  const reset = () => {
    stop();
    eventsRef.current = 0;
    setEvents([]);
    setElapsed(0);
  };

  const exportTimeline = () => {
    const text = events.map((e) => `#${e.n} ${e.at}`).join("\n");
    downloadBlob(new Blob([text || "No events yet"], { type: "text/plain" }), "periodic-sync-timeline.txt");
    toast.success("Timeline downloaded");
  };

  return (
    <ToolPageShell toolId="periodic-sync-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Periodic Background Sync" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-sm font-bold">Real capability check</p>
            <div className="space-y-1.5">
              {(caps ?? []).map((c) => (
                <div key={c.label} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-[13px]">
                  <span className="text-muted-foreground">{c.label}</span>
                  <span className={cn("font-bold", c.ok ? "text-green-600" : "text-amber-600")}>{c.value}</span>
                </div>
              ))}
              {permState && (
                <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-[13px]">
                  <span className="text-muted-foreground">periodic-background-sync permission</span>
                  <span className={cn("font-bold", permState === "granted" ? "text-green-600" : "text-amber-600")}>{permState}</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-bold">Tag + interval</p>
            <input
              value={tag}
              onChange={(e) => setTag(e.target.value.replace(/[^a-z0-9-]/gi, "").slice(0, 32))}
              className="mb-3 w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm"
              placeholder="content-refresh"
            />
            <label className="mb-1 flex items-center justify-between text-sm font-bold">
              Min interval <span className="text-primary">{minIntervalMin} min</span>
            </label>
            <input
              type="range" min={1} max={120} value={minIntervalMin}
              onChange={(e) => setMinIntervalMin(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <p className="mt-1 text-xs text-muted-foreground">The browser only guarantees "at least" this often, never exact timing.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <ActionButton busy={false} disabled={!trial.canUse || running} onClick={registerTag}>
              <RefreshCcw className="h-4 w-4" /> Register real tag
            </ActionButton>
            <ActionButton busy={false} disabled={!trial.canUse || running} onClick={startSimulation}>
              <Play className="h-4 w-4" /> Simulate timeline
            </ActionButton>
          </div>
          {running && (
            <button type="button" onClick={reset} className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
              <RotateCcw className="h-3.5 w-3.5" /> Stop simulation
            </button>
          )}

          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-muted-foreground">
            <p className="mb-1 flex items-center gap-1.5 font-bold text-foreground/80"><Info className="h-3.5 w-3.5" /> Honest sandbox note</p>
            <p>
              Real periodic sync only fires on an installed PWA over HTTPS with the
              periodic-background-sync permission granted (Chrome decides based on engagement).
              The timeline compresses minutes into seconds so you can watch the rhythm.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 text-sm font-bold">Registered tags on this origin (real)</p>
            {realTags === null ? (
              <p className="text-sm text-muted-foreground">No service worker context here, or periodicSync unavailable. Nothing registered.</p>
            ) : realTags.length === 0 ? (
              <p className="text-sm text-muted-foreground">None yet. Register one to see it here.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {realTags.map((t) => (
                  <span key={t} className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 font-mono text-xs font-bold text-primary">{t}</span>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-bold">
                <Timer className="h-4 w-4" /> Sync event timeline
                {running && <span className="text-xs font-normal text-muted-foreground">- {elapsed}s elapsed</span>}
              </p>
              <button type="button" onClick={exportTimeline} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:border-primary/40">
                Download timeline
              </button>
            </div>
            <div className="max-h-72 space-y-1.5 overflow-y-auto font-mono text-xs">
              {events.length === 0 && <p className="text-muted-foreground">Register a tag or start the simulation to see events.</p>}
              {events.map((e) => (
                <div key={e.n} className={cn("rounded-lg px-3 py-2", e.at.includes("fired") ? "bg-green-500/10 text-green-700 dark:text-green-300" : "bg-muted/40 text-foreground/80")}>
                  <span className="font-bold">#{e.n}</span> {e.at}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
