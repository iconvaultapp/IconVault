// /tools/view-transitions-playground - document.startViewTransition demos
// with named elements and custom animations, plus a graceful fallback note
// for unsupported browsers. 100% in-browser.

import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Info, Shuffle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/view-transitions-playground")({
  head: () => {
    const seo = getToolSeoMeta("view-transitions-playground");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: ViewTransitionsTool,
});

const CARDS = [
  { id: "a", label: "Design", color: "linear-gradient(135deg,#8b5cf6,#6366f1)" },
  { id: "b", label: "Code", color: "linear-gradient(135deg,#0ea5e9,#2563eb)" },
  { id: "c", label: "Ship", color: "linear-gradient(135deg,#10b981,#059669)" },
  { id: "d", label: "Learn", color: "linear-gradient(135deg,#f59e0b,#d97706)" },
  { id: "e", label: "Test", color: "linear-gradient(135deg,#ec4899,#db2777)" },
  { id: "f", label: "Deploy", color: "linear-gradient(135deg,#14b8a6,#0d9488)" },
];

const CSS_SNIPPET = `/* Give each moving element a stable name */
.card { view-transition-name: card-a; }

/* Animate the snapshots (this demo uses fade + slide) */
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 0.45s;
}
::view-transition-old(card-a) {
  animation: 0.45s ease both fade-out, 0.45s ease both slide-out;
}
::view-transition-new(card-a) {
  animation: 0.45s ease both fade-in, 0.45s ease both slide-in;
}

/* Cross-document transitions (MPA): one line in CSS */
@view-transition {
  navigation: auto;
}`;

// eslint-disable-next-line react/no-danger
const VT_STYLES = `
::view-transition-old(root),
::view-transition-new(root) { animation-duration: 0.45s; }
@keyframes vt-fade-in { from { opacity: 0; transform: translateY(14px) scale(0.96); } }
@keyframes vt-fade-out { to { opacity: 0; transform: translateY(-14px) scale(0.96); } }
::view-transition-old(card-a), ::view-transition-old(card-b),
::view-transition-old(card-c), ::view-transition-old(card-d),
::view-transition-old(card-e), ::view-transition-old(card-f) {
  animation: 0.45s ease both vt-fade-out;
}
::view-transition-new(card-a), ::view-transition-new(card-b),
::view-transition-new(card-c), ::view-transition-new(card-d),
::view-transition-new(card-e), ::view-transition-new(card-f) {
  animation: 0.45s ease both vt-fade-in;
}`;

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function ViewTransitionsTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("view-transitions-playground", isPro);
  const seo = getToolSeo("view-transitions-playground");

  const [supported, setSupported] = useState(false);
  const [cards, setCards] = useState(CARDS);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSupported(typeof (document as unknown as { startViewTransition?: unknown }).startViewTransition === "function");
  }, []);

  const shuffle = () => {
    if (busy || !trial.canUse) return;
    setBusy(true);
    trial.recordUse();
    const apply = () =>
      setCards((p) => {
        const next = [...p];
        for (let i = next.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const tmp = next[i]!;
          next[i] = next[j]!;
          next[j] = tmp;
        }
        return next;
      });
    const doc = document as unknown as { startViewTransition?: (cb: () => void) => { finished: Promise<unknown> } };
    if (typeof doc.startViewTransition === "function") {
      const vt = doc.startViewTransition(apply);
      vt.finished.finally(() => setBusy(false));
      toast.success("View transition played");
    } else {
      apply();
      setBusy(false);
      toast.info("No View Transitions support here, plain shuffle instead");
    }
  };

  return (
    <ToolPageShell toolId="view-transitions-playground" seo={seo} trial={trial} isPro={isPro}>
      <style>{VT_STYLES}</style>
      <TrialUpsell toolName="View Transitions" left={trial.left} />

      <div
        className={cn(
          "mb-5 flex items-start gap-3 rounded-2xl border p-4",
          supported ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5",
        )}
      >
        <Info className={cn("mt-0.5 h-5 w-5 shrink-0", supported ? "text-emerald-500" : "text-amber-500")} />
        <p className="text-sm text-muted-foreground">
          {supported
            ? "Your browser supports the View Transitions API, so shuffling below animates for real."
            : "Your browser does not support View Transitions yet (needs Chrome 111+, Edge 111+ or Safari 18+). The demo still works, it just updates instantly instead of animating."}{" "}
          Each card has a <span className="font-mono">view-transition-name</span>, so the browser morphs the old
          snapshot into the new one instead of re-rendering.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Live demo: shuffle the cards</h2>
            <ActionButton busy={busy} disabled={!trial.canUse} onClick={shuffle}>
              <Shuffle className="h-4 w-4" /> {busy ? "Animating..." : "Shuffle"}
            </ActionButton>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {cards.map((c) => (
              <div
                key={c.id}
                style={{ background: c.color, viewTransitionName: `card-${c.id}` } as React.CSSProperties}
                className="flex h-28 items-center justify-center rounded-2xl text-lg font-bold text-white shadow"
              >
                {c.label}
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Watch each card glide to its new slot. Without{" "}
            <span className="font-mono">startViewTransition</span> this would be an instant, jarring re-layout.
          </p>
          {!isPro && (
            <p className="mt-2 text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free runs left.
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">The CSS behind it</h2>
              <button
                type="button"
                onClick={async () => {
                  const ok = await copyText(CSS_SNIPPET);
                  if (ok) {
                    trial.recordUse();
                    toast.success("CSS copied");
                  }
                }}
                disabled={!trial.canUse}
                className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-sm font-semibold transition hover:border-primary/40 disabled:opacity-40"
              >
                <Copy className="h-4 w-4" /> Copy
              </button>
            </div>
            <pre className="max-h-96 overflow-auto rounded-xl bg-black/80 p-4 font-mono text-[13px] leading-relaxed text-sky-300">
              {CSS_SNIPPET}
            </pre>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-2 font-semibold">SPA vs cross-document</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <span className="font-semibold text-foreground">SPA (this demo):</span> wrap your DOM update in{" "}
                <span className="font-mono">document.startViewTransition(() =&gt; update())</span>. Name the
                elements that should morph.
              </li>
              <li>
                <span className="font-semibold text-foreground">Cross-document (MPA):</span> add{" "}
                <span className="font-mono">@view-transition &#123; navigation: auto; &#125;</span> to your CSS and
                full page loads animate too, no JavaScript needed.
              </li>
              <li>
                <span className="font-semibold text-foreground">Reduced motion:</span> always respect{" "}
                <span className="font-mono">prefers-reduced-motion</span> and skip the transition for users who
                ask for it.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
