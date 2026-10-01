// /tools/aria-reference - Searchable ARIA roles and attributes reference.
// Built-in dataset: role -> required/supported attributes + examples, copy snippet.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/aria-reference")({
  head: () => {
    const seo = getToolSeoMeta("aria-reference");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: AriaTool,
});

interface AriaRole {
  name: string;
  description: string;
  required: string[];
  supported: string[];
  example: string;
}

const ROLES: AriaRole[] = [
  {
    name: "button", description: "Clickable control that performs an action.",
    required: ["aria-label or visible text"], supported: ["aria-expanded", "aria-pressed", "aria-disabled", "aria-describedby", "aria-keyshortcuts"],
    example: `<button aria-label="Close dialog">\u00D7</button>`,
  },
  {
    name: "link", description: "Interactive reference to a resource.",
    required: ["aria-label or visible text"], supported: ["aria-disabled", "aria-expanded", "aria-haspopup", "aria-describedby"],
    example: `<a href="/docs" aria-label="Read the docs">Docs</a>`,
  },
  {
    name: "checkbox", description: "Checkable control with checked/unchecked state.",
    required: ["aria-checked", "aria-label or visible text"], supported: ["aria-required", "aria-describedby", "aria-errormessage"],
    example: `<div role="checkbox" aria-checked="false" tabindex="0">Subscribe</div>`,
  },
  {
    name: "radio", description: "Checkable control in a set where only one can be checked.",
    required: ["aria-checked", "aria-label or visible text"], supported: ["aria-required", "aria-describedby", "aria-posinset", "aria-setsize"],
    example: `<div role="radio" aria-checked="true" tabindex="0">Yes</div>`,
  },
  {
    name: "switch", description: "On/off control; use instead of checkbox for on/off semantics.",
    required: ["aria-checked", "aria-label or visible text"], supported: ["aria-required", "aria-describedby"],
    example: `<div role="switch" aria-checked="false" tabindex="0">Notifications</div>`,
  },
  {
    name: "tab", description: "Grouping label providing a mechanism for selecting tab content.",
    required: ["aria-selected", "aria-label or visible text"], supported: ["aria-controls", "aria-describedby", "aria-posinset", "aria-setsize"],
    example: `<div role="tab" aria-selected="true" aria-controls="panel-1">Overview</div>`,
  },
  {
    name: "tabpanel", description: "Container for the resources associated with a tab.",
    required: ["aria-labelledby"], supported: ["aria-label", "aria-describedby"],
    example: `<div role="tabpanel" id="panel-1" aria-labelledby="tab-1">Content</div>`,
  },
  {
    name: "dialog", description: "Dialog box or window; modal dialogs trap focus.",
    required: ["aria-label or aria-labelledby"], supported: ["aria-modal", "aria-describedby", "aria-labelledby"],
    example: `<div role="dialog" aria-modal="true" aria-labelledby="dlg-title"><h2 id="dlg-title">Confirm</h2></div>`,
  },
  {
    name: "alert", description: "Message with important, usually time-sensitive information.",
    required: [], supported: ["aria-label", "aria-describedby"],
    example: `<div role="alert">Your session expires in 2 minutes.</div>`,
  },
  {
    name: "alertdialog", description: "Alert that requires a user response.",
    required: ["aria-label or aria-labelledby"], supported: ["aria-modal", "aria-describedby"],
    example: `<div role="alertdialog" aria-modal="true" aria-labelledby="t"><h2 id="t">Delete?</h2><button>Delete</button></div>`,
  },
  {
    name: "combobox", description: "Input with a popup listbox of values.",
    required: ["aria-expanded", "aria-controls", "aria-label or visible text"], supported: ["aria-autocomplete", "aria-activedescendant", "aria-required", "aria-describedby"],
    example: `<input role="combobox" aria-expanded="false" aria-controls="list" aria-autocomplete="list" />`,
  },
  {
    name: "listbox", description: "Widget that lets users select one or more items from a list.",
    required: [], supported: ["aria-multiselectable", "aria-activedescendant", "aria-label or aria-labelledby", "aria-required", "aria-orientation"],
    example: `<div role="listbox" aria-label="Countries"><div role="option" aria-selected="true">India</div></div>`,
  },
  {
    name: "option", description: "Selectable item in a listbox.",
    required: [], supported: ["aria-selected", "aria-posinset", "aria-setsize", "aria-describedby"],
    example: `<div role="option" id="o1" aria-selected="false">India</div>`,
  },
  {
    name: "menu", description: "Widget offering a list of choices to the user.",
    required: [], supported: ["aria-label or aria-labelledby", "aria-orientation", "aria-activedescendant"],
    example: `<div role="menu" aria-label="File"><div role="menuitem">New</div></div>`,
  },
  {
    name: "menuitem", description: "Option in a set of choices in a menu.",
    required: ["aria-label or visible text"], supported: ["aria-disabled", "aria-haspopup", "aria-expanded", "aria-posinset", "aria-setsize"],
    example: `<div role="menuitem" tabindex="0">Save</div>`,
  },
  {
    name: "menuitemcheckbox", description: "Menu item with a checkable state.",
    required: ["aria-checked", "aria-label or visible text"], supported: ["aria-disabled", "aria-posinset", "aria-setsize"],
    example: `<div role="menuitemcheckbox" aria-checked="true">Word wrap</div>`,
  },
  {
    name: "navigation", description: "Landmark for a collection of navigation elements.",
    required: [], supported: ["aria-label or aria-labelledby", "aria-describedby"],
    example: `<nav aria-label="Main"><a href="/">Home</a></nav>`,
  },
  {
    name: "main", description: "Landmark for the primary content of the document.",
    required: [], supported: ["aria-label or aria-labelledby"],
    example: `<main aria-label="Article content">…</main>`,
  },
  {
    name: "banner", description: "Landmark for site-level header content.",
    required: [], supported: ["aria-label or aria-labelledby"],
    example: `<header role="banner">…</header>`,
  },
  {
    name: "contentinfo", description: "Landmark for site-level footer content.",
    required: [], supported: ["aria-label or aria-labelledby"],
    example: `<footer role="contentinfo">© 2026 IconVault</footer>`,
  },
  {
    name: "search", description: "Landmark for search functionality.",
    required: [], supported: ["aria-label or aria-labelledby"],
    example: `<form role="search" aria-label="Site search"><input type="search" /></form>`,
  },
  {
    name: "form", description: "Landmark region containing form controls.",
    required: ["aria-label or aria-labelledby"], supported: ["aria-describedby"],
    example: `<form role="form" aria-label="Contact form">…</form>`,
  },
  {
    name: "complementary", description: "Landmark for supporting content, like a sidebar.",
    required: [], supported: ["aria-label or aria-labelledby"],
    example: `<aside role="complementary" aria-label="Related links">…</aside>`,
  },
  {
    name: "region", description: "Landmark for a significant perceivable section.",
    required: ["aria-label or aria-labelledby"], supported: ["aria-describedby"],
    example: `<section role="region" aria-label="Recent posts">…</section>`,
  },
  {
    name: "heading", description: "Heading for a section of content.",
    required: ["aria-level"], supported: ["aria-label", "aria-describedby"],
    example: `<div role="heading" aria-level="2">Features</div>`,
  },
  {
    name: "img", description: "Container for a collection of elements that form an image.",
    required: ["aria-label or aria-labelledby"], supported: ["aria-describedby"],
    example: `<div role="img" aria-label="Chart: sales up 40%">…svg…</div>`,
  },
  {
    name: "progressbar", description: "Element displaying progress of a task.",
    required: ["aria-valuenow"], supported: ["aria-valuemin", "aria-valuemax", "aria-valuetext", "aria-label or aria-labelledby"],
    example: `<div role="progressbar" aria-valuenow="65" aria-valuemin="0" aria-valuemax="100">65%</div>`,
  },
  {
    name: "slider", description: "User input where the user selects a value from a range.",
    required: ["aria-valuenow", "aria-label or visible text"], supported: ["aria-valuemin", "aria-valuemax", "aria-valuetext", "aria-orientation", "aria-describedby"],
    example: `<div role="slider" aria-valuenow="30" aria-valuemin="0" aria-valuemax="100" tabindex="0">Volume</div>`,
  },
  {
    name: "tooltip", description: "Contextual information popup.",
    required: [], supported: ["aria-label"],
    example: `<span role="tooltip" id="t1">More info</span>`,
  },
  {
    name: "status", description: "Live region with advisory information; announced politely.",
    required: [], supported: ["aria-label", "aria-atomic"],
    example: `<div role="status">File saved.</div>`,
  },
  {
    name: "tree", description: "Hierarchical list control.",
    required: [], supported: ["aria-multiselectable", "aria-required", "aria-label or aria-labelledby", "aria-orientation"],
    example: `<div role="tree" aria-label="Files"><div role="treeitem" aria-expanded="true">src</div></div>`,
  },
  {
    name: "treeitem", description: "Option item in a tree.",
    required: [], supported: ["aria-expanded", "aria-selected", "aria-checked", "aria-level", "aria-posinset", "aria-setsize"],
    example: `<div role="treeitem" aria-expanded="false" tabindex="0">src</div>`,
  },
  {
    name: "grid", description: "Composite widget containing rows of cells.",
    required: [], supported: ["aria-multiselectable", "aria-readonly", "aria-label or aria-labelledby", "aria-rowcount", "aria-colcount"],
    example: `<div role="grid" aria-label="Spreadsheet"><div role="row"><div role="gridcell">A1</div></div></div>`,
  },
  {
    name: "table", description: "Static tabular data structure.",
    required: [], supported: ["aria-label or aria-labelledby", "aria-describedby", "aria-rowcount", "aria-colcount"],
    example: `<div role="table" aria-label="Prices"><div role="rowgroup"><div role="row"><div role="columnheader">Plan</div></div></div></div>`,
  },
  {
    name: "columnheader", description: "Cell with header information for a column.",
    required: [], supported: ["aria-sort", "aria-colindex", "aria-colspan", "aria-rowspan"],
    example: `<div role="columnheader" aria-sort="ascending">Price</div>`,
  },
  {
    name: "row", description: "Row of cells in a tabular container.",
    required: [], supported: ["aria-selected", "aria-expanded", "aria-level", "aria-posinset", "aria-setsize", "aria-rowindex"],
    example: `<div role="row" aria-selected="true">…</div>`,
  },
  {
    name: "rowheader", description: "Cell with header information for a row.",
    required: [], supported: ["aria-sort", "aria-colindex", "aria-rowindex", "aria-expanded", "aria-selected"],
    example: `<div role="rowheader">Row 1</div>`,
  },
  {
    name: "cell", description: "Cell in a tabular container.",
    required: [], supported: ["aria-colindex", "aria-colspan", "aria-rowindex", "aria-rowspan"],
    example: `<div role="cell">₹499</div>`,
  },
  {
    name: "gridcell", description: "Cell in a grid or treegrid.",
    required: [], supported: ["aria-selected", "aria-readonly", "aria-required", "aria-colindex", "aria-rowindex", "aria-colspan", "aria-rowspan", "aria-expanded"],
    example: `<div role="gridcell" aria-selected="true" tabindex="0">A1</div>`,
  },
  {
    name: "spinbutton", description: "Input to select from a discrete range of values.",
    required: ["aria-valuenow", "aria-label or visible text"], supported: ["aria-valuemin", "aria-valuemax", "aria-valuetext", "aria-required", "aria-readonly", "aria-describedby"],
    example: `<div role="spinbutton" aria-valuenow="5" aria-valuemin="0" aria-valuemax="10" tabindex="0">Qty</div>`,
  },
  {
    name: "separator", description: "Divider between sections of content.",
    required: [], supported: ["aria-orientation", "aria-valuenow", "aria-valuemin", "aria-valuemax"],
    example: `<div role="separator" aria-orientation="horizontal"></div>`,
  },
  {
    name: "presentation", description: "Element whose semantics are not important to assistive tech.",
    required: [], supported: [],
    example: `<div role="presentation"><span class="icon"></span></div>`,
  },
  {
    name: "application", description: "Structure containing elements representing an application.",
    required: [], supported: ["aria-activedescendant", "aria-label or aria-labelledby"],
    example: `<div role="application" aria-label="Drawing canvas">…</div>`,
  },
];

function AriaTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("aria-reference", isPro);
  const seo = getToolSeo("aria-reference");

  const [query, setQuery] = useState("");
  const [active, setActive] = useState<AriaRole | null>(ROLES[0]!);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ROLES;
    return ROLES.filter(
      (r) =>
        r.name.includes(q) ||
        r.description.toLowerCase().includes(q) ||
        [...r.required, ...r.supported].some((a) => a.toLowerCase().includes(q)),
    );
  }, [query]);

  const copySnippet = async () => {
    if (!active || !trial.canUse) return;
    try {
      await navigator.clipboard.writeText(active.example);
      trial.recordUse();
      toast.success(`Example for role="${active.name}" copied`);
    } catch {
      toast.error("Clipboard blocked by the browser.");
    }
  };

  return (
    <ToolPageShell toolId="aria-reference" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="ARIA Reference" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search roles or attributes…"
              className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-3 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary"
              aria-label="Search ARIA roles"
            />
          </div>
          <div className="max-h-[480px] space-y-1 overflow-y-auto pr-1">
            {results.map((r) => (
              <button
                key={r.name}
                type="button"
                onClick={() => setActive(r)}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition",
                  active?.name === r.name
                    ? "bg-primary/10 font-bold text-primary"
                    : "font-mono text-foreground/80 hover:bg-muted",
                )}
              >
                <span>{r.name}</span>
                {r.required.length > 0 && (
                  <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                    required
                  </span>
                )}
              </button>
            ))}
            {results.length === 0 && (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                No roles match “{query}”.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {active ? (
            <div className="space-y-5">
              <div>
                <h2 className="font-mono text-2xl font-bold text-primary">role="{active.name}"</h2>
                <p className="mt-1 text-sm text-muted-foreground">{active.description}</p>
              </div>

              <div>
                <p className="mb-2 text-[13px] font-bold uppercase tracking-wide text-foreground/70">
                  Required states & properties
                </p>
                {active.required.length === 0 ? (
                  <p className="text-sm text-muted-foreground">None.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {active.required.map((a) => (
                      <code key={a} className="rounded-lg bg-amber-500/10 px-2.5 py-1 font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                        {a}
                      </code>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="mb-2 text-[13px] font-bold uppercase tracking-wide text-foreground/70">
                  Supported states & properties
                </p>
                {active.supported.length === 0 ? (
                  <p className="text-sm text-muted-foreground">None.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {active.supported.map((a) => (
                      <code key={a} className="rounded-lg bg-muted px-2.5 py-1 font-mono text-xs text-foreground/80">
                        {a}
                      </code>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="mb-2 text-[13px] font-bold uppercase tracking-wide text-foreground/70">Example</p>
                <pre className="overflow-x-auto rounded-xl border border-border bg-background p-4 font-mono text-[13px] leading-relaxed">
                  {active.example}
                </pre>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <ActionButton disabled={!trial.canUse} onClick={copySnippet}>
                  <Copy className="h-4 w-4" /> Copy snippet
                </ActionButton>
                {!isPro && (
                  <p className="text-xs text-muted-foreground">
                    {trial.left} of {TOOL_TRIAL_LIMIT} free copies left.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">Pick a role to see its details.</p>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
