// /tools/duplicate-file-finder - Hash files with SHA-256 and group identical
// copies, with total wasted bytes. Uses the File System Access API when
// available, with an honest fallback. 100% in-browser: file contents never
// leave your device.

import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, Copy, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/duplicate-file-finder";
import toolSeoMeta from "@/lib/tool-seo-meta-data/duplicate-file-finder";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/duplicate-file-finder")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/duplicate-file-finder";
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
  component: DuplicateFinderTool,
});

interface DupGroup {
  hash: string;
  files: { name: string; size: number }[];
  wasted: number;
}

interface ScanStats {
  files: number;
  bytes: number;
  groups: number;
  wasted: number;
}

const hasPicker = typeof window !== "undefined" && "showDirectoryPicker" in window;

async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function DuplicateFinderTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("duplicate-file-finder", isPro);
  const seo = toolSeo;

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [groups, setGroups] = useState<DupGroup[] | null>(null);
  const [stats, setStats] = useState<ScanStats | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sourceLabel, setSourceLabel] = useState("");
  const fallbackRef = useRef<HTMLInputElement>(null);

  const processFiles = async (files: { name: string; size: number; blob: Blob }[], label: string) => {
    if (files.length === 0 || busy || !trial.canUse) return;
    setBusy(true);
    setGroups(null);
    setStats(null);
    setExpanded(new Set());
    setSourceLabel(label);
    try {
      const map = new Map<string, { name: string; size: number }[]>();
      let bytes = 0;
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        if (!f) continue;
        setProgress(`Hashing ${i + 1} of ${files.length}...`);
        bytes += f.size;
        // Size bucket first so we only hash real duplicate candidates
        const hash = await sha256Hex(await f.blob.arrayBuffer());
        const arr = map.get(hash) ?? [];
        arr.push({ name: f.name, size: f.size });
        map.set(hash, arr);
        // Yield to the UI between files
        await new Promise((r) => setTimeout(r, 0));
      }
      const dupGroups: DupGroup[] = [];
      let wasted = 0;
      for (const [hash, arr] of map) {
        if (arr.length > 1) {
          const w = arr.slice(1).reduce((a, f) => a + f.size, 0);
          wasted += w;
          dupGroups.push({ hash, files: arr, wasted: w });
        }
      }
      dupGroups.sort((a, b) => b.wasted - a.wasted);
      setGroups(dupGroups);
      setStats({ files: files.length, bytes, groups: dupGroups.length, wasted });
      trial.recordUse();
      toast.success(dupGroups.length > 0 ? `Found ${dupGroups.length} duplicate group${dupGroups.length === 1 ? "" : "s"}` : "No duplicates found");
    } catch {
      toast.error("Scanning failed");
    } finally {
      setBusy(false);
      setProgress("");
    }
  };

  const pickFolder = async () => {
    try {
      const dir = await (window as unknown as {
        showDirectoryPicker: (opts?: { mode: string }) => Promise<{
          values: () => AsyncIterable<{ kind: string; name: string; getFile: () => Promise<File> }>;
        }>;
      }).showDirectoryPicker({ mode: "read" });
      const files: { name: string; size: number; blob: Blob }[] = [];
      for await (const entry of dir.values()) {
        if (entry.kind === "file") {
          const file = await entry.getFile();
          files.push({ name: entry.name, size: file.size, blob: file });
        }
      }
      await processFiles(files, "folder");
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return; // user cancelled
      toast.error("Could not read that folder");
    }
  };

  const toggle = (hash: string) =>
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(hash)) next.delete(hash);
      else next.add(hash);
      return next;
    });

  return (
    <ToolPageShell toolId="duplicate-file-finder" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Duplicate Finder" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-3 text-sm font-semibold">Scan for duplicates</p>
            <ActionButton busy={busy} disabled={!trial.canUse} onClick={hasPicker ? pickFolder : () => fallbackRef.current?.click()}>
              <FolderOpen className="h-4 w-4" /> {busy ? "Scanning…" : hasPicker ? "Select folder" : "Select files"}
            </ActionButton>
            {!hasPicker && (
              <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-foreground/80">
                Your browser does not support the File System Access API, so folder scanning is unavailable here.
                Use the button above to pick files manually instead (multi-select works).
              </p>
            )}
            {busy && progress && <p className="mt-2 font-mono text-xs text-muted-foreground">{progress}</p>}
          </div>

          <input
            ref={fallbackRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              const fs = [...(e.target.files ?? [])].map((f) => ({ name: f.name, size: f.size, blob: f as Blob }));
              void processFiles(fs, "selected files");
              e.target.value = "";
            }}
          />

          {stats && (
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Files scanned", value: String(stats.files) },
                { label: "Total size", value: formatBytes(stats.bytes) },
                { label: "Duplicate groups", value: String(stats.groups) },
                { label: "Wasted space", value: formatBytes(stats.wasted) },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-border bg-background p-3">
                  <p className="text-lg font-bold text-primary">{s.value}</p>
                  <p className="text-[11px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Files are hashed with SHA-256 in your browser. File contents never leave your device, and nothing is deleted automatically.
          </p>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free scans left.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {groups === null ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
              <Copy className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Duplicate groups appear here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {hasPicker ? "Select a folder" : "Select files"} and every file gets hashed. Identical files are grouped together with the space you could reclaim.
              </p>
            </div>
          ) : groups.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
              <Copy className="mb-3 h-10 w-10 text-emerald-500/60" />
              <p className="font-semibold">No duplicates in {sourceLabel}</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                All {stats?.files ?? 0} files have unique contents.
              </p>
            </div>
          ) : (
            <div className="max-h-[520px] space-y-2.5 overflow-auto">
              {groups.map((g) => {
                const open = expanded.has(g.hash);
                return (
                  <div key={g.hash} className="rounded-xl border border-border bg-background">
                    <button
                      type="button"
                      onClick={() => toggle(g.hash)}
                      className="flex w-full items-center gap-3 p-3 text-left"
                    >
                      <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition", open && "rotate-180")} />
                      <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">{g.files.length} copies</span>
                      <span className="truncate font-mono text-xs text-muted-foreground">{g.hash.slice(0, 32)}…</span>
                      <span className="ml-auto shrink-0 text-xs font-bold text-amber-500">{formatBytes(g.wasted)} wasted</span>
                    </button>
                    {open && (
                      <div className="border-t border-border p-3">
                        <p className="mb-2 break-all font-mono text-[11px] text-muted-foreground">SHA-256: {g.hash}</p>
                        <ul className="space-y-1.5">
                          {g.files.map((f, i) => (
                            <li key={i} className="flex items-center gap-2 text-xs">
                              <span className={cn("rounded px-1.5 py-0.5 font-mono text-[11px]", i === 0 ? "bg-emerald-500/15 text-emerald-500" : "bg-muted text-muted-foreground")}>
                                {i === 0 ? "keep" : "dup"}
                              </span>
                              <span className="truncate font-mono">{f.name}</span>
                              <span className="ml-auto shrink-0 text-muted-foreground">{formatBytes(f.size)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
