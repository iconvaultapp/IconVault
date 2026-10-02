// /tools/resize-observer-playground - Drag-resize a box and watch
// ResizeObserver report contentRect, borderBoxSize and
// devicePixelContentBoxSize live, with a callback log and a box-model
// switcher. Copyable code included; trial use is recorded on copy.

import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, MoveDiagonal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/resize-observer-playground")({
  head: () => {
    const seo = getToolSeoMeta("resize-observer-playground");
    const canonical = "https://iconvault.site/tools/resize-observer-playground";
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
  component: ResizeObserverTool,
});

type BoxModel = "content-box" | "border-box" | "device-pixel-content-box";

interface SizeInfo {
  contentW: number;
  contentH: number;
  borderW: number;
  borderH: number;
  deviceW: number | null;
  deviceH: number | null;
  offsetW: number;
  offsetH: number;
}

function ResizeObserverTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("resize-observer-playground", isPro);
  const seo = getToolSeo("resize-observer-playground");

  const [boxModel, setBoxModel] = useState<BoxModel>("content-box");
  const [size, setSize] = useState<SizeInfo | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [textLen, setTextLen] = useState(24);
  const [textCardSize, setTextCardSize] = useState("");
  const [copied, setCopied] = useState(false);

  const boxRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startX: number; startY: number; startW: number; startH: number } | null>(null);
  const [w, setW] = useState(280);
  const [h, setH] = useState(180);
  const idRef = useRef(0);

  useEffect(() => {
    const el = boxRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const bb = entry.borderBoxSize?.[0];
      const db = entry.devicePixelContentBoxSize?.[0];
      idRef.current += 1;
      const t = new Date().toLocaleTimeString();
      setLog((prev) =>
        [
          `${t} #${idRef.current} content ${entry.contentRect.width.toFixed(1)}x${entry.contentRect.height.toFixed(1)} (${boxModel})`,
          ...prev,
        ].slice(0, 80),
      );
      setSize({
        contentW: entry.contentRect.width,
        contentH: entry.contentRect.height,
        borderW: bb?.inlineSize ?? el.offsetWidth,
        borderH: bb?.blockSize ?? el.offsetHeight,
        deviceW: db?.inlineSize ?? null,
        deviceH: db?.blockSize ?? null,
        offsetW: el.offsetWidth,
        offsetH: el.offsetHeight,
      });
    });
    ro.observe(el, { box: boxModel });
    return () => ro.disconnect();
  }, [boxModel]);

  // A second observer on the text card, which resizes without dragging.
  useEffect(() => {
    const el = textRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const e = entries[0];
      if (e) setTextCardSize(`${e.contentRect.width.toFixed(0)} x ${e.contentRect.height.toFixed(0)}`);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { startX: e.clientX, startY: e.clientY, startW: w, startH: h };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    setW(Math.max(120, Math.min(560, d.startW + (e.clientX - d.startX))));
    setH(Math.max(100, Math.min(400, d.startH + (e.clientY - d.startY))));
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const sampleText = useMemo(
    () =>
      "ResizeObserver watches this card grow as the text gets longer. "
        .repeat(Math.ceil(textLen / 60))
        .slice(0, textLen * 6),
    [textLen],
  );

  const code = `const box = document.querySelector("#resizable");

const ro = new ResizeObserver((entries) => {
  for (const entry of entries) {
    console.log("contentRect:", entry.contentRect.width, entry.contentRect.height);
    console.log("borderBoxSize:", entry.borderBoxSize[0].inlineSize, "x", entry.borderBoxSize[0].blockSize);
    if (entry.devicePixelContentBoxSize[0])
      console.log("device pixels:", entry.devicePixelContentBoxSize[0].inlineSize);
  }
});

// "content-box" | "border-box" | "device-pixel-content-box"
ro.observe(box, { box: "${boxModel}" });

// Later: ro.unobserve(box); ro.disconnect();`;

  const copy = async () => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      trial.recordUse();
      toast.success("Observer code copied");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  const rows: { label: string; value: string; hint: string }[] = size
    ? [
        { label: "contentRect", value: `${size.contentW.toFixed(1)} x ${size.contentH.toFixed(1)}`, hint: "content + padding" },
        { label: "borderBoxSize", value: `${size.borderW.toFixed(1)} x ${size.borderH.toFixed(1)}`, hint: "content + padding + border" },
        {
          label: "devicePixelContentBoxSize",
          value: size.deviceW !== null && size.deviceH !== null ? `${size.deviceW.toFixed(1)} x ${size.deviceH.toFixed(1)}` : "unsupported here",
          hint: "physical pixels, for crisp canvas sizing",
        },
        { label: "offsetWidth / offsetHeight", value: `${size.offsetW} x ${size.offsetH}`, hint: "layout size, integers" },
      ]
    : [];

  return (
    <ToolPageShell toolId="resize-observer-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="ResizeObserver Playground" left={trial.left} />

      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4 text-sm">
        <span className="font-bold">Observed box model</span>
        {(["content-box", "border-box", "device-pixel-content-box"] as BoxModel[]).map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => setBoxModel(b)}
            className={
              boxModel === b
                ? "rounded-xl border border-primary bg-primary/10 px-3 py-1.5 font-mono text-xs font-bold text-primary"
                : "rounded-xl border border-border px-3 py-1.5 font-mono text-xs hover:border-primary/40"
            }
          >
            {b}
          </button>
        ))}
        <span className="text-xs text-muted-foreground">
          Switching re-observes with the new <code className="font-mono">box</code> option.
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-1 text-sm font-bold">Drag the corner to resize</h2>
          <p className="mb-4 text-xs text-muted-foreground">Every size change fires the observer callback.</p>
          <div className="rounded-xl bg-muted/30 p-6">
            <div
              ref={boxRef}
              id="resizable"
              style={{ width: w, height: h }}
              className="relative rounded-xl border-2 border-dashed border-primary/50 bg-card p-4"
            >
              <p className="text-sm font-bold">Resizable box</p>
              <p className="mt-1 text-xs text-muted-foreground">ResizeObserver reports this element live.</p>
              <button
                type="button"
                aria-label="Drag to resize"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                className="absolute bottom-1 right-1 cursor-nwse-resize rounded-md p-1.5 text-primary hover:bg-primary/10"
                style={{ touchAction: "none" }}
              >
                <MoveDiagonal className="h-5 w-5" />
              </button>
            </div>
          </div>

          <h3 className="mb-2 mt-5 text-xs font-bold uppercase tracking-wide text-muted-foreground">No-drag demo: growing text</h3>
          <label className="mb-2 flex items-center gap-2 text-xs font-bold">
            Text length
            <input
              type="range"
              min={8}
              max={120}
              value={textLen}
              onChange={(e) => setTextLen(Number(e.target.value))}
              className="w-40 accent-teal-600"
            />
          </label>
          <div ref={textRef} className="rounded-xl border border-border bg-card p-3 text-xs leading-relaxed shadow-sm">
            {sampleText}
          </div>
          {textCardSize && (
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              Observer reports text card at <strong className="text-primary">{textCardSize}</strong> px
            </p>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-bold">Live box sizes</h2>
            {rows.length === 0 ? (
              <p className="text-xs text-muted-foreground">Waiting for the first callback...</p>
            ) : (
              <div className="space-y-2">
                {rows.map((r) => (
                  <div key={r.label} className="flex items-baseline justify-between gap-3 rounded-xl bg-muted/40 px-4 py-2.5">
                    <div>
                      <p className="font-mono text-xs font-bold">{r.label}</p>
                      <p className="text-[11px] text-muted-foreground">{r.hint}</p>
                    </div>
                    <p className="font-mono text-sm font-extrabold text-primary">{r.value}</p>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              devicePixelContentBoxSize is what canvas renderers use to size backing stores at the
              right resolution; it needs no manual devicePixelRatio math.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold">Callback log</h2>
              <button
                type="button"
                onClick={() => setLog([])}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/60"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear
              </button>
            </div>
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {log.length === 0 ? (
                <p className="rounded-xl bg-muted/40 p-3 text-center text-xs text-muted-foreground">Resize the box.</p>
              ) : (
                log.map((l, i) => (
                  <p key={i} className="rounded-lg bg-muted/40 px-3 py-1.5 font-mono text-xs">{l}</p>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold">Copy-ready code</h2>
          <button
            type="button"
            onClick={copy}
            disabled={!trial.canUse}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-xs font-bold transition hover:border-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy code"}
          </button>
        </div>
        <pre className="overflow-x-auto rounded-xl bg-muted/40 p-4 font-mono text-xs leading-relaxed">{code}</pre>
        {!isPro && (
          <p className="mt-3 text-xs text-muted-foreground">
            {trial.left} of {TOOL_TRIAL_LIMIT} free copies left.
          </p>
        )}
      </div>
    </ToolPageShell>
  );
}
