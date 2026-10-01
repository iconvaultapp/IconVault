// /tools/shadow-dom-explorer - Four live demos: open vs closed shadow
// roots, slots and assigned nodes, ::part() styling, and style
// encapsulation. Every demo is real DOM work with a code panel; trial
// use is recorded when code is copied.

import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/shadow-dom-explorer")({
  head: () => {
    const seo = getToolSeoMeta("shadow-dom-explorer");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: ShadowDomTool,
});

type Tab = "open-closed" | "slots" | "part" | "encapsulation";

const TABS: { id: Tab; label: string; hint: string }[] = [
  { id: "open-closed", label: "Open vs Closed", hint: "shadowRoot access" },
  { id: "slots", label: "Slots", hint: "project light DOM" },
  { id: "part", label: "::part()", hint: "style through the wall" },
  { id: "encapsulation", label: "Encapsulation", hint: "styles stay out" },
];

const CODE: Record<Tab, string> = {
  "open-closed": `const openHost = document.querySelector("#open-host");
const openRoot = openHost.attachShadow({ mode: "open" });
openRoot.innerHTML = "<p>Open shadow content</p>";

// Anyone can reach in:
console.log(openHost.shadowRoot === openRoot); // true

const closedHost = document.querySelector("#closed-host");
closedHost.attachShadow({ mode: "closed" });

// Nobody can reach in, not even this script:
console.log(closedHost.shadowRoot); // null
// Keep your own reference if you need it:
// const closedRoot = closedHost.attachShadow({ mode: "closed" });`,
  "slots": `<my-card>
  <span slot="title">Hello from the light DOM</span>
  <p>This lands in the default slot.</p>
</my-card>

<script>
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = \`
    <style>h3 { color: teal; }</style>
    <h3><slot name="title">Fallback title</slot></h3>
    <div><slot>No content provided</slot></div>\`;
  // Inspect projection:
  root.querySelector('slot[name="title"]').assignedNodes();
<\/script>`,
  "part": `<!-- shadow markup -->
<button part="btn">Buy now</button>

<!-- page stylesheet: ::part pierces encapsulation for chosen elements -->
.part-host::part(btn) {
  background: #0f766e;
  color: white;
  border-radius: 999px;
}

/* Export parts through nested shadow roots: */
/* <inner-el part="btn" exportparts="btn"> inside the shadow tree */`,
  "encapsulation": `/* page stylesheet */
.encap-scope p { color: red; font-weight: bold; }

/* This rule CANNOT reach inside a shadow root: */
.encap-scope p { color: red; }  /* light DOM <p> turns red, shadow <p> does not */

const root = host.attachShadow({ mode: "open" });
root.innerHTML = \`
  <style>p { color: inherit; }</style>
  <p>I ignore the page stylesheet.</p>\`;`,
};

function ShadowDomTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("shadow-dom-explorer", isPro);
  const seo = getToolSeo("shadow-dom-explorer");

  const [tab, setTab] = useState<Tab>("open-closed");
  const [log, setLog] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [partStyled, setPartStyled] = useState(true);
  const [encapAttached, setEncapAttached] = useState(false);

  const openHostRef = useRef<HTMLDivElement>(null);
  const closedHostRef = useRef<HTMLDivElement>(null);
  const slotHostRef = useRef<HTMLDivElement>(null);
  const partHostRef = useRef<HTMLDivElement>(null);
  const encapHostRef = useRef<HTMLDivElement>(null);

  const push = (msg: string) => setLog((prev) => [msg, ...prev].slice(0, 40));

  const demoOpenClosed = () => {
    setLog([]);
    const open = openHostRef.current;
    const closed = closedHostRef.current;
    if (!open || !closed) return;
    if (!open.shadowRoot) {
      const r = open.attachShadow({ mode: "open" });
      r.innerHTML = `<p style="margin:0;font-size:14px">Open shadow content. <b>Inspect me</b>, I am reachable.</p>`;
      push("attachShadow({ mode: 'open' }) -> shadow tree created");
    }
    push(`openHost.shadowRoot === null ? ${(open.shadowRoot as unknown) === null} (reachable from outside)`);
    if (!(closed as unknown as { __iv?: boolean }).__iv) {
      (closed as unknown as { __iv?: boolean }).__iv = true;
      const r = closed.attachShadow({ mode: "closed" });
      r.innerHTML = `<p style="margin:0;font-size:14px">Closed shadow content. Try document.querySelector on me.</p>`;
      push("attachShadow({ mode: 'closed' }) -> shadow tree created");
    }
    push(`closedHost.shadowRoot === null ? ${closed.shadowRoot === null} (sealed, even from this page's own script)`);
  };

  const demoSlots = (kind: "named" | "default" | "inspect") => {
    const host = slotHostRef.current;
    if (!host) return;
    if (!host.shadowRoot) {
      const r = host.attachShadow({ mode: "open" });
      r.innerHTML = `
        <style>
          .card { border: 1px solid #0f766e55; border-radius: 12px; padding: 12px; background: #0f766e08; }
          h3 { margin: 0 0 6px; color: #0f766e; font-size: 15px; }
        </style>
        <div class="card">
          <h3><slot name="title">Fallback title</slot></h3>
          <div><slot>No content provided</slot></div>
        </div>`;
      push("shadow tree with <slot name='title'> and a default <slot> created");
    }
    if (kind === "named") {
      const s = document.createElement("span");
      s.slot = "title";
      s.textContent = `Title ${host.querySelectorAll('[slot="title"]').length + 1} (light DOM)`;
      s.style.fontWeight = "700";
      host.appendChild(s);
      push(`appended <span slot="title"> to the light DOM -> projected into the named slot`);
    } else if (kind === "default") {
      const p = document.createElement("p");
      p.textContent = `Body paragraph ${host.querySelectorAll(":scope > p").length + 1} (light DOM)`;
      p.style.margin = "4px 0";
      p.style.fontSize = "13px";
      host.appendChild(p);
      push("appended <p> to the light DOM -> projected into the default slot");
    } else {
      const root = host.shadowRoot!;
      const named = root.querySelector('slot[name="title"]') as HTMLSlotElement;
      const def = root.querySelectorAll("slot")[1] as HTMLSlotElement;
      push(`named slot assignedNodes: [${named.assignedNodes().map((n) => (n as Element).tagName?.toLowerCase() ?? "#text").join(", ")}]`);
      push(`default slot assignedNodes: [${def.assignedNodes().map((n) => (n as Element).tagName?.toLowerCase() ?? "#text").join(", ")}]`);
      push("note: light DOM nodes never move; slots only project them");
    }
  };

  const demoPart = () => {
    const host = partHostRef.current;
    if (!host) return;
    if (!host.shadowRoot) {
      const r = host.attachShadow({ mode: "open" });
      r.innerHTML = `
        <style>
          .wrap { border: 1px solid #0f766e55; border-radius: 12px; padding: 16px; background: #0f766e08; }
          .inner-note { font-size: 12px; color: #666; margin-top: 8px; }
        </style>
        <div class="wrap">
          <button part="btn">Buy now</button>
          <p class="inner-note">The button's class is invisible to the page. Only part="btn" is styleable via ::part().</p>
        </div>`;
      push("shadow button with part='btn' created");
    }
    push(`page CSS my-card::part(btn) is ${partStyled ? "ON: the button is teal" : "OFF: the button is unstyled"}`);
  };

  const demoEncap = () => {
    const host = encapHostRef.current;
    if (!host || encapAttached) return;
    const r = host.attachShadow({ mode: "open" });
    r.innerHTML = `<p style="margin:0;font-size:14px">I live in a shadow root. The red page rule cannot touch me.</p>`;
    setEncapAttached(true);
    push("shadow <p> attached: page rule '.encap-scope p { color: red }' does not apply inside");
  };

  const copy = async () => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(CODE[tab]);
      setCopied(true);
      trial.recordUse();
      toast.success("Shadow DOM code copied");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  return (
    <ToolPageShell toolId="shadow-dom-explorer" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Shadow DOM Explorer" left={trial.left} />

      <style>{`
        .encap-scope p { color: #dc2626; font-weight: 700; }
        .part-host.styled::part(btn) { background: #0f766e; color: #fff; border: 0; border-radius: 999px; padding: 10px 24px; font-weight: 700; cursor: pointer; }
      `}</style>

      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => { setTab(t.id); setLog([]); }}
            className={cn(
              "rounded-xl border px-4 py-2.5 text-left transition",
              tab === t.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/40",
            )}
          >
            <span className={cn("block text-sm font-bold", tab === t.id && "text-primary")}>{t.label}</span>
            <span className="block text-xs text-muted-foreground">{t.hint}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-4 text-sm font-bold">Live demo: {TABS.find((t) => t.id === tab)?.label}</h2>

          {tab === "open-closed" && (
            <div className="space-y-3">
              <button type="button" onClick={demoOpenClosed} className="rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground hover:opacity-90">
                Attach both shadow roots
              </button>
              <div className="space-y-2">
                <div>
                  <p className="mb-1 font-mono text-xs text-muted-foreground">#open-host</p>
                  <div ref={openHostRef} id="open-host" className="min-h-[64px] rounded-xl border border-border bg-muted/30 p-3" />
                </div>
                <div>
                  <p className="mb-1 font-mono text-xs text-muted-foreground">#closed-host</p>
                  <div ref={closedHostRef} id="closed-host" className="min-h-[64px] rounded-xl border border-border bg-muted/30 p-3" />
                </div>
              </div>
            </div>
          )}

          {tab === "slots" && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => demoSlots("named")} className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-90">
                  Add title (slot="title")
                </button>
                <button type="button" onClick={() => demoSlots("default")} className="rounded-xl border border-border px-4 py-2 text-xs font-bold hover:border-primary/60">
                  Add body (default slot)
                </button>
                <button type="button" onClick={() => demoSlots("inspect")} className="rounded-xl border border-border px-4 py-2 text-xs font-bold hover:border-primary/60">
                  assignedNodes()
                </button>
              </div>
              <div ref={slotHostRef} className="min-h-[120px] rounded-xl border-2 border-dashed border-border p-2" />
              <p className="text-xs text-muted-foreground">The children you add stay in the light DOM (inspect them in DevTools); the slots only project them.</p>
            </div>
          )}

          {tab === "part" && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={demoPart} className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-90">
                  Attach shadow button
                </button>
                <button
                  type="button"
                  onClick={() => { setPartStyled((v) => !v); setLog((p) => [`::part() styling ${partStyled ? "disabled" : "enabled"}`, ...p]); }}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-bold hover:border-primary/60"
                >
                  Toggle ::part() style
                </button>
              </div>
              <div ref={partHostRef} className={cn("part-host rounded-xl border-2 border-dashed border-border p-4", partStyled && "styled")} />
              <p className="text-xs text-muted-foreground">
                The page rule <code className="font-mono">.part-host.styled::part(btn)</code> styles the shadow
                button. Toggle it off to see the unstyled native button: everything else about the
                shadow stays sealed.
              </p>
            </div>
          )}

          {tab === "encapsulation" && (
            <div className="space-y-3">
              <button type="button" onClick={demoEncap} disabled={encapAttached} className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50">
                Attach shadow paragraph
              </button>
              <div className="encap-scope space-y-2 rounded-xl border border-border bg-muted/30 p-4">
                <p>Light DOM paragraph: the red page rule hits me.</p>
                <div ref={encapHostRef} className="rounded-lg border border-dashed border-border p-3" />
              </div>
              <p className="text-xs text-muted-foreground">
                One stylesheet rule, two paragraphs: only the light-DOM one turns red. That boundary
                is the whole point of shadow DOM.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-bold">What happened</h2>
            <div className="max-h-56 space-y-1.5 overflow-y-auto">
              {log.length === 0 ? (
                <p className="rounded-xl bg-muted/40 p-4 text-center text-xs text-muted-foreground">Run the demo to see real DOM results.</p>
              ) : (
                log.map((l, i) => (
                  <p key={i} className="rounded-lg bg-muted/40 px-3 py-1.5 font-mono text-xs">{l}</p>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
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
            <pre className="max-h-72 overflow-auto rounded-xl bg-muted/40 p-4 font-mono text-xs leading-relaxed">{CODE[tab]}</pre>
            {!isPro && (
              <p className="mt-3 text-xs text-muted-foreground">
                {trial.left} of {TOOL_TRIAL_LIMIT} free copies left.
              </p>
            )}
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
