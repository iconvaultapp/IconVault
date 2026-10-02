// /tools/http2-lab - A side-by-side race: HTTP/1.1 with 6 connections and
// head-of-line blocking vs HTTP/2 with one multiplexed connection.

import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Play, Pause, RotateCcw, Copy, Zap, Trophy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/http2-lab")({
  head: () => {
    const seo = getToolSeoMeta("http2-lab");
    const canonical = "https://iconvault.site/tools/http2-lab";
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
  component: Http2Lab,
});

interface Asset {
  name: string;
  kb: number;
  slow?: boolean;
}

const ASSETS: Asset[] = [
  { name: "index.html", kb: 28 },
  { name: "styles.css", kb: 64 },
  { name: "app.js", kb: 120 },
  { name: "hero.jpg", kb: 420, slow: true },
  { name: "logo.svg", kb: 18 },
  { name: "font.woff2", kb: 96 },
  { name: "thumb-1.webp", kb: 44 },
  { name: "thumb-2.webp", kb: 52 },
  { name: "thumb-3.webp", kb: 38 },
  { name: "icons.svg", kb: 26 },
  { name: "analytics.js", kb: 58 },
  { name: "avatar.png", kb: 34 },
];

const BW = 1000; // KB/s total
const DT = 0.05; // virtual seconds per frame

interface Frame {
  h1: number[];
  h2: number[];
}

function simulate(): { frames: Frame[]; h1Time: number; h2Time: number } {
  const n = ASSETS.length;
  const frames: Frame[] = [];
  const h1 = new Array<number>(n).fill(0);
  const h2 = new Array<number>(n).fill(0);

  // HTTP/1.1: 6 connections, round-robin queue, each active conn gets BW/6
  const CONNS = 6;
  const queues: number[][] = Array.from({ length: CONNS }, () => []);
  ASSETS.forEach((_, ai) => queues[ai % CONNS]!.push(ai));
  const connAsset: (number | null)[] = queues.map((q) => q.shift() ?? null);
  const connGot = new Array<number>(CONNS).fill(0);
  let h1Done = false;
  let h1Frames = 0;

  // HTTP/2: single connection, BW shared across active streams
  const h2Left = ASSETS.map((a) => a.kb);
  let h2Done = false;
  let h2Frames = 0;

  for (let f = 0; f < 4000 && (!h1Done || !h2Done); f++) {
    if (!h1Done) {
      h1Frames++;
      for (let c = 0; c < CONNS; c++) {
        const ai = connAsset[c];
        if (ai === null || ai === undefined) continue;
        const share = (BW / CONNS) * DT;
        connGot[c]! += share;
        const size = ASSETS[ai]!.kb;
        if (connGot[c]! >= size) {
          h1[ai] = 1;
          const next = queues[c]!.shift() ?? null;
          connAsset[c] = next;
          connGot[c] = 0;
        } else {
          h1[ai] = connGot[c]! / size;
        }
      }
      h1Done = connAsset.every((a) => a === null);
    }
    if (!h2Done) {
      h2Frames++;
      const active: number[] = [];
      for (let ai = 0; ai < n; ai++) if (h2Left[ai]! > 0) active.push(ai);
      if (active.length === 0) {
        h2Done = true;
      } else {
        const share = (BW / active.length) * DT;
        for (const ai of active) {
          h2Left[ai]! -= share;
          if (h2Left[ai]! <= 0) {
            h2Left[ai] = 0;
            h2[ai] = 1;
          } else {
            h2[ai] = 1 - h2Left[ai]! / ASSETS[ai]!.kb;
          }
        }
        if (h2Left.every((v) => v <= 0)) h2Done = true;
      }
    }
    frames.push({ h1: [...h1], h2: [...h2] });
  }
  return { frames, h1Time: h1Frames * DT, h2Time: h2Frames * DT };
}

function fmtS(s: number): string {
  return `${s.toFixed(2)}s`;
}

function Http2Lab() {
  const { isPro } = usePlan();
  const trial = useToolTrial("http2-lab", isPro);
  const seo = getToolSeo("http2-lab");

  const [frameIdx, setFrameIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(30);
  const [copied, setCopied] = useState(false);

  const sim = useMemo(() => simulate(), []);
  const total = sim.frames.length;
  const frame: Frame = sim.frames[Math.min(frameIdx, total - 1)] ?? { h1: [], h2: [] };
  const finished = frameIdx >= total - 1;
  const vt = Math.min(frameIdx, total - 1) * DT;

  useEffect(() => {
    if (!playing) return;
    if (frameIdx >= total - 1) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setFrameIdx((s) => Math.min(s + 1, total - 1)), 1000 / speed);
    return () => clearTimeout(t);
  }, [playing, frameIdx, speed, total]);

  const reset = () => {
    setFrameIdx(0);
    setPlaying(false);
  };

  const copyComparison = useCallback(() => {
    if (!trial.canUse) return;
    const totalKb = ASSETS.reduce((a, x) => a + x.kb, 0);
    const text = [
      `HTTP/1.1 vs HTTP/2 race - ${ASSETS.length} assets, ${totalKb} KB total, ${BW} KB/s simulated`,
      ``,
      `HTTP/1.1: ${fmtS(sim.h1Time)} - 6 parallel connections, one slow asset (hero.jpg, 420 KB) blocks its whole connection (head-of-line blocking).`,
      `HTTP/2:   ${fmtS(sim.h2Time)} - 1 connection, 12 multiplexed streams share bandwidth, no blocking.`,
      ``,
      `Winner: HTTP/2 by ${fmtS(sim.h1Time - sim.h2Time)} (${((sim.h1Time / sim.h2Time - 1) * 100).toFixed(0)}% faster in this scenario).`,
      ``,
      `Simulated in IconVault HTTP/2 Lab - simplified model: no TLS handshake cost, no prioritization, no server push.`,
    ].join("\n");
    void navigator.clipboard.writeText(text).then(() => {
      trial.recordUse();
      setCopied(true);
      toast.success("Comparison copied");
      setTimeout(() => setCopied(false), 1500);
    });
  }, [sim, trial]);

  const bar = (p: number, color: string, done: boolean) => (
    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
      <div
        className={cn("h-full rounded-full transition-[width] duration-100", done ? "bg-emerald-500" : color)}
        style={{ width: `${Math.round(p * 100)}%` }}
      />
    </div>
  );

  const h1DoneCount = frame.h1.filter((p) => p >= 1).length;
  const h2DoneCount = frame.h2.filter((p) => p >= 1).length;

  return (
    <ToolPageShell toolId="http2-lab" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="HTTP/2 Lab" left={trial.left} />

      <div className="space-y-5">
        {/* controls */}
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4">
          <button type="button" onClick={reset} className="rounded-lg border border-border p-2.5 text-muted-foreground transition hover:border-primary/50 hover:text-foreground" title="Reset">
            <RotateCcw className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setPlaying((p) => !p)} className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90">
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {playing ? "Pause race" : finished ? "Race again" : "Start race"}
          </button>
          <input type="range" min={0} max={total - 1} value={frameIdx} onChange={(e) => { setFrameIdx(Number(e.target.value)); setPlaying(false); }} className="min-w-[160px] flex-1 accent-primary" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Speed</span>
            <input type="range" min={5} max={120} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="w-28 accent-primary" />
          </div>
          <span className="font-mono text-sm font-bold text-primary">t = {fmtS(vt)}</span>
          <div className="ml-auto">
            <ActionButton disabled={!trial.canUse} onClick={copyComparison}>
              {copied ? <Zap className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy comparison"}
            </ActionButton>
          </div>
        </div>
        {!isPro && (
          <p className="-mt-2 text-xs text-muted-foreground">
            {trial.left} of {TOOL_TRIAL_LIMIT} free copies left - everything runs locally in your browser.
          </p>
        )}

        {finished && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4">
            <Trophy className="h-6 w-6 shrink-0 text-emerald-300" />
            <p className="text-sm">
              <span className="font-bold text-emerald-300">HTTP/2 wins</span>
              <span className="text-foreground/85"> - {fmtS(sim.h2Time)} vs {fmtS(sim.h1Time)}. Multiplexing beat 6 connections by {fmtS(sim.h1Time - sim.h2Time)} in this scenario.</span>
            </p>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-2">
          {/* HTTP/1.1 */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-1 flex items-center justify-between">
              <p className="font-bold text-foreground/90">HTTP/1.1</p>
              <span className="font-mono text-xs text-muted-foreground">{h1DoneCount}/{ASSETS.length} done</span>
            </div>
            <p className="mb-4 text-xs text-muted-foreground">6 connections - each downloads its queue in order. Watch hero.jpg block connection 4.</p>
            <div className="space-y-3">
              {Array.from({ length: 6 }, (_, c) => {
                const mine = ASSETS.map((a, ai) => ({ a, ai })).filter(({ ai }) => ai % 6 === c);
                const active = mine.find(({ ai }) => frame.h1[ai]! > 0 && frame.h1[ai]! < 1);
                return (
                  <div key={c} className={cn("rounded-xl border p-3", active?.a.slow ? "border-amber-500/60 bg-amber-500/5" : "border-border bg-background")}>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-muted-foreground">conn {c + 1}</span>
                      {active?.a.slow && <span className="rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-300">BLOCKED by hero.jpg</span>}
                    </div>
                    <div className="space-y-1.5">
                      {mine.map(({ a, ai }) => {
                        const p = frame.h1[ai] ?? 0;
                        const queued = p === 0;
                        return (
                          <div key={ai} className="flex items-center gap-2">
                            <span className={cn("w-24 shrink-0 truncate font-mono text-[11px]", queued ? "text-muted-foreground/50" : "text-foreground/80")} title={a.name}>
                              {a.name}
                            </span>
                            {bar(p, "bg-sky-500", p >= 1)}
                            <span className="w-10 shrink-0 text-right font-mono text-[10px] text-muted-foreground">{a.kb}k</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 font-mono text-sm">Finish: <span className="font-bold text-sky-300">{fmtS(sim.h1Time)}</span></p>
          </div>

          {/* HTTP/2 */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-1 flex items-center justify-between">
              <p className="font-bold text-foreground/90">HTTP/2</p>
              <span className="font-mono text-xs text-muted-foreground">{h2DoneCount}/{ASSETS.length} done</span>
            </div>
            <p className="mb-4 text-xs text-muted-foreground">1 connection - 12 streams multiplexed, bandwidth shared. No head-of-line blocking.</p>
            <div className="rounded-xl border border-border bg-background p-3">
              <p className="mb-2 font-mono text-[11px] font-bold text-muted-foreground">single connection - 12 streams</p>
              <div className="space-y-1.5">
                {ASSETS.map((a, ai) => {
                  const p = frame.h2[ai] ?? 0;
                  return (
                    <div key={ai} className="flex items-center gap-2">
                      <span className="w-24 shrink-0 truncate font-mono text-[11px] text-foreground/80" title={a.name}>{a.name}</span>
                      {bar(p, "bg-primary", p >= 1)}
                      <span className="w-10 shrink-0 text-right font-mono text-[10px] text-muted-foreground">{a.kb}k</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <p className="mt-3 font-mono text-sm">Finish: <span className="font-bold text-emerald-300">{fmtS(sim.h2Time)}</span></p>
            <div className="mt-4 space-y-2 border-t border-border pt-3 text-xs text-muted-foreground">
              <p><span className="font-bold text-foreground/80">Multiplexing:</span> many streams share one TCP connection, interleaved frame by frame.</p>
              <p><span className="font-bold text-foreground/80">No HOL blocking:</span> a slow asset only slows its own stream, never the others.</p>
              <p><span className="font-bold text-foreground/80">Bonus:</span> header compression (HPACK) and server push cut even more overhead.</p>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Simplified model: fixed {BW} KB/s bandwidth, no TLS handshake cost, no prioritization, no packet loss. Real-world gaps vary, but multiplexing consistently wins on asset-heavy pages.
        </p>
      </div>
    </ToolPageShell>
  );
}
