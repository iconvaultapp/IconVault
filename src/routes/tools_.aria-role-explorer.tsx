// /tools/aria-role-explorer - Searchable ARIA roles taxonomy: what each role means,
// required context, keyboard expectations, and a copyable HTML pattern. In-browser.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, Copy, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/aria-role-explorer";
import toolSeoMeta from "@/lib/tool-seo-meta-data/aria-role-explorer";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/aria-role-explorer")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/aria-role-explorer";
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
  component: AriaExplorer,
});

type Role = { role: string; group: "Landmark" | "Widget" | "Structure"; desc: string; keyboard: string; context: string; example: string };

const ROLES: Role[] = [
  { role: "banner", group: "Landmark", desc: "Site-level header content, not the page article header. One per page.", keyboard: "No specific keys. Landmarks are reached with screen-reader navigation shortcuts.", context: "Must be a top-level landmark; do not nest inside another landmark.", example: `<header role="banner">\n  <a href="/">Acme</a>\n  <nav aria-label="Primary">…</nav>\n</header>` },
  { role: "navigation", group: "Landmark", desc: "A group of navigational links. Label each nav when there is more than one.", keyboard: "Tab moves through links. Screen readers jump with the nav landmark shortcut.", context: "Use aria-label or aria-labelledby when multiple navigation landmarks exist.", example: `<nav role="navigation" aria-label="Primary">\n  <ul><li><a href="/docs">Docs</a></li></ul>\n</nav>` },
  { role: "main", group: "Landmark", desc: "The primary content of the document. Exactly one per page.", keyboard: "Screen readers jump straight here with the main-landmark shortcut.", context: "Do not nest inside other landmarks.", example: `<main role="main" id="main">\n  <h1>Page title</h1>\n  …\n</main>` },
  { role: "complementary", group: "Landmark", desc: "Supporting content like a sidebar, related to but separate from the main content.", keyboard: "Reached via landmark navigation.", context: "Label it if more than one exists on the page.", example: `<aside role="complementary" aria-label="Related articles">…</aside>` },
  { role: "contentinfo", group: "Landmark", desc: "Site footer: copyright, legal links, contact info.", keyboard: "Reached via landmark navigation.", context: "One per page, at top level.", example: `<footer role="contentinfo">© 2026 Acme</footer>` },
  { role: "search", group: "Landmark", desc: "A search widget. Prefer the native search landmark where possible.", keyboard: "Tab into the field, type, Enter submits.", context: "Contains a search input; label it if several search boxes exist.", example: `<div role="search">\n  <label for="q">Search</label>\n  <input id="q" type="search">\n</div>` },
  { role: "form", group: "Landmark", desc: "A form region that is important enough to be a landmark. Needs an accessible name.", keyboard: "Tab through fields; Enter submits.", context: "Requires aria-label or aria-labelledby to be exposed as a landmark.", example: `<form role="form" aria-label="Newsletter signup">…</form>` },
  { role: "region", group: "Landmark", desc: "A generic landmark for a significant, labelled section of the page.", keyboard: "Reached via landmark navigation.", context: "Requires an accessible name; otherwise use a plain section.", example: `<section role="region" aria-label="Weather">…</section>` },
  { role: "button", group: "Widget", desc: "Something clickable that triggers an action. Prefer the native button element.", keyboard: "Enter or Space activates. Space fires on key-up.", context: "If it navigates instead of acting, use a link. Give it an accessible name.", example: `<button type="button" aria-pressed="false">\n  Mute\n</button>` },
  { role: "checkbox", group: "Widget", desc: "A two- or three-state toggle. Native input[type=checkbox] already has this role.", keyboard: "Space toggles. aria-checked can be true, false, or mixed.", context: "Owned or labelled; expose its state with aria-checked.", example: `<div role="checkbox" aria-checked="false" tabindex="0">\n  Email me updates\n</div>` },
  { role: "switch", group: "Widget", desc: "An on/off toggle, like a checkbox but for immediate-effect settings.", keyboard: "Space or Enter toggles.", context: "State via aria-checked, just like a checkbox.", example: `<button role="switch" aria-checked="true">\n  Dark mode\n</button>` },
  { role: "dialog", group: "Widget", desc: "A modal or non-modal window over the page. Modal dialogs trap focus.", keyboard: "Escape closes. Tab cycles inside a modal dialog.", context: "Needs an accessible name; modal ones set aria-modal=true and trap focus.", example: `<div role="dialog" aria-modal="true" aria-labelledby="d-title">\n  <h2 id="d-title">Confirm</h2>…\n</div>` },
  { role: "alertdialog", group: "Widget", desc: "A modal dialog for urgent messages that need a response.", keyboard: "Escape closes if dismissable. Focus moves to it on open.", context: "Use for destructive confirmations, not for plain notifications.", example: `<div role="alertdialog" aria-modal="true" aria-labelledby="a-t" aria-describedby="a-d">…</div>` },
  { role: "textbox", group: "Widget", desc: "A single- or multi-line text field. Native input/textarea already have this role.", keyboard: "Type, arrows move the caret, standard editing keys.", context: "Always pair with a visible label.", example: `<label for="n">Name</label>\n<input id="n" type="text" role="textbox">` },
  { role: "combobox", group: "Widget", desc: "A text input with a popup listbox of suggestions.", keyboard: "Arrows move through suggestions, Enter picks, Escape closes the popup.", context: "Requires aria-expanded and aria-controls pointing at the listbox.", example: `<input role="combobox" aria-expanded="false"\n  aria-controls="suggest" aria-autocomplete="list">` },
  { role: "listbox", group: "Widget", desc: "A list of selectable options, like a custom select.", keyboard: "Arrows move, Space or Enter selects, type-ahead jumps by letter.", context: "Options use role=option with aria-selected.", example: `<ul role="listbox" aria-label="Country">\n  <li role="option" aria-selected="true">India</li>\n</ul>` },
  { role: "slider", group: "Widget", desc: "A value picker along a range. Native input[type=range] already has this role.", keyboard: "Arrows step, Home/End jump to min/max, PageUp/PageDown for large steps.", context: "Expose value with aria-valuenow (plus min/max/text).", example: `<div role="slider" tabindex="0" aria-valuenow="40"\n  aria-valuemin="0" aria-valuemax="100">Volume</div>` },
  { role: "progressbar", group: "Widget", desc: "Shows progress of a task. Read-only, not interactive.", keyboard: "Not focusable; screen readers announce value changes politely.", context: "Set aria-valuenow, or omit it for an indeterminate bar.", example: `<div role="progressbar" aria-valuenow="65"\n  aria-valuemin="0" aria-valuemax="100">Uploading…</div>` },
  { role: "tablist / tab / tabpanel", group: "Widget", desc: "Tabbed interface: tabs switch visible panels.", keyboard: "Arrows move between tabs (automatic or manual activation), Home/End jump.", context: "tab needs aria-selected and aria-controls; panels need aria-labelledby.", example: `<div role="tablist" aria-label="Settings">\n  <button role="tab" aria-selected="true" aria-controls="p1">General</button>\n</div>\n<div role="tabpanel" id="p1">…</div>` },
  { role: "menu / menuitem", group: "Widget", desc: "An application-style menu (not site navigation).", keyboard: "Arrows move, Enter activates, Escape closes, first-letter jumps.", context: "menuitem can have aria-haspopup for submenus; disabled items use aria-disabled.", example: `<ul role="menu" aria-label="File">\n  <li role="menuitem">New</li>\n  <li role="menuitem" aria-disabled="true">Save</li>\n</ul>` },
  { role: "tooltip", group: "Widget", desc: "Extra info shown on hover or focus of another element.", keyboard: "Escape dismisses. Focus on the trigger should reveal it.", context: "Trigger references it with aria-describedby.", example: `<button aria-describedby="tip">Save</button>\n<div role="tooltip" id="tip">Saves to your library</div>` },
  { role: "status", group: "Widget", desc: "A polite live region for status messages like save confirmations.", keyboard: "Not focusable; announced when content changes.", context: "Do not move focus here; keep messages short.", example: `<div role="status">Draft saved</div>` },
  { role: "alert", group: "Widget", desc: "An assertive live region for urgent messages like form errors.", keyboard: "Not focusable; announced immediately, interrupting speech.", context: "Use sparingly; overuse trains users to ignore it.", example: `<div role="alert">Email address is invalid</div>` },
  { role: "heading", group: "Structure", desc: "A section heading. Prefer native h1-h6.", keyboard: "Screen readers jump between headings with the H key.", context: "Set aria-level when not using a native heading element.", example: `<div role="heading" aria-level="2">Results</div>` },
  { role: "list / listitem", group: "Structure", desc: "A group of related items. Native ul/ol/li already have these roles.", keyboard: "No special keys; screen readers announce list size.", context: "listitem must be owned by a list.", example: `<div role="list">\n  <div role="listitem">First</div>\n</div>` },
  { role: "table / row / cell", group: "Structure", desc: "Tabular data. Native table elements already have these roles.", keyboard: "Screen readers navigate cells with table shortcuts.", context: "Use columnheader/rowheader for headers so cells are announced with context.", example: `<div role="table" aria-label="Prices">\n  <div role="row"><div role="columnheader">Plan</div></div>\n</div>` },
  { role: "img", group: "Structure", desc: "An image or image group. Native img with alt already has this role.", keyboard: "Not interactive; alt text is announced.", context: "Give it an accessible name (alt or aria-label); empty alt hides decorative images.", example: `<div role="img" aria-label="Bar chart of sales">…svg…</div>` },
  { role: "separator", group: "Structure", desc: "A divider between sections. Can be focusable as a resize handle.", keyboard: "If focusable (a splitter), arrows resize.", context: "Use hr natively for a simple thematic break.", example: `<hr role="separator">` },
];

const GROUPS = ["All", "Landmark", "Widget", "Structure"] as const;

function AriaExplorer() {
  const { isPro } = usePlan();
  const trial = useToolTrial("aria-role-explorer", isPro);
  const seo = toolSeo;

  const [q, setQ] = useState("");
  const [group, setGroup] = useState<(typeof GROUPS)[number]>("All");
  const [open, setOpen] = useState<string | null>("button");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return ROLES.filter((r) =>
      (group === "All" || r.group === group) &&
      (needle === "" || r.role.toLowerCase().includes(needle) || r.desc.toLowerCase().includes(needle)),
    );
  }, [q, group]);

  const copyExample = (r: Role) => {
    if (!trial.canUse) return;
    void navigator.clipboard.writeText(r.example);
    trial.recordUse();
    toast.success(`Pattern for role="${r.role.split(" ")[0]}" copied`);
  };

  return (
    <ToolPageShell toolId="aria-role-explorer" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="ARIA Role Explorer" left={trial.left} />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search roles, e.g. dialog, switch, live region…"
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm" />
        </div>
        <div className="flex gap-2">
          {GROUPS.map((g) => (
            <button key={g} type="button" onClick={() => setGroup(g)}
              className={cn("rounded-xl border px-4 py-2.5 text-sm font-bold transition",
                group === g ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40")}>{g}</button>
          ))}
        </div>
      </div>
      {!isPro && <p className="mb-4 text-xs text-muted-foreground">{trial.left} of {TOOL_TRIAL_LIMIT} free pattern copies left.</p>}

      <div className="space-y-3">
        {filtered.length === 0 && <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">No roles match that search.</p>}
        {filtered.map((r) => {
          const isOpen = open === r.role;
          return (
            <div key={r.role} className="overflow-hidden rounded-2xl border border-border bg-card">
              <button type="button" onClick={() => setOpen(isOpen ? null : r.role)} className="flex w-full items-center gap-3 p-4 text-left">
                <code className="rounded-lg bg-primary/10 px-2.5 py-1 font-mono text-sm font-bold text-primary">role="{r.role.split(" ")[0]}"</code>
                <span className="hidden rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold text-muted-foreground sm:inline">{r.group}</span>
                <span className="flex-1 truncate text-sm text-muted-foreground">{r.desc}</span>
                <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition", isOpen && "rotate-180")} />
              </button>
              {isOpen && (
                <div className="grid gap-4 border-t border-border p-4 md:grid-cols-2">
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">Keyboard expectations</p>
                      <p className="text-foreground/90">{r.keyboard}</p>
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">Required context</p>
                      <p className="text-foreground/90">{r.context}</p>
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">HTML pattern</p>
                      <button type="button" onClick={() => copyExample(r)} disabled={!trial.canUse}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold transition hover:border-primary/50 disabled:opacity-50">
                        <Copy className="h-3.5 w-3.5" /> Copy
                      </button>
                    </div>
                    <pre className="overflow-x-auto rounded-xl bg-muted/60 p-3 font-mono text-xs leading-relaxed">{r.example}</pre>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ToolPageShell>
  );
}
