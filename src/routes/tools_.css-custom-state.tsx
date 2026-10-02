// /tools/css-custom-state - The :state() pseudo-class with CustomStateSet:
// style custom-element states without class hacks. Live demo of a form
// control with --on, --invalid and --loading states.
// Free, client-side only. Real :state() when supported, class simulation otherwise.

import { createElement, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Info, Power, TriangleAlert, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/css-custom-state")({
  head: () => {
    const seo = getToolSeoMeta("css-custom-state");
    const canonical = "https://iconvault.site/tools/css-custom-state";
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
  component: CustomStateTool,
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

const STATE_CSS = `/* Custom element states, styled like native pseudo-classes */

demo-toggle { display: block; }

/* The switch track */
demo-toggle .track {
  width: 56px; height: 30px; border-radius: 999px;
  background: #cbd5e1; transition: background 0.2s;
  position: relative;
}
demo-toggle .knob {
  position: absolute; top: 3px; left: 3px;
  width: 24px; height: 24px; border-radius: 999px;
  background: white; transition: left 0.2s;
}

/* Custom states drive the styling: no .on classes needed */
demo-toggle:state(--on) .track { background: #0d9488; }
demo-toggle:state(--on) .knob { left: 29px; }

demo-toggle:state(--invalid) { outline: 2px solid #ef4444; outline-offset: 4px; border-radius: 8px; }
demo-toggle:state(--loading) .knob { animation: spin 1s linear infinite; }

@keyframes spin { to { transform: rotate(360deg); } }`;

const ELEMENT_JS = `class DemoToggle extends HTMLElement {
  static formAssociated = true;
  #internals = this.attachInternals();

  setState(name, on) {
    on ? this.#internals.states.add(name)
       : this.#internals.states.delete(name);
  }

  connectedCallback() {
    this.addEventListener("click", () =>
      this.setState("--on", !this.#internals.states.has("--on")));
  }
}
customElements.define("demo-toggle", DemoToggle);`;

type StateKey = "--on" | "--invalid" | "--loading";

function CustomStateTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("css-custom-state", isPro);
  const seo = getToolSeo("css-custom-state");

  const [supported, setSupported] = useState<boolean | null>(null);
  const [states, setStates] = useState<Record<StateKey, boolean>>({ "--on": false, "--invalid": false, "--loading": false });
  const elRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    try {
      setSupported(typeof CSS !== "undefined" && CSS.supports("selector(:state(--demo))"));
    } catch {
      setSupported(false);
    }
    if (typeof customElements !== "undefined" && !customElements.get("demo-toggle")) {
      class DemoToggle extends HTMLElement {
        static formAssociated = true;
        #internals: ElementInternals | null = null;
        constructor() {
          super();
          try {
            this.#internals = this.attachInternals();
          } catch {
            this.#internals = null;
          }
        }
        setCustomState(name: string, on: boolean) {
          if (!this.#internals) return;
          if (on) this.#internals.states.add(name);
          else this.#internals.states.delete(name);
        }
      }
      customElements.define("demo-toggle", DemoToggle);
    }
  }, []);

  // Sync React state into the element's CustomStateSet (or classes as fallback).
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    if (supported) {
      const anyEl = el as unknown as { setCustomState?: (n: string, on: boolean) => void };
      (Object.keys(states) as StateKey[]).forEach((k) => anyEl.setCustomState?.(k, states[k]));
    } else {
      el.classList.toggle("is-on", states["--on"]);
      el.classList.toggle("is-invalid", states["--invalid"]);
      el.classList.toggle("is-loading", states["--loading"]);
    }
  }, [states, supported]);

  const toggle = (k: StateKey) => setStates((s) => ({ ...s, [k]: !s[k] }));

  const code = useMemo(() => `${ELEMENT_JS}\n\n${STATE_CSS}`, []);
  const copy = async () => {
    if (!trial.canUse) return;
    if (await copyText(code)) trial.recordUse();
  };

  const fallbackCss = `
    .fallback-toggle .track { width:56px; height:30px; border-radius:999px; background:#cbd5e1; position:relative; transition:background .2s; }
    .fallback-toggle .knob { position:absolute; top:3px; left:3px; width:24px; height:24px; border-radius:999px; background:#fff; transition:left .2s; }
    .fallback-toggle.is-on .track { background:#0d9488; }
    .fallback-toggle.is-on .knob { left:29px; }
    .fallback-toggle.is-invalid { outline:2px solid #ef4444; outline-offset:4px; border-radius:8px; display:block; }
    .fallback-toggle.is-loading .knob { animation: spin 1s linear infinite; }
  `;

  return (
    <ToolPageShell toolId="css-custom-state" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="CSS Custom State" left={trial.left} />
      <style>{supported ? STATE_CSS : fallbackCss}</style>

      {supported === false && (
        <div className="mb-6 flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">Your browser does not support :state() yet.</span> The demo
            is simulated with classes so you can still explore the idea. :state() needs Chrome 133+ or a very recent
            Firefox. The code below is the real syntax.
          </p>
        </div>
      )}
      {supported === true && (
        <div className="mb-6 flex gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">Your browser supports :state().</span> The switch below is a
            real custom element and its CustomStateSet drives the CSS. Inspect it in DevTools.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <p className="text-sm font-bold">Toggle custom states</p>
          {[
            { key: "--on" as StateKey, label: "Power on", icon: <Power className="h-4 w-4" />, hint: "colors the track teal" },
            { key: "--invalid" as StateKey, label: "Invalid", icon: <TriangleAlert className="h-4 w-4" />, hint: "red error outline" },
            { key: "--loading" as StateKey, label: "Loading", icon: <Loader2 className="h-4 w-4" />, hint: "spinning knob" },
          ].map((b) => (
            <button
              key={b.key}
              type="button"
              onClick={() => toggle(b.key)}
              className={cn(
                "flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-semibold transition",
                states[b.key]
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-foreground hover:border-primary/40",
              )}
            >
              <span className="flex items-center gap-2">{b.icon} {b.label}</span>
              <span className="font-mono text-xs text-muted-foreground">:state({b.key})</span>
            </button>
          ))}
          <p className="text-xs leading-relaxed text-muted-foreground">
            Each toggle calls <span className="font-mono">internals.states.add()</span> on the element. CSS reads them
            with <span className="font-mono">:state()</span>, exactly like <span className="font-mono">:checked</span> or{" "}
            <span className="font-mono">:disabled</span> on native inputs.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-4 text-sm font-semibold">Live demo: a custom switch</p>
          <div className="flex min-h-[240px] flex-col items-center justify-center gap-6 rounded-xl border border-border bg-background p-8">
            {createElement("demo-toggle", {
              ref: (el: HTMLElement | null) => {
                elRef.current = el;
              },
              className: supported === false ? "fallback-toggle" : undefined,
              children: [
                createElement("div", { key: "t", className: "track" }, createElement("div", { key: "k", className: "knob" })),
              ],
            })}
            <div className="flex flex-wrap justify-center gap-2">
              {(Object.keys(states) as StateKey[]).map((k) => (
                <span
                  key={k}
                  className={cn(
                    "rounded-full px-3 py-1 font-mono text-xs font-bold",
                    states[k] ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                  )}
                >
                  {k} {states[k] ? "on" : "off"}
                </span>
              ))}
            </div>
            <p className="max-w-md text-center text-xs text-muted-foreground">
              Clicking the switch itself toggles --on too (wired in connectedCallback). Compare with the class-hack
              era: no more <span className="font-mono">.is-on</span> leaking into your HTML.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-extrabold">Copy the code</h2>
          <ActionButton disabled={!trial.canUse} onClick={copy}>
            <Copy className="h-4 w-4" /> Copy code
          </ActionButton>
        </div>
        <pre className="overflow-x-auto whitespace-pre rounded-xl bg-muted/60 p-4 font-mono text-xs leading-relaxed">{code}</pre>
        {!isPro && <p className="mt-2 text-xs text-muted-foreground">{trial.left} of 5 free copies left.</p>}
      </div>
    </ToolPageShell>
  );
}
