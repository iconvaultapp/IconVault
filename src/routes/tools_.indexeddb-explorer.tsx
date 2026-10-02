// /tools/indexeddb-explorer - Browse this origin's IndexedDB databases,
// object stores and records, with add/edit/delete and JSON import/export.
// Runs fully in your browser. Only this origin's databases are visible.

import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Pencil, Trash2, RefreshCw, Download, Upload, X, Database, Info, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/tools_/indexeddb-explorer")({
  head: () => {
    const seo = getToolSeoMeta("indexeddb-explorer");
    const canonical = "https://iconvault.site/tools/indexeddb-explorer";
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
  component: IndexedDbExplorerTool,
});

const PAGE_SIZE = 25;
const READ_CAP = 500;

function openDb(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Could not open database."));
    req.onblocked = () => reject(new Error("Database is blocked by another tab."));
  });
}

function tx<T>(db: IDBDatabase, store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const req = fn(t.objectStore(store));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB request failed."));
  });
}

function readAll(db: IDBDatabase, store: string): Promise<{ key: IDBValidKey; value: unknown }[]> {
  return new Promise((resolve, reject) => {
    const out: { key: IDBValidKey; value: unknown }[] = [];
    const t = db.transaction(store, "readonly");
    const cursor = t.objectStore(store).openCursor();
    cursor.onsuccess = () => {
      const c = cursor.result;
      if (!c || out.length >= READ_CAP) return resolve(out);
      out.push({ key: c.key, value: c.value });
      c.continue();
    };
    cursor.onerror = () => reject(cursor.error ?? new Error("Read failed."));
  });
}

function summarize(v: unknown): string {
  try {
    const s = JSON.stringify(v) ?? String(v);
    return s.length > 90 ? `${s.slice(0, 90)}…` : s;
  } catch {
    return String(v);
  }
}

function IndexedDbExplorerTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("indexeddb-explorer", isPro);
  const seo = getToolSeo("indexeddb-explorer");

  const [dbs, setDbs] = useState<string[]>([]);
  const [dbError, setDbError] = useState<string | null>(null);
  const [dbName, setDbName] = useState<string | null>(null);
  const [stores, setStores] = useState<string[]>([]);
  const [storeName, setStoreName] = useState<string | null>(null);
  const [records, setRecords] = useState<{ key: IDBValidKey; value: unknown }[]>([]);
  const [pageIdx, setPageIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editKey, setEditKey] = useState<IDBValidKey | null>(null);
  const [editJson, setEditJson] = useState("");
  const [addKey, setAddKey] = useState("");

  const refreshDbs = useCallback(async () => {
    setDbError(null);
    try {
      if (typeof indexedDB.databases !== "function") {
        setDbError("This browser does not support listing databases (indexedDB.databases is unavailable).");
        return;
      }
      const list = await indexedDB.databases();
      setDbs(list.map((d) => d.name).filter((n): n is string => !!n).sort());
    } catch {
      setDbError("Could not list databases. Another tab may be blocking access.");
    }
  }, []);

  useEffect(() => { void refreshDbs(); }, [refreshDbs]);

  const selectDb = useCallback(async (name: string) => {
    setDbName(name);
    setStoreName(null);
    setRecords([]);
    setLoading(true);
    try {
      const db = await openDb(name);
      const list = Array.from(db.objectStoreNames);
      db.close();
      setStores(list);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open database.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStore = useCallback(async (name: string, db: string | null = dbName) => {
    if (!db) return;
    setStoreName(name);
    setPageIdx(0);
    setLoading(true);
    try {
      const handle = await openDb(db);
      const rows = await readAll(handle, name);
      handle.close();
      setRecords(rows);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read store.");
    } finally {
      setLoading(false);
    }
  }, [dbName]);

  const pageRows = records.slice(pageIdx * PAGE_SIZE, pageIdx * PAGE_SIZE + PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(records.length / PAGE_SIZE));

  const openAdd = () => {
    setEditKey(null);
    setEditJson("");
    setAddKey("");
    setEditorOpen(true);
  };

  const openEdit = (key: IDBValidKey, value: unknown) => {
    setEditKey(key);
    setAddKey("");
    setEditJson(JSON.stringify(value, null, 2));
    setEditorOpen(true);
  };

  const saveRecord = async () => {
    if (!dbName || !storeName) return;
    if (!trial.canUse) {
      toast.error("Trial uses exhausted. Go Pro for unlimited edits.");
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(editJson);
    } catch {
      toast.error("Not valid JSON.");
      return;
    }
    try {
      const db = await openDb(dbName);
      if (editKey !== null) {
        await tx(db, storeName, "readwrite", (s) => s.put(parsed, editKey));
      } else if (addKey.trim()) {
        await tx(db, storeName, "readwrite", (s) => s.put(parsed, addKey.trim()));
      } else {
        await tx(db, storeName, "readwrite", (s) => s.add(parsed as never));
      }
      db.close();
      trial.recordUse();
      setEditorOpen(false);
      toast.success("Record saved");
      await loadStore(storeName);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed. The store may require a key path present in your JSON.");
    }
  };

  const deleteRecord = async (key: IDBValidKey) => {
    if (!dbName || !storeName) return;
    if (!window.confirm("Delete this record?")) return;
    if (!trial.canUse) {
      toast.error("Trial uses exhausted. Go Pro for unlimited edits.");
      return;
    }
    try {
      const db = await openDb(dbName);
      await tx(db, storeName, "readwrite", (s) => s.delete(key));
      db.close();
      trial.recordUse();
      toast.success("Record deleted");
      await loadStore(storeName);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed.");
    }
  };

  const exportStore = () => {
    if (!trial.canUse) return;
    const payload = records.map((r) => ({ key: String(r.key), value: r.value }));
    downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), `${dbName}-${storeName}-export.json`);
    trial.recordUse();
    toast.success("Store exported");
  };

  const importStore = async (f: File) => {
    if (!dbName || !storeName) return;
    if (!trial.canUse) {
      toast.error("Trial uses exhausted. Go Pro for unlimited edits.");
      return;
    }
    try {
      const arr = JSON.parse(await f.text()) as { key?: string; value: unknown }[];
      if (!Array.isArray(arr) || arr.length === 0) throw new Error("bad");
      if (!window.confirm(`Import ${arr.length} records into "${storeName}"?`)) return;
      const db = await openDb(dbName);
      for (const item of arr) {
        if (item.key !== undefined) await tx(db, storeName, "readwrite", (s) => s.put(item.value, item.key as IDBValidKey));
        else await tx(db, storeName, "readwrite", (s) => s.add(item.value as never));
      }
      db.close();
      trial.recordUse();
      toast.success(`Imported ${arr.length} records`);
      await loadStore(storeName);
    } catch {
      toast.error("That file is not a valid store export (expected an array of {key, value}).");
    }
  };

  return (
    <ToolPageShell toolId="indexeddb-explorer" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="IndexedDB Explorer" left={trial.left} />

      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-border bg-card p-4 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-muted-foreground">
          Only <span className="font-semibold text-foreground">this origin's databases</span> are visible. Browsers never expose another site's IndexedDB. Everything runs locally in your browser.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold"><Database className="h-4 w-4 text-primary" /> Databases</h2>
            <button type="button" onClick={() => void refreshDbs()} title="Refresh" className="rounded-lg p-1.5 hover:bg-muted">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
          {dbError && <p className="text-sm text-muted-foreground">{dbError}</p>}
          {dbs.length === 0 && !dbError && <p className="text-sm text-muted-foreground">No IndexedDB databases found for this site.</p>}
          <ul className="space-y-1.5">
            {dbs.map((n) => (
              <li key={n}>
                <button
                  type="button"
                  onClick={() => void selectDb(n)}
                  className={cn(
                    "w-full truncate rounded-xl border px-3 py-2 text-left font-mono text-[13px] transition",
                    dbName === n ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
                  )}
                >
                  {n}
                </button>
              </li>
            ))}
          </ul>

          {dbName && (
            <>
              <h3 className="pt-2 text-sm font-bold">Object stores</h3>
              {loading && stores.length === 0 ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : stores.length === 0 ? (
                <p className="text-sm text-muted-foreground">No object stores in this database.</p>
              ) : (
                <ul className="space-y-1.5">
                  {stores.map((s) => (
                    <li key={s}>
                      <button
                        type="button"
                        onClick={() => void loadStore(s)}
                        className={cn(
                          "w-full truncate rounded-xl border px-3 py-2 text-left font-mono text-[13px] transition",
                          storeName === s ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
                        )}
                      >
                        {s}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          {!isPro && (
            <p className="text-xs text-muted-foreground">{trial.left} of {TOOL_TRIAL_LIMIT} free add/edit/delete/import/export uses left. Browsing is unlimited.</p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {!storeName ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
              <Database className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Pick a database and an object store</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">Records are paged 25 at a time. Click a record to inspect its full JSON.</p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-mono text-sm font-bold">{storeName}</h2>
                  <p className="text-xs text-muted-foreground">
                    {records.length} record{records.length === 1 ? "" : "s"}{records.length >= READ_CAP ? " (first 500 shown)" : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={exportStore} disabled={records.length === 0 || !trial.canUse} title="Export store as JSON" className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold transition hover:border-primary/40 disabled:opacity-40">
                    <Download className="h-4 w-4" />
                  </button>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold transition hover:border-primary/40">
                    <Upload className="h-4 w-4" />
                    <input type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importStore(f); e.target.value = ""; }} />
                  </label>
                  <button type="button" onClick={openAdd} disabled={!trial.canUse} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50">
                    <Plus className="h-4 w-4" /> Add record
                  </button>
                </div>
              </div>

              {loading ? (
                <p className="py-16 text-center text-sm text-muted-foreground">Reading records…</p>
              ) : pageRows.length === 0 ? (
                <p className="py-16 text-center text-sm text-muted-foreground">This store is empty.</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Key</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pageRows.map((r) => (
                          <TableRow key={String(r.key)}>
                            <TableCell className="max-w-[160px] truncate font-mono text-[13px] font-semibold" title={String(r.key)}>{String(r.key)}</TableCell>
                            <TableCell className="max-w-[420px] truncate font-mono text-[13px] text-muted-foreground" title={summarize(r.value)}>{summarize(r.value)}</TableCell>
                            <TableCell className="text-right">
                              <div className="inline-flex gap-1">
                                <button type="button" onClick={() => openEdit(r.key, r.value)} disabled={!trial.canUse} title="Edit" className="rounded-lg p-2 hover:bg-muted disabled:opacity-40">
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button type="button" onClick={() => void deleteRecord(r.key)} disabled={!trial.canUse} title="Delete" className="rounded-lg p-2 text-red-500 hover:bg-muted disabled:opacity-40">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="mt-4 flex items-center justify-center gap-3 text-sm">
                    <button type="button" disabled={pageIdx === 0} onClick={() => setPageIdx((p) => p - 1)} className="rounded-lg border border-border p-2 disabled:opacity-40">
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-muted-foreground">Page {pageIdx + 1} of {pageCount}</span>
                    <button type="button" disabled={pageIdx >= pageCount - 1} onClick={() => setPageIdx((p) => p + 1)} className="rounded-lg border border-border p-2 disabled:opacity-40">
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editKey !== null ? "Edit record" : "Add record"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {editKey === null && (
              <div className="space-y-2">
                <Label>Key (leave empty to let the store auto-generate one)</Label>
                <input value={addKey} onChange={(e) => setAddKey(e.target.value)} placeholder="optional key" className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary" />
              </div>
            )}
            {editKey !== null && (
              <p className="font-mono text-sm text-muted-foreground">Key: <span className="font-semibold text-foreground">{String(editKey)}</span> (keys cannot be changed, only values)</p>
            )}
            <div className="space-y-2">
              <Label>Value (JSON)</Label>
              <Textarea value={editJson} onChange={(e) => setEditJson(e.target.value)} placeholder={'{ "name": "Ada" }'} className="min-h-[240px] font-mono text-[13px]" spellCheck={false} />
            </div>
          </div>
          <DialogFooter>
            <button type="button" onClick={() => setEditorOpen(false)} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold">
              <X className="h-4 w-4" /> Cancel
            </button>
            <ActionButton busy={false} disabled={!editJson.trim()} onClick={() => void saveRecord()}>Save record</ActionButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ToolPageShell>
  );
}
