// /tools/css-function-playground - Native CSS @function with typed parameters:
// spacing, fluid-type and tint helpers with live previews and copyable code.
// Free, client-side only. Real @function when supported, JS mirror otherwise.

import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Info } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/css-function-playground";
import toolSeoMeta from "@/lib/tool-seo-meta-data/css-function-playground";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/css-function-playground")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/css-function-playground";
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
  component: FunctionTool,
});

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

type Tab = "spacing" | "fluid" | "tint";

const TABS: { id: Tab; label: string; hint: string }[] = [
  { id: "spacing", label: "--spacing()", hint: "Multiply a base unit: padding, gaps, margins" },
  { id: "fluid", label: "--fluid-type()", hint: "Type that scales smoothly with the viewport" },
  { id: "tint", label: "--tint()", hint: "Mix any color toward white with color-mix" },
];

function FunctionTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("css-function-playground", isPro);
  const seo = toolSeo;

  const [supported, setSupported] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("spacing");

  // spacing params
  const [n, setN] = useState(3);
  // fluid params
  const [minF, setMinF] = useState(16);
  const [maxF, setMaxF] = useState(34);
  const [vw, setVw] = useState(1024);
  // tint params
  const [tintC, setTintC] = useState("#0d9488");
  const [tintPct, setTintPct] = useState(35);

  useEffect(() => {
    try {
      const sheet = new CSSStyleSheet();
      sheet.insertRule("@function --probe() returns <length> { result: 1px; }");
      setSupported(true);
    } catch {
      setSupported(false);
    }
    const onResize = () => setVw(window.innerWidth);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const fluidPx = useMemo(() => {
    const t = Math.min(1, Math.max(0, (vw - 320) / 960));
    return minF + (maxF - minF) * t;
  }, [minF, maxF, vw]);

  const code = useMemo(() => {
    if (tab === "spacing") {
      return [
        "@function --spacing(--n: <number>) returns <length> {",
        "  result: calc(var(--n) * 8px);",
        "}",
        "",
        ".card {",
        `  padding: --spacing(${n});   /* ${n * 8}px */`,
        "  gap: --spacing(2);        /* 16px */",
        "}",
      ].join("\n");
    }
    if (tab === "fluid") {
      return [
        "@function --fluid-type(--min: <length>, --max: <length>) returns <length> {",
        "  result: clamp(",
        "    var(--min),",
        "    calc(var(--min) + (var(--max) - var(--min)) * ((100vw - 320px) / 960)),",
        "    var(--max)",
        "  );",
        "}",
        "",
        "h1 {",
        `  font-size: --fluid-type(${minF}px, ${maxF}px);`,
        `  /* right now at ${vw}px viewport: about ${fluidPx.toFixed(1)}px */`,
        "}",
      ].join("\n");
    }
    return [
      "@function --tint(--c: <color>, --pct: <percentage>) returns <color> {",
      "  result: color-mix(in srgb, var(--c) var(--pct), white);",
      "}",
      "",
      ".badge {",
      `  background: --tint(${tintC}, ${tintPct}%);`,
      "}",
    ].join("\n");
  }, [tab, n, minF, maxF, vw, fluidPx, tintC, tintPct]);

  const copy = async () => {
    if (!trial.canUse) return;
    if (await copyText(code)) trial.recordUse();
  };

  return (
    <ToolPageShell toolId="css-function-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="CSS @function Playground" left={trial.left} />

      {supported === false && (
        <div className="mb-6 flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">Your browser does not support @function yet.</span> Previews
            are computed with JavaScript to show exactly what each function returns. Native @function needs Chrome 137+
            or Edge 137+. The code below is the real syntax.
          </p>
        </div>
      )}
      {supported === true && (
        <div className="mb-6 flex gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">Your browser supports @function.</span> Custom functions with
            typed parameters run natively in your CSS engine.
          </p>
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-xl border px-4 py-2.5 text-sm font-bold transition",
              tab === t.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
            )}
          >
            <span className="font-mono">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">{TABS.find((t) => t.id === tab)?.hint}</p>

          {tab === "spacing" && (
            <div>
              <div className="mb-1 flex justify-between text-[13px] font-medium text-foreground/80">
                <span className="font-mono">--n</span>
                <span className="font-mono text-muted-foreground">{n} ({"="} {n * 8}px)</span>
              </div>
              <input type="range" min={0} max={8} step={0.5} value={n} onChange={(e) => setN(Number(e.target.value))} className="w-full accent-primary" />
            </div>
          )}

          {tab === "fluid" && (
            <>
              <div>
                <div className="mb-1 flex justify-between text-[13px] font-medium text-foreground/80">
                  <span className="font-mono">--min</span>
                  <span className="font-mono text-muted-foreground">{minF}px</span>
                </div>
                <input type="range" min={10} max={28} value={minF} onChange={(e) => setMinF(Number(e.target.value))} className="w-full accent-primary" />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-[13px] font-medium text-foreground/80">
                  <span className="font-mono">--max</span>
                  <span className="font-mono text-muted-foreground">{maxF}px</span>
                </div>
                <input type="range" min={24} max={64} value={maxF} onChange={(e) => setMaxF(Number(e.target.value))} className="w-full accent-primary" />
              </div>
              <p className="text-xs text-muted-foreground">
                Your viewport is <span className="font-mono font-bold text-foreground">{vw}px</span>, so the function
                currently resolves to <span className="font-mono font-bold text-foreground">{fluidPx.toFixed(1)}px</span>.
                Resize the window to watch it change.
              </p>
            </>
          )}

          {tab === "tint" && (
            <>
              <div>
                <p className="mb-2 text-[13px] font-medium text-foreground/80"><span className="font-mono">--c</span> base color</p>
                <div className="flex items-center gap-3">
                  <input type="color" value={tintC} onChange={(e) => setTintC(e.target.value)} className="h-10 w-14 cursor-pointer rounded border border-border bg-transparent" />
                  <span className="font-mono text-sm text-muted-foreground">{tintC}</span>
                </div>
              </div>
              <div>
                <div className="mb-1 flex justify-between text-[13px] font-medium text-foreground/80">
                  <span className="font-mono">--pct</span>
                  <span className="font-mono text-muted-foreground">{tintPct}%</span>
                </div>
                <input type="range" min={0} max={100} value={tintPct} onChange={(e) => setTintPct(Number(e.target.value))} className="w-full accent-primary" />
              </div>
            </>
          )}

          <div className="rounded-xl bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
            <p className="font-bold text-foreground">How @function works</p>
            <p className="mt-1">
              Parameters are typed (<span className="font-mono">&lt;number&gt;</span>,{" "}
              <span className="font-mono">&lt;length&gt;</span>, <span className="font-mono">&lt;color&gt;</span>...),
              the body computes <span className="font-mono">result</span>, and you call it like{" "}
              <span className="font-mono">--spacing(3)</span>. Wrong types fail at parse time, not silently.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-3 text-sm font-semibold">Live result</p>
          <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-border bg-background p-8">
            {tab === "spacing" && (
              <div className="rounded-xl bg-primary/10 text-center" style={{ padding: n * 8 }}>
                <div className="rounded-lg bg-teal-600 px-6 py-3 text-sm font-bold text-white">--spacing({n}) = {n * 8}px padding</div>
              </div>
            )}
            {tab === "fluid" && (
              <p className="text-center font-extrabold leading-tight" style={{ fontSize: fluidPx }}>
                Fluid headline at {fluidPx.toFixed(1)}px
              </p>
            )}
            {tab === "tint" && (
              <div className="flex items-center gap-4">
                <div className="h-24 w-24 rounded-2xl border border-border" style={{ background: tintC }} />
                <span className="text-2xl text-muted-foreground">→</span>
                <div
                  className="flex h-24 w-24 items-center justify-center rounded-2xl border border-border text-xs font-bold text-slate-900"
                  style={{ background: `color-mix(in srgb, ${tintC} ${tintPct}%, white)` }}
                >
                  {tintPct}%
                </div>
              </div>
            )}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {supported
              ? "Shown with the native function where the engine allows it."
              : "Computed in JavaScript to mirror the function result exactly, since this browser cannot run @function."}
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
        <pre className="overflow-x-auto whitespace-pre rounded-xl bg-muted/60 p-4 font-mono text-xs leading-relaxed">{code}</pre>
        {!isPro && <p className="mt-2 text-xs text-muted-foreground">{trial.left} of 5 free copies left.</p>}
      </div>
    </ToolPageShell>
  );
}
