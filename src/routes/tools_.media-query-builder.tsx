// /tools/media-query-builder - Compose responsive breakpoints (name + optional
// min/max width), load device presets, and get a commented CSS skeleton to
// copy. 100% in-browser.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/media-query-builder")({
  head: () => {
    const seo = getToolSeoMeta("media-query-builder");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: MediaQueryTool,
});

interface Breakpoint {
  id: string;
  name: string;
  min: string;
  max: string;
}

const PRESETS: { name: string; min: string; max: string }[] = [
  { name: "Mobile", min: "", max: "480" },
  { name: "Tablet", min: "481", max: "1023" },
  { name: "Laptop", min: "1024", max: "1439" },
  { name: "Desktop", min: "1440", max: "" },
];

const DEVICE_BUTTONS: { label: string; width: number }[] = [
  { label: "Mobile 360", width: 360 },
  { label: "Tablet 768", width: 768 },
  { label: "Laptop 1024", width: 1024 },
  { label: "Desktop 1440", width: 1440 },
];

let uid = 0;
const mkBp = (name: string, min: string, max: string): Breakpoint => ({ id: `b${++uid}`, name, min, max });

function MediaQueryTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("media-query-builder", isPro);
  const seo = getToolSeo("media-query-builder");

  const [rows, setRows] = useState<Breakpoint[]>(PRESETS.map((p) => mkBp(p.name, p.min, p.max)));
  const [copied, setCopied] = useState(false);

  const setRow = (id: string, patch: Partial<Breakpoint>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const removeRow = (id: string) => setRows((rs) => rs.filter((r) => r.id !== id));

  const addRow = () => setRows((rs) => [...rs, mkBp(`Breakpoint ${rs.length + 1}`, "", "")]);

  const addDevice = (label: string, width: number) => {
    if (rows.some((r) => r.name === label)) {
      toast.error("That breakpoint is already in the list");
      return;
    }
    setRows((rs) => [...rs, mkBp(label, String(width), "")]);
  };

  const css = useMemo(() => {
    const blocks = rows.map((r) => {
      const parts: string[] = [];
      if (r.min.trim()) parts.push(`(min-width: ${r.min.trim()}px)`);
      if (r.max.trim()) parts.push(`(max-width: ${r.max.trim()}px)`);
      const query = parts.length > 0 ? parts.join(" and ") : "(min-width: 0px)";
      const label = r.name.trim() || "Breakpoint";
      const range =
        r.min.trim() || r.max.trim()
          ? `${r.min.trim() ? r.min.trim() + "px" : "0"} - ${r.max.trim() ? r.max.trim() + "px" : "up"}`
          : "no width constraints";
      return (
        `/* ${label} (${range}) */\n` +
        `@media ${query} {\n` +
        `  /* Add your ${label} styles here */\n` +
        `}`
      );
    });
    return blocks.join("\n\n");
  }, [rows]);

  const copyCss = () => {
    if (!trial.canUse) return;
    void navigator.clipboard.writeText(css).then(() => {
      trial.recordUse();
      setCopied(true);
      toast.success("Media query CSS copied");
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <ToolPageShell toolId="media-query-builder" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Media Query Builder" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Device presets</p>
            <div className="flex flex-wrap gap-2">
              {DEVICE_BUTTONS.map((d) => (
                <button
                  key={d.label}
                  type="button"
                  onClick={() => addDevice(d.label, d.width)}
                  className="rounded-xl border border-border px-3 py-1.5 text-sm font-semibold transition hover:border-primary/40"
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Breakpoints ({rows.length})</p>
              <button
                type="button" onClick={addRow}
                className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-bold transition hover:border-primary/40"
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            </div>
            <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {rows.map((r) => (
                <div key={r.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-center gap-2">
                    <input
                      value={r.name}
                      onChange={(e) => setRow(r.id, { name: e.target.value })}
                      className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-sm font-semibold outline-none"
                      placeholder="Name"
                    />
                    <button
                      type="button" onClick={() => removeRow(r.id)}
                      className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-red-500/10 hover:text-red-500"
                      aria-label={`Remove ${r.name || "breakpoint"}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <label className="text-xs text-muted-foreground">
                      Min width (px)
                      <input
                        value={r.min}
                        inputMode="numeric"
                        onChange={(e) => setRow(r.id, { min: e.target.value.replace(/[^0-9]/g, "") })}
                        placeholder="empty = none"
                        className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 font-mono text-sm outline-none"
                      />
                    </label>
                    <label className="text-xs text-muted-foreground">
                      Max width (px)
                      <input
                        value={r.max}
                        inputMode="numeric"
                        onChange={(e) => setRow(r.id, { max: e.target.value.replace(/[^0-9]/g, "") })}
                        placeholder="empty = none"
                        className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 font-mono text-sm outline-none"
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <ActionButton disabled={!trial.canUse || rows.length === 0} onClick={copyCss}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy CSS"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of 5 free copies left - everything runs in your browser.
            </p>
          )}
        </div>

        <div>
          <pre className="min-h-[380px] overflow-x-auto whitespace-pre rounded-2xl border border-border bg-card p-4 font-mono text-[13px] leading-relaxed">
            {css}
          </pre>
        </div>
      </div>
    </ToolPageShell>
  );
}
