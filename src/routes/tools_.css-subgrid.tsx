// /tools/css-subgrid - Align nested grid items to parent tracks: a live
// with/without subgrid comparison with cards of uneven content, plus row guides
// and copyable HTML/CSS. 100% client-side, Baseline widely available.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Grid2x2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/css-subgrid")({
  head: () => {
    const seo = getToolSeoMeta("css-subgrid");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: SubgridTool,
});

const CARDS = [
  { title: "Starter", body: "Everything you need to begin.", cta: "Choose Starter" },
  { title: "Professional plan with the works", body: "The full toolkit: priority rendering, team seats, and every integration we ship, including the ones still in beta.", cta: "Choose Pro" },
  { title: "Team", body: "Shared workspaces and roles.", cta: "Choose Team" },
  { title: "Enterprise", body: "SSO, audit logs, and a dedicated success manager for large organizations.", cta: "Contact sales" },
];

function SubgridTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("css-subgrid", isPro);
  const seo = getToolSeo("css-subgrid");

  const [subgrid, setSubgrid] = useState(true);
  const [columns, setColumns] = useState(3);
  const [gap, setGap] = useState(16);
  const [guides, setGuides] = useState(true);
  const [copied, setCopied] = useState(false);

  const visible = CARDS.slice(0, columns === 4 ? 4 : 3);

  const css = useMemo(() => {
    const cardRows = subgrid ? "  grid-template-rows: subgrid; /* inherits the parent row tracks */" : "  grid-template-rows: auto 1fr auto; /* own tracks: rows size per card */";
    return `.pricing {\n  display: grid;\n  grid-template-columns: repeat(${columns}, 1fr);\n  grid-template-rows: auto 1fr auto;\n  gap: ${gap}px;\n}\n\n.pricing > .card {\n  display: grid;\n  grid-row: span 3;${subgrid ? "\n" : ""}${cardRows}\n}`;
  }, [subgrid, columns, gap]);

  const html = `<div class="pricing">\n${visible.map((c) => `  <article class="card">\n    <h3>${c.title}</h3>\n    <p>${c.body}</p>\n    <button>${c.cta}</button>\n  </article>`).join("\n")}\n</div>`;

  const copyText = async (text: string) => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(text);
      trial.recordUse();
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  return (
    <ToolPageShell toolId="css-subgrid" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="CSS Subgrid" left={trial.left} />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-green-500/15 px-3 py-1 text-xs font-bold text-green-700 dark:text-green-400">
          Live: real CSS
        </span>
        <span className="text-xs text-muted-foreground">
          Subgrid is Baseline widely available (Chrome 117+, Firefox 71+, Safari 16+). Flip the switch and watch the buttons snap into alignment.
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
            <div>
              <p className="text-sm font-bold">Subgrid</p>
              <p className="font-mono text-xs text-muted-foreground">grid-template-rows: subgrid</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={subgrid}
              onClick={() => setSubgrid((v) => !v)}
              className={cn("relative h-7 w-12 rounded-full transition", subgrid ? "bg-primary" : "bg-muted")}
            >
              <span className={cn("absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all", subgrid ? "left-6" : "left-1")} />
            </button>
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Columns: {columns}</label>
            <div className="grid grid-cols-2 gap-2">
              {[3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setColumns(n)}
                  className={cn("rounded-xl border px-3 py-2 text-sm font-semibold transition", columns === n ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40")}
                >
                  {n} cards
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Gap: {gap}px</label>
            <input type="range" min={8} max={32} value={gap} onChange={(e) => setGap(Number(e.target.value))} className="w-full" aria-label="Grid gap" />
          </div>

          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-border px-3 py-2.5 text-sm">
            <span className="font-semibold">Show row-track guides</span>
            <input type="checkbox" checked={guides} onChange={(e) => setGuides(e.target.checked)} className="h-4 w-4 accent-teal-600" />
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void copyText(css)}
              disabled={!trial.canUse}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} CSS
            </button>
            <button
              type="button"
              onClick={() => void copyText(html)}
              disabled={!trial.canUse}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-sm font-bold hover:border-primary/50 hover:text-primary disabled:opacity-50"
            >
              <Copy className="h-4 w-4" /> HTML
            </button>
          </div>
          {!isPro && <p className="text-xs text-muted-foreground">{trial.left} of 5 free uses left. Toggling and sliders are unlimited.</p>}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 flex items-center gap-1.5 text-[13px] font-medium text-foreground/80">
              <Grid2x2 className="h-4 w-4" /> Pricing cards with uneven content
            </p>
            <div
              className="rounded-xl border border-dashed border-border bg-muted/30 p-4"
              style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gridTemplateRows: "auto 1fr auto", gap }}
            >
              {visible.map((c) => (
                <article
                  key={c.title}
                  className={cn("flex flex-col rounded-xl border bg-card p-4", guides && "outline outline-1 outline-dashed outline-primary/40")}
                  style={{ display: "grid", gridRow: "span 3", gridTemplateRows: subgrid ? "subgrid" : "auto 1fr auto", gap: 8 }}
                >
                  <h3 className="text-sm font-bold">{c.title}</h3>
                  <p className="text-xs text-muted-foreground">{c.body}</p>
                  <button type="button" className="mt-auto rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">
                    {c.cta}
                  </button>
                </article>
              ))}
            </div>
            <div className={cn("mt-3 rounded-xl border p-3 text-xs", subgrid ? "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400" : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400")}>
              {subgrid
                ? "Subgrid ON: each card borrows the parent row tracks, so titles, bodies and buttons line up across cards no matter how long the text is."
                : "Subgrid OFF: every card sizes its own rows, so the buttons sit at different heights. This is the problem subgrid solves."}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="border-b border-border px-4 py-2">
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Generated CSS</span>
            </div>
            <pre className="max-h-64 overflow-auto p-4 text-xs leading-relaxed text-foreground/90">{css}</pre>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
