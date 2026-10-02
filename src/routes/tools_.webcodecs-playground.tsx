// /tools/webcodecs-playground - Learn WebCodecs with real capability
// detection: codec support matrix, encoder config validator, no fake encodes.

import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClipboardCopy, Film, Play } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/webcodecs-playground")({
  head: () => {
    const seo = getToolSeoMeta("webcodecs-playground");
    const canonical = "https://iconvault.site/tools/webcodecs-playground";
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
  component: WebCodecsTool,
});

const VIDEO_CODECS = [
  { codec: "avc1.42001f", label: "H.264 Baseline" },
  { codec: "avc1.640028", label: "H.264 High" },
  { codec: "vp8", label: "VP8" },
  { codec: "vp09.00.10.08", label: "VP9" },
  { codec: "av01.0.05M.08", label: "AV1" },
  { codec: "hvc1.1.6.L93.B0", label: "HEVC" },
];

const AUDIO_CODECS = [
  { codec: "opus", label: "Opus" },
  { codec: "mp4a.40.2", label: "AAC-LC" },
  { codec: "flac", label: "FLAC" },
];

type SupportMap = Record<string, boolean | null>;

function WebCodecsTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("webcodecs-playground", isPro);
  const seo = getToolSeo("webcodecs-playground");

  const [api, setApi] = useState<Record<string, boolean> | null>(null);
  const [videoSupport, setVideoSupport] = useState<SupportMap>({});
  const [audioSupport, setAudioSupport] = useState<SupportMap>({});
  const [busy, setBusy] = useState(false);
  const [ran, setRan] = useState(false);

  const [codec, setCodec] = useState("avc1.42001f");
  const [width, setWidth] = useState(1280);
  const [height, setHeight] = useState(720);
  const [framerate, setFramerate] = useState(30);
  const [bitrate, setBitrate] = useState(5_000_000);
  const [verdict, setVerdict] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as unknown as Record<string, unknown>;
    setApi({
      VideoEncoder: "VideoEncoder" in w,
      VideoDecoder: "VideoDecoder" in w,
      AudioEncoder: "AudioEncoder" in w,
      AudioDecoder: "AudioDecoder" in w,
      VideoFrame: "VideoFrame" in w,
      EncodedVideoChunk: "EncodedVideoChunk" in w,
    });
  }, []);

  const runMatrix = async () => {
    if (busy || !trial.canUse) return;
    if (typeof VideoEncoder === "undefined") {
      toast.error("VideoEncoder is not available in this browser.");
      return;
    }
    setBusy(true);
    trial.recordUse();
    const vs: SupportMap = {};
    for (const c of VIDEO_CODECS) {
      try {
        const r = await VideoEncoder.isConfigSupported({
          codec: c.codec,
          width: 1280,
          height: 720,
          bitrate: 5_000_000,
          framerate: 30,
        });
        vs[c.codec] = r.supported === true;
      } catch {
        vs[c.codec] = false;
      }
    }
    setVideoSupport(vs);
    const as: SupportMap = {};
    if (typeof AudioEncoder !== "undefined") {
      for (const c of AUDIO_CODECS) {
        try {
          const r = await AudioEncoder.isConfigSupported({
            codec: c.codec,
            sampleRate: 48000,
            numberOfChannels: 2,
            bitrate: 128_000,
          });
          as[c.codec] = r.supported === true;
        } catch {
          as[c.codec] = false;
        }
      }
    } else {
      for (const c of AUDIO_CODECS) as[c.codec] = false;
    }
    setAudioSupport(as);
    setRan(true);
    setBusy(false);
    toast.success("Support matrix checked against this browser");
  };

  const checkConfig = async () => {
    if (checking || !trial.canUse) return;
    if (typeof VideoEncoder === "undefined") {
      toast.error("VideoEncoder is not available in this browser.");
      return;
    }
    setChecking(true);
    try {
      const r = await VideoEncoder.isConfigSupported({ codec, width, height, bitrate, framerate });
      setVerdict(
        r.supported
          ? `Supported: ${codec} at ${width}x${height}@${framerate}fps, ${(bitrate / 1_000_000).toFixed(1)} Mbps.`
          : `Not supported: this browser refuses ${codec} at ${width}x${height}@${framerate}fps. Try a lower resolution or a different codec.`,
      );
    } catch (e) {
      setVerdict(`Invalid config: ${e instanceof Error ? e.message : "rejected"}.`);
    } finally {
      setChecking(false);
    }
  };

  const copy = async (t: string, label: string) => {
    try {
      await navigator.clipboard.writeText(t);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Clipboard blocked - select and copy manually.");
    }
  };

  const snippet = `// Minimal real WebCodecs encode loop
const encoder = new VideoEncoder({
  output: (chunk, meta) => {
    // chunk is an EncodedVideoChunk; mux it (e.g. into MP4/WebM) yourself
    console.log(chunk.type, chunk.byteLength, meta);
  },
  error: (e) => console.error(e),
});

encoder.configure({
  codec: "avc1.42001f",
  width: 1280,
  height: 720,
  bitrate: 5_000_000,
  framerate: 30,
});

const frame = new VideoFrame(canvas, { timestamp: 0 }); // from a <canvas>
encoder.encode(frame, { keyFrame: true });
frame.close();
await encoder.flush();
encoder.close();`;

  const matrixRow = (label: string, key: string, map: SupportMap) => {
    const v = map[key];
    return (
      <li key={key} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
        <span>
          <span className="font-bold">{label}</span>{" "}
          <span className="font-mono text-xs text-muted-foreground">{key}</span>
        </span>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-bold",
            v === true && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
            v === false && "bg-red-500/15 text-red-500",
            v === undefined && "bg-muted text-muted-foreground",
          )}
        >
          {v === true ? "Supported" : v === false ? "No" : ran ? "No" : "Not checked"}
        </span>
      </li>
    );
  };

  return (
    <ToolPageShell toolId="webcodecs-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="WebCodecs" left={trial.left} />

      <div className="mb-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">API detection in this browser</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {api === null
            ? <p className="text-sm text-muted-foreground">Checking…</p>
            : Object.entries(api).map(([k, v]) => (
              <div key={k} className={cn("rounded-xl border px-3 py-2 text-center font-mono text-xs font-bold", v ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400" : "border-border text-muted-foreground")}>
                {k}
                <span className="block text-[10px]">{v ? "present" : "missing"}</span>
              </div>
            ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-base font-bold">
                <Film className="h-5 w-5 text-primary" /> Codec support matrix
              </h2>
              <ActionButton busy={busy} disabled={busy || !trial.canUse} onClick={runMatrix}>
                <Play className="h-4 w-4" /> {busy ? "Checking…" : "Run checks"}
              </ActionButton>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              Real <code>isConfigSupported()</code> calls against this browser at 1280x720, 30fps, 5 Mbps. Results vary
              by OS and hardware, nothing is hard-coded.
            </p>
            <ul className="space-y-1.5">
              {VIDEO_CODECS.map((c) => matrixRow(c.label, c.codec, videoSupport))}
            </ul>
            <h3 className="mb-2 mt-5 text-sm font-bold">Audio</h3>
            <ul className="space-y-1.5">
              {AUDIO_CODECS.map((c) => matrixRow(c.label, c.codec, audioSupport))}
            </ul>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-base font-bold">Encoder config validator</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Build a config and validate it for real before writing encode code.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Codec string</label>
                <input
                  value={codec}
                  onChange={(e) => setCodec(e.target.value.trim())}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Framerate</label>
                <input
                  type="number"
                  value={framerate}
                  min={1}
                  max={120}
                  onChange={(e) => setFramerate(Number(e.target.value))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Width</label>
                <input
                  type="number"
                  value={width}
                  min={16}
                  max={8192}
                  step={2}
                  onChange={(e) => setWidth(Number(e.target.value))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Height</label>
                <input
                  type="number"
                  value={height}
                  min={16}
                  max={8192}
                  step={2}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </div>
              <div className="sm:col-span-2">
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-[13px] font-medium text-foreground/80">Bitrate</label>
                  <span className="text-sm font-bold text-primary">{(bitrate / 1_000_000).toFixed(1)} Mbps</span>
                </div>
                <input
                  type="range"
                  min={250_000}
                  max={40_000_000}
                  step={250_000}
                  value={bitrate}
                  onChange={(e) => setBitrate(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
            </div>
            <div className="mt-3">
              <ActionButton busy={checking} disabled={checking || !trial.canUse} onClick={checkConfig}>
                Validate config
              </ActionButton>
            </div>
            {verdict && <p className="mt-3 rounded-xl bg-muted p-3 text-sm">{verdict}</p>}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-base font-bold">Real encode loop</h2>
              <button
                type="button"
                onClick={() => void copy(snippet, "Snippet")}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                <ClipboardCopy className="h-3.5 w-3.5" /> Copy
              </button>
            </div>
            <pre className="max-h-80 overflow-auto rounded-xl bg-muted p-4 font-mono text-xs leading-relaxed">{snippet}</pre>
            <p className="mt-2 text-xs text-muted-foreground">
              WebCodecs gives you raw encoded chunks, not a file. Pair it with a muxer (mp4-muxer, webm-muxer) to write
              playable video.
            </p>
          </div>
        </div>
      </div>

      {!isPro && (
        <p className="mt-6 text-xs text-muted-foreground">
          {trial.left} of {TOOL_TRIAL_LIMIT} free checks left.
        </p>
      )}
    </ToolPageShell>
  );
}
