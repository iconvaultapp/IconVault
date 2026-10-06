// /tools/tls-handshake-lab - Step through the TLS 1.2 and TLS 1.3 handshakes
// message by message, with an animated client/server diagram.

import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Play, Pause, StepForward, StepBack, RotateCcw, Copy, Lock, ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/tls-handshake-lab";
import toolSeoMeta from "@/lib/tool-seo-meta-data/tls-handshake-lab";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/tls-handshake-lab")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/tls-handshake-lab";
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
  component: TlsLab,
});

type Version = "1.2" | "1.3";
type Side = "client" | "server";

interface Msg {
  from: Side;
  label: string;
  detail: string;
  rtt: number; // round trips so far
  encrypted: boolean;
}

const SEQ_12: Msg[] = [
  {
    from: "client",
    label: "ClientHello",
    detail: "Client offers the TLS versions and cipher suites it supports, plus a random number and the server name (SNI). Everything is plaintext.",
    rtt: 0,
    encrypted: false,
  },
  {
    from: "server",
    label: "ServerHello, Certificate, ServerHelloDone",
    detail: "Server picks one cipher suite and sends its own random. It proves its identity with a certificate chain (public key, signed by a CA). ServerHelloDone marks the end of its flight.",
    rtt: 1,
    encrypted: false,
  },
  {
    from: "client",
    label: "ClientKeyExchange, ChangeCipherSpec, Finished",
    detail: "Client encrypts a pre-master secret with the server's public key and sends it. Both sides now derive the same session keys. ChangeCipherSpec says: from here on, everything is encrypted. Finished is the first encrypted message, a checksum over the whole handshake.",
    rtt: 2,
    encrypted: true,
  },
  {
    from: "server",
    label: "ChangeCipherSpec, Finished",
    detail: "Server switches to encryption and sends its own Finished checksum. If the checksums verify, both sides trust the handshake was not tampered with.",
    rtt: 3,
    encrypted: true,
  },
  {
    from: "client",
    label: "Application data",
    detail: "Handshake complete after 2 full round trips. HTTP requests now flow encrypted with symmetric session keys.",
    rtt: 3,
    encrypted: true,
  },
];

const SEQ_13: Msg[] = [
  {
    from: "client",
    label: "ClientHello (+ key_share)",
    detail: "Client guesses which key-exchange group the server will pick and sends its ephemeral public key share right away. This one guess removes a whole round trip.",
    rtt: 0,
    encrypted: false,
  },
  {
    from: "server",
    label: "ServerHello, EncryptedExtensions, Certificate, CertificateVerify, Finished",
    detail: "Server replies with its key share, so both sides can already compute handshake keys. Everything after ServerHello is encrypted. CertificateVerify is a signature over the transcript with the server's private key - proof it owns the certificate. Finished is the checksum.",
    rtt: 1,
    encrypted: true,
  },
  {
    from: "client",
    label: "Finished (+ optional client certificate)",
    detail: "Client sends its Finished checksum. The handshake is done after just 1 round trip - half the latency of TLS 1.2.",
    rtt: 2,
    encrypted: true,
  },
  {
    from: "client",
    label: "Application data",
    detail: "Done in 1-RTT. TLS 1.3 also removed weak ciphers, static RSA key exchange and renegotiation, and every handshake has forward secrecy.",
    rtt: 2,
    encrypted: true,
  },
];

function TlsLab() {
  const { isPro } = usePlan();
  const trial = useToolTrial("tls-handshake-lab", isPro);
  const seo = toolSeo;

  const [version, setVersion] = useState<Version>("1.3");
  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1.5);
  const [copied, setCopied] = useState(false);

  const seq = version === "1.3" ? SEQ_13 : SEQ_12;
  const total = seq.length;
  const cur = seq[Math.min(stepIdx, total - 1)];

  useEffect(() => {
    setStepIdx(0);
    setPlaying(false);
  }, [version]);

  useEffect(() => {
    if (!playing) return;
    if (stepIdx >= total - 1) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setStepIdx((s) => Math.min(s + 1, total - 1)), 1000 / speed);
    return () => clearTimeout(t);
  }, [playing, stepIdx, speed, total]);

  const copySummary = useCallback(() => {
    if (!trial.canUse) return;
    const text = [
      `TLS ${version} handshake summary`,
      ``,
      ...seq.map((m, k) => `${k + 1}. [${m.from}] ${m.label}${m.encrypted ? " (encrypted)" : " (plaintext)"}`),
      ``,
      `Round trips: TLS 1.2 needs 2, TLS 1.3 needs 1.`,
      `Simplified model from IconVault TLS Lab - extensions, session resumption and alert details omitted.`,
    ].join("\n");
    void navigator.clipboard.writeText(text).then(() => {
      trial.recordUse();
      setCopied(true);
      toast.success("Summary copied");
      setTimeout(() => setCopied(false), 1500);
    });
  }, [version, seq, trial]);

  return (
    <ToolPageShell toolId="tls-handshake-lab" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="TLS Lab" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">TLS version</p>
            <div className="grid grid-cols-2 gap-2">
              {(["1.3", "1.2"] as Version[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVersion(v)}
                  className={cn(
                    "rounded-xl border px-4 py-3 text-center transition",
                    version === v ? "border-primary bg-primary/10" : "border-border hover:border-primary/40",
                  )}
                >
                  <p className={cn("font-mono text-base font-bold", version === v ? "text-primary" : "text-foreground/80")}>TLS {v}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{v === "1.3" ? "1-RTT, modern" : "2-RTT, legacy"}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background p-4">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setStepIdx(0)} className="rounded-lg border border-border p-2 text-muted-foreground transition hover:border-primary/50 hover:text-foreground" title="Reset">
                <RotateCcw className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setStepIdx((s) => Math.max(0, s - 1))} disabled={stepIdx === 0} className="rounded-lg border border-border p-2 text-muted-foreground transition hover:border-primary/50 hover:text-foreground disabled:opacity-40" title="Step back">
                <StepBack className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setPlaying((p) => !p)} disabled={total === 0} className="rounded-lg bg-primary p-2.5 text-primary-foreground transition hover:opacity-90 disabled:opacity-40" title={playing ? "Pause" : "Play"}>
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
              <input type="range" min={0.5} max={4} step={0.5} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="w-full accent-primary" />
              <span className="font-mono text-xs text-muted-foreground">{speed}/s</span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground">ROUND TRIPS SO FAR</span>
              <span className="font-mono text-2xl font-bold text-primary">{cur?.rtt ?? 0}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${((cur?.rtt ?? 0) / (version === "1.3" ? 2 : 3)) * 100}%` }}
              />
            </div>
          </div>

          <ActionButton disabled={!trial.canUse} onClick={copySummary}>
            {copied ? <Lock className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy summary"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left - everything runs locally in your browser.
            </p>
          )}
        </div>

        <div className="space-y-5">
          {/* diagram */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
              <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 text-center">
                <p className="font-bold text-primary">Client</p>
                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">your browser</p>
              </div>
              <div className="flex h-full flex-col items-center justify-center gap-1 px-1">
                <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">wire</span>
                <div className="h-24 w-px bg-border" />
              </div>
              <div className="rounded-xl border border-violet-500/40 bg-violet-500/5 p-4 text-center">
                <p className="font-bold text-violet-300">Server</p>
                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">iconvault.site</p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {seq.map((m, mi) => {
                const shown = mi <= stepIdx;
                const active = mi === stepIdx;
                const fromClient = m.from === "client";
                return (
                  <div key={mi} className={cn("transition-all duration-300", shown ? "opacity-100" : "opacity-25")}>
                    <div className={cn("flex items-center gap-2", fromClient ? "flex-row" : "flex-row-reverse")}>
                      {fromClient ? <ArrowRight className="h-4 w-4 shrink-0 text-primary" /> : <ArrowLeft className="h-4 w-4 shrink-0 text-violet-300" />}
                      <div
                        className={cn(
                          "flex-1 rounded-xl border px-3.5 py-2.5",
                          active
                            ? "border-primary bg-primary/10 shadow-[0_0_16px_rgba(0,0,0,0.2)]"
                            : "border-border bg-background",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <p className={cn("font-mono text-sm font-bold", active ? "text-primary" : "text-foreground/85")}>{m.label}</p>
                          {m.encrypted && (
                            <span className="flex items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-300">
                              <Lock className="h-3 w-3" /> encrypted
                            </span>
                          )}
                          {!m.encrypted && mi > 0 && (
                            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-300">plaintext</span>
                          )}
                        </div>
                      </div>
                      {fromClient ? <ArrowRight className="h-4 w-4 shrink-0 text-primary" /> : <ArrowLeft className="h-4 w-4 shrink-0 text-violet-300" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* explanation */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-2 text-[13px] font-medium text-foreground/80">
              Step {stepIdx + 1}: <span className="font-mono font-bold text-primary">{cur?.label}</span>
            </p>
            <p className="text-sm leading-relaxed text-foreground/85">{cur?.detail}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-background p-3.5">
                <p className="text-xs font-bold text-emerald-300">Why TLS 1.3 wins</p>
                <p className="mt-1 text-xs text-muted-foreground">1 round trip instead of 2, forward secrecy on every handshake, and weak ciphers removed from the spec.</p>
              </div>
              <div className="rounded-xl border border-border bg-background p-3.5">
                <p className="text-xs font-bold text-amber-300">Why 1.2 still matters</p>
                <p className="mt-1 text-xs text-muted-foreground">Older servers and embedded devices still speak 1.2 - browsers negotiate the best version both sides support.</p>
              </div>
            </div>
            <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
              Simplified model: extensions, session resumption (PSK), HelloRetryRequest and alert messages are omitted.
            </p>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
