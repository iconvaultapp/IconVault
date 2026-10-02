// /tools/file-splitter - Split a file into numbered chunks (by count or MB),
// or join chunks back together. SHA-256 shown per chunk. 100% in-browser.

import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Download, FileUp, Scissors, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/file-splitter")({
  head: () => {
    const seo = getToolSeoMeta("file-splitter");
    const canonical = "https://iconvault.site/tools/file-splitter";
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
  component: FileSplitterTool,
});

interface ChunkInfo {
  index: number;
  blob: Blob;
  size: number;
  hash: string;
}

interface JoinFile {
  id: number;
  file: File;
}

async function sha256Hex(data: Blob): Promise<string> {
  const buf = await data.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

let nextJoinId = 1;

function FileSplitterTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("file-splitter", isPro);
  const seo = getToolSeo("file-splitter");

  const [mode, setMode] = useState<"split" | "join">("split");
  const [busy, setBusy] = useState(false);

  // Split state
  const [srcFile, setSrcFile] = useState<File | null>(null);
  const [splitBy, setSplitBy] = useState<"count" | "size">("count");
  const [count, setCount] = useState("4");
  const [sizeMb, setSizeMb] = useState("10");
  const [chunks, setChunks] = useState<ChunkInfo[]>([]);

  // Join state
  const [joinFiles, setJoinFiles] = useState<JoinFile[]>([]);
  const [mergedHash, setMergedHash] = useState<string | null>(null);

  const splitInputRef = useRef<HTMLInputElement>(null);
  const joinInputRef = useRef<HTMLInputElement>(null);

  const doSplit = async () => {
    if (!srcFile || busy || !trial.canUse) return;
    const n = splitBy === "count" ? Math.min(Math.max(2, parseInt(count, 10) || 2), 999) : 0;
    const chunkBytes = splitBy === "size"
      ? Math.max(1, parseFloat(sizeMb) || 1) * 1024 * 1024
      : Math.ceil(srcFile.size / n);
    const total = Math.ceil(srcFile.size / chunkBytes);
    if (total < 2) {
      toast.error("Chunk size is larger than the file - nothing to split");
      return;
    }
    if (total > 999) {
      toast.error("That would make too many chunks (max 999)");
      return;
    }
    setBusy(true);
    try {
      const out: ChunkInfo[] = [];
      for (let i = 0; i < total; i++) {
        const blob = srcFile.slice(i * chunkBytes, (i + 1) * chunkBytes);
        out.push({ index: i + 1, blob, size: blob.size, hash: await sha256Hex(blob) });
      }
      setChunks(out);
      trial.recordUse();
      toast.success(`Split into ${out.length} chunks`);
    } catch {
      toast.error("Splitting failed");
    } finally {
      setBusy(false);
    }
  };

  const downloadChunk = (c: ChunkInfo) => {
    const base = srcFile?.name ?? "file";
    downloadBlob(c.blob, `${base}.part${c.index}`);
  };

  const moveJoin = (id: number, dir: -1 | 1) => {
    setJoinFiles((fs) => {
      const i = fs.findIndex((f) => f.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= fs.length) return fs;
      const copy = [...fs];
      const a = copy[i];
      const b = copy[j];
      if (a === undefined || b === undefined) return fs;
      copy[i] = b;
      copy[j] = a;
      return copy;
    });
  };

  const doJoin = async () => {
    if (joinFiles.length < 2 || busy || !trial.canUse) return;
    const first = joinFiles[0];
    if (!first) return;
    setBusy(true);
    try {
      const merged = new Blob(joinFiles.map((f) => f.file), { type: first.file.type || "application/octet-stream" });
      const hash = await sha256Hex(merged);
      setMergedHash(hash);
      const base = first.file.name.replace(/\.part\d+$/, "") || "joined";
      downloadBlob(merged, `${base}.joined`);
      trial.recordUse();
      toast.success("Chunks joined and downloaded");
    } catch {
      toast.error("Joining failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolPageShell toolId="file-splitter" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="File Splitter" left={trial.left} />

      <div className="mb-6 flex gap-2">
        {(["split", "join"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              "rounded-xl border px-5 py-2.5 text-sm font-bold capitalize transition",
              mode === m ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
            )}
          >
            {m === "split" ? "Split a file" : "Join chunks"}
          </button>
        ))}
      </div>

      {mode === "split" ? (
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
            <div
              onClick={() => splitInputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border px-4 py-8 text-center transition hover:border-primary/40"
            >
              <FileUp className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-semibold">{srcFile ? srcFile.name : "Choose a file"}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {srcFile ? formatBytes(srcFile.size) : "Any file type - it never leaves your browser"}
              </p>
              <input ref={splitInputRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setSrcFile(f); setChunks([]); } }} />
            </div>

            <div>
              <p className="mb-2 text-[13px] font-medium text-foreground/80">Split by</p>
              <div className="flex gap-2">
                {(["count", "size"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setSplitBy(v)}
                    className={cn(
                      "rounded-xl border px-4 py-2.5 text-sm font-bold capitalize transition",
                      splitBy === v ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {v === "count" ? "Chunk count" : "Chunk size"}
                  </button>
                ))}
              </div>
            </div>

            {splitBy === "count" ? (
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Number of chunks (2-999)</label>
                <input value={count} onChange={(e) => setCount(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" />
              </div>
            ) : (
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Chunk size (MB)</label>
                <input value={sizeMb} onChange={(e) => setSizeMb(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" />
              </div>
            )}

            <ActionButton busy={busy} disabled={!srcFile || !trial.canUse} onClick={doSplit}>
              <Scissors className="h-4 w-4" /> {busy ? "Splitting…" : "Split file"}
            </ActionButton>
            {!isPro && (
              <p className="text-xs text-muted-foreground">
                {trial.left} of {TOOL_TRIAL_LIMIT} free operations left - files never leave your device.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            {chunks.length === 0 ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
                <Scissors className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="font-semibold">Chunks appear here</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Pick a file and press Split. Each chunk downloads as filename.part1, filename.part2 and so on.
                </p>
              </div>
            ) : (
              <div className="max-h-[480px] space-y-2.5 overflow-auto">
                {chunks.map((c) => (
                  <div key={c.index} className="rounded-xl border border-border bg-background p-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-primary/10 px-2.5 py-1 font-mono text-xs font-bold text-primary">part{c.index}</span>
                      <span className="text-xs font-semibold">{formatBytes(c.size)}</span>
                      <button
                        type="button"
                        onClick={() => downloadChunk(c)}
                        className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition hover:opacity-90"
                      >
                        <Download className="h-3 w-3" /> Download
                      </button>
                    </div>
                    <p className="mt-1.5 break-all font-mono text-[11px] text-muted-foreground">SHA-256: {c.hash}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
            <div
              onClick={() => joinInputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border px-4 py-8 text-center transition hover:border-primary/40"
            >
              <FileUp className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-semibold">Add chunk files</p>
              <p className="mt-1 text-xs text-muted-foreground">Select part1, part2, ... in any order, then arrange them</p>
              <input ref={joinInputRef} type="file" multiple className="hidden" onChange={(e) => {
                const fs = [...(e.target.files ?? [])];
                if (fs.length) setJoinFiles((prev) => [...prev, ...fs.map((f) => ({ id: nextJoinId++, file: f }))]);
                e.target.value = "";
              }} />
            </div>

            <ActionButton busy={busy} disabled={joinFiles.length < 2 || !trial.canUse} onClick={doJoin}>
              <Download className="h-4 w-4" /> {busy ? "Joining…" : "Join and download"}
            </ActionButton>
            {mergedHash && (
              <p className="break-all font-mono text-[11px] text-muted-foreground">Joined SHA-256: {mergedHash}</p>
            )}
            {!isPro && (
              <p className="text-xs text-muted-foreground">
                {trial.left} of {TOOL_TRIAL_LIMIT} free operations left - files never leave your device.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            {joinFiles.length === 0 ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
                <Download className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="font-semibold">Chunk order appears here</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Add your .part files and use the arrows to put them in the right order before joining.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {joinFiles.map((jf, i) => (
                  <div key={jf.id} className="flex items-center gap-2 rounded-xl border border-border bg-background p-3">
                    <span className="rounded-lg bg-primary/10 px-2.5 py-1 font-mono text-xs font-bold text-primary">#{i + 1}</span>
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs font-semibold">{jf.file.name}</p>
                      <p className="text-[11px] text-muted-foreground">{formatBytes(jf.file.size)}</p>
                    </div>
                    <span className="ml-auto flex gap-1">
                      <button type="button" disabled={i === 0} onClick={() => moveJoin(jf.id, -1)} className="rounded-lg border border-border p-1.5 transition hover:border-primary/40 disabled:opacity-30" title="Move up">
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" disabled={i === joinFiles.length - 1} onClick={() => moveJoin(jf.id, 1)} className="rounded-lg border border-border p-1.5 transition hover:border-primary/40 disabled:opacity-30" title="Move down">
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => setJoinFiles((fs) => fs.filter((f) => f.id !== jf.id))} className="rounded-lg border border-border p-1.5 text-muted-foreground transition hover:border-red-400 hover:text-red-500" title="Remove">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </ToolPageShell>
  );
}
