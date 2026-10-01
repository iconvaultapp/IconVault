// /tools/query-string-builder - Build URL query strings from key/value
// rows, or paste one to parse it back into rows. 100% client-side.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownToLine, Copy, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/tools_/query-string-builder")({
  head: () => {
    const seo = getToolSeoMeta("query-string-builder");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: QueryStringBuilderTool,
});

interface QsRow {
  id: number;
  key: string;
  value: string;
}

let rowSeq = 1;

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function QueryStringBuilderTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("query-string-builder", isPro);
  const seo = getToolSeo("query-string-builder");

  const [rows, setRows] = useState<QsRow[]>([
    { id: rowSeq++, key: "q", value: "icon search" },
    { id: rowSeq++, key: "page", value: "2" },
    { id: rowSeq++, key: "tag", value: "outline" },
    { id: rowSeq++, key: "tag", value: "duotone" },
  ]);
  const [base, setBase] = useState("https://example.com/search");
  const [paste, setPaste] = useState("");

  const qs = useMemo(
    () =>
      rows
        .filter((r) => r.key.trim() !== "")
        .map((r) => `${encodeURIComponent(r.key.trim())}=${encodeURIComponent(r.value)}`)
        .join("&"),
    [rows],
  );

  const fullUrl = useMemo(() => {
    const b = base.trim().replace(/[?#&]+$/, "");
    if (!b) return qs ? `?${qs}` : "";
    return qs ? `${b}?${qs}` : b;
  }, [base, qs]);

  const addRow = () => setRows((p) => [...p, { id: rowSeq++, key: "", value: "" }]);
  const removeRow = (id: number) => setRows((p) => p.filter((r) => r.id !== id));
  const patchRow = (id: number, patch: Partial<QsRow>) =>
    setRows((p) => p.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const parsePasted = () => {
    const raw = paste.trim().replace(/^[?#]/, "").replace(/^[^?#]*\?/, "");
    if (!raw) {
      toast.error("Paste a query string first.");
      return;
    }
    const next: QsRow[] = [];
    for (const part of raw.split("&")) {
      if (!part) continue;
      const eq = part.indexOf("=");
      let k: string;
      let v: string;
      try {
        if (eq < 0) {
          k = decodeURIComponent(part);
          v = "";
        } else {
          k = decodeURIComponent(part.slice(0, eq));
          v = decodeURIComponent(part.slice(eq + 1));
        }
      } catch {
        toast.error("That query string has invalid percent-encoding.");
        return;
      }
      next.push({ id: rowSeq++, key: k, value: v });
    }
    if (next.length === 0) {
      toast.error("Nothing to parse in that string.");
      return;
    }
    setRows(next);
    toast.success(`Parsed ${next.length} parameter${next.length === 1 ? "" : "s"} into rows.`);
  };

  const copy = async () => {
    if (!qs || !trial.canUse) return;
    const ok = await copyToClipboard(qs);
    if (ok) {
      trial.recordUse();
      toast.success("Query string copied.");
    } else {
      toast.error("Could not copy to clipboard.");
    }
  };

  const copyUrl = async () => {
    if (!fullUrl) return;
    const ok = await copyToClipboard(fullUrl);
    if (ok) toast.success("Full URL copied.");
    else toast.error("Could not copy to clipboard.");
  };

  return (
    <ToolPageShell toolId="query-string-builder" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Query String Builder" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <Label className="text-[13px] font-medium text-foreground/80">Parameters (duplicate keys allowed)</Label>
            <button
              type="button"
              onClick={addRow}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" /> Add row
            </button>
          </div>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center gap-2">
                <Input
                  value={r.key}
                  onChange={(e) => patchRow(r.id, { key: e.target.value })}
                  placeholder="key"
                  className="font-mono text-sm"
                />
                <Input
                  value={r.value}
                  onChange={(e) => patchRow(r.id, { value: e.target.value })}
                  placeholder="value"
                  className="font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeRow(r.id)}
                  aria-label="Remove row"
                  className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition hover:bg-red-500/10 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {rows.length === 0 && <p className="text-sm text-muted-foreground">Add a row to start building.</p>}
          </div>

          <div className="border-t border-border pt-4">
            <Label className="mb-2 block text-[13px] font-medium text-foreground/80">Reverse: paste a query string</Label>
            <Textarea
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              rows={2}
              spellCheck={false}
              className="font-mono text-[13px]"
              placeholder="q=icon%20search&page=2&tag=outline"
            />
            <button
              type="button"
              onClick={parsePasted}
              className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              <ArrowDownToLine className="h-4 w-4" /> Parse into rows
            </button>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-1 text-[13px] font-medium text-foreground/80">Query string</p>
            <p className="break-all rounded-lg bg-muted px-3 py-2.5 font-mono text-sm text-foreground">
              {qs || <span className="text-muted-foreground">Add a parameter to build the string</span>}
            </p>
            <div className="mt-3">
              <ActionButton busy={false} disabled={!qs || !trial.canUse} onClick={copy}>
                <Copy className="h-4 w-4" /> Copy query string
              </ActionButton>
            </div>
            {!isPro && (
              <p className="mt-2 text-xs text-muted-foreground">
                {trial.left} of {TOOL_TRIAL_LIMIT} free copies left - runs fully in your browser, nothing is uploaded.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-1 text-[13px] font-medium text-foreground/80">Full URL preview</p>
            <Input
              value={base}
              onChange={(e) => setBase(e.target.value)}
              placeholder="https://example.com/search"
              className="mb-2 font-mono text-sm"
            />
            <p className="break-all rounded-lg bg-muted px-3 py-2.5 font-mono text-sm text-foreground">
              {fullUrl || <span className="text-muted-foreground">Enter a base URL</span>}
            </p>
            <button
              type="button"
              onClick={copyUrl}
              disabled={!fullUrl}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:opacity-40"
            >
              <Copy className="h-3.5 w-3.5" /> Copy URL
            </button>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
