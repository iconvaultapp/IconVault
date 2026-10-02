// /tools/wake-lock-playground - Real Screen Wake Lock API playground:
// request/release a screen wake lock, watch it auto-release on tab hide,
// and re-acquire it on return. 100% client-side, no fake state.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Zap, ZapOff, RotateCcw, Trash2, Info } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/wake-lock-playground")({
  head: () => {
    const seo = getToolSeoMeta("wake-lock-playground");
    const canonical = "https://iconvault.site/tools/wake-lock-playground";
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
  component: WakeLockTool,
});

interface LogEntry {
  t: string;
  msg: string;
}

function fmtElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor(s / 60) % 60;
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

function WakeLockTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("wake-lock-playground", isPro);
  const seo = getToolSeo("wake-lock-playground");

  const [supported] = useState<boolean>(() =>
    typeof navigator !== "undefined" && "wakeLock" in navigator,
  );
  const [active, setActive] = useState(false);
  const [heldSince, setHeldSince] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [autoReacquire, setAutoReacquire] = useState(true);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const sentinelRef = useRef<WakeLockSentinel | null>(null);
  const autoRef = useRef(autoReacquire);
  autoRef.current = autoReacquire;

  const addLog = useCallback((msg: string) => {
    setLog((p) => [{ t: new Date().toLocaleTimeString(), msg }, ...p].slice(0, 80));
  }, []);

  const releaseQuietly = useCallback(() => {
    const s = sentinelRef.current;
    sentinelRef.current = null;
    if (s && !s.released) {
      void s.release().catch(() => undefined);
    }
  }, []);

  const requestLock = useCallback(async () => {
    if (busy || !trial.canUse) return;
    if (!supported) {
      toast.error("Wake Lock API is not supported in this browser.");
      return;
    }
    setBusy(true);
    try {
      releaseQuietly();
      const sentinel = await navigator.wakeLock.request("screen");
      sentinelRef.current = sentinel;
      sentinel.addEventListener("release", () => {
        if (sentinelRef.current === sentinel) {
          sentinelRef.current = null;
          setActive(false);
          setHeldSince(null);
          addLog("Lock released (release event fired).");
        }
      });
      setActive(true);
      setHeldSince(Date.now());
      addLog("Screen wake lock acquired.");
      trial.recordUse();
      toast.success("Wake lock active: screen will stay on.");
    } catch (e) {
      const name = e instanceof Error ? e.name : "Error";
      const msg = e instanceof Error ? e.message : "Request failed.";
      addLog(`Request failed [${name}]: ${msg}`);
      toast.error(`Could not acquire wake lock (${name}).`);
    } finally {
      setBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, trial, supported, addLog, releaseQuietly]);

  const releaseLock = useCallback(() => {
    const s = sentinelRef.current;
    if (!s) return;
    addLog("Releasing lock on user request.");
    releaseQuietly();
    setActive(false);
    setHeldSince(null);
    toast.info("Wake lock released.");
  }, [addLog, releaseQuietly]);

  // Ticking clock while the lock is held.
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [active ]);

  // Visibility handling: the browser releases the lock when the tab hides.
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        addLog("Tab hidden: the browser releases the wake lock automatically.");
      } else {
        addLog("Tab visible again.");
        if (autoRef.current && sentinelRef.current === null && supported) {
          addLog("Auto re-acquiring wake lock...");
          void (async () => {
            try {
              const sentinel = await navigator.wakeLock.request("screen");
              sentinelRef.current = sentinel;
              sentinel.addEventListener("release", () => {
                if (sentinelRef.current === sentinel) {
                  sentinelRef.current = null;
                  setActive(false);
                  setHeldSince(null);
                  addLog("Lock released (release event fired).");
                }
              });
              setActive(true);
              setHeldSince(Date.now());
              addLog("Wake lock re-acquired after tab became visible.");
            } catch {
              addLog("Auto re-acquire failed (browser may require a user gesture).");
              setActive(false);
              setHeldSince(null);
            }
          })();
        } else if (sentinelRef.current === null) {
          setActive(false);
          setHeldSince(null);
        }
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [addLog, supported]);

  // Release on unmount.
  useEffect(() => () => releaseQuietly(), [releaseQuietly]);

  return (
    <ToolPageShell toolId="wake-lock-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Wake Lock" left={trial.left} />

      {!supported && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <p className="text-sm">
            <strong>Wake Lock is not available in this browser.</strong> It needs Chrome/Edge 84+,
            Safari 16.4+ or Opera, served over HTTPS or localhost. The controls below will report
            the failure honestly instead of pretending.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Controls</h2>
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-bold",
                supported ? "bg-emerald-500/15 text-emerald-600" : "bg-red-500/15 text-red-500",
              )}
            >
              {supported ? "API supported" : "API missing"}
            </span>
          </div>

          <div className="flex gap-2">
            <ActionButton
              busy={busy}
              disabled={!supported || active || !trial.canUse}
              onClick={() => void requestLock()}
            >
              <Zap className="h-4 w-4" /> {busy ? "Requesting…" : "Request wake lock"}
            </ActionButton>
            <button
              type="button"
              onClick={releaseLock}
              disabled={!active}
              className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ZapOff className="h-4 w-4" /> Release
            </button>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3">
            <input
              type="checkbox"
              checked={autoReacquire}
              onChange={(e) => setAutoReacquire(e.target.checked)}
              className="mt-1 h-4 w-4 accent-primary"
            />
            <span className="text-sm">
              <span className="font-semibold">Auto re-acquire on return</span>
              <span className="block text-xs text-muted-foreground">
                When the tab becomes visible again, request a fresh lock automatically.
              </span>
            </span>
          </label>

          <button
            type="button"
            onClick={() => setLog([])}
            className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear log
          </button>

          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free lock requests left. Everything runs in your
              browser.
            </p>
          )}

          <div className="rounded-xl bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
            <p className="mb-1 font-semibold text-foreground/80">Try this</p>
            <ol className="list-decimal space-y-1 pl-4">
              <li>Request the lock, then switch to another tab for 10 seconds.</li>
              <li>Come back and watch the log: the lock was released while hidden.</li>
              <li>With auto re-acquire on, it comes back by itself.</li>
            </ol>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex flex-wrap items-center gap-4">
              <span
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-2xl",
                  active ? "bg-emerald-500/15 text-emerald-500" : "bg-muted text-muted-foreground",
                )}
              >
                {active ? <Zap className="h-7 w-7" /> : <ZapOff className="h-7 w-7" />}
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Screen wake lock
                </p>
                <p className={cn("text-2xl font-extrabold", active ? "text-emerald-500" : "")}>
                  {active ? "ACTIVE" : "RELEASED"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {active && heldSince !== null
                    ? `Held for ${fmtElapsed(now - heldSince)} - your screen will not dim or sleep.`
                    : "No lock held. Your device may dim and sleep normally."}
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              {[
                { k: "Type", v: "screen" },
                { k: "Auto re-acquire", v: autoReacquire ? "on" : "off" },
                { k: "Sentinel released", v: sentinelRef.current ? "no" : "yes" },
              ].map((s) => (
                <div key={s.k} className="rounded-xl bg-muted/60 px-3 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {s.k}
                  </p>
                  <p className="text-sm font-bold">{s.v}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Event log</h2>
            </div>
            {log.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Request a lock to start logging acquire, release and visibility events.
              </p>
            ) : (
              <ul className="max-h-64 space-y-1.5 overflow-y-auto font-mono text-xs">
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
