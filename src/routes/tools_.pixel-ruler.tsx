// /tools/pixel-ruler - On-screen pixel measurement with crosshair,
// draggable guides and a grid overlay. Works on a test pattern or your
// own uploaded image. 100% client-side.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, ImagePlus, Ruler, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/pixel-ruler";
import toolSeoMeta from "@/lib/tool-seo-meta-data/pixel-ruler";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/pixel-ruler")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/pixel-ruler";
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
  component: PixelRuler,
});

interface Measure {
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface Guide {
  id: number;
  axis: "h" | "v";
  pos: number;
}

let nextId = 1;

function PixelRuler() {
  const { isPro } = usePlan();
  const trial = useToolTrial("pixel-ruler", isPro);
  const seo = toolSeo;

  const areaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [imgName, setImgName] = useState("");
  const [cross, setCross] = useState<{ x: number; y: number } | null>(null);
  const [measures, setMeasures] = useState<Measure[]>([]);
  const [draft, setDraft] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [showGrid, setShowGrid] = useState(false);
  const [gridSize, setGridSize] = useState(20);
  const dragGuide = useRef<number | null>(null);

  useEffect(() => () => {
    if (imgUrl) URL.revokeObjectURL(imgUrl);
  }, [imgUrl]);

  const pos = useCallback((e: React.PointerEvent) => {
    const r = areaRef.current!.getBoundingClientRect();
    return { x: Math.round(e.clientX - r.left), y: Math.round(e.clientY - r.top) };
  }, []);

  const onDown = (e: React.PointerEvent) => {
    if (dragGuide.current !== null) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const p = pos(e);
    setDraft({ x1: p.x, y1: p.y, x2: p.x, y2: p.y });
  };

  const onMove = (e: React.PointerEvent) => {
    const p = pos(e);
    setCross(p);
    if (dragGuide.current !== null) {
      const id = dragGuide.current;
      setGuides((gs) => gs.map((g) => (g.id === id ? { ...g, pos: g.axis === "h" ? p.y : p.x } : g)));
      return;
    }
    if (draft) setDraft({ ...draft, x2: p.x, y2: p.y });
  };

  const onUp = () => {
    dragGuide.current = null;
    if (draft) {
      const d = Math.hypot(draft.x2 - draft.x1, draft.y2 - draft.y1);
      if (d >= 3) setMeasures((m) => [...m, { ...draft, id: nextId++ }]);
      setDraft(null);
    }
  };

  const addGuide = (axis: "h" | "v") => {
    const r = areaRef.current?.getBoundingClientRect();
    if (!r) return;
    setGuides((g) => [...g, { id: nextId++, axis, pos: axis === "h" ? Math.round(r.height / 2) : Math.round(r.width / 2) }]);
  };

  const pickImage = (f: File | undefined) => {
    if (!f || !f.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (imgUrl) URL.revokeObjectURL(imgUrl);
    setImgUrl(URL.createObjectURL(f));
    setImgName(f.name);
  };

  const exportJson = () => {
    if (!trial.canUse) return;
    const data = {
      tool: "pixel-ruler",
      image: imgName || "test pattern",
      measurements: measures.map((m) => ({
        from: [m.x1, m.y1],
        to: [m.x2, m.y2],
        distancePx: Math.round(Math.hypot(m.x2 - m.x1, m.y2 - m.y1)),
        dx: m.x2 - m.x1,
        dy: m.y2 - m.y1,
      })),
      guides: guides.map((g) => ({ axis: g.axis, positionPx: g.pos })),
    };
    downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), "pixel-measurements.json");
    trial.recordUse();
    toast.success("Measurements exported");
  };

  const all = [...measures.map((m) => ({ ...m, kind: "m" as const })), ...(draft ? [{ ...draft, id: -1, kind: "d" as const }] : [])];

  return (
    <ToolPageShell toolId="pixel-ruler" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Pixel Ruler" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => pickImage(e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border px-4 py-3 text-sm font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              <ImagePlus className="h-4 w-4" /> {imgName || "Upload an image"}
            </button>
            {imgName && (
              <button
                type="button"
                onClick={() => {
                  if (imgUrl) URL.revokeObjectURL(imgUrl);
                  setImgUrl(null);
                  setImgName("");
                }}
                className="mt-2 w-full text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Back to test pattern
              </button>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-foreground/80">Grid overlay</span>
            <button
              type="button"
              role="switch"
              aria-checked={showGrid}
              onClick={() => setShowGrid((v) => !v)}
              className={cn(
                "h-6 w-11 rounded-full p-0.5 transition",
                showGrid ? "bg-primary" : "bg-muted",
              )}
            >
              <span className={cn("block h-5 w-5 rounded-full bg-white shadow transition", showGrid && "translate-x-5")} />
            </button>
          </div>
          {showGrid && (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[13px] text-muted-foreground">Grid size</span>
                <span className="text-[13px] font-bold tabular-nums">{gridSize}px</span>
              </div>
              <input
                type="range"
                min={8}
                max={100}
                value={gridSize}
                onChange={(e) => setGridSize(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
          )}

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Guides</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => addGuide("h")}
                className="flex-1 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
              >
                + Horizontal
              </button>
              <button
                type="button"
                onClick={() => addGuide("v")}
                className="flex-1 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
              >
                + Vertical
              </button>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">Drag guides to move. Double-click a guide to remove it.</p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Measurements ({measures.length})</p>
              {measures.length > 0 && (
                <button
                  type="button"
                  onClick={() => setMeasures([])}
                  className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Clear
                </button>
              )}
            </div>
            <div className="max-h-40 space-y-1.5 overflow-y-auto">
              {measures.length === 0 && <p className="text-xs text-muted-foreground">Drag on the canvas to measure.</p>}
              {measures.map((m, i) => {
                const d = Math.hypot(m.x2 - m.x1, m.y2 - m.y1);
                return (
                  <div key={m.id} className="flex items-center justify-between rounded-lg bg-background px-2.5 py-1.5 text-xs">
                    <span className="font-semibold">#{i + 1}</span>
                    <span className="font-mono text-muted-foreground">
                      {m.x1},{m.y1} to {m.x2},{m.y2}
                    </span>
                    <span className="font-bold tabular-nums">{Math.round(d)}px</span>
                  </div>
                );
              })}
            </div>
          </div>

          <ActionButton disabled={!trial.canUse || measures.length === 0} onClick={exportJson}>
            <Download className="h-4 w-4" /> Export measurements
          </ActionButton>
          <p className="text-xs text-muted-foreground">
            Distances are real CSS pixels of the element on your screen, not the source image file.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="relative overflow-hidden rounded-xl border border-border">
            {/* top ruler */}
            <div
              className="h-6 w-full bg-background"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(to right, transparent 0 9px, #8886 9px 10px), repeating-linear-gradient(to right, transparent 0 49px, #888a 49px 50px)",
              }}
            />
            <div className="flex">
              {/* left ruler */}
              <div
                className="w-6 shrink-0 bg-background"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(to bottom, transparent 0 9px, #8886 9px 10px), repeating-linear-gradient(to bottom, transparent 0 49px, #888a 49px 50px)",
                }}
              />
              <div
                ref={areaRef}
                onPointerDown={onDown}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerLeave={() => {
                  setCross(null);
                  if (dragGuide.current === null) setDraft(null);
                }}
                className={cn(
                  "relative h-[440px] flex-1 cursor-crosshair touch-none select-none overflow-hidden",
                  !imgUrl && "bg-[repeating-conic-gradient(#80808022_0_25%,transparent_0_50%)] bg-[length:32px_32px]",
                )}
              >
                {imgUrl && (
                  <img src={imgUrl} alt="Measurement target" className="pointer-events-none absolute inset-0 h-full w-full object-contain" draggable={false} />
                )}
                {showGrid && (
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      backgroundImage: `linear-gradient(#3b82f622 1px, transparent 1px), linear-gradient(90deg, #3b82f622 1px, transparent 1px)`,
                      backgroundSize: `${gridSize}px ${gridSize}px`,
                    }}
                  />
                )}
                {/* guides */}
                {guides.map((g) =>
                  g.axis === "h" ? (
                    <div
                      key={g.id}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        dragGuide.current = g.id;
                        (e.target as HTMLElement).setPointerCapture(e.pointerId);
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setGuides((gs) => gs.filter((x) => x.id !== g.id));
                      }}
                      className="absolute inset-x-0 z-20 h-3 -translate-y-1/2 cursor-ns-resize touch-none"
                      style={{ top: g.pos }}
                    >
                      <div className="h-px w-full bg-rose-500" />
                      <span className="absolute left-1 top-1 rounded bg-rose-500 px-1 font-mono text-[10px] font-bold text-white">
                        {g.pos}px
                      </span>
                    </div>
                  ) : (
                    <div
                      key={g.id}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        dragGuide.current = g.id;
                        (e.target as HTMLElement).setPointerCapture(e.pointerId);
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setGuides((gs) => gs.filter((x) => x.id !== g.id));
                      }}
                      className="absolute inset-y-0 z-20 w-3 -translate-x-1/2 cursor-ew-resize touch-none"
                      style={{ left: g.pos }}
                    >
                      <div className="h-full w-px bg-rose-500" />
                      <span className="absolute left-1 top-1 rounded bg-rose-500 px-1 font-mono text-[10px] font-bold text-white">
                        {g.pos}px
                      </span>
                    </div>
                  ),
                )}
                {/* crosshair */}
                {cross && (
                  <>
                    <div className="pointer-events-none absolute inset-y-0 z-10 w-px bg-sky-500/60" style={{ left: cross.x }} />
                    <div className="pointer-events-none absolute inset-x-0 z-10 h-px bg-sky-500/60" style={{ top: cross.y }} />
                    <span className="pointer-events-none absolute z-10 ml-2 mt-1 rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white" style={{ left: cross.x, top: cross.y }}>
                      {cross.x}, {cross.y}
                    </span>
                  </>
                )}
                {/* measurements */}
                {all.map((m) => {
                  const d = Math.hypot(m.x2 - m.x1, m.y2 - m.y1);
                  const ang = (Math.atan2(m.y2 - m.y1, m.x2 - m.x1) * 180) / Math.PI;
                  return (
                    <div key={m.id} className="pointer-events-none absolute inset-0 z-10">
                      <div
                        className={cn("absolute h-0.5 origin-left", m.kind === "d" ? "bg-amber-400" : "bg-emerald-500")}
                        style={{
                          left: m.x1,
                          top: m.y1,
                          width: d,
                          transform: `rotate(${ang}deg)`,
                        }}
                      />
                      <span className={cn("absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full", m.kind === "d" ? "bg-amber-400" : "bg-emerald-500")} style={{ left: m.x1, top: m.y1 }} />
                      <span className={cn("absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full", m.kind === "d" ? "bg-amber-400" : "bg-emerald-500")} style={{ left: m.x2, top: m.y2 }} />
                      <span
                        className="absolute rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white"
                        style={{ left: (m.x1 + m.x2) / 2 + 6, top: (m.y1 + m.y2) / 2 - 20 }}
                      >
                        {Math.round(d)}px
                      </span>
                    </div>
                  );
                })}
                {!imgUrl && measures.length === 0 && !draft && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <p className="flex items-center gap-2 rounded-full bg-background/80 px-4 py-2 text-sm font-semibold text-muted-foreground">
                      <Ruler className="h-4 w-4" /> Drag anywhere to measure
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
