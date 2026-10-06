// /tools/content-index-playground - Real Content Index API playground:
// add, list and delete offline content entries through
// registration.index, with honest fallbacks where it is unsupported.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Layers, Plus, Trash2, RefreshCw, Info } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/content-index-playground";
import toolSeoMeta from "@/lib/tool-seo-meta-data/content-index-playground";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/content-index-playground")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/content-index-playground";
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
  component: ContentIndexTool,
});

interface ContentIndexEntryLike {
  id: string;
  url: string;
  title?: string;
  description?: string;
  category?: string;
}

interface ContentIndexLike {
  add(entry: {
    id: string;
    url: string;
    title: string;
    description?: string;
    icons?: Array<{ src: string; sizes?: string; type?: string }>;
    category?: string;
  }): Promise<void>;
  delete(id: string): Promise<void>;
  getAll(): Promise<ContentIndexEntryLike[]>;
}

declare global {
  interface ServiceWorkerRegistration {
    readonly index?: ContentIndexLike;
  }
}

interface LogEntry {
  t: string;
  msg: string;
}

const CATEGORIES = ["", "homepage", "article", "video", "audio"];

function ContentIndexTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("content-index-playground", isPro);
  const seo = toolSeo;

  const [ready, setReady] = useState<"checking" | "ok" | "missing">("checking");
  const [missingReason, setMissingReason] = useState("");
  const [entries, setEntries] = useState<ContentIndexEntryLike[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [busy, setBusy] = useState(false);

  const [id, setId] = useState("demo-article-1");
  const [title, setTitle] = useState("Demo article");
  const [description, setDescription] = useState("An example offline article entry.");
  const [url, setUrl] = useState("/tools/content-index-playground");
  const [category, setCategory] = useState("article");

  const indexRef = useRef<ContentIndexLike | null>(null);

  const addLog = useCallback((msg: string) => {
    setLog((p) => [{ t: new Date().toLocaleTimeString(), msg }, ...p].slice(0, 80));
  }, []);

  const detect = useCallback(async () => {
    setReady("checking");
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      setReady("missing");
      setMissingReason("Service workers are not supported in this browser.");
      return;
    }
    const reg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((res) => window.setTimeout(() => res(null), 4000)),
    ]);
    if (!reg) {
      setReady("missing");
      setMissingReason(
        "No active service worker controls this page. Content Index lives on the registration, so add a service worker on your own host to try it for real.",
      );
      return;
    }
    if (!reg.index) {
      setReady("missing");
      setMissingReason("This browser has service workers but not the Content Index API (Chrome/Edge 84+ only).");
      return;
    }
    indexRef.current = reg.index;
    setReady("ok");
    addLog(`Connected to Content Index (SW scope: ${reg.scope}).`);
  }, [addLog]);

  useEffect(() => {
    void detect();
  }, [detect]);

  const listEntries = useCallback(async () => {
    const index = indexRef.current;
    if (!index) return;
    try {
      const all = await index.getAll();
      setEntries(all);
      addLog(`getAll(): ${all.length} entr${all.length === 1 ? "y" : "ies"} in the index.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "getAll() failed.");
    }
  }, [addLog]);

  useEffect(() => {
    if (ready === "ok") void listEntries();
  }, [ready, listEntries]);

  const addEntry = useCallback(async () => {
    const index = indexRef.current;
    if (busy || !index || !trial.canUse) return;
    const entryId = id.trim();
    if (!entryId) {
      toast.error("Give the entry an id.");
      return;
    }
    if (!title.trim() || !url.trim()) {
      toast.error("Title and URL are required.");
      return;
    }
    setBusy(true);
    try {
      const payload: {
        id: string;
        url: string;
        title: string;
        description?: string;
        icons?: Array<{ src: string; sizes?: string; type?: string }>;
        category?: string;
      } = {
        id: entryId,
        url: url.trim(),
        title: title.trim(),
        icons: [{ src: "/favicon.png", sizes: "64x64", type: "image/png" }],
      };
      if (description.trim()) payload.description = description.trim();
      if (category) payload.category = category;
      await index.add(payload);
      addLog(`add(): entry "${entryId}" stored.`);
      trial.recordUse();
      toast.success("Entry added to the Content Index.");
      await listEntries();
    } catch (e) {
      const msg = e instanceof Error ? `${e.name}: ${e.message}` : "add() failed.";
      addLog(`add() failed: ${msg}`);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }, [busy, trial, id, title, description, url, category, addLog, listEntries]);

  const deleteEntry = useCallback(
    async (entryId: string) => {
      const index = indexRef.current;
      if (!index) return;
      try {
        await index.delete(entryId);
        addLog(`delete(): entry "${entryId}" removed.`);
        toast.info(`Entry "${entryId}" deleted.`);
        await listEntries();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "delete() failed.");
      }
    },
    [addLog, listEntries],
  );

  return (
    <ToolPageShell toolId="content-index-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Content Index" left={trial.left} />

      {ready === "missing" && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <p className="text-sm">
            <strong>Content Index is not usable here:</strong> {missingReason} The form below is
            disabled rather than simulated; the code sample at the bottom is the exact code to run
            where the API exists.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">New entry</h2>
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-bold",
                ready === "ok"
                  ? "bg-emerald-500/15 text-emerald-600"
                  : ready === "checking"
                    ? "bg-muted text-muted-foreground"
                    : "bg-amber-500/15 text-amber-600",
              )}
            >
              {ready === "ok" ? "API ready" : ready === "checking" ? "checking…" : "unavailable"}
            </span>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">Entry id (unique)</span>
            <input
              type="text"
              value={id}
              disabled={ready !== "ok"}
              onChange={(e) => setId(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm disabled:opacity-60"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">Title</span>
            <input
              type="text"
              value={title}
              disabled={ready !== "ok"}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm disabled:opacity-60"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">Description</span>
            <textarea
              value={description}
              disabled={ready !== "ok"}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm disabled:opacity-60"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">URL (same-origin)</span>
            <input
              type="text"
              value={url}
              disabled={ready !== "ok"}
              onChange={(e) => setUrl(e.target.value)}
              spellCheck={false}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm disabled:opacity-60"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">Category</span>
            <select
              value={category}
              disabled={ready !== "ok"}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm disabled:opacity-60"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c === "" ? "(none)" : c}
                </option>
              ))}
            </select>
          </label>

          <div className="flex gap-2">
            <ActionButton busy={busy} disabled={ready !== "ok" || !trial.canUse} onClick={() => void addEntry()}>
              <Plus className="h-4 w-4" /> {busy ? "Adding…" : "Add entry"}
            </ActionButton>
            <button
              type="button"
              onClick={() => void listEntries()}
              disabled={ready !== "ok"}
              className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </div>

          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free entries left. Everything runs in your browser.
            </p>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Layers className="h-4 w-4 text-primary" /> Indexed entries ({entries.length})
            </h2>
            {ready !== "ok" ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {ready === "checking" ? "Detecting service worker and Content Index…" : "Unavailable in this browser."}
              </p>
            ) : entries.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                The index is empty. Add your first entry with the form.
              </p>
            ) : (
              <ul className="space-y-2">
                {entries.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{e.title || e.id}</p>
                      <p className="truncate font-mono text-[11px] text-muted-foreground">
                        id: {e.id} · {e.url}
                        {e.category ? ` · ${e.category}` : ""}
                      </p>
                      {e.description && (
                        <p className="mt-1 truncate text-xs text-muted-foreground">{e.description}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => void deleteEntry(e.id)}
                      title={`Delete ${e.id}`}
                      className="flex shrink-0 items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-red-500 transition hover:border-red-500/40"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold">Operation log</h2>
            {log.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                add(), getAll() and delete() calls are logged here with their real results.
              </p>
            ) : (
              <ul className="max-h-56 space-y-1.5 overflow-y-auto font-mono text-xs">
                {log.map((e, i) => (
                  <li key={i} className="flex gap-3 rounded-lg bg-muted/60 px-3 py-1.5">
                    <span className="shrink-0 text-muted-foreground">{e.t}</span>
                    <span>{e.msg}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-2 text-sm font-semibold">The real code</h2>
            <pre className="overflow-x-auto rounded-xl bg-muted/60 p-4 font-mono text-xs leading-relaxed">
{`// Runs on a page controlled by your service worker (Chrome/Edge 84+, HTTPS)
const registration = await navigator.serviceWorker.ready;

await registration.index.add({
  id: "article-123",
  url: "/articles/123",
  title: "My offline article",
  description: "Available without a connection.",
  icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
  category: "article",
});

const all = await registration.index.getAll(); // list entries
await registration.index.delete("article-123"); // remove one

// The browser surfaces indexed content in download UIs and,
// for installed PWAs, in OS-level content surfaces.`}
            </pre>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
