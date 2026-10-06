// /tools/scroll-animations - Build scroll-driven reveal animations, preview them
// in a live scrollable demo, and copy the CSS. 100% client-side; trial use is
// recorded when the CSS is copied.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Mouse } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/scroll-animations";
import toolSeoMeta from "@/lib/tool-seo-meta-data/scroll-animations";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/scroll-animations")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/scroll-animations";
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
  component: ScrollAnimationsTool,
});

type AnimDef = { label: string; from: string; to: string; parallax: boolean };

const ANIMS: Record<string, AnimDef> = {
  "fade-in": { label: "Fade in", from: "opacity: 0;", to: "opacity: 1;", parallax: false },
  "slide-up": { label: "Slide up", from: "opacity: 0;\n    transform: translateY(48px);", to: "opacity: 1;\n    transform: translateY(0);", parallax: false },
  "slide-left": { label: "Slide from left", from: "opacity: 0;\n    transform: translateX(64px);", to: "opacity: 1;\n    transform: translateX(0);", parallax: false },
  "scale-up": { label: "Scale up", from: "opacity: 0;\n    transform: scale(0.85);", to: "opacity: 1;\n    transform: scale(1);", parallax: false },
  parallax: { label: "Parallax drift", from: "transform: translateY(-48px);", to: "transform: translateY(48px);", parallax: true },
};

function ScrollAnimationsTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("scroll-animations", isPro);
  const seo = toolSeo;

  const [animKey, setAnimKey] = useState("slide-up");
  const [start, setStart] = useState(10);
  const [end, setEnd] = useState(80);
  const [copied, setCopied] = useState(false);
  const [supported] = useState(
    () =>
      typeof CSS !== "undefined" &&
      (CSS.supports("animation-timeline: view()") || CSS.supports("animation-timeline: scroll()")),
  );

  const anim: AnimDef = ANIMS[animKey] ?? {
    label: "Slide up",
    from: "opacity: 0;",
    to: "opacity: 1;",
    parallax: false,
  };

  const css = useMemo(() => {
    if (anim.parallax) {
      return `/* Parallax: tied to the scroller's own scroll progress */\n.parallax-el {\n  animation: parallax-drift linear both;\n  animation-timeline: scroll();\n  animation-range: 0% 100%;\n}\n\n@keyframes parallax-drift {\n  from {\n    ${anim.from}\n  }\n  to {\n    ${anim.to}\n  }\n}`;
    }
    return `/* Reveal on scroll: no JavaScript, no IntersectionObserver */\n.reveal {\n  animation: reveal linear both;\n  animation-timeline: view();\n  animation-range: entry ${start}% entry ${end}%;\n}\n\n@keyframes reveal {\n  from {\n    ${anim.from}\n  }\n  to {\n    ${anim.to}\n  }\n}`;
  }, [anim, start, end]);

  const copy = async () => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(css);
      setCopied(true);
      trial.recordUse();
      toast.success("Animation CSS copied");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  const slider = (label: string, value: number, onChange: (n: number) => void) => (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between text-[13px]">
        <span className="font-medium text-foreground/80">{label}</span>
        <span className="tabular-nums text-muted-foreground">{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </label>
  );

  return (
    <ToolPageShell toolId="scroll-animations" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Scroll Animations" left={trial.left} />

      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-4 text-sm">
        <Mouse className="h-4 w-4 text-primary" />
        <span className="font-semibold">Browser support:</span>
        <span
          className={
            supported
              ? "rounded-full bg-green-500/15 px-2.5 py-0.5 text-xs font-bold text-green-600"
              : "rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-600"
          }
        >
          {supported ? "Scroll-driven animations work in this browser" : "Not supported in this browser"}
        </span>
        <span className="text-xs text-muted-foreground">
          Honest note: scroll-driven animations are Chromium-first (Chrome/Edge 115+). Safari
          supports them from 18.4; Firefox support is still rolling out. In unsupported browsers
          the content simply appears without animation, nothing breaks.
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Animation</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(ANIMS).map(([key, a]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setAnimKey(key)}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-xs font-bold transition",
                    animKey === key
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                  )}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {!anim.parallax && (
            <div className="space-y-4">
              {slider("Trigger start (entry)", start, (n) => setStart(Math.min(n, end)))}
              {slider("Trigger end (entry)", end, (n) => setEnd(Math.max(n, start)))}
              <p className="text-xs text-muted-foreground">
                The animation plays as each card travels from {start}% to {end}% through the
                scroller's view.
              </p>
            </div>
          )}
          {anim.parallax && (
            <p className="rounded-xl bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
              Parallax ties movement to the whole scroller's scroll progress (0% to 100%), so the
              element drifts while you scroll past it.
            </p>
          )}

          <button
            type="button"
            onClick={copy}
            disabled={!trial.canUse}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy CSS"}
          </button>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left.
            </p>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold">Live scrollable demo</h2>
              <span className="text-xs text-muted-foreground">Scroll inside the box</span>
            </div>
            <style>{css}</style>
            <div className="h-[420px] space-y-4 overflow-y-auto rounded-xl bg-muted/40 p-5">
              {Array.from({ length: 6 }, (_, i) => (
                <div
                  key={i}
                  className={anim.parallax ? "" : "reveal"}
                  style={{
                    minHeight: 150,
                    borderRadius: 16,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    padding: 20,
                    display: "flex",
                    gap: 14,
                    alignItems: "center",
                  }}
                >
                  <div
                    className={anim.parallax ? "parallax-el" : ""}
                    style={{
                      width: 84,
                      height: 84,
                      borderRadius: 14,
                      flexShrink: 0,
                      background: `linear-gradient(135deg, hsl(${160 + i * 24}, 60%, 45%), hsl(${190 + i * 24}, 70%, 60%))`,
                    }}
                  />
                  <div>
                    <p className="mb-1 text-sm font-bold">Demo card {i + 1}</p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {anim.parallax
                        ? "The square drifts with scroll progress while the card stays put."
                        : `This card plays "${anim.label.toLowerCase()}" as it enters the view.`}
                    </p>
                  </div>
                </div>
              ))}
              <p className="pb-2 text-center text-xs text-muted-foreground">End of demo</p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-bold">Generated CSS</h2>
            <pre className="overflow-x-auto rounded-xl bg-muted/60 p-4 font-mono text-xs leading-relaxed">
              {css}
            </pre>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
