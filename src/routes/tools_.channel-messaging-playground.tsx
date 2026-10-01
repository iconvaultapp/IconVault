// /tools/channel-messaging-playground - Real MessageChannel playground:
// entangled ports chatting in-page (with structured-clone proof and a
// DataCloneError demo) plus a port transferred to a real Web Worker.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle, Send, Unplug, Cpu, Info, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/channel-messaging-playground")({
  head: () => {
    const seo = getToolSeoMeta("channel-messaging-playground");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: ChannelMessagingTool,
});

interface LogEntry {
  t: string;
  text: string;
  tone: "in" | "out" | "sys" | "err";
}

const WORKER_CODE = `
let port = null;
onmessage = (e) => {
  if (e.data && e.data.type === "init" && e.ports && e.ports[0]) {
    port = e.ports[0];
    port.onmessage = (ev) => {
      port.postMessage({
        echo: ev.data,
        workerTime: new Date().toISOString(),
        thread: "worker"
      });
    };
    port.postMessage({ hello: "worker ready, port received", thread: "worker" });
  }
};
`;

function ChannelMessagingTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("channel-messaging-playground", isPro);
  const seo = getToolSeo("channel-messaging-playground");

  const [supported] = useState<boolean>(
    () => typeof MessageChannel !== "undefined" && typeof Worker !== "undefined",
  );
  const [portsLive, setPortsLive] = useState(false);
  const [workerLive, setWorkerLive] = useState(false);
  const [draftA, setDraftA] = useState("");
  const [draftB, setDraftB] = useState("");
  const [portLog, setPortLog] = useState<LogEntry[]>([]);
  const [workerLog, setWorkerLog] = useState<LogEntry[]>([]);
  const [busy, setBusy] = useState(false);

  const portA = useRef<MessagePort | null>(null);
  const portB = useRef<MessagePort | null>(null);
  const workerPort = useRef<MessagePort | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const seqRef = useRef(0);

  const addPortLog = useCallback((tone: LogEntry["tone"], text: string) => {
    setPortLog((p) => [{ t: new Date().toLocaleTimeString(), tone, text }, ...p].slice(0, 100));
  }, []);
  const addWorkerLog = useCallback((tone: LogEntry["tone"], text: string) => {
    setWorkerLog((p) => [{ t: new Date().toLocaleTimeString(), tone, text }, ...p].slice(0, 100));
  }, []);

  const connectPorts = useCallback(() => {
    if (busy || !trial.canUse || portsLive) return;
    setBusy(true);
    try {
      const mc = new MessageChannel();
      portA.current = mc.port1;
      portB.current = mc.port2;
      mc.port1.onmessage = (ev: MessageEvent) => {
        addPortLog("in", `Port A received: ${JSON.stringify(ev.data)}`);
      };
      mc.port2.onmessage = (ev: MessageEvent) => {
        addPortLog("in", `Port B received: ${JSON.stringify(ev.data)}`);
      };
      setPortsLive(true);
      addPortLog("sys", "MessageChannel created. Port A and Port B are entangled: each only hears the other.");
      trial.recordUse();
      toast.success("Ports connected.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create the channel.");
    } finally {
      setBusy(false);
    }
  }, [busy, trial, portsLive, addPortLog]);

  const closePorts = useCallback(() => {
    portA.current?.close();
    portB.current?.close();
    portA.current = null;
    portB.current = null;
    setPortsLive(false);
    addPortLog("sys", "Ports closed.");
  }, [addPortLog]);

  const sendVia = useCallback(
    (from: "A" | "B", text: string, clear: () => void) => {
      const msg = text.trim();
      if (!msg || !trial.canUse) return;
      const port = from === "A" ? portA.current : portB.current;
      if (!port) return;
      seqRef.current += 1;
      const payload = {
        from,
        seq: seqRef.current,
        text: msg,
        sentAt: new Date().toISOString(),
        nested: { chars: msg.length, words: msg.split(/\s+/).filter(Boolean).length },
      };
      try {
        port.postMessage(payload);
        addPortLog("out", `Port ${from} sent: ${JSON.stringify(payload)}`);
        clear();
        trial.recordUse();
      } catch (e) {
        addPortLog("err", `Send failed: ${e instanceof Error ? e.message : "unknown error"}`);
      }
    },
    [trial, addPortLog],
  );

  const sendFunction = useCallback(() => {
    const port = portA.current;
    if (!port) return;
    try {
      port.postMessage({ fn: () => "nope" });
      addPortLog("out", "Function posted?! (unexpected)");
    } catch (e) {
      addPortLog("err", `DataCloneError, as specified: ${e instanceof Error ? e.message : "cannot clone"}`);
      toast.info("Functions cannot cross a port: DataCloneError.");
    }
  }, [addPortLog]);

  const startWorker = useCallback(() => {
    if (workerLive) return;
    try {
      const blob = new Blob([WORKER_CODE], { type: "text/javascript" });
      const url = URL.createObjectURL(blob);
      const worker = new Worker(url);
      const mc = new MessageChannel();
      workerPort.current = mc.port1;
      mc.port1.onmessage = (ev: MessageEvent) => {
        addWorkerLog("in", `Page received from worker: ${JSON.stringify(ev.data)}`);
      };
      worker.onerror = (ev) => addWorkerLog("err", `Worker error: ${ev.message}`);
      worker.postMessage({ type: "init" }, [mc.port2]);
      workerRef.current = worker;
      setWorkerLive(true);
      addWorkerLog("sys", "Worker started; port2 transferred to it via postMessage transfer list.");
      toast.success("Worker running with a transferred port.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start the worker.");
      addWorkerLog("err", e instanceof Error ? e.message : "Worker start failed.");
    }
  }, [workerLive, addWorkerLog]);

  const pingWorker = useCallback(() => {
    const port = workerPort.current;
    if (!port) return;
    const payload = { ping: Date.now(), from: "page" };
    port.postMessage(payload);
    addWorkerLog("out", `Page sent: ${JSON.stringify(payload)}`);
  }, [addWorkerLog]);

  const stopWorker = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    workerPort.current?.close();
    workerPort.current = null;
    setWorkerLive(false);
    addWorkerLog("sys", "Worker terminated, port closed.");
  }, [addWorkerLog]);

  useEffect(
    () => () => {
      closePorts();
      stopWorker();
    },
    [closePorts, stopWorker],
  );

  const toneClass = (tone: LogEntry["tone"]) =>
    tone === "in"
      ? "bg-emerald-500/15 text-emerald-600"
      : tone === "out"
        ? "bg-primary/15 text-primary"
        : tone === "err"
          ? "bg-red-500/15 text-red-500"
          : "bg-muted text-muted-foreground";

  const logList = (entries: LogEntry[], empty: string) =>
    entries.length === 0 ? (
      <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>
    ) : (
      <ul className="max-h-64 space-y-1.5 overflow-y-auto font-mono text-xs">
        {entries.map((e, i) => (
          <li key={i} className="flex gap-3 rounded-lg bg-muted/60 px-3 py-1.5">
            <span className="shrink-0 text-muted-foreground">{e.t}</span>
            <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase", toneClass(e.tone))}>
              {e.tone}
            </span>
            <span className="break-all">{e.text}</span>
          </li>
        ))}
      </ul>
    );

  return (
    <ToolPageShell toolId="channel-messaging-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Channel Messaging" left={trial.left} />

      {!supported && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <p className="text-sm">
            <strong>MessageChannel or Worker is unavailable in this browser.</strong> Both demos
            below need them; nothing is simulated.
          </p>
        </div>
      )}

      <div className="space-y-6">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <MessageCircle className="h-4 w-4 text-primary" /> Demo 1: two entangled ports
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Port A only hears Port B and vice versa. Payloads cross as structured clones.
              </p>
            </div>
            <div className="flex gap-2">
              {!portsLive ? (
                <ActionButton busy={busy} disabled={!supported || !trial.canUse} onClick={connectPorts}>
                  Connect ports
                </ActionButton>
              ) : (
                <button
                  type="button"
                  onClick={closePorts}
                  className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-primary/40"
                >
                  <Unplug className="h-4 w-4" /> Close ports
                </button>
              )}
              <button
                type="button"
                onClick={sendFunction}
                disabled={!portsLive}
                title="Functions cannot be structured-cloned"
                className="flex items-center gap-2 rounded-xl border border-amber-500/40 px-4 py-2.5 text-sm font-semibold text-amber-600 transition hover:border-amber-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <AlertTriangle className="h-4 w-4" /> Try sending a function
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {(
              [
                { id: "A" as const, draft: draftA, setDraft: setDraftA, label: "Port A outbox (heard by B)" },
                { id: "B" as const, draft: draftB, setDraft: setDraftB, label: "Port B outbox (heard by A)" },
              ]
            ).map((p) => (
              <div key={p.id} className="rounded-xl border border-border p-4">
                <p className="mb-2 text-xs font-semibold text-muted-foreground">{p.label}</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={p.draft}
                    disabled={!portsLive}
                    onChange={(e) => p.setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") sendVia(p.id, p.draft, () => p.setDraft(""));
                    }}
                    placeholder={portsLive ? `Message from ${p.id}…` : "Connect ports first…"}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => sendVia(p.id, p.draft, () => p.setDraft(""))}
                    disabled={!portsLive || !p.draft.trim() || !trial.canUse}
                    className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Send className="h-4 w-4" /> Send
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Port traffic
            </h3>
            {logList(portLog, "Connect the ports and send a message to see the structured clone arrive.")}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Cpu className="h-4 w-4 text-primary" /> Demo 2: port transferred to a Web Worker
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                A real worker (built from a Blob URL) receives port2 through the transfer list and
                echoes messages back on it.
              </p>
            </div>
            <div className="flex gap-2">
              {!workerLive ? (
                <button
                  type="button"
                  onClick={startWorker}
                  disabled={!supported}
                  className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
                >
                  Start worker
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={pingWorker}
                    className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition hover:border-primary/40"
                  >
                    Ping worker
                  </button>
                  <button
                    type="button"
                    onClick={stopWorker}
                    className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-primary/40"
                  >
                    <Unplug className="h-4 w-4" /> Terminate
                  </button>
                </>
              )}
            </div>
          </div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Worker traffic
          </h3>
          {logList(workerLog, "Start the worker, then ping it: the reply comes back on the transferred port.")}
        </div>

        {!isPro && (
          <p className="text-xs text-muted-foreground">
            {trial.left} of {TOOL_TRIAL_LIMIT} free sends left. Everything runs in your browser.
          </p>
        )}
      </div>
    </ToolPageShell>
  );
}
