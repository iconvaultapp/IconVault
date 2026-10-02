// /tools/css-interpolate-size - Animate to and from auto sizes with
// interpolate-size: allow-keywords. Live accordion demo with a side-by-side
// comparison against the classic grid 0fr/1fr technique.
// Free, client-side only. Feature-detected with an honest fallback note.

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, Copy, Info } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/css-interpolate-size")({
  head: () => {
    const seo = getToolSeoMeta("css-interpolate-size");
    const canonical = "https://iconvault.site/tools/css-interpolate-size";
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
  component: InterpolateSizeTool,
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

const ITEMS = [
  {
    q: "Why can't height: auto be animated?",
    a: "Transitions need two numbers to interpolate between. auto is not a number, so the browser had nothing to animate from or to, and the change snapped instantly.",
  },
  {
    q: "What does interpolate-size: allow-keywords do?",
    a: "It opts the element into animating between lengths and intrinsic keywords like auto, min-content and max-content. Set it on the element whose size changes.",
  },
  {
    q: "Is there a fallback for older browsers?",
    a: "Yes: animate grid-template-rows from 0fr to 1fr with the content in min-height: 0. It works everywhere and is shown side by side in this demo.",
  },
];

const EASINGS = ["ease", "ease-in-out", "cubic-bezier(0.34, 1.3, 0.64, 1)", "linear"] as const;

function InterpolateSizeTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("css-interpolate-size", isPro);
  const seo = getToolSeo("css-interpolate-size");

  const [supported, setSupported] = useState<boolean | null>(null);
  const [allowKeywords, setAllowKeywords] = useState(true);
  const [horizontal, setHorizontal] = useState(false);
  const [duration, setDuration] = useState(450);
  const [easing, setEasing] = useState<string>(EASINGS[0] ?? "ease");
  const [open, setOpen] = useState(0);
  const [openGrid, setOpenGrid] = useState(0);

  useEffect(() => {
    try {
      setSupported(typeof CSS !== "undefined" && CSS.supports("interpolate-size: allow-keywords"));
    } catch {
      setSupported(false);
    }
  }, []);

  const canAnimate = supported && allowKeywords;

  const panelStyle = (isOpen: boolean): CSSProperties =>
    ({
      overflow: "hidden",
      transitionProperty: horizontal ? "width" : "height",
      transitionDuration: `${duration}ms`,
      transitionTimingFunction: easing,
      ...(supported ? { interpolateSize: allowKeywords ? "allow-keywords" : "numeric-only" } : {}),
      ...(horizontal ? { width: isOpen ? "auto" : 0, height: 120 } : { height: isOpen ? "auto" : 0 }),
    }) as CSSProperties;

  const gridStyle = (isOpen: boolean): CSSProperties => ({
    display: "grid",
    gridTemplateRows: isOpen ? "1fr" : "0fr",
    transition: `grid-template-rows ${duration}ms ${easing}`,
  });

  const css = useMemo(() => {
    const prop = horizontal ? "width" : "height";
    return [
      "/* The modern way: animate straight to auto */",
      ".accordion-panel {",
      "  interpolate-size: allow-keywords;   /* opt in once */",
      `  transition: ${prop} ${duration}ms ${easing};`,
      `  ${prop}: 0;`,
      "  overflow: hidden;",
      "}",
      ".accordion-panel.open {",
      `  ${prop}: auto;      /* now animates smoothly */`,
      "}",
      "",
      "/* Universal fallback: the 0fr / 1fr grid trick */",
      ".accordion-grid {",
      "  display: grid;",
      "  grid-template-rows: 0fr;",
      `  transition: grid-template-rows ${duration}ms ${easing};`,
      "}",
      ".accordion-grid.open {",
      "  grid-template-rows: 1fr;",
      "}",
      ".accordion-grid > div {",
      "  overflow: hidden;",
      "  min-height: 0;",
      "}",
    ].join("\n");
  }, [horizontal, duration, easing]);

  const copy = async () => {
    if (!trial.canUse) return;
    if (await copyText(css)) trial.recordUse();
  };

  return (
    <ToolPageShell toolId="css-interpolate-size" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="CSS interpolate-size" left={trial.left} />

      {supported === false && (
        <div className="mb-6 flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">Your browser does not support interpolate-size yet.</span>{" "}
            The left accordion will snap instead of animating, which is exactly the old behavior. The right column uses
            the grid fallback, which animates everywhere. interpolate-size needs Chrome 129+ or Edge 129+.
          </p>
        </div>
      )}
      {supported === true && (
        <div className="mb-6 flex gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">Your browser supports interpolate-size.</span> Toggle{" "}
            <span className="font-mono">allow-keywords</span> off to feel the difference: with it off, the panel snaps
            open with no animation.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <label className="flex cursor-pointer items-center gap-2.5 text-sm">
            <input type="checkbox" checked={allowKeywords} onChange={(e) => setAllowKeywords(e.target.checked)} className="h-4 w-4 accent-primary" />
            <span className="font-medium"><span className="font-mono">interpolate-size: allow-keywords</span></span>
          </label>

          <label className="flex cursor-pointer items-center gap-2.5 text-sm">
            <input type="checkbox" checked={horizontal} onChange={(e) => setHorizontal(e.target.checked)} className="h-4 w-4 accent-primary" />
            <span className="font-medium">Animate width instead of height</span>
          </label>

          <div>
            <div className="mb-1 flex justify-between text-[13px] font-medium text-foreground/80">
              <span>Duration</span>
              <span className="font-mono text-muted-foreground">{duration}ms</span>
            </div>
            <input type="range" min={100} max={1200} step={50} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full accent-primary" />
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Easing</p>
            <div className="flex flex-wrap gap-1.5">
              {EASINGS.map((ez) => (
                <button
                  key={ez}
                  type="button"
                  onClick={() => setEasing(ez)}
                  className={cn(
                    "rounded-lg border px-2.5 py-1.5 font-mono text-xs transition",
                    easing === ez ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {ez}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
            <span className={cn("font-bold", canAnimate ? "text-emerald-600" : "text-amber-600")}>
              {canAnimate ? "Animating smoothly" : "Snapping (no animation)"}
            </span>
            {" "}on the left panel right now.
          </div>
        </div>

        <div className="grid gap-4 rounded-2xl border border-border bg-card p-5 md:grid-cols-2">
          <div>
            <p className="mb-3 text-sm font-bold">interpolate-size approach</p>
            <div className="space-y-2">
              {ITEMS.map((it, i) => (
                <div key={it.q} className="overflow-hidden rounded-xl border border-border bg-background">
                  <button
                    type="button"
                    onClick={() => setOpen(open === i ? -1 : i)}
                    className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-semibold"
                  >
                    {it.q}
                    <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open === i && "rotate-180")} />
                  </button>
                  <div style={panelStyle(open === i)}>
                    <p className="px-4 pb-4 text-sm text-muted-foreground">{it.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-3 text-sm font-bold">grid 0fr / 1fr fallback <span className="font-normal text-muted-foreground">(works everywhere)</span></p>
            <div className="space-y-2">
              {ITEMS.map((it, i) => (
                <div key={it.q} className="overflow-hidden rounded-xl border border-border bg-background">
                  <button
                    type="button"
                    onClick={() => setOpenGrid(openGrid === i ? -1 : i)}
                    className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-semibold"
                  >
                    {it.q}
                    <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", openGrid === i && "rotate-180")} />
                  </button>
                  <div style={gridStyle(openGrid === i)}>
                    <div className="min-h-0 overflow-hidden">
                      <p className="px-4 pb-4 text-sm text-muted-foreground">{it.a}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-extrabold">Copy the CSS</h2>
          <ActionButton disabled={!trial.canUse} onClick={copy}>
            <Copy className="h-4 w-4" /> Copy CSS
          </ActionButton>
        </div>
        <pre className="overflow-x-auto whitespace-pre rounded-xl bg-muted/60 p-4 font-mono text-xs leading-relaxed">{css}</pre>
        {!isPro && <p className="mt-2 text-xs text-muted-foreground">{trial.left} of 5 free copies left.</p>}
      </div>
    </ToolPageShell>
  );
}
