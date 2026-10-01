// /tools/css-scroll-state - Scroll-state container queries lab: a scrollable demo
// with a sticky header and snap points, live stuck/snapped badges computed the
// same way the spec defines them, plus the real @container scroll-state() CSS.
// Support is new and varies, so the limitation is stated plainly.

import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownUp, Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/css-scroll-state")({
  head: () => {
    const seo = getToolSeoMeta("css-scroll-state");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: ScrollStateTool,
});

const ITEMS = Array.from({ length: 14 }, (_, i) => i + 1);

function Badge({ label, active }: { label: string; active: boolean }) {
  return (
    <span className={cn("rounded-full px-2.5 py-1 font-mono text-xs font-bold transition", active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
      {label}: {active ? "match" : "no match"}
    </span>
  );
}

function ScrollStateTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("css-scroll-state", isPro);
  const seo = getToolSeo("css-scroll-state");

  const [stickyHeader, setStickyHeader] = useState(true);
  const [snap, setSnap] = useState(true);
  const [stuckTop, setStuckTop] = useState(false);
  const [stuckBottom, setStuckBottom] = useState(false);
  const [snapped, setSnapped] = useState(false);
  const [copied, setCopied] = useState(false);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const sRect = scroller.getBoundingClientRect();
      const h = headerRef.current;
      const f = footerRef.current;
      // stuck: top matches when the sticky header is pinned against the top edge
      setStuckTop(!!h && Math.abs(h.getBoundingClientRect().top - sRect.top) < 2 && scroller.scrollTop > 2);
      // stuck: bottom matches when the sticky footer is pinned against the bottom edge
      setStuckBottom(!!f && Math.abs(f.getBoundingClientRect().bottom - sRect.bottom) < 2 && scroller.scrollTop + scroller.clientHeight < scroller.scrollHeight - 2);
      // snapped: block matches when a snap child sits exactly at the snap position
      if (snap) {
        const kids = Array.from(scroller.querySelectorAll<HTMLElement>("[data-snap]"));
        setSnapped(kids.some((k) => Math.abs(k.getBoundingClientRect().top - sRect.top) < 3));
      } else {
        setSnapped(false);
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [snap, stickyHeader]);

  const snippet = `/* The scroller opts into scroll-state queries */
.scroller {
  container-type: scroll-state;
  overflow-y: auto;
}

/* Style the sticky bar differently once it sticks */
@container scroll-state(stuck: top) {
  .bar { background: #0f766e; color: #fff; }
}

/* Highlight whichever snap target is currently snapped */
@container scroll-state(snapped: block) {
  .card { outline: 2px solid #0f766e; }
}`;

  const copyText = async () => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(snippet);
      trial.recordUse();
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success("CSS copied");
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  return (
    <ToolPageShell toolId="css-scroll-state" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="CSS scroll-state()" left={trial.left} />
      <style>{`
        @container scroll-state(stuck: top) { .ivss-bar { background: #0f766e !important; color: #fff !important; } }
        @container scroll-state(stuck: bottom) { .ivss-foot { background: #0f766e !important; color: #fff !important; } }
      `}</style>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-400">
          New API: support varies
        </span>
        <span className="text-xs text-muted-foreground">
          scroll-state() container queries shipped in Chrome 133+. The badges below are computed in JS exactly the way the spec defines them, and the same @container rules are injected for real, so they light up where the browser supports them.
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Demo setup</p>
            <label className="flex cursor-pointer items-center justify-between rounded-xl border border-border px-3 py-2.5 text-sm">
              <span className="font-semibold">Sticky header + footer</span>
              <input type="checkbox" checked={stickyHeader} onChange={(e) => setStickyHeader(e.target.checked)} className="h-4 w-4 accent-teal-600" />
            </label>
            <label className="mt-2 flex cursor-pointer items-center justify-between rounded-xl border border-border px-3 py-2.5 text-sm">
              <span className="font-semibold">Scroll snap points</span>
              <input type="checkbox" checked={snap} onChange={(e) => setSnap(e.target.checked)} className="h-4 w-4 accent-teal-600" />
            </label>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Live query state</p>
            <div className="flex flex-wrap gap-2">
              <Badge label="stuck: top" active={stuckTop} />
              <Badge label="stuck: bottom" active={stuckBottom} />
              <Badge label="snapped: block" active={snapped} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Scroll the demo. These mirror the scroll-state() features: <code className="font-mono">stuck</code> fires when a sticky element is pinned, <code className="font-mono">snapped</code> when a snap target rests on its snap point.
            </p>
          </div>

          <button
            type="button"
            onClick={copyText}
            disabled={!trial.canUse}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy the @container CSS"}
          </button>
          {!isPro && <p className="text-xs text-muted-foreground">{trial.left} of 5 free uses left. Scrolling and badges are unlimited.</p>}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 flex items-center gap-1.5 text-[13px] font-medium text-foreground/80">
              <ArrowDownUp className="h-4 w-4" /> Scrollable demo (scroll inside the box)
            </p>
            <div
              ref={scrollerRef}
              className="h-96 overflow-y-auto rounded-xl border border-border bg-muted/30"
              style={{ containerType: "scroll-state", scrollSnapType: snap ? "y proximity" : undefined } as React.CSSProperties}
            >
              {stickyHeader && (
                <div ref={headerRef} className="ivss-bar sticky top-0 z-10 border-b border-border bg-card px-4 py-3 text-sm font-bold transition-colors">
                  Sticky header: watch it turn teal when stuck
                </div>
              )}
              <div className="space-y-3 p-4">
                {ITEMS.map((n) => (
                  <div
                    key={n}
                    data-snap
                    className="rounded-xl border border-border bg-card p-4"
                    style={{ scrollSnapAlign: snap ? "start" : undefined }}
                  >
                    <p className="text-sm font-bold">Card {n}</p>
                    <p className="text-xs text-muted-foreground">Snap target {n} of {ITEMS.length}. Scroll slowly and watch the snapped badge.</p>
                  </div>
                ))}
              </div>
              {stickyHeader && (
                <div ref={footerRef} className="ivss-foot sticky bottom-0 z-10 border-t border-border bg-card px-4 py-3 text-sm font-bold transition-colors">
                  Sticky footer: stuck: bottom fires when pinned here
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-2 text-[13px] font-medium text-foreground/80">What each feature means</p>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
              <li><code className="font-mono">stuck: top | right | bottom | left</code> matches when a <code className="font-mono">position: sticky</code> child is currently stuck to that edge. Before, this needed a scroll listener.</li>
              <li><code className="font-mono">snapped: block | inline | x | y</code> matches when a scroll-snap target is resting on its snap position.</li>
              <li><code className="font-mono">scrollable: top | right | bottom | left</code> matches when the container can still scroll toward that direction.</li>
              <li>The scroller needs <code className="font-mono">container-type: scroll-state</code>, then descendants query it with <code className="font-mono">@container scroll-state(...)</code>.</li>
            </ul>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
