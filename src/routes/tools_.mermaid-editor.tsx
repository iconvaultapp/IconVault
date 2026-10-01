// /tools/mermaid-editor - Write Mermaid diagram code with a live SVG
// preview, theme picker and SVG/PNG downloads. 100% in-browser; the
// mermaid library is loaded on demand, nothing is uploaded.

import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Copy, Check, Download, Eraser } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/mermaid-editor")({
  head: () => {
    const seo = getToolSeoMeta("mermaid-editor");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: MermaidEditorTool,
});

const SAMPLES: Record<string, string> = {
  Flowchart: `flowchart TD
    A[Start] --> B{Ready?}
    B -->|Yes| C[Ship it]
    B -->|No| D[Rework]
    C --> E[Done]
    D --> B`,
  Sequence: `sequenceDiagram
    participant U as User
    participant A as API
    U->>A: POST /login
    A-->>U: 200 + token
    U->>A: GET /profile`,
  Class: `classDiagram
    class User {
        +String name
        +login()
    }
    class Order {
        +Int total
    }
    User --> Order : places`,
  State: `stateDiagram-v2
    [*] --> Idle
    Idle --> Working : start
    Working --> Idle : stop
    Working --> [*] : done`,
  Gantt: `gantt
    title Launch plan
    dateFormat YYYY-MM-DD
    section Build
    Design :a1, 2026-10-01, 5d
    Code   :a2, after a1, 8d
    section Ship
    QA     :a3, after a2, 3d`,
  Pie: `pie title Traffic sources
    "Search" : 45
    "Social" : 30
    "Direct" : 25`,
  Mindmap: `mindmap
  root((IconVault))
    Tools
      Editors
      Converters
    Library
      421k icons
      239 sets`,
  Timeline: `timeline
    title 2026 roadmap
    Q1 : Research
    Q2 : Build
    Q3 : Launch`,
};

type ThemeId = "default" | "dark" | "forest" | "neutral";

const THEMES: { id: ThemeId; label: string }[] = [
  { id: "default", label: "Default" },
  { id: "dark", label: "Dark" },
  { id: "forest", label: "Forest" },
  { id: "neutral", label: "Neutral" },
];

const selectCls =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm font-bold focus:border-primary focus:outline-none";

function MermaidEditorTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("mermaid-editor", isPro);
  const seo = getToolSeo("mermaid-editor");

  const [code, setCode] = useState<string>(SAMPLES["Flowchart"] ?? "");
  const [theme, setTheme] = useState<ThemeId>("default");
  const [svg, setSvg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const renderId = useRef(0);

  // Live preview, debounced. mermaid is loaded on demand so it never
  // lands in the main bundle (it is several MB).
  useEffect(() => {
    if (!code.trim()) {
      setSvg("");
      setError(null);
      setBusy(false);
      return;
    }
    setBusy(true);
    const t = setTimeout(async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({ startOnLoad: false, theme });
        const id = `mermaid-svg-${++renderId.current}`;
        const { svg: rendered } = await mermaid.render(id, code);
        setSvg(rendered);
        setError(null);
      } catch (e) {
        setSvg("");
        setError(e instanceof Error ? e.message : "Could not render this diagram.");
      } finally {
        setBusy(false);
      }
    }, 600);
    return () => clearTimeout(t);
  }, [code, theme]);

  const downloadSvg = () => {
    if (!svg || !trial.canUse) return;
    downloadBlob(new Blob([svg], { type: "image/svg+xml" }), "diagram.svg");
    trial.recordUse();
    toast.success("SVG downloaded");
  };

  const downloadPng = async () => {
    if (!svg || !trial.canUse) return;
    // Intrinsic size: prefer width/height attrs, else viewBox, else fallback.
    let w = 0;
    let h = 0;
    const svgTag = svg.match(/<svg[^>]*>/)?.[0] ?? "";
    const wAttr = svgTag.match(/\swidth="([\d.]+)"/)?.[1];
    const hAttr = svgTag.match(/\sheight="([\d.]+)"/)?.[1];
    if (wAttr && hAttr) {
      w = parseFloat(wAttr);
      h = parseFloat(hAttr);
    } else {
      const vb = svgTag.match(/viewBox="[\d.]+\s+[\d.]+\s+([\d.]+)\s+([\d.]+)"/);
      if (vb) {
        w = parseFloat(vb[1] ?? "");
        h = parseFloat(vb[2] ?? "");
      }
    }
    if (!w || !h) {
      w = 1200;
      h = 800;
    }
    const scale = 2;
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const im = new Image();
        im.onload = () => resolve(im);
        im.onerror = () => reject(new Error("Could not rasterize the diagram."));
        im.src = url;
      });
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
      if (!blob) throw new Error("PNG export failed.");
      downloadBlob(blob, "diagram.png");
      trial.recordUse();
      toast.success("PNG downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "PNG export failed.");
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const copySvg = async () => {
    if (!svg) return;
    try {
      await navigator.clipboard.writeText(svg);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  return (
    <ToolPageShell toolId="mermaid-editor" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Mermaid Editor" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) setCode(SAMPLES[e.target.value] ?? "");
                e.target.value = "";
              }}
              className={cn(selectCls, "cursor-pointer")}
              aria-label="Load a sample diagram"
            >
              <option value="">Load sample…</option>
              {Object.keys(SAMPLES).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as ThemeId)}
              className={cn(selectCls, "cursor-pointer")}
              aria-label="Diagram theme"
            >
              {THEMES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setCode("")}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-bold hover:border-primary/50"
            >
              <Eraser className="h-3.5 w-3.5" /> Clear
            </button>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Write Mermaid code here…"
            spellCheck={false}
            rows={20}
            className="w-full resize-y rounded-xl border border-border bg-background p-4 font-mono text-[13px] leading-relaxed outline-none focus:border-primary"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Live preview updates as you type. Diagram text is rendered locally, nothing is uploaded.
          </p>
        </div>

        <div className="flex flex-col rounded-2xl border border-border bg-card p-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold">Preview</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={copySvg}
                disabled={!svg}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy SVG"}
              </button>
            </div>
          </div>

          <div className="flex min-h-[420px] flex-1 items-center justify-center overflow-auto rounded-xl border border-border bg-background p-4">
            {busy && !svg ? (
              <p className="text-sm text-muted-foreground">Rendering…</p>
            ) : error ? (
              <div className="flex max-w-md items-start gap-3 text-left">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                <div>
                  <p className="font-bold text-red-600 dark:text-red-400">Diagram error</p>
                  <p className="mt-1 whitespace-pre-wrap font-mono text-sm text-red-600/90 dark:text-red-400/90">{error}</p>
                </div>
              </div>
            ) : svg ? (
              <div className="w-full [&>svg]:mx-auto [&>svg]:max-w-full [&>svg]:rounded-lg" dangerouslySetInnerHTML={{ __html: svg }} />
            ) : (
              <p className="text-sm text-muted-foreground">Type Mermaid code to see the diagram here.</p>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <ActionButton busy={false} disabled={!svg || !trial.canUse} onClick={downloadSvg}>
              <Download className="h-4 w-4" /> Download SVG
            </ActionButton>
            <ActionButton busy={false} disabled={!svg || !trial.canUse} onClick={downloadPng}>
              <Download className="h-4 w-4" /> Download PNG
            </ActionButton>
          </div>
          {!isPro && (
            <p className="mt-3 text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free downloads left. Live preview is unlimited.
            </p>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
