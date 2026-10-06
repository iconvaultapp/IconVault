// /tools/css-transition-behavior - transition-behavior: allow-discrete lab:
// side-by-side comparison of display and visibility transitions with and
// without it, plus duration/effect controls and copyable CSS. 100% client-side.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Blend, Check, Copy, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/css-transition-behavior";
import toolSeoMeta from "@/lib/tool-seo-meta-data/css-transition-behavior";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/css-transition-behavior")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/css-transition-behavior";
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
  component: TransitionBehaviorTool,
});

type Prop = "display" | "visibility";

function DemoPane({
  title,
  supported,
  prop,
  visible,
  duration,
  note,
}: {
  title: string;
  supported: boolean;
  prop: Prop;
  visible: boolean;
  duration: number;
  note: string;
}) {
  const style: React.CSSProperties = useMemo(() => {
    const base: React.CSSProperties = {
      transitionProperty: `opacity, transform, ${prop}`,
      transitionDuration: `${duration}ms`,
      transitionTimingFunction: "ease",
    };
    if (supported) base.transitionBehavior = "allow-discrete";
    if (prop === "display") base.display = visible ? undefined : "none";
    else base.visibility = visible ? "visible" : "hidden";
    if (!visible && prop === "visibility") {
      base.opacity = 0;
      base.transform = "translateY(10px)";
    }
    if (visible) {
      base.opacity = 1;
      base.transform = "translateY(0)";
    }
    return base;
  }, [supported, prop, visible, duration]);

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-mono text-sm font-bold">{title}</p>
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", supported ? "bg-green-500/15 text-green-700 dark:text-green-400" : "bg-muted text-muted-foreground")}>
          {supported ? "allow-discrete" : "default"}
        </span>
      </div>
      <div className="flex h-36 items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 p-4">
        <div className="w-full max-w-[220px] rounded-xl bg-primary p-4 text-center text-sm font-bold text-primary-foreground" style={style}>
          {prop} box
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}

function TransitionBehaviorTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("css-transition-behavior", isPro);
  const seo = toolSeo;

  const [prop, setProp] = useState<Prop>("display");
  const [visible, setVisible] = useState(true);
  const [duration, setDuration] = useState(500);
  const [copied, setCopied] = useState(false);

  const css = useMemo(
    () => `.panel {
  transition: opacity ${duration}ms ease, transform ${duration}ms ease, ${prop} ${duration}ms;
  transition-behavior: allow-discrete; /* the one line that changes everything */
}

/* Entry from display:none also needs a defined starting point */
@starting-style {
  .panel {
    opacity: 0;
    transform: translateY(10px);
  }
}`,
    [prop, duration],
  );

  const copyText = async () => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(css);
      trial.recordUse();
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success("CSS copied");
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  return (
    <ToolPageShell toolId="css-transition-behavior" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="CSS transition-behavior" left={trial.left} />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-green-500/15 px-3 py-1 text-xs font-bold text-green-700 dark:text-green-400">
          Live: real CSS
        </span>
        <span className="text-xs text-muted-foreground">
          transition-behavior: allow-discrete is Baseline new (Chrome 117+, Safari 18+, Firefox 129+). Both panes toggle together so you can feel the difference.
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Discrete property</p>
            <div className="grid grid-cols-2 gap-2">
              {(["display", "visibility"] as Prop[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setProp(p)}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 font-mono text-sm font-bold transition",
                    prop === p ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {prop === "display"
                ? "display is the hard one: the element is removed from rendering entirely."
                : "visibility keeps layout space; the box fades while staying in flow."}
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Duration: {duration}ms</label>
            <input type="range" min={200} max={1500} step={50} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full" aria-label="Transition duration" />
          </div>

          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-bold hover:border-primary/50 hover:text-primary"
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {visible ? `Hide (${prop}: ${prop === "display" ? "none" : "hidden"})` : "Show both panes"}
          </button>

          <button
            type="button"
            onClick={copyText}
            disabled={!trial.canUse}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy the CSS"}
          </button>
          {!isPro && <p className="text-xs text-muted-foreground">{trial.left} of 5 free uses left. Toggling and sliders are unlimited.</p>}
        </div>

        <div className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <DemoPane
              title={`${prop} (default)`}
              supported={false}
              prop={prop}
              visible={visible}
              duration={duration}
              note={prop === "display" ? "Without allow-discrete, display flips instantly and opacity never gets a chance to run." : "visibility flips at the end of the transition, so the fade plays but the timing feels off."}
            />
            <DemoPane
              title={`${prop} + allow-discrete`}
              supported
              prop={prop}
              visible={visible}
              duration={duration}
              note="With allow-discrete, the discrete flip happens at the 50% mark, so opacity and transform animate around it. Watch the hide: it fades first, then display flips."
            />
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-center gap-1.5 border-b border-border px-4 py-2">
              <Blend className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Generated CSS</span>
            </div>
            <pre className="max-h-64 overflow-auto p-4 text-xs leading-relaxed text-foreground/90">{css}</pre>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Rules worth remembering</p>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
              <li><code className="font-mono">transition-behavior: allow-discrete</code> lets discrete properties (<code className="font-mono">display</code>, <code className="font-mono">visibility</code>) participate in transitions, flipping at 50%.</li>
              <li>Exit animations work with <code className="font-mono">allow-discrete</code> alone. Entry from <code className="font-mono">display: none</code> additionally needs <code className="font-mono">@starting-style</code> for the from-values.</li>
              <li>It also applies to discrete <em>values</em> of animatable properties, and to the new <code className="font-mono">overlay</code> property used with popovers and dialogs.</li>
            </ul>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
