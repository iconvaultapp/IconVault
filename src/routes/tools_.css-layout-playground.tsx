// /tools/css-layout-playground - Houdini CSS Layout API lab: write registerLayout()
// worklets (masonry, circular), tweak the layout inputs, and watch a live
// display: layout() container reflow. 100% client-side. The Layout API is still
// experimental, so support is detected and the limitation is stated plainly.

import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Download, LayoutDashboard, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/css-layout-playground";
import toolSeoMeta from "@/lib/tool-seo-meta-data/css-layout-playground";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/css-layout-playground")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/css-layout-playground";
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
  component: LayoutPlaygroundTool,
});

type Preset = { id: string; label: string; blurb: string; code: string; props: string[] };

const PRESETS: Preset[] = [
  {
    id: "masonry",
    label: "Masonry",
    blurb: "Fills the shortest column first, like a Pinterest wall.",
    props: ["--columns"],
    code: `class Masonry {
  static get inputProperties() { return ["--columns"]; }
  async intrinsicSizes() {}
  async layout(children, edges, constraints, styleMap) {
    const columns = Math.max(1, parseInt(styleMap.get("--columns").toString(), 10) || 3);
    const width = constraints.fixedInlineSize;
    const colWidth = (width - edges.inline) / columns;
    const heights = new Array(columns).fill(0);
    const childFragments = [];
    for (const child of children) {
      const frag = await child.layoutNextFragment({ fixedInlineSize: colWidth });
      let col = 0;
      for (let i = 1; i < columns; i++) {
        if (heights[i] < heights[col]) col = i;
      }
      frag.inlineOffset = edges.inlineStart + col * colWidth;
      frag.blockOffset = edges.blockStart + heights[col];
      heights[col] += frag.blockSize;
      childFragments.push(frag);
    }
    return { autoBlockSize: Math.max.apply(null, heights), childFragments };
  }
}
registerLayout(LAYOUT_NAME, Masonry);`,
  },
  {
    id: "circular",
    label: "Circular",
    blurb: "Places every child on a circle around the container center.",
    props: ["--radius"],
    code: `class Circular {
  static get inputProperties() { return ["--radius"]; }
  async intrinsicSizes() {}
  async layout(children, edges, constraints, styleMap) {
    const width = constraints.fixedInlineSize;
    const height = constraints.fixedBlockSize || width;
    const cx = width / 2, cy = height / 2;
    const pct = Math.min(95, Math.max(10, parseFloat(styleMap.get("--radius").toString()) || 40));
    const radius = Math.min(cx, cy) * (pct / 50);
    const n = children.length;
    const childFragments = [];
    for (let i = 0; i < n; i++) {
      const frag = await children[i].layoutNextFragment({});
      const a = (Math.PI * 2 * i) / n - Math.PI / 2;
      frag.inlineOffset = edges.inlineStart + cx + radius * Math.cos(a) - frag.inlineSize / 2;
      frag.blockOffset = edges.blockStart + cy + radius * Math.sin(a) - frag.blockSize / 2;
      childFragments.push(frag);
    }
    return { autoBlockSize: height, childFragments };
  }
}
registerLayout(LAYOUT_NAME, Circular);`,
  },
];

function supportBadge(): { ok: boolean; label: string } {
  if (typeof CSS === "undefined") return { ok: false, label: "unknown" };
  const ok = "layoutWorklet" in CSS;
  return { ok, label: ok ? "Layout API worklet object present" : "Layout API not available" };
}

function CodeBlock({ title, code, onCopy }: { title: string; code: string; onCopy: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</span>
        <button
          type="button"
          onClick={() => {
            onCopy();
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold hover:border-primary/50 hover:text-primary"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="max-h-72 overflow-auto p-4 text-xs leading-relaxed text-foreground/90">{code}</pre>
    </div>
  );
}

const BOX_COLORS = ["#0f766e", "#0e7490", "#b45309", "#be123c", "#4d7c0f", "#6d28d9", "#0369a1", "#a21caf", "#15803d", "#c2410c", "#1d4ed8", "#9d174d"];

function LayoutPlaygroundTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("css-layout-playground", isPro);
  const seo = toolSeo;
  const support = useMemo(supportBadge, []);
  const counter = useRef(0);

  const [presetId, setPresetId] = useState("masonry");
  const preset = PRESETS.find((p) => p.id === presetId)!;
  const [code, setCode] = useState(PRESETS[0]!.code);
  const [layoutName, setLayoutName] = useState<string | null>(null);
  const [childCount, setChildCount] = useState(9);
  const [columns, setColumns] = useState(3);
  const [radius, setRadius] = useState(40);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickPreset = (p: Preset) => {
    setPresetId(p.id);
    setCode(p.code);
    setLayoutName(null);
    setError(null);
  };

  const heights = useMemo(
    () => Array.from({ length: 12 }, (_, i) => 52 + ((i * 37 + 13) % 5) * 26),
    [],
  );

  const register = async () => {
    if (busy || !trial.canUse) return;
    setBusy(true);
    setError(null);
    try {
      const anyCss = CSS as unknown as { layoutWorklet?: { addModule(u: string): Promise<void> } };
      if (!anyCss.layoutWorklet) {
        throw new Error("This browser has no CSS.layoutWorklet. The Layout API needs Chrome with the Experimental Web Platform Features flag.");
      }
      counter.current += 1;
      const name = `iv-layout-${counter.current}`;
      const finalCode = code.split("LAYOUT_NAME").join(`"${name}"`);
      const url = URL.createObjectURL(new Blob([finalCode], { type: "application/javascript" }));
      await anyCss.layoutWorklet.addModule(url);
      setLayoutName(name);
      trial.recordUse();
      toast.success("Layout registered, container reflowed");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not register the layout. Check the console for syntax errors.");
    } finally {
      setBusy(false);
    }
  };

  const copyText = async (text: string, okMsg: string) => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(text);
      trial.recordUse();
      toast.success(okMsg);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  const cssSnippet = layoutName
    ? `.wall {\n  display: layout(${layoutName});\n${presetId === "masonry" ? `  --columns: ${columns};` : `  --radius: ${radius};`}\n  width: 100%;\n}`
    : `/* Press "Run layout" to register the worklet, then copy the CSS here. */`;

  const stageStyle = layoutName
    ? ({ display: `layout(${layoutName})`, "--columns": String(columns), "--radius": String(radius) } as React.CSSProperties)
    : { display: "flex", flexWrap: "wrap", gap: 8 } as React.CSSProperties;

  return (
    <ToolPageShell toolId="css-layout-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="CSS Layout API" left={trial.left} />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className={cn("rounded-full px-3 py-1 text-xs font-bold", support.ok ? "bg-green-500/15 text-green-700 dark:text-green-400" : "bg-amber-500/15 text-amber-700 dark:text-amber-400")}>
          {support.label}
        </span>
        <span className="text-xs text-muted-foreground">
          Honest note: the Layout API is still experimental. In Chrome, enable <code className="font-mono">chrome://flags</code> → Experimental Web Platform Features, then register below. The worklet code and CSS are still useful for learning.
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Layout preset</p>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => pickPreset(p)}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-sm font-semibold transition",
                    presetId === p.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">{preset.blurb}</p>
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Children: {childCount}</label>
            <input type="range" min={4} max={12} value={childCount} onChange={(e) => setChildCount(Number(e.target.value))} className="w-full" aria-label="Child count" />
          </div>
          {presetId === "masonry" ? (
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">--columns: {columns}</label>
              <input type="range" min={2} max={5} value={columns} onChange={(e) => setColumns(Number(e.target.value))} className="w-full" aria-label="Columns" />
            </div>
          ) : (
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">--radius: {radius}%</label>
              <input type="range" min={10} max={95} value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="w-full" aria-label="Radius" />
            </div>
          )}

          <ActionButton busy={busy} disabled={!trial.canUse} onClick={register}>
            <LayoutDashboard className="h-4 w-4" /> {busy ? "Registering…" : "Run layout (register worklet)"}
          </ActionButton>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => pickPreset(preset)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:border-primary/40"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset code
            </button>
            <button
              type="button"
              onClick={() => { downloadBlob(new Blob([code.split("LAYOUT_NAME").join('"my-layout"')], { type: "application/javascript" }), "layout-worklet.js"); toast.success("Worklet downloaded"); }}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:border-primary/40"
            >
              <Download className="h-3.5 w-3.5" /> Download .js
            </button>
          </div>
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
          {!isPro && <p className="text-xs text-muted-foreground">{trial.left} of 5 free uses left. Editing and sliders are unlimited.</p>}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 text-[13px] font-medium text-foreground/80">Live layout container</p>
            <div className="min-h-[320px] rounded-xl border border-dashed border-border bg-muted/30 p-3" style={stageStyle}>
              {Array.from({ length: childCount }, (_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-center rounded-lg text-sm font-bold text-white"
                  style={{
                    background: BOX_COLORS[i % BOX_COLORS.length],
                    width: presetId === "circular" ? 56 : undefined,
                    height: presetId === "circular" ? 56 : heights[i],
                    borderRadius: presetId === "circular" ? 9999 : undefined,
                    margin: presetId === "masonry" ? undefined : 0,
                  }}
                >
                  {i + 1}
                </div>
              ))}
            </div>
            {!layoutName && (
              <p className="mt-2 text-xs text-muted-foreground">
                Showing plain flexbox until you register. The worklet takes over positioning once registered.
              </p>
            )}
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Worklet source (editable)</p>
            <textarea
              value={code}
              onChange={(e) => { setCode(e.target.value); setLayoutName(null); }}
              spellCheck={false}
              rows={14}
              className="w-full rounded-xl border border-border bg-muted/40 p-4 font-mono text-xs leading-relaxed outline-none focus:border-primary/60"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Keep the <code className="font-mono">LAYOUT_NAME</code> placeholder, it is replaced with a unique layout name on register.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <CodeBlock title="CSS to use it" code={cssSnippet} onCopy={() => void copyText(cssSnippet, "CSS copied")} />
            <CodeBlock title="Worklet (registerLayout call)" code={code.split("LAYOUT_NAME").join('"my-layout"')} onCopy={() => void copyText(code.split("LAYOUT_NAME").join('"my-layout"'), "Worklet copied")} />
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
