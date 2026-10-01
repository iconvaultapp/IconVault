// /tools/http3-quic-visualizer - Animated HTTP/3 and QUIC explainer: handshake
// RTT comparison, multiplexing without head-of-line blocking, connection migration.

import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Pause, Play, RotateCcw, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/http3-quic-visualizer")({
  head: () => {
    const seo = getToolSeoMeta("http3-quic-visualizer");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: QuicTool,
});

function usePlayer(total: number, intervalMs = 1100) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (playing) {
      timer.current = setInterval(() => {
        setStep((s) => {
          if (s + 1 >= total) {
            setPlaying(false);
            return s;
          }
          return s + 1;
        });
      }, intervalMs);
    }
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [playing, total, intervalMs]);

  const reset = () => {
    setPlaying(false);
    setStep(0);
  };
  const play = () => {
    if (step + 1 >= total) setStep(0);
    setPlaying(true);
  };
  return { step, playing, play, pause: () => setPlaying(false), reset, setStep };
}

function PlayerBar({
  step, total, playing, onPlay, onPause, onReset,
}: {
  step: number; total: number; playing: boolean;
  onPlay: () => void; onPause: () => void; onReset: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={playing ? onPause : onPlay}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground hover:opacity-90"
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>
      <button
        type="button"
        onClick={onReset}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-border hover:border-primary/40"
        aria-label="Reset"
      >
        <RotateCcw className="h-4 w-4" />
      </button>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${((step + 1) / total) * 100}%` }} />
      </div>
      <span className="text-xs font-bold tabular-nums text-muted-foreground">
        {step + 1} / {total}
      </span>
    </div>
  );
}

/* ---------------- Scene 1: handshake RTT race ---------------- */

interface HsEvent { from: "c" | "s"; label: string }

const HS_LANES: { name: string; sub: string; rtt: string; events: HsEvent[]; highlight: boolean }[] = [
  {
    name: "TCP + TLS 1.3",
    sub: "Classic HTTPS",
    rtt: "2 RTT",
    highlight: false,
    events: [
      { from: "c", label: "SYN" },
      { from: "s", label: "SYN-ACK" },
      { from: "c", label: "ACK + ClientHello" },
      { from: "s", label: "ServerHello + Finished" },
      { from: "c", label: "HTTP request" },
      { from: "s", label: "HTTP response" },
    ],
  },
  {
    name: "QUIC",
    sub: "HTTP/3, first visit",
    rtt: "1 RTT",
    highlight: false,
    events: [
      { from: "c", label: "Initial: crypto + transport params" },
      { from: "s", label: "Initial + Handshake" },
      { from: "c", label: "HTTP/3 request" },
      { from: "s", label: "HTTP/3 response" },
    ],
  },
  {
    name: "QUIC 0-RTT",
    sub: "Repeat visit, resumption",
    rtt: "0 RTT",
    highlight: true,
    events: [
      { from: "c", label: "0-RTT: request sent with first packet" },
      { from: "s", label: "Response (replay-safe)" },
    ],
  },
];

const HS_TOTAL = Math.max(...HS_LANES.map((l) => l.events.length)) + 1;

function HandshakeScene() {
  const p = usePlayer(HS_TOTAL);
  const shown = (lane: number) => Math.min(p.step, HS_LANES[lane]!.events.length);
  const done = (lane: number) => p.step >= HS_LANES[lane]!.events.length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Press play and watch three handshakes race. QUIC folds the TLS handshake into the transport,
        so the first round trip is the only round trip.
      </p>
      <PlayerBar step={p.step} total={HS_TOTAL} playing={p.playing} onPlay={p.play} onPause={p.pause} onReset={p.reset} />
      {HS_LANES.map((lane, li) => {
        const evs = lane.events.slice(0, shown(li));
        const last = evs[evs.length - 1];
        return (
          <div key={lane.name} className={cn("rounded-2xl border p-4", lane.highlight ? "border-primary/50 bg-primary/5" : "border-border bg-card")}>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-extrabold">{lane.name}</p>
                <p className="text-xs text-muted-foreground">{lane.sub}</p>
              </div>
              <span className={cn("rounded-full px-3 py-1 text-xs font-extrabold", done(li) ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground")}>
                {done(li) ? `done in ${lane.rtt}` : lane.rtt}
              </span>
            </div>
            <div className="relative">
              <div className="flex justify-between text-[11px] font-bold text-muted-foreground">
                <span>Client</span>
                <span>Server</span>
              </div>
              <div className="relative mt-1 h-14 overflow-hidden rounded-xl bg-muted/40">
                {evs.map((e, i) => (
                  <div
                    key={i}
                    className={cn(
                      "absolute top-1/2 -translate-y-1/2 rounded-lg px-2.5 py-1 text-[11px] font-bold shadow transition-all duration-700",
                      e.from === "c" ? "bg-primary text-primary-foreground" : "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900",
                    )}
                    style={{
                      left: e.from === "c" ? "4%" : undefined,
                      right: e.from === "s" ? "4%" : undefined,
                      opacity: i === evs.length - 1 ? 1 : 0.25,
                      transform: `translateY(-50%) scale(${i === evs.length - 1 ? 1 : 0.85})`,
                    }}
                  >
                    {e.label}
                  </div>
                ))}
                {last && (
                  <div
                    className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-amber-500 shadow transition-all duration-700"
                    style={{ left: last.from === "c" ? "calc(96% - 10px)" : "4%" }}
                  />
                )}
              </div>
            </div>
          </div>
        );
      })}
      <div className="rounded-2xl border border-border bg-card p-4 text-sm leading-relaxed text-muted-foreground">
        <p><strong className="text-foreground">Why it matters:</strong> every round trip costs 50-200ms of latency.
        On a repeat visit QUIC sends application data in the very first packet, while TCP is still saying hello.</p>
      </div>
    </div>
  );
}

/* ---------------- Scene 2: multiplexing ---------------- */

const STREAMS = ["style.css", "app.js", "hero.jpg", "font.woff2"];
const MUX_STEPS = [
  "All four streams flow over one connection.",
  "Packets keep arriving in parallel.",
  "A packet from hero.jpg is lost in transit.",
  "HTTP/2: head-of-line blocking - every stream stalls waiting for the retransmit.",
  "HTTP/2: the lost packet is retransmitted; the queue drains.",
  "HTTP/3: only hero.jpg pauses. QUIC streams are independent.",
];

function MultiplexingScene() {
  const p = usePlayer(MUX_STEPS.length, 1400);
  const lost = p.step >= 2;
  const h2Stalled = p.step >= 3 && p.step < 5;
  const h3Partial = p.step >= 5;
  const recovered = p.step >= 4;

  const row = (label: string, stalled: boolean, isLostStream: boolean) => (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 truncate text-[11px] font-bold text-muted-foreground">{label}</span>
      <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-muted/40">
        <div
          className={cn(
            "absolute inset-y-1 rounded transition-all duration-1000",
            stalled ? "bg-zinc-400" : "bg-gradient-to-r from-primary to-sky-400",
          )}
          style={{ left: "2%", width: stalled ? "46%" : recovered ? "94%" : `${38 + p.step * 9}%` }}
        />
        {isLostStream && lost && (
          <span className="absolute right-[38%] top-1/2 -translate-y-1/2 rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-extrabold text-white">
            lost
          </span>
        )}
      </div>
      <span className={cn("w-16 text-right text-[11px] font-bold", stalled ? "text-red-500" : "text-emerald-600")}>
        {stalled ? "stalled" : recovered ? "done" : "flowing"}
      </span>
    </div>
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Four files download in parallel. One packet is lost. Watch how HTTP/2 freezes everything
        while HTTP/3 isolates the damage to a single stream.
      </p>
      <PlayerBar step={p.step} total={MUX_STEPS.length} playing={p.playing} onPlay={p.play} onPause={p.pause} onReset={p.reset} />
      <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-3 text-sm font-semibold">
        {MUX_STEPS[p.step]}
      </div>
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="mb-3 text-sm font-extrabold">HTTP/2 over TCP - one lost packet blocks all streams</p>
        <div className="space-y-2">
          {STREAMS.map((s) => row(s, h2Stalled, s === "hero.jpg"))}
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="mb-3 text-sm font-extrabold">HTTP/3 over QUIC - streams are independent</p>
        <div className="space-y-2">
          {STREAMS.map((s) => row(s, s === "hero.jpg" && lost && !h3Partial ? true : false, s === "hero.jpg"))}
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card p-4 text-sm leading-relaxed text-muted-foreground">
        <p><strong className="text-foreground">The trick:</strong> QUIC runs over UDP and numbers packets per
        stream. A gap in one stream means nothing to the others, so the browser keeps rendering
        while only the damaged stream waits for its retransmit.</p>
      </div>
    </div>
  );
}

/* ---------------- Scene 3: connection migration ---------------- */

const MIG_STEPS = [
  "You are on Wi-Fi, IP 192.0.2.14. Both connections are healthy.",
  "You walk out of range. The phone switches to cellular: new IP 198.51.100.7.",
  "TCP + TLS: the 4-tuple changed, so the connection is dead. New handshake required.",
  "TCP + TLS: re-handshaking... 2 more round trips before data flows again.",
  "QUIC: the connection ID never changed. Packets keep flowing on the new path.",
  "QUIC: path validated in the background. Zero interruption, zero re-handshake.",
];

function MigrationScene() {
  const p = usePlayer(MIG_STEPS.length, 1500);
  const switched = p.step >= 1;
  const tcpDead = p.step >= 2 && p.step < 4;
  const tcpBack = p.step >= 4;

  const lane = (title: string, quic: boolean) => (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-extrabold">{title}</p>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-extrabold",
            quic
              ? "bg-emerald-500/15 text-emerald-600"
              : tcpBack
                ? "bg-emerald-500/15 text-emerald-600"
                : tcpDead
                  ? "bg-red-500/15 text-red-500"
                  : "bg-muted text-muted-foreground",
          )}
        >
          {quic ? "connected" : tcpBack ? "reconnected" : tcpDead ? "connection reset" : "connected"}
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs font-bold">
        <span className={cn("rounded-lg px-2 py-1", switched && !quic && !tcpBack ? "bg-red-500/15 text-red-500" : "bg-muted text-muted-foreground")}>
          {switched ? "198.51.100.7 (cellular)" : "192.0.2.14 (wi-fi)"}
        </span>
        <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
          {!( !quic && tcpDead ) && (
            <div
              className={cn("absolute inset-y-0 left-0 rounded-full", quic ? "bg-emerald-500" : "bg-primary")}
              style={{ width: `${30 + ((p.step * 37) % 70)}%`, transition: "width 1.2s linear" }}
            />
          )}
        </div>
        <span className="text-muted-foreground">{quic ? "conn-id 7f3a" : "4-tuple"}</span>
      </div>
      {!quic && tcpDead && (
        <p className="mt-2 text-xs font-semibold text-red-500">RST: source IP changed, the socket no longer matches.</p>
      )}
      {quic && switched && (
        <p className="mt-2 text-xs font-semibold text-emerald-600">Same connection ID, new path: migration is seamless.</p>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Step outside and your phone jumps from Wi-Fi to cellular. TCP identifies a connection by its
        IP addresses and ports, so it dies. QUIC identifies it by a connection ID, so it survives.
      </p>
      <PlayerBar step={p.step} total={MIG_STEPS.length} playing={p.playing} onPlay={p.play} onPause={p.pause} onReset={p.reset} />
      <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-3 text-sm font-semibold">
        {MIG_STEPS[p.step]}
      </div>
      {lane("TCP + TLS 1.3", false)}
      {lane("QUIC (HTTP/3)", true)}
    </div>
  );
}

/* ---------------- tool shell ---------------- */

const TABS = [
  { id: "handshake", label: "Handshake race" },
  { id: "multiplex", label: "Multiplexing" },
  { id: "migrate", label: "Connection migration" },
] as const;

function QuicTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("http3-quic-visualizer", isPro);
  const seo = getToolSeo("http3-quic-visualizer");
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("handshake");

  const exportNotes = () => {
    const notes = [
      "HTTP/3 & QUIC - key takeaways",
      "",
      "1. Handshake: QUIC folds TLS 1.3 into the transport. 1 RTT on first visit, 0 RTT on repeat visits (vs 2 RTT for TCP+TLS).",
      "2. Multiplexing: independent per-stream packet numbering removes TCP head-of-line blocking; one lost packet stalls only its own stream.",
      "3. Connection migration: connections are keyed by connection ID, not the IP/port 4-tuple, so Wi-Fi to cellular handoffs keep the session alive.",
      "4. QUIC runs over UDP with congestion control, loss recovery and encryption built in - no middlebox ossification.",
    ].join("\n");
    downloadBlob(new Blob([notes], { type: "text/plain" }), "http3-quic-notes.txt");
    if (trial.canUse) {
      trial.recordUse();
      toast.success("Notes downloaded");
    } else {
      toast.error("Free uses exhausted - go Pro for unlimited.");
    }
  };

  return (
    <ToolPageShell toolId="http3-quic-visualizer" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="HTTP/3 & QUIC Visualizer" left={trial.left} />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Zap className="h-4 w-4 text-primary" />
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-bold transition",
              tab === t.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/40",
            )}
          >
            {t.label}
          </button>
        ))}
        <button
          type="button"
          onClick={exportNotes}
          className="ml-auto inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-bold hover:border-primary/40"
        >
          Export key takeaways
        </button>
      </div>

      <div className="mx-auto max-w-3xl">
        {tab === "handshake" && <HandshakeScene />}
        {tab === "multiplex" && <MultiplexingScene />}
        {tab === "migrate" && <MigrationScene />}
      </div>

      {!isPro && (
        <p className="mt-6 text-center text-xs text-muted-foreground">
          {trial.left} of {TOOL_TRIAL_LIMIT} free exports left.
        </p>
      )}
    </ToolPageShell>
  );
}
