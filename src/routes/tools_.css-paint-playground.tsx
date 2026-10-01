// /tools/css-paint-playground - Houdini CSS Paint API lab: write and edit
// registerPaint() worklets, tweak custom properties, see a live paint() preview,
// and copy the worklet plus the CSS. 100% client-side; the Paint API itself is
// Chromium-only, so support is detected and reported honestly.

import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Download, Paintbrush, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/css-paint-playground")({
  head: () => {
    const seo = getToolSeoMeta("css-paint-playground");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: PaintPlaygroundTool,
});

type Preset = { id: string; label: string; code: string };

const PRESETS: Preset[] = [
  {
    id: "checker",
    label: "Checkerboard",
    code: `class Painter {
  static get inputProperties() {
    return ["--paint-color", "--paint-size"];
  }
  paint(ctx, geom, props) {
    const size = Math.max(4, parseInt(props.get("--paint-size").toString(), 10) || 24);
    const color = props.get("--paint-color").toString().trim() || "#0f766e";
    const cols = Math.ceil(geom.width / size);
    const rows = Math.ceil(geom.height / size);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if ((x + y) % 2 === 0) {
          ctx.fillStyle = color;
          ctx.fillRect(x * size, y * size, size, size);
        }
      }
    }
  }
}
registerPaint(PAINT_NAME, Painter);`,
  },
  {
    id: "stripes",
    label: "Diagonal stripes",
    code: `class Painter {
  static get inputProperties() {
    return ["--paint-color", "--paint-size"];
  }
  paint(ctx, geom, props) {
    const size = Math.max(4, parseInt(props.get("--paint-size").toString(), 10) || 24);
    const color = props.get("--paint-color").toString().trim() || "#0f766e";
    ctx.save();
    ctx.translate(geom.width / 2, geom.height / 2);
    ctx.rotate(Math.PI / 4);
    ctx.translate(-geom.width, -geom.height);
    ctx.fillStyle = color;
    const span = geom.width * 2 + geom.height * 2;
    for (let x = 0; x < span; x += size * 2) {
      ctx.fillRect(x, 0, size, span);
    }
    ctx.restore();
  }
}
registerPaint(PAINT_NAME, Painter);`,
  },
  {
    id: "dots",
    label: "Polka dots",
    code: `class Painter {
  static get inputProperties() {
    return ["--paint-color", "--paint-size"];
  }
  paint(ctx, geom, props) {
    const size = Math.max(8, parseInt(props.get("--paint-size").toString(), 10) || 32);
    const color = props.get("--paint-color").toString().trim() || "#0f766e";
    ctx.fillStyle = color;
    for (let y = size / 2; y < geom.height + size; y += size) {
      for (let x = size / 2; x < geom.width + size; x += size) {
        const ox = (Math.round(y / size) % 2 === 0) ? size / 2 : 0;
        ctx.beginPath();
        ctx.arc(x + ox, y, size * 0.22, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
registerPaint(PAINT_NAME, Painter);`,
  },
  {
    id: "confetti",
    label: "Confetti",
    code: `class Painter {
  static get inputProperties() {
    return ["--paint-color", "--paint-size"];
  }
  paint(ctx, geom, props) {
    const count = Math.max(8, parseInt(props.get("--paint-size").toString(), 10) * 6 || 120);
    const base = props.get("--paint-color").toString().trim() || "#0f766e";
    for (let i = 0; i < count; i++) {
      const x = Math.random() * geom.width;
      const y = Math.random() * geom.height;
      const w = 4 + Math.random() * 10;
      const h = 3 + Math.random() * 6;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.random() * Math.PI);
      ctx.fillStyle = i % 3 === 0 ? base : "hsl(" + Math.floor(Math.random() * 360) + " 70% 60%)";
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.restore();
    }
  }
}
registerPaint(PAINT_NAME, Painter);`,
  },
];

function supportBadge(): { ok: boolean; label: string } {
  if (typeof CSS === "undefined") return { ok: false, label: "unknown" };
  const ok = "paintWorklet" in CSS;
  return { ok, label: ok ? "Paint API supported" : "Paint API not supported" };
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

function PaintPlaygroundTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("css-paint-playground", isPro);
  const seo = getToolSeo("css-paint-playground");
  const support = useMemo(supportBadge, []);
  const counter = useRef(0);

  const [presetId, setPresetId] = useState("checker");
  const [code, setCode] = useState(PRESETS[0]!.code);
  const [paintName, setPaintName] = useState<string | null>(null);
  const [color, setColor] = useState("#0f766e");
  const [size, setSize] = useState(24);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickPreset = (p: Preset) => {
    setPresetId(p.id);
    setCode(p.code);
    setPaintName(null);
    setError(null);
  };

  const register = async () => {
    if (busy || !trial.canUse) return;
    setBusy(true);
    setError(null);
    try {
      const anyCss = CSS as unknown as { paintWorklet?: { addModule(u: string): Promise<void> } };
      if (!anyCss.paintWorklet) throw new Error("This browser has no CSS.paintWorklet (needs Chrome, Edge or Opera).");
      counter.current += 1;
      const name = `iv-paint-${counter.current}`;
      const finalCode = code.split("PAINT_NAME").join(`"${name}"`);
      const url = URL.createObjectURL(new Blob([finalCode], { type: "application/javascript" }));
      await anyCss.paintWorklet.addModule(url);
      setPaintName(name);
      trial.recordUse();
      toast.success("Worklet registered, preview updated");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not register the worklet. Check the console for syntax errors.");
    } finally {
      setBusy(false);
    }
  };

  const cssSnippet = paintName
    ? `.painted {\n  --paint-color: ${color};\n  --paint-size: ${size};\n  background-color: #e5e7eb; /* fallback for Firefox and Safari */\n  background-image: paint(${paintName});\n}`
    : `/* Press "Paint it" to register the worklet, then copy the CSS here. */`;

  const workletDownload = code.split("PAINT_NAME").join(`"my-paint"`);

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

  return (
    <ToolPageShell toolId="css-paint-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="CSS Paint API" left={trial.left} />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className={cn("rounded-full px-3 py-1 text-xs font-bold", support.ok ? "bg-green-500/15 text-green-700 dark:text-green-400" : "bg-amber-500/15 text-amber-700 dark:text-amber-400")}>
          {support.label}
        </span>
        <span className="text-xs text-muted-foreground">
          The CSS Paint API is Chromium-only. Firefox and Safari fall back to the background color, which is why the snippet includes one.
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Worklet preset</p>
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
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">--paint-color</label>
              <div className="flex items-center gap-2 rounded-xl border border-border px-3 py-2">
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-7 w-9 cursor-pointer bg-transparent" aria-label="Paint color" />
                <span className="font-mono text-xs">{color}</span>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">--paint-size: {size}px</label>
              <input type="range" min={8} max={64} value={size} onChange={(e) => setSize(Number(e.target.value))} className="w-full" aria-label="Paint size" />
            </div>
          </div>

          <ActionButton busy={busy} disabled={!trial.canUse} onClick={register}>
            <Paintbrush className="h-4 w-4" /> {busy ? "Registering…" : "Paint it (register worklet)"}
          </ActionButton>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => pickPreset(PRESETS.find((p) => p.id === presetId) ?? PRESETS[0]!)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:border-primary/40"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset code
            </button>
            <button
              type="button"
              onClick={() => { downloadBlob(new Blob([workletDownload], { type: "application/javascript" }), "paint-worklet.js"); toast.success("Worklet downloaded"); }}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:border-primary/40"
            >
              <Download className="h-3.5 w-3.5" /> Download .js
            </button>
          </div>
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of 5 free uses left. Edits and previews are unlimited, registering and copying count.
            </p>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 text-[13px] font-medium text-foreground/80">Live preview</p>
            <div
              className="flex h-56 items-center justify-center rounded-xl border border-border bg-[#e5e7eb] text-sm font-bold text-white/90"
              style={
                paintName
                  ? ({ backgroundImage: `paint(${paintName})`, "--paint-color": color, "--paint-size": String(size) } as React.CSSProperties)
                  : undefined
              }
            >
              {paintName ? "paint() is drawing this background" : 'Press "Paint it" to see your worklet draw this box'}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Worklet source (editable)</p>
            <textarea
              value={code}
              onChange={(e) => { setCode(e.target.value); setPaintName(null); }}
              spellCheck={false}
              rows={14}
              className="w-full rounded-xl border border-border bg-muted/40 p-4 font-mono text-xs leading-relaxed outline-none focus:border-primary/60"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Keep the <code className="font-mono">PAINT_NAME</code> placeholder, it is replaced with a unique paint name on register.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <CodeBlock title="CSS to use it" code={cssSnippet} onCopy={() => void copyText(cssSnippet, "CSS copied")} />
            <CodeBlock title="Worklet (registerPaint call)" code={workletDownload} onCopy={() => void copyText(workletDownload, "Worklet copied")} />
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
