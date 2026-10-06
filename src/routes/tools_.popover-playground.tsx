// /tools/popover-playground - Native popover attribute playground: auto vs
// manual modes, anchor-positioned tooltips and menus with position-area,
// plus copy-ready HTML/CSS/JS. 100% client-side; trial use is recorded on
// copy.

import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Menu } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/popover-playground";
import toolSeoMeta from "@/lib/tool-seo-meta-data/popover-playground";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/popover-playground")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/popover-playground";
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
  component: PopoverTool,
});

type Mode = "auto" | "manual";
type Position = "top" | "bottom" | "left" | "right";
type Demo = "tooltip" | "menu" | "card";

const POS_LABEL: Record<Position, string> = {
  top: "Top",
  bottom: "Bottom",
  left: "Left",
  right: "Right",
};

function PopoverTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("popover-playground", isPro);
  const seo = toolSeo;

  const [mode, setMode] = useState<Mode>("auto");
  const [position, setPosition] = useState<Position>("bottom");
  const [demo, setDemo] = useState<Demo>("tooltip");
  const [copied, setCopied] = useState(false);
  const [events, setEvents] = useState<string[]>([]);
  const [menuChoice, setMenuChoice] = useState<string | null>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [popoverApi] = useState(
    () => typeof HTMLElement !== "undefined" && "showPopover" in HTMLElement.prototype,
  );
  const [anchorApi] = useState(
    () =>
      typeof CSS !== "undefined" &&
      (CSS.supports("position-area: bottom") || CSS.supports("anchor-name: --x")),
  );

  const log = (msg: string) =>
    setEvents((prev) => [`${new Date().toLocaleTimeString()} ${msg}`, ...prev].slice(0, 30));

  useEffect(() => {
    const el = popRef.current;
    if (!el) return;
    const onToggle = (e: Event) => {
      const ev = e as ToggleEvent;
      log(`toggle: ${ev.newState} (${ev.oldState} -> ${ev.newState})`);
    };
    el.addEventListener("toggle", onToggle);
    return () => el.removeEventListener("toggle", onToggle);
  }, []);

  const show = () => popRef.current?.showPopover();
  const hide = () => popRef.current?.hidePopover();

  const code = useMemo(() => {
    const popAttr = mode === "auto" ? "popover" : 'popover="manual"';
    const area =
      position === "top" ? "top" : position === "bottom" ? "bottom" : position === "left" ? "left" : "right";
    return `<!-- Anchor button -->
<button id="anchor" popovertarget="tip"${mode === "manual" ? ' popovertargetaction="show"' : ""}>
  Hover or tap me
</button>

<!-- ${mode === "auto" ? "Auto" : "Manual"} popover, anchor-positioned -->
<div id="tip" ${popAttr} class="tip">
${demo === "menu" ? `  <button>New</button>\n  <button>Open</button>\n  <button>Save</button>` : demo === "card" ? `  <strong>Card title</strong>\n  <p>Rich content lives in the top layer.</p>` : `  A native tooltip. No JavaScript needed.`}
</div>

<style>
  #anchor { anchor-name: --tip-anchor; }
  .tip {
    position-anchor: --tip-anchor; /* tie popover to its button */
    position-area: ${area};        /* top | bottom | left | right */
    margin: 8px;
  }
</style>

<script>
  const tip = document.getElementById("tip");
  ${mode === "manual" ? `// Manual popovers stay open until you call hidePopover()\ntip.showPopover();\ntip.hidePopover();` : `// Auto popovers close on outside click and Escape\n// and listen for the "toggle" event:\ntip.addEventListener("toggle", (e) => {\n  console.log(e.oldState, "->", e.newState);\n});`}
</script>`;
  }, [mode, position, demo]);

  const copy = async () => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      trial.recordUse();
      toast.success("Popover code copied");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  return (
    <ToolPageShell toolId="popover-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Popover Playground" left={trial.left} />

      <style>{`
        .pop-anchor { anchor-name: --demo-anchor; }
        .pop-el { position-anchor: --demo-anchor; margin: 10px; }
        .pop-pos-top { position-area: top; }
        .pop-pos-bottom { position-area: bottom; }
        .pop-pos-left { position-area: left; }
        .pop-pos-right { position-area: right; }
      `}</style>

      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-4 text-sm">
        <span className="font-bold">Support:</span>
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", popoverApi ? "bg-green-500/15 text-green-600" : "bg-red-500/15 text-red-600")}>
          {popoverApi ? "popover API works here" : "popover API unsupported"}
        </span>
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", anchorApi ? "bg-green-500/15 text-green-600" : "bg-amber-500/15 text-amber-600")}>
          {anchorApi ? "CSS anchor positioning works here" : "anchor positioning unsupported, falls back to center"}
        </span>
        <span className="text-xs text-muted-foreground">
          Popovers render in the top layer: above everything, no z-index fights, no portals.
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-bold">Demo</h2>
            <div className="grid grid-cols-3 gap-2">
              {(["tooltip", "menu", "card"] as Demo[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDemo(d)}
                  className={cn(
                    "rounded-xl border px-2 py-2 text-xs font-bold capitalize transition",
                    demo === d ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40",
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-bold">Mode</h2>
            <div className="grid grid-cols-2 gap-2">
              {(["auto", "manual"] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn(
                    "rounded-xl border px-2 py-2 text-xs font-bold capitalize transition",
                    mode === m ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {mode === "auto"
                ? "Auto: closes on outside click and Escape. Only one auto popover open at a time."
                : "Manual: stays open until your code closes it. Multiple can stack."}
            </p>
            {mode === "manual" && (
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={show} className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-90">
                  showPopover()
                </button>
                <button type="button" onClick={hide} className="rounded-xl border border-border px-4 py-2 text-xs font-bold hover:border-red-400">
                  hidePopover()
                </button>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-bold">Position (anchor)</h2>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(POS_LABEL) as Position[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPosition(p)}
                  className={cn(
                    "rounded-xl border px-2 py-2 text-xs font-bold transition",
                    position === p ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40",
                  )}
                >
                  {POS_LABEL[p]}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Implemented with <code className="font-mono">position-area</code>, no JavaScript measuring.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-1 text-sm font-bold">Live demo</h2>
            <p className="mb-6 text-xs text-muted-foreground">
              Click the trigger. In auto mode, click outside or press Escape to dismiss.
            </p>
            <div className="flex min-h-[220px] flex-col items-center justify-center gap-4 rounded-xl bg-muted/30 p-8">
              {demo === "menu" ? (
                <>
                  <button
                    type="button"
                    popoverTarget={mode === "auto" ? "demo-menu" : undefined}
                    onClick={mode === "manual" ? () => menuRef.current?.showPopover() : undefined}
                    className="pop-anchor inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:opacity-90"
                  >
                    <Menu className="h-4 w-4" /> Open menu
                  </button>
                  <div
                    ref={menuRef}
                    id="demo-menu"
                    popover={mode === "auto" ? "" : "manual"}
                    className={cn("pop-el rounded-xl border border-border bg-card p-1.5 shadow-xl", `pop-pos-${position}`)}
                    role="menu"
                  >
                    {["New file", "Open", "Save as", "Export"].map((item) => (
                      <button
                        key={item}
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMenuChoice(item);
                          menuRef.current?.hidePopover();
                        }}
                        className="block w-full rounded-lg px-4 py-2 text-left text-sm font-medium hover:bg-muted"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                  {menuChoice && <p className="text-xs text-muted-foreground">You picked: <strong className="text-foreground">{menuChoice}</strong></p>}
                </>
              ) : (
                <>
                  <button
                    type="button"
                    popoverTarget={mode === "auto" ? "demo-pop" : undefined}
                    onClick={mode === "manual" ? show : undefined}
                    className="pop-anchor rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:opacity-90"
                  >
                    {mode === "auto" ? "Click me (popovertarget)" : "Click me (manual, use buttons)"}
                  </button>
                  <div
                    ref={popRef}
                    id="demo-pop"
                    popover={mode === "auto" ? "" : "manual"}
                    className={cn("pop-el w-64 rounded-xl border border-border bg-card p-4 shadow-xl", `pop-pos-${position}`)}
                  >
                    {demo === "tooltip" ? (
                      <p className="text-sm">A native tooltip. No libraries, no portals, styled with plain CSS.</p>
                    ) : (
                      <>
                        <p className="font-bold">Card title</p>
                        <p className="mt-1 text-sm text-muted-foreground">Rich content lives in the top layer, above dialogs and dropdowns.</p>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold">toggle events</h2>
              <button type="button" onClick={() => setEvents([])} className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/60">
                Clear
              </button>
            </div>
            <div className="max-h-36 space-y-1 overflow-y-auto">
              {events.length === 0 ? (
                <p className="rounded-xl bg-muted/40 p-3 text-center text-xs text-muted-foreground">Open and close the popover to see toggle events.</p>
              ) : (
                events.map((e, i) => (
                  <p key={i} className="rounded-lg bg-muted/40 px-3 py-1.5 font-mono text-xs">{e}</p>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold">Copy-ready code</h2>
          <button
            type="button"
            onClick={copy}
            disabled={!trial.canUse}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-xs font-bold transition hover:border-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy code"}
          </button>
        </div>
        <pre className="overflow-x-auto rounded-xl bg-muted/40 p-4 font-mono text-xs leading-relaxed">{code}</pre>
        {!isPro && (
          <p className="mt-3 text-xs text-muted-foreground">
            {trial.left} of {TOOL_TRIAL_LIMIT} free copies left.
          </p>
        )}
      </div>
    </ToolPageShell>
  );
}
