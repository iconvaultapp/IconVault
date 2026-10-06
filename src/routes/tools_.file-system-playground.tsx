// /tools/file-system-playground - Real File System Access API lab: open a file,
// edit it live, save back to the same handle, save-as, and browse a directory.

import { useCallback, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FilePlus2, FolderOpen, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/file-system-playground";
import toolSeoMeta from "@/lib/tool-seo-meta-data/file-system-playground";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/file-system-playground")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/file-system-playground";
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
  component: FsTool,
});

type DirEntry = { name: string; kind: string; size: number };

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

const TEXT_TYPES = {
  "text/plain": [".txt"],
  "text/markdown": [".md"],
  "application/json": [".json"],
  "text/html": [".html"],
  "text/css": [".css"],
  "text/javascript": [".js"],
} as Record<string, string[]>;

function FsTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("file-system-playground", isPro);
  const seo = toolSeo;

  const [supported] = useState(
    () =>
      typeof window !== "undefined" &&
      "showOpenFilePicker" in window &&
      "showSaveFilePicker" in window &&
      "showDirectoryPicker" in window,
  );
  const [handle, setHandle] = useState<FileSystemFileHandle | null>(null);
  const [fileName, setFileName] = useState("");
  const [content, setContent] = useState("");
  const [dirty, setDirty] = useState(false);
  const [permission, setPermission] = useState<string>("unknown");
  const [entries, setEntries] = useState<DirEntry[]>([]);
  const [dirName, setDirName] = useState("");
  const [busy, setBusy] = useState(false);

  const refreshPermission = useCallback(async (h: FileSystemHandle) => {
    try {
      const q = (h as FileSystemFileHandle & { queryPermission: (o: { mode: string }) => Promise<string> }).queryPermission;
      if (typeof q === "function") setPermission(await q.call(h, { mode: "readwrite" }));
    } catch {
      setPermission("unknown");
    }
  }, []);

  const openFile = useCallback(async () => {
    if (!trial.canUse || busy || !supported) return;
    setBusy(true);
    try {
      const [h] = (await (window as unknown as {
        showOpenFilePicker: (o: object) => Promise<FileSystemFileHandle[]>;
      }).showOpenFilePicker({
        types: [{ description: "Text files", accept: TEXT_TYPES }],
        multiple: false,
      })) as FileSystemFileHandle[];
      if (!h) return;
      const file = await h.getFile();
      if (file.size > 2 * 1024 * 1024) {
        toast.error("That file is over 2 MB, too big for the demo editor.");
        return;
      }
      setHandle(h);
      setFileName(file.name);
      setContent(await file.text());
      setDirty(false);
      await refreshPermission(h);
      trial.recordUse();
      toast.success(`Opened ${file.name}`);
    } catch (e) {
      if (!(e instanceof Error && e.name === "AbortError")) {
        toast.error(e instanceof Error ? e.message : "Could not open the file.");
      }
    } finally {
      setBusy(false);
    }
  }, [trial, busy, supported, refreshPermission]);

  const save = useCallback(async () => {
    if (!handle || busy) return;
    setBusy(true);
    try {
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      setDirty(false);
      toast.success(`Saved to ${fileName}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }, [handle, busy, content, fileName]);

  const saveAs = useCallback(async () => {
    if (!supported || busy) return;
    setBusy(true);
    try {
      const h = (await (window as unknown as {
        showSaveFilePicker: (o: object) => Promise<FileSystemFileHandle>;
      }).showSaveFilePicker({
        suggestedName: fileName || "untitled.txt",
        types: [{ description: "Text files", accept: TEXT_TYPES }],
      })) as FileSystemFileHandle;
      const writable = await h.createWritable();
      await writable.write(content);
      await writable.close();
      setHandle(h);
      setFileName(h.name);
      setDirty(false);
      await refreshPermission(h);
      trial.recordUse();
      toast.success(`Saved as ${h.name}`);
    } catch (e) {
      if (!(e instanceof Error && e.name === "AbortError")) {
        toast.error(e instanceof Error ? e.message : "Save failed.");
      }
    } finally {
      setBusy(false);
    }
  }, [supported, busy, content, fileName, refreshPermission, trial]);

  const newFile = useCallback(() => {
    setHandle(null);
    setFileName("");
    setContent("");
    setDirty(false);
    setPermission("unknown");
  }, []);

  const browseDir = useCallback(async () => {
    if (!trial.canUse || busy || !supported) return;
    setBusy(true);
    try {
      const dir = (await (window as unknown as {
        showDirectoryPicker: () => Promise<FileSystemDirectoryHandle>;
      }).showDirectoryPicker()) as FileSystemDirectoryHandle;
      const out: DirEntry[] = [];
      for await (const [name, entry] of dir as unknown as AsyncIterable<[string, FileSystemHandle]>) {
        let size = 0;
        if (entry.kind === "file") {
          try {
            size = (await (entry as FileSystemFileHandle).getFile()).size;
          } catch { size = 0; }
        }
        out.push({ name, kind: entry.kind, size });
        if (out.length >= 100) break;
      }
      out.sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === "directory" ? -1 : 1));
      setEntries(out);
      setDirName(dir.name);
      trial.recordUse();
      toast.success(`Listed ${out.length} entries in ${dir.name}`);
    } catch (e) {
      if (!(e instanceof Error && e.name === "AbortError")) {
        toast.error(e instanceof Error ? e.message : "Could not read the directory.");
      }
    } finally {
      setBusy(false);
    }
  }, [trial, busy, supported]);

  const lines = content.split("\n").length;
  const chars = content.length;

  return (
    <ToolPageShell toolId="file-system-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="File System Access" left={trial.left} />

      {!supported && (
        <div className="mb-6 rounded-2xl border border-amber-400/50 bg-amber-50 p-5 text-sm dark:bg-amber-950/20">
          <p className="font-bold">The File System Access API is not supported in this browser.</p>
          <p className="mt-1 text-muted-foreground">
            It needs Chrome or Edge 86 and later on desktop. Firefox and Safari do not implement the picker methods.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5">
          <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
            <h3 className="font-bold">File actions</h3>
            <ActionButton busy={busy} disabled={!trial.canUse || !supported} onClick={() => void openFile()}>
              <FolderOpen className="h-4 w-4" /> {busy ? "Opening..." : "Open file"}
            </ActionButton>
            <ActionButton busy={busy} disabled={!handle || !dirty} onClick={() => void save()}>
              <Save className="h-4 w-4" /> {busy ? "Saving..." : "Save"}
            </ActionButton>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void saveAs()}
                disabled={!supported}
                className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-bold transition hover:border-primary/40 disabled:opacity-50"
              >
                Save as...
              </button>
              <button
                type="button"
                onClick={newFile}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-bold transition hover:border-primary/40"
              >
                <FilePlus2 className="h-4 w-4" /> New
              </button>
            </div>
            <div className="rounded-xl bg-background p-3 font-mono text-xs">
              <p className="text-muted-foreground">file: <span className="font-bold text-foreground">{fileName || "(none)"}</span></p>
              <p className="text-muted-foreground">permission: <span className={cn("font-bold", permission === "granted" ? "text-emerald-500" : "text-amber-500")}>{permission}</span></p>
              <p className="text-muted-foreground">modified: <span className={cn("font-bold", dirty ? "text-amber-500" : "text-foreground")}>{dirty ? "yes" : "no"}</span></p>
            </div>
            {!isPro && <p className="text-xs text-muted-foreground">{trial.left} of 5 free opens left.</p>}
          </div>

          <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
            <h3 className="font-bold">Directory browser</h3>
            <ActionButton busy={busy} disabled={!trial.canUse || !supported} onClick={() => void browseDir()}>
              <FolderOpen className="h-4 w-4" /> {busy ? "Reading..." : "Pick a directory"}
            </ActionButton>
            {entries.length > 0 && (
              <>
                <p className="font-mono text-xs text-muted-foreground">{dirName} ({entries.length} entries)</p>
                <ul className="max-h-56 space-y-1 overflow-y-auto rounded-xl bg-background p-2 font-mono text-xs">
                  {entries.map((e) => (
                    <li key={e.name} className="flex items-center justify-between gap-2 rounded px-2 py-1.5 hover:bg-muted">
                      <span className={cn("truncate", e.kind === "directory" && "font-bold text-primary")}>
                        {e.kind === "directory" ? e.name + "/" : e.name}
                      </span>
                      <span className="shrink-0 text-muted-foreground">{e.kind === "file" ? fmtBytes(e.size) : "dir"}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold">Live editor</h3>
            <p className="font-mono text-xs text-muted-foreground">{lines} lines - {chars} chars</p>
          </div>
          <textarea
            value={content}
            onChange={(e) => { setContent(e.target.value); setDirty(true); }}
            placeholder={supported ? "Open a file to edit it here, then Save to write back to the same file on disk." : "API not supported in this browser."}
            disabled={!supported}
            spellCheck={false}
            className="h-[480px] w-full resize-y rounded-xl border border-border bg-background p-4 font-mono text-sm leading-relaxed outline-none focus:border-primary"
          />
          <p className="mt-3 text-xs text-muted-foreground">
            Save writes through the original file handle with no download step, which is the whole point of the API: the browser keeps a real reference to the file on disk, with explicit user permission. Nothing is uploaded.
          </p>
        </div>
      </div>
    </ToolPageShell>
  );
}
