// /tools/pip-playground - Picture-in-Picture lab: a canvas-drawn animated source
// feeds a video element, which enters real PiP. Custom transport controls on the
// page drive the PiP window, with live events and track info. Fully client-side.

import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Pause, Play, ExternalLink, X, Info, RotateCcw, Activity } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/pip-playground")({
  head: () => {
    const seo = getToolSeoMeta("pip-playground");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: PipPlayground,
});

const SOURCES = [
  { key: "clock", label: "Live clock" },
  { key: "bars", label: "Audio bars" },
  { key: "bounce", label: "Bouncing ball" },
] as const;

type SourceKey = (typeof SOURCES)[number]["key"];

function PipPlayground() {
  const { isPro } = usePlan();
  const trial = useToolTrial("pip-playground", isPro);
  const seo = getToolSeo("pip-playground");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number>(0);
  const tRef = useRef(0);

  const [supported, setSupported] = useState<boolean | null>(null);
  const [inPip, setInPip] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [source, setSource] = useState<SourceKey>("clock");
  const [events, setEvents] = useState<string[]>([]);
  const [winSize, setWinSize] = useState("");
  const [muted, setMuted] = useState(true);

  const log = (msg: string) => setEvents((p) => [...p.slice(-19), `${new Date().toLocaleTimeString()}  ${msg}`]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    setSupported(typeof document !== "undefined" && "pictureInPictureEnabled" in document);

    const ctx = canvas.getContext("2d")!;
    const draw = () => {
      const t = tRef.current;
      const w = canvas.width, h = canvas.height;
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#0f766e");
      g.addColorStop(1, "#115e59");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      if (source === "clock") {
        ctx.font = "bold 72px system-ui, sans-serif";
        ctx.fillText(new Date().toLocaleTimeString(), w / 2, h / 2 + 10);
        ctx.font = "20px system-ui, sans-serif";
        ctx.fillText("IconVault PiP lab", w / 2, h / 2 + 52);
      } else if (source === "bars") {
        const n = 24;
        for (let i = 0; i < n; i++) {
          const v = (Math.sin(t * 3 + i * 0.55) * 0.5 + 0.5) * (h * 0.7) + 8;
          ctx.fillStyle = `hsl(${168 + i * 4} 70% 45%)`;
          const bw = (w - 40) / n;
          ctx.fillRect(20 + i * bw, h / 2 - v / 2, bw - 4, v);
        }
      } else {
        const x = w / 2 + Math.sin(t * 2.2) * (w / 2 - 60);
        const y = h / 2 + Math.cos(t * 3.1) * (h / 2 - 60);
        ctx.beginPath();
        ctx.arc(x, y, 34, 0, Math.PI * 2);
        ctx.fillStyle = "#fbbf24";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 6;
        ctx.stroke();
      }
      tRef.current += 1 / 30;
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();

    const stream = canvas.captureStream(30);
    video.srcObject = stream;
    video.muted = muted;
    void video.play().catch(() => { /* autoplay may need a gesture */ });

    const onEnter = () => { setInPip(true); log("enterpictureinpicture: window opened"); };
    const onLeave = () => {
      setInPip(false); log("leavepictureinpicture: window closed");
      const v = videoRef.current;
      if (v) {
        const pw = (v as HTMLVideoElement & { pictureInPictureWindow?: { width: number; height: number } }).pictureInPictureWindow;
        setWinSize(pw ? `${pw.width}x${pw.height}` : "");
      }
    };
    video.addEventListener("enterpictureinpicture", onEnter);
    video.addEventListener("leavepictureinpicture", onLeave);
    return () => {
      cancelAnimationFrame(rafRef.current);
      video.removeEventListener("enterpictureinpicture", onEnter);
      video.removeEventListener("leavepictureinpicture", onLeave);
      stream.getTracks().forEach((tr) => tr.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (v) { v.muted = muted; }
  }, [muted]);

  const togglePlay = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (playing) { v.pause(); } else { await v.play(); }
      setPlaying(!playing);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Playback failed");
    }
  };

  const enterPip = async () => {
    if (!trial.canUse) return;
    const v = videoRef.current;
    if (!v) return;
    if (!(document as Document & { pictureInPictureEnabled?: boolean }).pictureInPictureEnabled) {
      toast.error("Picture-in-Picture is not enabled in this browser");
      return;
    }
    try {
      await v.play();
      setPlaying(true);
      await v.requestPictureInPicture();
      trial.recordUse();
      toast.success("PiP window opened");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "PiP failed";
      log(`requestPictureInPicture error: ${msg}`);
      toast.error(msg.includes("user gesture") ? "Press the button again - PiP needs a click" : msg);
    }
  };

  const exitPip = async () => {
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not exit PiP");
    }
  };

  const seek = (delta: number) => {
    // canvas stream video is live; show what seeking would do on a real file
    toast.info("This is a live canvas stream (no duration), so seeking does not apply here");
  };

  const reset = () => { setEvents([]); setWinSize(""); };

  return (
    <ToolPageShell toolId="pip-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Picture-in-Picture" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-sm font-bold">Canvas source</p>
            <div className="grid grid-cols-3 gap-2">
              {SOURCES.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSource(s.key)}
                  className={cn(
                    "rounded-xl border px-2 py-2.5 text-xs font-semibold transition",
                    source === s.key ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <canvas ref={canvasRef} width={480} height={270} className="w-full rounded-xl border border-border" />

          <div className="flex flex-wrap gap-2">
            <button
              type="button" onClick={togglePlay}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-bold hover:border-primary/40"
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {playing ? "Pause" : "Play"}
            </button>
            <ActionButton busy={false} disabled={!trial.canUse || inPip} onClick={enterPip}>
              <ExternalLink className="h-4 w-4" /> Enter PiP
            </ActionButton>
            {inPip && (
              <button
                type="button" onClick={exitPip}
                className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-bold hover:border-primary/40"
              >
                <X className="h-4 w-4" /> Exit PiP
              </button>
            )}
          </div>

          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-border px-4 py-3 text-sm font-semibold">
            Muted (required for autoplay)
            <input type="checkbox" checked={muted} onChange={(e) => setMuted(e.target.checked)} className="h-4 w-4 accent-primary" />
          </label>

          <div className="space-y-1.5 text-[13px]">
            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
              <span className="text-muted-foreground">PiP enabled</span>
              <span className={cn("font-bold", supported ? "text-green-600" : "text-red-500")}>
                {supported === null ? "Checking…" : supported ? "Yes" : "No"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
              <span className="text-muted-foreground">In PiP now</span>
              <span className={cn("font-bold", inPip ? "text-green-600" : "text-muted-foreground")}>{inPip ? "Yes" : "No"}</span>
            </div>
            {winSize && (
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                <span className="text-muted-foreground">Last PiP window</span>
                <span className="font-mono font-bold">{winSize}px</span>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-muted-foreground">
            <p className="flex items-start gap-1.5">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              This is video PiP (requestPictureInPicture), which works in all Chromium and Safari.
              A separate lab covers Document PiP (custom HTML windows).
            </p>
          </div>

          <button type="button" onClick={reset} className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
            <RotateCcw className="h-3.5 w-3.5" /> Clear events
          </button>
        </div>

        <div className="space-y-5">
          <video ref={videoRef} className="hidden" playsInline />
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 flex items-center gap-2 text-sm font-bold"><Activity className="h-4 w-4" /> PiP events (live)</p>
            <div className="max-h-64 space-y-1.5 overflow-y-auto font-mono text-xs">
              {events.length === 0 && <p className="text-muted-foreground">Enter PiP to watch the events fire. The events come from your browser's real PiP implementation.</p>}
              {events.map((e, i) => (
                <div key={i} className="rounded-lg bg-muted/40 px-3 py-2">{e}</div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-2 text-sm font-bold">Custom controls pattern</p>
            <pre className="overflow-x-auto rounded-xl bg-muted/60 p-4 font-mono text-xs leading-relaxed">{`// Your page keeps full control:
await video.requestPictureInPicture();
// then drive it from your own UI:
video.play(); video.pause(); video.muted = true;
// or let the user close it programmatically:
await document.exitPictureInPicture();`}</pre>
            <button type="button" onClick={() => seek(10)} className="mt-3 text-xs font-semibold text-primary hover:underline">
              What about seeking? (click to see)
            </button>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
