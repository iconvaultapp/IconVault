// /tools/gamepad-playground - Real Gamepad API lab: live button/axis viewer,
// connection events and a vibrationActuator rumble test. Never fakes input.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Gamepad2, Trash2, Vibrate } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/gamepad-playground";
import toolSeoMeta from "@/lib/tool-seo-meta-data/gamepad-playground";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/gamepad-playground")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/gamepad-playground";
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
  component: GamepadTool,
});

type PadSnapshot = {
  id: string;
  index: number;
  mapping: string;
  connected: boolean;
  buttons: { pressed: boolean; value: number }[];
  axes: number[];
  timestamp: number;
  hasRumble: boolean;
};

const BUTTON_LABELS = [
  "A", "B", "X", "Y",
  "LB", "RB", "LT", "RT",
  "Back", "Start", "L3", "R3",
  "Up", "Down", "Left", "Right",
  "Home",
];

function GamepadTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("gamepad-playground", isPro);
  const seo = toolSeo;

  const [supported] = useState(() => typeof navigator !== "undefined" && "getGamepads" in navigator);
  const [pad, setPad] = useState<PadSnapshot | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [rumbleBusy, setRumbleBusy] = useState(false);
  const [duration, setDuration] = useState(800);
  const [strong, setStrong] = useState(1);
  const [weak, setWeak] = useState(0.4);
  const rafRef = useRef<number | null>(null);
  const padIndexRef = useRef<number | null>(null);

  const push = useCallback((text: string) => {
    setLog((p) => [...p.slice(-40), `[${new Date().toLocaleTimeString()}] ${text}`]);
  }, []);

  const poll = useCallback(() => {
    const gps = navigator.getGamepads ? navigator.getGamepads() : [];
    let gp: Gamepad | null = null;
    if (padIndexRef.current !== null) {
      gp = gps[padIndexRef.current] ?? null;
    }
    if (!gp) {
      for (const g of gps) {
        if (g && g.connected) {
          gp = g;
          break;
        }
      }
    }
    if (gp && gp.connected) {
      padIndexRef.current = gp.index;
      const actuator = (gp as Gamepad & { vibrationActuator?: { playEffect: (t: string, p: object) => Promise<string> } | null }).vibrationActuator;
      setPad({
        id: gp.id,
        index: gp.index,
        mapping: gp.mapping,
        connected: gp.connected,
        buttons: gp.buttons.map((b) => ({ pressed: b.pressed, value: b.value })),
        axes: [...gp.axes],
        timestamp: gp.timestamp,
        hasRumble: !!actuator,
      });
    } else {
      padIndexRef.current = null;
      setPad(null);
    }
    rafRef.current = requestAnimationFrame(poll);
  }, []);

  useEffect(() => {
    if (!supported) return;
    const onConnect = (e: GamepadEvent) => {
      push(`connected: ${e.gamepad.id} (index ${e.gamepad.index})`);
      toast.success("Gamepad connected");
    };
    const onDisconnect = (e: GamepadEvent) => {
      push(`disconnected: index ${e.gamepad.index}`);
      padIndexRef.current = null;
      setPad(null);
      toast("Gamepad disconnected");
    };
    window.addEventListener("gamepadconnected", onConnect);
    window.addEventListener("gamepaddisconnected", onDisconnect);
    rafRef.current = requestAnimationFrame(poll);
    return () => {
      window.removeEventListener("gamepadconnected", onConnect);
      window.removeEventListener("gamepaddisconnected", onDisconnect);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [supported, poll, push]);

  const rumble = useCallback(async () => {
    if (!trial.canUse || rumbleBusy) return;
    const gps = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = (padIndexRef.current !== null ? gps[padIndexRef.current] : null) ?? null;
    if (!gp) {
      toast.error("No gamepad is connected.");
      return;
    }
    const actuator = (gp as Gamepad & { vibrationActuator?: { playEffect: (t: string, p: object) => Promise<string> } | null }).vibrationActuator;
    if (!actuator) {
      push("rumble: this gamepad exposes no vibrationActuator");
      toast.error("This gamepad has no rumble actuator.");
      return;
    }
    setRumbleBusy(true);
    try {
      const result = await actuator.playEffect("dual-rumble", {
        duration,
        strongMagnitude: strong,
        weakMagnitude: weak,
      });
      trial.recordUse();
      push(`rumble: playEffect("dual-rumble", ${duration}ms, strong=${strong}, weak=${weak}) -> ${result}`);
      toast.success("Rumble effect played");
    } catch (e) {
      push(`rumble failed: ${e instanceof Error ? e.message : String(e)}`);
      toast.error(e instanceof Error ? e.message : "Rumble failed.");
    } finally {
      setRumbleBusy(false);
    }
  }, [trial, rumbleBusy, duration, strong, weak, push]);

  const pressedCount = pad?.buttons.filter((b) => b.pressed).length ?? 0;

  return (
    <ToolPageShell toolId="gamepad-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Gamepad" left={trial.left} />

      {!supported && (
        <div className="mb-6 rounded-2xl border border-amber-400/50 bg-amber-50 p-5 text-sm dark:bg-amber-950/20">
          <p className="font-bold">The Gamepad API is not supported in this browser.</p>
          <p className="mt-1 text-muted-foreground">It is available in all modern desktop browsers. Try Chrome, Edge or Firefox on a computer.</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5">
          <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <Gamepad2 className="h-5 w-5 text-primary" />
              <h3 className="font-bold">Rumble test</h3>
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between text-[13px]">
                <span className="font-medium text-foreground/80">Duration</span>
                <span className="font-mono text-muted-foreground">{duration} ms</span>
              </div>
              <input type="range" min={100} max={3000} step={100} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full accent-primary" />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between text-[13px]">
                <span className="font-medium text-foreground/80">Strong motor</span>
                <span className="font-mono text-muted-foreground">{strong.toFixed(1)}</span>
              </div>
              <input type="range" min={0} max={1} step={0.1} value={strong} onChange={(e) => setStrong(Number(e.target.value))} className="w-full accent-primary" />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between text-[13px]">
                <span className="font-medium text-foreground/80">Weak motor</span>
                <span className="font-mono text-muted-foreground">{weak.toFixed(1)}</span>
              </div>
              <input type="range" min={0} max={1} step={0.1} value={weak} onChange={(e) => setWeak(Number(e.target.value))} className="w-full accent-primary" />
            </div>
            <ActionButton busy={rumbleBusy} disabled={!trial.canUse || !pad} onClick={() => void rumble()}>
              <Vibrate className="h-4 w-4" /> {rumbleBusy ? "Rumbling..." : "Play rumble effect"}
            </ActionButton>
            {!isPro && <p className="text-xs text-muted-foreground">{trial.left} of 5 free rumble tests left.</p>}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold">Connection log</h3>
              <button
                type="button"
                onClick={() => setLog([])}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:border-primary/40"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear
              </button>
            </div>
            <div className="h-40 space-y-1.5 overflow-y-auto rounded-xl bg-background p-3 font-mono text-xs">
              {log.length === 0 && <p className="text-muted-foreground">Connect or disconnect a gamepad to see events.</p>}
              {log.map((l, i) => (
                <p key={i} className="text-foreground/80">{l}</p>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {!pad ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
              <Gamepad2 className="mb-4 h-14 w-14 text-muted-foreground/40" />
              <p className="text-lg font-extrabold">No gamepad detected</p>
              <ol className="mt-3 max-w-sm list-decimal space-y-1.5 pl-5 text-left text-sm text-muted-foreground">
                <li>Connect a gamepad over USB or Bluetooth.</li>
                <li>Press any button on the gamepad (browsers only expose it after input).</li>
                <li>Buttons and sticks will light up here in real time.</li>
              </ol>
              <p className="mt-4 max-w-sm text-xs text-muted-foreground">
                This page reads the real Gamepad API. With nothing connected there is nothing to show, and this page will not pretend otherwise.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <h3 className="font-bold">Connected gamepad</h3>
                <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{pad.id}</p>
                <div className="mt-2 flex flex-wrap gap-2 font-mono text-xs">
                  <span className="rounded-lg bg-background px-2.5 py-1">index {pad.index}</span>
                  <span className="rounded-lg bg-background px-2.5 py-1">mapping: {pad.mapping || "none"}</span>
                  <span className="rounded-lg bg-background px-2.5 py-1">buttons pressed: {pressedCount}</span>
                  <span className={cn("rounded-lg px-2.5 py-1", pad.hasRumble ? "bg-emerald-500/15 text-emerald-500" : "bg-background text-muted-foreground")}>
                    rumble: {pad.hasRumble ? "available" : "not exposed"}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-sm font-bold">Buttons ({pad.buttons.length})</h4>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {pad.buttons.map((b, i) => (
                    <div
                      key={i}
                      className={cn(
                        "rounded-xl border px-2 py-2.5 text-center transition",
                        b.pressed ? "border-primary bg-primary text-primary-foreground shadow" : "border-border bg-background",
                      )}
                    >
                      <p className="text-xs font-extrabold">{BUTTON_LABELS[i] ?? `#${i}`}</p>
                      <p className={cn("font-mono text-[10px]", b.pressed ? "text-primary-foreground/80" : "text-muted-foreground")}>
                        {b.value.toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-sm font-bold">Axes ({pad.axes.length})</h4>
                <div className="space-y-2">
                  {pad.axes.map((v, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-16 font-mono text-xs text-muted-foreground">axis {i}</span>
                      <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-background">
                        <div className="absolute left-1/2 top-0 h-full w-px bg-border" />
                        <div
                          className="absolute top-0 h-full rounded-full bg-primary transition-[left,width] duration-75"
                          style={v >= 0 ? { left: "50%", width: `${v * 50}%` } : { left: `${50 + v * 50}%`, width: `${-v * 50}%` }}
                        />
                      </div>
                      <span className="w-14 text-right font-mono text-xs">{v.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Polled every animation frame from navigator.getGamepads(). Analog triggers show partial values between 0 and 1.
              </p>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
