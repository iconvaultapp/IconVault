// /tools/launch-handler-playground - Interactive Launch Handler lab: real
// launchQueue consumer, launch parameter inspection and manifest generator.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Rocket, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/launch-handler-playground")({
  head: () => {
    const seo = getToolSeoMeta("launch-handler-playground");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: LaunchTool,
});

interface LaunchEvt {
  t: number;
  msg: string;
  kind: "info" | "ok" | "warn";
}

interface LaunchQueueLike {
  setConsumer(cb: (params: { targetURL: string; files?: unknown[] }) => void): void;
}

const CLIENT_MODES = ["auto", "focus-existing", "navigate-existing", "navigate-new"] as const;

function LaunchTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("launch-handler-playground", isPro);
  const seo = getToolSeo("launch-handler-playground");

  const [supported] = useState(() => typeof window !== "undefined" && "launchQueue" in window);
  const [clientMode, setClientMode] = useState<(typeof CLIENT_MODES)[number]>("auto");
  const [consumerArmed, setConsumerArmed] = useState(false);
  const [events, setEvents] = useState<LaunchEvt[]>([]);
  const [lastParams, setLastParams] = useState<{ targetURL: string; fileCount: number } | null>(null);
  const consumerSet = useRef(false);

  const log = useCallback((msg: string, kind: LaunchEvt["kind"] = "info") => {
    setEvents((p) => [{ t: Date.now(), msg, kind }, ...p].slice(0, 60));
  }, []);

  const armConsumer = useCallback(() => {
    const w = window as unknown as Record<string, unknown>;
    const lq = w["launchQueue"] as LaunchQueueLike | undefined;
    if (!lq) { toast.error("launchQueue is not available in this browser"); return; }
    if (!trial.canUse) { toast.error("Free trial exhausted - go Pro for unlimited runs"); return; }
    if (consumerSet.current) { toast.info("Consumer is already set for this page load"); return; }
    lq.setConsumer((params) => {
      const files = Array.isArray(params.files) ? params.files.length : 0;
      setLastParams({ targetURL: params.targetURL, fileCount: files });
      setEvents((p) => [{ t: Date.now(), msg: `Launch received: targetURL=${params.targetURL}${files ? `, files=${files}` : ""}`, kind: "ok" as const }, ...p].slice(0, 60));
      toast.success("Launch captured", { description: "launchQueue consumer fired with launch params" });
    });
    consumerSet.current = true;
    setConsumerArmed(true);
    trial.recordUse();
    log("launchQueue.setConsumer() registered. Launch events will now be captured.", "ok");
  }, [trial, log]);

  // Auto-register a passive consumer on mount so real launches are never missed
  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    const lq = w["launchQueue"] as LaunchQueueLike | undefined;
    if (!lq || consumerSet.current) return;
    lq.setConsumer((params) => {
      const files = Array.isArray(params.files) ? params.files.length : 0;
      setLastParams({ targetURL: params.targetURL, fileCount: files });
      setEvents((p) => [{ t: Date.now(), msg: `Launch received: targetURL=${params.targetURL}${files ? `, files=${files}` : ""}`, kind: "ok" as const }, ...p].slice(0, 60));
    });
    consumerSet.current = true;
    setConsumerArmed(true);
    log("Passive consumer auto-registered on page load (real launches are captured).", "info");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const manifest = `{
  "name": "My PWA",
  "start_url": "/",
  "display": "standalone",
  "launch_handler": {
    "client_mode": "${clientMode}"
  },
  "file_handlers": [
    {
      "action": "/open",
      "accept": { "image/*": [".png", ".jpg"] }
    }
  ]
}`;

  const copyManifest = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(manifest);
      toast.success("Manifest JSON copied");
    } catch {
      toast.error("Clipboard write failed - copy the code manually");
    }
  }, [manifest]);

  return (
    <ToolPageShell toolId="launch-handler-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Launch Handler" left={trial.left} />

      {!supported && (
        <div className="mb-4 rounded-xl border border-amber-400/40 bg-amber-50 p-4 text-sm dark:bg-amber-950/30">
          <strong>window.launchQueue is not available here.</strong> The Launch Handler API is Chrome/Edge on desktop. The manifest builder below still generates production-ready JSON.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <h3 className="mb-2 font-bold">launchQueue consumer</h3>
            <p className="text-xs text-muted-foreground">
              {consumerArmed
                ? "Consumer is armed for this page load. Real PWA launches (dock/taskbar icon, file open, shared content) will be captured below."
                : "Register a consumer to capture launch parameters."}
            </p>
            <ActionButton disabled={!supported || !trial.canUse || consumerArmed} onClick={armConsumer}>
              <Rocket className="h-4 w-4" /> {consumerArmed ? "Consumer armed" : "Arm consumer (trial run)"}
            </ActionButton>
          </div>

          <div>
            <label className="mb-1 block text-[13px] font-medium text-foreground/80">launch_handler client_mode</label>
            <div className="grid grid-cols-2 gap-2">
              {CLIENT_MODES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setClientMode(m)}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 font-mono text-xs font-bold transition",
                    clientMode === m ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              <li><strong>auto</strong>: browser picks the default window behavior.</li>
              <li><strong>focus-existing</strong>: reuse a window if one is open.</li>
              <li><strong>navigate-existing</strong>: navigate an existing window to the launch URL.</li>
              <li><strong>navigate-new</strong>: always open a new window.</li>
            </ul>
          </div>

          <button
            type="button"
            onClick={() => setEvents([])}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-bold hover:border-primary/50"
          >
            <Trash2 className="h-4 w-4" /> Clear log
          </button>

          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free consumer runs left.
            </p>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-3 font-bold">Last captured launch params</h3>
            {lastParams ? (
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <div className="rounded-lg bg-muted/60 p-3">
                  <p className="text-xs text-muted-foreground">targetURL</p>
                  <p className="break-all font-mono font-bold">{lastParams.targetURL}</p>
                </div>
                <div className="rounded-lg bg-muted/60 p-3">
                  <p className="text-xs text-muted-foreground">files</p>
                  <p className="font-mono font-bold">{lastParams.fileCount} FileSystemHandle(s)</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No launch captured yet. Honest note: a real launch only fires when this page runs as an installed PWA and the OS launches it (taskbar icon, file open, shared content, protocol handler). Opening a plain browser tab does not trigger launchQueue, which is exactly why the manifest generator below exists.
              </p>
            )}
            <ul className="mt-4 max-h-48 space-y-1.5 overflow-auto text-sm">
              {events.map((e, i) => (
                <li key={i} className="flex gap-2 rounded-lg bg-muted/60 px-3 py-1.5">
                  <span className="font-mono text-xs text-muted-foreground">{new Date(e.t).toLocaleTimeString()}</span>
                  <span className={cn("text-xs", e.kind === "warn" && "text-amber-600", e.kind === "ok" && "text-green-600")}>{e.msg}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold">Manifest generator</h3>
              <button
                type="button"
                onClick={() => void copyManifest()}
                className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-bold hover:border-primary/50"
              >
                <Copy className="h-4 w-4" /> Copy JSON
              </button>
            </div>
            <pre className="overflow-auto rounded-xl bg-[#0b1220] p-4 font-mono text-xs leading-relaxed text-slate-200">{manifest}</pre>
            <p className="mt-2 text-xs text-muted-foreground">
              Drop <code>launch_handler</code> into your web app manifest, install the PWA, then launch it from the OS to see the consumer above fire with real params.
            </p>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}

export default LaunchTool;
