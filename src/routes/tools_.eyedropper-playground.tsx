// /tools/eyedropper-playground - Real EyeDropper API lab: pick colors from
// anywhere on screen, build a palette, copy values and download the palette.

import { useCallback, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Download, Pipette, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/eyedropper-playground";
import toolSeoMeta from "@/lib/tool-seo-meta-data/eyedropper-playground";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/eyedropper-playground")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/eyedropper-playground";
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
  component: EyedropperTool,
});

type EyeDropperLike = {
  open: (options?: { signal?: AbortSignal }) => Promise<{ sRGBHex: string }>;
};

type Swatch = { hex: string; addedAt: string };

function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

function EyedropperTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("eyedropper-playground", isPro);
  const seo = toolSeo;

  const [supported] = useState(() => typeof window !== "undefined" && "EyeDropper" in window);
  const [swatches, setSwatches] = useState<Swatch[]>([]);
  const [picking, setPicking] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const pick = useCallback(async () => {
    if (!trial.canUse || picking) return;
    if (!supported) {
      toast.error("EyeDropper is not supported in this browser.");
      return;
    }
    setPicking(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const Ctor = (window as unknown as { EyeDropper: new () => EyeDropperLike }).EyeDropper;
      const dropper = new Ctor();
      const { sRGBHex } = await dropper.open({ signal: ctrl.signal });
      const hex = sRGBHex.toUpperCase();
      setSwatches((p) => (p.some((s) => s.hex === hex) ? p : [...p, { hex, addedAt: new Date().toLocaleTimeString() }]));
      trial.recordUse();
      toast.success(`Picked ${hex}`);
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        toast("Pick cancelled");
      } else {
        toast.error(e instanceof Error ? e.message : "Color pick failed.");
      }
    } finally {
      setPicking(false);
      abortRef.current = null;
    }
  }, [trial, picking, supported]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const copyHex = useCallback((hex: string) => {
    void navigator.clipboard.writeText(hex);
    toast.success(`${hex} copied`);
  }, []);

  const remove = useCallback((hex: string) => {
    setSwatches((p) => p.filter((s) => s.hex !== hex));
  }, []);

  const download = useCallback(() => {
    if (swatches.length === 0) {
      toast.error("Pick at least one color first.");
      return;
    }
    if (!trial.canUse) return;
    const palette = {
      name: "IconVault EyeDropper palette",
      exportedAt: new Date().toISOString(),
      colors: swatches.map((s) => ({ hex: s.hex, rgb: hexToRgb(s.hex) })),
    };
    downloadBlob(new Blob([JSON.stringify(palette, null, 2)], { type: "application/json" }), "eyedropper-palette.json");
    trial.recordUse();
    toast.success("Palette downloaded");
  }, [swatches, trial]);

  return (
    <ToolPageShell toolId="eyedropper-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="EyeDropper" left={trial.left} />

      {!supported && (
        <div className="mb-6 rounded-2xl border border-amber-400/50 bg-amber-50 p-5 text-sm dark:bg-amber-950/20">
          <p className="font-bold">EyeDropper is not supported in this browser.</p>
          <p className="mt-1 text-muted-foreground">
            It needs Chrome or Edge 95 and later on desktop. Firefox and Safari do not implement it yet.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <Pipette className="h-5 w-5 text-primary" />
            <h3 className="font-bold">Color picker</h3>
          </div>
          {!picking ? (
            <ActionButton disabled={!trial.canUse || !supported} onClick={() => void pick()}>
              <Pipette className="h-4 w-4" /> Pick from screen
            </ActionButton>
          ) : (
            <button
              type="button"
              onClick={cancel}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-bold transition hover:border-primary/40"
            >
              <X className="h-4 w-4" /> Cancel picking
            </button>
          )}
          <p className="text-xs text-muted-foreground">
            The browser opens its native magnifier loupe. Click any pixel on any window: the exact sRGB hex lands in your palette. Press Esc to cancel.
          </p>
          <ActionButton disabled={swatches.length === 0 || !trial.canUse} onClick={download}>
            <Download className="h-4 w-4" /> Download palette JSON
          </ActionButton>
          {!isPro && <p className="text-xs text-muted-foreground">{trial.left} of 5 free picks left.</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold">Palette ({swatches.length})</h3>
            {swatches.length > 0 && (
              <button
                type="button"
                onClick={() => setSwatches([])}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:border-primary/40"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear all
              </button>
            )}
          </div>
          {swatches.length === 0 ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
              <Pipette className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your picked colors appear here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Each pick adds a swatch. Click a swatch to copy its hex value.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {swatches.map((s) => (
                <div key={s.hex} className="overflow-hidden rounded-xl border border-border bg-background">
                  <button
                    type="button"
                    onClick={() => copyHex(s.hex)}
                    className="flex h-24 w-full items-center justify-center transition hover:opacity-90"
                    style={{ background: s.hex }}
                    title={`Copy ${s.hex}`}
                  >
                    <Copy className="h-5 w-5 text-white drop-shadow" />
                  </button>
                  <div className="flex items-center justify-between px-3 py-2">
                    <div>
                      <p className="font-mono text-sm font-bold">{s.hex}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{hexToRgb(s.hex)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(s.hex)}
                      className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                      title="Remove"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
