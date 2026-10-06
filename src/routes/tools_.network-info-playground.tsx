// /tools/network-info-playground - Interactive Network Information API lab:
// effectiveType, downlink, RTT, saveData with live change log.

import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Activity, RefreshCw, Trash2, Wifi } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/network-info-playground";
import toolSeoMeta from "@/lib/tool-seo-meta-data/network-info-playground";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/network-info-playground")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/network-info-playground";
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
  component: NetworkTool,
});

interface ConnInfo {
  effectiveType: string;
  downlink: number | null;
  rtt: number | null;
  saveData: boolean | null;
  type: string;
}

interface ConnEvt {
  t: number;
  msg: string;
}

function readConnection(): { info: ConnInfo; supported: boolean } {
  const c = (navigator as unknown as { connection?: Record<string, unknown> }).connection;
  if (!c) return { supported: false, info: { effectiveType: "-", downlink: null, rtt: null, saveData: null, type: "-" } };
  return {
    supported: true,
    info: {
      effectiveType: typeof c["effectiveType"] === "string" ? c["effectiveType"] : "-",
      downlink: typeof c["downlink"] === "number" ? c["downlink"] : null,
      rtt: typeof c["rtt"] === "number" ? c["rtt"] : null,
      saveData: typeof c["saveData"] === "boolean" ? c["saveData"] : null,
      type: typeof c["type"] === "string" ? c["type"] : "-",
    },
  };
}

const TYPE_SPEED: Record<string, { label: string; pct: number }> = {
  "slow-2g": { label: "Slow 2G", pct: 12 },
  "2g": { label: "2G", pct: 28 },
  "3g": { label: "3G", pct: 55 },
  "4g": { label: "4G", pct: 92 },
};

function NetworkTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("network-info-playground", isPro);
  const seo = toolSeo;

  const [supported, setSupported] = useState(true);
  const [info, setInfo] = useState<ConnInfo>(readConnection().info);
  const [events, setEvents] = useState<ConnEvt[]>([]);

  const refresh = useCallback((why = "manual refresh") => {
    const { supported: ok, info: ci } = readConnection();
    setSupported(ok);
    setInfo(ci);
    if (ok) setEvents((p) => [{ t: Date.now(), msg: `${why}: ${ci.effectiveType}, ${ci.downlink ?? "?"} Mbps, rtt ${ci.rtt ?? "?"} ms, saveData=${ci.saveData}` }, ...p].slice(0, 50));
  }, []);

  useEffect(() => {
    refresh("initial read");
    const c = (navigator as unknown as { connection?: EventTarget & { addEventListener(t: string, cb: () => void): void; removeEventListener(t: string, cb: () => void): void } }).connection;
    if (!c) return;
    const onChange = () => refresh("connectionchange");
    c.addEventListener("change", onChange);
    return () => c.removeEventListener("change", onChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const speedTest = useCallback(async () => {
    if (!trial.canUse) { toast.error("Free trial exhausted - go Pro for unlimited runs"); return; }
    const start = performance.now();
    try {
      // 1MB cache-busted download from a reliable CDN to estimate throughput
      const res = await fetch("https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js", { cache: "no-store" });
      const blob = await res.blob();
      const secs = (performance.now() - start) / 1000;
      const mbps = (blob.size * 8) / (secs * 1e6);
      trial.recordUse();
      setEvents((p) => [{ t: Date.now(), msg: `Speed sample: ${(blob.size / 1024).toFixed(0)} KB in ${secs.toFixed(2)}s = ${mbps.toFixed(1)} Mbps (single sample, compare with navigator downlink estimate)` }, ...p].slice(0, 50));
      toast.success(`~${mbps.toFixed(1)} Mbps`, { description: "Measured against a live CDN fetch" });
    } catch {
      toast.error("Speed test failed - are you offline?");
    }
  }, [trial]);

  const gauge = TYPE_SPEED[info.effectiveType] ?? { label: info.effectiveType, pct: 50 };

  return (
    <ToolPageShell toolId="network-info-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Network Information" left={trial.left} />

      {!supported && (
        <div className="mb-4 rounded-xl border border-amber-400/40 bg-amber-50 p-4 text-sm dark:bg-amber-950/30">
          <strong>navigator.connection is not available here.</strong> Firefox and Safari do not expose the Network Information API. Chrome, Edge and Android browsers do.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <h3 className="flex items-center gap-2 font-bold"><Wifi className="h-4 w-4 text-primary" /> Readings</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-muted/60 p-3"><p className="text-xs text-muted-foreground">effectiveType</p><p className="font-mono text-lg font-bold">{info.effectiveType}</p></div>
            <div className="rounded-xl bg-muted/60 p-3"><p className="text-xs text-muted-foreground">type</p><p className="font-mono text-lg font-bold">{info.type}</p></div>
            <div className="rounded-xl bg-muted/60 p-3"><p className="text-xs text-muted-foreground">downlink</p><p className="font-mono text-lg font-bold">{info.downlink !== null ? `${info.downlink} Mbps` : "-"}</p></div>
            <div className="rounded-xl bg-muted/60 p-3"><p className="text-xs text-muted-foreground">rtt</p><p className="font-mono text-lg font-bold">{info.rtt !== null ? `${info.rtt} ms` : "-"}</p></div>
          </div>
          <div className={cn(
            "flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-bold",
            info.saveData ? "border-amber-400/50 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300" : "border-border",
          )}>
            <span>Data Saver (saveData)</span>
            <span className="font-mono">{info.saveData === null ? "unknown" : info.saveData ? "ON" : "off"}</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <ActionButton disabled={!trial.canUse} onClick={() => void speedTest()}>
              <Activity className="h-4 w-4" /> Run speed sample
            </ActionButton>
            <button
              type="button"
              onClick={() => refresh()}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-bold hover:border-primary/50"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </div>

          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free speed samples left - API reads are unlimited.
            </p>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-3 font-bold">Effective connection type</h3>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-bold">{gauge.label}</span>
              <span className="font-mono text-xs text-muted-foreground">estimated quality</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-500 via-sky-500 to-green-500 transition-all" style={{ width: `${gauge.pct}%` }} />
            </div>
            <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
              <div className="rounded-xl border border-border p-3">
                <p className="font-bold">Adaptive loading pattern</p>
                <pre className="mt-1 overflow-auto font-mono text-muted-foreground">{`if (navigator.connection.saveData ||
  navigator.connection.effectiveType === 'slow-2g') {
  // serve low-res images, skip autoplay
}`}</pre>
              </div>
              <div className="rounded-xl border border-border p-3">
                <p className="font-bold">How to trigger a change</p>
                <p className="mt-1 text-muted-foreground">Open DevTools - Network - throttling, or toggle Data Saver on Android. The connectionchange event and this dashboard update live.</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold">Change log</h3>
              <button type="button" onClick={() => setEvents([])} className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground">
                <Trash2 className="h-3.5 w-3.5" /> Clear
              </button>
            </div>
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground">Connection changes and speed samples will appear here.</p>
            ) : (
              <ul className="max-h-56 space-y-1.5 overflow-auto text-sm">
                {events.map((e, i) => (
                  <li key={i} className="flex gap-2 rounded-lg bg-muted/60 px-3 py-1.5">
                    <span className="font-mono text-xs text-muted-foreground">{new Date(e.t).toLocaleTimeString()}</span>
                    <span className="text-xs">{e.msg}</span>
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

export default NetworkTool;
