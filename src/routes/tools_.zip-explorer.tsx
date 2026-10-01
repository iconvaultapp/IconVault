// /tools/zip-explorer - Peek inside ZIP files in your browser: file tree,
// text/image previews, per-file or full extraction. No upload, no server.

import { useCallback, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileUp, FileText, Image as ImageIcon, Folder, AlertTriangle, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/zip-explorer")({
  head: () => {
    const seo = getToolSeoMeta("zip-explorer");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: ZipExplorerTool,
});

type ZipEntry = { path: string; name: string; depth: number; size: number; dir: boolean };
type Preview = { kind: "text"; text: string; truncated: boolean } | { kind: "image"; url: string } | { kind: "none"; reason: string };

const TEXT_EXT = new Set([
  "txt", "md", "markdown", "json", "js", "jsx", "ts", "tsx", "mjs", "cjs", "css", "scss",
  "html", "htm", "xml", "svg", "csv", "tsv", "log", "yml", "yaml", "ini", "cfg", "conf",
  "toml", "env", "sh", "py", "rb", "java", "c", "cpp", "h", "go", "rs", "php", "sql",
  "gitignore", "editorconfig", "dockerfile",
]);
const IMAGE_EXT = new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp", "avif"]);

function extOf(path: string): string {
  const base = path.split("/").pop() ?? "";
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : "";
}

type ZipObject = {
  dir: boolean;
  async: (type: "string" | "blob") => Promise<string | Blob>;
};
type JSZipLike = {
  files: Record<string, ZipObject>;
  file: (path: string) => ZipObject | null;
  loadAsync: (data: Blob) => Promise<JSZipLike>;
};

function ZipExplorerTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("zip-explorer", isPro);
  const seo = getToolSeo("zip-explorer");

  const [zipName, setZipName] = useState("");
  const [entries, setEntries] = useState<ZipEntry[]>([]);
  const [selected, setSelected] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const zipRef = useRef<JSZipLike | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptFile = useCallback(async (f: File) => {
    if (!/\.zip$/i.test(f.name) && f.type !== "application/zip" && f.type !== "application/x-zip-compressed") {
      setError("Please choose a .zip file.");
      return;
    }
    setLoading(true);
    setError(null);
    setPreview(null);
    setSelected("");
    try {
      const JSZip = await import("jszip");
      const zip = (await (JSZip as unknown as { default: { loadAsync: (d: Blob) => Promise<JSZipLike> } }).default.loadAsync(f)) as JSZipLike;
      const list: ZipEntry[] = Object.keys(zip.files)
        .filter((p) => !p.endsWith("__MACOSX/"))
        .map((p) => {
          const obj = zip.files[p];
          const parts = p.replace(/\/$/, "").split("/");
          return {
            path: p,
            name: parts[parts.length - 1] || p,
            depth: parts.length - 1,
            size: 0,
            dir: obj?.dir ?? p.endsWith("/"),
          };
        })
        .sort((a, b) => a.path.localeCompare(b.path));
      // Resolve uncompressed sizes lazily is expensive; use a lightweight pass.
      zipRef.current = zip;
      setZipName(f.name);
      setEntries(list);
      if (list.length === 0) setError("This ZIP appears to be empty.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (/encrypt|password|bad/i.test(msg)) {
        setError("This ZIP is password protected. Encrypted ZIPs are not supported because decryption happens nowhere: everything runs locally in your browser.");
      } else {
        setError("Could not read that ZIP. It may be corrupt or use an unsupported format.");
      }
      zipRef.current = null;
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fileCount = entries.filter((e) => !e.dir).length;

  const viewFile = useCallback(async (entry: ZipEntry) => {
    const zip = zipRef.current;
    if (!zip || entry.dir) return;
    setSelected(entry.path);
    const ext = extOf(entry.path);
    const obj = zip.file(entry.path);
    if (!obj) return;
    try {
      if (IMAGE_EXT.has(ext) && ext !== "svg") {
        const blob = (await obj.async("blob")) as Blob;
        if (preview?.kind === "image") URL.revokeObjectURL(preview.url);
        setPreview({ kind: "image", url: URL.createObjectURL(blob) });
      } else if (TEXT_EXT.has(ext) || ext === "") {
        const text = (await obj.async("string")) as string;
        const truncated = text.length > 60000;
        setPreview({ kind: "text", text: truncated ? text.slice(0, 60000) : text, truncated });
      } else {
        setPreview({ kind: "none", reason: `No preview for .${ext || "?"} files. Use Extract to download it.` });
      }
    } catch {
      setPreview({ kind: "none", reason: "Could not read this file's contents." });
    }
  }, [preview]);

  const extractOne = useCallback(async (entry: ZipEntry) => {
    const zip = zipRef.current;
    if (!zip || entry.dir || busy || !trial.canUse) return;
    setBusy(true);
    try {
      const obj = zip.file(entry.path);
      if (!obj) throw new Error("File not found in archive.");
      const blob = (await obj.async("blob")) as Blob;
      downloadBlob(blob, entry.path.split("/").pop() ?? "file");
      trial.recordUse();
      toast.success("File extracted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Extraction failed.");
    } finally {
      setBusy(false);
    }
  }, [busy, trial]);

  const extractAll = useCallback(async () => {
    const zip = zipRef.current;
    if (!zip || busy || !trial.canUse) return;
    const files = entries.filter((e) => !e.dir);
    if (files.length === 0) return;
    setBusy(true);
    try {
      for (const entry of files) {
        const obj = zip.file(entry.path);
        if (!obj) continue;
        const blob = (await obj.async("blob")) as Blob;
        downloadBlob(blob, entry.path.split("/").pop() ?? "file");
        // Small pause so the browser does not block rapid successive downloads.
        await new Promise((r) => setTimeout(r, 350));
      }
      trial.recordUse();
      toast.success(`Extracted ${files.length} files`);
    } catch {
      toast.error("Extraction stopped partway. Try extracting files individually.");
    } finally {
      setBusy(false);
    }
  }, [busy, trial, entries]);

  return (
    <ToolPageShell toolId="zip-explorer" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="ZIP Explorer" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) void acceptFile(f); }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition",
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
            )}
          >
            <FileUp className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold">{zipName || "Drop a .zip file"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Runs in your browser, nothing is uploaded</p>
            <input ref={inputRef} type="file" accept=".zip,application/zip" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void acceptFile(f); }} />
          </div>

          {loading && <p className="text-sm text-muted-foreground">Reading archive…</p>}
          {error && (
            <p className="flex items-start gap-2 text-sm font-medium text-red-500">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </p>
          )}

          {entries.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-medium text-foreground/80">
                  {fileCount} file{fileCount === 1 ? "" : "s"}
                </p>
                <ActionButton busy={busy} disabled={!trial.canUse} onClick={extractAll}>
                  <Download className="h-4 w-4" /> Extract all
                </ActionButton>
              </div>
              <p className="text-xs text-muted-foreground">
                Extract all downloads each file individually. Browsers cannot recreate the folder structure on download.
              </p>
              {!isPro && (
                <p className="text-xs text-muted-foreground">
                  {trial.left} of {TOOL_TRIAL_LIMIT} free extractions left.
                </p>
              )}
            </>
          )}
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
              <FolderOpen className="h-4 w-4 text-primary" /> File tree
            </h2>
            {entries.length === 0 ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
                <Folder className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="font-semibold">No archive loaded</p>
                <p className="mt-1 max-w-xs text-sm text-muted-foreground">Drop a ZIP on the left to browse its contents without extracting anything.</p>
              </div>
            ) : (
              <ul className="max-h-[420px] space-y-0.5 overflow-y-auto pr-1 text-sm">
                {entries.map((e) => (
                  <li key={e.path}>
                    <button
                      type="button"
                      disabled={e.dir}
                      onClick={() => void viewFile(e)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition",
                        e.dir ? "cursor-default text-muted-foreground" : "hover:bg-muted",
                        selected === e.path && "bg-primary/10 text-primary",
                      )}
                      style={{ paddingLeft: `${8 + e.depth * 16}px` }}
                    >
                      {e.dir ? (
                        <Folder className="h-4 w-4 shrink-0" />
                      ) : IMAGE_EXT.has(extOf(e.path)) ? (
                        <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="min-w-0 flex-1 truncate font-medium">{e.name}</span>
                      {!e.dir && (
                        <span
                          role="button"
                          tabIndex={0}
                          title="Extract this file"
                          onClick={(ev) => { ev.stopPropagation(); void extractOne(e); }}
                          onKeyDown={(ev) => { if (ev.key === "Enter") { ev.stopPropagation(); void extractOne(e); } }}
                          className="rounded p-1 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-bold">Preview</h2>
            {!preview ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
                <FileText className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="font-semibold">Click a file to preview it</p>
                <p className="mt-1 max-w-xs text-sm text-muted-foreground">Text files show their contents, images render inline.</p>
              </div>
            ) : preview.kind === "image" ? (
              <div className="flex min-h-[280px] items-center justify-center rounded-xl bg-[repeating-conic-gradient(#80808033_0_25%,transparent_0_50%)] bg-[length:20px_20px] p-4">
                <img src={preview.url} alt={selected} className="max-h-[380px] max-w-full rounded" />
              </div>
            ) : preview.kind === "text" ? (
              <div>
                <pre className="max-h-[380px] overflow-auto rounded-xl bg-muted p-4 font-mono text-xs leading-relaxed">{preview.text}</pre>
                {preview.truncated && <p className="mt-2 text-xs text-muted-foreground">Preview truncated at 60,000 characters. Extract the file to read it fully.</p>}
              </div>
            ) : (
              <p className="py-16 text-center text-sm text-muted-foreground">{preview.reason}</p>
            )}
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
