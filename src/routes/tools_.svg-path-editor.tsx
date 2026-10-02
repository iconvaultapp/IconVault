// /tools/svg-path-editor - Visual Bezier SVG path editor.
// Click to add points, drag points and handles, M/L/C/Q/Z commands, live preview with
// grid, path d output with copy. 100% in-browser.

import { useCallback, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Check, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/svg-path-editor")({
  head: () => {
    const seo = getToolSeoMeta("svg-path-editor");
    const canonical = "https://iconvault.site/tools/svg-path-editor";
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
  component: PathEditor,
});

const SIZE = 400;

type Pt = {
  id: number;
  x: number; y: number;
  cmd: "M" | "L" | "C" | "Q";
  c1x: number; c1y: number;
  c2x: number; c2y: number;
};

let nextId = 1;

function round(n: number) { return Math.round(n * 10) / 10; }

function buildD(points: Pt[], closed: boolean): string {
  if (points.length === 0) return "";
  let d = `M ${round(points[0]!.x)} ${round(points[0]!.y)}`;
  for (let i = 1; i < points.length; i++) {
    const p = points[i]!;
    if (p.cmd === "L") d += ` L ${round(p.x)} ${round(p.y)}`;
    else if (p.cmd === "C") d += ` C ${round(p.c1x)} ${round(p.c1y)}, ${round(p.c2x)} ${round(p.c2y)}, ${round(p.x)} ${round(p.y)}`;
    else if (p.cmd === "Q") d += ` Q ${round(p.c1x)} ${round(p.c1y)}, ${round(p.x)} ${round(p.y)}`;
  }
  if (closed && points.length > 2) d += " Z";
  return d;
}

function PathEditor() {
  const { isPro } = usePlan();
  const trial = useToolTrial("svg-path-editor", isPro);
  const seo = getToolSeo("svg-path-editor");

  const [points, setPoints] = useState<Pt[]>([]);
  const [closed, setClosed] = useState(false);
  const [nextCmd, setNextCmd] = useState<"L" | "C" | "Q">("L");
  const [selected, setSelected] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [drag, setDrag] = useState<null | { kind: "point" | "c1" | "c2"; id: number }>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const svgPoint = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    return {
      x: Math.min(SIZE, Math.max(0, ((clientX - rect.left) / rect.width) * SIZE)),
      y: Math.min(SIZE, Math.max(0, ((clientY - rect.top) / rect.height) * SIZE)),
    };
  }, []);

  const addPoint = useCallback((x: number, y: number) => {
    setPoints((prev) => {
      const id = nextId++;
      if (prev.length === 0) {
        return [{ id, x, y, cmd: "M", c1x: x, c1y: y, c2x: x, c2y: y }];
      }
      const last = prev[prev.length - 1]!;
      const dx = x - last.x, dy = y - last.y;
      const pt: Pt = {
        id, x, y, cmd: nextCmd,
        c1x: last.x + dx * 0.33, c1y: last.y + dy * 0.33,
        c2x: x - dx * 0.33, c2y: y - dy * 0.33,
      };
      if (nextCmd === "Q") { pt.c1x = last.x + dx * 0.5; pt.c1y = last.y + dy * 0.5; }
      setSelected(id);
      return [...prev, pt];
    });
  }, [nextCmd]);

  const onSvgPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).dataset["node"]) return; // handled by node handlers
    const p = svgPoint(e.clientX, e.clientY);
    addPoint(p.x, p.y);
  };

  const startDrag = (kind: "point" | "c1" | "c2", id: number) => (e: React.PointerEvent) => {
    e.stopPropagation();
    setSelected(id);
    setDrag({ kind, id });
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const onMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const p = svgPoint(e.clientX, e.clientY);
    setPoints((prev) => prev.map((pt) => {
      if (pt.id !== drag.id) return pt;
      if (drag.kind === "point") {
        const dx = p.x - pt.x, dy = p.y - pt.y;
        return { ...pt, x: p.x, y: p.y, c1x: pt.c1x + dx, c1y: pt.c1y + dy, c2x: pt.c2x + dx, c2y: pt.c2y + dy };
      }
      if (drag.kind === "c1") return { ...pt, c1x: p.x, c1y: p.y };
      return { ...pt, c2x: p.x, c2y: p.y };
    }));
  };

  const deleteSelected = useCallback(() => {
    if (selected === null) return;
    setPoints((prev) => {
      const next = prev.filter((p) => p.id !== selected);
      const first = next[0];
      if (first) next[0] = { ...first, cmd: "M" };
      return next;
    });
    setSelected(null);
  }, [selected]);

  const d = buildD(points, closed);
  const svgCode = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}">\n  <path d="${d}" fill="none" stroke="black" stroke-width="2"/>\n</svg>`;

  const copy = useCallback(async (text: string, label: string) => {
    if (!text || !trial.canUse) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      trial.recordUse();
      toast.success(`${label} copied`);
    } catch {
      toast.error("Copy failed - select and copy manually.");
    }
  }, [trial]);

  const sel = points.find((p) => p.id === selected) ?? null;

  return (
    <ToolPageShell toolId="svg-path-editor" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="SVG Path Editor" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Next point type</p>
            <div className="grid grid-cols-3 gap-2">
              {(["L", "C", "Q"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNextCmd(c)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-center transition",
                    nextCmd === c ? "border-primary bg-primary/10" : "border-border hover:border-primary/40",
                  )}
                >
                  <p className="text-sm font-bold">{c}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {c === "L" ? "Line" : c === "C" ? "Bezier" : "Quadratic"}
                  </p>
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              The first click is always M (move). Then click on the canvas to add points.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setClosed((v) => !v)}
            className={cn(
              "w-full rounded-xl border px-3 py-2.5 text-sm font-semibold transition",
              closed ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40",
            )}
          >
            {closed ? "Z - Close path: ON" : "Z - Close path: OFF"}
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={deleteSelected}
              disabled={selected === null}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-sm font-semibold transition hover:border-red-400 disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" /> Delete point
            </button>
            <button
              type="button"
              onClick={() => { setPoints([]); setSelected(null); setClosed(false); }}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-sm font-semibold transition hover:border-red-400"
            >
              <Plus className="h-4 w-4 rotate-45" /> Clear all
            </button>
          </div>

          {sel && (
            <div className="rounded-xl bg-muted/60 p-3 text-sm">
              <p className="font-semibold">Selected point</p>
              <p className="text-xs text-muted-foreground">
                {sel.cmd} at ({round(sel.x)}, {round(sel.y)}). Drag the point to move it, drag the square handles to shape curves.
              </p>
            </div>
          )}

          <div>
            <p className="mb-1.5 text-[13px] font-medium text-foreground/80">Path data (d)</p>
            <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-all rounded-xl border border-border bg-background p-3 font-mono text-xs">
              {d || "Click the canvas to start drawing."}
            </pre>
            <div className="mt-2 flex gap-2">
              <ActionButton disabled={!d || !trial.canUse} onClick={() => copy(d, "Path data")}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy d"}
              </ActionButton>
              <ActionButton disabled={!d || !trial.canUse} onClick={() => copy(svgCode, "SVG")}>
                <Copy className="h-4 w-4" /> Copy SVG
              </ActionButton>
            </div>
            {!isPro && (
              <p className="mt-2 text-xs text-muted-foreground">
                {trial.left} of {TOOL_TRIAL_LIMIT} free copies left - everything runs in your browser.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-center">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              className="max-h-[600px] w-full max-w-[600px] cursor-crosshair rounded-lg bg-background"
              onPointerDown={onSvgPointerDown}
              onPointerMove={onMove}
              onPointerUp={() => setDrag(null)}
              onPointerCancel={() => setDrag(null)}
              style={{ touchAction: "none" }}
            >
              <defs>
                <pattern id="pgrid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-border" />
                </pattern>
                <pattern id="pgrid5" width="100" height="100" patternUnits="userSpaceOnUse">
                  <path d="M 100 0 L 0 0 0 100" fill="none" stroke="currentColor" strokeWidth="1" className="text-border" />
                </pattern>
              </defs>
              <rect width={SIZE} height={SIZE} fill="url(#pgrid)" />
              <rect width={SIZE} height={SIZE} fill="url(#pgrid5)" />
              {d && <path d={d} fill={closed ? "rgba(20,184,166,0.15)" : "none"} stroke="#14b8a6" strokeWidth={2.5} />}
              {points.map((p) => (
                <g key={p.id}>
                  {(p.cmd === "C" || p.cmd === "Q") && (
                    <>
                      <line x1={p.cmd === "C" ? p.c1x : (points[points.indexOf(p) - 1]?.x ?? p.x)} y1={p.cmd === "C" ? p.c1y : (points[points.indexOf(p) - 1]?.y ?? p.y)} x2={p.c1x} y2={p.c1y} stroke="#f59e0b" strokeWidth={1} />
                      {p.cmd === "C" && <line x1={p.c2x} y1={p.c2y} x2={p.x} y2={p.y} stroke="#f59e0b" strokeWidth={1} />}
                      <rect
                        data-node="handle" x={p.c1x - 5} y={p.c1y - 5} width={10} height={10}
                        fill="#f59e0b" className="cursor-move"
                        onPointerDown={startDrag("c1", p.id)}
                      />
                      {p.cmd === "C" && (
                        <rect
                          data-node="handle" x={p.c2x - 5} y={p.c2y - 5} width={10} height={10}
                          fill="#f59e0b" className="cursor-move"
                          onPointerDown={startDrag("c2", p.id)}
                        />
                      )}
                    </>
                  )}
                  <circle
                    data-node="point"
                    cx={p.x} cy={p.y} r={7}
                    fill={p.cmd === "M" ? "#14b8a6" : selected === p.id ? "#fff" : "#0f766e"}
                    stroke="#14b8a6" strokeWidth={2}
                    className="cursor-move"
                    onPointerDown={startDrag("point", p.id)}
                  />
                  <text x={p.x + 10} y={p.y - 8} fontSize={11} fill="currentColor" className="text-muted-foreground pointer-events-none">{p.cmd}</text>
                </g>
              ))}
            </svg>
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Click anywhere to add a point. Drag points to move them and the orange handles to shape curves.
          </p>
        </div>
      </div>
    </ToolPageShell>
  );
}
