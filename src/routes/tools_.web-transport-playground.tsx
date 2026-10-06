// /tools/web-transport-playground - Learn WebTransport with honest capability
// detection and a clearly-labeled SIMULATED protocol walkthrough (a real
// connection needs an HTTP/3 server, which this page cannot provide).

import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClipboardCopy, Network, Play, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/web-transport-playground";
import toolSeoMeta from "@/lib/tool-seo-meta-data/web-transport-playground";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/web-transport-playground")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/web-transport-playground";
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
  component: WebTransportTool,
});

type Step = { label: string; detail: string; ms: number };

const HANDSHAKE: Step[] = [
  { label: "DNS + UDP reachability", detail: "Client resolves the server and sends the first UDP datagram. No TCP handshake, no TLS handshake as separate round trips.", ms: 0 },
  { label: "QUIC handshake (1 RTT)", detail: "Crypto frames ride inside QUIC packets, so key exchange completes in a single round trip instead of TCP + TLS (2-3 RTT).", ms: 1 },
  { label: "HTTP/3 SETTINGS exchange", detail: "Both sides exchange HTTP/3 settings on the control stream, including WebTransport support (SETTINGS_H3_DATAGRAM).", ms: 2 },
  { label: "CONNECT to :protocol = webtransport", detail: "An extended CONNECT request on a new bidirectional stream upgrades it to a WebTransport session.", ms: 3 },
  { label: "Session ready", detail: "The session can now open unidirectional/bidirectional streams AND send unreliable datagrams over the same QUIC connection.", ms: 4 },
  { label: "0-RTT on reconnect", detail: "With a remembered session ticket, the next visit can send data in the very first flight, zero round trips.", ms: 5 },
];

const DATAGRAM_POINTS = [
  "Unreliable and unordered, like UDP",
  "Best for: game state, live telemetry, voice frames",
  "Lost packets are simply skipped, no head-of-line blocking",
  "Size limit comes from the QUIC max datagram frame",
];

const STREAM_POINTS = [
  "Reliable and ordered, like TCP",
  "Best for: file transfer, chat messages, RPC",
  "Lost packets are retransmitted automatically",
  "Multiple streams multiplex with independent flow control",
];

function WebTransportTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("web-transport-playground", isPro);
  const seo = toolSeo;

  const [supported, setSupported] = useState<boolean | null>(null);
  const [step, setStep] = useState(-1);
  const [running, setRunning] = useState(false);
  const timerRef = useRef<number[]>([]);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "WebTransport" in window);
    return () => timerRef.current.forEach((t) => window.clearTimeout(t));
  }, []);

  const runWalkthrough = () => {
    if (running || !trial.canUse) return;
    trial.recordUse();
    setRunning(true);
    setStep(-1);
    timerRef.current.forEach((t) => window.clearTimeout(t));
    timerRef.current = [];
    HANDSHAKE.forEach((s, i) => {
      timerRef.current.push(window.setTimeout(() => setStep(i), 700 * (i + 1)));
    });
    timerRef.current.push(window.setTimeout(() => setRunning(false), 700 * (HANDSHAKE.length + 1)));
  };

  const copy = async (t: string, label: string) => {
    try {
      await navigator.clipboard.writeText(t);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Clipboard blocked - select and copy manually.");
    }
  };

  const snippet = `// Real WebTransport client (needs an HTTP/3 server + valid certs)
const transport = new WebTransport("https://example.com:4433/counter");

await transport.ready; // session established

// 1. Unreliable datagrams
const writer = transport.datagrams.writable.getWriter();
await writer.write(new TextEncoder().encode("ping"));
writer.releaseLock();

// 2. Reliable bidirectional stream
const stream = await transport.createBidirectionalStream();
const sWriter = stream.writable.getWriter();
await sWriter.write(new TextEncoder().encode("hello over QUIC"));
sWriter.releaseLock();

await transport.closed;`;

  return (
    <ToolPageShell toolId="web-transport-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="WebTransport" left={trial.left} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">WebTransport in this browser</p>
          <p className={cn("mt-1 text-lg font-bold", supported ? "text-emerald-500" : "text-amber-500")}>
            {supported === null ? "Checking…" : supported ? "Available" : "Not available"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Chrome/Edge 97+. Firefox and Safari do not ship it yet.</p>
        </div>
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
          <p className="text-xs font-bold uppercase tracking-wide">Honest scope</p>
          <p className="mt-1 text-sm">
            A <strong>real</strong> WebTransport connection needs your own HTTP/3 server with valid certificates. This
            page cannot open one, so the walkthrough below is a <strong>simulation</strong> of the protocol steps, not
            a live socket. Nothing here pretends otherwise.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-base font-bold">
              <Network className="h-5 w-5 text-primary" /> Simulated handshake walkthrough
            </h2>
            <ActionButton busy={running} disabled={running || !trial.canUse} onClick={runWalkthrough}>
              <Play className="h-4 w-4" /> {running ? "Playing…" : "Run simulation"}
            </ActionButton>
          </div>

          <ol className="space-y-3">
            {HANDSHAKE.map((s, i) => (
              <li
                key={i}
                className={cn(
                  "flex gap-3 rounded-xl border p-3 transition",
                  i < step ? "border-emerald-500/40 bg-emerald-500/5" :
                  i === step ? "border-primary bg-primary/5" : "border-border opacity-50",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}
                >
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-bold">{s.label}</p>
                  {i <= step && <p className="mt-0.5 text-xs text-muted-foreground">{s.detail}</p>}
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-muted-foreground">
            Timings above are illustrative, not measured. Real handshake time depends on network RTT.
          </p>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 text-base font-bold">
              <Zap className="h-5 w-5 text-primary" /> Datagrams vs streams
            </h2>
            <div className="mt-3 space-y-4">
              <div>
                <p className="text-sm font-bold text-primary">Datagrams</p>
                <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                  {DATAGRAM_POINTS.map((p) => <li key={p}>• {p}</li>)}
                </ul>
              </div>
              <div>
                <p className="text-sm font-bold text-primary">Streams</p>
                <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                  {STREAM_POINTS.map((p) => <li key={p}>• {p}</li>)}
                </ul>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Typical round trips (illustrative)</p>
              {[
                { label: "TCP + TLS 1.3 handshake", rtt: 3 },
                { label: "QUIC first handshake", rtt: 1 },
                { label: "QUIC reconnect (0-RTT)", rtt: 0 },
              ].map((r) => (
                <div key={r.label} className="flex items-center gap-2 text-xs">
                  <span className="w-44 shrink-0 text-muted-foreground">{r.label}</span>
                  <div className="h-2 flex-1 rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(r.rtt / 3) * 100}%` }} />
                  </div>
                  <span className="w-14 font-bold">{r.rtt} RTT</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-base font-bold">Real client code</h2>
              <button
                type="button"
                onClick={() => void copy(snippet, "Snippet")}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                <ClipboardCopy className="h-3.5 w-3.5" /> Copy
              </button>
            </div>
            <pre className="max-h-80 overflow-auto rounded-xl bg-muted p-4 font-mono text-xs leading-relaxed">{snippet}</pre>
          </div>
        </div>
      </div>

      {!isPro && (
        <p className="mt-6 text-xs text-muted-foreground">
          {trial.left} of {TOOL_TRIAL_LIMIT} free walkthroughs left.
        </p>
      )}
    </ToolPageShell>
  );
}
