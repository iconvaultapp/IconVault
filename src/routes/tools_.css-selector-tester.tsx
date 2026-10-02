// /tools/css-selector-tester - Type a selector, see live matches on a sample DOM
// with highlighting, match count, and a specificity calculator. 100% in-browser.

import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Crosshair, Eraser, Play } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/css-selector-tester")({
  head: () => {
    const seo = getToolSeoMeta("css-selector-tester");
    const canonical = "https://iconvault.site/tools/css-selector-tester";
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
  component: SelectorTester,
});

/** Rough but honest specificity counter: (ids, classes/attrs/pseudo-classes, elements/pseudo-elements). */
function specificity(sel: string): { a: number; b: number; c: number } {
  const ids = (sel.match(/#[\w-]+/g) || []).length;
  const classes = (sel.match(/\.[\w-]+/g) || []).length;
  const attrs = (sel.match(/\[[^\]]+\]/g) || []).length;
  const pseudoEls = (sel.match(/::[\w-]+/g) || []).length;
  const noPseudoEl = sel.replace(/::[\w-]+/g, " ");
  const pseudoClasses = (noPseudoEl.match(/:[\w-]+(\([^)]*\))?/g) || []).length;
  const stripped = sel
    .replace(/#[\w-]+/g, " ")
    .replace(/\.[\w-]+/g, " ")
    .replace(/\[[^\]]+\]/g, " ")
    .replace(/::?[\w-]+(\([^)]*\))?/g, " ")
    .replace(/[>+~]/g, " ");
  const elements = stripped.split(/\s+/).filter((t) => t !== "" && t !== "*" && /^[a-zA-Z]/.test(t)).length;
  return { a: ids, b: classes + attrs + pseudoClasses, c: elements + pseudoEls };
}

function describe(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : "";
  const cls = el.className && typeof el.className === "string" ? `.${el.className.trim().split(/\s+/).slice(0, 2).join(".")}` : "";
  return `${tag}${id}${cls}`;
}

const PRESETS = [
  ".item",
  "#title",
  "ul > li:first-child",
  "input[type=\"checkbox\"]",
  "[data-stock=\"0\"]",
  ".btn.primary",
  "section.hero p",
  "li:nth-child(2n)",
];

function SelectorTester() {
  const { isPro } = usePlan();
  const trial = useToolTrial("css-selector-tester", isPro);
  const seo = getToolSeo("css-selector-tester");

  const [selector, setSelector] = useState(".item");
  const [matches, setMatches] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ran, setRan] = useState(false);
  const domRef = useRef<HTMLDivElement>(null);

  const spec = useMemo(() => specificity(selector), [selector]);
  const specScore = spec.a * 100 + spec.b * 10 + spec.c;

  const clearMarks = () => {
    domRef.current?.querySelectorAll(".sv-match").forEach((el) => el.classList.remove("sv-match"));
  };

  const test = () => {
    if (!trial.canUse || !domRef.current) return;
    clearMarks();
    setError(null);
    setRan(false);
    try {
      const found = domRef.current.querySelectorAll(selector);
      found.forEach((el) => el.classList.add("sv-match"));
      setMatches(Array.from(found).slice(0, 12).map(describe));
      setRan(true);
      trial.recordUse();
      toast.success(`${found.length} match${found.length === 1 ? "" : "es"} found`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid selector");
      setMatches([]);
    }
  };

  const clear = () => {
    clearMarks();
    setMatches([]);
    setRan(false);
    setError(null);
  };

  return (
    <ToolPageShell toolId="css-selector-tester" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="CSS Selector Tester" left={trial.left} />
      <style>{`.sv-match { outline: 3px solid #0d9488 !important; outline-offset: 2px; border-radius: 4px; }`}</style>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* Controls */}
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <label className="mb-2 block text-[13px] font-medium text-foreground/80" htmlFor="sel-input">CSS selector</label>
            <input
              id="sel-input"
              value={selector}
              onChange={(e) => setSelector(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") test(); }}
              spellCheck={false}
              placeholder="e.g. ul > li:first-child"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton onClick={test} disabled={!trial.canUse || selector.trim() === ""}>
              <Play className="h-4 w-4" /> Test selector
            </ActionButton>
            <button type="button" onClick={clear} className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-bold transition hover:border-primary/50">
              <Eraser className="h-4 w-4" /> Clear
            </button>
          </div>
          {!isPro && <p className="text-xs text-muted-foreground">{trial.left} of {TOOL_TRIAL_LIMIT} free tests left.</p>}

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Try these</p>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button key={p} type="button" onClick={() => setSelector(p)}
                  className="rounded-lg border border-border px-2.5 py-1.5 font-mono text-xs text-muted-foreground transition hover:border-primary/50 hover:text-foreground">{p}</button>
              ))}
            </div>
          </div>

          {/* Specificity */}
          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <Crosshair className="h-3.5 w-3.5" /> Specificity
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-1 font-mono text-lg font-bold">
                <span className="rounded bg-red-500/15 px-2 py-0.5 text-red-600 dark:text-red-400" title="ID selectors">{spec.a}</span>
                <span className="rounded bg-amber-500/15 px-2 py-0.5 text-amber-600 dark:text-amber-400" title="Classes, attributes, pseudo-classes">{spec.b}</span>
                <span className="rounded bg-sky-500/15 px-2 py-0.5 text-sky-600 dark:text-sky-400" title="Elements, pseudo-elements">{spec.c}</span>
              </div>
              <span className="text-sm text-muted-foreground">= {specScore} points</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">A: IDs, B: classes/attributes/pseudo-classes, C: elements/pseudo-elements. Approximation: selectors inside :not() are counted per the outer list.</p>
          </div>

          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
          {ran && !error && (
            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <p className="text-sm font-bold">{matches.length} match{matches.length === 1 ? "" : "es"}{matches.length >= 12 ? " (first 12 shown)" : ""}</p>
              {matches.length > 0 ? (
                <ul className="mt-2 space-y-1">{matches.map((m, i) => <li key={i} className="font-mono text-xs text-muted-foreground">{m}</li>)}</ul>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">Valid selector, but nothing in the sample DOM matches it.</p>
              )}
            </div>
          )}
        </div>

        {/* Sample DOM */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Sample document (matches get a teal outline)</p>
          <div ref={domRef} className="space-y-4 rounded-xl border border-border p-5 text-sm">
            <header className="site-header rounded-lg bg-muted/40 p-3">
              <nav className="nav flex gap-4">
                <a className="link active font-bold text-primary" href="#x">Home</a>
                <a className="link" href="#x">Docs</a>
                <a className="link" href="#x">Pricing</a>
              </nav>
            </header>
            <section className="hero rounded-lg bg-muted/40 p-4" data-theme="dark">
              <h1 id="title" className="text-xl font-extrabold">Sample heading</h1>
              <p className="lead mt-1 text-muted-foreground">A lead paragraph inside the hero section.</p>
              <p className="mt-1">A second paragraph for sibling tests.</p>
            </section>
            <ul className="items space-y-1 rounded-lg bg-muted/40 p-3">
              <li className="item rounded bg-background px-2 py-1">Item one</li>
              <li className="item featured rounded bg-background px-2 py-1 font-bold">Item two (featured)</li>
              <li className="item rounded bg-background px-2 py-1" data-stock="0">Item three (out of stock)</li>
              <li className="item rounded bg-background px-2 py-1">Item four</li>
            </ul>
            <form className="rounded-lg bg-muted/40 p-3" onSubmit={(e) => e.preventDefault()}>
              <div className="flex flex-wrap items-center gap-3">
                <input type="text" name="email" placeholder="Email" className="rounded-lg border border-border bg-background px-3 py-1.5" />
                <label className="flex items-center gap-2"><input type="checkbox" defaultChecked /> Remember me</label>
                <button type="button" className="btn primary rounded-lg bg-primary px-4 py-1.5 font-bold text-primary-foreground">Sign up</button>
              </div>
            </form>
            <footer className="rounded-lg bg-muted/40 p-3 text-muted-foreground">Footer with <a className="link" href="#x">a link</a>.</footer>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
