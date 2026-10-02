// /tools/webrtc-lab - Interactive WebRTC signaling lab: step through SDP
// offer/answer exchanges and ICE candidate flows. Signaling is simulated,
// no real RTCPeerConnection is created. Client-side only.

import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Copy, Pause, Play, RotateCcw, Radio } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/webrtc-lab")({
  head: () => {
    const seo = getToolSeoMeta("webrtc-lab");
    const canonical = "https://iconvault.site/tools/webrtc-lab";
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
  component: WebRtcLabTool,
});

interface Step {
  from: string;
  to: string;
  kind: "sdp" | "ice" | "media" | "note";
  label: string;
  detail: string;
  payload?: string;
}

interface Scenario {
  id: string;
  name: string;
  blurb: string;
  steps: Step[];
}

const SCENARIOS: Scenario[] = [
  {
    id: "standard",
    name: "Standard call",
    blurb: "Two peers find each other through a signaling server, exchange SDP offer/answer, then swap ICE candidates until a path connects.",
    steps: [
      { from: "Alice", to: "Signaling", kind: "note", label: "Connect to signaling server", detail: "Both peers open a persistent WebSocket to the signaling server. This channel carries session metadata only, never media." },
      { from: "Alice", to: "Alice", kind: "sdp", label: "createOffer()", detail: "Alice creates an SDP offer describing her media capabilities: codecs (VP8, H.264, Opus), SSRCs and whether she sends or receives.", payload: "v=0\no=- 123 2 IN IP4 127.0.0.1\nm=video 9 UDP/TLS/RTP/SAVPF 96\na=rtpmap:96 VP8/90000" },
      { from: "Alice", to: "Alice", kind: "note", label: "setLocalDescription(offer)", detail: "Alice applies the offer as her local description, locking in what she will send." },
      { from: "Alice", to: "Signaling", kind: "sdp", label: "Send offer", detail: "The offer travels over the signaling channel. The server just routes it to Bob." },
      { from: "Signaling", to: "Bob", kind: "sdp", label: "Receive offer", detail: "Bob receives the offer JSON and parses the SDP." },
      { from: "Bob", to: "Bob", kind: "note", label: "setRemoteDescription(offer)", detail: "Bob accepts Alice's capabilities as the remote description." },
      { from: "Bob", to: "Bob", kind: "sdp", label: "createAnswer()", detail: "Bob answers with the subset of codecs he also supports. Negotiation settles on the intersection.", payload: "v=0\no=- 456 2 IN IP4 127.0.0.1\nm=video 9 UDP/TLS/RTP/SAVPF 96\na=rtpmap:96 VP8/90000" },
      { from: "Bob", to: "Bob", kind: "note", label: "setLocalDescription(answer)", detail: "Bob applies the answer locally." },
      { from: "Bob", to: "Signaling", kind: "sdp", label: "Send answer", detail: "The answer returns through the signaling server to Alice." },
      { from: "Signaling", to: "Alice", kind: "sdp", label: "Receive answer", detail: "Alice applies the answer as her remote description. Media formats are now agreed." },
      { from: "Alice", to: "STUN / TURN", kind: "ice", label: "Gather ICE candidates", detail: "Both peers ask a STUN server for their public reflexive address and list host candidates from local interfaces.", payload: "candidate:1 1 udp 2130706431 192.168.1.5 54321 typ host" },
      { from: "Alice", to: "Bob", kind: "ice", label: "Trickle ICE candidates", detail: "Candidates are sent as they are discovered, without waiting for gathering to finish. This is trickle ICE." },
      { from: "Bob", to: "Alice", kind: "ice", label: "Trickle ICE candidates", detail: "Bob sends his candidates the same way. Each side runs connectivity checks (STUN binding requests) on every pair." },
      { from: "Alice", to: "Bob", kind: "media", label: "DTLS handshake + media", detail: "The best working pair is nominated. A DTLS handshake secures it, then SRTP media flows directly peer to peer. The signaling server is no longer involved." },
    ],
  },
  {
    id: "ice-restart",
    name: "ICE restart",
    blurb: "A network change (WiFi to 5G) kills the path. The peers renegotiate connectivity without tearing down the call.",
    steps: [
      { from: "Alice", to: "Bob", kind: "note", label: "Path failure detected", detail: "Consent checks stop getting responses. The ICE agent marks the selected pair as failed or disconnected." },
      { from: "Alice", to: "Alice", kind: "sdp", label: "createOffer({ iceRestart: true })", detail: "Alice creates a new offer with fresh ICE ufrag and password values. Media sections stay the same.", payload: "a=ice-ufrag:NEW1\na=ice-pwd:NEWSECRET2" },
      { from: "Alice", to: "Signaling", kind: "sdp", label: "Send restart offer", detail: "The restart offer goes over the same signaling channel." },
      { from: "Bob", to: "Bob", kind: "sdp", label: "createAnswer()", detail: "Bob answers with his own fresh ufrag and password, and restarts candidate gathering." },
      { from: "Bob", to: "Alice", kind: "sdp", label: "Send answer", detail: "Answer returns through signaling. Both sides now gather candidates again." },
      { from: "Alice", to: "Bob", kind: "ice", label: "Fresh candidates trickle", detail: "New host, srflx and possibly relay candidates are exchanged while the old pair keeps trying." },
      { from: "Alice", to: "Bob", kind: "media", label: "New pair nominated", detail: "Connectivity checks succeed on the new network path. Media seamlessly moves over; the call never dropped." },
    ],
  },
  {
    id: "glare",
    name: "Offer collision (glare)",
    blurb: "Both peers send an offer at the same time. The polite/impolite pattern resolves the collision deterministically.",
    steps: [
      { from: "Alice", to: "Alice", kind: "sdp", label: "Alice sends offer", detail: "Alice's offer is in flight over the signaling server." },
      { from: "Bob", to: "Bob", kind: "sdp", label: "Bob sends offer", detail: "At the same moment Bob sends his own offer. Neither has seen the other's yet." },
      { from: "Alice", to: "Bob", kind: "note", label: "Collision detected", detail: "Each side receives an offer while its own offer is outstanding. WebRTC calls this glare." },
      { from: "Alice", to: "Bob", kind: "note", label: "Polite peer rolls back", detail: "The polite peer (agreed during setup) rolls back its local offer with setLocalDescription({type:'rollback'}) and treats the incoming offer normally." },
      { from: "Bob", to: "Alice", kind: "note", label: "Impolite peer ignores", detail: "The impolite peer ignores the incoming offer and waits for the polite peer's answer to its own offer." },
      { from: "Alice", to: "Bob", kind: "sdp", label: "Polite peer answers", detail: "The polite peer creates an answer to the impolite peer's offer. Exactly one offer/answer pair survives." },
      { from: "Alice", to: "Bob", kind: "media", label: "Single negotiation wins", detail: "From here the flow continues exactly like a standard call." },
    ],
  },
];

const KIND_STYLE: Record<Step["kind"], string> = {
  sdp: "bg-sky-500/10 text-sky-600 border-sky-500/30",
  ice: "bg-violet-500/10 text-violet-600 border-violet-500/30",
  media: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  note: "bg-muted text-muted-foreground border-border",
};

const ACTORS = ["Alice", "Signaling", "Bob", "STUN / TURN"] as const;

function actorIndex(name: string): number {
  const i = ACTORS.indexOf(name as (typeof ACTORS)[number]);
  return i === -1 ? 1 : i; // unknown actors route through the signaling column
}

function WebRtcLabTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("webrtc-lab", isPro);
  const seo = getToolSeo("webrtc-lab");

  const [scenarioId, setScenarioId] = useState(SCENARIOS[0]!.id);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<number | null>(null);

  const scenario = useMemo(() => SCENARIOS.find((s) => s.id === scenarioId)!, [scenarioId]);
  const current = scenario.steps[step]!;

  useEffect(() => {
    setStep(0);
    setPlaying(false);
  }, [scenarioId]);

  useEffect(() => {
    if (playing) {
      timer.current = window.setInterval(() => {
        setStep((s) => {
          if (s >= scenario.steps.length - 1) {
            setPlaying(false);
            return s;
          }
          return s + 1;
        });
      }, 2200);
    }
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [playing, scenario]);

  const copyFlow = async () => {
    if (!trial.canUse) return;
    const text = [`WebRTC signaling flow: ${scenario.name}`, scenario.blurb, ""]
      .concat(scenario.steps.map((s, i) => `${i + 1}. [${s.kind.toUpperCase()}] ${s.from} -> ${s.to}: ${s.label}\n   ${s.detail}`))
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      trial.recordUse();
      toast.success("Flow copied to clipboard");
    } catch {
      toast.error("Copy failed - clipboard not available.");
    }
  };

  return (
    <ToolPageShell toolId="webrtc-lab" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="WebRTC Lab" left={trial.left} />

      <div className="space-y-6">
        <section className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
          <p className="flex items-start gap-2">
            <Radio className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <span>
              <strong>Simulated signaling.</strong> This lab animates the message flow of a WebRTC session in your browser.
              It does not create a real RTCPeerConnection, reach a STUN server or send any media.
            </span>
          </p>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap gap-2">
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setScenarioId(s.id)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-bold transition",
                  scenarioId === s.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                {s.name}
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{scenario.blurb}</p>

          {/* Sequence diagram */}
          <div className="mt-5 overflow-x-auto">
            <div className="min-w-[640px]">
              <div className="grid grid-cols-4 gap-0">
                {ACTORS.map((a) => (
                  <div key={a} className="pb-2 text-center">
                    <span className={cn(
                      "inline-block rounded-full border px-4 py-1.5 text-sm font-bold",
                      a !== "Alice" && a !== "Bob"
                        ? "border-violet-500/40 bg-violet-500/10 text-violet-600"
                        : "border-border bg-muted/50",
                    )}>
                      {a}
                    </span>
                  </div>
                ))}
              </div>
              <div className="relative" style={{ height: scenario.steps.length * 48 }}>
                {ACTORS.map((a) => (
                  <div key={a} className="absolute top-0 h-full" style={{ left: `${(ACTORS.indexOf(a) * 100) / 3}%` }}>
                    <div className="h-full w-px -translate-x-1/2 bg-border" />
                  </div>
                ))}
                {scenario.steps.map((s, i) => {
                  const fromIdx = actorIndex(s.from);
                  const toIdx = actorIndex(s.to);
                  const shown = i <= step;
                  const isCurrent = i === step;
                  const selfLoop = fromIdx === toIdx;
                  const leftPct = selfLoop
                    ? (fromIdx * 100) / 3
                    : (Math.min(fromIdx, toIdx) * 100) / 3 + 100 / 6;
                  const widthPct = selfLoop ? 0 : (Math.abs(toIdx - fromIdx) * 100) / 3 - 100 / 3;
                  const forward = toIdx >= fromIdx;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setStep(i)}
                      className="absolute w-full text-left"
                      style={{ top: i * 48 + 6 }}
                      title={s.label}
                    >
                      <div
                        className={cn(
                          "absolute flex h-8 items-center gap-1 rounded-md border px-2 text-[11px] font-semibold transition",
                          KIND_STYLE[s.kind],
                          shown ? "opacity-100" : "opacity-25",
                          isCurrent && "ring-2 ring-primary/60",
                        )}
                        style={selfLoop
                          ? { left: `calc(${leftPct}% - 48px)`, width: 96 }
                          : { left: `${leftPct}%`, width: `calc(${widthPct}% )`, justifyContent: forward ? "flex-start" : "flex-end" }}
                      >
                        <span className="truncate">{i + 1}. {s.label} {forward ? "->" : "<-"}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Step detail */}
          <div className="mt-4 rounded-xl bg-muted/60 p-4">
            <div className="flex items-center gap-2 text-sm">
              <span className={cn("rounded-full border px-2 py-0.5 text-xs font-bold uppercase", KIND_STYLE[current.kind])}>{current.kind}</span>
              <span className="font-bold">{current.from} {"->"} {current.to}</span>
              <span className="ml-auto text-xs text-muted-foreground">Step {step + 1} of {scenario.steps.length}</span>
            </div>
            <p className="mt-2 font-semibold">{current.label}</p>
            <p className="mt-1 text-sm text-muted-foreground">{current.detail}</p>
            {current.payload && (
              <pre className="mt-3 overflow-x-auto rounded-lg bg-background p-3 font-mono text-xs">{current.payload}</pre>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex gap-2">
              <ActionButton disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
                <ChevronLeft className="h-4 w-4" /> Back
              </ActionButton>
              <ActionButton busy={playing} disabled={step >= scenario.steps.length - 1 && !playing} onClick={() => {
                if (step >= scenario.steps.length - 1) setStep(0);
                setPlaying((p) => !p);
              }}>
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {playing ? "Pause" : "Play"}
              </ActionButton>
              <ActionButton disabled={step >= scenario.steps.length - 1} onClick={() => setStep((s) => Math.min(scenario.steps.length - 1, s + 1))}>
                Next <ChevronRight className="h-4 w-4" />
              </ActionButton>
              <button
                type="button"
                onClick={() => { setStep(0); setPlaying(false); }}
                className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-bold text-muted-foreground transition hover:border-primary/40"
              >
                <RotateCcw className="h-4 w-4" /> Reset
              </button>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <ActionButton disabled={!trial.canUse} onClick={copyFlow}>
                <Copy className="h-4 w-4" /> Copy flow
              </ActionButton>
              {!isPro && <p className="text-xs text-muted-foreground">{trial.left} of {TOOL_TRIAL_LIMIT} free copies left.</p>}
            </div>
          </div>
        </section>
      </div>
    </ToolPageShell>
  );
}
