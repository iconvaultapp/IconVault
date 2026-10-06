// /tools/window-controls-overlay - Learn the Window Controls Overlay API:
// live geometry detection, drag-region demo, and a manifest builder.

import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppWindow, ClipboardCopy, Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/window-controls-overlay";
import toolSeoMeta from "@/lib/tool-seo-meta-data/window-controls-overlay";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/window-controls-overlay")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/window-controls-overlay";
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
  component: WcoTool,
});

type Rect = { x: number; y: number; width: number; height: number };

function WcoTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("window-controls-overlay", isPro);
  const seo = toolSeo;

  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [inWco, setInWco] = useState<boolean | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [appName, setAppName] = useState("My PWA");
  const [theme, setTheme] = useState("#0f766e");

  const readGeometry = () => {
    const nav = navigator as unknown as {
      windowControlsOverlay?: { getTitlebarAreaRect: () => Rect; visible?: boolean };
    };
    const wco = nav.windowControlsOverlay;
    if (!wco) return;
    try {
      const r = wco.getTitlebarAreaRect();
      setRect({ x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) });
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    const nav = navigator as unknown as { windowControlsOverlay?: unknown };
    const ok = typeof navigator !== "undefined" && "windowControlsOverlay" in navigator;
    setApiOk(ok);
    if (typeof window !== "undefined") {
      const mq = window.matchMedia("(display-mode: window-controls-overlay)");
      setInWco(mq.matches);
      const onChange = (e: MediaQueryListEvent) => setInWco(e.matches);
      mq.addEventListener("change", onChange);
      if (ok) {
        readGeometry();
        (nav.windowControlsOverlay as { addEventListener?: (t: string, f: () => void) => void })?.addEventListener?.(
          "geometrychange",
          readGeometry,
        );
      }
      return () => mq.removeEventListener("change", onChange);
    }
    return;
  }, []);

  const copy = async (t: string, label: string) => {
    try {
      await navigator.clipboard.writeText(t);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Clipboard blocked - select and copy manually.");
    }
  };

  const manifest = {
    name: appName || "My PWA",
    short_name: (appName || "My PWA").slice(0, 12),
    start_url: "/",
    display: "standalone",
    display_override: ["window-controls-overlay"],
    theme_color: theme,
  };
  const manifestJson = JSON.stringify(manifest, null, 2);

  const css = `/* Custom title bar that fills the overlay area */
#titlebar {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: env(titlebar-area-height, 40px);
  -webkit-app-region: drag;   /* whole bar drags the window */
  app-region: drag;
  background: ${theme};
  color: #fff;
  display: flex;
  align-items: center;
  padding-left: env(titlebar-area-x, 0px);
  width: env(titlebar-area-width, 100%);
}

#titlebar button {
  -webkit-app-region: no-drag; /* keep controls clickable */
  app-region: no-drag;
}`;

  return (
    <ToolPageShell toolId="window-controls-overlay" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Window Controls Overlay" left={trial.left} />

      {apiOk === true && inWco === false && (
        <div className="mb-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-sm">
          <p className="font-bold">This browser supports the API, but you are not in an installed PWA right now.</p>
          <p className="mt-1 text-muted-foreground">
            Live geometry only appears when the app is installed with display_override set to window-controls-overlay.
            The detection panel below is real; the mock preview shows what the drag regions would look like.
          </p>
        </div>
      )}
      {apiOk === false && (
        <div className="mb-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-sm">
          <p className="font-bold">Window Controls Overlay is not supported in this browser.</p>
          <p className="mt-1 text-muted-foreground">
            It is a Chromium-only API for installed desktop PWAs. Everything below except the live geometry reading
            still works as a learning reference.
          </p>
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">API support</p>
          <p className={cn("mt-1 text-lg font-bold", apiOk ? "text-emerald-500" : "text-amber-500")}>
            {apiOk === null ? "Checking…" : apiOk ? "Supported" : "Not detected"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">navigator.windowControlsOverlay</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Display mode</p>
          <p className={cn("mt-1 text-lg font-bold", inWco ? "text-emerald-500" : "text-muted-foreground")}>
            {inWco === null ? "Checking…" : inWco ? "window-controls-overlay" : "regular browser tab"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">matchMedia("(display-mode: window-controls-overlay)")</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Titlebar rect</p>
            <button
              type="button"
              onClick={() => { readGeometry(); toast.success("Geometry re-read"); }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <RefreshCw className="h-3 w-3" /> Re-read
            </button>
          </div>
          <p className="mt-1 font-mono text-sm font-bold">
            {rect ? `x:${rect.x} y:${rect.y} ${rect.width}x${rect.height}` : "not available"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">getTitlebarAreaRect(), updates on geometrychange</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 text-base font-bold">
              <AppWindow className="h-5 w-5 text-primary" /> Mock titlebar preview
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              This is a static mock showing drag vs clickable regions. In a real PWA the top area would be your HTML,
              with the native window controls pushed to the side.
            </p>
            <div className="mt-4 overflow-hidden rounded-xl border border-border">
              <div
                className="flex h-12 items-center gap-2 px-4 text-sm font-bold text-white"
                style={{ background: theme, cursor: "default" }}
                title="app-region: drag (the whole bar moves the window)"
              >
                <span className="rounded bg-white/20 px-2 py-0.5 text-xs">DRAG REGION</span>
                <span className="truncate">{appName}</span>
                <span className="ml-auto flex gap-2">
                  <button type="button" className="rounded bg-white/20 px-3 py-1 text-xs" title="app-region: no-drag (clickable)">Search</button>
                  <button type="button" className="rounded bg-white/20 px-3 py-1 text-xs" title="app-region: no-drag (clickable)">Menu</button>
                </span>
              </div>
              <div className="bg-background p-8 text-center text-sm text-muted-foreground">
                Your app content starts here, full-bleed under the title bar.
              </div>
            </div>
            <div>
              <label className="mb-1.5 mt-4 block text-[13px] font-medium text-foreground/80">Titlebar color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded-lg border border-border bg-background"
                />
                <code className="font-mono text-sm">{theme}</code>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-base font-bold">Titlebar CSS</h2>
              <button
                type="button"
                onClick={() => void copy(css, "CSS")}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                <ClipboardCopy className="h-3.5 w-3.5" /> Copy
              </button>
            </div>
            <pre className="max-h-80 overflow-auto rounded-xl bg-muted p-4 font-mono text-xs leading-relaxed">{css}</pre>
          </div>
        </div>

        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-bold">Manifest builder</h2>
          <p className="text-sm text-muted-foreground">
            The magic line is <code>display_override: ["window-controls-overlay"]</code>. Without it the browser never
            enters overlay mode.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">App name</label>
              <input
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Theme color</label>
              <input
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary"
              />
            </div>
          </div>
          <pre className="max-h-72 overflow-auto rounded-xl bg-muted p-4 font-mono text-xs leading-relaxed">{manifestJson}</pre>
          <div className="flex flex-wrap gap-2">
            <ActionButton
              disabled={!trial.canUse}
              onClick={() => {
                trial.recordUse();
                downloadBlob(new Blob([manifestJson], { type: "application/json" }), "manifest.webmanifest");
                toast.success("Manifest downloaded");
              }}
            >
              <Download className="h-4 w-4" /> Download manifest
            </ActionButton>
            <button
              type="button"
              onClick={() => void copy(manifestJson, "Manifest JSON")}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-bold hover:border-primary/40"
            >
              <ClipboardCopy className="h-4 w-4" /> Copy JSON
            </button>
          </div>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free downloads left.
            </p>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
