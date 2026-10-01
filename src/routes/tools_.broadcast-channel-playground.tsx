// /tools/broadcast-channel-playground - Real BroadcastChannel playground:
// cross-tab messaging plus a genuine leader-election demo. Open this page in
// two tabs and watch them talk to each other.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Radio, Send, Unplug, Crown, Users, ExternalLink, Info, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/broadcast-channel-playground")({
  head: () => {
    const seo = getToolSeoMeta("broadcast-channel-playground");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: BroadcastChannelTool,
});

interface WireMessage {
  kind: "chat" | "ping" | "pong" | "election" | "bid" | "victory";
  from: string;
  to?: string;
  text?: string;
  ts?: number;
  leader?: string;
}

interface LogEntry {
  t: string;
  kind: string;
  text: string;
}

function BroadcastChannelTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("broadcast-channel-playground", isPro);
  const seo = getToolSeo("broadcast-channel-playground");

  const [tabId] = useState(() => `tab-${Math.random().toString(36).slice(2, 8)}`);
  const [supported] = useState<boolean>(() => typeof BroadcastChannel !== "undefined");
  const [channelName, setChannelName] = useState("iconvault-lab");
  const [connected, setConnected] = useState(false);
  const [role, setRole] = useState<"leader" | "follower" | null>(null);
  const [draft, setDraft] = useState("");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [busy, setBusy] = useState(false);

  const channelRef = useRef<BroadcastChannel | null>(null);
  const bidsRef = useRef<Set<string>>(new Set());
  const electTimer = useRef<number | null>(null);

  const addLog = useCallback((kind: string, text: string) => {
    setLog((p) => [{ t: new Date().toLocaleTimeString(), kind, text }, ...p].slice(0, 100));
  }, []);

  const handleMessage = useCallback(
    (ev: MessageEvent) => {
      const m = ev.data as WireMessage | null;
      if (!m || typeof m !== "object" || m.from === tabId) return;
      const ch = channelRef.current;
      switch (m.kind) {
        case "chat":
          addLog("chat", `[${m.from}] ${m.text ?? ""}`);
          break;
        case "ping":
          ch?.postMessage({ kind: "pong", from: tabId, to: m.from, ...(m.ts !== undefined ? { ts: m.ts } : {}) } satisfies WireMessage);
          addLog("ping", `Ping from ${m.from}: sent pong reply.`);
          break;
        case "pong":
          if (m.to === tabId) {
            const rtt = Date.now() - (m.ts ?? Date.now());
            addLog("pong", `Pong from ${m.from}: round trip ${rtt}ms.`);
          }
          break;
        case "election":
          ch?.postMessage({ kind: "bid", from: tabId } satisfies WireMessage);
          addLog("election", `Bid request from ${m.from}: replied with my tab id.`);
          break;
        case "bid":
          bidsRef.current.add(m.from);
          break;
        case "victory":
          setRole(m.leader === tabId ? "leader" : "follower");
          addLog("election", `${m.leader} declared leader. This tab is now ${m.leader === tabId ? "LEADER" : "a follower"}.`);
          break;
      }
    },
    [addLog, tabId],
  );

  const runElection = useCallback(() => {
    const ch = channelRef.current;
    if (!ch) return;
    bidsRef.current = new Set([tabId]);
    ch.postMessage({ kind: "election", from: tabId } satisfies WireMessage);
    addLog("election", "Election started: collecting bids for 800ms (highest tab id wins).");
    if (electTimer.current !== null) window.clearTimeout(electTimer.current);
    electTimer.current = window.setTimeout(() => {
      const bids = [...bidsRef.current].sort();
      const winner = bids[bids.length - 1] ?? tabId;
      channelRef.current?.postMessage({ kind: "victory", from: tabId, leader: winner } satisfies WireMessage);
      setRole(winner === tabId ? "leader" : "follower");
      addLog("election", `Result: ${winner} wins with ${bids.length} tab(s) voting.`);
    }, 800);
  }, [addLog, tabId]);

  const connect = useCallback(() => {
    if (busy || !supported) return;
    setBusy(true);
    try {
      const name = channelName.trim() || "iconvault-lab";
      const ch = new BroadcastChannel(name);
      ch.onmessage = handleMessage;
      channelRef.current = ch;
      setConnected(true);
      addLog("sys", `Connected to channel "${name}" as ${tabId}.`);
      toast.success("Connected. Open a second tab to see cross-tab messages.");
      window.setTimeout(() => runElection(), 600);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open the channel.");
    } finally {
      setBusy(false);
    }
  }, [busy, supported, channelName, handleMessage, addLog, tabId, runElection]);

  const disconnect = useCallback(() => {
    if (electTimer.current !== null) window.clearTimeout(electTimer.current);
    channelRef.current?.close();
    channelRef.current = null;
    setConnected(false);
    setRole(null);
    addLog("sys", "Channel closed.");
  }, [addLog]);

  useEffect(() => () => disconnect(), [disconnect]);

  const postMessage = useCallback(() => {
    const ch = channelRef.current;
    const text = draft.trim();
    if (!ch || !text || !trial.canUse) return;
    ch.postMessage({ kind: "chat", from: tabId, text, ts: Date.now() } satisfies WireMessage);
    addLog("chat", `[${tabId}] ${text} (sent)`);
    setDraft("");
    trial.recordUse();
  }, [draft, trial, addLog, tabId]);

  const ping = useCallback(() => {
    const ch = channelRef.current;
    if (!ch) return;
    ch.postMessage({ kind: "ping", from: tabId, ts: Date.now() } satisfies WireMessage);
    addLog("ping", "Ping broadcast to all tabs (they auto-reply).");
  }, [addLog, tabId]);

  const openSecondTab = useCallback(() => {
    window.open(window.location.href, "_blank", "noopener");
  }, []);

  return (
    <ToolPageShell toolId="broadcast-channel-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="BroadcastChannel" left={trial.left} />

      {!supported && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <p className="text-sm">
            <strong>BroadcastChannel is not available in this browser.</strong> It is supported in
            all modern browsers except very old ones; try a current Chrome, Edge, Firefox or Safari.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Channel</h2>
            {role && (
              <span
                className={cn(
                  "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold",
                  role === "leader" ? "bg-amber-500/15 text-amber-600" : "bg-sky-500/15 text-sky-600",
                )}
              >
                {role === "leader" ? <Crown className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
                {role === "leader" ? "LEADER" : "follower"}
              </span>
            )}
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">Channel name</span>
            <input
              type="text"
              value={channelName}
              disabled={connected}
              onChange={(e) => setChannelName(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm disabled:opacity-60"
            />
          </label>
          <p className="rounded-xl bg-muted/60 px-3 py-2 font-mono text-xs">
            This tab: <span className="font-bold text-primary">{tabId}</span>
          </p>

          {!connected ? (
            <ActionButton busy={busy} disabled={!supported} onClick={connect}>
              <Radio className="h-4 w-4" /> {busy ? "Connecting…" : "Connect"}
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

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={openSecondTab}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-sm font-semibold transition hover:border-primary/40"
            >
              <ExternalLink className="h-4 w-4" /> Second tab
            </button>
            <button
              type="button"
              onClick={ping}
              disabled={!connected}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-sm font-semibold transition hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Zap className="h-4 w-4" /> Ping tabs
            </button>
            <button
              type="button"
              onClick={runElection}
              disabled={!connected}
              className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-sm font-semibold transition hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Crown className="h-4 w-4" /> Run leader election
            </button>
          </div>

          <div>
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">Message</span>
            <div className="flex gap-2">
              <input
                type="text"
                value={draft}
                disabled={!connected}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") postMessage();
                }}
                placeholder={connected ? "Type and press Enter…" : "Connect first…"}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm disabled:opacity-60"
              />
              <button
                type="button"
                onClick={postMessage}
                disabled={!connected || !draft.trim() || !trial.canUse}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send className="h-4 w-4" /> Send
              </button>
            </div>
          </div>

          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free messages left. Nothing leaves your device.
            </p>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold">Live channel traffic</h2>
            {log.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <p className="font-semibold">Connect, then open this page in a second tab.</p>
                <p className="mt-1">
                  Messages, pings and election bids from every tab appear here in real time.
                </p>
              </div>
            ) : (
              <ul className="max-h-96 space-y-1.5 overflow-y-auto font-mono text-xs">
                {log.map((e, i) => (
                  <li key={i} className="flex gap-3 rounded-lg bg-muted/60 px-3 py-1.5">
                    <span className="shrink-0 text-muted-foreground">{e.t}</span>
                    <span
                      className={cn(
                        "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                        e.kind === "chat" && "bg-primary/15 text-primary",
                        e.kind === "ping" && "bg-amber-500/15 text-amber-600",
                        e.kind === "pong" && "bg-emerald-500/15 text-emerald-600",
                        e.kind === "election" && "bg-violet-500/15 text-violet-500",
                        e.kind === "sys" && "bg-muted text-muted-foreground",
                      )}
                    >
                      {e.kind}
                    </span>
                    <span className="break-all">{e.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-2 text-sm font-semibold">How the election works</h2>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Each tab broadcasts an election bid with its random id and collects bids for 800ms.
              The highest id wins and broadcasts victory; every tab then knows its role. This is a
              simplified bully algorithm running over a real BroadcastChannel: useful for electing
              one tab to do polling, hold a WebSocket, or run timers while the rest stay idle.
            </p>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
