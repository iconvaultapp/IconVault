// /tools/js-gc-visualizer - Animated garbage collection visualizer: scavenge
// (young generation) and mark-sweep (old generation) passes, plus leak
// patterns. Simplified model of a generational collector, runs in your browser.

import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bug, Check, Copy, Pause, Play, RotateCcw, StepBack, StepForward } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/js-gc-visualizer";
import toolSeoMeta from "@/lib/tool-seo-meta-data/js-gc-visualizer";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/js-gc-visualizer")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/js-gc-visualizer";
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
  component: GcTool,
});

/* ---------------- model ---------------- */

type Gen = "young" | "old";

interface GNode {
  id: string;
  label: string;
  sub: string;
  gen: Gen;
  x: number;
  y: number;
  root?: boolean | undefined;
  mark?: "live" | "dead" | undefined;
  gone?: boolean | undefined;
  copied?: boolean | undefined;
  leak?: boolean | undefined;
}

interface GCFrame {
  title: string;
  note: string;
  stat: string;
  nodes: GNode[];
  edges: [string, string][];
}

interface Scenario {
  id: string;
  name: string;
  blurb: string;
  frames: GCFrame[];
  history: number[];
}

const mk = (
  id: string, label: string, sub: string, gen: Gen, x: number, y: number, root = false,
): GNode => ({ id, label, sub, gen, x, y, root });

const withMark = (ns: GNode[], live: string[], dead: string[]): GNode[] =>
  ns.map((n) => ({
    ...n,
    mark: live.includes(n.id) ? "live" : dead.includes(n.id) ? "dead" : undefined,
    copied: false,
  }));

function scavengeScenario(): Scenario {
  const roots: GNode[] = [
    mk("window", "window", "root", "old", 110, 34, true),
    mk("frame", "stack frame", "root", "old", 310, 34, true),
  ];
  const eden: GNode[] = [
    mk("cache", "cache", "young", "young", 90, 140),
    mk("user", "user", "young", "young", 235, 140),
    mk("cart", "cart", "young", "young", 235, 225),
    mk("tmp", "tmp data", "young", "young", 380, 140),
    mk("modal", "closed modal", "young", "young", 90, 255),
  ];
  const settings = mk("settings", "settings", "old", "old", 643, 140);
  const e0: [string, string][] = [
    ["window", "cache"], ["window", "settings"],
    ["cache", "user"], ["cache", "cart"], ["frame", "tmp"],
  ];

  const f0: GCFrame = {
    title: "Allocate",
    note: "Your app allocates objects in the young generation (Eden). window and the stack frame are roots: everything the collector can reach from a root survives.",
    stat: "8 objects on the heap",
    nodes: [...roots, ...eden, settings],
    edges: e0,
  };

  const f1: GCFrame = {
    title: "Mark (young generation)",
    note: "The collector walks every reference from the roots. cache, user, cart and tmp are reachable, so they are marked live. The closed modal has no incoming references, so it is marked dead.",
    stat: "4 marked live, 1 marked dead",
    nodes: withMark([...roots, ...eden, settings], ["cache", "user", "cart", "tmp"], ["modal"]),
    edges: e0,
  };

  const surv: GNode[] = [
    { ...mk("cache", "cache", "young", "young", 513, 110), copied: true },
    { ...mk("user", "user", "young", "young", 513, 180), copied: true },
    { ...mk("cart", "cart", "young", "young", 513, 250), copied: true },
    { ...mk("tmp", "tmp data", "young", "young", 513, 320), copied: true },
  ];
  const f2: GCFrame = {
    title: "Scavenge: copy live, sweep dead",
    note: "Scavenge does not sweep in place. It copies every live young object into survivor space and then frees the whole of Eden at once, including the closed modal. Copying also compacts memory for free.",
    stat: "4 copied to survivor, 1 reclaimed",
    nodes: [...roots, ...surv, { ...mk("modal", "closed modal", "young", "young", 90, 255), gone: true }, settings],
    edges: [
      ["window", "cache"], ["window", "settings"],
      ["cache", "user"], ["cache", "cart"], ["frame", "tmp"],
    ],
  };

  const f3nodes: GNode[] = [
    ...roots,
    ...surv.map((n) => ({ ...n, copied: false })),
    mk("img", "image", "young", "young", 90, 140),
    mk("tracker", "tracker", "young", "young", 235, 140),
    settings,
  ];
  const f3: GCFrame = {
    title: "Allocate again (with a leak)",
    note: "Eden fills up again. image is a temp, but tracker was pushed into a global list and never removed. It is reachable from window, so no collection can ever free it, even though the app no longer needs it.",
    stat: "9 objects on the heap",
    nodes: f3nodes,
    edges: [
      ["window", "cache"], ["window", "settings"], ["window", "tracker"],
      ["cache", "user"], ["cache", "cart"], ["frame", "tmp"], ["frame", "img"],
    ],
  };

  const f4: GCFrame = {
    title: "Mark (full heap)",
    note: "A full mark walks young and old generations. tracker is marked live because the global list still references it. Only the temp image is dead this time.",
    stat: "8 marked live, 1 marked dead",
    nodes: withMark(f3nodes, ["cache", "user", "cart", "tmp", "tracker", "settings"], ["img"]),
    edges: f3.edges,
  };

  const f5nodes: GNode[] = f3nodes.map((n) =>
    n.id === "img"
      ? { ...n, gone: true, mark: undefined }
      : n.id === "tracker"
        ? { ...n, mark: undefined, leak: true }
        : { ...n, mark: undefined },
  );
  const f5: GCFrame = {
    title: "Sweep: the leak survives",
    note: "The dead image is reclaimed, but tracker survives every collection because a root still reaches it. Leaked objects look exactly like live data to the collector: reachability is all it checks.",
    stat: "1 reclaimed, 1 leaked object identified",
    nodes: f5nodes,
    edges: f3.edges.filter(([a, b]) => a !== "img" && b !== "img"),
  };

  const f6: GCFrame = {
    title: "Result",
    note: "Heap size: 8, then 7, then 9, then 8 objects, and it will keep climbing as more trackers pile into the global list. Fix it the way the pros do: removeEventListener when done, cache.delete(key) on cleanup, and store non-essential references in a WeakMap or WeakRef so they never keep objects alive.",
    stat: "Leak found: tracker (reachable from window)",
    nodes: f5nodes,
    edges: f5.edges,
  };

  return {
    id: "scavenge",
    name: "Scavenge (young gen)",
    blurb: "Watch a young-generation scavenge copy live objects to survivor space, then see a leaked global survive the next full collection.",
    frames: [f0, f1, f2, f3, f4, f5, f6],
    history: [8, 8, 7, 9, 9, 8, 8],
  };
}

function marksweepScenario(): Scenario {
  const roots: GNode[] = [mk("window", "window", "root", "old", 110, 34, true)];
  const live: GNode[] = [
    mk("settings", "settings", "old", "old", 643, 95),
    mk("theme", "theme", "old", "old", 643, 155),
    mk("cacheOld", "route cache", "old", "old", 643, 215),
  ];
  const dead: GNode[] = [
    mk("session", "expired session", "old", "old", 643, 275),
    mk("oldModal", "detached modal", "old", "old", 643, 335),
    mk("bigBuf", "abandoned buffer", "old", "old", 420, 215),
  ];
  const edges: [string, string][] = [
    ["window", "settings"], ["window", "cacheOld"], ["settings", "theme"],
  ];
  const f0: GCFrame = {
    title: "Allocate (old generation)",
    note: "Objects that survive a few scavenges are promoted to the old generation. Old-gen collections are rarer and more expensive, so V8 runs them only when the old space fills up.",
    stat: "7 objects on the heap",
    nodes: [...roots, ...live, ...dead],
    edges,
  };
  const f1: GCFrame = {
    title: "Mark",
    note: "The marker walks from the roots through every reference. settings, theme and the route cache are reachable. The expired session, the detached modal and the abandoned buffer have no path from any root.",
    stat: "4 marked live, 3 marked dead",
    nodes: withMark([...roots, ...live, ...dead], ["settings", "theme", "cacheOld"], ["session", "oldModal", "bigBuf"]),
    edges,
  };
  const f2nodes = [...roots, ...live, ...dead.map((n) => ({ ...n, gone: true, mark: undefined }))];
  const f2: GCFrame = {
    title: "Sweep",
    note: "The sweeper reclaims the three dead objects and links their memory back into the free list. Nothing moves: unlike scavenge, mark-sweep leaves the survivors exactly where they were, which can fragment memory over time.",
    stat: "3 reclaimed, about 480 KB freed",
    nodes: f2nodes,
    edges,
  };
  const f3: GCFrame = {
    title: "Result",
    note: "Heap size: 7, then 4 objects. Real engines usually compact after sweeping to fight fragmentation, and they mark incrementally so the page does not freeze. If old-gen collections run constantly, your app is promoting too fast: allocate less, or reuse objects instead of churning them.",
    stat: "Old generation healthy again",
    nodes: f2nodes,
    edges,
  };
  return {
    id: "marksweep",
    name: "Mark-sweep (old gen)",
    blurb: "An old-generation collection: mark everything reachable from the roots, then sweep the rest back into the free list.",
    frames: [f0, f1, f2, f3],
    history: [7, 7, 4, 4],
  };
}

function leakScenario(): Scenario {
  const leaks: { id: string; label: string; tip: string }[] = [
    { id: "l1", label: "forgotten listener", tip: "removeEventListener on unmount" },
    { id: "l2", label: "runaway timer", tip: "clearInterval when done" },
    { id: "l3", label: "detached DOM", tip: "drop references to removed nodes" },
    { id: "l4", label: "growing cache", tip: "bound the cache or use WeakMap" },
    { id: "l5", label: "stale closure", tip: "do not capture big objects you no longer need" },
  ];
  const frames: GCFrame[] = [];
  const history: number[] = [];
  leaks.forEach((lk, i) => {
    const leakNodes: GNode[] = leaks.slice(0, i + 1).map((l, j) => ({
      ...mk(l.id, l.label, "leaked", "old", 150 + j * 118, 250), leak: true,
    }));
    const nodes: GNode[] = [
      mk("window", "window", "root", "old", 110, 34, true),
      mk("app", "app state", "old", "old", 643, 110),
      mk("store", "store", "old", "old", 643, 180),
      ...leakNodes,
    ];
    const edges: [string, string][] = [
      ["window", "app"], ["window", "store"],
      ...leakNodes.map((l): [string, string] => ["window", l.id]),
    ];
    history.push(3 + i + 1);
    frames.push({
      title: `Collection #${i + 1}`,
      note:
        i === 0
          ? "First collection runs. A forgotten event listener is still referenced by window, so it survives. One leak is easy to miss."
          : `Collection #${i + 1} runs and reclaims nothing new: ${lk.label} joined the pile. Every leaked object is reachable, so the collector treats each one as precious live data.`,
      stat: `${3 + i + 1} objects on the heap (growing)`,
      nodes,
      edges,
    });
  });
  const last = frames[frames.length - 1]!;
  frames.push({
    title: "Leak hunt result",
    note: `Five collections, zero bytes reclaimed from leaks, heap grew from 4 to ${history[history.length - 1]} objects. In DevTools you would confirm this with heap snapshots: take one, do the action, take another, and look for objects that grow between snapshots. Fixes: ${leaks.map((l) => l.tip).join("; ")}.`,
    stat: "5 leaks identified",
    nodes: last.nodes,
    edges: last.edges,
  });
  return {
    id: "leaks",
    name: "Leak hunt",
    blurb: "Run five collections in a row and watch the heap grow: every leaked object is reachable, so the GC can never touch it.",
    frames,
    history,
  };
}

/* ---------------- component ---------------- */

const SCENARIOS: Scenario[] = [scavengeScenario(), marksweepScenario(), leakScenario()];

function nodeFill(n: GNode): string {
  if (n.root) return "#fef3c7";
  return n.gen === "young" ? "#ccfbf1" : "#e0e7ff";
}
function nodeStroke(n: GNode): string {
  if (n.mark === "dead") return "#ef4444";
  if (n.leak) return "#dc2626";
  if (n.mark === "live") return "#f59e0b";
  if (n.copied) return "#16a34a";
  if (n.root) return "#d97706";
  return n.gen === "young" ? "#0d9488" : "#4f46e5";
}

function GcTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("js-gc-visualizer", isPro);
  const seo = toolSeo;

  const [scenId, setScenId] = useState("scavenge");
  const scen = useMemo(() => SCENARIOS.find((s) => s.id === scenId) ?? SCENARIOS[0]!, [scenId]);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const frame = scen.frames[idx]!;
  const byId = useMemo(() => new Map(frame.nodes.map((n) => [n.id, n])), [frame]);

  useEffect(() => { setIdx(0); setPlaying(false); setSel(null); }, [scenId]);
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      setIdx((i) => {
        if (i >= scen.frames.length - 1) { setPlaying(false); return i; }
        return i + 1;
      });
    }, 1900);
    return () => clearInterval(t);
  }, [playing, scen.frames.length]);

  const startPlay = () => {
    if (!trial.canUse) return;
    trial.recordUse();
    if (idx >= scen.frames.length - 1) setIdx(0);
    setPlaying(true);
  };

  const copyReport = async () => {
    if (!trial.canUse) return;
    const lines = [
      `GC Visualizer report: ${scen.name}`,
      `Heap history: ${scen.history.join(" -> ")} objects`,
      "",
      ...scen.frames.map((f, i) => `Frame ${i + 1}/${scen.frames.length} - ${f.title}: ${f.note} (${f.stat})`),
      "",
      "Simplified model: real engines use write barriers, incremental and parallel marking; timings here are illustrative.",
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      trial.recordUse();
      toast.success("Report copied");
    } catch {
      toast.error("Could not access the clipboard");
    }
  };

  const selNode = sel ? byId.get(sel) : undefined;
  const selIn = sel ? frame.edges.filter(([, b]) => b === sel).map(([a]) => a) : [];
  const selOut = sel ? frame.edges.filter(([a]) => a === sel).map(([, b]) => b) : [];

  return (
    <ToolPageShell toolId="js-gc-visualizer" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="GC Visualizer" left={trial.left} />

      <div className="mb-4 flex flex-wrap gap-2">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setScenId(s.id)}
            className={cn(
              "rounded-xl border px-4 py-2 text-sm font-semibold transition",
              scenId === s.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/40",
            )}
          >
            {s.name}
          </button>
        ))}
      </div>
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">{scen.blurb}</p>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <svg viewBox="0 0 720 400" className="block w-full" role="img" aria-label="Heap visualization">
            <rect x={8} y={64} width={444} height={328} rx={12} fill="none" stroke="#0d9488" strokeOpacity={0.35} strokeDasharray="8 6" />
            <text x={20} y={86} fontSize={12} fontWeight={700} fill="#0d9488">YOUNG GENERATION (EDEN)</text>
            <rect x={460} y={64} width={106} height={328} rx={12} fill="none" stroke="#16a34a" strokeOpacity={0.35} strokeDasharray="8 6" />
            <text x={468} y={86} fontSize={11} fontWeight={700} fill="#16a34a">SURVIVOR</text>
            <rect x={574} y={64} width={138} height={328} rx={12} fill="none" stroke="#4f46e5" strokeOpacity={0.35} strokeDasharray="8 6" />
            <text x={586} y={86} fontSize={11} fontWeight={700} fill="#4f46e5">OLD GEN</text>

            {frame.edges.map(([a, b], i) => {
              const n1 = byId.get(a);
              const n2 = byId.get(b);
              if (!n1 || !n2 || n1.gone || n2.gone) return null;
              const dx = n2.x - n1.x;
              const dy = n2.y - n1.y;
              const len = Math.hypot(dx, dy) || 1;
              const sx = n1.x + (dx / len) * 52;
              const sy = n1.y + (dy / len) * 26;
              const ex = n2.x - (dx / len) * 52;
              const ey = n2.y - (dy / len) * 26;
              return (
                <line
                  key={`${a}-${b}-${i}`}
                  x1={sx} y1={sy} x2={ex} y2={ey}
                  stroke="#94a3b8" strokeWidth={1.5} strokeOpacity={0.7}
                  style={{ transition: "opacity 600ms ease" }}
                />
              );
            })}

            {frame.nodes.map((n) => (
              <g
                key={n.id}
                transform={`translate(${n.x},${n.y})`}
                opacity={n.gone ? 0 : n.mark === "dead" ? 0.45 : 1}
                style={{ transition: "transform 650ms ease, opacity 650ms ease", cursor: "pointer" }}
                onClick={() => setSel(n.id === sel ? null : n.id)}
              >
                <rect
                  x={-52} y={-23} width={104} height={46} rx={10}
                  fill={nodeFill(n)} stroke={nodeStroke(n)} strokeWidth={n.mark || n.copied || n.leak ? 3 : 2}
                  strokeDasharray={n.mark === "dead" ? "5 4" : n.root ? "6 4" : undefined}
                />
                <text y={-2} textAnchor="middle" fontSize={12.5} fontWeight={700} fill="#0f172a">{n.label}</text>
                <text y={14} textAnchor="middle" fontSize={10} fill="#475569">
                  {n.root ? "root" : n.gen === "young" ? "young" : "old"}
                  {n.mark === "live" ? " - live" : n.mark === "dead" ? " - dead" : ""}
                  {n.copied ? " - copied" : ""}
                </text>
                {n.leak && (
                  <g transform="translate(40,-32)">
                    <circle r={11} fill="#dc2626" />
                    <text y={4.5} textAnchor="middle" fontSize={11} fontWeight={800} fill="#fff">!</text>
                  </g>
                )}
              </g>
            ))}
          </svg>

          <div className="border-t border-border p-4">
            <div className="mb-1 flex items-center justify-between gap-3">
              <p className="text-sm font-bold">
                Frame {idx + 1} of {scen.frames.length}: {frame.title}
              </p>
              <p className="text-xs font-semibold text-muted-foreground">{frame.stat}</p>
            </div>
            <p className="min-h-[3.5rem] text-sm text-muted-foreground">{frame.note}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button" onClick={() => { setPlaying(false); setIdx(0); }}
                className="rounded-lg border border-border p-2 text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                aria-label="Reset"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                type="button" onClick={() => { setPlaying(false); setIdx((i) => Math.max(0, i - 1)); }}
                disabled={idx === 0}
                className="rounded-lg border border-border p-2 text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:opacity-40"
                aria-label="Previous frame"
              >
                <StepBack className="h-4 w-4" />
              </button>
              {playing ? (
                <button
                  type="button" onClick={() => setPlaying(false)}
                  className="rounded-lg border border-border p-2 text-foreground transition hover:border-primary/40"
                  aria-label="Pause"
                >
                  <Pause className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button" onClick={startPlay} disabled={!trial.canUse}
                  className="rounded-lg bg-primary p-2 text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
                  aria-label="Play"
                >
                  <Play className="h-4 w-4" />
                </button>
              )}
              <button
                type="button" onClick={() => { setPlaying(false); setIdx((i) => Math.min(scen.frames.length - 1, i + 1)); }}
                disabled={idx >= scen.frames.length - 1}
                className="rounded-lg border border-border p-2 text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:opacity-40"
                aria-label="Next frame"
              >
                <StepForward className="h-4 w-4" />
              </button>
              <div className="mx-1 hidden h-6 w-px bg-border sm:block" />
              <ActionButton onClick={copyReport} disabled={!trial.canUse}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copy report
              </ActionButton>
            </div>
            {!isPro && (
              <p className="mt-2 text-xs text-muted-foreground">
                {trial.left} of {TOOL_TRIAL_LIMIT} free runs left. Stepping through frames manually is always free.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-2 text-sm font-bold">Heap size across collections</p>
            <div className="flex h-24 items-end gap-2">
              {scen.history.map((h, i) => {
                const max = Math.max(...scen.history);
                return (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className={cn(
                        "w-full rounded-t-md transition-all",
                        i <= idx ? "bg-primary" : "bg-muted",
                      )}
                      style={{ height: `${(h / max) * 100}%`, minHeight: 8 }}
                    />
                    <span className="text-[10px] font-bold text-muted-foreground">{h}</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Objects on the heap after each collection. A healthy heap returns to baseline; a leaking one climbs.</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-bold">
              <Bug className="h-4 w-4 text-primary" /> Object inspector
            </p>
            {selNode ? (
              <div className="text-sm">
                <p className="font-bold">{selNode.label}</p>
                <p className="text-xs text-muted-foreground">
                  {selNode.root ? "GC root" : selNode.gen === "young" ? "Young generation" : "Old generation"}
                  {selNode.leak ? " - leaked (still reachable, never used)" : ""}
                  {selNode.mark === "dead" ? " - marked dead" : ""}
                  {selNode.gone ? " - collected" : ""}
                </p>
                {selOut.length > 0 && (
                  <p className="mt-2 text-xs"><span className="font-semibold">References:</span> {selOut.map((id) => byId.get(id)?.label ?? id).join(", ")}</p>
                )}
                {selIn.length > 0 && (
                  <p className="mt-1 text-xs"><span className="font-semibold">Referenced by:</span> {selIn.map((id) => byId.get(id)?.label ?? id).join(", ")}</p>
                )}
                {selIn.length === 0 && !selNode.root && !selNode.gone && (
                  <p className="mt-1 text-xs text-red-500">No incoming references: this object is garbage.</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Click any object on the heap to inspect its references.</p>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 text-xs text-muted-foreground">
            <p className="mb-1 font-bold text-foreground">Simplified model</p>
            <p>Real engines use generational collectors with write barriers, incremental and parallel marking, and concurrent sweeping. Object sizes, timings and heap layouts here are illustrative, but the core rule is exact: if a root can reach it, the collector keeps it.</p>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
