// /tools/css-starting-style - Animate elements in from display:none with pure CSS.
// Compares @starting-style alone, transition-behavior: allow-discrete alone,
// and both combined, teaching the classic gotcha that entry from display:none
// needs both. 100% client-side.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Eye, EyeOff, Play } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/css-starting-style";
import toolSeoMeta from "@/lib/tool-seo-meta-data/css-starting-style";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/css-starting-style")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/css-starting-style";
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
  component: StartingStyleTool,
});

type Technique = "starting-only" | "discrete-only" | "both";
type Effect = "fade" | "slide" | "scale";

const TECHNIQUES: { id: Technique; label: string; blurb: string }[] = [
  { id: "starting-only", label: "@starting-style only", blurb: "The classic gotcha: nothing animates. display is not transitionable without allow-discrete, so the entry style never gets a transition to run." },
  { id: "discrete-only", label: "allow-discrete only", blurb: "Exit animates (display flips at 50%), but entry pops in with no animation because there is no defined starting point." },
  { id: "both", label: "Both combined", blurb: "The correct recipe. allow-discrete makes display transitionable; @starting-style defines where the entry transition starts from." },
];

const EFFECTS: { id: Effect; label: string; from: string }[] = [
  { id: "fade", label: "Fade", from: "opacity: 0;" },
  { id: "slide", label: "Slide up", from: "opacity: 0;\n    transform: translateY(16px);" },
  { id: "scale", label: "Scale", from: "opacity: 0;\n    transform: scale(0.92);" },
];

function StartingStyleTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("css-starting-style", isPro);
  const seo = toolSeo;

  const [open, setOpen] = useState(true);
  const [technique, setTechnique] = useState<Technique>("both");
  const [effect, setEffect] = useState<Effect>("slide");
  const [duration, setDuration] = useState(400);
  const [copied, setCopied] = useState(false);

  const effectFrom = EFFECTS.find((e) => e.id === effect)!;

  const css = useMemo(() => {
    const behavior = technique === "starting-only" ? "" : "\n  transition-behavior: allow-discrete;";
    const starting = technique === "discrete-only" ? "" : `\n\n@starting-style {\n  .card {\n    ${effectFrom.from.replace(/\n/g, "\n    ")}\n  }\n}`;
    return `.card {\n  transition: opacity ${duration}ms ease, transform ${duration}ms ease, display ${duration}ms;${behavior}\n}${starting}`;
  }, [technique, effectFrom, duration]);

  const inject = useMemo(() => {
    const behavior = technique === "starting-only" ? "" : "transition-behavior: allow-discrete;";
    const starting = technique === "discrete-only" ? "" : `@starting-style { .ivss-card { ${effectFrom.from.replace(/\n\s*/g, " ")} } }`;
    return `.ivss-card { transition: opacity ${duration}ms ease, transform ${duration}ms ease, display ${duration}ms; ${behavior} } ${starting}`;
  }, [technique, effectFrom, duration]);

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
    <ToolPageShell toolId="css-starting-style" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="CSS @starting-style" left={trial.left} />
      <style>{inject}</style>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-green-500/15 px-3 py-1 text-xs font-bold text-green-700 dark:text-green-400">
          Live: real CSS
        </span>
        <span className="text-xs text-muted-foreground">
          @starting-style is Baseline new (Chrome 117+, Safari 17.5+, Firefox 129+). Toggle the techniques and feel the difference.
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Technique</p>
            <div className="space-y-2">
              {TECHNIQUES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTechnique(t.id)}
                  className={cn(
                    "w-full rounded-xl border p-3 text-left transition",
                    technique === t.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/40",
                  )}
                >
                  <span className={cn("font-mono text-sm font-bold", technique === t.id ? "text-primary" : "")}>{t.label}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{t.blurb}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Entry effect</p>
            <div className="grid grid-cols-3 gap-2">
              {EFFECTS.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setEffect(e.id)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-sm font-semibold transition",
                    effect === e.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Duration: {duration}ms</label>
            <input type="range" min={150} max={1200} step={50} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full" aria-label="Transition duration" />
          </div>

          <button
            type="button"
            onClick={copyText}
            disabled={!trial.canUse}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy the CSS"}
          </button>
          {!isPro && <p className="text-xs text-muted-foreground">{trial.left} of 5 free uses left. Toggling and previews are unlimited.</p>}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Live demo</p>
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:border-primary/50 hover:text-primary"
              >
                {open ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {open ? "Hide (display: none)" : "Show (display: block)"}
              </button>
            </div>
            <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 p-6">
              <div className="ivss-card w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-lg" style={{ display: open ? undefined : "none" }}>
                <p className="flex items-center gap-1.5 text-sm font-bold"><Play className="h-4 w-4 text-primary" /> Entry-animated card</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {technique === "both" && "Both halves animate: it glides in and glides out."}
                  {technique === "starting-only" && "It pops in and out instantly. @starting-style alone cannot transition display."}
                  {technique === "discrete-only" && "Exit animates, but entry pops in with no starting point."}
                </p>
              </div>
              {!open && <p className="text-xs text-muted-foreground">display: none, nothing rendered. Press Show to watch the entry.</p>}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="border-b border-border px-4 py-2">
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Generated CSS</span>
            </div>
            <pre className="max-h-64 overflow-auto p-4 text-xs leading-relaxed text-foreground/90">{css}</pre>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-2 text-[13px] font-medium text-foreground/80">The rule to remember</p>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
              <li>Entry from <code className="font-mono">display: none</code> needs <code className="font-mono">transition-behavior: allow-discrete</code> <em>and</em> <code className="font-mono">@starting-style</code>. One without the other does nothing useful.</li>
              <li>With <code className="font-mono">allow-discrete</code>, discrete properties like <code className="font-mono">display</code> flip at the 50% mark of the transition.</li>
              <li>Same recipe powers animated <code className="font-mono">popover</code> and <code className="font-mono">dialog</code> open/close, and pairs with <code className="font-mono">interpolate-size: allow-keywords</code> for height auto animations.</li>
            </ul>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
