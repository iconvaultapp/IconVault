// /tools/css-cursor - Every standard CSS cursor keyword (36) in one grid.
// Hovering a cell shows that cursor live; click copies `cursor: <name>;`.
// 100% in-browser.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, MousePointer2, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/css-cursor")({
  head: () => {
    const seo = getToolSeoMeta("css-cursor");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: CssCursorTool,
});

// All 36 standard cursor keywords from the CSS UI spec (MDN), grouped.
const CURSORS: { name: string; hint: string }[] = [
  { name: "auto", hint: "Browser picks based on context" },
  { name: "default", hint: "Plain arrow" },
  { name: "none", hint: "No cursor is shown" },
  { name: "context-menu", hint: "A context menu is available" },
  { name: "help", hint: "Help info is available" },
  { name: "pointer", hint: "Clickable - links, buttons" },
  { name: "progress", hint: "Busy in background, still usable" },
  { name: "wait", hint: "Busy, cannot interact yet" },
  { name: "cell", hint: "Table cell can be selected" },
  { name: "crosshair", hint: "Precise selection" },
  { name: "text", hint: "Text can be selected (I-beam)" },
  { name: "vertical-text", hint: "Vertical text can be selected" },
  { name: "alias", hint: "A shortcut will be created" },
  { name: "copy", hint: "Something can be copied" },
  { name: "move", hint: "Something can be moved" },
  { name: "no-drop", hint: "Cannot drop here" },
  { name: "not-allowed", hint: "Action will not be carried out" },
  { name: "grab", hint: "Can be grabbed and dragged" },
  { name: "grabbing", hint: "Currently being dragged" },
  { name: "all-scroll", hint: "Can scroll in any direction" },
  { name: "col-resize", hint: "Column resizes horizontally" },
  { name: "row-resize", hint: "Row resizes vertically" },
  { name: "n-resize", hint: "Resize north" },
  { name: "e-resize", hint: "Resize east" },
  { name: "s-resize", hint: "Resize south" },
  { name: "w-resize", hint: "Resize west" },
  { name: "ne-resize", hint: "Resize north-east" },
  { name: "nw-resize", hint: "Resize north-west" },
  { name: "se-resize", hint: "Resize south-east" },
  { name: "sw-resize", hint: "Resize south-west" },
  { name: "ew-resize", hint: "Resize east-west" },
  { name: "ns-resize", hint: "Resize north-south" },
  { name: "nesw-resize", hint: "Resize north-east / south-west" },
  { name: "nwse-resize", hint: "Resize north-west / south-east" },
  { name: "zoom-in", hint: "Something can be zoomed in" },
  { name: "zoom-out", hint: "Something can be zoomed out" },
];

function CssCursorTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("css-cursor", isPro);
  const seo = getToolSeo("css-cursor");

  const [filter, setFilter] = useState("");
  const [copiedName, setCopiedName] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      CURSORS.filter(
        (c) =>
          c.name.includes(filter.toLowerCase().trim()) ||
          c.hint.toLowerCase().includes(filter.toLowerCase().trim()),
      ),
    [filter],
  );

  const copyCursor = (name: string) => {
    if (!trial.canUse) return;
    void navigator.clipboard.writeText(`cursor: ${name};`).then(() => {
      trial.recordUse();
      setCopiedName(name);
      toast.success(`Copied cursor: ${name}`);
      setTimeout(() => setCopiedName(null), 1200);
    });
  };

  return (
    <ToolPageShell toolId="css-cursor" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="CSS Cursors" left={trial.left} />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter cursors, e.g. resize"
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Hover any cell to preview it live. Click to copy the declaration.
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-border text-center">
          <MousePointer2 className="mb-2 h-8 w-8 text-muted-foreground/50" />
          <p className="font-semibold">No cursor matches &ldquo;{filter}&rdquo;</p>
          <p className="mt-1 text-sm text-muted-foreground">Try a different word, like grab or zoom.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {filtered.map((c) => (
            <button
              key={c.name}
              type="button"
              title={c.hint}
              onClick={() => copyCursor(c.name)}
              style={{ cursor: c.name }}
              className={cn(
                "group flex min-h-[110px] flex-col items-center justify-center gap-1.5 rounded-2xl border p-3 text-center transition",
                copiedName === c.name
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:border-primary/50",
              )}
            >
              <MousePointer2 className="h-5 w-5 text-muted-foreground" />
              <span className="font-mono text-[13px] font-bold">{c.name}</span>
              <span className="text-[11px] leading-tight text-muted-foreground">{c.hint}</span>
              {copiedName === c.name ? (
                <span className="text-[11px] font-bold text-primary">Copied</span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground opacity-0 transition group-hover:opacity-100">
                  <Copy className="h-3 w-3" /> copy
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {!isPro && (
        <p className="mt-5 text-xs text-muted-foreground">
          {trial.left} of 5 free copies left - everything runs in your browser.
        </p>
      )}
    </ToolPageShell>
  );
}
