// /tools/container-style-queries - Live demo of @container style() queries:
// theme and feature flags driven by custom properties, queried in pure CSS.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Download, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/container-style-queries";
import toolSeoMeta from "@/lib/tool-seo-meta-data/container-style-queries";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/container-style-queries")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/container-style-queries";
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
  component: StyleQueries,
});

type Theme = "light" | "dark" | "accent";
type Density = "comfortable" | "compact";

const STYLE_CSS = `/* the container: any container-type works for style queries */
.card-scope {
  container-type: inline-size;
  --theme: light;
  --density: comfortable;
  --beta: off;
}

/* query custom property values, no JavaScript */
@container style(--theme: dark) {
  .card { background: #0f172a; color: #f1f5f9; }
}
@container style(--theme: accent) {
  .card { background: linear-gradient(135deg, #0d9488, #059669); color: #fff; }
}
@container style(--density: compact) {
  .card { padding: 0.75rem; font-size: 0.8rem; }
}
@container style(--beta: on) {
  .beta-badge { display: inline-flex; }
}`;

function StyleQueries() {
  const { isPro } = usePlan();
  const trial = useToolTrial("container-style-queries", isPro);
  const seo = toolSeo;

  const [theme, setTheme] = useState<Theme>("light");
  const [density, setDensity] = useState<Density>("comfortable");
  const [beta, setBeta] = useState(false);

  const supported = typeof CSS !== "undefined" && CSS.supports("container-type: inline-size");

  const copy = () => {
    if (!trial.canUse) return;
    void navigator.clipboard.writeText(STYLE_CSS);
    trial.recordUse();
    toast.success("Style-query CSS copied");
  };

  const download = () => {
    if (!trial.canUse) return;
    downloadBlob(new Blob([`/* Container Style Queries demo */\n${STYLE_CSS}\n`], { type: "text/css" }), "container-style-queries.css");
    trial.recordUse();
    toast.success("CSS file downloaded");
  };

  const seg = <T extends string>(label: string, options: { v: T; label: string }[], value: T, onChange: (v: T) => void) => (
    <div>
      <p className="mb-2 text-[13px] font-medium text-foreground/80">{label} <code className="font-mono text-xs text-muted-foreground">--{label.split(" ")[0]?.toLowerCase() ?? ""}</code></p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button key={o.v} type="button" onClick={() => onChange(o.v)}
            className={cn("rounded-xl border px-3 py-2 font-mono text-sm font-bold transition",
              value === o.v ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40")}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <ToolPageShell toolId="container-style-queries" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Container Style Queries" left={trial.left} />
      <style>{`
        .sq-scope { container-type: inline-size; }
        .sq-card { transition: all .25s ease; }
        @container style(--theme: dark) { .sq-card { background: #0f172a !important; color: #f1f5f9 !important; border-color: #334155 !important; } }
        @container style(--theme: dark) { .sq-card .sq-sub { color: #94a3b8 !important; } }
        @container style(--theme: accent) { .sq-card { background: linear-gradient(135deg, #0d9488, #059669) !important; color: #fff !important; border-color: transparent !important; } }
        @container style(--theme: accent) { .sq-card .sq-sub { color: #d1fae5 !important; } }
        @container style(--density: compact) { .sq-card { padding: 0.75rem !important; } .sq-card .sq-title { font-size: 0.95rem !important; } }
        @container style(--beta: on) { .sq-beta { display: inline-flex !important; } }
        .sq-beta { display: none; }
        .sq-cta { background: #0f172a; color: #fff; }
        @container style(--theme: dark) { .sq-cta { background: #0d9488 !important; color: #fff !important; } }
        @container style(--theme: accent) { .sq-cta { background: #fff !important; color: #059669 !important; } }
      `}</style>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          {seg<Theme>("Theme flag", [{ v: "light", label: "light" }, { v: "dark", label: "dark" }, { v: "accent", label: "accent" }], theme, setTheme)}
          {seg<Density>("Density flag", [{ v: "comfortable", label: "comfortable" }, { v: "compact", label: "compact" }], density, setDensity)}
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Feature flag <code className="font-mono text-xs text-muted-foreground">--beta</code></p>
            <button type="button" role="switch" aria-checked={beta} onClick={() => setBeta(!beta)}
              className="inline-flex items-center gap-2.5 rounded-xl border border-border px-3.5 py-2 text-sm font-semibold transition hover:border-primary/50">
              <span className={cn("relative h-5 w-9 rounded-full transition", beta ? "bg-primary" : "bg-muted")}>
                <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all", beta ? "left-[18px]" : "left-0.5")} />
              </span>
              {beta ? "on" : "off"}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton onClick={copy} disabled={!trial.canUse}><Copy className="h-4 w-4" /> Copy CSS</ActionButton>
            <button type="button" onClick={download} disabled={!trial.canUse} className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-bold transition hover:border-primary/50 disabled:opacity-50"><Download className="h-4 w-4" /> .css</button>
          </div>
          {!isPro && <p className="text-xs text-muted-foreground">{trial.left} of {TOOL_TRIAL_LIMIT} free copies left.</p>}
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <FlaskConical className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {supported
              ? "Style queries need Chrome/Edge 111+, Safari 18+ or Firefox 137+. The toggles set custom properties on the container; the card restyles itself with zero JavaScript."
              : "This browser does not report container-type support, so the live demo may not react. The CSS pattern itself is still valid for modern browsers."}
          </p>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Live demo - the card below is styled by @container style() queries</p>
          <div
            className="sq-scope rounded-xl border border-border bg-muted/30 p-6"
            style={{ "--theme": theme, "--density": density, "--beta": beta ? "on" : "off" } as React.CSSProperties}
          >
            <div className="sq-card rounded-xl border border-border bg-white p-5 text-slate-900 shadow-sm">
              <div className="flex items-center gap-2">
                <p className="sq-title text-lg font-extrabold">Pricing card</p>
                <span className="sq-beta items-center rounded-full bg-amber-400/90 px-2 py-0.5 text-[11px] font-bold text-amber-950">BETA</span>
              </div>
              <p className="sq-sub mt-1 text-sm text-slate-500">Theme, density and the beta badge are all driven by custom properties queried in CSS.</p>
              <div className="mt-4 flex items-end gap-1">
                <span className="text-3xl font-extrabold">$29</span>
                <span className="sq-sub pb-1 text-sm text-slate-500">one-time</span>
              </div>
              <button type="button" className="sq-cta mt-3 rounded-xl px-4 py-2 text-sm font-bold">
                Get started
              </button>
            </div>
            <p className="mt-4 font-mono text-xs text-muted-foreground">
              --theme: {theme}; --density: {density}; --beta: {beta ? "on" : "off"};
            </p>
          </div>
          <div className="rounded-xl bg-muted/50 p-4">
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">The CSS behind it</p>
            <pre className="overflow-x-auto whitespace-pre font-mono text-xs leading-relaxed">{STYLE_CSS}</pre>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
