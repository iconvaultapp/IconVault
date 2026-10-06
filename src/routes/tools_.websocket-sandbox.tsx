// /tools/websocket-sandbox - Connect to any WebSocket endpoint, send text
// messages and watch a live timestamped log, or subscribe to a Server-Sent
// Events stream. Everything happens in your browser.

import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PlugZap, Send, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/websocket-sandbox";
import toolSeoMeta from "@/lib/tool-seo-meta-data/websocket-sandbox";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/websocket-sandbox")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/websocket-sandbox";
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
  component: WebsocketSandbox,
});

const ECHO_PRESET = "wss://ws.postman-echo.com/raw";

interface LogEntry {
  id: number;
  time: string;
  kind: "sys" | "in" | "out";
  text: string;
}

function now(): string {
  return new Date().toLocaleTimeString();
}

let nextId = 1;

function WebsocketSandbox() {
  const { isPro } = usePlan();
  const trial = useToolTrial("websocket-sandbox", isPro);
  const seo = toolSeo;

  const [url, setUrl] = useState(ECHO_PRESET);
  const [sseMode, setSseMode] = useState(false);
  const [message, setMessage] = useState("Hello from IconVault");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const logRef = useRef<HTMLDivElement | null>(null);

  const push = (kind: LogEntry["kind"], text: string) =>
    setLog((l) => [...l.slice(-199), { id: nextId++, time: now(), kind, text }]);

  const closeAll = (silent = false) => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    if (!silent) push("sys", "Disconnected.");
    setConnected(false);
    setConnecting(false);
  };

  useEffect(() => () => closeAll(true), []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [log.length]);

  const connect = () => {
    const target = url.trim();
    if (!target || connecting || !trial.canUse) return;
    closeAll(true);
    setConnecting(true);
    push("sys", sseMode ? `Subscribing to SSE stream: ${target}` : `Connecting to ${target} ...`);

    if (sseMode) {
      try {
        const es = new EventSource(target);
        esRef.current = es;
        es.onopen = () => {
          setConnected(true);
          setConnecting(false);
          push("sys", "SSE stream open. Waiting for events...");
          trial.recordUse();
        };
        es.onmessage = (e) => push("in", e.data);
        es.onerror = () => {
          if (esRef.current) {
            push("sys", "SSE error or stream ended. The server may not support EventSource.");
            closeAll(true);
          }
        };
      } catch (e) {
        push("sys", e instanceof Error ? e.message : "Could not open the SSE stream.");
        setConnecting(false);
      }
      return;
    }

    if (!/^wss?:\/\//i.test(target)) {
      push("sys", "WebSocket URLs must start with ws:// or wss://.");
      setConnecting(false);
      return;
    }
    try {
      const ws = new WebSocket(target);
      wsRef.current = ws;
      ws.onopen = () => {
        setConnected(true);
        setConnecting(false);
        push("sys", "Connected. You can send messages now.");
        trial.recordUse();
        toast.success("WebSocket connected");
      };
      ws.onmessage = (e) => push("in", typeof e.data === "string" ? e.data : "[binary message]");
      ws.onerror = () => push("sys", "Connection error. The server may be down or refuse the connection.");
      ws.onclose = (e) => {
        if (wsRef.current === ws) {
          wsRef.current = null;
          setConnected(false);
          setConnecting(false);
          push("sys", e.wasClean ? "Connection closed cleanly." : `Connection closed (code ${e.code}).`);
        }
      };
    } catch (e) {
      push("sys", e instanceof Error ? e.message : "Could not open the connection.");
      setConnecting(false);
    }
  };

  const send = () => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN || !message) return;
    ws.send(message);
    push("out", message);
    setMessage("");
  };

  const clearLog = () => setLog([]);

  return (
    <ToolPageShell toolId="websocket-sandbox" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="WebSocket Sandbox" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Endpoint URL</p>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") connect(); }}
              placeholder="wss://example.com/socket"
              disabled={connected}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 font-mono text-sm outline-none focus:border-primary disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => { setUrl(ECHO_PRESET); setSseMode(false); }}
              className="mt-1.5 text-xs font-medium text-primary hover:underline"
            >
              Use the echo server preset
            </button>
          </div>

          <label className="flex cursor-pointer items-center justify-between gap-3 text-sm font-medium">
            <span>SSE mode (EventSource)</span>
            <button
              type="button"
              role="switch"
              aria-checked={sseMode}
              disabled={connected}
              onClick={() => setSseMode((v) => !v)}
              className={cn("relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-60", sseMode ? "bg-primary" : "bg-muted")}
            >
              <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", sseMode ? "left-[22px]" : "left-0.5")} />
            </button>
          </label>
          <p className="text-xs text-muted-foreground">
            SSE mode opens a one-way event stream (great for testing live feeds); sending messages needs a WebSocket connection.
          </p>

          {!connected ? (
            <ActionButton busy={connecting} disabled={!trial.canUse || !url.trim()} onClick={connect}>
              <PlugZap className="h-4 w-4" /> {connecting ? "Connecting…" : sseMode ? "Subscribe" : "Connect"}
            </ActionButton>
          ) : (
            <button
              type="button"
              onClick={() => closeAll()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/40 px-6 py-3 text-sm font-bold text-red-500 transition hover:bg-red-500/10"
            >
              <XCircle className="h-4 w-4" /> Disconnect
            </button>
          )}

          {connected && !sseMode && (
            <div>
              <p className="mb-2 text-[13px] font-medium text-foreground/80">Send a message</p>
              <div className="flex gap-2">
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                  placeholder="Type a message"
                  className="min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={send}
                  className="shrink-0 rounded-xl bg-primary px-4 py-2.5 text-primary-foreground transition hover:opacity-90"
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-amber-400/40 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
            The echo preset is a third-party service (Postman Echo) that may be slow or down at times. For private APIs, paste your own ws:// or wss:// URL.
          </div>
        </div>

        <div className="flex min-h-[420px] flex-col rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <span className={cn("h-2.5 w-2.5 rounded-full", connected ? "bg-emerald-500" : "bg-muted-foreground/40")} />
              {connected ? (sseMode ? "Streaming" : "Connected") : "Not connected"}
            </p>
            <button type="button" onClick={clearLog} className="text-xs font-medium text-muted-foreground hover:text-foreground">
              Clear log
            </button>
          </div>
          <div ref={logRef} className="flex-1 space-y-2 overflow-y-auto rounded-xl bg-background p-4 font-mono text-[13px]">
            {log.length === 0 ? (
              <p className="text-muted-foreground">
                Connect to an endpoint and the live message log appears here, with timestamps for every send and receive.
              </p>
            ) : (
              log.map((e) => (
                <div key={e.id} className="flex gap-2">
                  <span className="shrink-0 text-muted-foreground">{e.time}</span>
                  <span
                    className={cn(
                      "shrink-0 rounded px-1.5 py-0.5 text-[11px] font-bold",
                      e.kind === "in" && "bg-emerald-500/15 text-emerald-600",
                      e.kind === "out" && "bg-sky-500/15 text-sky-600",
                      e.kind === "sys" && "bg-muted text-muted-foreground",
                    )}
                  >
                    {e.kind === "in" ? "RECV" : e.kind === "out" ? "SENT" : "SYS"}
                  </span>
                  <span className="break-all">{e.text}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
