// /tools/css-anchor-positioning - Interactive CSS Anchor Positioning lab:
// anchor(), position-area and @position-try with a draggable live demo.
// Free, client-side only. Uses real anchor positioning when the browser
// supports it, and an honest JS simulation otherwise.

import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Info, Move } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/css-anchor-positioning")({
  head: () => {
    const seo = getToolSeoMeta("css-anchor-positioning");
    const canonical = "https://iconvault.site/tools/css-anchor-positioning";
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
  component: AnchorTool,
});

const AREAS = [
  "top", "bottom", "left", "right", "center",
  "top left", "top right", "bottom left", "bottom right",
  "top center", "bottom center", "left center", "right center",
  "block-start", "block-end", "inline-start", "inline-end",
] as const;

const ANCHOR_W = 76;
const ANCHOR_H = 44;
const POP_W = 176;
const POP_H = 66;

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
    return true;
  } catch {
    toast.error("Copy failed. Select the code manually.");
    return false;
  }
}

/** JS simulation of position-area for browsers without anchor positioning. */
function simulatedPos(area: string, ax: number, ay: number, mb: number, mi: number, cw: number, ch: number) {
  const toks = area.split(" ");
  const block = toks.find((t) => ["top", "bottom", "block-start", "block-end"].includes(t));
  const inline = toks.find((t) => ["left", "right", "center", "inline-start", "inline-end", "start", "end"].includes(t));
  let top = ay - POP_H / 2;
  let left = ax - POP_W / 2;
  if (block === "top" || block === "block-start") top = ay - ANCHOR_H / 2 - POP_H - mb;
  if (block === "bottom" || block === "block-end") top = ay + ANCHOR_H / 2 + mb;
  if (inline === "left" || inline === "inline-start" || inline === "start") left = ax - ANCHOR_W / 2 - POP_W - mi;
  if (inline === "right" || inline === "inline-end" || inline === "end") left = ax + ANCHOR_W / 2 + mi;
  left = Math.max(4, Math.min(cw - POP_W - 4, left));
  top = Math.max(4, Math.min(ch - POP_H - 4, top));
  return { left, top };
}

function AnchorTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("css-anchor-positioning", isPro);
  const seo = getToolSeo("css-anchor-positioning");

  const [supported, setSupported] = useState<boolean | null>(null);
  const [pos, setPos] = useState({ x: 32, y: 42 });
  const [area, setArea] = useState<string>("bottom");
  const [mb, setMb] = useState(10); // block margin gap
  const [mi, setMi] = useState(6); // inline margin gap
  const [flips, setFlips] = useState(true);

  const boxRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    try {
      setSupported(typeof CSS !== "undefined" && CSS.supports("anchor-name: --demo"));
    } catch {
      setSupported(false);
    }
  }, []);

  const moveAnchor = (e: RPointerEvent) => {
    if (!dragging.current || !boxRef.current) return;
    const r = boxRef.current.getBoundingClientRect();
    setPos({
      x: Math.min(94, Math.max(6, ((e.clientX - r.left) / r.width) * 100)),
      y: Math.min(94, Math.max(8, ((e.clientY - r.top) / r.height) * 100)),
    });
  };

  const [cw, ch] = [560, 400];
  const ax = (pos.x / 100) * cw;
  const ay = (pos.y / 100) * ch;
  const sim = useMemo(() => simulatedPos(area, ax, ay, mb, mi, cw, ch), [area, ax, ay, mb, mi]);

  const realStyle: CSSProperties = {
    positionAnchor: "--demo-anchor",
    positionArea: area,
    margin: `${mb}px ${mi}px`,
    ...(flips ? { positionTryFallbacks: "flip-block, flip-inline" } : {}),
  } as CSSProperties;

  const css = useMemo(() => {
    const lines = [
      "/* 1. Any element can become an anchor */",
      ".anchor-btn {",
      "  anchor-name: --demo-anchor;",
      "}",
      "",
      "/* 2. The positioned element references it */",
      ".tooltip {",
      "  position: absolute;               /* fixed works too */",
      "  position-anchor: --demo-anchor;",
      `  position-area: ${area};`,
      `  margin: ${mb}px ${mi}px;             /* gap from the anchor */`,
    ];
    if (flips) {
      lines.push("  position-try-fallbacks: flip-block, flip-inline;  /* auto flip on overflow */");
    }
    lines.push("}", "", "/* 3. Or declare explicit fallback positions */", "@position-try --tooltip-top {", "  position-area: top;", "}", ".tooltip {", "  position-try-fallbacks: --tooltip-top;", "}", "", "/* 4. anchor() reads the anchor's edges directly */", ".tooltip-arrow {", "  left: anchor(center);", "  bottom: anchor(top);", "  translate: -50% 0;", "}");
    return lines.join("\n");
  }, [area, mb, mi, flips]);

  const copy = async () => {
    if (!trial.canUse) return;
    if (await copyText(css)) trial.recordUse();
  };

  return (
    <ToolPageShell toolId="css-anchor-positioning" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="CSS Anchor Positioning" left={trial.left} />

      {supported === false && (
        <div className="mb-6 flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">Your browser does not support anchor positioning yet.</span>{" "}
            The demo below is a JS simulation of the same layout. Open this page in Chrome 125+, Edge 125+ or a recent
            Safari for the real CSS engine, and copy the code (it is the real syntax).
          </p>
        </div>
      )}
      {supported === true && (
        <div className="mb-6 flex gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">Your browser supports anchor positioning.</span> The tooltip
            below is positioned by the real CSS engine: drag the anchor and watch it track.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">position-area</p>
            <div className="flex flex-wrap gap-1.5">
              {AREAS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setArea(a)}
                  className={cn(
                    "rounded-lg border px-2.5 py-1.5 font-mono text-xs transition",
                    area === a
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1 flex justify-between text-[13px] font-medium text-foreground/80">
              <span>Block gap (margin)</span>
              <span className="font-mono text-muted-foreground">{mb}px</span>
            </div>
            <input type="range" min={0} max={48} value={mb} onChange={(e) => setMb(Number(e.target.value))} className="w-full accent-primary" />
          </div>

          <div>
            <div className="mb-1 flex justify-between text-[13px] font-medium text-foreground/80">
              <span>Inline gap (margin)</span>
              <span className="font-mono text-muted-foreground">{mi}px</span>
            </div>
            <input type="range" min={0} max={48} value={mi} onChange={(e) => setMi(Number(e.target.value))} className="w-full accent-primary" />
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 text-sm">
            <input type="checkbox" checked={flips} onChange={(e) => setFlips(e.target.checked)} className="h-4 w-4 accent-primary" />
            <span className="font-medium">position-try-fallbacks: flip on overflow</span>
          </label>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Drag the teal box in the demo. With flip enabled, drag it near an edge and the tooltip jumps to the
            opposite side instead of clipping.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">Live demo</p>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Move className="h-3.5 w-3.5" /> Drag the anchor box
            </p>
          </div>
          <div
            ref={boxRef}
            onPointerMove={moveAnchor}
            onPointerUp={() => (dragging.current = false)}
            onPointerLeave={() => (dragging.current = false)}
            className="relative mx-auto w-full max-w-[560px] touch-none select-none overflow-hidden rounded-xl border border-border bg-[radial-gradient(circle_at_1px_1px,#8882_1px,transparent_1px)] bg-[size:24px_24px]"
            style={{ height: ch }}
          >
            <div
              onPointerDown={(e) => {
                dragging.current = true;
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
                moveAnchor(e);
              }}
              className="absolute z-10 flex cursor-grab items-center justify-center rounded-lg bg-teal-600 text-xs font-bold text-white shadow-lg active:cursor-grabbing"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                width: ANCHOR_W,
                height: ANCHOR_H,
                transform: "translate(-50%, -50%)",
                ...(supported ? ({ anchorName: "--demo-anchor" } as CSSProperties) : {}),
              }}
            >
              anchor
            </div>

            <div
              className="absolute z-20 flex items-center justify-center rounded-lg border border-primary/40 bg-primary px-3 text-center text-xs font-semibold text-primary-foreground shadow-xl"
              style={
                supported
                  ? { ...realStyle, width: POP_W, height: POP_H }
                  : { left: sim.left, top: sim.top, width: POP_W, height: POP_H }
              }
            >
              position-area: {area}
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {supported
              ? "Real anchor positioning: no JavaScript is measuring anything, the CSS engine tracks the anchor."
              : "Simulation: your browser lacks anchor positioning, so positions are computed in JS. The code below is still the real CSS syntax."}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-extrabold">Copy the CSS</h2>
          <ActionButton disabled={!trial.canUse} onClick={copy}>
            <Copy className="h-4 w-4" /> Copy CSS
          </ActionButton>
        </div>
        <pre className="overflow-x-auto whitespace-pre rounded-xl bg-muted/60 p-4 font-mono text-xs leading-relaxed">{css}</pre>
        {!isPro && (
          <p className="mt-2 text-xs text-muted-foreground">
            {trial.left} of 5 free copies left. Everything runs in your browser.
          </p>
        )}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          {
            t: "anchor-name",
            d: "Marks any element as an anchor. Names are scoped to the document, so --tooltip is fine as long as it is unique.",
          },
          {
            t: "position-area",
            d: "One or two keywords (top, bottom left, center) that place the element relative to the anchor. Replaces fragile translate math.",
          },
          {
            t: "position-try-fallbacks",
            d: "flip-block and flip-inline flip the position when the tooltip would overflow. @position-try lets you name exact fallbacks.",
          },
        ].map((c) => (
          <div key={c.t} className="rounded-2xl border border-border bg-card p-5">
            <p className="font-mono text-sm font-bold text-primary">{c.t}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{c.d}</p>
          </div>
        ))}
      </div>
    </ToolPageShell>
  );
}
