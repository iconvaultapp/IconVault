// /tools/css-zoom-playground - CSS zoom Playground: layout-affecting zoom vs
// transform: scale(), side by side with live measurements. 100% client-side.

import { useLayoutEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, ZoomIn } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/css-zoom-playground")({
  head: () => {
    const seo = getToolSeoMeta("css-zoom-playground");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: CssZoomPlayground,
});

const BASE = 110;

function CodeBlock({ code, title }: { code: string; title: string }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("CSS copied");
    } catch {
      toast.error("Copy failed");
    }
  };
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-muted/40">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="text-xs font-semibold text-muted-foreground">{title}</span>
        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] font-semibold hover:border-primary/50"
        >
          <Copy className="h-3 w-3" /> Copy
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-xs leading-relaxed"><code>{code}</code></pre>
    </div>
  );
}

function Lane({
  label,
  accent,
  targetRef,
  nextRef,
  laneRef,
}: {
  label: string;
  accent: string;
  targetRef: React.RefObject<HTMLDivElement | null>;
  nextRef: React.RefObject<HTMLDivElement | null>;
  laneRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold">
        <span className={cn("mr-2 inline-block h-2.5 w-2.5 rounded-full", accent)} />
        {label}
      </p>
      <div ref={laneRef} className="overflow-hidden rounded-xl border border-border bg-muted/30 p-4">
        <div className="flex items-center gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              ref={i === 1 ? targetRef : i === 2 ? nextRef : undefined}
              className={cn(
                "flex shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white",
                i === 1 ? "bg-primary" : "bg-muted-foreground/40",
              )}
              style={{ width: BASE, height: 64 }}
            >
              {i === 1 ? "TARGET" : `box ${i + 1}`}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CssZoomPlayground() {
  const { isPro } = usePlan();
  const trial = useToolTrial("css-zoom-playground", isPro);
  const seo = getToolSeo("css-zoom-playground");

  const [zoom, setZoom] = useState(1.5);
  const [stats, setStats] = useState({ zoomW: 0, zoomNextX: 0, scaleW: 0, scaleNextX: 0 });
  const [copied, setCopied] = useState(false);

  const zoomTarget = useRef<HTMLDivElement | null>(null);
  const zoomNext = useRef<HTMLDivElement | null>(null);
  const zoomLane = useRef<HTMLDivElement | null>(null);
  const scaleLane = useRef<HTMLDivElement | null>(null);
  const scaleTarget = useRef<HTMLDivElement | null>(null);
  const scaleNext = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (zoomTarget.current) zoomTarget.current.style.setProperty("zoom", String(zoom));
    if (scaleTarget.current) scaleTarget.current.style.transform = `scale(${zoom})`;
    const lane = zoomLane.current;
    const zt = zoomTarget.current;
    const zn = zoomNext.current;
    const st = scaleTarget.current;
    const sn = scaleNext.current;
    if (lane && zt && zn && st && sn) {
      const laneRect = lane.getBoundingClientRect();
      setStats({
        zoomW: Math.round(zt.offsetWidth),
        zoomNextX: Math.round(zn.getBoundingClientRect().left - laneRect.left),
        scaleW: Math.round(st.offsetWidth),
        scaleNextX: Math.round(sn.getBoundingClientRect().left - laneRect.left),
      });
    }
  }, [zoom]);

  const zoomCss = `.card {\n  zoom: ${zoom};\n}\n/* zoom is layout-affecting:\n   the element keeps its place in flow,\n   siblings reflow around the new size.\n   Now baseline in all modern browsers. */`;
  const scaleCss = `.card {\n  transform: scale(${zoom});\n  transform-origin: center;\n}\n/* transform never affects layout:\n   offsetWidth stays ${BASE}px and siblings\n   do not move; the box may visually overlap. */`;

  const copyBoth = async () => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(`/* zoom (layout-affecting) */\n${zoomCss}\n\n/* transform: scale (visual only) */\n${scaleCss}`);
      trial.recordUse();
      setCopied(true);
      toast.success("Both snippets copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copy failed");
    }
  };

  const stat = (label: string, value: string, highlight?: boolean) => (
    <div className={cn("rounded-lg border px-3 py-2", highlight ? "border-primary/40 bg-primary/5" : "border-border")}>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg font-bold tabular-nums">{value}</p>
    </div>
  );

  return (
    <ToolPageShell toolId="css-zoom-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="CSS zoom Playground" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Zoom factor</p>
              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-sm font-bold text-primary tabular-nums">{zoom.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={2}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full accent-primary"
              aria-label="Zoom factor"
            />
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>0.5x</span><span>1.0x</span><span>2.0x</span>
            </div>
          </div>

          <div className="rounded-xl bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
            <p className="mb-1 font-semibold text-foreground">How to read this</p>
            <p>
              The teal box is the target in both lanes. With <code className="font-mono">zoom</code> it grows
              in the layout and pushes its neighbor. With <code className="font-mono">transform: scale</code> it
              only looks bigger: layout measurements do not change.
            </p>
          </div>

          <ActionButton disabled={!trial.canUse} onClick={copyBoth}>
            <ZoomIn className="h-4 w-4" /> {copied ? "Copied!" : "Copy both snippets"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of 5 free copies left. Everything runs in your browser.
            </p>
          )}
        </div>

        <div className="space-y-6 rounded-2xl border border-border bg-card p-5">
          <Lane label="CSS zoom (layout-affecting)" accent="bg-teal-500" targetRef={zoomTarget} nextRef={zoomNext} laneRef={zoomLane} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stat("Target layout width", `${stats.zoomW}px`, true)}
            {stat("Neighbor x position", `${stats.zoomNextX}px`, true)}
            {stat("Base box width", `${BASE}px`)}
            {stat("Growth vs base", `${stats.zoomW - BASE >= 0 ? "+" : ""}${stats.zoomW - BASE}px`)}
          </div>

          <div className="border-t border-border pt-6">
            <Lane label="transform: scale (visual only)" accent="bg-amber-500" targetRef={scaleTarget} nextRef={scaleNext} laneRef={scaleLane} />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stat("Target layout width", `${stats.scaleW}px`)}
            {stat("Neighbor x position", `${stats.scaleNextX}px`)}
            {stat("Visual width (approx)", `${Math.round(BASE * zoom)}px`)}
            {stat("Layout growth", "0px", false)}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <CodeBlock code={zoomCss} title="zoom.css" />
            <CodeBlock code={scaleCss} title="scale.css" />
          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm leading-relaxed text-muted-foreground">
            <p className="mb-1 font-semibold text-foreground">Rule of thumb</p>
            <p>
              Use <code className="font-mono">zoom</code> when the enlarged element should reserve real space
              (accessible text resizing, print-friendly scaling). Use <code className="font-mono">transform: scale</code> for
              hover effects and animations where layout must not jump. Note: <code className="font-mono">zoom</code> is not
              inherited by default in the same way as transform, and it composes with transforms (zoom applies first).
            </p>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
