// /tools/tcp-state-lab - Watch the TCP 3-way handshake, data transfer and
// connection teardown as an animated packet exchange with a state machine.

import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Play, Pause, StepForward, StepBack, RotateCcw, Copy, ArrowRight, ArrowLeft, Network } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/tcp-state-lab")({
  head: () => {
    const seo = getToolSeoMeta("tcp-state-lab");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: TcpLab,
});

type Side = "client" | "server";

interface Packet {
  from: Side;
  flags: string;
  seq: string;
  ack: string;
}

interface Step {
  packets: Packet[];
  client: string;
  server: string;
  note: string;
}

const C_SEQ = 1000;
const S_SEQ = 5000;

const STEPS: Step[] = [
  {
    packets: [{ from: "client", flags: "SYN", seq: `${C_SEQ}`, ack: "-" }],
    client: "SYN_SENT",
    server: "LISTEN",
    note: "Client picks a random initial sequence number (ISN) and sends SYN. It now waits for a reply.",
  },
  {
    packets: [{ from: "server", flags: "SYN, ACK", seq: `${S_SEQ}`, ack: `${C_SEQ + 1}` }],
    client: "SYN_SENT",
    server: "SYN_RCVD",
    note: "Server replies with its own ISN plus an ACK for the client's SYN (ack = client seq + 1). The +1 acknowledges the SYN itself, which consumes one sequence number.",
  },
  {
    packets: [{ from: "client", flags: "ACK", seq: `${C_SEQ + 1}`, ack: `${S_SEQ + 1}` }],
    client: "ESTABLISHED",
    server: "SYN_RCVD",
    note: "Client ACKs the server's SYN. Its side of the connection is now ESTABLISHED.",
  },
  {
    packets: [],
    client: "ESTABLISHED",
    server: "ESTABLISHED",
    note: "Server receives the ACK. The connection is open on both sides - the 3-way handshake is complete.",
  },
  {
    packets: [{ from: "client", flags: "PSH, ACK", seq: `${C_SEQ + 1} (100 bytes)`, ack: `${S_SEQ + 1}` }],
    client: "ESTABLISHED",
    server: "ESTABLISHED",
    note: "Client sends 100 bytes of data (e.g. an HTTP request). Sequence numbers track every byte so loss can be detected.",
  },
  {
    packets: [{ from: "server", flags: "ACK", seq: `${S_SEQ + 1}`, ack: `${C_SEQ + 101}` }],
    client: "ESTABLISHED",
    server: "ESTABLISHED",
    note: "Server ACKs all 100 bytes (ack = next expected byte). Now the server sends its 240-byte response.",
  },
  {
    packets: [{ from: "server", flags: "PSH, ACK", seq: `${S_SEQ + 1} (240 bytes)`, ack: `${C_SEQ + 101}` }],
    client: "ESTABLISHED",
    server: "ESTABLISHED",
    note: "Server's data goes the other way, with its own sequence numbers.",
  },
  {
    packets: [{ from: "client", flags: "ACK", seq: `${C_SEQ + 101}`, ack: `${S_SEQ + 241}` }],
    client: "ESTABLISHED",
    server: "ESTABLISHED",
    note: "Client ACKs the 240 bytes. Data transfer done - now the client closes its side.",
  },
  {
    packets: [{ from: "client", flags: "FIN, ACK", seq: `${C_SEQ + 101}`, ack: `${S_SEQ + 241}` }],
    client: "FIN_WAIT_1",
    server: "ESTABLISHED",
    note: "Client sends FIN: it has no more data to send. Like SYN, FIN consumes one sequence number.",
  },
  {
    packets: [{ from: "server", flags: "ACK", seq: `${S_SEQ + 241}`, ack: `${C_SEQ + 102}` }],
    client: "FIN_WAIT_2",
    server: "CLOSE_WAIT",
    note: "Server ACKs the FIN (ack = fin seq + 1). The client-to-server direction is closed; the server may still send data.",
  },
  {
    packets: [{ from: "server", flags: "FIN, ACK", seq: `${S_SEQ + 241}`, ack: `${C_SEQ + 102}` }],
    client: "FIN_WAIT_2",
    server: "LAST_ACK",
    note: "Server is done too and sends its own FIN.",
  },
  {
    packets: [{ from: "client", flags: "ACK", seq: `${C_SEQ + 102}`, ack: `${S_SEQ + 242}` }],
    client: "TIME_WAIT",
    server: "CLOSED",
    note: "Client ACKs the server FIN. The server closes immediately; the client enters TIME_WAIT.",
  },
  {
    packets: [],
    client: "TIME_WAIT",
    server: "CLOSED",
    note: "TIME_WAIT lasts 2xMSL (about 60s). It lets late duplicate packets die and guarantees the final ACK arrived - if it was lost, the server re-sends FIN and the client re-ACKs.",
  },
  {
    packets: [],
    client: "CLOSED",
    server: "CLOSED",
    note: "Timer expired. Both sides are CLOSED and the socket can be reused. Teardown complete.",
  },
];

const ALL_STATES = ["CLOSED", "LISTEN", "SYN_SENT", "SYN_RCVD", "ESTABLISHED", "FIN_WAIT_1", "FIN_WAIT_2", "CLOSE_WAIT", "LAST_ACK", "TIME_WAIT"];

function TcpLab() {
  const { isPro } = usePlan();
  const trial = useToolTrial("tcp-state-lab", isPro);
  const seo = getToolSeo("tcp-state-lab");

  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1.2);
  const [copied, setCopied] = useState(false);

  const total = STEPS.length;
  const cur = STEPS[Math.min(stepIdx, total - 1)]!;

  useEffect(() => {
    if (!playing) return;
    if (stepIdx >= total - 1) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setStepIdx((s) => Math.min(s + 1, total - 1)), 1000 / speed);
    return () => clearTimeout(t);
  }, [playing, stepIdx, speed, total]);

  const copySeq = useCallback(() => {
    if (!trial.canUse) return;
    const text = [
      "TCP connection lifecycle (simplified)",
      "",
      ...STEPS.map((s, k) => {
        const pk = s.packets.map((p) => `[${p.from}] ${p.flags} seq=${p.seq} ack=${p.ack}`).join(" ; ") || "(no packets)";
        return `${k + 1}. ${pk}\n   client=${s.client} server=${s.server}`;
      }),
      "",
      "Sequence numbers are illustrative. Copied from IconVault TCP Lab.",
    ].join("\n");
    void navigator.clipboard.writeText(text).then(() => {
      trial.recordUse();
      setCopied(true);
      toast.success("Sequence copied");
      setTimeout(() => setCopied(false), 1500);
    });
  }, [trial]);

  const stateChip = (state: string, side: Side) => {
    const active = side === "client" ? cur.client === state : cur.server === state;
    const seen =
      STEPS.slice(0, stepIdx + 1).some((s) => (side === "client" ? s.client : s.server) === state);
    return (
      <span
        key={state}
        className={cn(
          "rounded-md border px-1.5 py-0.5 font-mono text-[10px] transition",
          active
            ? "border-primary bg-primary/20 font-bold text-primary"
            : seen
              ? "border-border bg-background text-muted-foreground"
              : "border-border bg-background text-muted-foreground/40",
        )}
      >
        {state}
      </span>
    );
  };

  return (
    <ToolPageShell toolId="tcp-state-lab" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="TCP Lab" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div className="rounded-xl border border-border bg-background p-4">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setStepIdx(0)} className="rounded-lg border border-border p-2 text-muted-foreground transition hover:border-primary/50 hover:text-foreground" title="Reset">
                <RotateCcw className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setStepIdx((s) => Math.max(0, s - 1))} disabled={stepIdx === 0} className="rounded-lg border border-border p-2 text-muted-foreground transition hover:border-primary/50 hover:text-foreground disabled:opacity-40" title="Step back">
                <StepBack className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setPlaying((p) => !p)} className="rounded-lg bg-primary p-2.5 text-primary-foreground transition hover:opacity-90" title={playing ? "Pause" : "Play"}>
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <button type="button" onClick={() => setStepIdx((s) => Math.min(total - 1, s + 1))} disabled={stepIdx >= total - 1} className="rounded-lg border border-border p-2 text-muted-foreground transition hover:border-primary/50 hover:text-foreground disabled:opacity-40" title="Step forward">
                <StepForward className="h-4 w-4" />
              </button>
              <span className="ml-auto font-mono text-xs text-muted-foreground">{stepIdx + 1} / {total}</span>
            </div>
            <input type="range" min={0} max={total - 1} value={stepIdx} onChange={(e) => { setStepIdx(Number(e.target.value)); setPlaying(false); }} className="mt-3 w-full accent-primary" />
            <div className="mt-2 flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Speed</span>
              <input type="range" min={0.5} max={3} step={0.1} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="w-full accent-primary" />
              <span className="font-mono text-xs text-muted-foreground">{speed.toFixed(1)}/s</span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background p-4">
            <p className="mb-2 text-xs font-bold text-muted-foreground">CLIENT STATE MACHINE</p>
            <div className="flex flex-wrap gap-1.5">
              {["CLOSED", "SYN_SENT", "ESTABLISHED", "FIN_WAIT_1", "FIN_WAIT_2", "TIME_WAIT"].map((s) => stateChip(s, "client"))}
            </div>
            <p className="mb-2 mt-4 text-xs font-bold text-muted-foreground">SERVER STATE MACHINE</p>
            <div className="flex flex-wrap gap-1.5">
              {["LISTEN", "SYN_RCVD", "ESTABLISHED", "CLOSE_WAIT", "LAST_ACK", "CLOSED"].map((s) => stateChip(s, "server"))}
            </div>
          </div>

          <ActionButton disabled={!trial.canUse} onClick={copySeq}>
            {copied ? <Network className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy sequence"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left - everything runs locally in your browser.
            </p>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2">
              <div className={cn("rounded-xl border p-4 text-center transition", cur.client === "ESTABLISHED" ? "border-emerald-500/50 bg-emerald-500/5" : "border-primary/40 bg-primary/5")}>
                <p className="font-bold text-primary">Client</p>
                <p className="mt-1 inline-block rounded bg-background px-2 py-0.5 font-mono text-[11px] font-bold text-foreground/85">{cur.client}</p>
              </div>
              <div className="flex flex-col items-center justify-center px-1">
                <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">wire</span>
              </div>
              <div className={cn("rounded-xl border p-4 text-center transition", cur.server === "ESTABLISHED" ? "border-emerald-500/50 bg-emerald-500/5" : "border-violet-500/40 bg-violet-500/5")}>
                <p className="font-bold text-violet-300">Server</p>
                <p className="mt-1 inline-block rounded bg-background px-2 py-0.5 font-mono text-[11px] font-bold text-foreground/85">{cur.server}</p>
              </div>
            </div>

            <div className="mt-4 min-h-[120px] space-y-2 rounded-xl bg-background p-4">
              {cur.packets.length === 0 ? (
                <p className="py-6 text-center font-mono text-xs text-muted-foreground">(no packets on the wire this step)</p>
              ) : (
                cur.packets.map((p, pi) => (
                  <div key={pi} className={cn("flex items-center gap-2", p.from === "client" ? "flex-row" : "flex-row-reverse")}>
                    {p.from === "client" ? <ArrowRight className="h-4 w-4 shrink-0 text-primary" /> : <ArrowLeft className="h-4 w-4 shrink-0 text-violet-300" />}
                    <div className={cn("flex-1 rounded-xl border px-3.5 py-2.5", p.from === "client" ? "border-primary/50 bg-primary/10" : "border-violet-500/50 bg-violet-500/10")}>
                      <p className="font-mono text-sm font-bold">
                        <span className={p.from === "client" ? "text-primary" : "text-violet-300"}>{p.flags}</span>
                      </p>
                      <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">seq={p.seq} - ack={p.ack}</p>
                    </div>
                    {p.from === "client" ? <ArrowRight className="h-4 w-4 shrink-0 text-primary" /> : <ArrowLeft className="h-4 w-4 shrink-0 text-violet-300" />}
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 rounded-xl border border-primary/40 bg-primary/5 px-4 py-3">
              <p className="text-sm leading-relaxed text-foreground/90">
                <span className="font-mono font-bold text-primary">Step {stepIdx + 1}.</span> {cur.note}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 text-[13px] font-medium text-foreground/80">Full sequence</p>
            <div className="space-y-1">
              {STEPS.map((s, si) => (
                <button
                  key={si}
                  type="button"
                  onClick={() => { setStepIdx(si); setPlaying(false); }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left font-mono text-xs transition",
                    si === stepIdx ? "border-primary bg-primary/10" : "border-transparent hover:border-border",
                    si < stepIdx ? "text-foreground/70" : si === stepIdx ? "text-foreground" : "text-muted-foreground/60",
                  )}
                >
                  <span className={cn("font-bold", si === stepIdx ? "text-primary" : "")}>{si + 1}.</span>
                  <span className="min-w-0 flex-1 truncate">
                    {s.packets.length === 0 ? "(quiet)" : s.packets.map((p) => `${p.from === "client" ? "C->S" : "S->C"} ${p.flags}`).join(" ; ")}
                  </span>
                  <span className="hidden shrink-0 sm:inline">{s.client} / {s.server}</span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Simplified model: retransmission, congestion control, window scaling and simultaneous close are omitted. States shown: {ALL_STATES.join(", ")}.
            </p>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
