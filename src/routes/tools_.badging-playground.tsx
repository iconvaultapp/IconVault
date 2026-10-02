// /tools/badging-playground - Real Badging API playground:
// navigator.setAppBadge / clearAppBadge with a live favicon fallback that
// draws the badge onto the tab icon when the API is unavailable.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bell, BellOff, Plus, Minus, Info } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/badging-playground")({
  head: () => {
    const seo = getToolSeoMeta("badging-playground");
    const canonical = "https://iconvault.site/tools/badging-playground";
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
  component: BadgingTool,
});

function badgeLabel(n: number): string {
  return n > 99 ? "99+" : String(n);
}

function BadgingTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("badging-playground", isPro);
  const seo = getToolSeo("badging-playground");

  const [supported] = useState<boolean>(
    () => typeof navigator !== "undefined" && typeof navigator.setAppBadge === "function",
  );
  const [count, setCount] = useState("3");
  const [badge, setBadge] = useState<number | null>(null);
  const [mode, setMode] = useState<"api" | "favicon" | null>(null);
  const [busy, setBusy] = useState(false);
  const originalFavicon = useRef<string | null>(null);

  const n = Math.max(0, Math.min(9999, Math.floor(Number(count)) || 0));

  const drawFaviconBadge = useCallback(async (value: number | null): Promise<boolean> => {
    try {
      const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!link) return false;
      if (originalFavicon.current === null) originalFavicon.current = link.href;
      const src = value === null ? originalFavicon.current : originalFavicon.current;
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const im = new Image();
        im.onload = () => resolve(im);
        im.onerror = reject;
        im.src = src;
      });
      const size = 64;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return false;
      ctx.drawImage(img, 0, 0, size, size);
      if (value !== null && value > 0) {
        const r = 20;
        const cx = size - r - 2;
        const cy = size - r - 2;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = "#ef4444";
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();
        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${value > 99 ? 17 : 22}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(badgeLabel(value), cx, cy + 1);
      }
      link.href = canvas.toDataURL("image/png");
      return true;
    } catch {
      return false;
    }
  }, []);

  // Restore the original favicon when leaving the page.
  useEffect(
    () => () => {
      const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (link && originalFavicon.current) link.href = originalFavicon.current;
    },
    [],
  );

  const setBadgeCount = useCallback(async () => {
    if (busy || !trial.canUse) return;
    setBusy(true);
    try {
      if (supported && navigator.setAppBadge) {
        await navigator.setAppBadge(n);
        setBadge(n);
        setMode("api");
        toast.success(`App badge set to ${n}.`);
      } else {
        const ok = await drawFaviconBadge(n);
        if (!ok) throw new Error("Could not draw the fallback favicon.");
        setBadge(n);
        setMode("favicon");
        toast.success(`Favicon badge drawn (${n}). Look at this tab's icon.`);
      }
      trial.recordUse();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to set badge.";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, trial, supported, n, drawFaviconBadge]);

  const clearBadge = useCallback(async () => {
    try {
      if (supported && navigator.clearAppBadge) {
        await navigator.clearAppBadge();
      } else {
        await drawFaviconBadge(null);
      }
      setBadge(null);
      setMode(null);
      toast.info("Badge cleared.");
    } catch {
      toast.error("Could not clear the badge.");
    }
  }, [supported, drawFaviconBadge]);

  const bump = useCallback(
    (d: number) => {
      const next = Math.max(0, Math.min(9999, n + d));
      setCount(String(next));
    },
    [n],
  );

  return (
    <ToolPageShell toolId="badging-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Badging API" left={trial.left} />

      {!supported && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <p className="text-sm">
            <strong>navigator.setAppBadge is not available in this browser</strong> (it needs
            Chrome/Edge 81+ or Safari 16.4+). This tool automatically uses a real fallback instead:
            it draws the badge onto this tab's favicon so you can see the effect live.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Badge controls</h2>
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-bold",
                supported ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600",
              )}
            >
              {supported ? "Native API" : "Favicon fallback"}
            </span>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">Badge count</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => bump(-1)}
                className="rounded-xl border border-border px-3 text-muted-foreground transition hover:border-primary/40"
                aria-label="Decrease"
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                type="number"
                min={0}
                max={9999}
                value={count}
                onChange={(e) => setCount(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-center text-lg font-bold"
              />
              <button
                type="button"
                onClick={() => bump(1)}
                className="rounded-xl border border-border px-3 text-muted-foreground transition hover:border-primary/40"
                aria-label="Increase"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </label>

          <div className="flex gap-2">
            <ActionButton busy={busy} disabled={!trial.canUse} onClick={() => void setBadgeCount()}>
              <Bell className="h-4 w-4" /> {busy ? "Setting…" : "Set badge"}
            </ActionButton>
            <button
              type="button"
              onClick={() => void clearBadge()}
              disabled={badge === null}
              className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <BellOff className="h-4 w-4" /> Clear
            </button>
          </div>

          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free badge sets left. Everything runs in your
              browser.
            </p>
          )}

          <div className="rounded-xl bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
            <p className="mb-1 font-semibold text-foreground/80">Worth knowing</p>
            <ul className="list-disc space-y-1 pl-4">
              <li>The native badge appears on the installed PWA / app icon, not on the tab.</li>
              <li>setAppBadge(0) and clearAppBadge() both clear it.</li>
              <li>Most platforms render counts above 99 as "99+".</li>
              <li>The favicon fallback changes this tab's icon in real time.</li>
            </ul>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-4 text-sm font-semibold">Live preview</h2>
            <div className="flex items-center gap-8">
              <div className="relative">
                <div className="flex h-24 w-24 items-center justify-center rounded-[1.4rem] bg-gradient-to-br from-teal-600 to-teal-800 shadow-lg">
                  <Bell className="h-10 w-10 text-white" />
                </div>
                {badge !== null && badge > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-8 min-w-8 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1.5 text-sm font-extrabold text-white">
                    {badgeLabel(badge)}
                  </span>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Current badge
                </p>
                <p className="text-3xl font-extrabold">{badge === null ? "cleared" : badge}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {mode === "api"
                    ? "Set through navigator.setAppBadge(). Check your installed app icon."
                    : mode === "favicon"
                      ? "Drawn onto this tab's favicon. Glance at the tab bar."
                      : "No badge set yet."}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-2 text-sm font-semibold">The real code</h2>
            <pre className="overflow-x-auto rounded-xl bg-muted/60 p-4 font-mono text-xs leading-relaxed">
{`// Set (resolves even where the OS shows nothing: feature-detect anyway)
if ("setAppBadge" in navigator) {
  await navigator.setAppBadge(3);   // number shown on the app icon
  await navigator.clearAppBadge();  // or setAppBadge(0)
}

// Favicon fallback (works everywhere): draw the count onto the tab icon
const canvas = document.createElement("canvas"); // 64x64
// ... drawImage(favicon) + red dot + count, then:
document.querySelector('link[rel="icon"]').href = canvas.toDataURL();`}
            </pre>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
