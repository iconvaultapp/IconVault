// /tools/media-session-playground - Interactive Media Session API lab: metadata
// builder, playback state and action handlers with real media key events.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bell, Pause, Play, SkipBack, SkipForward, Trash2, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/media-session-playground";
import toolSeoMeta from "@/lib/tool-seo-meta-data/media-session-playground";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/media-session-playground")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/media-session-playground";
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
  component: MediaSessionTool,
});

const STATES = ["none", "paused", "playing"] as const;
const ACTIONS = ["play", "pause", "previoustrack", "nexttrack", "seekbackward", "seekforward"] as const;

// Generate a 2s 440Hz tone so there is real playing media to attach to.
function makeToneUrl(): string {
  const sr = 44100;
  const n = sr * 2;
  const buf = new Float32Array(n);
  for (let i = 0; i < n; i++) buf[i] = Math.sin((2 * Math.PI * 440 * i) / sr) * 0.3 * (1 - i / n);
  const data = new DataView(new ArrayBuffer(44 + n * 2));
  const wstr = (o: number, s: string) => { for (let i = 0; i < s.length; i++) data.setUint8(o + i, s.charCodeAt(i)); };
  wstr(0, "RIFF"); data.setUint32(4, 36 + n * 2, true); wstr(8, "WAVE"); wstr(12, "fmt ");
  data.setUint32(16, 16, true); data.setUint16(20, 1, true); data.setUint16(22, 1, true);
  data.setUint32(24, sr, true); data.setUint32(28, sr * 2, true); data.setUint16(32, 2, true); data.setUint16(34, 16, true);
  wstr(36, "data"); data.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) data.setInt16(44 + i * 2, Math.max(-1, Math.min(1, buf[i]!)) * 32767, true);
  return URL.createObjectURL(new Blob([data.buffer], { type: "audio/wav" }));
}

function MediaSessionTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("media-session-playground", isPro);
  const seo = toolSeo;

  const [supported] = useState(() => typeof navigator !== "undefined" && "mediaSession" in navigator);
  const [title, setTitle] = useState("Neon Horizons");
  const [artist, setArtist] = useState("IconVault Studio");
  const [album, setAlbum] = useState("Web Audio Demos");
  const [artwork, setArtwork] = useState("");
  const [playbackState, setPlaybackState] = useState<(typeof STATES)[number]>("none");
  const [activeActions, setActiveActions] = useState<string[]>(["play", "pause", "previoustrack", "nexttrack"]);
  const [actionLog, setActionLog] = useState<{ t: number; msg: string }[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const toneUrl = useRef<string>("");
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const log = useCallback((msg: string) => {
    setActionLog((p) => [{ t: Date.now(), msg }, ...p].slice(0, 40));
  }, []);

  const pushState = useCallback((st: (typeof STATES)[number], actions: string[]) => {
    try {
      const ms = navigator.mediaSession;
      ms.playbackState = st;
      const handlers: Record<string, () => void> = {
        play: () => { void audioRef.current?.play(); log("play action received"); },
        pause: () => { audioRef.current?.pause(); log("pause action received"); },
        previoustrack: () => log("previoustrack action received"),
        nexttrack: () => log("nexttrack action received"),
        seekbackward: () => { if (audioRef.current) audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 5); log("seekbackward (-5s)"); },
        seekforward: () => { if (audioRef.current) audioRef.current.currentTime += 5; log("seekforward (+5s)"); },
      };
      for (const a of ACTIONS) {
        try {
          if (actions.includes(a)) ms.setActionHandler(a as MediaSessionAction, handlers[a]!);
          else ms.setActionHandler(a as MediaSessionAction, null);
        } catch { /* handler unsupported */ }
      }
    } catch { /* unsupported */ }
  }, [log]);

  const applyMetadata = useCallback(() => {
    if (!supported) { toast.error("Media Session API is not supported in this browser"); return; }
    if (!trial.canUse) { toast.error("Free trial exhausted - go Pro for unlimited runs"); return; }
    try {
      const arts: MediaImage[] = artwork.trim()
        ? [{ src: artwork.trim(), sizes: "512x512", type: "image/png" }]
        : [{ src: makeArtwork(), sizes: "512x512", type: "image/png" }];
      navigator.mediaSession.metadata = new MediaMetadata({ title: title || "Untitled", artist: artist || "Unknown", album: album || "", artwork: arts });
      pushState(playbackState, activeActions);
      trial.recordUse();
      log(`Metadata set: "${title}" by ${artist}`);
      toast.success("Media metadata published", { description: "Check your OS media controls / lock screen" });
    } catch (e) {
      toast.error("Could not set metadata", { description: e instanceof Error ? e.message : undefined });
    }
  }, [supported, trial, title, artist, album, artwork, playbackState, activeActions, pushState, log]);

  const togglePlay = useCallback(async () => {
    const a = audioRef.current;
    if (!a) return;
    if (isPlaying) { a.pause(); setIsPlaying(false); setPlaybackState("paused"); pushState("paused", activeActions); }
    else {
      if (!toneUrl.current) toneUrl.current = makeToneUrl();
      a.src = toneUrl.current;
      await a.play().catch(() => toast.error("Playback blocked - tap Play again to allow audio"));
      setIsPlaying(true);
      if (supported) { setPlaybackState("playing"); pushState("playing", activeActions); }
    }
  }, [isPlaying, supported, activeActions, pushState]);

  useEffect(() => {
    if (!toneUrl.current) return;
    return () => { if (toneUrl.current) URL.revokeObjectURL(toneUrl.current); };
  }, []);

  const toggleAction = (a: string) =>
    setActiveActions((p) => (p.includes(a) ? p.filter((x) => x !== a) : [...p, a]));

  return (
    <ToolPageShell toolId="media-session-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Media Session" left={trial.left} />

      {!supported && (
        <div className="mb-4 rounded-xl border border-amber-400/40 bg-amber-50 p-4 text-sm dark:bg-amber-950/30">
          <strong>navigator.mediaSession is not available here.</strong> The builder still generates the exact code; run it in Chrome/Edge to see OS controls light up.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div className="space-y-3">
            {[
              ["Title", title, setTitle],
              ["Artist", artist, setArtist],
              ["Album", album, setAlbum],
              ["Artwork URL (optional)", artwork, setArtwork],
            ].map(([label, val, setter]) => (
              <div key={label as string}>
                <label className="mb-1 block text-[13px] font-medium text-foreground/80">{label as string}</label>
                <input
                  value={val as string}
                  onChange={(e) => (setter as (v: string) => void)(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/60"
                />
              </div>
            ))}
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">playbackState</p>
            <div className="flex gap-2">
              {STATES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPlaybackState(s)}
                  className={cn(
                    "flex-1 rounded-xl border px-3 py-2 text-xs font-bold transition",
                    playbackState === s ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Action handlers</p>
            <div className="flex flex-wrap gap-2">
              {ACTIONS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggleAction(a)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 font-mono text-xs font-bold transition",
                    activeActions.includes(a) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground",
                  )}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <ActionButton disabled={!supported || !trial.canUse} onClick={applyMetadata}>
              <Bell className="h-4 w-4" /> Publish metadata
            </ActionButton>
            <button
              type="button"
              onClick={() => void togglePlay()}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-bold hover:border-primary/50"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {isPlaying ? "Pause tone" : "Play test tone"}
            </button>
          </div>

          <audio ref={audioRef} loop className="hidden" />

          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free publishes left.
            </p>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-3 font-bold">Now-playing card (what your OS sees)</h3>
            <div className="flex items-center gap-4 rounded-xl bg-muted/60 p-4">
              <img src={mounted ? (artwork.trim() || makeArtwork()) : ""} alt="Artwork" className="h-20 w-20 rounded-lg bg-muted object-cover" />
              <div className="min-w-0">
                <p className="truncate font-bold">{title || "Untitled"}</p>
                <p className="truncate text-sm text-muted-foreground">{artist || "Unknown artist"}{album ? ` - ${album}` : ""}</p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">playbackState: {playbackState}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button type="button" onClick={() => log("previoustrack (test button)")} className="rounded-lg border border-border p-2 hover:border-primary/50"><SkipBack className="h-4 w-4" /></button>
              <button type="button" onClick={() => void togglePlay()} className="rounded-lg border border-border p-2 hover:border-primary/50">{isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</button>
              <button type="button" onClick={() => log("nexttrack (test button)")} className="rounded-lg border border-border p-2 hover:border-primary/50"><SkipForward className="h-4 w-4" /></button>
              <span className="ml-2 flex items-center gap-1.5 text-xs text-muted-foreground"><Volume2 className="h-3.5 w-3.5" /> Media keys / lock-screen buttons route to your handlers</span>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold">Action handler log</h3>
              <button type="button" onClick={() => setActionLog([])} className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground">
                <Trash2 className="h-3.5 w-3.5" /> Clear
              </button>
            </div>
            {actionLog.length === 0 ? (
              <p className="text-sm text-muted-foreground">Publish metadata, play the test tone, then press your keyboard media keys or lock-screen controls to see the handlers fire.</p>
            ) : (
              <ul className="max-h-56 space-y-1.5 overflow-auto text-sm">
                {actionLog.map((e, i) => (
                  <li key={i} className="flex gap-2 rounded-lg bg-muted/60 px-3 py-1.5">
                    <span className="font-mono text-xs text-muted-foreground">{new Date(e.t).toLocaleTimeString()}</span>
                    <span className="text-xs">{e.msg}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}

let artCache = "";
function makeArtwork(): string {
  if (artCache) return artCache;
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 512, 512);
  g.addColorStop(0, "#0f766e");
  g.addColorStop(1, "#134e4a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath();
  ctx.arc(256, 256, 120, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0f766e";
  ctx.beginPath();
  ctx.moveTo(220, 196); ctx.lineTo(320, 256); ctx.lineTo(220, 316);
  ctx.closePath();
  ctx.fill();
  artCache = c.toDataURL("image/png");
  return artCache;
}

export default MediaSessionTool;
