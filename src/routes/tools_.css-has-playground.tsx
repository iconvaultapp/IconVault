// /tools/css-has-playground - Interactive :has() demos with editable selectors,
// live match counts and copyable snippets. 100% client-side; trial use is
// recorded when a snippet is copied.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/css-has-playground")({
  head: () => {
    const seo = getToolSeoMeta("css-has-playground");
    const canonical = "https://iconvault.site/tools/css-has-playground";
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
  component: HasPlaygroundTool,
});

type Demo = {
  id: string;
  title: string;
  blurb: string;
  defaultSelector: string;
  snippet: string;
  markup: React.ReactNode;
};

function useSupportBadge() {
  return useMemo(
    () => typeof CSS !== "undefined" && CSS.supports("selector(:has(*))"),
    [],
  );
}

function countMatches(selector: string): { count: number; error: string | null } {
  try {
    return { count: document.querySelectorAll(selector).length, error: null };
  } catch {
    return { count: 0, error: "Invalid selector" };
  }
}

function DemoCard({ demo, trial }: { demo: Demo; trial: ReturnType<typeof useToolTrial> }) {
  const [selector, setSelector] = useState(demo.defaultSelector);
  const [copied, setCopied] = useState(false);
  const { count, error } = useMemo(() => countMatches(selector), [selector]);

  const copy = async () => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(demo.snippet.replace("SELECTOR", selector));
      setCopied(true);
      trial.recordUse();
      toast.success("Snippet copied to clipboard");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold">{demo.title}</h2>
        <span
          className={
            error
              ? "rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-bold text-red-500"
              : "rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary"
          }
        >
          {error ?? `${count} match${count === 1 ? "" : "es"}`}
        </span>
      </div>
      <p className="mb-4 text-xs leading-relaxed text-muted-foreground">{demo.blurb}</p>

      <div className="mb-4 rounded-xl bg-muted/40 p-5">
        {!error && <style>{`${selector} { outline: 3px solid #0f766e; outline-offset: 3px; border-radius: 8px; }`}</style>}
        {demo.markup}
      </div>

      <label className="mb-3 block">
        <span className="mb-1.5 block text-[13px] font-medium text-foreground/80">Try your own selector</span>
        <input
          value={selector}
          onChange={(e) => setSelector(e.target.value)}
          spellCheck={false}
          placeholder="e.g. .card:has(img)"
          className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-xs focus:border-primary focus:outline-none"
        />
      </label>

      <button
        type="button"
        onClick={copy}
        disabled={!trial.canUse}
        className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-xs font-bold transition hover:border-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied" : "Copy snippet"}
      </button>
    </div>
  );
}

function HasPlaygroundTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("css-has-playground", isPro);
  const seo = getToolSeo("css-has-playground");
  const supported = useSupportBadge();
  const [activeLink, setActiveLink] = useState(1);

  const demos: Demo[] = [
    {
      id: "card",
      title: "1. Card with an image",
      blurb: "Style a card differently when it contains an image, no extra class needed on the card.",
      defaultSelector: ".has-card:has(img)",
      snippet: `/* Highlight cards that contain an image */\nSELECTOR {\n  border-color: #0f766e;\n  box-shadow: 0 12px 32px rgba(15, 118, 110, 0.15);\n}`,
      markup: (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="has-card rounded-xl border border-border bg-card p-4">
            <div className="mb-2 h-20 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-700" role="img" aria-label="Sample image" />
            <p className="text-sm font-bold">Card with image</p>
            <p className="text-xs text-muted-foreground">Matches :has(img)</p>
          </div>
          <div className="has-card rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-bold">Card without image</p>
            <p className="text-xs text-muted-foreground">No match, no highlight</p>
          </div>
        </div>
      ),
    },
    {
      id: "form",
      title: "2. Form validation state",
      blurb: "React to a child's state from the parent: highlight the whole form while any field is invalid. Type a bad email to see it.",
      defaultSelector: ".has-form:has(input:invalid)",
      snippet: `/* Warn on the form while any field is invalid */\nSELECTOR {\n  border-color: #ef4444;\n  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);\n}`,
      markup: (
        <form className="has-form rounded-xl border border-border bg-card p-4" onSubmit={(e) => e.preventDefault()}>
          <label className="mb-2 block text-xs font-bold">Email</label>
          <input
            type="email"
            required
            placeholder="you@example.com"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
          <p className="mt-2 text-xs text-muted-foreground">Clear the field or type an invalid email: the form lights up red.</p>
        </form>
      ),
    },
    {
      id: "nav",
      title: "3. Nav with an active link",
      blurb: "Give the nav bar a distinct look only when one of its links is active. Click the links to toggle.",
      defaultSelector: ".has-nav:has(a.has-active)",
      snippet: `/* Style the nav only when it holds the active link */\nSELECTOR {\n  background: #0f766e;\n}\nSELECTOR a.has-active {\n  color: #fff;\n}`,
      markup: (
        <nav className="has-nav flex gap-1 rounded-xl bg-muted/70 p-2">
          {["Home", "Tools", "Pricing"].map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => setActiveLink(i)}
              className={
                activeLink === i
                  ? "has-active rounded-lg px-4 py-2 text-xs font-bold text-primary"
                  : "rounded-lg px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground"
              }
            >
              {label}
            </button>
          ))}
        </nav>
      ),
    },
    {
      id: "grid",
      title: "4. Grid with a featured item",
      blurb: "Change the whole grid layout when it contains a featured item, without JavaScript.",
      defaultSelector: ".has-grid:has(.has-featured)",
      snippet: `/* Two-column grid only when a featured item exists */\nSELECTOR {\n  grid-template-columns: 2fr 1fr;\n}\nSELECTOR .has-featured {\n  background: #0f766e;\n  color: #fff;\n}`,
      markup: (
        <div className="has-grid grid grid-cols-3 gap-2">
          <div className="has-featured rounded-lg border border-border bg-card p-3 text-xs font-bold">Featured</div>
          <div className="rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground">Item</div>
          <div className="rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground">Item</div>
        </div>
      ),
    },
  ];

  return (
    <ToolPageShell toolId="css-has-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName=":has() Playground" left={trial.left} />

      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-4 text-sm">
        <FlaskConical className="h-4 w-4 text-primary" />
        <span className="font-semibold">Browser support:</span>
        <span
          className={
            supported
              ? "rounded-full bg-green-500/15 px-2.5 py-0.5 text-xs font-bold text-green-600"
              : "rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-600"
          }
        >
          {supported ? ":has() works in this browser" : ":has() not supported here"}
        </span>
        <span className="text-xs text-muted-foreground">
          :has() ships in Chrome 105+, Edge 105+, Safari 15.4+ and Firefox 121+. Edit any selector
          below and watch the live result update.
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {demos.map((d) => (
          <DemoCard key={d.id} demo={d} trial={trial} />
        ))}
      </div>

      {!isPro && (
        <p className="mt-5 text-xs text-muted-foreground">
          {trial.left} of {TOOL_TRIAL_LIMIT} free snippet copies left.
        </p>
      )}
    </ToolPageShell>
  );
}
