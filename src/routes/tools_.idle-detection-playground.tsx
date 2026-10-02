// /tools/idle-detection-playground - Interactive Idle Detection API lab: user and
// screen idle state, permission flow, threshold control and live event timeline.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Moon, Play, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/idle-detection-playground")({
  head: () => {
    const seo = getToolSeoMeta("idle-detection-playground");
    const canonical = "https://iconvault.site/tools/idle-detection-playground";
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
  component: IdleTool,
});

interface IdleDetectorLike {
  userState: string | null;
  screenState: string | null;
  addEventListener(t: string, cb: () => void): void;
  removeEventListener(t: string, cb: () => void): void;
  start(opts: { threshold: number }): Promise<void>;
}

interface IdleEvt {
  t: number;
  msg: string;
  kind: "user" | "screen" | "info" | "warn";
}

function getIdleDetector(): (new () => IdleDetectorLike) | null {
  const w = window as unknown as Record<string, unknown>;
  return (w["IdleDetector"] as (new () => IdleDetectorLike) | undefined) ?? null;
}

function IdleTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("idle-detection-playground", isPro);
  const seo = getToolSeo("idle-detection-playground");

  const [supported] = useState(() => getIdleDetector() !== null);
  const [perm, setPerm] = useState<string>("unknown");
  const [running, setRunning] = useState(false);
  const [thresholdSec, setThresholdSec] = useState(10);
  const [userState, setUserState] = useState("unknown");
  const [screenState, setScreenState] = useState("unknown");
  const [events, setEvents] = useState<IdleEvt[]>([]);
  const detectorRef = useRef<IdleDetectorLike | null>(null);

  const log = useCallback((msg: string, kind: IdleEvt["kind"] = "info") => {
    setEvents((p) => [{ t: Date.now(), msg, kind }, ...p].slice(0, 80));
  }, []);

  const refreshPerm = useCallback(async () => {
    try {
      const w = window as unknown as Record<string, unknown>;
      const cls = w["IdleDetector"] as { requestPermission?: () => Promise<string> } | undefined;
      if (typeof cls?.requestPermission !== "function") { setPerm("unavailable"); return; }
      const st = await cls.requestPermission();
      setPerm(st);
    } catch { setPerm("unavailable"); }
  }, []);

  useEffect(() => { void refreshPerm(); }, [refreshPerm]);

  const start = useCallback(async () => {
    const Cls = getIdleDetector();
    if (!Cls) { toast.error("IdleDetector is not supported in this browser"); return; }
    if (!trial.canUse) { toast.error("Free trial exhausted - go Pro for unlimited runs"); return; }
    try {
      const d = new Cls();
      const onChange = () => {
        setUserState(d.userState ?? "unknown");
        setScreenState(d.screenState ?? "unknown");
        log(`Change: user=${d.userState ?? "?"}, screen=${d.screenState ?? "?"}`, "user");
      };
      d.addEventListener("change", onChange);
      await d.start({ threshold: thresholdSec * 1000 });
      detectorRef.current = d;
      setUserState(d.userState ?? "unknown");
      setScreenState(d.screenState ?? "unknown");
      setRunning(true);
      trial.recordUse();
      log(`IdleDetector started with threshold ${thresholdSec}s. Now stop touching the page to go idle.`, "info");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not start idle detection";
      log(msg, "warn");
      toast.error("Idle detection failed", { description: msg });
    }
  }, [thresholdSec, trial, log]);

  const stop = useCallback(() => {
    setRunning(false);
    setUserState("unknown");
    setScreenState("unknown");
    detectorRef.current = null;
    log("Idle detection stopped", "info");
  }, [log]);

  const fmt = (t: number) => new Date(t).toLocaleTimeString();

  const statePill = (v: string, idleLabel: string) => (
    <span className={cn(
      "rounded-full px-2.5 py-1 text-xs font-bold",
      v === "idle" ? "bg-amber-500/15 text-amber-600" : v === "locked" ? "bg-purple-500/15 text-purple-500" : v === "active" ? "bg-green-500/15 text-green-600" : "bg-muted text-muted-foreground",
    )}>
      {v === "idle" ? idleLabel : v}
    </span>
  );

  return (
    <ToolPageShell toolId="idle-detection-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Idle Detection" left={trial.left} />

      {!supported && (
        <div className="mb-4 rounded-xl border border-amber-400/40 bg-amber-50 p-4 text-sm dark:bg-amber-950/30">
          <strong>IdleDetector is not available here.</strong> It is Chrome/Edge only (behind the experimental web platform flag on some builds) and requires a secure context. The explainer below still shows how the API works.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">Controls</h3>
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground">permission: {perm}</span>
          </div>

          <button
            type="button"
            onClick={() => void refreshPerm()}
            className="w-full rounded-xl border border-border px-4 py-2.5 text-sm font-bold hover:border-primary/50"
          >
            <Moon className="mr-2 inline h-4 w-4" /> Request idle-detection permission
          </button>

          <div>
            <label className="mb-1 block text-[13px] font-medium text-foreground/80">
              Idle threshold: {thresholdSec}s
            </label>
            <input
              type="range" min={5} max={120} step={5} value={thresholdSec}
              onChange={(e) => setThresholdSec(Number(e.target.value))}
              disabled={running}
              className="w-full"
            />
            <p className="mt-1 text-xs text-muted-foreground">Time without input before userState flips to idle (min 1 minute in real specs; browsers may clamp lower values).</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {!running ? (
              <ActionButton disabled={!supported || !trial.canUse} onClick={() => void start()}>
                <Play className="h-4 w-4" /> Start detecting
              </ActionButton>
            ) : (
              <ActionButton onClick={stop}>
                <Square className="h-4 w-4" /> Stop
              </ActionButton>
            )}
            <button
              type="button"
              onClick={() => setEvents([])}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-bold hover:border-primary/50"
            >
              <Trash2 className="h-4 w-4" /> Clear log
            </button>
          </div>

          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free runs left - detection stays on your device.
            </p>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-3 font-bold">Live state</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-xl bg-muted/60 px-4 py-3">
                <span className="text-sm font-semibold">User state</span>
                {statePill(userState, "user idle")}
              </div>
              <div className="flex items-center justify-between rounded-xl bg-muted/60 px-4 py-3">
                <span className="text-sm font-semibold">Screen state</span>
                {statePill(screenState, "screen idle")}
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">How to test it</p>
              <ol className="mt-1 list-decimal space-y-1 pl-5 text-[13px]">
                <li>Press Start detecting (grant permission when asked).</li>
                <li>Stop touching keyboard, mouse and touch for longer than the threshold.</li>
                <li>Watch user state flip to idle, then move the mouse to see it flip back.</li>
                <li>Lock the screen or let it dim to see the screen state change.</li>
              </ol>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-3 font-bold">State change timeline</h3>
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground">Idle events will appear here as they fire.</p>
            ) : (
              <ul className="max-h-64 space-y-1.5 overflow-auto text-sm">
                {events.map((e, i) => (
                  <li key={i} className="flex gap-2 rounded-lg bg-muted/60 px-3 py-1.5">
                    <span className="font-mono text-xs text-muted-foreground">{fmt(e.t)}</span>
                    <span className={cn("text-xs", e.kind === "warn" ? "text-amber-600" : e.kind === "user" ? "text-sky-600" : e.kind === "screen" ? "text-purple-500" : "")}>{e.msg}</span>
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

export default IdleTool;
