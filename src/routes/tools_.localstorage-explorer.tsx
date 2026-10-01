// /tools/localstorage-explorer - Browse, search, edit, add and delete keys
// in this origin's localStorage, with export/import and a usage meter.
// Runs fully in your browser.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Pencil, Trash2, RefreshCw, Search, Download, Upload, X, Database } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/tools_/localstorage-explorer")({
  head: () => {
    const seo = getToolSeoMeta("localstorage-explorer");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: LocalStorageExplorerTool,
});

type Entry = { key: string; value: string; size: number };

const TYPICAL_QUOTA = 5 * 1024 * 1024; // ~5MB is the common localStorage quota

function readEntries(): Entry[] {
  const out: Entry[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key === null) continue;
    const value = localStorage.getItem(key) ?? "";
    out.push({ key, value, size: new TextEncoder().encode(key + value).length });
  }
  return out.sort((a, b) => b.size - a.size);
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function LocalStorageExplorerTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("localstorage-explorer", isPro);
  const seo = getToolSeo("localstorage-explorer");

  const [entries, setEntries] = useState<Entry[]>([]);
  const [query, setQuery] = useState("");
  const [viewKey, setViewKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(() => setEntries(readEntries()), []);
  useEffect(refresh, [refresh]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => e.key.toLowerCase().includes(q) || e.value.toLowerCase().includes(q));
  }, [entries, query]);

  const totalBytes = entries.reduce((a, e) => a + e.size, 0);
  const usagePct = Math.min(100, (totalBytes / TYPICAL_QUOTA) * 100);

  const guarded = useCallback((fn: () => void) => {
    if (!trial.canUse) {
      toast.error("Trial uses exhausted. Go Pro for unlimited edits.");
      return;
    }
    fn();
  }, [trial]);

  const openView = (e: Entry) => {
    setViewKey(e.key);
    setEditValue(e.value);
  };

  const saveEdit = () => {
    if (viewKey === null) return;
    guarded(() => {
      try {
        localStorage.setItem(viewKey, editValue);
        trial.recordUse();
        setViewKey(null);
        refresh();
        toast.success("Value saved");
      } catch {
        toast.error("Save failed. Storage may be full.");
      }
    });
  };

  const addEntry = () => {
    if (!newKey.trim()) {
      toast.error("Key is required.");
      return;
    }
    guarded(() => {
      try {
        localStorage.setItem(newKey.trim(), newValue);
        trial.recordUse();
        setAddOpen(false);
        setNewKey("");
        setNewValue("");
        refresh();
        toast.success("Key added");
      } catch {
        toast.error("Save failed. Storage may be full.");
      }
    });
  };

  const remove = (key: string) => {
    if (!window.confirm(`Delete "${key}"?`)) return;
    guarded(() => {
      localStorage.removeItem(key);
      trial.recordUse();
      refresh();
      toast.success("Deleted");
    });
  };

  const exportJson = useCallback(() => {
    if (!trial.canUse) return;
    const obj: Record<string, string> = {};
    for (const e of entries) obj[e.key] = e.value;
    downloadBlob(new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" }), "localstorage-export.json");
    trial.recordUse();
    toast.success("Exported");
  }, [entries, trial]);

  const importJson = useCallback(async (f: File) => {
    try {
      const obj = JSON.parse(await f.text()) as Record<string, string>;
      if (typeof obj !== "object" || obj === null || Array.isArray(obj)) throw new Error("bad");
      const keys = Object.keys(obj);
      if (keys.length === 0) throw new Error("empty");
      if (!window.confirm(`Import ${keys.length} keys? Existing keys with the same name will be overwritten.`)) return;
      for (const k of keys) localStorage.setItem(k, String(obj[k]));
      refresh();
      toast.success(`Imported ${keys.length} keys`);
    } catch {
      toast.error("That file is not a valid key/value JSON export.");
    }
  }, [refresh]);

  return (
    <ToolPageShell toolId="localstorage-explorer" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="LocalStorage Explorer" left={trial.left} />

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <Database className="h-4 w-4 text-primary" /> {entries.length} keys on this origin
            </h2>
            <p className="text-xs text-muted-foreground">Runs in your browser, nothing is uploaded</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search keys and values…" className="w-56 pl-9" />
            </div>
            <button type="button" onClick={refresh} title="Refresh" className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold transition hover:border-primary/40">
              <RefreshCw className="h-4 w-4" />
            </button>
            <button type="button" onClick={exportJson} disabled={entries.length === 0 || !trial.canUse} title="Export JSON" className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold transition hover:border-primary/40 disabled:opacity-40">
              <Download className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => importRef.current?.click()} title="Import JSON" className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold transition hover:border-primary/40">
              <Upload className="h-4 w-4" />
            </button>
            <input ref={importRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importJson(f); e.target.value = ""; }} />
            <button type="button" onClick={() => setAddOpen(true)} disabled={!trial.canUse} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50">
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-border p-3">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-semibold text-muted-foreground">Storage usage (estimate)</span>
            <span className="font-mono">{formatBytes(totalBytes)} of ~{formatBytes(TYPICAL_QUOTA)}</span>
          </div>
          <Progress value={usagePct} className="h-2" />
          <p className="mt-1.5 text-[11px] text-muted-foreground">Estimated from key plus value byte length. The real quota is around 5MB but varies by browser.</p>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <p className="font-semibold">{entries.length === 0 ? "localStorage is empty here" : "No matches"}</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              {entries.length === 0 ? "This site stores nothing in localStorage yet. Add a key to get started." : "Try a different search."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Value preview</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => (
                  <TableRow key={e.key}>
                    <TableCell className="max-w-[220px] truncate font-mono text-[13px] font-semibold" title={e.key}>{e.key}</TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-[13px] text-muted-foreground">{formatBytes(e.size)}</TableCell>
                    <TableCell className="max-w-[320px] truncate font-mono text-[13px] text-muted-foreground" title={e.value}>
                      {e.value.length > 80 ? `${e.value.slice(0, 80)}…` : e.value || <span className="italic">(empty)</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        <button type="button" onClick={() => openView(e)} title="View / edit" className="rounded-lg p-2 hover:bg-muted">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => remove(e.key)} disabled={!trial.canUse} title="Delete" className="rounded-lg p-2 text-red-500 hover:bg-muted disabled:opacity-40">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {!isPro && (
          <p className="mt-4 text-xs text-muted-foreground">{trial.left} of {TOOL_TRIAL_LIMIT} free add/edit/delete/export uses left. Viewing is unlimited.</p>
        )}
      </div>

      <Dialog open={viewKey !== null} onOpenChange={(o) => { if (!o) setViewKey(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="break-all font-mono text-sm">{viewKey}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Value</Label>
            <Textarea value={editValue} onChange={(e) => setEditValue(e.target.value)} className="min-h-[240px] font-mono text-[13px]" spellCheck={false} />
          </div>
          <DialogFooter>
            <button type="button" onClick={() => setViewKey(null)} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold">
              <X className="h-4 w-4" /> Cancel
            </button>
            <ActionButton busy={false} disabled={false} onClick={saveEdit}>Save value</ActionButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add key</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Key</Label>
              <Input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="my-setting" />
            </div>
            <div className="space-y-2">
              <Label>Value</Label>
              <Textarea value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder="value…" className="min-h-[120px] font-mono text-[13px]" spellCheck={false} />
            </div>
          </div>
          <DialogFooter>
            <button type="button" onClick={() => setAddOpen(false)} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold">
              <X className="h-4 w-4" /> Cancel
            </button>
            <ActionButton busy={false} disabled={!newKey.trim()} onClick={addEntry}>Add key</ActionButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ToolPageShell>
  );
}
