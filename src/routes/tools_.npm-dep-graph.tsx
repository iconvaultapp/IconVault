// /tools/npm-dep-graph - Visualize npm dependency trees as a force-directed
// SVG graph with SVG export. Data comes live from registry.npmjs.org.

import { useCallback, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, Network, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/npm-dep-graph")({
  head: () => {
    const seo = getToolSeoMeta("npm-dep-graph");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: NpmDepGraphTool,
});

interface GNode {
  id: string;
  x: number;
  y: number;
  depth: number;
  version: string;
}

interface GEdge {
  from: string;
  to: string;
}

const MAX_NODES = 160;
const DEPTH_COLORS = ["#0d9488", "#3b82f6", "#a855f7", "#f59e0b"];

async function fetchPackument(name: string): Promise<unknown> {
  const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}`);
  if (res.status === 404) throw new Error(`Package "${name}" not found on npm.`);
  if (!res.ok) throw new Error(`registry.npmjs.org returned HTTP ${res.status}.`);
  return res.json();
}

interface PackInfo {
  version: string;
  deps: string[];
}

function pickVersion(doc: unknown, wanted?: string): PackInfo {
  const d = doc as {
    versions?: Record<string, { dependencies?: Record<string, string> }>;
    "dist-tags"?: Record<string, string>;
    error?: string;
  };
  if (d.error || !d.versions) throw new Error("Invalid registry response.");
  const versions = Object.keys(d.versions);
  let version = wanted;
  if (!version || !d.versions[version]) {
    version = d["dist-tags"]?.["latest"] ?? versions[versions.length - 1]!;
  }
  const v = d.versions[version];
  if (!v) throw new Error("No publishable version found.");
  return { version, deps: Object.keys(v.dependencies ?? {}) };
}

async function buildGraph(root: string, maxDepth: number): Promise<{ nodes: GNode[]; edges: GEdge[] }> {
  const nodes = new Map<string, GNode>();
  const edges: GEdge[] = [];
  const queue: { name: string; depth: number }[] = [{ name: root, depth: 0 }];

  while (queue.length > 0 && nodes.size < MAX_NODES) {
    const { name, depth } = queue.shift()!;
    if (nodes.has(name)) continue;
    let info: PackInfo;
    try {
      info = pickVersion(await fetchPackument(name));
    } catch {
      continue;
    }
    const angle = (nodes.size / Math.max(1, MAX_NODES)) * Math.PI * 2;
    nodes.set(name, {
      id: name,
      x: 400 + Math.cos(angle) * (120 + depth * 110),
      y: 300 + Math.sin(angle) * (120 + depth * 110),
      depth,
      version: info.version,
    });
    if (depth < maxDepth) {
      for (const dep of info.deps) {
        if (!nodes.has(dep) && nodes.size + queue.length < MAX_NODES) {
          queue.push({ name: dep, depth: depth + 1 });
        }
        edges.push({ from: name, to: dep });
      }
    }
  }
  return { nodes: [...nodes.values()], edges: edges.filter((e) => nodes.has(e.from) && nodes.has(e.to)) };
}

function layout(nodes: GNode[], edges: GEdge[], ticks = 260) {
  const W = 800;
  const H = 600;
  for (let t = 0; t < ticks; t++) {
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i]!;
      let fx = 0;
      let fy = 0;
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        const b = nodes[j]!;
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 1) d2 = 1;
        const f = Math.min(4000 / d2, 40);
        const d = Math.sqrt(d2);
        fx += (dx / d) * f;
        fy += (dy / d) * f;
      }
      for (const e of edges) {
        let other: GNode | undefined;
        if (e.from === a.id) other = nodes.find((n) => n.id === e.to);
        else if (e.to === a.id) other = nodes.find((n) => n.id === e.from);
        if (!other) continue;
        const dx = other.x - a.x;
        const dy = other.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const target = 110;
        const f = (d - target) * 0.02;
        fx += (dx / d) * f * 10;
        fy += (dy / d) * f * 10;
      }
      // gravity to center
      fx += (W / 2 - a.x) * 0.008;
      fy += (H / 2 - a.y) * 0.008;
      a.x = Math.min(W - 30, Math.max(30, a.x + fx));
      a.y = Math.min(H - 30, Math.max(30, a.y + fy));
    }
  }
}

function NpmDepGraphTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("npm-dep-graph", isPro);
  const seo = getToolSeo("npm-dep-graph");

  const [input, setInput] = useState("react");
  const [depth, setDepth] = useState(2);
  const [nodes, setNodes] = useState<GNode[]>([]);
  const [edges, setEdges] = useState<GEdge[]>([]);
  const [rootName, setRootName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const run = useCallback(async () => {
    const name = input.trim().toLowerCase();
    if (!name || busy || !trial.canUse) return;
    setBusy(true);
    setError(null);
    try {
      const g = await buildGraph(name, depth);
      if (g.nodes.length === 0) throw new Error("No dependency data found.");
      layout(g.nodes, g.edges);
      setNodes(g.nodes);
      setEdges(g.edges);
      setRootName(name);
      trial.recordUse();
      toast.success(`Graph built: ${g.nodes.length} packages`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Graph build failed. The npm registry may be unreachable.");
    } finally {
      setBusy(false);
    }
  }, [input, depth, busy, trial]);

  const exportSvg = useCallback(() => {
    if (!svgRef.current) return;
    const clone = svgRef.current.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bg.setAttribute("width", "800");
    bg.setAttribute("height", "600");
    bg.setAttribute("fill", "#ffffff");
    clone.insertBefore(bg, clone.firstChild);
    downloadBlob(new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml" }), `${rootName || "deps"}-graph.svg`);
    toast.success("SVG exported");
  }, [rootName]);

  return (
    <ToolPageShell toolId="npm-dep-graph" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="NPM Dep Graph" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Package name</p>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void run();
              }}
              spellCheck={false}
              placeholder="react"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary/60"
            />
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">
              Crawl depth: <span className="font-bold">{depth}</span>
            </p>
            <div className="flex gap-2">
              {[1, 2, 3].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDepth(d)}
                  className={cn(
                    "flex-1 rounded-xl border px-3 py-2 text-sm font-bold transition",
                    depth === d
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Depth 2 covers most trees. Capped at {MAX_NODES} packages to stay fast.
            </p>
          </div>

          <ActionButton busy={busy} disabled={!input.trim() || !trial.canUse} onClick={run}>
            <Network className="h-4 w-4" /> {busy ? "Crawling..." : "Build graph"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free graphs left. Live data from registry.npmjs.org.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}

          {nodes.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[13px] font-medium text-foreground/80">Legend</p>
              {DEPTH_COLORS.slice(0, depth + 1).map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="h-3 w-3 rounded-full" style={{ background: c }} />
                  {i === 0 ? "Root package" : `Depth ${i} dependencies`}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {nodes.length === 0 ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
              <Search className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your dependency graph appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Enter an npm package and build a force-directed graph of its dependency tree.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm">
                  <span className="font-mono font-bold">{rootName}</span>
                  <span className="text-muted-foreground">
                    {" "}- {nodes.length} packages, {edges.length} links
                  </span>
                </p>
                <button
                  type="button"
                  onClick={exportSvg}
                  className="flex items-center gap-1.5 rounded-xl border border-border px-3.5 py-2 text-sm font-semibold transition hover:border-primary/40"
                >
                  <Download className="h-4 w-4" /> Export SVG
                </button>
              </div>
              <div className="overflow-x-auto rounded-xl border border-border bg-background">
                <svg ref={svgRef} viewBox="0 0 800 600" className="min-w-[600px] w-full">
                  {edges.map((e, i) => {
                    const a = nodes.find((n) => n.id === e.from);
                    const b = nodes.find((n) => n.id === e.to);
                    if (!a || !b) return null;
                    return (
                      <line
                        key={i}
                        x1={a.x}
                        y1={a.y}
                        x2={b.x}
                        y2={b.y}
                        stroke="currentColor"
                        strokeOpacity={0.25}
                        strokeWidth={1}
                        className="text-muted-foreground"
                      />
                    );
                  })}
                  {nodes.map((n) => {
                    const r = n.depth === 0 ? 14 : Math.max(6, 10 - n.depth * 2);
                    const color = DEPTH_COLORS[Math.min(n.depth, DEPTH_COLORS.length - 1)]!;
                    const label = n.id.length > 18 ? n.id.slice(0, 17) + "..." : n.id;
                    return (
                      <g key={n.id}>
                        <circle cx={n.x} cy={n.y} r={r} fill={color} fillOpacity={n.depth === 0 ? 1 : 0.85}>
                          <title>{`${n.id}@${n.version}`}</title>
                        </circle>
                        <text
                          x={n.x}
                          y={n.y + r + 13}
                          textAnchor="middle"
                          fontSize={n.depth === 0 ? 12 : 10}
                          fontWeight={n.depth === 0 ? 700 : 400}
                          className="fill-foreground"
                        >
                          {label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Hover a node to see its exact version. Only direct dependencies are shown, not
                peer or dev dependencies.
              </p>
            </>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
