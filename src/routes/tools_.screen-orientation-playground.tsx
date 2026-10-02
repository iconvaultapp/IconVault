// /tools/screen-orientation-playground - Real Screen Orientation API: live type
// and angle, a phone mock that mirrors your device, lock()/unlock() demos with
// graceful errors (locking usually needs fullscreen), and a code snippet.

import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Check, Info, Lock, LockOpen, Maximize, RotateCw, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/screen-orientation-playground")({
  head: () => {
    const seo = getToolSeoMeta("screen-orientation-playground");
    const canonical = "https://iconvault.site/tools/screen-orientation-playground";
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
  component: ScreenOrientationPlayground,
});

const LOCK_TYPES = ["portrait", "landscape", "portrait-primary", "portrait-secondary", "landscape-primary", "landscape-secondary", "natural", "any"] as const;

function ScreenOrientationPlayground() {
  const { isPro } = usePlan();
  const trial = useToolTrial("screen-orientation-playground", isPro);
  const seo = getToolSeo("screen-orientation-playground");

  const [supported, setSupported] = useState<boolean | null>(null);
  const [type, setType] = useState("");
  const [angle, setAngle] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("orientation" in window.screen)) {
      setSupported(false);
      return;
    }
    setSupported(true);
    const so = window.screen.orientation;
    const update = () => {
      setType(so.type);
      setAngle(so.angle);
    };
    update();
    so.addEventListener("change", update);
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      so.removeEventListener("change", update);
      document.removeEventListener("fullscreenchange", onFs);
    };
  }, []);

  const lockTo = async (t: (typeof LOCK_TYPES)[number]) => {
    if (!trial.canUse) return;
    if (!supported) {
      toast.error("Screen Orientation API is not supported here");
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (window.screen.orientation as any).lock(t);
      setLocked(true);
      trial.recordUse();
      toast.success(`Locked to ${t}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Lock failed";
      if (msg.includes("fullscreen")) {
        toast.error("This browser only allows locking from fullscreen - press Go fullscreen first");
      } else {
        toast.error(msg);
      }
    }
  };

  const unlock = async () => {
    try {
      window.screen.orientation.unlock();
      setLocked(false);
      toast.success("Orientation unlocked");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unlock failed");
    }
  };

  const goFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fullscreen failed");
    }
  };

  const snippet = `// Read orientation live
const so = screen.orientation;
console.log(so.type, so.angle); // e.g. "landscape-primary", 90

// React to changes
so.addEventListener("change", () => {
  console.log("now:", so.type, so.angle);
});

// Lock (returns a promise; may need fullscreen)
try {
  await so.lock("landscape");
} catch (err) {
  console.warn("Could not lock:", err);
}
so.unlock();`;

  const copySnippet = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success("Snippet copied");
    } catch {
      toast.error("Clipboard blocked - copy the text manually");
    }
  };

  const landscape = type.startsWith("landscape");

  return (
    <ToolPageShell toolId="screen-orientation-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Screen Orientation" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-[13px]">
            <span className="text-muted-foreground">Screen Orientation API</span>
            <span className={cn("font-bold", supported ? "text-green-600" : "text-red-500")}>
              {supported === null ? "Checking…" : supported ? "Supported" : "Not supported"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="font-mono text-sm font-black">{type || "-"}</p>
              <p className="text-xs text-muted-foreground">type (live)</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="font-mono text-sm font-black">{angle === null ? "-" : `${angle}°`}</p>
              <p className="text-xs text-muted-foreground">angle (live)</p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-bold">lock() demos</p>
            <div className="flex flex-wrap gap-2">
              {LOCK_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => void lockTo(t)}
                  className="rounded-lg border border-border px-2.5 py-1.5 font-mono text-xs font-semibold hover:border-primary/40"
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={unlock} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:border-primary/40">
                <LockOpen className="h-3.5 w-3.5" /> unlock()
              </button>
              <button type="button" onClick={goFullscreen} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:border-primary/40">
                <Maximize className="h-3.5 w-3.5" /> {fullscreen ? "In fullscreen" : "Go fullscreen"}
              </button>
            </div>
            {locked && (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-green-500/15 px-3 py-1 text-xs font-bold text-green-600">
                <Lock className="h-3.5 w-3.5" /> Orientation locked by this lab
              </p>
            )}
          </div>

          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-muted-foreground">
            <p className="flex items-start gap-1.5">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              On desktop the lock buttons usually reject (Chrome allows locking only from fullscreen or on mobile).
              The rejection message is shown honestly so you can see the real API contract.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-4 flex items-center gap-2 text-sm font-bold"><Smartphone className="h-4 w-4" /> Device mirror</p>
            <div className="flex h-72 items-center justify-center overflow-hidden rounded-xl bg-muted/40">
              <div
                className={cn(
                  "flex items-center justify-center rounded-3xl border-4 border-foreground/80 bg-card transition-all duration-500",
                  landscape ? "h-40 w-80" : "h-64 w-40",
                )}
              >
                <div className="text-center">
                  <RotateCw className="mx-auto mb-2 h-6 w-6 text-primary" style={{ transform: `rotate(${angle ?? 0}deg)` }} />
                  <p className="font-mono text-xs font-bold">{type || "no data"}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">{angle === null ? "" : `${angle}°`}</p>
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Rotate your phone or resize/orient your screen - the mock follows the real screen.orientation events.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold">Working pattern</p>
              <button type="button" onClick={copySnippet} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:border-primary/40">
                {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="overflow-x-auto rounded-xl bg-muted/60 p-4 font-mono text-xs leading-relaxed">{snippet}</pre>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
