// /tools/responsive-tester - Preview any URL at common breakpoints and device sizes.
// Sandboxed iframe. Runs fully in your browser, nothing is uploaded.
// Honest note: many sites block embedding via X-Frame-Options.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { MonitorSmartphone, RefreshCw, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/responsive-tester";
import toolSeoMeta from "@/lib/tool-seo-meta-data/responsive-tester";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/responsive-tester")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/responsive-tester";
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
  component: ResponsiveTesterTool,
});

const BREAKPOINTS = [
  { label: "375", w: 375, h: 812 },
  { label: "768", w: 768, h: 1024 },
  { label: "1024", w: 1024, h: 768 },
  { label: "1440", w: 1440, h: 900 },
  { label: "Full", w: 0, h: 0 },
];

const PRESETS = [
  { label: "iPhone", w: 390, h: 844 },
  { label: "Pixel", w: 412, h: 915 },
  { label: "iPad", w: 820, h: 1180 },
  { label: "Laptop", w: 1440, h: 900 },
  { label: "Desktop", w: 1920, h: 1080 },
];

function normalizeUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  return /^https?:\/\//i.test(t) ? t : "https://" + t;
}

function ResponsiveTesterTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("responsive-tester", isPro);
  const seo = toolSeo;
  const [input, setInput] = useState("");
  const [src, setSrc] = useState("");
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [rotated, setRotated] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  const load = () => {
    const url = normalizeUrl(input);
    if (!url) {
      toast.error("Enter a URL to preview");
      return;
    }
    setSrc(url);
    setIframeKey((k) => k + 1);
    trial.recordUse();
    toast.success("Preview loading");
  };

  const active = size;
  const w = active === null ? "100%" : (rotated ? active.h : active.w);
  const h = active === null ? 600 : (rotated ? active.w : active.h);
  const readoutW = active === null ? "full width" : `${rotated ? active.h : active.w}px`;
  const readoutH = active === null ? "600px" : `${rotated ? active.w : active.h}px`;

  return (
    <ToolPageShell toolId="responsive-tester" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Responsive Tester" left={trial.left} />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") load(); }}
          placeholder="Enter a URL, e.g. example.com"
          spellCheck={false}
          className="flex-1 rounded-xl border border-border bg-card px-4 py-3 font-mono text-sm outline-none focus:border-primary/50"
        />
        <ActionButton onClick={load} disabled={!input.trim()}>
          <MonitorSmartphone className="h-4 w-4" /> Load preview
        </ActionButton>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Breakpoints</span>
        {BREAKPOINTS.map((b) => (
          <button
            key={b.label}
            type="button"
            onClick={() => setSize(b.w === 0 ? null : { w: b.w, h: b.h })}
            className={cn(
              "rounded-xl border px-3.5 py-2 text-sm font-bold transition",
              size === null
                ? b.label === "Full"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40"
                : size.w === b.w && size.h === b.h
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40",
            )}
          >
            {b.label}{b.w > 0 ? "px" : ""}
          </button>
        ))}
        <span className="ml-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Devices</span>
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => {
              setSize({ w: p.w, h: p.h });
              toast.message(`${p.label}: ${p.w} x ${p.h}`);
            }}
            className={cn(
              "rounded-xl border border-dashed px-3 py-2 text-sm font-semibold transition",
              size !== null && size.w === p.w && size.h === p.h
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setRotated((r) => !r)}
          aria-label="Rotate device"
          className={cn(
            "ml-auto inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold transition",
            rotated ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
          )}
        >
          <RotateCw className="h-4 w-4" /> Rotate
        </button>
        {src && (
          <button
            type="button"
            onClick={() => setIframeKey((k) => k + 1)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:border-primary/40"
          >
            <RefreshCw className="h-4 w-4" /> Reload
          </button>
        )}
      </div>

      <div className="overflow-auto rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-mono text-xs text-muted-foreground">
            {src || "No page loaded yet"} <span className="text-foreground/60">- {readoutW} x {readoutH}</span>
          </p>
        </div>
        {src ? (
          <div className="flex justify-center">
            <div style={{ width: w === "100%" ? "100%" : `${w}px`, maxWidth: "100%" }}>
              <iframe
                key={iframeKey}
                src={src}
                title="Responsive preview"
                sandbox="allow-scripts allow-same-origin"
                style={{ width: "100%", height: typeof h === "number" ? `${h}px` : h }}
                className="rounded-xl border border-border bg-white"
              />
            </div>
          </div>
        ) : (
          <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
            <MonitorSmartphone className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="font-semibold">Enter a URL above to preview it</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Switch between breakpoints and device presets to see how the page adapts.
            </p>
          </div>
        )}
        <p className="mt-3 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
          Heads up: many sites block embedding via X-Frame-Options or frame-ancestors headers, so some
          pages will show a blank frame. Your own pages usually embed fine. Everything runs in your
          browser, nothing is uploaded.
        </p>
      </div>

      {!isPro && (
        <p className="mt-4 text-xs text-muted-foreground">
          {trial.left} of {TOOL_TRIAL_LIMIT} free previews left.
        </p>
      )}
    </ToolPageShell>
  );
}
