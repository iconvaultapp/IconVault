// /tools/field-sizing-playground - CSS field-sizing lab: auto-resize inputs,
// textareas and selects to fit their content with zero JavaScript. Live
// measurements prove the growth. 100% client-side.

import { useLayoutEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Type } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/field-sizing-playground")({
  head: () => {
    const seo = getToolSeoMeta("field-sizing-playground");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: FieldSizingPlayground,
});

const SUPPORTED = typeof CSS !== "undefined" && CSS.supports("field-sizing", "content");

function FieldSizingPlayground() {
  const { isPro } = usePlan();
  const trial = useToolTrial("field-sizing-playground", isPro);
  const seo = getToolSeo("field-sizing-playground");

  const [inputText, setInputText] = useState("Type here and watch me grow");
  const [areaText, setAreaText] = useState("Textareas grow vertically.\nAdd more lines to see it.\nNo JavaScript involved.");
  const [selectVal, setSelectVal] = useState("Medium option");
  const [minW, setMinW] = useState(120);
  const [maxW, setMaxW] = useState(560);
  const [enabled, setEnabled] = useState(true);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const fixedRef = useRef<HTMLInputElement | null>(null);
  const areaRef = useRef<HTMLTextAreaElement | null>(null);
  const [measures, setMeasures] = useState({ auto: 0, fixed: 0, areaH: 0 });

  useLayoutEffect(() => {
    const measure = () => {
      setMeasures({
        auto: Math.round(inputRef.current?.offsetWidth ?? 0),
        fixed: Math.round(fixedRef.current?.offsetWidth ?? 0),
        areaH: Math.round(areaRef.current?.offsetHeight ?? 0),
      });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [inputText, areaText, minW, maxW, enabled]);

  const fieldStyle = (on: boolean): React.CSSProperties =>
    on
      ? { fieldSizing: "content", minWidth: minW, maxWidth: maxW } as React.CSSProperties
      : { width: 280 };

  const css = `/* auto-growing form controls, no JavaScript */\ninput, textarea, select {\n  field-sizing: content; /* input/select grow inline, textarea grows block */\n  min-width: ${minW}px;\n  max-width: ${maxW}px;\n}\n\n/* cap a textarea vertically instead */\ntextarea.tall {\n  field-sizing: content;\n  max-height: 240px;\n}`;

  const copyCss = async () => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(css);
      trial.recordUse();
      toast.success("field-sizing CSS copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  const demoCard = (title: string, live: React.ReactNode, note: string) => (
    <div className="rounded-xl border border-border bg-muted/30 p-4">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</p>
      {live}
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{note}</p>
    </div>
  );

  return (
    <ToolPageShell toolId="field-sizing-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="CSS field-sizing" left={trial.left} />

      {!SUPPORTED && (
        <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <span className="font-bold">Heads up:</span> this browser does not support{" "}
          <code className="font-mono">field-sizing</code> yet (it works in Chrome and Edge 123+).
          The code below is still valid; try it in a Chromium browser to see the live growth.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-border px-3 py-2.5 text-sm font-semibold">
            field-sizing: content
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-4 w-4 accent-primary" />
          </label>

          <div>
            <div className="mb-1 flex justify-between text-[13px] font-medium text-foreground/80">
              <span>min-width</span><span className="tabular-nums">{minW}px</span>
            </div>
            <input type="range" min={60} max={300} step={10} value={minW} onChange={(e) => setMinW(parseInt(e.target.value))} className="w-full accent-primary" aria-label="Minimum width" />
          </div>
          <div>
            <div className="mb-1 flex justify-between text-[13px] font-medium text-foreground/80">
              <span>max-width</span><span className="tabular-nums">{maxW}px</span>
            </div>
            <input type="range" min={200} max={700} step={10} value={maxW} onChange={(e) => setMaxW(parseInt(e.target.value))} className="w-full accent-primary" aria-label="Maximum width" />
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              ["Auto input", `${measures.auto}px`],
              ["Fixed input", `${measures.fixed}px`],
              ["Auto textarea", `${measures.areaH}px tall`],
            ].map(([l, v]) => (
              <div key={l} className="rounded-lg border border-border px-2 py-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{l}</p>
                <p className="text-sm font-bold tabular-nums">{v}</p>
              </div>
            ))}
          </div>

          <ActionButton disabled={!trial.canUse} onClick={copyCss}>
            <Type className="h-4 w-4" /> Copy field-sizing CSS
          </ActionButton>
          {!isPro && <p className="text-xs text-muted-foreground">{trial.left} of 5 free copies left.</p>}

          <div className="rounded-xl bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
            <p className="mb-1 font-semibold text-foreground">Why it matters</p>
            <p>
              Auto-growing inputs used to need a hidden mirror element and JavaScript measuring on every keystroke.
              One declaration replaces all of that, and it respects min/max sizes like any other box.
            </p>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div className="grid gap-4 md:grid-cols-2">
            {demoCard(
              "input: field-sizing vs fixed",
              <div className="space-y-3">
                <input
                  ref={inputRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  style={enabled ? (fieldStyle(true) as React.CSSProperties) : { width: 280 }}
                  className={cn("rounded-lg border border-primary/50 bg-background px-3 py-2 text-sm outline-none", !enabled && "border-border")}
                  aria-label="Auto-growing input"
                />
                <input
                  ref={fixedRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  style={{ width: 280 }}
                  className="block rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  aria-label="Fixed width input"
                />
                <p className="text-[11px] text-muted-foreground">Top: {enabled ? "grows with content" : "field-sizing off (fixed 280px)"}. Bottom: always fixed 280px.</p>
              </div>,
              "The top input shares the same text as the fixed one. Watch the live width readout while you type.",
            )}

            {demoCard(
              "textarea: grows vertically",
              <textarea
                ref={areaRef}
                value={areaText}
                onChange={(e) => setAreaText(e.target.value)}
                rows={2}
                style={enabled ? ({ fieldSizing: "content", minHeight: 64, maxHeight: 220 } as React.CSSProperties) : undefined}
                className="w-full rounded-lg border border-primary/50 bg-background px-3 py-2 text-sm outline-none"
                aria-label="Auto-growing textarea"
              />,
              "Textareas grow in the block axis. max-height keeps long content scrollable instead of endless.",
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {demoCard(
              "select: fits the longest option",
              <select
                value={selectVal}
                onChange={(e) => setSelectVal(e.target.value)}
                style={enabled ? ({ fieldSizing: "content" } as React.CSSProperties) : undefined}
                className="rounded-lg border border-primary/50 bg-background px-3 py-2 text-sm"
                aria-label="Auto-sizing select"
              >
                {["Tiny", "Medium option", "A much longer option label here"].map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>,
              "The select shrinks to fit the chosen option instead of stretching to the longest one.",
            )}

            {demoCard(
              "number input stays sane",
              <input
                type="number"
                defaultValue={42}
                style={enabled ? ({ fieldSizing: "content", minWidth: 80 } as React.CSSProperties) : undefined}
                className="rounded-lg border border-primary/50 bg-background px-3 py-2 text-sm"
                aria-label="Auto-sizing number input"
              />,
              "field-sizing also works on number, date and other input types. min-width keeps the spinner usable.",
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-muted/40">
            <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
              <span className="text-xs font-semibold text-muted-foreground">field-sizing.css</span>
              <button type="button" onClick={copyCss} className="flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] font-semibold hover:border-primary/50">
                <Copy className="h-3 w-3" /> Copy
              </button>
            </div>
            <pre className="overflow-x-auto p-3 text-xs leading-relaxed"><code>{css}</code></pre>
          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm leading-relaxed text-muted-foreground">
            <p className="mb-1 font-semibold text-foreground">Fallback for older browsers</p>
            <p>
              Where <code className="font-mono">field-sizing</code> is unsupported it is simply ignored, so pair it
              with a sensible <code className="font-mono">width</code> fallback:{" "}
              <code className="font-mono">input {"{ width: 280px; field-sizing: content; }"}</code>.
              Browsers that understand the property override the width; the rest keep the fixed size.
            </p>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
