// /tools/bfc-layout-debugger - Interactive Block Formatting Context visualizer:
// float containment, margin collapse, and float exclusion, toggled live. In-browser.

import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Boxes, Ruler } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/bfc-layout-debugger")({
  head: () => {
    const seo = getToolSeoMeta("bfc-layout-debugger");
    const canonical = "https://iconvault.site/tools/bfc-layout-debugger";
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
  component: BfcDebugger,
});

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)}
      className="inline-flex items-center gap-2.5 rounded-xl border border-border px-3.5 py-2 text-sm font-semibold transition hover:border-primary/50">
      <span className={cn("relative h-5 w-9 shrink-0 rounded-full transition", on ? "bg-primary" : "bg-muted")}>
        <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all", on ? "left-[18px]" : "left-0.5")} />
      </span>
      {label}
    </button>
  );
}

function BfcDebugger() {
  const { isPro } = usePlan();
  const trial = useToolTrial("bfc-layout-debugger", isPro);
  const seo = getToolSeo("bfc-layout-debugger");

  const [contain, setContain] = useState(false);
  const [preventCollapse, setPreventCollapse] = useState(false);
  const [noWrap, setNoWrap] = useState(false);
  const [gapPx, setGapPx] = useState<number | null>(null);
  const box1Ref = useRef<HTMLDivElement>(null);
  const box2Ref = useRef<HTMLDivElement>(null);

  const measure = () => {
    if (!trial.canUse) return;
    const b1 = box1Ref.current;
    const b2 = box2Ref.current;
    if (!b1 || !b2) return;
    const r1 = b1.getBoundingClientRect();
    const r2 = b2.getBoundingClientRect();
    setGapPx(Math.round(r2.top - r1.bottom));
    trial.recordUse();
    toast.success("Gap measured between the two boxes");
  };

  return (
    <ToolPageShell toolId="bfc-layout-debugger" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="BFC Layout Debugger" left={trial.left} />
      {!isPro && <p className="mb-4 text-xs text-muted-foreground">{trial.left} of {TOOL_TRIAL_LIMIT} free measurements left. All demos render live in your browser.</p>}

      <div className="space-y-6">
        {/* Demo 1: float containment */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-base font-extrabold"><Boxes className="h-5 w-5 text-primary" /> 1. Float containment</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            A parent with only floated children collapses to zero height, because floats are taken out of normal flow.
            Creating a Block Formatting Context on the parent (with <code className="font-mono text-xs">display: flow-root</code>) makes it wrap its floats again.
          </p>
          <div className="mt-4"><Toggle on={contain} onChange={setContain} label={contain ? "BFC on: display: flow-root" : "BFC off: plain block"} /></div>
          <div className="mt-3 rounded-xl border-2 border-dashed border-primary/50 p-1">
            <div className={cn("rounded-lg bg-muted/40 p-2", contain && "[display:flow-root]")}>
              <div className="float-left m-2 flex h-24 w-40 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 font-bold text-white">float: left</div>
              <div className="float-right m-2 flex h-24 w-40 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-sky-600 font-bold text-white">float: right</div>
            </div>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {contain
              ? "The dashed border now wraps both floats. The parent established a BFC, so it contains them."
              : "See how the dashed border collapsed to a thin strip? The floats escaped the parent's height."}
          </p>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-muted/60 p-3 font-mono text-xs">{contain ? `.parent {\n  display: flow-root; /* new BFC: contains floats */\n}` : `.parent {\n  /* no BFC: height collapses around floats */\n}`}</pre>
        </section>

        {/* Demo 2: margin collapse */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-base font-extrabold"><Ruler className="h-5 w-5 text-primary" /> 2. Margin collapse</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Two stacked boxes with 40px margins get only a 40px gap, not 80px: adjoining vertical margins collapse.
            Wrap one box in its own BFC and the margins stop collapsing, giving the full 80px.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Toggle on={preventCollapse} onChange={(v) => { setPreventCollapse(v); setGapPx(null); }} label={preventCollapse ? "BFC wrapper on second box" : "BFC wrapper off"} />
            <button type="button" onClick={measure} disabled={!trial.canUse}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50">
              <Ruler className="h-4 w-4" /> Measure gap
            </button>
            {gapPx !== null && <span className="rounded-lg bg-primary/10 px-3 py-2 font-mono text-sm font-bold text-primary">gap = {gapPx}px</span>}
          </div>
          <div className="mt-3 rounded-xl border border-border bg-[repeating-conic-gradient(#80808014_0_25%,transparent_0_50%)] bg-[length:24px_24px] p-4">
            <div ref={box1Ref} className="rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 p-4 text-center font-bold text-white" style={{ marginBottom: 40 }}>Box 1, margin-bottom: 40px</div>
            <div className={cn(preventCollapse && "[display:flow-root]")}>
              <div ref={box2Ref} className="rounded-lg bg-gradient-to-br from-cyan-500 to-sky-600 p-4 text-center font-bold text-white" style={{ marginTop: 40 }}>Box 2, margin-top: 40px</div>
            </div>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {preventCollapse
              ? "With the wrapper, the margins no longer touch each other, so they add up to 80px."
              : "Without the wrapper, 40px + 40px collapses to a single 40px gap. Measure it to confirm."}
          </p>
        </section>

        {/* Demo 3: float exclusion */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-extrabold">3. Float exclusion zone</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Text in normal flow wraps around floats. Put the text in its own BFC and it forms a neat column beside the float instead of flowing underneath it.
          </p>
          <div className="mt-4"><Toggle on={noWrap} onChange={setNoWrap} label={noWrap ? "BFC on text: display: flow-root" : "Text in normal flow"} /></div>
          <div className="mt-3 rounded-xl border border-border p-4">
            <div className="float-left mr-4 flex h-32 w-32 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 font-bold text-white">float</div>
            <div className={cn("text-sm leading-6 text-foreground/85", noWrap && "[display:flow-root]")}>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. A block formatting context is an isolated layout region:
              floats inside cannot escape it, margins inside cannot collapse with the outside, and floats outside cannot intrude into it.
              Toggle the switch to see the text stop wrapping under the float and form its own column.
            </div>
            <div className="clear-both" />
          </div>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-muted/60 p-3 font-mono text-xs">{`.text {\n  display: flow-root; /* BFC: no float intrusion */\n}\n\n/* other ways to create a BFC: */\n/* overflow: hidden | auto; display: inline-block; */\n/* position: absolute | fixed; contain: layout; */`}</pre>
        </section>
      </div>
    </ToolPageShell>
  );
}
